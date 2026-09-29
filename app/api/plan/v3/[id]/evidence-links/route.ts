import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { isValidUuid } from '@/lib/smartPlanV3/schemas';
import { isLessonLocked } from '@/lib/smartPlanV3/types';

type Ctx = { params: { id: string } };

/**
 * POST /api/plan/v3/[id]/evidence-links
 * Link an objective to a piece of evidence (many-to-many).
 * Body: { objective_id, evidence_id }
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id: planId } = await params;
    if (!isValidUuid(planId)) {
      return NextResponse.json({ success: false, error: 'รหัสแผนไม่ถูกต้อง' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const { objective_id, evidence_id } = body || {};

    if (!isValidUuid(objective_id) || !isValidUuid(evidence_id)) {
      return NextResponse.json({ success: false, error: 'รหัส objective_id หรือ evidence_id ไม่ถูกต้อง' }, { status: 400 });
    }

    const repo = new V3Repository(supabase);
    const lesson = await repo.getLessonById(planId, user.id);
    if (!lesson) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือไม่มีสิทธิ์แก้ไข' }, { status: 404 });
    }
    if (isLessonLocked(lesson.status)) {
      return NextResponse.json({ success: false, error: `แผนการสอนอยู่ในสถานะ ${lesson.status} ไม่อนุญาตให้แก้ไข`, code: 'LESSON_IS_LOCKED' }, { status: 403 });
    }

    const { data: link, error } = await supabase
      .from('v3_objective_evidence_links')
      .upsert({ objective_id, evidence_id }, { onConflict: 'objective_id,evidence_id' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: 'ไม่สามารถสร้างความสัมพันธ์ได้' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: link }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

/**
 * DELETE /api/plan/v3/[id]/evidence-links
 * Unlink an objective from a piece of evidence.
 * Body: { objective_id, evidence_id }
 */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id: planId } = await params;
    if (!isValidUuid(planId)) {
      return NextResponse.json({ success: false, error: 'รหัสแผนไม่ถูกต้อง' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const { objective_id, evidence_id } = body || {};

    if (!isValidUuid(objective_id) || !isValidUuid(evidence_id)) {
      return NextResponse.json({ success: false, error: 'รหัสไม่ถูกต้อง' }, { status: 400 });
    }

    const repo = new V3Repository(supabase);
    const lesson = await repo.getLessonById(planId, user.id);
    if (!lesson) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือไม่มีสิทธิ์แก้ไข' }, { status: 404 });
    }
    if (isLessonLocked(lesson.status)) {
      return NextResponse.json({ success: false, error: `แผนการสอนอยู่ในสถานะ ${lesson.status} ไม่อนุญาตให้แก้ไข`, code: 'LESSON_IS_LOCKED' }, { status: 403 });
    }

    await supabase
      .from('v3_objective_evidence_links')
      .delete()
      .eq('objective_id', objective_id)
      .eq('evidence_id', evidence_id);

    return NextResponse.json({ success: true, message: 'ยกเลิกความสัมพันธ์สำเร็จ' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
