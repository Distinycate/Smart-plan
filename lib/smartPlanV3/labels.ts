/**
 * Smart Plan V3 — Display Label Utilities
 * Maps internal enum keys to Thai display labels for UI rendering.
 * All labels come from configuration — no AI calls.
 */

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'ฉบับร่าง',
  BLUEPRINT_READY: 'บลูปรินต์พร้อม',
  PACKAGE_READY: 'ชุดพร้อมสอน',
  REVIEWED: 'ผ่านการตรวจแล้ว',
  FINAL: 'ฉบับสมบูรณ์',
  TAUGHT: 'สอนแล้ว',
  REFLECTED: 'สะท้อนผลแล้ว',
};

export const SUBJECT_LABELS: Record<string, string> = {
  THAI: 'ภาษาไทย',
  MATHEMATICS: 'คณิตศาสตร์',
  SCIENCE: 'วิทยาศาสตร์และเทคโนโลยี',
  SOCIAL_STUDIES: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
  HEALTH: 'สุขศึกษา',
  PHYSICAL_EDUCATION: 'พลศึกษา',
  HEALTH_AND_PE: 'สุขศึกษาและพลศึกษา',
  ART: 'ศิลปะ',
  CAREER: 'การงานอาชีพ',
  FOREIGN_LANGUAGE: 'ภาษาต่างประเทศ',
  ENGLISH: 'ภาษาต่างประเทศ (ภาษาอังกฤษ)',
};

/**
 * Map subject nameTh from curriculum API to profile key.
 * This is the authoritative mapping — used by UI dropdowns.
 */
export const SUBJECT_NAME_TO_KEY: Record<string, string> = {
  'ภาษาไทย': 'THAI',
  'คณิตศาสตร์': 'MATHEMATICS',
  'วิทยาศาสตร์และเทคโนโลยี': 'SCIENCE',
  'สังคมศึกษา ศาสนาและวัฒนธรรม': 'SOCIAL_STUDIES',
  'สังคมศึกษา ศาสนา และวัฒนธรรม': 'SOCIAL_STUDIES',
  'สุขศึกษาและพลศึกษา': 'HEALTH_AND_PE',
  'ศิลปะ': 'ART',
  'การงานอาชีพ': 'CAREER',
  'ภาษาต่างประเทศ (ภาษาอังกฤษ)': 'ENGLISH',
  'ภาษาต่างประเทศ': 'ENGLISH',
};

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function getSubjectLabel(subjectKey: string): string {
  return SUBJECT_LABELS[subjectKey] || subjectKey;
}

export function subjectNameToKey(nameTh: string): string {
  return SUBJECT_NAME_TO_KEY[nameTh] || nameTh.toUpperCase().replace(/\s+/g, '_');
}

/** Format duration for display */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} นาที`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} ชั่วโมง ${m} นาที` : `${h} ชั่วโมง`;
}

/** Format Thai date from ISO string */
export function formatThaiDate(isoDate: string | null): string {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return isoDate;
  }
}

/** Save state display labels */
export const SAVE_STATE_LABELS = {
  idle: '',
  saving: 'กำลังบันทึก...',
  saved: 'บันทึกแล้ว ✓',
  error: 'บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง',
  dirty: 'ยังไม่ได้บันทึก',
} as const;

export type SaveState = keyof typeof SAVE_STATE_LABELS;
