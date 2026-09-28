import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  toCanonicalLessonPlan,
  createLessonPlanHash,
  type EvaluationSectionResult,
} from '@/lib/lesson-plan';
import {
  generatePatches,
  applyPatchBundle,
  validatePatchResult,
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

    // ── 9. Legacy direct-patch route is now preview only ──────────────────
    // It deliberately persists nothing and never mutates LessonPlans. New UI
    // flows use the patch job routes, which persist proposals with applied=false.
    return NextResponse.json({
      ok: true,
      previewOnly: true,
      requiresTeacherReview: true,
      patchCount: applyResult.applied.length,
      skippedCount: applyResult.skipped.length,
      summary: bundle.summary,
      hashBefore,
      proposedHash: hashAfter,
      proposals: applyResult.applied.map(patch => ({
        target: patch.target,
        before: patch.before ?? null,
        after: patch.after,
        reason: patch.reason,
        severity: patch.issueSeverity ?? null,
      })),
      warnings: validation.warnings,
      message: 'สร้างข้อเสนอการปรับปรุงแล้ว แผนต้นฉบับยังไม่ถูกเปลี่ยนแปลง',
    });
  } catch (error) {
    console.error('Patch API error:', error);
    return errorResponse('E_INTERNAL', safeErrorMessage(error), 500);
  }
}
