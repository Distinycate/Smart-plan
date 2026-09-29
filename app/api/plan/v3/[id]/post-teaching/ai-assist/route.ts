/**
 * POST /api/plan/v3/[id]/post-teaching/ai-assist
 *
 * AI Assistance Endpoint for Post-Teaching Reflection & Remediation wording:
 * - Summarize teacher's raw notes
 * - Suggest draft reflection text
 * - Suggest remediation wording for students needing support
 * - Suggest next lesson adjustments
 *
 * STRICT GOVERNANCE:
 * - Zero database writes.
 * - Does NOT change state (TAUGHT / REFLECTED).
 * - Does NOT invent student outcomes, scores, or evidence.
 * - Returns draft suggestions for teacher review and explicit application only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

    const { data: lesson } = await supabase
      .from('v3_lesson_plans')
      .select('id, user_id, topic')
      .eq('id', planId)
      .maybeSingle();

    if (!lesson || lesson.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const {
      actualTeachingNotes = '',
      whatWorked = '',
      problems = '',
      studentsNeedSupport = 0,
    } = body;

    // Deterministic assistance synthesis (or LLM wording helper)
    let suggestedReflection = '';
    let suggestedRemediation = '';
    let suggestedNextAdjustment = '';

    if (whatWorked) {
      suggestedReflection += `ในการจัดการเรียนรู้เรื่อง ${lesson.topic} ผู้เรียนส่วนใหญ่มีส่วนร่วมได้ดีในกิจกรรม โดยเฉพาะในส่วน ${whatWorked} `;
    }
    if (problems) {
      suggestedReflection += `อย่างไรก็ดี พบประเด็นที่ต้องพัฒนาเพิ่มเติมคือ ${problems}`;
    }
    if (actualTeachingNotes && !suggestedReflection) {
      suggestedReflection = `จากการจัดการเรียนรู้: ${actualTeachingNotes}`;
    }

    if (studentsNeedSupport > 0) {
      suggestedRemediation = `จัดกิจกรรมสอนเสริมรายกลุ่มย่อยสำหรับผู้เรียนที่ยังไม่ผ่านเกณฑ์ (${studentsNeedSupport} คน) โดยใช้แบบฝึกเสริมทักษะและเพื่อนช่วยเพื่อนเพื่อทบทวนมโนทัศน์สำคัญ`;
      suggestedNextAdjustment = `เพิ่มแบบฝึกหัดย่อยระหว่างคาบ และจัดเวลาให้คำปรึกษารายบุคคลก่อนเริ่มบทเรียนถัดไป`;
    } else {
      suggestedNextAdjustment = `ต่อยอดกิจกรรมการเรียนรู้สู่ระดับที่ท้าทายยิ่งขึ้นในแผนการเรียนรู้ถัดไป`;
    }

    return NextResponse.json({
      success: true,
      suggestions: {
        suggestedReflection: suggestedReflection.trim(),
        suggestedRemediation: suggestedRemediation.trim(),
        suggestedNextAdjustment: suggestedNextAdjustment.trim(),
      },
      message: 'ข้อเสนอแนะสำหรับการตรวจสอบและปรับใช้โดยครูผู้สอน',
    });
  } catch (error: any) {
    console.error('[V3 AI Assist POST]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
