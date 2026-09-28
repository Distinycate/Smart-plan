import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizationError, requirePlanOwner } from '@/lib/auth/authorization';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const timestamp = new Date().toISOString();
    const previewUrl = `/plan/${id}/preview`;
    // Export is a document disclosure boundary and remains owner-only.
    const { supabase } = await requirePlanOwner(id);

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
    await getSupabaseAdmin().from('System_Logs').insert({
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
    if (isAuthorizationError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.httpStatus });
    }
    console.error('PDF export API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}
