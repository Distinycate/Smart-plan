export interface RuleBasedEvaluationResult {
  totalScore: number; // out of 40
  details: {
    structureScore: number; // out of 20
    standardsScore: number; // out of 10
    rubricScore: number; // out of 10
  };
  missingElements: string[];
}

export function evaluatePlanRuleBased(planData: any | null): RuleBasedEvaluationResult {
  let structureScore = 0;
  let standardsScore = 0;
  let rubricScore = 0;
  const missingElements: string[] = [];

  if (!planData || typeof planData !== 'object') {
    return {
      totalScore: 0,
      details: { structureScore: 0, standardsScore: 0, rubricScore: 0 },
      missingElements: ['ไม่พบโครงสร้างข้อมูลแผนการสอน (เป็นไฟล์แนบข้อความ)']
    };
  }

  // 1. Check Overall Structure (Max 20 points)
  // Check if core texts are present and long enough (e.g., learning process, essence)
  let structurePoints = 0;
  if (planData.learningProcess && planData.learningProcess.trim().length > 20) structurePoints += 5;
  else missingElements.push('กิจกรรมการเรียนรู้ (เนื้อหาน้อยเกินไป)');
  
  if (planData.essence && planData.essence.trim().length > 10) structurePoints += 5;
  else missingElements.push('สาระสำคัญ');

  // Check K/P/A existence
  if (planData.objectiveK && planData.objectiveP && planData.objectiveA) structurePoints += 5;
  else missingElements.push('จุดประสงค์ K/P/A ไม่ครบ');

  // Check Assessment existence
  let asmCount = 0;
  ['K', 'P', 'A'].forEach(domain => {
    if (planData[`measure${domain}`]) asmCount++;
    if (planData[`method${domain}`]) asmCount++;
    if (planData[`tool${domain}`]) asmCount++;
  });
  if (asmCount >= 6) structurePoints += 5;
  else missingElements.push('ข้อมูลการวัดผลและประเมินผลไม่ครบถ้วน');

  structureScore = Math.min(20, structurePoints);

  // 2. Check Standards & Indicators (Max 10 points)
  if (
    (planData.indicatorDuring && planData.indicatorDuring.trim().length > 5) ||
    (planData.indicatorFinal && planData.indicatorFinal.trim().length > 5) ||
    (planData.indicatorSelectedIds && planData.indicatorSelectedIds.length > 0) ||
    (planData.learningStandard && planData.learningStandard.trim().length > 5)
  ) {
    standardsScore = 10;
  } else {
    missingElements.push('ตัวชี้วัด/มาตรฐานการเรียนรู้');
  }

  // 3. Check Rubrics (Max 10 points)
  let rubCount = 0;
  ['K', 'P', 'A'].forEach(domain => {
    if (planData[`rubric${domain}`] && planData[`rubric${domain}`].trim().length > 5) rubCount++;
  });
  if (rubCount === 3) rubricScore = 10;
  else if (rubCount >= 1) rubricScore = 5;
  else missingElements.push('เกณฑ์การประเมิน (Rubrics) ไม่ครบถ้วน');

  // Ensure capping
  structureScore = Math.min(20, Math.max(0, structureScore));
  standardsScore = Math.min(10, Math.max(0, standardsScore));
  rubricScore = Math.min(10, Math.max(0, rubricScore));

  const totalScore = structureScore + standardsScore + rubricScore;

  return {
    totalScore,
    details: {
      structureScore,
      standardsScore,
      rubricScore
    },
    missingElements
  };
}
