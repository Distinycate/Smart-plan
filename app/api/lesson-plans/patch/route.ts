import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  isEvaluationMode,
  toCanonicalLessonPlan,
  createLessonPlanHash,
  getEvaluationMode,
  getRubricCriterion,
  type EvaluationMode,
  type EvaluationSectionResult,
} from '@/lib/lesson-plan';
import {
  generatePatches,
  applyPatchBundle,
  validatePatchResult,
  getSectionsToRecheck,
  getSectionsToCarryOver,
  type PatchMode,
} from '@/lib/lesson-plan/patch';
import {
  getOwnedJob,
  qualityPlatformAdmin,
  safeErrorMessage,
} from '@/lib/lesson-plan/jobs/server';

export const dynamic = 'force-dynamic';

const VALID_PATCH_MODES: PatchMode[] = [
  'auto_fix_critical',
  'auto_fix_critical_high',
  'full_improvement',
];

function isPatchMode(value: unknown): value is PatchMode {
  return VALID_PATCH_MODES.includes(value as PatchMode);
}

function errorResponse(
  errorCode: string,
  message: string,
  status: number,
  details: Record<string, unknown> = {},
) {
  return NextResponse.json(
    { ok: false, errorCode, message, details, recoverable: status < 500 },
    { status },
  );
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Auth ────────────────────────────────────────────────────────────
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse('E_PERMISSION_DENIED', 'กรุณาเข้าสู่ระบบก่อน', 401);
    }

    // ── 2. Body ────────────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      const parsed = await req.json();
      body = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
    } catch {
      return errorResponse('E_INVALID_JSON', 'รูปแบบ JSON ไม่ถูกต้อง', 400);
    }

    const lessonPlanId = String(body.lessonPlanId ?? '').trim();
    const jobId = String(body.jobId ?? '').trim();
    const patchMode = body.mode ?? 'auto_fix_critical';

    if (!lessonPlanId) return errorResponse('E_MISSING_PARAM', 'กรุณาระบุ lessonPlanId', 400);
    if (!jobId) return errorResponse('E_MISSING_PARAM', 'กรุณาระบุ jobId', 400);
    if (!isPatchMode(patchMode)) {
      return errorResponse('E_INVALID_MODE', 'mode ไม่ถูกต้อง', 400, { validModes: VALID_PATCH_MODES });
    }

    // ── 3. Load job + verify ownership ────────────────────────────────────
    const job = await getOwnedJob(jobId, user.id);
    if (job.status !== 'completed') {
      return errorResponse('E_JOB_NOT_COMPLETED', 'patch ได้เฉพาะ job ที่ completed แล้วเท่านั้น', 409, {
        status: job.status,
      });
    }

    const admin = qualityPlatformAdmin();

    // ── 4. Load section results from completed job ─────────────────────────
    const { data: resultRows, error: resultsError } = await admin
      .from('evaluation_results')
      .select('raw_json, section, status')
      .eq('job_id', jobId)
      .eq('status', 'completed');

    if (resultsError || !resultRows) {
      return errorResponse('E_DATABASE_READ', 'ไม่สามารถอ่านผลประเมินได้', 500);
    }

    const sectionResults = resultRows
      .map(row => row.raw_json)
      .filter(Boolean) as EvaluationSectionResult[];

    if (sectionResults.length === 0) {
      return errorResponse('E_NO_RESULTS', 'ไม่พบผลประเมิน section', 409);
    }

    // ── 5. Load & normalize canonical plan ────────────────────────────────
    const { data: planRow, error: planError } = await admin
      .from('LessonPlans')
      .select('*')
      .eq('planId', lessonPlanId)
      .maybeSingle();

    if (planError || !planRow) {
      return errorResponse('E_LESSON_PLAN_NOT_FOUND', 'ไม่พบแผนการสอน', 404);
    }

    const canonicalPlan = toCanonicalLessonPlan(planRow);
    const hashBefore = createLessonPlanHash(canonicalPlan);

    if (hashBefore !== job.lesson_plan_hash) {
      return errorResponse('E_LESSON_PLAN_CHANGED', 'แผนถูกแก้ไขหลังประเมิน กรุณาประเมินใหม่ก่อน patch', 409);
    }

    // ── 6. Generate patch bundle ───────────────────────────────────────────
    const bundle = generatePatches(
      lessonPlanId,
      jobId,
      job.evaluation_mode,
      hashBefore,
      sectionResults,
      patchMode,
    );

    if (bundle.patches.length === 0) {
      return NextResponse.json({
        ok: true,
        patchCount: 0,
        message: 'ไม่พบ issue ที่สามารถแก้อัตโนมัติได้ในโหมดนี้',
        affectedSections: [],
      });
    }

    // ── 7. Apply patch bundle ─────────────────────────────────────────────
    const { patchedPlan, result: applyResult } = applyPatchBundle(canonicalPlan, bundle);

    // ── 8. Validate patched plan ──────────────────────────────────────────
    const validation = validatePatchResult(patchedPlan, job.evaluation_mode, applyResult);
    if (!validation.valid) {
      return errorResponse('E_PATCH_INVALID', 'patch ทำให้เกิด critical issue ใหม่', 422, {
        newCriticalIssues: validation.newCriticalIssues,
        warnings: validation.warnings,
      });
    }

    const hashAfter = applyResult.hashAfter;

    // ── 9. Save pre-patch version snapshot ───────────────────────────────
    const { data: versionRow, error: versionError } = await admin
      .from('lesson_plan_versions')
      .insert({
        lesson_plan_id: lessonPlanId,
        version: `patch-${new Date().toISOString()}`,
        content: planRow as Record<string, unknown>,
        content_hash: hashBefore,
        created_by: `user:${user.id}`,
        change_summary: `ก่อน patch: ${bundle.summary}`,
      })
      .select('id')
      .single();

    if (versionError || !versionRow) {
      return errorResponse('E_VERSION_SAVE', 'ไม่สามารถบันทึก version ก่อน patch ได้', 500);
    }
    const fromVersionId = versionRow.id;

    // ── 10. Write patched data back to LessonPlans ────────────────────────
    // Only write fields that could have changed (from canonical patch targets)
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

    if (Object.keys(patchedFields).length > 0) {
      const { error: writeError } = await admin
        .from('LessonPlans')
        .update(patchedFields)
        .eq('planId', lessonPlanId);

      if (writeError) {
        console.error('LessonPlan write-back error:', writeError);
        return errorResponse('E_LESSON_PLAN_WRITE', 'ไม่สามารถบันทึกแผนที่แก้ไขแล้วได้', 500);
      }
    }

    // ── 11. Save "after" version snapshot ────────────────────────────────
    const { data: toVersionRow } = await admin
      .from('lesson_plan_versions')
      .insert({
        lesson_plan_id: lessonPlanId,
        version: `post-patch-${new Date().toISOString()}`,
        content: patchedPlan as unknown as Record<string, unknown>,
        content_hash: hashAfter,
        created_by: `user:${user.id}`,
        change_summary: bundle.summary,
        parent_version_id: fromVersionId,
      })
      .select('id')
      .single();
    const toVersionId = toVersionRow?.id ?? null;

    // ── 12. Persist patch records ──────────────────────────────────────────
    const patchRecords = applyResult.applied.map(patch => ({
      lesson_plan_id: lessonPlanId,
      job_id: jobId,
      from_version_id: fromVersionId,
      to_version_id: toVersionId,
      patch_type: 'replace',
      target_section: patch.target,
      severity: patch.issueSeverity ?? null,
      before_content: patch.before ?? null,
      after_content: patch.after,
      patch_json: patch as unknown as Record<string, unknown>,
      reason: patch.reason,
      applied: true,
      applied_at: new Date().toISOString(),
    }));

    if (patchRecords.length > 0) {
      const { error: patchInsertError } = await admin
        .from('lesson_plan_patches')
        .insert(patchRecords);
      if (patchInsertError) {
        console.error('Patch record insert error:', patchInsertError);
      }
    }

    // ── 13. Invalidate old cache ───────────────────────────────────────────
    await admin
      .from('evaluation_cache')
      .delete()
      .eq('lesson_plan_hash', hashBefore);

    // ── 14. Create recheck job (Phase 8) ──────────────────────────────────
    const patchTargets = applyResult.applied.map(p => p.target);
    const recheckSections = getSectionsToRecheck(patchTargets);
    const modeConfig = getEvaluationMode(job.evaluation_mode);
    const allSections = modeConfig.sections as readonly string[];
    const carryOverSections = getSectionsToCarryOver(allSections, recheckSections);

    const { data: recheckJob, error: recheckJobError } = await admin
      .from('evaluation_jobs')
      .insert({
        lesson_plan_id: lessonPlanId,
        user_id: user.id,
        evaluation_mode: job.evaluation_mode,
        lesson_plan_hash: hashAfter,
        status: 'processing',
        progress: 0,
        metadata: {
          patched_from_job_id: jobId,
          from_version_id: fromVersionId,
          to_version_id: toVersionId,
          patch_mode: patchMode,
          recheck_sections: recheckSections,
          carry_over_sections: carryOverSections,
        },
      })
      .select('id')
      .single();

    if (recheckJobError || !recheckJob) {
      console.error('Recheck job creation error:', recheckJobError);
      return errorResponse('E_RECHECK_JOB', 'patch บันทึกแล้วแต่ไม่สามารถสร้าง recheck job ได้', 500);
    }

    const recheckJobId = recheckJob.id;

    // Insert PENDING results for sections that need recheck
    const pendingSections = recheckSections
      .filter(s => allSections.includes(s))
      .map(section => {
        const criterion = getRubricCriterion(job.evaluation_mode, section);
        return {
          job_id: recheckJobId,
          section,
          status: 'pending',
          max_score: criterion?.maxScore ?? 100,
        };
      });

    // Copy COMPLETED results from sections that carry over
    const carryOverRows = resultRows
      .filter(row => carryOverSections.includes(row.section) && row.status === 'completed')
      .map(row => {
        const criterion = getRubricCriterion(job.evaluation_mode, row.section);
        return {
          job_id: recheckJobId,
          section: row.section,
          status: 'completed',
          max_score: criterion?.maxScore ?? 100,
          score: (row.raw_json as EvaluationSectionResult | null)?.score ?? 0,
          level: (row.raw_json as EvaluationSectionResult | null)?.level ?? null,
          evidence_found: (row.raw_json as EvaluationSectionResult | null)?.evidence_found ?? [],
          missing_evidence: (row.raw_json as EvaluationSectionResult | null)?.missing_evidence ?? [],
          strengths: (row.raw_json as EvaluationSectionResult | null)?.strengths ?? [],
          weaknesses: (row.raw_json as EvaluationSectionResult | null)?.weaknesses ?? [],
          suggestions: (row.raw_json as EvaluationSectionResult | null)?.suggestions ?? [],
          issues: (row.raw_json as EvaluationSectionResult | null)?.issues ?? [],
          raw_json: row.raw_json,
          completed_at: new Date().toISOString(),
        };
      });

    const allSectionInserts = [...pendingSections, ...carryOverRows];
    if (allSectionInserts.length > 0) {
      const { error: sectionInsertError } = await admin
        .from('evaluation_results')
        .insert(allSectionInserts);
      if (sectionInsertError) {
        console.error('Recheck section insert error:', sectionInsertError);
      }
    }

    // ── 15. Update recheck job progress ───────────────────────────────────
    const initialProgress = allSections.length > 0
      ? Math.round((carryOverRows.length / allSections.length) * 100)
      : 0;
    await admin
      .from('evaluation_jobs')
      .update({ progress: initialProgress })
      .eq('id', recheckJobId);

    return NextResponse.json({
      ok: true,
      patchCount: applyResult.applied.length,
      skippedCount: applyResult.skipped.length,
      summary: bundle.summary,
      hashBefore,
      hashAfter,
      fromVersionId,
      toVersionId,
      recheckJobId,
      recheckSections,
      carryOverSections,
      warnings: validation.warnings,
    });
  } catch (error) {
    console.error('Patch API error:', error);
    return errorResponse('E_INTERNAL', safeErrorMessage(error), 500);
  }
}
