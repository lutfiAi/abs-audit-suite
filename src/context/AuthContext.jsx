import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getUserProfile } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        const prof = await getUserProfile(session.user.id)
        setProfile(prof)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
        if (session?.user) {
          const prof = await getUserProfile(session.user.id)
          setProfile(prof)
        } else {
          setProfile(null)
        }
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
