import { supabase } from '@/lib/supabase'
import {
  BUCKETS,
  getSignedUrl,
  getSignedUrls,
  removeFiles,
  uploadImage,
} from '@/lib/storage'
import { cleanNote, cleanTagNames } from '@/lib/clean'

const INSPIRATION_SELECT = `
  id, note, image_path, image_description, image_source,
  created_at, updated_at,
  inspiration_tags ( tags ( id, name ) )
`

function normalize(row, urlMap = {}) {
  const tags = (row.inspiration_tags ?? [])
    .map((link) => link.tags)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name))
  // eslint-disable-next-line no-unused-vars
  const { inspiration_tags, ...rest } = row
  return {
    ...rest,
    note: rest.note ?? '',
    tags,
    imageUrl: rest.image_path ? (urlMap[rest.image_path] ?? null) : null,
  }
}

// ---------------------------------------------------------------------
// Inspirations
// ---------------------------------------------------------------------

export async function listInspirations() {
  const { data, error } = await supabase
    .from('inspirations')
    .select(INSPIRATION_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error

  const urlMap = await getSignedUrls(
    BUCKETS.inspirations,
    data.map((row) => row.image_path),
  )
  return data.map((row) => normalize(row, urlMap))
}

/** Returns the inspiration, or null when it does not exist (or is not yours). */
export async function getInspiration(id) {
  const { data, error } = await supabase
    .from('inspirations')
    .select(INSPIRATION_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) {
    // Invalid uuid in the URL → treat as "not found".
    if (error.code === '22P02') return null
    throw error
  }
  if (!data) return null

  const url = await getSignedUrl(BUCKETS.inspirations, data.image_path)
  return normalize(data, data.image_path ? { [data.image_path]: url } : {})
}

/** Proofread fields: set when the saved note is the proofread text, else cleared. */
function proofreadFields(noteLanguage) {
  return noteLanguage
    ? { note_language: noteLanguage, note_proofread_at: new Date().toISOString() }
    : { note_language: null, note_proofread_at: null }
}

/** Description fields, when the AI described the image before the save. */
function descriptionFields(imageDescription) {
  return {
    image_description: imageDescription.text,
    image_description_model: imageDescription.model ?? null,
    image_description_at: new Date().toISOString(),
  }
}

/**
 * - file: an uploaded File.
 * - generated: { path, prompt } — an image made by the AI, already in storage.
 * - noteLanguage: 'pl' | 'en' when the note was proofread before the save.
 * - imageDescription: { text, model } when the image has a description already.
 */
export async function createInspiration({
  userId,
  note,
  file,
  generated,
  noteLanguage,
  imageDescription,
  tagNames,
}) {
  const imagePath = file
    ? await uploadImage(BUCKETS.inspirations, userId, file)
    : (generated?.path ?? null)

  const { data, error } = await supabase
    .from('inspirations')
    .insert({
      note: cleanNote(note),
      image_path: imagePath,
      ...(generated && !file && { image_source: 'generated', image_prompt: generated.prompt }),
      ...(noteLanguage && proofreadFields(noteLanguage)),
      ...(imagePath && imageDescription && descriptionFields(imageDescription)),
    })
    .select('id')
    .single()

  if (error) {
    if (file) await removeFiles(BUCKETS.inspirations, [imagePath])
    throw error
  }

  await setInspirationTags(data.id, tagNames)
  return data.id
}

/**
 * Updates note, image, and tags.
 * - file: a new File replaces the current image.
 * - generated: { path, prompt } — an AI image replaces the current image.
 * - removeImage: true clears the current image.
 * - noteLanguage: 'pl' | 'en' when the note was proofread before the save.
 * - imageDescription: { text, model } — a new description for the saved image.
 */
export async function updateInspiration(
  id,
  {
    userId,
    note,
    file,
    generated,
    removeImage,
    currentImagePath,
    currentNote,
    noteLanguage,
    imageDescription,
    tagNames,
  },
) {
  let imagePath = currentImagePath ?? null
  let oldPathToDelete = null

  if (file) {
    imagePath = await uploadImage(BUCKETS.inspirations, userId, file)
    oldPathToDelete = currentImagePath
  } else if (generated) {
    imagePath = generated.path
    oldPathToDelete = currentImagePath
  } else if (removeImage) {
    imagePath = null
    oldPathToDelete = currentImagePath
  }

  const cleanedNote = cleanNote(note)
  const patch = { note: cleanedNote, image_path: imagePath }
  // A proofread note, or a changed note, updates the proofread fields.
  if (noteLanguage || cleanedNote !== cleanNote(currentNote)) {
    Object.assign(patch, proofreadFields(noteLanguage))
  }
  // A new or removed image makes AI fields about the old image stale.
  if (imagePath !== currentImagePath) {
    Object.assign(patch, {
      image_source: generated ? 'generated' : 'upload',
      image_prompt: generated?.prompt ?? null,
      image_description: null,
      image_description_model: null,
      image_description_at: null,
    })
  }
  if (imagePath && imageDescription) Object.assign(patch, descriptionFields(imageDescription))

  const { error } = await supabase.from('inspirations').update(patch).eq('id', id)
  if (error) {
    if (file) await removeFiles(BUCKETS.inspirations, [imagePath])
    throw error
  }

  await removeFiles(BUCKETS.inspirations, [oldPathToDelete])
  await setInspirationTags(id, tagNames)
}

/** Puts back a note, for example to undo a proofread. */
export async function setInspirationNote(id, note) {
  const { error } = await supabase
    .from('inspirations')
    .update({ note: cleanNote(note), ...proofreadFields(null) })
    .eq('id', id)
  if (error) throw error
}

export async function deleteInspiration(id, imagePath) {
  const { error } = await supabase.from('inspirations').delete().eq('id', id)
  if (error) throw error
  await removeFiles(BUCKETS.inspirations, [imagePath])
}

// ---------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------

export async function listTags() {
  const { data, error } = await supabase
    .from('tags')
    .select('id, name')
    .order('name')
  if (error) throw error
  return data
}

/** Returns tag rows for the given names, creating missing ones. */
async function ensureTags(names) {
  if (names.length === 0) return []

  const existing = await listTags()
  const byKey = new Map(existing.map((t) => [t.name.toLowerCase(), t]))
  const missing = names.filter((n) => !byKey.has(n.toLowerCase()))

  if (missing.length > 0) {
    const { data, error } = await supabase
      .from('tags')
      .insert(missing.map((name) => ({ name })))
      .select('id, name')
    if (error) throw error
    data.forEach((t) => byKey.set(t.name.toLowerCase(), t))
  }

  return names.map((n) => byKey.get(n.toLowerCase())).filter(Boolean)
}

/** Replaces all tags of the inspiration with the given names. */
export async function setInspirationTags(inspirationId, tagNames) {
  const tags = await ensureTags(cleanTagNames(tagNames))

  const { error: deleteError } = await supabase
    .from('inspiration_tags')
    .delete()
    .eq('inspiration_id', inspirationId)
  if (deleteError) throw deleteError

  if (tags.length === 0) return
  const { error } = await supabase
    .from('inspiration_tags')
    .insert(tags.map((t) => ({ inspiration_id: inspirationId, tag_id: t.id })))
  if (error) throw error
}

// ---------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_path')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error

  const profile = data ?? { id: userId, display_name: '', avatar_path: null }
  const avatarUrl = await getSignedUrl(BUCKETS.avatars, profile.avatar_path)
  return { ...profile, avatarUrl }
}

export async function updateProfile({ userId, displayName, avatarFile, oldAvatarPath }) {
  const patch = { display_name: displayName.trim() || null }

  if (avatarFile) {
    patch.avatar_path = await uploadImage(BUCKETS.avatars, userId, avatarFile)
  }

  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  if (error) {
    if (patch.avatar_path) await removeFiles(BUCKETS.avatars, [patch.avatar_path])
    throw error
  }

  if (avatarFile) await removeFiles(BUCKETS.avatars, [oldAvatarPath])
}

export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}
