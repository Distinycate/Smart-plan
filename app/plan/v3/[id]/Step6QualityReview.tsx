'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { V3LessonGraph } from '@/lib/smartPlanV3/types';
import type { V3QualityIssue, V3DocumentReadiness, V3QualityRuleResult, V3QualitySummary } from '@/lib/smartPlanV3/quality/types';
import type { V3PaReadinessResult, V3PaItemResult } from '@/lib/smartPlanV3/pa/types';

interface Step6Props {
  planId: string;
  graph: V3LessonGraph;
  onBack: () => void;
  onGraphChanged?: () => void;
}

// ─────────────────────────────────────────────────────────────────
// Label helpers (no English enums shown to user — Requirements 6 & 11)
// ─────────────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  STRUCTURE: 'โครงสร้าง',
  ALIGNMENT: 'ความสอดคล้อง',
  ACTIVITY: 'กิจกรรมการเรียนรู้',
  ASSESSMENT: 'การวัดและประเมินผล',
  FEEDBACK: 'ข้อมูลย้อนกลับ',
  SUBJECT: 'ความเหมาะสมตามธรรมชาติวิชา',
  PACKAGE: 'ชุดพร้อมสอน',
  TIME: 'ความเป็นไปได้ในเวลา',
};

const SEVERITY_LABELS: Record<string, { label: string; cls: string; dotCls: string }> = {
  ERROR:   { label: 'ต้องแก้ก่อนส่งออก',  cls: 'bg-red-50 border-red-200',    dotCls: 'bg-red-500'    },
  WARNING: { label: 'ควรตรวจสอบ',          cls: 'bg-amber-50 border-amber-200', dotCls: 'bg-amber-500'  },
  INFO:    { label: 'ข้อเสนอแนะ',           cls: 'bg-blue-50 border-blue-200',  dotCls: 'bg-blue-500'   },
};

const PA_STATUS_LABELS: Record<string, { label: string; cls: string; iconCls: string }> = {
  EVIDENCED:           { label: 'มีหลักฐานในแผน',      cls: 'bg-emerald-50 border-emerald-200', iconCls: 'text-emerald-600' },
  PARTIALLY_EVIDENCED: { label: 'มีหลักฐานบางส่วน',   cls: 'bg-amber-50 border-amber-200',    iconCls: 'text-amber-600'  },
  NOT_EVIDENCED:       { label: 'ยังไม่พบหลักฐาน',    cls: 'bg-red-50 border-red-200',         iconCls: 'text-red-600'    },
  NOT_APPLICABLE:      { label: 'ไม่เกี่ยวข้องกับแผนนี้', cls: 'bg-slate-50 border-slate-200',    iconCls: 'text-slate-500'  },
};

const MAPPING_TYPE_LABELS: Record<string, string> = {
  DIRECT: 'เกณฑ์ทางการ',
  INTERPRETED: 'การตีความเชิงปฏิบัติของระบบตาม ว9/2564',
  SYSTEM_QUALITY_RULE: 'กฎคุณภาพระบบ',
};

type TabKey = 'overview' | 'alignment' | 'pa';

interface QualityData {
  planId: string;
  lessonHash: string;
  lessonStatus: string;
  qualitySummary: V3QualitySummary;
  ruleResult: V3QualityRuleResult;
  documentReadiness: V3DocumentReadiness;
  alignmentGraph: { orphans: any; edgeCount: number; nodeCount: number };
  cachedAiReview: {
    issues: V3QualityIssue[];
    reviewedAt: string;
    isStale: boolean;
    status: string;
  } | null;
  cachedPaReview: {
    result: V3PaReadinessResult;
    reviewedAt: string;
    isStale: boolean;
  } | null;
}

// ─────────────────────────────────────────────────────────────────
// Apply Fix Modal (Requirement 27 & 28: ดูคำแนะนำ → ดูข้อความเดิม → ดูข้อความเสนอ → นำไปใช้)
// ─────────────────────────────────────────────────────────────────
function ApplyFixModal({
  issue,
  planId,
  graph,
  onApplied,
  onClose,
}: {
  issue: V3QualityIssue;
  planId: string;
  graph: V3LessonGraph;
  onApplied: () => void;
  onClose: () => void;
}) {
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  // Extract original text from graph
  let originalText: string | null = null;
  if (issue.proposedChange?.field && issue.locationId) {
    if (issue.locationType === 'ACTIVITY') {
      const act = graph.activities.find(a => a.id === issue.locationId);
      if (act) originalText = (act as any)[issue.proposedChange.field] || null;
    } else if (issue.locationType === 'OBJECTIVE') {
      const obj = graph.objectives.find(o => o.id === issue.locationId);
      if (obj) originalText = (obj as any)[issue.proposedChange.field] || null;
    } else if (issue.locationType === 'ASSESSMENT') {
      const asm = graph.assessments.find(a => a.id === issue.locationId);
      if (asm) originalText = (asm as any)[issue.proposedChange.field] || null;
    } else if (issue.locationType === 'EVIDENCE') {
      const evd = graph.evidence.find(e => e.id === issue.locationId);
      if (evd) originalText = (evd as any)[issue.proposedChange.field] || null;
    }
  }

  const handleApply = async () => {
    if (!issue.proposedChange || !issue.locationId) return;
    setApplying(true);
    setError('');
    try {
      const res = await fetch(`/api/plan/v3/${planId}/quality/issues/${issue.code}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: issue.locationType,
          entityId: issue.locationId,
          field: issue.proposedChange.field,
          replacement: issue.proposedChange.replacement,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'เกิดข้อผิดพลาดในการนำข้อความไปใช้');
        return;
      }
      onApplied();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">พิจารณาข้อเสนอแนะเพื่อปรับปรุง</h3>
          <p className="text-sm text-slate-500 mt-0.5">{issue.title}</p>
        </div>

        {/* Step 1: ดูคำแนะนำ */}
        {issue.suggestion && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs font-semibold text-blue-800 mb-1">💡 คำแนะนำ:</p>
            <p className="text-sm text-blue-900">{issue.suggestion}</p>
          </div>
        )}

        {/* Step 2 & 3: เปรียบเทียบข้อความเดิม vs ข้อความเสนอ */}
        {issue.proposedChange && (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">
                ฟิลด์เป้าหมาย: <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{issue.proposedChange.field}</span>
              </p>
            </div>
            {originalText !== null && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">ข้อความเดิม:</p>
                <div className="text-sm bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {originalText || '(ว่าง)'}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-1">ข้อความที่เสนอให้นำไปใช้:</p>
              <div className="text-sm bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-900 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {issue.proposedChange.replacement}
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Actions: ทีละ Issue — นำไปใช้ หรือ คงของเดิม */}
        <div className="flex gap-3 pt-2">
          {issue.proposedChange && issue.locationId && (
            <button
              onClick={handleApply}
              disabled={applying}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl transition disabled:opacity-50"
            >
              {applying ? 'กำลังนำไปใช้...' : 'นำข้อความนี้ไปใช้'}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-xl transition"
          >
            คงของเดิม
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Issue Card
// ─────────────────────────────────────────────────────────────────
function IssueCard({
  issue,
  planId,
  graph,
  onFixed,
}: {
  issue: V3QualityIssue;
  planId: string;
  graph: V3LessonGraph;
  onFixed: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const sev = SEVERITY_LABELS[issue.severity] || SEVERITY_LABELS.INFO;

  const navigateToStep = () => {
    const stepMap: Record<string, number> = {
      LESSON: 1, INDICATOR: 1,
      OBJECTIVE: 2, EVIDENCE: 2,
      ACTIVITY: 3,
      ASSESSMENT: 4, ASSESSMENT_TOOL: 4,
      ASSET: 5,
    };
    const step = stepMap[issue.locationType] || 1;
    window.location.href = `/plan/v3/${planId}?step=${step}`;
  };

  return (
    <div className={`border rounded-xl p-4 ${sev.cls}`}>
      <div className="flex items-start gap-3">
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${sev.dotCls}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500">{CATEGORY_LABELS[issue.category] || issue.category}</span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">{sev.label}</span>
            {issue.source === 'AI' && (
              <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-medium">AI ตรวจเชิงคุณภาพ</span>
            )}
            <span className="text-xs font-mono text-slate-400 ml-auto">{issue.code}</span>
          </div>
          <p className="font-semibold text-slate-800 text-sm mt-1">{issue.title}</p>
          <p className="text-sm text-slate-600 mt-1">{issue.message}</p>
          {issue.evidence.length > 0 && (
            <ul className="mt-2 space-y-0.5 bg-white/60 rounded p-2 border border-slate-200/50">
              {issue.evidence.map((e, i) => (
                <li key={i} className="text-xs text-slate-600">• {e}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-3 mt-3 flex-wrap">
            {(issue.suggestion || issue.proposedChange) && (
              <button
                onClick={() => setShowModal(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
              >
                ดูคำแนะนำและข้อความเสนอ →
              </button>
            )}
            {issue.locationType !== 'LESSON' && (
              <button
                onClick={navigateToStep}
                className="text-xs font-semibold text-slate-600 hover:text-slate-800 underline underline-offset-2"
              >
                ไปแก้ไขในขั้นที่เกี่ยวข้อง →
              </button>
            )}
          </div>

          {/* Guided Choice Resolution Options for Quality Issues */}
          {(issue.category === 'ALIGNMENT' || issue.message.includes('หลักฐาน') || issue.title.includes('หลักฐาน')) && (
            <div className="mt-3 pt-2.5 border-t border-slate-200/70">
              <p className="text-xs font-semibold text-slate-700 mb-1.5">💡 ข้อเสนอแนะแนวทางแก้ไข:</p>
              <div className="flex gap-1.5 flex-wrap">
                <a
                  href={`/plan/v3/${planId}?step=2`}
                  className="text-xs px-2.5 py-1 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg font-medium transition"
                >
                  [การสังเกตการปฏิบัติ]
                </a>
                <a
                  href={`/plan/v3/${planId}?step=2`}
                  className="text-xs px-2.5 py-1 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg font-medium transition"
                >
                  [ผลงานนักเรียน / ชิ้นงาน]
                </a>
                <a
                  href={`/plan/v3/${planId}?step=2`}
                  className="text-xs px-2.5 py-1 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg font-medium transition"
                >
                  [Exit Ticket]
                </a>
                <a
                  href={`/plan/v3/${planId}?step=2`}
                  className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                >
                  [เลือกเองในขั้นที่ 2]
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
      {showModal && (
        <ApplyFixModal
          issue={issue}
          planId={planId}
          graph={graph}
          onApplied={onFixed}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PA Item Card (Planned Evidence Semantics)
// ─────────────────────────────────────────────────────────────────
function PaItemCard({ item }: { item: V3PaItemResult }) {
  const [open, setOpen] = useState(false);
  const meta = PA_STATUS_LABELS[item.status] || PA_STATUS_LABELS.NOT_EVIDENCED;
  const icons: Record<string, string> = {
    EVIDENCED: '✓',
    PARTIALLY_EVIDENCED: '◑',
    NOT_EVIDENCED: '○',
    NOT_APPLICABLE: '—',
  };

  return (
    <div className={`border rounded-xl p-4 ${meta.cls}`}>
      <button
        className="w-full flex items-start gap-3 text-left"
        onClick={() => setOpen(v => !v)}
      >
        <span className={`text-lg font-bold mt-0.5 flex-shrink-0 ${meta.iconCls}`}>{icons[item.status]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800 text-sm">{item.systemLabel}</p>
            {item.officialCode && (
              <span className="text-xs text-slate-400 bg-white/80 border border-slate-200 px-1.5 py-0.5 rounded">
                {item.officialCode}
              </span>
            )}
            <span className="text-xs text-slate-500 ml-auto">
              {MAPPING_TYPE_LABELS[item.mappingType] || item.mappingType}
            </span>
          </div>
          <p className={`text-xs font-semibold mt-1 ${meta.iconCls}`}>{meta.label}</p>
        </div>
        <span className="text-slate-400 text-sm ml-2">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3 ml-7 space-y-2.5 pt-2 border-t border-slate-200/60">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">ผลการวิเคราะห์:</p>
            <p className="text-xs text-slate-700 leading-relaxed">{item.reason}</p>
          </div>

          {item.evidenceRefs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">หลักฐานที่ตรวจพบในแผน:</p>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {item.evidenceRefs.map((r, i) => (
                  <span key={i} className="text-xs font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-indigo-700 font-semibold">
                    {r}
                  </span>
                ))}
              </div>
              {item.evidenceDetails && item.evidenceDetails.length > 0 && (
                <ul className="space-y-1">
                  {item.evidenceDetails.map((d, i) => (
                    <li key={i} className="text-xs text-slate-600">
                      • <span className="font-mono text-slate-400">[{d.entityRef}]</span> {d.description}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {item.gap && (
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-0.5">ส่วนที่ยังสามารถเพิ่มเติมได้:</p>
              <p className="text-xs text-slate-700">{item.gap}</p>
            </div>
          )}

          {item.suggestion && (
            <div>
              <p className="text-xs font-semibold text-indigo-700 mb-0.5">ข้อเสนอแนะในการออกแบบ:</p>
              <p className="text-xs text-slate-700">{item.suggestion}</p>
            </div>
          )}

          {item.isPlanPhaseOnly && (
            <p className="text-xs text-slate-400 italic">ประเมินจากการออกแบบแผนก่อนการจัดกิจกรรมการเรียนรู้เท่านั้น</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Component: Step6QualityReview (NO Gauge — Requirements 3, 4, 30)
// ─────────────────────────────────────────────────────────────────
export default function Step6QualityReview({ planId, graph, onBack, onGraphChanged }: Step6Props) {
  const [tab, setTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [qualityData, setQualityData] = useState<QualityData | null>(null);
  const [paData, setPaData] = useState<V3PaReadinessResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [paLoading, setPaLoading] = useState(false);
  const [error, setError] = useState('');

  // Precondition check
  const validStatuses = ['PACKAGE_READY', 'REVIEWED', 'FINAL', 'TAUGHT', 'REFLECTED'];
  const isReady = validStatuses.includes(graph.lesson.status);

  const loadQuality = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/plan/v3/${planId}/quality`);
      if (!res.ok) throw new Error('โหลดข้อมูลการตรวจสอบคุณภาพไม่สำเร็จ');
      const data = await res.json();
      setQualityData(data);
      if (data.lessonStatus !== graph.lesson.status) {
        onGraphChanged?.();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [planId, graph.lesson.status, onGraphChanged]);

  const loadPaReadiness = useCallback(async () => {
    setPaLoading(true);
    try {
      const res = await fetch(`/api/plan/v3/${planId}/pa-readiness`);
      if (!res.ok) throw new Error('โหลดผลการตรวจสอบองค์ประกอบ PA ไม่สำเร็จ');
      const data = await res.json();
      setPaData(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPaLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    if (isReady) {
      loadQuality();
    }
  }, [isReady, loadQuality]);

  const handleAiReview = async () => {
    setAiLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/plan/v3/${planId}/quality/review`, { method: 'POST' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'การตรวจคุณภาพเชิงลึกด้วย AI ล้มเหลว');
      }
      await loadQuality();
      onGraphChanged?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Precondition guard
  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 px-6">
        <div className="text-5xl">📦</div>
        <h2 className="text-2xl font-bold text-slate-800">ชุดพร้อมสอนยังไม่สมบูรณ์</h2>
        <p className="text-slate-600 max-w-md">
          กรุณาตรวจสอบสื่อและเครื่องมือที่จำเป็นในขั้นที่ 5 ก่อน
          เมื่อแผนอยู่ในสถานะ <strong>พร้อมสอน (PACKAGE_READY)</strong> จึงจะสามารถตรวจคุณภาพได้
        </p>
        <p className="text-sm text-slate-400">สถานะปัจจุบัน: {graph.lesson.status}</p>
        <button
          onClick={onBack}
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-xl transition"
        >
          ← กลับไปขั้นที่ 5
        </button>
      </div>
    );
  }

  const allIssues: V3QualityIssue[] = [
    ...(qualityData?.ruleResult?.issues || []),
    ...(qualityData?.cachedAiReview?.issues || []),
  ];
  const blockingIssues = allIssues.filter(i => i.isBlocking && i.severity === 'ERROR');
  const warningIssues = allIssues.filter(i => !i.isBlocking && i.severity === 'WARNING');
  const infoIssues = allIssues.filter(i => i.severity === 'INFO');

  const docReady = qualityData?.documentReadiness;
  const isDocumentReady = docReady?.ready || false;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">ขั้นที่ 6 — ตรวจคุณภาพและความสอดคล้อง</h2>
        <p className="text-slate-500 mt-1 text-sm">
          ด่านตรวจคุณภาพกลางของระบบเพื่อเตรียมความพร้อมสู่การจัดทำเอกสารและส่งออก
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {([
          ['overview', 'ภาพรวมความพร้อม'],
          ['alignment', 'ความสอดคล้องของโครงสร้าง'],
          ['pa', 'ความพร้อมตามองค์ประกอบที่ตรวจพบ'],
        ] as [TabKey, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              if (key === 'pa' && !paData && !paLoading) loadPaReadiness();
            }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
              tab === key ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* ── OVERVIEW TAB (No Score Gauge — Requirements 3, 4, 30) ── */}
          {tab === 'overview' && qualityData && (
            <div className="space-y-5">
              {/* Summary Cards: ต้องแก้ก่อนส่งออก / ควรตรวจสอบ / ข้อเสนอแนะ */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className={`rounded-xl border p-4 ${blockingIssues.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                  <p className="text-xs font-semibold text-slate-500">ต้องแก้ก่อนส่งออก</p>
                  <p className={`text-2xl font-bold mt-1 ${blockingIssues.length > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                    {blockingIssues.length}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {blockingIssues.length > 0 ? 'บล็อกการส่งออกเอกสาร' : 'ไม่มีข้อผิดพลาดที่บล็อก'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">ควรตรวจสอบ</p>
                  <p className="text-2xl font-bold mt-1 text-amber-600">{warningIssues.length}</p>
                  <p className="text-xs text-slate-400 mt-1">ข้อพึงระวัง (ไม่บล็อกการส่งออก)</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">ข้อเสนอแนะ</p>
                  <p className="text-2xl font-bold mt-1 text-blue-600">{infoIssues.length}</p>
                  <p className="text-xs text-slate-400 mt-1">แนวทางเพิ่มเติมเพื่อคุณภาพที่ดีขึ้น</p>
                </div>
              </div>

              {/* Status Checklist Cards (สถานะความพร้อมของแผน — Requirement 3 & 30) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <h3 className="font-bold text-slate-800 text-sm">สถานะความพร้อมของแผน</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    {
                      label: 'โครงสร้าง',
                      ok: qualityData.qualitySummary?.structuralReady ?? (qualityData.ruleResult.issues.filter(i => i.category === 'STRUCTURE' && i.isBlocking).length === 0),
                      issuesCount: qualityData.ruleResult.issues.filter(i => i.category === 'STRUCTURE').length,
                    },
                    {
                      label: 'ความสอดคล้อง',
                      ok: qualityData.ruleResult.issues.filter(i => i.category === 'ALIGNMENT' && i.isBlocking).length === 0,
                      issuesCount: qualityData.ruleResult.issues.filter(i => i.category === 'ALIGNMENT').length,
                    },
                    {
                      label: 'กิจกรรม',
                      ok: qualityData.ruleResult.issues.filter(i => (i.category === 'ACTIVITY' || i.category === 'TIME') && i.isBlocking).length === 0,
                      issuesCount: qualityData.ruleResult.issues.filter(i => i.category === 'ACTIVITY' || i.category === 'TIME').length,
                    },
                    {
                      label: 'การประเมิน',
                      ok: qualityData.qualitySummary?.assessmentReady ?? (docReady?.checklist.assessmentReady || false),
                      issuesCount: qualityData.ruleResult.issues.filter(i => i.category === 'ASSESSMENT').length,
                    },
                    {
                      label: 'ชุดพร้อมสอน',
                      ok: qualityData.qualitySummary?.packageReady ?? ((docReady?.checklist.packageReady && docReady?.checklist.noStaleRequiredAssets) || false),
                      issuesCount: qualityData.ruleResult.issues.filter(i => i.category === 'PACKAGE').length,
                    },
                  ].map(({ label, ok, issuesCount }) => (
                    <div
                      key={label}
                      className={`rounded-lg border p-3 text-center ${
                        ok ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800' : 'bg-amber-50/60 border-amber-200 text-amber-800'
                      }`}
                    >
                      <p className="text-xs font-semibold text-slate-600">{label}</p>
                      <p className={`text-sm font-bold mt-1 ${ok ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {ok ? '✓ พร้อม' : `ควรตรวจ ${issuesCount} จุด`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Document Readiness Banner */}
              {isDocumentReady ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-bold text-emerald-800">แผนผ่านเกณฑ์ความพร้อมสำหรับการจัดทำเอกสาร (REVIEWED)</p>
                    <p className="text-sm text-emerald-700">ไม่มีข้อผิดพลาดที่บล็อกการส่งออก สามารถดำเนินการในขั้นถัดไปได้</p>
                  </div>
                </div>
              ) : docReady && docReady.blockingConditions.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="font-bold text-red-800 mb-2">ยังไม่สามารถส่งออกเอกสารได้ (มีเงื่อนไขที่ต้องแก้ไขก่อน):</p>
                  <ul className="space-y-1">
                    {docReady.blockingConditions.map((c, i) => (
                      <li key={i} className="text-sm text-red-700">• {c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Qualitative Review Section (Issue-only, no score — Requirement 24 & 25) */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="font-bold text-slate-800">ตรวจคุณภาพเชิงลึก (AI Qualitative Review)</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      วิเคราะห์ความสอดคล้องเชิงความหมาย คุณภาพกิจกรรม และความสมเหตุสมผล (ไม่ให้คะแนนหรือตัดสินวิทยฐานะ)
                    </p>
                    {qualityData.cachedAiReview && (
                      <p className={`text-xs mt-1.5 ${qualityData.cachedAiReview.isStale ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                        {qualityData.cachedAiReview.isStale
                          ? '⚠ แผนมีการแก้ไขหลังจากตรวจ AI ครั้งก่อนหน้า ผลตรวจเดิมกลายเป็น Stale กรุณากดตรวจใหม่'
                          : `ผลตรวจล่าสุดเมื่อ ${new Date(qualityData.cachedAiReview.reviewedAt).toLocaleString('th-TH')}`}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleAiReview}
                    disabled={aiLoading}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-5 rounded-xl transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {aiLoading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
                    {aiLoading ? 'กำลังตรวจเชิงลึก...' : '🔍 ตรวจคุณภาพเชิงลึกด้วย AI'}
                  </button>
                </div>
              </div>

              {/* Blocking Issues */}
              {blockingIssues.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-red-700">ต้องแก้ก่อนส่งออก ({blockingIssues.length})</h3>
                  {blockingIssues.map((issue, i) => (
                    <IssueCard key={i} issue={issue} planId={planId} graph={graph} onFixed={loadQuality} />
                  ))}
                </div>
              )}

              {/* Warnings */}
              {warningIssues.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-amber-700">ควรตรวจสอบ ({warningIssues.length})</h3>
                  {warningIssues.map((issue, i) => (
                    <IssueCard key={i} issue={issue} planId={planId} graph={graph} onFixed={loadQuality} />
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {infoIssues.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-blue-700">ข้อเสนอแนะ ({infoIssues.length})</h3>
                  {infoIssues.map((issue, i) => (
                    <IssueCard key={i} issue={issue} planId={planId} graph={graph} onFixed={loadQuality} />
                  ))}
                </div>
              )}

              {allIssues.length === 0 && !loading && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="font-bold text-emerald-800">ไม่พบประเด็นที่ต้องปรับปรุง</p>
                  <p className="text-sm text-emerald-700 mt-1">แผนการเรียนรู้ผ่านการตรวจสอบทุกด้านตามมาตรฐาน</p>
                </div>
              )}
            </div>
          )}

          {/* ── ALIGNMENT TAB ─────────────────────────────────────── */}
          {tab === 'alignment' && qualityData && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-slate-800 mb-2">สรุปโครงสร้างความเชื่อมโยงของแผน</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <p className="text-xs text-slate-500">องค์ประกอบในกราฟ (Nodes)</p>
                    <p className="text-xl font-bold text-slate-800">{qualityData.alignmentGraph.nodeCount}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <p className="text-xs text-slate-500">เส้นความสัมพันธ์ (Edges)</p>
                    <p className="text-xl font-bold text-slate-800">{qualityData.alignmentGraph.edgeCount}</p>
                  </div>
                </div>
              </div>

              {/* Orphan detection */}
              {qualityData.alignmentGraph.orphans && (() => {
                const orphans = qualityData.alignmentGraph.orphans;
                const hasOrphans = Object.values(orphans).some((v: any) => Array.isArray(v) && v.length > 0);
                return hasOrphans ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                    <h4 className="font-semibold text-amber-800">พบรายการที่ยังไม่เชื่อมโยงครบวงจร:</h4>
                    {orphans.objectivesWithoutEvidence?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm text-amber-700">• จุดประสงค์ไม่มีหลักฐาน: {orphans.objectivesWithoutEvidence.join(', ')}</p>
                        <div className="flex gap-1.5 flex-wrap items-center mt-1">
                          <span className="text-xs text-amber-900 font-semibold">ข้อเสนอ:</span>
                          <a href={`/plan/v3/${planId}?step=2`} className="text-xs bg-white hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-amber-900 font-medium">[การสังเกตการปฏิบัติ]</a>
                          <a href={`/plan/v3/${planId}?step=2`} className="text-xs bg-white hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-amber-900 font-medium">[ผลงานนักเรียน]</a>
                          <a href={`/plan/v3/${planId}?step=2`} className="text-xs bg-white hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-amber-900 font-medium">[Exit Ticket]</a>
                          <a href={`/plan/v3/${planId}?step=2`} className="text-xs bg-amber-200/80 hover:bg-amber-200 border border-amber-400 px-2 py-0.5 rounded text-amber-900 font-medium">[เลือกเอง]</a>
                        </div>
                      </div>
                    )}
                    {orphans.evidenceWithoutActivity?.length > 0 && (
                      <p className="text-sm text-amber-700">• หลักฐานไม่มีกิจกรรม: {orphans.evidenceWithoutActivity.join(', ')}</p>
                    )}
                    {orphans.evidenceWithoutAssessment?.length > 0 && (
                      <p className="text-sm text-amber-700">• หลักฐานไม่มีการประเมิน: {orphans.evidenceWithoutAssessment.join(', ')}</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                    <p className="font-bold text-emerald-800">✓ โครงสร้างความสอดคล้องครบถ้วน</p>
                    <p className="text-sm text-emerald-700 mt-1">ทุก Objective, Evidence, Activity และ Assessment มีความเชื่อมโยงสอดคล้องกัน</p>
                  </div>
                );
              })()}

              {/* Alignment issues */}
              {(() => {
                const alignIssues = allIssues.filter(i => i.category === 'ALIGNMENT');
                return alignIssues.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="font-bold text-slate-700">ประเด็นความสอดคล้อง ({alignIssues.length})</h3>
                    {alignIssues.map((issue, i) => (
                      <IssueCard key={i} issue={issue} planId={planId} graph={graph} onFixed={loadQuality} />
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* ── PA TAB (Requirements 5, 6, 17, 18, 31, 32) ────────── */}
          {tab === 'pa' && (
            <div className="space-y-4">
              {paLoading && (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
                </div>
              )}

              {!paLoading && !paData && (
                <div className="text-center py-10 space-y-3 bg-white border border-slate-200 rounded-xl p-6">
                  <p className="text-slate-600">กดปุ่มเพื่อตรวจสอบองค์ประกอบความพร้อมตามแนวทาง ว.PA</p>
                  <button
                    onClick={loadPaReadiness}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-xl transition"
                  >
                    ตรวจสอบความพร้อมตามองค์ประกอบที่ตรวจพบ
                  </button>
                </div>
              )}

              {paData && (
                <>
                  {/* Mandatory Disclaimer (Requirement 32) */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs text-blue-800 font-medium leading-relaxed">
                      📢 {paData.planPhaseDisclaimer}
                    </p>
                  </div>

                  {/* Criteria version display (Requirement 18) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                    <p className="text-xs text-slate-500">
                      เกณฑ์อ้างอิง: <span className="font-semibold text-slate-800">{paData.criteriaVersion?.label || 'เกณฑ์การประเมินตำแหน่งและวิทยฐานะข้าราชการครู (ว9/2564)'}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      ฐานเอกสาร: <span className="text-slate-700">ว9/2564 และเอกสารแก้ไขเพิ่มเติมที่เกี่ยวข้อง</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      ตรวจสอบข้อมูลเกณฑ์ล่าสุดเมื่อ: {paData.criteriaVersion?.checkedAsOf || '2026-09-29'}
                    </p>
                  </div>

                  {/* PA Summary (Requirement 17: มีหลักฐานในแผน / มีหลักฐานบางส่วน / ยังไม่พบหลักฐาน) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-emerald-600">{paData.summary.evidenced}</p>
                      <p className="text-xs text-slate-500 mt-0.5">มีหลักฐานในแผน</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-amber-600">{paData.summary.partiallyEvidenced}</p>
                      <p className="text-xs text-slate-500 mt-0.5">มีหลักฐานบางส่วน</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-red-600">{paData.summary.notEvidenced}</p>
                      <p className="text-xs text-slate-500 mt-0.5">ยังไม่พบหลักฐาน</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-slate-500">{paData.summary.notApplicable}</p>
                      <p className="text-xs text-slate-500 mt-0.5">ไม่เกี่ยวข้องกับแผนนี้</p>
                    </div>
                  </div>

                  {/* PA Items List */}
                  <div className="space-y-2.5">
                    <h3 className="font-bold text-slate-700 text-sm">รายละเอียดความพร้อมตามองค์ประกอบที่ตรวจพบ ({paData.items.length} รายการ)</h3>
                    {paData.items.map(item => (
                      <PaItemCard key={item.criterionId} item={item} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Navigation footer */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-200">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 font-semibold transition text-sm"
        >
          ← ขั้นที่ 5 (ชุดพร้อมสอน)
        </button>
        {isDocumentReady ? (
          <div className="flex items-center gap-2.5">
            <Link
              href={`/plan/v3/${planId}/preview`}
              className="v3-btn v3-btn-secondary text-xs"
              title="ดูเอกสารฉบับพิมพ์ A4"
            >
              ดูตัวอย่าง A4
            </Link>
            <Link
              href={`/plan/v3/${planId}?step=7`}
              className="v3-btn v3-btn-primary text-xs shadow-sm"
            >
              <span>ไปขั้นที่ 7 — จัดเตรียมเอกสารและพิมพ์ →</span>
            </Link>
          </div>
        ) : (
          <div className="text-xs text-amber-600 font-medium bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
            แก้ไขข้อผิดพลาดเพื่อปลดล็อกขั้นที่ 7
          </div>
        )}
      </div>
    </div>
  );
}
