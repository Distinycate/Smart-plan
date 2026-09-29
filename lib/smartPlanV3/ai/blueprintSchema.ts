/**
 * Smart Plan V3 — Blueprint Response Validator & Schema
 * Layered validation: Structure -> Field constraints -> Reference integrity.
 * Written with zero external dependencies.
 */

import { V3LessonBlueprint, V3BlueprintActivityDraft } from '../types';

export interface BlueprintValidationResult {
  success: boolean;
  data?: V3LessonBlueprint;
  error?: string;
  invalidObjRefs?: string[];
  invalidEvdRefs?: string[];
}

export function validateBlueprintResponse(
  rawJson: any,
  expectedRefs?: { validObjRefs: string[]; validEvdRefs: string[] }
): BlueprintValidationResult {
  if (!rawJson || typeof rawJson !== 'object') {
    return { success: false, error: 'ข้อมูล Blueprint จาก AI ต้องเป็น JSON Object' };
  }

  // 1. Validate summary
  if (!rawJson.summary || typeof rawJson.summary !== 'object') {
    return { success: false, error: 'ต้องมีส่วนสรุปภาพรวม (summary.lessonApproach และ summary.learningFlow)' };
  }

  const lessonApproach = String(rawJson.summary.lessonApproach || '').trim();
  const learningFlow = String(rawJson.summary.learningFlow || '').trim();

  // 2. Validate activities array
  if (!Array.isArray(rawJson.activities) || rawJson.activities.length === 0) {
    return { success: false, error: 'AI ต้องส่งรายการกิจกรรม (activities) อย่างน้อย 1 กิจกรรม' };
  }

  const validObjRefsSet = expectedRefs?.validObjRefs ? new Set(expectedRefs.validObjRefs) : null;
  const validEvdRefsSet = expectedRefs?.validEvdRefs ? new Set(expectedRefs.validEvdRefs) : null;

  const invalidObjRefs: string[] = [];
  const invalidEvdRefs: string[] = [];
  const validatedActivities: V3BlueprintActivityDraft[] = [];

  for (let i = 0; i < rawJson.activities.length; i++) {
    const act = rawJson.activities[i];
    const itemIndex = i + 1;

    if (!act || typeof act !== 'object') {
      return { success: false, error: `กิจกรรมลำดับที่ ${itemIndex} โครงสร้างไม่ถูกต้อง` };
    }

    const title = String(act.title || '').trim();
    if (!title) {
      return { success: false, error: `กิจกรรมลำดับที่ ${itemIndex} ต้องมีชื่อกิจกรรม (title)` };
    }

    const phase = String(act.phase || 'OTHER').trim().toUpperCase();
    const minutes = Number(act.minutes);
    if (isNaN(minutes) || minutes <= 0) {
      return { success: false, error: `กิจกรรมลำดับที่ ${itemIndex} ต้องระบุเวลาเป็นตัวเลขมากกว่า 0` };
    }

    // Teacher Actions
    let teacherActions: string[] = [];
    if (Array.isArray(act.teacherActions)) {
      teacherActions = act.teacherActions.map((s: any) => String(s || '').trim()).filter(Boolean);
    } else if (typeof act.teacherActions === 'string' && act.teacherActions.trim()) {
      teacherActions = [act.teacherActions.trim()];
    }

    if (teacherActions.length === 0) {
      return { success: false, error: `กิจกรรมลำดับที่ ${itemIndex} (${title}) ต้องระบุบทบาทครู (teacherActions)` };
    }

    // Student Actions — MUST NOT BE EMPTY
    let studentActions: string[] = [];
    if (Array.isArray(act.studentActions)) {
      studentActions = act.studentActions.map((s: any) => String(s || '').trim()).filter(Boolean);
    } else if (typeof act.studentActions === 'string' && act.studentActions.trim()) {
      studentActions = [act.studentActions.trim()];
    }

    if (studentActions.length === 0) {
      return {
        success: false,
        error: `กิจกรรมลำดับที่ ${itemIndex} (${title}) ต้องระบุบทบาทผู้เรียน (studentActions) ห้ามมีแต่บทบาทครูบรรยาย`,
      };
    }

    // Linked Objective Refs
    const linkedObjectiveRefs: string[] = Array.isArray(act.linkedObjectiveRefs)
      ? act.linkedObjectiveRefs.map((r: any) => String(r || '').trim().toUpperCase()).filter(Boolean)
      : [];

    if (validObjRefsSet) {
      for (const ref of linkedObjectiveRefs) {
        if (!validObjRefsSet.has(ref)) {
          invalidObjRefs.push(ref);
        }
      }
    }

    // Linked Evidence Refs
    const linkedEvidenceRefs: string[] = Array.isArray(act.linkedEvidenceRefs)
      ? act.linkedEvidenceRefs.map((r: any) => String(r || '').trim().toUpperCase()).filter(Boolean)
      : [];

    if (validEvdRefsSet) {
      for (const ref of linkedEvidenceRefs) {
        if (!validEvdRefsSet.has(ref)) {
          invalidEvdRefs.push(ref);
        }
      }
    }

    // Formative Check
    let formativeCheck: { enabled: boolean; description: string } | undefined;
    if (act.formativeCheck && typeof act.formativeCheck === 'object') {
      const desc = String(act.formativeCheck.description || '').trim();
      formativeCheck = {
        enabled: Boolean(act.formativeCheck.enabled || desc.length > 0),
        description: desc,
      };
    }

    // Feedback
    let feedback: { enabled: boolean; description: string } | undefined;
    if (act.feedback && typeof act.feedback === 'object') {
      const desc = String(act.feedback.description || '').trim();
      feedback = {
        enabled: Boolean(act.feedback.enabled || desc.length > 0),
        description: desc,
      };
    }

    // Asset Hints
    const requiredAssetHints: string[] = Array.isArray(act.requiredAssetHints)
      ? act.requiredAssetHints.map((h: any) => String(h || '').trim()).filter(Boolean)
      : [];

    validatedActivities.push({
      temporaryId: String(act.temporaryId || `A${itemIndex}`),
      phase,
      title,
      minutes,
      teacherActions,
      studentActions,
      linkedObjectiveRefs,
      linkedEvidenceRefs,
      formativeCheck,
      feedback,
      requiredAssetHints,
    });
  }

  // 3. Check for invalid references
  if (invalidObjRefs.length > 0 || invalidEvdRefs.length > 0) {
    const errorDetails = [
      invalidObjRefs.length > 0 ? `จุดประสงค์ที่ไม่มีอยู่จริง: ${invalidObjRefs.join(', ')}` : '',
      invalidEvdRefs.length > 0 ? `หลักฐานที่ไม่มีอยู่จริง: ${invalidEvdRefs.join(', ')}` : '',
    ].filter(Boolean).join('; ');

    return {
      success: false,
      error: `AI อ้างอิงรหัสเชื่อมโยงไม่ถูกต้อง (${errorDetails})`,
      invalidObjRefs,
      invalidEvdRefs,
    };
  }

  return {
    success: true,
    data: {
      summary: {
        lessonApproach,
        learningFlow,
      },
      activities: validatedActivities,
    },
  };
}
