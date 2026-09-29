/**
 * /api/plan/v3/[id]/post-teaching/evidence/[evidenceId]
 *
 * PATCH: Updates an observed student evidence item.
 * DELETE: Deletes an observed student evidence item.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; evidenceId: string } }
) {
  try {
    const { id: planId, evidenceId } = params;
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: lesson, error: lErr } = await supabase
      .from('v3_lesson_plans')
      .select('id, user_id')
      .eq('id', planId)
      .maybeSingle();

    if (lErr || !lesson) {
      return NextResponse.json({ error: 'ไม่พบแผนการสอน' }, { status: 404 });
    }
    if (lesson.user_id !== user.id) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์แก้ไขหลักฐานของแผนนี้' }, { status: 403 });
    }

    const { data: ev, error: evErr } = await supabase
      .from('v3_observed_student_evidence')
      .select('lesson_plan_id')
      .eq('id', evidenceId)
      .maybeSingle();

    if (evErr || !ev) {
      return NextResponse.json({ error: 'ไม่พบหลักฐานที่ระบุ' }, { status: 404 });
    }
    if (ev.lesson_plan_id !== planId) {
      return NextResponse.json({ error: 'หลักฐานนี้ไม่ได้อยู่ในแผนการสอนที่ระบุ' }, { status: 400 });
    }

    const body = await request.json();
    const repo = new V3Repository(supabase);
    const updated = await repo.updateObservedEvidence(evidenceId, body);

    return NextResponse.json({
      success: true,
      message: 'อัปเดตหลักฐานเรียบร้อย',
      evidence: updated,
    });
  } catch (error: any) {
    console.error('[V3 Observed Evidence PATCH]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; evidenceId: string } }
) {
  try {
    const { id: planId, evidenceId } = params;
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: lesson, error: lErr } = await supabase
      .from('v3_lesson_plans')
      .select('id, user_id')
      .eq('id', planId)
      .maybeSingle();

    if (lErr || !lesson) {
      return NextResponse.json({ error: 'ไม่พบแผนการสอน' }, { status: 404 });
    }
    if (lesson.user_id !== user.id) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์ลบหลักฐานของแผนนี้' }, { status: 403 });
    }

    const { data: ev, error: evErr } = await supabase
      .from('v3_observed_student_evidence')
      .select('lesson_plan_id')
      .eq('id', evidenceId)
      .maybeSingle();

    if (evErr || !ev) {
      return NextResponse.json({ error: 'ไม่พบหลักฐานที่ระบุ' }, { status: 404 });
    }
    if (ev.lesson_plan_id !== planId) {
      return NextResponse.json({ error: 'หลักฐานนี้ไม่ได้อยู่ในแผนการสอนที่ระบุ' }, { status: 400 });
    }

    const repo = new V3Repository(supabase);
    await repo.deleteObservedEvidence(evidenceId);

    return NextResponse.json({
      success: true,
      message: 'ลบหลักฐานเรียบร้อย',
    });
  } catch (error: any) {
    console.error('[V3 Observed Evidence DELETE]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
