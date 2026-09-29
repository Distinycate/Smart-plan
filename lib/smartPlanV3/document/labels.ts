/**
 * Smart Plan V3 — Canonical Document Labels
 * Central Thai display labels for document rendering.
 * Strictly 0 AI calls, zero external dependencies.
 */

export const THAI_APPENDIX_LETTERS = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ฌ', 'ญ'];

export const APPENDIX_CATEGORY_LABELS: Record<string, string> = {
  STUDENT_ASSETS: 'ใบงานและสื่อการเรียนรู้สำหรับผู้เรียน',
  ANSWER_KEYS: 'เฉลยและแนวคำตอบ',
  ASSESSMENT_TOOLS: 'เครื่องมือวัดและประเมินผลการเรียนรู้',
  TEACHER_GUIDE: 'คู่มือครูและเอกสารประกอบการจัดการเรียนรู้',
  PA_READINESS: 'รายงานผลการตรวจความสอดคล้องตามองค์ประกอบการประเมิน (PA)',
};

export const ASSET_TYPE_LABELS: Record<string, string> = {
  WORKSHEET: 'ใบงาน / แบบฝึกหัด (Worksheet)',
  PROBLEM_SET: 'ชุดโจทย์สถานการณ์ปัญหา (Problem Set)',
  SPEAKING_CARD: 'บัตรฝึกการสื่อสาร / บทบาทสมมติ (Speaking Card)',
  EXPERIMENT_SHEET: 'ใบกิจกรรมการทดลอง / ปฏิบัติการ (Experiment Sheet)',
  DATA_TABLE: 'ตารางบันทึกผลการทดลอง (Data Table)',
  TASK_CARD: 'บัตรคำสั่ง / สถานีฝึกทักษะ (Task Card)',
  FLASHCARD: 'บัตรภาพ / บัตรคำ (Flashcard)',
  EXIT_TICKET: 'ตั๋วออก / แบบสรุปการเรียนรู้ (Exit Ticket)',
  TEACHER_GUIDE: 'คู่มือและแนวทางการสอนสำหรับครู (Teacher Guide)',
  ANSWER_KEY: 'เฉลยและแนวคำตอบ (Answer Key)',
};

export const AUDIENCE_LABELS: Record<string, string> = {
  STUDENT: 'สำหรับผู้เรียน',
  TEACHER: 'สำหรับครูผู้สอน',
  BOTH: 'สำหรับครูและผู้เรียน',
};

export const ASSESSMENT_TOOL_TYPE_LABELS: Record<string, string> = {
  RUBRIC: 'เกณฑ์การประเมินแบบรูบริก (Rubric)',
  PERFORMANCE_RUBRIC: 'เกณฑ์การประเมินทักษะการปฏิบัติ (Performance Rubric)',
  CHECKLIST: 'แบบสำรวจรายการ (Checklist)',
  SCORING_GUIDE: 'แนวทางการให้คะแนน (Scoring Guide)',
  RATING_SCALE: 'แบบมาตราส่วนประมาณค่า (Rating Scale)',
  OBSERVATION_FORM: 'แบบบันทึกการสังเกต (Observation Form)',
  ANSWER_KEY: 'เฉลยและเกณฑ์การให้คะแนน (Answer Key & Criteria)',
};

export const ASSESSMENT_METHOD_LABELS: Record<string, string> = {
  OBSERVATION: 'การสังเกตพฤติกรรมและการมีส่วนร่วม',
  PRODUCT_CHECK: 'การตรวจผลงาน / ชิ้นงาน / ใบงาน',
  PERFORMANCE_EXAM: 'การประเมินการปฏิบัติจริง / การแสดงทักษะ',
  TESTING: 'การทดสอบ / การตอบคำถาม',
  PORTFOLIO: 'การประเมินแฟ้มสะสมงาน',
  SELF_PEER: 'การประเมินตนเองและเพื่อนประเมิน',
  DOCUMENT_ANALYSIS: 'การตรวจผลงาน / เอกสาร / แบบฝึกหัด',
  WRITTEN_TEST: 'การทดสอบข้อเขียน / แบบทดสอบ',
  INTERVIEW: 'การสัมภาษณ์ / การสนทนาซักถาม',
  PRESENTATION: 'การนำเสนอผลงาน / การอภิปราย',
  PRACTICAL_EXAM: 'การสอบปฏิบัติการทดลอง / การปฏิบัติจริง',
};

export const SECTION_TITLES = {
  METADATA: 'ข้อมูลทั่วไปแผนการจัดการเรียนรู้',
  CURRICULUM: 'มาตรฐานการเรียนรู้และตัวชี้วัด',
  KEY_CONCEPT: 'สาระสำคัญ / ความคิดรวบยอด',
  OBJECTIVES: 'จุดประสงค์การเรียนรู้',
  CONTENTS: 'สาระการเรียนรู้',
  EVIDENCE: 'หลักฐานและภาระงานการเรียนรู้ของผู้เรียน',
  PROCESS: 'กระบวนการจัดการเรียนรู้',
  MEDIA: 'สื่อและแหล่งการเรียนรู้',
  EVALUATION: 'การวัดและประเมินผลการเรียนรู้',
  POST_TEACHING: 'บันทึกหลังการจัดการเรียนรู้',
} as const;

export function getAppendixCategoryLabel(category: string): string {
  return APPENDIX_CATEGORY_LABELS[category] || category;
}

export function getAssetTypeLabel(assetType: string): string {
  return ASSET_TYPE_LABELS[assetType] || assetType;
}

export function getAudienceLabel(audience: string): string {
  return AUDIENCE_LABELS[audience] || audience;
}

export function getAssessmentToolTypeLabel(toolType: string): string {
  return ASSESSMENT_TOOL_TYPE_LABELS[toolType] || toolType;
}

export function getAssessmentMethodLabel(method: string): string {
  if (ASSESSMENT_METHOD_LABELS[method]) {
    return ASSESSMENT_METHOD_LABELS[method];
  }
  // Prevent raw uppercase enum leakage
  if (/^[A-Z0-9_]+$/.test(method)) {
    return 'การประเมินผลตามสภาพจริง';
  }
  return method;
}
