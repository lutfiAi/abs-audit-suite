import { useState } from 'react'
import { signIn } from '../../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) setError('البريد أو كلمة المرور غير صحيحة')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-3xl font-black text-white mx-auto mb-4">
            A
          </div>
          <h1 className="text-2xl font-black text-white">ABS Audit Suite</h1>
          <p className="text-slate-400 text-sm mt-1">
            منصة التدقيق الشاملة
          </p>
        </div>

        {/* Form */}
        <div className="bg-slate-800 rounded-2xl p-7 border border-white/10">
          <form onSubmit={handleLogin} className="space-y-4">

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                dir="ltr"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                dir="ltr"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 text-red-400 text-xs text-right">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-white font-black py-3 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? '...جارٍ الدخول' : 'تسجيل الدخول'}
            </button>

          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          © 2025 ABS Audit Suite
        </p>

      </div>
    </div>
  )
}