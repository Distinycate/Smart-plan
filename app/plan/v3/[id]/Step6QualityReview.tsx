'use client';

import { useState, useEffect, useCallback } from 'react';
import type { V3LessonGraph } from '@/lib/smartPlanV3/types';
import type { V3QualityIssue, V3DocumentReadiness, V3QualityRuleResult } from '@/lib/smartPlanV3/quality/types';
import type { V3PaReadinessResult, V3PaItemResult } from '@/lib/smartPlanV3/pa/types';

interface Step6Props {
  planId: string;
  graph: V3LessonGraph;
  onBack: () => void;
  onGraphChanged?: () => void;
}

// ─────────────────────────────────────────────────────────────────
// Label helpers (no English enums shown to user)
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
  NOT_EVIDENCED:       { label: 'ยังไม่มีหลักฐาน',    cls: 'bg-red-50 border-red-200',         iconCls: 'text-red-600'    },
  NOT_APPLICABLE:      { label: 'ประเมินหลังสอน',      cls: 'bg-slate-50 border-slate-200',    iconCls: 'text-slate-500'  },
};

const PA_DOMAIN_LABELS: Record<string, string> = {
  LEARNING_MANAGEMENT: 'ด้านการจัดการเรียนรู้',
  LEARNER_OUTCOMES:    'ด้านผลลัพธ์ของผู้เรียน',
};

type TabKey = 'overview' | 'alignment' | 'pa';

interface QualityData {
  planId: string;
  lessonHash: string;
  lessonStatus: string;
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
// Apply Fix Modal
// ─────────────────────────────────────────────────────────────────
function ApplyFixModal({
  issue,
  planId,
  onApplied,
  onClose,
}: {
  issue: V3QualityIssue;
  planId: string;
  onApplied: () => void;
  onClose: () => void;
}) {
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

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
        setError(d.error || 'เกิดข้อผิดพลาด');
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
        <h3 className="text-lg font-bold text-slate-800">ดูข้อเสนอแนะ</h3>
        <p className="text-sm text-slate-600">{issue.title}</p>
        {issue.proposedChange && (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">ฟิลด์ที่แนะนำให้เปลี่ยน:</p>
              <p className="text-sm font-mono bg-slate-100 rounded px-3 py-2">{issue.proposedChange.field}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">ข้อความที่เสนอ:</p>
              <p className="text-sm bg-emerald-50 border border-emerald-200 rounded px-3 py-2 whitespace-pre-wrap">{issue.proposedChange.replacement}</p>
            </div>
          </div>
        )}
        {!issue.proposedChange && (
          <p className="text-sm text-slate-600 bg-slate-50 rounded p-3">{issue.suggestion}</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          {issue.proposedChange && issue.locationId && (
            <button
              onClick={handleApply}
              disabled={applying}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl transition disabled:opacity-50"
            >
              {applying ? 'กำลังนำไปใช้...' : 'ใช้ข้อความนี้'}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2 px-4 rounded-xl transition"
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
  onFixed,
}: {
  issue: V3QualityIssue;
  planId: string;
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
    const url = window.location.pathname.replace(/\/[^\/]*$/, `/step/${step}`);
    window.location.href = url;
  };

  return (
    <div className={`border rounded-xl p-4 ${sev.cls}`}>
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${sev.dotCls}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500">{CATEGORY_LABELS[issue.category] || issue.category}</span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-400">{sev.label}</span>
            {issue.source === 'AI' && (
              <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">AI</span>
            )}
            <span className="text-xs font-mono text-slate-300 ml-auto">{issue.code}</span>
          </div>
          <p className="font-semibold text-slate-800 text-sm mt-1">{issue.title}</p>
          <p className="text-sm text-slate-600 mt-1">{issue.message}</p>
          {issue.evidence.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {issue.evidence.map((e, i) => (
                <li key={i} className="text-xs text-slate-500">• {e}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-2 mt-3 flex-wrap">
            {(issue.suggestion || issue.proposedChange) && (
              <button
                onClick={() => setShowModal(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
              >
                ดูคำแนะนำ →
              </button>
            )}
            {issue.locationType !== 'LESSON' && (
              <button
                onClick={navigateToStep}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline underline-offset-2"
              >
                ไปแก้ไข →
              </button>
            )}
          </div>
        </div>
      </div>
      {showModal && (
        <ApplyFixModal
          issue={issue}
          planId={planId}
          onApplied={onFixed}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PA Item Card
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
          <p className="font-semibold text-slate-800 text-sm">{item.labelTh}</p>
          <p className={`text-xs font-semibold mt-0.5 ${meta.iconCls}`}>{meta.label}</p>
        </div>
        <span className="text-slate-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3 ml-8 space-y-2">
          {item.evidenceRefs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">พบใน:</p>
              <ul className="space-y-0.5">
                {item.evidenceRefs.map((r, i) => (
                  <li key={i} className="text-xs text-slate-700">
                    <span className="font-mono text-slate-400 mr-1">[{r.entityRef}]</span>
                    {r.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {item.gap && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">ยังขาด:</p>
              <p className="text-xs text-slate-700">{item.gap}</p>
            </div>
          )}
          {item.suggestion && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">ข้อเสนอแนะ:</p>
              <p className="text-xs text-slate-700">{item.suggestion}</p>
            </div>
          )}
          {item.isPlanPhaseOnly && (
            <p className="text-xs text-slate-400 italic">ประเมินจากการออกแบบแผนก่อนสอนเท่านั้น</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────
export default function Step6QualityReview({ planId, graph, onBack, onGraphChanged }: Step6Props) {
  const [tab, setTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [qualityData, setQualityData] = useState<QualityData | null>(null);
  const [paData, setPaData] = useState<(V3PaReadinessResult & { criteriaVersionMeta?: any }) | null>(null);
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
      if (!res.ok) throw new Error('โหลดข้อมูลล้มเหลว');
      const data = await res.json();
      setQualityData(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  const loadPaReadiness = useCallback(async () => {
    setPaLoading(true);
    try {
      const res = await fetch(`/api/plan/v3/${planId}/pa-readiness`);
      if (!res.ok) throw new Error('โหลดผล PA ล้มเหลว');
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
        throw new Error(d.error || 'AI Review ล้มเหลว');
      }
      await loadQuality();
      onGraphChanged?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  // ── Precondition guard ─────────────────────────────────────────
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
  const blockingIssues = allIssues.filter(i => i.isBlocking);
  const warningIssues = allIssues.filter(i => !i.isBlocking && i.severity === 'WARNING');
  const infoIssues = allIssues.filter(i => i.severity === 'INFO');

  const docReady = qualityData?.documentReadiness;
  const isDocumentReady = docReady?.ready || false;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">ขั้นที่ 6 — ตรวจคุณภาพ</h2>
        <p className="text-slate-500 mt-1 text-sm">ตรวจสอบความสมบูรณ์และความสอดคล้องของแผนการเรียนรู้</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {([
          ['overview', 'ภาพรวม'],
          ['alignment', 'ความสอดคล้อง'],
          ['pa', 'ความพร้อมตามกรอบ PA'],
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
          {/* ── OVERVIEW TAB ──────────────────────────────────────── */}
          {tab === 'overview' && qualityData && (
            <div className="space-y-5">
              {/* Summary Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'โครงสร้าง', ok: qualityData.ruleResult.issues.filter(i=>i.category==='STRUCTURE').length === 0, icon: '📋' },
                  { label: 'ความสอดคล้อง', ok: qualityData.ruleResult.issues.filter(i=>i.category==='ALIGNMENT').length === 0, icon: '🔗' },
                  { label: 'กิจกรรม', ok: qualityData.ruleResult.issues.filter(i=>i.category==='ACTIVITY').length === 0, icon: '🎯' },
                  { label: 'การประเมิน', ok: qualityData.ruleResult.issues.filter(i=>i.category==='ASSESSMENT').length === 0, icon: '📊' },
                  { label: 'ชุดพร้อมสอน', ok: qualityData.ruleResult.issues.filter(i=>['PACKAGE','TIME'].includes(i.category)).length === 0, icon: '📦' },
                  { label: 'พร้อมส่งออก', ok: isDocumentReady, icon: '✅' },
                ].map(({ label, ok, icon }) => (
                  <div key={label} className={`rounded-xl border p-4 text-center ${ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="text-2xl mb-1">{icon}</div>
                    <p className="text-xs font-semibold text-slate-700">{label}</p>
                    <p className={`text-sm font-bold mt-1 ${ok ? 'text-emerald-600' : 'text-red-600'}`}>
                      {ok ? '✓ ผ่าน' : '⚠ ต้องตรวจ'}
                    </p>
                  </div>
                ))}
              </div>

              {/* Document Readiness Banner */}
              {isDocumentReady ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-bold text-emerald-800">พร้อมสำหรับการจัดทำเอกสาร</p>
                    <p className="text-sm text-emerald-700">แผนผ่านทุกเงื่อนไขที่จำเป็น สามารถดำเนินการในขั้นถัดไปได้</p>
                  </div>
                </div>
              ) : docReady && docReady.blockingConditions.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="font-bold text-red-800 mb-2">ยังไม่สามารถส่งออกเอกสารได้</p>
                  <ul className="space-y-1">
                    {docReady.blockingConditions.map((c, i) => (
                      <li key={i} className="text-sm text-red-700">• {c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Review Section */}
              <div className="border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="font-bold text-slate-800">ตรวจคุณภาพเชิงลึก (AI)</h3>
                    <p className="text-sm text-slate-500 mt-0.5">วิเคราะห์ความสอดคล้องเชิงความหมาย คุณภาพกิจกรรม และความสมเหตุสมผล</p>
                    {qualityData.cachedAiReview && (
                      <p className={`text-xs mt-1 ${qualityData.cachedAiReview.isStale ? 'text-amber-600' : 'text-slate-400'}`}>
                        {qualityData.cachedAiReview.isStale
                          ? '⚠ ผลตรวจนี้อ้างอิงแผนเวอร์ชันก่อนหน้า กรุณาตรวจใหม่'
                          : `ตรวจเมื่อ ${new Date(qualityData.cachedAiReview.reviewedAt).toLocaleString('th-TH')}`}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleAiReview}
                    disabled={aiLoading}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-5 rounded-xl transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {aiLoading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
                    {aiLoading ? 'กำลังตรวจ...' : '🔍 ตรวจคุณภาพเชิงลึก'}
                  </button>
                </div>
              </div>

              {/* Issues */}
              {blockingIssues.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-red-700">ต้องแก้ก่อนส่งออก ({blockingIssues.length})</h3>
                  {blockingIssues.map((issue, i) => (
                    <IssueCard key={i} issue={issue} planId={planId} onFixed={loadQuality} />
                  ))}
                </div>
              )}

              {warningIssues.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-amber-700">ควรตรวจสอบ ({warningIssues.length})</h3>
                  {warningIssues.map((issue, i) => (
                    <IssueCard key={i} issue={issue} planId={planId} onFixed={loadQuality} />
                  ))}
                </div>
              )}

              {infoIssues.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-blue-700">ข้อเสนอแนะ ({infoIssues.length})</h3>
                  {infoIssues.map((issue, i) => (
                    <IssueCard key={i} issue={issue} planId={planId} onFixed={loadQuality} />
                  ))}
                </div>
              )}

              {allIssues.length === 0 && !loading && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="font-bold text-emerald-800">ไม่พบประเด็นที่ต้องปรับปรุง</p>
                  <p className="text-sm text-emerald-700 mt-1">แผนการเรียนรู้ผ่านการตรวจสอบทุกด้าน</p>
                </div>
              )}
            </div>
          )}

          {/* ── ALIGNMENT TAB ─────────────────────────────────────── */}
          {tab === 'alignment' && qualityData && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-slate-800 mb-2">สรุปโครงสร้างความเชื่อมโยง</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-slate-500">จุดในกราฟ</p>
                    <p className="text-xl font-bold text-slate-800">{qualityData.alignmentGraph.nodeCount}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-slate-500">เส้นเชื่อมโยง</p>
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
                    <h4 className="font-semibold text-amber-800">พบรายการที่ยังไม่เชื่อมโยง</h4>
                    {orphans.objectivesWithoutEvidence?.length > 0 && (
                      <p className="text-sm text-amber-700">จุดประสงค์ไม่มีหลักฐาน: {orphans.objectivesWithoutEvidence.join(', ')}</p>
                    )}
                    {orphans.evidenceWithoutActivity?.length > 0 && (
                      <p className="text-sm text-amber-700">หลักฐานไม่มีกิจกรรม: {orphans.evidenceWithoutActivity.join(', ')}</p>
                    )}
                    {orphans.evidenceWithoutAssessment?.length > 0 && (
                      <p className="text-sm text-amber-700">หลักฐานไม่มีการประเมิน: {orphans.evidenceWithoutAssessment.join(', ')}</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                    <p className="font-bold text-emerald-800">✓ ไม่พบรายการที่ขาดการเชื่อมโยง</p>
                    <p className="text-sm text-emerald-700 mt-1">ทุก Objective, Evidence, Activity และ Assessment เชื่อมโยงครบถ้วน</p>
                  </div>
                );
              })()}

              {/* Alignment-specific issues */}
              {(() => {
                const alignIssues = allIssues.filter(i => i.category === 'ALIGNMENT');
                return alignIssues.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="font-bold text-slate-700">ประเด็นความสอดคล้อง</h3>
                    {alignIssues.map((issue, i) => (
                      <IssueCard key={i} issue={issue} planId={planId} onFixed={loadQuality} />
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* ── PA TAB ────────────────────────────────────────────── */}
          {tab === 'pa' && (
            <div className="space-y-4">
              {paLoading && (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
                </div>
              )}

              {!paLoading && !paData && (
                <div className="text-center py-10 space-y-3">
                  <p className="text-slate-500">กดปุ่มเพื่อตรวจความพร้อมตามกรอบ PA</p>
                  <button
                    onClick={loadPaReadiness}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-xl transition"
                  >
                    ตรวจความพร้อมตามกรอบ PA
                  </button>
                </div>
              )}

              {paData && (
                <>
                  {/* PA Disclaimer */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-800 font-semibold mb-1">⚠ ข้อจำกัดการประเมินก่อนสอน</p>
                    <p className="text-xs text-blue-700">{paData.planPhaseDisclaimer}</p>
                  </div>

                  {/* Criteria version */}
                  {paData.criteriaVersionMeta && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <p className="text-xs text-slate-500">เกณฑ์อ้างอิง: <span className="font-semibold text-slate-700">{paData.criteriaVersionMeta.label}</span></p>
                      <p className="text-xs text-slate-400 mt-0.5">ตรวจเมื่อ: {new Date(paData.reviewedAt).toLocaleString('th-TH')}</p>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'มีหลักฐาน', val: paData.summary.evidenced, cls: 'text-emerald-600' },
                      { label: 'บางส่วน', val: paData.summary.partiallyEvidenced, cls: 'text-amber-600' },
                      { label: 'ยังไม่มี', val: paData.summary.notEvidenced, cls: 'text-red-600' },
                    ].map(({ label, val, cls }) => (
                      <div key={label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                        <p className={`text-xl font-bold ${cls}`}>{val}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* PA Items by Domain */}
                  {(['LEARNING_MANAGEMENT', 'LEARNER_OUTCOMES'] as const).map(domain => {
                    const items = paData.items.filter(i => i.domain === domain);
                    if (items.length === 0) return null;
                    return (
                      <div key={domain} className="space-y-2">
                        <h3 className="font-bold text-slate-700">{PA_DOMAIN_LABELS[domain]}</h3>
                        {items.map(item => (
                          <PaItemCard key={item.criteriaId} item={item} />
                        ))}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Navigation footer */}
      <div className="flex justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 font-semibold transition"
        >
          ← ขั้นที่ 5 (ชุดพร้อมสอน)
        </button>
        {isDocumentReady && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-2 text-sm font-semibold text-emerald-700">
            ✓ พร้อมสำหรับขั้นที่ 7 (เอกสาร)
          </div>
        )}
      </div>
    </div>
  );
}
