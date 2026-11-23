// Mock backend with the same functions and return shapes as api.supabase.js.
// Every query filters by the signed-in user, like the RLS policies do.

import { cleanNote, cleanTagNames } from '@/lib/clean'
import { currentUserId, mockAuth } from '@/lib/mock/auth'
import { deleteFiles, getFileUrl, putFile } from '@/lib/mock/files'
import {
  delay,
  ensureTagRows,
  newInspirationRow,
  readDb,
  setTagLinks,
  updateDb,
  uuid,
} from '@/lib/mock/store'

function fileExtension(file) {
  const fromName = file.name?.split('.').pop()
  if (fromName && fromName !== file.name) return fromName.toLowerCase()
  return file.type?.split('/')[1] ?? 'bin'
}

async function saveFile(userId, file) {
  const path = `${userId}/${uuid()}.${fileExtension(file)}`
  await putFile(path, file)
  return path
}

function tagsFor(db, inspirationId) {
  const tagIds = new Set(
    db.inspiration_tags.filter((l) => l.inspiration_id === inspirationId).map((l) => l.tag_id),
  )
  return db.tags
    .filter((t) => tagIds.has(t.id))
    .map(({ id, name }) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function toView(db, row) {
  return {
    id: row.id,
    note: row.note ?? '',
    image_path: row.image_path,
    image_description: row.image_description,
    image_source: row.image_source,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tags: tagsFor(db, row.id),
    imageUrl: await getFileUrl(row.image_path),
  }
}

function ownRow(db, userId, id) {
  return db.inspirations.find((r) => r.id === id && r.user_id === userId) ?? null
}

// ---------------------------------------------------------------------
// Inspirations
// ---------------------------------------------------------------------

export async function listInspirations() {
  await delay()
  const userId = currentUserId()
  const db = readDb()
  const rows = db.inspirations
    .filter((r) => r.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  return Promise.all(rows.map((row) => toView(db, row)))
}

export async function getInspiration(id) {
  await delay()
  const userId = currentUserId()
  const db = readDb()
  const row = ownRow(db, userId, id)
  return row ? toView(db, row) : null
}

export async function createInspiration({ userId, note, file, tagNames }) {
  await delay()
  const cleanedNote = cleanNote(note)
  if (!cleanedNote && !file) throw new Error('Add a note, an image, or both.')

  const imagePath = file ? await saveFile(userId, file) : null
  return updateDb((db) => {
    const row = newInspirationRow(userId, { note: cleanedNote, image_path: imagePath })
    db.inspirations.push(row)
    setTagLinks(db, userId, row.id, ensureTagRows(db, userId, cleanTagNames(tagNames)))
    return row.id
  })
}

export async function updateInspiration(
  id,
  { userId, note, file, removeImage, currentImagePath, tagNames },
) {
  await delay()
  let imagePath = currentImagePath ?? null
  let oldPathToDelete = null

  if (file) {
    imagePath = await saveFile(userId, file)
    oldPathToDelete = currentImagePath
  } else if (removeImage) {
    imagePath = null
    oldPathToDelete = currentImagePath
  }

  const cleanedNote = cleanNote(note)
  if (!cleanedNote && !imagePath) throw new Error('Add a note, an image, or both.')

  updateDb((db) => {
    const row = ownRow(db, userId, id)
    if (!row) throw new Error('This inspiration does not exist.')
    Object.assign(row, {
      note: cleanedNote,
      image_path: imagePath,
      updated_at: new Date().toISOString(),
    })
    if (imagePath !== currentImagePath) {
      Object.assign(row, {
        image_source: 'upload',
        image_prompt: null,
        image_description: null,
        image_description_model: null,
        image_description_at: null,
      })
    }
    setTagLinks(db, userId, id, ensureTagRows(db, userId, cleanTagNames(tagNames)))
  })

  await deleteFiles([oldPathToDelete])
}

/** Puts back a note, for example to undo a proofread. */
export async function setInspirationNote(id, note) {
  await delay()
  const userId = currentUserId()
  const cleanedNote = cleanNote(note)
  updateDb((db) => {
    const row = ownRow(db, userId, id)
    if (!row) throw new Error('This inspiration does not exist.')
    if (!cleanedNote && !row.image_path) throw new Error('Add a note, an image, or both.')
    Object.assign(row, { note: cleanedNote, updated_at: new Date().toISOString() })
  })
}

/** Replaces all tags of the inspiration with the given names. */
export async function setInspirationTags(id, tagNames) {
  await delay()
  const userId = currentUserId()
  updateDb((db) => {
    const row = ownRow(db, userId, id)
    if (!row) throw new Error('This inspiration does not exist.')
    setTagLinks(db, userId, row.id, ensureTagRows(db, userId, cleanTagNames(tagNames)))
  })
}

export async function deleteInspiration(id, imagePath) {
  await delay()
  const userId = currentUserId()
  updateDb((db) => {
    db.inspirations = db.inspirations.filter((r) => !(r.id === id && r.user_id === userId))
    db.inspiration_tags = db.inspiration_tags.filter((l) => l.inspiration_id !== id)
  })
  await deleteFiles([imagePath])
}

// ---------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------

export async function listTags() {
  const userId = currentUserId()
  return readDb()
    .tags.filter((t) => t.user_id === userId)
    .map(({ id, name }) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// ---------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------

export async function getProfile(userId) {
  const profile = readDb().profiles.find((p) => p.id === userId) ?? {
    id: userId,
    display_name: '',
    avatar_path: null,
  }
  return {
    id: profile.id,
    display_name: profile.display_name,
    avatar_path: profile.avatar_path,
    avatarUrl: await getFileUrl(profile.avatar_path),
  }
}

export async function updateProfile({ userId, displayName, avatarFile, oldAvatarPath }) {
  await delay()
  const avatarPath = avatarFile ? await saveFile(userId, avatarFile) : null

  updateDb((db) => {
    const profile = db.profiles.find((p) => p.id === userId)
    if (!profile) throw new Error('Profile not found.')
    profile.display_name = displayName.trim() || null
    if (avatarPath) profile.avatar_path = avatarPath
    profile.updated_at = new Date().toISOString()
  })

  if (avatarPath) await deleteFiles([oldAvatarPath])
}

export async function updatePassword(password) {
  const { error } = await mockAuth.updateUser({ password })
  if (error) throw new Error(error.message)
}
