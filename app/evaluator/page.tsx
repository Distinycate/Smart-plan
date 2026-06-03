'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, CheckCircle, AlertTriangle, Upload, Zap, Loader2, ArrowLeft,
  ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import * as mammoth from 'mammoth';

export default function EvaluatorPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set());
  const [fileText, setFileText] = useState<string | null>(null);
  
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState<any[]>([]);
  const [fixingPlanId, setFixingPlanId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'system' | 'upload'>('system');
  const [error, setError] = useState<string | null>(null);
  
  // Progress state for batch evaluation
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
    if (newSet.has(planId)) {
      newSet.delete(planId);
    } else {
      newSet.add(planId);
    }
    setSelectedPlanIds(newSet);
  };
  
  const selectAll = () => {
    if (selectedPlanIds.size === plans.length) {
      setSelectedPlanIds(new Set());
    } else {
      setSelectedPlanIds(new Set(plans.map(p => p.planId)));
    }
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
        
        // Loop sequentially to avoid server overload
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
            // Update state so users can see results as they come in
            setEvaluationResults([...newResults]);
          } catch (e: any) {
            console.error(`Error evaluating ${planId}:`, e);
            // Push a failed result placeholder
            newResults.push({
              planId,
              title: `พบข้อผิดพลาด: ${e.message}`,
              overallScore: 0,
              error: true
            });
            setEvaluationResults([...newResults]);
          }
        }
      } else {
        // Upload Tab
        if (!fileText) throw new Error("กรุณาอัปโหลดไฟล์ที่อ่านได้ก่อน");
        setBatchProgress({ current: 1, total: 1 });
        const evaluation = await evaluateSingle({ externalText: fileText });
        setEvaluationResults([{
          planId: 'uploaded',
          title: 'เอกสารอัปโหลด (DOCX)',
          ...evaluation
        }]);
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
        body: JSON.stringify({
          planData: result.originalPlanData,
          feedback: result
        })
      });
      
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      alert(`ปรับปรุงแผน ${result.title} สำเร็จ! ระบบได้สร้างแผนฉบับใหม่แล้ว`);
      // Update UI state to mark as fixed
      const newResults = [...evaluationResults];
      newResults[resultIndex].isFixed = true;
      setEvaluationResults(newResults);
      
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการ Auto-Fix');
    } finally {
      setFixingPlanId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f6] py-10 px-4 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="p-3 bg-white rounded-xl shadow-sm hover:bg-indigo-50 hover:text-indigo-600 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-2">
              <span className="p-2 bg-indigo-100 rounded-xl"><Zap className="w-6 h-6 text-indigo-600" /></span>
              ระบบตรวจแผนอัจฉริยะ (AI Evaluator)
            </h1>
            <p className="text-slate-500 mt-2 font-medium">ประเมินแผนการสอนอย่างมืออาชีพด้วยมาตรฐานสากล พร้อมคำแนะนำเชิงลึก</p>
          </div>
        </div>

        {/* INPUT SECTION */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-100">
            <button 
              className={`flex-1 py-5 text-center font-bold text-sm transition-all relative ${activeTab === 'system' ? 'text-indigo-700 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
              onClick={() => setActiveTab('system')}
            >
              ดึงแผนจากระบบ (Batch Supported)
              {activeTab === 'system' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600" />}
            </button>
            <button 
              className={`flex-1 py-5 text-center font-bold text-sm transition-all relative ${activeTab === 'upload' ? 'text-indigo-700 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
              onClick={() => setActiveTab('upload')}
            >
              อัปโหลดไฟล์ (DOCX)
              {activeTab === 'upload' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600" />}
            </button>
          </div>
          
          <div className="p-6 md:p-8">
            {activeTab === 'system' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-bold text-slate-800">เลือกแผนที่ต้องการตรวจ (ทีละแผนหรือหลายแผน)</label>
                  <button onClick={selectAll} className="text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg">
                    {selectedPlanIds.size === plans.length && plans.length > 0 ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2 pb-2 custom-scrollbar">
                  {plans.length === 0 ? (
                    <div className="col-span-full py-10 text-center text-slate-400 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      ไม่พบแผนในระบบ
                    </div>
                  ) : (
                    plans.map(p => {
                      const isSelected = selectedPlanIds.has(p.planId);
                      return (
                        <div 
                          key={p.planId} 
                          onClick={() => toggleSelectPlan(p.planId)}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50/50 shadow-md transform -translate-y-1' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                              {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-800 line-clamp-2 text-sm leading-tight mb-1.5">{p.lessonTopic || 'ไม่มีชื่อแผน'}</h3>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-500">{p.gradeLevel}</span>
                                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-500">{p.subjectName}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-3xl p-12 text-center hover:bg-indigo-50/60 transition-colors">
                  <input type="file" id="file-upload" className="hidden" accept=".docx" onChange={handleFileUpload} />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-indigo-500">
                      <Upload className="w-8 h-8" />
                    </div>
                    <span className="text-base font-bold text-indigo-700">คลิกเพื่ออัปโหลดไฟล์เอกสารแผนการสอน</span>
                    <span className="text-sm font-medium text-slate-500 mt-2">รองรับเฉพาะไฟล์ .docx</span>
                  </label>
                </div>
                {fileText && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0"><CheckCircle className="w-5 h-5"/></div>
                    <div>
                      <p className="text-sm font-bold text-emerald-800">อ่านไฟล์สำเร็จ!</p>
                      <p className="text-xs font-medium text-emerald-600 mt-0.5">ระบบพร้อมประเมินเอกสารของคุณแล้ว</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-sm font-medium flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-500"/> {error}
              </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
              <div className="text-sm font-bold text-slate-500">
                {activeTab === 'system' && `เลือกอยู่ ${selectedPlanIds.size} แผน`}
              </div>
              <button 
                onClick={startEvaluation}
                disabled={isEvaluating || (activeTab === 'system' ? selectedPlanIds.size === 0 : !fileText)}
                className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-2xl font-bold shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> 
                    {batchProgress.total > 1 ? `กำลังตรวจแผนที่ ${batchProgress.current} จาก ${batchProgress.total}...` : 'กำลังวิเคราะห์ AI...'}
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5"/> 
                    {selectedPlanIds.size > 1 ? `เริ่มประเมินทั้งหมด (${selectedPlanIds.size})` : 'เริ่มประเมิน'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* EVALUATION RESULTS */}
        {evaluationResults.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-black text-slate-800">รายงานผลการประเมิน</h2>
              <span className="px-3 py-1 bg-green-100 text-green-700 font-bold text-xs rounded-full">เสร็จสิ้น {evaluationResults.length} แผน</span>
            </div>
            
            {evaluationResults.map((result, index) => (
              <EvaluationResultCard 
                key={`${result.planId}-${index}`} 
                result={result} 
                index={index}
                onFix={() => startAutoFix(index)}
                isFixing={fixingPlanId === result.planId}
              />
            ))}
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{__html:`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}}/>
    </div>
  );
}

// ── COMPONENT: EvaluationResultCard (Accordion style professional dashboard) ──
function EvaluationResultCard({ result, index, onFix, isFixing }: { result: any, index: number, onFix: () => void, isFixing: boolean }) {
  const [isOpen, setIsOpen] = useState(index === 0); // Open first one by default
  
  if (result.error) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-red-200 overflow-hidden">
        <div className="p-6 bg-red-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5"/></div>
             <h3 className="font-bold text-slate-800">{result.title}</h3>
          </div>
          <span className="text-red-600 text-sm font-bold">ตรวจไม่สำเร็จ</span>
        </div>
      </div>
    );
  }

  const score = result.overallScore || 0;
  const maxScore = result.maxScore || 100;
  const percentage = (score / maxScore) * 100;
  
  let scoreColor = 'text-green-500';
  let bgScoreColor = 'bg-green-50';
  let strokeColor = '#10b981'; // green-500
  if (percentage < 60) {
    scoreColor = 'text-red-500'; bgScoreColor = 'bg-red-50'; strokeColor = '#ef4444';
  } else if (percentage < 80) {
    scoreColor = 'text-amber-500'; bgScoreColor = 'bg-amber-50'; strokeColor = '#f59e0b';
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
      {/* HEADER (Toggle) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Mini Gauge */}
          <div className="relative w-16 h-16 shrink-0">
             <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
               <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
               <path strokeDasharray={`${percentage}, 100`} strokeWidth="3" stroke={strokeColor} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
             </svg>
             <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-800">{score}</div>
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 line-clamp-1">{result.title}</h3>
            <p className="text-sm font-medium text-slate-500 mt-1 line-clamp-1">{result.summary}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {result.isFixed && <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1"><Zap className="w-3 h-3"/> AI Fixed</span>}
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
            {isOpen ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
          </div>
        </div>
      </button>

      {/* BODY (Expanded content) */}
      {isOpen && (
        <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/50">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT COL: Overview & Action */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Big Score Card */}
              <div className={`${bgScoreColor} rounded-3xl p-8 border border-white shadow-sm relative overflow-hidden`}>
                <div className="absolute -right-6 -top-6 opacity-10">
                  <Zap className={`w-32 h-32 ${scoreColor}`}/>
                </div>
                <p className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">Overall Score</p>
                <div className="flex items-end gap-2 mb-4">
                  <span className={`text-6xl font-black ${scoreColor} leading-none tracking-tight`}>{score}</span>
                  <span className="text-xl font-bold text-slate-400 mb-1">/ {maxScore}</span>
                </div>
                <p className="text-sm font-medium text-slate-700 leading-relaxed">{result.summary}</p>
              </div>

              {/* Auto Fix Box */}
              {result.autoFixAvailable && result.planId !== 'uploaded' && !result.isFixed && (
                <div className="bg-slate-800 text-white rounded-3xl p-6 shadow-xl border border-slate-700">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 bg-indigo-500/20 rounded-xl"><Zap className="w-5 h-5 text-indigo-400"/></div>
                    <div>
                      <h4 className="font-bold text-lg">AI Auto-Fix</h4>
                      <p className="text-sm text-slate-400 font-medium mt-1">อัปเกรดแผนนี้ให้สมบูรณ์แบบโดยอัตโนมัติตามคำแนะนำ</p>
                    </div>
                  </div>
                  <button 
                    onClick={onFix}
                    disabled={isFixing}
                    className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 text-white font-bold rounded-xl transition-colors flex justify-center items-center gap-2"
                  >
                    {isFixing ? <><Loader2 className="w-5 h-5 animate-spin"/> กำลังดำเนินการ...</> : 'แก้ไขแผนนี้อัตโนมัติ'}
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT COL: Pros/Cons & Checklist */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Pros / Cons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border-2 border-emerald-100 rounded-3xl p-6 shadow-sm">
                  <h4 className="font-bold text-emerald-800 flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-emerald-100 rounded-lg"><CheckCircle className="w-4 h-4 text-emerald-600"/></div>
                    จุดแข็ง (Pros)
                  </h4>
                  <ul className="space-y-3">
                    {result.pros?.map((p: string, i: number) => (
                      <li key={i} className="flex gap-3 text-sm font-medium text-slate-600"><span className="text-emerald-500 shrink-0 mt-0.5">•</span> {p}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-white border-2 border-rose-100 rounded-3xl p-6 shadow-sm">
                  <h4 className="font-bold text-rose-800 flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-rose-100 rounded-lg"><AlertTriangle className="w-4 h-4 text-rose-600"/></div>
                    จุดที่ต้องพัฒนา (Cons)
                  </h4>
                  <ul className="space-y-3">
                    {result.cons?.map((p: string, i: number) => (
                      <li key={i} className="flex gap-3 text-sm font-medium text-slate-600"><span className="text-rose-500 shrink-0 mt-0.5">•</span> {p}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Checklist Progress */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h4 className="font-black text-slate-800 mb-6">รายละเอียดคะแนนรายหัวข้อ</h4>
                <div className="space-y-6">
                  {result.checklist?.map((item: any, i: number) => {
                    const itemPct = (item.score / item.maxScore) * 100;
                    let barColor = 'bg-emerald-500';
                    if(itemPct < 60) barColor = 'bg-rose-500';
                    else if(itemPct < 80) barColor = 'bg-amber-500';
                    
                    return (
                      <div key={i}>
                        <div className="flex justify-between items-end mb-2">
                          <span className="font-bold text-sm text-slate-700">{item.topic}</span>
                          <span className="text-xs font-black text-slate-400">{item.score}/{item.maxScore}</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                          <div className={`h-full ${barColor} rounded-full`} style={{ width: `${Math.min(itemPct, 100)}%` }}></div>
                        </div>
                        <p className="text-xs font-medium text-slate-500 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">{item.feedback}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                   <h4 className="font-black text-slate-800 mb-4">คำแนะนำเพิ่มเติม (Recommendations)</h4>
                   <div className="space-y-4">
                     {result.recommendations.map((rec: any, i: number) => (
                       <div key={i} className="flex gap-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                         <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-xs">{i+1}</div>
                         <div>
                           <h5 className="font-bold text-sm text-indigo-900 mb-1">{rec.section}</h5>
                           <p className="text-sm font-medium text-indigo-700/80">{rec.suggestion}</p>
                         </div>
                       </div>
                     ))}
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
