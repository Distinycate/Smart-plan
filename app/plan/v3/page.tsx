'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  BookOpen, 
  CheckCircle2, 
  FileText, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  Award, 
  Clock,
  LayoutGrid
} from 'lucide-react';
import { isV3Enabled } from '@/lib/featureFlags';

export default function V3DashboardPage() {
  const router = useRouter();
  const v3Active = isV3Enabled();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Navigation Breadcrumbs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Link href="/dashboard" className="hover:text-indigo-600 transition">หน้าหลัก (Dashboard)</Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Smart Plan V3</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              Wave 3.0 Active
            </span>
            <Link
              href="/plan/new"
              className="text-xs text-slate-600 hover:text-indigo-600 border border-slate-300 rounded-lg px-3 py-1.5 bg-white transition shadow-sm"
            >
              สลับไปหน้าเขียนแผนเดิม (Legacy 5-Tab)
            </Link>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-8 md:p-10 shadow-xl">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/30 backdrop-blur-md px-3 py-1 rounded-full text-indigo-200 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen Teaching Package Architecture</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Smart Plan V3 <span className="text-indigo-300 font-normal">| PA-Ready Teaching Package</span>
            </h1>
            <p className="text-indigo-100 text-base md:text-lg leading-relaxed">
              ยกระดับการทำแผนการสอน 60 นาที สู่ชุดเอกสารการจัดการเรียนรู้ครบวงจร (Teaching Package) 
              ที่ตรวจสอบย้อนกลับได้แบบ 100%: <strong>Objective → Evidence → Activity → Assessment → Teaching Assets</strong> พร้อมสำหรับการประเมินวิทยฐานะ วPA
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <Link
                href="/plan/v3/new"
                className="inline-flex items-center space-x-2 bg-white text-indigo-950 font-bold px-5 py-3 rounded-xl shadow-lg hover:bg-indigo-50 transition transform hover:-translate-y-0.5"
              >
                <span>เริ่มสร้างแผนใหม่ (7-Step Workflow)</span>
                <ArrowRight className="w-4 h-4 text-indigo-700" />
              </Link>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-10 translate-y-10">
            <Award className="w-96 h-96" />
          </div>
        </div>

        {/* Workflow Overview (7 Steps of V3) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>ขั้นตอนการทำงานระบบใหม่ (V3 7-Step Workflow)</span>
            </h2>
            <span className="text-xs text-slate-500">Non-destructive side-by-side architecture</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { num: '1', title: 'Setup', desc: 'ข้อมูลรายวิชา & มาตรฐาน' },
              { num: '2', title: 'Learning Goals', desc: 'Objective & Evidence' },
              { num: '3', title: 'Learning Design', desc: 'Blueprint 60 นาที' },
              { num: '4', title: 'Assessment', desc: 'เครื่องมือ & เกณฑ์วัดผล' },
              { num: '5', title: 'Teaching Package', desc: 'ใบงาน & สื่อการสอน' },
              { num: '6', title: 'Quality Review', desc: 'ตรวจความสอดคล้อง วPA' },
              { num: '7', title: 'Documents', desc: 'A4 Preview & Word Export' },
            ].map((step, idx) => (
              <div 
                key={step.num}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition"
              >
                <div>
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center mb-2">
                    {step.num}
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900">{step.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-normal">{step.desc}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center text-[10px] text-slate-400 font-medium">
                  {idx === 0 ? 'Wave 3.3 Ready' : 'In Roadmap'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800">Objective-Driven Alignment</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              ทุกจุดประสงค์ (Objective) ต้องผูกกับหลักฐาน (Evidence) และมีเครื่องมือวัดที่ระบุ Method, Tool, Criteria ครบถ้วน เพื่อป้องกันข้อผิดพลาดเชิงโครงสร้าง
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800">Exact 60-Minute Activity Timeline</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              คำนวณและเกลี่ยเวลากิจกรรมการเรียนรู้อย่างแม่นยำ ไม่เก็บเป็นข้อความก้อนเดียว แยกบทบาทครู-ผู้เรียน ชัดเจน พร้อมระบุจังหวะวัดประเมินระหว่างสอน
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800">Complete Teaching Assets</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              สร้างใบงาน (Worksheet), Task Card, คู่มือครู (Teacher Guide), และเฉลย/เกณฑ์ประเมินที่เชื่อมต่อกับแผนโดยตรง แยกชุดเอกสารครูและนักเรียน
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
