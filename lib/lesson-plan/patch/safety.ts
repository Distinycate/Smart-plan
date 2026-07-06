import type { LessonPlan } from '../schema';
import type { LessonPlanPatch, PatchTarget } from './patch-schema';

export interface SafetyValidationResult {
  valid: boolean;
  reason?: string;
  isHighRisk: boolean;
}

/**
 * Validates the safety of a patch before it gets applied or processed.
 * 
 * 1. Checks that target section matches path.
 * 2. Checks that target content (after) is not empty/null.
 * 3. Prevents deleting critical elements like curriculum standards or indicators.
 */
export function validatePatchSafety(
  patch: Omit<LessonPlanPatch, 'id' | 'affectedSections'>
): SafetyValidationResult {
  const { target, path, after } = patch;

  // 1. Ensure after is not empty/null/undefined
  if (after == null) {
    return { valid: false, reason: 'ข้อมูลผลลัพธ์ (after) ต้องไม่ว่างเปล่า', isHighRisk: false };
  }
  if (typeof after === 'string' && after.trim() === '') {
    return { valid: false, reason: 'ข้อมูลผลลัพธ์ (after) ต้องไม่เป็นข้อความว่าง', isHighRisk: false };
  }
  if (Array.isArray(after) && after.length === 0) {
    return { valid: false, reason: 'ข้อมูลผลลัพธ์ (after) ต้องไม่มีการลบข้อมูลทั้งหมดในรายการ', isHighRisk: false };
  }

  // 2. Validate path aligns with target
  const pathStr = path.join('.');
  let expectedPrefix = '';
  if (target.startsWith('objectives.')) expectedPrefix = 'objectives';
  else if (target.startsWith('curriculum.')) expectedPrefix = 'curriculum';
  else if (target.startsWith('assessment.')) expectedPrefix = 'assessment';
  else expectedPrefix = target;

  if (!pathStr.startsWith(expectedPrefix)) {
    return {
      valid: false,
      reason: `เส้นทางข้อมูล (path: ${pathStr}) ไม่ตรงกับหมวดหมู่เป้าหมาย (target: ${target})`,
      isHighRisk: false,
    };
  }

  // 3. Prevent deleting standard / indicators
  if (target === 'curriculum.standards' || target === 'curriculum.indicators') {
    if (Array.isArray(after) && after.length === 0) {
      return {
        valid: false,
        reason: 'ห้ามลบข้อมูลมาตรฐานหรือตัวชี้วัดของหลักสูตรออกทั้งหมด',
        isHighRisk: true,
      };
    }
  }

  const isHighRisk = isHighRiskPatch(target);

  return {
    valid: true,
    isHighRisk,
  };
}

/**
 * Determines if a patch target is high-risk (e.g. affects curriculum, objectives).
 */
export function isHighRiskPatch(target: PatchTarget): boolean {
  const highRiskTargets: PatchTarget[] = [
    'curriculum.standards',
    'curriculum.indicators',
    'curriculum.coreContent',
    'objectives.knowledge',
    'objectives.process',
    'objectives.attitude',
  ];
  return highRiskTargets.includes(target);
}
