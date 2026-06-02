import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

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

export default function Branches() {
  const { profile } = useAuth()
  const [branches, setBranches] = useState([])
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '', code: '', region: '', manager_id: '' })
  const [editForm, setEditForm] = useState({ name: '', code: '', region: '', manager_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchAll = useCallback(async () => {
    const cid = profile?.company_id
    if (!cid) return
    const [br, mg] = await Promise.all([
      supabase.from('branches').select('*, user_profiles(full_name)').eq('company_id', cid).order('created_at', { ascending: false }),
      supabase.from('user_profiles').select('id, full_name').eq('company_id', cid).eq('role', 'branch_manager').eq('is_active', true),
    ])
    setBranches(br.data || [])
    setManagers(mg.data || [])
    setLoading(false)
  }, [profile?.company_id])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleAdd = async () => {
    if (!form.name) { setError('يرجى إدخال اسم الفرع'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('branches').insert({
      company_id: profile?.company_id,
      name: form.name, code: form.code, region: form.region,
      manager_id: form.manager_id || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setShowAdd(false)
    setForm({ name: '', code: '', region: '', manager_id: '' })
    fetchAll(); setSaving(false)
  }

  const handleEdit = async () => {
    if (!editForm.name) { setError('يرجى إدخال اسم الفرع'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('branches').update({
      name: editForm.name, code: editForm.code,
      region: editForm.region, manager_id: editForm.manager_id || null,
    }).eq('id', selected.id)
    if (err) { setError(err.message); setSaving(false); return }
    setShowEdit(false); fetchAll(); setSaving(false)
  }

  const handleDelete = async () => {
    setSaving(true)
    await supabase.from('branches').update({ is_active: false }).eq('id', selected.id)
    setShowDelete(false); fetchAll(); setSaving(false)
  }

  const openEdit = (b) => {
    setSelected(b)
    setEditForm({ name: b.name, code: b.code || '', region: b.region || '', manager_id: b.manager_id || '' })
    setShowEdit(true); setError('')
  }

  const filtered = branches.filter(b =>
    b.name?.includes(search) || b.region?.includes(search) || b.code?.includes(search)
  )

  const active   = branches.filter(b => b.is_active).length
  const inactive = branches.filter(b => !b.is_active).length

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">🏪 إدارة الفروع</h1>
          <p className="text-slate-500 text-sm">{branches.length} فرع في النظام</p>
        </div>
        <button onClick={() => { setShowAdd(true); setError('') }}
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm cursor-pointer transition-all hover:scale-105 shadow-md shrink-0">
          ➕ إضافة فرع
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'إجمالي الفروع', value: branches.length, icon: '🏪', color: 'border-sky-500' },
            { label: 'فروع نشطة',    value: active,           icon: '✅', color: 'border-emerald-500' },
            { label: 'فروع معطّلة',  value: inactive,         icon: '❌', color: 'border-red-500' },
          ].map(s => (
            <div key={s.label} className={`bg-white rounded-2xl p-4 border-r-4 ${s.color} shadow-sm`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-black text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="relative">
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو المنطقة أو الكود..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:border-amber-400 shadow-sm" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">جارٍ التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">🏪</div>
              <div className="text-slate-400 text-sm">لا توجد فروع</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map((b, i) => (
                <div key={b.id} dir="ltr" className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                  {/* Buttons on the left */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => openEdit(b)}
                      className="w-8 h-8 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 flex items-center justify-center cursor-pointer transition-colors">
                      ✏️
                    </button>
                    <button onClick={() => { setSelected(b); setShowDelete(true) }}
                      className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center cursor-pointer transition-colors">
                      🗑️
                    </button>
                  </div>

                  {/* Info on the right */}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow shrink-0
                      ${b.is_active ? 'bg-gradient-to-br from-sky-400 to-sky-600' : 'bg-slate-300'}`}>
                      {i + 1}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-800 text-sm">{b.name}</div>
                      <div className="flex items-center gap-2 mt-0.5 justify-end">
                        {b.code && <span className="text-xs text-slate-400">#{b.code}</span>}
                        {b.region && <span className="text-xs text-slate-400">📍 {b.region}</span>}
                        {b.user_profiles?.full_name && <span className="text-xs text-slate-400">👤 {b.user_profiles.full_name}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <Modal title="➕ إضافة فرع جديد" onClose={() => { setShowAdd(false); setError('') }}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">اسم الفرع *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                placeholder="مثال: فرع الرياض" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">كود الفرع</label>
              <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                placeholder="مثال: RYD-001" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">المنطقة</label>
              <input value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                placeholder="مثال: الرياض" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">مدير الفرع</label>
              <select value={form.manager_id} onChange={e => setForm(p => ({ ...p, manager_id: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                <option value="">اختر مدير الفرع...</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
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

      {showEdit && selected && (
        <Modal title="✏️ تعديل الفرع" onClose={() => { setShowEdit(false); setError('') }}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">اسم الفرع *</label>
              <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">كود الفرع</label>
              <input value={editForm.code} onChange={e => setEditForm(p => ({ ...p, code: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">المنطقة</label>
              <input value={editForm.region} onChange={e => setEditForm(p => ({ ...p, region: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">مدير الفرع</label>
              <select value={editForm.manager_id} onChange={e => setEditForm(p => ({ ...p, manager_id: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                <option value="">اختر مدير الفرع...</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
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

      {showDelete && selected && (
        <Modal title="🗑️ حذف الفرع" onClose={() => setShowDelete(false)}>
          <div className="text-center">
            <div className="text-5xl mb-3">⚠️</div>
            <p className="text-slate-700 font-bold mb-1">هل تريد حذف هذا الفرع؟</p>
            <p className="text-amber-600 font-black mb-5">{selected.name}</p>
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-600 text-xs mb-4">
              ⚠️ سيتم إلغاء تفعيل الفرع
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDelete(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-50">إلغاء</button>
              <button onClick={handleDelete} disabled={saving}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50">
                {saving ? '...جارٍ الحذف' : '🗑️ حذف'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
