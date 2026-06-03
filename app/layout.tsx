import type { Metadata } from 'next';
import '../styles/globals.css';
import { createClient } from '@/utils/supabase/server';
import { logout } from './(auth)/actions';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ระบบช่วยจัดทำแผนการจัดการเรียนรู้กึ่งอัตโนมัติ (Enterprise Edition)',
  description: 'สร้างแผนการเรียนรู้อย่างรวดเร็วด้วยระบบกรอกข้อมูลอัตโนมัติและผู้ช่วย AI อัจฉริยะ',
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
        <header className="app-header">
          <div className="app-header-brand">
            <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
              <div className="logo">📝</div>
              <div>
                <h1>ระบบช่วยจัดทำแผนการจัดการเรียนรู้</h1>
                <p>Lesson Plan AutoFill System v2.8.5 — Next.js Edition</p>
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
                <Link href="/register" style={{ background: 'white', color: '#2563eb', padding: '4px 8px', borderRadius: '4px', textDecoration: 'none' }}>สมัครสมาชิก</Link>
              </div>
            )}
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
