import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

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

const AUDIT_TYPES = {
  self_assessment: { label: 'تقييم ذاتي',  icon: '📝', color: 'bg-blue-500' },
  internal_audit:  { label: 'تدقيق داخلي', icon: '🔍', color: 'bg-violet-500' },
  external_audit:  { label: 'تدقيق خارجي', icon: '🏛️', color: 'bg-amber-500' },
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

export default function AuditorDashboard() {
  const { profile } = useAuth()
  const [branches, setBranches] = useState([])
  const [audits, setAudits] = useState([])
  const [departments, setDepartments] = useState([])
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ branch_id: '', audit_type: 'internal_audit' })
  const [activeAudit, setActiveAudit] = useState(null)
  const [scores, setScores] = useState({})
  const [notes, setNotes] = useState({})
  const [openDept, setOpenDept] = useState(null)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState('list')

  const fetchAll = useCallback(async () => {
    if (!profile?.id) return
    const cid = profile?.company_id

    const [ab, au, dp, it] = await Promise.all([
      supabase.from('auditor_branches').select('branch_id, branches(id, name, region)').eq('auditor_id', profile.id),
      supabase.from('audits').select('*, branches(name)').eq('auditor_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('departments').select('*').eq('company_id', cid).eq('is_active', true).order('order_num'),
      supabase.from('audit_items').select('*').eq('company_id', cid).eq('is_active', true).order('order_num'),
    ])

    setBranches((ab.data || []).map(a => a.branches).filter(Boolean))
    setAudits(au.data || [])
    setDepartments(dp.data || [])
    setAllItems(it.data || [])
    if (dp.data?.length > 0) setOpenDept(dp.data[0].id)
    setLoading(false)
  }, [profile?.id, profile?.company_id])

  useEffect(() => { fetchAll() }, [fetchAll])

  const startAudit = async () => {
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

  const saveAudit = async (status = 'in_progress') => {
    setSaving(true)
    const deptItems = allItems.filter(i => departments.some(d => d.id === i.department_id))
    const total = deptItems.reduce((a, i) => a + (scores[i.id] ?? 0), 0)
    const max   = deptItems.reduce((a, i) => a + i.max_score, 0)
    const pct   = max > 0 ? Math.round((total / max) * 100) : 0

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

  const pctColor = (p) => p >= 85 ? '#10b981' : p >= 60 ? '#f59e0b' : '#ef4444'

  const grandPct = () => {
    const items = allItems.filter(i => departments.some(d => d.id === i.department_id))
    const total = items.reduce((a, i) => a + (scores[i.id] ?? 0), 0)
    const max   = items.reduce((a, i) => a + i.max_score, 0)
    return max > 0 ? Math.round((total / max) * 100) : 0
  }

  // ── AUDIT VIEW ──
  if (view === 'audit' && activeAudit) {
    const pct = grandPct()
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('list')} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer">←</button>
              <div>
                <h1 className="font-black text-slate-800">{branches.find(b => b.id === activeAudit.branch_id)?.name || 'فرع'}</h1>
                <p className="text-xs text-slate-400">{AUDIT_TYPES[activeAudit.audit_type]?.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Ring pct={pct} size={44} stroke={5} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-black" style={{ color: pctColor(pct) }}>{pct}%</span>
                </div>
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

        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {departments.map(dept => {
            const deptItems = allItems.filter(i => i.department_id === dept.id)
            if (deptItems.length === 0) return null
            const dScore = deptItems.reduce((a, i) => a + (scores[i.id] ?? 0), 0)
            const dMax   = deptItems.reduce((a, i) => a + i.max_score, 0)
            const dPct   = dMax > 0 ? Math.round((dScore / dMax) * 100) : 0
            const isOpen = openDept === dept.id
            const barC   = dPct >= 85 ? 'bg-emerald-500' : dPct >= 60 ? 'bg-amber-500' : 'bg-red-500'

            return (
              <div key={dept.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <button onClick={() => setOpenDept(isOpen ? null : dept.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors">
                  <span className="text-xl">{dept.icon}</span>
                  <div className="flex-1 text-right">
                    <div className="font-bold text-slate-800 text-sm">{dept.name_ar}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${barC} rounded-full`} style={{ width: `${dPct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-500">{dScore}/{dMax}</span>
                    </div>
                  </div>
                  <span className="text-slate-400">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-50 divide-y divide-slate-50">
                    {deptItems.map((item, i) => {
                      const score = scores[item.id]
                      const RISK = { H: 'bg-red-100 text-red-700', M: 'bg-amber-100 text-amber-700', L: 'bg-emerald-100 text-emerald-700' }
                      const rowBg = score === undefined ? '' : score === 0 ? 'bg-red-50/50' : score === item.max_score ? 'bg-emerald-50/50' : 'bg-amber-50/50'
                      return (
                        <div key={item.id} className={`px-5 py-4 ${rowBg}`}>
                          <div className="flex items-start gap-3">
                            <span className="text-xs font-mono text-slate-400 mt-0.5 shrink-0 w-6">{i + 1}</span>
                            <div className="flex-1">
                              <p className="text-sm text-slate-700 leading-relaxed mb-2">{item.text_ar}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${RISK[item.risk_level]}`}>
                                  {item.risk_level === 'H' ? 'عالي' : item.risk_level === 'M' ? 'متوسط' : 'منخفض'}
                                </span>
                                <div className="flex gap-1.5">
                                  {[0, Math.round(item.max_score / 2), item.max_score].map(v => (
                                    <button key={v} onClick={() => setScores(p => ({ ...p, [item.id]: v }))}
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
                                className="mt-2 w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-300" />
                            </div>
                            <span className={`text-sm font-black shrink-0 ${score === undefined ? 'text-slate-200' : score === 0 ? 'text-red-500' : score === item.max_score ? 'text-emerald-500' : 'text-amber-500'}`}>
                              {score ?? '–'}
                            </span>
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

  // ── LIST VIEW ──
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center font-black text-xl">A</div>
          <div>
            <div className="font-black text-sm">ABS Audit Suite</div>
            <div className="text-xs text-slate-400">🔍 لوحة المدقق</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-left">
            <div className="text-sm font-bold">{profile?.full_name}</div>
            <div className="text-xs text-amber-400">
              {profile?.role === 'internal_auditor' ? 'مدقق داخلي' : 'مدقق خارجي'}
            </div>
          </div>
          <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center font-black text-sm">
            {profile?.full_name?.charAt(0)}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: '🏪', label: 'الفروع المعينة',    value: branches.length,  color: 'border-sky-500' },
            { icon: '📋', label: 'التدقيقات الكلية',  value: audits.length,    color: 'border-violet-500' },
            { icon: '✅', label: 'التدقيقات المكتملة', value: audits.filter(a => a.status !== 'in_progress').length, color: 'border-emerald-500' },
          ].map(s => (
            <div key={s.label} className={`bg-white rounded-2xl p-4 border-r-4 ${s.color} shadow-sm`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-black text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* BRANCHES */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <h2 className="font-black text-slate-800">🏪 الفروع المعينة لي</h2>
            <button onClick={() => setShowNew(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-sm cursor-pointer transition-all hover:scale-105">
              ➕ تدقيق جديد
            </button>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-400">جارٍ التحميل...</div>
          ) : branches.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">🏪</div>
              <div className="text-slate-400 text-sm">لم يتم تعيين فروع لك بعد</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {branches.map(b => {
                const bAudits = audits.filter(a => a.branch_id === b.id)
                const avg = bAudits.length > 0
                  ? Math.round(bAudits.reduce((s, a) => s + (a.percentage || 0), 0) / bAudits.length)
                  : 0
                return (
                  <div key={b.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center text-white font-black text-sm">
                      {b.name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-800 text-sm">{b.name}</div>
                      {b.region && <div className="text-xs text-slate-400">📍 {b.region}</div>}
                    </div>
                    <div className="text-xs text-slate-400">{bAudits.length} تدقيق</div>
                    {bAudits.length > 0 && (
                      <div className="relative">
                        <Ring pct={avg} size={40} stroke={4} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[9px] font-black" style={{ color: pctColor(avg) }}>{avg}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* RECENT AUDITS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <h2 className="font-black text-slate-800">📋 تدقيقاتي الأخيرة</h2>
          </div>
          {audits.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">📭</div>
              <div className="text-slate-400 text-sm">لا توجد تدقيقات بعد</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {audits.slice(0, 5).map(audit => {
                const type = AUDIT_TYPES[audit.audit_type]
                const pct  = audit.percentage || 0
                const statusColor = { in_progress: 'bg-amber-100 text-amber-700', completed: 'bg-emerald-100 text-emerald-700', approved: 'bg-blue-100 text-blue-700' }[audit.status]
                const statusLabel = { in_progress: 'جارٍ', completed: 'مكتمل', approved: 'معتمد' }[audit.status]
                return (
                  <div key={audit.id}
                    onClick={() => { setActiveAudit(audit); setScores(audit.scores || {}); setNotes(audit.notes || {}); setView('audit') }}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors">
                    <span className="text-xl">{type?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-sm">{audit.branches?.name}</div>
                      <div className="text-xs text-slate-400">{type?.label} • {new Date(audit.created_at).toLocaleDateString('ar-SA')}</div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
                    <div className="relative shrink-0">
                      <Ring pct={pct} size={40} stroke={4} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[9px] font-black" style={{ color: pctColor(pct) }}>{pct}%</span>
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
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-50">إلغاء</button>
              <button onClick={startAudit} disabled={saving || !newForm.branch_id}
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