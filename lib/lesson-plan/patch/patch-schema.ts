import type { EvaluationMode } from '../schema';
import type { ValidationSeverity } from '../validators/types';

// ─── Patch Targets ────────────────────────────────────────────────────────────
/** Canonical JSON path targets inside a LessonPlan that a patch can modify */
export type PatchTarget =
  | 'objectives.knowledge'
  | 'objectives.process'
  | 'objectives.attitude'
  | 'curriculum.standards'
  | 'curriculum.indicators'
  | 'curriculum.coreContent'
  | 'learningActivities'
  | 'assessment.methods'
  | 'assessment.tools'
  | 'assessment.rubrics'
  | 'essence.mainConcept'
  | 'essence.keyConcepts';

// ─── Patch Mode ───────────────────────────────────────────────────────────────
/** Controls how aggressive the patch generator is */
export type PatchMode =
  | 'auto_fix_critical'       // แก้เฉพาะ critical issues เท่านั้น
  | 'auto_fix_critical_high'  // แก้ critical + high issues
  | 'full_improvement';       // แก้ทุก issue ที่ auto_fixable = true

// ─── Patch Operation ──────────────────────────────────────────────────────────
/** Low-level mutation type */
export type PatchOperation =
  | 'set'          // ตั้งค่าใหม่ทั้ง field
  | 'append'       // เพิ่ม item เข้า array
  | 'replace_item' // แทน item ใน array ที่ index ระบุ
  | 'remove_item'  // ลบ item จาก array ที่ index ระบุ

// ─── Single Patch ─────────────────────────────────────────────────────────────
export interface LessonPlanPatch {
  /** UUID generated at creation time */
  id: string;
  /** Which logical section of LessonPlan this patch targets */
  target: PatchTarget;
  /** Low-level operation */
  operation: PatchOperation;
  /** JSON path inside the LessonPlan canonical object */
  path: string[];
  /** Value before this patch (undefined for append/new) */
  before: unknown;
  /** New value to set */
  after: unknown;
  /** Human-readable reason for this patch */
  reason: string;
  /** Issue code that triggered this patch (from EvaluationResultIssue.issue_type) */
  issueCode?: string;
  /** Severity of the issue this patch addresses */
  issueSeverity?: ValidationSeverity;
  /** Evaluation sections that must be re-evaluated after this patch */
  affectedSections: string[];
  /** Array index for replace_item and remove_item operations */
  index?: number;
}

// ─── Patch Bundle ─────────────────────────────────────────────────────────────
export interface PatchBundle {
  lessonPlanId: string;
  jobId: string;
  evaluationMode: EvaluationMode;
  mode: PatchMode;
  patches: LessonPlanPatch[];
  /** SHA-256 hash of the LessonPlan BEFORE patching */
  hashBefore: string;
  patchedBy: 'ai_suggestion' | 'system_rule';
  summary: string;
  /** All unique sections that any patch in this bundle affects */
  allAffectedSections: string[];
}

// ─── Patch Application Result ─────────────────────────────────────────────────
export interface PatchApplyResult {
  applied: LessonPlanPatch[];
  skipped: Array<{ patch: LessonPlanPatch; reason: string }>;
  hashAfter: string;
}

// ─── Database Row Shapes ──────────────────────────────────────────────────────
export interface LessonPlanVersionRecord {
  id: string;
  lesson_plan_id: string;
  version: string;
  content: Record<string, unknown>;
  content_hash: string;
  created_by: string;
  change_summary: string | null;
  parent_version_id: string | null;
  created_at: string;
}

export interface LessonPlanPatchRecord {
  id: string;
  lesson_plan_id: string;
  job_id: string | null;
  from_version_id: string | null;
  to_version_id: string | null;
  patch_type: string;
  target_section: string;
  severity: string | null;
  before_content: unknown;
  after_content: unknown;
  patch_json: Record<string, unknown>;
  reason: string | null;
  applied: boolean;
  created_at: string;
  applied_at: string | null;
}
