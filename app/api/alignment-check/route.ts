import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { validateAiQueueAdmission } from '@/lib/aiQueueServer';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';
import { validateAlignmentResult } from '@/lib/alignmentResultValidation';
import { newEntityId, unitError, unitSuccess } from '@/lib/unitPlanApi';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const parseIds = (value: unknown) =>
  Array.isArray(value)
    ? value.map(String).filter(Boolean)
    : String(value || '').split(',').map(item => item.trim()).filter(Boolean);

export async function POST(req: NextRequest) {
  try {
    const admissionError = await validateAiQueueAdmission(req);
    if (admissionError) return admissionError;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unitError('E_PERMISSION_DENIED', 'กรุณาเข้าสู่ระบบ', 401);

    const body = await req.json();
    const scope = body.scope === 'lessonPlan' ? 'lessonPlan' : body.scope === 'unitPlan' ? 'unitPlan' : '';
    const scopeId = String(body.scopeId || '');
    if (!scope || !scopeId) {
      return unitError('E_VALIDATION_FAILED', 'กรุณาระบุขอบเขตและรหัสแผน', 400);
    }

    let source: any;
    if (scope === 'unitPlan') {
      const { data, error } = await supabase
        .from('UnitPlans')
        .select('unitPlanId, unitName, gradeLevel, subjectName, totalUnitHours, indicatorIds, unitLearningOutcomes, unitAssessmentOverview, UnitLessons(lessonOrder, lessonTitle, lessonTopic, estimatedHours, learningFocus, lessonStatus), UnitAssessments(assessmentName, method, tool, criteria, indicatorIds)')
        .eq('unitPlanId', scopeId)
        .single();
      if (error || !data) return unitError('E_UNIT_NOT_FOUND', 'ไม่พบแผนระดับหน่วย', 404);
      source = {
        ...data,
        UnitLessons: (data.UnitLessons || []).filter((item: any) => item.lessonStatus !== 'archived'),
      };
    } else {
      const { data, error } = await supabase
        .from('LessonPlans')
        .select('planId, lessonTopic, gradeLevel, subjectName, totalHours, learningStandard, indicatorDuring, indicatorFinal, indicatorSelectedIds, objectiveK, objectiveP, objectiveA, learningProcess, measureK, methodK, toolK, criteriaK, rubricK, measureP, methodP, toolP, criteriaP, rubricP, measureA, methodA, toolA, criteriaA, rubricA')
        .eq('planId', scopeId)
        .single();
      if (error || !data) return unitError('E_LESSON_NOT_FOUND', 'ไม่พบแผนรายคาบ', 404);
      source = data;
    }

    const indicatorIds = parseIds(source.indicatorIds || source.indicatorSelectedIds);
    const { data: indicators, error: indicatorError } = indicatorIds.length
      ? await supabase
          .from('Indicators')
          .select('indicatorId, indicatorCode, indicatorText, indicatorType, standardCode, standardText')
          .in('indicatorId', indicatorIds)
      : { data: [], error: null };
    if (indicatorError) throw indicatorError;

    const groundingWarnings: string[] = [];
    if (!indicatorIds.length) {
      groundingWarnings.push('ไม่พบรหัสตัวชี้วัดที่เชื่อมฐานข้อมูล ระบบจะวิเคราะห์เฉพาะข้อความที่ครูระบุและห้ามสร้างรหัสใหม่');
    } else if ((indicators || []).length !== indicatorIds.length) {
      groundingWarnings.push('มีตัวชี้วัดบางรหัสที่ไม่พบในฐานข้อมูล');
    }

    const safeSource = { ...source, indicators: indicators || [] };
    delete safeSource.indicatorIds;
    delete safeSource.indicatorSelectedIds;

    const apiKey = process.env.GEMINI_API_KEY_ALIGNMENT || process.env.GEMINI_API_KEY;
    if (!apiKey) return unitError('E_AI_FAILED', 'ยังไม่ได้ตั้งค่า AI Alignment', 503);

    const prompt = `คุณเป็นผู้ตรวจความสอดคล้องแผนการสอนภาษาไทย
กฎบังคับ:
1. ห้ามสร้างหรือแก้รหัสตัวชี้วัด ใช้เฉพาะ indicators ใน INPUT
2. วิเคราะห์ Indicator → Objective/Outcome → Activity/Lesson Sequence → Assessment → Rubric
3. ถ้าข้อมูลไม่พอให้ลดคะแนนและเขียน warning ห้ามเดา
4. ให้ข้อเสนอแนะเท่านั้น ห้ามอ้างว่าได้แก้ข้อมูลจริง
5. คะแนนทุกมิติ 0-100

INPUT:
${JSON.stringify({ scope, plan: safeSource, groundingWarnings })}

ตอบ JSON object เท่านั้น:
{
  "overallScore": 0,
  "level": "",
  "dimensionScores": {
    "indicatorAlignment": 0,
    "objectiveQuality": 0,
    "activityAlignment": 0,
    "assessmentAlignment": 0,
    "rubricQuality": 0,
    "feasibility": 0,
    "languageClarity": 0,
    "teacherReadiness": 0
  },
  "strengths": [],
  "weaknesses": [],
  "criticalIssues": [],
  "suggestions": [],
  "revisedSuggestions": {},
  "warnings": []
}`;

    const response = await fetchGeminiWithRetry(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4096 },
      },
      3,
      apiKey
    );
    const aiResponse = await response.json();
    const rawText = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return unitError('E_AI_INVALID_OUTPUT', 'AI ไม่ได้ส่งผลวิเคราะห์กลับมา', 502);

    let parsed: any;
    try {
      parsed = JSON.parse(String(rawText).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    } catch {
      return unitError('E_AI_INVALID_OUTPUT', 'รูปแบบผลวิเคราะห์จาก AI ไม่ถูกต้อง', 502);
    }

    const validated = validateAlignmentResult(parsed);
    if (!validated) return unitError('E_AI_INVALID_OUTPUT', 'คะแนนหรือโครงสร้างผลวิเคราะห์ไม่ถูกต้อง', 502);
    validated.warnings = [...groundingWarnings, ...validated.warnings];

    const adminDb = getSupabaseAdmin();
    const { data: history, error: historyError } = await adminDb.from('AIHistory').insert({
      aiHistoryId: newEntityId('AIH'),
      user_id: user.id,
      scope,
      scopeId,
      actionType: 'alignment_check',
      promptVersion: 'alignment-v1',
      modelName: 'gemini-2.5-flash',
      inputSummaryJson: {
        indicatorIds,
        lessonCount: source.UnitLessons?.length || undefined,
        hasAssessment: Boolean(source.unitAssessmentOverview || source.measureK || source.UnitAssessments?.length),
      },
      outputJson: validated,
      warningsJson: validated.warnings,
      reviewStatus: 'pending',
      createdAt: new Date().toISOString(),
    }).select('aiHistoryId').single();

    if (historyError) {
      console.error('AIHistory insert failed:', historyError);
      return unitError('E_AI_HISTORY_FAILED', 'ไม่สามารถบันทึกประวัติ AI จึงยังไม่แสดงผลวิเคราะห์', 500);
    }

    const { error: logError } = await adminDb.from('System_Logs').insert({
      logId: newEntityId('LOG'),
      timestamp: new Date().toISOString(),
      action: 'RUN_ALIGNMENT_CHECK',
      status: 'success',
      planId: scopeId,
      message: `ตรวจความสอดคล้อง ${scope} คะแนน ${validated.overallScore}`,
      userEmail: user.email,
    });
    if (logError) console.error('RUN_ALIGNMENT_CHECK log failed:', logError);

    return unitSuccess({
      aiHistoryId: history.aiHistoryId,
      result: validated,
      previewOnly: true,
    }, 'ตรวจความสอดคล้องเรียบร้อยแล้ว');
  } catch (error: any) {
    console.error('Alignment check failed:', error);
    return unitError('E_AI_FAILED', 'ไม่สามารถตรวจความสอดคล้องได้ กรุณาลองใหม่อีกครั้ง', 500);
  }
}
