import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOwnedJob } from '@/lib/lesson-plan/jobs/server';

export const dynamic = 'force-dynamic';

function errorResponse(errorCode: string, message: string, status: number) {
  return NextResponse.json({ ok: false, errorCode, message }, { status });
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

    const lessonPlanId = String(body.lessonPlanId ?? '').trim();
    const evaluationJobId = String(body.evaluationJobId ?? '').trim();
    const mode = String(body.mode ?? 'critical_only').trim();

    if (!lessonPlanId || !evaluationJobId) {
      return errorResponse('E_MISSING_PARAM', 'กรุณาระบุ lessonPlanId และ evaluationJobId', 400);
    }

    if (!['critical_only', 'critical_high', 'full_improvement'].includes(mode)) {
      return errorResponse('E_INVALID_MODE', 'โหมดการปรับปรุง (mode) ไม่ถูกต้อง', 400);
    }

    // 3. Verify evaluation job ownership
    const evalJob = await getOwnedJob(evaluationJobId, user.id);

    // 4. Fetch issues for the evaluation job
    const { data: issues, error: issuesError } = await supabaseAdmin
      .from('lesson_plan_issues')
      .select('*')
      .eq('job_id', evaluationJobId)
      .eq('status', 'open');

    if (issuesError) {
      console.error('Fetch issues error:', issuesError);
      return errorResponse('E_DATABASE_READ', 'ไม่สามารถดึงข้อมูลประเด็นปัญหาได้', 500);
    }

    // 5. Filter issues according to selected mode
    const filteredIssues = (issues || []).filter(issue => {
      if (mode === 'critical_only') return issue.severity === 'critical';
      if (mode === 'critical_high') return issue.severity === 'critical' || issue.severity === 'high';
      // full_improvement
      return issue.auto_fixable === true;
    });

    if (filteredIssues.length === 0) {
      return NextResponse.json({
        ok: true,
        data: {
          ready: true,
          message: 'ไม่พบประเด็นที่จำเป็นต้องแก้ไขในโหมดนี้ แผนการสอนนี้พร้อมใช้งานแล้ว',
          patchJobId: null,
          stepsCount: 0
        }
      });
    }

    // 6. Group issues by section (max 3 issues per step batch)
    const issuesBySection: Record<string, any[]> = {};
    for (const issue of filteredIssues) {
      const section = issue.section;
      if (!issuesBySection[section]) {
        issuesBySection[section] = [];
      }
      issuesBySection[section].push(issue);
    }


    const stepsToCreate: Array<{ target_section: string; issue_ids: string[] }> = [];
    for (const [section, sectionIssues] of Object.entries(issuesBySection)) {
      // Chunk issues into batches of max 3
      for (let i = 0; i < sectionIssues.length; i += 3) {
        const batch = sectionIssues.slice(i, i + 3);
        stepsToCreate.push({
          target_section: section,
          issue_ids: batch.map(b => b.id)
        });
      }
    }

    // 7. Load plan hash and create patch job in DB
    const { data: patchJob, error: jobCreateError } = await supabaseAdmin
      .from('patch_jobs')
      .insert({
        lesson_plan_id: lessonPlanId,
        evaluation_job_id: evaluationJobId,
        user_id: user.id,
        mode: mode,
        status: 'pending',
        progress: 0,
        metadata: {
          total_steps: stepsToCreate.length,
          evaluation_mode: evalJob.evaluation_mode,
        }
      })
      .select('id')
      .single();

    if (jobCreateError || !patchJob) {
      console.error('Patch job creation error:', jobCreateError);
      return errorResponse('E_DATABASE_WRITE', 'ไม่สามารถสร้างงานปรับปรุงแผนได้', 500);
    }

    // 8. Create patch job steps in DB
    const stepRows = stepsToCreate.map((step) => ({
      patch_job_id: patchJob.id,
      target_section: step.target_section,
      status: 'pending',
      metadata: {
        issue_ids: step.issue_ids
      }
    }));

    const { error: stepsCreateError } = await supabaseAdmin
      .from('patch_job_steps')
      .insert(stepRows);

    if (stepsCreateError) {
      console.error('Patch job steps creation error:', stepsCreateError);
      // Clean up parent job
      await supabaseAdmin.from('patch_jobs').delete().eq('id', patchJob.id);
      return errorResponse('E_DATABASE_WRITE', 'ไม่สามารถสร้างรายการขั้นตอนการปรับปรุงได้', 500);
    }

    return NextResponse.json({
      ok: true,
      data: {
        ready: false,
        patchJobId: patchJob.id,
        stepsCount: stepsToCreate.length,
        message: `สร้างงานปรับปรุงแผนสำเร็จ มีทั้งหมด ${stepsToCreate.length} ขั้นตอน`
      }
    });

  } catch (error) {
    console.error('Patch job create route error:', error);
    return errorResponse('E_INTERNAL', 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์', 500);
  }
}
