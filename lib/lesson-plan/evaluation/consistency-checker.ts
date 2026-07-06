import type { EvaluationRubricCriterion } from '../rubrics/master-rubric';
import type {
  ConsistencyFlag,
  EvaluationSectionResult,
} from './types';

const alignedValue = (findings: unknown): boolean | undefined => {
  if (!findings || typeof findings !== 'object') return undefined;
  const record = findings as Record<string, unknown>;
  if (typeof record.aligned === 'boolean') return record.aligned;
  if (record.alignment && typeof record.alignment === 'object') {
    const alignment = record.alignment as Record<string, unknown>;
    if (typeof alignment.aligned === 'boolean') return alignment.aligned;
  }
  return undefined;
};

export function checkEvaluationConsistency(
  result: EvaluationSectionResult,
  criterion?: EvaluationRubricCriterion,
  ruleBasedFindings?: unknown
): ConsistencyFlag[] {
  const flags: ConsistencyFlag[] = [];
  const percentage = result.max_score > 0
    ? result.score / result.max_score
    : 0;
  const hasCritical = result.issues.some(issue =>
    issue.severity === 'critical'
  );

  if (
    result.evidence_found.length === 0
    && result.missing_evidence.length === 0
  ) {
    flags.push({
      section: result.section,
      severity: 'high',
      code: 'EVIDENCE_ACCOUNTING_EMPTY',
      message: 'ผลประเมินไม่มีทั้ง evidence_found และ missing_evidence',
      action: 'retry_section',
    });
  }

  if (result.evidence_found.length === 0 && percentage > 0.8) {
    flags.push({
      section: result.section,
      severity: 'high',
      code: 'HIGH_SCORE_WITHOUT_EVIDENCE',
      message: 'คะแนนสูงกว่า 80% แต่ไม่พบหลักฐานสนับสนุน',
      action: 'retry_section',
    });
  }

  if (hasCritical && percentage > 0.6) {
    flags.push({
      section: result.section,
      severity: 'high',
      code: 'CRITICAL_ISSUE_SCORE_CONFLICT',
      message: 'มี critical issue แต่คะแนนสูงกว่า 60% ของคะแนนเต็ม',
      action: 'retry_section',
    });
  }

  if (
    result.missing_evidence.length > result.evidence_found.length
    && (result.level === 'excellent' || result.level === 'very_good')
  ) {
    flags.push({
      section: result.section,
      severity: 'high',
      code: 'LEVEL_MISSING_EVIDENCE_CONFLICT',
      message: 'ระดับผลประเมินสูงมากทั้งที่หลักฐานที่ขาดมีมากกว่าหลักฐานที่พบ',
      action: 'retry_section',
    });
  }

  if (criterion) {
    if (result.max_score !== criterion.maxScore) {
      flags.push({
        section: result.section,
        severity: 'high',
        code: 'MAX_SCORE_MISMATCH',
        message: 'max_score ไม่ตรงกับ rubric criterion',
        action: 'retry_section',
      });
    }
    if (!criterion.anchors.some(anchor => anchor.score === result.score)) {
      flags.push({
        section: result.section,
        severity: 'high',
        code: 'SCORE_NOT_ON_ANCHOR',
        message: 'score ไม่ตรงกับ anchor ที่อนุญาต',
        action: 'retry_section',
      });
    }
  }

  if (alignedValue(ruleBasedFindings) === false && percentage > 0.8) {
    flags.push({
      section: result.section,
      severity: 'high',
      code: 'RULE_ALIGNMENT_SCORE_CONFLICT',
      message: 'Rule-based alignment ไม่ผ่าน แต่ AI ให้คะแนนสูงกว่า 80%',
      action: 'retry_section',
    });
  }

  if (
    percentage <= 0.4
    && result.evidence_found.length > 0
    && result.weaknesses.length === 0
    && result.issues.length === 0
  ) {
    flags.push({
      section: result.section,
      severity: 'medium',
      code: 'LOW_SCORE_WITHOUT_EXPLANATION',
      message: 'คะแนนต่ำแต่ไม่มี weakness หรือ issue อธิบาย',
      action: 'manual_review',
    });
  }

  return flags;
}

export const shouldRetryForConsistency = (
  flags: readonly ConsistencyFlag[]
) => flags.some(flag =>
  flag.severity === 'high' && flag.action === 'retry_section'
);
