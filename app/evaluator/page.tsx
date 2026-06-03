'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, AlertTriangle, Upload, Zap, Loader2, ArrowLeft,
  BarChart2, Star, Layers, ListChecks, ClipboardCheck, Trophy,
  Sparkles, ShieldCheck, Gauge, ArrowRight, FileText, Circle,
  CheckSquare, UploadCloud, BookOpen, GraduationCap
} from 'lucide-react';
import Link from 'next/link';
import * as mammoth from 'mammoth';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { motion } from 'framer-motion';

export default function EvaluatorPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set());
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
    const newSet = new Set(selectedPlanIds);
    if (newSet.has(planId)) newSet.delete(planId);
    else newSet.add(planId);
    setSelectedPlanIds(newSet);
  };
  
  const selectAll = () => {
    if (selectedPlanIds.size === plans.length) setSelectedPlanIds(new Set());
    else setSelectedPlanIds(new Set(plans.map(p => p.planId)));
  };

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
        if (selectedPlanIds.size === 0) throw new Error("กรุณาเลือกแผนการสอนอย่างน้อย 1 แผน");
        
        const planIdsToEvaluate = Array.from(selectedPlanIds);
        setBatchProgress({ current: 0, total: planIdsToEvaluate.length });
        const newResults = [];
        
        for (let i = 0; i < planIdsToEvaluate.length; i++) {
          const planId = planIdsToEvaluate[i];
          setBatchProgress({ current: i + 1, total: planIdsToEvaluate.length });
          try {
            const res = await fetch(`/api/plans/${planId}`);
            const json = await res.json();
            if (!json.success) throw new Error("โหลดข้อมูลแผนไม่สำเร็จ");
            const evaluation = await evaluateSingle({ planData: json.data });
            newResults.push({
              planId,
              title: json.data.lessonTopic || `แผนที่ ${i+1}`,
              ...evaluation,
              originalPlanData: json.data
            });
            setEvaluationResults([...newResults]);
          } catch (e: any) {
            newResults.push({ planId, title: `พบข้อผิดพลาด: ${e.message}`, overallScore: 0, error: true });
            setEvaluationResults([...newResults]);
          }
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



  const startPartialFix = async (resultIndex: number, recIndex: number) => {
    const result = evaluationResults[resultIndex];
    if (!result || !result.originalPlanData) return;
    const rec = result.recommendations[recIndex];
    setFixingPlanId(`${result.planId}-partial-${recIndex}`);
    setError(null);
    try {
      const res = await fetch('/api/ai-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planData: result.originalPlanData,
          isPartial: true,
          partialSection: rec.section,
          partialSuggestion: rec.suggestion
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      alert(`แก้ไขจุดที่ ${recIndex + 1} สำเร็จ! ระบบอัปเดตข้อมูลแผนให้แล้ว`);
      const newResults = [...evaluationResults];
      newResults[resultIndex].originalPlanData = json.newPlanData;
      if (!newResults[resultIndex].fixedRecs) newResults[resultIndex].fixedRecs = {};
      newResults[resultIndex].fixedRecs[recIndex] = true;
      setEvaluationResults(newResults);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการแก้เฉพาะจุด');
    } finally {
      setFixingPlanId(null);
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
                  Powered by Gemini 2.5 Flash
                </div>
                <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                  AI ตรวจแผนอัจฉริยะ
                </h1>
                <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-indigo-100/80">
                  เลือกแผนการสอนจากระบบหรืออัปโหลดไฟล์ DOCX เพื่อให้ AI วิเคราะห์ให้คะแนน จุดแข็ง จุดที่ควรปรับ และข้อเสนอแนะเชิงลึกที่นำไปใช้ได้ทันที
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
                {selectedPlanIds.size} เลือกแล้ว
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
                        เลือกได้หลายแผน AI จะช่วยประเมินแผนทั้งหมดที่คุณเลือกและสรุปผลให้เป็นแดชบอร์ดอย่างละเอียด
                      </p>
                    </div>
                    <button
                      onClick={selectAll}
                      disabled={plans.length === 0}
                      className="inline-flex items-center justify-center rounded-[1.25rem] bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/30 transition-all duration-300 hover:-translate-y-1 hover:bg-indigo-700 hover:shadow-indigo-600/40 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                    >
                      {selectedPlanIds.size === plans.length && plans.length > 0 ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-h-[500px] overflow-y-auto p-2 custom-scrollbar">
                    {plans.length === 0 ? (
                      <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center transition-colors hover:bg-slate-50">
                        <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-white shadow-sm mb-4">
                          <FileText className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-black text-slate-700">ไม่มีแผนในระบบ</h3>
                        <p className="mt-2 text-sm font-medium text-slate-500 max-w-sm">คุณต้องสร้างแผนการสอนในระบบก่อน จึงจะสามารถใช้ AI ประเมินผลได้</p>
                      </div>
                    ) : (
                      <>
                        {plans.map(p => {
                          const isSelected = selectedPlanIds.has(p.planId);
                          return (
                            <button
                              key={p.planId}
                              onClick={() => toggleSelectPlan(p.planId)}
                              className={`group relative flex flex-col items-start gap-4 rounded-[1.5rem] p-5 text-left transition-all duration-300 hover:-translate-y-1 ${
                                isSelected
                                  ? 'bg-gradient-to-br from-indigo-50 to-blue-50/80 border-2 border-indigo-400 shadow-lg shadow-indigo-500/10'
                                  : 'bg-white border-2 border-slate-100 shadow-sm hover:border-indigo-300 hover:shadow-md'
                              }`}
                            >
                              <div className="flex w-full items-start justify-between">
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] transition-all duration-300 ${
                                  isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-110' : 'bg-slate-100 text-transparent group-hover:bg-indigo-50 group-hover:text-indigo-200'
                                }`}>
                                  <CheckCircle className="h-5 w-5" />
                                </div>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                                  {p.subjectCode || 'ไม่มีรหัส'}
                                </span>
                              </div>
                              <div className="min-w-0 w-full mt-2">
                                <h3 className={`truncate text-lg font-black transition-colors ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>
                                  {p.lessonTopic || 'ไม่มีชื่อแผน'}
                                </h3>
                                <div className="mt-3 flex flex-col gap-2">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                    <BookOpen className="h-4 w-4 text-indigo-400" />
                                    <span className="truncate">{p.subjectName || 'ไม่ระบุวิชา'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                    <GraduationCap className="h-4 w-4 text-emerald-400" />
                                    <span>{p.gradeLevel || 'ไม่ระบุระดับชั้น'}</span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </>
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
                    ? `เลือกอยู่ ${selectedPlanIds.size} แผนการสอน`
                    : (fileText ? 'พร้อมตรวจ 1 ไฟล์' : 'ยังไม่ได้อัปโหลดไฟล์')}
                </p>
              </div>
              <button
                onClick={startEvaluation}
                disabled={isEvaluating || (activeTab === 'system' ? selectedPlanIds.size === 0 : !fileText)}
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
                      {selectedPlanIds.size > 1 ? `เริ่มประเมินทั้งหมด (${selectedPlanIds.size})` : 'เริ่มประเมินความสมบูรณ์'}
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
                onFixPartial={(recIndex) => startPartialFix(index, recIndex)}
                isFixing={fixingPlanId === result.planId}
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

// ── COMPONENT: EvaluationResultCard (International Standard Dashboard) ──
function EvaluationResultCard({ result, index, onFixPartial, isFixing, fixingId }: { result: any, index: number, onFixPartial: (recIndex: number) => void, isFixing: boolean, fixingId: string | null }) {
  const [isOpen, setIsOpen] = useState(index === 0); 
  
  if (result.error) {
    return (
      <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-rose-200/60 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 to-transparent pointer-events-none"></div>
        <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white text-rose-500 rounded-2xl shadow-sm flex items-center justify-center shrink-0"><AlertTriangle className="w-6 h-6"/></div>
             <h3 className="font-bold text-slate-800 text-lg">{result.title}</h3>
          </div>
          <span className="px-4 py-2 bg-rose-100 text-rose-700 rounded-xl text-sm font-bold">วิเคราะห์ไม่สำเร็จ</span>
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
function EvaluationResultCard({ result, index, onFix, onFixPartial, isFixing, fixingId }: { result: any, index: number, onFix: () => void, onFixPartial: (recIndex: number) => void, isFixing: boolean, fixingId: string | null }) {
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
  const checklist = normalizeChecklist(result);
  const radarData = buildRadarData(checklist, percentage);
  const traffic = getTrafficLightData(result, checklist);
  const recommendations = Array.isArray(result.recommendations) && result.recommendations.length > 0
    ? result.recommendations
    : fallbackRecommendations;
  const summary = result.summary || 'AI วิเคราะห์แผนการจัดการเรียนรู้และจัดกลุ่มข้อเสนอแนะตามระดับความสำคัญ เพื่อช่วยให้ครูปรับแผนได้เร็วขึ้น';

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
          </motion.div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div variants={cardMotion} custom={1} className="group overflow-hidden rounded-[2rem] bg-white p-6 shadow-lg shadow-slate-200/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-500/10 md:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h4 className="flex items-center gap-2 text-lg font-black text-slate-800">
                  <BarChart2 className="h-5 w-5 text-indigo-500" />
                  สมดุลของแผนการสอน
                </h4>
                <p className="mt-1 text-sm font-medium text-slate-500">เปรียบเทียบมิติหลักของแผนแบบ Radar Chart</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">Balance</span>
            </div>
            <div className="h-[300px] w-full sm:h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="74%" data={radarData}>
                  <defs>
                    <linearGradient id={`radarGradient-${index}`} x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.48} />
                      <stop offset="100%" stopColor={toneStyle.fill} stopOpacity={0.28} />
                    </linearGradient>
                  </defs>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12, fontWeight: 800 }} />
                  <PolarRadiusAxis angle={35} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="คะแนนสมดุล" dataKey="value" stroke={toneStyle.fill} strokeWidth={3} fill={`url(#radarGradient-${index})`} fillOpacity={1} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 18px 45px rgba(15,23,42,.12)', fontWeight: 800 }}
                    formatter={(value: any) => [`${value}%`, 'คะแนน']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div variants={cardMotion} custom={2} className="group overflow-hidden rounded-[2rem] bg-white p-6 shadow-lg shadow-slate-200/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-500/10 md:p-7">
            <div className="mb-6">
              <h4 className="flex items-center gap-2 text-lg font-black text-slate-800">
                <ListChecks className="h-5 w-5 text-indigo-500" />
                สถานะการตรวจ 3 ขั้น
              </h4>
              <p className="mt-1 text-sm font-medium text-slate-500">แบ่งขั้นเพื่อช่วยให้เข้าใจผลตรวจได้เร็วขึ้น</p>
            </div>

            <div className="space-y-4">
              {evaluationSteps.map((step, stepIndex) => {
                const StepIcon = step.icon;
                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: stepIndex * 0.12 }}
                    className="relative flex gap-4 rounded-2xl bg-slate-50 p-4"
                  >
                    <div className="flex flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-md shadow-slate-200 transition-transform duration-300 hover:scale-110 hover:text-indigo-700">
                        <StepIcon className="h-5 w-5" />
                      </div>
                      {stepIndex < evaluationSteps.length - 1 && <div className="mt-3 h-8 w-px bg-slate-200" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">{stepIndex + 1}</span>
                        <h5 className="font-black text-slate-800">{step.title}</h5>
                        <CheckCircle className="ml-auto h-5 w-5 text-emerald-500" />
                      </div>
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{step.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {result.isFixed && (
              <div className="mt-5 flex items-center gap-3 rounded-2xl bg-indigo-50 p-4 text-sm font-bold text-indigo-700">
                <Star className="h-5 w-5 fill-indigo-500 text-indigo-500" />
                AI ปรับปรุงแผนนี้แล้ว
              </div>
            )}
          </motion.div>
        </div>

        <motion.div variants={cardMotion} custom={3} className="overflow-hidden rounded-[2rem] bg-white p-5 shadow-lg shadow-slate-200/40 transition-all duration-300 hover:shadow-indigo-500/10 md:p-7">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h4 className="text-xl font-black text-slate-800">รายละเอียดแบบ Traffic Light</h4>
              <p className="mt-1 text-sm font-medium text-slate-500">แยกผลตรวจเป็นกลุ่มอ่านง่าย ลดภาระการไล่ข้อความยาว ๆ</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-black text-slate-500">
              <Circle className="h-3 w-3 fill-emerald-500 text-emerald-500" /> ผ่าน
              <Circle className="ml-2 h-3 w-3 fill-amber-500 text-amber-500" /> ควรปรับ
              <Circle className="ml-2 h-3 w-3 fill-rose-500 text-rose-500" /> เสี่ยง
            </div>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            className={`grid gap-5 ${traffic.risks.length > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}
          >
            <TrafficLightCard tone="green" title="Strengths / Passed" description="สิ่งที่แผนทำได้ดีและควรรักษาไว้" icon={CheckCircle} items={traffic.passed} />
            <TrafficLightCard tone="yellow" title="Needs Improvement" description="จุดที่ควรปรับเพื่อให้แผนชัดและวัดผลได้ขึ้น" icon={AlertTriangle} items={traffic.needsWork} />
            {traffic.risks.length > 0 && (
              <TrafficLightCard tone="red" title="Critical Focus" description="จุดเสี่ยงที่ควรแก้ก่อนนำแผนไปใช้จริง" icon={AlertTriangle} items={traffic.risks} />
            )}
          </motion.div>
        </motion.div>

        <motion.div
          variants={cardMotion}
          custom={4}
          className="group/ai relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-2xl shadow-indigo-950/40 transition-all duration-500 hover:shadow-indigo-900/50 md:p-10"
        >
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-indigo-500/20 blur-[100px] transition-transform duration-700 group-hover/ai:translate-x-10 group-hover/ai:translate-y-10" />
          <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-purple-500/20 blur-[100px] transition-transform duration-700 group-hover/ai:-translate-x-10 group-hover/ai:-translate-y-10" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-indigo-100 backdrop-blur">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                AI Deep Insights
              </div>
              <h4 className="text-2xl font-black tracking-tight md:text-3xl">คำแนะนำเชิงลึกจาก AI</h4>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-indigo-100/80">
                ระบบสรุปข้อเสนอแนะที่ควรทำก่อน เพื่อช่วยให้แผนสอดคล้องกับมาตรฐาน ตัวชี้วัด กิจกรรม Active Learning และการวัดผลมากขึ้น
              </p>

              <div className="mt-6 grid gap-3">
                {recommendations.slice(0, 3).map((rec: any, recIndex: number) => {
                  const isRecFixed = result.fixedRecs?.[recIndex];
                  const isThisFixing = fixingId === `${result.planId}-partial-${recIndex}`;
                  return (
                    <motion.div
                      key={`${rec.section}-${recIndex}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: recIndex * 0.08 }}
                      className="rounded-[1.5rem] bg-white/10 p-5 shadow-sm backdrop-blur transition-all duration-300 hover:bg-white/15 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h5 className="font-black text-white">{rec.section || `ข้อเสนอแนะที่ ${recIndex + 1}`}</h5>
                          <p className="mt-2 text-sm font-medium leading-7 text-indigo-100/80">{rec.suggestion || rec}</p>
                        </div>
                        {result.planId !== 'uploaded' && !result.isFixed && (
                          <button
                            onClick={() => onFixPartial(recIndex)}
                            disabled={isThisFixing || isRecFixed}
                            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-black transition-all ${
                              isRecFixed
                                ? 'bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-300/30'
                                : 'bg-white text-indigo-950 hover:bg-cyan-100 disabled:bg-white/20 disabled:text-white/50'
                            }`}
                          >
                            {isThisFixing ? (
                              <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> กำลังแก้</span>
                            ) : isRecFixed ? (
                              <span className="inline-flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5" /> แก้แล้ว</span>
                            ) : (
                              <span className="inline-flex items-center gap-2">ให้ AI แก้จุดนี้ <ArrowRight className="h-3.5 w-3.5" /></span>
                            )}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* RECOMMENDATIONS & AUTO-FIX */}
            <div className="space-y-6">
              {/* Full Fix Card */}


                <div className="mt-6 space-y-3">
                  {checklist.slice(0, 4).map((item: any, itemIndex: number) => {
                    const itemPct = percentOf(item.score, item.maxScore);
                    return (
                      <div key={item.topic} className="group/item rounded-2xl bg-slate-950/35 p-4 transition-colors hover:bg-slate-950/50">
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black">
                          <span className="truncate text-indigo-100">{item.topic}</span>
                          <span className="text-cyan-200">{itemPct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${itemPct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.75, delay: itemIndex * 0.08 }}
                            className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-indigo-300 transition-all duration-500 group-hover/item:opacity-80"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {result.autoFixAvailable && result.planId !== 'uploaded' && !result.isFixed && (
                <button
                  onClick={onFix}
                  disabled={isFixing}
                  className="mt-5 flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-white px-5 py-4 text-sm font-black text-indigo-950 shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:bg-cyan-50 hover:shadow-cyan-500/20 disabled:translate-y-0 disabled:bg-white/20 disabled:text-white/50"
                >
                  {isFixing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      กำลังให้ AI ปรับแผนทั้งหมด...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 text-indigo-600" />
                      ให้ AI ปรับปรุงแผนทั้งหมด
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
