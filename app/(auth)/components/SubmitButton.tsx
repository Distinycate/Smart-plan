'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

export function SubmitButton({ children, formAction, pendingText = "กำลังดำเนินการ...", className }: { children: React.ReactNode, formAction: any, pendingText?: string, className?: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      formAction={formAction}
      disabled={pending}
      className={className || "bg-indigo-600 rounded-lg px-4 py-3 text-white font-semibold hover:bg-indigo-700 transition-all focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg shadow-indigo-500/30"}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  )
}
