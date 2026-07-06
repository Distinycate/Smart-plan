import { randomUUID } from 'crypto';
import type { EvaluationMode } from '../schema';
import type { EvaluationSectionResult, EvaluationResultIssue } from '../evaluation/types';
import { getSectionsToRecheck } from './recheck-map';
import type {
  LessonPlanPatch,
  PatchBundle,
  PatchMode,
  PatchTarget,
} from './patch-schema';

// ─── Severity filter ──────────────────────────────────────────────────────────
function issueMeetsModeFilter(
  issue: EvaluationResultIssue,
  mode: PatchMode,
): boolean {
  if (mode === 'auto_fix_critical') return issue.severity === 'critical';
  if (mode === 'auto_fix_critical_high') {
    return issue.severity === 'critical' || issue.severity === 'high';
  }
  // full_improvement: all auto-fixable issues
  return issue.auto_fixable === true;
}

// ─── Section → PatchTarget mapping ───────────────────────────────────────────
const SECTION_TARGET_MAP: Partial<Record<string, PatchTarget>> = {
  objectives_kpa: 'objectives.knowledge',
  learning_activities: 'learningActivities',
  assessment_quality: 'assessment.methods',
  curriculum_alignment: 'curriculum.indicators',
  active_learning: 'learningActivities',
  constructive_alignment: 'objectives.knowledge',
};

// ─── Issue code → Patch factory ───────────────────────────────────────────────
function buildPatchForIssue(
  issue: EvaluationResultIssue,
  section: string,
): LessonPlanPatch | null {
  const patchId = randomUUID();

  // OBJECTIVES_MISSING — เพิ่มตัวอย่าง objective ด้าน K เพื่อปลดบล็อก
  if (
    issue.issue_type === 'OBJECTIVES_MISSING' ||
    issue.issue_type === 'K_OBJECTIVE_MISSING'
  ) {
    const target: PatchTarget = 'objectives.knowledge';
    return {
      id: patchId,
      target,
      operation: 'append',
      path: ['objectives', 'knowledge'],
      before: undefined,
      after: 'นักเรียนสามารถอธิบายแนวคิดหลักของบทเรียนนี้ได้ (กรุณาแก้ไขให้สอดคล้องกับตัวชี้วัดจริง)',
      reason: `แผนขาด K-objective: ${issue.description}`,
      issueCode: issue.issue_type,
      issueSeverity: issue.severity,
      affectedSections: getSectionsToRecheck([target]),
    };
  }

  if (
    issue.issue_type === 'OBJECTIVES_MISSING' ||
    issue.issue_type === 'P_OBJECTIVE_MISSING'
  ) {
    const target: PatchTarget = 'objectives.process';
    return {
      id: patchId,
      target,
      operation: 'append',
      path: ['objectives', 'process'],
      before: undefined,
      after: 'นักเรียนสามารถปฏิบัติกิจกรรมตามขั้นตอนที่กำหนดได้ (กรุณาแก้ไขให้สอดคล้องกับตัวชี้วัดจริง)',
      reason: `แผนขาด P-objective: ${issue.description}`,
      issueCode: issue.issue_type,
      issueSeverity: issue.severity,
      affectedSections: getSectionsToRecheck([target]),
    };
  }

  if (
    issue.issue_type === 'OBJECTIVES_MISSING' ||
    issue.issue_type === 'A_OBJECTIVE_MISSING'
  ) {
    const target: PatchTarget = 'objectives.attitude';
    return {
      id: patchId,
      target,
      operation: 'append',
      path: ['objectives', 'attitude'],
      before: undefined,
      after: 'นักเรียนมีเจตคติที่ดีต่อการเรียนรู้ในบทนี้ (กรุณาแก้ไขให้สอดคล้องกับตัวชี้วัดจริง)',
      reason: `แผนขาด A-objective: ${issue.description}`,
      issueCode: issue.issue_type,
      issueSeverity: issue.severity,
      affectedSections: getSectionsToRecheck([target]),
    };
  }

  // ACTIVITIES_MISSING — เพิ่มโครงกิจกรรม GPAS ขั้นต้น
  if (issue.issue_type === 'ACTIVITIES_MISSING' || issue.issue_type === 'NO_LEARNING_ACTIVITIES') {
    const target: PatchTarget = 'learningActivities';
    return {
      id: patchId,
      target,
      operation: 'append',
      path: ['learningActivities'],
      before: undefined,
      after: {
        step: 'gathering',
        duration: 10,
        description: 'ครูนำเสนอสถานการณ์/คำถามเพื่อกระตุ้นความสนใจ (กรุณาแก้ไขรายละเอียด)',
        teacherRole: 'facilitator',
        studentRole: 'observer_listener',
        materials: [],
      },
      reason: `แผนขาดกิจกรรมการเรียนรู้: ${issue.description}`,
      issueCode: issue.issue_type,
      issueSeverity: issue.severity,
      affectedSections: getSectionsToRecheck([target]),
    };
  }

  // ASSESSMENT_METHODS_MISSING
  if (issue.issue_type === 'ASSESSMENT_METHODS_MISSING') {
    const target: PatchTarget = 'assessment.methods';
    return {
      id: patchId,
      target,
      operation: 'append',
      path: ['assessment', 'methods'],
      before: undefined,
      after: {
        method: 'of_learning',
        description: 'สังเกตพฤติกรรมการเรียนรู้ (กรุณาแก้ไขให้ครอบคลุม)',
        timing: 'during_lesson',
      },
      reason: `แผนขาดวิธีการวัดผล: ${issue.description}`,
      issueCode: issue.issue_type,
      issueSeverity: issue.severity,
      affectedSections: getSectionsToRecheck([target]),
    };
  }

  // ASSESSMENT_TOOLS_MISSING
  if (issue.issue_type === 'ASSESSMENT_TOOLS_MISSING') {
    const target: PatchTarget = 'assessment.tools';
    return {
      id: patchId,
      target,
      operation: 'append',
      path: ['assessment', 'tools'],
      before: undefined,
      after: {
        toolType: 'checklist',
        name: 'แบบสังเกตพฤติกรรม (กรุณาแก้ไขให้สอดคล้องกับการวัดผลจริง)',
        criteria: [],
      },
      reason: `แผนขาดเครื่องมือวัดผล: ${issue.description}`,
      issueCode: issue.issue_type,
      issueSeverity: issue.severity,
      affectedSections: getSectionsToRecheck([target]),
    };
  }

  // Issue ที่ยังไม่มี handler → ไม่สร้าง patch
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Generates a PatchBundle from evaluation section results and a patch mode.
 * All patches are deterministic and rule-based — no AI call.
 */
export function generatePatches(
  lessonPlanId: string,
  jobId: string,
  evaluationMode: EvaluationMode,
  hashBefore: string,
  sectionResults: readonly EvaluationSectionResult[],
  mode: PatchMode,
): PatchBundle {
  const patches: LessonPlanPatch[] = [];
  const seenIssueTypes = new Set<string>();

  for (const result of sectionResults) {
    for (const issue of result.issues) {
      if (!issueMeetsModeFilter(issue, mode)) continue;
      // Deduplicate by issue_type — one patch per logical problem
      if (seenIssueTypes.has(issue.issue_type)) continue;
      const patch = buildPatchForIssue(issue, result.section);
      if (patch) {
        patches.push(patch);
        seenIssueTypes.add(issue.issue_type);
      }
    }
  }

  const targets = Array.from(new Set(patches.map(p => p.target)));
  const allAffectedSections = Array.from(
    new Set(patches.flatMap(p => p.affectedSections)),
  ).sort();

  const totalCritical = patches.filter(p => p.issueSeverity === 'critical').length;
  const totalHigh = patches.filter(p => p.issueSeverity === 'high').length;

  return {
    lessonPlanId,
    jobId,
    evaluationMode,
    mode,
    patches,
    hashBefore,
    patchedBy: 'system_rule',
    summary: `แก้ไข ${patches.length} จุด (critical: ${totalCritical}, high: ${totalHigh}) — กรุณาตรวจสอบและแก้ไขเพิ่มเติมตามความเหมาะสม`,
    allAffectedSections,
  };
}
