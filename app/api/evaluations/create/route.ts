import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  createLessonPlanHash,
  getRubricCriterion,
  preValidateLessonPlan,
  toCanonicalLessonPlan,
} from '@/lib/lesson-plan';
import { normalizeEvaluationMode, getEvaluationMode } from '@/lib/lesson-plan/evaluation/modes';
import { logApiError, logApiInfo } from '@/lib/logger';
import { fail, ok } from '@/lib/api-response';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

export async function POST(request: NextRequest) {
  const context = 'api/evaluations/create';
  let step = 'parse_request';
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return fail('AUTH_REQUIRED', 'กรุณาเข้าสู่ระบบก่อนสร้างงานประเมิน', { step });
    }

    let body: Record<string, unknown>;
    try {
      const value = await request.json();
      body = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    } catch {
      return fail('UNKNOWN_ERROR', 'รูปแบบ JSON ไม่ถูกต้อง', { step, status: 400 });
    }

    const lessonPlanId = String(body.lessonPlanId || '').trim();
    if (!lessonPlanId) {
      return fail('UNKNOWN_ERROR', 'กรุณาระบุ lessonPlanId', { step, status: 400 });
    }

    step = 'normalize_mode';
    const requestedMode = String(body.evaluationMode || 'lesson_plan_basic');
    const evaluationMode = normalizeEvaluationMode(requestedMode);
    if (!evaluationMode) {
      return fail('INVALID_EVALUATION_MODE', 'evaluationMode ไม่ถูกต้อง', { step });
    }

    step = 'fetch_lesson_plan';
    // Use the authenticated client so the same RLS/admin policy as the plan
    // detail page decides access. A strict owner-id filter broke the Admin
    // evaluator because Admin can legitimately inspect teachers' plans.
    const { data: sourcePlan, error: planError } = await supabase
      .from('LessonPlans')
      .select('*')
      .eq('planId', lessonPlanId)
      .maybeSingle();
    if (planError || !sourcePlan) {
      logApiError(context, planError || new Error('Lesson plan not found'), { lessonPlanId });
      return fail('LESSON_PLAN_NOT_FOUND', 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์เข้าถึง', { step });
    }
    
    const userIdToUse = user.id;

    step = 'pre_validate';
    const plan = toCanonicalLessonPlan(sourcePlan);
    const lessonPlanHash = createLessonPlanHash(plan);
    const validation = preValidateLessonPlan(plan, evaluationMode);

    step = 'check_cache';
    const { data: cached, error: cacheErr } = await supabaseAdmin
      .from('evaluation_cache')
      .select('final_score,final_level,result_json,expires_at')
      .eq('lesson_plan_hash', lessonPlanHash)
      .eq('evaluation_mode', evaluationMode)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .maybeSingle();
      
    if (cacheErr && cacheErr.code !== 'PGRST116') {
      logApiError(context, cacheErr, { step, lessonPlanId });
    }

    const status = !validation.ready ? 'lesson_plan_not_ready' : cached ? 'completed' : 'pending';
    const metadata = {
      source: 'quality-platform-phase5',
      cacheHit: Boolean(cached),
      validation: { missingRequiredSections: validation.missingRequiredSections },
      ...(cached ? { cachedResult: cached.result_json } : {}),
    };
    const now = new Date().toISOString();

    step = 'check_existing_job';
    const { data: existingJob, error: existingJobErr } = await supabaseAdmin
      .from('evaluation_jobs')
      .select('id,status,progress')
      .eq('lesson_plan_hash', lessonPlanHash)
      .eq('evaluation_mode', evaluationMode)
      .eq('user_id', user.id)
      .in('status', ['pending', 'completed', 'lesson_plan_not_ready'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingJobErr) {
      logApiError(context, existingJobErr, { step, lessonPlanHash });
    }

    if (existingJob) {
      logApiInfo(context, 'Found existing evaluation job', { jobId: existingJob.id, status: existingJob.status });
      // If it exists, return it immediately to avoid unique constraint violation
      return ok({
        jobId: existingJob.id,
        ready: existingJob.status !== 'lesson_plan_not_ready',
        issues: existingJob.status === 'lesson_plan_not_ready' ? validation.issues : [],
        sections: getEvaluationMode(evaluationMode).sections.map(section => ({
          id: section,
          section,
          label: getRubricCriterion(evaluationMode, section)?.title || section,
        })),
        cacheHit: existingJob.status === 'completed'
      }, 'พบงานประเมินเดิมในระบบ');
    }

    step = 'create_evaluation_job';
    const { data: job, error: jobError } = await supabaseAdmin
      .from('evaluation_jobs')
      .insert({
        lesson_plan_id: lessonPlanId,
        user_id: userIdToUse,
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
      
    if (jobError || !job) {
      logApiError(context, jobError || new Error('Job insert failed'), { step, lessonPlanId, userId: userIdToUse, evaluationMode });
      
      let debugMessage = String(jobError);
      if (jobError && typeof jobError === 'object') {
        const je = jobError as any;
        debugMessage = JSON.stringify({
          code: je.code,
          message: je.message,
          details: je.details,
          hint: je.hint,
        });
      }

      return fail('SUPABASE_INSERT_FAILED', 'ไม่สามารถสร้างงานประเมินได้', { step, debugMessage });
    }

    step = 'persist_validation_issues';
    if (!validation.ready && validation.issues.length) {
      const { error } = await supabaseAdmin.from('lesson_plan_issues').insert(
        validation.issues.map(issue => ({
          job_id: job.id,
          lesson_plan_id: lessonPlanId,
          section: issue.section,
          severity: issue.severity,
          issue_type: issue.code,
          title: issue.message,
          description: issue.message,
          suggestion: issue.suggestion || null,
          auto_fixable: false,
        }))
      );
      if (error) {
        logApiError(context, error, { step, jobId: job.id });
      }
    }

    step = 'initialize_evaluation_results';
    if (validation.ready && !cached) {
      const sections = getEvaluationMode(evaluationMode).sections;
      const rows = sections.map(section => ({
        job_id: job.id,
        section,
        status: 'pending',
        max_score: getRubricCriterion(evaluationMode, section)?.maxScore || 1,
      }));
      const { error: resultsError } = await supabaseAdmin.from('evaluation_results').insert(rows);
      if (resultsError) {
        logApiError(context, resultsError, { step, jobId: job.id });
        await supabaseAdmin.from('evaluation_jobs').update({ status: 'failed', error_message: 'section initialization failed' }).eq('id', job.id);
        return fail('SUPABASE_INSERT_FAILED', 'ไม่สามารถบันทึกส่วนประเมินได้', { step, debugMessage: JSON.stringify(resultsError) });
      }
    }

    logApiInfo(context, 'Evaluation job created', { jobId: job.id, status });
    return ok({
      jobId: job.id,
      status,
      ready: validation.ready,
      cacheHit: Boolean(cached),
      lessonPlanHash,
      progress: cached ? 100 : 0,
      issues: validation.ready ? [] : validation.issues,
      missingRequiredSections: validation.missingRequiredSections,
      sections: getEvaluationMode(evaluationMode).sections.map(section => ({
        id: section,
        section,
        label: getRubricCriterion(evaluationMode, section)?.title || section,
      })),
    }, !validation.ready ? 'แผนยังไม่พร้อมสำหรับการประเมิน' : cached ? 'พบผลประเมินจาก cache' : 'สร้างงานประเมินแล้ว');
  } catch (error) {
    logApiError(context, error, { step });
    return fail('UNKNOWN_ERROR', 'เกิดข้อผิดพลาดภายในระบบ', { step, debugMessage: error instanceof Error ? error.message : String(error) });
  }
}
