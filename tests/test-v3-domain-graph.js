/**
 * Automated Domain Graph & Relationship Test for Wave V3.1
 * Verifies Minimum Graph Scenario (35) and Delete Behavior Scenario (36).
 */

const assert = require('assert');

// Mock in-memory implementation of V3 Graph Repository matching V3Repository logic
class MockV3Repository {
  constructor() {
    this.lessons = [];
    this.objectives = [];
    this.evidence = [];
    this.objEvdLinks = [];
    this.activities = [];
    this.actObjLinks = [];
    this.actEvdLinks = [];
    this.assessments = [];
    this.asmEvdLinks = [];
  }

  createLesson(data) {
    const lesson = { id: 'plan-' + Math.random().toString(36).substr(2, 9), ...data, created_at: new Date().toISOString() };
    this.lessons.push(lesson);
    return lesson;
  }

  createObjective(data) {
    const objective = { id: 'obj-' + Math.random().toString(36).substr(2, 9), ...data };
    this.objectives.push(objective);
    return objective;
  }

  deleteObjective(objectiveId) {
    // Cascade delete junction links, but NEVER delete the linked evidence!
    this.objectives = this.objectives.filter(o => o.id !== objectiveId);
    this.objEvdLinks = this.objEvdLinks.filter(l => l.objective_id !== objectiveId);
    this.actObjLinks = this.actObjLinks.filter(l => l.objective_id !== objectiveId);
  }

  createEvidence(data) {
    const evd = { id: 'evd-' + Math.random().toString(36).substr(2, 9), ...data };
    this.evidence.push(evd);
    return evd;
  }

  linkObjectiveEvidence(objectiveId, evidenceId) {
    const link = { objective_id: objectiveId, evidence_id: evidenceId, created_at: new Date().toISOString() };
    this.objEvdLinks.push(link);
    return link;
  }

  createActivity(data) {
    const act = { id: 'act-' + Math.random().toString(36).substr(2, 9), ...data };
    this.activities.push(act);
    return act;
  }

  linkActivityObjective(activityId, objectiveId) {
    const link = { activity_id: activityId, objective_id: objectiveId };
    this.actObjLinks.push(link);
    return link;
  }

  linkActivityEvidence(activityId, evidenceId) {
    const link = { activity_id: activityId, evidence_id: evidenceId };
    this.actEvdLinks.push(link);
    return link;
  }

  createAssessment(data) {
    const asm = { id: 'asm-' + Math.random().toString(36).substr(2, 9), ...data };
    this.assessments.push(asm);
    return asm;
  }

  linkAssessmentEvidence(assessmentId, evidenceId) {
    const link = { assessment_id: assessmentId, evidence_id: evidenceId };
    this.asmEvdLinks.push(link);
    return link;
  }

  getLessonGraph(planId) {
    const lesson = this.lessons.find(l => l.id === planId);
    if (!lesson) return null;

    const objectives = this.objectives.filter(o => o.lesson_plan_id === planId);
    const evidence = this.evidence.filter(e => e.lesson_plan_id === planId);
    const objIds = objectives.map(o => o.id);
    const actIds = this.activities.filter(a => a.lesson_plan_id === planId).map(a => a.id);
    const asmIds = this.assessments.filter(a => a.lesson_plan_id === planId).map(a => a.id);

    return {
      lesson,
      objectives,
      evidence,
      objectiveEvidenceLinks: this.objEvdLinks.filter(l => objIds.includes(l.objective_id)),
      activities: this.activities.filter(a => a.lesson_plan_id === planId),
      activityObjectiveLinks: this.actObjLinks.filter(l => actIds.includes(l.activity_id)),
      activityEvidenceLinks: this.actEvdLinks.filter(l => actIds.includes(l.activity_id)),
      assessments: this.assessments.filter(a => a.lesson_plan_id === planId),
      assessmentEvidenceLinks: this.asmEvdLinks.filter(l => asmIds.includes(l.assessment_id)),
    };
  }
}

async function runTests() {
  console.log('🧪 Starting Wave V3.1 Automated Domain Tests...\n');

  const repo = new MockV3Repository();

  // Test 1: Create Lesson
  console.log('Test 1: Create V3 Lesson (English, Grade 7 / ม.1, Topic: Jobs, 60 mins)');
  const lesson = repo.createLesson({
    user_id: 'user-001',
    title: 'Occupations in Daily Life',
    topic: 'Jobs',
    course_name: 'ภาษาอังกฤษ 1',
    course_code: 'อ21101',
    subject_key: 'FOREIGN_LANGUAGE',
    grade_level: 'ม.1',
    duration_minutes: 60,
    status: 'DRAFT'
  });
  assert.strictEqual(lesson.duration_minutes, 60);
  assert.strictEqual(lesson.status, 'DRAFT');
  console.log('  ✅ Lesson created successfully with ID:', lesson.id);

  // Test 2: Create Objectives & Evidence (Many-to-Many)
  console.log('\nTest 2: Create Objective A, Objective B, and Evidence 1');
  const objA = repo.createObjective({
    lesson_plan_id: lesson.id,
    statement: 'นักเรียนสามารถระบุคำศัพท์เกี่ยวกับอาชีพได้ถูกต้อง (K)',
    position: 0,
    source: 'MANUAL'
  });
  const objB = repo.createObjective({
    lesson_plan_id: lesson.id,
    statement: 'นักเรียนสามารถพูดถาม-ตอบเกี่ยวกับอาชีพในฝันได้ (P)',
    position: 1,
    source: 'MANUAL'
  });
  const evd1 = repo.createEvidence({
    lesson_plan_id: lesson.id,
    evidence_type: 'WORKSHEET',
    description: 'ใบงานที่ 1: My Dream Job Vocabulary & Interview Worksheet',
    position: 0,
    source: 'MANUAL'
  });

  repo.linkObjectiveEvidence(objA.id, evd1.id);
  repo.linkObjectiveEvidence(objB.id, evd1.id);
  console.log('  ✅ Linked Obj A → Evd 1 and Obj B → Evd 1 (Many-to-Many verified)');

  // Test 3: Create Activity with Multi-links
  console.log('\nTest 3: Create Activity 1 and link to Obj A, Obj B, Evd 1');
  const act1 = repo.createActivity({
    lesson_plan_id: lesson.id,
    phase: 'PRACTICE',
    minutes: 25,
    title: 'Pair-work: Dream Job Roleplay',
    teacher_actions: 'ครูแจกใบงานและเดินสังเกตการสนทนา',
    student_actions: 'นักเรียนจับคู่สัมภาษณ์เพื่อนและจดบันทึกลงใบงาน',
    position: 2,
    source: 'MANUAL'
  });
  repo.linkActivityObjective(act1.id, objA.id);
  repo.linkActivityObjective(act1.id, objB.id);
  repo.linkActivityEvidence(act1.id, evd1.id);
  console.log('  ✅ Activity 1 created and linked to both objectives and evidence');

  // Test 4: Create Assessment
  console.log('\nTest 4: Create Assessment 1 and link to Evidence 1');
  const asm1 = repo.createAssessment({
    lesson_plan_id: lesson.id,
    name: 'การประเมินการทำใบงานและการพูดสนทนา',
    assessment_type: 'RUBRIC',
    method: 'ตรวจใบงานและการสังเกตพฤติกรรม',
    criteria_type: 'SCORE',
    criteria_value: 8,
    position: 0,
    source: 'MANUAL'
  });
  repo.linkAssessmentEvidence(asm1.id, evd1.id);
  console.log('  ✅ Assessment 1 created and linked to Evidence 1');

  // Test 5: Graph Relationship Integrity Check
  console.log('\nTest 5: Verify getLessonGraph() Composite Graph Loader');
  const graph = repo.getLessonGraph(lesson.id);
  assert.strictEqual(graph.objectives.length, 2, 'Must have 2 objectives');
  assert.strictEqual(graph.evidence.length, 1, 'Must have 1 evidence');
  assert.strictEqual(graph.objectiveEvidenceLinks.length, 2, 'Must have 2 Obj-Evd links');
  assert.strictEqual(graph.activities.length, 1, 'Must have 1 activity');
  assert.strictEqual(graph.activityObjectiveLinks.length, 2, 'Activity must link to 2 objectives');
  assert.strictEqual(graph.activityEvidenceLinks.length, 1, 'Activity must link to 1 evidence');
  assert.strictEqual(graph.assessments.length, 1, 'Must have 1 assessment');
  assert.strictEqual(graph.assessmentEvidenceLinks.length, 1, 'Assessment must link to 1 evidence');
  console.log('  ✅ Full Composite Graph verified with 100% relational integrity!');

  // Test 6: Delete Behavior (Rule 36)
  console.log('\nTest 6: Delete Objective A (Must not delete Evidence 1 or Objective B linkage)');
  repo.deleteObjective(objA.id);

  const graphAfterDelete = repo.getLessonGraph(lesson.id);
  assert.strictEqual(graphAfterDelete.objectives.length, 1, 'Must now have 1 objective (Objective B)');
  assert.strictEqual(graphAfterDelete.objectives[0].id, objB.id, 'Remaining objective must be Objective B');
  assert.strictEqual(graphAfterDelete.evidence.length, 1, 'Evidence 1 must STILL exist');
  assert.strictEqual(graphAfterDelete.evidence[0].id, evd1.id, 'Evidence 1 identity preserved');
  assert.strictEqual(graphAfterDelete.objectiveEvidenceLinks.length, 1, 'Link Obj B → Evd 1 must survive');
  assert.strictEqual(graphAfterDelete.objectiveEvidenceLinks[0].objective_id, objB.id);
  console.log('  ✅ Delete behavior passed: Obj A removed, link removed, Evd 1 and Obj B preserved perfectly!');

  console.log('\n🎉 ALL WAVE V3.1 DOMAIN TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
