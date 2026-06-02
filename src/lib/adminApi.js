import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY,
  {
    auth: {
      storageKey: 'admin-auth',
      autoRefreshToken: false,
      persistSession: false,
    }
  }
)

// إنشاء مستخدم جديد
export const createUser = async ({ email, password, full_name, role, company_id, branch_id }) => {
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError) return { error: authError }

  const userId = authData.user.id

  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .insert({ id: userId, company_id, full_name, role })

  if (profileError) return { error: profileError }

  if (branch_id) {
    await supabaseAdmin
      .from('auditor_branches')
      .insert({ auditor_id: userId, branch_id })
  }

  return { data: authData.user }
}

// حذف مستخدم نهائياً
export const deleteUser = async (userId) => {
  // 1. إزالة مدير الفرع
  await supabaseAdmin
    .from('branches')
    .update({ manager_id: null })
    .eq('manager_id', userId)

  // 2. حذف من auditor_branches
  await supabaseAdmin
    .from('auditor_branches')
    .delete()
    .eq('auditor_id', userId)

  // 3. حذف من user_profiles
  await supabaseAdmin
    .from('user_profiles')
    .delete()
    .eq('id', userId)

  // 4. حذف من Auth
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) return { error }

  return { success: true }
}

// تحديث بيانات المستخدم
export const updateUser = async (userId, updates) => {
  const { full_name, role, branch_id } = updates

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({ full_name, role })
    .eq('id', userId)

  if (error) return { error }

  if (branch_id) {
    await supabaseAdmin.from('auditor_branches').delete().eq('auditor_id', userId)
    await supabaseAdmin.from('auditor_branches').insert({ auditor_id: userId, branch_id })
  }

  return { success: true }
}
