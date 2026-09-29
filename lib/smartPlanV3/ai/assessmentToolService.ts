/**
 * Smart Plan V3 — AI Assessment Tool Generator Service
 * Server-authoritative, preview-first generator for Rubric, Checklist, Scoring Guide, etc.
 * Zero direct DB mutations during generation.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';
import { V3Repository } from '../repository';
import { getSubjectProfile } from '../subjectProfiles/registry';
import { buildAssessmentToolPrompt, AssessmentToolPromptInput } from './assessmentToolPrompt';
import { validateAiToolResponse } from './assessmentToolSchema';

export interface GenerateAssessmentToolParams {
  planId: string;
  assessmentId: string;
  toolType: string;
  levelsCount?: number;
  supabase: SupabaseClient;
  userId: string;
  isAdmin?: boolean;
  customApiKey?: string;
}

export interface GenerateAssessmentToolResult {
  success: boolean;
  error?: string;
  preview?: {
    toolType: string;
    title: string;
    content: Record<string, any>;
    source: 'AI';
  };
  meta?: {
    model: string;
    durationMs: number;
  };
}

export async function generateAssessmentTool(
  params: GenerateAssessmentToolParams
): Promise<GenerateAssessmentToolResult> {
  const startTime = Date.now();
  const repo = new V3Repository(params.supabase);

  // 1. Server-authoritative validation & loading
  const lesson = await repo.getLessonById(params.planId, params.userId, params.isAdmin);
  if (!lesson) {
    return { success: false, error: 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์เข้าถึง' };
  }

  const assessment = await repo.getAssessmentById(params.assessmentId);
  if (!assessment || assessment.lesson_plan_id !== params.planId) {
    return { success: false, error: 'ไม่พบรายการประเมินที่ระบุ' };
  }

  // Answer Key safety check
  if (params.toolType === 'ANSWER_KEY') {
    return {
      success: false,
      error: 'ยังสร้างเฉลยไม่ได้ เนื่องจากยังไม่มีข้อคำถาม (ชุดคำถาม/แบบฝึกหัดจะจัดทำในขั้นตอน Teaching Package)',
    };
  }

  // Load Evidence and Objectives
  const allEvidence = await repo.getEvidence(params.planId);
  const allObjectives = await repo.getObjectives(params.planId);

  // Find linked evidence
  let targetEvidence = allEvidence.filter((e) =>
    assessment.linkedEvidenceIds.includes(e.id)
  );
  if (targetEvidence.length === 0 && allEvidence.length > 0) {
    // Fallback to first evidence if none linked
    targetEvidence = [allEvidence[0]];
  }

  const primaryEvidence = targetEvidence[0] || null;
  const evidenceTitle = primaryEvidence ? primaryEvidence.description : assessment.name;
  const evidenceDesc = primaryEvidence ? primaryEvidence.description : '';
  const evidenceType = primaryEvidence ? primaryEvidence.evidence_type : '';

  // Find related objectives for target evidence
  const { data: objEvdLinks } = await params.supabase
    .from('v3_objective_evidence_links')
    .select('*')
    .in('evidence_id', targetEvidence.map((e) => e.id));

  const linkedObjIds = new Set<string>((objEvdLinks || []).map((l: any) => l.objective_id));
  const relevantObjectives = allObjectives.filter(
    (o) => linkedObjIds.size === 0 || linkedObjIds.has(o.id)
  );

  // Find linked activity (if any)
  let activityContext: any = null;
  if (assessment.linkedActivityIds.length > 0) {
    const act = await repo.getActivityById(assessment.linkedActivityIds[0]);
    if (act) {
      activityContext = {
        title: act.title,
        teacher_actions: act.teacher_actions,
        student_actions: act.student_actions,
        assessment_moment: act.assessment_moment,
      };
    }
  }

  // Load subject profile
  const profile = getSubjectProfile(lesson.subject_key);
  const subjectName = profile ? profile.labelTh : lesson.subject_key;
  const learningFocus = lesson.learning_focus || 'ทั่วไป';

  // 2. Build Prompt
  const promptInput: AssessmentToolPromptInput = {
    subjectKey: lesson.subject_key,
    subjectName,
    gradeLevel: lesson.grade_level,
    topic: lesson.topic,
    learningFocus,
    toolType: params.toolType,
    evidenceTitle,
    evidenceDescription: evidenceDesc,
    evidenceType,
    objectives: relevantObjectives.map((o) => ({ text: o.statement })),
    activityContext,
    levelsCount: params.levelsCount || 4,
  };

  const { systemInstruction, userPrompt } = buildAssessmentToolPrompt(promptInput);

  // 3. Call Gemini
  const apiKey =
    params.customApiKey ||
    process.env.GEMINI_API_KEY_PROCESS ||
    process.env.GEMINI_API_KEY_EVALUATE ||
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'ระบบยังไม่ได้ตั้งค่า GEMINI_API_KEY' };
  }

  const model = process.env.GEMINI_FAST_MODEL || 'gemini-2.5-flash';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const primaryPayload = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  };

  try {
    const rawRes = await fetchGeminiWithRetry(
      apiUrl,
      primaryPayload,
      3,
      params.customApiKey,
      params.planId,
      30_000
    );

    const resJson = await rawRes.json();
    const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return { success: false, error: 'ไม่ได้รับข้อมูลตอบกลับจากแบบจำลอง AI' };
    }

    // 4. Validate output
    const validation = validateAiToolResponse(rawText, params.toolType);
    if (!validation.valid || !validation.toolContent) {
      // Auto-retry once with correction prompt
      console.warn('AI Assessment Tool response invalid, retrying with correction:', validation.error);
      const correctionPrompt = `${userPrompt}\n\nข้อผิดพลาดในการสร้างรอบก่อนหน้า: ${validation.error}\nโปรดแก้ไขและส่งคืนเฉพาะ JSON ที่ถูกต้องสมบูรณ์ตาม Schema เท่านั้น`;

      const retryPayload = {
        contents: [{ role: 'user', parts: [{ text: correctionPrompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      };

      const retryRes = await fetchGeminiWithRetry(
        apiUrl,
        retryPayload,
        2,
        params.customApiKey,
        params.planId,
        30_000
      );

      const retryJson = await retryRes.json();
      const retryText = retryJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!retryText) {
        return { success: false, error: validation.error || 'โครงสร้างข้อมูลเครื่องมือไม่ถูกต้อง' };
      }

      const retryValidation = validateAiToolResponse(retryText, params.toolType);
      if (!retryValidation.valid || !retryValidation.toolContent) {
        return { success: false, error: retryValidation.error || 'โครงสร้างข้อมูลเครื่องมือไม่ถูกต้อง' };
      }

      const title = retryValidation.toolContent.title || `เครื่องมือประเมิน (${params.toolType})`;
      return {
        success: true,
        preview: {
          toolType: params.toolType,
          title,
          content: retryValidation.toolContent,
          source: 'AI',
        },
        meta: {
          model,
          durationMs: Date.now() - startTime,
        },
      };
    }

    const title = validation.toolContent.title || `เครื่องมือประเมิน (${params.toolType})`;
    return {
      success: true,
      preview: {
        toolType: params.toolType,
        title,
        content: validation.toolContent,
        source: 'AI',
      },
      meta: {
        model,
        durationMs: Date.now() - startTime,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: `การเรียก AI ล้มเหลว: ${err.message || 'Network error'}`,
    };
  }
}
