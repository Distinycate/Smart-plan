/**
 * POST /api/plan/v3/[id]/finalize
 *
 * Promotes Lesson Plan from REVIEWED to FINAL:
 * 1. Authenticates user & checks plan ownership
 * 2. Enforces Document Readiness gate (status REVIEWED and zero blockers)
 * 3. Builds canonical V3LessonDocument
 * 4. Takes immutable snapshot and persists to v3_plan_versions
 * 5. Updates v3_lesson_plans status to 'FINAL'
 *
 * Deterministic — ZERO AI calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { buildLessonAlignmentGraph } from '@/lib/smartPlanV3/quality/alignmentGraph';
import { runStructuralQualityRules } from '@/lib/smartPlanV3/quality/qualityRules';
import { deriveDocumentReadiness } from '@/lib/smartPlanV3/quality/qualityEngine';
import { buildLessonDocument } from '@/lib/smartPlanV3/document/builder';
import { DEFAULT_DOCUMENT_OPTIONS } from '@/lib/smartPlanV3/document/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const planId = params.id;

    // Demo fixture handling in local development
    if (planId.startsWith('demo-')) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'ชุดข้อมูลตัวอย่างถูกระงับการเข้าถึงในสภาพแวดล้อมจริง (Production)' },
          { status: 403 }
        );
      }
      const { getDemoLessonDocument } = await import('@/lib/smartPlanV3/document/fixtures');
      const doc = getDemoLessonDocument(planId, DEFAULT_DOCUMENT_OPTIONS);
      if (!doc) {
        return NextResponse.json({ error: 'ไม่พบชุดข้อมูลตัวอย่าง' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        status: 'FINAL',
        version: 1,
        documentSourceHash: doc.documentSourceHash,
        finalizedAt: new Date().toISOString(),
        message: 'บันทึกและล็อคแผนฉบับสมบูรณ์ (FINAL Snapshot) สำเร็จ [Demo Fixture]',
      });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const repo = new V3Repository(supabase);

    // 1. Fetch complete lesson graph with ownership verification
    const graph = await repo.getLessonGraph(planId, user.id);
    if (!graph || !graph.lesson) {
      return NextResponse.json({ error: 'ไม่พบแผนการสอน หรือไม่มีสิทธิ์เข้าถึง' }, { status: 404 });
    }

    // 2. Validate readiness & status
    const alignmentGraph = buildLessonAlignmentGraph(graph);
    const ruleResult = runStructuralQualityRules(graph, alignmentGraph);
    const readiness = deriveDocumentReadiness(graph, ruleResult);

    if (!readiness.ready) {
      const blockerMessages = (readiness.blockers || []).map(b => b.message || b.title);
      return NextResponse.json(
        {
          error: 'ไม่สามารถล็อคแผนได้เนื่องจากยังมีประเด็นติดขัด (Blockers)',
          blockers: blockerMessages,
        },
        { status: 409 }
      );
    }

    if (graph.lesson.status !== 'REVIEWED' && graph.lesson.status !== 'FINAL') {
      return NextResponse.json(
        {
          error: `ต้องตรวจทานแผนในขั้นที่ 6 จนได้สถานะ REVIEWED ก่อนจึงจะสามารถล็อคเป็น FINAL ได้ (สถานะปัจจุบัน: ${graph.lesson.status})`,
        },
        { status: 409 }
      );
    }

    // 3. Idempotency Check: If already FINAL, return existing snapshot to prevent duplicate versions
    if (graph.lesson.status === 'FINAL') {
      const { data: existingFinalVersion } = await supabase
        .from('v3_plan_versions')
        .select('*')
        .eq('lesson_plan_id', planId)
        .eq('label', 'FINAL')
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingFinalVersion) {
        return NextResponse.json({
          success: true,
          status: 'FINAL',
          version: existingFinalVersion.version_number,
          documentSourceHash: existingFinalVersion.snapshot?.documentSourceHash || '',
          finalizedAt: existingFinalVersion.created_at,
          message: 'แผนการสอนได้รับการล็อคเป็น FINAL เรียบร้อยแล้ว (คืนค่า Snapshot ที่มีอยู่)',
          isDuplicate: true,
        });
      }
    }

    // 4. Assemble Canonical Document
    const doc = buildLessonDocument(graph, DEFAULT_DOCUMENT_OPTIONS);

    // 5. Query highest existing version_number for this plan
    const { data: latestVersionData } = await supabase
      .from('v3_plan_versions')
      .select('version_number')
      .eq('lesson_plan_id', planId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (latestVersionData?.version_number || 0) + 1;
    const finalizedTimestamp = new Date().toISOString();

    // 6. Insert immutable snapshot into v3_plan_versions
    const { data: insertedVersion, error: versionInsertError } = await supabase
      .from('v3_plan_versions')
      .insert({
        lesson_plan_id: planId,
        version_number: nextVersion,
        label: 'FINAL',
        snapshot: {
          lessonGraph: graph,
          document: doc,
          documentSourceHash: doc.documentSourceHash,
          finalizedAt: finalizedTimestamp,
        },
        created_by: user.id,
      })
      .select('id')
      .single();

    if (versionInsertError) {
      console.error('[SmartPlanV3] Failed to store snapshot in v3_plan_versions:', versionInsertError);
      return NextResponse.json(
        { error: `ไม่สามารถบันทึก snapshot: ${versionInsertError.message}` },
        { status: 500 }
      );
    }

    // 7. Update lesson status to FINAL with rollback protection
    const { error: updateStatusError } = await supabase
      .from('v3_lesson_plans')
      .update({
        status: 'FINAL',
        updated_at: finalizedTimestamp,
      })
      .eq('id', planId)
      .eq('user_id', user.id);

    if (updateStatusError) {
      console.error('[SmartPlanV3] Failed to update lesson status to FINAL, rolling back snapshot:', updateStatusError);
      // Rollback inserted snapshot version
      if (insertedVersion?.id) {
        await supabase.from('v3_plan_versions').delete().eq('id', insertedVersion.id);
      }
      return NextResponse.json(
        { error: `ไม่สามารถอัปเดตสถานะแผนเป็น FINAL: ${updateStatusError.message} (ทำการ Rollback เรียบร้อยแล้ว)` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: 'FINAL',
      version: nextVersion,
      documentSourceHash: doc.documentSourceHash,
      finalizedAt: finalizedTimestamp,
      message: 'บันทึกและสร้าง Snapshot ฉบับสมบูรณ์ (FINAL) เรียบร้อยแล้ว',
    });
  } catch (err: any) {
    console.error('[SmartPlanV3] Finalize plan API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
