import { NextResponse } from 'next/server';
import { getCurriculumProvider } from '@/lib/smartPlanV3/curriculum';

export async function GET() {
  try {
    const provider = getCurriculumProvider();
    const versions = await provider.getVersions();
    return NextResponse.json({ success: true, data: versions });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลหลักสูตร' }, { status: 500 });
  }
}
