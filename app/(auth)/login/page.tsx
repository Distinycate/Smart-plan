import Link from 'next/link'
import { login } from '../actions'
import { Mail, Lock, ArrowRight, Sparkles, BookOpen, ChevronRight } from 'lucide-react'
import { PasswordInput } from '../components/PasswordInput'
import { SubmitButton } from '../components/SubmitButton'

export default function LoginPage({ searchParams }: { searchParams: { message: string } }) {
  return (
    <div className="min-h-screen flex bg-slate-50 font-sans antialiased">
      
      {/* ─── ฝั่งซ้าย: แบรนด์และกราฟิกดีไซน์ล้ำสมัย (แสดงเฉพาะหน้าจอใหญ่) ─── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 text-white p-12 flex-col justify-between relative overflow-hidden">
        
        {/* Background Decorative Aura (สร้างมิติแสง 3D ชวนมอง) */}
        <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[140px] opacity-20 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500 rounded-full blur-[120px] opacity-25 pointer-events-none"></div>

        {/* ส่วนหัว: Logo แบรนด์ */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-500 to-indigo-500 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <Link href="/">
            <span className="font-black text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
              Smart-plan
            </span>
            <p className="text-[10px] text-indigo-300/80 font-medium uppercase tracking-widest mt-0.5">Enterprise Edition</p>
          </Link>
        </div>

        {/* ส่วนกลาง: ข้อความโปรโมตและ Preview Card จำลอง (Mockup) */}
        <div className="relative z-10 my-auto max-w-lg space-y-8">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-blue-300 border border-white/10">
              <BookOpen className="w-3.5 h-3.5" /> ระบบช่วยจัดการเรียนรู้ยุคใหม่
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.25] tracking-tight text-white">
              ยกระดับแผนการสอนของคุณ <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-200 to-white">
                ด้วยพลัง AI อัจฉริยะ
              </span>
            </h1>
            <p className="text-slate-400 leading-relaxed text-base font-normal">
              ช่วยออกแบบ วิเคราะห์ และประเมินความสมบูรณ์ของแผนการจัดการเรียนรู้อย่างเป็นระบบ รวดเร็ว และถูกต้องตามมาตรฐานหลักสูตร
            </p>
          </div>

          {/* Floating UI Mockup (ดีไซน์กระจกโปร่งแสงเลียนแบบมิติ 3 มิติ) */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-2xl relative transform hover:translate-y-[-4px] transition-transform duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
                <p className="text-xs font-semibold tracking-wide text-slate-300 uppercase">AI Intelligence Analysis</p>
              </div>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-1 rounded-md border border-emerald-500/20">Score 85/100</span>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-[85%] bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full"></div>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                <ChevronRight className="w-3.5 h-3.5 text-indigo-400" /> ตรวจสอบความสอดคล้องตัวชี้วัดเสร็จสิ้น
              </p>
            </div>
          </div>
        </div>

        {/* ส่วนท้าย: Copyright */}
        <div className="relative z-10 text-xs text-slate-500 font-normal">
          &copy; {new Date().getFullYear()} Smart-plan. All rights reserved.
        </div>
      </div>

      {/* ─── ฝั่งขวา: ฟอร์ม Login สีขาวคลีนตา (แสดงทุกหน้าจอ) ─── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 md:p-20 bg-white">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Mobile Logo Header (แสดงเฉพาะบนจอเล็กแทนฝั่งซ้ายที่โดนซ่อน) */}
          <div className="flex lg:hidden items-center gap-2.5 mb-6">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-800">Smart-plan</span>
          </div>

          {/* Form Title */}
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">ยินดีต้อนรับกลับมา</h2>
            <p className="text-slate-500 text-sm mt-2">กรุณาเข้าสู่ระบบเพื่อใช้งานระบบจัดการแผนอัจฉริยะ</p>
          </div>

          {/* ปุ่ม Social Login: Google Sign-In */}
          <button type="button" className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 bg-white hover:bg-slate-50 transition-all hover:shadow-sm active:scale-[0.99]">
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 14.96 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.86 3A6.97 6.97 0 0 1 12 5.04z"/>
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.27H12v4.51h6.46a5.54 5.54 0 0 1-2.4 3.64l3.73 2.89c2.18-2 3.7-4.97 3.7-8.77z"/>
              <path fill="#FBBC05" d="M5.36 14.5a6.93 6.93 0 0 1 0-5l-3.86-3A11.94 11.94 0 0 0 1 12c0 2.1.54 4.07 1.5 5.8l3.86-3.3z"/>
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.08 7.96-2.92l-3.73-2.89c-1.04.7-2.37 1.11-4.23 1.11-3.26 0-6.03-2.2-7.02-5.17l-3.86 3A11.94 11.94 0 0 0 12 23z"/>
            </svg>
            เข้าสู่ระบบด้วยบัญชี Google
          </button>

          {/* เส้นแบ่งกลาง */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-slate-200"></div>
            <span className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">หรือใช้อีเมลองค์กร</span>
            <div className="flex-1 border-t border-slate-200"></div>
          </div>

          {/* ฟอร์มกรอกข้อมูล */}
          <form className="space-y-5">
            
            {/* Input: อีเมล */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">อีเมลผู้ใช้งาน</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="name@school.ac.th"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
                />
              </div>
            </div>

            {/* Input: รหัสผ่าน */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">รหัสผ่าน</label>
                <Link href="#" className="text-xs font-bold text-indigo-600 hover:underline">ลืมรหัสผ่าน?</Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 z-10">
                  <Lock className="w-4 h-4" />
                </div>
                <PasswordInput name="password" placeholder="••••••••" />
              </div>
            </div>

            {/* ส่วนของ Remember Me */}
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                จำการเข้าระบบไว้ในอุปกรณ์นี้
              </label>
            </div>

            {/* ปุ่มส่งฟอร์ม */}
            <SubmitButton
              formAction={login}
              pendingText="กำลังเข้าสู่ระบบ..."
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all transform hover:translate-y-[-1px] active:translate-y-[0px]"
            >
              เข้าสู่ระบบบัญชี
              <ArrowRight className="w-4 h-4" />
            </SubmitButton>

            <div className="text-center mt-4 text-sm text-slate-600 font-medium">
              ยังไม่มีบัญชี? <Link href="/register" className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline transition-colors ml-1">สมัครสมาชิกที่นี่</Link>
            </div>

            {searchParams?.message && (
              <div className="mt-4 p-4 bg-red-50 text-red-600 text-center text-sm font-medium rounded-xl border border-red-200 flex items-center justify-center gap-2">
                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                {searchParams.message}
              </div>
            )}
          </form>

        </div>
      </div>

    </div>
  )
}
