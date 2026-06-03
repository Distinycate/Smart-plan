'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle, AlertTriangle, Upload, Zap, Loader2, ArrowLeft,
  BarChart2, Star, Layers, ListChecks, ClipboardCheck, Trophy,
  Sparkles, ShieldCheck, Gauge, ArrowRight, FileText, Circle,
  CheckSquare, UploadCloud, BookOpen, GraduationCap, Calendar
} from 'lucide-react';
import Link from 'next/link';
import * as mammoth from 'mammoth';
import { toast, Toaster } from 'react-hot-toast';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { motion } from 'framer-motion';

export default function EvaluatorPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);
  
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState<any[]>([]);
  const [fixingPlanId, setFixingPlanId] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState('กำลังเชื่อมต่อกับ AI...');
  
  const [activeTab, setActiveTab] = useState<'system' | 'upload'>('system');
  const [error, setError] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const flowStep = isEvaluating ? 2 : (evaluationResults.length > 0 ? 3 : 1);

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (!isEvaluating) return;

    const texts = [
      'กำลังอ่านโครงสร้างแผนการสอน...',
      'กำลังวิเคราะห์ความสอดคล้องของตัวชี้วัด...',
      'กำลังประเมินความเหมาะสมของกิจกรรม...',
      'กำลังสรุปผลและสร้างข้อเสนอแนะ...'
    ];
    let textIndex = 0;
    setLoadingText(texts[0]);

    const interval = window.setInterval(() => {
      textIndex = (textIndex + 1) % texts.length;
      setLoadingText(texts[textIndex]);
    }, 1500);

    return () => window.clearInterval(interval);
  }, [isEvaluating]);

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
    setEvaluationResults([]);
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

  const toggleSelectPlan = (planId: string) => {
    if (selectedPlanId === planId) {
      setSelectedPlanId(null);
    } else {
      setSelectedPlanId(planId);
    }
  };

  const groupedPlans = useMemo(() => {
    const groups: Record<string, Record<string, Record<string, any[]>>> = {};
    plans.forEach(plan => {
      const year = plan.academicYear ? `ปีการศึกษา ${plan.academicYear}` : 'ไม่ระบุปีการศึกษา';
      const grade = plan.gradeLevel || 'ไม่ระบุระดับชั้น';
      const subject = plan.subjectName || 'ไม่ระบุรายวิชา';

      if (!groups[year]) groups[year] = {};
      if (!groups[year][grade]) groups[year][grade] = {};
      if (!groups[year][grade][subject]) groups[year][grade][subject] = [];
      groups[year][grade][subject].push(plan);
    });
    return groups;
  }, [plans]);

  const evaluateSingle = async (payload: any) => {
    const evalRes = await fetch('/api/ai-evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const evalJson = await evalRes.json();
    if (!evalJson.success) throw new Error(evalJson.error);
    return evalJson.evaluation;
  };

  const startEvaluation = async () => {
    setIsEvaluating(true);
    setError(null);
    setEvaluationResults([]);

    try {
      if (activeTab === 'system') {
        if (!selectedPlanId) throw new Error("กรุณาเลือกแผนการสอน 1 แผน");
        
        setBatchProgress({ current: 1, total: 1 });
        const newResults = [];
        
        try {
          const res = await fetch(`/api/plans/${selectedPlanId}`);
          const json = await res.json();
          if (!json.success) throw new Error("โหลดข้อมูลแผนไม่สำเร็จ");
          const evaluation = await evaluateSingle({ planData: json.data });
          newResults.push({
            planId: selectedPlanId,
            title: json.data.lessonTopic || 'ไม่มีชื่อแผน',
            ...evaluation,
            originalPlanData: json.data
          });
          setEvaluationResults(newResults);
        } catch (e: any) {
          newResults.push({ planId: selectedPlanId, title: `พบข้อผิดพลาด: ${e.message}`, overallScore: 0, error: true });
          setEvaluationResults(newResults);
        }
      } else {
        if (!fileText) throw new Error("กรุณาอัปโหลดไฟล์ที่อ่านได้ก่อน");
        setBatchProgress({ current: 1, total: 1 });
        const evaluation = await evaluateSingle({ externalText: fileText });
        setEvaluationResults([{ planId: 'uploaded', title: 'เอกสารอัปโหลด (DOCX)', ...evaluation }]);
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการประเมิน');
    } finally {
      setIsEvaluating(false);
      setBatchProgress({ current: 0, total: 0 });
    }
  };

  const resetEvaluationFlow = () => {
    setEvaluationResults([]);
    setError(null);
    setFixingPlanId(null);
    setBatchProgress({ current: 0, total: 0 });
  };


  const startPartialFix = async (resultIndex: number, sectionKey: string, suggestion: string, identifier: string) => {
    const result = evaluationResults[resultIndex];
    if (!result || !result.originalPlanData) return;
    setFixingPlanId(`${result.planId}-partial-${identifier}`);
    setError(null);
    try {
      const res = await fetch('/api/ai-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planData: result.originalPlanData,
          isPartial: true,
          partialSection: sectionKey,
          partialSuggestion: suggestion
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`AI แก้ไขส่วน [${sectionKey}] สำเร็จ! ตรวจสอบเนื้อหาและกดบันทึกเพื่อบันทึกร่างใหม่`);
      const newResults = [...evaluationResults];
      newResults[resultIndex].originalPlanData = json.newPlanData;
      if (!newResults[resultIndex].fixedRecs) newResults[resultIndex].fixedRecs = {};
      newResults[resultIndex].fixedRecs[identifier] = true;
      // Mark as having unsaved changes
      newResults[resultIndex].hasUnsavedChanges = true;
      setEvaluationResults(newResults);
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการแก้เฉพาะจุด');
    } finally {
      setFixingPlanId(null);
    }
  };

  const saveToDraft = async (resultIndex: number) => {
    const result = evaluationResults[resultIndex];
    if (!result || !result.originalPlanData) return;
    try {
      // Generate a new ID for the draft
      const draftData = {
        ...result.originalPlanData,
        planId: `draft-${Date.now()}`,
        planStatus: 'draft',
        lessonTopic: result.originalPlanData.lessonTopic + ' (AI แก้ไข)',
      };
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success('บันทึกแผนร่าง (Draft) สำเร็จ! คุณสามารถดูได้ที่หน้าระบบหลัก');
      const newResults = [...evaluationResults];
      newResults[resultIndex].hasUnsavedChanges = false;
      setEvaluationResults(newResults);
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึกแผนร่าง');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-slate-50 px-4 py-10 font-sans text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <EvaluationFlowStepper step={flowStep} />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-6 shadow-2xl shadow-indigo-950/20 sm:p-10"
        >
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-indigo-500/20 blur-[120px]" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-500/20 blur-[120px]" />
          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <Link
                href="/"
                className="group flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-indigo-100 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-white/20"
              >
                <ArrowLeft className="h-6 w-6 transition-transform group-hover:-translate-x-1" />
              </Link>
              <div className="min-w-0">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-black text-indigo-200 backdrop-blur-md">
                  <Sparkles className="h-4 w-4" />
                  Smart Lesson plan By Kruteh
                </div>
                <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                  ประเมินและพัฒนาแผน
                </h1>
                <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-indigo-100/80">
                  อัปโหลดแผนการสอนของคุณให้ระบบช่วยประเมิน จุดเด่น จุดด้อย พร้อมข้อเสนอแนะเชิงลึก เพื่อนำไปพัฒนาต่อได้อย่างตรงจุด
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-black text-indigo-100 sm:flex-col sm:items-end">
              <span className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 backdrop-blur-md border border-white/5">
                <Layers className="h-4 w-4" />
                {plans.length} แผนในระบบ
              </span>
              <span className="flex items-center gap-2 rounded-full bg-indigo-500/20 px-4 py-2.5 text-indigo-200 backdrop-blur-md border border-indigo-400/20">
                <CheckSquare className="h-4 w-4" />
                {selectedPlanId ? 1 : 0} เลือกแล้ว
              </span>
              <span className="flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2.5 text-emerald-300 backdrop-blur-md border border-emerald-400/20">
                <FileText className="h-4 w-4" />
                {fileText ? 1 : 0} ไฟล์พร้อมตรวจ
              </span>
            </div>
          </div>
        </motion.div>

        {flowStep === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
            className="rounded-[2rem] bg-white p-5 shadow-sm sm:p-8"
          >
          <div className="mb-8 flex justify-center">
            <div className="relative inline-flex rounded-full bg-slate-100/80 p-1.5 shadow-inner backdrop-blur-sm">
              <button
                className={`relative flex items-center justify-center gap-2.5 rounded-full px-6 py-3 text-sm font-black transition-all duration-300 ${
                  activeTab === 'system'
                    ? 'bg-white text-indigo-700 shadow-md shadow-slate-200/50'
                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'
                }`}
                onClick={() => setActiveTab('system')}
              >
                <Layers className={`h-4 w-4 transition-transform duration-300 ${activeTab === 'system' ? 'scale-110' : ''}`} />
                ดึงแผนจากระบบ
              </button>
              <button
                className={`relative flex items-center justify-center gap-2.5 rounded-full px-6 py-3 text-sm font-black transition-all duration-300 ${
                  activeTab === 'upload'
                    ? 'bg-white text-indigo-700 shadow-md shadow-slate-200/50'
                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'
                }`}
                onClick={() => setActiveTab('upload')}
              >
                <Upload className={`h-4 w-4 transition-transform duration-300 ${activeTab === 'upload' ? 'scale-110' : ''}`} />
                อัปโหลดไฟล์ DOCX
              </button>
            </div>
          </div>

          <div>
            {activeTab === 'system' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between rounded-[2rem] bg-gradient-to-br from-indigo-50/50 to-blue-50/30 p-6 md:p-8">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-slate-900">เลือกจากแผนในระบบ</h2>
                      <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-500 max-w-lg">
                        เลือก 1 แผนการสอนเพื่อให้ AI ช่วยวิเคราะห์อย่างละเอียด (จัดกลุ่มตามปีการศึกษา ชั้น และวิชา)
                      </p>
                    </div>
                  </div>

                  <div className="max-h-[500px] overflow-y-auto p-2 custom-scrollbar">
                    {plans.length === 0 ? (
                      <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center transition-colors hover:bg-slate-50">
                        <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-white shadow-sm mb-4">
                          <FileText className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-black text-slate-700">ไม่มีแผนในระบบ</h3>
                        <p className="mt-2 text-sm font-medium text-slate-500 max-w-sm">คุณต้องสร้างแผนการสอนในระบบก่อน จึงจะสามารถใช้ AI ประเมินผลได้</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(groupedPlans).map(([year, grades]) => (
                          <div key={year} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                            <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-indigo-900">
                              <Calendar className="h-5 w-5 text-indigo-500" />
                              {year}
                            </h3>
                            <div className="space-y-6 pl-2">
                              {Object.entries(grades).map(([grade, subjects]) => (
                                <div key={grade} className="border-l-2 border-indigo-100 pl-4">
                                  <h4 className="mb-3 flex items-center gap-2 text-md font-bold text-slate-700">
                                    <GraduationCap className="h-4 w-4 text-emerald-500" />
                                    {grade}
                                  </h4>
                                  <div className="space-y-4">
                                    {Object.entries(subjects).map(([subject, planList]) => (
                                      <div key={subject} className="rounded-xl bg-slate-50 p-4">
                                        <h5 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-600">
                                          <BookOpen className="h-4 w-4 text-amber-500" />
                                          {subject}
                                        </h5>
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                                          {planList.map(p => {
                                            const isSelected = selectedPlanId === p.planId;
                                            return (
                                              <button
                                                key={p.planId}
                                                onClick={() => toggleSelectPlan(p.planId)}
                                                className={`group relative flex items-start gap-3 rounded-xl p-4 text-left transition-all duration-300 hover:-translate-y-1 ${
                                                  isSelected
                                                    ? 'bg-gradient-to-br from-indigo-50 to-blue-50/80 border-2 border-indigo-400 shadow-md shadow-indigo-500/10'
                                                    : 'bg-white border-2 border-slate-200 shadow-sm hover:border-indigo-300'
                                                }`}
                                              >
                                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                                  isSelected ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-transparent group-hover:bg-indigo-50'
                                                }`}>
                                                  <CheckCircle className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                  <h6 className={`truncate text-sm font-black ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                                                    {p.lessonTopic || 'ไม่มีชื่อแผน'}
                                                  </h6>
                                                  <div className="mt-1 flex items-center justify-between text-[11px] font-bold text-slate-500">
                                                    <span className="truncate">{p.subjectCode || 'ไม่มีรหัส'}</span>
                                                  </div>
                                                </div>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className={`group relative overflow-hidden rounded-[2rem] border-2 border-dashed p-10 sm:p-16 text-center transition-all duration-300 ease-out ${
                  fileText 
                    ? 'border-indigo-400 bg-indigo-50/50' 
                    : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50 hover:shadow-2xl hover:shadow-indigo-500/10'
                }`}>
                  <input
                    type="file"
                    id="file-upload"
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    accept=".docx"
                    onChange={handleFileUpload}
                  />
                  <div className="relative z-0 mx-auto flex flex-col items-center justify-center">
                    <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-[1.5rem] bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-xl shadow-purple-500/30 transition-transform duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-110">
                      <div className="absolute inset-[3px] flex items-center justify-center rounded-[1.3rem] bg-white transition-colors duration-300 group-hover:bg-indigo-50/80">
                        <UploadCloud className="h-10 w-10 text-indigo-600 transition-transform duration-500 group-hover:-translate-y-1" />
                      </div>
                      <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-black tracking-tight text-slate-900 transition-colors duration-300 group-hover:text-indigo-950">
                      ลากไฟล์มาวาง หรือ <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">คลิกเพื่ออัปโหลด</span>
                    </h3>
                    <p className="mt-3 max-w-sm text-sm font-medium text-slate-500">
                      รองรับไฟล์เอกสาร <strong className="text-indigo-600">.docx</strong> (Microsoft Word) เท่านั้น
                    </p>
                  </div>
                </div>

                <div className={`relative overflow-hidden rounded-[2rem] p-6 shadow-sm transition-all duration-500 ${
                  fileText 
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 translate-y-0 opacity-100 scale-100' 
                    : 'bg-white border border-slate-100 translate-y-2 opacity-80 scale-[0.98]'
                }`}>
                  <div className="relative z-10 flex flex-col items-center gap-5 sm:flex-row">
                    <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-inner transition-colors duration-500 ${
                      fileText ? 'bg-white/20 text-white backdrop-blur-md' : 'bg-slate-50 text-slate-400'
                    }`}>
                      {fileText ? <CheckCircle className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
                    </div>
                    <div className="text-center sm:text-left">
                      <h3 className={`text-lg font-black ${fileText ? 'text-white' : 'text-slate-900'}`}>
                        {fileText ? 'ไฟล์พร้อมสำหรับการประเมินแล้ว! ✨' : 'รอรับไฟล์แผนการสอน...'}
                      </h3>
                      <p className={`mt-1.5 text-sm font-medium leading-relaxed ${fileText ? 'text-emerald-50' : 'text-slate-500'}`}>
                        {fileText
                          ? 'ระบบอ่านเนื้อหาจากไฟล์สำเร็จ AI พร้อมวิเคราะห์คุณภาพและให้คำแนะนำแบบเจาะลึกตามเกณฑ์ วPA ทันที'
                          : 'อัปโหลดไฟล์แผนเพื่อให้ AI ช่วยวิเคราะห์อย่างละเอียดในรูปแบบเดียวกับแผนในระบบ'}
                      </p>
                    </div>
                  </div>
                  {fileText && (
                    <div className="absolute -bottom-12 -right-12 opacity-10 transition-transform duration-700 hover:scale-110 hover:rotate-12">
                      <CheckCircle className="h-48 w-48" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-rose-50 p-5 text-sm font-bold text-rose-800 shadow-sm">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                {error}
              </div>
            )}

            <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Evaluation Queue</p>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  {activeTab === 'system'
                    ? (selectedPlanId ? 'เลือกแผนแล้ว 1 ไฟล์' : 'ยังไม่ได้เลือกแผน')
                    : (fileText ? 'พร้อมตรวจ 1 ไฟล์' : 'ยังไม่ได้อัปโหลดไฟล์')}
                </p>
              </div>
              <button
                onClick={startEvaluation}
                disabled={isEvaluating || (activeTab === 'system' ? !selectedPlanId : !fileText)}
                className="relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-blue-600 px-8 py-4 text-sm font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:translate-y-0 disabled:bg-slate-200 disabled:text-slate-400 sm:w-auto"
              >
                {isEvaluating && <div className="absolute inset-0 animate-pulse bg-blue-600" />}
                <span className="relative z-10 flex items-center gap-2">
                  {isEvaluating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-blue-100" />
                      {batchProgress.total > 1 ? `กำลังประเมินแผนที่ ${batchProgress.current} จาก ${batchProgress.total}...` : 'AI กำลังวิเคราะห์...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 text-blue-100" />
                      {'เริ่มประเมินความสมบูรณ์'}
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
          </motion.div>
        )}

        {flowStep === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm sm:p-12"
          >
            <div className="relative mx-auto mb-8 h-28 w-28">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  <Sparkles className="h-8 w-8 animate-pulse" />
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-black text-slate-900">AI กำลังทำงาน...</h2>
            <p className="mt-3 min-h-6 text-sm font-bold text-slate-500">{loadingText}</p>
            {batchProgress.total > 0 && (
              <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Progress</p>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  {batchProgress.total > 1
                    ? `กำลังตรวจแผนที่ ${batchProgress.current} จาก ${batchProgress.total}`
                    : 'กำลังตรวจ 1 รายการ'}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* EVALUATION RESULTS */}
        {flowStep === 3 && evaluationResults.length > 0 && (
          <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-6">
              <div>
                <button
                  onClick={resetEvaluationFlow}
                  className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-indigo-600"
                >
                  <ArrowLeft className="h-4 w-4" />
                  ประเมินแผนอื่น
                </button>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Evaluation Completed</p>
                    <h2 className="text-2xl font-black text-slate-900">รายงานผลวิเคราะห์</h2>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-5 py-4 text-sm font-bold text-slate-600">
                ตรวจเสร็จแล้ว {evaluationResults.length} รายการ
              </div>
            </div>
            
            {evaluationResults.map((result, index) => (
              <EvaluationResultCard 
                key={`${result.planId}-${index}`} 
                result={result} 
                index={index}
                onFixPartial={(sectionKey, suggestion, identifier) => startPartialFix(index, sectionKey, suggestion, identifier)}
                onSaveDraft={() => saveToDraft(index)}
                isFixing={fixingPlanId !== null && fixingPlanId.startsWith(`${result.planId}-partial`)}
                fixingId={fixingPlanId}
              />
            ))}
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{__html:`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}}/>
    </div>
  );
}

function EvaluationFlowStepper({ step }: { step: number }) {
  const steps = [
    { label: 'เลือกแผน', icon: CheckSquare },
    { label: 'AI วิเคราะห์', icon: UploadCloud },
    { label: 'ผลประเมิน', icon: FileText }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.04, ease: 'easeOut' }}
      className="flex justify-center"
    >
      <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-[2rem] bg-white/60 p-2 shadow-sm backdrop-blur-md border border-white/40">
        {steps.map((item, itemIndex) => {
          const itemStep = itemIndex + 1;
          const Icon = item.icon;
          const isActive = step === itemStep;
          const isDone = step > itemStep;

          return (
            <div key={item.label} className="flex items-center gap-3">
              <div
                className={`flex items-center gap-3 rounded-full px-5 py-2.5 transition-all duration-500 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105'
                    : isDone
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-transparent text-slate-500 hover:bg-white/50'
                }`}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${isActive || isDone ? 'bg-white/20' : 'bg-slate-200/80'}`}>
                  {isDone ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className="text-sm font-black tracking-wide">{item.label}</span>
              </div>
              {itemIndex < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-slate-300" />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

type ScoreTone = 'green' | 'yellow' | 'red';

const evaluationSteps = [
  {
    title: 'Structural Check',
    description: 'ตรวจโครงสร้างหัวข้อและความครบถ้วนของแผน',
    icon: ClipboardCheck
  },
  {
    title: 'Content Analysis',
    description: 'วิเคราะห์มาตรฐาน จุดประสงค์ กิจกรรม และการวัดผล',
    icon: Gauge
  },
  {
    title: 'Final Review',
    description: 'สรุปคะแนน จุดแข็ง และข้อเสนอแนะจาก AI',
    icon: ShieldCheck
  }
];

const fallbackChecklist = [
  {
    topic: 'ความสอดคล้องกับมาตรฐาน/ตัวชี้วัด',
    score: 18,
    maxScore: 20,
    feedback: 'แผนระบุมาตรฐานและตัวชี้วัดชัดเจน เชื่อมโยงกับจุดประสงค์ K/P/A ได้ดี'
  },
  {
    topic: 'การจัดกิจกรรมแบบ Active Learning / PBL',
    score: 15,
    maxScore: 20,
    feedback: 'กิจกรรมมีลำดับขั้นชัดเจน แต่ควรเพิ่มภาระงานที่เปิดโอกาสให้ผู้เรียนลงมือแก้ปัญหาจริงมากขึ้น'
  },
  {
    topic: 'การใช้คำถามกระตุ้นความคิด',
    score: 13,
    maxScore: 20,
    feedback: 'มีคำถามนำเข้าสู่บทเรียนแล้ว แต่ยังควรเพิ่มคำถามปลายเปิดและคำถามสะท้อนคิดท้ายกิจกรรม'
  },
  {
    topic: 'ความหลากหลายของเครื่องมือวัดผล',
    score: 16,
    maxScore: 20,
    feedback: 'มีทั้งใบงาน แบบสังเกต และ Rubric แต่ควรระบุเกณฑ์คะแนนให้ชัดในแต่ละระดับ'
  },
  {
    topic: 'ความเหมาะสมของเวลาเรียน',
    score: 17,
    maxScore: 20,
    feedback: 'เวลาโดยรวมเหมาะสมกับกิจกรรมหลัก ควรเผื่อช่วงสะท้อนผลและสรุปองค์ความรู้เล็กน้อย'
  }
];

const fallbackPros = [
  'จุดประสงค์การเรียนรู้แบ่ง K/P/A ชัดเจนและสัมพันธ์กับหัวข้อบทเรียน',
  'กิจกรรมมีแนวทาง Active Learning และเปิดพื้นที่ให้ผู้เรียนมีส่วนร่วม',
  'เครื่องมือประเมินหลากหลาย ทั้งใบงาน แบบสังเกต และ Rubric'
];

const fallbackCons = [
  'ควรเพิ่มคำถามปลายเปิดเพื่อกระตุ้นการคิดวิเคราะห์ของผู้เรียน',
  'เกณฑ์ Rubric บางส่วนยังควรระบุพฤติกรรมที่สังเกตได้ให้ชัดขึ้น'
];

const fallbackRecommendations = [
  {
    section: 'กิจกรรมการเรียนรู้',
    suggestion: 'เพิ่มขั้น PBL สั้น ๆ ให้ผู้เรียนวิเคราะห์สถานการณ์จริง แล้วนำเสนอวิธีแก้ปัญหาเป็นภาษาอังกฤษ'
  },
  {
    section: 'การวัดและประเมินผล',
    suggestion: 'แยกเกณฑ์ประเมิน K/P/A ให้สัมพันธ์กับจุดประสงค์แต่ละด้าน และกำหนดระดับคุณภาพที่ตรวจได้จริง'
  }
];

const getScoreTone = (percentage: number): ScoreTone => {
  if (percentage < 60) return 'red';
  if (percentage < 80) return 'yellow';
  return 'green';
};

const toneStyles: Record<ScoreTone, any> = {
  green: {
    label: 'ผ่านเกณฑ์ดี',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    fill: '#10b981',
    gradient: 'from-emerald-500 to-teal-500'
  },
  yellow: {
    label: 'ควรปรับปรุงบางจุด',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    fill: '#f59e0b',
    gradient: 'from-amber-400 to-orange-500'
  },
  red: {
    label: 'ต้องทบทวนเพิ่มเติม',
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    fill: '#ef4444',
    gradient: 'from-rose-500 to-red-500'
  }
};

const percentOf = (score: number, maxScore: number) => {
  if (!maxScore) return 0;
  return Math.max(0, Math.min(100, Math.round((score / maxScore) * 100)));
};

const normalizeChecklist = (result: any) => {
  const checklist = Array.isArray(result.checklist) && result.checklist.length > 0
    ? result.checklist
    : fallbackChecklist;

  return checklist.map((item: any) => ({
    topic: item.topic || 'หัวข้อการประเมิน',
    score: Number(item.score || 0),
    maxScore: Number(item.maxScore || 20),
    feedback: item.feedback || 'ยังไม่มีรายละเอียด feedback จาก AI'
  }));
};

const buildRadarData = (checklist: any[], overallPercentage: number) => {
  const findScore = (keywords: string[], fallbackOffset = 0) => {
    const matched = checklist.find(item =>
      keywords.some(keyword => String(item.topic || '').toLowerCase().includes(keyword.toLowerCase()))
    );
    if (matched) return percentOf(matched.score, matched.maxScore);
    return Math.max(45, Math.min(96, Math.round(overallPercentage + fallbackOffset)));
  };

  return [
    { subject: 'เนื้อหา', value: findScore(['มาตรฐาน', 'ตัวชี้วัด', 'เนื้อหา'], 3), fullMark: 100 },
    { subject: 'กิจกรรม', value: findScore(['กิจกรรม', 'active', 'pbl'], -2), fullMark: 100 },
    { subject: 'การวัดผล', value: findScore(['วัด', 'ประเมิน', 'เครื่องมือ', 'rubric'], -4), fullMark: 100 },
    { subject: 'เวลาเรียน', value: findScore(['เวลา', 'timing'], 1), fullMark: 100 }
  ];
};

const getTrafficLightData = (result: any, checklist: any[]) => {
  const pros = Array.isArray(result.pros) && result.pros.length > 0 ? result.pros : fallbackPros;
  const cons = Array.isArray(result.cons) && result.cons.length > 0 ? result.cons : fallbackCons;

  const passed = checklist
    .filter(item => percentOf(item.score, item.maxScore) >= 80)
    .map(item => `${item.topic}: ${item.feedback}`);

  const needsWork = checklist
    .filter(item => {
      const pct = percentOf(item.score, item.maxScore);
      return pct >= 60 && pct < 80;
    })
    .map(item => `${item.topic}: ${item.feedback}`);

  const risks = checklist
    .filter(item => percentOf(item.score, item.maxScore) < 60)
    .map(item => `${item.topic}: ${item.feedback}`);

  return {
    passed: [...pros, ...passed].slice(0, 5),
    needsWork: [...cons, ...needsWork].slice(0, 5),
    risks: risks.slice(0, 4)
  };
};

const cardMotion: any = {
  hidden: { opacity: 0, y: 22 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: (Number(index) || 0) * 0.08, ease: 'easeOut' }
  })
};

function TrafficLightCard({
  tone,
  title,
  description,
  icon: Icon,
  items
}: {
  tone: 'green' | 'yellow' | 'red';
  title: string;
  description: string;
  icon: any;
  items: string[];
}) {
  const styles = {
    green: {
      card: 'bg-gradient-to-br from-emerald-50/80 to-teal-50/50 hover:shadow-emerald-500/10 hover:border-emerald-200/50 border border-transparent',
      icon: 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-500/20',
      text: 'text-emerald-950',
      bullet: 'text-emerald-500'
    },
    yellow: {
      card: 'bg-gradient-to-br from-amber-50/80 to-orange-50/50 hover:shadow-amber-500/10 hover:border-amber-200/50 border border-transparent',
      icon: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/20',
      text: 'text-amber-950',
      bullet: 'text-amber-500'
    },
    red: {
      card: 'bg-gradient-to-br from-rose-50/80 to-red-50/50 hover:shadow-rose-500/10 hover:border-rose-200/50 border border-transparent',
      icon: 'bg-gradient-to-br from-rose-400 to-red-500 text-white shadow-md shadow-rose-500/20',
      text: 'text-rose-950',
      bullet: 'text-rose-500'
    }
  }[tone];

  return (
    <motion.div variants={cardMotion} className={`group relative rounded-[2rem] p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 ${styles.card}`}>
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.25rem] transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110 ${styles.icon}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h4 className={`text-lg font-black ${styles.text}`}>{title}</h4>
          <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {items.length > 0 ? items.map((item, itemIndex) => (
          <div key={itemIndex} className="flex gap-3 rounded-2xl bg-white/80 p-4 text-sm font-medium leading-7 text-slate-700 shadow-sm transition-colors hover:bg-white">
            <CheckCircle className={`mt-1 h-4 w-4 shrink-0 ${styles.bullet}`} />
            <span>{item}</span>
          </div>
        )) : (
          <div className="rounded-2xl bg-white/70 p-4 text-sm font-medium text-slate-500 shadow-sm">
            ยังไม่มีรายการในหมวดนี้
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── COMPONENT: EvaluationResultCard (Plan Evaluation Result Page) ──
function EvaluationResultCard({ result, index, onFixPartial, onSaveDraft, isFixing, fixingId }: { result: any, index: number, onFixPartial: (sectionKey: string, suggestion: string, identifier: string) => void, onSaveDraft: () => void, isFixing: boolean, fixingId: string | null }) {
  if (result.error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl bg-white shadow-sm"
      >
        <div className="flex flex-col gap-4 bg-rose-50 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-500 shadow-sm">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">{result.title}</h3>
          </div>
          <span className="rounded-xl bg-rose-100 px-4 py-2 text-sm font-bold text-rose-700">วิเคราะห์ไม่สำเร็จ</span>
        </div>
      </motion.div>
    );
  }

  const score = result.overallScore || 0;
  const maxScore = result.maxScore || 100;
  const percentage = percentOf(score, maxScore);
  const tone = getScoreTone(percentage);
  const toneStyle = toneStyles[tone];
  const summary = result.summary || 'AI วิเคราะห์แผนการจัดการเรียนรู้และจัดกลุ่มข้อเสนอแนะ 4 ส่วน พร้อมเกณฑ์วิทยฐานะ (PA)';
  const parts = Array.isArray(result.parts) ? result.parts : [];
  const paAssessment = result.paAssessment || { indicators: [], overallRecommendation: '', canFix: false };

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.18 }}
      custom={index}
      variants={cardMotion}
      className="relative overflow-hidden rounded-2xl bg-white shadow-sm"
    >
      <div className="relative space-y-6 p-4 sm:p-6 md:p-8">
        {result.hasUnsavedChanges && (
          <div className="mb-2 flex items-center justify-between rounded-xl bg-amber-50 p-4 border border-amber-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">มีข้อมูลร่างที่รอการบันทึก</h4>
                <p className="text-xs text-amber-700">AI ได้แก้ไขแผนของคุณแล้ว กรุณากดบันทึกเพื่อเก็บเป็นร่างใหม่</p>
              </div>
            </div>
            <button
              onClick={onSaveDraft}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-600"
            >
              <CheckSquare className="h-4 w-4" />
              บันทึกเป็นแบบร่าง
            </button>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-50 to-indigo-50/50 p-6 shadow-sm md:p-8">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-400/10 blur-3xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.25rem] bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30">
                <ClipboardCheck className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Plan Evaluation Result
                </div>
                <h3 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                  ผลการตรวจแผนการจัดการเรียนรู้
                </h3>
                <p className="mt-2 text-lg font-bold text-slate-700 line-clamp-2">{result.title}</p>
                <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-500">{summary}</p>
              </div>
            </div>
          </div>

          <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            className="group relative overflow-hidden rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/50 transition-shadow duration-300 hover:shadow-indigo-500/20"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Total Score</p>
                <p className={`mt-1 text-sm font-bold ${toneStyle.text}`}>{toneStyle.label}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${toneStyle.gradient} text-white shadow-lg`}>
                <Trophy className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-6xl font-black tracking-tight text-slate-900">{score}</span>
              <span className="pb-2 text-xl font-black text-slate-400">/{maxScore}</span>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className={`h-full rounded-full bg-gradient-to-r ${toneStyle.gradient}`}
              />
            </div>
            {/* Rule-based & AI Score Breakdown */}
            {(result.data.ruleBasedScore !== undefined && result.data.originalAiScore !== undefined) && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-500 shadow-inner">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">Rule-based</span>
                  <span className="text-sm text-slate-700">{result.data.ruleBasedScore} <span className="text-slate-400">/ 70</span></span>
                </div>
                <div className="text-slate-300">+</div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">AI Logic</span>
                  <span className="text-sm text-slate-700">{Math.round(result.data.originalAiScore * 0.3)} <span className="text-slate-400">/ 30</span></span>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {parts.map((part: any, pIndex: number) => {
            const isRecFixed = result.fixedRecs?.[`part-${pIndex}`];
            const isThisFixing = fixingId === `${result.planId}-partial-part-${pIndex}`;
            return (
              <motion.div variants={cardMotion} custom={pIndex + 1} key={pIndex} className="group overflow-hidden rounded-[2rem] bg-white shadow-lg shadow-slate-200/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-500/10">
                <div className="flex flex-col h-full p-6 md:p-7">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h4 className="flex items-center gap-2 text-lg font-black text-slate-800">
                        <ListChecks className="h-5 w-5 text-indigo-500" />
                        {part.partName}
                      </h4>
                      <p className="mt-1 text-sm font-medium text-slate-500">คะแนน: {part.score}/{part.maxScore}</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    {part.pros && part.pros.length > 0 && (
                      <div className="rounded-2xl bg-emerald-50/80 p-4">
                        <p className="mb-2 text-xs font-black uppercase text-emerald-600">สิ่งที่ทำได้ดี</p>
                        <ul className="space-y-2">
                          {part.pros.map((pro: string, i: number) => (
                            <li key={i} className="flex gap-2 text-sm font-medium text-emerald-900">
                              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {part.cons && part.cons.length > 0 && (
                      <div className="rounded-2xl bg-rose-50/80 p-4">
                        <p className="mb-2 text-xs font-black uppercase text-rose-600">ข้อควรปรับปรุง</p>
                        <ul className="space-y-2">
                          {part.cons.map((con: string, i: number) => (
                            <li key={i} className="flex gap-2 text-sm font-medium text-rose-900">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                              <span>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {part.recommendation && (
                      <div className="rounded-2xl bg-indigo-50/80 p-4">
                        <p className="mb-2 text-xs font-black uppercase text-indigo-600">คำแนะนำ</p>
                        <p className="text-sm font-medium leading-6 text-indigo-900">{part.recommendation}</p>
                      </div>
                    )}
                  </div>
                  
                  {part.canFix && result.planId !== 'uploaded' && !result.isFixed && (
                    <div className="mt-6">
                      <button
                        onClick={() => onFixPartial(part.sectionKey, part.recommendation, `part-${pIndex}`)}
                        disabled={isThisFixing || isRecFixed}
                        className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition-all ${
                          isRecFixed
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400'
                        }`}
                      >
                        {isThisFixing ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> กำลังแก้...</>
                        ) : isRecFixed ? (
                          <><CheckCircle className="h-4 w-4" /> AI แก้ไขส่วนนี้แล้ว</>
                        ) : (
                          <><Sparkles className="h-4 w-4" /> ให้ AI ปรับปรุงส่วนนี้</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {paAssessment && paAssessment.indicators && paAssessment.indicators.length > 0 && (
          <motion.div variants={cardMotion} custom={5} className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-2xl shadow-indigo-950/30 md:p-10">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black text-amber-300 backdrop-blur border border-white/10">
                  <Star className="h-4 w-4" />
                  Performance Agreement (PA)
                </div>
                <h4 className="text-2xl font-black md:text-3xl">การวิเคราะห์ความสอดคล้องเกณฑ์วิทยฐานะ</h4>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-300 max-w-2xl">
                  ประเมินตามเกณฑ์ ว9/2564 ด้านการจัดการเรียนรู้ (8 ตัวชี้วัด) เพื่อให้แผนนี้ตอบโจทย์สำหรับการเลื่อนวิทยฐานะ
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {paAssessment.indicators.map((indicator: any, i: number) => {
                const isPassed = indicator.status === 'passed';
                return (
                  <div key={i} className={`rounded-2xl p-5 backdrop-blur border ${
                    isPassed ? 'bg-emerald-900/20 border-emerald-500/20' : 'bg-rose-900/20 border-rose-500/20'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        isPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {isPassed ? <CheckCircle className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                      </div>
                      <div>
                        <h5 className={`text-sm font-bold ${isPassed ? 'text-emerald-100' : 'text-rose-100'}`}>
                          ตัวชี้วัดที่ {indicator.id}: {indicator.title}
                        </h5>
                        {indicator.evidence && (
                          <p className={`mt-2 text-xs leading-5 ${isPassed ? 'text-emerald-300' : 'text-rose-300'}`}>
                            <strong>ข้อมูลอ้างอิง:</strong> {indicator.evidence}
                          </p>
                        )}
                        {!isPassed && indicator.recommendation && (
                          <p className="mt-2 text-xs font-medium leading-5 text-rose-200">
                            <strong>คำแนะนำ:</strong> {indicator.recommendation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {paAssessment.overallRecommendation && (
              <div className="mt-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 p-6 backdrop-blur">
                <h5 className="flex items-center gap-2 font-bold text-indigo-300 mb-2">
                  <Sparkles className="h-5 w-5" /> ข้อเสนอแนะภาพรวมเพื่อการเลื่อนวิทยฐานะ
                </h5>
                <p className="text-sm font-medium leading-7 text-slate-300">
                  {paAssessment.overallRecommendation}
                </p>
              </div>
            )}
            
            {paAssessment.canFix && result.planId !== 'uploaded' && !result.isFixed && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => onFixPartial('paAssessment', paAssessment.overallRecommendation || 'ปรับปรุงให้สอดคล้องกับ 8 ตัวชี้วัด PA', 'paAssessment')}
                  disabled={isFixing}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-900 shadow-md transition-all hover:-translate-y-0.5 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500"
                >
                  {fixingId === `${result.planId}-partial-paAssessment` ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> กำลังปรับปรุงแผนตาม PA...</>
                  ) : result.fixedRecs?.['paAssessment'] ? (
                    <><CheckCircle className="h-4 w-4" /> ปรับปรุงแผนตาม PA แล้ว</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> ให้ AI ปรับปรุงแผนให้สอดคล้องกับ PA ทั้ง 8 ตัวชี้วัด</>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.section>
  );
}
