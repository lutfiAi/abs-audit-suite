import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getUserProfile } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      const prof = await getUserProfile(userId)
      if (prof) {
        setProfile(prof)
        return
      }
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await loadProfile(session.user.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await loadProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

export function useRole() {
  const { profile } = useAuth()
  return {
    role: profile?.role,
    isAdmin: profile?.role === 'admin' || profile?.role === 'super_admin',
    isSuperAdmin: profile?.role === 'super_admin',
    isInternalAuditor: profile?.role === 'internal_auditor',
    isExternalAuditor: profile?.role === 'external_auditor',
    isBranchManager: profile?.role === 'branch_manager',
  }
}
