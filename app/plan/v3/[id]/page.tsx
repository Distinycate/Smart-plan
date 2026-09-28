'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Layers, FileText, Printer, CheckCircle, ShieldCheck } from 'lucide-react';

export default function V3PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-3">
            <Link 
              href="/plan/v3" 
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Plan ID: {id}
              </span>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">รายละเอียดแผนการสอน V3</h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href={`/plan/${id}`}
              className="text-xs text-slate-600 hover:text-indigo-600 border border-slate-300 rounded-lg px-3 py-1.5 bg-white transition shadow-xs"
            >
              เปิดด้วย Legacy Plan Editor
            </Link>
            <Link
              href={`/plan/${id}/preview`}
              className="inline-flex items-center space-x-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3 py-1.5 transition shadow-xs font-medium"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ / A4 Preview</span>
            </Link>
          </div>
        </div>

        {/* Content Shell */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 text-indigo-600">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900">Teaching Package View (V3)</h2>
              <p className="text-xs text-slate-500">รองรับระบบเชื่อมโยง Objective → Evidence → Activity → Assessment</p>
            </div>
          </div>

          <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center space-y-3 bg-slate-50/50">
            <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-slate-800">ระบบ V3 Domain Model กำลังจะเปิดใช้งานใน Wave V3.1</h3>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              แผนการสอนรหัส <strong>{id}</strong> สามารถดูและแก้ไขผ่านระบบเดิมได้อย่างปลอดภัย 100% 
              โดยข้อมูลจะไม่สูญหายและไม่ถูกแก้ไขทับ
            </p>
            <div className="pt-2">
              <Link
                href={`/plan/${id}`}
                className="inline-flex items-center space-x-2 text-sm font-semibold bg-white border border-slate-300 px-4 py-2 rounded-xl text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition shadow-xs"
              >
                <span>เปิดแก้ไขในระบบเดิม (5-Tabs Editor)</span>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
