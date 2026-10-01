/**
 * POST /api/plan/v3/[id]/post-teaching/teach
 *
 * Dedicated Lifecycle State Transition: FINAL -> TAUGHT
 *
 * Validates teaching session and atomic record creation.
 * Pure deterministic execution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const planId = params.id;
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Upfront ownership and existence check (non-disclosing 404)
    const { data: lesson, error: lErr } = await supabase
      .from('v3_lesson_plans')
      .select('id, user_id, status')
      .eq('id', planId)
      .maybeSingle();

    if (lErr || !lesson || lesson.user_id !== user.id) {
      return NextResponse.json({ error: 'ไม่พบแผนการสอน หรือไม่มีสิทธิ์เข้าถึง' }, { status: 404 });
    }

    const body = await request.json();
    const repo = new V3Repository(supabase);

    const result = await repo.recordTeachingSession(planId, user.id, body);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[V3 Post-Teaching Teach POST]', error);
    const status = error.statusCode || (error.code === 'INVALID_STUDENT_COUNTS' ? 400 : (error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN' ? 404 : 500));
    return NextResponse.json(
      {
        error: error.message || 'Failed to record teaching session',
        code: error.code || 'TEACH_RECORD_FAILED',
      },
      { status }
    );
  }
}
