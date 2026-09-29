/**
 * Smart Plan V3 — Post-Teaching Rule Engine
 *
 * Deterministic rules for:
 * 1. Teaching Session validation (student counts consistency)
 * 2. Reflection & Remediation validation (Remediation gate for students needing support)
 * 3. Observed Outcome Evidence Summary generation (Evidence-based, zero AI hallucination, no PA score)
 */

import type {
  V3LessonObjective,
  V3ObservedStudentEvidence,
  V3PostTeachingRecord,
  ObservedOutcomeEvidenceSummary,
  ObservedOutcomeItem,
  V3ObservedOutcomeStatus,
} from '../types';

export interface RecordTeachingInput {
  students_total: number;
  students_passed: number;
  students_need_support: number;
  taught_at?: string;
  actual_duration_minutes?: number;
  students_present?: number;
  students_absent?: number;
  students_assessed?: number;
  actual_teaching_notes?: string;
  session_metadata?: Record<string, any>;
}

export interface RecordReflectionInput {
  reflection: string;
  remediation_plan?: string;
  problems?: string;
  adjustments_made?: string;
  feedback_given?: string;
  what_worked?: string;
  next_lesson_adjustment?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates Teaching Session Input (FINAL -> TAUGHT)
 */
export function validateTeachingSession(input: Partial<RecordTeachingInput>): ValidationResult {
  const errors: string[] = [];

  const total = Number(input.students_total);
  const passed = Number(input.students_passed);
  const support = Number(input.students_need_support);

  if (isNaN(total) || total <= 0) {
    errors.push('จำนวนนักเรียนทั้งหมดต้องมากกว่า 0');
  }

  if (isNaN(passed) || passed < 0) {
    errors.push('จำนวนนักเรียนที่ผ่านเกณฑ์ต้องไม่ติดลบ');
  }

  if (isNaN(support) || support < 0) {
    errors.push('จำนวนนักเรียนที่ต้องได้รับการช่วยเหลือต้องไม่ติดลบ');
  }

  if (!isNaN(total) && !isNaN(passed) && !isNaN(support)) {
    if (passed + support > total) {
      errors.push(`ผลรวมของนักเรียนที่ผ่าน (${passed}) และต้องช่วยเหลือ (${support}) ต้องไม่เกินจำนวนนักเรียนทั้งหมด (${total})`);
    }
  }

  if (input.students_present !== undefined && input.students_absent !== undefined) {
    const present = Number(input.students_present);
    const absent = Number(input.students_absent);
    if (!isNaN(present) && !isNaN(absent) && !isNaN(total)) {
      if (present + absent !== total) {
        errors.push(`ผลรวมของนักเรียนที่มาเรียน (${present}) และขาดเรียน (${absent}) ต้องเท่ากับจำนวนนักเรียนทั้งหมด (${total})`);
      }
    }
  }

  if (input.students_assessed !== undefined) {
    const assessed = Number(input.students_assessed);
    if (!isNaN(assessed)) {
      if (assessed < 0) {
        errors.push('จำนวนนักเรียนที่ได้รับการประเมินต้องไม่ติดลบ');
      }
      const maxAttended = input.students_present !== undefined ? Number(input.students_present) : total;
      if (!isNaN(maxAttended) && assessed > maxAttended) {
        errors.push(`จำนวนนักเรียนที่ได้รับการประเมิน (${assessed}) ต้องไม่เกินจำนวนนักเรียนที่มาเรียน (${maxAttended})`);
      }
      if (!isNaN(passed) && !isNaN(support) && (passed + support > assessed)) {
        errors.push(`ผลรวมของนักเรียนที่ผ่านและต้องช่วยเหลือ (${passed + support}) ต้องไม่เกินจำนวนที่ได้รับการประเมิน (${assessed})`);
      }
    }
  }

  if (input.taught_at) {
    const d = new Date(input.taught_at);
    if (isNaN(d.getTime())) {
      errors.push('วันที่สอนจริงไม่ถูกต้องตามรูปแบบวันที่');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates Teacher Reflection Input (TAUGHT -> REFLECTED)
 * Strictly enforces Remediation Gate if students_need_support > 0
 */
export function validateReflection(
  input: Partial<RecordReflectionInput>,
  sessionRecord: V3PostTeachingRecord | null
): ValidationResult {
  const errors: string[] = [];

  if (!sessionRecord) {
    errors.push('ไม่พบข้อมูลการบันทึกการสอนจริง กรุณาบันทึกผลการสอน (Step 8) ก่อนทำการสะท้อนผล');
    return { valid: false, errors };
  }

  const reflectionText = (input.reflection || '').trim();
  if (!reflectionText) {
    errors.push('กรุณาระบุบันทึกการสะท้อนผลของครู (Teacher Reflection) ก่อนบันทึกยืนยัน');
  }

  const supportCount = Number(sessionRecord.students_need_support || 0);
  const remediationText = (input.remediation_plan || '').trim();

  // Critical Remediation Gate:
  if (supportCount > 0 && !remediationText) {
    errors.push(
      `มีนักเรียนที่ต้องได้รับการช่วยเหลือจำนวน ${supportCount} คน จำเป็นต้องระบุแผนการช่วยเหลือ/สอนซ่อมเสริม (Remediation Plan) ก่อนเปลี่ยนสถานะเป็น REFLECTED`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates Observed Evidence Item
 */
export function validateObservedEvidence(
  evidence: Partial<V3ObservedStudentEvidence>
): ValidationResult {
  const errors: string[] = [];

  if (!evidence.title || !evidence.title.trim()) {
    errors.push('กรุณาระบุชื่อหลักฐานเชิงประจักษ์');
  }

  if (!evidence.evidence_type) {
    errors.push('กรุณาระบุประเภทของหลักฐาน');
  }

  const validStatuses: V3ObservedOutcomeStatus[] = [
    'OBSERVED',
    'PARTIALLY_OBSERVED',
    'NOT_OBSERVED',
    'NOT_ASSESSED',
  ];
  if (evidence.outcome_status && !validStatuses.includes(evidence.outcome_status)) {
    errors.push(`สถานะหลักฐานไม่ถูกต้อง (${evidence.outcome_status})`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Builds Deterministic Observed Outcome Evidence Summary
 *
 * Rules:
 * - NO AI scoring, NO PA % / Score calculation, NO promotion readiness.
 * - Every OBSERVED status MUST have at least 1 evidence reference.
 * - Status defaults to NOT_OBSERVED if 0 evidence references exist.
 */
export function buildObservedOutcomeSummary(
  objectives: V3LessonObjective[],
  observedEvidence: V3ObservedStudentEvidence[]
): ObservedOutcomeEvidenceSummary {
  const items: ObservedOutcomeItem[] = [];

  let totalObserved = 0;
  let totalPartiallyObserved = 0;
  let totalNotObserved = 0;
  let totalNotAssessed = 0;

  for (const obj of objectives) {
    // Find all observed evidence linked to this objective
    const linked = observedEvidence.filter(e => e.objective_id === obj.id);
    const evidenceRefs = linked.map(e => e.id);

    let status: V3ObservedOutcomeStatus;

    if (linked.length === 0) {
      status = 'NOT_OBSERVED';
      totalNotObserved++;
    } else {
      // Check individual statuses: if any is PARTIALLY_OBSERVED and none is purely OBSERVED
      const hasObserved = linked.some(e => e.outcome_status === 'OBSERVED');
      const hasPartial = linked.some(e => e.outcome_status === 'PARTIALLY_OBSERVED');

      if (hasObserved) {
        status = 'OBSERVED';
        totalObserved++;
      } else if (hasPartial) {
        status = 'PARTIALLY_OBSERVED';
        totalPartiallyObserved++;
      } else {
        status = 'NOT_OBSERVED';
        totalNotObserved++;
      }
    }

    // Strict Rule: Every OBSERVED must have evidenceRefs >= 1
    if (status === 'OBSERVED' && evidenceRefs.length === 0) {
      status = 'NOT_OBSERVED';
    }

    items.push({
      objectiveId: obj.id,
      objectiveTitle: obj.statement || `จุดประสงค์ข้อที่ ${obj.position}`,
      status,
      evidenceCount: linked.length,
      evidenceRefs,
    });
  }

  return {
    items,
    totalObserved,
    totalPartiallyObserved,
    totalNotObserved,
    totalNotAssessed,
    evaluatedAt: new Date().toISOString(),
  };
}
