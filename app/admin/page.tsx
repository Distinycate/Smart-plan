import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    redirect('/')
  }

  // Fetch some basic stats
  const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
  
  // Use service role to bypass RLS and count all plans
  const { getSupabaseAdmin } = await import('@/lib/supabase')
  const adminDb = getSupabaseAdmin()
  const { count: plansCount } = await adminDb.from('LessonPlans').select('*', { count: 'exact', head: true })

  const { data: recentUsers } = await adminDb.from('profiles').select('*').order('created_at', { ascending: false }).limit(10)

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">ยินดีต้อนรับ, {profile.full_name || profile.email}</p>
        </div>
        <Link href="/" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">
          กลับสู่ระบบหลัก
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-medium text-slate-500 mb-2">จำนวนผู้ใช้ทั้งหมด</h2>
          <p className="text-4xl font-bold text-blue-600">{usersCount || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-medium text-slate-500 mb-2">จำนวนแผนทั้งหมดในระบบ</h2>
          <p className="text-4xl font-bold text-indigo-600">{plansCount || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-800">ผู้ใช้งานล่าสุด</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th scope="col" className="px-6 py-3">อีเมล</th>
                <th scope="col" className="px-6 py-3">ชื่อ</th>
                <th scope="col" className="px-6 py-3">บทบาท</th>
                <th scope="col" className="px-6 py-3">วันที่สมัคร</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers?.map((u) => (
                <tr key={u.id} className="bg-white border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">{u.email}</td>
                  <td className="px-6 py-4">{u.full_name || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">{new Date(u.created_at).toLocaleDateString('th-TH')}</td>
                </tr>
              ))}
              {(!recentUsers || recentUsers.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    ไม่มีข้อมูลผู้ใช้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
