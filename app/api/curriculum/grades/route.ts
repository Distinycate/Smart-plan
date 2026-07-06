import { NextResponse } from 'next/server';
import { getAllGradeLevels } from '@/lib/subjectStandardsData';

export async function GET() {
  try {
    const grades = getAllGradeLevels();
    return NextResponse.json({ success: true, data: grades });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
