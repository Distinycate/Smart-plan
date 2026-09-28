import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizationError, requirePlanOwner } from '@/lib/auth/authorization';

// PATCH /api/plans/[id]/restore
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const timestamp = new Date().toISOString();
    // Restore mutates a plan, so it is owner-only even for administrators.
    const { plan, supabase } = await requirePlanOwner(id);
    const adminDb = getSupabaseAdmin();

    if (plan.planStatus !== 'archived') {
       return NextResponse.json({
        success: false,
        error: 'Only archived plans can be restored'
      }, { status: 400 });
    }

    // 2. Back up the plan before restoring it.
    await adminDb.from('LessonPlan_Backup').insert({
      backupId: `BKP-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
      originalPlanId: id,
      backupAt: timestamp,
      actionType: 'restore',
      backupReason: 'กู้คืนแผนการสอน',
      backupDataJson: JSON.stringify(plan)
    });

    // 3. Restore the plan status back to draft
    const { error: updateErr } = await supabase
      .from('LessonPlans')
      .update({
        planStatus: 'draft',
        updatedAt: timestamp
      })
      .eq('planId', id);

    if (updateErr) throw updateErr;

    // 4. Log transaction
    await adminDb.from('System_Logs').insert({
      logId: `LOG-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
      timestamp,
      action: 'RESTORE_PLAN',
      status: 'success',
      planId: id,
      message: `กู้คืนแผนการสอน: ${plan.lessonTopic || id} (${plan.subjectCode || ''})`
    });

    return NextResponse.json({
      success: true,
      message: 'กู้คืนแผนการสอนเรียบร้อยแล้ว'
    });
  } catch (error: any) {
    if (isAuthorizationError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.httpStatus });
    }
    console.error('Error restoring plan:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}
