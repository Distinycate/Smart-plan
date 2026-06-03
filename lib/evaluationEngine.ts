export interface RuleBasedEvaluationResult {
  totalScore: number; // out of 70
  details: {
    standardsScore: number; // out of 21
    kpaScore: number;       // out of 49
  };
  missingElements: string[];
}

export function evaluatePlanRuleBased(planData: any | null): RuleBasedEvaluationResult {
  let standardsScore = 0;
  let kpaScore = 0;
  const missingElements: string[] = [];

  if (!planData || typeof planData !== 'object') {
    return {
      totalScore: 0,
      details: { standardsScore: 0, kpaScore: 0 },
      missingElements: ['ไม่พบโครงสร้างข้อมูลแผนการสอน (เป็นไฟล์แนบข้อความ)']
    };
  }

  // 1. Check Standards & Indicators (Max 21 points)
  let hasStandard = false;
  let hasIndicator = false;

  if (planData.learningStandard && planData.learningStandard.trim().length > 5) {
    hasStandard = true;
    standardsScore += 10;
  } else {
    missingElements.push('มาตรฐานการเรียนรู้');
  }

  if (
    (planData.indicatorDuring && planData.indicatorDuring.trim().length > 5) ||
    (planData.indicatorFinal && planData.indicatorFinal.trim().length > 5) ||
    (planData.indicatorSelectedIds && planData.indicatorSelectedIds.length > 0)
  ) {
    hasIndicator = true;
    standardsScore += 11;
  } else {
    missingElements.push('ตัวชี้วัด');
  }

  // 2. Check K, P, A Completeness (Max 49 points)
  // Each domain (K, P, A) is worth roughly 16.33 points.
  // Let's break it down: Objective (4), Measure (3), Method (3), Tool (3), Criteria (3.33) -> total ~16.33 * 3 = 49

  const checkDomain = (domain: string, label: string) => {
    let score = 0;
    
    // Objective
    if (planData[`objective${domain}`] && planData[`objective${domain}`].trim().length > 2) {
      score += 4;
    } else {
      missingElements.push(`จุดประสงค์ด้าน ${label}`);
    }

    // Measure (สิ่งที่ต้องการวัด)
    if (planData[`measure${domain}`] && planData[`measure${domain}`].trim().length > 2) {
      score += 3;
    } else {
      missingElements.push(`สิ่งที่ต้องการวัดด้าน ${label}`);
    }

    // Method (วิธีการวัด)
    if (planData[`method${domain}`] && planData[`method${domain}`].trim().length > 2) {
      score += 3;
    } else {
      missingElements.push(`วิธีการวัดผลด้าน ${label}`);
    }

    // Tool (เครื่องมือประเมิน)
    if (planData[`tool${domain}`] && planData[`tool${domain}`].trim().length > 2) {
      score += 3;
    } else {
      missingElements.push(`เครื่องมือประเมินด้าน ${label}`);
    }

    // Criteria / Rubric (เกณฑ์ผ่าน)
    const hasCriteria = planData[`criteria${domain}`] && planData[`criteria${domain}`].trim().length > 2;
    const hasRubric = planData[`rubric${domain}`] && planData[`rubric${domain}`].trim().length > 10;
    
    if (hasCriteria || hasRubric) {
      score += 3.33;
    } else {
      missingElements.push(`เกณฑ์การประเมินด้าน ${label}`);
    }

    return score;
  };

  kpaScore += checkDomain('K', 'ความรู้ (K)');
  kpaScore += checkDomain('P', 'ทักษะ (P)');
  kpaScore += checkDomain('A', 'เจตคติ (A)');

  // Math.round to avoid floating point weirdness
  kpaScore = Math.round(kpaScore); 

  // Make sure we cap at max
  standardsScore = Math.min(21, standardsScore);
  kpaScore = Math.min(49, kpaScore);

  const totalScore = standardsScore + kpaScore;

  return {
    totalScore,
    details: {
      standardsScore,
      kpaScore
    },
    missingElements
  };
}
