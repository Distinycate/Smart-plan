import assert from 'node:assert/strict';
import {
  isCanonicalLessonPlan,
  preValidateLessonPlan,
  toCanonicalLessonPlan,
  validateAlignment,
  validateAssessment,
  validateGpas,
  type LessonPlan,
} from '../lib/lesson-plan';

const objectives = {
  knowledge: ['อธิบายผลของแรงต่อวัตถุได้'],
  process: ['ทดลองและบันทึกผลของแรงได้'],
  attitude: ['ทำงานร่วมกับผู้อื่นอย่างรับผิดชอบ'],
};
const objectiveList = [
  ...objectives.knowledge,
  ...objectives.process,
  ...objectives.attitude,
];
const indicatorCode = 'ว 2.2 ม.1/1';

const completePlan: LessonPlan = {
  id: 'PLAN-VALID',
  metadata: {
    subjectGroup: 'วิทยาศาสตร์และเทคโนโลยี',
    subjectName: 'วิทยาศาสตร์',
    subjectCode: 'ว21101',
    gradeLevel: 'ม.1',
    unitName: 'แรงและการเคลื่อนที่',
    lessonTitle: 'ผลของแรงต่อวัตถุ',
    totalHours: 2,
    teacherName: 'ครูตัวอย่าง',
    schoolName: 'โรงเรียนตัวอย่าง',
  },
  curriculum: {
    standards: [{
      code: 'ว 2.2',
      description: 'เข้าใจธรรมชาติของแรง',
    }],
    indicators: [{
      code: indicatorCode,
      description: 'อธิบายผลของแรงที่กระทำต่อวัตถุ',
      type: 'during',
    }],
    coreContent: ['แรงและผลของแรงต่อการเคลื่อนที่'],
  },
  essence: {
    mainConcept: 'แรงทำให้วัตถุเปลี่ยนสภาพการเคลื่อนที่',
  },
  objectives,
  competencies: [{
    name: 'ความสามารถในการคิด',
    observableBehaviors: ['วิเคราะห์ผลการทดลอง'],
    assessmentEvidence: ['ใบกิจกรรม'],
  }],
  desirableCharacteristics: [{
    name: 'มุ่งมั่นในการทำงาน',
    observableBehaviors: ['ทำงานตามบทบาท'],
    assessmentEvidence: ['แบบสังเกต'],
  }],
  learningActivities: [
    {
      step: 'Gathering: สังเกตสถานการณ์แรง',
      stepType: 'gathering',
      teacherRole: 'ครูตั้งคำถาม',
      studentRole: 'นักเรียนสังเกตและตอบคำถาม',
      activeLearningTechniques: ['questioning'],
      expectedEvidence: ['คำตอบจากการสังเกต'],
      relatedObjectives: objectiveList,
      relatedIndicators: [indicatorCode],
    },
    {
      step: 'Processing: วิเคราะห์ข้อมูล',
      stepType: 'processing',
      teacherRole: 'ครูอำนวยความสะดวก',
      studentRole: 'นักเรียนวิเคราะห์ข้อมูลเป็นกลุ่ม',
      activeLearningTechniques: ['collaborative_learning'],
      expectedEvidence: ['ตารางวิเคราะห์'],
      relatedObjectives: objectiveList,
      relatedIndicators: [indicatorCode],
    },
    {
      step: 'Applying: ทดลองแรง',
      stepType: 'applying',
      teacherRole: 'ครูดูแลความปลอดภัย',
      studentRole: 'นักเรียนทดลองและบันทึกผล',
      activeLearningTechniques: ['hands_on_learning'],
      expectedEvidence: ['รายงานผลการทดลอง'],
      relatedObjectives: objectiveList,
      relatedIndicators: [indicatorCode],
    },
    {
      step: 'Self-Regulating: สะท้อนผล',
      stepType: 'self_regulating',
      teacherRole: 'ครูให้คำถามสะท้อนคิด',
      studentRole: 'นักเรียนประเมินการเรียนรู้ของตน',
      activeLearningTechniques: ['reflection'],
      expectedEvidence: ['บันทึกสะท้อนคิด'],
      relatedObjectives: objectiveList,
      relatedIndicators: [indicatorCode],
    },
    {
      step: 'Communication: นำเสนอ',
      stepType: 'communication',
      teacherRole: 'ครูให้ข้อเสนอแนะ',
      studentRole: 'นักเรียนนำเสนอผลการทดลอง',
      activeLearningTechniques: ['presentation'],
      expectedEvidence: ['การนำเสนอ'],
      relatedObjectives: objectiveList,
      relatedIndicators: [indicatorCode],
    },
  ],
  activeLearning: {
    model: 'GPAS 5 Steps',
    techniques: ['hands_on_learning', 'collaborative_learning'],
    evidence: ['รายงานผลการทดลอง', 'การนำเสนอ'],
    studentCenteredEvidence: ['นักเรียนทดลอง วิเคราะห์ และนำเสนอ'],
  },
  gpas: {
    gathering: 'สังเกตและรวบรวมข้อมูล',
    processing: 'วิเคราะห์ข้อมูล',
    applying: 'ทดลองและประยุกต์',
    selfRegulating: 'สะท้อนและกำกับตนเอง',
    communication: 'นำเสนอและสื่อสาร',
  },
  media: [{
    name: 'ชุดทดลองแรง',
    type: 'equipment',
    purpose: 'ใช้ทดลองผลของแรงต่อวัตถุ',
    usedInActivityStep: 'Applying',
  }],
  assessment: {
    methods: objectiveList.map((objective, index) => ({
      name: `ประเมินจุดประสงค์ ${index + 1}`,
      type: 'for_learning',
      targetObjectives: [objective],
      targetIndicators: [indicatorCode],
    })),
    tools: objectiveList.map((objective, index) => ({
      name: `เครื่องมือ ${index + 1}`,
      type: index === 0 ? 'quiz' : 'observation',
      targetObjectives: [objective],
      criteria: ['ผ่านระดับดีขึ้นไป'],
    })),
    evidence: ['ใบกิจกรรม', 'รายงานผลการทดลอง'],
  },
  rubric: [{
    title: 'Rubric ผลการเรียนรู้',
    criteria: objectiveList.map(objective => ({
      name: objective,
      levels: [
        { score: 1, description: 'ต้องปรับปรุง' },
        { score: 2, description: 'พอใช้' },
        { score: 3, description: 'ดี' },
      ],
    })),
  }],
  reflection: {
    studentReflection: ['สิ่งที่เรียนรู้'],
    teacherReflection: ['ผลการจัดกิจกรรม'],
    improvementPlan: ['แนวทางปรับปรุง'],
  },
};

assert.equal(isCanonicalLessonPlan(completePlan), true);
assert.equal(toCanonicalLessonPlan(completePlan), completePlan);

const preBasic = preValidateLessonPlan(completePlan, 'lesson_plan_basic');
assert.equal(preBasic.ready, true);
assert.equal(preBasic.status, 'ready');
assert.deepEqual(preBasic.missingRequiredSections, []);

const gpas = validateGpas(completePlan);
assert.equal(gpas.complete, true);
assert.equal(gpas.score, 5);
assert.deepEqual(gpas.missingStages, []);

const assessment = validateAssessment(completePlan, 'wpa_w9');
assert.equal(assessment.valid, true);
assert.equal(assessment.hasRubric, true);
assert.deepEqual(assessment.uncoveredObjectives, []);

const alignment = validateAlignment(completePlan);
assert.equal(alignment.aligned, true);
assert.equal(alignment.score, 20);
assert.equal(alignment.matrix[0]?.status, 'complete');

const criticalPlan = structuredClone(completePlan);
criticalPlan.curriculum.standards = [];
criticalPlan.curriculum.indicators = [];
criticalPlan.objectives = {
  knowledge: [],
  process: [],
  attitude: [],
};
criticalPlan.learningActivities = [];
criticalPlan.assessment.methods = [];
criticalPlan.assessment.tools = [];

const criticalResult = preValidateLessonPlan(
  criticalPlan,
  'lesson_plan_basic'
);
assert.equal(criticalResult.ready, false);
assert.equal(criticalResult.status, 'lesson_plan_not_ready');
assert.ok(criticalResult.missingRequiredSections.includes('curriculum.standards'));
assert.ok(criticalResult.missingRequiredSections.includes('curriculum.indicators'));
assert.ok(criticalResult.missingRequiredSections.includes('objectives'));
assert.ok(criticalResult.missingRequiredSections.includes('learningActivities'));
assert.ok(criticalResult.missingRequiredSections.includes('assessment.methods'));
assert.ok(criticalResult.missingRequiredSections.includes('assessment.tools'));

const noRubricPlan = structuredClone(completePlan);
noRubricPlan.rubric = [];
const basicWithoutRubric = preValidateLessonPlan(
  noRubricPlan,
  'lesson_plan_basic'
);
const wpaWithoutRubric = preValidateLessonPlan(noRubricPlan, 'wpa_w9');
const committeeWithoutRubric = preValidateLessonPlan(
  noRubricPlan,
  'committee_4d'
);
assert.equal(basicWithoutRubric.ready, true);
assert.equal(wpaWithoutRubric.ready, false);
assert.equal(committeeWithoutRubric.ready, false);
assert.ok(wpaWithoutRubric.issues.some(issue =>
  issue.code === 'RUBRIC_REQUIRED_FOR_MODE'
  && issue.severity === 'critical'
));

const incompleteGpasPlan = structuredClone(completePlan);
incompleteGpasPlan.gpas = { gathering: 'รวบรวมข้อมูล' };
incompleteGpasPlan.learningActivities = incompleteGpasPlan.learningActivities
  .filter(activity => activity.stepType === 'gathering');
const incompleteGpas = validateGpas(incompleteGpasPlan);
assert.equal(incompleteGpas.complete, false);
assert.equal(incompleteGpas.missingStages.length, 4);

const assessmentGapPlan = structuredClone(completePlan);
assessmentGapPlan.assessment.methods[0].targetObjectives = [];
assessmentGapPlan.assessment.tools[0].targetObjectives = [];
const assessmentGap = validateAssessment(
  assessmentGapPlan,
  'lesson_plan_basic'
);
assert.equal(assessmentGap.valid, false);
assert.ok(assessmentGap.uncoveredObjectives.includes(objectives.knowledge[0]));

const legacy = toCanonicalLessonPlan({
  subjectName: 'วิทยาศาสตร์',
  gradeLevel: 'ม.1',
  unitName: 'แรง',
  lessonTopic: 'ผลของแรง',
  learningStandard: 'ว 2.2 เข้าใจธรรมชาติของแรง',
  indicatorDuring: `${indicatorCode} อธิบายผลของแรง`,
  objectiveK: objectives.knowledge[0],
  objectiveP: objectives.process[0],
  objectiveA: objectives.attitude[0],
  learningProcess: 'ครูตั้งคำถาม\nนักเรียนทดลองและนำเสนอ',
  methodK: 'ตรวจคำตอบ',
  toolK: 'แบบทดสอบ',
});
assert.equal(legacy.metadata.lessonTitle, 'ผลของแรง');
assert.equal(legacy.curriculum.indicators[0]?.type, 'during');

console.log('lesson plan validator tests passed');
