export interface RuleBasedEvaluationResult {
  totalScore: number; // out of 30
  details: {
    standardsScore: number; // out of 10
    structureScore: number; // out of 20
  };
  missingElements: string[];
}

export function evaluatePlanRuleBased(planData: any | null): RuleBasedEvaluationResult {
  let standardsScore = 0;
  let structureScore = 0;
  const missingElements: string[] = [];

  if (!planData || typeof planData !== 'object') {
    return {
      totalScore: 0,
      details: { standardsScore: 0, structureScore: 0 },
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

  // 2. Check Structure Completeness (Max 20 points)
  // KPA Objectives (5), Activities (5), Assessments (5), Rubrics (5)

  // Objectives (K/P/A)
  let objCount = 0;
  if (planData.objectiveK && planData.objectiveK.trim().length > 2) objCount++;
  if (planData.objectiveP && planData.objectiveP.trim().length > 2) objCount++;
  if (planData.objectiveA && planData.objectiveA.trim().length > 2) objCount++;
  if (objCount === 3) structureScore += 5;
  else if (objCount > 0) structureScore += 2;
  if (objCount < 3) missingElements.push('จุดประสงค์ K/P/A ไม่ครบ');

  // Activities (Learning Process)
  if (planData.learningProcess && planData.learningProcess.trim().length > 20) {
    structureScore += 5;
  } else {
    missingElements.push('กิจกรรมการเรียนรู้');
  }

  // Assessments (Measure, Method, Tool)
  let asmCount = 0;
  ['K', 'P', 'A'].forEach(domain => {
    if (planData[`measure${domain}`] && planData[`measure${domain}`].trim().length > 2) asmCount++;
    if (planData[`method${domain}`] && planData[`method${domain}`].trim().length > 2) asmCount++;
    if (planData[`tool${domain}`] && planData[`tool${domain}`].trim().length > 2) asmCount++;
  });
  if (asmCount >= 9) structureScore += 5; // 3 domains * 3 fields
  else if (asmCount >= 4) structureScore += 2;
  if (asmCount < 9) missingElements.push('การวัดผลประเมินผลไม่ครบ');

  // Rubrics
  let rubCount = 0;
  ['K', 'P', 'A'].forEach(domain => {
    if (planData[`rubric${domain}`] && planData[`rubric${domain}`].trim().length > 10) rubCount++;
    if (planData[`criteria${domain}`] && planData[`criteria${domain}`].trim().length > 2) rubCount++;
  });
  if (rubCount >= 6) structureScore += 5; // 3 domains * 2 fields
  else if (rubCount >= 3) structureScore += 2;
  if (rubCount < 6) missingElements.push('เกณฑ์การประเมิน (Rubrics) ไม่ครบ');

  // Make sure we cap at max
  standardsScore = Math.min(10, standardsScore);
  structureScore = Math.min(20, structureScore);

  const totalScore = standardsScore + structureScore;

  return {
    totalScore,
    details: {
      standardsScore,
      structureScore
    },
    missingElements
  };
}
