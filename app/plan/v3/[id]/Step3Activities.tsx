'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  V3LessonPlan,
  V3LessonObjective,
  V3LearningEvidence,
  V3LessonCurriculumLink,
  V3ObjectiveEvidenceLink,
  V3ActivityWithLinks,
  V3BlueprintActivityDraft,
  V3LessonBlueprint,
  V3ActivityPhase,
  V3LessonStatus,
} from '@/lib/smartPlanV3/types';
import {
  PHASE_LABELS,
  getPhaseLabel,
  getPhaseBadgeColor,
} from '@/lib/smartPlanV3/labels';
import {
  validateActivityRules,
  suggestTimeNormalization,
} from '@/lib/smartPlanV3/rules/activityRules';
import {
  getActivityFlowSuggestions,
  ActivityFlowCandidate,
} from '@/lib/smartPlanV3/suggestions';

interface Step3ActivitiesProps {
  planId: string;
  lesson: V3LessonPlan;
  objectives: V3LessonObjective[];
  evidence: V3LearningEvidence[];
  curriculumLinks: V3LessonCurriculumLink[];
  objEvdLinks: V3ObjectiveEvidenceLink[];
  onLessonStatusChange: (newStatus: V3LessonStatus) => void;
  onNavigateToStep: (step: number) => void;
}

export default function Step3Activities({
  planId,
  lesson,
  objectives,
  evidence,
  curriculumLinks,
  objEvdLinks,
  onLessonStatusChange,
  onNavigateToStep,
}: Step3ActivitiesProps) {
  // Activities state
  const [activities, setActivities] = useState<V3ActivityWithLinks[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Generation state
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [previewBlueprint, setPreviewBlueprint] = useState<V3LessonBlueprint | null>(null);
  const [previewDrafts, setPreviewDrafts] = useState<V3BlueprintActivityDraft[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [applying, setApplying] = useState(false);

  // Safety confirmation dialog (if activities exist)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  // Manual Add Form Modal / Toggle
  const [showAddForm, setShowAddForm] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualPhase, setManualPhase] = useState<V3ActivityPhase>('LEARN');
  const [manualMinutes, setManualMinutes] = useState(15);
  const [manualTeacher, setManualTeacher] = useState('');
  const [manualStudent, setManualStudent] = useState('');
  const [manualQuickCheck, setManualQuickCheck] = useState('');
  const [manualFeedback, setManualFeedback] = useState('');
  const [manualSelectedObjs, setManualSelectedObjs] = useState<string[]>([]);
  const [manualSelectedEvds, setManualSelectedEvds] = useState<string[]>([]);
  const [savingManual, setSavingManual] = useState(false);

  // Edit Activity State
  const [editingActivity, setEditingActivity] = useState<V3ActivityWithLinks | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPhase, setEditPhase] = useState<string>('LEARN');
  const [editMinutes, setEditMinutes] = useState(10);
  const [editTeacher, setEditTeacher] = useState('');
  const [editStudent, setEditStudent] = useState('');
  const [editQuickCheck, setEditQuickCheck] = useState('');
  const [editFeedback, setEditFeedback] = useState('');
  const [editSelectedObjs, setEditSelectedObjs] = useState<string[]>([]);
  const [editSelectedEvds, setEditSelectedEvds] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Partial Regen State
  const [regenTargetId, setRegenTargetId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenOriginal, setRegenOriginal] = useState<any | null>(null);
  const [regenAlternative, setRegenAlternative] = useState<V3BlueprintActivityDraft | null>(null);
  const [showRegenModal, setShowRegenModal] = useState(false);

  // Guided Activity Flows State (V3.12)
  const [flowCandidates, setFlowCandidates] = useState<ActivityFlowCandidate[]>([]);
  const [expandedFlowId, setExpandedFlowId] = useState<string | null>(null);
  const [showFlowsSection, setShowFlowsSection] = useState(true);

  // Load activities on mount
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/plan/v3/${planId}/activities`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setActivities(json.data);
      }
    } catch (e) {
      console.error('Failed to load activities', e);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const refreshFlowSuggestions = useCallback(() => {
    if (!lesson) return;
    const flows = getActivityFlowSuggestions({
      subjectKey: lesson.subject_key,
      learningFocus: lesson.learning_focus,
      topic: lesson.topic,
      durationMinutes: lesson.duration_minutes || 60,
      objectiveIds: objectives.map(o => o.id),
      evidenceIds: evidence.map(e => e.id),
    });
    setFlowCandidates(flows);
  }, [lesson, objectives, evidence]);

  useEffect(() => {
    refreshFlowSuggestions();
  }, [refreshFlowSuggestions]);

  const handleSelectFlowCandidate = (flow: ActivityFlowCandidate) => {
    setPreviewDrafts(flow.activities);
    setShowPreviewModal(true);
  };

  // Preconditions Check
  const objectivesWithoutEvidence = objectives.filter(
    obj => !objEvdLinks.some(l => l.objective_id === obj.id)
  );

  const missingPreconditions: string[] = [];
  if (curriculumLinks.length === 0) missingPreconditions.push('ตัวชี้วัดอย่างน้อย 1 รายการ');
  if (objectives.length === 0) missingPreconditions.push('จุดประสงค์การเรียนรู้อย่างน้อย 1 ข้อ');
  if (evidence.length === 0) missingPreconditions.push('หลักฐานการเรียนรู้อย่างน้อย 1 รายการ');
  if (objectivesWithoutEvidence.length > 0) missingPreconditions.push('การกำหนดหลักฐานให้ครบทุกจุดประสงค์');

  const isPreconditionMet = missingPreconditions.length === 0;

  // Rule Summary Calculation
  const ruleSummary = validateActivityRules({
    lesson: { duration_minutes: lesson.duration_minutes || 60 },
    objectives,
    evidence,
    activities,
  });

  // Time suggestions
  const timeSuggestions = suggestTimeNormalization(
    activities,
    lesson.duration_minutes || 60
  );

  // Apply deterministic time adjustment
  const handleApplyTimeAdjustment = async () => {
    if (timeSuggestions.length === 0) return;
    const suggestion = timeSuggestions[0];
    const targetActivity = activities[suggestion.index];
    if (!targetActivity) return;

    try {
      const res = await fetch(`/api/plan/v3/${planId}/activities/${targetActivity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: suggestion.suggestedMinutes }),
      });
      const json = await res.json();
      if (json.success) {
        setActivities(prev =>
          prev.map(a => (a.id === targetActivity.id ? json.data : a))
        );
        if (json.status) onLessonStatusChange(json.status);
      }
    } catch (e) {
      console.error('Failed to adjust time', e);
    }
  };

  // Trigger AI Blueprint Generation
  const handleGenerateClick = () => {
    if (activities.length > 0) {
      setShowOverwriteConfirm(true);
    } else {
      executeGenerateBlueprint();
    }
  };

  const executeGenerateBlueprint = async () => {
    setShowOverwriteConfirm(false);
    setGenerating(true);
    setGenError(null);

    try {
      const res = await fetch(`/api/plan/v3/${planId}/blueprint/generate`, {
        method: 'POST',
      });
      const json = await res.json();

      if (!json.success) {
        setGenError(json.error || 'ยังสร้างกิจกรรมไม่สำเร็จ ข้อมูลแผนของคุณยังอยู่ครบ กรุณาลองใหม่อีกครั้ง');
        return;
      }

      setPreviewBlueprint(json.data.blueprint);
      setPreviewDrafts(json.data.previewActivities);
      setShowPreviewModal(true);
    } catch (err: any) {
      setGenError('บริการ AI ขัดข้องชั่วคราว ข้อมูลแผนของคุณยังอยู่ครบ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setGenerating(false);
    }
  };

  // Apply Blueprint to DB
  const handleApplyBlueprint = async (mode: 'replace' | 'append' = 'replace') => {
    if (previewDrafts.length === 0) return;
    setApplying(true);

    try {
      const res = await fetch(`/api/plan/v3/${planId}/blueprint/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activities: previewDrafts,
          mode,
        }),
      });
      const json = await res.json();

      if (json.success) {
        setActivities(json.data);
        if (json.status) onLessonStatusChange(json.status);
        setShowPreviewModal(false);
        setPreviewBlueprint(null);
        setPreviewDrafts([]);
      } else {
        alert(json.error || 'เกิดข้อผิดพลาดในการบันทึกกิจกรรม');
      }
    } catch (e) {
      alert('บันทึกกิจกรรมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setApplying(false);
    }
  };

  // Reorder Activities (Move Up / Down)
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activities.length) return;

    const newOrder = [...activities];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    setActivities(newOrder);

    try {
      const activityIds = newOrder.map(a => a.id);
      await fetch(`/api/plan/v3/${planId}/activities/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_ids: activityIds }),
      });
    } catch (e) {
      fetchActivities(); // Rollback
    }
  };

  // Delete Activity
  const handleDeleteActivity = async (id: string) => {
    if (!window.confirm('คุณต้องการลบกิจกรรมนี้ใช่หรือไม่?')) return;

    try {
      const res = await fetch(`/api/plan/v3/${planId}/activities/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setActivities(prev => prev.filter(a => a.id !== id));
        if (json.status) onLessonStatusChange(json.status);
      }
    } catch (e) {
      alert('ลบกิจกรรมไม่สำเร็จ');
    }
  };

  // Partial Regenerate Single Activity
  const handleRegenerateActivity = async (actId: string) => {
    setRegenTargetId(actId);
    setRegenerating(true);
    try {
      const res = await fetch(`/api/plan/v3/${planId}/activities/${actId}/regenerate`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        setRegenOriginal(json.data.originalActivity);
        setRegenAlternative(json.data.alternativeDraft);
        setShowRegenModal(true);
      } else {
        alert(json.error || 'ไม่สามารถขอแนวทางกิจกรรมใหม่ได้');
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการขอแนวทางกิจกรรมใหม่');
    } finally {
      setRegenerating(false);
      setRegenTargetId(null);
    }
  };

  // Apply Regenerated Alternative
  const handleApplyRegeneratedAlternative = async () => {
    if (!regenOriginal || !regenAlternative) return;

    try {
      const res = await fetch(`/api/plan/v3/${planId}/activities/${regenOriginal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: regenAlternative.title,
          phase: regenAlternative.phase,
          minutes: regenAlternative.minutes,
          teacher_actions: Array.isArray(regenAlternative.teacherActions)
            ? regenAlternative.teacherActions.join('\n')
            : regenAlternative.teacherActions,
          student_actions: Array.isArray(regenAlternative.studentActions)
            ? regenAlternative.studentActions.join('\n')
            : regenAlternative.studentActions,
          assessment_moment: regenAlternative.formativeCheck?.enabled
            ? regenAlternative.formativeCheck.description
            : null,
          feedback_moment: regenAlternative.feedback?.enabled
            ? regenAlternative.feedback.description
            : null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActivities(prev =>
          prev.map(a => (a.id === regenOriginal.id ? json.data : a))
        );
        if (json.status) onLessonStatusChange(json.status);
        setShowRegenModal(false);
      }
    } catch (e) {
      alert('ปรับใช้แนวทางใหม่ไม่สำเร็จ');
    }
  };

  // Manual Add Activity
  const handleManualAdd = async () => {
    if (!manualTitle.trim() || !manualStudent.trim()) {
      alert('กรุณาระบุชื่อกิจกรรมและบทบาทผู้เรียน (ห้ามว่าง)');
      return;
    }
    setSavingManual(true);
    try {
      const res = await fetch(`/api/plan/v3/${planId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: manualTitle.trim(),
          phase: manualPhase,
          minutes: manualMinutes,
          teacher_actions: manualTeacher.trim(),
          student_actions: manualStudent.trim(),
          assessment_moment: manualQuickCheck.trim() || null,
          feedback_moment: manualFeedback.trim() || null,
          position: activities.length,
          source: 'MANUAL',
          linked_objective_ids: manualSelectedObjs,
          linked_evidence_ids: manualSelectedEvds,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActivities(prev => [...prev, json.data]);
        setShowAddForm(false);
        // Reset
        setManualTitle('');
        setManualStudent('');
        setManualTeacher('');
        setManualQuickCheck('');
        setManualFeedback('');
        setManualSelectedObjs([]);
        setManualSelectedEvds([]);
      } else {
        alert(json.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (e) {
      alert('เพิ่มกิจกรรมไม่สำเร็จ');
    } finally {
      setSavingManual(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (act: V3ActivityWithLinks) => {
    setEditingActivity(act);
    setEditTitle(act.title || '');
    setEditPhase(act.phase || 'LEARN');
    setEditMinutes(act.minutes || 10);
    setEditTeacher(act.teacher_actions || '');
    setEditStudent(act.student_actions || '');
    setEditQuickCheck(act.assessment_moment || '');
    setEditFeedback(act.feedback_moment || '');
    setEditSelectedObjs(act.linkedObjectiveIds || []);
    setEditSelectedEvds(act.linkedEvidenceIds || []);
  };

  // Save Edit Activity
  const handleSaveEdit = async () => {
    if (!editingActivity) return;
    if (!editStudent.trim()) {
      alert('กรุณาระบุบทบาทผู้เรียน (ห้ามว่าง)');
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/plan/v3/${planId}/activities/${editingActivity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          phase: editPhase,
          minutes: editMinutes,
          teacher_actions: editTeacher.trim(),
          student_actions: editStudent.trim(),
          assessment_moment: editQuickCheck.trim() || null,
          feedback_moment: editFeedback.trim() || null,
          linked_objective_ids: editSelectedObjs,
          linked_evidence_ids: editSelectedEvds,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActivities(prev =>
          prev.map(a => (a.id === editingActivity.id ? json.data : a))
        );
        if (json.status) onLessonStatusChange(json.status);
        setEditingActivity(null);
      } else {
        alert(json.error || 'บันทึกการแก้ไขไม่สำเร็จ');
      }
    } catch (e) {
      alert('บันทึกการแก้ไขไม่สำเร็จ');
    } finally {
      setSavingEdit(false);
    }
  };

  // Render: Precondition Warning Screen
  if (!isPreconditionMet) {
    return (
      <div className="v3-editor-section v3-precondition-blocked">
        <div className="v3-blocked-icon">⚠️</div>
        <h2 className="v3-blocked-title">ยังสร้างกิจกรรมไม่ได้</h2>
        <p className="v3-blocked-desc">
          การออกแบบกิจกรรมการเรียนรู้แบบโครงสร้างต้องใช้ข้อมูลเป้าหมายที่ชัดเจน เพื่อให้ AI และระบบสามารถออกแบบกิจกรรมได้ตรงจุด
        </p>
        <div className="v3-missing-list">
          <strong>สิ่งที่ต้องดำเนินการให้ครบก่อน:</strong>
          <ul>
            {missingPreconditions.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
        <button
          className="v3-btn v3-btn-primary"
          onClick={() => onNavigateToStep(2)}
          style={{ marginTop: '1rem' }}
        >
          ← กลับไปกำหนดเป้าหมายในขั้นที่ 2
        </button>
      </div>
    );
  }

  return (
    <div className="v3-step3-container">
      {/* ── Rule Summary Panel ── */}
      <div className="v3-rule-summary-panel">
        <div className="v3-rule-panel-header">
          <h2 className="v3-rule-panel-title">📊 สรุปความพร้อมของกิจกรรม (60 นาที)</h2>
          <span className={`v3-rule-status-tag ${ruleSummary.allPassed ? 'ready' : 'incomplete'}`}>
            {ruleSummary.allPassed ? '✓ บลูปรินต์พร้อมใช้งาน' : 'กำลังดำเนินการ'}
          </span>
        </div>

        <div className="v3-rule-grid">
          {/* Duration */}
          <div className={`v3-rule-item ${ruleSummary.duration.valid ? 'passed' : 'warning'}`}>
            <span className="v3-rule-label">เวลาคาบเรียน</span>
            <span className="v3-rule-value">{ruleSummary.duration.message}</span>
            {!ruleSummary.duration.valid && timeSuggestions.length > 0 && (
              <button
                className="v3-btn v3-btn-xs v3-btn-ghost v3-time-adjust-btn"
                onClick={handleApplyTimeAdjustment}
                title={timeSuggestions[0].reason}
              >
                ⚡ ปรับเวลาให้ครบ 60 นาที ({timeSuggestions[0].diff > 0 ? `+${timeSuggestions[0].diff}` : timeSuggestions[0].diff} น.)
              </button>
            )}
          </div>

          {/* Objectives Coverage */}
          <div className={`v3-rule-item ${ruleSummary.objectives.allCovered ? 'passed' : 'warning'}`}>
            <span className="v3-rule-label">จุดประสงค์การเรียนรู้</span>
            <span className="v3-rule-value">{ruleSummary.objectives.message}</span>
          </div>

          {/* Evidence Coverage */}
          <div className={`v3-rule-item ${ruleSummary.evidence.unlinkedIds.length === 0 ? 'passed' : 'warning'}`}>
            <span className="v3-rule-label">หลักฐานการเรียนรู้</span>
            <span className="v3-rule-value">{ruleSummary.evidence.message}</span>
          </div>

          {/* Student Actions & Check Moments */}
          <div className="v3-rule-item passed">
            <span className="v3-rule-label">การประเมิน & ข้อมูลย้อนกลับ</span>
            <span className="v3-rule-value">
              {ruleSummary.hasFormativeCheck ? '✓ มีประเมินระหว่างเรียน' : '○ ยังไม่มีประเมินย่อย'} |{' '}
              {ruleSummary.hasFeedback ? '✓ มี Feedback' : '○ ยังไม่มี Feedback'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Guided Choice: Activity Flow Candidates (V3.12) ── */}
      {flowCandidates.length > 0 && showFlowsSection && (
        <div className="v3-flow-suggestions-card" style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1E293B', margin: '0 0 0.25rem' }}>
                💡 เลือกแนวทางการจัดกิจกรรมการเรียนรู้ (Activity Flows)
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                ระบบเตรียม Flow กิจกรรมที่จัดสรรเวลาครบ {lesson.duration_minutes || 60} นาทีพอดี เลือกแนวทางที่ต้องการเพื่อดูรายละเอียดและปรับปรุง
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={refreshFlowSuggestions}
                className="v3-btn v3-btn-ghost v3-btn-xs"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
              >
                🔄 เสนอแนวทางใหม่
              </button>
              <button
                type="button"
                onClick={() => setShowFlowsSection(false)}
                className="v3-btn v3-btn-ghost v3-btn-xs"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
              >
                ซ่อน
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {flowCandidates.map((flow) => {
              const isExpanded = expandedFlowId === flow.id;
              return (
                <div
                  key={flow.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                        {flow.name}
                      </h4>
                      <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '9999px', background: '#EEF2FF', color: '#4F46E5', fontWeight: 600 }}>
                          {flow.stepsCount} ขั้น
                        </span>
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '9999px', background: '#ECFDF5', color: '#059669', fontWeight: 600 }}>
                          {flow.totalMinutes} นาที
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.775rem', color: '#475569', marginBottom: '0.75rem', lineHeight: '1.4' }}>
                      🎯 <em>{flow.bestFor}</em>
                    </p>

                    <div style={{ background: '#F8FAFC', borderRadius: '6px', padding: '0.6rem 0.75rem', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.35rem' }}>
                        ขั้นตอนโดยย่อ:
                      </span>
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.75rem', color: '#334155', lineHeight: '1.4' }}>
                        {flow.summary.map((step, sIdx) => (
                          <li key={sIdx} style={{ marginBottom: '0.15rem' }}>{step}</li>
                        ))}
                      </ul>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: '0.5rem', marginBottom: '0.75rem', borderTop: '1px dashed #E2E8F0', paddingTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.4rem' }}>
                          รายละเอียดกิจกรรมในแต่ละขั้น:
                        </span>
                        {flow.activities.map((act, aIdx) => (
                          <div key={aIdx} style={{ fontSize: '0.725rem', background: '#F1F5F9', borderRadius: '6px', padding: '0.5rem', marginBottom: '0.4rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#1E293B', marginBottom: '0.2rem' }}>
                              <span>{aIdx + 1}. {act.title}</span>
                              <span style={{ color: '#4F46E5' }}>{act.minutes} นาที</span>
                            </div>
                            <div style={{ color: '#475569' }}><strong>ครู:</strong> {act.teacherActions}</div>
                            <div style={{ color: '#475569' }}><strong>นักเรียน:</strong> {act.studentActions}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #F1F5F9' }}>
                    <button
                      type="button"
                      onClick={() => handleSelectFlowCandidate(flow)}
                      className="v3-btn v3-btn-primary"
                      style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem 0.75rem', justifyContent: 'center' }}
                    >
                      ✓ เลือกแผนกิจกรรมนี้
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedFlowId(isExpanded ? null : flow.id)}
                      className="v3-btn v3-btn-ghost"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                    >
                      {isExpanded ? 'ย่อ' : 'ดูรายละเอียด'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!showFlowsSection && flowCandidates.length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
          <button
            type="button"
            onClick={() => setShowFlowsSection(true)}
            className="v3-btn v3-btn-ghost v3-btn-sm"
            style={{ fontSize: '0.8rem', color: '#4F46E5', borderColor: '#C7D2FE', background: '#EEF2FF' }}
          >
            💡 แสดงแนวทางการจัดกิจกรรม 3 รูปแบบ (Activity Flows)
          </button>
        </div>
      )}

      {/* ── AI Action & Toolbar ── */}
      <div className="v3-activity-toolbar">
        <div className="v3-toolbar-left">
          <button
            className="v3-btn v3-btn-ai"
            onClick={handleGenerateClick}
            disabled={generating}
          >
            {generating ? (
              <>
                <span className="v3-spinner-inline" />
                กำลังช่วยออกแบบกิจกรรมด้วย AI...
              </>
            ) : (
              <>✨ ช่วยออกแบบกิจกรรม 60 นาที ด้วย AI</>
            )}
          </button>
          <button
            className="v3-btn v3-btn-ghost"
            onClick={() => setShowAddForm(prev => !prev)}
          >
            {showAddForm ? '✕ ปิดฟอร์ม' : '+ เพิ่มกิจกรรมเอง'}
          </button>
        </div>
        <div className="v3-toolbar-right">
          <span className="v3-count-text">
            {activities.length} กิจกรรม | รวม {activities.reduce((s, a) => s + (a.minutes || 0), 0)} นาที
          </span>
        </div>
      </div>

      {genError && (
        <div className="v3-error-banner">
          <span>⚠️ {genError}</span>
          <button className="v3-btn v3-btn-xs v3-btn-ghost" onClick={() => setGenError(null)}>
            ปิด
          </button>
        </div>
      )}

      {/* ── Manual Add Activity Inline Form ── */}
      {showAddForm && (
        <div className="v3-manual-add-card">
          <h3 className="v3-form-title">📝 เพิ่มกิจกรรมการเรียนรู้</h3>
          <div className="v3-form-grid">
            <div className="v3-form-group">
              <label>ชื่อกิจกรรม *</label>
              <input
                className="v3-input"
                placeholder="เช่น กิจกรรมฝึกสนทนาอาชีพในฝัน"
                value={manualTitle}
                onChange={e => setManualTitle(e.target.value)}
              />
            </div>
            <div className="v3-form-row">
              <div className="v3-form-group" style={{ flex: 1 }}>
                <label>ช่วงการสอน (Phase)</label>
                <select
                  className="v3-select"
                  value={manualPhase}
                  onChange={e => setManualPhase(e.target.value as V3ActivityPhase)}
                >
                  {Object.entries(PHASE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="v3-form-group" style={{ width: '120px' }}>
                <label>เวลา (นาที) *</label>
                <input
                  type="number"
                  className="v3-input"
                  min={1}
                  max={60}
                  value={manualMinutes}
                  onChange={e => setManualMinutes(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="v3-form-group">
              <label>บทบาทครู (Teacher Actions)</label>
              <textarea
                className="v3-textarea"
                rows={2}
                placeholder="เช่น ครูแสดงภาพตัวอย่างและอธิบายโครงสร้างประโยค"
                value={manualTeacher}
                onChange={e => setManualTeacher(e.target.value)}
              />
            </div>

            <div className="v3-form-group">
              <label>บทบาทผู้เรียน (Student Actions) * ต้องได้ลงมือทำจริง</label>
              <textarea
                className="v3-textarea"
                rows={2}
                placeholder="เช่น นักเรียนจับคู่ฝึกถามตอบและบันทึกข้อมูลเพื่อนร่วมชั้น"
                value={manualStudent}
                onChange={e => setManualStudent(e.target.value)}
              />
            </div>

            {/* Link Objectives */}
            {objectives.length > 0 && (
              <div className="v3-form-group">
                <label>เชื่อมโยงจุดประสงค์การเรียนรู้:</label>
                <div className="v3-chip-selector">
                  {objectives.map((obj, i) => {
                    const sel = manualSelectedObjs.includes(obj.id);
                    return (
                      <button
                        type="button"
                        key={obj.id}
                        className={`v3-chip-item ${sel ? 'selected' : ''}`}
                        onClick={() =>
                          setManualSelectedObjs(prev =>
                            sel ? prev.filter(id => id !== obj.id) : [...prev, obj.id]
                          )
                        }
                      >
                        {sel ? '✓' : '+'} ข้อ {i + 1}: {obj.statement.substring(0, 30)}...
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Link Evidence */}
            {evidence.length > 0 && (
              <div className="v3-form-group">
                <label>เชื่อมโยงหลักฐานการเรียนรู้:</label>
                <div className="v3-chip-selector">
                  {evidence.map(evd => {
                    const sel = manualSelectedEvds.includes(evd.id);
                    return (
                      <button
                        type="button"
                        key={evd.id}
                        className={`v3-chip-item ${sel ? 'selected' : ''}`}
                        onClick={() =>
                          setManualSelectedEvds(prev =>
                            sel ? prev.filter(id => id !== evd.id) : [...prev, evd.id]
                          )
                        }
                      >
                        {sel ? '✓' : '+'} {evd.description.substring(0, 30)}...
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="v3-form-row">
              <div className="v3-form-group" style={{ flex: 1 }}>
                <label>การประเมินระหว่างเรียน (Quick Check - ถ้ามี)</label>
                <input
                  className="v3-input"
                  placeholder="เช่น สุ่มถามความเข้าใจ 3-4 คน"
                  value={manualQuickCheck}
                  onChange={e => setManualQuickCheck(e.target.value)}
                />
              </div>
              <div className="v3-form-group" style={{ flex: 1 }}>
                <label>ข้อมูลย้อนกลับ (Feedback - ถ้ามี)</label>
                <input
                  className="v3-input"
                  placeholder="เช่น ให้คำแนะนำการออกเสียงทันที"
                  value={manualFeedback}
                  onChange={e => setManualFeedback(e.target.value)}
                />
              </div>
            </div>

            <div className="v3-form-actions">
              <button
                className="v3-btn v3-btn-primary"
                onClick={handleManualAdd}
                disabled={savingManual}
              >
                {savingManual ? 'กำลังบันทึก...' : 'บันทึกกิจกรรม'}
              </button>
              <button
                className="v3-btn v3-btn-ghost"
                onClick={() => setShowAddForm(false)}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Activities Timeline List (Card Stack) ── */}
      {loading ? (
        <div className="v3-loading-activities">กำลังโหลดกิจกรรม...</div>
      ) : activities.length === 0 ? (
        <div className="v3-empty-activities">
          <div className="v3-empty-icon">💡</div>
          <h3>ยังไม่มีกิจกรรมในแผนนี้</h3>
          <p>
            คุณสามารถกดปุ่ม <strong>"✨ ช่วยออกแบบกิจกรรม 60 นาที ด้วย AI"</strong> เพื่อให้ AI ช่วยร่างตามธรรมชาติวิชา
            หรือกด <strong>"+ เพิ่มกิจกรรมเอง"</strong> เพื่อสร้างทีละขั้นตอน
          </p>
        </div>
      ) : (
        <div className="v3-activities-timeline">
          {activities.map((act, index) => {
            const isRegeneratingThis = regenerating && regenTargetId === act.id;
            const badgeCls = getPhaseBadgeColor(act.phase);
            const linkedObjs = objectives.filter(o => act.linkedObjectiveIds.includes(o.id));
            const linkedEvds = evidence.filter(e => act.linkedEvidenceIds.includes(e.id));

            return (
              <div key={act.id} className="v3-activity-card">
                <div className="v3-act-card-header">
                  <div className="v3-act-order-num">{index + 1}</div>
                  <div className="v3-act-title-box">
                    <span className={`v3-phase-badge ${badgeCls}`}>
                      {getPhaseLabel(act.phase)}
                    </span>
                    <h3 className="v3-act-title">{act.title || 'ไม่มีชื่อกิจกรรม'}</h3>
                  </div>
                  <div className="v3-act-time-badge">
                    ⏱️ {act.minutes} นาที
                  </div>
                  <div className="v3-act-order-controls">
                    <button
                      className="v3-icon-btn"
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0}
                      title="เลื่อนขึ้น"
                    >
                      ▲
                    </button>
                    <button
                      className="v3-icon-btn"
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === activities.length - 1}
                      title="เลื่อนลง"
                    >
                      ▼
                    </button>
                  </div>
                </div>

                <div className="v3-act-card-body">
                  {/* Actions Grid */}
                  <div className="v3-act-actions-grid">
                    <div className="v3-action-col teacher">
                      <div className="v3-col-label">👩‍🏫 ครูทำอะไร:</div>
                      <p className="v3-action-text">{act.teacher_actions || '-'}</p>
                    </div>
                    <div className="v3-action-col student">
                      <div className="v3-col-label">🧑‍🎓 ผู้เรียนทำอะไร (Active Learning):</div>
                      <p className="v3-action-text">{act.student_actions || '-'}</p>
                    </div>
                  </div>

                  {/* Badges for Moments */}
                  {(act.assessment_moment || act.feedback_moment) && (
                    <div className="v3-moments-row">
                      {act.assessment_moment && (
                        <div className="v3-moment-item check">
                          <strong>🔍 Quick Check:</strong> {act.assessment_moment}
                        </div>
                      )}
                      {act.feedback_moment && (
                        <div className="v3-moment-item feedback">
                          <strong>💬 Feedback:</strong> {act.feedback_moment}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Linked Objectives and Evidence */}
                  <div className="v3-act-links-row">
                    <div className="v3-links-group">
                      <span className="v3-link-group-label">🎯 จุดประสงค์:</span>
                      {linkedObjs.length > 0 ? (
                        linkedObjs.map(o => (
                          <span key={o.id} className="v3-link-pill obj">
                            ข้อ {objectives.indexOf(o) + 1}
                          </span>
                        ))
                      ) : (
                        <span className="v3-link-pill missing">ยังไม่เชื่อม</span>
                      )}
                    </div>
                    <div className="v3-links-group">
                      <span className="v3-link-group-label">📌 หลักฐาน:</span>
                      {linkedEvds.length > 0 ? (
                        linkedEvds.map(e => (
                          <span key={e.id} className="v3-link-pill evd">
                            {e.description || e.evidence_type}
                          </span>
                        ))
                      ) : (
                        <span className="v3-link-pill missing">ยังไม่เชื่อม</span>
                      )}
                    </div>
                    <span className="v3-source-tag">
                      {act.source === 'AI' ? '🤖 สร้างโดย AI' : '✍️ ครูสร้าง'}
                    </span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="v3-act-card-footer">
                  <button
                    className="v3-btn v3-btn-xs v3-btn-ghost"
                    onClick={() => openEditModal(act)}
                  >
                    ✏️ แก้ไข
                  </button>
                  <button
                    className="v3-btn v3-btn-xs v3-btn-ghost v3-btn-regen"
                    onClick={() => handleRegenerateActivity(act.id)}
                    disabled={isRegeneratingThis}
                    title="ขอแนวทางกิจกรรมอื่นสำหรับขั้นนี้โดยเฉพาะ"
                  >
                    {isRegeneratingThis ? 'กำลังคิด...' : '🔄 ขอแนวทางใหม่'}
                  </button>
                  <button
                    className="v3-btn v3-btn-xs v3-btn-ghost v3-btn-danger"
                    onClick={() => handleDeleteActivity(act.id)}
                  >
                    🗑️ ลบ
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Navigation to Step 4 ── */}
      <div className="v3-step-nav-actions" style={{ marginTop: '2rem' }}>
        <button
          className="v3-btn v3-btn-ghost"
          onClick={() => onNavigateToStep(2)}
        >
          ← ย้อนกลับไปเป้าหมาย (Step 2)
        </button>
        <button
          className="v3-btn v3-btn-primary"
          disabled={!ruleSummary.allPassed}
          title={!ruleSummary.allPassed ? 'กรุณาจัดการกิจกรรมให้ครบถ้วนก่อนไปต่อ' : 'ไปต่อขั้นประเมินผล'}
          onClick={() => onNavigateToStep(4)}
        >
          ไปขั้นที่ 4 — ประเมินผล →
        </button>
      </div>

      {/* ── Modal: Overwrite Confirmation ── */}
      {showOverwriteConfirm && (
        <div className="v3-modal-backdrop">
          <div className="v3-modal-box">
            <h3 className="v3-modal-title">⚠️ แผนนี้มีกิจกรรมอยู่แล้ว</h3>
            <p className="v3-modal-desc">
              มีกิจกรรมเดิมอยู่แล้ว {activities.length} รายการ คุณต้องการดำเนินการอย่างไร?
            </p>
            <div className="v3-modal-choices">
              <button
                className="v3-btn v3-btn-primary"
                onClick={executeGenerateBlueprint}
              >
                สร้างชุดใหม่เพื่อเปรียบเทียบ (แสดง Preview ก่อน)
              </button>
              <button
                className="v3-btn v3-btn-ghost"
                onClick={() => setShowOverwriteConfirm(false)}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: AI Blueprint Preview Before Apply ── */}
      {showPreviewModal && previewBlueprint && (
        <div className="v3-modal-backdrop large">
          <div className="v3-modal-box preview-modal">
            <div className="v3-modal-header">
              <div>
                <h3 className="v3-modal-title">✨ ตัวอย่างร่างบลูปรินต์การสอน 60 นาที</h3>
                <p className="v3-modal-desc">
                  {previewBlueprint.summary?.lessonApproach || 'ร่างกิจกรรมตามบริบทที่กำหนด'}
                </p>
              </div>
              <button
                className="v3-icon-btn"
                onClick={() => setShowPreviewModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="v3-preview-list">
              {previewDrafts.map((d, i) => (
                <div key={d.temporaryId} className="v3-preview-item">
                  <div className="v3-preview-item-header">
                    <span className="v3-act-order-num">{i + 1}</span>
                    <strong style={{ flex: 1 }}>{d.title}</strong>
                    <span className="v3-phase-badge">{getPhaseLabel(d.phase)}</span>
                    <span className="v3-time-tag">⏱️ {d.minutes} นาที</span>
                  </div>
                  <div className="v3-preview-actions">
                    <p><strong>ครู:</strong> {Array.isArray(d.teacherActions) ? d.teacherActions.join('; ') : d.teacherActions}</p>
                    <p><strong>ผู้เรียน:</strong> {Array.isArray(d.studentActions) ? d.studentActions.join('; ') : d.studentActions}</p>
                  </div>
                  {d.formativeCheck?.enabled && (
                    <p className="v3-moment-text">🔍 <strong>Quick Check:</strong> {d.formativeCheck.description}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="v3-preview-footer">
              <div className="v3-preview-total">
                เวลารวม: {previewDrafts.reduce((s, a) => s + a.minutes, 0)} / {lesson.duration_minutes || 60} นาที
              </div>
              <div className="v3-preview-actions-btns">
                <button
                  className="v3-btn v3-btn-ghost"
                  onClick={() => setShowPreviewModal(false)}
                >
                  ยกเลิก / ปิด
                </button>
                <button
                  className="v3-btn v3-btn-primary"
                  onClick={() => handleApplyBlueprint('replace')}
                  disabled={applying}
                >
                  {applying ? 'กำลังนำไปใช้...' : '✓ นำกิจกรรมชุดนี้ไปใช้ (แทนที่เดิม)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Partial Regenerate Alternative ── */}
      {showRegenModal && regenOriginal && regenAlternative && (
        <div className="v3-modal-backdrop">
          <div className="v3-modal-box regen-modal">
            <h3 className="v3-modal-title">🔄 เปรียบเทียบแนวทางกิจกรรมใหม่</h3>
            <p className="v3-modal-desc">
              เลือกนำแนวทางใหม่ไปใช้ หรือคงกิจกรรมเดิมไว้
            </p>

            <div className="v3-compare-grid">
              <div className="v3-compare-col current">
                <h4>กิจกรรมเดิม</h4>
                <p><strong>ชื่อ:</strong> {regenOriginal.title}</p>
                <p><strong>ครู:</strong> {regenOriginal.teacher_actions}</p>
                <p><strong>ผู้เรียน:</strong> {regenOriginal.student_actions}</p>
              </div>
              <div className="v3-compare-col alternative">
                <h4>✨ ทางเลือกใหม่จาก AI</h4>
                <p><strong>ชื่อ:</strong> {regenAlternative.title}</p>
                <p><strong>ครู:</strong> {Array.isArray(regenAlternative.teacherActions) ? regenAlternative.teacherActions.join('\n') : regenAlternative.teacherActions}</p>
                <p><strong>ผู้เรียน:</strong> {Array.isArray(regenAlternative.studentActions) ? regenAlternative.studentActions.join('\n') : regenAlternative.studentActions}</p>
                {regenAlternative.formativeCheck?.enabled && (
                  <p><strong>Quick Check:</strong> {regenAlternative.formativeCheck.description}</p>
                )}
              </div>
            </div>

            <div className="v3-modal-choices">
              <button
                className="v3-btn v3-btn-primary"
                onClick={handleApplyRegeneratedAlternative}
              >
                เลือกใช้แนวทางใหม่นี้
              </button>
              <button
                className="v3-btn v3-btn-ghost"
                onClick={() => setShowRegenModal(false)}
              >
                คงกิจกรรมเดิมไว้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Activity ── */}
      {editingActivity && (
        <div className="v3-modal-backdrop">
          <div className="v3-modal-box edit-modal">
            <div className="v3-modal-header">
              <h3 className="v3-modal-title">✏️ แก้ไขกิจกรรม</h3>
              <button className="v3-icon-btn" onClick={() => setEditingActivity(null)}>✕</button>
            </div>

            <div className="v3-form-grid" style={{ marginTop: '1rem' }}>
              <div className="v3-form-group">
                <label>ชื่อกิจกรรม</label>
                <input
                  className="v3-input"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                />
              </div>

              <div className="v3-form-row">
                <div className="v3-form-group" style={{ flex: 1 }}>
                  <label>ช่วงการสอน (Phase)</label>
                  <select
                    className="v3-select"
                    value={editPhase}
                    onChange={e => setEditPhase(e.target.value)}
                  >
                    {Object.entries(PHASE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="v3-form-group" style={{ width: '120px' }}>
                  <label>เวลา (นาที)</label>
                  <input
                    type="number"
                    className="v3-input"
                    value={editMinutes}
                    onChange={e => setEditMinutes(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="v3-form-group">
                <label>บทบาทครู</label>
                <textarea
                  className="v3-textarea"
                  rows={2}
                  value={editTeacher}
                  onChange={e => setEditTeacher(e.target.value)}
                />
              </div>

              <div className="v3-form-group">
                <label>บทบาทผู้เรียน (ห้ามว่าง)</label>
                <textarea
                  className="v3-textarea"
                  rows={2}
                  value={editStudent}
                  onChange={e => setEditStudent(e.target.value)}
                />
              </div>

              {/* Link Objectives */}
              {objectives.length > 0 && (
                <div className="v3-form-group">
                  <label>เชื่อมโยงจุดประสงค์:</label>
                  <div className="v3-chip-selector">
                    {objectives.map((obj, i) => {
                      const sel = editSelectedObjs.includes(obj.id);
                      return (
                        <button
                          type="button"
                          key={obj.id}
                          className={`v3-chip-item ${sel ? 'selected' : ''}`}
                          onClick={() =>
                            setEditSelectedObjs(prev =>
                              sel ? prev.filter(id => id !== obj.id) : [...prev, obj.id]
                            )
                          }
                        >
                          {sel ? '✓' : '+'} ข้อ {i + 1}: {obj.statement.substring(0, 30)}...
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Link Evidence */}
              {evidence.length > 0 && (
                <div className="v3-form-group">
                  <label>เชื่อมโยงหลักฐาน:</label>
                  <div className="v3-chip-selector">
                    {evidence.map(evd => {
                      const sel = editSelectedEvds.includes(evd.id);
                      return (
                        <button
                          type="button"
                          key={evd.id}
                          className={`v3-chip-item ${sel ? 'selected' : ''}`}
                          onClick={() =>
                            setEditSelectedEvds(prev =>
                              sel ? prev.filter(id => id !== evd.id) : [...prev, evd.id]
                            )
                          }
                        >
                          {sel ? '✓' : '+'} {evd.description.substring(0, 30)}...
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="v3-form-actions">
                <button
                  className="v3-btn v3-btn-primary"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                >
                  {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
                <button
                  className="v3-btn v3-btn-ghost"
                  onClick={() => setEditingActivity(null)}
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Component Styles ── */}
      <style jsx>{`
        .v3-step3-container { display: flex; flex-direction: column; gap: 1.25rem; }
        
        .v3-precondition-blocked { text-align: center; padding: 2.5rem 1.5rem; background: white; border-radius: 12px; border: 1px solid #E2E8F0; }
        .v3-blocked-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .v3-blocked-title { font-size: 1.25rem; font-weight: 700; color: #9A3412; margin: 0 0 0.5rem; }
        .v3-blocked-desc { color: #4B5563; font-size: 0.9rem; max-width: 500px; margin: 0 auto 1.5rem; }
        .v3-missing-list { background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 8px; padding: 1rem; max-width: 450px; margin: 0 auto; text-align: left; font-size: 0.85rem; color: #92400E; }
        .v3-missing-list ul { margin: 0.5rem 0 0; padding-left: 1.25rem; }

        .v3-rule-summary-panel { background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1.25rem; }
        .v3-rule-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .v3-rule-panel-title { font-size: 0.95rem; font-weight: 700; color: #1F2937; margin: 0; }
        .v3-rule-status-tag { font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 20px; }
        .v3-rule-status-tag.ready { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
        .v3-rule-status-tag.incomplete { background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; }
        
        .v3-rule-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; }
        .v3-rule-item { border-radius: 8px; padding: 0.75rem; font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.25rem; }
        .v3-rule-item.passed { background: #F0FDF4; border: 1px solid #BBF7D0; color: #166534; }
        .v3-rule-item.warning { background: #FFFBEB; border: 1px solid #FDE68A; color: #92400E; }
        .v3-rule-label { font-size: 0.7rem; font-weight: 700; opacity: 0.8; text-transform: uppercase; }
        .v3-rule-value { font-weight: 600; }
        .v3-time-adjust-btn { margin-top: 0.4rem; background: white; border-color: #F59E0B; color: #D97706; }

        .v3-activity-toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.5rem; }
        .v3-toolbar-left { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
        .v3-btn-ai { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; border: none; font-weight: 600; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2); }
        .v3-btn-ai:hover:not(:disabled) { opacity: 0.95; transform: translateY(-1px); }
        .v3-count-text { font-size: 0.85rem; color: #6B7280; }
        .v3-spinner-inline { display: inline-block; width: 14px; height: 14px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 0.4rem; }

        .v3-error-banner { background: #FEF2F2; border: 1px solid #FCA5A5; color: #991B1B; border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center; }

        .v3-manual-add-card { background: white; border: 1px solid #C7D2FE; border-radius: 12px; padding: 1.25rem; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.05); }
        .v3-form-title { font-size: 1rem; font-weight: 700; color: #3730A3; margin: 0 0 1rem; }
        .v3-form-grid { display: flex; flex-direction: column; gap: 0.75rem; }
        .v3-form-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .v3-form-group { display: flex; flex-direction: column; gap: 0.3rem; }
        .v3-form-group label { font-size: 0.75rem; font-weight: 600; color: #4B5563; }
        .v3-chip-selector { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .v3-chip-item { font-size: 0.75rem; border: 1px solid #E5E7EB; background: #F9FAFB; padding: 0.25rem 0.6rem; border-radius: 20px; cursor: pointer; color: #4B5563; transition: all 0.15s; }
        .v3-chip-item.selected { background: #EEF2FF; border-color: #818CF8; color: #4338CA; font-weight: 600; }
        .v3-form-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }

        .v3-empty-activities { text-align: center; padding: 3rem 1.5rem; background: white; border-radius: 12px; border: 1px dashed #D1D5DB; color: #6B7280; }
        .v3-empty-icon { font-size: 2rem; margin-bottom: 0.5rem; }
        .v3-empty-activities h3 { margin: 0 0 0.5rem; color: #1F2937; }
        .v3-empty-activities p { max-width: 480px; margin: 0 auto; font-size: 0.85rem; line-height: 1.5; }

        .v3-activities-timeline { display: flex; flex-direction: column; gap: 1rem; margin-top: 0.5rem; }
        .v3-activity-card { background: white; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02); transition: border-color 0.15s; }
        .v3-activity-card:hover { border-color: #C7D2FE; }

        .v3-act-card-header { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1.25rem; background: #FAFAFA; border-bottom: 1px solid #F3F4F6; }
        .v3-act-order-num { width: 26px; height: 26px; background: #4F46E5; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; }
        .v3-act-title-box { flex: 1; display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
        .v3-phase-badge { font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 6px; border: 1px solid; }
        .v3-act-title { font-size: 0.95rem; font-weight: 700; color: #1F2937; margin: 0; }
        .v3-act-time-badge { font-size: 0.8rem; font-weight: 600; color: #4B5563; background: #F3F4F6; padding: 0.2rem 0.5rem; border-radius: 6px; }
        .v3-act-order-controls { display: flex; gap: 0.2rem; }

        .v3-act-card-body { padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .v3-act-actions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 640px) { .v3-act-actions-grid { grid-template-columns: 1fr; } }
        .v3-action-col { background: #F9FAFB; border-radius: 8px; padding: 0.75rem; }
        .v3-action-col.teacher { border-left: 3px solid #6366F1; }
        .v3-action-col.student { border-left: 3px solid #10B981; }
        .v3-col-label { font-size: 0.75rem; font-weight: 700; color: #4B5563; margin-bottom: 0.3rem; }
        .v3-action-text { font-size: 0.85rem; color: #1F2937; margin: 0; line-height: 1.5; white-space: pre-wrap; }

        .v3-moments-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .v3-moment-item { font-size: 0.78rem; padding: 0.4rem 0.6rem; border-radius: 6px; flex: 1; min-width: 200px; }
        .v3-moment-item.check { background: #EFF6FF; border: 1px solid #BFDBFE; color: #1E40AF; }
        .v3-moment-item.feedback { background: #FAF5FF; border: 1px solid #E9D5FF; color: #6B21A8; }

        .v3-act-links-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #F3F4F6; }
        .v3-links-group { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; }
        .v3-link-group-label { color: #6B7280; }
        .v3-link-pill { font-size: 0.72rem; padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 600; }
        .v3-link-pill.obj { background: #EEF2FF; color: #4338CA; }
        .v3-link-pill.evd { background: #ECFDF5; color: #047857; }
        .v3-link-pill.missing { background: #FEF2F2; color: #B91C1C; }
        .v3-source-tag { font-size: 0.7rem; color: #9CA3AF; }

        .v3-act-card-footer { display: flex; justify-content: flex-end; gap: 0.5rem; padding: 0.5rem 1.25rem; background: #F9FAFB; border-top: 1px solid #F3F4F6; }
        .v3-btn-regen { color: #7C3AED; }
        .v3-btn-regen:hover { background: #F5F3FF; }
        .v3-btn-danger { color: #DC2626; }
        .v3-btn-danger:hover { background: #FEF2F2; }

        /* Modal Styles */
        .v3-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
        .v3-modal-box { background: white; border-radius: 16px; padding: 1.5rem; max-width: 500px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        .v3-modal-box.large { max-width: 800px; max-height: 85vh; display: flex; flex-direction: column; }
        .v3-modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
        .v3-modal-title { font-size: 1.15rem; font-weight: 700; color: #1F2937; margin: 0 0 0.3rem; }
        .v3-modal-desc { font-size: 0.85rem; color: #6B7280; margin: 0; line-height: 1.4; }
        .v3-modal-choices { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1.5rem; }

        .preview-modal { max-height: 90vh; }
        .v3-preview-list { overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; margin: 1rem 0; padding-right: 0.5rem; }
        .v3-preview-item { border: 1px solid #E5E7EB; border-radius: 8px; padding: 0.75rem; font-size: 0.85rem; }
        .v3-preview-item-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
        .v3-time-tag { font-size: 0.75rem; background: #F3F4F6; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 600; }
        .v3-preview-actions p { margin: 0.2rem 0; color: #374151; font-size: 0.82rem; }
        .v3-moment-text { margin: 0.3rem 0 0; font-size: 0.78rem; color: #2563EB; }
        .v3-preview-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid #E5E7EB; margin-top: auto; }
        .v3-preview-total { font-weight: 700; font-size: 0.9rem; color: #1F2937; }
        .v3-preview-actions-btns { display: flex; gap: 0.5rem; }

        .v3-compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0; }
        .v3-compare-col { padding: 0.75rem; border-radius: 8px; font-size: 0.82rem; }
        .v3-compare-col.current { background: #F9FAFB; border: 1px solid #E5E7EB; }
        .v3-compare-col.alternative { background: #F5F3FF; border: 1px solid #DDD6FE; color: #4C1D95; }
        .v3-compare-col h4 { margin: 0 0 0.5rem; font-size: 0.85rem; font-weight: 700; }
        .v3-compare-col p { margin: 0.3rem 0; }
      `}</style>
    </div>
  );
}
