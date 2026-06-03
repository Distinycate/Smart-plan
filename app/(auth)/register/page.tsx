import Link from 'next/link'
import Image from 'next/image'
import { signup } from '../actions'
import { SubmitButton } from '../components/SubmitButton'

export default function RegisterPage({ searchParams }: { searchParams: { message: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 py-10 px-4">
      {/* Pastel Gradient Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 fixed">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-200/60 blur-[120px] mix-blend-multiply animate-blob"></div>
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-200/60 blur-[120px] mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-pink-200/60 blur-[120px] mix-blend-multiply animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-6xl bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/60 overflow-hidden flex flex-col lg:flex-row my-8">
        
        {/* Left Side: 3D Illustration & Welcome Text */}
        <div className="w-full lg:w-5/12 bg-indigo-50/50 p-8 lg:p-12 flex flex-col justify-center relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200/50">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-100/40 to-pink-50/40 z-0"></div>
          
          <div className="relative z-10 w-full max-w-[320px] aspect-square mx-auto rounded-[2.5rem] bg-white/40 shadow-[0_0_40px_rgba(255,255,255,0.8)] flex items-center justify-center mb-8 overflow-visible">
            <Image 
              src="/assets/3d_teacher_rocket_1780498844106.png" 
              alt="Teacher riding a rocket" 
              width={380} 
              height={380}
              className="object-contain drop-shadow-xl animate-float-slow"
              priority
            />
          </div>
          
          <div className="relative z-10 text-center">
            <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">พุ่งสู่อนาคตการสอน! 🚀</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              ลดเวลาทำเอกสาร เพิ่มเวลาพัฒนาผู้เรียน<br/>มาร่วมสร้างประสบการณ์การเรียนรู้ที่ดีที่สุดไปด้วยกัน
            </p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full lg:w-7/12 p-8 lg:p-12">
          <form className="animate-in flex flex-col w-full">
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">สมัครสมาชิกฟรี</h1>
              <p className="text-slate-500 mt-2 font-medium">กรอกข้อมูลด้านล่างเพื่อเริ่มต้นใช้งานระบบ Smart-plan</p>
            </div>
            
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-2" htmlFor="full_name">ชื่อ-นามสกุล</label>
                  <input className="w-full rounded-2xl px-5 py-3.5 bg-white/60 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm text-slate-800 placeholder:text-slate-400 font-medium" name="full_name" placeholder="นาย/นาง/นางสาว สมปอง นามสกุล" required />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-2" htmlFor="email">อีเมล (Email)</label>
                  <input className="w-full rounded-2xl px-5 py-3.5 bg-white/60 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm text-slate-800 placeholder:text-slate-400 font-medium" name="email" type="email" placeholder="you@school.ac.th" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-2" htmlFor="password">รหัสผ่าน (Password)</label>
                  <input className="w-full rounded-2xl px-5 py-3.5 bg-white/60 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm text-slate-800 placeholder:text-slate-400 font-medium" type="password" name="password" placeholder="••••••••" minLength={6} required />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-bold text-slate-700 block mb-2" htmlFor="gender">เพศ</label>
                    <select className="w-full rounded-2xl px-5 py-3.5 bg-white/60 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm text-slate-800 font-medium appearance-none" name="gender" required>
                      <option value="">เลือกเพศ...</option>
                      <option value="ชาย">ชาย</option>
                      <option value="หญิง">หญิง</option>
                      <option value="ไม่ระบุ">ไม่ระบุ</option>
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="text-sm font-bold text-slate-700 block mb-2" htmlFor="age">อายุ</label>
                    <input className="w-full rounded-2xl px-5 py-3.5 bg-white/60 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm text-slate-800 placeholder:text-slate-400 font-medium" type="number" name="age" placeholder="ปี" min="18" max="100" required />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4">ข้อมูลการสอน</h3>
                
                <div className="mb-6">
                  <label className="text-sm font-bold text-slate-700 block mb-2" htmlFor="subject_group">กลุ่มสาระการเรียนรู้</label>
                  <select className="w-full rounded-2xl px-5 py-3.5 bg-white/60 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm text-slate-800 font-medium appearance-none" name="subject_group" required>
                    <option value="">เลือกกลุ่มสาระฯ...</option>
                    <option value="ภาษาไทย">ภาษาไทย</option>
                    <option value="คณิตศาสตร์">คณิตศาสตร์</option>
                    <option value="วิทยาศาสตร์และเทคโนโลยี">วิทยาศาสตร์และเทคโนโลยี</option>
                    <option value="สังคมศึกษา ศาสนา และวัฒนธรรม">สังคมศึกษา ศาสนา และวัฒนธรรม</option>
                    <option value="สุขศึกษาและพลศึกษา">สุขศึกษาและพลศึกษา</option>
                    <option value="ศิลปะ">ศิลปะ</option>
                    <option value="การงานอาชีพ">การงานอาชีพ</option>
                    <option value="ภาษาต่างประเทศ">ภาษาต่างประเทศ</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-3">ระดับชั้นที่สอน (เลือกได้มากกว่า 1)</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {['อ.1', 'อ.2', 'อ.3', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].map(grade => (
                      <label key={grade} className="relative cursor-pointer">
                        <input type="checkbox" name="grade_levels" value={grade} className="peer sr-only" />
                        <div className="w-full text-center py-2 px-3 rounded-xl border border-slate-200 bg-white/60 text-sm font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all peer-checked:bg-indigo-600 peer-checked:text-white peer-checked:border-indigo-600 peer-checked:shadow-md">
                          {grade}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <SubmitButton 
                formAction={signup} 
                pendingText="กำลังสร้างบัญชี..."
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl px-4 py-4 text-white font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 active:scale-[0.98] flex justify-center items-center"
              >
                ยืนยันการสมัครสมาชิก
              </SubmitButton>
            </div>
            
            <div className="text-center mt-6 text-sm text-slate-500 font-medium">
              มีบัญชีอยู่แล้วใช่ไหม? <Link href="/login" className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline transition-colors ml-1">เข้าสู่ระบบที่นี่</Link>
            </div>

            {searchParams?.message && (
              <div className="mt-6 p-4 bg-red-50/80 backdrop-blur-sm text-red-600 text-center text-sm font-medium rounded-2xl border border-red-100 flex items-center justify-center gap-2">
                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                {searchParams.message}
              </div>
            )}
          </form>
        </div>
      </div>
      
      {/* Floating animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        .animate-float-slow {
          animation: float-slow 5s ease-in-out infinite;
        }
      `}} />
    </div>
  )
}
