import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateLessonPlanPayload } from '@/lib/lessonPlanValidation';
import { getSupabaseAdmin } from '@/lib/supabase'; // keeping for logs if needed
import { sanitizeRubricsOutOfAssessmentTools } from '@/lib/lesson-plan/rubric-field-sanitizer';

// GET a single plan
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { id } = params;

    const { data, error } = await supabase
      .from('LessonPlans')
      .select('*')
      .eq('planId', id)
      .single();

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Plan not found or unauthorized'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: sanitizeRubricsOutOfAssessmentTools(data)
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('Error fetching plan:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}

// PUT update plan + auto backup
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { id } = params;
    const body = sanitizeRubricsOutOfAssessmentTools(await req.json());
    const timestamp = new Date().toISOString();

    // 1. Fetch current version to backup
    const { data: existingPlan, error: getErr } = await supabase
      .from('LessonPlans')
      .select('*')
      .eq('planId', id)
      .single();

    if (getErr || !existingPlan) {
      return NextResponse.json({
        success: false,
        error: 'Plan not found or unauthorized'
      }, { status: 404 });
    }

    const mergedPlan = {
      ...existingPlan,
      ...body,
      planStatus: body.planStatus || existingPlan.planStatus || 'draft'
    };
    const validationError = validateLessonPlanPayload(mergedPlan, mergedPlan.planStatus);

    if (validationError) {
      return NextResponse.json({
        success: false,
        error: validationError
      }, { status: 400 });
    }

    // Create backup record before editing the current plan.
    const adminDb = getSupabaseAdmin();
    const backupId = `BKP-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    await adminDb.from('LessonPlan_Backup').insert({
      backupId,
      originalPlanId: id,
      backupAt: timestamp,
      actionType: 'update',
      backupReason: body.backupReason || 'แก้ไขรายละเอียดแผนการสอน',
      backupDataJson: JSON.stringify(existingPlan)
    });

    // 2. Perform Update
    const updatedFields = {
      ...body,
      updatedAt: timestamp
    };
    
    // Remove system primary/foreign keys from body if any to prevent database errors
    delete updatedFields.planId;
    delete updatedFields.createdAt;
    delete updatedFields.backupReason;
    delete updatedFields.user_id; // don't allow changing owner

    let { data, error: updateErr } = await supabase
      .from('LessonPlans')
      .update(updatedFields)
      .eq('planId', id)
      .select();

    if (updateErr) {
      console.error('Error updating plan:', updateErr);
      throw updateErr;
    }

    // 3. Log transaction
    await adminDb.from('System_Logs').insert({
      logId: `LOG-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
      timestamp,
      action: 'UPDATE_PLAN',
      status: 'success',
      planId: id,
      message: `อัปเดตแผนการสอน: ${body.lessonTopic || existingPlan?.lessonTopic}`
    });

    return NextResponse.json({
      success: true,
      data: data?.[0]
    });

  } catch (error: any) {
    console.error('Error updating plan:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}

// DELETE archives a plan. We keep the HTTP method for compatibility with the UI,
// but the operation is intentionally non-destructive.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const adminDb = getSupabaseAdmin();
    const { id } = params;
    const timestamp = new Date().toISOString();

    // 1. Fetch details for backup and logging
    const { data: plan, error: getErr } = await supabase
      .from('LessonPlans')
      .select('*')
      .eq('planId', id)
      .single();

    if (getErr || !plan) {
      return NextResponse.json({
        success: false,
        error: 'Plan not found or unauthorized'
      }, { status: 404 });
    }

    // 2. Back up the plan before archiving it.
    await adminDb.from('LessonPlan_Backup').insert({
      backupId: `BKP-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
      originalPlanId: id,
      backupAt: timestamp,
      actionType: 'archive',
      backupReason: 'เก็บถาวรผ่านปุ่มจัดการแผน',
      backupDataJson: JSON.stringify(plan)
    });

    // 3. Soft archive instead of deleting the row.
    const { error: archiveErr } = await supabase
      .from('LessonPlans')
      .update({
        planStatus: 'archived',
        updatedAt: timestamp
      })
      .eq('planId', id);

    if (archiveErr) throw archiveErr;

    // 4. Log transaction
    await adminDb.from('System_Logs').insert({
      logId: `LOG-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
      timestamp,
      action: 'ARCHIVE_PLAN',
      status: 'success',
      planId: id,
      message: `เก็บถาวรแผนการสอน: ${plan.lessonTopic || id} (${plan.subjectCode || ''})`
    });

    return NextResponse.json({
      success: true,
      message: 'เก็บถาวรแผนการสอนเรียบร้อยแล้ว'
    });
  } catch (error: any) {
    console.error('Error archiving plan:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}
