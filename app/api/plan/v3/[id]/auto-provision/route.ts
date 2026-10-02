import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { isValidUuid } from '@/lib/smartPlanV3/schemas';
import { isLessonLocked } from '@/lib/smartPlanV3/types';
import { getObjectiveSuggestions } from '@/lib/smartPlanV3/suggestions/objectiveSuggestions';
import { getEvidenceSuggestions } from '@/lib/smartPlanV3/suggestions/evidenceSuggestions';

interface RouteContext {
  params: { id: string };
}

/**
 * POST /api/plan/v3/[id]/auto-provision
 * Zero-Cold-Start Auto-Provisioning:
 * Automatically supplies best-practice K-P-A objectives, learning evidence,
 * and links them together so teachers with no curriculum background have a
 * complete, pedagogically aligned foundation from day 1 without manual linking.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: planId } = params;
    if (!isValidUuid(planId)) {
      return NextResponse.json({ success: false, error: 'รหัสแผนการสอนไม่ถูกต้อง' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    // Role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isAdmin = profile?.role === 'admin';

    const repo = new V3Repository(supabase);
    const graph = await repo.getLessonGraph(planId, user.id, isAdmin);

    if (!graph || !graph.lesson) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน' }, { status: 404 });
    }

    const { lesson } = graph;
    if (isLessonLocked(lesson.status)) {
      return NextResponse.json({
        success: false,
        error: `แผนการสอนอยู่ในสถานะ ${lesson.status} ไม่อนุญาตให้แก้ไข`,
        code: 'LESSON_IS_LOCKED',
      }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { healMissingOnly = false } = body || {};

    // 1. Duration check
    if (!lesson.duration_minutes || lesson.duration_minutes <= 0) {
      await repo.updateLesson(planId, { duration_minutes: 60 }, user.id, isAdmin);
      lesson.duration_minutes = 60;
    }

    // 2. Ensure Curriculum Link
    let currentLinks = graph.curriculumLinks || [];
    if (currentLinks.length === 0) {
      const topicText = lesson.topic?.trim() || 'การจัดการเรียนรู้เชิงรุก (Active Learning)';
      currentLinks = await repo.replaceCurriculumLinks(planId, [{
        lesson_plan_id: planId,
        curriculum_version: lesson.curriculum_version || 'OBEC-2551-REV60',
        subject_key: lesson.subject_key || 'GENERAL',
        grade_level: lesson.grade_level || 'ม.1',
        standard_code: 'มฐ.แกนกลาง',
        indicator_code: 'ตชว.1',
        standard_label_snapshot: 'มาตรฐานการเรียนรู้แกนกลางตามหลักสูตร',
        indicator_label_snapshot: `[ระหว่างทาง] เข้าใจและนำความรู้เกี่ยวกับ ${topicText} ไปประยุกต์ใช้ได้อย่างถูกต้อง`,
        position: 0,
      }]);
    }

    // 3. Objectives Provisioning / Healing
    let currentObjectives = [...(graph.objectives || [])];
    const cleanTopic = lesson.topic?.trim() || 'บทเรียน';

    const sugObjs = getObjectiveSuggestions({
      subjectKey: lesson.subject_key || 'GENERAL',
      learningFocus: lesson.learning_focus || 'ACTIVE_LEARNING',
      topic: cleanTopic,
      indicatorText: currentLinks[0]?.indicator_label_snapshot || '',
      durationMinutes: lesson.duration_minutes || 60,
    });

    if (currentObjectives.length === 0) {
      // Create top 3 (K, P, A)
      for (let i = 0; i < Math.min(3, sugObjs.length); i++) {
        const s = sugObjs[i];
        const created = await repo.createObjective({
          lesson_plan_id: planId,
          statement: s.statement,
          position: i,
          objective_type: s.category || null,
          observable_behavior: s.observableVerb || null,
          source: 'AI',
        });
        currentObjectives.push(created);
      }
    } else if (healMissingOnly) {
      // Check which domains (K, P, A) are missing
      const hasK = currentObjectives.some(o => (o.statement || '').includes('(K)') || (o.statement || '').includes('ความรู้') || o.objective_type === 'K');
      const hasP = currentObjectives.some(o => (o.statement || '').includes('(P)') || (o.statement || '').includes('ทักษะ') || o.objective_type === 'P');
      const hasA = currentObjectives.some(o => (o.statement || '').includes('(A)') || (o.statement || '').includes('คุณลักษณะ') || o.objective_type === 'A');

      const kCandidate = sugObjs.find(s => s.category === 'K');
      const pCandidate = sugObjs.find(s => s.category === 'P');
      const aCandidate = sugObjs.find(s => s.category === 'A');

      let nextPos = currentObjectives.length;
      if (!hasK && kCandidate) {
        const created = await repo.createObjective({
          lesson_plan_id: planId,
          statement: kCandidate.statement,
          position: nextPos++,
          objective_type: 'K',
          observable_behavior: kCandidate.observableVerb || null,
          source: 'AI',
        });
        currentObjectives.push(created);
      }
      if (!hasP && pCandidate) {
        const created = await repo.createObjective({
          lesson_plan_id: planId,
          statement: pCandidate.statement,
          position: nextPos++,
          objective_type: 'P',
          observable_behavior: pCandidate.observableVerb || null,
          source: 'AI',
        });
        currentObjectives.push(created);
      }
      if (!hasA && aCandidate) {
        const created = await repo.createObjective({
          lesson_plan_id: planId,
          statement: aCandidate.statement,
          position: nextPos++,
          objective_type: 'A',
          observable_behavior: aCandidate.observableVerb || null,
          source: 'AI',
        });
        currentObjectives.push(created);
      }
    }

    // 4. Evidence Provisioning
    let currentEvidence = [...(graph.evidence || [])];
    if (currentEvidence.length === 0) {
      const sugEvds = getEvidenceSuggestions({
        subjectKey: lesson.subject_key || 'GENERAL',
        learningFocus: lesson.learning_focus || 'ACTIVE_LEARNING',
        topic: cleanTopic,
        objectiveStatements: currentObjectives.map(o => o.statement),
      });

      for (let i = 0; i < Math.min(2, sugEvds.length); i++) {
        const e = sugEvds[i];
        const created = await repo.createEvidence({
          lesson_plan_id: planId,
          evidence_type: e.evidenceType,
          description: e.description,
          position: i,
          source: 'AI',
        });
        currentEvidence.push(created);
      }
    }

    // 5. Ensure Objective-Evidence Linking (Self-healing alignment)
    const existingLinks = graph.objectiveEvidenceLinks || [];
    const linkedObjIds = new Set<string>(existingLinks.map(l => l.objective_id));
    const primaryEvidence = currentEvidence[0];

    if (primaryEvidence) {
      for (const obj of currentObjectives) {
        if (!linkedObjIds.has(obj.id)) {
          try {
            await repo.linkObjectiveEvidence(obj.id, primaryEvidence.id);
          } catch {}
        }
      }
    }

    // Reload and return clean graph data
    const updatedGraph = await repo.getLessonGraph(planId, user.id, isAdmin);

    return NextResponse.json({
      success: true,
      data: updatedGraph,
      message: 'เตรียมข้อมูล K-P-A และหลักฐานการเรียนรู้ครบถ้วนเรียบร้อยแล้ว',
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'เกิดข้อผิดพลาดในการเตรียมข้อมูลอัตโนมัติ',
    }, { status: 500 });
  }
}
