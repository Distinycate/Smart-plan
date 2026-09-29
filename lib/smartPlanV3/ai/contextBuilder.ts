/**
 * Smart Plan V3 — Lesson Generation Context Builder
 * Loads real database entities, checks preconditions, minimizes privacy data,
 * and maps temporary references (O1, O2... / E1, E2...) for Gemini AI.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { V3Repository } from '../repository';
import {
  V3LessonGenerationContext,
  V3ContextObjective,
  V3ContextEvidence,
  V3LessonPlan,
  V3LessonGraph,
} from '../types';
import { getSubjectProfile, getObjectiveGuidance } from '../subjectProfiles/registry';

export interface PreconditionCheckResult {
  valid: boolean;
  error?: string;
  missingFields?: string[];
  context?: V3LessonGenerationContext;
  refMaps?: {
    objRefToId: Record<string, string>;
    idToObjRef: Record<string, string>;
    evdRefToId: Record<string, string>;
    idToEvdRef: Record<string, string>;
  };
}

/**
 * Builds the centralized context for Blueprint generation.
 * Strips all sensitive teacher/student privacy information.
 */
export async function buildLessonGenerationContext(
  planId: string,
  supabase: SupabaseClient,
  userId: string,
  isAdmin: boolean = false
): Promise<PreconditionCheckResult> {
  const repo = new V3Repository(supabase);
  const graph: V3LessonGraph | null = await repo.getLessonGraph(planId, userId, isAdmin);

  if (!graph || !graph.lesson) {
    return {
      valid: false,
      error: 'ไม่พบข้อมูลแผนการสอน หรือคุณไม่มีสิทธิ์เข้าถึง',
      missingFields: ['lesson_not_found'],
    };
  }

  const { lesson, curriculumLinks, objectives, evidence, objectiveEvidenceLinks } = graph;

  // 1. Precondition checks
  const missing: string[] = [];

  if (!lesson.subject_key?.trim()) missing.push('กลุ่มสาระการเรียนรู้/วิชา (subject)');
  if (!lesson.grade_level?.trim()) missing.push('ระดับชั้น (grade)');
  if (!lesson.topic?.trim()) missing.push('เรื่อง/หัวข้อการเรียนรู้ (topic)');
  if (!lesson.duration_minutes || lesson.duration_minutes <= 0) missing.push('เวลาคาบเรียน (duration)');
  if (!lesson.learning_focus?.trim()) missing.push('ลักษณะสำคัญของวิชา (learning focus)');
  if (!curriculumLinks || curriculumLinks.length === 0) missing.push('ตัวชี้วัดหลักสูตรอย่างน้อย 1 รายการ (indicator >= 1)');
  if (!objectives || objectives.length === 0) missing.push('จุดประสงค์การเรียนรู้อย่างน้อย 1 ข้อ (objective >= 1)');
  if (!evidence || evidence.length === 0) missing.push('หลักฐานการเรียนรู้อย่างน้อย 1 รายการ (learning evidence >= 1)');

  if (missing.length > 0) {
    return {
      valid: false,
      error: `ยังสร้างกิจกรรมไม่ได้ กรุณาระบุข้อมูลต่อไปนี้ให้ครบก่อน: ${missing.join(', ')}`,
      missingFields: missing,
    };
  }

  // 2. Precondition check: every objective must be linked to at least 1 evidence
  const linkedObjIds = new Set<string>();
  for (const link of objectiveEvidenceLinks) {
    linkedObjIds.add(link.objective_id);
  }

  const unlinkedObjectives = objectives.filter(o => !linkedObjIds.has(o.id));
  if (unlinkedObjectives.length > 0) {
    return {
      valid: false,
      error: 'ยังสร้างกิจกรรมไม่ได้ กรุณากำหนดหลักฐานการเรียนรู้ให้ครบทุกจุดประสงค์ก่อน',
      missingFields: ['objective_evidence_unlinked'],
    };
  }

  // 3. Privacy Data Minimization & Reference Mapping
  // Temporary tokens: O1, O2... for objectives; E1, E2... for evidence
  const objRefToId: Record<string, string> = {};
  const idToObjRef: Record<string, string> = {};
  const contextObjectives: V3ContextObjective[] = objectives.map((obj, idx) => {
    const ref = `O${idx + 1}`;
    objRefToId[ref] = obj.id;
    idToObjRef[obj.id] = ref;
    return {
      ref,
      id: obj.id,
      statement: obj.statement,
      objective_type: obj.objective_type || null,
    };
  });

  const evdRefToId: Record<string, string> = {};
  const idToEvdRef: Record<string, string> = {};
  const contextEvidence: V3ContextEvidence[] = evidence.map((evd, idx) => {
    const ref = `E${idx + 1}`;
    evdRefToId[ref] = evd.id;
    idToEvdRef[evd.id] = ref;
    return {
      ref,
      id: evd.id,
      evidence_type: evd.evidence_type,
      description: evd.description,
    };
  });

  const contextObjEvdLinks = objectiveEvidenceLinks
    .filter(link => idToObjRef[link.objective_id] && idToEvdRef[link.evidence_id])
    .map(link => ({
      objectiveRef: idToObjRef[link.objective_id],
      evidenceRef: idToEvdRef[link.evidence_id],
    }));

  // 4. Fetch Subject Profile Guidance
  const profile = getSubjectProfile(lesson.subject_key);
  const focusKey = (lesson.learning_focus || '').toUpperCase();
  const focusConfig = profile?.learningFocuses.find(f => f.key === focusKey);

  const preferredPatterns = profile?.preferredLearningPatterns?.[focusKey] || [];
  const objectiveGuidance = getObjectiveGuidance(lesson.subject_key, focusKey);
  const evidenceGuidance = profile?.evidenceRules?.[focusKey]?.preferred || [];
  const avoidPatterns = profile?.avoidPatterns || [];

  const context: V3LessonGenerationContext = {
    lessonId: lesson.id,
    subject: lesson.subject_key,
    grade: lesson.grade_level,
    topic: lesson.topic,
    durationMinutes: lesson.duration_minutes || 60,
    learningFocus: focusKey,
    indicators: curriculumLinks.map(c => ({
      code: c.indicator_code,
      text: c.indicator_label_snapshot || c.indicator_code,
    })),
    objectives: contextObjectives,
    evidence: contextEvidence,
    objectiveEvidenceLinks: contextObjEvdLinks,
    subjectProfile: {
      key: profile?.key || lesson.subject_key,
      labelTh: profile?.labelTh || lesson.subject_key,
      learningFocusTh: focusConfig?.labelTh || focusKey,
      preferredLearningPatterns: preferredPatterns,
      objectiveGuidance: objectiveGuidance.slice(0, 8),
      evidenceGuidance: evidenceGuidance,
      avoidPatterns: avoidPatterns,
    },
  };

  return {
    valid: true,
    context,
    refMaps: {
      objRefToId,
      idToObjRef,
      evdRefToId,
      idToEvdRef,
    },
  };
}
