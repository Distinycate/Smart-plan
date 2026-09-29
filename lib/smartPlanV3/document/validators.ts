/**
 * Smart Plan V3 — Canonical Document Model Validator
 *
 * Validates integrity of V3LessonDocument before preview or export:
 * - Metadata complete
 * - Section IDs unique
 * - Appendix IDs unique
 * - Sequential normalized appendix letters (ก, ข, ค, ...)
 * - Zero raw technical enum leakage in user-facing text
 * - Zero database UUID leakage in user-facing text
 * - JSON serializable
 */

import type { V3LessonDocument } from './types';
import { THAI_APPENDIX_LETTERS } from './labels';

export interface DocumentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Disallowed internal enums that must NOT leak into user-facing text
const FORBIDDEN_TECHNICAL_ENUMS = [
  'PERFORMANCE_RUBRIC',
  'SCORING_GUIDE',
  'CHECKLIST',
  'OBSERVATION_FORM',
  'PACKAGE_READY',
  'BLUEPRINT_READY',
  'EVIDENCED',
  'PARTIALLY_EVIDENCED',
  'NOT_EVIDENCED',
  'STUDENT_A_B',
  'ROLE_PLAY',
  'INFO_GAP',
  'WORK_SHEET',
  'PROBLEM_SET',
  'EXPERIMENT_SHEET',
  'TASK_CARD',
  'EXIT_TICKET',
];

// UUID regex to ensure internal DB UUIDs do not leak into visible headings or bullet text
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

export function validateLessonDocumentModel(doc: V3LessonDocument): DocumentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. JSON serializability check
  try {
    const serialized = JSON.stringify(doc);
    if (!serialized || serialized.length < 100) {
      errors.push('เอกสารมีขนาดเล็กเกินไปหรือไม่สามารถแปลงเป็น JSON ได้');
    }
  } catch (err: any) {
    errors.push(`เอกสารไม่สามารถทำ JSON.stringify ได้: ${err.message}`);
    return { valid: false, errors, warnings };
  }

  // 2. Metadata completeness
  if (!doc.metadata) {
    errors.push('ไม่มีข้อมูล Metadata ของเอกสาร');
    return { valid: false, errors, warnings };
  }
  if (!doc.metadata.lessonId) errors.push('Metadata ขาด lessonId');
  if (!doc.metadata.topic) errors.push('Metadata ขาด topic');
  if (!doc.metadata.subject) errors.push('Metadata ขาด subject');
  if (!doc.metadata.grade) errors.push('Metadata ขาด grade');
  if (!doc.metadata.durationMinutes || doc.metadata.durationMinutes <= 0) {
    errors.push('Metadata ขาด durationMinutes ที่ถูกต้อง');
  }

  // 3. Section IDs uniqueness
  const sectionIdSet = new Set<string>();
  for (const sec of doc.sections || []) {
    if (!sec.id) {
      errors.push(`Section ขาด ID: ${sec.title || sec.type}`);
    } else if (sectionIdSet.has(sec.id)) {
      errors.push(`Section ID ซ้ำกัน: "${sec.id}"`);
    } else {
      sectionIdSet.add(sec.id);
    }
  }

  // 4. Appendix IDs uniqueness and sequential lettering
  const appendixIdSet = new Set<string>();
  const appendices = doc.appendices || [];
  for (let idx = 0; idx < appendices.length; idx++) {
    const app = appendices[idx];
    if (!app.id) {
      errors.push(`ภาคผนวกลำดับที่ ${idx + 1} ขาด ID`);
    } else if (appendixIdSet.has(app.id)) {
      errors.push(`Appendix ID ซ้ำกัน: "${app.id}"`);
    } else {
      appendixIdSet.add(app.id);
    }

    // Check sequential Thai lettering
    const expectedLetter = THAI_APPENDIX_LETTERS[idx] || String(idx + 1);
    if (app.letter !== expectedLetter) {
      errors.push(
        `ลำดับอักษรภาคผนวกไม่ต่อเนื่อง: ลำดับที่ ${idx + 1} คาดหวัง "${expectedLetter}" แต่ได้ "${app.letter}"`
      );
    }
  }

  // 5. Technical enum leakage check in user-visible content
  function checkTextForLeaks(text: string, pathDescription: string) {
    if (!text || typeof text !== 'string') return;
    for (const forbidden of FORBIDDEN_TECHNICAL_ENUMS) {
      if (text.includes(forbidden)) {
        errors.push(`พบ Technical Enum "${forbidden}" รั่วไหลใน ${pathDescription}: "${text.substring(0, 60)}"`);
      }
    }
    // Check UUID leakage in user-visible headings or statements
    if (UUID_REGEX.test(text)) {
      errors.push(`พบ Database UUID รั่วไหลใน ${pathDescription}: "${text.substring(0, 60)}"`);
    }
  }

  // Inspect sections
  for (const sec of doc.sections || []) {
    if (sec.title) {
      checkTextForLeaks(sec.title, `Section Title (${sec.id})`);
    }
    if (sec.type === 'paragraph') {
      checkTextForLeaks(sec.content, `Paragraph (${sec.id})`);
    } else if (sec.type === 'bulletList') {
      for (const item of sec.items) {
        checkTextForLeaks(item.text, `Bullet Item in (${sec.id})`);
      }
    } else if (sec.type === 'activityTimeline') {
      for (const row of sec.rows) {
        checkTextForLeaks(row.title, `Activity Title in (${sec.id})`);
        checkTextForLeaks(row.teacherActions, `Activity Teacher Actions in (${sec.id})`);
        checkTextForLeaks(row.studentActions, `Activity Student Actions in (${sec.id})`);
      }
    } else if (sec.type === 'assessment') {
      for (const row of sec.rows) {
        checkTextForLeaks(row.method, `Assessment Method in (${sec.id})`);
        checkTextForLeaks(row.toolName, `Assessment Tool Name in (${sec.id})`);
        checkTextForLeaks(row.criteria, `Assessment Criteria in (${sec.id})`);
      }
    }
  }

  // Inspect appendices
  for (const app of doc.appendices || []) {
    checkTextForLeaks(app.title, `Appendix Title (${app.id})`);
    for (const item of app.items) {
      checkTextForLeaks(item.title, `Appendix Item Title (${item.id})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
