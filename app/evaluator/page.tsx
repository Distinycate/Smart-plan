'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, AlertTriangle, Upload, Zap, Loader2, ArrowLeft,
  ChevronDown, ChevronUp, BarChart2, Star, ThumbsUp, Layers, ListChecks
} from 'lucide-react';
import Link from 'next/link';
import * as mammoth from 'mammoth';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

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
    <div className="min-h-screen bg-slate-50 py-12 px-4 font-sans text-slate-800 relative overflow-hidden">
      {/* Background Ambient Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-300/30 blur-[120px] mix-blend-multiply pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-fuchsia-300/30 blur-[120px] mix-blend-multiply pointer-events-none"></div>
      
      <div className="max-w-[1200px] mx-auto space-y-10 relative z-10">
        
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
        <div className="bg-white/60 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-white/80 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex border-b border-white/50 bg-white/20">
            <button 
              className={`flex-1 py-5 text-center font-bold text-sm transition-all relative ${activeTab === 'system' ? 'text-indigo-700 bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)]' : 'text-slate-500 hover:bg-slate-100'}`}
              onClick={() => setActiveTab('system')}
            >
              ดึงแผนจากระบบ (Batch Evaluation)
              {activeTab === 'system' && <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />}
            </button>
            <button 
              className={`flex-1 py-5 text-center font-bold text-sm transition-all relative ${activeTab === 'upload' ? 'text-indigo-700 bg-white/80 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)]' : 'text-slate-500 hover:bg-white/40'}`}
              onClick={() => setActiveTab('upload')}
            >
              อัปโหลดไฟล์ (DOCX)
              {activeTab === 'upload' && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500" />}
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
                  <button onClick={selectAll} className="text-sm font-bold text-indigo-700 hover:text-white bg-indigo-50/80 hover:bg-indigo-600 px-4 py-2 rounded-xl transition-colors border border-indigo-100/50 hover:border-transparent backdrop-blur-md">
                    {selectedPlanIds.size === plans.length && plans.length > 0 ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                  </button>
                </div>
                
                <div className="bg-white/40 backdrop-blur-lg rounded-2xl border border-white/60 overflow-hidden shadow-inner">
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
                              className={`group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-white/90 border-indigo-300 shadow-md transform scale-[1.01]' : 'bg-transparent border-transparent hover:bg-white/60 hover:border-white/80 hover:shadow-sm'}`}
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
                className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white rounded-2xl font-black text-sm shadow-[0_8px_20px_rgb(0,0,0,0.15)] hover:shadow-[0_12px_25px_rgb(0,0,0,0.25)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 relative overflow-hidden group"
              >
                {isEvaluating && <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse bg-[length:200%_auto]"></div>}
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
        </div>

        {/* EVALUATION RESULTS */}
        {evaluationResults.length > 0 && (
          <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center gap-4 mb-4 pl-2">
              <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-fuchsia-500 rounded-full"></div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">รายงานผลวิเคราะห์ (Analytics Dashboard)</h2>
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

// ── COMPONENT: EvaluationResultCard (International Standard Dashboard) ──
function EvaluationResultCard({ result, index, onFix, onFixPartial, isFixing, fixingId }: { result: any, index: number, onFix: () => void, onFixPartial: (recIndex: number) => void, isFixing: boolean, fixingId: string | null }) {
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
    <div className={`bg-white/70 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border ${isOpen ? theme.border : 'border-white/60 hover:border-indigo-200/50'} overflow-hidden transition-all duration-500 relative group`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent pointer-events-none opacity-50"></div>
      {/* ACCORDION HEADER */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 text-left transition-colors relative z-10 ${isOpen ? theme.bgLight + '/50' : ''}`}
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
        <div className="p-6 md:p-8 bg-white/50 border-t border-white/50 relative z-10">
          
          {/* ROW 1: Charts & Pros/Cons */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            
            {/* RADAR CHART MODULE */}
            <div className="bg-white/80 rounded-3xl p-6 border border-white flex flex-col shadow-sm hover:shadow-md transition-shadow">
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
              <div className="bg-gradient-to-br from-emerald-50/80 to-emerald-100/30 backdrop-blur-sm rounded-3xl p-6 border border-emerald-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100/80 rounded-xl flex items-center justify-center shrink-0">
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
              <div className="bg-gradient-to-br from-rose-50/80 to-rose-100/30 backdrop-blur-sm rounded-3xl p-6 border border-rose-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-rose-100/80 rounded-xl flex items-center justify-center shrink-0">
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
            <div className="lg:col-span-2 bg-white/80 rounded-3xl p-6 md:p-8 border border-white shadow-sm hover:shadow-md transition-shadow">
              <h4 className="font-black text-slate-800 text-lg mb-6 flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-indigo-400"/> รายละเอียดการประเมิน
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
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(79,70,229,0.3)] relative overflow-hidden group">
                  <div className="absolute -right-10 -top-10 opacity-20 blur-2xl group-hover:blur-3xl transition-all duration-700">
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
                      className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 disabled:from-slate-700 disabled:to-slate-800 text-white font-black rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5"
                    >
                      {isFixing ? <><Loader2 className="w-5 h-5 animate-spin"/> กำลังดำเนินการ...</> : 'แก้ไขแผนทั้งหมดทันที'}
                    </button>
                  </div>
                </div>
              )}

              {/* Partial Fix List */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="bg-white/60 backdrop-blur-md rounded-3xl p-6 border border-white shadow-sm">
                   <h4 className="font-black text-indigo-900 mb-4 flex items-center gap-2">
                     <Zap className="w-4 h-4 text-indigo-500"/> Smart Recommendations
                   </h4>
                   <div className="space-y-3">
                     {result.recommendations.map((rec: any, i: number) => {
                       const isRecFixed = result.fixedRecs?.[i];
                       const isThisFixing = fixingId === `${result.planId}-partial-${i}`;
                       return (
                         <div key={i} className="p-4 rounded-2xl bg-white/80 border border-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
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
