import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const timestamp = new Date().toISOString();
    const previewUrl = `/plan/${id}/preview`;

    // Update pdfUrl in database
    const { error } = await supabase
      .from('LessonPlans')
      .update({
        pdfUrl: previewUrl,
        pdfCreatedAt: timestamp
      })
      .eq('planId', id);

    if (error) throw error;

    // Log the transaction
    await supabase.from('System_Logs').insert({
      logId: `LOG-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
      timestamp,
      action: 'EXPORT_PDF',
      status: 'success',
      planId: id,
      message: `สร้างลิงก์พิมพ์ PDF สำหรับแผนการสอน รหัส: ${id}`
    });

    return NextResponse.json({
      success: true,
      pdfUrl: previewUrl,
      createdAt: timestamp
    });

  } catch (error: any) {
    console.error('PDF export API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}
