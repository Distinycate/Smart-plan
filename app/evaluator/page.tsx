'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle, AlertTriangle, Upload, Zap, Loader2, ArrowLeft,
  BarChart2, Star, Layers, ListChecks, ClipboardCheck, Trophy,
  Sparkles, ShieldCheck, Gauge, ArrowRight, FileText, Circle,
  CheckSquare, UploadCloud, BookOpen, GraduationCap, Calendar, Rocket
} from 'lucide-react';
import Link from 'next/link';
import * as mammoth from 'mammoth';
import { toast, Toaster } from 'react-hot-toast';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';


export default function EvaluatorPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);
  
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState<any[]>([]);
  const [fixingPlanId, setFixingPlanId] = useState<string | null>(null);
  const [evaluatingPA8PlanId, setEvaluatingPA8PlanId] = useState<string | null>(null);
  const [evaluatingV4PlanId, setEvaluatingV4PlanId] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState('กำลังเชื่อมต่อกับ AI...');
  const [fixLoadingMessage, setFixLoadingMessage] = useState('Gemini AI กำลังเริ่มต้นทำงาน...');
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (fixingPlanId) {
      const messages = [
        "กำลังวิเคราะห์ข้อบกพร่องของแผนการสอน...",
        "กำลังออกแบบกิจกรรมและสื่อเพิ่มเติมตามคำแนะนำ...",
        "กำลังปรับปรุงเกณฑ์การประเมิน (Rubric) ให้ครอบคลุม...",
        "กำลังเรียบเรียงและเขียนแผนการสอนฉบับใหม่...",
        "ใกล้เสร็จแล้ว โปรดรออีกนิดนะครับ (อาจใช้เวลาถึง 60 วินาที)..."
      ];
      let i = 0;
      setFixLoadingMessage(messages[0]);
      interval = setInterval(() => {
        i = i + 1;
        if (i >= messages.length) {
          i = messages.length - 1;
          clearInterval(interval);
        }
        setFixLoadingMessage(messages[i]);
      }, 7000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fixingPlanId]);

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

  
  const startEvaluatePA8 = async (resultIndex: number) => {
    const result = evaluationResults[resultIndex];
    if (!result || !result.originalPlanData) return;
    setEvaluatingPA8PlanId(result.planId);
    try {
      const res = await fetch('/api/ai-evaluate-pa8', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planData: result.originalPlanData,
          externalText: result.planId === 'uploaded' ? fileText : null
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      const newResults = [...evaluationResults];
      newResults[resultIndex].pa8Indicators = json.evaluation.pa8Indicators;
      newResults[resultIndex].pa8TotalScore = json.evaluation.pa8TotalScore;
      newResults[resultIndex].pa8Summary = json.evaluation.pa8Summary;
      setEvaluationResults(newResults);
      toast.success('ประเมิน PA8 เสร็จสมบูรณ์');
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการประเมิน PA8');
    } finally {
      setEvaluatingPA8PlanId(null);
    }
  };


  const startEvaluateV4 = async (resultIndex: number) => {
    const result = evaluationResults[resultIndex];
    if (!result || !result.originalPlanData) return;
    setEvaluatingV4PlanId(result.planId);
    try {
      const res = await fetch('/api/ai-evaluate-v4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planData: result.originalPlanData,
          externalText: result.planId === 'uploaded' ? fileText : null
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      const newResults = [...evaluationResults];
      newResults[resultIndex].v4Evaluation = json.evaluation;
      newResults[resultIndex].pa8Indicators = [{ met: true, indicator: 'V4 Review Complete', details: 'ประเมิน 4 มิติเรียบร้อยแล้ว' }];
      setEvaluationResults(newResults);
      toast.success('ประเมิน V4 ขั้นสูงเสร็จสมบูรณ์');
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการประเมิน V4');
    } finally {
      setEvaluatingV4PlanId(null);
    }
  };

  const resetEvaluationFlow = () => {
    setEvaluationResults([]);
    setError(null);
    setFixingPlanId(null);
    setEvaluatingPA8PlanId(null);
    setEvaluatingV4PlanId(null);
    setBatchProgress({ current: 0, total: 0 });
  };


  const startFixAll = async (resultIndex: number) => {
    const result = evaluationResults[resultIndex];
    if (!result || !result.originalPlanData) return;
    setFixingPlanId(`${result.planId}-all`);
    setError(null);
    try {
      const res = await fetch('/api/ai-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planData: result.originalPlanData,
          isPartial: false,
          feedbackContent: JSON.stringify(result)
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`AI ปรับปรุงแผนทั้งหมดสำเร็จ! ตรวจสอบความเปลี่ยนแปลงด้านล่าง`);
      const newResults = [...evaluationResults];
      newResults[resultIndex].aiFixedPlanData = json.newPlanData;
      newResults[resultIndex].hasUnsavedChanges = true;
      setEvaluationResults(newResults);
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการปรับปรุงแผน');
    } finally {
      setFixingPlanId(null);
    }
  };

  const saveToDraft = async (resultIndex: number) => {
    const result = evaluationResults[resultIndex];
    if (!result || !result.aiFixedPlanData) return;
    try {
      // Generate a new ID for the ai_fixed plan
      const draftData = {
        ...result.aiFixedPlanData,
        planId: `ai-fixed-${Date.now()}`,
        planStatus: 'ai_fixed',
        lessonTopic: result.aiFixedPlanData.lessonTopic + ' (AI แก้ไข)',
      };
      // Clean up extra fields added by AI
      Object.keys(draftData).forEach(key => {
        if (key.startsWith('fixReason')) {
          delete (draftData as any)[key];
        }
      });
      delete draftData.summary;
      delete draftData.overallScore;

      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-[2rem] pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-2 border-emerald-400 p-4`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center animate-bounce">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-lg font-black text-slate-900">
                  🎉 บันทึกแผนสำเร็จ!
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  AI ได้ปรับปรุงแผนของคุณเรียบร้อยแล้ว ระบบกำลังพาไปยังหน้าจัดการแผน...
                </p>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 4000 });

      // Clean up UI state
      const newResults = [...evaluationResults];
      newResults[resultIndex].hasUnsavedChanges = false;
      setEvaluationResults(newResults);
      
      // Redirect to the newly created plan
      setTimeout(() => {
        router.push(`/`);
      }, 1500);

    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึกแผน');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 to-slate-50 px-4 py-10 font-sans text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <EvaluationFlowStepper step={flowStep} />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-pink-400 via-rose-400 to-pink-500 p-6 shadow-2xl shadow-pink-200/40 sm:p-10"
        >
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-pink-200/20 blur-[120px]" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-rose-200/20 blur-[120px]" />
          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <Link
                href="/dashboard"
                className="group flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-pink-100 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-white/20"
              >
                <ArrowLeft className="h-6 w-6 transition-transform group-hover:-translate-x-1" />
              </Link>
              <div className="min-w-0">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-pink-200/50 bg-white/20 px-4 py-1.5 text-xs font-black text-pink-200 backdrop-blur-md">
                  <Sparkles className="h-4 w-4" />
                  Smart Lesson plan By Kruteh
                </div>
                <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                  ประเมินและพัฒนาแผน
                </h1>
                <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-pink-100/80">
                  อัปโหลดแผนการสอนของคุณให้ระบบช่วยประเมิน จุดเด่น จุดด้อย พร้อมข้อเสนอแนะเชิงลึก เพื่อนำไปพัฒนาต่อได้อย่างตรงจุด
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-black text-pink-100 sm:flex-col sm:items-end">
              <span className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 backdrop-blur-md border border-white/5">
                <Layers className="h-4 w-4" />
                {plans.length} แผนในระบบ
              </span>
              <span className="flex items-center gap-2 rounded-full bg-pink-200/20 px-4 py-2.5 text-pink-200 backdrop-blur-md border border-pink-400/20">
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
                    ? 'bg-white text-pink-700 shadow-md shadow-slate-200/50'
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
                    ? 'bg-white text-pink-700 shadow-md shadow-slate-200/50'
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
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between rounded-[2rem] bg-gradient-to-br from-pink-50/50 to-rose-50/30 p-6 md:p-8">
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
                            <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-pink-900">
                              <Calendar className="h-5 w-5 text-pink-400" />
                              {year}
                            </h3>
                            <div className="space-y-6 pl-2">
                              {Object.entries(grades).map(([grade, subjects]) => (
                                <div key={grade} className="border-l-2 border-pink-100 pl-4">
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
                                                    ? 'bg-gradient-to-br from-pink-50 to-rose-50/80 border-2 border-pink-400 shadow-md shadow-pink-200/10'
                                                    : 'bg-white border-2 border-slate-200 shadow-sm hover:border-pink-300'
                                                }`}
                                              >
                                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                                  isSelected ? 'bg-pink-300 text-white shadow-sm' : 'bg-slate-100 text-transparent group-hover:bg-pink-50'
                                                }`}>
                                                  <CheckCircle className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                  <h6 className={`truncate text-sm font-black ${isSelected ? 'text-pink-700' : 'text-slate-800'}`}>
                                                    {p.lessonTopic || 'ไม่มีชื่อแผน'} {p.author_email && <span className="text-xs font-normal text-slate-400 ml-2 font-mono">[{p.author_email}]</span>}
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
                    ? 'border-pink-400 bg-pink-50/50' 
                    : 'border-slate-200 hover:border-pink-400 hover:bg-slate-50/50 hover:shadow-2xl hover:shadow-pink-200/10'
                }`}>
                  <input
                    type="file"
                    id="file-upload"
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    accept=".docx"
                    onChange={handleFileUpload}
                  />
                  <div className="relative z-0 mx-auto flex flex-col items-center justify-center">
                    <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-[1.5rem] bg-gradient-to-tr from-pink-500 via-rose-500 to-pink-500 shadow-xl shadow-rose-500/30 transition-transform duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-110">
                      <div className="absolute inset-[3px] flex items-center justify-center rounded-[1.3rem] bg-white transition-colors duration-300 group-hover:bg-pink-50/80">
                        <UploadCloud className="h-10 w-10 text-pink-500 transition-transform duration-500 group-hover:-translate-y-1" />
                      </div>
                      <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-black tracking-tight text-slate-900 transition-colors duration-300 group-hover:text-pink-700">
                      ลากไฟล์มาวาง หรือ <span className="bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">คลิกเพื่ออัปโหลด</span>
                    </h3>
                    <p className="mt-3 max-w-sm text-sm font-medium text-slate-500">
                      รองรับไฟล์เอกสาร <strong className="text-pink-500">.docx</strong> (Microsoft Word) เท่านั้น
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
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
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
                className="relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-rose-300 px-8 py-4 text-sm font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-md disabled:translate-y-0 disabled:bg-slate-200 disabled:text-slate-400 sm:w-auto"
              >
                {isEvaluating && <div className="absolute inset-0 animate-pulse bg-rose-300" />}
                <span className="relative z-10 flex items-center gap-2">
                  {isEvaluating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-rose-100" />
                      {batchProgress.total > 1 ? `กำลังประเมินแผนที่ ${batchProgress.current} จาก ${batchProgress.total}...` : 'AI กำลังวิเคราะห์...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 text-rose-100" />
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
              <div className="absolute inset-0 rounded-full border-4 border-pink-100" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-pink-500">
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
                  className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-pink-500"
                >
                  <ArrowLeft className="h-4 w-4" />
                  ประเมินแผนอื่น
                </button>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
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
                onFixAll={() => startFixAll(index)}
                onSaveDraft={() => saveToDraft(index)}
                onCancel={resetEvaluationFlow}
                onRetry={startEvaluation}
                isFixing={fixingPlanId !== null && fixingPlanId.startsWith(`${result.planId}-all`)}
                onEvaluatePA8={() => startEvaluatePA8(index)}
                isEvaluatingPA8={evaluatingPA8PlanId === result.planId}
                onEvaluateV4={() => startEvaluateV4(index)}
                isEvaluatingV4={evaluatingV4PlanId === result.planId}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── AI LOADING SPINNER OVERLAY (FIXING) ─── */}
      {fixingPlanId && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm transition-opacity" style={{ zIndex: 9999 }}>
          <div className="flex flex-col items-center justify-center rounded-[2rem] bg-white p-10 shadow-2xl shadow-pink-200/50 border border-pink-100 max-w-md w-full mx-4 text-center">
            <div className="spinner" style={{ marginBottom: '16px' }} />
            <strong style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#db2777' }}>✨ AI กำลังทำงาน... ✨</strong>
            <strong style={{ fontSize: '1rem', color: '#475569' }}>{fixLoadingMessage}</strong>
            <div style={{ marginTop: '16px', width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
               <div style={{ height: '100%', background: 'linear-gradient(90deg, #ec4899, #f43f5e)', width: '50%', animation: 'progress 2s infinite linear' }} />
            </div>
          </div>
          <style>{`
            @keyframes progress {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(200%); }
            }
          `}</style>
        </div>
      )}

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
                    ? 'bg-pink-300 text-white shadow-lg shadow-pink-600/30 scale-105'
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

const buildRadarDataFromScores = (combinedData: any) => {
  const getPercent = (score: number, maxScore: number) => {
    if (!score || isNaN(score)) return 0;
    return Math.round((score / maxScore) * 100);
  };

  return [
    { subject: 'จุดประสงค์', value: getPercent(combinedData?.objectives?.score, 20), fullMark: 100 },
    { subject: 'กิจกรรม', value: getPercent(combinedData?.activities?.score, 20), fullMark: 100 },
    { subject: 'วัดและประเมิน', value: getPercent(combinedData?.assessment?.score, 20), fullMark: 100 },
    { subject: 'ความสอดคล้อง', value: getPercent(combinedData?.alignment?.score, 20), fullMark: 100 },
    { subject: 'การใช้ภาษา', value: getPercent(combinedData?.language?.score, 20), fullMark: 100 }
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
      bullet: 'text-rose-400'
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

const DIFF_FIELDS = [
  { key: 'essentialConcept', label: 'สาระสำคัญ' },
  { key: 'objectiveK', label: 'จุดประสงค์ (K)' },
  { key: 'objectiveP', label: 'จุดประสงค์ (P)' },
  { key: 'objectiveA', label: 'จุดประสงค์ (A)' },
  { key: 'learningProcess', label: 'กิจกรรมการเรียนรู้' },
  { key: 'measureK', label: 'การวัดผล (K)' },
  { key: 'measureP', label: 'การวัดผล (P)' },
  { key: 'measureA', label: 'การวัดผล (A)' },
  { key: 'rubricK', label: 'เกณฑ์ประเมิน (Rubric K)' },
  { key: 'rubricP', label: 'เกณฑ์ประเมิน (Rubric P)' },
  { key: 'rubricA', label: 'เกณฑ์ประเมิน (Rubric A)' },
];

function PlanDiffViewer({ original, fixed }: { original: any, fixed: any }) {
  if (!original || !fixed) return null;

  const changes = DIFF_FIELDS.filter(field => {
    const origVal = String(original[field.key] || '').trim();
    const fixVal = String(fixed[field.key] || '').trim();
    return origVal !== fixVal && origVal !== '' && fixVal !== '';
  });

  if (changes.length === 0) return (
    <div className="mt-8 p-4 bg-emerald-50 text-emerald-700 rounded-xl font-medium border border-emerald-100 flex items-center gap-3">
      <CheckCircle className="h-5 w-5" />
      ไม่พบการเปลี่ยนแปลงในข้อความหลัก (AI อาจปรับปรุงโครงสร้างหรือจัดหน้าให้ใหม่)
    </div>
  );

  return (
    <div className="space-y-6 mt-12 border-t border-slate-100 pt-10">
      <div className="flex flex-col gap-2">
        <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-pink-500" />
          สรุปการปรับปรุงโดย AI (Before & After)
        </h4>
        <p className="text-sm font-medium text-slate-500">
          ตรวจสอบความเปลี่ยนแปลงก่อนกดบันทึก (แสดงเฉพาะหัวข้อที่มีการปรับแก้)
        </p>
      </div>
      <div className="space-y-6">
        {changes.map((field, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 font-black text-slate-700">
              {field.label}
            </div>
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              <div className="p-5 bg-rose-50/30">
                <p className="text-xs font-black text-rose-500 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> เนื้อหาเดิม
                </p>
                <div className="text-sm text-slate-600 prose prose-sm prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 max-w-none" dangerouslySetInnerHTML={{ __html: original[field.key] }} />
              </div>
              <div className="p-5 bg-emerald-50/30">
                <p className="text-xs font-black text-emerald-500 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> AI ปรับปรุงใหม่
                </p>
                <div className="text-sm text-slate-800 font-medium prose prose-sm prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 max-w-none" dangerouslySetInnerHTML={{ __html: fixed[field.key] }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── COMPONENT: EvaluationResultCard ──
function EvaluationResultCard({ result, index, onFixAll, onSaveDraft, onCancel, onRetry, isFixing, onEvaluatePA8, isEvaluatingPA8, onEvaluateV4, isEvaluatingV4 }: { result: any, index: number, onFixAll: () => void, onSaveDraft: () => void, onCancel: () => void, onRetry: () => void, isFixing: boolean, onEvaluatePA8: () => void, isEvaluatingPA8: boolean, onEvaluateV4: () => void, isEvaluatingV4: boolean }) {
  if (result.error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl bg-white shadow-sm"
      >
        <div className="flex flex-col gap-4 bg-rose-50 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-400 shadow-sm">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{result.title}</h3>
              <p className="mt-1 text-sm font-medium text-rose-600">วิเคราะห์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onRetry}
              className="rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-rose-600 transition-colors"
            >
              ลองใหม่อีกครั้ง (Retry)
            </button>
            <button
              onClick={onCancel}
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors border border-slate-200"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  const detailedScores = result.detailedScores || {};
  const ruleScores = result.ruleBasedDetails || {};

  // Combine AI and Rule-based scores and scale each to 20 points
  const rawObj = (detailedScores.objectives?.score || 0) + (ruleScores.standardsScore || 0); // Max 25
  const rawAct = (detailedScores.activities?.score || 0) + ((ruleScores.structureScore || 0) / 2); // Max 25
  const rawAss = (detailedScores.assessment?.score || 0) + (ruleScores.rubricScore || 0); // Max 25
  const rawAli = (detailedScores.alignment?.score || 0) + ((ruleScores.structureScore || 0) / 2); // Max 20
  const rawLan = (detailedScores.language?.score || 0); // Max 5

  const scaledObj = Math.round((rawObj / 25) * 20);
  const scaledAct = Math.round((rawAct / 25) * 20);
  const scaledAss = Math.round((rawAss / 25) * 20);
  const scaledAli = Math.round((rawAli / 20) * 20);
  const scaledLan = Math.round((rawLan / 5) * 20);

  // Recalculate overall score based on the scaled sections
  const score = scaledObj + scaledAct + scaledAss + scaledAli + scaledLan;
  const maxScore = 100;
  const percentage = percentOf(score, maxScore);
  const tone = getScoreTone(percentage);
  const toneStyle = toneStyles[tone];
  const summary = result.summary || 'AI วิเคราะห์แผนการจัดการเรียนรู้เสร็จสมบูรณ์';

  const combinedData = {
    objectives: { ...detailedScores.objectives, score: scaledObj },
    activities: { ...detailedScores.activities, score: scaledAct },
    assessment: { ...detailedScores.assessment, score: scaledAss },
    alignment: { ...detailedScores.alignment, score: scaledAli },
    language: { ...detailedScores.language, score: scaledLan }
  };

  const ScoreDetailBox = ({ title, data, maxScore }: { title: string, data: any, maxScore: number }) => {
    if (!data) return null;
    return (
      <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h4 className="text-lg font-black text-slate-800">{title}</h4>
          <span className="text-xl font-black text-pink-500 bg-pink-50 px-4 py-1.5 rounded-xl border border-pink-100">{data.score}/{maxScore}</span>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100 h-full">
            <h5 className="text-xs font-black text-emerald-800 uppercase tracking-widest mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> จุดดี
            </h5>
            <p className="text-sm font-medium text-emerald-900 leading-relaxed">{data.strengths}</p>
          </div>
          <div className="bg-rose-50 rounded-xl p-5 border border-rose-100 h-full">
            <h5 className="text-xs font-black text-rose-800 uppercase tracking-widest mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> จุดที่บกพร่อง
            </h5>
            <p className="text-sm font-medium text-rose-900 leading-relaxed">{data.weaknesses}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-5 border border-amber-100 h-full">
            <h5 className="text-xs font-black text-amber-800 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> ข้อเสนอแนะ
            </h5>
            <p className="text-sm font-medium text-amber-900 leading-relaxed">{data.suggestions}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.18 }}
      custom={index}
      variants={cardMotion}
      className="relative overflow-hidden rounded-[2.5rem] bg-slate-50 shadow-sm border border-slate-200"
    >
      <div className="relative space-y-8 p-4 sm:p-8 md:p-10">
        <div className="flex flex-col gap-6">
          {/* Row 1: Title and AI Score */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 relative overflow-hidden rounded-[2rem] bg-white p-6 shadow-sm md:p-8 border border-slate-100 flex flex-col justify-center">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.25rem] bg-pink-50 text-pink-500 shadow-inner">
                  <ClipboardCheck className="h-8 w-8" />
                </div>
                <div className="min-w-0">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Evaluation
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                    {result.title}
                  </h3>
                  <p className="mt-3 text-sm font-medium leading-7 text-slate-600">{summary}</p>
                </div>
              </div>
            </div>

            <motion.div
              whileHover={{ y: -5, scale: 1.02 }}
              className={`group w-full lg:w-[320px] shrink-0 relative overflow-hidden rounded-[2rem] p-6 shadow-xl transition-all duration-300 flex flex-col justify-between ${toneStyle.bg} border-2 ${tone === 'green' ? 'border-emerald-200' : tone === 'yellow' ? 'border-amber-200' : 'border-rose-200'}`}
            >
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-black uppercase tracking-[0.15em] ${toneStyle.text} opacity-80`}>AI Score</p>
                    <p className={`mt-1 text-sm font-bold ${toneStyle.text}`}>{toneStyle.label}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-gradient-to-br ${toneStyle.gradient} text-white shadow-lg`}>
                    <Trophy className="h-6 w-6" />
                  </div>
                </div>
                
                {/* Dynamic feedback text */}
                <div className="mt-3">
                  <p className={`text-xs font-medium leading-relaxed opacity-80 ${toneStyle.text}`}>
                    {tone === 'green' ? 'ยอดเยี่ยม! แผนการสอนนี้มีคุณภาพระดับมืออาชีพ ครบถ้วนและพร้อมนำไปใช้สอนจริงได้เลย' :
                     tone === 'yellow' ? 'ทำได้ดี! แต่ยังมีบางจุดที่สามารถปรับให้คมชัดขึ้นได้ AI พร้อมช่วยคุณปรับปรุงทันที' :
                     'ไม่ต้องกังวล! ให้ AI ช่วยจัดการซ่อมแซมจุดที่บกพร่อง เพื่อให้แผนสมบูรณ์แบบยิ่งขึ้น'}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-end gap-2 mb-2">
                  <span className={`text-6xl font-black tracking-tight ${toneStyle.text}`}>{score}</span>
                  <span className={`pb-2 text-xl font-black ${toneStyle.text} opacity-50`}>/{maxScore}</span>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full bg-white/40 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full bg-gradient-to-r ${toneStyle.gradient}`} 
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Row 2: Radar Chart Centerpiece */}
          <div className="relative overflow-hidden rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[380px]">
            <div className="absolute top-6 left-6 inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
              <Gauge className="h-4 w-4" />
              ภาพรวมความสมดุลของแผน
            </div>
            <div className="h-[320px] w-full max-w-3xl mt-8">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={buildRadarDataFromScores(combinedData)}>
                  <PolarGrid stroke="#f1f5f9" strokeWidth={2} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 13, fontWeight: 800 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="เปอร์เซ็นต์" dataKey="value" stroke={tone === 'green' ? '#10b981' : tone === 'yellow' ? '#f59e0b' : '#f43f5e'} strokeWidth={3} fill={tone === 'green' ? '#10b981' : tone === 'yellow' ? '#f59e0b' : '#f43f5e'} fillOpacity={0.3} />
                  <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', fontSize: '14px', fontWeight: 'bold' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed Scores Breakdown */}
        <div>
          <h4 className="flex items-center gap-2 text-xl font-black text-slate-800 mb-6">
            <BarChart2 className="h-6 w-6 text-pink-400" />
            ผลประเมินรายหัวข้อ (เชิงลึก)
          </h4>
          <div className="space-y-6">
            <ScoreDetailBox title="1. จุดประสงค์และมาตรฐาน" data={combinedData.objectives} maxScore={20} />
            <ScoreDetailBox title="2. กิจกรรมการเรียนรู้" data={combinedData.activities} maxScore={20} />
            <ScoreDetailBox title="3. การวัดและประเมินผล" data={combinedData.assessment} maxScore={20} />
            <ScoreDetailBox title="4. ความสอดคล้อง" data={combinedData.alignment} maxScore={20} />
            <ScoreDetailBox title="5. การใช้ภาษา" data={combinedData.language} maxScore={20} />
          </div>
        </div>

        {/* PA 8 Indicators Checklist */}
        {result.pa8Indicators && result.pa8Indicators.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-xl font-black text-slate-800 mb-6 mt-8">
              <ShieldCheck className="h-6 w-6 text-pink-400" />
              การประเมิน 8 ตัวชี้วัดวิทยฐานะ (ว9 / วPA)
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              {result.pa8Indicators.map((item: any, i: number) => (
                <div key={i} className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${item.met ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {item.met ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className={`text-base font-black ${item.met ? 'text-slate-800' : 'text-rose-900'}`}>{item.indicator}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl text-sm font-medium text-slate-600 leading-relaxed border border-slate-100">
                    {item.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Reviewer V4 Output */}
        {result.v4Evaluation && (
          <div className="mt-12 border-t border-slate-100 pt-10">
            <h4 className="flex items-center gap-2 text-2xl font-black text-indigo-900 mb-6">
              <Sparkles className="h-7 w-7 text-indigo-500" />
              รายงานการประเมิน 4 มิติ (AI Reviewer V4)
            </h4>
            <div className="bg-gradient-to-br from-indigo-50 to-white rounded-3xl p-8 shadow-sm border border-indigo-100 mb-6">
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-indigo-100/50 pb-6">
                <div>
                  <h5 className="text-xl font-black text-indigo-950">คะแนนประเมินวิทยฐานะ (10 ด้าน)</h5>
                  <p className="text-sm font-medium text-indigo-700/80 mt-1">อ้างอิงหลักการ Constructive Alignment และ Active Learning</p>
                </div>
                <div className="flex items-end gap-2 bg-white px-6 py-3 rounded-2xl shadow-sm border border-indigo-50">
                  <span className="text-4xl font-black text-indigo-600">{result.v4Evaluation.totalScore}</span>
                  <span className="text-lg font-bold text-slate-400 mb-1">/ 100</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(result.v4Evaluation.categoryScores).map(([key, score]) => (
                  <div key={key} className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50 flex flex-col items-center text-center">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{key}</span>
                    <span className="text-xl font-black text-indigo-700">{score as React.ReactNode}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                <h5 className="text-sm font-black text-emerald-800 uppercase tracking-widest mb-4 flex items-center gap-2"><CheckCircle className="w-5 h-5"/> จุดแข็งของแผนนี้</h5>
                <ul className="space-y-3">
                  {result.v4Evaluation.strengths.map((item: string, i: number) => (
                    <li key={i} className="text-sm font-medium text-emerald-900 flex items-start gap-2"><span className="text-emerald-500 mt-0.5">•</span> {item}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100">
                <h5 className="text-sm font-black text-rose-800 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> จุดที่ต้องแก้ไข / จุดอ่อน</h5>
                <ul className="space-y-3">
                  {result.v4Evaluation.weaknesses.map((item: string, i: number) => (
                    <li key={i} className="text-sm font-medium text-rose-900 flex items-start gap-2"><span className="text-rose-500 mt-0.5">•</span> {item}</li>
                  ))}
                  {result.v4Evaluation.mustFix.map((item: string, i: number) => (
                    <li key={'mf'+i} className="text-sm font-black text-red-700 flex items-start gap-2"><span className="text-red-600 mt-0.5">⚠️</span> {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h5 className="text-lg font-black text-slate-800 mb-3">ข้อเสนอแนะเชิงวิชาการจากกรรมการ</h5>
              <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">{result.v4Evaluation.academicSuggestions}</p>
            </div>
          </div>
        )}

        {/* Plan Diff Viewer (Before & After) */}
        {result.hasUnsavedChanges && (
          <PlanDiffViewer original={result.originalPlanData} fixed={result.aiFixedPlanData} />
        )}

        
        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          {!result.hasUnsavedChanges ? (
            <>
              {(!result.v4Evaluation) && (
                <button
                  onClick={onEvaluateV4}
                  disabled={isEvaluatingV4 || isFixing}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-black text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 hover:bg-indigo-700 disabled:bg-slate-300 disabled:scale-100"
                >
                  {isEvaluatingV4 ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> กำลังประเมิน V4 เชิงลึก (4 มิติ)...</>
                  ) : (
                    <><Rocket className="h-5 w-5" /> 🚀 ประเมินขั้นสูง V4 (กรรมการ 4 มิติ)</>
                  )}
                </button>
              )}

              {(!result.pa8Indicators || result.pa8Indicators.length === 0) && (
                <button
                  onClick={onEvaluatePA8}
                  disabled={isEvaluatingPA8 || isFixing}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-purple-500 px-8 py-4 text-base font-black text-white shadow-lg shadow-purple-600/30 transition-all hover:scale-105 hover:bg-purple-600 disabled:bg-slate-300 disabled:scale-100"
                >
                  {isEvaluatingPA8 ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> กำลังประเมิน PA8 เชิงลึก...</>
                  ) : (
                    <><ShieldCheck className="h-5 w-5" /> ✨ ประเมินมาตรฐาน ว9 (PA8) เชิงลึก</>
                  )}
                </button>
              )}

              <button
                onClick={onFixAll}
                disabled={isFixing}
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-pink-300 px-8 py-4 text-base font-black text-white shadow-lg shadow-pink-600/30 transition-all hover:scale-105 hover:bg-pink-400 disabled:bg-slate-300 disabled:scale-100"
              >
                {isFixing ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> กำลังปรับปรุงแผน...</>
                ) : (
                  <><Sparkles className="h-5 w-5" /> ให้ AI ปรับปรุงแผนทั้งหมดให้สมบูรณ์</>
                )}
              </button>
              <button
                onClick={onCancel}
                disabled={isFixing}
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-slate-100 px-8 py-4 text-base font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
              >
                สิ้นสุดการตรวจ (ไม่บันทึก)
              </button>
            </>
          ) : (
            <>
              <div className="flex-1">
                <p className="text-sm font-black text-emerald-600 mb-1">🎉 AI ปรับปรุงแผนเสร็จสมบูรณ์!</p>
                <p className="text-xs font-medium text-slate-500">กรุณากดบันทึกเพื่อจัดเก็บเป็นฉบับร่าง หรือกดยกเลิกเพื่อทิ้งการเปลี่ยนแปลง</p>
              </div>
              <button
                onClick={onSaveDraft}
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 text-base font-black text-white shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 hover:bg-emerald-600"
              >
                <CheckSquare className="h-5 w-5" /> บันทึกแผนฉบับ AI ปรับปรุง
              </button>
              <button
                onClick={onCancel}
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-rose-50 px-8 py-4 text-base font-bold text-rose-600 transition-colors hover:bg-rose-100"
              >
                ยกเลิก (ไม่บันทึก)
              </button>
            </>
          )}
        </div>
      </div>
    </motion.section>
  );
}
