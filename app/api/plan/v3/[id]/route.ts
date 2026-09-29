import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { isValidUuid } from '@/lib/smartPlanV3/schemas';

interface RouteContext {
  params: { id: string };
}

// GET /api/plan/v3/[id] - ดึง Full Graph ของแผนการสอน
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ success: false, error: 'รหัสแผนการสอนไม่ถูกต้อง' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const isAdmin = profile?.role === 'admin';

    const repo = new V3Repository(supabase);
    const graph = await repo.getLessonGraph(id, user.id, isAdmin);

    if (!graph) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์เข้าถึง' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: graph });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลแผนการสอน' }, { status: 500 });
  }
}

// PATCH /api/plan/v3/[id] - ปรับปรุงข้อมูลแผน
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ success: false, error: 'รหัสแผนการสอนไม่ถูกต้อง' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'ข้อมูลที่ส่งมาไม่ถูกต้อง' }, { status: 400 });
    }

    const repo = new V3Repository(supabase);
    const existing = await repo.getLessonById(id, user.id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์เข้าถึง' }, { status: 404 });
    }
    if (existing.status === 'FINAL') {
      return NextResponse.json(
        { success: false, error: 'แผนการสอนอยู่ในสถานะ FINAL (ฉบับสมบูรณ์) ไม่อนุญาตให้แก้ไขโดยตรง' },
        { status: 403 }
      );
    }

    const updated = await repo.updateLesson(id, body, user.id);

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการอัปเดตแผนการสอน' }, { status: 500 });
  }
}

// DELETE /api/plan/v3/[id] - ลบแผนการสอน
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ success: false, error: 'รหัสแผนการสอนไม่ถูกต้อง' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    const repo = new V3Repository(supabase);
    await repo.deleteLesson(id, user.id);

    return NextResponse.json({ success: true, message: 'ลบแผนการสอนสำเร็จ' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการลบแผนการสอน' }, { status: 500 });
  }
}
