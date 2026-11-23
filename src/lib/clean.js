// Input clean-up shared by the Supabase and the mock backend.

/** Empty or whitespace-only notes are stored as null. */
export function cleanNote(note) {
  const trimmed = (note ?? '').trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Trims names and removes duplicates (case-insensitive), keeping order. */
export function cleanTagNames(names) {
  const seen = new Set()
  const result = []
  for (const raw of names ?? []) {
    const name = raw.trim()
    const key = name.toLowerCase()
    if (name && !seen.has(key)) {
      seen.add(key)
      result.push(name)
    }
  }
  return result
}
