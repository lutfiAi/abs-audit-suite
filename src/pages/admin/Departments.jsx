import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const RISK_LABELS = {
  H: { label: 'عالي',    color: 'bg-red-100 text-red-700 border-red-200' },
  M: { label: 'متوسط',   color: 'bg-amber-100 text-amber-700 border-amber-200' },
  L: { label: 'منخفض',   color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
}

const ICONS = ['📋','🔍','💰','👥','🏪','📊','🔧','🛒','💻','✅','🏭','📣','🎯','🔐','📦','✨','🤝','🚗','📱','🏆']

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

export default function Departments() {
  const { profile } = useAuth()
  const [departments, setDepartments] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeDept, setActiveDept] = useState(null)
  const [showAddDept, setShowAddDept] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [showEditItem, setShowEditItem] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [deptForm, setDeptForm] = useState({ name_ar: '', name_en: '', icon: '📋' })
  const [itemForm, setItemForm] = useState({ text_ar: '', text_en: '', risk_level: 'M', max_score: 10 })
  const [editItemForm, setEditItemForm] = useState({ text_ar: '', risk_level: 'M', max_score: 10 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchDepts = useCallback(async () => {
    const { data } = await supabase
      .from('departments')
      .select('*')
      .eq('company_id', profile?.company_id)
      .eq('is_active', true)
      .order('order_num')
    setDepartments(data || [])
    if (data?.length > 0 && !activeDept) setActiveDept(data[0])
    setLoading(false)
  }, [profile?.company_id, activeDept])

  const fetchItems = useCallback(async (deptId) => {
    const { data } = await supabase
      .from('audit_items')
      .select('*')
      .eq('department_id', deptId)
      .eq('is_active', true)
      .order('order_num')
    setItems(data || [])
  }, [])

  useEffect(() => { fetchDepts() }, [fetchDepts])
  useEffect(() => { if (activeDept) fetchItems(activeDept.id) }, [activeDept, fetchItems])

  const handleAddDept = async () => {
    if (!deptForm.name_ar) { setError('يرجى إدخال اسم القسم'); return }
    setSaving(true); setError('')
    const { data, error: err } = await supabase.from('departments').insert({
      company_id: profile?.company_id,
      name_ar: deptForm.name_ar,
      name_en: deptForm.name_en,
      icon: deptForm.icon,
      order_num: departments.length,
    }).select().single()
    if (err) { setError(err.message); setSaving(false); return }
    setShowAddDept(false)
    setDeptForm({ name_ar: '', name_en: '', icon: '📋' })
    await fetchDepts()
    setActiveDept(data)
    setSaving(false)
  }

  const handleAddItem = async () => {
    if (!itemForm.text_ar) { setError('يرجى إدخال نص البند'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('audit_items').insert({
      department_id: activeDept.id,
      company_id: profile?.company_id,
      text_ar: itemForm.text_ar,
      text_en: itemForm.text_en,
      risk_level: itemForm.risk_level,
      max_score: Number(itemForm.max_score),
      order_num: items.length,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setShowAddItem(false)
    setItemForm({ text_ar: '', text_en: '', risk_level: 'M', max_score: 10 })
    fetchItems(activeDept.id)
    setSaving(false)
  }

  const handleEditItem = async () => {
    setSaving(true); setError('')
    const { error: err } = await supabase.from('audit_items').update({
      text_ar: editItemForm.text_ar,
      risk_level: editItemForm.risk_level,
      max_score: Number(editItemForm.max_score),
    }).eq('id', selectedItem.id)
    if (err) { setError(err.message); setSaving(false); return }
    setShowEditItem(false)
    fetchItems(activeDept.id)
    setSaving(false)
  }

  const openEditItem = (item) => {
    setSelectedItem(item)
    setEditItemForm({ text_ar: item.text_ar, risk_level: item.risk_level, max_score: item.max_score })
    setShowEditItem(true)
    setError('')
  }

  const deleteDept = async (id) => {
    if (!confirm('هل تريد حذف هذا القسم وجميع بنوده؟')) return
    await supabase.from('departments').update({ is_active: false }).eq('id', id)
    setActiveDept(null)
    setItems([])
    fetchDepts()
  }

  const deleteItem = async (id) => {
    if (!confirm('هل تريد حذف هذا البند؟')) return
    await supabase.from('audit_items').update({ is_active: false }).eq('id', id)
    fetchItems(activeDept.id)
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">

      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">📋 الأقسام والبنود</h1>
          <p className="text-slate-500 text-sm">{departments.length} قسم — {items.length} بند في القسم الحالي</p>
        </div>
        <button onClick={() => setShowAddDept(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm cursor-pointer transition-all hover:scale-105 shadow-md shrink-0">
          ➕ إضافة قسم
        </button>
      </div>

      <div className="flex" style={{ height: 'calc(100vh - 73px)' }}>

        {/* DEPTS SIDEBAR */}
        <div className="w-64 bg-white border-l border-slate-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-400 px-2">الأقسام</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="p-4 text-center text-slate-400 text-sm">جارٍ التحميل...</div>
            ) : departments.length === 0 ? (
              <div className="p-4 text-center">
                <div className="text-3xl mb-2">📋</div>
                <div className="text-slate-400 text-xs">لا توجد أقسام</div>
              </div>
            ) : departments.map(d => (
              <div dir="ltr" key={d.id}
                onClick={() => { setActiveDept(d); fetchItems(d.id) }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all group
                  ${activeDept?.id === d.id ? 'bg-amber-500 text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
                <button
                  onClick={e => { e.stopPropagation(); deleteDept(d.id) }}
                  className={`opacity-0 group-hover:opacity-100 text-xs px-1 py-0.5 rounded-lg transition-all shrink-0
                    ${activeDept?.id === d.id ? 'hover:bg-white/20 text-white' : 'hover:bg-red-100 text-red-500'}`}>
                  🗑️
                </button>
                <span className="flex-1 text-sm font-bold truncate text-right">{d.name_ar}</span>
                <span className="text-lg shrink-0">{d.icon}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ITEMS AREA */}
        <div className="flex-1 overflow-y-auto p-5">
          {!activeDept ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-5xl mb-3">👈</div>
                <div className="text-slate-400">اختر قسماً من القائمة</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button onClick={() => setShowAddItem(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-sm cursor-pointer transition-all hover:scale-105 shadow-sm shrink-0">
                  ➕ إضافة بند
                </button>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <h2 className="font-black text-slate-800">{activeDept.name_ar}</h2>
                    <p className="text-xs text-slate-400">{items.length} بند</p>
                  </div>
                  <span className="text-2xl">{activeDept.icon}</span>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
                  <div className="text-4xl mb-2">📝</div>
                  <div className="text-slate-400 text-sm">لا توجد بنود في هذا القسم</div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  {items.map((item, i) => {
                    const risk = RISK_LABELS[item.risk_level]
                    return (
                      <div dir="ltr" key={item.id} className={`flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors ${i > 0 ? 'border-t border-slate-50' : ''}`}>
                        {/* أزرار صغيرة */}
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => openEditItem(item)}
                            className="w-6 h-6 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-600 flex items-center justify-center cursor-pointer transition-colors text-xs">
                            ✏️
                          </button>
                          <button onClick={() => deleteItem(item.id)}
                            className="w-6 h-6 rounded-md bg-red-100 hover:bg-red-200 text-red-500 flex items-center justify-center cursor-pointer transition-colors text-xs">
                            🗑️
                          </button>
                        </div>
                        {/* المحتوى */}
                        <div className="flex-1 min-w-0 text-right">
                          <p className="text-sm text-slate-700 leading-relaxed">{item.text_ar}</p>
                          <div className="flex items-center gap-2 mt-1 justify-end">
                            <span className="text-xs text-slate-400">{item.max_score} درجة</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${risk.color}`}>
                              {risk.label}
                            </span>
                          </div>
                        </div>
                        {/* الرقم */}
                        <div className="w-6 h-6 bg-slate-100 rounded-md flex items-center justify-center text-xs font-black text-slate-500 shrink-0">
                          {i + 1}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ADD DEPT MODAL */}
      {showAddDept && (
        <Modal title="➕ إضافة قسم جديد" onClose={() => { setShowAddDept(false); setError('') }}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">اسم القسم بالعربي *</label>
              <input value={deptForm.name_ar} onChange={e => setDeptForm(p => ({ ...p, name_ar: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                placeholder="مثال: العمليات التشغيلية" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">اسم القسم بالإنجليزي</label>
              <input dir="ltr" value={deptForm.name_en} onChange={e => setDeptForm(p => ({ ...p, name_en: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                placeholder="Example: Store Operations" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-2">الأيقونة</label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map(icon => (
                  <button key={icon} onClick={() => setDeptForm(p => ({ ...p, icon }))}
                    className={`w-9 h-9 rounded-xl text-lg cursor-pointer transition-all
                      ${deptForm.icon === icon ? 'bg-amber-500 shadow-md scale-110' : 'bg-slate-100 hover:bg-slate-200'}`}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-600 text-xs">{error}</div>}
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setShowAddDept(false); setError('') }}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-50">إلغاء</button>
              <button onClick={handleAddDept} disabled={saving}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50">
                {saving ? '...جارٍ الحفظ' : '➕ إضافة'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ADD ITEM MODAL */}
      {showAddItem && (
        <Modal title="➕ إضافة بند جديد" onClose={() => { setShowAddItem(false); setError('') }}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">نص البند بالعربي *</label>
              <textarea value={itemForm.text_ar} onChange={e => setItemForm(p => ({ ...p, text_ar: e.target.value }))}
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 resize-none"
                placeholder="اكتب نص البند هنا..." />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">نص البند بالإنجليزي</label>
              <textarea dir="ltr" value={itemForm.text_en} onChange={e => setItemForm(p => ({ ...p, text_en: e.target.value }))}
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 resize-none"
                placeholder="Write item text in English..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">مستوى الخطورة</label>
                <div className="flex gap-2">
                  {Object.entries(RISK_LABELS).map(([k, v]) => (
                    <button key={k} onClick={() => setItemForm(p => ({ ...p, risk_level: k }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all
                        ${itemForm.risk_level === k ? v.color + ' scale-105' : 'bg-white text-slate-500 border-slate-200'}`}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">الدرجة القصوى</label>
                <select value={itemForm.max_score} onChange={e => setItemForm(p => ({ ...p, max_score: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white">
                  {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} درجة</option>)}
                </select>
              </div>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-600 text-xs">{error}</div>}
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setShowAddItem(false); setError('') }}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-50">إلغاء</button>
              <button onClick={handleAddItem} disabled={saving}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50">
                {saving ? '...جارٍ الحفظ' : '➕ إضافة'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT ITEM MODAL */}
      {showEditItem && selectedItem && (
        <Modal title="✏️ تعديل البند" onClose={() => { setShowEditItem(false); setError('') }}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">نص البند *</label>
              <textarea value={editItemForm.text_ar} onChange={e => setEditItemForm(p => ({ ...p, text_ar: e.target.value }))}
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">مستوى الخطورة</label>
                <div className="flex gap-2">
                  {Object.entries(RISK_LABELS).map(([k, v]) => (
                    <button key={k} onClick={() => setEditItemForm(p => ({ ...p, risk_level: k }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all
                        ${editItemForm.risk_level === k ? v.color + ' scale-105' : 'bg-white text-slate-500 border-slate-200'}`}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">الدرجة القصوى</label>
                <select value={editItemForm.max_score} onChange={e => setEditItemForm(p => ({ ...p, max_score: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white">
                  {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} درجة</option>)}
                </select>
              </div>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-600 text-xs">{error}</div>}
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setShowEditItem(false); setError('') }}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-50">إلغاء</button>
              <button onClick={handleEditItem} disabled={saving}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50">
                {saving ? '...جارٍ الحفظ' : '💾 حفظ'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
