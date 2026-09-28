import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { validateCreateLessonInput } from '@/lib/smartPlanV3/schemas';

// GET /api/plan/v3 - ดึงรายการแผน V3 ของผู้ใช้
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const isAdmin = profile?.role === 'admin';

    let query = supabase
      .from('v3_lesson_plans')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data: plans, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: 'ไม่สามารถดึงข้อมูลแผนการสอนได้' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: plans });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการประมวลผล' }, { status: 500 });
  }
}

// POST /api/plan/v3 - สร้างแผน V3 ใหม่
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const validation = validateCreateLessonInput(body);

    if (!validation.success || !validation.data) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const repo = new V3Repository(supabase);
    const lesson = await repo.createLesson({
      ...validation.data,
      user_id: user.id,
    });

    return NextResponse.json({ success: true, data: lesson }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการสร้างแผนการสอน' }, { status: 500 });
  }
}
