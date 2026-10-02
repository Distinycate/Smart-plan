'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Sparkles,
  BookOpen,
  Calendar,
  Clock,
  Layers,
  FileText
} from 'lucide-react';
import { V3LessonPlan, V3LessonObjective, V3LearningEvidence, V3ObjectiveEvidenceLink, V3LessonCurriculumLink, V3LessonActivity, V3LessonGraph } from '@/lib/smartPlanV3/types';
import { getStatusLabel, getSubjectLabel, formatDuration, SaveState, SAVE_STATE_LABELS } from '@/lib/smartPlanV3/labels';
import Step3Activities from './Step3Activities';
import Step4Assessments from './Step4Assessments';
import Step5TeachingPackage from './Step5TeachingPackage';
import Step6QualityReview from './Step6QualityReview';
import Step8TeachingResults from './Step8TeachingResults';
import Step9ReflectionEvidence from './Step9ReflectionEvidence';
import {
  getObjectiveSuggestions,
  getEvidenceSuggestions,
  ObjectiveCandidate,
  EvidenceCandidate,
} from '@/lib/smartPlanV3/suggestions';

// ─── Sub-components ─────────────────────────────────────────────────────────

function StepNav({
  currentStep,
  planId,
  lessonStatus,
  onNavigate,
}: {
  currentStep: number;
  planId: string;
  lessonStatus?: string;
  onNavigate: (step: number) => void;
}) {
  const steps = [
    { num: 1, label: 'ข้อมูลแผน' },
    { num: 2, label: 'เป้าหมาย' },
    { num: 3, label: 'ออกแบบกิจกรรม' },
    { num: 4, label: 'ประเมินผล' },
    { num: 5, label: 'ชุดพร้อมสอน' },
    { num: 6, label: 'ตรวจคุณภาพ' },
    { num: 7, label: 'เอกสาร/พิมพ์' },
    { num: 8, label: 'ผลการสอน' },
    { num: 9, label: 'สะท้อนผล' },
  ];

  return (
    <div className="v3-step-nav-wrapper">
      <nav className="v3-step-nav" aria-label="ขั้นตอนการจัดทำแผน">
        {steps.map((item, i) => {
          const step = item.num;
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;
          let isAvailable = step <= 6;
          if (step === 7) {
            isAvailable = ['REVIEWED', 'FINAL', 'TAUGHT', 'REFLECTED'].includes(lessonStatus || '');
          } else if (step === 8) {
            isAvailable = ['FINAL', 'TAUGHT', 'REFLECTED'].includes(lessonStatus || '');
          } else if (step === 9) {
            isAvailable = ['TAUGHT', 'REFLECTED'].includes(lessonStatus || '');
          }

          return (
            <button
              key={step}
              type="button"
              className={`v3-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${!isAvailable ? 'disabled' : ''}`}
              onClick={() => isAvailable && !isActive ? onNavigate(step) : undefined}
              disabled={!isAvailable}
              title={
                !isAvailable
                  ? step === 7
                    ? 'ต้องผ่านการตรวจคุณภาพในขั้นที่ 6 ก่อน'
                    : step === 8
                    ? 'ต้องล็อคแผนเป็น FINAL ก่อนบันทึกผลการสอน'
                    : 'ต้องบันทึกผลการสอน (TAUGHT) ก่อนสะท้อนผล'
                  : undefined
              }
              aria-current={isActive ? 'step' : undefined}
            >
              <div className="v3-step-dot">
                {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step}
              </div>
              <span className="v3-step-label">{item.label}</span>
              {i < steps.length - 1 && <span className="v3-step-connector" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  const label = SAVE_STATE_LABELS[state];
  const cls = state === 'error' ? 'save-error' : state === 'saved' ? 'save-ok' : 'save-info';
  return (
    <div className={`v3-save-indicator-badge ${cls}`}>
      {state === 'saved' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
      {state === 'saving' && <div className="w-3 h-3 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />}
      <span>{label}</span>
    </div>
  );
}

function V3BottomActionBar({
  currentStep,
  totalSteps = 9,
  lessonStatus,
  onNavigate,
  planId,
}: {
  currentStep: number;
  totalSteps?: number;
  lessonStatus?: string;
  onNavigate: (step: number) => void;
  planId: string;
}) {
  const stepTitles = [
    'ข้อมูลแผนการสอน',
    'เป้าหมายการเรียนรู้',
    'ออกแบบกิจกรรมการเรียนรู้',
    'การวัดและประเมินผล',
    'ชุดพร้อมสอน (Teaching Package)',
    'ตรวจคุณภาพและ PA Readiness',
    'เอกสารและสั่งพิมพ์ A4',
    'บันทึกผลการสอนจริง',
    'สะท้อนผลและหลักฐานเชิงประจักษ์',
  ];

  const currentTitle = stepTitles[currentStep - 1] || '';
  const nextTitle = currentStep < totalSteps ? stepTitles[currentStep] : '';

  let isNextAvailable = currentStep < totalSteps;
  if (currentStep === 6) {
    isNextAvailable = ['REVIEWED', 'FINAL', 'TAUGHT', 'REFLECTED'].includes(lessonStatus || '');
  } else if (currentStep === 7) {
    isNextAvailable = ['FINAL', 'TAUGHT', 'REFLECTED'].includes(lessonStatus || '');
  } else if (currentStep === 8) {
    isNextAvailable = ['TAUGHT', 'REFLECTED'].includes(lessonStatus || '');
  }

  return (
    <aside className="v3-bottom-nav-bar" aria-label="แถบควบคุมขั้นตอน">
      <div className="v3-bottom-nav-inner">
        {/* Left: Back button */}
        <div className="flex items-center gap-2">
          {currentStep > 1 ? (
            <button
              type="button"
              className="v3-btn v3-btn-secondary"
              onClick={() => onNavigate(currentStep - 1)}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ย้อนกลับ (ขั้นที่ {currentStep - 1})</span>
            </button>
          ) : (
            <Link href="/plan/v3" className="v3-btn v3-btn-secondary">
              <ArrowLeft className="w-4 h-4" />
              <span>หน้ารวมแผน</span>
            </Link>
          )}
        </div>

        {/* Center: Current progress badge */}
        <div className="v3-bottom-nav-center">
          <div className="flex items-center gap-2">
            <span className="v3-nav-step-pill">
              ขั้นตอนที่ {currentStep} จาก {totalSteps}
            </span>
            <span className="font-semibold text-slate-800 text-sm hidden md:inline">
              {currentTitle}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ระบบบันทึกข้อมูลอัตโนมัติ</span>
          </div>
        </div>

        {/* Right: Next button or Preview A4 */}
        <div className="flex items-center gap-2.5">
          {['REVIEWED', 'FINAL', 'TAUGHT', 'REFLECTED'].includes(lessonStatus || '') && (
            <Link
              href={`/plan/v3/${planId}/preview`}
              className="v3-btn v3-btn-ghost text-xs hidden sm:inline-flex items-center gap-1.5"
              title="ดูเอกสารฉบับพิมพ์ A4"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>ดูตัวอย่าง A4</span>
            </Link>
          )}

          {currentStep < totalSteps ? (
            <button
              type="button"
              className="v3-btn v3-btn-primary"
              disabled={!isNextAvailable}
              onClick={() => onNavigate(currentStep + 1)}
              title={!isNextAvailable ? 'กรุณาดำเนินการในขั้นตอนนี้ให้ครบถ้วนก่อน' : `ไปยัง${nextTitle}`}
            >
              <span>ถัดไป: {nextTitle || `ขั้นที่ ${currentStep + 1}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href={`/plan/v3/${planId}/preview`}
              className="v3-btn v3-btn-primary"
            >
              <span>ดูเอกสาร A4 ฉบับสมบูรณ์</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}

// ─── Step 1 View (read + edit) ───────────────────────────────────────────────

function Step1View({ lesson, curriculumLinks, onUpdate, onNext }: {
  lesson: V3LessonPlan;
  curriculumLinks: V3LessonCurriculumLink[];
  onUpdate: (patch: Partial<V3LessonPlan>) => void;
  onNext: () => void;
}) {
  return (
    <div className="v3-editor-section">
      <h2 className="v3-section-title">📌 ข้อมูลแผนการสอน</h2>

      <div className="v3-info-grid">
        <div className="v3-info-row">
          <span className="v3-info-label">วิชา</span>
          <span className="v3-info-value font-semibold text-slate-900">{getSubjectLabel(lesson.subject_key)}</span>
        </div>
        <div className="v3-info-row">
          <span className="v3-info-label">ระดับชั้น</span>
          <span className="v3-info-value font-semibold text-slate-800">{lesson.grade_level}</span>
        </div>
        <div className="v3-info-row">
          <span className="v3-info-label">เรื่อง</span>
          <span className="v3-info-value font-bold text-blue-700 text-base">{lesson.topic}</span>
        </div>
        <div className="v3-info-row">
          <span className="v3-info-label">เวลา</span>
          <span className="v3-info-value">{formatDuration(lesson.duration_minutes)}</span>
        </div>
        {lesson.learning_focus && (
          <div className="v3-info-row">
            <span className="v3-info-label">ลักษณะการเรียนรู้</span>
            <span className="v3-info-value v3-focus-badge">{lesson.learning_focus}</span>
          </div>
        )}
        {lesson.unit_reference && (
          <div className="v3-info-row">
            <span className="v3-info-label">หน่วยการเรียนรู้</span>
            <span className="v3-info-value">{lesson.unit_reference}</span>
          </div>
        )}
      </div>

      {curriculumLinks.length > 0 && (
        <div className="v3-curriculum-summary">
          <h3 className="v3-subsection-title">📋 ตัวชี้วัดที่เลือก ({curriculumLinks.length} ข้อ)</h3>
          <ul className="v3-indicator-summary">
            {curriculumLinks.map(link => (
              <li key={link.id} className="v3-indicator-chip">
                <strong>{link.indicator_code}</strong>
                {link.indicator_label_snapshot && <span> — {link.indicator_label_snapshot}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation action buttons */}
      <div className="v3-step-nav-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Link href="/plan/v3" className="v3-btn v3-btn-secondary">
          ← กลับไปหน้ารวมแผน
        </Link>
        <button
          type="button"
          onClick={onNext}
          className="v3-btn v3-btn-primary"
        >
          <span>ดำเนินการต่อ: กำหนดเป้าหมายการเรียนรู้ (ขั้นที่ 2)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Objective CRUD ──────────────────────────────────────────────────────────

function ObjectiveCard({
  obj, index, onDelete, onUpdate, linkedEvidenceIds, allEvidence, onLinkEvidence, onUnlinkEvidence
}: {
  obj: V3LessonObjective;
  index: number;
  onDelete: (id: string) => void;
  onUpdate: (id: string, statement: string) => void;
  linkedEvidenceIds: string[];
  allEvidence: V3LearningEvidence[];
  onLinkEvidence: (objId: string, evdId: string) => void;
  onUnlinkEvidence: (objId: string, evdId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(obj.statement);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textRef.current) textRef.current.focus();
  }, [editing]);

  return (
    <div className="v3-obj-card">
      <div className="v3-obj-header">
        <span className="v3-obj-num">{index + 1}</span>
        {!editing ? (
          <p className="v3-obj-statement">{obj.statement}</p>
        ) : (
          <textarea
            ref={textRef}
            className="v3-textarea v3-obj-textarea"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={3}
          />
        )}
        <div className="v3-obj-actions">
          {!editing ? (
            <>
              <button className="v3-icon-btn" onClick={() => setEditing(true)} title="แก้ไข" aria-label="แก้ไขจุดประสงค์">✏️</button>
              <button className="v3-icon-btn v3-icon-danger" onClick={() => onDelete(obj.id)} title="ลบ" aria-label="ลบจุดประสงค์">🗑️</button>
            </>
          ) : (
            <>
              <button className="v3-btn v3-btn-primary v3-btn-xs" onClick={() => { onUpdate(obj.id, draft); setEditing(false); }}>บันทึก</button>
              <button className="v3-btn v3-btn-ghost v3-btn-xs" onClick={() => { setDraft(obj.statement); setEditing(false); }}>ยกเลิก</button>
            </>
          )}
        </div>
      </div>

      {/* Evidence Links */}
      {allEvidence.length > 0 && (
        <div className="v3-obj-evidence">
          <p className="v3-obj-evidence-label">🔗 หลักฐานที่เชื่อมโยง:</p>
          <div className="v3-obj-evidence-list">
            {allEvidence.map(evd => {
              const linked = linkedEvidenceIds.includes(evd.id);
              return (
                <button
                  key={evd.id}
                  className={`v3-evd-chip ${linked ? 'linked' : ''}`}
                  onClick={() => linked ? onUnlinkEvidence(obj.id, evd.id) : onLinkEvidence(obj.id, evd.id)}
                  title={linked ? 'คลิกเพื่อยกเลิกการเชื่อมโยง' : 'คลิกเพื่อเชื่อมโยง'}
                >
                  {linked ? '✅' : '○'} {evd.description || evd.evidence_type}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Evidence CRUD ───────────────────────────────────────────────────────────

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  SPEAKING: 'การพูด/สนทนา',
  PERFORMANCE: 'การปฏิบัติ',
  DISCUSSION: 'การอภิปราย',
  WORKSHEET: 'ใบงาน',
  QUIZ: 'แบบทดสอบ',
  PRODUCT: 'ผลงาน',
  OBSERVATION: 'การสังเกต',
  WRITTEN_SOLUTION: 'วิธีแก้ปัญหาลายลักษณ์อักษร',
  EXPERIMENT: 'การทดลอง',
  CHECKLIST: 'แบบตรวจสอบรายการ',
  OTHER: 'อื่นๆ',
};

function EvidenceCard({ evd, onDelete }: { evd: V3LearningEvidence; onDelete: (id: string) => void }) {
  const typeLabel = EVIDENCE_TYPE_LABELS[evd.evidence_type] || evd.evidence_type;
  return (
    <div className="v3-evd-card">
      <div className="v3-evd-type-badge">{typeLabel}</div>
      <p className="v3-evd-desc">{evd.description}</p>
      <button className="v3-icon-btn v3-icon-danger" onClick={() => onDelete(evd.id)} title="ลบหลักฐาน" aria-label="ลบหลักฐาน">🗑️</button>
    </div>
  );
}

// ─── Main Editor Page ────────────────────────────────────────────────────────

export default function V3PlanEditorPage() {
  const { id: planId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentStep = Number(searchParams.get('step') || '1');

  const [lesson, setLesson] = useState<V3LessonPlan | null>(null);
  const [curriculumLinks, setCurriculumLinks] = useState<V3LessonCurriculumLink[]>([]);
  const [objectives, setObjectives] = useState<V3LessonObjective[]>([]);
  const [evidence, setEvidence] = useState<V3LearningEvidence[]>([]);
  const [objEvdLinks, setObjEvdLinks] = useState<V3ObjectiveEvidenceLink[]>([]);
  const [activities, setActivities] = useState<V3LessonActivity[]>([]);
  const [graph, setGraph] = useState<V3LessonGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  // Add objective form
  const [newObjText, setNewObjText] = useState('');
  const [addingObj, setAddingObj] = useState(false);

  // Add evidence form
  const [newEvdType, setNewEvdType] = useState('SPEAKING');
  const [newEvdDesc, setNewEvdDesc] = useState('');
  const [addingEvd, setAddingEvd] = useState(false);

  // Guided Choice State (V3.12)
  const [objCandidates, setObjCandidates] = useState<ObjectiveCandidate[]>([]);
  const [evdCandidates, setEvdCandidates] = useState<EvidenceCandidate[]>([]);
  const [loadingObjSuggestions, setLoadingObjSuggestions] = useState(false);
  const [showManualObj, setShowManualObj] = useState(false);
  const [showManualEvd, setShowManualEvd] = useState(false);

  // ─── Load Graph ────────────────────────────────────────────────────────────

  const loadGraph = useCallback(async () => {
    if (!planId) return;
    setLoading(true);
    try {
      const [graphRes, linksRes] = await Promise.all([
        fetch(`/api/plan/v3/${planId}`).then(r => r.json()),
        fetch(`/api/plan/v3/${planId}/curriculum-links`).then(r => r.json()),
      ]);

      if (!graphRes.success) { setError(graphRes.error || 'ไม่พบแผน'); return; }

      const g = graphRes.data;
      setLesson(g.lesson);
      setObjectives((g.objectives || []).sort((a: V3LessonObjective, b: V3LessonObjective) => a.position - b.position));
      setEvidence((g.evidence || []).sort((a: V3LearningEvidence, b: V3LearningEvidence) => a.position - b.position));
      setObjEvdLinks(g.objectiveEvidenceLinks || []);
      setActivities((g.activities || []).sort((a: V3LessonActivity, b: V3LessonActivity) => a.position - b.position));
      if (linksRes.success) setCurriculumLinks(linksRes.data || []);
      // Store full graph for Step 6 quality engine
      setGraph({
        lesson: g.lesson,
        curriculumLinks: linksRes.success ? (linksRes.data || []) : [],
        objectives: (g.objectives || []).sort((a: V3LessonObjective, b: V3LessonObjective) => a.position - b.position),
        evidence: (g.evidence || []).sort((a: V3LearningEvidence, b: V3LearningEvidence) => a.position - b.position),
        objectiveEvidenceLinks: g.objectiveEvidenceLinks || [],
        activities: (g.activities || []).sort((a: V3LessonActivity, b: V3LessonActivity) => a.position - b.position),
        activityObjectiveLinks: g.activityObjectiveLinks || [],
        activityEvidenceLinks: g.activityEvidenceLinks || [],
        assessments: g.assessments || [],
        assessmentEvidenceLinks: g.assessmentEvidenceLinks || [],
        assessmentActivityLinks: g.assessmentActivityLinks || [],
        assessmentTools: g.assessmentTools || [],
        teachingAssets: g.teachingAssets || [],
        assetObjectiveLinks: g.assetObjectiveLinks || [],
        assetActivityLinks: g.assetActivityLinks || [],
        assetEvidenceLinks: g.assetEvidenceLinks || [],
        postTeaching: g.postTeaching || null,
      });
    } catch {
      setError('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  // ─── Objective Operations ─────────────────────────────────────────────────

  const addObjective = async () => {
    if (!newObjText.trim() || !planId) return;
    setAddingObj(true);
    try {
      const res = await fetch(`/api/plan/v3/${planId}/objectives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement: newObjText.trim(), position: objectives.length }),
      });
      const data = await res.json();
      if (data.success) {
        setObjectives(prev => [...prev, data.data]);
        setNewObjText('');
      }
    } finally {
      setAddingObj(false);
    }
  };

  const deleteObjective = async (objId: string) => {
    if (!window.confirm('ลบจุดประสงค์นี้ใช่หรือไม่?')) return;
    const res = await fetch(`/api/plan/v3/${planId}/objectives/${objId}`, { method: 'DELETE' });
    if ((await res.json()).success) {
      setObjectives(prev => prev.filter(o => o.id !== objId));
      setObjEvdLinks(prev => prev.filter(l => l.objective_id !== objId));
    }
  };

  const updateObjective = async (objId: string, statement: string) => {
    if (!statement.trim()) return;
    setSaveState('saving');
    try {
      const res = await fetch(`/api/plan/v3/${planId}/objectives/${objId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement }),
      });
      const data = await res.json();
      if (data.success) {
        setObjectives(prev => prev.map(o => o.id === objId ? data.data : o));
        setSaveState('saved');
      } else setSaveState('error');
    } catch { setSaveState('error'); }
    setTimeout(() => setSaveState('idle'), 2500);
  };

  // ─── Evidence Operations ──────────────────────────────────────────────────

  const addEvidence = async () => {
    if (!newEvdDesc.trim() || !planId) return;
    setAddingEvd(true);
    try {
      const res = await fetch(`/api/plan/v3/${planId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence_type: newEvdType,
          description: newEvdDesc.trim(),
          position: evidence.length,
          source: 'MANUAL',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEvidence(prev => [...prev, data.data]);
        setNewEvdDesc('');
      }
    } finally {
      setAddingEvd(false);
    }
  };

  const deleteEvidence = async (evdId: string) => {
    if (!window.confirm('ลบหลักฐานนี้ใช่หรือไม่?')) return;
    const res = await fetch(`/api/plan/v3/${planId}/evidence?evidenceId=${evdId}`, { method: 'DELETE' });
    if ((await res.json()).success) {
      setEvidence(prev => prev.filter(e => e.id !== evdId));
      setObjEvdLinks(prev => prev.filter(l => l.evidence_id !== evdId));
    }
  };

  // ─── Link Operations ──────────────────────────────────────────────────────

  const linkEvidence = async (objId: string, evdId: string) => {
    const res = await fetch(`/api/plan/v3/${planId}/evidence-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objective_id: objId, evidence_id: evdId }),
    });
    if ((await res.json()).success) {
      setObjEvdLinks(prev => [...prev, { objective_id: objId, evidence_id: evdId, created_at: new Date().toISOString() }]);
    }
  };

  const unlinkEvidence = async (objId: string, evdId: string) => {
    const res = await fetch(`/api/plan/v3/${planId}/evidence-links`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objective_id: objId, evidence_id: evdId }),
    });
    if ((await res.json()).success) {
      setObjEvdLinks(prev => prev.filter(l => !(l.objective_id === objId && l.evidence_id === evdId)));
    }
  };

  // ─── Guided Choice Operations (V3.12) ────────────────────────────────────

  const refreshObjectiveSuggestions = useCallback(async () => {
    if (!lesson) return;
    setLoadingObjSuggestions(true);
    try {
      const res = await fetch(`/api/plan/v3/${planId}/objectives/suggestions`, { method: 'POST' });
      const json = await res.json();
      if (json.success && Array.isArray(json.candidates)) {
        setObjCandidates(json.candidates);
      } else {
        const fallback = getObjectiveSuggestions({
          subjectKey: lesson.subject_key,
          learningFocus: lesson.learning_focus,
          topic: lesson.topic,
          durationMinutes: lesson.duration_minutes,
        });
        setObjCandidates(fallback);
      }
    } catch {
      const fallback = getObjectiveSuggestions({
        subjectKey: lesson.subject_key,
        learningFocus: lesson.learning_focus,
        topic: lesson.topic,
        durationMinutes: lesson.duration_minutes,
      });
      setObjCandidates(fallback);
    } finally {
      setLoadingObjSuggestions(false);
    }
  }, [lesson, planId]);

  useEffect(() => {
    if (lesson) {
      refreshObjectiveSuggestions();
      const evds = getEvidenceSuggestions({
        subjectKey: lesson.subject_key,
        learningFocus: lesson.learning_focus,
        topic: lesson.topic,
        objectiveStatements: objectives.map(o => o.statement),
      });
      setEvdCandidates(evds);
    }
  }, [lesson, objectives.length]);

  const selectObjectiveCandidate = async (candidate: ObjectiveCandidate) => {
    if (!planId) return;
    setAddingObj(true);
    try {
      const res = await fetch(`/api/plan/v3/${planId}/objectives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement: candidate.statement, position: objectives.length }),
      });
      const data = await res.json();
      if (data.success) {
        setObjectives(prev => [...prev, data.data]);
      }
    } finally {
      setAddingObj(false);
    }
  };

  const selectEvidenceCandidate = async (candidate: EvidenceCandidate) => {
    if (!planId) return;
    setAddingEvd(true);
    try {
      const res = await fetch(`/api/plan/v3/${planId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence_type: candidate.evidenceType,
          description: candidate.description,
          position: evidence.length,
          source: 'MANUAL',
        }),
      });
      const data = await res.json();
      if (data.success) {
        const newEvd = data.data;
        setEvidence(prev => [...prev, newEvd]);
        // Auto-link to latest unlinked objective or first objective
        const unlinkedObj = objectives.find(o => !objEvdLinks.some(l => l.objective_id === o.id)) || objectives[0];
        if (unlinkedObj) {
          await linkEvidence(unlinkedObj.id, newEvd.id);
        }
      }
    } finally {
      setAddingEvd(false);
    }
  };

  // ─── Alignment Summary ────────────────────────────────────────────────────

  const objectivesWithoutEvidence = objectives.filter(obj =>
    !objEvdLinks.some(l => l.objective_id === obj.id)
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="v3-editor-page">
      <div className="v3-loading-screen">
        <div className="v3-spinner" />
        <p>กำลังโหลดข้อมูลแผนการสอน...</p>
      </div>
    </div>
  );

  if (error || !lesson) return (
    <div className="v3-editor-page">
      <div className="v3-error-screen">
        <h2>ไม่สามารถโหลดแผนได้</h2>
        <p>{error}</p>
        <Link href="/plan/v3" className="v3-btn v3-btn-primary">← กลับไปรายการแผน</Link>
      </div>
    </div>
  );

  return (
    <div className="v3-editor-page">
      {/* Header */}
      <div className="v3-editor-header">
        <div className="v3-editor-header-inner">
          <div className="v3-editor-breadcrumb">
            <Link href="/plan/v3" className="v3-breadcrumb-link">แผนการสอน V3</Link>
            <span className="v3-breadcrumb-sep">›</span>
            <span>{lesson.topic}</span>
          </div>
          <div className="v3-editor-meta">
            <span className={`v3-badge v3-status-${lesson.status.toLowerCase()}`}>
              {getStatusLabel(lesson.status)}
            </span>
            <SaveIndicator state={saveState} />
          </div>
        </div>
      </div>

      <StepNav
        currentStep={currentStep}
        planId={planId}
        lessonStatus={lesson.status}
        onNavigate={(step) => router.push(`/plan/v3/${planId}?step=${step}`)}
      />

      <div className="v3-editor-body">
        {currentStep === 1 && (
          <Step1View
            lesson={lesson}
            curriculumLinks={curriculumLinks}
            onUpdate={() => {}}
            onNext={() => router.push(`/plan/v3/${planId}?step=2`)}
          />
        )}

        {currentStep === 2 && (
          <div>
            {/* ─ Curriculum Summary ─ */}
            {curriculumLinks.length > 0 && (
              <div className="v3-editor-section v3-section-compact">
                <h2 className="v3-section-title">📋 ตัวชี้วัดที่เลือก ({curriculumLinks.length} ข้อ)</h2>
                <div className="v3-indicator-chips">
                  {curriculumLinks.map(link => (
                    <span key={link.id} className="v3-chip-tag">
                      {link.indicator_code}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ─ Objectives ─ */}
            <div className="v3-editor-section">
              <div className="v3-section-header-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h2 className="v3-section-title" style={{ margin: 0 }}>🎯 จุดประสงค์การเรียนรู้</h2>
                  <span className="v3-count-badge">{objectives.length} ข้อ</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={refreshObjectiveSuggestions}
                    disabled={loadingObjSuggestions}
                    className="v3-btn v3-btn-ghost v3-btn-sm"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    title="สร้างข้อเสนอใหม่ตามบริบทแผนการสอน"
                  >
                    {loadingObjSuggestions ? 'กำลังประมวลผล...' : '🔄 เสนอใหม่'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManualObj(prev => !prev)}
                    className="v3-btn v3-btn-ghost v3-btn-sm"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    {showManualObj ? 'ซ่อนการเขียนเอง' : '✍️ เขียนเอง'}
                  </button>
                </div>
              </div>

              {lesson.learning_focus && (
                <div className="v3-guidance-box">
                  <strong>ลักษณะการเรียนรู้:</strong> {lesson.learning_focus} — ควรกำหนดจุดประสงค์ที่สังเกตและวัดได้ชัดเจน
                  <br /><span className="v3-hint-small">สำหรับแผน {formatDuration(lesson.duration_minutes)} ควรมีจุดประสงค์ที่ชัดเจน 2–3 ข้อ</span>
                </div>
              )}

              {/* 💡 Guided Objective Suggestion Cards */}
              {objCandidates.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                      💡 ข้อเสนอจุดประสงค์ที่เหมาะกับแผนนี้ (เลือกใช้หรือแก้ไขก่อนใช้):
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                    {objCandidates.map((c) => {
                      const alreadyAdded = objectives.some(o => o.statement === c.statement);
                      return (
                        <div
                          key={c.id}
                          style={{
                            border: alreadyAdded ? '1px solid #10B981' : '1px solid #E2E8F0',
                            borderRadius: '10px',
                            padding: '0.85rem',
                            background: alreadyAdded ? '#F0FDF4' : '#FFFFFF',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '9999px',
                                  border: '1px solid',
                                }}
                                className={c.levelBadgeCls || 'bg-blue-50 text-blue-700 border-blue-200'}
                              >
                                {c.levelLabelTh}
                              </span>
                              {alreadyAdded && (
                                <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                                  ✓ เลือกแล้ว
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: '0.875rem', color: '#1E293B', lineHeight: '1.4', margin: '0 0 0.4rem', fontWeight: 500 }}>
                              {c.statement}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
                              🎯 <em>{c.rationale}</em>
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #F1F5F9' }}>
                            <button
                              type="button"
                              onClick={() => selectObjectiveCandidate(c)}
                              disabled={addingObj || alreadyAdded}
                              style={{
                                flex: 1,
                                fontSize: '0.8rem',
                                padding: '0.35rem 0.6rem',
                                borderRadius: '6px',
                                background: alreadyAdded ? '#D1FAE5' : '#4F46E5',
                                color: alreadyAdded ? '#065F46' : '#FFFFFF',
                                border: 'none',
                                fontWeight: 600,
                                cursor: alreadyAdded ? 'default' : 'pointer',
                              }}
                            >
                              {alreadyAdded ? 'เลือกแล้ว' : '+ เลือกใช้ข้อนี้'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNewObjText(c.statement);
                                setShowManualObj(true);
                              }}
                              style={{
                                fontSize: '0.8rem',
                                padding: '0.35rem 0.6rem',
                                borderRadius: '6px',
                                background: '#F8FAFC',
                                color: '#475569',
                                border: '1px solid #CBD5E1',
                                cursor: 'pointer',
                              }}
                              title="นำข้อความไปแก้ไขในช่องพิมพ์"
                            >
                              ✏️ แก้ไขก่อนใช้
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {objectives.length === 0 && objCandidates.length === 0 && (
                <p className="v3-hint-empty">ยังไม่มีจุดประสงค์ เพิ่มจุดประสงค์การเรียนรู้ด้านล่าง</p>
              )}

              <div className="v3-obj-list">
                {objectives.map((obj, i) => (
                  <ObjectiveCard
                    key={obj.id}
                    obj={obj}
                    index={i}
                    onDelete={deleteObjective}
                    onUpdate={updateObjective}
                    linkedEvidenceIds={objEvdLinks.filter(l => l.objective_id === obj.id).map(l => l.evidence_id)}
                    allEvidence={evidence}
                    onLinkEvidence={linkEvidence}
                    onUnlinkEvidence={unlinkEvidence}
                  />
                ))}
              </div>

              {/* Add Objective (Manual) */}
              {(showManualObj || objectives.length === 0) && (
                <div className="v3-add-form" style={{ marginTop: '0.75rem' }}>
                  <textarea
                    className="v3-textarea"
                    value={newObjText}
                    onChange={e => setNewObjText(e.target.value)}
                    placeholder="เพิ่มจุดประสงค์ เช่น 'นักเรียนสามารถถามและตอบเกี่ยวกับอาชีพได้โดยใช้โครงสร้างที่กำหนด'"
                    rows={2}
                    onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) addObjective(); }}
                  />
                  <button
                    className="v3-btn v3-btn-primary"
                    onClick={addObjective}
                    disabled={!newObjText.trim() || addingObj}
                  >
                    {addingObj ? 'กำลังเพิ่ม...' : '+ เพิ่มจุดประสงค์'}
                  </button>
                </div>
              )}
            </div>

            {/* ─ Evidence ─ */}
            <div className="v3-editor-section">
              <div className="v3-section-header-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h2 className="v3-section-title" style={{ margin: 0 }}>📌 หลักฐานการเรียนรู้</h2>
                  <span className="v3-count-badge">{evidence.length} รายการ</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualEvd(prev => !prev)}
                  className="v3-btn v3-btn-ghost v3-btn-sm"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                >
                  {showManualEvd ? 'ซ่อนการเขียนเอง' : '✍️ เขียนเอง'}
                </button>
              </div>
              <p className="v3-section-hint">นักเรียนจะแสดงให้เห็นว่าเรียนรู้สำเร็จอย่างไร? เลือกจากข้อเสนอแนะหรือกำหนดเอง</p>

              {/* 💡 Guided Evidence Suggestion Cards */}
              {evdCandidates.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                      💡 ข้อเสนอหลักฐานการเรียนรู้ที่แนะนำ:
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.6rem' }}>
                    {evdCandidates.map((ev) => {
                      const alreadyAdded = evidence.some(e => e.description === ev.description || e.evidence_type === ev.evidenceType);
                      return (
                        <div
                          key={ev.id}
                          style={{
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            background: alreadyAdded ? '#F8FAFC' : '#FFFFFF',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E293B' }}>
                                {ev.labelTh}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '9999px',
                                  background: ev.recommended ? '#DCFCE7' : '#F1F5F9',
                                  color: ev.recommended ? '#15803D' : '#475569',
                                  fontWeight: 600,
                                }}
                              >
                                {ev.tag}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.775rem', color: '#64748B', margin: '0 0 0.5rem', lineHeight: '1.4' }}>
                              {ev.description}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              onClick={() => selectEvidenceCandidate(ev)}
                              disabled={addingEvd}
                              style={{
                                flex: 1,
                                fontSize: '0.75rem',
                                padding: '0.3rem 0.5rem',
                                borderRadius: '6px',
                                background: '#4F46E5',
                                color: '#FFFFFF',
                                border: 'none',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              + เลือกใช้หลักฐานนี้
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNewEvdType(ev.evidenceType);
                                setNewEvdDesc(ev.description);
                                setShowManualEvd(true);
                              }}
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.3rem 0.5rem',
                                borderRadius: '6px',
                                background: '#F8FAFC',
                                color: '#475569',
                                border: '1px solid #CBD5E1',
                                cursor: 'pointer',
                              }}
                              title="แก้ไขก่อนเพิ่ม"
                            >
                              ✏️ แก้ไข
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {evidence.length === 0 && evdCandidates.length === 0 && (
                <p className="v3-hint-empty">ยังไม่มีหลักฐาน เพิ่มหลักฐานการเรียนรู้ด้านล่าง</p>
              )}

              <div className="v3-evd-list">
                {evidence.map(evd => (
                  <EvidenceCard key={evd.id} evd={evd} onDelete={deleteEvidence} />
                ))}
              </div>

              {/* Add Evidence (Manual) */}
              {(showManualEvd || evidence.length === 0) && (
                <div className="v3-add-form v3-add-evd-form" style={{ marginTop: '0.75rem' }}>
                  <select
                    className="v3-select v3-select-sm"
                    value={newEvdType}
                    onChange={e => setNewEvdType(e.target.value)}
                  >
                    {Object.entries(EVIDENCE_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <input
                    className="v3-input"
                    value={newEvdDesc}
                    onChange={e => setNewEvdDesc(e.target.value)}
                    placeholder="รายละเอียดหลักฐาน เช่น 'สนทนาเกี่ยวกับอาชีพในฝัน 2 นาที'"
                    onKeyDown={e => { if (e.key === 'Enter') addEvidence(); }}
                  />
                  <button
                    className="v3-btn v3-btn-primary"
                    onClick={addEvidence}
                    disabled={!newEvdDesc.trim() || addingEvd}
                  >
                    {addingEvd ? 'กำลังเพิ่ม...' : '+ เพิ่ม'}
                  </button>
                </div>
              )}
            </div>

            {/* ─ Alignment Summary ─ */}
            <div className="v3-editor-section v3-section-summary">
              <h2 className="v3-section-title">📊 สรุปความสอดคล้อง</h2>
              <div className="v3-summary-grid">
                <div className="v3-summary-item">
                  <span className="v3-summary-num">{curriculumLinks.length}</span>
                  <span className="v3-summary-label">ตัวชี้วัดที่เลือก</span>
                </div>
                <div className="v3-summary-item">
                  <span className="v3-summary-num">{objectives.length}</span>
                  <span className="v3-summary-label">จุดประสงค์</span>
                </div>
                <div className="v3-summary-item">
                  <span className="v3-summary-num">{evidence.length}</span>
                  <span className="v3-summary-label">หลักฐานการเรียนรู้</span>
                </div>
              </div>

              {objectivesWithoutEvidence.length > 0 && (
                <div className="v3-alignment-warning">
                  ⚠️ จุดประสงค์ต่อไปนี้ยังไม่มีหลักฐานการเรียนรู้:
                  <ul>
                    {objectivesWithoutEvidence.map((obj, i) => (
                      <li key={obj.id}>ข้อ {objectives.indexOf(obj) + 1}: {obj.statement.substring(0, 60)}...</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="v3-step-nav-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className="v3-btn v3-btn-secondary"
                onClick={() => router.push(`/plan/v3/${planId}?step=1`)}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>ย้อนกลับไปข้อมูลแผน (ขั้นที่ 1)</span>
              </button>
              <button
                type="button"
                className="v3-btn v3-btn-primary"
                onClick={() => router.push(`/plan/v3/${planId}?step=3`)}
              >
                <span>ดำเนินการต่อ: ออกแบบกิจกรรมการเรียนรู้ (ขั้นที่ 3)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <Step3Activities
            planId={planId}
            lesson={lesson}
            objectives={objectives}
            evidence={evidence}
            curriculumLinks={curriculumLinks}
            objEvdLinks={objEvdLinks}
            onLessonStatusChange={(newStatus) => {
              setLesson(prev => prev ? { ...prev, status: newStatus } : null);
            }}
            onNavigateToStep={(s) => router.push(`/plan/v3/${planId}?step=${s}`)}
          />
        )}

        {currentStep === 4 && (
          <Step4Assessments
            planId={planId}
            lesson={lesson}
            objectives={objectives}
            evidence={evidence}
            objEvdLinks={objEvdLinks}
          />
        )}

        {currentStep === 5 && (
          <Step5TeachingPackage
            planId={planId}
            lesson={lesson}
            objectives={objectives}
            evidence={evidence}
            activities={activities}
            onLessonStatusChange={(newStatus) => {
              setLesson(prev => prev ? { ...prev, status: newStatus } : null);
            }}
            onNavigateToStep={(s) => router.push(`/plan/v3/${planId}?step=${s}`)}
          />
        )}

        {currentStep === 6 && graph && (
          <Step6QualityReview
            planId={planId}
            graph={graph}
            onBack={() => router.push(`/plan/v3/${planId}?step=5`)}
            onGraphChanged={loadGraph}
          />
        )}

        {currentStep === 6 && !graph && (
          <div className="text-center py-16 text-slate-500">
            <p>กำลังโหลดข้อมูล...</p>
          </div>
        )}

        {currentStep === 7 && (
          <div className="v3-editor-section text-center py-10 space-y-4 max-w-xl mx-auto">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-3xl">
              📄
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">เอกสารแผนการจัดการเรียนรู้ฉบับเต็ม</h2>
              <p className="text-sm text-slate-600 mt-1">
                ประกอบเอกสารตามมาตรฐานกระทรวงศึกษาธิการและ ว.PA พร้อมใบงาน ภาระงาน เฉลย และเครื่องมือวัดผล
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-700 space-y-1.5">
              <div className="font-semibold text-slate-800">สถานะความพร้อมของเอกสาร:</div>
              <div className="text-emerald-700">✓ แผนผ่านการตรวจสอบคุณภาพเชิงโครงสร้างและความสอดคล้อง (REVIEWED)</div>
              <div>✓ ข้อมูลและภาคผนวกถูกจัดเรียงตาม Canonical Document Model</div>
              <div>✓ พร้อมสำหรับการดูตัวอย่างบนหน้ากระดาษ A4 จริงและการพิมพ์</div>
            </div>

            <div className="pt-2 flex justify-center gap-3">
              <button
                className="v3-btn v3-btn-ghost"
                onClick={() => router.push(`/plan/v3/${planId}?step=6`)}
              >
                ← ย้อนกลับไปขั้นที่ 6
              </button>
              <Link
                href={`/plan/v3/${planId}/preview`}
                className="v3-btn v3-btn-primary py-2.5 px-6 shadow-md"
              >
                เปิดตัวอย่างเอกสาร A4 และสั่งพิมพ์ →
              </Link>
            </div>
          </div>
        )}

        {currentStep === 8 && (
          <Step8TeachingResults
            planId={planId}
            lessonStatus={lesson?.status || ''}
            onNavigateToStep={(s) => router.push(`/plan/v3/${planId}?step=${s}`)}
            onStatusUpdated={loadGraph}
          />
        )}

        {currentStep === 9 && (
          <Step9ReflectionEvidence
            planId={planId}
            lessonStatus={lesson?.status || ''}
            onNavigateToStep={(s) => router.push(`/plan/v3/${planId}?step=${s}`)}
            onStatusUpdated={loadGraph}
          />
        )}
      </div>

      <V3BottomActionBar
        currentStep={currentStep}
        totalSteps={9}
        lessonStatus={lesson?.status}
        onNavigate={(s) => router.push(`/plan/v3/${planId}?step=${s}`)}
        planId={planId}
      />

      <style jsx>{`
        .v3-editor-page {
          min-height: 100vh;
          background: #F8FAFC;
          font-family: var(--font-body, 'Inter', 'Sarabun', -apple-system, sans-serif);
          padding-bottom: 5rem;
        }
        .v3-editor-header {
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(226, 232, 240, 0.85);
          padding: 0.85rem 2rem;
          position: sticky;
          top: 64px;
          z-index: 30;
        }
        .v3-editor-header-inner {
          max-width: 1000px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .v3-editor-breadcrumb {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #475569;
          font-weight: 500;
        }
        .v3-breadcrumb-link {
          color: #2563EB;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.15s;
        }
        .v3-breadcrumb-link:hover {
          color: #1D4ED8;
          text-decoration: underline;
        }
        .v3-breadcrumb-sep {
          color: #CBD5E1;
        }
        .v3-editor-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .v3-save-indicator-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
        }
        .v3-save-indicator-badge.save-ok {
          color: #059669;
          background: #ECFDF5;
          border-color: #A7F3D0;
        }
        .v3-save-indicator-badge.save-error {
          color: #E11D48;
          background: #FFF1F2;
          border-color: #FECDD3;
        }
        .v3-save-indicator-badge.save-info {
          color: #4F46E5;
          background: #EEF2FF;
          border-color: #C7D2FE;
        }
        .v3-step-nav-wrapper {
          background: #FFFFFF;
          border-bottom: 1px solid #E2E8F0;
          overflow-x: auto;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
          position: sticky;
          top: 114px;
          z-index: 25;
        }
        .v3-step-nav {
          max-width: 1040px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          padding: 0.5rem 1rem;
          gap: 0.25rem;
          white-space: nowrap;
        }
        .v3-step-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.75rem;
          border-radius: 9999px;
          cursor: pointer;
          white-space: nowrap;
          border: 1px solid transparent;
          background: transparent;
          transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          color: #475569;
        }
        .v3-step-item:hover:not(.disabled):not(.active) {
          background: #F1F5F9;
          color: #0F172A;
        }
        .v3-step-item.active {
          background: #EFF6FF;
          border-color: #BFDBFE;
          color: #1D4ED8;
          font-weight: 700;
          box-shadow: 0 1px 3px 0 rgba(37, 99, 235, 0.1);
        }
        .v3-step-item.completed {
          color: #059669;
        }
        .v3-step-item.completed:hover {
          background: #ECFDF5;
        }
        .v3-step-item.disabled {
          color: #94A3B8;
          cursor: not-allowed;
          opacity: 0.6;
        }
        .v3-step-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          flex-shrink: 0;
          background: #E2E8F0;
          color: #475569;
          transition: all 0.15s;
        }
        .v3-step-item.active .v3-step-dot {
          background: #2563EB;
          color: #FFFFFF;
          box-shadow: 0 0 10px rgba(37, 99, 235, 0.35);
        }
        .v3-step-item.completed .v3-step-dot {
          background: #10B981;
          color: #FFFFFF;
        }
        .v3-step-item.disabled .v3-step-dot {
          background: #F1F5F9;
          color: #CBD5E1;
        }
        .v3-step-label {
          font-size: 0.825rem;
          font-weight: 600;
        }
        .v3-step-connector {
          width: 10px;
          height: 1.5px;
          background: #E2E8F0;
          margin-left: 0.2rem;
          flex-shrink: 0;
        }
        .v3-bottom-nav-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 45;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 -4px 20px -2px rgba(15, 23, 42, 0.08);
          padding: 0.75rem 1.5rem;
        }
        .v3-bottom-nav-inner {
          max-width: 1040px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }
        .v3-bottom-nav-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.2rem;
        }
        .v3-nav-step-pill {
          background: #F1F5F9;
          color: #334155;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.15rem 0.6rem;
          border-radius: 9999px;
          border: 1px solid #E2E8F0;
        }
        .v3-editor-body {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem 1.5rem 6rem;
        }
        .v3-editor-section {
          background: white;
          border-radius: 18px;
          border: 1px solid rgba(226, 232, 240, 0.85);
          padding: 1.75rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 4px 12px -2px rgba(15, 23, 42, 0.02);
        }
        .v3-section-compact {
          padding: 1.15rem 1.5rem;
        }
        .v3-section-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 1.15rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .v3-section-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.85rem;
        }
        .v3-section-hint {
          font-size: 0.825rem;
          color: #64748B;
          margin: -0.5rem 0 1.25rem;
        }
        .v3-count-badge {
          font-size: 0.75rem;
          background: #EFF6FF;
          color: #2563EB;
          padding: 0.2rem 0.6rem;
          border-radius: 9999px;
          font-weight: 700;
          border: 1px solid #DBEAFE;
        }
        .v3-hint-empty {
          color: #94A3B8;
          font-size: 0.875rem;
          font-style: italic;
          padding: 0.75rem 0;
        }
        .v3-info-grid {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .v3-info-row {
          display: flex;
          align-items: flex-start;
          padding: 0.65rem 0;
          border-bottom: 1px solid #F1F5F9;
          gap: 1.25rem;
        }
        .v3-info-row:last-child {
          border-bottom: none;
        }
        .v3-info-label {
          width: 140px;
          flex-shrink: 0;
          font-size: 0.825rem;
          font-weight: 600;
          color: #64748B;
        }
        .v3-info-value {
          flex: 1;
          font-size: 0.875rem;
          color: #1E293B;
        }
        .v3-focus-badge {
          background: #EFF6FF;
          color: #2563EB;
          padding: 0.2rem 0.6rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid #DBEAFE;
        }
        .v3-curriculum-summary {
          margin-top: 1.25rem;
          padding-top: 1.25rem;
          border-top: 1px solid #F1F5F9;
        }
        .v3-subsection-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: #334155;
          margin: 0 0 0.65rem;
        }
        .v3-indicator-summary {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .v3-indicator-chip {
          font-size: 0.825rem;
          color: #334155;
          background: #F8FAFC;
          padding: 0.45rem 0.8rem;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
        }
        .v3-indicator-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .v3-chip-tag {
          background: #EFF6FF;
          color: #1D4ED8;
          font-size: 0.8rem;
          padding: 0.25rem 0.65rem;
          border-radius: 8px;
          font-weight: 700;
          border: 1px solid #DBEAFE;
        }
        .v3-guidance-box {
          background: #EFF6FF;
          border-left: 3px solid #3B82F6;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          font-size: 0.85rem;
          color: #1E40AF;
          margin-bottom: 1.25rem;
        }
        .v3-hint-small {
          font-size: 0.75rem;
          color: #3B82F6;
        }
        .v3-obj-list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          margin-bottom: 1.25rem;
        }
        .v3-obj-card {
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 1.15rem;
          background: #FFFFFF;
          box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.03);
          transition: all 0.15s ease;
        }
        .v3-obj-card:hover {
          border-color: #CBD5E1;
          box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.06);
        }
        .v3-obj-header {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
        }
        .v3-obj-num {
          width: 26px;
          height: 26px;
          background: #2563EB;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          flex-shrink: 0;
          margin-top: 2px;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
        }
        .v3-obj-statement {
          flex: 1;
          font-size: 0.925rem;
          color: #0F172A;
          margin: 0;
          line-height: 1.5;
          font-weight: 500;
        }
        .v3-obj-textarea {
          flex: 1;
          min-height: 60px;
          resize: vertical;
        }
        .v3-obj-actions {
          display: flex;
          gap: 0.4rem;
          flex-shrink: 0;
        }
        .v3-obj-evidence {
          margin-top: 0.85rem;
          padding-top: 0.85rem;
          border-top: 1px solid #F1F5F9;
        }
        .v3-obj-evidence-label {
          font-size: 0.75rem;
          color: #64748B;
          margin: 0 0 0.5rem;
          font-weight: 600;
        }
        .v3-obj-evidence-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }
        .v3-evd-chip {
          font-size: 0.75rem;
          border: 1px solid #CBD5E1;
          border-radius: 9999px;
          padding: 0.25rem 0.7rem;
          background: white;
          cursor: pointer;
          color: #64748B;
          transition: all 0.15s;
          font-weight: 500;
        }
        .v3-evd-chip:hover {
          border-color: #3B82F6;
          color: #2563EB;
          background: #EFF6FF;
        }
        .v3-evd-chip.linked {
          background: #EFF6FF;
          border-color: #93C5FD;
          color: #1D4ED8;
          font-weight: 700;
        }
        .v3-evd-list {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          margin-bottom: 1.25rem;
        }
        .v3-evd-card {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.85rem 1rem;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          background: white;
        }
        .v3-evd-type-badge {
          background: #F1F5F9;
          color: #334155;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.25rem 0.6rem;
          border-radius: 8px;
          white-space: nowrap;
          flex-shrink: 0;
          border: 1px solid #E2E8F0;
        }
        .v3-evd-desc {
          flex: 1;
          font-size: 0.875rem;
          color: #0F172A;
          margin: 0;
          font-weight: 500;
        }
        .v3-add-form {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          background: #F8FAFC;
          border: 1px dashed #CBD5E1;
          border-radius: 12px;
          padding: 1rem;
        }
        .v3-add-evd-form {
          flex-direction: row;
          flex-wrap: wrap;
          align-items: center;
        }
        .v3-select-sm {
          width: auto;
          flex-shrink: 0;
        }
        .v3-section-summary {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
        }
        .v3-summary-grid {
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        .v3-summary-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }
        .v3-summary-num {
          font-size: 2rem;
          font-weight: 800;
          color: #2563EB;
          line-height: 1;
        }
        .v3-summary-label {
          font-size: 0.75rem;
          color: #64748B;
          font-weight: 600;
        }
        .v3-alignment-warning {
          background: #FFFBEB;
          border: 1px solid #FCD34D;
          border-radius: 12px;
          padding: 0.85rem 1rem;
          font-size: 0.85rem;
          color: #92400E;
          font-weight: 500;
        }
        .v3-alignment-warning ul {
          margin: 0.4rem 0 0;
          padding-left: 1.25rem;
        }
        .v3-step-nav-actions {
          display: flex;
          justify-content: space-between;
          padding-top: 1rem;
        }
        .v3-icon-btn {
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          font-size: 1rem;
          padding: 0.35rem;
          border-radius: 8px;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .v3-icon-btn:hover {
          background: #F1F5F9;
          border-color: #E2E8F0;
        }
        .v3-icon-danger:hover {
          background: #FFF1F2;
          border-color: #FECDD3;
        }
        .v3-badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.7rem;
          border-radius: 9999px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .v3-status-draft {
          background: #EFF6FF;
          color: #1D4ED8;
          border: 1px solid #DBEAFE;
        }
        .v3-status-blueprint_ready {
          background: #FEF3C7;
          color: #B45309;
          border: 1px solid #FDE68A;
        }
        .v3-status-final {
          background: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
        }
        .v3-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem 1.15rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          font-size: 0.875rem;
          transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          white-space: nowrap;
          text-decoration: none;
        }
        .v3-btn:active {
          transform: scale(0.98);
        }
        .v3-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }
        .v3-btn-primary {
          background: linear-gradient(180deg, #3B82F6 0%, #2563EB 100%);
          color: white;
          border-color: #1D4ED8;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.2);
        }
        .v3-btn-primary:hover:not(:disabled) {
          background: linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%);
          box-shadow: 0 4px 12px -2px rgba(37, 99, 235, 0.35);
          transform: translateY(-1px);
        }
        .v3-btn-secondary {
          background: white;
          color: #1E293B;
          border-color: #CBD5E1;
          box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.04);
        }
        .v3-btn-secondary:hover:not(:disabled) {
          background: #F8FAFC;
          border-color: #94A3B8;
          color: #0F172A;
          transform: translateY(-1px);
        }
        .v3-btn-ghost {
          background: transparent;
          color: #475569;
          border-color: #E2E8F0;
        }
        .v3-btn-ghost:hover:not(:disabled) {
          background: #F1F5F9;
          color: #0F172A;
          border-color: #CBD5E1;
        }
        .v3-btn-sm {
          padding: 0.4rem 0.85rem;
          font-size: 0.8rem;
          border-radius: 10px;
        }
        .v3-btn-xs {
          padding: 0.25rem 0.6rem;
          font-size: 0.75rem;
          border-radius: 8px;
        }
        .v3-input,
        .v3-select,
        .v3-textarea {
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          padding: 0.625rem 0.85rem;
          font-size: 0.875rem;
          color: #0F172A;
          background: white;
          font-family: inherit;
          width: 100%;
          box-sizing: border-box;
          transition: all 0.15s ease;
        }
        .v3-input:focus,
        .v3-select:focus,
        .v3-textarea:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .v3-textarea {
          resize: vertical;
          min-height: 52px;
          flex: 1;
        }
        .v3-loading-screen,
        .v3-error-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 1.25rem;
          color: #64748B;
        }
        .v3-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid #E2E8F0;
          border-top-color: #2563EB;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
