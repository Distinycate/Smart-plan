import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  generateAiPatch,
  applyPatchBundle,
  validatePatchResult,
  getSectionsToRecheck,
  isEvaluationMode,
  toCanonicalLessonPlan,
  createLessonPlanHash,
  getEvaluationMode,
  PatchTarget,
  getRubricCriterion,
} from '@/lib/lesson-plan';


import { getSectionsToCarryOver } from '@/lib/lesson-plan/patch/recheck-map';

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
          recheckJobId: job.metadata?.recheck_job_id || null
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
      return await finalizePatchJob(job, steps, user.id);
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

      const hashAfter = applyResult.hashAfter;

      // 9. Save pre-patch version snapshot
      const { data: fromVersionRow } = await supabaseAdmin
        .from('lesson_plan_versions')
        .insert({
          lesson_plan_id: job.lesson_plan_id,
          version: `patch-pre-${activeStep.target_section}-${Date.now()}`,
          content: planRow as Record<string, unknown>,
          content_hash: hashBefore,
          created_by: `user:${user.id}`,
          change_summary: `ก่อนปรับปรุงอัตโนมัติหัวข้อ ${activeStep.target_section}`,
          user_id: user.id
        })
        .select('id')
        .single();

      const fromVersionId = fromVersionRow?.id || null;

      // 10. Write patched data back to LessonPlans database table
      const patchedFields: Record<string, unknown> = {};
      const affectedTargets = new Set(applyResult.applied.map(p => p.target));

      if (affectedTargets.has('objectives.knowledge') ||
          affectedTargets.has('objectives.process') ||
          affectedTargets.has('objectives.attitude')) {
        patchedFields['objectiveK'] = (patchedPlan.objectives.knowledge ?? []).join('\n');
        patchedFields['objectiveP'] = (patchedPlan.objectives.process ?? []).join('\n');
        patchedFields['objectiveA'] = (patchedPlan.objectives.attitude ?? []).join('\n');
      }
      if (affectedTargets.has('learningActivities')) {
        patchedFields['learningProcess'] = JSON.stringify(patchedPlan.learningActivities);
      }
      if (affectedTargets.has('assessment.methods') ||
          affectedTargets.has('assessment.tools') ||
          affectedTargets.has('assessment.rubrics')) {
        patchedFields['assessmentMethod'] = JSON.stringify(patchedPlan.assessment);
      }
      if (affectedTargets.has('curriculum.standards') ||
          affectedTargets.has('curriculum.indicators')) {
        patchedFields['indicator'] = (patchedPlan.curriculum.indicators ?? []).map(ind => `${ind.code} ${ind.description}`).join('\n');
      }

      if (Object.keys(patchedFields).length > 0) {
        const { error: writeError } = await supabaseAdmin
          .from('LessonPlans')
          .update(patchedFields)
          .eq('planId', job.lesson_plan_id);

        if (writeError) {
          throw new Error(`ไม่สามารถบันทึกข้อมูลแผนลงฐานข้อมูลได้: ${writeError.message}`);
        }
      }

      // 11. Save post-patch version snapshot
      const { data: toVersionRow } = await supabaseAdmin
        .from('lesson_plan_versions')
        .insert({
          lesson_plan_id: job.lesson_plan_id,
          version: `patch-post-${activeStep.target_section}-${Date.now()}`,
          content: patchedPlan as unknown as Record<string, unknown>,
          content_hash: hashAfter,
          created_by: `user:${user.id}`,
          change_summary: `ปรับปรุงอัตโนมัติหัวข้อ ${activeStep.target_section} สำเร็จ`,
          parent_version_id: fromVersionId,
          user_id: user.id
        })
        .select('id')
        .single();

      const toVersionId = toVersionRow?.id || null;

      // 12. Create patch record in DB
      const { data: patchRow } = await supabaseAdmin
        .from('lesson_plan_patches')
        .insert({
          lesson_plan_id: job.lesson_plan_id,
          job_id: job.evaluation_job_id,
          from_version_id: fromVersionId,
          to_version_id: toVersionId,
          patch_type: patch.operation,
          target_section: patch.target,
          severity: patch.issueSeverity ?? 'medium',
          before_content: patch.before as any,
          after_content: patch.after as any,
          patch_json: patch as any,
          reason: patch.reason,
          applied: true,
          applied_at: new Date().toISOString()
        })
        .select('id')
        .single();

      // 13. Invalidate old cache
      await supabaseAdmin
        .from('evaluation_cache')
        .delete()
        .eq('lesson_plan_hash', hashBefore);

      // 14. Mark step completed
      await supabaseAdmin
        .from('patch_job_steps')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          patch_id: patchRow?.id || null
        })
        .eq('id', activeStep.id);

      // Calculate new progress
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
        message: `ขั้นตอน ${activeStep.target_section} ปรับปรุงสำเร็จ`
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

async function finalizePatchJob(job: any, steps: any[], userId: string) {
  // Collect all patches applied in this job
  const completedSteps = steps.filter(s => s.status === 'completed');
  if (completedSteps.length === 0) {
    // No steps actually made any changes
    await supabaseAdmin
      .from('patch_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress: 100
      })
      .eq('id', job.id);

    return NextResponse.json({
      ok: true,
      data: {
        patchJobId: job.id,
        status: 'completed',
        progress: 100,
        processNext: false,
        recheckJobId: null
      },
      message: 'การปรับปรุงเสร็จสิ้นโดยไม่มีการปรับแก้ข้อมูล'
    });
  }

  // Load the final patched plan from DB to get the final hash
  const { data: finalPlanRow } = await supabaseAdmin
    .from('LessonPlans')
    .select('*')
    .eq('planId', job.lesson_plan_id)
    .single();

  const finalPlan = toCanonicalLessonPlan(finalPlanRow);
  const hashAfter = createLessonPlanHash(finalPlan);

  // Load all patch records to see what target paths were changed
  const patchIds = completedSteps.map(s => s.patch_id).filter(Boolean);
  const { data: patchRecords } = await supabaseAdmin
    .from('lesson_plan_patches')
    .select('target_section')
    .in('id', patchIds);

  const targets = (patchRecords || []).map(p => p.target_section as PatchTarget);
  const recheckSections = getSectionsToRecheck(targets);

  // Create recheck job (Phase 8 carry over logic)
  const modeConfig = getEvaluationMode(job.metadata?.evaluation_mode || 'lesson_plan_basic');
  const allSections = modeConfig.sections as readonly string[];
  const carryOverSections = getSectionsToCarryOver(allSections, recheckSections);

  const { data: recheckJob, error: recheckJobError } = await supabaseAdmin
    .from('evaluation_jobs')
    .insert({
      lesson_plan_id: job.lesson_plan_id,
      user_id: userId,
      evaluation_mode: job.metadata?.evaluation_mode || 'lesson_plan_basic',
      lesson_plan_hash: hashAfter,
      status: 'pending',
      progress: 0,
      metadata: {
        patched_from_job_id: job.evaluation_job_id,
        patch_job_id: job.id,
        recheck_sections: recheckSections,
        carry_over_sections: carryOverSections,
      },
    })
    .select('id')
    .single();

  if (recheckJobError || !recheckJob) {
    console.error('Failed to create recheck job:', recheckJobError);
    await supabaseAdmin
      .from('patch_jobs')
      .update({
        status: 'failed',
        error_message: 'ปรับปรุงแผนเสร็จแล้ว แต่ไม่สามารถสร้างงานตรวจประเมินซ้ำได้'
      })
      .eq('id', job.id);

    return errorResponse('E_RECHECK_JOB_CREATE', 'สร้างงานตรวจประเมินซ้ำ (Recheck Job) ล้มเหลว', 500);
  }

  // Pre-fill carry-over results from the original job to evaluation_results
  if (carryOverSections.length > 0) {
    const { data: originalResults } = await supabaseAdmin
      .from('evaluation_results')
      .select('*')
      .eq('job_id', job.evaluation_job_id)
      .in('section', carryOverSections)
      .eq('status', 'completed');

    if (originalResults && originalResults.length > 0) {
      const carryOverRows = originalResults.map(r => ({
        job_id: recheckJob.id,
        section: r.section,
        status: 'completed',
        score: r.score,
        max_score: r.max_score,
        level: r.level,
        evidence_found: r.evidence_found,
        missing_evidence: r.missing_evidence,
        strengths: r.strengths,
        weaknesses: r.weaknesses,
        suggestions: r.suggestions,
        issues: r.issues,
        raw_json: r.raw_json,
      }));

      await supabaseAdmin.from('evaluation_results').insert(carryOverRows);
    }
  }

  // Insert pending rows for sections to recheck
  if (recheckSections.length > 0) {
    const pendingRows = recheckSections.map(section => {
      const criterion = getRubricCriterion(job.metadata?.evaluation_mode || 'lesson_plan_basic', section);
      return {
        job_id: recheckJob.id,
        section,
        status: 'pending',
        max_score: criterion?.maxScore ?? 5.0,
      };
    });
    await supabaseAdmin.from('evaluation_results').insert(pendingRows);
  }

  // Get final versions
  const latestVersions = await supabaseAdmin
    .from('lesson_plan_versions')
    .select('id')
    .eq('lesson_plan_id', job.lesson_plan_id)
    .order('created_at', { ascending: false })
    .limit(1);
  const finalToVersionId = latestVersions.data?.[0]?.id || null;

  // Complete the patch job
  await supabaseAdmin
    .from('patch_jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      progress: 100,
      to_version_id: finalToVersionId,
      metadata: {
        ...(job.metadata || {}),
        recheck_job_id: recheckJob.id,
        recheck_sections: recheckSections,
        carry_over_sections: carryOverSections
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
      recheckJobId: recheckJob.id
    },
    message: 'การปรับปรุงเสร็จสมบูรณ์และได้สร้างงานตรวจซ้ำเรียบร้อยแล้ว'
  });
}
