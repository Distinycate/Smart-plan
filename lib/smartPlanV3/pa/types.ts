/**
 * Smart Plan V3 — PA (Performance Agreement) Readiness Types
 * All criteria must reference a versioned registry tied to an official source.
 * No criteria are fabricated — see docs/SMART_PLAN_V3_PA_CRITERIA.md for provenance.
 */

/** Evidence status for a single PA criteria item */
export type V3PaEvidenceStatus =
  | 'EVIDENCED'         // Clear evidence found in lesson graph
  | 'PARTIALLY_EVIDENCED' // Some but not all indicators of this criterion are present
  | 'NOT_EVIDENCED'     // No relevant evidence found in lesson graph
  | 'NOT_APPLICABLE';   // This criterion is not applicable for this lesson type

/** Registry status for a criteria version */
export type V3PaCriteriaStatus = 'ACTIVE' | 'SUPERSEDED' | 'DRAFT';

/** PA domain classification */
export type V3PaDomain =
  | 'LEARNING_MANAGEMENT'    // ด้านการจัดการเรียนรู้
  | 'LEARNER_OUTCOMES';      // ด้านผลลัพธ์ของผู้เรียน (Pre-teach: planned only)

/** A single evaluable PA criteria item */
export interface V3PaCriteriaItem {
  /** Stable unique code. Never changes once assigned. */
  criteriaId: string;
  /** Human-readable Thai label */
  labelTh: string;
  /** Domain this criterion belongs to */
  domain: V3PaDomain;
  /** What the engine looks for in the lesson graph (deterministic indicators) */
  deterministicIndicators: string[];
  /** AI semantic interpretation hint — what AI should assess qualitatively */
  aiSemanticHint?: string;
  /**
   * Whether this can be fully assessed from a pre-teaching lesson plan alone.
   * false = requires post-teaching data; only "planned" evidence can be claimed.
   */
  assessableFromPlan: boolean;
  /** When assessableFromPlan=false, this text clarifies the limitation */
  planOnlyDisclaimer?: string;
}

/** A complete versioned PA criteria set */
export interface V3PaCriteriaVersion {
  /** Stable version identifier — never use a year alone */
  id: string;
  /** Human-readable label */
  label: string;
  /** Official issuing authority */
  sourceAuthority: string;
  /** Name of the official document this is derived from */
  sourceDocument: string;
  /** ISO date string when this version became effective */
  effectiveFrom: string;
  /** IDs of any versions this version amends */
  amendedBy: string[];
  status: V3PaCriteriaStatus;
  /** The ordered list of criteria items */
  criteria: V3PaCriteriaItem[];
}

/** Per-item PA readiness result */
export interface V3PaItemResult {
  criteriaId: string;
  criteriaVersion: string;
  labelTh: string;
  domain: V3PaDomain;
  status: V3PaEvidenceStatus;
  /** Structured refs into the lesson graph that support this status */
  evidenceRefs: Array<{
    entityType: 'ACTIVITY' | 'ASSESSMENT' | 'ASSESSMENT_TOOL' | 'ASSET' | 'OBJECTIVE' | 'EVIDENCE';
    entityRef: string;   // e.g. "A3", "ASM1", "O1"
    entityId?: string;   // resolved UUID (optional)
    description: string; // human-readable Thai
  }>;
  /** AI-generated reason (if AI layer ran) */
  reason: string;
  /** What is still missing or partial */
  gap?: string;
  /** Suggestion to improve coverage */
  suggestion?: string;
  /**
   * Safety flag: true means this item was assessed from pre-teaching plan data only.
   * Outcome claims require post-teaching data.
   */
  isPlanPhaseOnly: boolean;
}

/** Full PA readiness result for a lesson */
export interface V3PaReadinessResult {
  criteriaVersion: string;
  reviewedAt: string;
  lessonHash: string;        // Hash of relevant fields to detect staleness
  items: V3PaItemResult[];
  summary: {
    totalItems: number;
    evidenced: number;
    partiallyEvidenced: number;
    notEvidenced: number;
    notApplicable: number;
  };
  /** Safety disclaimer shown in UI */
  planPhaseDisclaimer: string;
  aiUsed: boolean;
}
