/**
 * Smart Plan V3 — Deterministic Quality Rule Engine (Layer 1)
 * Zero AI calls. Pure/testable functions only.
 *
 * Rules operate on V3LessonGraph and subject profile to produce V3QualityIssue[].
 */

import type { V3LessonGraph } from '../types';
import type { V3QualityIssue, V3QualityRuleResult, V3LessonAlignmentGraph } from './types';
import { ISSUE_CODES } from './issueCodes';
import { getSubjectProfile } from '../subjectProfiles/registry';

// ─────────────────────────────────────────────────────────────────
// Helper: build issue
// ─────────────────────────────────────────────────────────────────
function makeIssue(
  code: string,
  partial: Omit<V3QualityIssue, 'code' | 'source' | 'isBlocking' | 'evidence'> & {
    isBlocking: boolean;
    evidence?: string[];
  }
): V3QualityIssue {
  return {
    code,
    source: 'RULE',
    evidence: [],
    suggestion: null,
    proposedChange: null,
    ...partial,
  };
}

// ─────────────────────────────────────────────────────────────────
// 1. Structural Rules (Q-STRUCT-*)
// ─────────────────────────────────────────────────────────────────
function runStructuralRules(graph: V3LessonGraph): V3QualityIssue[] {
  const issues: V3QualityIssue[] = [];

  if (graph.curriculumLinks.length === 0) {
    issues.push(makeIssue(ISSUE_CODES.STRUCT_NO_INDICATOR, {
      category: 'STRUCTURE',
      severity: 'ERROR',
      locationType: 'LESSON',
      title: 'ยังไม่มีตัวชี้วัดหลักสูตร',
      message: 'แผนการเรียนรู้ต้องเลือกตัวชี้วัดจากหลักสูตรแกนกลางอย่างน้อย 1 รายการ',
      isBlocking: true,
    }));
  }

  if (graph.objectives.length === 0) {
    issues.push(makeIssue(ISSUE_CODES.STRUCT_NO_OBJECTIVE, {
      category: 'STRUCTURE',
      severity: 'ERROR',
      locationType: 'LESSON',
      title: 'ยังไม่มีจุดประสงค์การเรียนรู้',
      message: 'ต้องมีจุดประสงค์การเรียนรู้อย่างน้อย 1 ข้อ',
      isBlocking: true,
    }));
  }

  if (graph.evidence.length === 0) {
    issues.push(makeIssue(ISSUE_CODES.STRUCT_NO_EVIDENCE, {
      category: 'STRUCTURE',
      severity: 'ERROR',
      locationType: 'LESSON',
      title: 'ยังไม่มีหลักฐานการเรียนรู้',
      message: 'ต้องมีหลักฐานการเรียนรู้อย่างน้อย 1 รายการ',
      isBlocking: true,
    }));
  }

  if (graph.activities.length === 0) {
    issues.push(makeIssue(ISSUE_CODES.STRUCT_NO_ACTIVITY, {
      category: 'STRUCTURE',
      severity: 'ERROR',
      locationType: 'LESSON',
      title: 'ยังไม่มีกิจกรรมการเรียนรู้',
      message: 'ต้องมีกิจกรรมการเรียนรู้อย่างน้อย 1 กิจกรรม',
      isBlocking: true,
    }));
  }

  if (graph.assessments.length === 0) {
    issues.push(makeIssue(ISSUE_CODES.STRUCT_NO_ASSESSMENT, {
      category: 'ASSESSMENT',
      severity: 'ERROR',
      locationType: 'LESSON',
      title: 'ยังไม่มีการวัดและประเมินผล',
      message: 'ต้องมีแผนการวัดและประเมินผลอย่างน้อย 1 รายการ',
      isBlocking: true,
    }));
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────
// 2. Alignment Rules (Q-ALIGN-*) — using pre-built alignment graph
// ─────────────────────────────────────────────────────────────────
function runAlignmentRules(
  graph: V3LessonGraph,
  alignmentGraph: V3LessonAlignmentGraph,
  refs: ReturnType<typeof import('./alignmentGraph').buildEntityRefs>
): V3QualityIssue[] {
  const issues: V3QualityIssue[] = [];
  const { orphans } = alignmentGraph;

  // Objective without evidence
  for (const objRef of orphans.objectivesWithoutEvidence) {
    const objId = refs.refToId[objRef];
    const obj = graph.objectives.find(o => o.id === objId);
    issues.push(makeIssue(ISSUE_CODES.ALIGN_OBJ_NO_EVIDENCE, {
      category: 'ALIGNMENT',
      severity: 'ERROR',
      locationType: 'OBJECTIVE',
      locationId: objId,
      locationRef: objRef,
      title: `จุดประสงค์ ${objRef} ไม่มีหลักฐานรองรับ`,
      message: `"${obj?.statement.substring(0, 60) || objRef}" ยังไม่มีหลักฐานการเรียนรู้ที่เชื่อมโยง`,
      evidence: [],
      isBlocking: true,
    }));
  }

  // Objective without any activity coverage
  for (const obj of graph.objectives) {
    const objRef = refs.objectiveRefs[obj.id];
    const hasActivity = graph.activityObjectiveLinks.some(l => l.objective_id === obj.id);
    if (!hasActivity) {
      issues.push(makeIssue(ISSUE_CODES.ALIGN_OBJ_NO_ACTIVITY, {
        category: 'ALIGNMENT',
        severity: 'ERROR',
        locationType: 'OBJECTIVE',
        locationId: obj.id,
        locationRef: objRef,
        title: `จุดประสงค์ ${objRef} ไม่มีกิจกรรมรองรับ`,
        message: `"${obj.statement.substring(0, 60)}" ยังไม่มีกิจกรรมการเรียนรู้ที่ครอบคลุม`,
        isBlocking: true,
      }));
    }
  }

  // Evidence without objective
  for (const evdRef of orphans.evidenceWithoutObjective) {
    const evdId = refs.refToId[evdRef];
    const evd = graph.evidence.find(e => e.id === evdId);
    issues.push(makeIssue(ISSUE_CODES.ALIGN_EVD_NO_OBJECTIVE, {
      category: 'ALIGNMENT',
      severity: 'WARNING',
      locationType: 'EVIDENCE',
      locationId: evdId,
      locationRef: evdRef,
      title: `หลักฐาน ${evdRef} ไม่เชื่อมโยงกับจุดประสงค์ใด`,
      message: `"${evd?.description.substring(0, 60) || evdRef}" ยังไม่ถูกเชื่อมโยงกับจุดประสงค์การเรียนรู้`,
      isBlocking: false,
    }));
  }

  // Evidence without activity
  for (const evdRef of orphans.evidenceWithoutActivity) {
    const evdId = refs.refToId[evdRef];
    const evd = graph.evidence.find(e => e.id === evdId);
    issues.push(makeIssue(ISSUE_CODES.ALIGN_EVD_NO_ACTIVITY, {
      category: 'ALIGNMENT',
      severity: 'ERROR',
      locationType: 'EVIDENCE',
      locationId: evdId,
      locationRef: evdRef,
      title: `หลักฐาน ${evdRef} ไม่มีกิจกรรมสร้าง/สังเกต`,
      message: `"${evd?.description.substring(0, 60) || evdRef}" ยังไม่มีกิจกรรมที่สร้างหรือสังเกตหลักฐานนี้`,
      isBlocking: true,
    }));
  }

  // Evidence without assessment
  for (const evdRef of orphans.evidenceWithoutAssessment) {
    const evdId = refs.refToId[evdRef];
    const evd = graph.evidence.find(e => e.id === evdId);
    issues.push(makeIssue(ISSUE_CODES.ALIGN_EVD_NO_ASSESSMENT, {
      category: 'ALIGNMENT',
      severity: 'ERROR',
      locationType: 'EVIDENCE',
      locationId: evdId,
      locationRef: evdRef,
      title: `หลักฐาน ${evdRef} ยังไม่มีการประเมิน`,
      message: `"${evd?.description.substring(0, 60) || evdRef}" ต้องมีการประเมินผลที่เชื่อมโยง`,
      isBlocking: true,
    }));
  }

  // Assessment without evidence
  for (const asmRef of orphans.assessmentsWithoutEvidence) {
    const asmId = refs.refToId[asmRef];
    const asm = graph.assessments.find(a => a.id === asmId);
    issues.push(makeIssue(ISSUE_CODES.ALIGN_ASM_NO_EVIDENCE, {
      category: 'ALIGNMENT',
      severity: 'WARNING',
      locationType: 'ASSESSMENT',
      locationId: asmId,
      locationRef: asmRef,
      title: `การประเมิน ${asmRef} ไม่เชื่อมโยงกับหลักฐานใด`,
      message: `"${asm?.name.substring(0, 60) || asmRef}" ควรเชื่อมโยงกับหลักฐานการเรียนรู้อย่างน้อย 1 รายการ`,
      isBlocking: false,
    }));
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────
// 3. Activity Rules (Q-ACT-*)
// ─────────────────────────────────────────────────────────────────
function runActivityRules(
  graph: V3LessonGraph,
  refs: ReturnType<typeof import('./alignmentGraph').buildEntityRefs>
): V3QualityIssue[] {
  const issues: V3QualityIssue[] = [];
  const target = graph.lesson.duration_minutes || 60;
  const total = graph.activities.reduce((s, a) => s + (Number(a.minutes) || 0), 0);

  if (graph.activities.length > 0 && total !== target) {
    issues.push(makeIssue(ISSUE_CODES.ACT_DURATION_MISMATCH, {
      category: 'TIME',
      severity: 'ERROR',
      locationType: 'LESSON',
      title: `เวลากิจกรรมรวมไม่ตรงกับคาบเรียน (${total}/${target} นาที)`,
      message: `เวลากิจกรรมทั้งหมดรวม ${total} นาที แต่คาบเรียนกำหนด ${target} นาที ต้องปรับให้ตรงกัน`,
      evidence: [`เวลารวม: ${total} นาที`, `เป้าหมาย: ${target} นาที`, `ผลต่าง: ${Math.abs(total - target)} นาที`],
      isBlocking: true,
    }));
  }

  for (const act of graph.activities) {
    const actRef = refs.activityRefs[act.id];
    if (!act.student_actions?.trim()) {
      issues.push(makeIssue(ISSUE_CODES.ACT_NO_STUDENT_ACTION, {
        category: 'ACTIVITY',
        severity: 'ERROR',
        locationType: 'ACTIVITY',
        locationId: act.id,
        locationRef: actRef,
        title: `กิจกรรม ${actRef} ไม่มีบทบาทของผู้เรียน`,
        message: `กิจกรรมที่ ${act.position || actRef} ต้องระบุการกระทำของผู้เรียนอย่างชัดเจน (ไม่ใช่แค่ฟังครูอย่างเดียว)`,
        isBlocking: true,
      }));
    }
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────
// 4. Assessment Rules (Q-ASSESS-*)
// ─────────────────────────────────────────────────────────────────
function runAssessmentRules(
  graph: V3LessonGraph,
  refs: ReturnType<typeof import('./alignmentGraph').buildEntityRefs>
): V3QualityIssue[] {
  const issues: V3QualityIssue[] = [];

  for (const asm of graph.assessments) {
    const asmRef = refs.assessmentRefs[asm.id];
    const hasTool = graph.assessmentTools.some(t => t.assessment_id === asm.id);
    if (!hasTool) {
      issues.push(makeIssue(ISSUE_CODES.ASSESS_NO_TOOL, {
        category: 'ASSESSMENT',
        severity: 'ERROR',
        locationType: 'ASSESSMENT',
        locationId: asm.id,
        locationRef: asmRef,
        title: `การประเมิน ${asmRef} ยังไม่มีเครื่องมือ`,
        message: `"${asm.name.substring(0, 60)}" ต้องมีเครื่องมือประเมิน (Rubric, Checklist, Answer Key ฯลฯ)`,
        isBlocking: true,
      }));
    }

    const hasCriteria = Boolean(
      (asm.criteria_value !== null && asm.criteria_value !== undefined) ||
      (asm.criteria_text && asm.criteria_text.trim())
    );
    if (!hasCriteria) {
      issues.push(makeIssue(ISSUE_CODES.ASSESS_NO_CRITERIA, {
        category: 'ASSESSMENT',
        severity: 'ERROR',
        locationType: 'ASSESSMENT',
        locationId: asm.id,
        locationRef: asmRef,
        title: `การประเมิน ${asmRef} ยังไม่มีเกณฑ์ผ่าน`,
        message: `"${asm.name.substring(0, 60)}" ต้องมีเกณฑ์การผ่านที่ชัดเจน (ระดับคะแนน เปอร์เซ็นต์ หรือคำอธิบาย)`,
        isBlocking: true,
      }));
    }
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────
// 5. Feedback Rules (Q-FEEDBACK-*)
// ─────────────────────────────────────────────────────────────────
function runFeedbackRules(graph: V3LessonGraph): V3QualityIssue[] {
  const issues: V3QualityIssue[] = [];

  const hasFormative = graph.activities.some(a => a.assessment_moment?.trim());
  if (!hasFormative && graph.activities.length > 0) {
    issues.push(makeIssue(ISSUE_CODES.FEEDBACK_NO_FORMATIVE, {
      category: 'FEEDBACK',
      severity: 'WARNING',
      locationType: 'LESSON',
      title: 'ยังไม่มีการตรวจสอบความเข้าใจระหว่างเรียน',
      message: 'ควรมีช่วงเวลาตรวจสอบความเข้าใจ (Formative Check) ในกิจกรรมอย่างน้อย 1 ครั้ง เพื่อปรับการสอนได้ทันเวลา',
      isBlocking: false,
    }));
  }

  const hasFeedback = graph.activities.some(a => a.feedback_moment?.trim());
  if (!hasFeedback && graph.activities.length > 0) {
    issues.push(makeIssue(ISSUE_CODES.FEEDBACK_NO_FEEDBACK, {
      category: 'FEEDBACK',
      severity: 'WARNING',
      locationType: 'LESSON',
      title: 'ยังไม่มีช่วงให้ข้อมูลย้อนกลับ',
      message: 'ควรมีช่วงที่ครูหรือเพื่อนให้ข้อมูลย้อนกลับแก่ผู้เรียน เพื่อสนับสนุนการพัฒนาตนเอง',
      isBlocking: false,
    }));
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────
// 6. Subject-Specific Rules (Q-SUBJECT-*)
//    Reuses subject profile — no duplicate rule arrays
// ─────────────────────────────────────────────────────────────────
function runSubjectRules(graph: V3LessonGraph): V3QualityIssue[] {
  const issues: V3QualityIssue[] = [];
  const { lesson, activities, evidence, assessments } = graph;
  const subjectKey = lesson.subject_key?.toUpperCase() || '';
  const learningFocus = lesson.learning_focus?.toUpperCase() || '';

  // English — Speaking focus
  if (subjectKey === 'ENGLISH' && learningFocus === 'SPEAKING') {
    const speakingActivityKeywords = ['speak', 'talk', 'conversation', 'role', 'present', 'discuss', 'พูด', 'สนทนา', 'นำเสนอ', 'บทบาทสมมติ', 'role-play', 'information gap'];
    const hasSpeakingActivity = activities.some(a => {
      const text = `${a.student_actions} ${a.teacher_actions} ${a.title || ''}`.toLowerCase();
      return speakingActivityKeywords.some(kw => text.includes(kw));
    });
    if (!hasSpeakingActivity) {
      issues.push(makeIssue(ISSUE_CODES.SUBJECT_ENG_NO_SPEAKING, {
        category: 'SUBJECT',
        severity: 'ERROR',
        locationType: 'LESSON',
        title: 'บทเรียน Speaking ขาดกิจกรรมที่นักเรียนพูดจริง',
        message: 'แผนกำหนด Learning Focus เป็น Speaking แต่ยังไม่พบกิจกรรมที่นักเรียนต้องพูดหรือสนทนาจริง กิจกรรมส่วนใหญ่ยังเป็น written/passive',
        evidence: [`วิชา: ${subjectKey}`, `Learning Focus: ${learningFocus}`],
        isBlocking: true,
      }));
    }
  }

  // Math — Problem Solving focus
  if (subjectKey === 'MATHEMATICS' && (learningFocus === 'PROBLEM_SOLVING' || learningFocus.includes('PROBLEM'))) {
    const reasoningKeywords = ['reason', 'explain', 'justify', 'why', 'how', 'show', 'อธิบาย', 'เหตุผล', 'เพราะ', 'แสดงวิธี', 'ทำไม', 'แนวคิด', 'วิธีคิด', 'กระบวนการ'];
    const hasReasoning = activities.some(a => {
      const text = `${a.student_actions} ${a.teacher_actions}`.toLowerCase();
      return reasoningKeywords.some(kw => text.includes(kw));
    });
    if (!hasReasoning) {
      issues.push(makeIssue(ISSUE_CODES.SUBJECT_MATH_NO_REASONING, {
        category: 'SUBJECT',
        severity: 'WARNING',
        locationType: 'LESSON',
        title: 'บทเรียน Problem Solving ควรมีโอกาสอธิบายเหตุผล',
        message: 'ยังไม่พบกิจกรรมที่นักเรียนได้แสดงวิธีคิดหรืออธิบายเหตุผล การแก้ปัญหาที่ดีต้องการมากกว่าคำตอบตัวเลขเพียงอย่างเดียว',
        isBlocking: false,
      }));
    }
  }

  // Science — Experiment focus
  if (subjectKey === 'SCIENCE' && (learningFocus.includes('EXPERIMENT') || learningFocus.includes('INVESTIGATION'))) {
    const dataKeywords = ['data', 'record', 'observe', 'measure', 'บันทึก', 'ข้อมูล', 'วัด', 'สังเกต', 'ผลการทดลอง', 'ตาราง'];
    const hasData = activities.some(a => {
      const text = `${a.student_actions} ${a.teacher_actions}`.toLowerCase();
      return dataKeywords.some(kw => text.includes(kw));
    });
    if (!hasData) {
      issues.push(makeIssue(ISSUE_CODES.SUBJECT_SCI_NO_DATA, {
        category: 'SUBJECT',
        severity: 'WARNING',
        locationType: 'LESSON',
        title: 'บทเรียนการทดลองวิทยาศาสตร์ควรมีการบันทึกข้อมูล',
        message: 'ยังไม่พบกิจกรรมที่นักเรียนบันทึกหรือวิเคราะห์ข้อมูลจากการทดลอง การสังเกตและบันทึกเป็นหัวใจของกระบวนการวิทยาศาสตร์',
        isBlocking: false,
      }));
    }
  }

  // PE — should not rely on written tasks as core
  if (subjectKey === 'PHYSICAL_EDUCATION') {
    const writtenKeywords = ['write', 'fill', 'worksheet', 'quiz', 'test', 'เขียน', 'กรอก', 'ใบงาน', 'แบบทดสอบ'];
    const practiceKeywords = ['practice', 'perform', 'play', 'run', 'throw', 'ฝึก', 'ปฏิบัติ', 'เล่น', 'วิ่ง', 'ทำ', 'แสดง'];
    const totalMinutes = activities.reduce((s, a) => s + (Number(a.minutes) || 0), 0);
    const writtenMinutes = activities
      .filter(a => writtenKeywords.some(kw => `${a.student_actions} ${a.teacher_actions}`.toLowerCase().includes(kw)))
      .reduce((s, a) => s + (Number(a.minutes) || 0), 0);
    const practiceMinutes = activities
      .filter(a => practiceKeywords.some(kw => `${a.student_actions} ${a.teacher_actions}`.toLowerCase().includes(kw)))
      .reduce((s, a) => s + (Number(a.minutes) || 0), 0);

    if (totalMinutes > 0 && writtenMinutes > practiceMinutes) {
      issues.push(makeIssue(ISSUE_CODES.SUBJECT_PE_WRITTEN_CORE, {
        category: 'SUBJECT',
        severity: 'WARNING',
        locationType: 'LESSON',
        title: 'บทเรียนพลศึกษาใช้เวลาเขียนมากกว่าปฏิบัติ',
        message: `พบว่ากิจกรรมเขียน/กรอกข้อมูล (${writtenMinutes} นาที) ใช้เวลามากกว่ากิจกรรมปฏิบัติ (${practiceMinutes} นาที) ซึ่งอาจไม่เหมาะกับธรรมชาติของวิชาพลศึกษา`,
        evidence: [`เวลาเขียน: ${writtenMinutes} นาที`, `เวลาปฏิบัติ: ${practiceMinutes} นาที`],
        isBlocking: false,
      }));
    }
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────
// 7. Package Rules (Q-ASSET-*)
// ─────────────────────────────────────────────────────────────────
function runPackageRules(
  graph: V3LessonGraph,
  refs: ReturnType<typeof import('./alignmentGraph').buildEntityRefs>
): V3QualityIssue[] {
  const issues: V3QualityIssue[] = [];

  // Required asset requirements from rules
  const { deriveTeachingAssetRequirements } = require('../rules/teachingAssetRules');
  const profile = getSubjectProfile(graph.lesson.subject_key || '');
  const assetReqs = deriveTeachingAssetRequirements({
    subjectProfile: profile,
    learningFocus: graph.lesson.learning_focus,
    activities: graph.activities,
    evidence: graph.evidence,
    assessments: graph.assessments,
    assessmentTools: graph.assessmentTools,
  });

  // Check missing required assets
  for (const req of assetReqs.required) {
    const fulfilled = graph.teachingAssets.some(
      a => a.asset_type === req.assetType && a.generation_status === 'READY'
    );
    if (!fulfilled) {
      issues.push(makeIssue(ISSUE_CODES.PACKAGE_MISSING_ASSET, {
        category: 'PACKAGE',
        severity: 'ERROR',
        locationType: 'ASSET',
        title: `ขาดสื่อการสอนที่จำเป็น: ${req.title || req.assetType}`,
        message: `แผนนี้ต้องมีสื่อประเภท ${req.assetType} เพื่อสนับสนุนกิจกรรมการเรียนรู้`,
        evidence: [`สื่อจำเป็นประเภท: ${req.assetType}`, `เหตุผล: ${req.reason}`],
        isBlocking: true,
      }));
    }
  }

  // Stale required assets
  const staleAssets = graph.teachingAssets.filter(a => a.needs_review && a.generation_status === 'READY');
  for (const asset of staleAssets) {
    const astRef = refs.assetRefs[asset.id];
    const isRequired = assetReqs.required.some((r: any) => r.assetType === asset.asset_type);
    issues.push(makeIssue(ISSUE_CODES.PACKAGE_STALE_ASSET, {
      category: 'PACKAGE',
      severity: isRequired ? 'ERROR' : 'WARNING',
      locationType: 'ASSET',
      locationId: asset.id,
      locationRef: astRef,
      title: `สื่อ "${asset.title}" ต้องตรวจสอบอีกครั้ง${isRequired ? ' (สื่อจำเป็น)' : ''}`,
      message: 'เนื้อหาในแผนเปลี่ยนแปลงหลังจากสร้างสื่อนี้ กรุณาตรวจสอบและอัปเดตสื่อให้ตรงกับแผนปัจจุบัน',
      evidence: [`สื่อประเภท: ${asset.asset_type}`, `สถานะ: ต้องตรวจสอบ`],
      isBlocking: isRequired,
    }));
  }

  // Asset duration overrun
  for (const asset of graph.teachingAssets) {
    const astRef = refs.assetRefs[asset.id];
    const estimatedMinutes = (asset.content as any)?.estimatedMinutes;
    if (!estimatedMinutes) continue;

    // Find linked activity
    const linkedActivityLink = (graph.assetActivityLinks || []).find(l => l.asset_id === asset.id);
    if (!linkedActivityLink) continue;

    const linkedActivity = graph.activities.find(a => a.id === linkedActivityLink.activity_id);
    if (!linkedActivity) continue;

    if (estimatedMinutes > linkedActivity.minutes) {
      issues.push(makeIssue(ISSUE_CODES.TIME_ASSET_OVERRUN, {
        category: 'TIME',
        severity: 'WARNING',
        locationType: 'ASSET',
        locationId: asset.id,
        locationRef: astRef,
        title: `สื่อ "${asset.title}" ใช้เวลาเกินกิจกรรมที่กำหนด`,
        message: `สื่อนี้คาดว่าต้องใช้เวลา ${estimatedMinutes} นาที แต่กิจกรรมที่เชื่อมโยงกำหนดไว้เพียง ${linkedActivity.minutes} นาที`,
        evidence: [`เวลาสื่อ: ${estimatedMinutes} นาที`, `เวลากิจกรรม: ${linkedActivity.minutes} นาที`],
        isBlocking: false,
      }));
    }
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────
// Main Export: runStructuralQualityRules
// ─────────────────────────────────────────────────────────────────
export function runStructuralQualityRules(
  graph: V3LessonGraph,
  alignmentGraph: V3LessonAlignmentGraph
): V3QualityRuleResult {
  const { buildEntityRefs } = require('./alignmentGraph');
  const refs = buildEntityRefs(graph);

  const allIssues: V3QualityIssue[] = [
    ...runStructuralRules(graph),
    ...runAlignmentRules(graph, alignmentGraph, refs),
    ...runActivityRules(graph, refs),
    ...runAssessmentRules(graph, refs),
    ...runFeedbackRules(graph),
    ...runSubjectRules(graph),
    ...runPackageRules(graph, refs),
  ];

  const blockingErrorCount = allIssues.filter(i => i.isBlocking && i.severity === 'ERROR').length;
  const warningCount = allIssues.filter(i => i.severity === 'WARNING').length;
  const infoCount = allIssues.filter(i => i.severity === 'INFO').length;

  return {
    issues: allIssues,
    blockingErrorCount,
    warningCount,
    infoCount,
    allBlockingResolved: blockingErrorCount === 0,
  };
}
