import type { Metadata } from 'next';
import '../styles/globals.css';
import { createClient } from '@/utils/supabase/server';
import { logout } from './(auth)/actions';
import Link from 'next/link';
import { Toaster } from 'react-hot-toast';
import { Sparkles, User, LogOut, LayoutDashboard, Plus, BookOpen, Layers, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Smart Plan | ระบบแผนการสอนอัจฉริยะ V3',
  description: 'ออกแบบแผนการสอนอัจฉริยะ มาตรฐาน สพฐ. และ ว.PA พร้อมสื่อการสอนและเครื่องมือวัดผล',
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
      <body className="bg-slate-50 text-slate-800 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900 min-h-screen flex flex-col">
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0f172a',
              color: '#f8fafc',
              padding: '14px 20px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
          }}
        />

        {/* HEADER: World-Class Clean Glassmorphism */}
        <header className="print:hidden sticky top-0 z-50 w-full bg-white/85 backdrop-blur-xl border-b border-slate-200/80 shadow-xs transition-all">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            
            {/* BRAND */}
            <div className="flex items-center gap-8">
              <Link href="/" className="group flex items-center gap-3 transition-transform hover:scale-[1.02] active:scale-[0.98]">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 ring-1 ring-white/20">
                  <Sparkles className="h-5 w-5 transition-transform group-hover:rotate-12" />
                </div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                    Smart Plan
                  </h1>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 border border-indigo-200/60 uppercase">
                    V3.12
                  </span>
                </div>
              </Link>
              
              {/* DESKTOP NAV */}
              <nav className="hidden md:flex items-center gap-1">
                <Link
                  href="/"
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
                >
                  หน้าแรก
                </Link>
                {user && (
                  <>
                    <Link
                      href="/dashboard"
                      className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 flex items-center gap-1.5"
                    >
                      <LayoutDashboard className="h-4 w-4 text-slate-400" />
                      แดชบอร์ด
                    </Link>
                    <Link
                      href="/plan/v3"
                      className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 flex items-center gap-1.5"
                    >
                      <BookOpen className="h-4 w-4 text-slate-400" />
                      แผนการสอน V3
                    </Link>
                    <Link
                      href="/unit-plans"
                      className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 flex items-center gap-1.5"
                    >
                      <Layers className="h-4 w-4 text-slate-400" />
                      แผนเป็นหน่วย
                    </Link>
                  </>
                )}
              </nav>
            </div>

            {/* ACTION BUTTONS & USER */}
            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-2.5 sm:gap-3">
                  {/* Quick Action: New Plan V3 */}
                  <Link
                    href="/plan/v3/new"
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white shadow-sm shadow-indigo-500/20 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-indigo-500/30 active:translate-y-0 active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                    <span>สร้างแผนใหม่</span>
                  </Link>

                  {/* User Profile Badge */}
                  <div className="hidden lg:flex items-center gap-2 rounded-full bg-slate-100/90 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200/80 shadow-xs">
                    <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 flex items-center justify-center text-slate-600">
                      <User className="h-3 w-3" />
                    </div>
                    <span className="max-w-[140px] truncate">{user.email}</span>
                  </div>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="hidden sm:flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 px-3 py-1 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Admin</span>
                    </Link>
                  )}

                  <form action={logout}>
                    <button
                      type="submit"
                      className="group flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-2xs transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-95"
                      title="ออกจากระบบ"
                    >
                      <LogOut className="h-4 w-4 transition-transform group-hover:scale-110" />
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3">
                  <Link
                    href="/login"
                    className="flex items-center justify-center rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-95"
                  >
                    เข้าสู่ระบบ
                  </Link>
                  <Link
                    href="/register"
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-indigo-500/20 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-indigo-500/30 active:translate-y-0 active:scale-95"
                  >
                    <span>เริ่มใช้งานฟรี</span>
                    <Sparkles className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1">
          {children}
        </main>

        {/* FOOTER */}
        <footer className="print:hidden border-t border-slate-200/80 bg-white/80 py-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
            <div className="flex items-center gap-2.5 text-slate-900">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-extrabold tracking-tight">Smart Plan</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                ระบบจัดการแผนการสอนสำหรับคุณครู
              </span>
            </div>
            <p className="text-center text-xs font-medium text-slate-400 sm:text-right">
              ออกแบบแผนการสอนอัจฉริยะตามมาตรฐาน สพฐ. และ ว.PA<br className="sm:hidden" />
              <span className="hidden sm:inline"> • </span>Copyright © 2026 By Mr.Nattapat Prompru. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
