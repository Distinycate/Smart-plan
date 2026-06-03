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
