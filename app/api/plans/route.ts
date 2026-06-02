import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET all plans
export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('LessonPlans')
      .select('planId, planStatus, subjectCode, subjectName, unitName, lessonTopic, gradeLevel, semester, academicYear, totalHours, createdAt, updatedAt')
      .order('updatedAt', { ascending: false });

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
    const body = await req.json();
    
    // Generate simple ID if not provided
    const planId = body.planId || `PLAN-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const newPlan = {
      ...body,
      planId,
      planStatus: body.planStatus || 'draft',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const { data, error } = await supabase
      .from('LessonPlans')
      .insert(newPlan)
      .select();

    if (error) throw error;

    // Log transaction
    await supabase.from('System_Logs').insert({
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
