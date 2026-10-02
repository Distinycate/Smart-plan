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

import { getObjectiveSuggestions } from '../suggestions/objectiveSuggestions';
import { getEvidenceSuggestions } from '../suggestions/evidenceSuggestions';

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
 * Self-healing: Automatically provisions sensible defaults for missing components so AI generation never abruptly fails.
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

  const { lesson } = graph;
  let { curriculumLinks, objectives, evidence, objectiveEvidenceLinks } = graph;

  // 1. Auto-heal essential lesson metadata if missing
  if (!lesson.duration_minutes || lesson.duration_minutes <= 0) {
    lesson.duration_minutes = 60;
    try { await repo.updateLesson(planId, { duration_minutes: 60 }, lesson.user_id, true); } catch {}
  }
  if (!lesson.learning_focus?.trim()) {
    lesson.learning_focus = 'ACTIVE_LEARNING';
    try { await repo.updateLesson(planId, { learning_focus: 'ACTIVE_LEARNING' }, lesson.user_id, true); } catch {}
  }
  if (!lesson.topic?.trim()) {
    lesson.topic = 'การจัดการเรียนรู้เชิงรุก (Active Learning)';
    try { await repo.updateLesson(planId, { topic: lesson.topic }, lesson.user_id, true); } catch {}
  }

  // 2. Auto-heal curriculum links if empty
  if (!curriculumLinks || curriculumLinks.length === 0) {
    try {
      const defaultIndicatorText = `เข้าใจและนำความรู้เกี่ยวกับ ${lesson.topic} ไปประยุกต์ใช้ได้อย่างถูกต้อง`;
      curriculumLinks = await repo.replaceCurriculumLinks(planId, [{
        lesson_plan_id: planId,
        curriculum_version: lesson.curriculum_version || 'OBEC-2551-REV60',
        subject_key: lesson.subject_key || 'GENERAL',
        grade_level: lesson.grade_level || 'ม.1',
        standard_code: 'มฐ.แกนกลาง',
        indicator_code: 'ตชว.1',
        standard_label_snapshot: 'มาตรฐานการเรียนรู้แกนกลางตามหลักสูตร',
        indicator_label_snapshot: `[ระหว่างทาง] ${defaultIndicatorText}`,
        position: 0,
      }]);
    } catch {}
  }

  // 3. Auto-heal objectives if empty
  if (!objectives || objectives.length === 0) {
    try {
      const suggestions = getObjectiveSuggestions({
        subjectKey: lesson.subject_key || 'GENERAL',
        learningFocus: lesson.learning_focus || 'ACTIVE_LEARNING',
        topic: lesson.topic,
        indicatorText: curriculumLinks[0]?.indicator_label_snapshot || '',
        durationMinutes: lesson.duration_minutes || 60,
      });
      objectives = [];
      for (let i = 0; i < suggestions.length; i++) {
        const sug = suggestions[i];
        const obj = await repo.createObjective({
          lesson_plan_id: planId,
          statement: sug.statement,
          position: i,
          objective_type: sug.category || null,
          observable_behavior: sug.observableVerb || null,
          source: 'AI',
        });
        objectives.push(obj);
      }
    } catch {}
  }

  // 4. Auto-heal evidence if empty
  if (!evidence || evidence.length === 0) {
    try {
      const evdSuggestions = getEvidenceSuggestions({
        subjectKey: lesson.subject_key || 'GENERAL',
        learningFocus: lesson.learning_focus || 'ACTIVE_LEARNING',
        topic: lesson.topic,
      });
      evidence = [];
      for (let i = 0; i < Math.min(2, evdSuggestions.length); i++) {
        const sug = evdSuggestions[i];
        const evd = await repo.createEvidence({
          lesson_plan_id: planId,
          evidence_type: sug.evidenceType,
          description: sug.description,
          position: i,
          source: 'AI',
        });
        evidence.push(evd);
      }
    } catch {}
  }

  // 5. Auto-link unlinked objectives to primary evidence
  const linkedObjIds = new Set<string>();
  for (const link of objectiveEvidenceLinks) {
    linkedObjIds.add(link.objective_id);
  }

  const primaryEvd = evidence?.[0];
  if (primaryEvd && objectives && objectives.length > 0) {
    for (const obj of objectives) {
      if (!linkedObjIds.has(obj.id)) {
        try {
          const newLink = await repo.linkObjectiveEvidence(obj.id, primaryEvd.id);
          objectiveEvidenceLinks.push(newLink);
          linkedObjIds.add(obj.id);
        } catch {}
      }
    }
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
