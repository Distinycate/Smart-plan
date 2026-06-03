import Link from 'next/link'
import { login } from '../actions'

export default function LoginPage({ searchParams }: { searchParams: { message: string } }) {
  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto pt-20">
      <form className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800">เข้าสู่ระบบ</h1>
            <p className="text-slate-500 mt-2">Smart Lesson Plan Generator</p>
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
          formAction={login}
          className="bg-blue-600 rounded-md px-4 py-2 text-white font-medium hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Login
        </button>
        
        <div className="text-center mt-4 text-sm text-slate-500">
          ยังไม่มีบัญชี? <Link href="/register" className="text-blue-600 hover:underline">สมัครสมาชิก</Link>
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
