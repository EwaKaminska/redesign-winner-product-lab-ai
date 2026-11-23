// Mock "database": one JSON object in localStorage.
// The shape mirrors the Supabase tables in supabase/migrations/001_init.sql.

import heroImage from '@/assets/auth-hero.png'
import blurBwImage from '@/assets/mock/blur-bw.jpg'
import forestImage from '@/assets/mock/forest.jpg'
import portraitImage from '@/assets/mock/portrait.jpg'
import treesImage from '@/assets/mock/trees.jpg'
import { clearFiles, putFile } from '@/lib/mock/files'

const DB_KEY = 'inspiration-board:mock-db:v1'

export const DEMO_EMAIL = 'demo@example.com'
export const DEMO_PASSWORD = 'demo1234'

function emptyDb() {
  return { users: [], profiles: [], inspirations: [], tags: [], inspiration_tags: [] }
}

export function readDb() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    return raw ? { ...emptyDb(), ...JSON.parse(raw) } : emptyDb()
  } catch {
    return emptyDb()
  }
}

export function writeDb(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    throw new Error('Mock storage is full or blocked in this browser.')
  }
}

/** Reads, changes, and saves the database in one step. */
export function updateDb(change) {
  const db = readDb()
  const result = change(db)
  writeDb(db)
  return result
}

/** A short pause so loading states show, as with a real network. */
export function delay(ms = 150) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * crypto.randomUUID and crypto.subtle exist only in secure contexts
 * (https or localhost). The fallbacks keep mock mode working when the
 * app is opened by a network IP such as http://192.168.x.x.
 */
export function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export async function hashPassword(password) {
  const text = `inspiration-board:${password}`
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  // Not secure, but this is a local mock only (FNV-1a).
  let hash = 0x811c9dc5
  for (const char of text) {
    hash ^= char.codePointAt(0)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return `fnv-${hash.toString(16)}`
}

/** Creates a user + profile row (like the handle_new_user trigger). */
export function insertUser(db, { email, passwordHash }) {
  const now = new Date().toISOString()
  const user = { id: uuid(), email, password_hash: passwordHash, created_at: now }
  db.users.push(user)
  db.profiles.push({
    id: user.id,
    display_name: null, // The app shows the email until the user sets a name.
    avatar_path: null,
    created_at: now,
    updated_at: now,
  })
  return user
}

export function newInspirationRow(userId, fields, createdAt = new Date()) {
  const iso = createdAt.toISOString()
  return {
    id: uuid(),
    user_id: userId,
    note: null,
    image_path: null,
    image_description: null,
    image_description_model: null,
    image_description_at: null,
    image_source: 'upload',
    image_prompt: null,
    note_language: null,
    note_proofread_at: null,
    created_at: iso,
    updated_at: iso,
    ...fields,
  }
}

/** Returns tag rows for the names, creating missing ones for this user. */
export function ensureTagRows(db, userId, names) {
  return names.map((name) => {
    let tag = db.tags.find(
      (t) => t.user_id === userId && t.name.toLowerCase() === name.toLowerCase(),
    )
    if (!tag) {
      tag = { id: uuid(), user_id: userId, name, created_at: new Date().toISOString() }
      db.tags.push(tag)
    }
    return tag
  })
}

export function setTagLinks(db, userId, inspirationId, tagRows) {
  db.inspiration_tags = db.inspiration_tags.filter((l) => l.inspiration_id !== inspirationId)
  tagRows.forEach((tag) =>
    db.inspiration_tags.push({ inspiration_id: inspirationId, tag_id: tag.id, user_id: userId }),
  )
}

// ---------------------------------------------------------------------
// Demo account with sample content from the Figma file
// ---------------------------------------------------------------------

const DAY = 86_400_000
const HOUR = 3_600_000

const PORTRAIT_PROMPT =
  'Low-angle close portrait with an 85mm lens, the young woman turning her face directly toward the camera, her head and shoulders filling the frame; a young woman with a short dark bob and fringe, black leather jacket, and a small hoop earring against a plain reddish-brown wall. Retain the restrained horizontal facial motion smear, gently vary her hair shade, jacket styling, wall hue, earring, and low-key side light while preserving the moody soft-focus vintage editorial feeling. No text.'

/**
 * Samples grouped by seed version. A demo account made with an older
 * version gets only the newer samples, so nothing it already has (or
 * that the user deleted) comes back.
 */
const SEEDS = [
  {
    version: 1,
    samples: [
      {
        note: 'To inspire people, don’t show them your superpowers, show them theirs.',
        tags: ['Quotes'],
        ago: 3 * DAY,
      },
      {
        image: heroImage,
        description:
          'A boy in a red jacket stands still on a kerb while blurred people rush past him.',
        tags: ['Portrait', 'Movement'],
        ago: DAY,
      },
      { note: PORTRAIT_PROMPT, tags: ['Portrait', 'Prompt'], ago: 2 * HOUR },
    ],
  },
  {
    version: 2,
    samples: [
      {
        image: blurBwImage,
        description: 'A black-and-white motion blur of a figure turning in low light.',
        tags: ['Movement', 'Black and white'],
        ago: 5 * DAY,
      },
      {
        image: forestImage,
        description: 'A misty forest edge photographed with a slow, sweeping shutter.',
        tags: ['Nature', 'Movement'],
        ago: 4 * DAY,
      },
      {
        image: treesImage,
        description: 'Treetops smeared into soft green streaks against a pale sky.',
        tags: ['Nature'],
        ago: 2 * DAY,
      },
      {
        // Image + note together.
        image: portraitImage,
        note: 'Reference for the next editorial shoot: keep the slight motion smear and the warm reddish-brown wall.',
        description:
          'A young woman with a dark bob and a leather jacket looks down at the camera against a reddish-brown wall.',
        tags: ['Portrait', 'Prompt'],
        ago: HOUR,
      },
    ],
  },
]

export const DEMO_SEED_VERSION = SEEDS.at(-1).version

async function addSample(db, userId, sample) {
  let imagePath = null
  if (sample.image) {
    const blob = await fetch(sample.image).then((r) => r.blob())
    const ext = blob.type === 'image/png' ? 'png' : 'jpg'
    imagePath = `${userId}/${uuid()}.${ext}`
    await putFile(imagePath, blob)
  }
  const createdAt = new Date(Date.now() - sample.ago)
  const row = newInspirationRow(
    userId,
    {
      note: sample.note ?? null,
      image_path: imagePath,
      image_description: sample.description ?? null,
      image_description_model: sample.description ? 'mock' : null,
      image_description_at: sample.description ? createdAt.toISOString() : null,
    },
    createdAt,
  )
  db.inspirations.push(row)
  setTagLinks(db, userId, row.id, ensureTagRows(db, userId, sample.tags))
}

/** Creates the demo account, or adds samples from newer seed versions. */
export async function ensureDemoUser() {
  let db = readDb()
  let user = db.users.find((u) => u.email === DEMO_EMAIL)
  const from = user ? (user.demo_seed_version ?? 1) : 0
  if (from >= DEMO_SEED_VERSION) return

  if (!user) {
    const passwordHash = await hashPassword(DEMO_PASSWORD)
    db = readDb()
    user = insertUser(db, { email: DEMO_EMAIL, passwordHash })
    db.profiles.find((p) => p.id === user.id).display_name = 'Demo User'
  }

  for (const seed of SEEDS.filter((s) => s.version > from)) {
    for (const sample of seed.samples) await addSample(db, user.id, sample)
  }

  db.users.find((u) => u.id === user.id).demo_seed_version = DEMO_SEED_VERSION
  writeDb(db)
}

/** Deletes all mock users, data, and images in this browser. */
export async function resetMockData() {
  try {
    localStorage.removeItem(DB_KEY)
  } catch {
    // Storage blocked: nothing to remove.
  }
  await clearFiles()
}
