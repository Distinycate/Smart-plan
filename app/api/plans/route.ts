import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { validateLessonPlanPayload } from '@/lib/lessonPlanValidation';

// GET all plans
export async function GET(req: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');

    let query = db
      .from('LessonPlans')
      .select('planId, planStatus, subjectCode, subjectName, unitName, lessonTopic, gradeLevel, semester, academicYear, totalHours, createdAt, updatedAt')
      .order('updatedAt', { ascending: false });

    if (statusFilter === 'archived') {
      query = query.eq('planStatus', 'archived');
    } else if (statusFilter === 'ai_fixed') {
      query = query.eq('planStatus', 'ai_fixed');
    } else {
      query = query.neq('planStatus', 'archived').neq('planStatus', 'ai_fixed');
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}

// POST create plan
export async function POST(req: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    const body = await req.json();
    const planStatus = body.planStatus || 'draft';
    const validationError = validateLessonPlanPayload(body, planStatus);

    if (validationError) {
      return NextResponse.json({
        success: false,
        error: validationError
      }, { status: 400 });
    }
    
    // Generate simple ID if not provided
    const planId = body.planId || `PLAN-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const newPlan = {
      ...body,
      planId,
      planStatus,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    let { data, error } = await db
      .from('LessonPlans')
      .insert(newPlan)
      .select();

    if (error) {
      // Check if error is due to missing rubric columns
      const isMissingColumnError = error.message?.includes('column') && 
        (error.message?.includes('rubricK') || error.message?.includes('rubricP') || error.message?.includes('rubricA'));
        
      if (isMissingColumnError) {
        console.warn('Database is missing rubric columns. Retrying save without rubric columns...');
        const fallbackPlan = { ...newPlan };
        delete fallbackPlan.rubricK;
        delete fallbackPlan.rubricP;
        delete fallbackPlan.rubricA;
        
        const retryResult = await db
          .from('LessonPlans')
          .insert(fallbackPlan)
          .select();
          
        if (retryResult.error) throw retryResult.error;
        data = retryResult.data;
      } else {
        throw error;
      }
    }

    // Log transaction
    await db.from('System_Logs').insert({
      logId: `LOG-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
      timestamp,
      action: 'CREATE_PLAN',
      status: 'success',
      planId,
      message: `สร้างแผนการสอนใหม่: ${newPlan.lessonTopic} (${newPlan.subjectCode})`
    });

    return NextResponse.json({
      success: true,
      data: data?.[0] || newPlan
    });

  } catch (error: any) {
    console.error('Error creating plan:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}
