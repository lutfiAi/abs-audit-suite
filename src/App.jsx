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
  { id: 'dashboard',   label: 'الرئيسية',      icon: '📊' },
  { id: 'users',       label: 'المستخدمون',     icon: '👥' },
  { id: 'branches',    label: 'الفروع',          icon: '🏪' },
  { id: 'departments', label: 'الأقسام',         icon: '📋' },
  { id: 'audits',      label: 'التدقيقات',       icon: '🔍' },
  { id: 'actions',     label: 'خطط التصحيح',    icon: '⚠️' },
  { id: 'reports',     label: 'التقارير',        icon: '📈' },
  { id: 'settings',    label: 'الإعدادات',       icon: '⚙️' },
]

const SIDEBAR_W = 224

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">🏬</div>
        <div className="text-slate-400 text-sm">جارٍ التحميل...</div>
      </div>
    </div>
  )
}

function Sidebar({ active, setActive, profile }) {
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    location.reload()
  }

  return (
    <div style={{ width: SIDEBAR_W }} className="fixed right-0 top-0 h-full bg-slate-900 text-white flex flex-col z-20 shadow-2xl">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center font-black text-lg shadow-lg">A</div>
          <div>
            <div className="font-black text-sm">ABS Audit</div>
            <div className="text-xs text-slate-400">Suite v1.0</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => setActive(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all
              ${active === item.id
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2 px-2 py-2 mb-2 bg-white/5 rounded-xl">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center font-black text-sm shadow">
            {profile?.full_name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold truncate">{profile?.full_name}</div>
            <div className="text-[10px] text-amber-400">
              {profile?.role === 'super_admin' ? '👑 Super Admin' : profile?.role}
            </div>
          </div>
        </div>
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 text-xs font-bold cursor-pointer transition-colors">
          <span>🚪</span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  )
}

function AppInner() {
  const { user, profile, loading } = useAuth()
  const [activePage, setActivePage] = useState('dashboard')

  // جاري التحميل
  if (loading) return <LoadingScreen />

  // ما في مستخدم — صفحة تسجيل الدخول
  if (!user) return <Login />

  // البروفايل لم يتحمل بعد — انتظر
  if (!profile) return <LoadingScreen />

  // توجيه حسب الدور
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
    <div dir="rtl" className="min-h-screen bg-slate-50" style={{ display: 'flex' }}>
      <div style={{ width: SIDEBAR_W, flexShrink: 0 }}></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {renderPage()}
      </div>
      <Sidebar active={activePage} setActive={setActivePage} profile={profile} />
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
