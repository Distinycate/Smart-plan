'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function PasswordInput({ name = 'password', placeholder = '••••••••', required = true }) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <input
        className="w-full rounded-xl px-4 py-3 bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm pr-12 text-slate-800"
        type={show ? 'text' : 'password'}
        name={name}
        placeholder={placeholder}
        required={required}
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
        onClick={() => setShow(!show)}
        tabIndex={-1}
      >
        {show ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  )
}
