// Mock of the supabase.auth methods the app uses, with the same return shapes.

import {
  DEMO_EMAIL,
  delay,
  ensureDemoUser,
  hashPassword,
  insertUser,
  readDb,
  updateDb,
} from '@/lib/mock/store'

const SESSION_KEY = 'inspiration-board:mock-session:v1'
const listeners = new Set()

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    // The user may have been removed by "Reset mock data".
    return readDb().users.some((u) => u.id === session.user.id) ? session : null
  } catch {
    return null
  }
}

function writeSession(session) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // Storage blocked: the session lasts until reload.
  }
  listeners.forEach((cb) => cb(session ? 'SIGNED_IN' : 'SIGNED_OUT', session))
}

function sessionFor(user) {
  return {
    access_token: 'mock-token',
    token_type: 'bearer',
    user: { id: user.id, email: user.email, created_at: user.created_at },
  }
}

function authError(message) {
  return { data: { user: null, session: null }, error: { message } }
}

export function currentUserId() {
  const id = readSession()?.user.id
  if (!id) throw new Error('You are signed out. Log in again.')
  return id
}

export const mockAuth = {
  async getSession() {
    const session = readSession()
    // A demo account from an older version gets the newer samples.
    if (session?.user.email === DEMO_EMAIL) {
      try {
        await ensureDemoUser()
      } catch (error) {
        console.warn('Could not update the demo samples:', error.message)
      }
    }
    return { data: { session }, error: null }
  },

  onAuthStateChange(callback) {
    listeners.add(callback)
    return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } }
  },

  async signInWithPassword({ email, password }) {
    await delay()
    const cleanEmail = email.trim().toLowerCase()
    // The demo account is created on first use, also from the login form.
    if (cleanEmail === DEMO_EMAIL) await ensureDemoUser()
    const user = readDb().users.find((u) => u.email === cleanEmail)
    if (!user || user.password_hash !== (await hashPassword(password))) {
      return authError('Invalid login credentials')
    }
    const session = sessionFor(user)
    writeSession(session)
    return { data: { user: session.user, session }, error: null }
  },

  async signUp({ email, password }) {
    await delay()
    const cleanEmail = email.trim().toLowerCase()
    if (password.length < 6) return authError('Password should be at least 6 characters.')
    if (readDb().users.some((u) => u.email === cleanEmail)) {
      return authError('User already registered')
    }
    const passwordHash = await hashPassword(password)
    const user = updateDb((db) => insertUser(db, { email: cleanEmail, passwordHash }))
    // Mock mode has no email confirmation: sign in at once.
    const session = sessionFor(user)
    writeSession(session)
    return { data: { user: session.user, session }, error: null }
  },

  async signOut() {
    await delay(50)
    writeSession(null)
    return { error: null }
  },

  async updateUser({ password }) {
    await delay()
    const userId = currentUserId()
    if (password) {
      const passwordHash = await hashPassword(password)
      updateDb((db) => {
        db.users.find((u) => u.id === userId).password_hash = passwordHash
      })
    }
    return { data: { user: readSession()?.user ?? null }, error: null }
  },
}
