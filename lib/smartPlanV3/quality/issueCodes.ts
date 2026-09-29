/**
 * Smart Plan V3 — Stable Quality Issue Codes
 *
 * These codes are stable identifiers for quality issues.
 * The code never changes; only the human-readable text may be updated.
 *
 * Format: Q-{CATEGORY}-{3-digit number}
 */

export const ISSUE_CODES = {
  // ── Structure ──────────────────────────────────────────────────
  /** No indicators selected */
  STRUCT_NO_INDICATOR:     'Q-STRUCT-001',
  /** No objectives created */
  STRUCT_NO_OBJECTIVE:     'Q-STRUCT-002',
  /** No evidence defined */
  STRUCT_NO_EVIDENCE:      'Q-STRUCT-003',
  /** No activities defined */
  STRUCT_NO_ACTIVITY:      'Q-STRUCT-004',
  /** No assessments defined */
  STRUCT_NO_ASSESSMENT:    'Q-STRUCT-005',

  // ── Alignment ──────────────────────────────────────────────────
  /** Objective has no linked evidence */
  ALIGN_OBJ_NO_EVIDENCE:   'Q-ALIGN-001',
  /** Objective has no activity covering it */
  ALIGN_OBJ_NO_ACTIVITY:   'Q-ALIGN-002',
  /** Evidence has no linked objective */
  ALIGN_EVD_NO_OBJECTIVE:  'Q-ALIGN-003',
  /** Evidence has no activity covering it */
  ALIGN_EVD_NO_ACTIVITY:   'Q-ALIGN-004',
  /** Evidence has no assessment */
  ALIGN_EVD_NO_ASSESSMENT: 'Q-ALIGN-005',
  /** Assessment has no linked evidence */
  ALIGN_ASM_NO_EVIDENCE:   'Q-ALIGN-006',

  // ── Activity ───────────────────────────────────────────────────
  /** Total activity duration does not equal lesson duration */
  ACT_DURATION_MISMATCH:   'Q-ACT-001',
  /** Activity is missing student actions */
  ACT_NO_STUDENT_ACTION:   'Q-ACT-002',

  // ── Assessment ────────────────────────────────────────────────
  /** Assessment is missing an assessment tool */
  ASSESS_NO_TOOL:           'Q-ASSESS-001',
  /** Assessment is missing passing criteria */
  ASSESS_NO_CRITERIA:       'Q-ASSESS-002',

  // ── Feedback ───────────────────────────────────────────────────
  /** No formative check moments in any activity */
  FEEDBACK_NO_FORMATIVE:   'Q-FEEDBACK-001',
  /** No feedback moments in any activity */
  FEEDBACK_NO_FEEDBACK:    'Q-FEEDBACK-002',

  // ── Subject-specific ───────────────────────────────────────────
  /** English speaking lesson without speaking activity */
  SUBJECT_ENG_NO_SPEAKING: 'Q-SUBJECT-001',
  /** Math problem solving without reasoning opportunity */
  SUBJECT_MATH_NO_REASONING: 'Q-SUBJECT-002',
  /** Science experiment without data recording */
  SUBJECT_SCI_NO_DATA:     'Q-SUBJECT-003',
  /** PE lesson using written task as core activity */
  SUBJECT_PE_WRITTEN_CORE: 'Q-SUBJECT-004',

  // ── Package ────────────────────────────────────────────────────
  /** Required asset is missing */
  PACKAGE_MISSING_ASSET:   'Q-ASSET-001',
  /** Required asset is stale (needs review) */
  PACKAGE_STALE_ASSET:     'Q-ASSET-002',

  // ── Time / Asset Duration ──────────────────────────────────────
  /** Asset estimated duration exceeds its linked activity duration */
  TIME_ASSET_OVERRUN:      'Q-TIME-001',
} as const;

export type V3QualityIssueCode = typeof ISSUE_CODES[keyof typeof ISSUE_CODES];
