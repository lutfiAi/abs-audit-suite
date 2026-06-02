import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/auth/Login'
import Dashboard from './pages/admin/Dashboard'
import Users from './pages/admin/Users'
import Branches from './pages/admin/Branches'
import Departments from './pages/admin/Departments'
import Audits from './pages/admin/Audits'
import ActionPlans from './pages/admin/ActionPlans'
import Reports from './pages/admin/Reports'
import Settings from './pages/admin/Settings'
import BranchDashboard from './pages/branch/BranchDashboard'
import AuditorDashboard from './pages/auditor/AuditorDashboard'
import { supabase } from './lib/supabase'

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'الرئيسية',    icon: '📊' },
  { id: 'users',       label: 'المستخدمون',  icon: '👥' },
  { id: 'branches',    label: 'الفروع',       icon: '🏪' },
  { id: 'departments', label: 'الأقسام',      icon: '📋' },
  { id: 'audits',      label: 'التدقيقات',    icon: '🔍' },
  { id: 'actions',     label: 'خطط التصحيح', icon: '⚠️' },
  { id: 'reports',     label: 'التقارير',     icon: '📈' },
  { id: 'settings',    label: 'الإعدادات',    icon: '⚙️' },
]

function Topbar({ active, setActive, profile }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    location.reload()
  }

  return (
    <div dir="rtl" className="bg-slate-900 text-white sticky top-0 z-30 shadow-2xl">
      {/* TOP ROW */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center font-black text-sm">A</div>
          <div>
            <div className="font-black text-xs">ABS Audit Suite</div>
            <div className="text-[10px] text-slate-400">v1.0</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold">{profile?.full_name}</div>
            <div className="text-[10px] text-amber-400">
              {profile?.role === 'super_admin' ? '👑 Super Admin' : profile?.role}
            </div>
          </div>
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center font-black text-xs">
            {profile?.full_name?.charAt(0)}
          </div>
          <button onClick={handleSignOut}
            className="text-xs bg-red-500/20 hover:bg-red-500/40 text-red-400 px-3 py-1.5 rounded-lg cursor-pointer transition-colors">
            🚪
          </button>
        </div>
      </div>

      {/* NAV ROW */}
      <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto">
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => setActive(item.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all whitespace-nowrap shrink-0
              ${active === item.id
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function AppInner() {
  const { user, profile, loading } = useAuth()
  const [activePage, setActivePage] = useState('dashboard')

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">🏬</div>
        <div className="text-slate-400 text-sm">جارٍ التحميل...</div>
      </div>
    </div>
  )

  if (!user) return <Login />

  if (!profile) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-3">⚠️</div>
        <div className="text-white font-bold mb-2">حساب غير مكتمل</div>
        <div className="text-slate-400 text-sm mb-4">تواصل مع المدير لإعداد حسابك</div>
        <button onClick={async () => {
          await supabase.auth.signOut()
          localStorage.clear()
          location.reload()
        }} className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl cursor-pointer">
          🚪 تسجيل الخروج
        </button>
      </div>
    </div>
  )

  if (profile?.role === 'branch_manager') return <BranchDashboard />
  if (profile?.role === 'internal_auditor' || profile?.role === 'external_auditor') return <AuditorDashboard />

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':   return <Dashboard />
      case 'users':       return <Users />
      case 'branches':    return <Branches />
      case 'departments': return <Departments />
      case 'audits':      return <Audits />
      case 'actions':     return <ActionPlans />
      case 'reports':     return <Reports />
      case 'settings':    return <Settings />
      default:            return <Dashboard />
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <Topbar active={activePage} setActive={setActivePage} profile={profile} />
      <div className="w-full">
        {renderPage()}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
