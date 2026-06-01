import { useState, useEffect } from 'react'
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

export default function Reports() {
  const { profile } = useAuth()
  const [audits, setAudits] = useState([])
  const [branches, setBranches] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [selectedType, setSelectedType] = useState('all')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const cid = profile?.company_id
    const [au, br, dp] = await Promise.all([
      supabase.from('audits')
        .select('*, branches(name), user_profiles(full_name)')
        .eq('company_id', cid)
        .order('created_at', { ascending: false }),
      supabase.from('branches').select('id,name').eq('company_id', cid).eq('is_active', true),
      supabase.from('departments').select('*').eq('company_id', cid).eq('is_active', true),
    ])
    setAudits(au.data || [])
    setBranches(br.data || [])
    setDepartments(dp.data || [])
    setLoading(false)
  }

  const filtered = audits.filter(a => {
    if (selectedBranch !== 'all' && a.branch_id !== selectedBranch) return false
    if (selectedType !== 'all' && a.audit_type !== selectedType) return false
    return true
  })

  const avgScore = filtered.length > 0
    ? Math.round(filtered.reduce((s, a) => s + (a.percentage || 0), 0) / filtered.length)
    : 0

  const branchStats = branches.map(b => {
    const bAudits = audits.filter(a => a.branch_id === b.id)
    const avg = bAudits.length > 0
      ? Math.round(bAudits.reduce((s, a) => s + (a.percentage || 0), 0) / bAudits.length)
      : 0
    return { ...b, count: bAudits.length, avg }
  }).sort((a, b) => b.avg - a.avg)

  const TYPES = {
    self_assessment: { label: 'تقييم ذاتي', icon: '📝' },
    internal_audit: { label: 'تدقيق داخلي', icon: '🔍' },
    external_audit: { label: 'تدقيق خارجي', icon: '🏛️' },
  }

  const pctColor = (p) => p >= 85 ? '#10b981' : p >= 60 ? '#f59e0b' : '#ef4444'
  const pctLabel = (p) => p >= 85 ? 'ممتاز' : p >= 70 ? 'جيد جداً' : p >= 60 ? 'جيد' : p >= 40 ? 'مقبول' : 'ضعيف'

  const handlePrint = () => window.print()

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">📈 التقارير والإحصائيات</h1>
          <p className="text-slate-500 text-sm">{filtered.length} تدقيق</p>
        </div>
        <button onClick={handlePrint}
          className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm cursor-pointer transition-all hover:scale-105 shadow-md">
          🖨️ طباعة التقرير
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* FILTERS */}
        <div className="flex flex-wrap gap-3">
          <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white shadow-sm">
            <option value="all">كل الفروع</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={selectedType} onChange={e => setSelectedType(e.target.value)}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white shadow-sm">
            <option value="all">كل أنواع التدقيق</option>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>

        {/* OVERALL SCORE */}
        <div className="bg-gradient-to-l from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-slate-400 text-sm mb-1">متوسط التقييم الكلي</div>
              <div className="text-5xl font-black" style={{ color: pctColor(avgScore) }}>{avgScore}%</div>
              <div className="text-lg font-bold mt-1" style={{ color: pctColor(avgScore) }}>{pctLabel(avgScore)}</div>
              <div className="text-slate-400 text-sm mt-2">
                بناءً على {filtered.length} تدقيق
              </div>
            </div>
            <div className="relative">
              <Ring pct={avgScore} size={120} stroke={12} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black" style={{ color: pctColor(avgScore) }}>{avgScore}%</span>
                <span className="text-xs text-slate-400">{pctLabel(avgScore)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* BRANCH RANKINGS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <h2 className="font-black text-slate-800">🏆 ترتيب الفروع</h2>
          </div>
          {branchStats.length === 0 ? (
            <div className="p-8 text-center text-slate-400">لا توجد بيانات</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {branchStats.map((b, i) => {
                const barColor = b.avg >= 85 ? 'bg-emerald-500' : b.avg >= 60 ? 'bg-amber-500' : 'bg-red-500'
                return (
                  <div key={b.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm
                      ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-sm">{b.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${b.avg}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-600 w-8">{b.avg}%</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">{b.count} تدقيق</div>
                    <div className="relative">
                      <Ring pct={b.avg} size={44} stroke={5} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-black" style={{ color: pctColor(b.avg) }}>{b.avg}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* AUDITS TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <h2 className="font-black text-slate-800">📋 سجل التدقيقات</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-400">جارٍ التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400">لا توجد تدقيقات</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map(audit => {
                const type = TYPES[audit.audit_type]
                const pct = audit.percentage || 0
                const statusColor = {
                  in_progress: 'bg-amber-100 text-amber-700',
                  completed: 'bg-emerald-100 text-emerald-700',
                  approved: 'bg-blue-100 text-blue-700',
                }[audit.status]
                const statusLabel = {
                  in_progress: 'جارٍ',
                  completed: 'مكتمل',
                  approved: 'معتمد',
                }[audit.status]

                return (
                  <div key={audit.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                    <span className="text-xl">{type?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-sm">{audit.branches?.name}</div>
                      <div className="text-xs text-slate-400">
                        {type?.label} • {new Date(audit.created_at).toLocaleDateString('ar-SA')}
                        {audit.user_profiles?.full_name && ` • ${audit.user_profiles.full_name}`}
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
                    <div className="font-black text-lg" style={{ color: pctColor(pct) }}>{pct}%</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <style>{`@media print { button { display: none !important; } }`}</style>
    </div>
  )
}
