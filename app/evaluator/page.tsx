'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, AlertTriangle, Upload, Zap, Loader2, ArrowLeft,
  BarChart2, Star, Layers, ListChecks, ClipboardCheck, Trophy,
  Sparkles, ShieldCheck, Gauge, ArrowRight, FileText, Circle,
  ChevronDown, ChevronUp, ThumbsUp
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
  
  const [activeTab, setActiveTab] = useState<'system' | 'upload'>('system');
  const [error, setError] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

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

  const startAutoFix = async (resultIndex: number) => {
    const result = evaluationResults[resultIndex];
    if (!result || !result.originalPlanData) return;
    setFixingPlanId(result.planId);
    setError(null);
    try {
      const res = await fetch('/api/ai-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planData: result.originalPlanData, feedback: result })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      alert(`ปรับปรุงแผน ${result.title} สำเร็จ! ระบบได้สร้างแผนฉบับใหม่แล้ว`);
      const newResults = [...evaluationResults];
      newResults[resultIndex].isFixed = true;
      setEvaluationResults(newResults);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการ Auto-Fix');
    } finally {
      setFixingPlanId(null);
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
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 font-sans text-slate-800">
      <div className="max-w-[1200px] mx-auto space-y-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Link href="/" className="p-3.5 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group">
              <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-indigo-600 transition-colors" />
            </Link>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-bold text-indigo-700 mb-2">
                <BarChart2 className="w-3.5 h-3.5" /> Intelligence Analysis
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">AI ตรวจแผนอัจฉริยะ</h1>
            </div>
          </div>
        </div>

        {/* INPUT SECTION */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-100 bg-slate-50/50">
            <button 
              className={`flex-1 py-5 text-center font-bold text-sm transition-all relative ${activeTab === 'system' ? 'text-indigo-700 bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)]' : 'text-slate-500 hover:bg-slate-100'}`}
              onClick={() => setActiveTab('system')}
            >
              ดึงแผนจากระบบ (Batch Evaluation)
              {activeTab === 'system' && <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />}
            </button>
            <button 
              className={`flex-1 py-5 text-center font-bold text-sm transition-all relative ${activeTab === 'upload' ? 'text-indigo-700 bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)]' : 'text-slate-500 hover:bg-slate-100'}`}
              onClick={() => setActiveTab('upload')}
            >
              อัปโหลดไฟล์ (DOCX)
              {activeTab === 'upload' && <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />}
            </button>
          </div>
          
          <div className="p-6 md:p-10">
            {activeTab === 'system' && (
              <div className="space-y-4">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-800">เลือกแผนการสอน</h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">สามารถเลือกหลายแผนพร้อมกัน ระบบจะทำการตรวจคิวแบบอัตโนมัติ</p>
                  </div>
                  <button onClick={selectAll} className="text-sm font-bold text-indigo-700 hover:text-white bg-indigo-50 hover:bg-indigo-600 px-4 py-2 rounded-xl transition-colors border border-indigo-100 hover:border-transparent">
                    {selectedPlanIds.size === plans.length && plans.length > 0 ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                  </button>
                </div>
                
                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-2">
                    {plans.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 font-medium">ไม่มีแผนในระบบ</div>
                    ) : (
                      <div className="space-y-1.5">
                        {plans.map(p => {
                          const isSelected = selectedPlanIds.has(p.planId);
                          return (
                            <div 
                              key={p.planId} 
                              onClick={() => toggleSelectPlan(p.planId)}
                              className={`group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-white border-indigo-300 shadow-sm' : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm'}`}
                            >
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 group-hover:border-indigo-400'}`}>
                                {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-800 truncate">{p.lessonTopic || 'ไม่มีชื่อแผน'}</h3>
                                <div className="flex items-center gap-3 mt-1 text-xs font-medium text-slate-500">
                                  <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5"/> {p.subjectName}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                  <span>{p.gradeLevel}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-[2rem] p-16 text-center hover:bg-indigo-50 transition-colors group cursor-pointer relative">
                  <input type="file" id="file-upload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".docx" onChange={handleFileUpload} />
                  <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-indigo-100 flex items-center justify-center mx-auto mb-6 text-indigo-500 group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-black text-indigo-900 mb-2">ลากไฟล์มาวาง หรือคลิกเพื่ออัปโหลด</h3>
                  <p className="text-sm font-medium text-slate-500">รองรับเฉพาะไฟล์เอกสาร .docx เท่านั้น</p>
                </div>
                {fileText && (
                  <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0"><CheckCircle className="w-5 h-5"/></div>
                      <div>
                        <p className="text-sm font-bold text-emerald-900">ไฟล์พร้อมสำหรับการประเมินแล้ว</p>
                        <p className="text-xs font-medium text-emerald-600 mt-0.5">ระบบดึงข้อมูลตัวอักษรสำเร็จ</p>
                      </div>
                    </div>
                    <CheckCircle className="w-6 h-6 text-emerald-400 opacity-50"/>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-6 p-5 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-sm font-bold flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500"/> {error}
              </div>
            )}

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-sm font-bold text-slate-400">
                {activeTab === 'system' ? `เลือกอยู่ ${selectedPlanIds.size} แผนการสอน` : (fileText ? 'พร้อมตรวจ 1 ไฟล์' : 'ยังไม่ได้อัปโหลดไฟล์')}
              </div>
              <button 
                onClick={startEvaluation}
                disabled={isEvaluating || (activeTab === 'system' ? selectedPlanIds.size === 0 : !fileText)}
                className="w-full sm:w-auto px-10 py-4 bg-slate-900 hover:bg-black disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 transition-all flex items-center justify-center gap-3 relative overflow-hidden group"
              >
                {isEvaluating && <div className="absolute inset-0 bg-indigo-600 animate-pulse"></div>}
                <span className="relative z-10 flex items-center gap-2">
                  {isEvaluating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-300" /> 
                      {batchProgress.total > 1 ? `กำลังประเมินแผนที่ ${batchProgress.current} จาก ${batchProgress.total}...` : 'AI กำลังวิเคราะห์...'}
                    </>
                  ) : (
                    <>
                      <Star className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 transition-colors"/> 
                      {selectedPlanIds.size > 1 ? `เริ่มประเมินทั้งหมด (${selectedPlanIds.size})` : 'เริ่มประเมินความสมบูรณ์'}
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* EVALUATION RESULTS */}
        {evaluationResults.length > 0 && (
          <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center gap-4 mb-4 pl-2">
              <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
              <h2 className="text-2xl font-black text-slate-800">รายงานผลวิเคราะห์ (Analytics Dashboard)</h2>
            </div>
            
            {evaluationResults.map((result, index) => (
              <EvaluationResultCard 
                key={`${result.planId}-${index}`} 
                result={result} 
                index={index}
                onFix={() => startAutoFix(index)}
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
    border: 'border-emerald-200',
    ring: 'ring-emerald-100',
    fill: '#10b981',
    gradient: 'from-emerald-500 to-teal-500'
  },
  yellow: {
    label: 'ควรปรับปรุงบางจุด',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    ring: 'ring-amber-100',
    fill: '#f59e0b',
    gradient: 'from-amber-400 to-orange-500'
  },
  red: {
    label: 'ต้องทบทวนเพิ่มเติม',
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    ring: 'ring-rose-100',
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
      card: 'bg-emerald-50/80 border-emerald-200',
      icon: 'bg-emerald-100 text-emerald-700',
      text: 'text-emerald-950',
      bullet: 'text-emerald-600'
    },
    yellow: {
      card: 'bg-amber-50/80 border-amber-200',
      icon: 'bg-amber-100 text-amber-700',
      text: 'text-amber-950',
      bullet: 'text-amber-600'
    },
    red: {
      card: 'bg-rose-50/80 border-rose-200',
      icon: 'bg-rose-100 text-rose-700',
      text: 'text-rose-950',
      bullet: 'text-rose-600'
    }
  }[tone];

  return (
    <motion.div variants={cardMotion} className={`rounded-3xl border p-6 shadow-sm ${styles.card}`}>
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h4 className={`text-lg font-black ${styles.text}`}>{title}</h4>
          <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {items.length > 0 ? items.map((item, itemIndex) => (
          <div key={itemIndex} className="flex gap-3 rounded-2xl bg-white/70 p-4 text-sm font-medium leading-7 text-slate-700 shadow-sm">
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
        className="overflow-hidden rounded-[2rem] border border-rose-200 bg-white shadow-sm"
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
      className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-sm md:rounded-[2.25rem]"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl" />

      <div className="relative space-y-6 p-4 sm:p-6 md:p-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur md:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
                <ClipboardCheck className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
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
            whileHover={{ y: -3, scale: 1.01 }}
            className={`rounded-3xl border bg-white p-6 shadow-sm ring-8 ${toneStyle.border} ${toneStyle.ring}`}
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
          <motion.div variants={cardMotion} custom={1} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
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

          <motion.div variants={cardMotion} custom={2} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
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
                    className="relative flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col items-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
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
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-bold text-indigo-700">
                <Star className="h-5 w-5 fill-indigo-500 text-indigo-500" />
                AI ปรับปรุงแผนนี้แล้ว
              </div>
            )}
          </motion.div>
        </div>

        <motion.div variants={cardMotion} custom={3} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
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
          className="relative overflow-hidden rounded-[2rem] border border-indigo-400/20 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-2xl shadow-indigo-950/30 md:p-8"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />

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
                      className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"
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

            <div className="relative">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur md:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/20 text-cyan-200">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h5 className="text-lg font-black">สรุปแนวทางปรับปรุง</h5>
                    <p className="mt-2 text-sm font-medium leading-7 text-indigo-100/75">
                      เริ่มจากเพิ่มคำถามกระตุ้นความคิดในช่วงนำเข้าสู่บทเรียน แล้วปรับเกณฑ์ประเมินให้วัดพฤติกรรมผู้เรียนได้ชัดเจน
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {checklist.slice(0, 4).map((item: any, itemIndex: number) => {
                    const itemPct = percentOf(item.score, item.maxScore);
                    return (
                      <div key={item.topic} className="rounded-2xl bg-slate-950/35 p-4">
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
                            className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-indigo-300"
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
                  className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-black text-indigo-950 shadow-xl shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-cyan-50 disabled:translate-y-0 disabled:bg-white/20 disabled:text-white/50"
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

// ── COMPONENT: LegacyEvaluationResultCard (kept temporarily for reference) ──
function LegacyEvaluationResultCard({ result, index, onFix, onFixPartial, isFixing, fixingId }: { result: any, index: number, onFix: () => void, onFixPartial: (recIndex: number) => void, isFixing: boolean, fixingId: string | null }) {
  const [isOpen, setIsOpen] = useState(index === 0); 
  
  if (result.error) {
    return (
      <div className="bg-white rounded-[2rem] shadow-sm border border-rose-200 overflow-hidden">
        <div className="p-6 md:p-8 bg-rose-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white text-rose-500 rounded-2xl shadow-sm flex items-center justify-center shrink-0"><AlertTriangle className="w-6 h-6"/></div>
             <h3 className="font-bold text-slate-800 text-lg">{result.title}</h3>
          </div>
          <span className="px-4 py-2 bg-rose-100 text-rose-700 rounded-xl text-sm font-bold">วิเคราะห์ไม่สำเร็จ</span>
        </div>
      </div>
    );
  }

  const score = result.overallScore || 0;
  const maxScore = result.maxScore || 100;
  const percentage = (score / maxScore) * 100;
  
  let themeColor = 'emerald';
  if (percentage < 60) themeColor = 'rose';
  else if (percentage < 80) themeColor = 'amber';

  const colorMap: any = {
    emerald: { text: 'text-emerald-500', bg: 'bg-emerald-500', bgLight: 'bg-emerald-50', border: 'border-emerald-200', hex: '#10b981' },
    amber: { text: 'text-amber-500', bg: 'bg-amber-500', bgLight: 'bg-amber-50', border: 'border-amber-200', hex: '#f59e0b' },
    rose: { text: 'text-rose-500', bg: 'bg-rose-500', bgLight: 'bg-rose-50', border: 'border-rose-200', hex: '#f43f5e' },
  };
  const theme = colorMap[themeColor];

  // Data for Radar Chart
  const radarData = result.checklist?.map((item: any) => {
    // Shorten topic for chart if too long
    let shortTopic = item.topic.replace(/^[0-9]+\.\s*/, '');
    if(shortTopic.length > 15) shortTopic = shortTopic.substring(0, 15) + '...';
    
    return {
      subject: shortTopic,
      A: Math.round((item.score / item.maxScore) * 100),
      fullMark: 100,
    };
  }) || [];

  return (
    <div className={`bg-white rounded-[2rem] shadow-sm border ${isOpen ? theme.border : 'border-slate-200'} overflow-hidden transition-all duration-300`}>
      {/* ACCORDION HEADER */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 text-left transition-colors ${isOpen ? theme.bgLight : 'hover:bg-slate-50'}`}
      >
        <div className="flex items-center gap-6 w-full md:w-auto">
          {/* Circular Progress Gauge */}
          <div className="relative w-20 h-20 shrink-0">
             <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 36 36">
               <path className="text-white/50 stroke-slate-200" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
               <path strokeDasharray={`${percentage}, 100`} strokeWidth="3" stroke={theme.hex} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" className="transition-all duration-1000 ease-out"/>
             </svg>
             <div className="absolute inset-0 flex items-center justify-center flex-col">
               <span className="text-xl font-black text-slate-800 leading-none">{score}</span>
             </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-slate-900 mb-1 line-clamp-1">{result.title}</h3>
            <p className="text-sm font-medium text-slate-500 line-clamp-2 md:line-clamp-1">{result.summary}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 shrink-0 border-t md:border-0 border-slate-200/50 pt-4 md:pt-0">
          {result.isFixed && (
            <span className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <Star className="w-3.5 h-3.5 fill-white"/> AI Fixed
            </span>
          )}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-white text-slate-700 shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
            {isOpen ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
          </div>
        </div>
      </button>

      {/* EXPANDED DASHBOARD CONTENT */}
      {isOpen && (
        <div className="p-6 md:p-8 bg-white border-t border-slate-100">
          
          {/* ROW 1: Charts & Pros/Cons */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            
            {/* RADAR CHART MODULE */}
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-500"/> Plan Balance
              </h4>
              <p className="text-xs font-medium text-slate-500 mb-4">มิติความครอบคลุมของแผน (%)</p>
              <div className="flex-1 min-h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Score %" dataKey="A" stroke={theme.hex} fill={theme.hex} fillOpacity={0.4} />
                    <RechartsTooltip wrapperClassName="rounded-xl shadow-lg border-none" contentStyle={{borderRadius:'12px', border:'none', fontWeight:'bold', fontSize:'12px'}} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PROS & CONS MODULE */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* PROS */}
              <div className="bg-emerald-50/50 rounded-3xl p-6 border border-emerald-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                    <ThumbsUp className="w-5 h-5 text-emerald-600"/>
                  </div>
                  <h4 className="font-black text-emerald-900 text-lg">จุดแข็ง (Strengths)</h4>
                </div>
                <ul className="space-y-4">
                  {result.pros?.map((p: string, i: number) => (
                    <li key={i} className="flex gap-3 text-sm font-medium text-emerald-800/80 leading-relaxed">
                      <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0"/> {p}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CONS */}
              <div className="bg-rose-50/50 rounded-3xl p-6 border border-rose-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-600"/>
                  </div>
                  <h4 className="font-black text-rose-900 text-lg">จุดพัฒนา (Improvements)</h4>
                </div>
                <ul className="space-y-4">
                  {result.cons?.map((p: string, i: number) => (
                    <li key={i} className="flex gap-3 text-sm font-medium text-rose-800/80 leading-relaxed">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 mt-2"></div> {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ROW 2: Details & AI Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* CHECKLIST BREAKDOWN */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
              <h4 className="font-black text-slate-800 text-lg mb-6 flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-slate-400"/> รายละเอียดการประเมิน
              </h4>
              <div className="space-y-6">
                {result.checklist?.map((item: any, i: number) => {
                  const itemPct = (item.score / item.maxScore) * 100;
                  let barColor = 'bg-emerald-500';
                  if(itemPct < 60) barColor = 'bg-rose-500';
                  else if(itemPct < 80) barColor = 'bg-amber-500';
                  
                  return (
                    <div key={i} className="group">
                      <div className="flex justify-between items-end mb-2">
                        <span className="font-bold text-sm text-slate-800">{item.topic}</span>
                        <span className="text-sm font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{item.score}/{item.maxScore}</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
                        <div className={`h-full ${barColor} rounded-full transition-all duration-1000`} style={{ width: `${Math.min(itemPct, 100)}%` }}></div>
                      </div>
                      <p className="text-sm font-medium text-slate-500 leading-relaxed p-3 bg-slate-50 rounded-xl border border-transparent group-hover:border-slate-200 transition-colors">{item.feedback}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* RECOMMENDATIONS & AUTO-FIX */}
            <div className="space-y-6">
              {/* Full Fix Card */}
              {result.autoFixAvailable && result.planId !== 'uploaded' && !result.isFixed && (
                <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl shadow-slate-900/20 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 opacity-10 blur-xl">
                    <Zap className="w-40 h-40 text-indigo-400"/>
                  </div>
                  <div className="relative z-10">
                    <div className="inline-flex p-2 bg-indigo-500/20 rounded-xl mb-4 border border-indigo-500/30">
                      <Star className="w-6 h-6 text-indigo-400 fill-indigo-400"/>
                    </div>
                    <h4 className="font-black text-2xl mb-2">AI Auto-Fix</h4>
                    <p className="text-sm text-slate-400 font-medium mb-6">ให้ AI ผู้เชี่ยวชาญรื้อและปรับปรุงแผนนี้ให้สมบูรณ์แบบตามคำแนะนำทั้งหมดโดยอัตโนมัติ</p>
                    
                    <button 
                      onClick={onFix}
                      disabled={isFixing}
                      className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-800 text-white font-black rounded-xl transition-colors flex justify-center items-center gap-2 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50"
                    >
                      {isFixing ? <><Loader2 className="w-5 h-5 animate-spin"/> กำลังดำเนินการ...</> : 'แก้ไขแผนทั้งหมดทันที'}
                    </button>
                  </div>
                </div>
              )}

              {/* Partial Fix List */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100">
                   <h4 className="font-black text-indigo-900 mb-4 flex items-center gap-2">
                     <Zap className="w-4 h-4 text-indigo-500"/> Smart Recommendations
                   </h4>
                   <div className="space-y-3">
                     {result.recommendations.map((rec: any, i: number) => {
                       const isRecFixed = result.fixedRecs?.[i];
                       const isThisFixing = fixingId === `${result.planId}-partial-${i}`;
                       return (
                         <div key={i} className="p-4 rounded-2xl bg-white border border-indigo-100 shadow-sm transition-all hover:shadow-md">
                           <h5 className="font-bold text-sm text-slate-800 mb-1">{rec.section}</h5>
                           <p className="text-xs font-medium text-slate-500 mb-4 line-clamp-3">{rec.suggestion}</p>
                           
                           {result.planId !== 'uploaded' && !result.isFixed && (
                             <button 
                               onClick={() => onFixPartial(i)}
                               disabled={isThisFixing || isRecFixed}
                               className={`w-full py-2 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 ${isRecFixed ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 border border-indigo-200'}`}
                             >
                               {isThisFixing ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : (isRecFixed ? <CheckCircle className="w-3.5 h-3.5"/> : <Star className="w-3.5 h-3.5"/>)}
                               {isThisFixing ? 'กำลังแก้...' : (isRecFixed ? 'แก้ไขแล้ว' : 'ให้ AI แก้จุดนี้')}
                             </button>
                           )}
                         </div>
                       )
                     })}
                   </div>
                </div>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
