import type { Metadata } from 'next';
import '../styles/globals.css';
import { createClient } from '@/utils/supabase/server';
import { logout } from './(auth)/actions';
import Link from 'next/link';
import { Toaster } from 'react-hot-toast';
import { Sparkles, User, LogOut, Home, LayoutDashboard } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Smart Plan | AI Assistant For Thai Teachers',
  description: 'ออกแบบแผนการสอนอัจฉริยะ เสร็จสมบูรณ์ใน 30 วินาทีด้วย AI',
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
      <body className="bg-slate-50 text-slate-800 font-sans antialiased selection:bg-pink-200 selection:text-pink-900">
        <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#333', color: '#fff', padding: '16px', borderRadius: '8px' } }} />
        
        {/* HEADER: Minimal White & Pink */}
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            
            {/* BRAND */}
            <div className="flex items-center gap-8">
              <Link href="/" className="group flex items-center gap-2.5 transition-transform hover:scale-105">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900">Smart Plan</h1>
                </div>
              </Link>
              
              {/* DESKTOP NAV (Visible when logged in, or generic links) */}
              <nav className="hidden md:flex items-center gap-1">
                <Link href="/" className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-pink-50 hover:text-pink-600">
                  หน้าแรก
                </Link>
                {user && (
                  <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-pink-50 hover:text-pink-600">
                    แดชบอร์ดจัดการแผน
                  </Link>
                )}
              </nav>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200">
                    <User className="h-3.5 w-3.5" />
                    {user.email}
                  </div>
                  
                  <Link href="/dashboard" className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg sm:hidden">
                    <LayoutDashboard className="h-4 w-4" /> แดชบอร์ด
                  </Link>

                  {isAdmin && (
                    <Link href="/admin" className="hidden sm:flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-600 transition-colors hover:bg-indigo-100">
                      จัดการแอดมิน
                    </Link>
                  )}
                  
                  <form action={logout}>
                    <button type="submit" className="group flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all hover:bg-rose-100 hover:text-rose-600" title="ออกจากระบบ">
                      <LogOut className="h-4 w-4 transition-transform group-hover:scale-110" />
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="flex items-center justify-center rounded-full bg-white border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:text-pink-600">
                    เข้าสู่ระบบ
                  </Link>
                  <Link href="/register" className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-pink-500/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-pink-500/40">
                    เริ่มใช้งานฟรี <Sparkles className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="min-h-[calc(100vh-140px)]">
          {children}
        </main>

        {/* FOOTER */}
        <footer className="border-t border-slate-200 bg-white py-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 text-slate-900">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-pink-500 text-white">
                <Sparkles className="h-3 w-3" />
              </div>
              <span className="text-sm font-black tracking-tight">Smart Plan</span>
            </div>
            <p className="text-center text-xs font-medium text-slate-400 sm:text-right">
              ระบบช่วยออกแบบและจัดการแผนการสอนอัจฉริยะสำหรับคุณครู<br className="sm:hidden" />
              <span className="hidden sm:inline"> • </span>Copyright © 2026 By Mr.Nattapat Prompru. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
