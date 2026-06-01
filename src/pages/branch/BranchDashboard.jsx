import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function Ring({ pct, size = 80, stroke = 8 }) {
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

export default function BranchDashboard() {
  const { profile } = useAuth()
  const [branch, setBranch] = useState(null)
  const [audits, setAudits] = useState([])
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)

  const starPositions = useMemo(() =>
    Array.from({ length: 15 }, () => ({
      left: `${(Math.random() * 100).toFixed(1)}%`,
      top: `${(Math.random() * 100).toFixed(1)}%`,
    }))
  , [])

  const fetchAll = useCallback(async () => {
    if (!profile?.id) return

    // جلب الفرع المرتبط بمدير الفرع
    const { data: ab } = await supabase
      .from('auditor_branches')
      .select('branch_id, branches(id, name, region, code)')
      .eq('auditor_id', profile.id)
      .single()

    if (!ab?.branches) { setLoading(false); return }
    setBranch(ab.branches)

    const branchId = ab.branches.id
    const [au, ac] = await Promise.all([
      supabase.from('audits')
        .select('*, user_profiles(full_name)')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false }),
      supabase.from('action_plans')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false }),
    ])
    setAudits(au.data || [])
    setActions(ac.data || [])
    setLoading(false)
  }, [profile?.id])

  useEffect(() => { fetchAll() }, [fetchAll])

  const avgScore = audits.length > 0
    ? Math.round(audits.reduce((s, a) => s + (a.percentage || 0), 0) / audits.length)
    : 0

  const openActions = actions.filter(a => a.status === 'open' || a.status === 'in_progress').length
  const resolvedActions = actions.filter(a => a.status === 'resolved').length

  const TYPES = {
    self_assessment: { label: 'تقييم ذاتي',  icon: '📝', color: 'bg-blue-100 text-blue-700' },
    internal_audit:  { label: 'تدقيق داخلي', icon: '🔍', color: 'bg-violet-100 text-violet-700' },
    external_audit:  { label: 'تدقيق خارجي', icon: '🏛️', color: 'bg-amber-100 text-amber-700' },
  }

  const STATUS = {
    in_progress: { label: 'جارٍ',   color: 'bg-amber-100 text-amber-700' },
    completed:   { label: 'مكتمل',  color: 'bg-emerald-100 text-emerald-700' },
    approved:    { label: 'معتمد',  color: 'bg-blue-100 text-blue-700' },
  }

  const pctColor = (p) => p >= 85 ? '#10b981' : p >= 60 ? '#f59e0b' : '#ef4444'
  const pctLabel = (p) => p >= 85 ? 'ممتاز' : p >= 70 ? 'جيد جداً' : p >= 60 ? 'جيد' : p >= 40 ? 'مقبول' : 'ضعيف'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? '☀️ صباح الخير' : hour < 17 ? '🌤️ مساء الخير' : '🌙 مساء النور'

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">🏪</div>
        <div className="text-slate-400 text-sm">جارٍ التحميل...</div>
      </div>
    </div>
  )

  if (!branch) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-3">⚠️</div>
        <div className="text-slate-700 font-bold mb-2">لم يتم تعيين فرع لحسابك</div>
        <div className="text-slate-400 text-sm">تواصل مع المدير لتعيين فرعك</div>
      </div>
    </div>
  )

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">

      {/* HEADER */}
      <div className="bg-slate-900 text-white sticky top-0 z-30 shadow-xl">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center font-black text-xl shadow-lg">A</div>
            <div>
              <div className="font-black text-sm">ABS Audit Suite</div>
              <div className="text-xs text-slate-400">🏪 {branch.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-left hidden sm:block">
              <div className="text-sm font-bold">{profile?.full_name}</div>
              <div className="text-xs text-amber-400">مدير الفرع</div>
            </div>
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center font-black text-sm shadow">
              {profile?.full_name?.charAt(0)}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* GREETING */}
        <div className="relative bg-gradient-to-l from-sky-800 to-slate-900 rounded-2xl p-6 text-white overflow-hidden shadow-xl">
          <div className="absolute inset-0 opacity-10">
            {starPositions.map((pos, i) => (
              <div key={i} className="absolute w-1 h-1 bg-white rounded-full" style={pos} />
            ))}
          </div>
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-sky-300 text-sm font-bold mb-1">{greeting}</div>
              <div className="text-2xl font-black">{profile?.full_name} 👋</div>
              <div className="text-slate-300 text-sm mt-1">
                فرع: <span className="text-white font-bold">{branch.name}</span>
                {branch.region && <span className="text-slate-400"> — {branch.region}</span>}
              </div>
              <div className="text-slate-400 text-xs mt-1">
                لديك <span className="text-amber-400 font-bold">{openActions}</span> خطة تصحيح معلقة
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Ring pct={avgScore} size={80} stroke={8} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-black" style={{ color: pctColor(avgScore) }}>{avgScore}%</span>
                  <span className="text-[9px] text-slate-400">متوسط</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-white">{pctLabel(avgScore)}</div>
                <div className="text-xs text-slate-400">{audits.length} تدقيق</div>
              </div>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '📋', label: 'التدقيقات',       value: audits.length,    color: 'border-sky-500 bg-sky-50' },
            { icon: '✅', label: 'مكتملة',           value: audits.filter(a => a.status !== 'in_progress').length, color: 'border-emerald-500 bg-emerald-50' },
            { icon: '⚠️', label: 'خطط معلقة',       value: openActions,      color: 'border-amber-500 bg-amber-50' },
            { icon: '🎯', label: 'خطط محلولة',      value: resolvedActions,  color: 'border-violet-500 bg-violet-50' },
          ].map(s => (
            <div key={s.label} className={`bg-white rounded-2xl p-4 border-r-4 ${s.color} shadow-sm`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-black text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* AUDITS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <h2 className="font-black text-slate-800">📋 تدقيقات فرعي</h2>
            <span className="text-xs text-slate-400">{audits.length} تدقيق</span>
          </div>
          {audits.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">📭</div>
              <div className="text-slate-400 text-sm">لا توجد تدقيقات بعد</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {audits.map((audit) => {
                const type   = TYPES[audit.audit_type]
                const status = STATUS[audit.status]
                const pct    = audit.percentage || 0
                return (
                  <div key={audit.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                    <span className="text-xl">{type?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-sm">{type?.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {new Date(audit.created_at).toLocaleDateString('ar-SA')}
                        {audit.user_profiles?.full_name && ` • ${audit.user_profiles.full_name}`}
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status?.color || 'bg-slate-100 text-slate-700'}`}>
                      {status?.label}
                    </span>
                    <div className="relative shrink-0">
                      <Ring pct={pct} size={44} stroke={5} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-black" style={{ color: pctColor(pct) }}>{pct}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ACTION PLANS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <h2 className="font-black text-slate-800">⚠️ خطط التصحيح</h2>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${openActions > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {openActions > 0 ? `${openActions} معلقة` : 'كل شيء تمام ✅'}
            </span>
          </div>
          {actions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">✅</div>
              <div className="text-slate-400 text-sm">لا توجد خطط تصحيح</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {actions.map(action => {
                const isOverdue = action.due_date && new Date(action.due_date) < new Date() && action.status !== 'resolved'
                const statusColors = {
                  open:        'bg-red-100 text-red-700',
                  in_progress: 'bg-amber-100 text-amber-700',
                  resolved:    'bg-emerald-100 text-emerald-700',
                  overdue:     'bg-slate-100 text-slate-700',
                }
                const statusLabels = { open: 'مفتوح', in_progress: 'جارٍ', resolved: 'محلول', overdue: 'متأخر' }
                return (
                  <div key={action.id} className={`px-5 py-4 hover:bg-slate-50 transition-colors ${isOverdue ? 'border-r-4 border-red-400' : ''}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-lg shrink-0">{action.status === 'resolved' ? '🟢' : isOverdue ? '🔴' : '🟡'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{action.item_text || 'بند غير محدد'}</p>
                        {action.action_required && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">📝 {action.action_required}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {action.due_date && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                              📅 {new Date(action.due_date).toLocaleDateString('ar-SA')}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${statusColors[action.status] || 'bg-slate-100 text-slate-700'}`}>
                        {statusLabels[action.status]}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* PERFORMANCE CHART */}
        {audits.length > 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h2 className="font-black text-slate-800 mb-4">📈 تطور الأداء</h2>
            <div className="flex items-end gap-2 h-24">
              {audits.slice(0, 8).reverse().map((audit, i) => {
                const pct = audit.percentage || 0
                const barColor = pct >= 85 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
                return (
                  <div key={audit.id} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-500">{pct}%</span>
                    <div className="w-full rounded-t-lg transition-all duration-700" style={{ height: `${pct}%`, minHeight: '4px' }}
                      className={`w-full rounded-t-lg ${barColor}`} />
                    <span className="text-[8px] text-slate-400">{i + 1}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}