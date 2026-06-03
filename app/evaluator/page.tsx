'use client';

import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, AlertTriangle, Upload, Zap, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import * as mammoth from 'mammoth';

export default function EvaluatorPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);
  
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [isFixing, setIsFixing] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'system' | 'upload'>('system');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans');
      const json = await res.json();
      if (json.success) {
        setPlans(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch plans', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError(null);
    setEvaluationResult(null);
    setFileText(null);

    try {
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setFileText(result.value);
      } else {
        setError('รองรับเฉพาะไฟล์ .docx ในตอนนี้ครับ');
      }
    } catch (err: any) {
      setError('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + err.message);
    }
  };

  const startEvaluation = async () => {
    setIsEvaluating(true);
    setError(null);
    setEvaluationResult(null);

    try {
      let payload: any = {};
      
      if (activeTab === 'system') {
        if (!selectedPlanId) throw new Error("กรุณาเลือกแผนการสอนก่อน");
        // Fetch full plan data
        const res = await fetch(`/api/plans/${selectedPlanId}`);
        const json = await res.json();
        if (!json.success) throw new Error("โหลดข้อมูลแผนไม่สำเร็จ");
        payload.planData = json.data;
      } else {
        if (!fileText) throw new Error("กรุณาอัปโหลดไฟล์ที่อ่านได้ก่อน");
        payload.externalText = fileText;
      }

      const evalRes = await fetch('/api/ai-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const evalJson = await evalRes.json();
      if (!evalJson.success) throw new Error(evalJson.error);
      
      setEvaluationResult({ ...evalJson.evaluation, originalPlanData: payload.planData });

    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการประเมิน');
    } finally {
      setIsEvaluating(false);
    }
  };

  const startAutoFix = async () => {
    if (!evaluationResult || !evaluationResult.originalPlanData) return;
    
    setIsFixing(true);
    setError(null);
    
    try {
      const res = await fetch('/api/ai-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planData: evaluationResult.originalPlanData,
          feedback: evaluationResult
        })
      });
      
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      alert('ปรับปรุงแผนสำเร็จ! ระบบได้สร้างแผนฉบับใหม่แล้ว');
      window.location.href = '/';
      
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการ Auto-Fix');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
              <Zap className="w-8 h-8 text-indigo-500" /> 
              AI ระบบตรวจแผนอัจฉริยะ
            </h1>
            <p className="text-slate-500 mt-1">ประเมินและวิเคราะห์แผนการจัดการเรียนรู้ตามมาตรฐาน พร้อมข้อเสนอแนะ</p>
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button 
              className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === 'system' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-50'}`}
              onClick={() => setActiveTab('system')}
            >
              ดึงแผนจากระบบ
            </button>
            <button 
              className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === 'upload' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-50'}`}
              onClick={() => setActiveTab('upload')}
            >
              อัปโหลดไฟล์ (DOCX)
            </button>
          </div>
          
          <div className="p-6">
            {activeTab === 'system' && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">เลือกแผนที่ต้องการตรวจ</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2">
                  {plans.length === 0 ? (
                    <p className="text-slate-500 text-sm">ไม่พบแผนในระบบ</p>
                  ) : (
                    plans.map(p => (
                      <div 
                        key={p.planId} 
                        onClick={() => setSelectedPlanId(p.planId)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedPlanId === p.planId ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300'}`}
                      >
                        <h3 className="font-medium text-slate-800 line-clamp-1">{p.lessonTopic}</h3>
                        <p className="text-xs text-slate-500 mt-1">{p.subjectName} ({p.gradeLevel})</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 transition-colors">
                  <input type="file" id="file-upload" className="hidden" accept=".docx" onChange={handleFileUpload} />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center">
                    <Upload className="w-10 h-10 text-slate-400 mb-3" />
                    <span className="text-sm font-medium text-indigo-600">คลิกเพื่ออัปโหลดไฟล์</span>
                    <span className="text-xs text-slate-500 mt-1">รองรับไฟล์ .docx เท่านั้น</span>
                  </label>
                </div>
                {fileText && <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> อ่านไฟล์สำเร็จแล้ว พร้อมประเมิน</p>}
              </div>
            )}

            {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-start gap-2"><AlertTriangle className="w-5 h-5 shrink-0"/> {error}</div>}

            <div className="mt-6 flex justify-end">
              <button 
                onClick={startEvaluation}
                disabled={isEvaluating || (activeTab === 'system' ? !selectedPlanId : !fileText)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg font-medium shadow-sm transition-all flex items-center gap-2"
              >
                {isEvaluating ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังประเคราะห์...</> : <><Zap className="w-5 h-5"/> เริ่มการประเมิน</>}
              </button>
            </div>
          </div>
        </div>

        {/* Evaluation Results */}
        {evaluationResult && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Score Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row items-center gap-8">
              <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className={`${evaluationResult.overallScore >= 80 ? 'text-green-500' : evaluationResult.overallScore >= 60 ? 'text-yellow-500' : 'text-red-500'}`} strokeDasharray={`${evaluationResult.overallScore}, 100`} strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute text-3xl font-bold text-slate-800">{evaluationResult.overallScore}</div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">ผลการประเมิน</h2>
                <p className="text-slate-600 leading-relaxed">{evaluationResult.summary}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-green-700 flex items-center gap-2 mb-4"><CheckCircle className="w-5 h-5"/> ข้อดี (Pros)</h3>
                <ul className="space-y-2">
                  {evaluationResult.pros?.map((p: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-green-500">•</span> {p}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-red-700 flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5"/> ข้อควรปรับปรุง (Cons)</h3>
                <ul className="space-y-2">
                  {evaluationResult.cons?.map((p: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-red-500">•</span> {p}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Checklist */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 mb-6">รายละเอียดการให้คะแนน (Checklist)</h3>
              <div className="space-y-4">
                {evaluationResult.checklist?.map((item: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-slate-800">{item.topic}</h4>
                      <span className="px-2.5 py-1 bg-white border rounded-lg text-sm font-medium text-slate-700 shadow-sm">{item.score} / {item.maxScore}</span>
                    </div>
                    <p className="text-sm text-slate-600">{item.feedback}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Auto Fix Actions */}
            {activeTab === 'system' && evaluationResult.autoFixAvailable && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-indigo-900">AI Auto-Fix พร้อมใช้งาน</h3>
                  <p className="text-sm text-indigo-700 mt-1">ให้ AI ปรับปรุงแผนของคุณตามข้อเสนอแนะโดยอัตโนมัติ และบันทึกเป็นแผนฉบับใหม่</p>
                </div>
                <button 
                  onClick={startAutoFix}
                  disabled={isFixing}
                  className="shrink-0 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium shadow-sm transition-all flex items-center gap-2"
                >
                  {isFixing ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังแก้ไข...</> : <><Zap className="w-5 h-5" /> เริ่มแก้ไขอัตโนมัติ</>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
