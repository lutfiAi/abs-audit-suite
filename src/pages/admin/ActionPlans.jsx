import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const STATUS = {
  open:        { label: 'مفتوح',  color: 'bg-red-100 text-red-700',      icon: '🔴' },
  in_progress: { label: 'جارٍ',   color: 'bg-amber-100 text-amber-700',   icon: '🟡' },
  resolved:    { label: 'محلول',  color: 'bg-emerald-100 text-emerald-700', icon: '🟢' },
  overdue:     { label: 'متأخر',  color: 'bg-slate-100 text-slate-700',   icon: '⚫' },
}

const RISK = {
  H: { label: 'عالي',   color: 'bg-red-100 text-red-700 border-red-200' },
  M: { label: 'متوسط',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  L: { label: 'منخفض',  color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div dir="rtl" className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="font-black text-sm">{title}</div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default function ActionPlans() {
  const { profile } = useAuth()
  const [plans, setPlans] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  const fetchAll = useCallback(async () => {
    const cid = profile?.company_id
    if (!cid) return
    const [pl, us] = await Promise.all([
      supabase.from('action_plans').select('*, branches(name), user_profiles(full_name)').eq('company_id', cid).order('created_at', { ascending: false }),
      supabase.from('user_profiles').select('id, full_name').eq('company_id', cid).eq('is_active', true),
    ])
    setPlans(pl.data || [])
    setUsers(us.data || [])
    setLoading(false)
  }, [profile?.company_id])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openEdit = (plan) => {
    setSelected(plan)
    setEditForm({ action_required: plan.action_required || '', assigned_to: plan.assigned_to || '', due_date: plan.due_date || '', status: plan.status || 'open', notes: plan.notes || '' })
  }

  const saveEdit = async () => {
    setSaving(true)
    const updates = { ...editForm }
    if (updates.status === 'resolved') updates.resolved_at = new Date().toISOString()
    await supabase.from('action_plans').update(updates).eq('id', selected.id)
    setSelected(null)
    fetchAll()
    setSaving(false)
  }

  const filtered = filter === 'all' ? plans : plans.filter(p => p.status === filter)
  const counts = {
    all: plans.length,
    open: plans.filter(p => p.status === 'open').length,
    in_progress: plans.filter(p => p.status === 'in_progress').length,
    resolved: plans.filter(p => p.status === 'resolved').length,
    overdue: plans.filter(p => p.status === 'overdue').length,
  }
  const isOverdue = (plan) => plan.due_date && new Date(plan.due_date) < new Date() && plan.status !== 'resolved'

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-black text-slate-800">⚠️ خطط التصحيح</h1>
        <p className="text-slate-500 text-sm">{plans.length} خطة في النظام</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: 'open',        label: 'مفتوحة', icon: '🔴', color: 'border-red-400' },
            { key: 'in_progress', label: 'جارية',  icon: '🟡', color: 'border-amber-400' },
            { key: 'resolved',    label: 'محلولة', icon: '🟢', color: 'border-emerald-400' },
            { key: 'overdue',     label: 'متأخرة', icon: '⚫', color: 'border-slate-400' },
          ].map(s => (
            <div key={s.key} className={`bg-white rounded-2xl p-4 border-r-4 ${s.color} shadow-sm`}>
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-2xl font-black text-slate-800">{counts[s.key]}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all',        label: 'الكل' },
            { key: 'open',       label: '🔴 مفتوح' },
            { key: 'in_progress',label: '🟡 جارٍ' },
            { key: 'resolved',   label: '🟢 محلول' },
            { key: 'overdue',    label: '⚫ متأخر' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all
                ${filter === f.key ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}>
              {f.label} ({counts[f.key] || 0})
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">جارٍ التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">✅</div>
              <div className="text-slate-400 text-sm">لا توجد خطط معلقة</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map(plan => {
                const status  = STATUS[plan.status] || STATUS.open
                const risk    = RISK[plan.risk_level]
                const overdue = isOverdue(plan)
                return (
                  <div key={plan.id} className={`px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors ${overdue ? 'border-r-4 border-red-400' : ''}`}
                    onClick={() => openEdit(plan)}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0 mt-0.5">{status.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{plan.item_text || 'بند غير محدد'}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">🏪 {plan.branches?.name}</span>
                          {plan.user_profiles?.full_name && <span className="text-xs text-slate-400">👤 {plan.user_profiles.full_name}</span>}
                          {plan.due_date && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${overdue ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                              {overdue ? '⚠️ متأخر — ' : '📅 '}{new Date(plan.due_date).toLocaleDateString('ar-SA')}
                            </span>
                          )}
                        </div>
                        {plan.action_required && <p className="text-xs text-slate-500 mt-1 truncate">📝 {plan.action_required}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status.color}`}>{status.label}</span>
                        {risk && <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${risk.color}`}>{risk.label}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <Modal title="✏️ تحديث خطة التصحيح" onClose={() => setSelected(null)}>
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs font-bold text-slate-500 mb-1">البند</p>
              <p className="text-sm text-slate-700">{selected.item_text}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">الإجراء التصحيحي</label>
              <textarea value={editForm.action_required} onChange={e => setEditForm(p => ({ ...p, action_required: e.target.value }))}
                rows={3} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 resize-none"
                placeholder="اكتب الإجراء التصحيحي المطلوب..." />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">المسؤول عن التنفيذ</label>
              <select value={editForm.assigned_to} onChange={e => setEditForm(p => ({ ...p, assigned_to: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                <option value="">اختر المسؤول...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">تاريخ الإنجاز</label>
                <input type="date" value={editForm.due_date} onChange={e => setEditForm(p => ({ ...p, due_date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">الحالة</label>
                <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">ملاحظات</label>
              <textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 resize-none"
                placeholder="ملاحظات إضافية..." />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setSelected(null)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-50">إلغاء</button>
              <button onClick={saveEdit} disabled={saving}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50">
                {saving ? '...جارٍ الحفظ' : '💾 حفظ'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
