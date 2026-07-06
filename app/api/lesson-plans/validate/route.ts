import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  createLessonPlanHash,
  isEvaluationMode,
  preValidateLessonPlan,
  toCanonicalLessonPlan,
  validateAlignment,
  validateAssessment,
  validateGpas,
  type EvaluationMode,
} from '@/lib/lesson-plan';

export const dynamic = 'force-dynamic';

const errorResponse = (
  errorCode: string,
  message: string,
  status: number,
  details: Record<string, unknown> = {}
) => NextResponse.json({
  ok: false,
  errorCode,
  message,
  details,
  recoverable: status < 500,
}, { status });

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(
        'E_PERMISSION_DENIED',
        'กรุณาเข้าสู่ระบบก่อนตรวจความพร้อมของแผน',
        401
      );
    }

    let body: Record<string, unknown>;
    try {
      const parsed = await req.json();
      body = parsed && typeof parsed === 'object'
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return errorResponse(
        'E_INVALID_JSON',
        'รูปแบบข้อมูลที่ส่งมาไม่ถูกต้อง',
        400
      );
    }

    const requestedMode = body.evaluationMode ?? 'lesson_plan_basic';
    if (!isEvaluationMode(requestedMode)) {
      return errorResponse(
        'E_INVALID_EVALUATION_MODE',
        'โหมดประเมินไม่ถูกต้อง',
        400,
        {
          allowedModes: [
            'lesson_plan_basic',
            'wpa_w9',
            'committee_4d',
          ],
        }
      );
    }
    const evaluationMode: EvaluationMode = requestedMode;

    let sourcePlan: unknown = body.lessonPlan;
    const lessonPlanId = String(body.lessonPlanId || '').trim();

    if (!sourcePlan && lessonPlanId) {
      const { data, error } = await supabase
        .from('LessonPlans')
        .select('*')
        .eq('planId', lessonPlanId)
        .single();

      if (error || !data) {
        return errorResponse(
          'E_LESSON_PLAN_NOT_FOUND',
          'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์เข้าถึงแผนนี้',
          404,
          { lessonPlanId }
        );
      }
      sourcePlan = data;
    }

    if (!sourcePlan) {
      return errorResponse(
        'E_VALIDATION_FAILED',
        'กรุณาส่ง lessonPlan หรือ lessonPlanId',
        400
      );
    }

    const plan = toCanonicalLessonPlan(sourcePlan);
    const preValidation = preValidateLessonPlan(plan, evaluationMode);
    const alignment = validateAlignment(plan);
    const gpas = validateGpas(plan);
    const assessment = validateAssessment(plan, evaluationMode);
    const lessonPlanHash = createLessonPlanHash(plan);

    return NextResponse.json({
      ok: true,
      ready: preValidation.ready,
      status: preValidation.status,
      evaluationMode,
      lessonPlanHash,
      issues: preValidation.issues,
      missingRequiredSections: preValidation.missingRequiredSections,
      alignment,
      gpas,
      assessment,
      message: preValidation.ready
        ? 'แผนมีองค์ประกอบขั้นต่ำพร้อมเข้าสู่กระบวนการประเมิน'
        : 'แผนยังไม่พร้อม กรุณาแก้ไข critical issues ก่อนส่งประเมิน',
      warnings: [],
    });
  } catch (error) {
    console.error('Lesson plan validation failed:', error);
    return errorResponse(
      'E_VALIDATION_INTERNAL',
      'ไม่สามารถตรวจความพร้อมของแผนได้ กรุณาลองใหม่อีกครั้ง',
      500
    );
  }
}
