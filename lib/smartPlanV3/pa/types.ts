/**
 * Smart Plan V3.7R — PA (Performance Agreement) Readiness Types
 *
 * Versioned criteria registry tied to official ก.ค.ศ. source documents.
 * All criteria clearly separate official text from system interpretation.
 * Zero overall score. Zero pass/fail claims for teachers.
 */

/** Evidence status for a single PA criteria item */
export type V3PaEvidenceStatus =
  | 'EVIDENCED'          // มีหลักฐานในแผน
  | 'PARTIALLY_EVIDENCED' // มีหลักฐานบางส่วน
  | 'NOT_EVIDENCED'      // ยังไม่พบหลักฐาน
  | 'NOT_APPLICABLE';    // ไม่เกี่ยวข้องกับแผนนี้

/** Mapping type distinguishing official text from system quality rules */
export type V3PaMappingType =
  | 'DIRECT'              // ข้อความหรือเกณฑ์ตรงตามเอกสารทางการ
  | 'INTERPRETED'         // การตีความเชิงปฏิบัติของระบบตามหลักวิชาชีพ
  | 'SYSTEM_QUALITY_RULE';// กฎคุณภาพระบบเพื่อสนับสนุนความพร้อม

/** PA domain classification */
export type V3PaDomain =
  | 'LEARNING_MANAGEMENT'    // ด้านการจัดการเรียนรู้
  | 'LEARNER_OUTCOMES';      // ด้านผลลัพธ์ของผู้เรียน (Pre-teach: planned only)

/** A single evaluable PA criteria item */
export interface PaCriterion {
  /** Stable unique internal ID, e.g. "PLAN_PRIOR_KNOWLEDGE" */
  id: string;
  /** Official code from regulatory document if available, e.g. "ว9/2564-ตัวชี้วัดที่ 2" */
  officialCode?: string;
  /** Official title from authority document */
  officialLabel?: string;
  /** System human-readable Thai label */
  systemLabel: string;
  /** Detailed description (strictly using planned-evidence semantics) */
  description: string;
  /** Reference to source document */
  sourceRef?: {
    criteriaVersionId: string;
    documentCode: string;
  };
  /** Explicit classification of official vs interpreted */
  mappingType: V3PaMappingType;
  /** Whether assessable from pre-teaching plan alone */
  assessableFromPlan: boolean;
  /** Explanatory disclaimer when item is not fully assessable from plan */
  planOnlyDisclaimer?: string;
  /** What the engine looks for in the lesson graph */
  deterministicIndicators: string[];
  /** Qualitative AI hint */
  aiSemanticHint?: string;
}

/** A complete versioned PA criteria set conforming to V3.7R contract */
export interface PaCriteriaVersion {
  /** Stable version identifier, e.g. "PA_TEACHER_V9_2564" */
  id: string;
  /** Human-readable label */
  label: string;
  /** Official issuing authority */
  authority: string;
  /** Base document metadata */
  baseDocument: {
    code: string;
    date: string;
    title?: string;
  };
  /** Validated regulatory amendment chain */
  amendments: {
    code: string;
    date: string;
    title?: string;
    note?: string;
  }[];
  /** Effective date */
  effectiveFrom?: string;
  /** Verification date of current registry */
  checkedAsOf: string;
  /** Registry status */
  status: 'ACTIVE' | 'SUPERSEDED' | 'DRAFT';
  /** Criteria list */
  criteria: PaCriterion[];
}

/** Per-item PA readiness result */
export interface V3PaItemResult {
  criterionId: string;
  systemLabel: string;
  officialCode?: string;
  officialLabel?: string;
  domain: V3PaDomain;
  mappingType: V3PaMappingType;
  status: V3PaEvidenceStatus;
  /**
   * Structured refs into the lesson graph that support this status (e.g. ["O1", "A2", "AS1"]).
   * If status === 'EVIDENCED', evidenceRefs.length MUST be >= 1.
   */
  evidenceRefs: string[];
  /** Detailed breakdown of evidence refs */
  evidenceDetails?: Array<{
    entityType: 'ACTIVITY' | 'ASSESSMENT' | 'ASSESSMENT_TOOL' | 'ASSET' | 'OBJECTIVE' | 'EVIDENCE';
    entityRef: string;
    entityId?: string;
    description: string;
  }>;
  /** Professional descriptive reason (Plan-focused, no claims of actual student outcomes) */
  reason: string;
  /** What is missing or requires attention */
  gap?: string;
  /** Constructive suggestion */
  suggestion?: string;
  /** Safety flag: true means assessed strictly from pre-teaching plan */
  isPlanPhaseOnly: boolean;
}

/** Full PA readiness result for a lesson */
export interface V3PaReadinessResult {
  criteriaVersion: PaCriteriaVersion;
  evidenceStage: 'PLANNED';
  reviewedAt: string;
  lessonHash: string;
  items: V3PaItemResult[];
  summary: {
    totalItems: number;
    evidenced: number;
    partiallyEvidenced: number;
    notEvidenced: number;
    notApplicable: number;
  };
  /** Mandatory safety disclaimer */
  planPhaseDisclaimer: string;
  aiUsed: boolean;
}
