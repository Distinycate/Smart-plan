/**
 * POST /api/plan/v3/[id]/post-teaching/reflect
 *
 * Dedicated Lifecycle State Transition: TAUGHT -> REFLECTED
 *
 * Validates teacher reflection and enforces Remediation Gate.
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

    const body = await request.json();
    const repo = new V3Repository(supabase);

    const result = await repo.recordReflection(planId, user.id, body);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[V3 Post-Teaching Reflect POST]', error);
    const status = error.statusCode || (error.code === 'REMEDIATION_REQUIRED' ? 400 : 500);
    return NextResponse.json(
      {
        error: error.message || 'Failed to record reflection',
        code: error.code || 'REFLECT_RECORD_FAILED',
      },
      { status }
    );
  }
}
