export type UnitLessonInput = Record<string, unknown>;

export function validateUnitLesson(input: UnitLessonInput) {
  const errors: string[] = [];
  const order = Number(input.lessonOrder);
  const hours = Number(input.estimatedHours);

  if (!Number.isInteger(order) || order < 1) {
    errors.push('ลำดับแผนต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป');
  }
  if (!String(input.lessonTitle || input.lessonTopic || '').trim()) {
    errors.push('กรุณาระบุชื่อแผนหรือเรื่องที่สอน');
  }
  if (!Number.isFinite(hours) || hours <= 0) {
    errors.push('จำนวนชั่วโมงต้องมากกว่า 0');
  }

  return { ok: errors.length === 0, errors };
}

