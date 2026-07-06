import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  aggregateScore,
  evaluateSection,
  prioritizeIssues,
  validateAlignment,
  validateAssessment,
  validateGpas,
  type EvaluationSectionResult,
} from '@/lib/lesson-plan';
import { evaluationErrorResponse, invalidRequest } from '@/lib/lesson-plan/jobs/http';
import {
  getOwnedJob,
  loadCanonicalPlan,
  qualityPlatformAdmin,
  safeErrorMessage,
} from '@/lib/lesson-plan/jobs/server';
import type { EvaluationResultRecord } from '@/lib/lesson-plan/jobs/types';
import { classifyAIError } from '@/lib/ai/ai-error-classifier';


export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let claimedResult: EvaluationResultRecord | null = null;
  let jobId = '';
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        errorCode: 'E_PERMISSION_DENIED',
        message: 'กรุณาเข้าสู่ระบบก่อนประมวลผลงานประเมิน',
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
    jobId = String(body.jobId || '').trim();
    if (!jobId) return invalidRequest('กรุณาระบุ jobId');

    const job = await getOwnedJob(jobId, user.id);
    if (job.status === 'completed') {
      return NextResponse.json({
        ok: true,
        data: { jobId, status: 'completed', progress: 100 },
        message: 'งานประเมินเสร็จแล้ว',
        warnings: [],
      });
    }
    if (job.status === 'lesson_plan_not_ready' || job.status === 'cancelled') {
      return NextResponse.json({
        ok: false,
        errorCode: 'E_JOB_NOT_PROCESSABLE',
        message: 'สถานะงานนี้ไม่สามารถประมวลผลได้',
        details: { status: job.status },
        recoverable: false,
      }, { status: 409 });
    }

    const admin = qualityPlatformAdmin();
    const requestedSection = String(body.section || '').trim();
    let candidateQuery = admin
      .from('evaluation_results')
      .select('*')
      .eq('job_id', jobId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);
    if (requestedSection) candidateQuery = candidateQuery.eq('section', requestedSection);
    const { data: candidates, error: candidateError } = await candidateQuery;
    if (candidateError) throw candidateError;

    const candidate = candidates?.[0] as EvaluationResultRecord | undefined;
    if (!candidate) {
      const { data: allResults, error } = await admin
        .from('evaluation_results')
        .select('status')
        .eq('job_id', jobId);
      if (error) throw error;
      const hasProcessing = allResults?.some(result => result.status === 'processing');
      const hasFailed = allResults?.some(result => result.status === 'failed');
      return NextResponse.json({
        ok: true,
        data: {
          jobId,
          status: hasProcessing ? 'processing' : hasFailed ? 'failed' : job.status,
          claimed: false,
          processNext: false,
        },
        message: hasProcessing
          ? 'มี worker อื่นกำลังประมวลผล section นี้'
          : hasFailed
            ? 'มี section ที่ล้มเหลว กรุณา retry'
            : 'ไม่มี section รอประมวลผล',
        warnings: [],
      });
    }

    const now = new Date().toISOString();
    const { data: claimedRows, error: claimError } = await admin
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
    if (claimError) throw claimError;
    if (!claimedRows?.length) {
      return NextResponse.json({
        ok: true,
        data: { jobId, claimed: false, status: 'processing', processNext: true },
        message: 'section ถูก worker อื่นรับไปแล้ว',
        warnings: [],
      });
    }
    claimedResult = claimedRows[0] as EvaluationResultRecord;

    await admin.from('evaluation_jobs').update({
      status: 'processing',
      current_section: claimedResult.section,
      started_at: job.started_at || now,
      error_message: null,
    }).eq('id', jobId).eq('user_id', user.id);

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

    const result = outcome.result;
    const completedAt = new Date().toISOString();
    const { error: resultError } = await admin
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
    if (resultError) throw resultError;

    await admin
      .from('lesson_plan_issues')
      .delete()
      .eq('job_id', jobId)
      .eq('section', result.section);
    if (result.issues.length) {
      const { error } = await admin.from('lesson_plan_issues').insert(
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
      if (error) console.error('Could not persist evaluation issues:', error);
    }

    const { data: records, error: recordsError } = await admin
      .from('evaluation_results')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });
    if (recordsError) throw recordsError;
    const completed = (records || []).filter(item => item.status === 'completed');
    const total = records?.length || 0;
    const progress = total ? Math.round((completed.length / total) * 100) : 0;
    const hasRemaining = (records || []).some(item =>
      item.status === 'pending' || item.status === 'processing'
    );

    if (hasRemaining) {
      await admin.from('evaluation_jobs').update({
        status: 'processing',
        progress,
        current_section: null,
      }).eq('id', jobId);
      return NextResponse.json({
        ok: true,
        data: {
          jobId,
          status: 'processing',
          section: result.section,
          sectionResult: result,
          consistencyFlags: outcome.consistencyFlags,
          progress,
          processNext: true,
        },
        message: 'ประเมิน section สำเร็จ',
        warnings: outcome.consistencyFlags.map(flag => flag.message),
      });
    }

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

    await admin.from('evaluation_jobs').update({
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

    const { error: cacheError } = await admin.from('evaluation_cache').upsert({
      lesson_plan_hash: job.lesson_plan_hash,
      evaluation_mode: job.evaluation_mode,
      final_score: aggregate.percentage,
      final_level: aggregate.level,
      result_json: finalResult,
    }, { onConflict: 'lesson_plan_hash,evaluation_mode' });
    if (cacheError) console.error('Could not update evaluation cache:', cacheError);

    return NextResponse.json({
      ok: true,
      data: {
        jobId,
        status: 'completed',
        section: result.section,
        progress: 100,
        processNext: false,
        result: finalResult,
      },
      message: 'ประเมินครบทุก section แล้ว',
      warnings: outcome.consistencyFlags.map(flag => flag.message),
    });
  } catch (error) {
    if (claimedResult && jobId) {
      const admin = qualityPlatformAdmin();
      const message = safeErrorMessage(error);
      const errorType = classifyAIError(error);
      const status = errorType === 'rate_limit' ? 'failed_rate_limited' : 'failed';

      await admin.from('evaluation_results').update({
        status,
        error_type: errorType,
        error_message: message,
        completed_at: new Date().toISOString(),
        last_retry_at: new Date().toISOString(),
      }).eq('id', claimedResult.id);

      await admin.from('evaluation_jobs').update({
        status: 'failed',
        current_section: claimedResult.section,
        error_message: `${errorType}: ${message}`,
      }).eq('id', jobId);
    }
    return evaluationErrorResponse(error);
  }

}
