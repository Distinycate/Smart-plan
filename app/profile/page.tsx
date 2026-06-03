import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { User, BookOpen, PenTool, Sparkles, CheckCircle2, Heart } from 'lucide-react'
import FeedbackForm from './FeedbackForm'

const quotes = [
  "การสอนที่ดียิ่งกว่าศิลปะ คือการส่งต่อแรงบันดาลใจให้ผู้เรียนครับ - กำลังใจจากครูเต้ครับ",
  "ความพยายามของคุณครูในวันนี้ คือความสำเร็จของนักเรียนในวันข้างหน้า - กำลังใจจากครูเต้ครับ",
  "อย่าลืมยิ้มให้กับตัวเองและนักเรียนในทุกๆ วันนะครับ - กำลังใจจากครูเต้ครับ",
  "แผนการสอนที่ดี คือแผนที่ทำด้วยความตั้งใจ และเราจะช่วยให้มันง่ายขึ้นเอง - กำลังใจจากครูเต้ครับ",
  "ครูคือแสงสว่างนำทาง ขอให้เป็นวันที่ดีในการสอนนะครับ - กำลังใจจากครูเต้ครับ"
]

export default async function ProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  
  // Random quote
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-indigo-600 px-8 py-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl"></div>
            <div className="relative z-10 flex items-center gap-6">
              <div className="h-24 w-24 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center text-4xl shadow-lg">
                👨‍🏫
              </div>
              <div>
                <h1 className="text-3xl font-bold">{profile?.full_name || 'คุณครู'}</h1>
                <p className="text-indigo-100 mt-2 opacity-90">{user.email}</p>
                <div className="inline-block mt-3 px-3 py-1 rounded-full bg-indigo-500/50 text-xs font-medium border border-indigo-400/50 backdrop-blur-sm">
                  {profile?.role === 'admin' ? '⭐ ผู้ดูแลระบบ (Admin)' : 'คุณครู (User)'}
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-8 py-6 bg-indigo-50/50 border-b border-indigo-100/50">
            <div className="flex items-start gap-3">
              <Heart className="h-5 w-5 text-pink-500 mt-0.5 shrink-0" />
              <p className="text-indigo-900 font-medium italic">"{randomQuote}"</p>
            </div>
          </div>

          <div className="px-8 py-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">ข้อมูลส่วนตัว</h3>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><User className="h-4 w-4" /></div>
                  <div><p className="text-xs text-slate-500">เพศ</p><p className="font-medium text-slate-700">{profile?.gender || '-'}</p></div>
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Sparkles className="h-4 w-4" /></div>
                  <div><p className="text-xs text-slate-500">อายุ</p><p className="font-medium text-slate-700">{profile?.age ? `${profile.age} ปี` : '-'}</p></div>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">ข้อมูลการสอน</h3>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600"><BookOpen className="h-4 w-4" /></div>
                  <div><p className="text-xs text-slate-500">กลุ่มสาระการเรียนรู้</p><p className="font-medium text-slate-700">{profile?.subject_group || '-'}</p></div>
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><PenTool className="h-4 w-4" /></div>
                  <div>
                    <p className="text-xs text-slate-500">ระดับชั้นที่สอน</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profile?.grade_levels ? 
                        (Array.isArray(profile.grade_levels) ? profile.grade_levels : JSON.parse(profile.grade_levels)).map((g: string) => (
                          <span key={g} className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded font-medium">{g}</span>
                        )) 
                      : '-'}
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* User Guide */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              คู่มือแนะนำการใช้งานระบบเบื้องต้น
            </h2>
          </div>
          <div className="p-8 space-y-6 text-slate-600">
            
            <div className="flex gap-4">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">1</div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">การสร้างแผนการสอนใหม่</h3>
                <p>กดปุ่ม "เข้าสู่ระบบสร้างแผน" ระบบจะให้คุณครูกรอกข้อมูลพื้นฐาน เช่น ชื่อเรื่อง จุดประสงค์ และเนื้อหา (ระบบจะบันทึกอัตโนมัติ) หลังจากนั้น ในหน้ากิจกรรมต่างๆ คุณครูสามารถกดปุ่ม "✨ AI ช่วยเขียน" เพื่อให้ระบบช่วยออกแบบกิจกรรมการเรียนรู้แบบ Active Learning, เขียนคำถามกระตุ้นคิด, และสร้างแบบประเมิน (Rubric) ให้แบบอัตโนมัติได้อย่างรวดเร็วครับ</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold">2</div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">การประเมินและพัฒนาแผน</h3>
                <p>หากคุณครูมีแผนการสอนเดิมอยู่แล้วในรูปแบบไฟล์ Word (.docx) สามารถไปที่เมนู "ประเมินและพัฒนาแผน" อัปโหลดไฟล์เพื่อให้ระบบวิเคราะห์หาจุดเด่น จุดที่ควรปรับปรุง พร้อมให้ข้อเสนอแนะเชิงลึก เพื่อนำไปปรับให้สอดคล้องกับเกณฑ์วิทยฐานะ PA ได้ทันทีครับ</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-bold">3</div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">การบันทึกและส่งออก</h3>
                <p>ทุกแผนที่คุณครูสร้างจะถูกบันทึกไว้ในบัญชีนี้โดยเฉพาะ ปลอดภัย ไม่ปะปนกับใคร และเมื่อสร้างเสร็จสมบูรณ์ สามารถกดปุ่ม "ส่งออก Word" หรือ "ส่งออก PDF" เพื่อนำไปใช้งานหรือจัดพิมพ์ได้ทันทีครับ รูปแบบฟอร์มจะจัดหน้าให้เรียบร้อยสวยงาม</p>
              </div>
            </div>

          </div>
        </div>

        {/* Feedback Form */}
        <FeedbackForm />

        {/* CTA */}
        <div className="text-center pt-4 pb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 hover:scale-105 transition-all shadow-lg shadow-blue-500/30">
            🚀 เข้าสู่ระบบสร้างแผนการสอน
          </Link>
        </div>

      </div>
    </div>
  )
}
