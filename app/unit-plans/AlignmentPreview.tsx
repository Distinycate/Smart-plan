'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, SearchCheck, Sparkles } from 'lucide-react';
import { queuedAiFetch } from '@/lib/aiQueueClient';

const dimensionLabels: Record<string, string> = {
  indicatorAlignment: 'ตัวชี้วัด',
  objectiveQuality: 'ผลลัพธ์/จุดประสงค์',
  activityAlignment: 'กิจกรรม/ลำดับรายคาบ',
  assessmentAlignment: 'การประเมิน',
  rubricQuality: 'Rubric/เกณฑ์',
  feasibility: 'ความเป็นไปได้',
  languageClarity: 'ความชัดเจนของภาษา',
  teacherReadiness: 'ความพร้อมใช้งาน',
};

export default function AlignmentPreview({ unitPlanId }: { unitPlanId: string }) {
  const [loading, setLoading] = useState(false);
  const [queueText, setQueueText] = useState('');
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);

  const runCheck = async () => {
    setLoading(true);
    setError('');
    setQueueText('กำลังจองคิว AI...');
    try {
      const response = await queuedAiFetch(
        '/api/alignment-check',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'unitPlan', scopeId: unitPlanId }),
        },
        status => setQueueText(
          status.status === 'processing'
            ? 'กำลังวิเคราะห์ความสอดคล้อง...'
            : `กำลังรอคิว ลำดับที่ ${status.position}`
        )
      );
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'ตรวจไม่สำเร็จ');
      setAnalysis(result.data);
    } catch (checkError: any) {
      setError(checkError.message || 'ไม่สามารถตรวจความสอดคล้องได้');
    } finally {
      setLoading(false);
      setQueueText('');
    }
  };

  const result = analysis?.result;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-black text-indigo-900"><Sparkles size={18} /> AI Alignment Preview</p>
            <p className="mt-1 text-sm text-indigo-700">AI วิเคราะห์และบันทึกประวัติเท่านั้น ไม่มีการแก้ข้อมูลครูอัตโนมัติ</p>
          </div>
          <button type="button" onClick={runCheck} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={17} /> : <SearchCheck size={17} />}
            ตรวจความสอดคล้อง
          </button>
        </div>
        {queueText && <p className="mt-3 text-sm font-bold text-indigo-700">{queueText}</p>}
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 font-bold text-red-700">{error}</div>}

      {result && (
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-8 border-indigo-100 text-3xl font-black text-indigo-700">{result.overallScore}</div>
            <div>
              <p className="text-sm font-bold text-slate-500">คะแนนรวม</p>
              <p className="text-2xl font-black text-slate-900">{result.level || 'ผลการวิเคราะห์'}</p>
              <p className="text-xs text-slate-400">History: {analysis.aiHistoryId}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(result.dimensionScores || {}).map(([key, score]) => (
              <div key={key} className="rounded-lg bg-slate-50 p-3">
                <div className="flex justify-between text-sm"><span className="font-bold text-slate-700">{dimensionLabels[key] || key}</span><strong>{String(score)}</strong></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-indigo-500" style={{ width: `${Number(score)}%` }} /></div>
              </div>
            ))}
          </div>

          <ResultList title="จุดแข็ง" items={result.strengths} tone="success" />
          <ResultList title="จุดที่ควรปรับปรุง" items={result.weaknesses} tone="warning" />
          <ResultList title="ประเด็นสำคัญ" items={result.criticalIssues} tone="danger" />
          <ResultList title="ข้อเสนอแนะ" items={result.suggestions} tone="info" />
          <ResultList title="คำเตือน" items={result.warnings} tone="warning" />

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mr-2 inline" size={16} />
            ผลนี้เป็นข้อเสนอแนะฉบับ preview ครูต้องพิจารณาเอง ระบบยังไม่มีการ Apply ลงแผน
          </div>
        </div>
      )}
    </div>
  );
}

function ResultList({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (!items?.length) return null;
  const colors: Record<string, string> = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border-red-200 bg-red-50 text-red-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  };
  return (
    <div className={`rounded-lg border p-3 ${colors[tone] || colors.info}`}>
      <p className="mb-2 flex items-center gap-2 font-black"><CheckCircle2 size={16} /> {title}</p>
      <ul className="list-disc space-y-1 pl-5 text-sm">{items.map((item, index) => <li key={index}>{item}</li>)}</ul>
    </div>
  );
}

