/**
 * Smart Plan V3 — AI Assessment Tool Generator Service
 * Server-authoritative, preview-first generator for Rubric, Checklist, Scoring Guide, etc.
 * Zero direct DB mutations during generation.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';
import { V3Repository } from '../repository';
import { getSubjectProfile } from '../subjectProfiles/registry';
import { getAssessmentSuggestions } from '../suggestions/assessmentSuggestions';
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
    source: 'AI' | 'DETERMINISTIC_RULES';
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
      1,
      params.customApiKey,
      params.planId,
      5_500
    );

    const resJson = await rawRes.json();
    const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (rawText) {
      const validation = validateAiToolResponse(rawText, params.toolType);
      if (validation.valid && validation.toolContent) {
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
      }
    }
  } catch (err: any) {
    console.warn('[AssessmentToolService] AI call timed out or failed, generating instant deterministic rubric/checklist:', err);
  }

  // ─── Instant Deterministic Fallback ───────────────────────────────────────
  const suggestions = getAssessmentSuggestions({
    subjectKey: lesson.subject_key || 'GENERAL',
    learningFocus: lesson.learning_focus,
    topic: lesson.topic,
    primaryEvidenceType: evidenceType,
  });

  const chosen = suggestions.find(s => s.toolType === params.toolType) || suggestions[0];
  const fallbackTitle = chosen ? chosen.toolTitle : `แบบประเมินและเกณฑ์รูบริกเรื่อง ${lesson.topic}`;

  const fallbackContent = {
    title: fallbackTitle,
    description: chosen ? chosen.description : `เกณฑ์การประเมิน 4 ระดับคุณภาพสำหรับการจัดการเรียนรู้เรื่อง ${lesson.topic}`,
    criteria: [
      {
        name: 'ด้านความรู้ความเข้าใจ (Knowledge: K)',
        weight: 40,
        levels: [
          { level: 4, label: 'ดีมาก', description: `อธิบายและระบุสาระสำคัญเรื่อง ${lesson.topic} ได้อย่างถูกต้องครบถ้วน ชัดเจน และเชื่อมโยงประเด็นได้ดีเยี่ยม` },
          { level: 3, label: 'ดี', description: `อธิบายสาระสำคัญเรื่อง ${lesson.topic} ได้ถูกต้องเป็นส่วนใหญ่ สื่อความหมายได้เข้าใจชัดเจน` },
          { level: 2, label: 'พอใช้', description: `อธิบายสาระสำคัญเรื่อง ${lesson.topic} ได้บางส่วน ต้องมีคำชี้แนะเสริม` },
          { level: 1, label: 'ปรับปรุง', description: `ยังไม่สามารถอธิบายสาระสำคัญเรื่อง ${lesson.topic} ได้ ต้องได้รับการช่วยเหลือ` },
        ],
      },
      {
        name: 'ด้านทักษะกระบวนการและการปฏิบัติ (Process: P)',
        weight: 40,
        levels: [
          { level: 4, label: 'ดีมาก', description: `ลงมือปฏิบัติตามขั้นตอนได้อย่างคล่องแคล่ว ถูกต้อง และสร้างสรรค์ผลงานได้อย่างมีคุณภาพสูง` },
          { level: 3, label: 'ดี', description: `ลงมือปฏิบัติตามขั้นตอนได้ถูกต้อง ทำงานเสร็จสมบูรณ์ตามเวลาที่กำหนด` },
          { level: 2, label: 'พอใช้', description: `ปฏิบัติตามขั้นตอนได้ แต่ยังมีข้อผิดพลาดเล็กน้อย ทำงานล่าช้ากว่ากำหนด` },
          { level: 1, label: 'ปรับปรุง', description: `ไม่สามารถปฏิบัติงานตามขั้นตอนได้ ต้องมีผู้ช่วยเหลือตลอดเวลา` },
        ],
      },
      {
        name: 'ด้านคุณลักษณะอันพึงประสงค์ (Attitude: A)',
        weight: 20,
        levels: [
          { level: 4, label: 'ดีมาก', description: 'มีความมุ่งมั่น กระตือรือร้น และให้ความร่วมมือในการทำงานกลุ่มอย่างดีเยี่ยม' },
          { level: 3, label: 'ดี', description: 'มีความมุ่งมั่นและร่วมมือในการทำงานกลุ่มเป็นอย่างดี' },
          { level: 2, label: 'พอใช้', description: 'ร่วมมือในการทำงานเมื่อได้รับมอบหมาย แต่ยังขาดความกระตือรือร้น' },
          { level: 1, label: 'ปรับปรุง', description: 'ไม่ค่อยมีส่วนร่วมในการทำงานกลุ่ม ต้องคอยกระตุ้นเตือน' },
        ],
      },
    ],
    passingScore: 60,
  };

  return {
    success: true,
    preview: {
      toolType: params.toolType,
      title: fallbackTitle,
      content: fallbackContent,
      source: 'DETERMINISTIC_RULES',
    },
    meta: {
      model: 'deterministic-assessment-engine',
      durationMs: Date.now() - startTime,
    },
  };
}
