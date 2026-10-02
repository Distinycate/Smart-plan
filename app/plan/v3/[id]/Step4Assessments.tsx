'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  V3AssessmentWithLinks,
  V3AssessmentType,
  V3AssessmentToolType,
  V3CriteriaType,
  V3LearningEvidence,
  V3LessonObjective,
  V3LessonPlan,
  V3LessonActivity,
  V3ActivityWithLinks,
  V3ObjectiveEvidenceLink,
  V3AssessmentReadiness,
  V3RubricContent,
  V3ChecklistContent,
  V3ScoringGuideContent,
  V3AnswerKeyContent,
} from '@/lib/smartPlanV3/types';
import {
  getAssessmentRecommendations,
  validateAssessmentRules,
  deriveAssessmentReadiness,
} from '@/lib/smartPlanV3/rules/assessmentRules';
import { getAssessmentSuggestions, AssessmentCandidate } from '@/lib/smartPlanV3/suggestions';

interface Step4AssessmentsProps {
  planId: string;
  lesson: V3LessonPlan;
  objectives: V3LessonObjective[];
  evidence: V3LearningEvidence[];
  objEvdLinks: V3ObjectiveEvidenceLink[];
}

// Thai Labels Map
const ASSESSMENT_TYPE_LABELS: Record<string, string> = {
  PERFORMANCE: 'การประเมินการปฏิบัติ (Performance)',
  QUIZ: 'แบบทดสอบ/แบบฝึกหัด (Quiz)',
  OBSERVATION: 'การสังเกตพฤติกรรม (Observation)',
  PRODUCT: 'การประเมินผลงาน/ชิ้นงาน (Product)',
  WRITTEN_RESPONSE: 'การตอบข้อเขียน (Written Response)',
  DISCUSSION: 'การร่วมสนทนา/อภิปราย (Discussion)',
  EXPERIMENT: 'การปฏิบัติการทดลอง (Experiment)',
  EXIT_TICKET: 'ตั๋วออกจากห้องเรียน (Exit Ticket)',
  OTHER: 'อื่น ๆ',
};

const TOOL_TYPE_LABELS: Record<string, string> = {
  PERFORMANCE_RUBRIC: 'แบบประเมินการปฏิบัติ (Performance Rubric)',
  PRODUCT_RUBRIC: 'แบบประเมินชิ้นงาน (Product Rubric)',
  RUBRIC: 'เกณฑ์รูบริก (Rubric)',
  CHECKLIST: 'แบบตรวจสอบรายการ (Checklist)',
  SCORING_GUIDE: 'เกณฑ์การให้คะแนน (Scoring Guide)',
  RATING_SCALE: 'แบบมาตรประมาณค่า (Rating Scale)',
  ANSWER_KEY: 'เฉลยคำตอบ (Answer Key)',
  OBSERVATION_FORM: 'แบบบันทึกการสังเกต (Observation Form)',
  EXIT_TICKET: 'คำถามท้ายคาบ (Exit Ticket)',
  OTHER: 'อื่น ๆ',
};

const CRITERIA_TYPE_LABELS: Record<string, string> = {
  PERCENTAGE: 'ร้อยละ (Percentage เช่น ≥ 70%)',
  SCORE_THRESHOLD: 'คะแนนผ่านเกณฑ์ (เช่น ≥ 8 เต็ม 10)',
  ITEMS_PASSED: 'จำนวนรายการที่ผ่าน (เช่น ผ่าน 4 ใน 5 รายการ)',
  RUBRIC_LEVEL: 'ระดับคุณภาพ Rubric (เช่น ระดับ 3 ขึ้นไป)',
  PASS_FAIL: 'ผ่าน / ไม่ผ่าน',
  CUSTOM: 'กำหนดเกณฑ์เอง',
};

export default function Step4Assessments({
  planId,
  lesson,
  objectives,
  evidence,
  objEvdLinks,
}: Step4AssessmentsProps) {
  const router = useRouter();
  const [assessments, setAssessments] = useState<V3AssessmentWithLinks[]>([]);
  const [activities, setActivities] = useState<V3ActivityWithLinks[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Modal / Editing state
  const [editingAssessment, setEditingAssessment] = useState<V3AssessmentWithLinks | null>(null);
  const [isNewAssessment, setIsNewAssessment] = useState(false);
  const [targetEvidenceId, setTargetEvidenceId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<V3AssessmentType>('PERFORMANCE');
  const [formMethod, setFormMethod] = useState('');
  const [formCriteriaType, setFormCriteriaType] = useState<V3CriteriaType>('PERCENTAGE');
  const [formCriteriaValue, setFormCriteriaValue] = useState<number | ''>(70);
  const [formCriteriaText, setFormCriteriaText] = useState('');
  const [formFormative, setFormFormative] = useState(false);
  const [formEvidenceIds, setFormEvidenceIds] = useState<string[]>([]);
  const [formActivityIds, setFormActivityIds] = useState<string[]>([]);
  const [formToolType, setFormToolType] = useState<V3AssessmentToolType>('PERFORMANCE_RUBRIC');
  const [formToolTitle, setFormToolTitle] = useState('');

  // Tool Editor / AI Preview Modal state
  const [activeToolAsm, setActiveToolAsm] = useState<V3AssessmentWithLinks | null>(null);
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [toolPreview, setToolPreview] = useState<any | null>(null);
  const [toolContentEdit, setToolContentEdit] = useState<any | null>(null);

  // Fetch assessments and activities
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [asmRes, actRes] = await Promise.all([
        fetch(`/api/plan/v3/${planId}/assessments`),
        fetch(`/api/plan/v3/${planId}/activities`),
      ]);

      const asmJson = await asmRes.json();
      const actJson = await actRes.json();

      if (asmJson.success) {
        setAssessments(asmJson.data || []);
      }
      if (actJson.success) {
        setActivities(actJson.data || []);
      }
    } catch (err) {
      console.error('Failed to load assessments:', err);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived Readiness & Rule Summary
  const mockGraph = {
    evidence,
    assessments,
    assessmentEvidenceLinks: assessments.flatMap((a) =>
      a.linkedEvidenceIds.map((evdId) => ({ assessment_id: a.id, evidence_id: evdId, created_at: '' }))
    ),
    assessmentTools: assessments.filter((a) => a.tool).map((a) => a.tool!),
    assessmentActivityLinks: assessments.flatMap((a) =>
      a.linkedActivityIds.map((actId) => ({ assessment_id: a.id, activity_id: actId, created_at: '' }))
    ),
    activities,
  };

  const readiness = deriveAssessmentReadiness(mockGraph);
  const ruleSummary = validateAssessmentRules(mockGraph);

  // Helper to open create modal with recommendations or candidate prefilled
  const handleOpenCreateForEvidence = (evd: V3LearningEvidence, candidate?: AssessmentCandidate) => {
    setIsNewAssessment(true);
    setTargetEvidenceId(evd.id);
    setEditingAssessment(null);

    const evdLabel = evd.description.length > 30 ? evd.description.substring(0, 30) + '...' : evd.description;

    if (candidate) {
      setFormName(candidate.name);
      setFormType(candidate.type);
      setFormMethod(candidate.method);
      setFormCriteriaType(candidate.criteriaType);
      setFormCriteriaValue(candidate.criteriaValue !== undefined ? candidate.criteriaValue : 70);
      setFormCriteriaText(candidate.criteriaText || '');
      setFormFormative(false);
      setFormEvidenceIds([evd.id]);
      setFormActivityIds([]);
      setFormToolType(candidate.toolType);
      setFormToolTitle(candidate.toolTitle);
    } else {
      const rec = getAssessmentRecommendations({
        subjectKey: lesson.subject_key,
        learningFocus: lesson.learning_focus,
        evidenceType: evd.evidence_type,
      });

      setFormName(`การประเมิน: ${evdLabel}`);
      setFormType(rec.preferredAssessmentType);
      setFormMethod(rec.suggestedMethod);
      setFormCriteriaType(rec.defaultCriteriaType);
      setFormCriteriaValue(rec.defaultCriteriaValue !== undefined ? rec.defaultCriteriaValue : 70);
      setFormCriteriaText(rec.defaultCriteriaText || '');
      setFormFormative(false);
      setFormEvidenceIds([evd.id]);
      setFormActivityIds([]);

      const preferredTool = rec.preferredToolTypes[0] || 'RUBRIC';
      setFormToolType(preferredTool);
      setFormToolTitle(`แบบประเมิน: ${evdLabel}`);
    }
  };

  // Helper to import Formative Quick Check from Activity
  const handleImportQuickCheck = (act: V3ActivityWithLinks) => {
    // Find matching evidence linked to this activity
    const linkedEvd = evidence.find((e) => act.linkedEvidenceIds?.includes(e.id)) || evidence[0];

    setIsNewAssessment(true);
    setTargetEvidenceId(linkedEvd ? linkedEvd.id : null);
    setEditingAssessment(null);

    setFormName(`ประเมินระหว่างเรียน: ${act.title}`);
    setFormType('OBSERVATION');
    setFormMethod(act.assessment_moment ? `การสังเกต/ตรวจสอบ: ${act.assessment_moment}` : 'การสังเกตระหว่างทำกิจกรรม');
    setFormCriteriaType('ITEMS_PASSED');
    setFormCriteriaValue(3);
    setFormCriteriaText('สังเกตพฤติกรรมผ่านเกณฑ์ที่กำหนดในกิจกรรม');
    setFormFormative(true);
    setFormEvidenceIds(linkedEvd ? [linkedEvd.id] : []);
    setFormActivityIds([act.id]);

    setFormToolType('CHECKLIST');
    setFormToolTitle(`แบบตรวจสอบพฤติกรรม: ${act.title}`);
  };

  // Helper to open edit modal
  const handleOpenEdit = (asm: V3AssessmentWithLinks) => {
    setIsNewAssessment(false);
    setEditingAssessment(asm);
    setTargetEvidenceId(asm.linkedEvidenceIds[0] || null);

    setFormName(asm.name);
    setFormType(asm.assessment_type as V3AssessmentType);
    setFormMethod(asm.method);
    setFormCriteriaType(asm.criteria_type as V3CriteriaType);
    setFormCriteriaValue(asm.criteria_value !== null ? asm.criteria_value : '');
    setFormCriteriaText(asm.criteria_text || '');
    setFormFormative(asm.formative);
    setFormEvidenceIds(asm.linkedEvidenceIds);
    setFormActivityIds(asm.linkedActivityIds);

    if (asm.tool) {
      setFormToolType(asm.tool.tool_type as V3AssessmentToolType);
      setFormToolTitle(asm.tool.title);
    } else {
      setFormToolType('RUBRIC');
      setFormToolTitle(`แบบประเมิน: ${asm.name}`);
    }
  };

  // Save assessment (Create or Update)
  const handleSaveAssessment = async () => {
    if (!formName.trim() || !formMethod.trim()) {
      alert('กรุณากรอกชื่อการประเมินและวิธีการประเมิน');
      return;
    }

    setSaving(true);
    setSaveStatus('กำลังบันทึก...');

    try {
      if (isNewAssessment) {
        const payload = {
          name: formName.trim(),
          assessment_type: formType,
          method: formMethod.trim(),
          criteria_type: formCriteriaType,
          criteria_value: formCriteriaValue !== '' ? Number(formCriteriaValue) : null,
          criteria_text: formCriteriaText.trim() || null,
          formative: formFormative,
          evidenceIds: formEvidenceIds,
          activityIds: formActivityIds,
          tool: {
            tool_type: formToolType,
            title: formToolTitle.trim() || `เครื่องมือประเมิน (${formToolType})`,
            content: formToolType === 'CHECKLIST'
              ? { title: formToolTitle, items: [{ id: 'C1', criterion: 'ปฏิบัติภารกิจการเรียนรู้ตามเป้าหมาย', observable: true }] }
              : formToolType === 'SCORING_GUIDE'
              ? { title: formToolTitle, totalPoints: 5, items: [{ criterion: 'ความถูกต้องและสมบูรณ์ของภารกิจ', maxPoints: 5 }] }
              : {
                  title: formToolTitle,
                  levels: [
                    { score: 4, label: 'ระดับ 4 (ดีเยี่ยม)' },
                    { score: 3, label: 'ระดับ 3 (ดี/ผ่านเกณฑ์)' },
                    { score: 2, label: 'ระดับ 2 (พอใช้)' },
                    { score: 1, label: 'ระดับ 1 (ปรับปรุง)' },
                  ],
                  criteria: [
                    {
                      name: 'การปฏิบัติงานตามเป้าหมาย',
                      descriptors: {
                        '4': 'ปฏิบัติได้ถูกต้องครบถ้วนอย่างคล่องแคล่ว',
                        '3': 'ปฏิบัติได้ถูกต้องตามเกณฑ์มาตรฐาน',
                        '2': 'ปฏิบัติได้บางส่วนโดยมีครูช่วยแนะนำ',
                        '1': 'ยังไม่สามารถปฏิบัติได้ตามเกณฑ์',
                      },
                    },
                  ],
                },
            source: 'MANUAL',
          },
        };

        const res = await fetch(`/api/plan/v3/${planId}/assessments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
      } else if (editingAssessment) {
        const payload = {
          name: formName.trim(),
          assessment_type: formType,
          method: formMethod.trim(),
          criteria_type: formCriteriaType,
          criteria_value: formCriteriaValue !== '' ? Number(formCriteriaValue) : null,
          criteria_text: formCriteriaText.trim() || null,
          formative: formFormative,
          evidenceIds: formEvidenceIds,
          activityIds: formActivityIds,
        };

        const res = await fetch(`/api/plan/v3/${planId}/assessments/${editingAssessment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
      }

      setSaveStatus('บันทึกแล้ว ✓');
      setEditingAssessment(null);
      setIsNewAssessment(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setSaveStatus('บันทึกไม่สำเร็จ ❌');
      alert(`บันทึกไม่สำเร็จ: ${err.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // Delete assessment
  const handleDeleteAssessment = async (asmId: string) => {
    if (!confirm('ยืนยันการลบรายการประเมินนี้? (จะไม่ลบหลักฐานการเรียนรู้หรือกิจกรรม)')) return;

    try {
      const res = await fetch(`/api/plan/v3/${planId}/assessments/${asmId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await loadData();
    } catch (err: any) {
      alert(`ลบไม่สำเร็จ: ${err.message}`);
    }
  };

  // Open Tool Modal
  const handleOpenToolModal = (asm: V3AssessmentWithLinks) => {
    setActiveToolAsm(asm);
    setToolPreview(null);
    setAiError(null);
    if (asm.tool) {
      setToolContentEdit(JSON.parse(JSON.stringify(asm.tool.content)));
    } else {
      setToolContentEdit(null);
    }
    setIsToolModalOpen(true);
  };

  // AI Tool Generation (Preview First)
  const handleGenerateAiTool = async (levelsCount = 4) => {
    if (!activeToolAsm) return;
    setAiGenerating(true);
    setAiError(null);

    try {
      const toolType = activeToolAsm.tool?.tool_type || 'PERFORMANCE_RUBRIC';
      const res = await fetch(`/api/plan/v3/${planId}/assessments/${activeToolAsm.id}/tool/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolType,
          levelsCount,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'สร้างเครื่องมือไม่สำเร็จ');
      }

      setToolPreview(json.preview);
      setToolContentEdit(json.preview.content);
    } catch (err: any) {
      setAiError(err.message || 'เกิดข้อผิดพลาดในการสร้างเครื่องมือ');
    } finally {
      setAiGenerating(false);
    }
  };

  // Apply tool content to DB
  const handleApplyTool = async () => {
    if (!activeToolAsm || !toolContentEdit) return;
    setSaving(true);

    try {
      const toolType = activeToolAsm.tool?.tool_type || toolPreview?.toolType || 'RUBRIC';
      const title = toolContentEdit.title || activeToolAsm.tool?.title || `แบบประเมิน: ${activeToolAsm.name}`;

      const res = await fetch(`/api/plan/v3/${planId}/assessments/${activeToolAsm.id}/tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_type: toolType,
          title,
          content: toolContentEdit,
          source: toolPreview ? 'AI' : 'MANUAL',
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setIsToolModalOpen(false);
      setActiveToolAsm(null);
      await loadData();
    } catch (err: any) {
      alert(`บันทึกเครื่องมือไม่สำเร็จ: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="v3-loading-screen">
        <div className="v3-spinner" />
        <p>กำลังโหลดการวัดและประเมินผล...</p>
      </div>
    );
  }

  // Quick check suggestions from activities
  const quickCheckActivities = activities.filter(
    (a) => a.assessment_moment && a.assessment_moment.trim().length > 0
  );

  return (
    <div className="v3-step4-container">
      {/* ─── Top Header & Summary ────────────────────────────────────────── */}
      <div className="v3-editor-section">
        <div className="v3-section-header-row">
          <div>
            <h2 className="v3-section-title">🎯 ขั้นที่ 4 — การวัดและประเมินผล (Evidence-Driven Assessment)</h2>
            <p className="v3-section-hint">
              เชื่อมโยงสิ่งที่ต้องการวัด (Evidence) สู่ วิธีประเมิน เครื่องมือ และเกณฑ์ตัดสิน ตามธรรมชาติของวิชา
            </p>
          </div>
          {saveStatus && <span className="v3-save-indicator save-ok">{saveStatus}</span>}
        </div>

        {/* Coverage Badges */}
        <div className="v3-summary-grid">
          <div className="v3-summary-item">
            <span className="v3-summary-num">
              {readiness.assessedEvidenceCount} / {readiness.totalEvidenceCount}
            </span>
            <span className="v3-summary-label">หลักฐานมีการประเมิน {readiness.summary.evidenceCoverage ? '✓' : '⚠️'}</span>
          </div>
          <div className="v3-summary-item">
            <span className="v3-summary-num">
              {ruleSummary.toolsCompleteness.withTools} / {ruleSummary.toolsCompleteness.total}
            </span>
            <span className="v3-summary-label">มีเครื่องมือครบ {readiness.summary.toolsComplete ? '✓' : '⚠️'}</span>
          </div>
          <div className="v3-summary-item">
            <span className="v3-summary-num">
              {ruleSummary.criteriaCompleteness.withCriteria} / {ruleSummary.criteriaCompleteness.total}
            </span>
            <span className="v3-summary-label">กำหนดเกณฑ์ผ่าน {readiness.summary.criteriaComplete ? '✓' : '⚠️'}</span>
          </div>
          <div className="v3-summary-item">
            <span className="v3-summary-num" style={{ fontSize: '1.2rem', color: readiness.summary.hasFormative ? '#10B981' : '#F59E0B' }}>
              {readiness.summary.hasFormative ? 'มีแล้ว ✓' : 'ยังไม่มี ⚠'}
            </span>
            <span className="v3-summary-label">ประเมินระหว่างเรียน</span>
          </div>
        </div>

        {/* Warnings */}
        {readiness.warnings.length > 0 && (
          <div className="v3-alignment-warning" style={{ marginTop: '1rem' }}>
            <strong>คำแนะนำความสอดคล้อง (Alignment Check):</strong>
            <ul>
              {readiness.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ─── Formative Quick Check Import Section ─────────────────────────── */}
      {quickCheckActivities.length > 0 && (
        <div className="v3-editor-section" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <h3 className="v3-subsection-title" style={{ color: '#166534' }}>
            💡 จุดสังเกต/ประเมินระหว่างเรียนจากกิจกรรม (Quick Checks ในขั้นที่ 3)
          </h3>
          <p className="v3-section-hint" style={{ color: '#15803D' }}>
            สามารถนำจุดตรวจสอบระหว่างทำกิจกรรมมาสร้างเป็น การประเมินระหว่างเรียน (Formative Assessment) ได้ทันที
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            {quickCheckActivities.map((act) => {
              const alreadyLinked = assessments.some(
                (a) => a.linkedActivityIds.includes(act.id) && a.formative
              );
              return (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'white',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    border: '1px solid #DCFCE7',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: '#166534' }}>
                      กิจกรรมที่ {act.position}: {act.title}
                    </strong>
                    <div style={{ fontSize: '0.8rem', color: '#4B5563' }}>
                      🔎 จุดประเมิน: {act.assessment_moment}
                    </div>
                  </div>
                  {alreadyLinked ? (
                    <span style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 600 }}>
                      ✓ เชื่อมโยงแล้ว
                    </span>
                  ) : (
                    <button
                      className="v3-btn v3-btn-ghost v3-btn-xs"
                      style={{ color: '#15803D', borderColor: '#86EFAC' }}
                      onClick={() => handleImportQuickCheck(act)}
                    >
                      + นำเข้าเป็นการประเมิน
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Evidence-Driven Assessment Cards ─────────────────────────────── */}
      <div className="v3-editor-section">
        <div className="v3-section-header-row">
          <h3 className="v3-section-title">📋 หลักฐานการเรียนรู้และการประเมิน</h3>
          <span className="v3-count-badge">{evidence.length} หลักฐาน</span>
        </div>

        {evidence.length === 0 ? (
          <p className="v3-hint-empty">ยังไม่มีหลักฐานการเรียนรู้ กรุณากลับไปสร้างในขั้นที่ 2</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {evidence.map((evd, evdIdx) => {
              // Find related objectives
              const linkedObjIds = objEvdLinks
                .filter((l) => l.evidence_id === evd.id)
                .map((l) => l.objective_id);
              const linkedObjs = objectives.filter((o) => linkedObjIds.includes(o.id));

              // Find assessments linked to this evidence
              const linkedAssessments = assessments.filter((a) =>
                a.linkedEvidenceIds.includes(evd.id)
              );

              // Get Recommendation
              const rec = getAssessmentRecommendations({
                subjectKey: lesson.subject_key,
                learningFocus: lesson.learning_focus,
                evidenceType: evd.evidence_type,
              });

              return (
                <div
                  key={evd.id}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    background: linkedAssessments.length > 0 ? '#FFFFFF' : '#FFFDF7',
                  }}
                >
                  {/* Evidence Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1E293B' }}>
                          หลักฐานที่ {evdIdx + 1}: {evd.description}
                        </span>
                        <span className="v3-evd-type-badge">{evd.evidence_type}</span>
                      </div>

                      {/* Traceability: Linked Objectives */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>ใช้ยืนยันจุดประสงค์:</span>
                        {linkedObjs.length === 0 ? (
                          <span style={{ fontSize: '0.75rem', color: '#EF4444' }}>ยังไม่ผูกกับจุดประสงค์</span>
                        ) : (
                          linkedObjs.map((obj) => (
                            <span
                              key={obj.id}
                              style={{
                                fontSize: '0.72rem',
                                background: '#EEF2FF',
                                color: '#4338CA',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                fontWeight: 600,
                              }}
                            >
                              ✓ ข้อ {objectives.indexOf(obj) + 1}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <button
                      className="v3-btn v3-btn-primary v3-btn-xs"
                      onClick={() => handleOpenCreateForEvidence(evd)}
                    >
                      + เพิ่มการประเมิน
                    </button>
                  </div>

                  {/* Recommendation & Guided Choice Candidates */}
                  {(() => {
                    const suggestions = getAssessmentSuggestions({
                      subjectKey: lesson.subject_key,
                      learningFocus: lesson.learning_focus,
                      topic: lesson.topic,
                      primaryEvidenceType: evd.evidence_type,
                    });

                    return (
                      <div style={{ marginTop: '0.75rem' }}>
                        {linkedAssessments.length === 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3730A3' }}>
                                ✨ ข้อเสนอแนะวิธีประเมินที่เหมาะกับหลักฐานนี้ (เลือกใช้ได้ทันที):
                              </span>
                              <button
                                className="v3-btn v3-btn-ghost v3-btn-xs"
                                onClick={() => handleOpenCreateForEvidence(evd)}
                              >
                                ✍️ กำหนดเอง
                              </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.6rem' }}>
                              {suggestions.map((cand) => (
                                <div
                                  key={cand.id}
                                  style={{
                                    border: cand.isRecommended ? '1.5px solid #818CF8' : '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    padding: '0.75rem',
                                    background: cand.isRecommended ? '#F5F7FF' : '#FAFAFA',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                                      <span
                                        style={{
                                          fontSize: '0.68rem',
                                          fontWeight: 700,
                                          padding: '0.1rem 0.4rem',
                                          borderRadius: '4px',
                                          background: cand.isRecommended ? '#4338CA' : '#E2E8F0',
                                          color: cand.isRecommended ? 'white' : '#475569',
                                        }}
                                      >
                                        {cand.isRecommended ? 'แนะนำ' : 'ทางเลือก'}
                                      </span>
                                      <strong style={{ fontSize: '0.85rem', color: '#1E293B' }}>{cand.name}</strong>
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: '#4B5563', lineHeight: 1.4 }}>
                                      <div><strong>วิธี:</strong> {cand.method}</div>
                                      <div><strong>เครื่องมือ:</strong> {cand.toolTitle}</div>
                                      <div><strong>เกณฑ์ผ่าน:</strong> {cand.criteriaText}</div>
                                    </div>
                                    {cand.description && (
                                      <p style={{ margin: '0.35rem 0 0', fontSize: '0.74rem', color: '#64748B' }}>
                                        {cand.description}
                                      </p>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', borderTop: '1px dashed #CBD5E1', paddingTop: '0.5rem' }}>
                                    <button
                                      className="v3-btn v3-btn-primary v3-btn-xs"
                                      style={{ flex: 1 }}
                                      onClick={() => handleOpenCreateForEvidence(evd, cand)}
                                    >
                                      ✓ เลือกใช้ข้อเสนอนี้
                                    </button>
                                    <button
                                      className="v3-btn v3-btn-ghost v3-btn-xs"
                                      onClick={() => handleOpenCreateForEvidence(evd, cand)}
                                      title="เปิดปรับแก้รายละเอียดก่อนบันทึก"
                                    >
                                      ✏️ ปรับแก้
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              borderRadius: '8px',
                              padding: '0.5rem 0.75rem',
                              fontSize: '0.8rem',
                              color: '#475569',
                            }}
                          >
                            <span style={{ color: '#4F46E5', fontWeight: 600 }}>💡 ข้อเสนอแนะตามธรรมชาติวิชา: </span>
                            วิธี: <strong>{rec.suggestedMethod}</strong> | เครื่องมือ: <strong>{rec.preferredToolTypes.map((t) => TOOL_TYPE_LABELS[t] || t).join(', ')}</strong> | เกณฑ์: <strong>{rec.defaultCriteriaText}</strong>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Attached Assessments List */}
                  <div style={{ marginTop: '1rem', borderTop: '1px dashed #E2E8F0', paddingTop: '0.75rem' }}>
                    {linkedAssessments.length === 0 ? null : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {linkedAssessments.map((asm, asmIdx) => {
                          const linkedActTitles = activities
                            .filter((act) => asm.linkedActivityIds.includes(act.id))
                            .map((act) => `กิจกรรมที่ ${act.position}: ${act.title}`);

                          return (
                            <div
                              key={asm.id}
                              style={{
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                padding: '0.85rem 1rem',
                                background: '#FAFAFA',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <strong style={{ fontSize: '0.9rem', color: '#1E293B' }}>
                                      {asm.name}
                                    </strong>
                                    {asm.formative && (
                                      <span
                                        style={{
                                          fontSize: '0.68rem',
                                          background: '#ECFDF5',
                                          color: '#059669',
                                          padding: '0.1rem 0.4rem',
                                          borderRadius: '4px',
                                          fontWeight: 600,
                                        }}
                                      >
                                        ระหว่างเรียน (Formative)
                                      </span>
                                    )}
                                  </div>

                                  <div
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                      gap: '0.4rem 1rem',
                                      marginTop: '0.5rem',
                                      fontSize: '0.8rem',
                                      color: '#4B5563',
                                    }}
                                  >
                                    <div>
                                      <strong>วิธีประเมิน:</strong> {asm.method}
                                    </div>
                                    <div>
                                      <strong>เครื่องมือ:</strong>{' '}
                                      {asm.tool ? (
                                        <span style={{ color: '#4F46E5', fontWeight: 600 }}>
                                          {TOOL_TYPE_LABELS[asm.tool.tool_type] || asm.tool.tool_type}
                                        </span>
                                      ) : (
                                        <span style={{ color: '#EF4444' }}>ยังไม่มีเครื่องมือ ⚠</span>
                                      )}
                                    </div>
                                    <div>
                                      <strong>เกณฑ์ผ่าน:</strong>{' '}
                                      {asm.criteria_text || `${CRITERIA_TYPE_LABELS[asm.criteria_type] || asm.criteria_type}: ${asm.criteria_value || ''}`}
                                    </div>
                                    {linkedActTitles.length > 0 && (
                                      <div>
                                        <strong>เกิดขึ้นใน:</strong> {linkedActTitles.join(', ')}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  <button
                                    className="v3-btn v3-btn-ghost v3-btn-xs"
                                    onClick={() => handleOpenToolModal(asm)}
                                    title="ดู/แก้ไขเครื่องมือประเมิน"
                                  >
                                    🛠️ {asm.tool ? 'ดูเครื่องมือ' : '+ กำหนดเครื่องมือ'}
                                  </button>
                                  <button
                                    className="v3-btn v3-btn-ghost v3-btn-xs"
                                    onClick={() => handleOpenEdit(asm)}
                                  >
                                    แก้ไข
                                  </button>
                                  <button
                                    className="v3-btn v3-btn-ghost v3-btn-xs"
                                    style={{ color: '#DC2626' }}
                                    onClick={() => handleDeleteAssessment(asm.id)}
                                  >
                                    ลบ
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Navigation Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
          <button
            className="v3-btn v3-btn-ghost"
            onClick={() => router.push(`/plan/v3/${planId}?step=3`)}
          >
            ← ย้อนกลับไปขั้นที่ 3
          </button>
          <button
            className="v3-btn v3-btn-primary"
            onClick={() => router.push(`/plan/v3/${planId}?step=5`)}
          >
            ไปขั้นที่ 5 — ชุดพร้อมสอน →
          </button>
        </div>
      </div>

      {/* ─── Modal: Create/Edit Assessment ─────────────────────────────────── */}
      {(isNewAssessment || editingAssessment) && (
        <div className="v3-modal-overlay">
          <div className="v3-modal-content" style={{ maxWidth: '640px' }}>
            <h3 className="v3-modal-title">
              {isNewAssessment ? '+ เพิ่มการวัดและประเมินผล' : 'แก้ไขการวัดและประเมินผล'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              {isNewAssessment && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.65rem 0.75rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                    💡 เติมข้อมูลด่วนจากข้อเสนอแนะ:
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {getAssessmentSuggestions({
                      subjectKey: lesson.subject_key,
                      learningFocus: lesson.learning_focus,
                      topic: lesson.topic,
                    }).map((cand) => (
                      <button
                        key={cand.id}
                        type="button"
                        className="v3-btn v3-btn-ghost v3-btn-xs"
                        style={{
                          background: formName === cand.name ? '#EEF2FF' : 'white',
                          borderColor: formName === cand.name ? '#6366F1' : '#CBD5E1',
                          color: formName === cand.name ? '#4338CA' : '#334155',
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.5rem',
                        }}
                        onClick={() => {
                          setFormName(cand.name);
                          setFormType(cand.type);
                          setFormMethod(cand.method);
                          setFormCriteriaType(cand.criteriaType);
                          setFormCriteriaValue(cand.criteriaValue !== undefined ? cand.criteriaValue : 70);
                          setFormCriteriaText(cand.criteriaText || '');
                          setFormToolType(cand.toolType);
                          setFormToolTitle(cand.toolTitle);
                        }}
                      >
                        {cand.isRecommended ? '⭐ ' : ''}{cand.toolTitle}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="v3-btn v3-btn-ghost v3-btn-xs"
                      style={{ color: '#64748B', fontSize: '0.75rem' }}
                      onClick={() => {
                        setFormName('');
                        setFormMethod('');
                        setFormCriteriaText('');
                        setFormToolTitle('');
                      }}
                    >
                      ✍️ ล้างเขียนเอง
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="v3-form-label">ชื่อรายการประเมิน *</label>
                <input
                  className="v3-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="เช่น การพูดสนทนาถามตอบเกี่ยวกับอาชีพ"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="v3-form-label">ประเภทการประเมิน *</label>
                  <select
                    className="v3-select"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as V3AssessmentType)}
                  >
                    {Object.entries(ASSESSMENT_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="v3-form-label">ช่วงเวลาการประเมิน</label>
                  <select
                    className="v3-select"
                    value={formFormative ? 'FORMATIVE' : 'SUMMATIVE'}
                    onChange={(e) => setFormFormative(e.target.value === 'FORMATIVE')}
                  >
                    <option value="FORMATIVE">การประเมินระหว่างเรียน (Formative)</option>
                    <option value="SUMMATIVE">การประเมินผลท้ายคาบ (Summative)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="v3-form-label">วิธีการประเมิน (Assessment Method) *</label>
                <input
                  className="v3-input"
                  value={formMethod}
                  onChange={(e) => setFormMethod(e.target.value)}
                  placeholder="เช่น การประเมินการปฏิบัติ, การตรวจแบบฝึกหัด, การสังเกตพฤติกรรม"
                />
              </div>

              {/* Criteria Section */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.75rem', background: '#F8FAFC' }}>
                <label className="v3-form-label" style={{ fontWeight: 700, color: '#1E293B' }}>
                  เกณฑ์การตัดสิน (Criteria Engine) *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.4rem' }}>
                  <div>
                    <label className="v3-form-sublabel">รูปแบบเกณฑ์</label>
                    <select
                      className="v3-select"
                      value={formCriteriaType}
                      onChange={(e) => setFormCriteriaType(e.target.value as V3CriteriaType)}
                    >
                      {Object.entries(CRITERIA_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="v3-form-sublabel">ค่าตัวเลขเกณฑ์ (ถ้ามี)</label>
                    <input
                      type="number"
                      className="v3-input"
                      value={formCriteriaValue}
                      onChange={(e) => setFormCriteriaValue(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder={formCriteriaType === 'PERCENTAGE' ? '70' : '3'}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  <label className="v3-form-sublabel">คำอธิบายเกณฑ์ผ่าน</label>
                  <input
                    className="v3-input"
                    value={formCriteriaText}
                    onChange={(e) => setFormCriteriaText(e.target.value)}
                    placeholder="เช่น ผ่านเกณฑ์ระดับ 3 ขึ้นไป หรือได้คะแนนไม่น้อยกว่าร้อยละ 70"
                  />
                </div>
              </div>

              {/* Tool Selection (if creating new) */}
              {isNewAssessment && (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.75rem' }}>
                  <label className="v3-form-label" style={{ fontWeight: 700 }}>
                    เครื่องมือประเมินเริ่มต้น (Assessment Tool)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.4rem' }}>
                    <div>
                      <label className="v3-form-sublabel">ประเภทเครื่องมือ</label>
                      <select
                        className="v3-select"
                        value={formToolType}
                        onChange={(e) => setFormToolType(e.target.value as V3AssessmentToolType)}
                      >
                        {Object.entries(TOOL_TYPE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="v3-form-sublabel">ชื่อเครื่องมือ</label>
                      <input
                        className="v3-input"
                        value={formToolTitle}
                        onChange={(e) => setFormToolTitle(e.target.value)}
                        placeholder="ชื่อแบบประเมิน"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Activity linkage */}
              {activities.length > 0 && (
                <div>
                  <label className="v3-form-label">เกิดขึ้นในกิจกรรมใด (ถ้ามี)</label>
                  <select
                    className="v3-select"
                    value={formActivityIds[0] || ''}
                    onChange={(e) => setFormActivityIds(e.target.value ? [e.target.value] : [])}
                  >
                    <option value="">-- ไม่ระบุกิจกรรมเฉพาะเจาะจง --</option>
                    {activities.map((act) => (
                      <option key={act.id} value={act.id}>
                        กิจกรรมที่ {act.position}: {act.title} ({act.minutes} นาที)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="v3-modal-actions" style={{ marginTop: '1.25rem' }}>
              <button
                className="v3-btn v3-btn-ghost"
                onClick={() => {
                  setEditingAssessment(null);
                  setIsNewAssessment(false);
                }}
              >
                ยกเลิก
              </button>
              <button
                className="v3-btn v3-btn-primary"
                onClick={handleSaveAssessment}
                disabled={saving}
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกรายการประเมิน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Tool Editor & AI Generator ─────────────────────────────── */}
      {isToolModalOpen && activeToolAsm && (
        <div className="v3-modal-overlay">
          <div className="v3-modal-content" style={{ maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="v3-modal-title">
                🛠️ เครื่องมือประเมิน: {activeToolAsm.tool?.title || activeToolAsm.name}
              </h3>
              <button
                className="v3-icon-btn"
                onClick={() => {
                  setIsToolModalOpen(false);
                  setActiveToolAsm(null);
                }}
              >
                ✕
              </button>
            </div>

            {/* AI Generator Action Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#EEF2FF',
                border: '1px solid #C7D2FE',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                margin: '1rem 0',
              }}
            >
              <div>
                <strong style={{ fontSize: '0.85rem', color: '#3730A3' }}>
                  ✨ ผู้ช่วย AI ร่างเกณฑ์ประเมิน (1 Scoped Request)
                </strong>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#4F46E5' }}>
                  AI จะเขียนเฉพาะคำอธิบายระดับคุณภาพ (Descriptors) หรือรายการพฤติกรรม โดยไม่เปลี่ยนจุดประสงค์
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {['RUBRIC', 'PERFORMANCE_RUBRIC', 'PRODUCT_RUBRIC'].includes(
                  activeToolAsm.tool?.tool_type || 'RUBRIC'
                ) ? (
                  <>
                    <button
                      className="v3-btn v3-btn-primary v3-btn-xs"
                      onClick={() => handleGenerateAiTool(4)}
                      disabled={aiGenerating}
                    >
                      {aiGenerating ? 'กำลังร่าง...' : 'ร่าง Rubric 4 ระดับ'}
                    </button>
                    <button
                      className="v3-btn v3-btn-ghost v3-btn-xs"
                      onClick={() => handleGenerateAiTool(3)}
                      disabled={aiGenerating}
                    >
                      3 ระดับ
                    </button>
                  </>
                ) : (
                  <button
                    className="v3-btn v3-btn-primary v3-btn-xs"
                    onClick={() => handleGenerateAiTool()}
                    disabled={aiGenerating}
                  >
                    {aiGenerating ? 'กำลังร่าง...' : 'ร่างเกณฑ์ด้วย AI'}
                  </button>
                )}
              </div>
            </div>

            {aiError && (
              <div className="v3-alignment-warning" style={{ margin: '0.5rem 0' }}>
                ❌ {aiError}
              </div>
            )}

            {/* Tool Content Editor / Viewer */}
            {toolContentEdit ? (
              <div style={{ marginTop: '1rem' }}>
                {/* Rubric Matrix Editor */}
                {toolContentEdit.levels && toolContentEdit.criteria ? (
                  <div>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#1E293B' }}>
                      ตาราง Rubric ({toolContentEdit.levels.length} ระดับคะแนน)
                    </h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ background: '#F1F5F9' }}>
                            <th style={{ border: '1px solid #CBD5E1', padding: '0.5rem', width: '150px' }}>
                              เกณฑ์การประเมิน
                            </th>
                            {toolContentEdit.levels.map((lvl: any) => (
                              <th
                                key={lvl.score}
                                style={{ border: '1px solid #CBD5E1', padding: '0.5rem', minWidth: '130px' }}
                              >
                                {lvl.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {toolContentEdit.criteria.map((crit: any, cIdx: number) => (
                            <tr key={cIdx}>
                              <td style={{ border: '1px solid #CBD5E1', padding: '0.5rem', verticalAlign: 'top' }}>
                                <input
                                  className="v3-input"
                                  style={{ fontSize: '0.8rem', padding: '0.3rem' }}
                                  value={crit.name}
                                  onChange={(e) => {
                                    const next = { ...toolContentEdit };
                                    next.criteria[cIdx].name = e.target.value;
                                    setToolContentEdit(next);
                                  }}
                                />
                              </td>
                              {toolContentEdit.levels.map((lvl: any) => (
                                <td
                                  key={lvl.score}
                                  style={{ border: '1px solid #CBD5E1', padding: '0.3rem', verticalAlign: 'top' }}
                                >
                                  <textarea
                                    className="v3-textarea"
                                    style={{ fontSize: '0.75rem', minHeight: '70px', padding: '0.3rem' }}
                                    value={crit.descriptors?.[String(lvl.score)] || ''}
                                    onChange={(e) => {
                                      const next = { ...toolContentEdit };
                                      if (!next.criteria[cIdx].descriptors) {
                                        next.criteria[cIdx].descriptors = {};
                                      }
                                      next.criteria[cIdx].descriptors[String(lvl.score)] = e.target.value;
                                      setToolContentEdit(next);
                                    }}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : toolContentEdit.items && Array.isArray(toolContentEdit.items) ? (
                  /* Checklist / Scoring Guide Editor */
                  <div>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#1E293B' }}>
                      รายการพฤติกรรม / เกณฑ์การให้คะแนน
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {toolContentEdit.items.map((item: any, iIdx: number) => (
                        <div
                          key={iIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            border: '1px solid #E2E8F0',
                            padding: '0.5rem',
                            borderRadius: '6px',
                          }}
                        >
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>
                            #{iIdx + 1}
                          </span>
                          <input
                            className="v3-input"
                            style={{ flex: 1, fontSize: '0.82rem' }}
                            value={item.criterion || item.answer || ''}
                            onChange={(e) => {
                              const next = { ...toolContentEdit };
                              if (item.criterion !== undefined) next.items[iIdx].criterion = e.target.value;
                              else next.items[iIdx].answer = e.target.value;
                              setToolContentEdit(next);
                            }}
                          />
                          {item.maxPoints !== undefined && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <input
                                type="number"
                                className="v3-input"
                                style={{ width: '60px', fontSize: '0.8rem' }}
                                value={item.maxPoints}
                                onChange={(e) => {
                                  const next = { ...toolContentEdit };
                                  next.items[iIdx].maxPoints = Number(e.target.value);
                                  setToolContentEdit(next);
                                }}
                              />
                              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>คะแนน</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <textarea
                    className="v3-textarea"
                    style={{ minHeight: '200px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                    value={JSON.stringify(toolContentEdit, null, 2)}
                    onChange={(e) => {
                      try {
                        setToolContentEdit(JSON.parse(e.target.value));
                      } catch {}
                    }}
                  />
                )}
              </div>
            ) : (
              <p className="v3-hint-empty">ยังไม่มีข้อมูลเครื่องมือ กดปุ่มให้ AI ร่าง หรือเพิ่มรายการด้วยตนเอง</p>
            )}

            <div className="v3-modal-actions" style={{ marginTop: '1.5rem' }}>
              <button
                className="v3-btn v3-btn-ghost"
                onClick={() => {
                  setIsToolModalOpen(false);
                  setActiveToolAsm(null);
                }}
              >
                ปิด
              </button>
              <button
                className="v3-btn v3-btn-primary"
                onClick={handleApplyTool}
                disabled={saving || !toolContentEdit}
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกเครื่องมือประเมิน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bottom Navigation ────────────────────────────────────────────── */}
      <div className="v3-step-nav-actions" style={{ marginTop: '1.5rem' }}>
        <button
          className="v3-btn v3-btn-ghost"
          onClick={() => router.push(`/plan/v3/${planId}?step=3`)}
        >
          ← ย้อนกลับไปขั้นที่ 3 (ออกแบบกิจกรรม)
        </button>
        <button
          className="v3-btn v3-btn-primary"
          onClick={() => router.push(`/plan/v3/${planId}?step=5`)}
          disabled={!readiness.ready}
          title={!readiness.ready ? 'กรุณากำหนดการประเมินให้ครบทุกหลักฐานก่อน' : 'ไปต่อขั้นชุดพร้อมสอน'}
        >
          ไปขั้นที่ 5 — ชุดพร้อมสอน (Teaching Package) →
        </button>
      </div>

      <style jsx>{`
        .v3-step4-container { display: flex; flex-direction: column; gap: 1.25rem; }
        .v3-form-label { display: block; font-size: 0.8rem; font-weight: 600; color: #374151; margin-bottom: 0.25rem; }
        .v3-form-sublabel { display: block; font-size: 0.75rem; color: #6B7280; margin-bottom: 0.2rem; }
        .v3-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
        .v3-modal-content { background: white; border-radius: 12px; padding: 1.5rem; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        .v3-modal-title { font-size: 1.1rem; font-weight: 700; color: #1E293B; margin: 0; }
        .v3-modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
      `}</style>
    </div>
  );
}
