import { NextResponse } from 'next/server';
import { getCurriculumProvider } from '@/lib/smartPlanV3/curriculum';

export async function GET() {
  try {
    const provider = getCurriculumProvider();
    const subjects = await provider.getSubjects();
    return NextResponse.json({ success: true, data: subjects });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายวิชา' }, { status: 500 });
  }
}
