import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function Settings() {
  const { profile } = useAuth()
  const [company, setCompany] = useState(null)
  const [form, setForm] = useState({ name: '', name_en: '', sector: '', plan: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  useEffect(() => { fetchCompany() }, [])

  const fetchCompany = async () => {
    const { data } = await supabase.from('companies')
      .select('*').eq('id', profile?.company_id).single()
    if (data) {
      setCompany(data)
      setForm({ name: data.name, name_en: data.name_en || '', sector: data.sector || '', plan: data.plan || '' })
    }
  }

  const saveCompany = async () => {
    setSaving(true)
    await supabase.from('companies').update({
      name: form.name,
      name_en: form.name_en,
      sector: form.sector,
    }).eq('id', profile?.company_id)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  const changePassword = async () => {
    setPwError('')
    if (pwForm.newPw !== pwForm.confirm) { setPwError('كلمة المرور غير متطابقة'); return }
    if (pwForm.newPw.length < 6) { setPwError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
    if (error) { setPwError(error.message); return }
    setPwForm({ current: '', newPw: '', confirm: '' })
    setPwSaved(true)
    setTimeout(() => setPwSaved(false), 3000)
  }

  const SECTORS = ['retail', 'health', 'education', 'hospitality', 'industry', 'government', 'other']
  const SECTOR_LABELS = {
    retail: '🛍️ التجزئة', health: '🏥 الصحة', education: '🎓 التعليم',
    hospitality: '🏨 الضيافة', industry: '🏭 الصناعة', government: '🏛️ الحكومة', other: '🔷 أخرى'
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-black text-slate-800">⚙️ الإعدادات</h1>
        <p className="text-slate-500 text-sm">إعدادات الشركة والحساب</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* COMPANY INFO */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
            <span className="text-xl">🏢</span>
            <h2 className="font-black text-slate-800">معلومات الشركة</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">اسم الشركة بالعربي</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">اسم الشركة بالإنجليزي</label>
              <input dir="ltr" value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-2">القطاع</label>
              <div className="grid grid-cols-2 gap-2">
                {SECTORS.map(s => (
                  <button key={s} onClick={() => setForm(p => ({ ...p, sector: s }))}
                    className={`py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all border-2
                      ${form.sector === s ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                    {SECTOR_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">الباقة الحالية</span>
              <span className="bg-amber-100 text-amber-700 text-xs font-black px-3 py-1 rounded-full">
                {form.plan?.toUpperCase() || 'BUSINESS'} ⭐
              </span>
            </div>
            <button onClick={saveCompany} disabled={saving}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl text-sm cursor-pointer disabled:opacity-50 transition-all">
              {saving ? '...جارٍ الحفظ' : saved ? '✅ تم الحفظ!' : '💾 حفظ التغييرات'}
            </button>
          </div>
        </div>

        {/* PROFILE INFO */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
            <span className="text-xl">👤</span>
            <h2 className="font-black text-slate-800">معلومات الحساب</h2>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-4">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg">
                {profile?.full_name?.charAt(0)}
              </div>
              <div>
                <div className="font-black text-slate-800">{profile?.full_name}</div>
                <div className="text-xs text-amber-600 font-bold mt-0.5">
                  {profile?.role === 'super_admin' ? '👑 Super Admin' : profile?.role}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CHANGE PASSWORD */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
            <span className="text-xl">🔐</span>
            <h2 className="font-black text-slate-800">تغيير كلمة المرور</h2>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">كلمة المرور الجديدة</label>
              <input type="password" dir="ltr" value={pwForm.newPw}
                onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                placeholder="••••••••" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">تأكيد كلمة المرور</label>
              <input type="password" dir="ltr" value={pwForm.confirm}
                onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                placeholder="••••••••" />
            </div>
            {pwError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-600 text-xs">{pwError}</div>}
            {pwSaved && <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-emerald-600 text-xs">✅ تم تغيير كلمة المرور بنجاح</div>}
            <button onClick={changePassword}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-sm cursor-pointer transition-all">
              🔐 تغيير كلمة المرور
            </button>
          </div>
        </div>

        {/* VERSION */}
        <div className="text-center text-slate-400 text-xs py-2">
          ABS Audit Suite v1.0 — جميع الحقوق محفوظة © 2025
        </div>
      </div>
    </div>
  )
}
