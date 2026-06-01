import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { createUser, deleteUser, updateUser } from '../../lib/adminApi'
import { useAuth } from '../../context/AuthContext'

const ROLES = {
  super_admin:      { label: 'Super Admin',   icon: '👑', color: 'bg-amber-100 text-amber-700' },
  admin:            { label: 'مدير التدقيق', icon: '🔴', color: 'bg-red-100 text-red-700' },
  internal_auditor: { label: 'مدقق داخلي',   icon: '🟡', color: 'bg-yellow-100 text-yellow-700' },
  external_auditor: { label: 'مدقق خارجي',   icon: '🟠', color: 'bg-orange-100 text-orange-700' },
  branch_manager:   { label: 'مدير فرع',      icon: '🟢', color: 'bg-emerald-100 text-emerald-700' },
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

function UserRow({ u, onEdit, onDelete, onToggle }) {
  const role = ROLES[u.role] || { label: u.role, icon: '👤', color: 'bg-slate-100 text-slate-700' }
  return (
    <div className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
      {/* الأزرار على اليمين أول شي في RTL */}
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => onEdit(u)}
          className="w-8 h-8 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 flex items-center justify-center cursor-pointer transition-colors">
          ✏️
        </button>
        <button onClick={() => onToggle(u.id, u.is_active)}
          className={`text-xs font-bold px-2 py-1.5 rounded-xl cursor-pointer transition-all whitespace-nowrap
            ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {u.is_active ? '✅' : '❌'}
        </button>
        <button onClick={() => onDelete(u)}
          className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center cursor-pointer transition-colors">
          🗑️
        </button>
      </div>
      {/* Role */}
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${role.color}`}>
        {role.icon} {role.label}
      </span>
      {/* Name */}
      <div className="flex-1 min-w-0 text-right">
        <div className="font-bold text-slate-800 text-sm truncate">{u.full_name}</div>
        <div className="text-xs text-slate-400">{new Date(u.created_at).toLocaleDateString('ar-SA')}</div>
      </div>
      {/* Avatar */}
      <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center font-black text-white text-sm shadow shrink-0">
        {u.full_name?.charAt(0) || '?'}
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
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'branch_manager', branch_id: '' })
  const [editForm, setEditForm] = useState({ full_name: '', role: '', branch_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchAll = useCallback(async () => {
    const cid = profile?.company_id
    if (!cid) return
    const [u, b] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('company_id', cid).order('created_at', { ascending: false }),
      supabase.from('branches').select('id, name').eq('company_id', cid).eq('is_active', true),
    ])
    setUsers(u.data || [])
    setBranches(b.data || [])
    setLoading(false)
  }, [profile?.company_id])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleAdd = async () => {
    if (!form.email || !form.password || !form.full_name) { setError('يرجى ملء جميع الحقول المطلوبة'); return }
    setSaving(true); setError('')
    const { error: err } = await createUser({ ...form, company_id: profile?.company_id, branch_id: form.branch_id || null })
    if (err) { setError(err.message); setSaving(false); return }
    setShowAdd(false)
    setForm({ email: '', password: '', full_name: '', role: 'branch_manager', branch_id: '' })
    fetchAll(); setSaving(false)
  }

  const handleEdit = async () => {
    setSaving(true); setError('')
    const { error: err } = await updateUser(selectedUser.id, editForm)
    if (err) { setError(err.message); setSaving(false); return }
    setShowEdit(false); fetchAll(); setSaving(false)
  }

  const handleDelete = async () => {
    setSaving(true)
    await deleteUser(selectedUser.id)
    setShowDelete(false); fetchAll(); setSaving(false)
  }

  const toggleActive = async (userId, current) => {
    await supabase.from('user_profiles').update({ is_active: !current }).eq('id', userId)
    fetchAll()
  }

  const openEdit = (user) => {
    setSelectedUser(user)
    setEditForm({ full_name: user.full_name, role: user.role, branch_id: '' })
    setShowEdit(true); setError('')
  }

  const filtered = users.filter(u => u.full_name?.includes(search) || u.role?.includes(search))

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">

      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">👥 إدارة المستخدمين</h1>
          <p className="text-slate-500 text-sm">{users.length} مستخدم في النظام</p>
        </div>
        <button onClick={() => { setShowAdd(true); setError('') }}
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm cursor-pointer transition-all hover:scale-105 shadow-md shrink-0">
          ➕ إضافة مستخدم
        </button>
      </div>

      <div className="p-4 space-y-4">

        {/* STATS */}
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(ROLES).map(([key, r]) => (
            <div key={key} className="bg-white rounded-xl p-3 text-center border border-slate-100 shadow-sm">
              <div className="text-lg mb-1">{r.icon}</div>
              <div className="text-xl font-black text-slate-800">{users.filter(u => u.role === key).length}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{r.label}</div>
            </div>
          ))}
        </div>

        {/* SEARCH */}
        <div className="relative">
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الدور..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:border-amber-400 shadow-sm" />
        </div>

        {/* USERS LIST */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">جارٍ التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">👥</div>
              <div className="text-slate-400 text-sm">لا يوجد مستخدمون</div>
            </div>
          ) : (
            filtered.map(u => (
              <UserRow key={u.id} u={u}
                onEdit={openEdit}
                onDelete={(u) => { setSelectedUser(u); setShowDelete(true) }}
                onToggle={toggleActive} />
            ))
          )}
        </div>
      </div>

      {/* ADD MODAL */}
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
            {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-600 text-xs">{error}</div>}
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setShowAdd(false); setError('') }}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-50">إلغاء</button>
              <button onClick={handleAdd} disabled={saving}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50">
                {saving ? '...جارٍ الحفظ' : '➕ إضافة'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT MODAL */}
      {showEdit && selectedUser && (
        <Modal title="✏️ تعديل المستخدم" onClose={() => { setShowEdit(false); setError('') }}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">الاسم الكامل</label>
              <input value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">الدور الوظيفي</label>
              <select value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                {Object.entries(ROLES).filter(([k]) => k !== 'super_admin').map(([key, r]) => (
                  <option key={key} value={key}>{r.icon} {r.label}</option>
                ))}
              </select>
            </div>
            {(editForm.role === 'branch_manager' || editForm.role === 'internal_auditor') && (
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">الفرع</label>
                <select value={editForm.branch_id} onChange={e => setEditForm(p => ({ ...p, branch_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                  <option value="">اختر الفرع...</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
            {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-600 text-xs">{error}</div>}
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setShowEdit(false); setError('') }}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-50">إلغاء</button>
              <button onClick={handleEdit} disabled={saving}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50">
                {saving ? '...جارٍ الحفظ' : '💾 حفظ التعديل'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE MODAL */}
      {showDelete && selectedUser && (
        <Modal title="🗑️ حذف المستخدم" onClose={() => setShowDelete(false)}>
          <div className="text-center">
            <div className="text-5xl mb-3">⚠️</div>
            <p className="text-slate-700 font-bold mb-1">هل تريد حذف هذا المستخدم نهائياً؟</p>
            <p className="text-amber-600 font-black mb-5">{selectedUser.full_name}</p>
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-600 text-xs mb-4">
              ⚠️ هذا الإجراء لا يمكن التراجع عنه
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDelete(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-50">إلغاء</button>
              <button onClick={handleDelete} disabled={saving}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50">
                {saving ? '...جارٍ الحذف' : '🗑️ حذف نهائي'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
