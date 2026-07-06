import { NextResponse } from 'next/server';
import { getSubjectsByGrade } from '@/lib/subjectStandardsData';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade');

    if (!grade) {
      return NextResponse.json({ success: false, error: 'Grade is required' }, { status: 400 });
    }

    const subjects = getSubjectsByGrade(grade);
    return NextResponse.json({ success: true, data: subjects });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
