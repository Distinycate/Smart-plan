/**
 * Smart Plan V3 — Blueprint Generation Service
 * Calls Gemini with validated context, parses structured JSON, enforces
 * schema and reference integrity, and returns Blueprint Preview.
 * CRITICAL: NEVER automatically writes to database!
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';
import { buildLessonGenerationContext } from './contextBuilder';
import { buildBlueprintPrompt } from './blueprintPrompt';
import { validateBlueprintResponse, BlueprintValidationResult } from './blueprintSchema';
import { validateActivityRules } from '../rules/activityRules';
import { getActivityFlowSuggestions } from '../suggestions/activityFlowSuggestions';
import { V3LessonBlueprint, V3BlueprintActivityDraft, V3ActivityRuleSummary } from '../types';

export interface GenerateBlueprintResult {
  success: boolean;
  error?: string;
  blueprint?: V3LessonBlueprint;
  previewActivities?: V3BlueprintActivityDraft[];
  ruleSummary?: V3ActivityRuleSummary;
  meta?: {
    model: string;
    durationMs: number;
    activityCount: number;
    totalMinutes: number;
  };
}

export async function generateLessonBlueprint(
  planId: string,
  supabase: SupabaseClient,
  userId: string,
  options?: {
    customApiKey?: string;
    isAdmin?: boolean;
  }
): Promise<GenerateBlueprintResult> {
  const startTime = Date.now();

  // 1. Build and validate lesson context
  const contextResult = await buildLessonGenerationContext(
    planId,
    supabase,
    userId,
    options?.isAdmin || false
  );

  if (!contextResult.valid || !contextResult.context || !contextResult.refMaps) {
    return {
      success: false,
      error: contextResult.error || 'ข้อมูลแผนการสอนไม่ผ่านเงื่อนไขการสร้างกิจกรรม',
    };
  }

  const { context, refMaps } = contextResult;

  // 2. Prepare Gemini prompt
  const { systemInstruction, userPrompt } = buildBlueprintPrompt(context);

  const modelName = 'gemini-2.5-flash';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 8192,
      temperature: 0.2,
    },
  };

  const expectedRefs = {
    validObjRefs: context.objectives.map(o => o.ref),
    validEvdRefs: context.evidence.map(e => e.ref),
  };

  let validation: BlueprintValidationResult | null = null;
  let attemptsMade = 0;

  try {
    // Primary Gemini Call (capped at 5.5s with deterministic active learning fallback)
    attemptsMade += 1;
    const response = await fetchGeminiWithRetry(
      apiUrl,
      payload,
      1,
      options?.customApiKey,
      planId,
      5_500
    );

    const resJson = await response.json();
    const rawAiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (rawAiText) {
      // Clean JSON if needed
      let cleaned = rawAiText.trim();
      const match = cleaned.match(/```(?:json)?([\s\S]*?)```/);
      if (match) {
        cleaned = match[1].trim();
      } else {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      }

      try {
        const parsedJson = JSON.parse(cleaned);
        validation = validateBlueprintResponse(parsedJson, expectedRefs);
      } catch (parseErr) {
        console.warn('[BlueprintService] JSON parse failed, falling back to deterministic flow');
      }
    }
  } catch (apiErr: any) {
    console.warn('[BlueprintService] Gemini API timed out or errored, invoking deterministic Active Learning flow fallback:', apiErr);
  }

  // If Gemini failed or validation was incomplete, smoothly fall back to high-quality deterministic flow
  if (!validation || !validation.success || !validation.data) {
    const flows = getActivityFlowSuggestions({
      subjectKey: context.subjectProfile?.key || context.subject || 'GENERAL',
      learningFocus: context.learningFocus,
      topic: context.topic,
      durationMinutes: context.durationMinutes || 60,
      objectiveIds: context.objectives.map(o => o.id),
      evidenceIds: context.evidence.map(e => e.id),
    });

    const flowDrafts = flows[0]?.activities || [];
    const fallbackActivities: V3BlueprintActivityDraft[] = flowDrafts.map((act, idx) => ({
      temporaryId: `A${idx + 1}`,
      phase: act.phase as any,
      title: act.title,
      minutes: act.minutes,
      teacherActions: act.teacherActions,
      studentActions: act.studentActions,
      linkedObjectiveRefs: context.objectives.map((_, i) => `O${i + 1}`),
      linkedEvidenceRefs: context.evidence.length > 0 ? ['E1'] : [],
      resolvedObjectiveIds: context.objectives.map(o => o.id),
      resolvedEvidenceIds: context.evidence.map(e => e.id),
      formativeCheck: act.formativeCheck || {
        enabled: idx >= 3,
        description: 'สังเกตพฤติกรรมและการมีส่วนร่วมของนักเรียน',
      },
      feedback: act.feedback || {
        enabled: idx === 2,
        description: 'ครูให้คำแนะนำระหว่างฝึกปฏิบัติ',
      },
    }));

    const ruleSummary = validateActivityRules({
      lesson: { duration_minutes: context.durationMinutes },
      objectives: context.objectives.map(o => ({ id: o.id, statement: o.statement })),
      evidence: context.evidence.map(e => ({ id: e.id, description: e.description })),
      activities: fallbackActivities.map((act, idx) => ({
        position: idx + 1,
        minutes: act.minutes,
        teacher_actions: act.teacherActions.join('\n'),
        student_actions: act.studentActions.join('\n'),
        assessment_moment: act.formativeCheck?.enabled ? act.formativeCheck.description : null,
        feedback_moment: act.feedback?.enabled ? act.feedback.description : null,
        linkedObjectiveIds: act.resolvedObjectiveIds,
        linkedEvidenceIds: act.resolvedEvidenceIds,
      })),
    });

    return {
      success: true,
      blueprint: {
        summary: {
          lessonApproach: 'Active Learning (การจัดการเรียนรู้เชิงรุก)',
          learningFlow: 'กระบวนการจัดการเรียนรู้ 5 ขั้นตอน (นำเข้าสู่บทเรียน - จัดการเรียนรู้ - ฝึกปฏิบัติ - นำไปใช้ - สรุปประเมินผล)',
        },
        activities: fallbackActivities,
      },
      previewActivities: fallbackActivities,
      ruleSummary,
      meta: {
        model: 'deterministic-active-learning-engine',
        durationMs: Date.now() - startTime,
        activityCount: fallbackActivities.length,
        totalMinutes: fallbackActivities.reduce((s, a) => s + a.minutes, 0),
      },
    };
  }

  const blueprint = validation.data;

  // 3. Resolve temporary refs (O1, E1) back to real database UUIDs
  const previewActivities: V3BlueprintActivityDraft[] = blueprint.activities.map((act, idx) => {
    const resolvedObjectiveIds = act.linkedObjectiveRefs
      .map(ref => refMaps.objRefToId[ref])
      .filter(Boolean);

    const resolvedEvidenceIds = act.linkedEvidenceRefs
      .map(ref => refMaps.evdRefToId[ref])
      .filter(Boolean);

    return {
      ...act,
      temporaryId: `A${idx + 1}`,
      resolvedObjectiveIds,
      resolvedEvidenceIds,
    };
  });

  // 4. Rule validation on the preview activities
  const ruleSummary = validateActivityRules({
    lesson: { duration_minutes: context.durationMinutes },
    objectives: context.objectives.map(o => ({ id: o.id, statement: o.statement })),
    evidence: context.evidence.map(e => ({ id: e.id, description: e.description })),
    activities: previewActivities.map((act, idx) => ({
      position: idx + 1,
      minutes: act.minutes,
      teacher_actions: act.teacherActions.join('\n'),
      student_actions: act.studentActions.join('\n'),
      assessment_moment: act.formativeCheck?.enabled ? act.formativeCheck.description : null,
      feedback_moment: act.feedback?.enabled ? act.feedback.description : null,
      linkedObjectiveIds: act.resolvedObjectiveIds,
      linkedEvidenceIds: act.resolvedEvidenceIds,
    })),
  });

  const durationMs = Date.now() - startTime;
  const totalMinutes = previewActivities.reduce((s, a) => s + a.minutes, 0);

  return {
    success: true,
    blueprint,
    previewActivities,
    ruleSummary,
    meta: {
      model: modelName,
      durationMs,
      activityCount: previewActivities.length,
      totalMinutes,
    },
  };
}
