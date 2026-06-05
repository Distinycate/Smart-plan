const VALID_PLAN_STATUSES = ['draft', 'complete', 'archived', 'ai_fixed'];

const FIELD_LABELS: Record<string, string> = {
  teacherName: 'ชื่อครูผู้สอน',
  schoolName: 'โรงเรียน',
  organization: 'สังกัด',
  headerGradeLevel: 'ระดับชั้นบนหัวเอกสาร',
  gradeLevel: 'ระดับชั้น',
  subjectName: 'รายวิชา',
  semester: 'ภาคเรียน',
  academicYear: 'ปีการศึกษา',
  lessonTopic: 'เรื่องที่สอน',
  totalHours: 'จำนวนชั่วโมง',
  unitName: 'หน่วยการเรียนรู้',
  learningStandard: 'มาตรฐานการเรียนรู้',
  essentialConcept: 'สาระสำคัญ',
  objectiveK: 'จุดประสงค์ด้านความรู้',
  objectiveP: 'จุดประสงค์ด้านทักษะกระบวนการ',
  objectiveA: 'จุดประสงค์ด้านคุณลักษณะ',
  learningProcess: 'กระบวนการจัดการเรียนรู้',
  measureK: 'สิ่งที่วัดด้าน K',
  methodK: 'วิธีวัดด้าน K',
  toolK: 'เครื่องมือวัดด้าน K',
  criteriaK: 'เกณฑ์ประเมินด้าน K',
  measureP: 'สิ่งที่วัดด้าน P',
  methodP: 'วิธีวัดด้าน P',
  toolP: 'เครื่องมือวัดด้าน P',
  criteriaP: 'เกณฑ์ประเมินด้าน P',
  measureA: 'สิ่งที่วัดด้าน A',
  methodA: 'วิธีวัดด้าน A',
  toolA: 'เครื่องมือวัดด้าน A',
  criteriaA: 'เกณฑ์ประเมินด้าน A',
};

const DRAFT_REQUIRED_FIELDS = [
  'teacherName',
  'schoolName',
  'organization',
  'subjectName',
  'semester',
  'academicYear',
  'lessonTopic',
];

const COMPLETE_REQUIRED_FIELDS = [
  'unitName',
  'learningStandard',
  'essentialConcept',
  'objectiveK',
  'objectiveP',
  'objectiveA',
  'learningProcess',
  'measureK',
  'methodK',
  'toolK',
  'criteriaK',
  'measureP',
  'methodP',
  'toolP',
  'criteriaP',
  'measureA',
  'methodA',
  'toolA',
  'criteriaA',
];

const isBlank = (value: any) => {
  if (value === undefined || value === null) return true;
  return String(value).trim() === '';
};

const labelMissing = (fields: string[]) =>
  fields.map(field => FIELD_LABELS[field] || field).join(', ');

export function validateLessonPlanPayload(payload: Record<string, any>, targetStatus?: string) {
  const planStatus = targetStatus || payload.planStatus || 'draft';

  if (!VALID_PLAN_STATUSES.includes(planStatus)) {
    return 'สถานะแผนไม่ถูกต้อง';
  }

  if (planStatus === 'archived') {
    return null;
  }

  const missingDraftFields = DRAFT_REQUIRED_FIELDS.filter(field => isBlank(payload[field]));
  if (isBlank(payload.headerGradeLevel) && isBlank(payload.gradeLevel)) {
    missingDraftFields.push('headerGradeLevel');
  }

  if (missingDraftFields.length > 0) {
    return `กรุณากรอกข้อมูลจำเป็นสำหรับบันทึกแบบร่าง: ${labelMissing(missingDraftFields)}`;
  }

  const hours = Number(payload.totalHours);
  if (!Number.isFinite(hours) || hours < 1) {
    return 'จำนวนชั่วโมงต้องเป็นตัวเลขและมากกว่าหรือเท่ากับ 1';
  }

  if (planStatus !== 'complete') {
    return null;
  }

  const missingCompleteFields = COMPLETE_REQUIRED_FIELDS.filter(field => isBlank(payload[field]));
  if (missingCompleteFields.length > 0) {
    return `กรุณากรอกข้อมูลจำเป็นสำหรับบันทึกสมบูรณ์: ${labelMissing(missingCompleteFields)}`;
  }

  if (isBlank(payload.indicatorDuring) && isBlank(payload.indicatorFinal)) {
    return 'กรุณาระบุตัวชี้วัดระหว่างทางหรือตัวชี้วัดปลายทางอย่างน้อย 1 รายการ';
  }

  return null;
}
