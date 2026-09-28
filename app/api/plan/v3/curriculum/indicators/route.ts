import { NextRequest, NextResponse } from 'next/server';
import { getCurriculumProvider } from '@/lib/smartPlanV3/curriculum';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject');
    const grade = searchParams.get('grade');
    const standard = searchParams.get('standard') || undefined;
    const version = searchParams.get('version') || undefined;

    if (!subject || !grade) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุ subject และ grade' }, { status: 400 });
    }

    const provider = getCurriculumProvider();
    const indicators = await provider.getIndicators(subject, grade, standard, version);
    return NextResponse.json({ success: true, data: indicators });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลตัวชี้วัด' }, { status: 500 });
  }
}
