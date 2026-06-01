import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const ROLES = {
  super_admin:      { label: 'Super Admin',     icon: '👑', color: 'bg-amber-100 text-amber-700' },
  admin:            { label: 'مدير التدقيق',    icon: '🔴', color: 'bg-red-100 text-red-700' },
  internal_auditor: { label: 'مدقق داخلي',      icon: '🟡', color: 'bg-yellow-100 text-yellow-700' },
  external_auditor: { label: 'مدقق خارجي',      icon: '🟠', color: 'bg-orange-100 text-orange-700' },
  branch_manager:   { label: 'مدير فرع',        icon: '🟢', color: 'bg-emerald-100 text-emerald-700' },
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div dir="rtl" className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="font-black text-sm">{title}</div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default function Users() {
  const { profile } = useAuth()
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    email: '', password: '', full_name: '', role: 'branch_manager', branch_id: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const cid = profile?.company_id
    const [u, b] = await Promise.all([
      supabase.from('user_profiles')
        .select('*, companies(name)')
        .eq('company_id', cid)
        .order('created_at', { ascending: false }),
      supabase.from('branches')
        .select('id, name')
        .eq('company_id', cid)
        .eq('is_active', true),
    ])
    setUsers(u.data || [])
    setBranches(b.data || [])
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!form.email || !form.password || !form.full_name) {
      setError('يرجى ملء جميع الحقول المطلوبة')
      return
    }
    setSaving(true)
    setError('')

    // 1. إنشاء المستخدم في Auth
    const { data: authData, error: authError } = await supabase.auth.admin
      ? await supabase.auth.signUp({ email: form.email, password: form.password })
      : await supabase.auth.signUp({ email: form.email, password: form.password })

    if (authError) {
      setError(authError.message)
      setSaving(false)
      return
    }

    const userId = authData?.user?.id
    if (!userId) {
      setError('حدث خطأ في إنشاء المستخدم')
      setSaving(false)
      return
    }

    // 2. إضافة Profile
    const { error: profileError } = await supabase.from('user_profiles').insert({
      id: userId,
      company_id: profile?.company_id,
      full_name: form.full_name,
      role: form.role,
    })

    if (profileError) {
      setError(profileError.message)
      setSaving(false)
      return
    }

    // 3. ربط بالفرع لو مدير فرع
    if (form.role === 'branch_manager' && form.branch_id) {
      await supabase.from('auditor_branches').insert({
        auditor_id: userId,
        branch_id: form.branch_id,
      })
    }

    setShowAdd(false)
    setForm({ email: '', password: '', full_name: '', role: 'branch_manager', branch_id: '' })
    fetchAll()
    setSaving(false)
  }

  const toggleActive = async (userId, current) => {
    await supabase.from('user_profiles')
      .update({ is_active: !current })
      .eq('id', userId)
    fetchAll()
  }

  const filtered = users.filter(u =>
    u.full_name?.includes(search) || u.role?.includes(search)
  )

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">

      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">👥 إدارة المستخدمين</h1>
          <p className="text-slate-500 text-sm">{users.length} مستخدم في النظام</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm cursor-pointer transition-all hover:scale-105 shadow-md">
          ➕ إضافة مستخدم
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

        {/* SEARCH */}
        <div className="relative">
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الدور..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:border-amber-400 shadow-sm"
          />
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(ROLES).map(([key, r]) => {
            const count = users.filter(u => u.role === key).length
            return (
              <div key={key} className="bg-white rounded-xl p-3 text-center border border-slate-100 shadow-sm">
                <div className="text-xl mb-1">{r.icon}</div>
                <div className="text-2xl font-black text-slate-800">{count}</div>
                <div className="text-xs text-slate-500 mt-0.5">{r.label}</div>
              </div>
            )
          })}
        </div>

        {/* USERS TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">جارٍ التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">👥</div>
              <div className="text-slate-400 text-sm">لا يوجد مستخدمون</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map(u => {
                const role = ROLES[u.role] || { label: u.role, icon: '👤', color: 'bg-slate-100 text-slate-700' }
                return (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center font-black text-white text-sm shadow">
                      {u.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-sm">{u.full_name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {new Date(u.created_at).toLocaleDateString('ar-SA')}
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${role.color}`}>
                      {role.icon} {role.label}
                    </span>
                    <button
                      onClick={() => toggleActive(u.id, u.is_active)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all
                        ${u.is_active
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-700'
                          : 'bg-red-100 text-red-700 hover:bg-emerald-100 hover:text-emerald-700'}`}>
                      {u.is_active ? '✅ نشط' : '❌ معطّل'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ADD USER MODAL */}
      {showAdd && (
        <Modal title="➕ إضافة مستخدم جديد" onClose={() => { setShowAdd(false); setError('') }}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">الاسم الكامل *</label>
              <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                placeholder="مثال: أحمد محمد" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">البريد الإلكتروني *</label>
              <input type="email" dir="ltr" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                placeholder="email@company.com" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">كلمة المرور *</label>
              <input type="password" dir="ltr" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                placeholder="••••••••" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">الدور الوظيفي *</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                {Object.entries(ROLES).filter(([k]) => k !== 'super_admin').map(([key, r]) => (
                  <option key={key} value={key}>{r.icon} {r.label}</option>
                ))}
              </select>
            </div>
            {(form.role === 'branch_manager' || form.role === 'internal_auditor') && (
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">الفرع</label>
                <select value={form.branch_id} onChange={e => setForm(p => ({ ...p, branch_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                  <option value="">اختر الفرع...</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-600 text-xs">{error}</div>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setShowAdd(false); setError('') }}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-50">
                إلغاء
              </button>
              <button onClick={handleAdd} disabled={saving}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50">
                {saving ? '...جارٍ الحفظ' : '➕ إضافة'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}