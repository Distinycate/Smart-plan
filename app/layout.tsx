import type { Metadata } from 'next';
import '../styles/globals.css';
import { createClient } from '@/utils/supabase/server';
import { logout } from './(auth)/actions';
import Link from 'next/link';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Smart Lesson plan By Kruteh',
  description: 'สร้างแผนการเรียนรู้อย่างรวดเร็วและสมบูรณ์แบบ',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Check role if logged in
  let isAdmin = false;
  if (user) {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (data?.role === 'admin') {
      isAdmin = true;
    }
  }

  return (
    <html lang="th">
      <body>
        <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#333', color: '#fff', padding: '16px', borderRadius: '8px' } }} />
        <header className="app-header">
          <div className="app-header-brand">
            <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
              <div className="logo">✨</div>
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Smart Lesson plan By Kruteh</h1>
                <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>เปลี่ยนความยุ่งยากให้เป็นเรื่องง่าย</p>
              </div>
            </Link>
          </div>
          <div className="app-header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                <span className="text-white">👤 {user.email}</span>
                {isAdmin && (
                  <Link href="/admin" className="text-blue-200 hover:text-white" style={{ background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px', textDecoration: 'none' }}>
                    Dashboard แอดมิน
                  </Link>
                )}
                <form action={logout}>
                  <button type="submit" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.4)', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                    ออกจากระบบ
                  </button>
                </form>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                <Link href="/login" style={{ color: 'white', textDecoration: 'none' }}>เข้าสู่ระบบ</Link>
                <Link href="/register" style={{ background: 'white', color: '#2563eb', padding: '4px 8px', borderRadius: '4px', textDecoration: 'none', fontWeight: 500 }}>สมัครสมาชิก</Link>
              </div>
            )}
          </div>
        </header>
        <main style={{ minHeight: 'calc(100vh - 120px)' }}>
          {children}
        </main>
        <footer className="text-center py-6 text-slate-500 text-sm bg-slate-50 border-t border-slate-200">
          @copyright By Mr.Nattapat Prompru
        </footer>
      </body>
    </html>
  );
}
