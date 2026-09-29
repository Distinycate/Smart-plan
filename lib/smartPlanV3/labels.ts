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

/**
 * Supported Activity Phases & Thai Labels
 */
export const PHASE_LABELS: Record<string, string> = {
  ENGAGE: 'ขั้นกระตุ้นความสนใจ (Engage / Warm-up)',
  EXPLORE: 'ขั้นสำรวจและค้นหา (Explore)',
  LEARN: 'ขั้นเรียนรู้ / ถ่ายทอดความรู้ (Learn)',
  MODEL: 'ขั้นสาธิต / เป็นแบบอย่าง (Model / Demo)',
  PRACTICE: 'ขั้นฝึกปฏิบัติ (Guided Practice)',
  APPLY: 'ขั้นประยุกต์ใช้ (Apply / Production)',
  PERFORM: 'ขั้นแสดงทักษะ / ปฏิบัติจริง (Performance)',
  DISCUSS: 'ขั้นอภิปรายแลกเปลี่ยน (Discussion)',
  INVESTIGATE: 'ขั้นสืบเสาะ / ทดลอง (Investigation)',
  CREATE: 'ขั้นสร้างสรรค์ชิ้นงาน (Creation)',
  ASSESS: 'ขั้นประเมินผล (Assessment)',
  REFLECT: 'ขั้นสะท้อนคิด (Reflection)',
  SUMMARIZE: 'ขั้นสรุปบทเรียน (Summarize / Wrap-up)',
  OTHER: 'ขั้นอื่นๆ (Other)',
};

export const PHASE_BADGE_COLORS: Record<string, string> = {
  ENGAGE: 'bg-amber-100 text-amber-800 border-amber-300',
  EXPLORE: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  LEARN: 'bg-blue-100 text-blue-800 border-blue-300',
  MODEL: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  PRACTICE: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  APPLY: 'bg-teal-100 text-teal-800 border-teal-300',
  PERFORM: 'bg-purple-100 text-purple-800 border-purple-300',
  DISCUSS: 'bg-sky-100 text-sky-800 border-sky-300',
  INVESTIGATE: 'bg-rose-100 text-rose-800 border-rose-300',
  CREATE: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
  ASSESS: 'bg-orange-100 text-orange-800 border-orange-300',
  REFLECT: 'bg-violet-100 text-violet-800 border-violet-300',
  SUMMARIZE: 'bg-slate-100 text-slate-800 border-slate-300',
  OTHER: 'bg-gray-100 text-gray-800 border-gray-300',
};

export function getPhaseLabel(phase: string): string {
  return PHASE_LABELS[phase] || phase;
}

export function getPhaseBadgeColor(phase: string): string {
  return PHASE_BADGE_COLORS[phase] || 'bg-gray-100 text-gray-800 border-gray-300';
}
