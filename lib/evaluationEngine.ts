export interface RuleBasedEvaluationResult {
  totalScore: number; // out of 70
  details: {
    standardsScore: number; // out of 10
    objectivesScore: number; // out of 15
    activitiesScore: number; // out of 15
    assessmentScore: number; // out of 15
    rubricScore: number; // out of 15
  };
  missingElements: string[];
}

export function evaluatePlanRuleBased(planData: any | null): RuleBasedEvaluationResult {
  let standardsScore = 0;
  let objectivesScore = 0;
  let activitiesScore = 0;
  let assessmentScore = 0;
  let rubricScore = 0;
  const missingElements: string[] = [];

  if (!planData || typeof planData !== 'object') {
    return {
      totalScore: 0,
      details: { standardsScore: 0, objectivesScore: 0, activitiesScore: 0, assessmentScore: 0, rubricScore: 0 },
      missingElements: ['ไม่พบโครงสร้างข้อมูลแผนการสอน (เป็นไฟล์แนบข้อความ)']
    };
  }

  // 1. Check Standards & Indicators (Max 10 points)
  if (planData.learningStandard && planData.learningStandard.trim().length > 5) {
    standardsScore += 5;
  } else {
    missingElements.push('มาตรฐานการเรียนรู้');
  }

  if (
    (planData.indicatorDuring && planData.indicatorDuring.trim().length > 5) ||
    (planData.indicatorFinal && planData.indicatorFinal.trim().length > 5) ||
    (planData.indicatorSelectedIds && planData.indicatorSelectedIds.length > 0)
  ) {
    standardsScore += 5;
  } else {
    missingElements.push('ตัวชี้วัด');
  }

  // 2. Check Objectives K/P/A (Max 15 points)
  let objCount = 0;
  if (planData.objectiveK && planData.objectiveK.trim().length > 2) objCount++;
  if (planData.objectiveP && planData.objectiveP.trim().length > 2) objCount++;
  if (planData.objectiveA && planData.objectiveA.trim().length > 2) objCount++;
  if (objCount === 3) objectivesScore += 15;
  else if (objCount === 2) objectivesScore += 10;
  else if (objCount === 1) objectivesScore += 5;
  if (objCount < 3) missingElements.push('จุดประสงค์ K/P/A ไม่ครบ');

  // 3. Check Activities/Learning Process (Max 15 points)
  if (planData.learningProcess && planData.learningProcess.trim().length > 20) {
    activitiesScore += 15;
  } else {
    missingElements.push('กิจกรรมการเรียนรู้');
  }

  // 4. Check Assessments (Max 15 points)
  let asmCount = 0;
  ['K', 'P', 'A'].forEach(domain => {
    if (planData[`measure${domain}`] && planData[`measure${domain}`].trim().length > 2) asmCount++;
    if (planData[`method${domain}`] && planData[`method${domain}`].trim().length > 2) asmCount++;
    if (planData[`tool${domain}`] && planData[`tool${domain}`].trim().length > 2) asmCount++;
  });
  if (asmCount >= 9) assessmentScore += 15; // 3 domains * 3 fields
  else if (asmCount >= 6) assessmentScore += 10;
  else if (asmCount >= 3) assessmentScore += 5;
  if (asmCount < 9) missingElements.push('การวัดผลประเมินผลไม่ครบถ้วน');

  // 5. Check Rubrics (Max 15 points)
  let rubCount = 0;
  ['K', 'P', 'A'].forEach(domain => {
    if (planData[`rubric${domain}`] && planData[`rubric${domain}`].trim().length > 10) rubCount++;
    if (planData[`criteria${domain}`] && planData[`criteria${domain}`].trim().length > 2) rubCount++;
  });
  if (rubCount >= 6) rubricScore += 15; // 3 domains * 2 fields
  else if (rubCount >= 4) rubricScore += 10;
  else if (rubCount >= 2) rubricScore += 5;
  if (rubCount < 6) missingElements.push('เกณฑ์การประเมิน (Rubrics) ไม่ครบถ้วน');

  // Ensure capping
  standardsScore = Math.min(10, standardsScore);
  objectivesScore = Math.min(15, objectivesScore);
  activitiesScore = Math.min(15, activitiesScore);
  assessmentScore = Math.min(15, assessmentScore);
  rubricScore = Math.min(15, rubricScore);

  const totalScore = standardsScore + objectivesScore + activitiesScore + assessmentScore + rubricScore;

  return {
    totalScore,
    details: {
      standardsScore,
      objectivesScore,
      activitiesScore,
      assessmentScore,
      rubricScore
    },
    missingElements
  };
}
