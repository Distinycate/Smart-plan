import type { LessonPlan } from '../schema';
import { preValidateLessonPlan } from '../validators/pre-validator';
import type { EvaluationMode } from '../schema';
import type { PatchApplyResult } from './patch-schema';

export interface PatchValidationResult {
  valid: boolean;
  newCriticalIssues: string[];
  warnings: string[];
}

/**
 * Validate a patched LessonPlan:
 * 1. Ensure the result still conforms to the canonical schema (basic checks)
 * 2. Ensure the patch did not introduce NEW critical issues
 *
 * Note: this intentionally does NOT run full AI evaluation.
 * It only runs the deterministic rule-based pre-validator.
 */
export function validatePatchResult(
  patchedPlan: LessonPlan,
  evaluationMode: EvaluationMode,
  applyResult: PatchApplyResult,
): PatchValidationResult {
  const warnings: string[] = [];
  const newCriticalIssues: string[] = [];

  // 1. Structural sanity — check required fields exist
  if (!patchedPlan.metadata) {
    newCriticalIssues.push('metadata หายไปหลัง patch');
  }
  if (!patchedPlan.objectives) {
    newCriticalIssues.push('objectives หายไปหลัง patch');
  }
  if (!patchedPlan.learningActivities) {
    newCriticalIssues.push('learningActivities หายไปหลัง patch');
  }

  // 2. Run pre-validator on patched plan
  const preValidation = preValidateLessonPlan(patchedPlan, evaluationMode);
  const postCritical = preValidation.issues
    .filter(issue => issue.severity === 'critical')
    .map(issue => issue.code);

  for (const code of postCritical) {
    newCriticalIssues.push(`pre-validator critical: ${code}`);
  }

  // 3. Warn about skipped patches
  for (const { patch, reason } of applyResult.skipped) {
    warnings.push(`ข้าม patch [${patch.target}]: ${reason}`);
  }

  // 4. Warn if no patches were applied
  if (applyResult.applied.length === 0) {
    warnings.push('ไม่มี patch ใดที่ถูก apply สำเร็จ');
  }

  return {
    valid: newCriticalIssues.length === 0,
    newCriticalIssues,
    warnings,
  };
}
