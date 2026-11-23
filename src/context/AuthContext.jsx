import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { auth } from '@/lib/auth'
import { getProfile } from '@/lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id ?? null

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      return
    }
    try {
      setProfile(await getProfile(userId))
    } catch (error) {
      console.error('Could not load profile:', error.message)
    }
  }, [userId])

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      profile,
      refreshProfile,
      signIn: (email, password) =>
        auth.signInWithPassword({ email, password }),
      signUp: (email, password) =>
        auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        }),
      signOut: () => auth.signOut(),
    }),
    [session, loading, profile, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
