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
import './plan-editor.css';
import {
  getObjectiveSuggestions,
  getEvidenceSuggestions,
  ObjectiveCandidate,
  EvidenceCandidate,
} from '@/lib/smartPlanV3/suggestions';

import TeacherProfileBanner from '@/components/smartPlanV3/TeacherProfileBanner';

// ─── Sub-components ─────────────────────────────────────────────────────────

function StepHeroBanner({
  step,
  title,
  description,
  badgeText,
  badgeVariant = 'blue',
  metrics,
}: {
  step: number;
  title: string;
  description: string;
  badgeText?: string;
  badgeVariant?: 'blue' | 'emerald' | 'amber' | 'indigo';
  metrics?: { label: string; value: string | number; color?: string; highlight?: boolean }[];
}) {
  const phaseMap: Record<number, { name: string; num: number }> = {
    1: { name: 'ระยะที่ 1: กำหนดเป้าหมาย (Foundation)', num: 1 },
    2: { name: 'ระยะที่ 1: กำหนดเป้าหมาย (Foundation)', num: 1 },
    3: { name: 'ระยะที่ 2: จัดการเรียนรู้ (Active Learning)', num: 2 },
    4: { name: 'ระยะที่ 2: จัดการเรียนรู้ (Active Learning)', num: 2 },
    5: { name: 'ระยะที่ 2: จัดการเรียนรู้ (Active Learning)', num: 2 },
    6: { name: 'ระยะที่ 3: สรุปเอกสาร & ว.PA (Quality & Accountability)', num: 3 },
    7: { name: 'ระยะที่ 3: สรุปเอกสาร & ว.PA (Quality & Accountability)', num: 3 },
    8: { name: 'ระยะที่ 3: สรุปเอกสาร & ว.PA (Quality & Accountability)', num: 3 },
    9: { name: 'ระยะที่ 3: สรุปเอกสาร & ว.PA (Quality & Accountability)', num: 3 },
  };

  const phase = phaseMap[step] || { name: 'ภาพรวมแผนการสอน', num: 1 };

  return (
    <div className="v3-step-hero">
      <div className="v3-step-hero-content">
        <div className="v3-step-hero-tags">
          <span className="v3-phase-pill">
            {phase.name}
          </span>
          <span className="v3-step-pill-counter">
            ขั้นตอนที่ {step} จาก 9
          </span>
          {badgeText && (
            <span className={`v3-hero-badge v3-hero-badge-${badgeVariant}`}>
              {badgeText}
            </span>
          )}
        </div>
        <h1 className="v3-step-hero-title">{title}</h1>
        <p className="v3-step-hero-desc">{description}</p>
      </div>

      {metrics && metrics.length > 0 && (
        <div className="v3-step-hero-metrics">
          {metrics.map((m, idx) => (
            <div key={idx} className="v3-hero-metric-item">
              <span className="v3-hero-metric-val" style={{ color: m.color || (m.highlight ? '#0071E3' : '#1D1D1F') }}>
                {m.value}
              </span>
              <span className="v3-hero-metric-lbl">{m.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const phases = [
    {
      id: 1,
      title: 'ระยะที่ 1: กำหนดเป้าหมาย',
      steps: [
        { num: 1, label: 'ข้อมูลแผน' },
        { num: 2, label: 'เป้าหมาย K-P-A' },
      ],
    },
    {
      id: 2,
      title: 'ระยะที่ 2: จัดการเรียนรู้',
      steps: [
        { num: 3, label: 'กิจกรรม' },
        { num: 4, label: 'ประเมินผล' },
        { num: 5, label: 'ชุดพร้อมสอน' },
      ],
    },
    {
      id: 3,
      title: 'ระยะที่ 3: เอกสาร & ว.PA',
      steps: [
        { num: 6, label: 'ตรวจคุณภาพ' },
        { num: 7, label: 'เอกสาร A4' },
        { num: 8, label: 'ผลการสอน' },
        { num: 9, label: 'สะท้อนผล' },
      ],
    },
  ];

  const currentPhaseId = currentStep <= 2 ? 1 : currentStep <= 5 ? 2 : 3;
  const progressPercent = Math.round((currentStep / 9) * 100);

  const isStepAvailable = (step: number) => {
    if (step <= 6) return true;
    if (step === 7) return ['REVIEWED', 'FINAL', 'TAUGHT', 'REFLECTED'].includes(lessonStatus || '');
    if (step === 8) return ['FINAL', 'TAUGHT', 'REFLECTED'].includes(lessonStatus || '');
    if (step === 9) return ['TAUGHT', 'REFLECTED'].includes(lessonStatus || '');
    return false;
  };

  return (
    <div className="v3-step-nav-wrapper">
      {/* Top Hairline Progress Bar */}
      <div className="v3-progress-track">
        <div
          className="v3-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <nav className="v3-step-nav" aria-label="ขั้นตอนการจัดทำแผน">
        <div className="v3-stepper-phases">
          {phases.map(phase => {
            const isPhaseActive = phase.id === currentPhaseId;
            const isPhasePast = phase.id < currentPhaseId;

            return (
              <div
                key={phase.id}
                className={`v3-stepper-phase-group ${isPhaseActive ? 'phase-active' : ''} ${isPhasePast ? 'phase-completed' : ''}`}
              >
                <div className="v3-phase-header">
                  <span className="v3-phase-indicator">
                    {isPhasePast ? '✓' : `0${phase.id}`}
                  </span>
                  <span className="v3-phase-title">{phase.title}</span>
                </div>

                <div className="v3-phase-steps">
                  {phase.steps.map(stepItem => {
                    const step = stepItem.num;
                    const isActive = step === currentStep;
                    const isCompleted = step < currentStep;
                    const isAvailable = isStepAvailable(step);

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
                        <span className="v3-step-label">{stepItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
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
      {state === 'saving' && <div className="w-3 h-3 rounded-full border-2 border-[#0071E3] border-t-transparent animate-spin" />}
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
    <div className="space-y-6">
      {/* Permanent Teacher & School Profile Banner */}
      <TeacherProfileBanner compact />

      <div className="v3-editor-section">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#0071E3] border border-blue-100/80 flex items-center justify-center font-bold text-sm shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="v3-section-title" style={{ margin: 0 }}>ข้อมูลแผนการสอน</h2>
              <p className="v3-section-hint" style={{ margin: 0 }}>รายละเอียดรายวิชาและหน่วยการเรียนรู้</p>
            </div>
          </div>
          <span className="v3-badge v3-status-draft">
            {formatDuration(lesson.duration_minutes)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/60">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">รายวิชา</span>
            <span className="text-base font-bold text-slate-900">{getSubjectLabel(lesson.subject_key)}</span>
          </div>

          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/60">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">ระดับชั้น</span>
            <span className="text-base font-bold text-slate-900">{lesson.grade_level}</span>
          </div>

          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/60 md:col-span-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">หัวข้อเรื่อง (Topic)</span>
            <span className="text-lg font-bold text-[#0071E3]">{lesson.topic}</span>
          </div>

          {lesson.learning_focus && (
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/70">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide block mb-1">ลักษณะการเรียนรู้</span>
              <span className="text-sm font-bold text-blue-900">{lesson.learning_focus}</span>
            </div>
          )}

          {lesson.unit_reference && (
            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/60">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">หน่วยการเรียนรู้</span>
              <span className="text-sm font-semibold text-slate-800">{lesson.unit_reference}</span>
            </div>
          )}
        </div>

        {curriculumLinks.length > 0 && (
          <div className="v3-curriculum-summary mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="v3-subsection-title" style={{ margin: 0 }}>
                📋 ตัวชี้วัดที่เลือก ({curriculumLinks.length} ข้อ)
              </h3>
              <span className="text-xs text-slate-500 font-medium">จำแนกตาม ว1532/2566</span>
            </div>
            <ul className="v3-indicator-summary">
              {curriculumLinks.map(link => {
                const text = link.indicator_label_snapshot || '';
                const isFormative = text.includes('[ระหว่างทาง]') || link.indicator_code.includes('ระหว่าง');
                const isSummative = text.includes('[ปลายทาง]') || link.indicator_code.includes('ปลายทาง');
                const cleanText = text.replace(/\[(ระหว่างทาง|ปลายทาง)\]\s*/g, '');

                return (
                  <li key={link.id} className="v3-indicator-chip" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <strong style={{ color: '#1D1D1F' }}>{link.indicator_code}</strong>
                    {isFormative && (
                      <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '9999px', background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', fontWeight: 600 }}>
                        🟢 ระหว่างทาง
                      </span>
                    )}
                    {isSummative && (
                      <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '9999px', background: '#FAF5FF', color: '#6B21A8', border: '1px solid #E9D5FF', fontWeight: 600 }}>
                        🟣 ปลายทาง
                      </span>
                    )}
                    {cleanText && <span style={{ color: '#64748B', fontSize: '0.85rem' }}>— {cleanText}</span>}
                  </li>
                );
              })}
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

  const statement = obj.statement || '';
  const isK = statement.includes('(K)') || statement.includes('ความรู้');
  const isP = statement.includes('(P)') || statement.includes('ทักษะ');
  const isA = statement.includes('(A)') || statement.includes('คุณลักษณะ') || statement.includes('เจตคติ');

  return (
    <div className="v3-obj-card">
      <div className="v3-obj-header">
        <span className="v3-obj-num">{index + 1}</span>
        {!editing ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              {isK && (
                <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '9999px', background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', fontWeight: 700 }}>
                  📘 K - ด้านความรู้
                </span>
              )}
              {isP && (
                <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '9999px', background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', fontWeight: 700 }}>
                  🛠️ P - ด้านทักษะ/ปฏิบัติ
                </span>
              )}
              {isA && (
                <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '9999px', background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A', fontWeight: 700 }}>
                  🌟 A - คุณลักษณะอันพึงประสงค์
                </span>
              )}
            </div>
            <p className="v3-obj-statement">{obj.statement}</p>
          </div>
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

  // ─── Objective Operations (Instant Optimistic UI 0ms) ───────────────────

  const addObjective = async () => {
    if (!newObjText.trim() || !planId) return;
    const tempId = 'temp-obj-' + Date.now();
    const optimisticObj: V3LessonObjective = {
      id: tempId,
      lesson_plan_id: planId,
      statement: newObjText.trim(),
      position: objectives.length,
      objective_type: null,
      observable_behavior: null,
      source: 'MANUAL',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // 0ms instant local render
    setObjectives(prev => [...prev, optimisticObj]);
    setNewObjText('');
    setSaveState('saving');

    try {
      const res = await fetch(`/api/plan/v3/${planId}/objectives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement: optimisticObj.statement, position: optimisticObj.position }),
      });
      const data = await res.json();
      if (data.success) {
        setObjectives(prev => prev.map(o => o.id === tempId ? data.data : o));
        setSaveState('saved');
      } else {
        setObjectives(prev => prev.filter(o => o.id !== tempId));
        setSaveState('error');
      }
    } catch {
      setObjectives(prev => prev.filter(o => o.id !== tempId));
      setSaveState('error');
    } finally {
      setTimeout(() => setSaveState('idle'), 2000);
    }
  };

  const deleteObjective = async (objId: string) => {
    if (!window.confirm('ลบจุดประสงค์นี้ใช่หรือไม่?')) return;
    const previousObjs = [...objectives];
    const previousLinks = [...objEvdLinks];
    // 0ms instant local removal
    setObjectives(prev => prev.filter(o => o.id !== objId));
    setObjEvdLinks(prev => prev.filter(l => l.objective_id !== objId));
    setSaveState('saving');

    try {
      const res = await fetch(`/api/plan/v3/${planId}/objectives/${objId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSaveState('saved');
      } else {
        setObjectives(previousObjs);
        setObjEvdLinks(previousLinks);
        setSaveState('error');
      }
    } catch {
      setObjectives(previousObjs);
      setObjEvdLinks(previousLinks);
      setSaveState('error');
    } finally {
      setTimeout(() => setSaveState('idle'), 2000);
    }
  };

  const updateObjective = async (objId: string, statement: string) => {
    if (!statement.trim()) return;
    const previousObjs = [...objectives];
    // 0ms instant local update
    setObjectives(prev => prev.map(o => o.id === objId ? { ...o, statement } : o));
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
      } else {
        setObjectives(previousObjs);
        setSaveState('error');
      }
    } catch {
      setObjectives(previousObjs);
      setSaveState('error');
    } finally {
      setTimeout(() => setSaveState('idle'), 2000);
    }
  };

  // ─── Evidence Operations (Instant Optimistic UI 0ms) ────────────────────

  const addEvidence = async () => {
    if (!newEvdDesc.trim() || !planId) return;
    const tempId = 'temp-evd-' + Date.now();
    const optimisticEvd: V3LearningEvidence = {
      id: tempId,
      lesson_plan_id: planId,
      evidence_type: newEvdType,
      description: newEvdDesc.trim(),
      position: evidence.length,
      source: 'MANUAL',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // 0ms instant local render
    setEvidence(prev => [...prev, optimisticEvd]);
    setNewEvdDesc('');
    setSaveState('saving');

    try {
      const res = await fetch(`/api/plan/v3/${planId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence_type: optimisticEvd.evidence_type,
          description: optimisticEvd.description,
          position: optimisticEvd.position,
          source: 'MANUAL',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEvidence(prev => prev.map(e => e.id === tempId ? data.data : e));
        setSaveState('saved');
      } else {
        setEvidence(prev => prev.filter(e => e.id !== tempId));
        setSaveState('error');
      }
    } catch {
      setEvidence(prev => prev.filter(e => e.id !== tempId));
      setSaveState('error');
    } finally {
      setTimeout(() => setSaveState('idle'), 2000);
    }
  };

  const deleteEvidence = async (evdId: string) => {
    if (!window.confirm('ลบหลักฐานนี้ใช่หรือไม่?')) return;
    const previousEvd = [...evidence];
    const previousLinks = [...objEvdLinks];
    // 0ms instant local removal
    setEvidence(prev => prev.filter(e => e.id !== evdId));
    setObjEvdLinks(prev => prev.filter(l => l.evidence_id !== evdId));
    setSaveState('saving');

    try {
      const res = await fetch(`/api/plan/v3/${planId}/evidence?evidenceId=${evdId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSaveState('saved');
      } else {
        setEvidence(previousEvd);
        setObjEvdLinks(previousLinks);
        setSaveState('error');
      }
    } catch {
      setEvidence(previousEvd);
      setObjEvdLinks(previousLinks);
      setSaveState('error');
    } finally {
      setTimeout(() => setSaveState('idle'), 2000);
    }
  };

  // ─── Link Operations (Instant Optimistic UI 0ms) ────────────────────────

  const linkEvidence = async (objId: string, evdId: string) => {
    // 0ms instant local link toggle
    const newLink: V3ObjectiveEvidenceLink = {
      objective_id: objId,
      evidence_id: evdId,
      created_at: new Date().toISOString(),
    };
    setObjEvdLinks(prev => [...prev, newLink]);

    try {
      const res = await fetch(`/api/plan/v3/${planId}/evidence-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objective_id: objId, evidence_id: evdId }),
      });
      const data = await res.json();
      if (!data.success) {
        setObjEvdLinks(prev => prev.filter(l => !(l.objective_id === objId && l.evidence_id === evdId)));
      }
    } catch {
      setObjEvdLinks(prev => prev.filter(l => !(l.objective_id === objId && l.evidence_id === evdId)));
    }
  };

  const unlinkEvidence = async (objId: string, evdId: string) => {
    // 0ms instant local unlink
    const previousLinks = [...objEvdLinks];
    setObjEvdLinks(prev => prev.filter(l => !(l.objective_id === objId && l.evidence_id === evdId)));

    try {
      const res = await fetch(`/api/plan/v3/${planId}/evidence-links`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objective_id: objId, evidence_id: evdId }),
      });
      const data = await res.json();
      if (!data.success) {
        setObjEvdLinks(previousLinks);
      }
    } catch {
      setObjEvdLinks(previousLinks);
    }
  };

  // ─── Guided Choice Operations (Instant Optimistic UI 0ms) ───────────────

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
    // 1. Instant 0ms optimistic UI item!
    const tempId = 'temp-cand-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const optimisticObj: V3LessonObjective = {
      id: tempId,
      lesson_plan_id: planId,
      statement: candidate.statement,
      position: objectives.length,
      objective_type: candidate.category || null,
      observable_behavior: null,
      source: 'MANUAL',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setObjectives(prev => [...prev, optimisticObj]);
    setSaveState('saving');

    // 2. Background sync
    try {
      const res = await fetch(`/api/plan/v3/${planId}/objectives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement: candidate.statement, position: objectives.length }),
      });
      const data = await res.json();
      if (data.success) {
        setObjectives(prev => prev.map(o => o.id === tempId ? data.data : o));
        setSaveState('saved');
      } else {
        setObjectives(prev => prev.filter(o => o.id !== tempId));
        setSaveState('error');
      }
    } catch {
      setObjectives(prev => prev.filter(o => o.id !== tempId));
      setSaveState('error');
    } finally {
      setTimeout(() => setSaveState('idle'), 1800);
    }
  };

  const selectAllKpaCandidates = async () => {
    if (!planId || objCandidates.length === 0) return;
    const candidatesToAdd = objCandidates.filter(
      c => !objectives.some(o => o.statement === c.statement)
    );
    if (candidatesToAdd.length === 0) return;

    // 1. Instant 0ms optimistic UI update for ALL 3 items simultaneously!
    const now = Date.now();
    const optimisticEntries = candidatesToAdd.map((c, i) => ({
      tempId: `temp-kpa-${now}-${i}`,
      candidate: c,
      position: objectives.length + i,
    }));

    const optimisticObjs: V3LessonObjective[] = optimisticEntries.map(e => ({
      id: e.tempId,
      lesson_plan_id: planId,
      statement: e.candidate.statement,
      position: e.position,
      objective_type: e.candidate.category || null,
      observable_behavior: null,
      source: 'MANUAL',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Instantly renders all 3 items in 0ms!
    setObjectives(prev => [...prev, ...optimisticObjs]);
    setSaveState('saving');

    // 2. Fire parallel background server syncs
    try {
      const syncPromises = optimisticEntries.map(async entry => {
        const res = await fetch(`/api/plan/v3/${planId}/objectives`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ statement: entry.candidate.statement, position: entry.position }),
        });
        const json = await res.json();
        return { tempId: entry.tempId, realObj: json.success ? json.data : null };
      });

      const results = await Promise.all(syncPromises);
      setObjectives(prev => {
        let current = [...prev];
        for (const r of results) {
          if (r.realObj) {
            current = current.map(o => o.id === r.tempId ? r.realObj : o);
          } else {
            current = current.filter(o => o.id !== r.tempId);
          }
        }
        return current;
      });
      setSaveState('saved');
    } catch {
      setSaveState('error');
    } finally {
      setTimeout(() => setSaveState('idle'), 1800);
    }
  };

  const selectEvidenceCandidate = async (candidate: EvidenceCandidate) => {
    if (!planId) return;
    const tempEvdId = 'temp-evdcand-' + Date.now();
    const optimisticEvd: V3LearningEvidence = {
      id: tempEvdId,
      lesson_plan_id: planId,
      evidence_type: candidate.evidenceType,
      description: candidate.description,
      position: evidence.length,
      source: 'MANUAL',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Instant 0ms optimistic evidence addition
    setEvidence(prev => [...prev, optimisticEvd]);

    // Auto-link to latest unlinked objective or first objective immediately in state
    const unlinkedObj = objectives.find(o => !objEvdLinks.some(l => l.objective_id === o.id)) || objectives[0];
    if (unlinkedObj) {
      setObjEvdLinks(prev => [...prev, {
        objective_id: unlinkedObj.id,
        evidence_id: tempEvdId,
        created_at: new Date().toISOString(),
      }]);
    }
    setSaveState('saving');

    // 2. Background sync
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
        const realEvd = data.data;
        setEvidence(prev => prev.map(e => e.id === tempEvdId ? realEvd : e));
        if (unlinkedObj) {
          setObjEvdLinks(prev => prev.map(l => l.evidence_id === tempEvdId ? { ...l, evidence_id: realEvd.id } : l));
          await linkEvidence(unlinkedObj.id, realEvd.id);
        }
        setSaveState('saved');
      } else {
        setEvidence(prev => prev.filter(e => e.id !== tempEvdId));
        setObjEvdLinks(prev => prev.filter(l => l.evidence_id !== tempEvdId));
        setSaveState('error');
      }
    } catch {
      setEvidence(prev => prev.filter(e => e.id !== tempEvdId));
      setObjEvdLinks(prev => prev.filter(l => l.evidence_id !== tempEvdId));
      setSaveState('error');
    } finally {
      setTimeout(() => setSaveState('idle'), 1800);
    }
  };

  // ─── Alignment Summary ────────────────────────────────────────────────────

  const objectivesWithoutEvidence = objectives.filter(obj =>
    !objEvdLinks.some(l => l.objective_id === obj.id)
  );

  const hasK = objectives.some(o => o.statement.includes('(K)') || o.statement.includes('ความรู้'));
  const hasP = objectives.some(o => o.statement.includes('(P)') || o.statement.includes('ทักษะ'));
  const hasA = objectives.some(o => o.statement.includes('(A)') || o.statement.includes('คุณลักษณะ') || o.statement.includes('เจตคติ'));
  const isKpaComplete = hasK && hasP && hasA;

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
          <div className="space-y-6">
            <StepHeroBanner
              step={1}
              title="ข้อมูลแผนการสอนและตัวชี้วัดหลักสูตรแกนกลาง"
              description="ตรวจสอบข้อมูลพื้นฐานของแผน รายวิชา ระดับชั้น เวลาเรียน และตัวชี้วัดระหว่างทาง/ปลายทางตามเกณฑ์มาตรฐาน ว1532/2566"
              badgeText={getStatusLabel(lesson.status)}
              badgeVariant="blue"
              metrics={[
                { label: 'เวลาเรียน', value: formatDuration(lesson.duration_minutes), color: '#0071E3' },
                { label: 'ตัวชี้วัด', value: `${curriculumLinks.length} ข้อ`, color: '#34C759' },
              ]}
            />
            <Step1View
              lesson={lesson}
              curriculumLinks={curriculumLinks}
              onUpdate={() => {}}
              onNext={() => router.push(`/plan/v3/${planId}?step=2`)}
            />
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <StepHeroBanner
              step={2}
              title="เป้าหมายการเรียนรู้ (K - P - A) และหลักฐานเชิงประจักษ์"
              description="กำหนดจุดประสงค์การเรียนรู้ให้ครบทั้ง 3 ด้าน (ความรู้ ทักษะ เจตคติ) และเชื่อมโยงกับชิ้นงาน/ภาระงานตามเกณฑ์ ว.PA"
              badgeText={isKpaComplete ? '✓ ครบ 3 ด้าน (K-P-A)' : '⚠️ ยังไม่ครบ 3 ด้าน'}
              badgeVariant={isKpaComplete ? 'emerald' : 'amber'}
              metrics={[
                { label: 'จุดประสงค์ทั้งหมด', value: `${objectives.length} ข้อ`, color: '#0071E3' },
                { label: 'หลักฐานการเรียนรู้', value: `${evidence.length} รายการ`, color: '#34C759' },
                { label: 'ตัวชี้วัดที่เลือก', value: `${curriculumLinks.length} ข้อ`, color: '#64748B' },
              ]}
            />
            {/* ─ Curriculum Summary ─ */}
            {curriculumLinks.length > 0 && (
              <div className="v3-editor-section v3-section-compact">
                <h2 className="v3-section-title">📋 ตัวชี้วัดที่เลือก ({curriculumLinks.length} ข้อ)</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {curriculumLinks.map(link => {
                    const text = link.indicator_label_snapshot || '';
                    const isFormative = text.includes('[ระหว่างทาง]') || link.indicator_code.includes('ระหว่าง');
                    const isSummative = text.includes('[ปลายทาง]') || link.indicator_code.includes('ปลายทาง');
                    const cleanText = text.replace(/\[(ระหว่างทาง|ปลายทาง)\]\s*/g, '');

                    return (
                      <span
                        key={link.id}
                        className="v3-chip-tag"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          padding: '0.3rem 0.65rem',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                        }}
                        title={cleanText || link.indicator_code}
                      >
                        <span style={{ fontWeight: 700, color: '#1E293B' }}>{link.indicator_code}</span>
                        {isFormative && (
                          <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', borderRadius: '9999px', background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', fontWeight: 600 }}>
                            🟢 ระหว่างทาง
                          </span>
                        )}
                        {isSummative && (
                          <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', borderRadius: '9999px', background: '#FAF5FF', color: '#6B21A8', border: '1px solid #E9D5FF', fontWeight: 600 }}>
                            🟣 ปลายทาง
                          </span>
                        )}
                        {cleanText && <span style={{ color: '#64748B', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cleanText}</span>}
                      </span>
                    );
                  })}
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
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                  <br /><span className="v3-hint-small">สำหรับแผน {formatDuration(lesson.duration_minutes)} ควรมีจุดประสงค์ที่ชัดเจนครอบคลุม K - P - A (2–3 ข้อ)</span>
                </div>
              )}

              {/* 💡 Guided Objective Suggestion Cards */}
              {objCandidates.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1E293B' }}>
                      💡 ข้อเสนอจุดประสงค์การเรียนรู้ตามเกณฑ์ ว.PA (K-P-A):
                    </span>
                    <button
                      type="button"
                      onClick={selectAllKpaCandidates}
                      disabled={addingObj || objCandidates.every(c => objectives.some(o => o.statement === c.statement))}
                      className="v3-btn v3-btn-primary v3-btn-sm"
                      style={{ fontSize: '0.8rem', padding: '0.45rem 1.1rem', background: '#0071E3', borderRadius: '980px', fontWeight: 600, boxShadow: '0 2px 8px rgba(0, 113, 227, 0.28)' }}
                    >
                      ✨ เลือกครบชุด K-P-A อัตโนมัติ (3 ด้าน)
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                    {objCandidates.map((c) => {
                      const alreadyAdded = objectives.some(o => o.statement === c.statement);
                      const isK = c.category === 'K' || c.statement.includes('(K)');
                      const isP = c.category === 'P' || c.statement.includes('(P)');
                      const isA = c.category === 'A' || c.statement.includes('(A)');

                      const badgeLabel = isK ? '📘 K - ด้านความรู้' : isP ? '🛠️ P - ด้านทักษะ/ปฏิบัติ' : isA ? '🌟 A - คุณลักษณะ' : c.levelLabelTh;
                      const badgeCls = isK ? 'bg-blue-50 text-blue-800 border-blue-200' : isP ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : isA ? 'bg-amber-50 text-amber-800 border-amber-200' : (c.levelBadgeCls || 'bg-slate-100 text-slate-800 border-slate-200');

                      return (
                        <div
                          key={c.id}
                          style={{
                            border: alreadyAdded ? '1.5px solid #34C759' : isK ? '1.5px solid #BFDBFE' : isP ? '1.5px solid #A7F3D0' : isA ? '1.5px solid #FDE68A' : '1px solid rgba(0, 0, 0, 0.08)',
                            borderRadius: '16px',
                            padding: '1rem',
                            background: alreadyAdded ? '#F0FDF4' : '#FFFFFF',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  padding: '0.15rem 0.55rem',
                                  borderRadius: '980px',
                                  border: '1px solid',
                                }}
                                className={badgeCls}
                              >
                                {badgeLabel}
                              </span>
                              {alreadyAdded && (
                                <span style={{ fontSize: '0.75rem', color: '#15803D', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  ✓ เลือกแล้ว
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: '0.875rem', color: '#1D1D1F', lineHeight: '1.45', margin: '0 0 0.45rem', fontWeight: 500 }}>
                              {c.statement}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: '#86868B', margin: 0 }}>
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
                                padding: '0.45rem 0.75rem',
                                borderRadius: '980px',
                                background: alreadyAdded ? '#ECFDF5' : '#0071E3',
                                color: alreadyAdded ? '#047857' : '#FFFFFF',
                                border: alreadyAdded ? '1px solid #A7F3D0' : 'none',
                                fontWeight: 600,
                                cursor: alreadyAdded ? 'default' : 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {alreadyAdded ? '✓ เลือกแล้ว' : '+ เลือกใช้ข้อนี้'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNewObjText(c.statement);
                                setShowManualObj(true);
                              }}
                              style={{
                                fontSize: '0.8rem',
                                padding: '0.45rem 0.75rem',
                                borderRadius: '980px',
                                background: '#F8FAFC',
                                color: '#475569',
                                border: '1px solid #E2E8F0',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              title="นำข้อความไปแก้ไขในช่องพิมพ์"
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
                            border: '1px solid rgba(0, 0, 0, 0.08)',
                            borderRadius: '14px',
                            padding: '0.85rem 1rem',
                            background: alreadyAdded ? '#F8FAFC' : '#FFFFFF',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1D1D1F' }}>
                                {ev.labelTh}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.1rem 0.5rem',
                                  borderRadius: '980px',
                                  background: ev.recommended ? '#ECFDF5' : '#F1F5F9',
                                  color: ev.recommended ? '#047857' : '#475569',
                                  border: ev.recommended ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                                  fontWeight: 600,
                                }}
                              >
                                {ev.tag}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0 0 0.5rem', lineHeight: '1.45' }}>
                              {ev.description}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #F1F5F9' }}>
                            <button
                              type="button"
                              onClick={() => selectEvidenceCandidate(ev)}
                              disabled={addingEvd}
                              style={{
                                flex: 1,
                                fontSize: '0.75rem',
                                padding: '0.4rem 0.65rem',
                                borderRadius: '980px',
                                background: '#0071E3',
                                color: '#FFFFFF',
                                border: 'none',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
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
                                padding: '0.4rem 0.65rem',
                                borderRadius: '980px',
                                background: '#F8FAFC',
                                color: '#475569',
                                border: '1px solid #E2E8F0',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
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
          <>
            <StepHeroBanner
              step={3}
              title="ออกแบบกิจกรรมการเรียนรู้ (Learning Flow)"
              description="วางลำดับขั้นการสอน นำ-สอน-สรุป จัดสรรเวลาให้ครบตามคาบ และเชื่อมโยงทุกกิจกรรมเข้ากับเป้าหมาย K-P-A อย่างสอดคล้อง"
              badgeText="03 กิจกรรม"
              badgeVariant="blue"
              metrics={[
                { label: 'เวลารวม', value: `${activities.reduce((s, a) => s + (a.minutes || 0), 0)}/${lesson?.duration_minutes || 60} นาที`, highlight: true },
                { label: 'จำนวนกิจกรรม', value: `${activities.length} ขั้น` },
                { label: 'เป้าหมาย K-P-A', value: `${objectives.length} ข้อ` },
              ]}
            />
            <Step3Activities
              planId={planId}
              lesson={lesson!}
              objectives={objectives}
              evidence={evidence}
              curriculumLinks={curriculumLinks}
              objEvdLinks={objEvdLinks}
              onLessonStatusChange={(newStatus) => {
                setLesson(prev => prev ? { ...prev, status: newStatus } : null);
              }}
              onNavigateToStep={(s) => router.push(`/plan/v3/${planId}?step=${s}`)}
            />
          </>
        )}

        {currentStep === 4 && (
          <>
            <StepHeroBanner
              step={4}
              title="เครื่องมือวัดและประเมินผล (Assessment Tools)"
              description="กำหนดวิธีการวัด เครื่องมือ และเกณฑ์การประเมิน (Rubrics) ให้ครอบคลุมทุกเป้าหมาย K-P-A และหลักฐานการเรียนรู้"
              badgeText="04 ประเมินผล"
              badgeVariant="blue"
              metrics={[
                { label: 'เป้าหมาย K-P-A', value: `${objectives.length} ข้อ`, highlight: true },
                { label: 'หลักฐานการเรียนรู้', value: `${evidence.length} ชิ้น` },
                { label: 'เกณฑ์การประเมิน', value: 'Rubrics 4 ระดับ' },
              ]}
            />
            <Step4Assessments
              planId={planId}
              lesson={lesson!}
              objectives={objectives}
              evidence={evidence}
              objEvdLinks={objEvdLinks}
            />
          </>
        )}

        {currentStep === 5 && (
          <>
            <StepHeroBanner
              step={5}
              title="ชุดสื่อ ใบงาน และสื่อการสอน (Teaching Package)"
              description="ตรวจสอบและจัดเตรียมชุดสื่อการสอน ใบงาน ภาระงาน ใบความรู้ และสไลด์นำเสนอที่พร้อมนำไปใช้สอนจริงในห้องเรียน"
              badgeText="05 ชุดพร้อมสอน"
              badgeVariant="blue"
              metrics={[
                { label: 'สถานะแผน', value: lesson ? getStatusLabel(lesson.status) : '', highlight: true },
                { label: 'กิจกรรม', value: `${activities.length} กิจกรรม` },
                { label: 'รูปแบบสื่อ', value: 'พร้อมพิมพ์ & นำเสนอ' },
              ]}
            />
            <Step5TeachingPackage
              planId={planId}
              lesson={lesson!}
              objectives={objectives}
              evidence={evidence}
              activities={activities}
              onLessonStatusChange={(newStatus) => {
                setLesson(prev => prev ? { ...prev, status: newStatus } : null);
              }}
              onNavigateToStep={(s) => router.push(`/plan/v3/${planId}?step=${s}`)}
            />
          </>
        )}

        {currentStep === 6 && (
          <>
            <StepHeroBanner
              step={6}
              title="ตรวจสอบคุณภาพแผนและความสอดคล้อง ว.PA (Quality Review)"
              description="ระบบตรวจสอบความสอดคล้องเชิงตรรกะ ตัวชี้วัด เป้าหมาย กิจกรรม และการวัดผล พร้อมให้คำแนะนำและปรับปรุงอัตโนมัติ"
              badgeText="06 ตรวจคุณภาพ"
              badgeVariant="blue"
              metrics={[
                { label: 'เป้าหมาย K-P-A', value: `${objectives.length} ข้อ`, highlight: true },
                { label: 'หลักฐานการเรียนรู้', value: `${evidence.length} ชิ้น` },
                { label: 'กิจกรรมการสอน', value: `${activities.length} ขั้น` },
              ]}
            />
            {graph ? (
              <Step6QualityReview
                planId={planId}
                graph={graph}
                onBack={() => router.push(`/plan/v3/${planId}?step=5`)}
                onGraphChanged={loadGraph}
              />
            ) : (
              <div className="text-center py-16 text-slate-500">
                <div className="w-8 h-8 border-3 border-[#0071E3] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">กำลังโหลดข้อมูลการประเมินคุณภาพ...</p>
              </div>
            )}
          </>
        )}

        {currentStep === 7 && (
          <>
            <StepHeroBanner
              step={7}
              title="เอกสารแผนการจัดการเรียนรู้ฉบับสมบูรณ์ (Canonical Document)"
              description="ประกอบเอกสารมาตรฐาน 13 หัวข้อตามเกณฑ์ ศธ. และ ว.PA พร้อมใบงาน ภาระงาน เฉลย และเครื่องมือวัดผล"
              badgeText="07 เอกสาร A4"
              badgeVariant="emerald"
              metrics={[
                { label: 'มาตรฐานเอกสาร', value: '13 หมวด ศธ. & ว.PA', highlight: true },
                { label: 'ฟอนต์ราชการ', value: 'TH Sarabun New' },
                { label: 'พร้อมส่งออก', value: 'Word / PDF / พิมพ์' },
              ]}
            />
            <div className="v3-canonical-doc-wrapper max-w-4xl mx-auto space-y-6">
              {/* Apple Export Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href={`/api/plan/v3/${planId}/export/word?package=teacher`}
                  target="_blank"
                  rel="noreferrer"
                  className="apple-export-card group"
                >
                  <div className="export-card-icon word-icon">
                    <span>📘</span>
                  </div>
                  <div className="export-card-body">
                    <h3 className="export-card-title">Microsoft Word (.docx)</h3>
                    <p className="export-card-desc">ฟอนต์ TH Sarabun New แท้ ตารางสมบูรณ์ 100% แก้ไขต่อได้ทันที</p>
                  </div>
                  <div className="export-card-action">
                    <span>ดาวน์โหลด Word</span>
                    <span className="action-arrow">↓</span>
                  </div>
                </a>

                <a
                  href={`/api/plan/v3/${planId}/export/pdf?package=teacher`}
                  target="_blank"
                  rel="noreferrer"
                  className="apple-export-card group"
                >
                  <div className="export-card-icon pdf-icon">
                    <span>📕</span>
                  </div>
                  <div className="export-card-body">
                    <h3 className="export-card-title">PDF Document (.pdf)</h3>
                    <p className="export-card-desc">จัดหน้า A4 คมชัด เลขหน้าสมบูรณ์ พร้อมแนบประเมิน ว.PA ส่งผู้บริหาร</p>
                  </div>
                  <div className="export-card-action">
                    <span>ดาวน์โหลด PDF</span>
                    <span className="action-arrow">↓</span>
                  </div>
                </a>

                <Link
                  href={`/plan/v3/${planId}/preview`}
                  className="apple-export-card preview-card group"
                >
                  <div className="export-card-icon print-icon">
                    <span>🖨️</span>
                  </div>
                  <div className="export-card-body">
                    <h3 className="export-card-title">พรีวิว A4 & สั่งพิมพ์</h3>
                    <p className="export-card-desc">ดูหน้ากระดาษเสมือนจริงแบบเรียลไทม์ ซูม ตรวจทาน และสั่งพิมพ์ผ่านเบราว์เซอร์</p>
                  </div>
                  <div className="export-card-action preview-action">
                    <span>เปิดโหมดพรีวิวเต็มจอ</span>
                    <span className="action-arrow">→</span>
                  </div>
                </Link>
              </div>

              {/* 13 Sections Checklist in Apple Card */}
              <div className="apple-doc-sections-card">
                <div className="card-header-clean">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</div>
                    <h3 className="font-semibold text-sm text-[#1D1D1F]">
                      โครงสร้างเอกสารมาตรฐาน 13 หัวข้อตามเกณฑ์ ศธ. และ ว.PA (ครบถ้วนสมบูรณ์)
                    </h3>
                  </div>
                  <span className="text-xs text-[#86868B]">บรรจุในไฟล์เอกสารแล้ว</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-3 border-t border-slate-100">
                  <div className="section-pill"><span className="num">1</span> ข้อมูลทั่วไปและบริบท</div>
                  <div className="section-pill"><span className="num">2</span> มาตรฐานและตัวชี้วัด</div>
                  <div className="section-pill"><span className="num">3</span> สาระสำคัญ / ความคิดรวบยอด</div>
                  <div className="section-pill"><span className="num">4</span> จุดประสงค์การเรียนรู้ (K-P-A)</div>
                  <div className="section-pill"><span className="num">5</span> สมรรถนะสำคัญ (5 ด้าน)</div>
                  <div className="section-pill"><span className="num">6</span> คุณลักษณะอันพึงประสงค์ (8 ข้อ)</div>
                  <div className="section-pill"><span className="num">7</span> สาระการเรียนรู้แกนกลาง</div>
                  <div className="section-pill"><span className="num">8</span> ชิ้นงาน / ภาระงานเชิงประจักษ์</div>
                  <div className="section-pill"><span className="num">9</span> กิจกรรมการเรียนรู้ (Timeline)</div>
                  <div className="section-pill"><span className="num">10</span> สื่อ นวัตกรรม แหล่งเรียนรู้</div>
                  <div className="section-pill"><span className="num">11</span> การวัดและประเมินผล</div>
                  <div className="section-pill"><span className="num">12</span> เกณฑ์ประเมินแบบรูบริกส์</div>
                  <div className="section-pill col-span-full"><span className="num">13</span> บันทึกหลังการสอน (K-P-A, ปัญหา, ข้อเสนอแนะ, ลายมือชื่อครูและผู้บริหาร)</div>
                </div>
              </div>

              {/* Bottom Nav Action */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  className="v3-btn v3-btn-ghost"
                  onClick={() => router.push(`/plan/v3/${planId}?step=6`)}
                >
                  ← ย้อนกลับไปตรวจคุณภาพ (ขั้นที่ 6)
                </button>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/plan/v3/${planId}/preview`}
                    className="v3-btn v3-btn-primary shadow-sm"
                  >
                    เปิดตัวอย่างเอกสาร A4 เต็มจอ →
                  </Link>
                  <button
                    type="button"
                    className="v3-btn v3-btn-primary shadow-sm"
                    onClick={() => router.push(`/plan/v3/${planId}?step=8`)}
                    disabled={!['FINAL', 'TAUGHT', 'REFLECTED'].includes(lesson?.status || '')}
                  >
                    ไปบันทึกผลการสอน (ขั้นที่ 8) →
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {currentStep === 8 && (
          <>
            <StepHeroBanner
              step={8}
              title="บันทึกหลังแผนและผลการจัดการเรียนรู้ (Post-Teaching)"
              description="บันทึกผลสัมฤทธิ์ทางการเรียนรู้ของผู้เรียน ปัญหา อุปสรรค และแนวทางแก้ไขเพื่อใช้เป็นหลักฐานพัฒนาการจัดการเรียนรู้"
              badgeText="08 ผลการสอน"
              badgeVariant="blue"
              metrics={[
                { label: 'สถานะแผน', value: lesson ? getStatusLabel(lesson.status) : '', highlight: true },
                { label: 'ระดับชั้น', value: lesson?.grade_level || '—' },
                { label: 'เวลาสอนจริง', value: `${lesson?.duration_minutes || 60} นาที` },
              ]}
            />
            <Step8TeachingResults
              planId={planId}
              lessonStatus={lesson?.status || ''}
              onNavigateToStep={(s) => router.push(`/plan/v3/${planId}?step=${s}`)}
              onStatusUpdated={loadGraph}
            />
          </>
        )}

        {currentStep === 9 && (
          <>
            <StepHeroBanner
              step={9}
              title="สะท้อนผลการสอนและรวบรวมหลักฐาน ว.PA (PA Evidence)"
              description="สรุปผลการปฏิบัติงาน สอดคล้องตามประเด็นท้าทายและข้อตกลง PA พร้อมแนบภาพถ่าย ผลงานนักเรียน หรือคลิปการสอน"
              badgeText="09 ว.PA"
              badgeVariant="emerald"
              metrics={[
                { label: 'เกณฑ์มาตรฐาน', value: 'ว9/2564 (ว.PA)', highlight: true },
                { label: 'สถานะแผน', value: lesson ? getStatusLabel(lesson.status) : '' },
                { label: 'ความพร้อมรอบประเมิน', value: 'สมบูรณ์' },
              ]}
            />
            <Step9ReflectionEvidence
              planId={planId}
              lessonStatus={lesson?.status || ''}
              onNavigateToStep={(s) => router.push(`/plan/v3/${planId}?step=${s}`)}
              onStatusUpdated={loadGraph}
            />
          </>
        )}
      </div>

      <V3BottomActionBar
        currentStep={currentStep}
        totalSteps={9}
        lessonStatus={lesson?.status}
        onNavigate={(s) => router.push(`/plan/v3/${planId}?step=${s}`)}
        planId={planId}
      />

    </div>
  );
}

