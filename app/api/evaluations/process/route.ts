import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  aggregateScore,
  evaluateSection,
  prioritizeIssues,
  validateAlignment,
  validateAssessment,
  validateGpas,
  type EvaluationSectionResult,
} from '@/lib/lesson-plan';
import {
  getOwnedJob,
  loadCanonicalPlan,
  safeErrorMessage,
} from '@/lib/lesson-plan/jobs/server';
import type { EvaluationResultRecord } from '@/lib/lesson-plan/jobs/types';
import { classifyAIError } from '@/lib/ai/ai-error-classifier';
import { logApiError, logApiInfo } from '@/lib/logger';
import { fail, ok } from '@/lib/api-response';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let claimedResult: EvaluationResultRecord | null = null;
  let jobId = '';
  const context = 'api/evaluations/process';
  let step = 'parse_request';

  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return fail('AUTH_REQUIRED', 'กรุณาเข้าสู่ระบบก่อนประมวลผลงานประเมิน', { step });
    }

    let body: Record<string, unknown>;
    try {
      const value = await request.json();
      body = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    } catch {
      return fail('UNKNOWN_ERROR', 'รูปแบบ JSON ไม่ถูกต้อง', { step, status: 400 });
    }
    
    jobId = String(body.jobId || '').trim();
    if (!jobId) return fail('UNKNOWN_ERROR', 'กรุณาระบุ jobId', { step, status: 400 });

    step = 'fetch_job';
    const job = await getOwnedJob(jobId, user.id);
    if (job.status === 'completed') {
      return ok({ jobId, status: 'completed', progress: 100 }, 'งานประเมินเสร็จแล้ว');
    }
    if (job.status === 'lesson_plan_not_ready' || job.status === 'cancelled') {
      return fail('JOB_PROCESS_FAILED', 'สถานะงานนี้ไม่สามารถประมวลผลได้', { step, metadata: { status: job.status } });
    }

    step = 'claim_section';
    const requestedSection = String(body.section || '').trim();
    let candidateQuery = supabaseAdmin
      .from('evaluation_results')
      .select('*')
      .eq('job_id', jobId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);
    if (requestedSection) candidateQuery = candidateQuery.eq('section', requestedSection);
    
    const { data: candidates, error: candidateError } = await candidateQuery;
    if (candidateError) {
      logApiError(context, candidateError, { step, jobId });
      return fail('SUPABASE_SELECT_FAILED', 'ไม่สามารถค้นหา section ที่ต้องประเมินได้', { step, debugMessage: JSON.stringify(candidateError) });
    }

    const candidate = candidates?.[0] as EvaluationResultRecord | undefined;
    if (!candidate) {
      step = 'check_job_status';
      const { data: allResults, error } = await supabaseAdmin
        .from('evaluation_results')
        .select('status')
        .eq('job_id', jobId);
        
      if (error) {
        logApiError(context, error, { step, jobId });
        return fail('SUPABASE_SELECT_FAILED', 'ไม่สามารถดึงข้อมูลสถานะประเมินรวมได้', { step, debugMessage: JSON.stringify(error) });
      }
      
      const hasProcessing = allResults?.some(result => result.status === 'processing');
      const hasFailed = allResults?.some(result => result.status === 'failed');
      
      const finalStatus = hasProcessing ? 'processing' : hasFailed ? 'failed' : job.status;
      
      if (finalStatus === 'failed' && job.status !== 'failed') {
        await supabaseAdmin.from('evaluation_jobs').update({
          status: 'failed',
          error_message: 'ประเมินไม่ครบทุกส่วนเนื่องจากมีข้อผิดพลาด กรุณา Retry',
          current_section: null
        }).eq('id', jobId);
      }
      
      return ok({
        jobId,
        status: finalStatus,
        claimed: false,
        processNext: false,
      }, hasProcessing ? 'มี worker อื่นกำลังประมวลผล section นี้' : hasFailed ? 'มี section ที่ล้มเหลว กรุณา retry' : 'ไม่มี section รอประมวลผล');
    }

    const now = new Date().toISOString();
    const { data: claimedRows, error: claimError } = await supabaseAdmin
      .from('evaluation_results')
      .update({
        status: 'processing',
        started_at: now,
        error_message: null,
        attempt_count: Number(candidate.attempt_count || 0) + 1,
      })
      .eq('id', candidate.id)
      .eq('status', 'pending')
      .select('*');
      
    if (claimError) {
      logApiError(context, claimError, { step, jobId });
      return fail('SUPABASE_UPDATE_FAILED', 'อัปเดตสถานะ section ไม่สำเร็จ', { step, debugMessage: JSON.stringify(claimError) });
    }
    
    if (!claimedRows?.length) {
      return ok({ jobId, claimed: false, status: 'processing', processNext: true }, 'section ถูก worker อื่นรับไปแล้ว');
    }
    claimedResult = claimedRows[0] as EvaluationResultRecord;

    step = 'update_job_started';
    await supabaseAdmin.from('evaluation_jobs').update({
      status: 'processing',
      current_section: claimedResult.section,
      started_at: job.started_at || now,
      error_message: null,
    }).eq('id', jobId).eq('user_id', user.id);

    step = 'evaluate_section';
    const plan = await loadCanonicalPlan(job);
    const ruleBasedFindings = {
      alignment: validateAlignment(plan),
      gpas: validateGpas(plan),
      assessment: validateAssessment(plan, job.evaluation_mode),
    };
    const outcome = await evaluateSection({
      plan,
      mode: job.evaluation_mode,
      section: claimedResult.section,
      ruleBasedFindings,
    });

    step = 'save_section_result';
    const result = outcome.result;
    const completedAt = new Date().toISOString();
    const { error: resultError } = await supabaseAdmin
      .from('evaluation_results')
      .update({
        status: 'completed',
        score: result.score,
        max_score: result.max_score,
        level: result.level,
        evidence_found: result.evidence_found,
        missing_evidence: result.missing_evidence,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        suggestions: result.suggestions,
        issues: result.issues,
        raw_json: result,
        error_message: null,
        completed_at: completedAt,
      })
      .eq('id', claimedResult.id)
      .eq('status', 'processing');
      
    if (resultError) {
      logApiError(context, resultError, { step, jobId });
      throw resultError; // allow catch block to handle it as section failure
    }

    step = 'persist_section_issues';
    await supabaseAdmin
      .from('lesson_plan_issues')
      .delete()
      .eq('job_id', jobId)
      .eq('section', result.section);
      
    if (result.issues.length) {
      const { error } = await supabaseAdmin.from('lesson_plan_issues').insert(
        result.issues.map(issue => ({
          job_id: jobId,
          lesson_plan_id: job.lesson_plan_id,
          section: result.section,
          severity: issue.severity,
          issue_type: issue.issue_type,
          title: issue.title,
          description: issue.description,
          suggestion: issue.suggestion,
          auto_fixable: issue.auto_fixable,
        }))
      );
      if (error) logApiError(context, error, { step, jobId });
    }

    step = 'aggregate_job_progress';
    const { data: records, error: recordsError } = await supabaseAdmin
      .from('evaluation_results')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });
      
    if (recordsError) {
      logApiError(context, recordsError, { step, jobId });
      return fail('SUPABASE_SELECT_FAILED', 'ไม่สามารถดึงผลประเมินรวมได้', { step, debugMessage: JSON.stringify(recordsError) });
    }
    
    const completed = (records || []).filter(item => item.status === 'completed');
    const total = records?.length || 0;
    const progress = total ? Math.round((completed.length / total) * 100) : 0;
    const hasRemaining = (records || []).some(item => item.status === 'pending' || item.status === 'processing');

    if (hasRemaining) {
      await supabaseAdmin.from('evaluation_jobs').update({
        status: 'processing',
        progress,
        current_section: null,
      }).eq('id', jobId);
      return ok({
        jobId,
        status: 'processing',
        section: result.section,
        sectionResult: result,
        consistencyFlags: outcome.consistencyFlags,
        progress,
        processNext: true,
      }, 'ประเมิน section สำเร็จ');
    }

    step = 'finalize_job';
    const sectionResults = (records || [])
      .map(item => item.raw_json)
      .filter(Boolean) as EvaluationSectionResult[];
    const aggregate = aggregateScore(sectionResults);
    const prioritizedIssues = prioritizeIssues(sectionResults);
    const finalResult = {
      jobId,
      lessonPlanId: job.lesson_plan_id,
      lessonPlanHash: job.lesson_plan_hash,
      evaluationMode: job.evaluation_mode,
      aggregate,
      sections: sectionResults,
      issues: prioritizedIssues,
    };

    await supabaseAdmin.from('evaluation_jobs').update({
      status: 'completed',
      current_section: null,
      progress: 100,
      final_score: aggregate.percentage,
      final_level: aggregate.level,
      readiness_status: aggregate.readinessStatus,
      completed_at: completedAt,
      error_message: null,
      metadata: {
        ...(job.metadata || {}),
        cacheHit: false,
        result: finalResult,
      },
    }).eq('id', jobId);

    const { error: cacheError } = await supabaseAdmin.from('evaluation_cache').upsert({
      lesson_plan_hash: job.lesson_plan_hash,
      evaluation_mode: job.evaluation_mode,
      final_score: aggregate.percentage,
      final_level: aggregate.level,
      result_json: finalResult,
    }, { onConflict: 'lesson_plan_hash,evaluation_mode' });
    if (cacheError) logApiError(context, cacheError, { step, jobId });

    return ok({
      jobId,
      status: 'completed',
      section: result.section,
      progress: 100,
      processNext: false,
      result: finalResult,
    }, 'ประเมินครบทุก section แล้ว');

  } catch (error) {
    logApiError(context, error, { step, jobId });
    
    if (claimedResult && jobId) {
      const message = safeErrorMessage(error);
      const errorType = classifyAIError(error);

      await supabaseAdmin.from('evaluation_results').update({
        status: 'failed',
        error_message: message,
        completed_at: new Date().toISOString(),
      }).eq('id', claimedResult.id);

      await supabaseAdmin.from('evaluation_jobs').update({
        status: 'failed',
        current_section: claimedResult.section,
        error_message: message,
      }).eq('id', jobId);

      return fail(
        errorType === 'rate_limit' ? 'AI_RATE_LIMIT' : 'JOB_PROCESS_FAILED',
        errorType === 'rate_limit'
          ? 'AI ถูกจำกัดโควตาชั่วคราว กรุณากด retry อีกครั้ง'
          : 'AI ประเมิน section นี้ไม่สำเร็จ กรุณากด retry',
        {
          step,
          retryable: true,
          metadata: { jobId, section: claimedResult.section, errorType },
        }
      );
    }
    
    return fail('UNKNOWN_ERROR', 'เกิดข้อผิดพลาดภายในระบบ', { step, debugMessage: error instanceof Error ? error.message : String(error) });
  }
}
