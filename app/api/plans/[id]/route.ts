import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET a single plan
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data, error } = await supabase
      .from('LessonPlans')
      .select('*')
      .eq('planId', id)
      .single();

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Plan not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data
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
    const { id } = params;
    const body = await req.json();
    const timestamp = new Date().toISOString();

    // 1. Fetch current version to backup
    const { data: existingPlan, error: getErr } = await supabase
      .from('LessonPlans')
      .select('*')
      .eq('planId', id)
      .single();

    if (!getErr && existingPlan) {
      // Create backup record
      const backupId = `BKP-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      await supabase.from('LessonPlan_Backup').insert({
        backupId,
        originalPlanId: id,
        backupAt: timestamp,
        actionType: 'update',
        backupReason: body.backupReason || 'แก้ไขรายละเอียดแผนการสอน',
        backupDataJson: JSON.stringify(existingPlan)
      });
    }

    // 2. Perform Update
    const updatedFields = {
      ...body,
      updatedAt: timestamp
    };
    
    // Remove system primary/foreign keys from body if any to prevent database errors
    delete updatedFields.planId;
    delete updatedFields.createdAt;
    delete updatedFields.backupReason;

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
    await supabase.from('System_Logs').insert({
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

// DELETE a plan
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const timestamp = new Date().toISOString();

    // 1. Fetch details for logging
    const { data: plan, error: getErr } = await supabase
      .from('LessonPlans')
      .select('lessonTopic, subjectCode')
      .eq('planId', id)
      .single();

    // 2. Perform Delete
    const { error: deleteErr } = await supabase
      .from('LessonPlans')
      .delete()
      .eq('planId', id);

    if (deleteErr) throw deleteErr;

    // 3. Log transaction
    await supabase.from('System_Logs').insert({
      logId: `LOG-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
      timestamp,
      action: 'DELETE_PLAN',
      status: 'success',
      planId: id,
      message: `ลบแผนการสอน: ${plan?.lessonTopic || id} (${plan?.subjectCode || ''})`
    });

    return NextResponse.json({
      success: true,
      message: 'ลบแผนการสอนเรียบร้อยแล้ว'
    });
  } catch (error: any) {
    console.error('Error deleting plan:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}

