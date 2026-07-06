import { NextResponse } from 'next/server';
import { getCurriculumBySubject } from '@/lib/subjectStandardsData';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');

    if (!subject) {
      return NextResponse.json({ success: false, error: 'Subject is required' }, { status: 400 });
    }

    const details = getCurriculumBySubject(subject);
    if (!details) {
      return NextResponse.json({ success: false, error: 'Subject not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: details });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
