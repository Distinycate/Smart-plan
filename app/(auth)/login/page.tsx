import Link from 'next/link'
import Image from 'next/image'
import { login } from '../actions'
import { SubmitButton } from '../components/SubmitButton'
import { Sparkles } from 'lucide-react'

export default function LoginPage({ searchParams }: { searchParams: { message: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative bg-slate-50 py-10 px-4">
      {/* Pastel Gradient Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-pink-200/60 blur-[120px] mix-blend-multiply animate-blob"></div>
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-rose-200/60 blur-[120px] mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-pink-100/60 blur-[120px] mix-blend-multiply animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-4xl bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-pink-200/10 border border-white overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Illustration */}
        <div className="w-full md:w-5/12 bg-gradient-to-br from-pink-50 to-rose-50 p-8 flex flex-col items-center justify-center relative overflow-hidden border-r border-slate-100">
          <div className="relative z-10 w-full max-w-[280px] aspect-square rounded-full bg-white/60 shadow-[0_0_40px_rgba(255,255,255,0.8)] flex items-center justify-center mb-6 overflow-visible">
            <Image 
              src="/assets/3d_cute_robot_book_1780498831641.png" 
              alt="AI Robot Reading" 
              width={320} 
              height={320}
              className="object-contain drop-shadow-xl animate-float"
              priority
            />
          </div>
          <div className="relative z-10 text-center mt-4">
            <div className="inline-flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-pink-400" />
              <h2 className="text-2xl font-black text-slate-800">Smart Plan</h2>
            </div>
            <p className="text-slate-500 font-medium text-sm px-4 leading-relaxed">
              ผู้ช่วยอัจฉริยะที่จะทำให้การสร้างแผนการสอนของคุณเป็นเรื่องง่าย สนุก และรวดเร็ว
            </p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-7/12 p-8 sm:p-12 flex flex-col justify-center">
          <form className="animate-in flex flex-col w-full justify-center">
            <div className="mb-8 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">เข้าสู่ระบบ</h1>
              <p className="text-slate-500 mt-2 font-medium">ยินดีต้อนรับกลับมา! กรุณาเข้าสู่ระบบเพื่อไปต่อ</p>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-2" htmlFor="email">
                  อีเมล (Email)
                </label>
                <input
                  className="w-full rounded-2xl px-5 py-3.5 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-300 focus:bg-white transition-all shadow-sm text-slate-800 placeholder:text-slate-400 font-medium"
                  name="email"
                  type="email"
                  placeholder="you@school.ac.th"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-slate-700 block" htmlFor="password">
                    รหัสผ่าน (Password)
                  </label>
                  <Link href="#" className="text-xs font-bold text-pink-400 hover:text-pink-500 hover:underline">
                    ลืมรหัสผ่าน?
                  </Link>
                </div>
                <input
                  className="w-full rounded-2xl px-5 py-3.5 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-300 focus:bg-white transition-all shadow-sm text-slate-800 placeholder:text-slate-400 font-medium"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            <div className="mt-8">
              <SubmitButton 
                formAction={login} 
                pendingText="กำลังเข้าสู่ระบบ..."
                className="w-full bg-pink-200 rounded-2xl px-4 py-4 text-pink-900 font-black text-lg hover:bg-pink-300 transition-all shadow-lg shadow-pink-200/30 hover:shadow-xl hover:shadow-pink-200/40 active:scale-[0.98] flex justify-center items-center"
              >
                เข้าสู่ระบบ
              </SubmitButton>
            </div>
            
            <div className="text-center mt-8 text-sm text-slate-500 font-medium bg-slate-50 py-4 rounded-2xl border border-slate-100">
              ยังไม่มีบัญชีใช่ไหม? <Link href="/register" className="text-pink-400 font-black hover:text-pink-500 hover:underline transition-colors ml-1">สมัครสมาชิกฟรี</Link>
            </div>

            {searchParams?.message && (
              <div className="mt-6 p-4 bg-red-50 text-red-600 text-center text-sm font-medium rounded-2xl border border-red-100 flex items-center justify-center gap-2">
                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                {searchParams.message}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Floating animation for the image */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}} />
    </div>
  )
}
