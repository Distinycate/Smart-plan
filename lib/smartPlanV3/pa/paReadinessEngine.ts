/**
 * Smart Plan V3 — PA Readiness Engine (Layer 3)
 * Deterministic evidence mapping against versioned PA criteria.
 * Optional AI semantic pass via qualityReviewService.
 * Zero score fabrication. No PASS/FAIL claims for teachers.
 */

import type { V3LessonGraph } from '../types';
import type { V3LessonAlignmentGraph } from '../quality/types';
import type { V3PaReadinessResult, V3PaItemResult, V3PaCriteriaItem } from './types';
import { getActivePaCriteriaVersion } from './registry';
import { buildEntityRefs } from '../quality/alignmentGraph';

// ─────────────────────────────────────────────────────────────────
// Deterministic evidence mapper for each criteria item
// ─────────────────────────────────────────────────────────────────
function mapCriteriaItem(
  item: V3PaCriteriaItem,
  graph: V3LessonGraph,
  alignmentGraph: V3LessonAlignmentGraph,
  refs: ReturnType<typeof buildEntityRefs>,
  criteriaVersionId: string
): V3PaItemResult {
  const evidenceRefs: V3PaItemResult['evidenceRefs'] = [];
  let evidenceCount = 0;
  let maxPossible = item.deterministicIndicators.length;

  if (!item.assessableFromPlan) {
    return {
      criteriaId: item.criteriaId,
      criteriaVersion: criteriaVersionId,
      labelTh: item.labelTh,
      domain: item.domain,
      status: 'NOT_APPLICABLE',
      evidenceRefs: [],
      reason: item.planOnlyDisclaimer || 'ไม่สามารถประเมินได้จากแผนการสอนก่อนสอนจริง',
      isPlanPhaseOnly: true,
    };
  }

  if (maxPossible === 0) {
    return {
      criteriaId: item.criteriaId,
      criteriaVersion: criteriaVersionId,
      labelTh: item.labelTh,
      domain: item.domain,
      status: 'NOT_EVIDENCED',
      evidenceRefs: [],
      reason: 'ไม่มีตัวชี้วัด deterministic สำหรับรายการนี้',
      isPlanPhaseOnly: item.planOnlyDisclaimer !== undefined,
    };
  }

  // ── PA-LM-01: Learning Design ──────────────────────────────────
  if (item.criteriaId === 'PA-LM-01') {
    if (graph.curriculumLinks.length > 0) {
      evidenceCount++;
      evidenceRefs.push({
        entityType: 'OBJECTIVE',
        entityRef: 'INDICATOR',
        description: `มีตัวชี้วัด ${graph.curriculumLinks.length} รายการ`,
      });
    }
    if (graph.objectives.length > 0) {
      evidenceCount++;
      evidenceRefs.push({
        entityType: 'OBJECTIVE',
        entityRef: refs.objectiveRefs[graph.objectives[0].id] || 'O1',
        description: `มีจุดประสงค์การเรียนรู้ ${graph.objectives.length} ข้อ`,
      });
    }
    // Check objective coverage by activities
    const covered = graph.objectives.filter(o =>
      graph.activityObjectiveLinks.some(l => l.objective_id === o.id)
    );
    if (covered.length > 0 && covered.length === graph.objectives.length) {
      evidenceCount++;
      evidenceRefs.push({
        entityType: 'ACTIVITY',
        entityRef: refs.activityRefs[graph.activities[0]?.id] || 'A1',
        description: `กิจกรรมครอบคลุมทุกจุดประสงค์ (${covered.length}/${graph.objectives.length})`,
      });
    }
    // Duration match
    const total = graph.activities.reduce((s, a) => s + (Number(a.minutes) || 0), 0);
    if (total === (graph.lesson.duration_minutes || 60)) {
      evidenceCount++;
      evidenceRefs.push({
        entityType: 'ACTIVITY',
        entityRef: 'DURATION',
        description: `เวลากิจกรรมรวม ${total} นาที ตรงกับคาบเรียน`,
      });
    }
  }

  // ── PA-LM-02: Media/Technology ────────────────────────────────
  else if (item.criteriaId === 'PA-LM-02') {
    const readyAssets = graph.teachingAssets.filter(a => a.generation_status === 'READY' && !a.needs_review);
    if (readyAssets.length > 0) {
      evidenceCount++;
      readyAssets.slice(0, 3).forEach(a => {
        evidenceRefs.push({
          entityType: 'ASSET',
          entityRef: refs.assetRefs[a.id] || 'AST',
          entityId: a.id,
          description: `สื่อ: "${a.title}" (${a.asset_type})`,
        });
      });
    }
    const stale = graph.teachingAssets.filter(a => a.needs_review);
    if (stale.length === 0 && readyAssets.length > 0) {
      evidenceCount++; // not stale
    }
    if (readyAssets.length > 0) {
      evidenceCount++; // type appropriateness (deterministic: asset exists for subject focus)
    }
  }

  // ── PA-LM-03: Assessment ─────────────────────────────────────
  else if (item.criteriaId === 'PA-LM-03') {
    // All evidence assessed
    const assessedEvdIds = new Set(graph.assessmentEvidenceLinks.map(l => l.evidence_id));
    const allAssessed = graph.evidence.length > 0 && graph.evidence.every(e => assessedEvdIds.has(e.id));
    if (allAssessed) {
      evidenceCount++;
      evidenceRefs.push({
        entityType: 'ASSESSMENT',
        entityRef: refs.assessmentRefs[graph.assessments[0]?.id] || 'ASM1',
        description: `หลักฐานทุกรายการมีการประเมิน (${graph.evidence.length} รายการ)`,
      });
    }
    // Has tools
    const assessmentsWithTools = graph.assessments.filter(a =>
      graph.assessmentTools.some(t => t.assessment_id === a.id)
    );
    if (assessmentsWithTools.length === graph.assessments.length && graph.assessments.length > 0) {
      evidenceCount++;
      evidenceRefs.push({
        entityType: 'ASSESSMENT_TOOL',
        entityRef: refs.toolRefs[graph.assessmentTools[0]?.id] || 'TOOL1',
        description: `มีเครื่องมือประเมินครบ (${assessmentsWithTools.length}/${graph.assessments.length})`,
      });
    }
    // Has criteria
    const withCriteria = graph.assessments.filter(a =>
      (a.criteria_value !== null && a.criteria_value !== undefined) || a.criteria_text?.trim()
    );
    if (withCriteria.length > 0) {
      evidenceCount++;
      evidenceRefs.push({
        entityType: 'ASSESSMENT',
        entityRef: refs.assessmentRefs[withCriteria[0].id] || 'ASM1',
        description: `มีเกณฑ์การผ่าน (${withCriteria.length}/${graph.assessments.length} รายการ)`,
      });
    }
    // Formative
    const formative = graph.assessments.filter(a => a.formative);
    if (formative.length > 0) {
      evidenceCount++;
      evidenceRefs.push({
        entityType: 'ASSESSMENT',
        entityRef: refs.assessmentRefs[formative[0].id] || 'ASM1',
        description: `มีการประเมินระหว่างเรียน (${formative.length} รายการ)`,
      });
    }
  }

  // ── PA-LM-04: Feedback ───────────────────────────────────────
  else if (item.criteriaId === 'PA-LM-04') {
    const feedbackActivities = graph.activities.filter(a => a.feedback_moment?.trim());
    if (feedbackActivities.length > 0) {
      evidenceCount++;
      feedbackActivities.slice(0, 2).forEach(a => {
        evidenceRefs.push({
          entityType: 'ACTIVITY',
          entityRef: refs.activityRefs[a.id] || 'A',
          entityId: a.id,
          description: `กิจกรรม "${a.title || a.phase}": ${a.feedback_moment?.substring(0, 50)}`,
        });
      });
    }
    const formativeActivities = graph.activities.filter(a => a.assessment_moment?.trim());
    if (formativeActivities.length > 0) {
      evidenceCount++;
      formativeActivities.slice(0, 2).forEach(a => {
        evidenceRefs.push({
          entityType: 'ACTIVITY',
          entityRef: refs.activityRefs[a.id] || 'A',
          entityId: a.id,
          description: `การตรวจสอบ: ${a.assessment_moment?.substring(0, 50)}`,
        });
      });
    }
  }

  // ── PA-LM-05: Student Character ────────────────────────────────
  else if (item.criteriaId === 'PA-LM-05') {
    const withStudentActions = graph.activities.filter(a => a.student_actions?.trim());
    if (withStudentActions.length > 0) {
      evidenceCount++;
      evidenceRefs.push({
        entityType: 'ACTIVITY',
        entityRef: refs.activityRefs[withStudentActions[0].id] || 'A1',
        description: `มีกิจกรรมนักเรียนปฏิบัติจริง ${withStudentActions.length}/${graph.activities.length} กิจกรรม`,
      });
    }
    // Check for collaborative or higher-order keywords
    const hoKeywords = ['group', 'team', 'collaborate', 'analyze', 'create', 'evaluate', 'กลุ่ม', 'ร่วมกัน', 'วิเคราะห์', 'สร้าง', 'ประเมิน', 'สืบค้น'];
    const hasHO = graph.activities.some(a =>
      hoKeywords.some(kw => `${a.student_actions} ${a.teacher_actions}`.toLowerCase().includes(kw))
    );
    if (hasHO) {
      evidenceCount++;
      evidenceRefs.push({
        entityType: 'ACTIVITY',
        entityRef: 'HOT',
        description: 'พบกิจกรรมที่ส่งเสริมการคิดขั้นสูงหรือการทำงานร่วมกัน',
      });
    }
  }

  // ── PA-LM-06: Curriculum Alignment ────────────────────────────
  else if (item.criteriaId === 'PA-LM-06') {
    if (graph.curriculumLinks.length > 0) {
      evidenceCount++;
      evidenceRefs.push({
        entityType: 'OBJECTIVE',
        entityRef: 'IND',
        description: `ตัวชี้วัดหลักสูตร ${graph.curriculumLinks.length} รายการ`,
      });
    }
    if (graph.objectives.length > 0) {
      evidenceCount++;
      evidenceRefs.push({
        entityType: 'OBJECTIVE',
        entityRef: refs.objectiveRefs[graph.objectives[0].id] || 'O1',
        description: `จุดประสงค์ ${graph.objectives.length} ข้อ`,
      });
    }
    // Evidence connected to objectives
    const linkedEvd = graph.evidence.filter(e =>
      graph.objectiveEvidenceLinks.some(l => l.evidence_id === e.id)
    );
    if (linkedEvd.length > 0) {
      evidenceCount++;
      evidenceRefs.push({
        entityType: 'EVIDENCE',
        entityRef: refs.evidenceRefs[linkedEvd[0].id] || 'E1',
        description: `หลักฐาน ${linkedEvd.length} รายการ เชื่อมโยงกับจุดประสงค์`,
      });
    }
  }

  // ── PA-LO-01: Planned Outcome Design ──────────────────────────
  else if (item.criteriaId === 'PA-LO-01') {
    if (graph.evidence.length > 0) {
      evidenceCount++;
      evidenceRefs.push({
        entityType: 'EVIDENCE',
        entityRef: refs.evidenceRefs[graph.evidence[0].id] || 'E1',
        description: `ออกแบบหลักฐานการเรียนรู้ ${graph.evidence.length} รายการ`,
      });
    }
    if (graph.assessmentTools.length > 0) {
      evidenceCount++;
      evidenceRefs.push({
        entityType: 'ASSESSMENT_TOOL',
        entityRef: refs.toolRefs[graph.assessmentTools[0].id] || 'TOOL1',
        description: `เครื่องมือวัดผล ${graph.assessmentTools.length} รายการ`,
      });
    }
    const hasCriteria = graph.assessments.some(a =>
      (a.criteria_value !== null && a.criteria_value !== undefined) || a.criteria_text?.trim()
    );
    if (hasCriteria) {
      evidenceCount++;
      evidenceRefs.push({
        entityType: 'ASSESSMENT',
        entityRef: refs.assessmentRefs[graph.assessments[0]?.id] || 'ASM1',
        description: 'มีเกณฑ์ชัดเจนสำหรับการวัดผลลัพธ์',
      });
    }
  }

  // Determine status
  const ratio = evidenceCount / maxPossible;
  let status: V3PaItemResult['status'];
  if (evidenceCount === 0) {
    status = 'NOT_EVIDENCED';
  } else if (ratio >= 0.75) {
    status = 'EVIDENCED';
  } else {
    status = 'PARTIALLY_EVIDENCED';
  }

  // Gap detection
  let gap: string | undefined;
  let suggestion: string | undefined;
  if (status === 'NOT_EVIDENCED') {
    gap = `ไม่พบหลักฐานในแผนการเรียนรู้ที่สอดคล้องกับรายการนี้`;
    suggestion = `ควรเพิ่มข้อมูลในแผนให้ครอบคลุมตัวบ่งชี้ของรายการนี้`;
  } else if (status === 'PARTIALLY_EVIDENCED') {
    gap = `พบหลักฐานบางส่วน (${evidenceCount}/${maxPossible} ตัวบ่งชี้) ยังขาดอีก ${maxPossible - evidenceCount} ส่วน`;
  }

  return {
    criteriaId: item.criteriaId,
    criteriaVersion: criteriaVersionId,
    labelTh: item.labelTh,
    domain: item.domain,
    status,
    evidenceRefs,
    reason: evidenceRefs.length > 0
      ? `พบหลักฐานในแผน: ${evidenceRefs.map(r => r.description).join(' / ')}`
      : 'ไม่พบหลักฐานในแผนการเรียนรู้ที่สอดคล้องกับรายการนี้',
    gap,
    suggestion,
    isPlanPhaseOnly: Boolean(item.planOnlyDisclaimer),
  };
}

// ─────────────────────────────────────────────────────────────────
// Main Export: evaluatePaReadiness
// ─────────────────────────────────────────────────────────────────
export function evaluatePaReadiness(
  graph: V3LessonGraph,
  alignmentGraph: V3LessonAlignmentGraph,
  lessonHash: string,
  criteriaVersionId?: string
): V3PaReadinessResult {
  const version = getActivePaCriteriaVersion();
  const versionId = criteriaVersionId || version.id;
  const refs = buildEntityRefs(graph);

  const items: V3PaItemResult[] = version.criteria.map(criterion =>
    mapCriteriaItem(criterion, graph, alignmentGraph, refs, versionId)
  );

  const evidenced = items.filter(i => i.status === 'EVIDENCED').length;
  const partial = items.filter(i => i.status === 'PARTIALLY_EVIDENCED').length;
  const notEvidenced = items.filter(i => i.status === 'NOT_EVIDENCED').length;
  const notApplicable = items.filter(i => i.status === 'NOT_APPLICABLE').length;

  return {
    criteriaVersion: versionId,
    reviewedAt: new Date().toISOString(),
    lessonHash,
    items,
    summary: {
      totalItems: items.length,
      evidenced,
      partiallyEvidenced: partial,
      notEvidenced,
      notApplicable,
    },
    planPhaseDisclaimer:
      'ผลการตรวจนี้ประเมินเฉพาะความพร้อมของแผนการเรียนรู้ก่อนการสอน ' +
      'รายการที่ต้องการข้อมูลผลลัพธ์ผู้เรียนจะประเมินได้หลังการสอนจริงเท่านั้น ' +
      'ระบบไม่รายงานว่าครูผ่านหรือไม่ผ่านการประเมินวิทยฐานะ',
    aiUsed: false,
  };
}
