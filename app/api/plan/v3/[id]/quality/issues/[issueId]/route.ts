/**
 * POST /api/plan/v3/[id]/quality/issues/[issueId]/apply
 * Apply an AI-proposed fix to a specific field.
 * Only patches the specific field — never saves the whole lesson graph.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; issueId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const planId = params.id;
    const body = await request.json();
    const { entityType, entityId, field, replacement } = body;

    if (!entityType || !entityId || !field || replacement === undefined) {
      return NextResponse.json({ error: 'entityType, entityId, field, and replacement are required' }, { status: 400 });
    }

    const repo = new V3Repository(supabase);

    // Verify ownership
    const lesson = await repo.getLessonById(planId, user.id);
    if (!lesson) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Apply fix to the specific entity and field only
    let updatedEntity: any = null;

    switch (entityType) {
      case 'OBJECTIVE': {
        const allowedFields = ['statement', 'observable_behavior'];
        if (!allowedFields.includes(field)) {
          return NextResponse.json({ error: `Field "${field}" is not patchable for OBJECTIVE` }, { status: 400 });
        }
        const { data, error } = await supabase
          .from('v3_lesson_objectives')
          .update({ [field]: replacement })
          .eq('id', entityId)
          .eq('lesson_plan_id', planId)
          .select()
          .single();
        if (error) throw new Error(error.message);
        updatedEntity = data;
        break;
      }
      case 'ACTIVITY': {
        const allowedFields = ['teacher_actions', 'student_actions', 'assessment_moment', 'feedback_moment', 'title'];
        if (!allowedFields.includes(field)) {
          return NextResponse.json({ error: `Field "${field}" is not patchable for ACTIVITY` }, { status: 400 });
        }
        const { data, error } = await supabase
          .from('v3_lesson_activities')
          .update({ [field]: replacement })
          .eq('id', entityId)
          .eq('lesson_plan_id', planId)
          .select()
          .single();
        if (error) throw new Error(error.message);
        updatedEntity = data;
        break;
      }
      case 'ASSESSMENT': {
        const allowedFields = ['method', 'criteria_text', 'criteria_value', 'name'];
        if (!allowedFields.includes(field)) {
          return NextResponse.json({ error: `Field "${field}" is not patchable for ASSESSMENT` }, { status: 400 });
        }
        const { data, error } = await supabase
          .from('v3_assessments')
          .update({ [field]: replacement })
          .eq('id', entityId)
          .eq('lesson_plan_id', planId)
          .select()
          .single();
        if (error) throw new Error(error.message);
        updatedEntity = data;
        break;
      }
      case 'EVIDENCE': {
        const allowedFields = ['description'];
        if (!allowedFields.includes(field)) {
          return NextResponse.json({ error: `Field "${field}" is not patchable for EVIDENCE` }, { status: 400 });
        }
        const { data, error } = await supabase
          .from('v3_learning_evidence')
          .update({ [field]: replacement })
          .eq('id', entityId)
          .eq('lesson_plan_id', planId)
          .select()
          .single();
        if (error) throw new Error(error.message);
        updatedEntity = data;
        break;
      }
      default:
        return NextResponse.json({ error: `entityType "${entityType}" is not supported for apply-fix` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      entityType,
      entityId,
      field,
      updatedEntity,
      note: 'AI review is now stale. Re-run quality check to get updated results.',
    });
  } catch (error: any) {
    console.error('[quality apply fix]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
