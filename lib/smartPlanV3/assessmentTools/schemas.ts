/**
 * Smart Plan V3 — Assessment Tool Content Schemas
 * Deterministic validation functions — zero external dependencies.
 */

export interface ToolValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 1. Rubric Validator
export function validateRubricContent(content: any): ToolValidationResult {
  if (!content || typeof content !== 'object') {
    return { success: false, error: 'ข้อมูล Rubric ไม่ถูกต้อง' };
  }

  const title = typeof content.title === 'string' && content.title.trim() ? content.title.trim() : 'แบบประเมิน Rubric';

  if (!Array.isArray(content.levels) || content.levels.length < 3 || content.levels.length > 5) {
    return { success: false, error: 'Rubric ต้องมีระดับคะแนนระหว่าง 3 ถึง 5 ระดับ' };
  }

  const scoreSet = new Set<number>();
  for (const lvl of content.levels) {
    if (!lvl || typeof lvl.score !== 'number' || isNaN(lvl.score)) {
      return { success: false, error: 'คะแนนระดับ (score) ต้องเป็นตัวเลข' };
    }
    if (scoreSet.has(lvl.score)) {
      return { success: false, error: `คะแนนระดับ ${lvl.score} ซ้ำกัน` };
    }
    scoreSet.add(lvl.score);
    if (!lvl.label || typeof lvl.label !== 'string' || !lvl.label.trim()) {
      return { success: false, error: `ระดับคะแนน ${lvl.score} ต้องมีชื่อระดับ (label)` };
    }
  }

  if (!Array.isArray(content.criteria) || content.criteria.length < 1) {
    return { success: false, error: 'ต้องมีเกณฑ์ประเมิน (Criteria) อย่างน้อย 1 ข้อ' };
  }

  for (let cIdx = 0; cIdx < content.criteria.length; cIdx++) {
    const crit = content.criteria[cIdx];
    if (!crit || typeof crit !== 'object') {
      return { success: false, error: `เกณฑ์ข้อที่ ${cIdx + 1} ไม่ถูกต้อง` };
    }
    if (!crit.name || typeof crit.name !== 'string' || !crit.name.trim()) {
      return { success: false, error: `เกณฑ์ข้อที่ ${cIdx + 1} ต้องระบุชื่อเกณฑ์ประเมิน` };
    }
    if (!crit.descriptors || typeof crit.descriptors !== 'object') {
      return { success: false, error: `เกณฑ์ "${crit.name}" ต้องมีคำอธิบายระดับคุณภาพ (Descriptors)` };
    }

    for (const lvl of content.levels) {
      const scoreKey = String(lvl.score);
      const descText = crit.descriptors[scoreKey];
      if (!descText || typeof descText !== 'string' || !descText.trim()) {
        return {
          success: false,
          error: `เกณฑ์ "${crit.name}" ยังไม่มีคำอธิบายคุณภาพ (Descriptor) สำหรับระดับคะแนน ${lvl.score}`,
        };
      }
    }
  }

  return {
    success: true,
    data: {
      title,
      levels: content.levels.map((l: any) => ({ score: Number(l.score), label: String(l.label).trim() })),
      criteria: content.criteria.map((c: any) => ({
        name: String(c.name).trim(),
        weight: c.weight !== undefined ? Number(c.weight) : 1,
        descriptors: c.descriptors,
      })),
    },
  };
}

// 2. Checklist Validator
export function validateChecklistContent(content: any): ToolValidationResult {
  if (!content || typeof content !== 'object') {
    return { success: false, error: 'ข้อมูล Checklist ไม่ถูกต้อง' };
  }

  if (!Array.isArray(content.items) || content.items.length < 1) {
    return { success: false, error: 'Checklist ต้องมีรายการประเมินอย่างน้อย 1 รายการ' };
  }

  for (let idx = 0; idx < content.items.length; idx++) {
    const item = content.items[idx];
    if (!item || typeof item !== 'object') {
      return { success: false, error: `รายการที่ ${idx + 1} ไม่ถูกต้อง` };
    }
    if (!item.criterion || typeof item.criterion !== 'string' || !item.criterion.trim()) {
      return { success: false, error: `รายการที่ ${idx + 1} ต้องระบุพฤติกรรมบ่งชี้ที่สังเกตได้ (ห้ามว่าง)` };
    }
  }

  return {
    success: true,
    data: {
      title: content.title ? String(content.title).trim() : 'แบบประเมิน Checklist',
      passingThreshold: content.passingThreshold !== undefined ? Number(content.passingThreshold) : undefined,
      items: content.items.map((item: any, i: number) => ({
        id: item.id ? String(item.id).trim() : `C${i + 1}`,
        criterion: String(item.criterion).trim(),
        observable: item.observable !== undefined ? Boolean(item.observable) : true,
      })),
    },
  };
}

// 3. Scoring Guide Validator
export function validateScoringGuideContent(content: any): ToolValidationResult {
  if (!content || typeof content !== 'object') {
    return { success: false, error: 'ข้อมูล Scoring Guide ไม่ถูกต้อง' };
  }

  if (!Array.isArray(content.items) || content.items.length < 1) {
    return { success: false, error: 'Scoring Guide ต้องมีเกณฑ์การให้คะแนนอย่างน้อย 1 รายการ' };
  }

  let calculatedTotal = 0;
  for (let idx = 0; idx < content.items.length; idx++) {
    const item = content.items[idx];
    if (!item || !item.criterion || typeof item.criterion !== 'string' || !item.criterion.trim()) {
      return { success: false, error: `เกณฑ์ที่ ${idx + 1} ต้องระบุข้อความเกณฑ์การให้คะแนน` };
    }
    const maxPoints = Number(item.maxPoints ?? 1);
    if (isNaN(maxPoints) || maxPoints <= 0) {
      return { success: false, error: `เกณฑ์ที่ ${idx + 1} คะแนนต้องมากกว่า 0` };
    }
    calculatedTotal += maxPoints;
  }

  return {
    success: true,
    data: {
      title: content.title ? String(content.title).trim() : 'เกณฑ์การให้คะแนน (Scoring Guide)',
      totalPoints: content.totalPoints ? Number(content.totalPoints) : calculatedTotal,
      items: content.items.map((item: any) => ({
        criterion: String(item.criterion).trim(),
        maxPoints: Number(item.maxPoints ?? 1),
        description: item.description ? String(item.description).trim() : '',
      })),
    },
  };
}

// 4. Rating Scale Validator
export function validateRatingScaleContent(content: any): ToolValidationResult {
  if (!content || typeof content !== 'object') {
    return { success: false, error: 'ข้อมูล Rating Scale ไม่ถูกต้อง' };
  }

  if (!Array.isArray(content.scale) || content.scale.length < 2) {
    return { success: false, error: 'ต้องมีระดับคะแนนอย่างน้อย 2 ระดับ' };
  }

  if (!Array.isArray(content.items) || content.items.length < 1) {
    return { success: false, error: 'ต้องมีรายการประเมินอย่างน้อย 1 รายการ' };
  }

  for (let idx = 0; idx < content.items.length; idx++) {
    const item = content.items[idx];
    if (!item || !item.criterion || typeof item.criterion !== 'string' || !item.criterion.trim()) {
      return { success: false, error: `รายการที่ ${idx + 1} ต้องระบุข้อความรายการประเมิน` };
    }
  }

  return {
    success: true,
    data: {
      title: content.title ? String(content.title).trim() : 'แบบประเมินมาตรประมาณค่า (Rating Scale)',
      scale: content.scale.map((s: any) => ({
        value: Number(s.value),
        label: String(s.label || '').trim(),
      })),
      items: content.items.map((item: any, i: number) => ({
        id: item.id ? String(item.id).trim() : `R${i + 1}`,
        criterion: String(item.criterion).trim(),
      })),
    },
  };
}

// 5. Answer Key Validator
export function validateAnswerKeyContent(content: any): ToolValidationResult {
  if (!content || typeof content !== 'object') {
    return { success: false, error: 'ข้อมูล Answer Key ไม่ถูกต้อง' };
  }

  if (!Array.isArray(content.items) || content.items.length < 1) {
    return { success: false, error: 'Answer Key ต้องมีข้อคำถามอย่างน้อย 1 ข้อ' };
  }

  for (let idx = 0; idx < content.items.length; idx++) {
    const item = content.items[idx];
    if (!item || !item.answer || typeof item.answer !== 'string' || !item.answer.trim()) {
      return { success: false, error: `ข้อที่ ${idx + 1} ต้องระบุคำตอบที่ถูกต้อง` };
    }
  }

  return {
    success: true,
    data: {
      title: content.title ? String(content.title).trim() : 'เฉลยคำตอบ (Answer Key)',
      totalPoints: Number(content.totalPoints || content.items.length),
      items: content.items.map((item: any, i: number) => ({
        number: Number(item.number || i + 1),
        question: item.question ? String(item.question).trim() : undefined,
        answer: String(item.answer).trim(),
        points: Number(item.points || 1),
      })),
    },
  };
}

// 6. Observation Form Validator
export function validateObservationFormContent(content: any): ToolValidationResult {
  if (!content || typeof content !== 'object') {
    return { success: false, error: 'ข้อมูล Observation Form ไม่ถูกต้อง' };
  }

  if (!Array.isArray(content.behaviors) || content.behaviors.length < 1) {
    return { success: false, error: 'ต้องมีพฤติกรรมเป้าหมายอย่างน้อย 1 รายการ' };
  }

  return {
    success: true,
    data: {
      title: content.title ? String(content.title).trim() : 'แบบบันทึกการสังเกต',
      notesPrompt: content.notesPrompt ? String(content.notesPrompt).trim() : undefined,
      behaviors: content.behaviors.map((b: any, i: number) => ({
        id: b.id ? String(b.id).trim() : `B${i + 1}`,
        targetBehavior: String(b.targetBehavior || '').trim(),
        lookFors: Array.isArray(b.lookFors) ? b.lookFors.map((lf: any) => String(lf).trim()) : [],
      })),
    },
  };
}

// 7. Exit Ticket Validator
export function validateExitTicketContent(content: any): ToolValidationResult {
  if (!content || typeof content !== 'object') {
    return { success: false, error: 'ข้อมูล Exit Ticket ไม่ถูกต้อง' };
  }

  if (!Array.isArray(content.prompts) || content.prompts.length < 1) {
    return { success: false, error: 'ต้องมีคำถาม Exit Ticket อย่างน้อย 1 ข้อ' };
  }

  return {
    success: true,
    data: {
      title: content.title ? String(content.title).trim() : 'ตั๋วออกจากห้องเรียน (Exit Ticket)',
      prompts: content.prompts.map((p: any) => ({
        question: String(p.question || '').trim(),
        expectedAnswer: p.expectedAnswer ? String(p.expectedAnswer).trim() : undefined,
        criteria: p.criteria ? String(p.criteria).trim() : undefined,
      })),
    },
  };
}

/**
 * Single Entrypoint to validate any tool content by toolType
 */
export function validateToolContent(
  toolType: string,
  content: unknown
): ToolValidationResult {
  switch (toolType) {
    case 'RUBRIC':
    case 'PERFORMANCE_RUBRIC':
    case 'PRODUCT_RUBRIC':
      return validateRubricContent(content);
    case 'CHECKLIST':
      return validateChecklistContent(content);
    case 'SCORING_GUIDE':
      return validateScoringGuideContent(content);
    case 'RATING_SCALE':
      return validateRatingScaleContent(content);
    case 'ANSWER_KEY':
      return validateAnswerKeyContent(content);
    case 'OBSERVATION_FORM':
      return validateObservationFormContent(content);
    case 'EXIT_TICKET':
      return validateExitTicketContent(content);
    default:
      return { success: true, data: content };
  }
}
