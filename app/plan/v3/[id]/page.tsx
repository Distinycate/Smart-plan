'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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

function StepNav({ currentStep, planId, lessonStatus, onNavigate }: { currentStep: number; planId: string; lessonStatus?: string; onNavigate: (step: number) => void }) {
  const steps = [
    'ข้อมูลแผน',
    'เป้าหมาย',
    'ออกแบบการเรียนรู้',
    'ประเมินผล',
    'ชุดพร้อมสอน',
    'ตรวจคุณภาพ',
    'เอกสารและพิมพ์',
    'ผลการสอน',
    'สะท้อนผลและหลักฐาน',
  ];
  return (
    <nav className="v3-step-nav" aria-label="ขั้นตอน">
      {steps.map((label, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
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
            className={`v3-step-item ${isActive ? 'active' : ''} ${!isAvailable ? 'disabled' : ''}`}
            onClick={() => isAvailable && !isActive ? onNavigate(step) : undefined}
            disabled={!isAvailable}
            title={!isAvailable ? (step === 7 ? 'ต้องผ่านการตรวจคุณภาพในขั้นที่ 6 ก่อน' : step === 8 ? 'ต้องล็อคแผนเป็น FINAL ก่อนบันทึกผลการสอน' : 'ต้องบันทึกผลการสอน (TAUGHT) ก่อนสะท้อนผล') : undefined}
            aria-current={isActive ? 'step' : undefined}
          >
            <div className="v3-step-dot">{step}</div>
            <span className="v3-step-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  const label = SAVE_STATE_LABELS[state];
  const cls = state === 'error' ? 'save-error' : state === 'saved' ? 'save-ok' : 'save-info';
  return <span className={`v3-save-indicator ${cls}`}>{label}</span>;
}

// ─── Step 1 View (read + edit) ───────────────────────────────────────────────

function Step1View({ lesson, curriculumLinks, onUpdate }: {
  lesson: V3LessonPlan;
  curriculumLinks: V3LessonCurriculumLink[];
  onUpdate: (patch: Partial<V3LessonPlan>) => void;
}) {
  return (
    <div className="v3-editor-section">
      <h2 className="v3-section-title">📌 ข้อมูลแผนการสอน</h2>

      <div className="v3-info-grid">
        <div className="v3-info-row">
          <span className="v3-info-label">วิชา</span>
          <span className="v3-info-value">{getSubjectLabel(lesson.subject_key)}</span>
        </div>
        <div className="v3-info-row">
          <span className="v3-info-label">ระดับชั้น</span>
          <span className="v3-info-value">{lesson.grade_level}</span>
        </div>
        <div className="v3-info-row">
          <span className="v3-info-label">เรื่อง</span>
          <span className="v3-info-value">{lesson.topic}</span>
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
          <h3 className="v3-subsection-title">📋 ตัวชี้วัด ({curriculumLinks.length} ข้อ)</h3>
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

      <Link href="/plan/v3/new" className="v3-btn v3-btn-ghost v3-btn-sm" style={{ marginTop: '1rem', display: 'inline-flex' }}>
        ← สร้างแผนใหม่
      </Link>
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
          <Step1View lesson={lesson} curriculumLinks={curriculumLinks} onUpdate={() => {}} />
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
            <div className="v3-step-nav-actions">
              <button
                className="v3-btn v3-btn-ghost"
                onClick={() => router.push(`/plan/v3/${planId}?step=1`)}
              >
                ← ย้อนกลับ
              </button>
              <button
                className="v3-btn v3-btn-primary"
                onClick={() => router.push(`/plan/v3/${planId}?step=3`)}
              >
                ไปขั้นที่ 3 — ออกแบบการเรียนรู้ →
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

      <style jsx>{`
        .v3-editor-page { min-height: 100vh; background: #F7FAFC; font-family: 'Noto Sans Thai', sans-serif; }
        .v3-editor-header { background: white; border-bottom: 1px solid #e2e8f0; padding: 0.75rem 2rem; }
        .v3-editor-header-inner { max-width: 900px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
        .v3-editor-breadcrumb { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: #4A5568; }
        .v3-breadcrumb-link { color: #4F46E5; text-decoration: none; }
        .v3-breadcrumb-link:hover { text-decoration: underline; }
        .v3-breadcrumb-sep { color: #CBD5E0; }
        .v3-editor-meta { display: flex; align-items: center; gap: 0.75rem; }
        .v3-save-indicator { font-size: 0.8rem; }
        .save-ok { color: #38A169; }
        .save-error { color: #E53E3E; }
        .save-info { color: #718096; }
        .v3-step-nav { display: flex; background: white; border-bottom: 1px solid #e2e8f0; padding: 0 2rem; overflow-x: auto; gap: 0; }
        .v3-step-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; cursor: pointer; white-space: nowrap; border: none; background: transparent; border-bottom: 2px solid transparent; transition: all 0.15s; font-family: inherit; }
        .v3-step-item.active { border-bottom-color: #4F46E5; color: #4F46E5; }
        .v3-step-item.disabled { color: #CBD5E0; cursor: not-allowed; }
        .v3-step-dot { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; flex-shrink: 0; }
        .v3-step-item.active .v3-step-dot { background: #4F46E5; color: white; }
        .v3-step-item.disabled .v3-step-dot { background: #EDF2F7; color: #CBD5E0; }
        .v3-step-label { font-size: 0.82rem; font-weight: 500; }
        .v3-editor-body { max-width: 800px; margin: 0 auto; padding: 2rem 1.5rem; }
        .v3-editor-section { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1.5rem; margin-bottom: 1.25rem; }
        .v3-section-compact { padding: 1rem 1.25rem; }
        .v3-section-title { font-size: 1rem; font-weight: 700; color: #2D3748; margin: 0 0 1rem; }
        .v3-section-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
        .v3-section-hint { font-size: 0.8rem; color: #718096; margin: -0.5rem 0 1rem; }
        .v3-count-badge { font-size: 0.75rem; background: #EEF2FF; color: #4F46E5; padding: 0.15rem 0.5rem; border-radius: 20px; font-weight: 600; }
        .v3-hint-empty { color: #A0AEC0; font-size: 0.875rem; font-style: italic; padding: 0.5rem 0; }
        .v3-info-grid { display: flex; flex-direction: column; gap: 0; }
        .v3-info-row { display: flex; align-items: flex-start; padding: 0.5rem 0; border-bottom: 1px solid #EDF2F7; gap: 1rem; }
        .v3-info-row:last-child { border-bottom: none; }
        .v3-info-label { width: 140px; flex-shrink: 0; font-size: 0.8rem; font-weight: 600; color: #718096; }
        .v3-info-value { flex: 1; font-size: 0.875rem; color: #2D3748; }
        .v3-focus-badge { background: #EEF2FF; color: #4F46E5; padding: 0.15rem 0.5rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; }
        .v3-curriculum-summary { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #EDF2F7; }
        .v3-subsection-title { font-size: 0.875rem; font-weight: 600; color: #4A5568; margin: 0 0 0.5rem; }
        .v3-indicator-summary { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.3rem; }
        .v3-indicator-chip { font-size: 0.8rem; color: #4A5568; background: #EDF2F7; padding: 0.3rem 0.6rem; border-radius: 6px; }
        .v3-indicator-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .v3-chip-tag { background: #EEF2FF; color: #4338CA; font-size: 0.8rem; padding: 0.2rem 0.5rem; border-radius: 6px; font-weight: 600; }
        .v3-guidance-box { background: #EBF8FF; border-left: 3px solid #63B3ED; border-radius: 6px; padding: 0.6rem 0.75rem; font-size: 0.82rem; color: #2B6CB0; margin-bottom: 1rem; }
        .v3-hint-small { font-size: 0.75rem; color: #4299E1; }
        .v3-obj-list { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
        .v3-obj-card { border: 1px solid #E2E8F0; border-radius: 10px; padding: 1rem; }
        .v3-obj-header { display: flex; align-items: flex-start; gap: 0.75rem; }
        .v3-obj-num { width: 24px; height: 24px; background: #4F46E5; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; flex-shrink: 0; margin-top: 2px; }
        .v3-obj-statement { flex: 1; font-size: 0.9rem; color: #2D3748; margin: 0; line-height: 1.5; }
        .v3-obj-textarea { flex: 1; min-height: 60px; resize: vertical; }
        .v3-obj-actions { display: flex; gap: 0.4rem; flex-shrink: 0; }
        .v3-obj-evidence { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #EDF2F7; }
        .v3-obj-evidence-label { font-size: 0.75rem; color: #718096; margin: 0 0 0.4rem; }
        .v3-obj-evidence-list { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .v3-evd-chip { font-size: 0.75rem; border: 1px solid #CBD5E0; border-radius: 20px; padding: 0.2rem 0.6rem; background: white; cursor: pointer; color: #718096; transition: all 0.1s; }
        .v3-evd-chip.linked { background: #EEF2FF; border-color: #A5B4FC; color: #4338CA; font-weight: 600; }
        .v3-evd-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
        .v3-evd-card { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border: 1px solid #E2E8F0; border-radius: 8px; }
        .v3-evd-type-badge { background: #EDF2F7; color: #4A5568; font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 6px; white-space: nowrap; flex-shrink: 0; }
        .v3-evd-desc { flex: 1; font-size: 0.875rem; color: #2D3748; margin: 0; }
        .v3-add-form { display: flex; flex-direction: column; gap: 0.5rem; background: #FAFAFA; border: 1px dashed #CBD5E0; border-radius: 8px; padding: 0.75rem; }
        .v3-add-evd-form { flex-direction: row; flex-wrap: wrap; align-items: center; }
        .v3-select-sm { width: auto; flex-shrink: 0; }
        .v3-section-summary { background: #FAFAFA; }
        .v3-summary-grid { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
        .v3-summary-item { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
        .v3-summary-num { font-size: 1.75rem; font-weight: 700; color: #4F46E5; }
        .v3-summary-label { font-size: 0.75rem; color: #718096; }
        .v3-alignment-warning { background: #FFFBEB; border: 1px solid #F6AD55; border-radius: 8px; padding: 0.75rem; font-size: 0.85rem; color: #92400E; }
        .v3-alignment-warning ul { margin: 0.4rem 0 0; padding-left: 1.25rem; }
        .v3-step-nav-actions { display: flex; justify-content: space-between; padding-top: 1rem; }
        .v3-icon-btn { background: transparent; border: none; cursor: pointer; font-size: 1rem; padding: 0.25rem; border-radius: 4px; transition: background 0.1s; }
        .v3-icon-btn:hover { background: #EDF2F7; }
        .v3-icon-danger:hover { background: #FFF5F5; }
        .v3-badge { font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 20px; font-weight: 600; }
        .v3-status-draft { background: #EEF2FF; color: #4F46E5; }
        .v3-status-blueprint_ready { background: #FEF3C7; color: #B45309; }
        .v3-status-final { background: #D1FAE5; color: #065F46; }
        .v3-btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1rem; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; font-size: 0.875rem; transition: all 0.15s; font-family: inherit; white-space: nowrap; }
        .v3-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .v3-btn-primary { background: #4F46E5; color: white; }
        .v3-btn-primary:hover:not(:disabled) { background: #4338CA; }
        .v3-btn-ghost { background: transparent; color: #718096; border: 1px solid #CBD5E0; text-decoration: none; }
        .v3-btn-ghost:hover:not(:disabled) { background: #F7FAFC; }
        .v3-btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8rem; }
        .v3-btn-xs { padding: 0.25rem 0.5rem; font-size: 0.75rem; }
        .v3-input, .v3-select, .v3-textarea { border: 1px solid #CBD5E0; border-radius: 8px; padding: 0.55rem 0.75rem; font-size: 0.875rem; color: #2D3748; background: white; font-family: inherit; width: 100%; box-sizing: border-box; }
        .v3-input:focus, .v3-select:focus, .v3-textarea:focus { outline: none; border-color: #4F46E5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
        .v3-textarea { resize: vertical; min-height: 48px; flex: 1; }
        .v3-loading-screen, .v3-error-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 1rem; color: #718096; }
        .v3-spinner { width: 32px; height: 32px; border: 3px solid #EDF2F7; border-top-color: #4F46E5; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
