import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  }
})

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () =>
  supabase.auth.signOut()

export const getUser = async () => {
  const { data } = await supabase.auth.getUser()
  return data?.user ?? null
}

export const getUserProfile = async (userId) => {
  const { data } = await supabase
    .from('user_profiles')
    .select('*, companies(*)')
    .eq('id', userId)
    .single()
  return data
}