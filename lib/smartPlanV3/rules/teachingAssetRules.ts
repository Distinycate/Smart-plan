/**
 * Deterministic Teaching Asset Rules Engine (Wave V3.6)
 * Pure logic — Zero AI calls for requirement determinations.
 */

import {
  V3LessonPlan,
  V3LessonObjective,
  V3LearningEvidence,
  V3LessonActivity,
  V3Assessment,
  V3AssessmentTool,
  V3TeachingAsset,
  V3TeachingAssetRequirements,
  V3TeachingAssetRequirementItem,
  V3TeachingPackageReadiness,
  V3LessonGraph,
} from '../types';
import { deriveAssessmentReadiness } from './assessmentRules';

/**
 * 1. Derive Teaching Asset Requirements
 * Evaluates subject profile, learning focus, activities, evidence, and assessments.
 * Categorizes assets into Required, Recommended, Optional, Not Needed.
 * Strictly deduplicates requirements across activities.
 */
export function deriveTeachingAssetRequirements(params: {
  subjectProfile?: { key?: string; labelTh?: string } | null;
  learningFocus?: string | null;
  activities?: Array<{
    id?: string;
    position?: number;
    title?: string | null;
    phase?: string;
    minutes?: number;
    requiredAssetHints?: string[];
    linkedObjectiveIds?: string[];
    linkedEvidenceIds?: string[];
  }>;
  evidence?: V3LearningEvidence[];
  assessments?: V3Assessment[];
  assessmentTools?: V3AssessmentTool[];
}): V3TeachingAssetRequirements {
  const {
    subjectProfile,
    learningFocus = '',
    activities = [],
    evidence = [],
    assessments = [],
    assessmentTools = [],
  } = params;

  const subjectKey = (subjectProfile?.key || '').toUpperCase();
  const focus = (learningFocus || '').toUpperCase();
  const evidenceTypes = evidence.map((e) => (e.evidence_type || '').toUpperCase());
  const toolTypes = assessmentTools.map((t) => (t.tool_type || '').toUpperCase());

  const requiredMap = new Map<string, V3TeachingAssetRequirementItem>();
  const recommendedMap = new Map<string, V3TeachingAssetRequirementItem>();
  const optionalMap = new Map<string, V3TeachingAssetRequirementItem>();
  const notNeededMap = new Map<string, V3TeachingAssetRequirementItem>();

  const addReq = (item: V3TeachingAssetRequirementItem) => {
    const key = item.assetType.toUpperCase();
    if (requiredMap.has(key)) {
      // Merge target activities
      const existing = requiredMap.get(key)!;
      if (item.targetActivityPositions) {
        existing.targetActivityPositions = Array.from(
          new Set([...(existing.targetActivityPositions || []), ...item.targetActivityPositions])
        ).sort((a, b) => a - b);
      }
      return;
    }
    // If previously in recommended/optional, remove it
    recommendedMap.delete(key);
    optionalMap.delete(key);
    requiredMap.set(key, item);
  };

  const addRec = (item: V3TeachingAssetRequirementItem) => {
    const key = item.assetType.toUpperCase();
    if (requiredMap.has(key) || recommendedMap.has(key)) return;
    optionalMap.delete(key);
    recommendedMap.set(key, item);
  };

  const addOpt = (item: V3TeachingAssetRequirementItem) => {
    const key = item.assetType.toUpperCase();
    if (requiredMap.has(key) || recommendedMap.has(key) || optionalMap.has(key)) return;
    optionalMap.set(key, item);
  };

  const addNotNeeded = (item: V3TeachingAssetRequirementItem) => {
    const key = item.assetType.toUpperCase();
    notNeededMap.set(key, item);
  };

  // ─────────────────────────────────────────────────────────────
  // A. Subject Profile & Learning Focus Rules
  // ─────────────────────────────────────────────────────────────

  // 1. English Speaking
  if (
    subjectKey.includes('EN') ||
    subjectKey.includes('FOREIGN') ||
    focus.includes('SPEAK') ||
    evidenceTypes.some((t) => t.includes('SPEAK') || t.includes('ORAL') || t.includes('DIALOGUE'))
  ) {
    if (focus.includes('SPEAK') || evidenceTypes.some((t) => t.includes('SPEAK') || t.includes('ORAL'))) {
      addReq({
        assetType: 'SPEAKING_CARD',
        labelTh: 'บัตรกิจกรรมสนทนา / บัตรสถานการณ์ (Speaking Card)',
        category: 'required',
        audience: 'STUDENT',
        rationale: 'การเรียนรู้เน้นทักษะการพูด (Speaking) ผู้เรียนต้องมีบัตรสถานการณ์หรือบทบาทสมมติในการสื่อสารจริง',
      });

      // Assessment Form reuse from step 4
      if (
        toolTypes.some((t) => t.includes('RUBRIC') || t.includes('OBSERVATION') || t.includes('CHECKLIST')) ||
        assessments.some((a) => a.assessment_type === 'PERFORMANCE' || a.assessment_type === 'OBSERVATION')
      ) {
        addReq({
          assetType: 'ASSESSMENT_FORM',
          labelTh: 'แบบประเมินทักษะการพูด (อ้างอิงจากขั้นที่ 4)',
          category: 'required',
          audience: 'TEACHER',
          isAssessmentToolReuse: true,
          reusableToolType: 'PERFORMANCE_RUBRIC',
          rationale: 'นำเครื่องมือวัดการพูดจากขั้นตอนการประเมินมาใช้สังเกตและประเมินผลในคาบสอน',
        });
      }

      addRec({
        assetType: 'FLASHCARD',
        labelTh: 'บัตรคำศัพท์ / สำนวนสนับสนุน (Flashcards)',
        category: 'recommended',
        audience: 'BOTH',
        rationale: 'ช่วยเสริมคลังคำศัพท์และรูปแบบประโยคที่จำเป็นในการสนทนา',
      });

      addRec({
        assetType: 'EXIT_TICKET',
        labelTh: 'บัตรสรุปการเรียนรู้ (Exit Ticket)',
        category: 'recommended',
        audience: 'STUDENT',
        rationale: 'ประเมินความมั่นใจและสิ่งที่ได้เรียนรู้จากการพูดใน 2-3 นาทีสุดท้าย',
      });

      addOpt({
        assetType: 'WORKSHEET',
        labelTh: 'ใบงานบันทึกสรุปบทสนทนา (Worksheet)',
        category: 'optional',
        audience: 'STUDENT',
        rationale: 'ตัวเลือกเพิ่มเติม หากต้องการให้ผู้เรียนบันทึกข้อมูลหลังการสนทนา',
      });

      addOpt({
        assetType: 'TEACHER_GUIDE',
        labelTh: 'คู่มือครูและแนวทางการชี้แนะ (Teacher Guide)',
        category: 'optional',
        audience: 'TEACHER',
        rationale: 'แนวทางการจัดการเวลาและคำถามกระตุ้นบทสนทนา',
      });
    }
  }

  // 2. Math Problem Solving & Calculation
  if (subjectKey.includes('MATH')) {
    if (focus.includes('PROBLEM') || focus.includes('REASON') || focus.includes('SOLV')) {
      addReq({
        assetType: 'PROBLEM_SET',
        labelTh: 'ชุดสถานการณ์ปัญหาและการให้เหตุผล (Problem Set)',
        category: 'required',
        audience: 'STUDENT',
        rationale: 'คณิตศาสตร์การแก้ปัญหาต้องมีสถานการณ์โจทย์ พื้นที่แสดงวิธีคิด และพื้นที่อธิบายเหตุผล',
      });

      addReq({
        assetType: 'ANSWER_KEY',
        labelTh: 'เฉลยและเกณฑ์การให้คะแนนแนวคิด (Scoring Guide & Answer Key)',
        category: 'required',
        audience: 'TEACHER',
        rationale: 'ครูต้องมีแนวคิดเฉลยและแนวทางการให้คะแนนการแก้ปัญหาเชิงเหตุผล',
      });

      addRec({
        assetType: 'EXIT_TICKET',
        labelTh: 'บัตรตรวจสอบความเข้าใจรวดเร็ว (Exit Ticket)',
        category: 'recommended',
        audience: 'STUDENT',
        rationale: 'ตรวจสอบแนวคิดหลัก (Big Idea) 1 ข้อก่อนจบคลาส',
      });

      addOpt({
        assetType: 'TEACHER_GUIDE',
        labelTh: 'คู่มือลำดับการชี้แนะและคำถามปลายเปิด (Teacher Guide)',
        category: 'optional',
        audience: 'TEACHER',
        rationale: 'แนวทางการตั้งคำถามกระตุ้นวิธีคิดของผู้เรียน',
      });
    } else {
      // Math Calculation / Basic
      addReq({
        assetType: 'PROBLEM_SET',
        labelTh: 'ชุดแบบฝึกการคำนวณและทักษะ (Problem Set / Worksheet)',
        category: 'required',
        audience: 'STUDENT',
        rationale: 'ผู้เรียนต้องมีแบบฝึกทักษะการคำนวณเพื่อสร้างความคล่องแคล่ว',
      });

      addReq({
        assetType: 'ANSWER_KEY',
        labelTh: 'เฉลยคำตอบที่ถูกต้อง (Answer Key)',
        category: 'required',
        audience: 'TEACHER',
        rationale: 'ครูต้องมีเฉลยขั้นตอนและคำตอบตัวเลขที่ถูกต้อง',
      });

      addRec({
        assetType: 'EXIT_TICKET',
        labelTh: 'บัตรสรุปประเด็นการคำนวณ (Exit Ticket)',
        category: 'recommended',
        audience: 'STUDENT',
        rationale: 'ตรวจสอบข้อผิดพลาดทั่วไป (Common Misconception)',
      });

      addOpt({
        assetType: 'TEACHER_GUIDE',
        labelTh: 'คู่มือครู (Teacher Guide)',
        category: 'optional',
        audience: 'TEACHER',
        rationale: 'ลำดับขั้นตอนและการจัดสรรเวลาในคาบคำนวณ',
      });
    }
  }

  // 3. Science Experiment & Investigation
  if (
    subjectKey.includes('SCI') ||
    focus.includes('EXPERIMENT') ||
    focus.includes('INVESTIGAT') ||
    evidenceTypes.some((t) => t.includes('EXPERIMENT') || t.includes('LAB') || t.includes('OBSERVATION'))
  ) {
    addReq({
      assetType: 'EXPERIMENT_SHEET',
      labelTh: 'ใบกิจกรรมการทดลอง (Experiment Sheet)',
      category: 'required',
      audience: 'STUDENT',
      rationale: 'การทดลองวิทยาศาสตร์ต้องมีขั้นตอน วัสดุอุปกรณ์ ข้อควรระวังความปลอดภัย และสรุปผล',
    });

    addReq({
      assetType: 'DATA_TABLE',
      labelTh: 'ตารางบันทึกผลการทดลอง (Data Table)',
      category: 'required',
      audience: 'STUDENT',
      rationale: 'ผู้เรียนต้องมีพื้นที่บันทึกข้อมูลเชิงประจักษ์จากการสังเกตหรือการวัด',
    });

    if (
      toolTypes.some((t) => t.includes('CHECKLIST') || t.includes('RUBRIC') || t.includes('OBSERVATION')) ||
      assessments.some((a) => a.assessment_type === 'EXPERIMENT' || a.assessment_type === 'OBSERVATION')
    ) {
      addReq({
        assetType: 'ASSESSMENT_FORM',
        labelTh: 'แบบประเมินทักษะกระบวนการวิทยาศาสตร์ (อ้างอิงจากขั้นที่ 4)',
        category: 'required',
        audience: 'TEACHER',
        isAssessmentToolReuse: true,
        reusableToolType: 'CHECKLIST',
        rationale: 'ใช้แบบประเมินทักษะปฏิบัติการทดลองที่มีอยู่จากขั้นตอนประเมินผล',
      });
    }

    addRec({
      assetType: 'EXIT_TICKET',
      labelTh: 'บัตรสรุปข้อค้นพบจากหลักฐาน (CER Exit Ticket)',
      category: 'recommended',
      audience: 'STUDENT',
      rationale: 'สรุปข้อสรุปเชิงวิทยาศาสตร์ (Claim-Evidence-Reasoning) ก่อนจบคาบ',
    });

    addOpt({
      assetType: 'TEACHER_GUIDE',
      labelTh: 'คู่มือครูและแนวทางการเตรียมอุปกรณ์ (Teacher Guide)',
      category: 'optional',
      audience: 'TEACHER',
      rationale: 'แนวทางการเตรียมแล็บและคำถามกระตุ้นการวิเคราะห์ข้อมูล',
    });
  }

  // 4. Physical Education
  if (subjectKey.includes('PE') || subjectKey.includes('PHYSICAL') || focus.includes('SPORT') || focus.includes('MOVEMENT')) {
    addReq({
      assetType: 'TASK_CARD',
      labelTh: 'บัตรสถานีปฏิบัติทักษะ (Skill Task Card)',
      category: 'required',
      audience: 'STUDENT',
      rationale: 'พลศึกษาเน้นการปฏิบัติจริงตามสถานีหรือลำดับท่าฝึก ผู้เรียนต้องมีบัตรขั้นตอนและเทคนิคปฏิบัติ',
    });

    if (toolTypes.length > 0 || assessments.length > 0) {
      addReq({
        assetType: 'ASSESSMENT_FORM',
        labelTh: 'แบบสังเกตทักษะปฏิบัติ / เช็กลิสต์ (อ้างอิงจากขั้นที่ 4)',
        category: 'required',
        audience: 'TEACHER',
        isAssessmentToolReuse: true,
        reusableToolType: 'CHECKLIST',
        rationale: 'ครูใช้เช็กลิสต์หรือรูบริกการปฏิบัติจริงในการสังเกตนักเรียน',
      });
    }

    addOpt({
      assetType: 'TEACHER_GUIDE',
      labelTh: 'คู่มือการจัดแถวและการดูแลความปลอดภัย (Teacher Guide)',
      category: 'optional',
      audience: 'TEACHER',
      rationale: 'แผนผังสนาม ข้อควรระวังความปลอดภัย และขั้นตอนอบอุ่นร่างกาย',
    });

    addNotNeeded({
      assetType: 'WORKSHEET',
      labelTh: 'ใบงานข้อเขียน',
      category: 'notNeeded',
      audience: 'STUDENT',
      rationale: 'วิชาพลศึกษาเน้นการปฏิบัติทางกายภาพ ไม่ควรใช้ใบงานข้อเขียนเป็นหลักในคาบฝึกทักษะ',
    });
  }

  // 5. Art / Visual Arts
  if (subjectKey.includes('ART') || focus.includes('ART') || focus.includes('DESIGN')) {
    addReq({
      assetType: 'ACTIVITY_SHEET',
      labelTh: 'ใบวางแผนและบันทึกกระบวนการสร้างสรรค์ (Planning Sheet)',
      category: 'required',
      audience: 'STUDENT',
      rationale: 'วิชาศิลปะต้องการใบสเก็ตช์ภาพ ร่างแนวคิด และบันทึกกระบวนการคิดสร้างสรรค์',
    });

    addOpt({
      assetType: 'TEACHER_GUIDE',
      labelTh: 'คู่มือครูและแนวทางการให้ข้อเสนอแนะเชิงสร้างสรรค์ (Teacher Guide)',
      category: 'optional',
      audience: 'TEACHER',
      rationale: 'แนวทางการตั้งคำถามกระตุ้นจินตนาการและการติชมผลงาน',
    });

    addNotNeeded({
      assetType: 'QUIZ',
      labelTh: 'แบบทดสอบปรนัย',
      category: 'notNeeded',
      audience: 'STUDENT',
      rationale: 'คาบปฏิบัติงานศิลปะควรเน้นการสร้างสรรค์ผลงานมากกว่าแบบทดสอบความจำ',
    });
  }

  // ─────────────────────────────────────────────────────────────
  // B. Activity requiredAssetHints & Deduplication
  // ─────────────────────────────────────────────────────────────
  activities.forEach((act) => {
    const hints = act.requiredAssetHints || [];
    hints.forEach((hint) => {
      const normHint = hint.toUpperCase().trim();
      let matchedType: string = normHint;
      let label = `สื่อสำหรับกิจกรรมที่ ${act.position || ''}`;
      let audience: any = 'STUDENT';

      if (normHint.includes('SPEAKING') || normHint.includes('CARD')) {
        matchedType = 'SPEAKING_CARD';
        label = 'บัตรกิจกรรมการสนทนา (Speaking Card)';
        audience = 'STUDENT';
      } else if (normHint.includes('EXPERIMENT') || normHint.includes('LAB')) {
        matchedType = 'EXPERIMENT_SHEET';
        label = 'ใบกิจกรรมการทดลอง (Experiment Sheet)';
        audience = 'STUDENT';
      } else if (normHint.includes('PROBLEM') || normHint.includes('TASK')) {
        matchedType = 'PROBLEM_SET';
        label = 'ชุดแบบฝึก/โจทย์ปัญหา (Problem Set)';
        audience = 'STUDENT';
      } else if (normHint.includes('WORKSHEET') || normHint.includes('SHEET')) {
        matchedType = 'WORKSHEET';
        label = 'ใบงานการเรียนรู้ (Worksheet)';
        audience = 'STUDENT';
      } else if (normHint.includes('FLASHCARD')) {
        matchedType = 'FLASHCARD';
        label = 'บัตรคำศัพท์ (Flashcards)';
        audience = 'BOTH';
      } else if (normHint.includes('EXIT')) {
        matchedType = 'EXIT_TICKET';
        label = 'บัตรสรุปการเรียนรู้ (Exit Ticket)';
        audience = 'STUDENT';
      }

      // Add to required with deduplication
      addReq({
        assetType: matchedType,
        labelTh: label,
        category: 'required',
        audience,
        targetActivityPositions: act.position ? [act.position] : [],
        rationale: `กิจกรรมที่ ${act.position || ''} (${act.title || act.phase || 'กิจกรรม'}) ระบุว่าต้องใช้สื่อนี้`,
      });
    });
  });

  // Fallback for general subjects if nothing is required yet
  if (requiredMap.size === 0) {
    addReq({
      assetType: 'WORKSHEET',
      labelTh: 'ใบกิจกรรมการเรียนรู้ (Worksheet / Activity Sheet)',
      category: 'required',
      audience: 'STUDENT',
      rationale: 'ผู้เรียนต้องมีเอกสารประกอบการทำกิจกรรมและการบันทึกการเรียนรู้',
    });

    addRec({
      assetType: 'EXIT_TICKET',
      labelTh: 'บัตรสรุปการเรียนรู้ (Exit Ticket)',
      category: 'recommended',
      audience: 'STUDENT',
      rationale: 'ประเมินความเข้าใจรวดเร็วก่อนสิ้นสุดคาบเรียน',
    });

    addOpt({
      assetType: 'TEACHER_GUIDE',
      labelTh: 'คู่มือครู (Teacher Guide)',
      category: 'optional',
      audience: 'TEACHER',
      rationale: 'แนวทางการดำเนินกิจกรรมและจังหวะเวลาสำหรับครูผู้สอน',
    });
  }

  const required = Array.from(requiredMap.values());
  const recommended = Array.from(recommendedMap.values());
  const optional = Array.from(optionalMap.values());
  const notNeeded = Array.from(notNeededMap.values());

  return {
    required,
    recommended,
    optional,
    notNeeded,
    summary: `วิเคราะห์สื่อตามธรรมชาติวิชา: จำเป็น ${required.length} รายการ, แนะนำ ${recommended.length} รายการ, เพิ่มเติม ${optional.length} รายการ`,
  };
}

/**
 * 2. Deterministic Stale Asset Detection
 * Checks if linked objective, activity, or evidence was updated after the asset.
 */
export function deriveAssetReviewState(
  asset: V3TeachingAsset,
  graph: Pick<V3LessonGraph, 'objectives' | 'activities' | 'evidence'> & {
    assetObjectiveLinks?: Array<{ asset_id: string; objective_id: string }>;
    assetActivityLinks?: Array<{ asset_id: string; activity_id: string }>;
    assetEvidenceLinks?: Array<{ asset_id: string; evidence_id: string }>;
  }
): { needsReview: boolean; reason?: string } {
  // If explicitly flagged in DB, respect it
  if (asset.needs_review) {
    return {
      needsReview: true,
      reason: 'แผนการสอนมีการเปลี่ยนแปลง สื่อนี้ควรได้รับการตรวจสอบใหม่อีกครั้ง ⚠',
    };
  }

  const assetTime = new Date(asset.updated_at || asset.created_at || 0).getTime();
  if (assetTime === 0) return { needsReview: false };

  // Find linked entity IDs
  const linkedObjIds = (graph.assetObjectiveLinks || [])
    .filter((l) => l.asset_id === asset.id)
    .map((l) => l.objective_id);

  const linkedActIds = (graph.assetActivityLinks || [])
    .filter((l) => l.asset_id === asset.id)
    .map((l) => l.activity_id);

  const linkedEvdIds = (graph.assetEvidenceLinks || [])
    .filter((l) => l.asset_id === asset.id)
    .map((l) => l.evidence_id);

  // Check objective update
  const staleObj = graph.objectives.find(
    (o) => linkedObjIds.includes(o.id) && new Date(o.updated_at || 0).getTime() > assetTime
  );
  if (staleObj) {
    return {
      needsReview: true,
      reason: `จุดประสงค์การเรียนรู้ที่เชื่อมโยงได้รับการแก้ไข (${staleObj.statement.slice(0, 30)}...) ⚠`,
    };
  }

  // Check activity update
  const staleAct = graph.activities.find(
    (a) => linkedActIds.includes(a.id) && new Date(a.updated_at || 0).getTime() > assetTime
  );
  if (staleAct) {
    return {
      needsReview: true,
      reason: `กิจกรรมที่เชื่อมโยงได้รับการปรับปรุง (${staleAct.title || staleAct.phase}) ⚠`,
    };
  }

  // Check evidence update
  const staleEvd = graph.evidence.find(
    (e) => linkedEvdIds.includes(e.id) && new Date(e.updated_at || 0).getTime() > assetTime
  );
  if (staleEvd) {
    return {
      needsReview: true,
      reason: `หลักฐานการเรียนรู้ที่เชื่อมโยงได้รับการแก้ไข (${staleEvd.description.slice(0, 30)}...) ⚠`,
    };
  }

  return { needsReview: false };
}

/**
 * 3. Deterministic Teaching Package Readiness
 * Evaluates whether the teaching package is complete and ready for quality review.
 */
export function deriveTeachingPackageReadiness(
  graph: V3LessonGraph,
  requirements?: V3TeachingAssetRequirements
): V3TeachingPackageReadiness {
  const reqs =
    requirements ||
    deriveTeachingAssetRequirements({
      subjectProfile: { key: graph.lesson.subject_key },
      learningFocus: graph.lesson.learning_focus,
      activities: graph.activities,
      evidence: graph.evidence,
      assessments: graph.assessments,
      assessmentTools: graph.assessmentTools,
    });

  // Blueprint check
  const totalActMinutes = graph.activities.reduce((sum, a) => sum + (Number(a.minutes) || 0), 0);
  const targetMinutes = graph.lesson.duration_minutes || 60;
  const blueprintReady =
    graph.activities.length > 0 &&
    totalActMinutes === targetMinutes &&
    graph.objectives.length > 0;

  // Assessment check
  const assessmentReadiness = deriveAssessmentReadiness(graph);
  const assessmentReady = assessmentReadiness.ready;

  // Required Assets check
  const assets = graph.teachingAssets || [];
  const missingRequiredAssets: string[] = [];
  const requiredAssetStatusList: V3TeachingPackageReadiness['requiredAssets'] = [];
  const assetsNeedReview: V3TeachingPackageReadiness['assetsNeedReview'] = [];
  const warnings: string[] = [];

  // Check review status of all existing teaching assets
  assets.forEach((a) => {
    const rev = deriveAssetReviewState(a, graph);
    if (rev.needsReview || a.needs_review) {
      assetsNeedReview.push({
        id: a.id,
        title: a.title,
        reason: rev.reason || 'สื่อนี้ต้องตรวจสอบเนื่องจากแผนมีการเปลี่ยนแปลง',
      });
    }
  });

  // Match each required item
  reqs.required.forEach((req) => {
    // If it's a reused assessment tool from Step 4
    if (req.isAssessmentToolReuse) {
      const toolExists = graph.assessmentTools && graph.assessmentTools.length > 0;
      requiredAssetStatusList.push({
        assetType: req.assetType,
        labelTh: req.labelTh,
        ready: toolExists,
        isAssessmentToolReuse: true,
      });
      if (!toolExists) {
        missingRequiredAssets.push(req.labelTh);
      }
      return;
    }

    // Normal teaching asset
    const foundAsset = assets.find(
      (a) =>
        a.asset_type.toUpperCase() === req.assetType.toUpperCase() ||
        (req.assetType === 'PROBLEM_SET' && (a.asset_type === 'PROBLEM_SET' || a.asset_type === 'WORKSHEET')) ||
        (req.assetType === 'WORKSHEET' && (a.asset_type === 'WORKSHEET' || a.asset_type === 'PROBLEM_SET'))
    );

    const isReady = Boolean(
      foundAsset &&
      foundAsset.generation_status === 'READY' &&
      !foundAsset.needs_review &&
      !assetsNeedReview.some((r) => r.id === foundAsset.id)
    );

    requiredAssetStatusList.push({
      assetType: req.assetType,
      labelTh: req.labelTh,
      ready: isReady,
      existingAssetId: foundAsset?.id,
      isAssessmentToolReuse: false,
    });

    if (!isReady) {
      missingRequiredAssets.push(req.labelTh);
    }
  });

  if (missingRequiredAssets.length > 0) {
    warnings.push(`ยังขาดสื่อการสอนที่จำเป็น ${missingRequiredAssets.length} รายการ: ${missingRequiredAssets.join(', ')}`);
  }

  if (assetsNeedReview.length > 0) {
    warnings.push(`มีสื่อที่ต้องตรวจสอบอีกครั้ง ${assetsNeedReview.length} รายการ เนื่องจากแผนมีการปรับปรุง`);
  }

  const requiredAssetsComplete = missingRequiredAssets.length === 0 && reqs.required.length > 0;
  const allAssetsReviewed = assetsNeedReview.length === 0;

  const ready =
    blueprintReady &&
    assessmentReady &&
    requiredAssetsComplete &&
    allAssetsReviewed;

  return {
    ready,
    requiredAssets: requiredAssetStatusList,
    missingRequiredAssets,
    assetsNeedReview,
    warnings,
    summary: {
      blueprintReady,
      assessmentReady,
      requiredAssetsComplete,
      allAssetsReviewed,
    },
  };
}
