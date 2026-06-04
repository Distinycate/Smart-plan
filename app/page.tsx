'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Edit3, 
  Search, 
  PenTool,
  ArrowRight
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="bg-white">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pink-50/50 to-white pt-20 pb-24 sm:pt-32 sm:pb-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-pink-200/20 blur-[120px]" />
          <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-rose-200/20 blur-[100px]" />
        </div>
        
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* Left: Text & CTA */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-pink-100/80 px-4 py-2 text-sm font-black text-pink-600 mb-6 border border-pink-200">
                <Zap className="h-4 w-4" />
                AI Assistant For Thai Teachers
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
                ออกแบบแผนการสอนอัจฉริยะ <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">
                  เสร็จสมบูรณ์ใน 30 วินาทีด้วย AI
                </span>
              </h1>
              <p className="mt-6 text-lg font-medium text-slate-600 leading-relaxed max-w-xl">
                ลดภาระงานเอกสารของคุณครู เพิ่มเวลาให้ห้องเรียน ด้วยระบบสร้างแผนการสอนกึ่งอัตโนมัติ (Smart Lesson Plan) ที่ถูกต้อง แม่นยำ และตรงตามหลักสูตร
              </p>
              
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/register" 
                  className="inline-flex justify-center items-center gap-2 rounded-full bg-pink-500 px-8 py-4 text-base font-black text-white shadow-lg shadow-pink-500/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-500/40 hover:bg-pink-600"
                >
                  สร้างแผนการสอนแรกของคุณฟรี <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </motion.div>

            {/* Right: UI Mockup */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative mx-auto w-full max-w-lg lg:max-w-none"
            >
              <div className="relative rounded-[2.5rem] bg-white p-2 shadow-2xl shadow-slate-200/50 border border-slate-100">
                <div className="absolute top-4 left-6 flex gap-2">
                  <div className="h-3 w-3 rounded-full bg-slate-200" />
                  <div className="h-3 w-3 rounded-full bg-slate-200" />
                  <div className="h-3 w-3 rounded-full bg-slate-200" />
                </div>
                <div className="mt-8 rounded-[2rem] bg-slate-50 border border-slate-100 p-6 overflow-hidden">
                  {/* Mockup content */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="h-6 w-1/3 rounded-lg bg-slate-200 animate-pulse" />
                    <div className="h-8 w-8 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-4 w-full rounded-md bg-slate-200 animate-pulse" />
                    <div className="h-4 w-5/6 rounded-md bg-slate-200 animate-pulse" />
                    <div className="h-4 w-4/6 rounded-md bg-slate-200 animate-pulse" />
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-4 w-4 rounded-full bg-emerald-400" />
                      <div className="h-4 w-1/4 rounded-md bg-slate-200" />
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
                      <div className="bg-gradient-to-r from-pink-400 to-rose-500 h-2 rounded-full w-[85%] animate-[pulse_2s_ease-in-out_infinite]" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Element */}
              <div className="absolute -right-6 -bottom-6 rounded-2xl bg-white p-4 shadow-xl shadow-slate-200/50 border border-slate-100 animate-[bounce_4s_ease-in-out_infinite]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</p>
                    <p className="text-sm font-black text-slate-800">100% Ready</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. TRUST & STATS SECTION */}
      <section className="bg-pink-50/50 py-16 border-y border-pink-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-pink-200/50">
            <div className="flex flex-col items-center text-center px-6 py-4 md:py-0">
              <div className="text-5xl font-black text-pink-500 mb-2">90%</div>
              <p className="text-sm font-bold text-slate-600">ประหยัดเวลาในการเตรียมและเขียนเอกสารแผนการสอน</p>
            </div>
            <div className="flex flex-col items-center text-center px-6 py-4 md:py-0">
              <div className="text-5xl font-black text-pink-500 mb-2">95%+</div>
              <p className="text-sm font-bold text-slate-600">ความถูกต้อง สมบูรณ์ และสอดคล้องตามตัวชี้วัดหลักสูตร</p>
            </div>
            <div className="flex flex-col items-center text-center px-6 py-4 md:py-0">
              <div className="text-5xl font-black text-pink-500 mb-2">100%</div>
              <p className="text-sm font-bold text-slate-600">ออกแบบมาเพื่อลดภาระงาน ใช้งานง่ายสำหรับคุณครูทุกคน</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE FEATURES SECTION */}
      <section className="py-24 bg-white relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">จัดการทุกขั้นตอนของแผนการสอน<br/> ครบจบในที่เดียว</h2>
            <p className="text-lg font-medium text-slate-500">ระบบถูกออกแบบมาให้ครอบคลุมการทำงานของคุณครูตั้งแต่เริ่มคิดจนถึงพิมพ์ใช้งาน</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="rounded-[2rem] bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 transition-all hover:-translate-y-2 hover:shadow-[0_20px_40px_rgb(255,20,147,0.08)]">
              <div className="h-14 w-14 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-600 mb-6">
                <Edit3 className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3">✍️ สร้างแผน (Generate)</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                เพียงใส่หัวข้อวิชาหรือตัวชี้วัด AI จะช่วยร่างโครงสร้างแผนการสอน จุดประสงค์การเรียนรู้ และกิจกรรมกลุ่มให้ทันทีอย่างมืออาชีพ
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-[2rem] bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 transition-all hover:-translate-y-2 hover:shadow-[0_20px_40px_rgb(255,20,147,0.08)]">
              <div className="h-14 w-14 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-600 mb-6">
                <Search className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3">🔍 ตรวจแผน (Verify & Audit)</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                ระบบตรวจสอบความสอดคล้อง (Alignment) ระหว่างเนื้อหา กิจกรรม และการวัดผล เพื่อให้มั่นใจว่าแผนผ่านเกณฑ์มาตรฐานอย่างถูกต้อง
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-[2rem] bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 transition-all hover:-translate-y-2 hover:shadow-[0_20px_40px_rgb(255,20,147,0.08)]">
              <div className="h-14 w-14 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-600 mb-6">
                <PenTool className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3">🛠️ แก้แผน (Customize)</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                ปรับแต่ง ยืดหยุ่น และแก้ไขเนื้อหาเฉพาะจุดได้อย่างอิสระผ่านโปรแกรมแก้ไขที่ใช้งานง่าย พร้อมส่งออก (Export) เป็นไฟล์พร้อมใช้งาน
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ABOUT US SECTION */}
      <section className="py-24 bg-slate-50 border-y border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Image Placeholder */}
            <div className="relative">
              <div className="aspect-[4/3] rounded-[2.5rem] bg-gradient-to-br from-pink-200 to-rose-100 overflow-hidden shadow-inner flex items-center justify-center">
                {/* Normally an image goes here. We use an aesthetic placeholder */}
                <div className="text-center p-8">
                  <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white text-pink-500 shadow-xl mb-6">
                    <Sparkles className="h-10 w-10" />
                  </div>
                  <h3 className="text-2xl font-black text-pink-900/60">Happy Teacher Workspace</h3>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 h-32 w-32 bg-pink-500 rounded-full blur-[80px] opacity-30 z-0" />
            </div>

            {/* Right: Text */}
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-6 leading-tight">
                "เพราะเราเชื่อว่า <span className="text-pink-500">เวลาของคุณครูมีค่าที่สุด</span> สำหรับนักเรียน"
              </h2>
              <div className="space-y-6 text-lg font-medium text-slate-600 leading-relaxed">
                <p>
                  Smart Plan ถูกพัฒนาขึ้นมาเพื่อเป็นคู่คิดและผู้ช่วยอัจฉริยะของคุณครูไทย เรามุ่งเน้นการนำเทคโนโลยี AI มาช่วยลดขั้นตอนการทำเอกสารที่ซับซ้อน ให้กลายเป็นเรื่องง่าย สะดวกรวดเร็ว และคงไว้ซึ่งความถูกต้องตามหลักวิชาการ
                </p>
                <p>
                  เพื่อให้คุณครูได้มีเวลาโฟกัสกับการเตรียมสื่อการสอน และพัฒนาศักยภาพของเด็กๆ ได้อย่างเต็มที่ โดยไม่ต้องกังวลเรื่องงานเอกสารอีกต่อไป
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PRICING SECTION */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">แผนการใช้งานที่คุ้มค่า</h2>
            <p className="text-lg font-medium text-slate-500">ไม่มีค่าใช้จ่ายแอบแฝง เริ่มต้นใช้งานได้ทันที</p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="rounded-[2.5rem] bg-gradient-to-b from-pink-50 to-white p-8 sm:p-10 shadow-[0_20px_50px_rgb(255,20,147,0.1)] border-2 border-pink-100 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-pink-500 text-white text-xs font-black uppercase tracking-wider py-1.5 px-4 rounded-bl-xl">
                Most Popular
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 mb-2">Free Account</h3>
              <div className="flex items-baseline justify-center gap-2 mb-8">
                <span className="text-5xl font-black text-pink-500">0</span>
                <span className="text-xl font-bold text-slate-500">บาท / ใช้งานฟรีตลอดไป</span>
              </div>

              <ul className="space-y-4 mb-10 text-left">
                {[
                  "เข้าใช้งานฟีเจอร์ Smart Lesson Plan กึ่งอัตโนมัติ",
                  "ระบบสร้างแผน ตรวจแผน และแก้แผน พื้นฐาน",
                  "ส่งออกไฟล์เอกสารได้ทันที (Word/PDF)",
                  "รองรับการใช้งานผ่านคอมพิวเตอร์และมือถือ"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-slate-600 font-bold text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>

              <Link 
                href="/register" 
                className="block w-full rounded-2xl bg-pink-500 px-6 py-4 text-center text-lg font-black text-white shadow-lg shadow-pink-500/30 transition-all hover:-translate-y-1 hover:bg-pink-600 hover:shadow-xl hover:shadow-pink-500/40"
              >
                สมัครสมาชิกและเริ่มใช้ฟรีวันนี้
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
