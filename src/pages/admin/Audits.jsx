import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const RISK_LABELS = {
  H: { label: 'عالي', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
  M: { label: 'متوسط', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  L: { label: 'منخفض', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
}

const AUDIT_TYPES = {
  self_assessment: { label: 'تقييم ذاتي', icon: '📝', color: 'bg-blue-500' },
  internal_audit: { label: 'تدقيق داخلي', icon: '🔍', color: 'bg-violet-500' },
  external_audit: { label: 'تدقيق خارجي', icon: '🏛️', color: 'bg-amber-500' },
}

function Ring({ pct, size = 60, stroke = 6 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const color = pct >= 85 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${(pct/100)*circ} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.5s ease' }} />
    </svg>
  )
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

export default function Audits() {
  const { profile } = useAuth()
  const [view, setView] = useState('list')
  const [audits, setAudits] = useState([])
  const [branches, setBranches] = useState([])
  const [departments, setDepartments] = useState([])
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ branch_id: '', audit_type: 'internal_audit' })
  const [activeAudit, setActiveAudit] = useState(null)
  const [scores, setScores] = useState({})
  const [notes, setNotes] = useState({})
  const [saving, setSaving] = useState(false)
  const [openDept, setOpenDept] = useState(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const cid = profile?.company_id
    const [au, br, dp, it] = await Promise.all([
      supabase.from('audits').select('*, branches(name), user_profiles(full_name)')
        .eq('company_id', cid).order('created_at', { ascending: false }),
      supabase.from('branches').select('id,name').eq('company_id', cid).eq('is_active', true),
      supabase.from('departments').select('*').eq('company_id', cid).eq('is_active', true).order('order_num'),
      supabase.from('audit_items').select('*').eq('company_id', cid).eq('is_active', true).order('order_num'),
    ])
    setAudits(au.data || [])
    setBranches(br.data || [])
    setDepartments(dp.data || [])
    setAllItems(it.data || [])
    if (dp.data?.length > 0) setOpenDept(dp.data[0].id)
    setLoading(false)
  }

  const startNewAudit = async () => {
    if (!newForm.branch_id) return
    setSaving(true)
    const { data, error } = await supabase.from('audits').insert({
      company_id: profile?.company_id,
      branch_id: newForm.branch_id,
      auditor_id: profile?.id,
      audit_type: newForm.audit_type,
      status: 'in_progress',
    }).select().single()
    if (!error && data) {
      setActiveAudit(data)
      setScores({})
      setNotes({})
      setView('audit')
      setShowNew(false)
    }
    setSaving(false)
  }

  const openAudit = async (audit) => {
    setActiveAudit(audit)
    setScores(audit.scores || {})
    setNotes(audit.notes || {})
    setView('audit')
  }

  const setScore = (itemId, val) => {
    setScores(p => ({ ...p, [itemId]: val }))
  }

  const calcTotals = () => {
    const deptItems = allItems.filter(i => departments.some(d => d.id === i.department_id))
    const total = deptItems.reduce((a, i) => a + (scores[i.id] ?? 0), 0)
    const max = deptItems.reduce((a, i) => a + i.max_score, 0)
    const pct = max > 0 ? Math.round((total / max) * 100) : 0
    return { total, max, pct }
  }

  const saveAudit = async (status = 'in_progress') => {
    setSaving(true)
    const { total, max, pct } = calcTotals()
    await supabase.from('audits').update({
      scores, notes,
      total_score: total,
      max_score: max,
      percentage: pct,
      status,
      submitted_at: status === 'completed' ? new Date().toISOString() : null,
    }).eq('id', activeAudit.id)
    await fetchAll()
    if (status === 'completed') setView('list')
    setSaving(false)
  }

  const { total, max, pct } = activeAudit ? calcTotals() : { total: 0, max: 0, pct: 0 }
  const pctColor = pct >= 85 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'

  if (view === 'audit' && activeAudit) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50">
        {/* AUDIT HEADER */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('list')}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer">
                ←
              </button>
              <div>
                <h1 className="font-black text-slate-800">{activeAudit.branches?.name || 'فرع غير محدد'}</h1>
                <p className="text-xs text-slate-400">{AUDIT_TYPES[activeAudit.audit_type]?.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Ring pct={pct} size={52} stroke={5} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xs font-black ${pctColor}`}>{pct}%</span>
                </div>
              </div>
              <div className="text-center">
                <div className="font-black text-slate-800">{total}/{max}</div>
                <div className="text-xs text-slate-400">درجة</div>
              </div>
              <button onClick={() => saveAudit('in_progress')} disabled={saving}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-xl text-sm cursor-pointer">
                💾 حفظ
              </button>
              <button onClick={() => saveAudit('completed')} disabled={saving}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-sm cursor-pointer">
                ✅ إرسال
              </button>
            </div>
          </div>
        </div>

        {/* AUDIT ITEMS */}
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {departments.map(dept => {
            const deptItems = allItems.filter(i => i.department_id === dept.id)
            if (deptItems.length === 0) return null
            const deptScore = deptItems.reduce((a, i) => a + (scores[i.id] ?? 0), 0)
            const deptMax = deptItems.reduce((a, i) => a + i.max_score, 0)
            const deptPct = deptMax > 0 ? Math.round((deptScore / deptMax) * 100) : 0
            const isOpen = openDept === dept.id
            const barColor = deptPct >= 85 ? 'bg-emerald-500' : deptPct >= 60 ? 'bg-amber-500' : 'bg-red-500'

            return (
              <div key={dept.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <button onClick={() => setOpenDept(isOpen ? null : dept.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors">
                  <span className="text-xl">{dept.icon}</span>
                  <div className="flex-1 text-right">
                    <div className="font-bold text-slate-800 text-sm">{dept.name_ar}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${deptPct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-500">{deptScore}/{deptMax}</span>
                    </div>
                  </div>
                  <span className="text-slate-400">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-50 divide-y divide-slate-50">
                    {deptItems.map((item, i) => {
                      const score = scores[item.id]
                      const risk = RISK_LABELS[item.risk_level]
                      const rowBg = score === undefined ? '' : score === 0 ? 'bg-red-50/50' : score === item.max_score ? 'bg-emerald-50/50' : 'bg-amber-50/50'

                      return (
                        <div key={item.id} className={`px-5 py-4 ${rowBg} transition-colors`}>
                          <div className="flex items-start gap-3">
                            <span className="text-xs font-mono text-slate-400 mt-0.5 shrink-0 w-6">{i + 1}</span>
                            <div className="flex-1">
                              <p className="text-sm text-slate-700 leading-relaxed mb-2">{item.text_ar}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${risk.color}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`}></span>
                                  {risk.label}
                                </span>
                                <div className="flex gap-1.5">
                                  {[0, Math.round(item.max_score / 2), item.max_score].map(v => (
                                    <button key={v} onClick={() => setScore(item.id, v)}
                                      className={`px-3 py-1 rounded-lg border-2 text-xs font-bold cursor-pointer transition-all
                                        ${score === v
                                          ? v === 0 ? 'bg-red-600 text-white border-red-600' : v === item.max_score ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-amber-500 text-white border-amber-500'
                                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                                      {v === 0 ? 'غير راضي' : v === item.max_score ? 'راضي' : 'مقبول'} ({v})
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <input value={notes[item.id] || ''} onChange={e => setNotes(p => ({ ...p, [item.id]: e.target.value }))}
                                placeholder="ملاحظة..."
                                className="mt-2 w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white/70" />
                            </div>
                            <div className="shrink-0 w-8 text-center">
                              <span className={`text-sm font-black ${score === undefined ? 'text-slate-200' : score === 0 ? 'text-red-500' : score === item.max_score ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {score ?? '–'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">🔍 التدقيقات</h1>
          <p className="text-slate-500 text-sm">{audits.length} تدقيق في النظام</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm cursor-pointer transition-all hover:scale-105 shadow-md">
          ➕ تدقيق جديد
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'إجمالي التدقيقات', value: audits.length, icon: '📋', color: 'border-sky-500' },
            { label: 'مكتملة', value: audits.filter(a => a.status !== 'in_progress').length, icon: '✅', color: 'border-emerald-500' },
            { label: 'جارية', value: audits.filter(a => a.status === 'in_progress').length, icon: '⏳', color: 'border-amber-500' },
          ].map(s => (
            <div key={s.label} className={`bg-white rounded-2xl p-4 border-r-4 ${s.color} shadow-sm`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-black text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* AUDITS LIST */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">جارٍ التحميل...</div>
          ) : audits.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">🔍</div>
              <div className="text-slate-400 text-sm">لا توجد تدقيقات بعد</div>
              <button onClick={() => setShowNew(true)}
                className="mt-3 bg-amber-500 hover:bg-amber-600 text-white text-xs px-4 py-2 rounded-xl font-bold cursor-pointer">
                ابدأ أول تدقيق
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {audits.map((audit, i) => {
                const type = AUDIT_TYPES[audit.audit_type]
                const pct = audit.percentage || 0
                const pColor = pct >= 85 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'
                const statusLabel = { in_progress: 'جارٍ', completed: 'مكتمل', approved: 'معتمد' }[audit.status]
                const statusColor = { in_progress: 'bg-amber-100 text-amber-700', completed: 'bg-emerald-100 text-emerald-700', approved: 'bg-blue-100 text-blue-700' }[audit.status]

                return (
                  <div key={audit.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => openAudit(audit)}>
                    <div className={`w-10 h-10 ${type?.color || 'bg-slate-500'} rounded-xl flex items-center justify-center text-lg`}>
                      {type?.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-sm">{audit.branches?.name || 'غير محدد'}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{type?.label}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-400">{new Date(audit.created_at).toLocaleDateString('ar-SA')}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
                    <div className="relative shrink-0">
                      <Ring pct={pct} size={44} stroke={5} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-black" style={{ color: pColor }}>{pct}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* NEW AUDIT MODAL */}
      {showNew && (
        <Modal title="🔍 تدقيق جديد" onClose={() => setShowNew(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">الفرع *</label>
              <select value={newForm.branch_id} onChange={e => setNewForm(p => ({ ...p, branch_id: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                <option value="">اختر الفرع...</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-2">نوع التدقيق *</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(AUDIT_TYPES).map(([key, t]) => (
                  <button key={key} onClick={() => setNewForm(p => ({ ...p, audit_type: key }))}
                    className={`py-3 rounded-xl text-xs font-bold cursor-pointer transition-all border-2
                      ${newForm.audit_type === key ? `${t.color} text-white border-transparent shadow-md` : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                    <div className="text-xl mb-1">{t.icon}</div>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowNew(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-50">
                إلغاء
              </button>
              <button onClick={startNewAudit} disabled={saving || !newForm.branch_id}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50">
                {saving ? '...جارٍ' : '🔍 ابدأ التدقيق'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}