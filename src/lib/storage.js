import { supabase } from '@/lib/supabase'

export const BUCKETS = {
  inspirations: 'inspirations',
  avatars: 'avatars',
}

const SIGNED_URL_TTL = 60 * 60 // 1 hour

function fileExtension(file) {
  const fromName = file.name?.split('.').pop()
  if (fromName && fromName !== file.name) return fromName.toLowerCase()
  return file.type?.split('/')[1] ?? 'bin'
}

/** Uploads a file to "<userId>/<uuid>.<ext>" and returns the storage path. */
export async function uploadImage(bucket, userId, file) {
  const path = `${userId}/${crypto.randomUUID()}.${fileExtension(file)}`
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return path
}

export async function removeFiles(bucket, paths) {
  const list = paths.filter(Boolean)
  if (list.length === 0) return
  const { error } = await supabase.storage.from(bucket).remove(list)
  // Not fatal: the row is already gone, an orphan file only wastes space.
  if (error) console.warn('Could not remove file(s):', error.message)
}

/** Returns a map { path: signedUrl } for many paths in one request. */
export async function getSignedUrls(bucket, paths) {
  const list = [...new Set(paths.filter(Boolean))]
  if (list.length === 0) return {}
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(list, SIGNED_URL_TTL)
  if (error) throw error
  return Object.fromEntries(
    data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]),
  )
}

export async function getSignedUrl(bucket, path) {
  if (!path) return null
  const map = await getSignedUrls(bucket, [path])
  return map[path] ?? null
}
