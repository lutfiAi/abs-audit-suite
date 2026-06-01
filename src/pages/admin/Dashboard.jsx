import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const COLORS = {
  green: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  blue: { bg: 'bg-sky-500', light: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200' },
  violet: { bg: 'bg-violet-500', light: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
  amber: { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  rose: { bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
  teal: { bg: 'bg-teal-500', light: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
}

function Ring({ pct, size = 80, stroke = 8, color = '#10b981' }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }} />
    </svg>
  )
}

function StatCard({ icon, label, value, pct, color, trend }) {
  const c = COLORS[color]
  return (
    <div className={`bg-white rounded-2xl p-5 border ${c.border} shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${c.light} rounded-xl flex items-center justify-center text-2xl`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-3xl font-black text-slate-800 mb-1">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
      {pct !== undefined && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>الإنجاز</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${c.bg} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

function AuditRow({ audit, index }) {
  const types = {
    self_assessment: { label: 'تقييم ذاتي', icon: '📝', color: 'bg-blue-100 text-blue-700' },
    internal_audit: { label: 'تدقيق داخلي', icon: '🔍', color: 'bg-violet-100 text-violet-700' },
    external_audit: { label: 'تدقيق خارجي', icon: '🏛️', color: 'bg-amber-100 text-amber-700' },
  }
  const statuses = {
    in_progress: { label: 'جارٍ', color: 'bg-amber-100 text-amber-700' },
    completed: { label: 'مكتمل ✓', color: 'bg-emerald-100 text-emerald-700' },
    approved: { label: 'معتمد ✓✓', color: 'bg-blue-100 text-blue-700' },
  }
  const type = types[audit.audit_type] || { label: audit.audit_type, icon: '📋', color: 'bg-slate-100 text-slate-700' }
  const status = statuses[audit.status] || { label: audit.status, color: 'bg-slate-100 text-slate-700' }
  const pct = audit.percentage || 0
  const pctColor = pct >= 85 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors ${index > 0 ? 'border-t border-slate-50' : ''}`}>
      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-sm font-black text-slate-500">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-800 text-sm truncate">{audit.branches?.name || 'غير محدد'}</div>
        <div className="text-xs text-slate-400 mt-0.5">{new Date(audit.created_at).toLocaleDateString('ar-SA')}</div>
      </div>
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${type.color} hidden md:inline-flex items-center gap-1`}>
        {type.icon} {type.label}
      </span>
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status.color}`}>{status.label}</span>
      <div className="relative shrink-0">
        <Ring pct={pct} size={44} stroke={5} color={pctColor} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-black" style={{ color: pctColor }}>{pct}%</span>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ branches: 0, users: 0, audits: 0, pending: 0, avgScore: 0, completed: 0 })
  const [recentAudits, setRecentAudits] = useState([])
  const [actionPlans, setActionPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    fetchAll()
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchAll = async () => {
    const cid = profile?.company_id
    const [br, us, au, ap] = await Promise.all([
      supabase.from('branches').select('id', { count: 'exact' }).eq('company_id', cid).eq('is_active', true),
      supabase.from('user_profiles').select('id', { count: 'exact' }).eq('company_id', cid),
      supabase.from('audits').select('id,status,percentage,created_at,audit_type,branches(name)').eq('company_id', cid).order('created_at', { ascending: false }),
      supabase.from('action_plans').select('id,status,due_date,item_text,branches(name)').eq('company_id', cid).order('created_at', { ascending: false }).limit(5),
    ])

    const audits = au.data || []
    const completed = audits.filter(a => a.status !== 'in_progress').length
    const avg = audits.length > 0 ? Math.round(audits.reduce((s, a) => s + (a.percentage || 0), 0) / audits.length) : 0
    const pending = (ap.data || []).filter(a => a.status === 'open' || a.status === 'in_progress').length

    setStats({ branches: br.count || 0, users: us.count || 0, audits: audits.length, completed, avgScore: avg, pending })
    setRecentAudits(audits.slice(0, 6))
    setActionPlans(ap.data || [])
    setLoading(false)
  }

  const hour = time.getHours()
  const greeting = hour < 12 ? '☀️ صباح الخير' : hour < 17 ? '🌤️ مساء الخير' : '🌙 مساء النور'

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">

      {/* NAVBAR */}
      <nav className="bg-slate-900 text-white sticky top-0 z-30 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center font-black text-xl shadow-lg">A</div>
            <div>
              <div className="font-black text-sm tracking-wide">ABS Audit Suite</div>
              <div className="text-xs text-slate-400">لوحة التحكم</div>
            </div>
          </div>

          {/* Clock */}
          <div className="hidden md:flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2 border border-white/10">
            <span className="text-amber-400">🕐</span>
            <span className="text-sm font-mono font-bold tabular-nums">
              {time.toLocaleTimeString('ar-SA')}
            </span>
            <span className="text-slate-400 text-xs">
              {time.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-left hidden sm:block">
              <div className="text-sm font-bold">{profile?.full_name}</div>
              <div className="text-xs text-amber-400">Super Admin ⭐</div>
            </div>
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center font-black text-sm shadow-lg">
              {profile?.full_name?.charAt(0)}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* GREETING BANNER */}
        <div className="relative bg-gradient-to-l from-slate-800 via-slate-700 to-slate-900 rounded-2xl p-6 text-white overflow-hidden shadow-xl">
          <div className="absolute inset-0 opacity-10">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="absolute w-1 h-1 bg-white rounded-full"
                style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%` }} />
            ))}
          </div>
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-amber-400 text-sm font-bold mb-1">{greeting}</div>
              <div className="text-2xl font-black">{profile?.full_name} 👋</div>
              <div className="text-slate-400 text-sm mt-1">
                لديك <span className="text-amber-400 font-bold">{stats.pending}</span> خطة تصحيح معلقة
                و <span className="text-emerald-400 font-bold">{stats.audits - stats.completed}</span> تدقيق جارٍ
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Ring pct={stats.audits > 0 ? Math.round((stats.completed/stats.audits)*100) : 0} size={80} stroke={8} color="#f59e0b" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-black text-amber-400">
                    {stats.audits > 0 ? Math.round((stats.completed/stats.audits)*100) : 0}%
                  </span>
                  <span className="text-[9px] text-slate-400">إنجاز</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-white">{stats.avgScore}%</div>
                <div className="text-xs text-slate-400">متوسط التقييم</div>
              </div>
            </div>
          </div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard icon="🏪" label="الفروع النشطة" value={stats.branches} color="blue" trend={5} />
          <StatCard icon="👥" label="المستخدمون" value={stats.users} color="violet" trend={12} />
          <StatCard icon="📋" label="التدقيقات الكلية" value={stats.audits} color="teal" pct={stats.audits > 0 ? Math.round((stats.completed/stats.audits)*100) : 0} />
          <StatCard icon="✅" label="التدقيقات المكتملة" value={stats.completed} color="green" trend={8} />
          <StatCard icon="⚠️" label="خطط التصحيح المعلقة" value={stats.pending} color="amber" />
          <StatCard icon="📊" label="متوسط التقييم" value={`${stats.avgScore}%`} color="rose" pct={stats.avgScore} />
        </div>

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* RECENT AUDITS */}
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <h2 className="font-black text-slate-800">📋 آخر التدقيقات</h2>
              <button className="text-xs text-amber-500 font-bold hover:text-amber-600 cursor-pointer">عرض الكل →</button>
            </div>
            {loading ? (
              <div className="p-8 text-center text-slate-400">
                <div className="text-3xl mb-2 animate-spin">⏳</div>
                جارٍ التحميل...
              </div>
            ) : recentAudits.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">📭</div>
                <div className="text-slate-400 text-sm">لا توجد تدقيقات بعد</div>
                <button className="mt-3 bg-amber-500 hover:bg-amber-600 text-white text-xs px-4 py-2 rounded-xl font-bold cursor-pointer">
                  ابدأ أول تدقيق
                </button>
              </div>
            ) : (
              recentAudits.map((a, i) => <AuditRow key={a.id} audit={a} index={i} />)
            )}
          </div>

          {/* SIDE PANEL */}
          <div className="space-y-4">

            {/* QUICK ACTIONS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h2 className="font-black text-slate-800 mb-4">⚡ إجراءات سريعة</h2>
              <div className="space-y-2">
                {[
                  { icon: '👤', label: 'إضافة مستخدم', color: 'bg-violet-500' },
                  { icon: '🏪', label: 'إضافة فرع', color: 'bg-sky-500' },
                  { icon: '📋', label: 'إضافة قسم تدقيق', color: 'bg-emerald-500' },
                  { icon: '📊', label: 'تقرير شامل', color: 'bg-amber-500' },
                  { icon: '📅', label: 'جدول التدقيقات', color: 'bg-rose-500' },
                ].map(a => (
                  <button key={a.label}
                    className={`w-full flex items-center gap-3 ${a.color} hover:opacity-90 text-white rounded-xl px-4 py-2.5 text-sm font-bold cursor-pointer transition-all hover:scale-105 shadow-sm`}>
                    <span>{a.icon}</span>
                    <span>{a.label}</span>
                    <span className="mr-auto opacity-70">←</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ACTION PLANS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                <h2 className="font-black text-slate-800 text-sm">⚠️ خطط التصحيح</h2>
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{stats.pending} معلقة</span>
              </div>
              {actionPlans.length === 0 ? (
                <div className="p-5 text-center text-slate-400 text-xs">لا توجد خطط معلقة ✅</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {actionPlans.slice(0, 4).map(ap => {
                    const isOverdue = ap.due_date && new Date(ap.due_date) < new Date()
                    return (
                      <div key={ap.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                        <div className="text-xs font-bold text-slate-700 truncate">{ap.item_text || 'بند غير محدد'}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400">{ap.branches?.name}</span>
                          {ap.due_date && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                              {isOverdue ? '⚠️ متأخر' : `📅 ${new Date(ap.due_date).toLocaleDateString('ar-SA')}`}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}