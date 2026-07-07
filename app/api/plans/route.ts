import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateLessonPlanPayload } from '@/lib/lessonPlanValidation';
import { getSupabaseAdmin } from '@/lib/supabase'; // keeping for logs if needed
import { ensureDetailedRubrics } from '@/lib/lesson-plan/rubric-field-sanitizer';

// GET all plans
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const targetUserId = searchParams.get('userId');
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an admin
    let isAdmin = false;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role === 'admin') {
      isAdmin = true;
    }

    // Return all plans if the user is an admin, otherwise only their own plans
    let query = supabase
      .from('LessonPlans')
      .select('planId, planStatus, subjectCode, subjectName, unitName, lessonTopic, gradeLevel, semester, academicYear, totalHours, createdAt, updatedAt, user_id')
      .order('updatedAt', { ascending: false });

    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    } else if (targetUserId) {
      // Admin is requesting a specific user's plans
      query = query.eq('user_id', targetUserId);
    }

    if (statusFilter === 'archived') {
      query = query.eq('planStatus', 'archived');
    } else if (statusFilter === 'ai_fixed') {
      query = query.eq('planStatus', 'ai_fixed');
    } else {
      query = query.neq('planStatus', 'archived').neq('planStatus', 'ai_fixed');
    }

    const { data: plansData, error } = await query;

    if (error) throw error;

    let finalData = plansData;

    // If admin, attach author email to each plan
    if (isAdmin && plansData) {
      const userIds = Array.from(new Set(plansData.map(p => p.user_id).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, email, full_name').in('id', userIds);
        const profileMap = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});

        finalData = plansData.map(p => ({
          ...p,
          author_email: p.user_id ? profileMap[p.user_id]?.email : null,
          author_name: p.user_id ? profileMap[p.user_id]?.full_name : null,
        }));
      }
    }

    return NextResponse.json({
      success: true,
      data: finalData
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
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = ensureDetailedRubrics(await req.json());
    const planStatus = body.planStatus || 'draft';
    const validationError = validateLessonPlanPayload(body, planStatus);

    if (validationError) {
      return NextResponse.json({
        success: false,
        error: validationError
      }, { status: 400 });
    }
    
    // Generate unique ID if not provided
    const planId = body.planId || `PLAN-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const newPlan = {
      ...body,
      planId,
      planStatus,
      user_id: user.id, // Assign to current user
      createdAt: timestamp,
      updatedAt: timestamp
    };

    let { data, error } = await supabase
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
        
        const retryResult = await supabase
          .from('LessonPlans')
          .insert(fallbackPlan)
          .select();
          
        if (retryResult.error) throw retryResult.error;
        data = retryResult.data;
      } else {
        throw error;
      }
    }

    // Log transaction using getSupabaseAdmin since System_Logs might not have RLS for regular users to insert
    const adminDb = getSupabaseAdmin();
    await adminDb.from('System_Logs').insert({
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
