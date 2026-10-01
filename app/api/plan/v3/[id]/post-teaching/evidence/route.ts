/**
 * POST /api/plan/v3/[id]/post-teaching/evidence
 *
 * Creates Observed Student Evidence entity:
 * - Distinct from planned learning evidence (v3_learning_evidence)
 * - Optionally links to planned_evidence_id, objective_id, assessment_id
 * - Validates ownership
 * - Stores metadata only (no binary files in database)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { validateObservedEvidence } from '@/lib/smartPlanV3/rules/postTeachingRules';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const planId = params.id;
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const repo = new V3Repository(supabase);
    const { data: lesson, error: lErr } = await supabase
      .from('v3_lesson_plans')
      .select('id, user_id, status')
      .eq('id', planId)
      .maybeSingle();

    if (lErr || !lesson || lesson.user_id !== user.id) {
      return NextResponse.json({ error: 'ไม่พบแผนการสอน หรือไม่มีสิทธิ์เข้าถึง' }, { status: 404 });
    }

    if (lesson.status === 'REFLECTED') {
      return NextResponse.json(
        {
          error: 'แผนการสอนอยู่ในสถานะ REFLECTED (สะท้อนผลสมบูรณ์แล้ว) ไม่อนุญาตให้แก้ไขหรือเพิ่มหลักฐานเชิงประจักษ์',
          code: 'RECORD_IS_LOCKED',
        },
        { status: 409 }
      );
    }

    if (lesson.status !== 'TAUGHT') {
      return NextResponse.json(
        {
          error: `แผนการสอนต้องอยู่ในสถานะ TAUGHT ก่อนจึงจะสามารถบันทึกหลักฐานเชิงประจักษ์ได้ (สถานะปัจจุบัน: ${lesson.status})`,
          code: 'INVALID_LESSON_STATE',
        },
        { status: 409 }
      );
    }

    const body = await request.json();
    const validation = validateObservedEvidence(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join('; ') }, { status: 400 });
    }

    // Ensure a post_teaching_record exists to link to
    let postRecord = await repo.getPostTeachingRecord(planId);
    if (!postRecord) {
      postRecord = await repo.savePostTeachingDraft(planId, {
        lesson_plan_id: planId,
        students_total: body.students_total || 0,
      });
    }

    if (!postRecord || !postRecord.id) {
      return NextResponse.json({ error: 'ไม่สามารถสร้างบันทึกการสอนได้' }, { status: 500 });
    }

    const evidence = await repo.createObservedEvidence({
      lesson_plan_id: planId,
      post_teaching_record_id: postRecord.id,
      planned_evidence_id: body.planned_evidence_id || null,
      objective_id: body.objective_id || null,
      assessment_id: body.assessment_id || null,
      evidence_type: body.evidence_type,
      title: body.title.trim(),
      description: body.description?.trim() || '',
      summary_data: body.summary_data || {},
      storage_path: body.storage_path || null,
      mime_type: body.mime_type || null,
      file_size: body.file_size || null,
      sample_label: body.sample_label || null,
      outcome_status: body.outcome_status || 'OBSERVED',
      observed_at: body.observed_at || new Date().toISOString(),
      created_by: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'บันทึกหลักฐานเชิงประจักษ์เรียบร้อย',
      evidence,
    });
  } catch (error: any) {
    console.error('[V3 Observed Evidence POST]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
