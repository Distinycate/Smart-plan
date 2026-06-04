import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { User, BookOpen, PenTool, Sparkles, CheckCircle2, Heart, ArrowRight } from 'lucide-react'
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
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mr-[20%] -mt-[10%] w-[60%] h-[60%] rounded-full bg-rose-200/30 blur-[120px] mix-blend-multiply pointer-events-none"></div>
      <div className="absolute top-[40%] left-0 -ml-[20%] w-[50%] h-[50%] rounded-full bg-rose-200/30 blur-[120px] mix-blend-multiply pointer-events-none"></div>

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        
        {/* Header / Profile Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-white overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-50/80 to-rose-50/80 backdrop-blur-sm z-0"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-8 sm:p-12 gap-8">
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-white text-pink-600 font-bold text-sm shadow-sm">
                <Sparkles size={16} />
                <span>ยินดีต้อนรับกลับมาครับคุณครู</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight">
                {profile?.full_name || 'คุณครู'}
              </h1>
              <p className="text-slate-500 font-medium text-lg">{user.email}</p>
              
              <div className="inline-block mt-2 px-4 py-1.5 rounded-full bg-pink-600 text-white text-xs font-bold shadow-md shadow-pink-500/20">
                {profile?.role === 'admin' ? '⭐ ผู้ดูแลระบบ (Admin)' : 'คุณครู (User)'}
              </div>
            </div>

            <div className="relative w-full max-w-[280px] aspect-square shrink-0">
              <div className="absolute inset-0 bg-white/40 rounded-full blur-2xl"></div>
              <Image 
                src="/assets/3d_profile_avatar_1780498856754.png" 
                alt="Teacher Desk 3D" 
                width={300} 
                height={300}
                className="object-contain drop-shadow-xl relative z-10 animate-float"
                priority
              />
            </div>
          </div>
          
          {/* Quote Bar */}
          <div className="relative z-10 px-8 py-5 bg-white/80 border-t border-white backdrop-blur-md">
            <div className="flex items-start sm:items-center gap-4 max-w-3xl mx-auto justify-center">
              <Heart className="h-6 w-6 text-pink-500 shrink-0 animate-pulse" />
              <p className="text-pink-900 font-semibold italic text-sm sm:text-base text-center">"{randomQuote}"</p>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl shadow-lg shadow-slate-200/40 border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-6">
              <User className="text-rose-500" /> ข้อมูลส่วนตัว
            </h3>
            <ul className="space-y-5">
              <li className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-inner">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">เพศ</p>
                  <p className="font-bold text-slate-700 text-lg">{profile?.gender || '-'}</p>
                </div>
              </li>
              <li className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
                  <Sparkles size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">อายุ</p>
                  <p className="font-bold text-slate-700 text-lg">{profile?.age ? `${profile.age} ปี` : '-'}</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-lg shadow-slate-200/40 border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-6">
              <BookOpen className="text-rose-500" /> ข้อมูลการสอน
            </h3>
            <ul className="space-y-5">
              <li className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-inner">
                  <BookOpen size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">กลุ่มสาระการเรียนรู้</p>
                  <p className="font-bold text-slate-700 text-lg">{profile?.subject_group || '-'}</p>
                </div>
              </li>
              <li className="flex flex-col gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <PenTool size={16} className="text-amber-500" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ระดับชั้นที่สอน</p>
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {profile?.grade_levels ? 
                    (Array.isArray(profile.grade_levels) ? profile.grade_levels : JSON.parse(profile.grade_levels)).map((g: string) => (
                      <span key={g} className="px-3 py-1 bg-amber-100 text-amber-800 text-sm rounded-lg font-bold shadow-sm">{g}</span>
                    )) 
                  : '-'}
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* User Guide & Action */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-lg shadow-slate-200/40 border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-pink-50/50 to-white">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                คู่มือแนะนำการใช้งาน
              </h2>
            </div>
            <div className="p-8 space-y-6 text-slate-600">
              
              <div className="flex gap-5">
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 font-black shadow-inner">1</div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">เริ่มสร้างแผนการสอนใหม่</h3>
                  <p className="font-medium leading-relaxed">กดปุ่ม "เข้าสู่ระบบสร้างแผน" ด้านล่าง เพื่อเข้าสู่หน้าหลัก ในหน้ากิจกรรมต่างๆ คุณครูสามารถกดปุ่ม "✨ AI ช่วยเขียน" เพื่อให้ระบบช่วยออกแบบกิจกรรมการเรียนรู้แบบ Active Learning ได้อัตโนมัติ</p>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 font-black shadow-inner">2</div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">ประเมินและพัฒนาแผนเดิม</h3>
                  <p className="font-medium leading-relaxed">มีแผนเดิมอยู่แล้ว? ไปที่เมนู "ประเมินและพัฒนาแผน" เพื่ออัปโหลดไฟล์ Word (.docx) ให้ AI วิเคราะห์หาจุดเด่นและให้ข้อเสนอแนะเชิงลึก เพื่อนำไปปรับให้สอดคล้องกับเกณฑ์วิทยฐานะ PA</p>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-2xl bg-green-100 text-green-600 font-black shadow-inner">3</div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">บันทึกและส่งออกอย่างรวดเร็ว</h3>
                  <p className="font-medium leading-relaxed">ทุกแผนที่คุณครูสร้างจะถูกบันทึกไว้อย่างปลอดภัย เมื่อสร้างเสร็จแล้ว สามารถกดส่งออกเป็นไฟล์ Word หรือ PDF ไปใช้งานได้ทันที รูปแบบฟอร์มจัดมาให้สวยงามพร้อมใช้ครับ</p>
                </div>
              </div>

            </div>
          </div>

          <div className="space-y-8 flex flex-col justify-between">
            {/* CTA Button */}
            <div className="bg-gradient-to-br from-pink-600 to-rose-600 rounded-3xl p-8 text-center text-white shadow-xl shadow-pink-500/20 relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out"></div>
              <h3 className="text-2xl font-black mb-3 relative z-10">พร้อมแล้วใช่ไหม?</h3>
              <p className="text-pink-100 mb-8 font-medium relative z-10">ลุยเลย! สร้างแผนการสอนที่สมบูรณ์แบบในไม่กี่คลิก</p>
              <Link href="/dashboard" className="relative z-10 flex items-center justify-center gap-2 w-full px-6 py-4 text-pink-600 font-black text-lg bg-white rounded-2xl hover:bg-pink-50 transition-colors shadow-lg active:scale-95">
                เข้าสู่ระบบสร้างแผน <ArrowRight size={20} />
              </Link>
            </div>
            
            {/* Feedback Form Card */}
            <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/40 border border-slate-100 p-1">
              <FeedbackForm />
            </div>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
      `}} />
    </div>
  )
}
