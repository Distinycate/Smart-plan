import assert from 'node:assert/strict';
import {
  EVALUATION_MODES,
  EVALUATION_SECTION_RESULT_JSON_SCHEMA,
  aggregateScore,
  buildSectionEvaluationPrompt,
  checkEvaluationConsistency,
  evaluateSection,
  getEvaluationRubric,
  getModeSectionDefinitions,
  getRubricCriterion,
  prioritizeIssues,
  safeParseEvaluationJson,
  validateEvaluationResult,
  type EvaluationSectionResult,
  type LessonPlan,
} from '../lib/lesson-plan';

const plan: LessonPlan = {
  metadata: {
    subjectGroup: 'วิทยาศาสตร์และเทคโนโลยี',
    subjectName: 'SUBJECT_SECRET_NOT_FOR_ACTIVITY',
    gradeLevel: 'ม.1',
    unitName: 'แรง',
    lessonTitle: 'ผลของแรง',
    totalHours: 1,
    teacherName: 'TEACHER_SECRET_NOT_FOR_ACTIVITY',
  },
  curriculum: {
    standards: [{ code: 'ว 2.2', description: 'เข้าใจธรรมชาติของแรง' }],
    indicators: [{
      code: 'ว 2.2 ม.1/1',
      description: 'อธิบายผลของแรง',
      type: 'during',
    }],
    coreContent: ['แรงและการเคลื่อนที่'],
  },
  essence: { mainConcept: 'แรงเปลี่ยนการเคลื่อนที่ของวัตถุ' },
  objectives: {
    knowledge: ['อธิบายผลของแรงได้'],
    process: ['ทดลองผลของแรงได้'],
    attitude: ['ทำงานร่วมกันอย่างรับผิดชอบ'],
  },
  competencies: [],
  desirableCharacteristics: [],
  learningActivities: [{
    step: 'ทดลองและอภิปราย',
    stepType: 'applying',
    teacherRole: 'ครูเตรียมอุปกรณ์',
    studentRole: 'นักเรียนทดลองเป็นกลุ่ม',
    activeLearningTechniques: ['hands_on_learning'],
    expectedEvidence: ['รายงานผล'],
    relatedObjectives: ['ทดลองผลของแรงได้'],
    relatedIndicators: ['ว 2.2 ม.1/1'],
  }],
  activeLearning: {
    techniques: ['hands_on_learning'],
    evidence: ['รายงานผล'],
  },
  gpas: {
    gathering: 'สังเกต',
    processing: 'วิเคราะห์',
    applying: 'ทดลอง',
    selfRegulating: 'สะท้อน',
    communication: 'นำเสนอ',
  },
  media: [{ name: 'ชุดทดลอง', purpose: 'ใช้ทดลองแรง' }],
  assessment: {
    methods: [{
      name: 'สังเกตและตรวจผลงาน',
      type: 'for_learning',
      targetObjectives: [
        'อธิบายผลของแรงได้',
        'ทดลองผลของแรงได้',
        'ทำงานร่วมกันอย่างรับผิดชอบ',
      ],
      targetIndicators: ['ว 2.2 ม.1/1'],
    }],
    tools: [{
      name: 'Rubric รายงาน',
      type: 'rubric',
      targetObjectives: [
        'อธิบายผลของแรงได้',
        'ทดลองผลของแรงได้',
        'ทำงานร่วมกันอย่างรับผิดชอบ',
      ],
    }],
    evidence: ['รายงานผล'],
  },
  rubric: [{
    title: 'Rubric รายงาน',
    criteria: [{
      name: 'ความถูกต้อง',
      levels: [{ score: 1, description: 'ต้องปรับปรุง' }],
    }],
  }],
};

for (const mode of Object.keys(EVALUATION_MODES) as Array<keyof typeof EVALUATION_MODES>) {
  const definitions = getModeSectionDefinitions(mode);
  const rubric = getEvaluationRubric(mode);
  assert.deepEqual(
    definitions.map(definition => definition.key),
    rubric.criteria.map(criterion => criterion.key)
  );
}

const activeCriterion = getRubricCriterion(
  'lesson_plan_basic',
  'active_learning'
);
assert.ok(activeCriterion);
const activePrompt = buildSectionEvaluationPrompt({
  plan,
  mode: 'lesson_plan_basic',
  section: 'active_learning',
  criterion: activeCriterion!,
  ruleBasedFindings: {
    gpas: { complete: true },
    unrelatedSecret: 'RULE_SECRET_NOT_FOR_ACTIVITY',
  },
});
assert.match(activePrompt, /hands_on_learning/);
assert.match(activePrompt, /"gpas"/);
assert.doesNotMatch(activePrompt, /TEACHER_SECRET_NOT_FOR_ACTIVITY/);
assert.doesNotMatch(activePrompt, /SUBJECT_SECRET_NOT_FOR_ACTIVITY/);
assert.doesNotMatch(activePrompt, /RULE_SECRET_NOT_FOR_ACTIVITY/);

const structureCriterion = getRubricCriterion(
  'lesson_plan_basic',
  'structure'
)!;
const validStructure: EvaluationSectionResult = {
  section: 'structure',
  score: 6,
  max_score: 10,
  level: 'fair',
  evidence_found: ['metadata', 'objectives'],
  missing_evidence: ['assessment'],
  strengths: ['มีข้อมูลพื้นฐาน'],
  weaknesses: ['assessment ยังไม่ครบ'],
  suggestions: ['เพิ่ม assessment'],
  issues: [{
    severity: 'medium',
    issue_type: 'structure_gap',
    title: 'โครงสร้างยังไม่ครบ',
    description: 'ขาดรายละเอียด assessment',
    suggestion: 'เพิ่ม assessment',
    auto_fixable: false,
  }],
  reason: 'พบโครงสร้างส่วนใหญ่',
};

assert.deepEqual(
  validateEvaluationResult(validStructure, {
    section: 'structure',
    criterion: structureCriterion,
  }),
  validStructure
);
assert.deepEqual(
  safeParseEvaluationJson(`\`\`\`json\n${JSON.stringify(validStructure)}\n\`\`\``),
  validStructure
);
assert.throws(() => validateEvaluationResult(
  { ...validStructure, score: 7 },
  { section: 'structure', criterion: structureCriterion }
), /anchor/);

async function runAsyncTests() {
let transportCalls = 0;
const repaired = await evaluateSection({
  plan,
  mode: 'lesson_plan_basic',
  section: 'structure',
}, {
  transport: async request => {
    transportCalls += 1;
    assert.ok(request.timeoutMs > 0 && request.timeoutMs <= 43_000);
    if (request.attempt === 1) return 'not-json';
    assert.match(request.prompt, /คำตอบก่อนหน้าไม่ผ่าน validation/);
    return validStructure;
  },
});
assert.equal(transportCalls, 2);
assert.equal(repaired.attempts, 2);
assert.equal(repaired.result.score, 6);

let consistencyCalls = 0;
const consistencyRecovered = await evaluateSection({
  plan,
  mode: 'lesson_plan_basic',
  section: 'structure',
}, {
  transport: async request => {
    consistencyCalls += 1;
    if (request.attempt === 1) {
      return {
        ...validStructure,
        score: 10,
        level: 'excellent',
        evidence_found: [],
        missing_evidence: [],
      };
    }
    return validStructure;
  },
});
assert.equal(consistencyCalls, 2);
assert.equal(consistencyRecovered.attempts, 2);
assert.equal(consistencyRecovered.consistencyFlags.length, 0);

const contradictory: EvaluationSectionResult = {
  ...validStructure,
  score: 10,
  level: 'excellent',
  evidence_found: [],
  missing_evidence: ['metadata', 'assessment'],
  issues: [{
    severity: 'critical',
    issue_type: 'missing_structure',
    title: 'ไม่พบโครงสร้าง',
    description: 'ข้อมูลไม่เพียงพอ',
    suggestion: 'เพิ่มข้อมูล',
    auto_fixable: false,
  }],
};
const flags = checkEvaluationConsistency(
  contradictory,
  structureCriterion
);
assert.ok(flags.some(flag => flag.code === 'HIGH_SCORE_WITHOUT_EVIDENCE'));
assert.ok(flags.some(flag => flag.code === 'CRITICAL_ISSUE_SCORE_CONFLICT'));

const readinessResult: EvaluationSectionResult = {
  ...validStructure,
  section: 'readiness',
  score: 4,
  max_score: 5,
  evidence_found: ['เวลาเหมาะสม'],
  missing_evidence: [],
  issues: [],
};
const aggregate = aggregateScore([validStructure, readinessResult]);
assert.equal(aggregate.totalScore, 10);
assert.equal(aggregate.totalMax, 15);
assert.equal(aggregate.percentage, 66.67);
assert.equal(aggregate.level, 'needs_improvement');
assert.throws(
  () => aggregateScore([validStructure, validStructure]),
  /Duplicate/
);

const priorities = prioritizeIssues([
  validStructure,
  contradictory,
]);
assert.equal(priorities.ordered[0]?.severity, 'critical');
assert.equal(priorities.counts.critical, 1);
assert.equal(priorities.counts.medium, 1);

assert.ok(
  EVALUATION_SECTION_RESULT_JSON_SCHEMA.required.includes('evidence_found')
);
assert.ok(
  EVALUATION_SECTION_RESULT_JSON_SCHEMA.required.includes('missing_evidence')
);

console.log('unified evaluation engine tests passed');
}

runAsyncTests().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
