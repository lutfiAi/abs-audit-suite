import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// ── Auth ──────────────────────────────────────
export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () =>
  supabase.auth.signOut()

export const getUser = async () => {
  const { data } = await supabase.auth.getUser()
  return data?.user ?? null
}

// ── User Profile ──────────────────────────────
export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*, companies(*)')
    .eq('id', userId)
    .single()

  console.log('Profile:', data)
  console.log('Error:', error)

  return data
}