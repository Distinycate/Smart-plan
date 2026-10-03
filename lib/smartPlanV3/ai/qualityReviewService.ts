/**
 * Smart Plan V3 — AI Quality Review Service (Layer 2)
 * On-demand AI qualitative review. 1 AI call per lesson.
 * Never called automatically — requires explicit teacher action.
 */

import { fetchGeminiWithRetry } from '@/lib/geminiClient';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '../repository';
import type { V3LessonGraph } from '../types';
import { buildLessonAlignmentGraph, buildEntityRefs, computeLessonHash } from '../quality/alignmentGraph';
import { runStructuralQualityRules } from '../quality/qualityRules';
import { buildQualityReviewSystemInstruction, buildQualityReviewPrompt } from './qualityReviewPrompt';
import type { V3QualityReviewContext } from './qualityReviewPrompt';
import { validateQualityReviewOutput } from './qualityReviewSchema';
import type { V3AiQualityReviewResult, V3QualityIssue } from '../quality/types';
import { getSubjectProfile } from '../subjectProfiles/registry';

// ─────────────────────────────────────────────────────────────────
// Build sanitized review context (no PII)
// ─────────────────────────────────────────────────────────────────
function buildReviewContext(graph: V3LessonGraph): V3QualityReviewContext {
  const refs = buildEntityRefs(graph);
  const alignmentGraph = buildLessonAlignmentGraph(graph);
  const profile = getSubjectProfile(graph.lesson.subject_key || '');

  const allValidRefs = new Set<string>([
    ...graph.objectives.map(o => refs.objectiveRefs[o.id]).filter(Boolean),
    ...graph.evidence.map(e => refs.evidenceRefs[e.id]).filter(Boolean),
    ...graph.activities.map(a => refs.activityRefs[a.id]).filter(Boolean),
    ...graph.assessments.map(a => refs.assessmentRefs[a.id]).filter(Boolean),
    ...graph.assessmentTools.map(t => refs.toolRefs[t.id]).filter(Boolean),
    ...graph.teachingAssets.map(a => refs.assetRefs[a.id]).filter(Boolean),
  ]);

  const activities = graph.activities.map(act => {
    const linkedObjectiveRefs = graph.activityObjectiveLinks
      .filter(l => l.activity_id === act.id)
      .map(l => refs.objectiveRefs[l.objective_id])
      .filter(Boolean);
    const linkedEvidenceRefs = graph.activityEvidenceLinks
      .filter(l => l.activity_id === act.id)
      .map(l => refs.evidenceRefs[l.evidence_id])
      .filter(Boolean);
    return {
      ref: refs.activityRefs[act.id],
      phase: act.phase,
      minutes: act.minutes,
      title: act.title || undefined,
      studentActions: act.student_actions,
      teacherActions: act.teacher_actions,
      linkedObjectiveRefs,
      linkedEvidenceRefs,
      hasFeedback: Boolean(act.feedback_moment?.trim()),
      hasFormativeCheck: Boolean(act.assessment_moment?.trim()),
    };
  });

  const assessments = graph.assessments.map(asm => {
    const tool = graph.assessmentTools.find(t => t.assessment_id === asm.id);
    const linkedEvidenceRefs = graph.assessmentEvidenceLinks
      .filter(l => l.assessment_id === asm.id)
      .map(l => refs.evidenceRefs[l.evidence_id])
      .filter(Boolean);
    return {
      ref: refs.assessmentRefs[asm.id],
      name: asm.name,
      assessmentType: asm.assessment_type,
      method: asm.method,
      isFormative: asm.formative,
      toolType: tool?.tool_type || undefined,
      linkedEvidenceRefs,
    };
  });

  const focusKey = graph.lesson.learning_focus?.toUpperCase() || '';

  return {
    subject: profile?.labelTh || graph.lesson.subject_key || '',
    subjectKey: graph.lesson.subject_key || '',
    grade: graph.lesson.grade_level || '',
    topic: graph.lesson.topic || '',
    durationMinutes: graph.lesson.duration_minutes || 60,
    learningFocus: graph.lesson.learning_focus || '',
    indicators: graph.curriculumLinks.map(l => ({
      code: l.indicator_code,
      text: l.indicator_label_snapshot,
    })),
    objectives: graph.objectives.map(o => ({
      ref: refs.objectiveRefs[o.id],
      statement: o.statement,
      type: o.objective_type,
    })),
    evidence: graph.evidence.map(e => ({
      ref: refs.evidenceRefs[e.id],
      evidenceType: e.evidence_type,
      description: e.description,
    })),
    activities,
    assessments,
    assetsSummary: graph.teachingAssets.map(a => ({
      ref: refs.assetRefs[a.id],
      type: a.asset_type,
      audience: a.audience,
    })),
    subjectProfileHints: {
      preferredPatterns: profile
        ? Object.values(profile.preferredLearningPatterns || {}).flat().slice(0, 3)
        : [],
      avoidPatterns: profile?.avoidPatterns?.slice(0, 4) || [],
      assessmentGuidance: profile
        ? (profile.assessmentRules[focusKey]?.preferred || []).slice(0, 3)
        : [],
    },
    validRefs: {
      objectives: graph.objectives.map(o => refs.objectiveRefs[o.id]).filter(Boolean),
      evidence: graph.evidence.map(e => refs.evidenceRefs[e.id]).filter(Boolean),
      activities: graph.activities.map(a => refs.activityRefs[a.id]).filter(Boolean),
      assessments: graph.assessments.map(a => refs.assessmentRefs[a.id]).filter(Boolean),
      assets: graph.teachingAssets.map(a => refs.assetRefs[a.id]).filter(Boolean),
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// Main: reviewLessonQuality — 1 AI call
// ─────────────────────────────────────────────────────────────────
export async function reviewLessonQuality(
  planId: string,
  userId: string,
  isAdmin = false
): Promise<V3AiQualityReviewResult> {
  const supabase = createClient();
  const repo = new V3Repository(supabase);

  const graph = await repo.getLessonGraph(planId, userId, isAdmin);
  if (!graph) {
    return {
      issues: [],
      reviewedAt: new Date().toISOString(),
      lessonHash: '',
      aiCallCount: 0,
      valid: false,
      error: 'ไม่พบข้อมูลแผนการสอน',
    };
  }

  const lessonHash = computeLessonHash(graph);

  // Check for cached review (same lesson hash = still current)
  const cached = await repo.getLatestPlanReview(planId, 'AI');
  if (cached && cached.result?.lessonHash === lessonHash) {
    const cachedIssues = (cached.result?.issues || []) as V3QualityIssue[];
    return {
      issues: cachedIssues,
      reviewedAt: cached.created_at,
      lessonHash,
      aiCallCount: 0,
      valid: true,
    };
  }

  // Build context
  const ctx = buildReviewContext(graph);
  const allValidRefs = new Set<string>([
    ...ctx.validRefs.objectives,
    ...ctx.validRefs.evidence,
    ...ctx.validRefs.activities,
    ...ctx.validRefs.assessments,
    ...ctx.validRefs.assets,
  ]);

  // Single AI call
  const modelName = 'gemini-2.5-flash';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

  const prompt = buildQualityReviewPrompt(ctx);
  const systemInstruction = buildQualityReviewSystemInstruction();

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 4096,
      temperature: 0.2,
    },
  };

  let validation: any = null;

  try {
    const response = await fetchGeminiWithRetry(
      apiUrl,
      payload,
      1,
      undefined,
      planId,
      5_500
    );

    const resJson = await response.json();
    const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (rawText) {
      validation = validateQualityReviewOutput(rawText, allValidRefs);
    }
  } catch (aiErr) {
    console.warn('[QualityReviewService] AI call failed or timed out, using deterministic structural rules:', aiErr);
  }

  // If AI was unavailable or invalid, use structural quality rules as clean fallback
  if (!validation || !validation.sanitizedIssues) {
    const alignmentGraph = buildLessonAlignmentGraph(graph);
    const structuralResult = runStructuralQualityRules(graph, alignmentGraph);

    validation = {
      sanitizedIssues: structuralResult.issues,
      valid: true,
      rejectedCount: 0,
      errors: [],
    };
  }

  const reviewedAt = new Date().toISOString();
  const status = validation.sanitizedIssues.some((i: any) => i.severity === 'ERROR')
    ? 'FAILED'
    : validation.sanitizedIssues.some((i: any) => i.severity === 'WARNING')
    ? 'WARNING'
    : 'PASSED';

  // Persist (history preserved)
  await repo.createPlanReview({
    lesson_plan_id: planId,
    review_type: 'AI',
    status,
    result: {
      issues: validation.sanitizedIssues,
      reviewedAt,
      lessonHash,
      aiCallCount: 1,
      valid: validation.valid,
      rejectedCount: validation.rejectedCount,
      errors: validation.errors,
      metadata: {
        criteriaVersion: 'N/A',
        promptVersion: 'v3.7',
      },
    },
  });

  return {
    issues: validation.sanitizedIssues,
    reviewedAt,
    lessonHash,
    aiCallCount: 1,
    valid: validation.valid,
    error: validation.errors.length > 0 ? validation.errors.join('; ') : undefined,
  };
}
