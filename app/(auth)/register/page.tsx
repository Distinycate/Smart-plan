import Link from 'next/link'
import { signup } from '../actions'
import { SubmitButton } from '../components/SubmitButton'

export default function RegisterPage({ searchParams }: { searchParams: { message: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 py-12">
      {/* Pastel Gradient Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 fixed">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-200/50 blur-[120px] mix-blend-multiply animate-blob"></div>
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-200/50 blur-[120px] mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-pink-200/50 blur-[120px] mix-blend-multiply animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full px-4 sm:px-6 flex justify-center z-10">
        <div className="w-full max-w-lg bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 sm:p-10">
          <form className="animate-in flex flex-col w-full justify-center gap-2">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/10 text-indigo-600 mb-4 shadow-inner">
                <span className="text-3xl">🚀</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">สมัครสมาชิก</h1>
              <p className="text-slate-500 mt-2 font-medium">สร้างบัญชีเพื่อเริ่มต้นใช้งานระบบ</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1" htmlFor="email">อีเมล (Email)</label>
                <input
                  className="w-full rounded-xl px-4 py-2.5 bg-white/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                  name="email" type="email" placeholder="you@example.com" required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1" htmlFor="password">รหัสผ่าน (Password)</label>
                <input
                  className="w-full rounded-xl px-4 py-2.5 bg-white/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                  type="password" name="password" placeholder="••••••••" required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1" htmlFor="full_name">ชื่อ-นามสกุล</label>
                <input className="w-full rounded-xl px-4 py-2.5 bg-white/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm" name="full_name" placeholder="นาย/นาง/นางสาว สมปอง นามสกุล" required />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-slate-700 block mb-1" htmlFor="gender">เพศ</label>
                  <select className="w-full rounded-xl px-4 py-2.5 bg-white/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm" name="gender" required>
                    <option value="">เลือกเพศ...</option>
                    <option value="ชาย">ชาย</option>
                    <option value="หญิง">หญิง</option>
                    <option value="ไม่ระบุ">ไม่ระบุ</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-semibold text-slate-700 block mb-1" htmlFor="age">อายุ</label>
                  <input className="w-full rounded-xl px-4 py-2.5 bg-white/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm" type="number" name="age" placeholder="อายุ" min="18" max="100" required />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1" htmlFor="subject_group">วิชาที่สอน (กลุ่มสาระการเรียนรู้)</label>
                <select className="w-full rounded-xl px-4 py-2.5 bg-white/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm" name="subject_group" required>
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
                <label className="text-sm font-semibold text-slate-700 block mb-2">ระดับชั้นที่สอน (เลือกได้มากกว่า 1)</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {['อ.1', 'อ.2', 'อ.3', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].map(grade => (
                    <label key={grade} className="flex flex-col items-center justify-center gap-1 text-sm text-slate-700 cursor-pointer bg-white/60 p-2 rounded-xl border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all">
                      <input type="checkbox" name="grade_levels" value={grade} className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300" />
                      {grade}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <SubmitButton formAction={signup} pendingText="กำลังสมัครสมาชิก...">
                สมัครสมาชิก (Sign Up)
              </SubmitButton>
            </div>
            
            <div className="text-center mt-6 text-sm text-slate-500 font-medium">
              มีบัญชีอยู่แล้ว? <Link href="/login" className="text-indigo-600 hover:text-indigo-700 hover:underline transition-colors ml-1">เข้าสู่ระบบที่นี่</Link>
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
