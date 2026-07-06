import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  createLessonPlanHash,
  getEvaluationMode,
  getRubricCriterion,
  isEvaluationMode,
  preValidateLessonPlan,
  toCanonicalLessonPlan,
  type EvaluationMode,
} from '@/lib/lesson-plan';
import {
  evaluationErrorResponse,
  invalidRequest,
} from '@/lib/lesson-plan/jobs/http';
import { qualityPlatformAdmin } from '@/lib/lesson-plan/jobs/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        errorCode: 'E_PERMISSION_DENIED',
        message: 'กรุณาเข้าสู่ระบบก่อนสร้างงานประเมิน',
        details: {},
        recoverable: true,
      }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      const value = await request.json();
      body = value && typeof value === 'object'
        ? value as Record<string, unknown>
        : {};
    } catch {
      return invalidRequest('รูปแบบ JSON ไม่ถูกต้อง');
    }

    const lessonPlanId = String(body.lessonPlanId || '').trim();
    if (!lessonPlanId) return invalidRequest('กรุณาระบุ lessonPlanId');

    const requestedMode = body.evaluationMode ?? 'lesson_plan_basic';
    if (!isEvaluationMode(requestedMode)) {
      return invalidRequest('evaluationMode ไม่ถูกต้อง', {
        allowedModes: ['lesson_plan_basic', 'wpa_w9', 'committee_4d'],
      });
    }
    const evaluationMode: EvaluationMode = requestedMode;

    // The authenticated client enforces LessonPlans ownership through existing RLS.
    const { data: sourcePlan, error: planError } = await supabase
      .from('LessonPlans')
      .select('*')
      .eq('planId', lessonPlanId)
      .maybeSingle();
    if (planError || !sourcePlan) {
      return NextResponse.json({
        ok: false,
        errorCode: 'E_LESSON_PLAN_NOT_FOUND',
        message: 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์เข้าถึง',
        details: { lessonPlanId },
        recoverable: true,
      }, { status: 404 });
    }

    const plan = toCanonicalLessonPlan(sourcePlan);
    const lessonPlanHash = createLessonPlanHash(plan);
    const validation = preValidateLessonPlan(plan, evaluationMode);
    const admin = qualityPlatformAdmin();

    const { data: cached } = await admin
      .from('evaluation_cache')
      .select('final_score,final_level,result_json,expires_at')
      .eq('lesson_plan_hash', lessonPlanHash)
      .eq('evaluation_mode', evaluationMode)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .maybeSingle();

    const status = !validation.ready
      ? 'lesson_plan_not_ready'
      : cached
        ? 'completed'
        : 'pending';
    const metadata = {
      source: 'quality-platform-phase5',
      cacheHit: Boolean(cached),
      validation: {
        missingRequiredSections: validation.missingRequiredSections,
      },
      ...(cached ? { cachedResult: cached.result_json } : {}),
    };
    const now = new Date().toISOString();

    const { data: job, error: jobError } = await admin
      .from('evaluation_jobs')
      .insert({
        lesson_plan_id: lessonPlanId,
        user_id: user.id,
        evaluation_mode: evaluationMode,
        lesson_plan_hash: lessonPlanHash,
        status,
        progress: cached ? 100 : 0,
        final_score: cached?.final_score ?? null,
        final_level: cached?.final_level ?? null,
        readiness_status: cached ? 'cached' : null,
        metadata,
        completed_at: cached || !validation.ready ? now : null,
      })
      .select('id,status,progress')
      .single();
    if (jobError || !job) throw jobError || new Error('job insert failed');

    if (!validation.ready && validation.issues.length) {
      const { error } = await admin.from('lesson_plan_issues').insert(
        validation.issues.map(issue => ({
          job_id: job.id,
          lesson_plan_id: lessonPlanId,
          section: issue.section,
          severity: issue.severity,
          issue_type: issue.code,
          title: issue.message,
          description: issue.message,
          suggestion: issue.suggestion,
          auto_fixable: false,
        }))
      );
      if (error) console.error('Could not persist pre-validation issues:', error);
    }

    if (validation.ready && !cached) {
      const sections = getEvaluationMode(evaluationMode).sections;
      const rows = sections.map(section => ({
        job_id: job.id,
        section,
        status: 'pending',
        max_score: getRubricCriterion(evaluationMode, section)?.maxScore,
      }));
      if (rows.some(row => !row.max_score)) {
        throw new Error('Rubric and mode section registry are inconsistent');
      }
      const { error } = await admin.from('evaluation_results').insert(rows);
      if (error) {
        await admin
          .from('evaluation_jobs')
          .update({ status: 'failed', error_message: 'section initialization failed' })
          .eq('id', job.id);
        throw error;
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        jobId: job.id,
        status,
        ready: validation.ready,
        cacheHit: Boolean(cached),
        lessonPlanHash,
        progress: cached ? 100 : 0,
        issues: validation.ready ? [] : validation.issues,
        missingRequiredSections: validation.missingRequiredSections,
      },
      message: !validation.ready
        ? 'แผนยังไม่พร้อมสำหรับการประเมิน'
        : cached
          ? 'พบผลประเมินจาก cache'
          : 'สร้างงานประเมินแล้ว',
      warnings: [],
      elapsedMs: Date.now() - startedAt,
    }, { status: 201 });
  } catch (error) {
    return evaluationErrorResponse(error);
  }
}
