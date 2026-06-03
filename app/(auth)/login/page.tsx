import Link from 'next/link'
import { login } from '../actions'
import { SubmitButton } from '../components/SubmitButton'

export default function LoginPage({ searchParams }: { searchParams: { message: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50">
      {/* Pastel Gradient Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-200/50 blur-[120px] mix-blend-multiply animate-blob"></div>
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-200/50 blur-[120px] mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-pink-200/50 blur-[120px] mix-blend-multiply animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full px-4 sm:px-6 flex justify-center z-10 py-12">
        <div className="w-full max-w-md bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 sm:p-10">
          <form className="animate-in flex flex-col w-full justify-center gap-2">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/10 text-indigo-600 mb-4 shadow-inner">
                <span className="text-3xl">✨</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">เข้าสู่ระบบ</h1>
              <p className="text-slate-500 mt-2 font-medium">Smart Lesson Plan By Kruteh</p>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2" htmlFor="email">
                  อีเมล (Email)
                </label>
                <input
                  className="w-full rounded-xl px-4 py-3 bg-white/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2" htmlFor="password">
                  รหัสผ่าน (Password)
                </label>
                <input
                  className="w-full rounded-xl px-4 py-3 bg-white/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            <div className="mt-8">
              <SubmitButton formAction={login} pendingText="กำลังเข้าสู่ระบบ...">
                เข้าสู่ระบบ
              </SubmitButton>
            </div>
            
            <div className="text-center mt-6 text-sm text-slate-500 font-medium">
              ยังไม่มีบัญชี? <Link href="/register" className="text-indigo-600 hover:text-indigo-700 hover:underline transition-colors ml-1">สมัครสมาชิกที่นี่</Link>
            </div>

            {searchParams?.message && (
              <p className="mt-6 p-4 bg-red-50/80 backdrop-blur-sm text-red-600 text-center text-sm font-medium rounded-xl border border-red-100">
                {searchParams.message}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
