/**
 * Smart Plan V3 — Quality Engine Types
 * Stable issue codes, severity levels, and result contracts.
 * Zero AI dependency in this file.
 */

/** Quality issue severity */
export type V3QualitySeverity = 'ERROR' | 'WARNING' | 'INFO';

/** Quality issue categories (maps to Thai UI labels in labels.ts) */
export type V3QualityCategory =
  | 'STRUCTURE'    // โครงสร้าง
  | 'ALIGNMENT'    // ความสอดคล้อง
  | 'ACTIVITY'     // กิจกรรมการเรียนรู้
  | 'ASSESSMENT'   // การวัดและประเมินผล
  | 'FEEDBACK'     // ข้อมูลย้อนกลับ
  | 'SUBJECT'      // ความเหมาะสมตามธรรมชาติวิชา
  | 'PACKAGE'      // ชุดพร้อมสอน
  | 'TIME';        // ความเป็นไปได้ในเวลา

/** Entity types for issue location */
export type V3QualityLocationType =
  | 'LESSON'
  | 'INDICATOR'
  | 'OBJECTIVE'
  | 'EVIDENCE'
  | 'ACTIVITY'
  | 'ASSESSMENT'
  | 'ASSESSMENT_TOOL'
  | 'ASSET';

/**
 * A single quality issue — stable contract.
 * `code` is the stable identifier; human text can change.
 */
export interface V3QualityIssue {
  /** Stable code like "Q-ALIGN-001". Never changes. */
  code: string;
  category: V3QualityCategory;
  severity: V3QualitySeverity;
  /** Entity type where the issue is located */
  locationType: V3QualityLocationType;
  /** UUID of the affected entity (if applicable) */
  locationId?: string;
  /** Temporary ref for display (e.g. "O1", "A3", "ASM1") */
  locationRef?: string;
  /** Short title for the issue card */
  title: string;
  /** Detailed message explaining the problem */
  message: string;
  /** Actual evidence strings from the lesson graph that support this issue */
  evidence: string[];
  /** AI-proposed fix (if AI review produced one) */
  suggestion?: string | null;
  /** AI proposed field + replacement text (for apply-fix UI) */
  proposedChange?: {
    field: string;
    replacement: string;
  } | null;
  /** Whether this issue blocks the document-readiness gate */
  isBlocking: boolean;
  /** Source of this issue: deterministic rule engine or AI reviewer */
  source: 'RULE' | 'AI';
}

/** Alignment node used in the alignment graph */
export interface V3AlignmentNode {
  type: V3QualityLocationType;
  id: string;
  ref: string;   // e.g. "O1"
  label: string;
}

/** A directed edge in the alignment graph */
export interface V3AlignmentEdge {
  fromRef: string;
  toRef: string;
  relationshipType: string; // e.g. "OBJECTIVE→EVIDENCE", "EVIDENCE→ACTIVITY"
}

/** Full alignment graph for a lesson */
export interface V3LessonAlignmentGraph {
  nodes: V3AlignmentNode[];
  edges: V3AlignmentEdge[];
  /** Quick lookup: objectiveRef → set of evidence refs */
  objectiveToEvidence: Record<string, string[]>;
  /** Quick lookup: evidenceRef → set of activity refs */
  evidenceToActivities: Record<string, string[]>;
  /** Quick lookup: evidenceRef → set of assessment refs */
  evidenceToAssessments: Record<string, string[]>;
  /** Quick lookup: assessmentRef → set of tool refs */
  assessmentToTools: Record<string, string[]>;
  /** Orphan detection results */
  orphans: {
    objectivesWithoutEvidence: string[];
    evidenceWithoutObjective: string[];
    evidenceWithoutActivity: string[];
    evidenceWithoutAssessment: string[];
    assessmentsWithoutEvidence: string[];
    assetsWithoutAnyLink: string[];
  };
}

/** Full result of the deterministic rule engine (Layer 1) */
export interface V3QualityRuleResult {
  issues: V3QualityIssue[];
  blockingErrorCount: number;
  warningCount: number;
  infoCount: number;
  allBlockingResolved: boolean;
}

/** Full result of the AI qualitative review (Layer 2) */
export interface V3AiQualityReviewResult {
  issues: V3QualityIssue[];
  reviewedAt: string;
  lessonHash: string;
  aiCallCount: number;
  /** True if AI response was valid and schema-validated */
  valid: boolean;
  /** Error if AI call failed or schema was invalid */
  error?: string;
}

/** Document readiness gate result */
export interface V3DocumentReadiness {
  ready: boolean;
  /** Status the lesson must reach before document generation is allowed */
  requiredStatus: 'REVIEWED';
  /** List of blocking conditions not yet met */
  blockingConditions: string[];
  /** Non-blocking warnings (do not prevent document generation) */
  warnings: string[];
  /** Full issue objects for blockers (Requirement 21) */
  blockers: V3QualityIssue[];
  /** Full issue objects for warnings (Requirement 21) */
  ruleWarnings: V3QualityIssue[];
  checklist: {
    packageReady: boolean;
    noBlockingErrors: boolean;
    noStaleRequiredAssets: boolean;
    assessmentReady: boolean;
    durationValid: boolean;
    objectiveCoverageComplete: boolean;
    evidenceCoverageComplete: boolean;
  };
}

/** Quality Summary Model replacing overall QualityScore (Requirement 3) */
export interface V3QualitySummary {
  blockingIssues: number;
  warnings: number;
  suggestions: number;
  structuralReady: boolean;
  assessmentReady: boolean;
  packageReady: boolean;
  documentReady: boolean;
}

/** Persisted quality review record stored in v3_plan_reviews */
export interface V3SavedQualityReview {
  id: string;
  lesson_plan_id: string;
  review_type: 'RULE' | 'AI' | 'PA_READINESS';
  status: 'PENDING' | 'PASSED' | 'WARNING' | 'FAILED';
  result: Record<string, any>;
  created_at: string;
}
