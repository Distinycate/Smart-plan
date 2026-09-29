/**
 * /api/plan/v3/[id]/post-teaching
 *
 * GET: Retrieves post-teaching session record, observed evidence, and outcome summary.
 * PATCH: Autosaves draft post-teaching data (Explicitly prohibited from changing lifecycle status).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { buildObservedOutcomeSummary } from '@/lib/smartPlanV3/rules/postTeachingRules';

export async function GET(
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
      .select('id, user_id, status, topic, duration_minutes')
      .eq('id', planId)
      .maybeSingle();

    if (lErr || !lesson) {
      return NextResponse.json({ error: 'ไม่พบแผนการสอน' }, { status: 404 });
    }

    // Only owner (or admin for read) can access
    const isOwner = lesson.user_id === user.id;
    if (!isOwner) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึงแผนการสอนนี้' }, { status: 403 });
    }

    const [record, observedEvidence, objectivesRes] = await Promise.all([
      repo.getPostTeachingRecord(planId),
      repo.getObservedEvidence(planId),
      supabase.from('v3_lesson_objectives').select('*').eq('lesson_plan_id', planId).order('position'),
    ]);

    const objectives = objectivesRes.data || [];
    const outcomeSummary = buildObservedOutcomeSummary(objectives, observedEvidence);

    return NextResponse.json({
      success: true,
      lessonStatus: lesson.status,
      record,
      observedEvidence,
      outcomeSummary,
    });
  } catch (error: any) {
    console.error('[V3 Post-Teaching GET]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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

    const body = await request.json();

    // Security Gate: Direct status transition via PATCH is strictly forbidden
    if ('status' in body) {
      return NextResponse.json(
        { error: 'ไม่อนุญาตให้เปลี่ยนสถานะของแผนผ่านการบันทึกแบบร่าง (กรุณาใช้ปุ่มบันทึกผลการสอนหรือยืนยันการสะท้อนผล)' },
        { status: 400 }
      );
    }

    const repo = new V3Repository(supabase);
    const { data: lesson, error: lErr } = await supabase
      .from('v3_lesson_plans')
      .select('id, user_id, status')
      .eq('id', planId)
      .maybeSingle();

    if (lErr || !lesson) {
      return NextResponse.json({ error: 'ไม่พบแผนการสอน' }, { status: 404 });
    }
    if (lesson.user_id !== user.id) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์แก้ไขแผนการสอนนี้' }, { status: 403 });
    }

    // Only allow editing draft post-teaching if plan has reached at least FINAL
    if (!['FINAL', 'TAUGHT', 'REFLECTED'].includes(lesson.status)) {
      return NextResponse.json(
        { error: `ไม่สามารถบันทึกข้อมูลหลังสอนสำหรับแผนที่ยังไม่เสร็จสิ้น (สถานะปัจจุบัน: ${lesson.status})` },
        { status: 400 }
      );
    }

    const updatedRecord = await repo.savePostTeachingDraft(planId, body);

    return NextResponse.json({
      success: true,
      message: 'บันทึกแบบร่างข้อมูลหลังสอนเรียบร้อย',
      record: updatedRecord,
    });
  } catch (error: any) {
    console.error('[V3 Post-Teaching PATCH]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
