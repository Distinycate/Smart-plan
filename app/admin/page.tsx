import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminDashboardClient from './AdminDashboardClient'

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

  // Use service role to bypass RLS and count all plans
  const { getSupabaseAdmin } = await import('@/lib/supabase')
  const adminDb = getSupabaseAdmin()
  
  const { count: usersCount } = await adminDb.from('profiles').select('*', { count: 'exact', head: true })
  const { count: plansCount } = await adminDb.from('LessonPlans').select('*', { count: 'exact', head: true })

  const { data: allUsers } = await adminDb.from('profiles').select('*').order('created_at', { ascending: false })

  return (
    <main className="p-8 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">ยินดีต้อนรับ, {profile.full_name || profile.email}</p>
        </div>
        <div className="flex gap-4">
          <Link href="/profile" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium">
            กลับหน้าหลัก (Profile)
          </Link>
          <Link href="/" className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors font-medium shadow-md shadow-pink-500/20">
            ระบบสร้างแผน
          </Link>
        </div>
      </div>

      <AdminDashboardClient 
        usersCount={usersCount || 0} 
        plansCount={plansCount || 0} 
        allUsers={allUsers || []} 
      />
    </main>
  )
}
