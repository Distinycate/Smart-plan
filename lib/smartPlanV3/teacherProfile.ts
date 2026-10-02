/**
 * Smart Plan V3 — Teacher & School Profile Management
 * 
 * Stores permanent teacher, school, affiliation, and academic context.
 * "ใส่ครั้งเดียว ใช้ไปตลอดทุกแผน" — Persisted in localStorage and auto-populated
 * into every new lesson plan and exported document.
 */

export interface TeacherProfile {
  teacherName: string;
  teacherPosition: string; // e.g. ครูผู้ช่วย, ครู, ครูชำนาญการ, ครูชำนาญการพิเศษ, ครูเชี่ยวชาญ
  schoolName: string;
  affiliation: string;    // e.g. สพม.สกลนคร, สพป.เชียงใหม่ เขต 1, สศศ., อปท.
  defaultSubjectKey: string; // e.g. 'ENGLISH'
  defaultGrade: string;      // e.g. 'ม.4'
  academicYear: string;      // e.g. '2567'
  semester: string;          // e.g. '1'
  defaultDurationMinutes: number; // e.g. 50 or 60
}

export const DEFAULT_TEACHER_PROFILE: TeacherProfile = {
  teacherName: 'นายทศพร ศรีพลพา',
  teacherPosition: 'ครูชำนาญการพิเศษ',
  schoolName: 'โรงเรียนเตรียมอุดมศึกษา ภาคตะวันออกเฉียงเหนือ',
  affiliation: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาสกลนคร',
  defaultSubjectKey: 'ENGLISH',
  defaultGrade: 'ม.4',
  academicYear: '2567',
  semester: '1',
  defaultDurationMinutes: 60,
};

const STORAGE_KEY = 'smart_plan_v3_teacher_profile';

export function getStoredTeacherProfile(): TeacherProfile {
  if (typeof window === 'undefined') {
    return DEFAULT_TEACHER_PROFILE;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TEACHER_PROFILE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_TEACHER_PROFILE,
      ...parsed,
    };
  } catch {
    return DEFAULT_TEACHER_PROFILE;
  }
}

export function saveStoredTeacherProfile(profile: Partial<TeacherProfile>): TeacherProfile {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_TEACHER_PROFILE, ...profile };
  }

  try {
    const current = getStoredTeacherProfile();
    const updated = { ...current, ...profile };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Dispatch custom event so all active components update reactively
    window.dispatchEvent(new Event('smart_plan_teacher_profile_updated'));
    return updated;
  } catch (err) {
    console.error('Failed to save teacher profile:', err);
    return { ...DEFAULT_TEACHER_PROFILE, ...profile };
  }
}
