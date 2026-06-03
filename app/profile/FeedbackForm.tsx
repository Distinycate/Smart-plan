'use client'

import { useFormState } from 'react-dom'
import { submitFeedback } from './actions'
import { SubmitButton } from '../(auth)/components/SubmitButton'
import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { MessageSquare } from 'lucide-react'

const initialState = {
  success: false,
  message: '',
  error: ''
}

export default function FeedbackForm() {
  const [state, formAction] = useFormState(submitFeedback, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) {
      toast.success(state.message)
      formRef.current?.reset()
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-8">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-500" />
          ส่งข้อเสนอแนะถึงผู้พัฒนา (Feedback)
        </h2>
      </div>
      <div className="p-8">
        <p className="text-slate-600 mb-4 text-sm">
          หากคุณครูพบปัญหาการใช้งาน มีข้อเสนอแนะ หรืออยากให้ระบบเพิ่มฟีเจอร์อะไรใหม่ๆ สามารถพิมพ์ส่งข้อความหา Admin โดยตรงได้ที่นี่เลยครับ
        </p>
        <form ref={formRef} action={formAction} className="space-y-4">
          <textarea
            name="message"
            rows={4}
            required
            className="w-full rounded-xl px-4 py-3 bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm resize-none"
            placeholder="พิมพ์ข้อเสนอแนะ ปัญหาที่พบ หรือคำติชมของคุณครูที่นี่..."
          ></textarea>
          <div className="flex justify-end">
            <SubmitButton formAction={undefined} pendingText="กำลังส่งข้อความ...">
              ส่งข้อความ
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  )
}
