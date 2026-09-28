import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  generateAiPatch,
  applyPatchBundle,
  validatePatchResult,
  toCanonicalLessonPlan,
  createLessonPlanHash,
} from '@/lib/lesson-plan';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max allowed duration on Vercel

function errorResponse(errorCode: string, message: string, status: number, details = {}) {
  return NextResponse.json({ ok: false, errorCode, message, details }, { status });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse('E_PERMISSION_DENIED', 'กรุณาเข้าสู่ระบบก่อน', 401);
    }

    // 2. Parse body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorResponse('E_INVALID_JSON', 'รูปแบบ JSON ไม่ถูกต้อง', 400);
    }

    const patchJobId = String(body.patchJobId ?? '').trim();
    if (!patchJobId) {
      return errorResponse('E_MISSING_PARAM', 'กรุณาระบุ patchJobId', 400);
    }

    // 3. Load patch job
    const { data: job, error: jobError } = await supabaseAdmin
      .from('patch_jobs')
      .select('*')
      .eq('id', patchJobId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (jobError || !job) {
      return errorResponse('E_JOB_NOT_FOUND', 'ไม่พบงานปรับปรุงแผน หรือคุณไม่มีสิทธิ์เข้าถึง', 404);
    }

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return NextResponse.json({
        ok: true,
        data: {
          patchJobId,
          status: job.status,
          progress: job.progress,
          processNext: false,
          reviewRequired: Boolean(job.metadata?.review_required),
          proposedPatchCount: Number(job.metadata?.proposed_patch_count || 0),
        },
        message: 'งานปรับปรุงแผนนี้ประมวลผลเสร็จสิ้นหรือยกเลิกไปแล้ว'
      });
    }

    // 4. Load all steps
    const { data: steps, error: stepsError } = await supabaseAdmin
      .from('patch_job_steps')
      .select('*')
      .eq('patch_job_id', patchJobId)
      .order('created_at', { ascending: true });

    if (stepsError || !steps) {
      return errorResponse('E_DATABASE_READ', 'ไม่สามารถโหลดรายการขั้นตอนได้', 500);
    }

    // Find the next step to process
    const activeStep = steps.find(s => s.status === 'pending' || s.status === 'failed');

    if (!activeStep) {
      // All steps are completed or skipped! Finalize the patch job.
      return await finalizePatchJob(job, steps);
    }

    // 5. Process the active step
    const stepStartedAt = new Date().toISOString();
    await supabaseAdmin
      .from('patch_job_steps')
      .update({
        status: 'processing',
        started_at: stepStartedAt,
        attempt_count: (activeStep.attempt_count || 0) + 1
      })
      .eq('id', activeStep.id);

    await supabaseAdmin
      .from('patch_jobs')
      .update({
        status: 'processing',
        current_step: activeStep.target_section,
        started_at: job.started_at || stepStartedAt
      })
      .eq('id', patchJobId);

    // 6. Load current plan content
    const { data: planRow, error: planError } = await supabaseAdmin
      .from('LessonPlans')
      .select('*')
      .eq('planId', job.lesson_plan_id)
      .maybeSingle();

    if (planError || !planRow) {
      const errorMsg = 'ไม่พบแผนการสอนที่ต้องการปรับปรุง';
      await markStepFailed(activeStep.id, patchJobId, 'unknown_error', errorMsg);
      return errorResponse('E_LESSON_PLAN_NOT_FOUND', errorMsg, 404);
    }

    const canonicalPlan = toCanonicalLessonPlan(planRow);
    const hashBefore = createLessonPlanHash(canonicalPlan);

    // Fetch the issue records for this step
    const issueIds = activeStep.metadata?.issue_ids || [];
    let issuesList: any[] = [];
    if (issueIds.length > 0) {
      const { data: dbIssues } = await supabaseAdmin
        .from('lesson_plan_issues')
        .select('*')
        .in('id', issueIds);
      issuesList = dbIssues || [];
    }

    try {
      // 7. Generate patch via AI (Task 4)
      const patch = await generateAiPatch({
        lessonPlanId: job.lesson_plan_id,
        evaluationMode: job.metadata?.evaluation_mode || 'lesson_plan_basic',
        targetSection: activeStep.target_section,
        plan: canonicalPlan,
        issues: issuesList,
      });

      if (!patch) {
        // AI returned cannotPatch
        await supabaseAdmin
          .from('patch_job_steps')
          .update({
            status: 'skipped',
            completed_at: new Date().toISOString(),
            error_message: 'AI ไม่สามารถแก้ไขหัวข้อนนี้ได้โดยอัตโนมัติ'
          })
          .eq('id', activeStep.id);

        const updatedSteps = steps.map(s => s.id === activeStep.id ? { ...s, status: 'skipped' } : s);
        const progress = Math.round((updatedSteps.filter(s => s.status === 'completed' || s.status === 'skipped').length / steps.length) * 100);

        await supabaseAdmin
          .from('patch_jobs')
          .update({ progress })
          .eq('id', patchJobId);

        return NextResponse.json({
          ok: true,
          data: {
            patchJobId,
            status: 'processing',
            progress,
            processNext: true
          },
          message: `ขั้นตอน ${activeStep.target_section} ถูกข้ามเนื่องจากแก้ไขไม่ได้`
        });
      }

      // 8. Apply patch to canonical plan (Task 7)
      const singleBundle = {
        lessonPlanId: job.lesson_plan_id,
        jobId: job.evaluation_job_id || '',
        evaluationMode: job.metadata?.evaluation_mode || 'lesson_plan_basic',
        mode: job.mode,
        patches: [patch],
        hashBefore,
        patchedBy: 'ai_suggestion' as const,
        summary: `ปรับปรุงหัวข้อ ${activeStep.target_section} โดยอัตโนมัติ`,
        allAffectedSections: patch.affectedSections
      };

      const { patchedPlan, result: applyResult } = applyPatchBundle(canonicalPlan, singleBundle);

      // Validate patch safety and correctness
      const validation = validatePatchResult(patchedPlan, job.metadata?.evaluation_mode || 'lesson_plan_basic', applyResult);
      if (!validation.valid) {
        throw new Error(`Patch validation failed: ${validation.newCriticalIssues.join(', ')}`);
      }

      // 9. Persist an AI proposal only. The original LessonPlans record stays
      // untouched until a teacher accepts a proposal in a later explicit flow.
      const { data: patchRow } = await supabaseAdmin
        .from('lesson_plan_patches')
        .insert({
          lesson_plan_id: job.lesson_plan_id,
          job_id: job.evaluation_job_id,
          from_version_id: null,
          to_version_id: null,
          patch_type: patch.operation,
          target_section: patch.target,
          severity: patch.issueSeverity ?? 'medium',
          before_content: patch.before as any,
          after_content: patch.after as any,
          patch_json: patch as any,
          reason: patch.reason,
          applied: false,
          applied_at: null,
        })
        .select('id')
        .single();

      // 10. Mark proposal generation complete. There is deliberately no plan
      // write, version creation, cache invalidation or automatic recheck here.
      await supabaseAdmin
        .from('patch_job_steps')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          patch_id: patchRow?.id || null
        })
        .eq('id', activeStep.id);

      // Calculate proposal-generation progress
      const updatedSteps = steps.map(s => s.id === activeStep.id ? { ...s, status: 'completed' } : s);
      const progress = Math.round((updatedSteps.filter(s => s.status === 'completed' || s.status === 'skipped').length / steps.length) * 100);

      await supabaseAdmin
        .from('patch_jobs')
        .update({ progress })
        .eq('id', patchJobId);

      return NextResponse.json({
        ok: true,
        data: {
          patchJobId,
          status: 'processing',
          progress,
          processNext: true
        },
        message: `สร้างข้อเสนอสำหรับ ${activeStep.target_section} แล้ว รอครูตรวจทาน`
      });

    } catch (stepError: any) {
      console.error(`Error processing step ${activeStep.target_section}:`, stepError);
      await markStepFailed(activeStep.id, patchJobId, 'api_error', stepError.message || 'Error occurred during AI generation/application');
      return errorResponse('E_STEP_FAILED', `ขั้นตอน ${activeStep.target_section} ล้มเหลว: ${stepError.message}`, 500);
    }

  } catch (error: any) {
    console.error('Patch process route error:', error);
    return errorResponse('E_INTERNAL', 'เกิดข้อผิดพลาดภายในระบบ', 500);
  }
}

async function markStepFailed(stepId: string, jobId: string, errorType: string, message: string) {
  await supabaseAdmin
    .from('patch_job_steps')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_type: errorType,
      error_message: message
    })
    .eq('id', stepId);

  await supabaseAdmin
    .from('patch_jobs')
    .update({
      status: 'failed',
      error_message: message
    })
    .eq('id', jobId);
}

async function finalizePatchJob(job: any, steps: any[]) {
  // Completed steps represent generated proposals, never applied changes.
  const completedSteps = steps.filter(s => s.status === 'completed');
  const proposedPatchCount = completedSteps.length;
  const reviewRequired = proposedPatchCount > 0;

  await supabaseAdmin
    .from('patch_jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      progress: 100,
      metadata: {
        ...(job.metadata || {}),
        review_required: reviewRequired,
        proposed_patch_count: proposedPatchCount,
      }
    })
    .eq('id', job.id);

  return NextResponse.json({
    ok: true,
    data: {
      patchJobId: job.id,
      status: 'completed',
      progress: 100,
      processNext: false,
      reviewRequired,
      proposedPatchCount,
    },
    message: reviewRequired
      ? 'AI สร้างข้อเสนอปรับปรุงแล้ว รอครูตรวจทานก่อนนำไปใช้'
      : 'ไม่พบข้อเสนอที่ AI สามารถสร้างได้ แผนต้นฉบับยังไม่ถูกเปลี่ยนแปลง'
  });
}
