import { NextResponse } from 'next/server';
import { getAllSubjectProfiles } from '@/lib/smartPlanV3/subjectProfiles';

export async function GET() {
  try {
    const profiles = getAllSubjectProfiles().map(p => ({
      key: p.key,
      labelTh: p.labelTh,
      descriptionTh: p.descriptionTh,
      learningFocuses: p.learningFocuses,
      avoidPatterns: p.avoidPatterns,
    }));
    return NextResponse.json({ success: true, data: profiles });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล Subject Profiles' }, { status: 500 });
  }
}
