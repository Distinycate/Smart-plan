import Link from 'next/link'
import { signup } from '../actions'

export default function RegisterPage({ searchParams }: { searchParams: { message: string } }) {
  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto pt-20">
      <form className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800">สมัครสมาชิก</h1>
            <p className="text-slate-500 mt-2">สร้างบัญชีเพื่อเริ่มต้นใช้งานระบบ</p>
        </div>
        
        <label className="text-md font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border border-slate-300 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
          name="email"
          placeholder="you@example.com"
          required
        />
        <label className="text-md font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border border-slate-300 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="password"
          name="password"
          placeholder="••••••••"
          required
        />
        <label className="text-md font-medium text-slate-700 mt-4" htmlFor="full_name">ชื่อ-นามสกุล</label>
        <input className="rounded-md px-4 py-2 bg-inherit border border-slate-300 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500" name="full_name" placeholder="ชื่อ นามสกุล" required />

        <div className="flex gap-4 mb-2 mt-2">
          <div className="flex-1">
            <label className="text-md font-medium text-slate-700 block mb-1" htmlFor="gender">เพศ</label>
            <select className="w-full rounded-md px-4 py-2 bg-inherit border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" name="gender" required>
              <option value="">เลือกเพศ...</option>
              <option value="ชาย">ชาย</option>
              <option value="หญิง">หญิง</option>
              <option value="ไม่ระบุ">ไม่ระบุ</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-md font-medium text-slate-700 block mb-1" htmlFor="age">อายุ</label>
            <input className="w-full rounded-md px-4 py-2 bg-inherit border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" type="number" name="age" placeholder="อายุ" min="18" max="100" required />
          </div>
        </div>

        <label className="text-md font-medium text-slate-700 mt-2 block" htmlFor="subject_group">วิชาที่สอน (กลุ่มสาระการเรียนรู้)</label>
        <select className="w-full rounded-md px-4 py-2 bg-inherit border border-slate-300 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500" name="subject_group" required>
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

        <label className="text-md font-medium text-slate-700 mt-2 block mb-2">ระดับชั้นที่สอน (เลือกได้มากกว่า 1)</label>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {['อ.1', 'อ.2', 'อ.3', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].map(grade => (
            <label key={grade} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer bg-slate-50 p-2 rounded border border-slate-200 hover:bg-slate-100">
              <input type="checkbox" name="grade_levels" value={grade} className="rounded text-blue-600 focus:ring-blue-500" />
              {grade}
            </label>
          ))}
        </div>
        <button
          formAction={signup}
          className="bg-slate-800 rounded-md px-4 py-2 text-white font-medium hover:bg-slate-900 transition-colors focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          Sign Up
        </button>
        
        <div className="text-center mt-4 text-sm text-slate-500">
          มีบัญชีอยู่แล้ว? <Link href="/login" className="text-blue-600 hover:underline">เข้าสู่ระบบ</Link>
        </div>

        {searchParams?.message && (
          <p className="mt-4 p-4 bg-red-50 text-red-600 text-center rounded-md border border-red-200">
            {searchParams.message}
          </p>
        )}
      </form>
    </div>
  )
}
