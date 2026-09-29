import { V3LessonStatus, V3SourceType } from './types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

export const VALID_STATUSES: V3LessonStatus[] = [
  'DRAFT',
  'BLUEPRINT_READY',
  'PACKAGE_READY',
  'REVIEWED',
  'FINAL',
  'TAUGHT',
  'REFLECTED'
];

export const VALID_SOURCES: V3SourceType[] = ['MANUAL', 'AI'];

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export function validateCreateLessonInput(input: any): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'ข้อมูลแผนการสอนไม่ถูกต้อง' };
  }

  const { title, topic, course_name, course_code, subject_key, grade_level, duration_minutes } = input;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return { success: false, error: 'กรุณาระบุชื่อแผนการสอน (title)' };
  }
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return { success: false, error: 'กรุณาระบุหัวข้อเรื่อง (topic)' };
  }
  if (!course_name || typeof course_name !== 'string' || !course_name.trim()) {
    return { success: false, error: 'กรุณาระบุชื่อรายวิชา (course_name)' };
  }
  // course_code is optional; default to empty string if not provided
  if (!subject_key || typeof subject_key !== 'string' || !subject_key.trim()) {
    return { success: false, error: 'กรุณาระบุกลุ่มสาระการเรียนรู้ (subject_key)' };
  }
  if (!grade_level || typeof grade_level !== 'string' || !grade_level.trim()) {
    return { success: false, error: 'กรุณาระบุระดับชั้น (grade_level)' };
  }

  const duration = Number(duration_minutes ?? 60);
  if (isNaN(duration) || duration <= 0) {
    return { success: false, error: 'ระยะเวลาคาบสอนต้องมากกว่า 0 นาที' };
  }

  return {
    success: true,
    data: {
      title: title.trim(),
      topic: topic.trim(),
      course_name: course_name.trim(),
      course_code: (course_code || '').trim(),
      subject_key: subject_key.trim().toUpperCase(),
      grade_level: grade_level.trim(),
      curriculum_version: input.curriculum_version || 'OBEC-2551-REV60',
      unit_reference: input.unit_reference ? String(input.unit_reference).trim() : null,
      duration_minutes: duration,
      status: input.status && VALID_STATUSES.includes(input.status) ? input.status : 'DRAFT',
      // V3.3 enrichment fields
      learning_focus: input.learning_focus ? String(input.learning_focus).trim().toUpperCase() : null,
      teaching_date: input.teaching_date ? String(input.teaching_date).trim() : null,
      student_context: input.student_context ? String(input.student_context).trim() : null,
      notes: input.notes ? String(input.notes).trim() : null,
    }
  };
}


export function validateCreateObjectiveInput(input: any): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'ข้อมูลจุดประสงค์การเรียนรู้ไม่ถูกต้อง' };
  }

  if (!input.lesson_plan_id || !isValidUuid(input.lesson_plan_id)) {
    return { success: false, error: 'รหัสแผนการสอน (lesson_plan_id) ไม่ถูกต้อง' };
  }

  if (!input.statement || typeof input.statement !== 'string' || !input.statement.trim()) {
    return { success: false, error: 'กรุณาระบุข้อความจุดประสงค์การเรียนรู้ (statement)' };
  }

  const position = Number(input.position ?? 0);
  if (isNaN(position) || position < 0) {
    return { success: false, error: 'ลำดับจุดประสงค์ (position) ต้องไม่ติดลบ' };
  }

  const source = input.source && VALID_SOURCES.includes(input.source) ? input.source : 'MANUAL';

  return {
    success: true,
    data: {
      lesson_plan_id: input.lesson_plan_id,
      position,
      statement: input.statement.trim(),
      objective_type: input.objective_type ? String(input.objective_type).trim() : null,
      observable_behavior: input.observable_behavior ? String(input.observable_behavior).trim() : null,
      source,
    }
  };
}

export function validateCreateEvidenceInput(input: any): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'ข้อมูลหลักฐานการเรียนรู้ไม่ถูกต้อง' };
  }

  if (!input.lesson_plan_id || !isValidUuid(input.lesson_plan_id)) {
    return { success: false, error: 'รหัสแผนการสอน (lesson_plan_id) ไม่ถูกต้อง' };
  }

  if (!input.evidence_type || typeof input.evidence_type !== 'string' || !input.evidence_type.trim()) {
    return { success: false, error: 'กรุณาระบุประเภทหลักฐานการเรียนรู้ (evidence_type)' };
  }

  if (!input.description || typeof input.description !== 'string' || !input.description.trim()) {
    return { success: false, error: 'กรุณาระบุรายละเอียดหลักฐาน (description)' };
  }

  const position = Number(input.position ?? 0);
  if (isNaN(position) || position < 0) {
    return { success: false, error: 'ลำดับหลักฐาน (position) ต้องไม่ติดลบ' };
  }

  const source = input.source && VALID_SOURCES.includes(input.source) ? input.source : 'MANUAL';

  return {
    success: true,
    data: {
      lesson_plan_id: input.lesson_plan_id,
      position,
      evidence_type: input.evidence_type.trim().toUpperCase(),
      description: input.description.trim(),
      source,
    }
  };
}

export function validateCreateActivityInput(input: any): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'ข้อมูลกิจกรรมการเรียนรู้ไม่ถูกต้อง' };
  }

  if (!input.lesson_plan_id || !isValidUuid(input.lesson_plan_id)) {
    return { success: false, error: 'รหัสแผนการสอน (lesson_plan_id) ไม่ถูกต้อง' };
  }

  if (!input.phase || typeof input.phase !== 'string' || !input.phase.trim()) {
    return { success: false, error: 'กรุณาระบุช่วงกิจกรรม (phase)' };
  }

  const minutes = Number(input.minutes ?? 0);
  if (isNaN(minutes) || minutes < 0) {
    return { success: false, error: 'เวลาที่ใช้ในกิจกรรม (minutes) ต้องไม่ติดลบ' };
  }

  const position = Number(input.position ?? 0);
  if (isNaN(position) || position < 0) {
    return { success: false, error: 'ลำดับกิจกรรม (position) ต้องไม่ติดลบ' };
  }

  const source = input.source && VALID_SOURCES.includes(input.source) ? input.source : 'MANUAL';

  return {
    success: true,
    data: {
      lesson_plan_id: input.lesson_plan_id,
      position,
      phase: input.phase.trim(),
      minutes,
      title: input.title ? String(input.title).trim() : null,
      teacher_actions: input.teacher_actions ? String(input.teacher_actions).trim() : '',
      student_actions: input.student_actions ? String(input.student_actions).trim() : '',
      assessment_moment: input.assessment_moment ? String(input.assessment_moment).trim() : null,
      feedback_moment: input.feedback_moment ? String(input.feedback_moment).trim() : null,
      source,
    }
  };
}

export function validateCreateAssessmentInput(input: any): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'ข้อมูลการวัดประเมินผลไม่ถูกต้อง' };
  }

  if (!input.lesson_plan_id || !isValidUuid(input.lesson_plan_id)) {
    return { success: false, error: 'รหัสแผนการสอน (lesson_plan_id) ไม่ถูกต้อง' };
  }

  if (!input.name || typeof input.name !== 'string' || !input.name.trim()) {
    return { success: false, error: 'กรุณาระบุชื่อการประเมิน (name)' };
  }

  if (!input.assessment_type || typeof input.assessment_type !== 'string' || !input.assessment_type.trim()) {
    return { success: false, error: 'กรุณาระบุประเภทการประเมิน (assessment_type)' };
  }

  if (!input.method || typeof input.method !== 'string' || !input.method.trim()) {
    return { success: false, error: 'กรุณาระบุวิธีการประเมิน (method)' };
  }

  if (!input.criteria_type || typeof input.criteria_type !== 'string' || !input.criteria_type.trim()) {
    return { success: false, error: 'กรุณาระบุประเภทเกณฑ์การวัด (criteria_type)' };
  }

  const position = Number(input.position ?? 0);
  if (isNaN(position) || position < 0) {
    return { success: false, error: 'ลำดับการประเมิน (position) ต้องไม่ติดลบ' };
  }

  const source = input.source && VALID_SOURCES.includes(input.source) ? input.source : 'MANUAL';

  return {
    success: true,
    data: {
      lesson_plan_id: input.lesson_plan_id,
      position,
      name: input.name.trim(),
      assessment_type: input.assessment_type.trim(),
      method: input.method.trim(),
      criteria_type: input.criteria_type.trim(),
      criteria_value: input.criteria_value !== undefined && input.criteria_value !== null ? Number(input.criteria_value) : null,
      criteria_text: input.criteria_text ? String(input.criteria_text).trim() : null,
      formative: input.formative !== undefined ? Boolean(input.formative) : true,
      source,
    }
  };
}

export function validateCreateTeachingAssetInput(input: any): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'ข้อมูลสื่อการสอนไม่ถูกต้อง' };
  }

  if (!input.lesson_plan_id || !isValidUuid(input.lesson_plan_id)) {
    return { success: false, error: 'รหัสแผนการสอน (lesson_plan_id) ไม่ถูกต้อง' };
  }

  if (!input.title || typeof input.title !== 'string' || !input.title.trim()) {
    return { success: false, error: 'กรุณาระบุชื่อสื่อการสอน (title)' };
  }

  if (!input.asset_type || typeof input.asset_type !== 'string' || !input.asset_type.trim()) {
    return { success: false, error: 'กรุณาระบุประเภทสื่อการสอน (asset_type)' };
  }

  const validAudiences = ['TEACHER', 'STUDENT', 'BOTH'];
  const audience = input.audience && validAudiences.includes(input.audience) ? input.audience : 'STUDENT';

  const position = Number(input.position ?? 0);
  if (isNaN(position) || position < 0) {
    return { success: false, error: 'ลำดับสื่อการสอน (position) ต้องไม่ติดลบ' };
  }

  const validStatuses = ['DRAFT', 'READY', 'FAILED'];
  const generation_status =
    input.generation_status && validStatuses.includes(input.generation_status)
      ? input.generation_status
      : 'READY';

  const source = input.source && VALID_SOURCES.includes(input.source) ? input.source : 'MANUAL';
  const content = input.content && typeof input.content === 'object' ? input.content : {};

  return {
    success: true,
    data: {
      lesson_plan_id: input.lesson_plan_id,
      title: input.title.trim(),
      asset_type: input.asset_type.trim().toUpperCase(),
      audience,
      position,
      content,
      generation_status,
      needs_review: Boolean(input.needs_review),
      source,
      objectiveIds: Array.isArray(input.objectiveIds) ? input.objectiveIds.filter(isValidUuid) : [],
      activityIds: Array.isArray(input.activityIds) ? input.activityIds.filter(isValidUuid) : [],
      evidenceIds: Array.isArray(input.evidenceIds) ? input.evidenceIds.filter(isValidUuid) : [],
    },
  };
}
