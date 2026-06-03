'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitFeedback(prevState: any, formData: FormData) {
  const message = formData.get('message') as string

  if (!message || message.trim() === '') {
    return { error: 'กรุณากรอกข้อความก่อนส่งครับ' }
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'ไม่พบผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่' }
  }

  const { error } = await supabase
    .from('feedbacks')
    .insert({
      user_id: user.id,
      message: message.trim()
    })

  if (error) {
    console.error('Error inserting feedback:', error)
    return { error: 'เกิดข้อผิดพลาดในการส่งข้อความ: ' + error.message }
  }

  revalidatePath('/profile')
  return { success: true, message: 'ขอบคุณสำหรับคำแนะนำครับ! ข้อความส่งถึง Admin เรียบร้อยแล้ว' }
}
