'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Sparkles, 
  Save, 
  HelpCircle, 
  AlertCircle, 
  Check, 
  Clock, 
  FileText, 
  BookOpen, 
  Target, 
  Layers, 
  CheckSquare, 
  Package, 
  Printer 
} from 'lucide-react';

const STEPS = [
  { id: 1, name: 'Setup', label: '1. ข้อมูลวิชา & คาบ', icon: BookOpen },
  { id: 2, name: 'Goals', label: '2. เป้าหมายการเรียนรู้', icon: Target },
  { id: 3, name: 'Design', label: '3. แผนกิจกรรม 60 นาที', icon: Layers },
  { id: 4, name: 'Assessment', label: '4. การวัดและประเมินผล', icon: CheckSquare },
  { id: 5, name: 'Package', label: '5. ชุดสื่อและใบงาน', icon: Package },
  { id: 6, name: 'Review', label: '6. ตรวจสอบคุณภาพ วPA', icon: Check },
  { id: 7, name: 'Documents', label: '7. เอกสารและพิมพ์', icon: Printer },
];

export default function V3NewPlanPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(60);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            href="/plan/v3" 
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            title="ย้อนกลับไป V3 Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Smart Plan V3
              </span>
              <h1 className="text-base font-bold text-slate-900">สร้างแผนการจัดการเรียนรู้ใหม่ (PA-Ready)</h1>
            </div>
            <p className="text-xs text-slate-500">สถานะ: <span className="text-amber-600 font-medium">ร่างแรก (DRAFT)</span> • บันทึกอัตโนมัติ</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/plan/new"
            className="text-xs text-slate-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition"
          >
            เปิดหน้าสร้างแผนแบบเดิม (Legacy 5-Tabs)
          </Link>
          <button 
            type="button" 
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition"
          >
            <Save className="w-4 h-4" />
            <span>บันทึกร่าง</span>
          </button>
        </div>
      </header>

      {/* Stepper Navigation */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between overflow-x-auto py-1">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isDone = currentStep > step.id;

            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs' 
                    : isDone
                    ? 'text-slate-600 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  isActive 
                    ? 'bg-indigo-600 text-white' 
                    : isDone 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {isDone ? <Check className="w-3 h-3" /> : step.id}
                </div>
                <span>{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Form Step Container */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                <span>ขั้นตอนที่ 1: กำหนดข้อมูลพื้นฐาน (Setup)</span>
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                กำหนดกลุ่มสาระการเรียนรู้, ระดับชั้น, วิชา, หน่วยการเรียนรู้, และกรอบเวลาสอน 60 นาที
              </p>
            </div>
            <div className="flex items-center space-x-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <Clock className="w-4 h-4" />
              <span>ความยาวคาบสอน: {durationMinutes} นาที</span>
            </div>
          </div>

          {/* Form Fields Preview / Foundation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                กลุ่มสาระการเรียนรู้ <span className="text-rose-500">*</span>
              </label>
              <select className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition">
                <option value="FOREIGN_LANGUAGE">ภาษาต่างประเทศ (ภาษาอังกฤษ)</option>
                <option value="THAI">ภาษาไทย</option>
                <option value="MATHEMATICS">คณิตศาสตร์</option>
                <option value="SCIENCE">วิทยาศาสตร์และเทคโนโลยี</option>
                <option value="SOCIAL_STUDIES">สังคมศึกษา ศาสนา และวัฒนธรรม</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                ระดับชั้น <span className="text-rose-500">*</span>
              </label>
              <select className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition">
                <option value="ม.1">มัธยมศึกษาปีที่ 1</option>
                <option value="ม.2">มัธยมศึกษาปีที่ 2</option>
                <option value="ม.3">มัธยมศึกษาปีที่ 3</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                รหัสและชื่อวิชา <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                defaultValue="อ21101 ภาษาอังกฤษ 1" 
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                เวลาที่ใช้ในการสอน (นาที) <span className="text-rose-500">*</span>
              </label>
              <input 
                type="number" 
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
              <span className="text-[11px] text-slate-500">ค่าเริ่มต้น 60 นาที (ปรับเปลี่ยนได้ตามโครงสร้างรายวิชา)</span>
            </div>
          </div>

          {/* Callout box for Wave 3.0 */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-3 text-amber-800 text-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold">Smart Plan V3 Foundation (Wave 3.0 Active)</strong>
              <p>
                หน้านี้เป็น UI Shell สำหรับขั้นตอนการทำแผน 7 Steps ของ Smart Plan V3 
                โดยฟังก์ชันเชิงลึกจะถูกปลดล็อคตามลำดับ Wave (3.1 Domain Model, 3.2 Subject Profile, 3.3 Setup & Learning Goals) 
                เพื่อรับประกันความเสถียร 100% และไม่กระทบการทำงานเดิม
              </p>
            </div>
          </div>

          {/* Stepper Footer Action */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ย้อนกลับ
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.min(STEPS.length, prev + 1))}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-sm transition"
            >
              ถัดไป: {STEPS[Math.min(STEPS.length - 1, currentStep)]?.name}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
