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
    // Primary Gemini Call (1 primary request with built-in retry on network/auth error)
    attemptsMade += 1;
    const response = await fetchGeminiWithRetry(
      apiUrl,
      payload,
      3,
      options?.customApiKey,
      planId,
      35_000
    );

    const resJson = await response.json();
    const rawAiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawAiText) {
      return {
        success: false,
        error: 'ยังสร้างกิจกรรมไม่สำเร็จ ไม่ได้รับเนื้อหาจาก AI กรุณาลองใหม่อีกครั้ง',
      };
    }

    // Clean JSON if needed
    let cleaned = rawAiText.trim();
    const match = cleaned.match(/```(?:json)?([\s\S]*?)```/);
    if (match) {
      cleaned = match[1].trim();
    } else {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(cleaned);
    } catch (parseErr: any) {
      return {
        success: false,
        error: 'รูปแบบข้อมูลจาก AI ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง',
      };
    }

    // Layer 2 & 3: Schema & Ref validation
    validation = validateBlueprintResponse(parsedJson, expectedRefs);

    // If invalid refs were returned (e.g. O99), retry ONCE with corrective instruction
    if (!validation.success && (validation.invalidObjRefs?.length || validation.invalidEvdRefs?.length)) {
      const correctionPrompt = `ผลลัพธ์รอบแรกมีการอ้างอิงรหัสที่ไม่มีอยู่จริง:
${validation.invalidObjRefs?.length ? `จุดประสงค์ที่ผิด: ${validation.invalidObjRefs.join(', ')} (ที่ถูกต้องมีเฉพาะ: ${expectedRefs.validObjRefs.join(', ')})` : ''}
${validation.invalidEvdRefs?.length ? `หลักฐานที่ผิด: ${validation.invalidEvdRefs.join(', ')} (ที่ถูกต้องมีเฉพาะ: ${expectedRefs.validEvdRefs.join(', ')})` : ''}
กรุณาแก้ไข JSON และส่งกลับมาใหม่โดยอ้างอิงเฉพาะรหัสที่กำหนดเท่านั้น`;

      const retryPayload = {
        contents: [
          { role: 'user', parts: [{ text: userPrompt }] },
          { role: 'model', parts: [{ text: rawAiText }] },
          { role: 'user', parts: [{ text: correctionPrompt }] },
        ],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 8192,
          temperature: 0.1,
        },
      };

      const retryResponse = await fetchGeminiWithRetry(
        apiUrl,
        retryPayload,
        2,
        options?.customApiKey,
        planId,
        25_000
      );
      const retryResJson = await retryResponse.json();
      const retryText = retryResJson.candidates?.[0]?.content?.parts?.[0]?.text;

      if (retryText) {
        let retryCleaned = retryText.trim();
        const retryMatch = retryCleaned.match(/```(?:json)?([\s\S]*?)```/);
        if (retryMatch) retryCleaned = retryMatch[1].trim();
        const retryParsed = JSON.parse(retryCleaned);
        validation = validateBlueprintResponse(retryParsed, expectedRefs);
      }
    }
  } catch (apiErr: any) {
    console.error('[BlueprintService] Gemini API call error:', apiErr);
    return {
      success: false,
      error: apiErr.message || 'ยังสร้างกิจกรรมไม่สำเร็จ ข้อมูลแผนของคุณยังอยู่ครบ กรุณาลองใหม่อีกครั้ง',
    };
  }

  if (!validation || !validation.success || !validation.data) {
    return {
      success: false,
      error: validation?.error || 'การตรวจสอบความถูกต้องของกิจกรรมไม่ผ่าน กรุณาลองใหม่อีกครั้ง',
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
