/**
 * Smart Plan V3 — Activity Rules, Time Engine & Workflow Status Derivation
 * Deterministic business rules — zero AI calls.
 */

import {
  V3ActivityRuleSummary,
  V3LessonActivity,
  V3LessonObjective,
  V3LearningEvidence,
  V3LessonPlan,
  V3LessonStatus,
  V3TimeNormalizationSuggestion,
} from '../types';

/**
 * 1. Time Engine — Calculate total and remaining minutes
 */
export function calculateActivityMinutes(
  activities: Array<{ minutes: number }>,
  targetDurationMinutes: number = 60
): {
  totalMinutes: number;
  targetMinutes: number;
  remainingMinutes: number;
  isValid: boolean;
  statusMessage: string;
} {
  const totalMinutes = activities.reduce((sum, a) => sum + (Number(a.minutes) || 0), 0);
  const remainingMinutes = targetDurationMinutes - totalMinutes;
  const isValid = totalMinutes === targetDurationMinutes;

  let statusMessage = `เวลารวม ${totalMinutes} / ${targetDurationMinutes} นาที`;
  if (isValid) {
    statusMessage += ' ✓ ครบตามกำหนด';
  } else if (remainingMinutes > 0) {
    statusMessage += ` (ขาดอีก ${remainingMinutes} นาที)`;
  } else {
    statusMessage += ` (เกิน ${Math.abs(remainingMinutes)} นาที)`;
  }

  return {
    totalMinutes,
    targetMinutes: targetDurationMinutes,
    remainingMinutes,
    isValid,
    statusMessage,
  };
}

/**
 * 2. Deterministic Time Normalizer — Suggest adjustments to match target minutes
 * Never calls AI; strictly deterministic math.
 */
export function suggestTimeNormalization(
  activities: Array<{ minutes: number; title?: string | null; phase?: string }>,
  targetDurationMinutes: number = 60
): V3TimeNormalizationSuggestion[] {
  if (!activities || activities.length === 0) return [];

  const totalMinutes = activities.reduce((sum, a) => sum + (Number(a.minutes) || 0), 0);
  const diff = targetDurationMinutes - totalMinutes;
  if (diff === 0) return [];

  // Find the most suitable activity to adjust:
  // Prefer PRACTICE, APPLY, PERFORM, LEARN, or whichever has the most minutes (and isn't ENGAGE or SUMMARIZE if possible)
  const candidateIndices = activities.map((act, idx) => ({
    idx,
    phase: act.phase?.toUpperCase() || '',
    minutes: Number(act.minutes) || 0,
  }));

  // Score candidate: main phases get preference
  const prioritized = [...candidateIndices].sort((a, b) => {
    const isMainPhaseA = ['PRACTICE', 'APPLY', 'PERFORM', 'INVESTIGATE', 'LEARN'].includes(a.phase);
    const isMainPhaseB = ['PRACTICE', 'APPLY', 'PERFORM', 'INVESTIGATE', 'LEARN'].includes(b.phase);
    if (isMainPhaseA && !isMainPhaseB) return -1;
    if (!isMainPhaseA && isMainPhaseB) return 1;
    return b.minutes - a.minutes; // higher minutes first
  });

  const targetCandidate = prioritized[0];
  if (!targetCandidate) return [];

  const newMinutes = targetCandidate.minutes + diff;
  // If reducing makes it less than 5 minutes, distribute or clamp
  if (newMinutes < 5 && activities.length > 1) {
    // If single adjustment would make it too small, find another candidate
    const altCandidate = prioritized.find(c => c.idx !== targetCandidate.idx && c.minutes + diff >= 5);
    if (altCandidate) {
      return [{
        index: altCandidate.idx,
        originalMinutes: altCandidate.minutes,
        suggestedMinutes: altCandidate.minutes + diff,
        diff,
        reason: diff > 0
          ? `เพิ่มเวลาในขั้น ${altCandidate.phase || 'กิจกรรม'} เพื่อให้ครบ ${targetDurationMinutes} นาที`
          : `ปรับลดเวลาในขั้น ${altCandidate.phase || 'กิจกรรม'} ให้อยู่ในกรอบ ${targetDurationMinutes} นาที`,
      }];
    }
  }

  return [{
    index: targetCandidate.idx,
    originalMinutes: targetCandidate.minutes,
    suggestedMinutes: Math.max(5, newMinutes),
    diff,
    reason: diff > 0
      ? `เพิ่มเวลาในขั้น ${targetCandidate.phase || 'กิจกรรมหลัก'} เพื่อให้ครบ ${targetDurationMinutes} นาที`
      : `ปรับลดเวลาในขั้น ${targetCandidate.phase || 'กิจกรรมหลัก'} ให้อยู่ในกรอบ ${targetDurationMinutes} นาที`,
  }];
}

/**
 * 3. Activity Rule Engine — Validate 60-Minute Lesson Blueprint
 */
export function validateActivityRules(params: {
  lesson: Pick<V3LessonPlan, 'duration_minutes'>;
  objectives: Array<Pick<V3LessonObjective, 'id' | 'statement'>>;
  evidence: Array<Pick<V3LearningEvidence, 'id' | 'description'>>;
  activities: Array<{
    id?: string;
    position?: number;
    minutes: number;
    teacher_actions?: string;
    student_actions?: string;
    assessment_moment?: string | null;
    feedback_moment?: string | null;
    linkedObjectiveIds?: string[];
    linkedEvidenceIds?: string[];
  }>;
}): V3ActivityRuleSummary {
  const { lesson, objectives, evidence, activities } = params;
  const targetMinutes = lesson.duration_minutes || 60;

  // A. Duration Check
  const durationCalc = calculateActivityMinutes(activities, targetMinutes);
  const duration = {
    totalMinutes: durationCalc.totalMinutes,
    targetMinutes: durationCalc.targetMinutes,
    valid: durationCalc.isValid,
    remainingMinutes: durationCalc.remainingMinutes,
    message: durationCalc.statusMessage,
  };

  // B. Objective Coverage Check
  const coveredObjSet = new Set<string>();
  for (const act of activities) {
    if (Array.isArray(act.linkedObjectiveIds)) {
      for (const objId of act.linkedObjectiveIds) {
        coveredObjSet.add(objId);
      }
    }
  }

  const uncoveredObjIds = objectives
    .map(o => o.id)
    .filter(id => !coveredObjSet.has(id));

  const objectivesSummary = {
    total: objectives.length,
    covered: objectives.length - uncoveredObjIds.length,
    uncoveredIds: uncoveredObjIds,
    allCovered: objectives.length > 0 && uncoveredObjIds.length === 0,
    message: objectives.length === 0
      ? 'ยังไม่มีจุดประสงค์การเรียนรู้'
      : uncoveredObjIds.length === 0
      ? `${objectives.length} / ${objectives.length} ข้อ มีกิจกรรมรองรับ ✓`
      : `มี ${uncoveredObjIds.length} จุดประสงค์ที่ยังไม่มีกิจกรรมรองรับ ⚠`,
  };

  // C. Evidence Coverage Check
  const linkedEvdSet = new Set<string>();
  for (const act of activities) {
    if (Array.isArray(act.linkedEvidenceIds)) {
      for (const evdId of act.linkedEvidenceIds) {
        linkedEvdSet.add(evdId);
      }
    }
  }

  const unlinkedEvdIds = evidence
    .map(e => e.id)
    .filter(id => !linkedEvdSet.has(id));

  const evidenceSummary = {
    total: evidence.length,
    linked: evidence.length - unlinkedEvdIds.length,
    unlinkedIds: unlinkedEvdIds,
    message: evidence.length === 0
      ? 'ยังไม่มีหลักฐานการเรียนรู้'
      : unlinkedEvdIds.length === 0
      ? `${evidence.length} / ${evidence.length} รายการ เชื่อมโยงกับกิจกรรม ✓`
      : `มี ${unlinkedEvdIds.length} หลักฐานที่ยังไม่ถูกสร้าง/สังเกตในกิจกรรม ⚠`,
  };

  // D. Student Actions Must Be Non-Empty
  const emptyStudentActionPositions: number[] = [];
  activities.forEach((act, idx) => {
    const studentText = (act.student_actions || '').trim();
    if (!studentText) {
      emptyStudentActionPositions.push(act.position ?? (idx + 1));
    }
  });

  const studentActionsSummary = {
    valid: emptyStudentActionPositions.length === 0 && activities.length > 0,
    emptyActivityPositions: emptyStudentActionPositions,
    message: emptyStudentActionPositions.length === 0
      ? 'ผู้เรียนมีบทบาทปฏิบัติการเรียนรู้ในทุกกิจกรรม ✓'
      : `กิจกรรมที่ ${emptyStudentActionPositions.join(', ')} ยังไม่มีบทบาทของผู้เรียน (ห้ามเป็นผู้ฟังเพียงอย่างเดียว) ⚠`,
  };

  // E. Formative Assessment & Feedback Moments
  const hasFormativeCheck = activities.some(
    a => Boolean(a.assessment_moment && a.assessment_moment.trim())
  );
  const hasFeedback = activities.some(
    a => Boolean(a.feedback_moment && a.feedback_moment.trim())
  );

  const allPassed =
    duration.valid &&
    objectivesSummary.allCovered &&
    studentActionsSummary.valid &&
    activities.length > 0;

  return {
    duration,
    objectives: objectivesSummary,
    evidence: evidenceSummary,
    studentActions: studentActionsSummary,
    hasFormativeCheck,
    hasFeedback,
    allPassed,
  };
}

/**
 * 4. Deterministic Workflow Status Derivation
 * Single Source of Truth for Lesson V3 status transitions.
 */
export function deriveLessonWorkflowStatus(
  currentLesson: Pick<V3LessonPlan, 'status' | 'duration_minutes'>,
  graph: {
    activities: Array<{ minutes: number; linkedObjectiveIds?: string[] }>;
    objectives: Array<{ id: string }>;
    packageReadiness?: { ready: boolean };
  }
): V3LessonStatus {
  const currentStatus = currentLesson.status;

  // Criteria for Blueprint readiness
  const totalMinutes = graph.activities.reduce((s, a) => s + (Number(a.minutes) || 0), 0);
  const targetMinutes = currentLesson.duration_minutes || 60;
  const isTimeComplete = totalMinutes === targetMinutes;
  const hasActivities = graph.activities.length > 0;

  const coveredObjs = new Set<string>();
  graph.activities.forEach((a) => {
    (a.linkedObjectiveIds || []).forEach((id) => coveredObjs.add(id));
  });
  const allObjectivesCovered =
    graph.objectives.length > 0 &&
    graph.objectives.every((o) => coveredObjs.has(o.id));

  const isBlueprintReady = hasActivities && isTimeComplete && allObjectivesCovered;

  if (!isBlueprintReady) {
    // If blueprint criteria are NOT satisfied:
    // If it was BLUEPRINT_READY or PACKAGE_READY, downgrade back to DRAFT
    if (currentStatus === 'BLUEPRINT_READY' || currentStatus === 'PACKAGE_READY') {
      return 'DRAFT';
    }
    // V3.7: REVIEWED → downgrade to DRAFT if blueprint conditions fail
    if (currentStatus === 'REVIEWED') {
      return 'DRAFT';
    }
    return currentStatus;
  }

  // Blueprint criteria ARE satisfied:
  const isPackageReady = graph.packageReadiness ? graph.packageReadiness.ready : false;

  if (isPackageReady) {
    if (currentStatus === 'DRAFT' || currentStatus === 'BLUEPRINT_READY') {
      return 'PACKAGE_READY';
    }
    return currentStatus;
  }

  // Blueprint is ready, but package is NOT ready (or packageReadiness is false/missing):
  if (currentStatus === 'PACKAGE_READY' && graph.packageReadiness && !graph.packageReadiness.ready) {
    // Downgrade back to BLUEPRINT_READY
    return 'BLUEPRINT_READY';
  }

  // V3.7: REVIEWED → downgrade to PACKAGE_READY if required assets no longer ready
  if (currentStatus === 'REVIEWED' && graph.packageReadiness && !graph.packageReadiness.ready) {
    return 'PACKAGE_READY';
  }

  if (currentStatus === 'DRAFT') {
    return 'BLUEPRINT_READY';
  }

  return currentStatus;
}
