import assert from 'node:assert/strict';
import {
  EVALUATION_MODES,
  LESSON_PLAN_JSON_SCHEMA,
  LESSON_PLAN_SCHEMA_VERSION,
  MASTER_RUBRICS,
  createLessonPlanHash,
  getEvaluationMode,
  getEvaluationRubric,
  getRubricMaxScore,
  isEvaluationMode,
  normalizeLegacyLessonPlan,
  stableStringify,
  type EvaluationMode,
  type LessonPlan,
} from '../lib/lesson-plan';

const legacyPlan = {
  planId: 'PLAN-001',
  teacherName: 'ครูตัวอย่าง',
  schoolName: 'โรงเรียนตัวอย่าง',
  learningArea: 'วิทยาศาสตร์และเทคโนโลยี',
  subjectName: 'วิทยาศาสตร์',
  subjectCode: 'ว21101',
  gradeLevel: 'ม.1',
  unitName: 'แรงและการเคลื่อนที่',
  lessonTopic: 'ผลของแรงต่อวัตถุ',
  totalHours: 2,
  learningStandard: 'มาตรฐาน ว 2.2 เข้าใจธรรมชาติของแรง',
  indicatorDuring: 'ว 2.2 ม.1/1 อธิบายผลของแรงที่กระทำต่อวัตถุ',
  indicatorFinal: 'ว 2.2 ม.1/2 เขียนแผนภาพแรงที่กระทำต่อวัตถุ',
  essentialConcept: 'แรงทำให้วัตถุเปลี่ยนสภาพการเคลื่อนที่',
  learningContent: '- ความหมายของแรง\n- ผลของแรง',
  objectiveK: 'อธิบายผลของแรงได้',
  objectiveP: 'ทดลองและเขียนแผนภาพแรงได้',
  objectiveA: 'ทำงานร่วมกับผู้อื่นอย่างรับผิดชอบ',
  competencies: '- ความสามารถในการคิด\n- ความสามารถในการแก้ปัญหา',
  desiredAttributes: '- ใฝ่เรียนรู้\n- มุ่งมั่นในการทำงาน',
  learningProcess: [
    'ขั้นนำ ครูตั้งคำถามจากสถานการณ์ใกล้ตัว',
    'ขั้นสอน นักเรียนทดลองแรงผลักและแรงดึงเป็นกลุ่ม',
    'ขั้นสรุป นักเรียนนำเสนอและสะท้อนผลการเรียนรู้',
  ].join('\n'),
  learningMedia: '- แบบจำลอง\n- ใบกิจกรรม',
  learningSources: '- ห้องปฏิบัติการ\n- หนังสือเรียน',
  tasks: '- รายงานผลการทดลอง\n- แผนภาพแรง',
  measureK: 'คำตอบเรื่องผลของแรง',
  methodK: 'ตรวจใบกิจกรรม',
  toolK: 'แบบทดสอบ',
  criteriaK: 'ผ่านร้อยละ 60',
  rubricK: 'อธิบายผลของแรงได้ถูกต้อง',
  measureP: 'ผลการทดลอง',
  methodP: 'สังเกตการปฏิบัติ',
  toolP: 'แบบสังเกต',
  criteriaP: 'ระดับดีขึ้นไป',
  rubricP: 'ปฏิบัติการทดลองตามขั้นตอน',
  measureA: 'พฤติกรรมการทำงานกลุ่ม',
  methodA: 'สังเกตพฤติกรรม',
  toolA: 'แบบตรวจสอบรายการ',
  criteriaA: 'ระดับดีขึ้นไป',
  rubricA: 'รับผิดชอบบทบาทของตน',
  resultK: 'นักเรียนอธิบายผลของแรงได้',
  problems: 'เวลาอภิปรายไม่เพียงพอ',
  solutions: 'ปรับเวลาแต่ละกิจกรรมให้ชัดเจน',
};

const normalized = normalizeLegacyLessonPlan(legacyPlan);

assert.equal(normalized.id, 'PLAN-001');
assert.equal(normalized.aiMetadata?.schemaVersion, LESSON_PLAN_SCHEMA_VERSION);
assert.equal(normalized.metadata.lessonTitle, 'ผลของแรงต่อวัตถุ');
assert.equal(normalized.metadata.totalHours, 2);
assert.equal(normalized.curriculum.standards[0]?.code, 'ว 2.2');
assert.equal(normalized.curriculum.indicators[0]?.code, 'ว 2.2 ม.1/1');
assert.equal(normalized.curriculum.indicators[0]?.type, 'during');
assert.equal(normalized.curriculum.indicators[1]?.type, 'terminal');
assert.deepEqual(normalized.objectives.knowledge, ['อธิบายผลของแรงได้']);
assert.equal(normalized.learningActivities.length, 1);
assert.match(normalized.learningActivities[0]?.teacherRole || '', /ครู/);
assert.match(normalized.learningActivities[0]?.studentRole || '', /นักเรียน/);
assert.equal(normalized.media.filter(item => item.type === 'learning_source').length, 2);
assert.equal(normalized.assessment.methods.length, 3);
assert.equal(normalized.assessment.tools.length, 3);
assert.equal(normalized.rubric.length, 3);
assert.equal(normalized.reflection?.improvementPlan?.[0], 'ปรับเวลาแต่ละกิจกรรมให้ชัดเจน');

const reordered = JSON.parse(JSON.stringify(normalized)) as LessonPlan;
reordered.metadata = {
  totalHours: normalized.metadata.totalHours,
  lessonTitle: normalized.metadata.lessonTitle,
  unitName: normalized.metadata.unitName,
  gradeLevel: normalized.metadata.gradeLevel,
  subjectCode: normalized.metadata.subjectCode,
  subjectName: normalized.metadata.subjectName,
  subjectGroup: normalized.metadata.subjectGroup,
  teacherName: normalized.metadata.teacherName,
  schoolName: normalized.metadata.schoolName,
  planNumber: normalized.metadata.planNumber,
};

assert.equal(stableStringify(normalized), stableStringify(reordered));
assert.equal(createLessonPlanHash(normalized), createLessonPlanHash(reordered));
assert.match(createLessonPlanHash(normalized), /^[a-f0-9]{64}$/);

const modes = Object.keys(EVALUATION_MODES) as EvaluationMode[];
assert.deepEqual(modes, ['lesson_plan_basic', 'wpa_w9', 'committee_4d']);
assert.equal(isEvaluationMode('wpa_w9'), true);
assert.equal(isEvaluationMode('unknown'), false);
assert.equal(getEvaluationMode('committee_4d').sections.length, 4);

for (const mode of modes) {
  const rubric = getEvaluationRubric(mode);
  assert.equal(rubric.mode, mode);
  assert.equal(rubric.totalScore, 100);
  assert.equal(getRubricMaxScore(rubric), 100);
  assert.deepEqual(
    rubric.criteria.map(criterion => criterion.key),
    [...EVALUATION_MODES[mode].sections]
  );

  for (const criterion of rubric.criteria) {
    assert.ok(criterion.requiredEvidence.length > 0);
    assert.ok(criterion.anchors.length >= 4);
    assert.equal(criterion.anchors[0]?.score, 0);
    assert.equal(
      criterion.anchors[criterion.anchors.length - 1]?.score,
      criterion.maxScore
    );
    assert.ok(criterion.anchors.every(anchor =>
      anchor.score >= 0 && anchor.score <= criterion.maxScore
    ));
  }
}

assert.equal(LESSON_PLAN_JSON_SCHEMA.type, 'object');
assert.ok(LESSON_PLAN_JSON_SCHEMA.required.includes('assessment'));
assert.ok(MASTER_RUBRICS.lesson_plan_basic.criteria.length > 0);

console.log('lesson plan foundation tests passed');
