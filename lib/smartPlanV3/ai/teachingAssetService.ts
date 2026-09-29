/**
 * Scoped Teaching Asset AI Service (Wave V3.6)
 * Generates 1 Asset preview at a time with strict context scoping and schema validation.
 * NEVER saves directly to DB.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { V3Repository } from '../repository';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';
import {
  TEACHING_ASSET_SYSTEM_INSTRUCTION,
  TeachingAssetPromptContext,
  buildTeachingAssetPrompt,
} from './teachingAssetPrompt';
import { validateTeachingAssetContent } from '../teachingAssets/schemas';

export interface GenerateTeachingAssetParams {
  planId: string;
  assetType: string;
  supabase: SupabaseClient;
  userId: string;
  isAdmin?: boolean;
  activityId?: string;
  parentAssetId?: string;
  userPromptNotes?: string;
  customApiKey?: string;
}

export interface GenerateTeachingAssetResult {
  success: boolean;
  assetType: string;
  title?: string;
  preview?: any;
  error?: string;
  validationErrors?: string[];
}

/**
 * Server-Side Context Builder
 * Pulls directly from DB and strictly sanitizes data.
 * Zero user UUID, email, student names, or irrelevant graph nodes.
 */
export async function buildTeachingAssetContext(
  params: GenerateTeachingAssetParams
): Promise<{ context: TeachingAssetPromptContext; error?: string }> {
  const repo = new V3Repository(params.supabase);
  const graph = await repo.getLessonGraph(params.planId, params.userId, params.isAdmin);

  if (!graph) {
    return {
      context: null as any,
      error: 'ไม่พบข้อมูลแผนการจัดการเรียนรู้ หรือไม่มีสิทธิ์เข้าถึง',
    };
  }

  const { lesson, curriculumLinks, objectives, activities, evidence, assessmentTools, teachingAssets } = graph;

  // Answer Key Guard: Check parent asset
  let parentAssetContent: any = null;
  const normType = (params.assetType || '').toUpperCase().trim();
  if (normType === 'ANSWER_KEY') {
    let parentAsset = null;
    if (params.parentAssetId) {
      parentAsset = teachingAssets.find((a) => a.id === params.parentAssetId);
    } else {
      parentAsset = teachingAssets.find(
        (a) =>
          a.asset_type.toUpperCase() === 'WORKSHEET' ||
          a.asset_type.toUpperCase() === 'PROBLEM_SET' ||
          a.asset_type.toUpperCase() === 'QUESTION_SET' ||
          a.asset_type.toUpperCase() === 'EXPERIMENT_SHEET'
      );
    }

    if (!parentAsset || !parentAsset.content || Object.keys(parentAsset.content).length === 0) {
      return {
        context: null as any,
        error: 'ไม่สามารถสร้างเฉลยได้ เนื่องจากยังไม่มีใบงานหรือชุดแบบฝึกหัดต้นทาง กรุณาสร้างและบันทึกใบงานก่อน',
      };
    }
    parentAssetContent = parentAsset.content;
  }

  // Filter activities if activityId specified
  const filteredActivities = params.activityId
    ? activities.filter((a) => a.id === params.activityId)
    : activities;

  const context: TeachingAssetPromptContext = {
    subject: lesson.subject_key,
    grade: lesson.grade_level,
    topic: lesson.topic,
    learningFocus: lesson.learning_focus || '',
    durationMinutes: lesson.duration_minutes || 60,
    assetType: params.assetType,
    indicators: curriculumLinks.map((c) => ({
      code: c.indicator_code,
      text: c.indicator_label_snapshot,
    })),
    objectives: objectives.map((o) => ({
      statement: o.statement,
      type: o.objective_type,
    })),
    activities: (filteredActivities.length > 0 ? filteredActivities : activities).map((a) => ({
      position: a.position,
      phase: a.phase,
      minutes: a.minutes,
      title: a.title,
      teacherActions: a.teacher_actions || '',
      studentActions: a.student_actions || '',
    })),
    evidence: evidence.map((e) => ({
      description: e.description,
      type: e.evidence_type,
    })),
    assessmentToolSummary: assessmentTools.map((t) => `${t.tool_type}: ${t.title}`).join(', '),
    parentAssetContent,
    userPromptNotes: params.userPromptNotes,
  };

  return { context };
}

/**
 * Generate 1 Scoped Teaching Asset Preview
 */
export async function generateTeachingAssetPreview(
  params: GenerateTeachingAssetParams
): Promise<GenerateTeachingAssetResult> {
  const { context, error: ctxError } = await buildTeachingAssetContext(params);
  if (ctxError || !context) {
    return {
      success: false,
      assetType: params.assetType,
      error: ctxError || 'สร้างบริบทไม่สำเร็จ',
    };
  }

  // API Key check
  const apiKey =
    params.customApiKey ||
    process.env.GEMINI_API_KEY_PROCESS ||
    process.env.GEMINI_API_KEY_EVALUATE ||
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      assetType: params.assetType,
      error: 'ระบบยังไม่ได้ตั้งค่า GEMINI_API_KEY',
    };
  }

  const promptText = buildTeachingAssetPrompt(context);
  const model = process.env.GEMINI_FAST_MODEL || 'gemini-2.5-flash';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: promptText }] }],
    systemInstruction: { parts: [{ text: TEACHING_ASSET_SYSTEM_INSTRUCTION }] },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 3000,
      responseMimeType: 'application/json',
    },
  };

  try {
    const rawRes = await fetchGeminiWithRetry(
      apiUrl,
      payload,
      3,
      params.customApiKey,
      params.planId,
      35_000
    );

    const resJson = await rawRes.json();
    const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return {
        success: false,
        assetType: params.assetType,
        error: 'ไม่ได้รับข้อมูลตอบกลับจากแบบจำลอง AI กรุณาลองใหม่อีกครั้ง',
      };
    }

    let parsedContent: any = null;
    try {
      // Remove any markdown code block wrapper if present
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      parsedContent = JSON.parse(cleaned);
    } catch (parseErr: any) {
      console.warn('Initial JSON parse failed, retrying once with correction prompt');
      const correctionPayload = {
        contents: [
          { role: 'user', parts: [{ text: `${promptText}\n\nคำตอบรอบก่อนหน้าไม่ใช่ JSON ที่ถูกต้อง กรุณาส่งคืนเฉพาะ JSON บริสุทธิ์เท่านั้น` }] },
        ],
        systemInstruction: { parts: [{ text: TEACHING_ASSET_SYSTEM_INSTRUCTION }] },
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 3000,
          responseMimeType: 'application/json',
        },
      };

      const retryRes = await fetchGeminiWithRetry(
        apiUrl,
        correctionPayload,
        2,
        params.customApiKey,
        params.planId,
        35_000
      );
      const retryJson = await retryRes.json();
      const retryText = retryJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (retryText) {
        const cleanedRetry = retryText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        parsedContent = JSON.parse(cleanedRetry);
      }
    }

    if (!parsedContent) {
      return {
        success: false,
        assetType: params.assetType,
        error: 'รูปแบบข้อมูลที่ AI ส่งกลับไม่สามารถแปลงเป็น JSON ได้',
      };
    }

    // Schema Validation
    const validation = validateTeachingAssetContent(params.assetType, parsedContent);
    if (!validation.valid) {
      console.warn('Schema validation errors:', validation.errors);
      return {
        success: true, // Still allow previewing with validation warnings
        assetType: params.assetType,
        title: parsedContent.title || 'สื่อการสอน',
        preview: parsedContent,
        validationErrors: validation.errors,
      };
    }

    return {
      success: true,
      assetType: params.assetType,
      title: parsedContent.title || 'สื่อการสอน',
      preview: parsedContent,
    };
  } catch (err: any) {
    console.error('generateTeachingAssetPreview error:', err);
    return {
      success: false,
      assetType: params.assetType,
      error: `เกิดข้อผิดพลาดในการสร้างสื่อ: ${err.message || 'Unknown error'} ข้อมูลแผนของคุณยังอยู่ครบ`,
    };
  }
}
