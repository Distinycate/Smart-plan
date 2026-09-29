import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { isValidUuid } from '@/lib/smartPlanV3/schemas';
import { isLessonLocked } from '@/lib/smartPlanV3/types';

type Ctx = { params: { id: string } };

/**
 * GET /api/plan/v3/[id]/curriculum-links
 * Returns all curriculum indicator links for a lesson plan.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    const { id: planId } = await params;
    if (!isValidUuid(planId)) {
      return NextResponse.json({ success: false, error: 'รหัสแผนการสอนไม่ถูกต้อง' }, { status: 400 });
    }

    const repo = new V3Repository(supabase);

    // Verify ownership via lesson lookup
    const { data: { role } = {} } = (await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()) as any;
    const isAdmin = role === 'admin';
    const lesson = await repo.getLessonById(planId, user.id, isAdmin);
    if (!lesson) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน' }, { status: 404 });
    }

    const links = await repo.getCurriculumLinks(planId);
    return NextResponse.json({ success: true, data: links });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลตัวชี้วัด' }, { status: 500 });
  }
}

/**
 * PUT /api/plan/v3/[id]/curriculum-links
 * Replaces all curriculum links for this lesson (idempotent).
 *
 * Body: { links: Array<{ curriculum_version, subject_key, grade_level, standard_code, indicator_code, standard_label_snapshot, indicator_label_snapshot }> }
 */
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    const { id: planId } = await params;
    if (!isValidUuid(planId)) {
      return NextResponse.json({ success: false, error: 'รหัสแผนการสอนไม่ถูกต้อง' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.links)) {
      return NextResponse.json({ success: false, error: 'รูปแบบข้อมูลไม่ถูกต้อง ต้องส่ง { links: [...] }' }, { status: 400 });
    }

    const repo = new V3Repository(supabase);

    // Ownership check
    const lesson = await repo.getLessonById(planId, user.id);
    if (!lesson) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือไม่มีสิทธิ์แก้ไข' }, { status: 404 });
    }
    if (isLessonLocked(lesson.status)) {
      return NextResponse.json({ success: false, error: `แผนการสอนอยู่ในสถานะ ${lesson.status} ไม่อนุญาตให้แก้ไข`, code: 'LESSON_IS_LOCKED' }, { status: 403 });
    }

    // Validate each link entry
    const sanitized = body.links.map((l: any, i: number) => ({
      lesson_plan_id: planId,
      curriculum_version: String(l.curriculum_version || 'OBEC-2551-REV60').trim(),
      subject_key: String(l.subject_key || '').trim().toUpperCase(),
      grade_level: String(l.grade_level || '').trim(),
      standard_code: String(l.standard_code || '').trim(),
      indicator_code: String(l.indicator_code || '').trim(),
      standard_label_snapshot: String(l.standard_label_snapshot || '').trim(),
      indicator_label_snapshot: String(l.indicator_label_snapshot || '').trim(),
      position: i,
    })).filter((l: any) => l.subject_key && l.standard_code && l.indicator_code);

    const saved = await repo.replaceCurriculumLinks(planId, sanitized);
    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการบันทึกตัวชี้วัด' }, { status: 500 });
  }
}
