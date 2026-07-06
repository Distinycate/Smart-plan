export type UnitPlanStatus = 'draft' | 'ready' | 'archived';

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

const isBlank = (value: unknown) =>
  value === undefined || value === null || String(value).trim() === '';

const asList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }
};

export function validateUnitPlan(
  payload: Record<string, unknown>,
  status: UnitPlanStatus = 'draft',
  lessonCount = 0,
  lessonHours = 0
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!['draft', 'ready', 'archived'].includes(status)) {
    errors.push('สถานะแผนระดับหน่วยไม่ถูกต้อง');
    return { ok: false, errors, warnings };
  }

  if (status === 'archived') return { ok: true, errors, warnings };

  const draftFields: Array<[string, string]> = [
    ['academicYear', 'ปีการศึกษา'],
    ['semester', 'ภาคเรียน'],
    ['gradeLevel', 'ระดับชั้น'],
    ['unitName', 'ชื่อหน่วยการเรียนรู้'],
  ];

  for (const [field, label] of draftFields) {
    if (isBlank(payload[field])) errors.push(`กรุณาระบุ${label}`);
  }

  if (isBlank(payload.subjectId) && isBlank(payload.subjectName)) {
    errors.push('กรุณาระบุรายวิชา');
  }

  const hours = Number(payload.totalUnitHours || 0);
  if (hours < 0 || !Number.isFinite(hours)) {
    errors.push('จำนวนชั่วโมงของหน่วยต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
  }

  if (status === 'ready') {
    if (hours <= 0) errors.push('แผนพร้อมใช้ต้องมีจำนวนชั่วโมงมากกว่า 0');
    if (asList(payload.indicatorIds).length === 0) {
      errors.push('แผนพร้อมใช้ต้องมีตัวชี้วัดอย่างน้อย 1 รายการ');
    }
    if (isBlank(payload.unitLearningOutcomes)) {
      errors.push('แผนพร้อมใช้ต้องมีผลลัพธ์การเรียนรู้ของหน่วย');
    }
    if (isBlank(payload.unitAssessmentOverview)) {
      errors.push('แผนพร้อมใช้ต้องมีภาพรวมการวัดและประเมินผล');
    }
    if (lessonCount < 1) {
      errors.push('แผนพร้อมใช้ต้องมีลำดับแผนรายคาบอย่างน้อย 1 รายการ');
    }
    if (lessonCount > 0 && Math.abs(hours - lessonHours) > 0.001) {
      errors.push(`ชั่วโมงรวมของแผนรายคาบ (${lessonHours}) ต้องตรงกับชั่วโมงของหน่วย (${hours})`);
    }
  } else {
    if (hours === 0) warnings.push('ยังไม่ได้ระบุจำนวนชั่วโมงรวมของหน่วย');
    if (asList(payload.indicatorIds).length === 0) warnings.push('ยังไม่ได้เลือกตัวชี้วัด');
    if (lessonCount > 0 && Math.abs(hours - lessonHours) > 0.001) {
      warnings.push(`ชั่วโมงรวมของแผนรายคาบ (${lessonHours}) ยังไม่ตรงกับชั่วโมงของหน่วย (${hours})`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
