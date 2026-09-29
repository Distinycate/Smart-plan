/**
 * GET /api/plan/v3/[id]/export/word
 *
 * Real OOXML Microsoft Word (.docx) Export Route:
 * - Single Source of Truth: Consumes canonical V3LessonDocument
 * - Preserves TH Sarabun New typography, table borders, and headers/footers
 * - Supports Teacher Package vs Student Package
 * - Returns authentic application/vnd.openxmlformats-officedocument.wordprocessingml.document
 * - Zero AI calls
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { buildLessonAlignmentGraph } from '@/lib/smartPlanV3/quality/alignmentGraph';
import { runStructuralQualityRules } from '@/lib/smartPlanV3/quality/qualityRules';
import { deriveDocumentReadiness } from '@/lib/smartPlanV3/quality/qualityEngine';
import { buildLessonDocument } from '@/lib/smartPlanV3/document/builder';
import { DEFAULT_DOCUMENT_OPTIONS, type DocumentOptions, type V3LessonDocument } from '@/lib/smartPlanV3/document/types';
import { generateDocxDocument, type DocxPackageType } from '@/lib/smartPlanV3/export/docx';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const planId = params.id;
    const url = new URL(request.url);
    const packageParam = url.searchParams.get('package');
    const packageType: DocxPackageType = packageParam === 'student' ? 'student' : 'teacher';

    // Configure options based on package type
    const options: DocumentOptions = {
      ...DEFAULT_DOCUMENT_OPTIONS,
      includeTeacherGuide: url.searchParams.get('includeTeacherGuide') === '1',
      includePaReadinessAppendix: url.searchParams.get('includePaReadinessAppendix') === '1',
    };

    if (packageType === 'student') {
      options.includeAnswerKeys = false;
      options.includeTeacherGuide = false;
      options.includePaReadinessAppendix = false;
      options.includePostTeachingPlaceholder = false;
    }

    // 1. Support demo fixtures strictly in local development
    if (planId.startsWith('demo-')) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'ชุดข้อมูลตัวอย่างถูกระงับการเข้าถึงในสภาพแวดล้อมจริง (Production)' },
          { status: 403 }
        );
      }
      const { getDemoLessonDocument } = await import('@/lib/smartPlanV3/document/fixtures');
      const doc = getDemoLessonDocument(planId, options);
      if (!doc) {
        return NextResponse.json({ error: 'ไม่พบชุดข้อมูลตัวอย่างที่ระบุ' }, { status: 404 });
      }

      const docxBuffer = await generateDocxDocument(doc, packageType);
      const safeFilename = `${doc.metadata.topic.replace(/[/\\?%*:|"<>]/g, '_')}_${packageType === 'teacher' ? 'TeacherPlan' : 'StudentMaterials'}.docx`;

      return new NextResponse(new Uint8Array(docxBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
          'X-Document-Source-Hash': doc.documentSourceHash,
          'X-Smart-Plan-Package': packageType,
        },
      });
    }

    // 2. Real Plan Authentication & Authorization
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const repo = new V3Repository(supabase);
    const graph = await repo.getLessonGraph(planId, user.id);
    if (!graph || !graph.lesson) {
      return NextResponse.json({ error: 'ไม่พบแผนการสอน หรือไม่มีสิทธิ์เข้าถึง' }, { status: 404 });
    }

    // 3. Document Readiness Check
    const alignmentGraph = buildLessonAlignmentGraph(graph);
    const ruleResult = runStructuralQualityRules(graph, alignmentGraph);
    const readiness = deriveDocumentReadiness(graph, ruleResult);

    const isStatusAllowed = graph.lesson.status === 'REVIEWED' || graph.lesson.status === 'FINAL';
    if (!readiness.ready || !isStatusAllowed) {
      const blockerMessages = (readiness.blockers || []).map(b => b.message || b.title);
      return NextResponse.json(
        {
          error: 'แผนการสอนยังไม่ผ่านเกณฑ์ความพร้อมในการส่งออก',
          status: graph.lesson.status,
          blockers: blockerMessages,
        },
        { status: 409 }
      );
    }

    // 4. Assemble canonical model from FINAL immutable snapshot or live graph
    let doc: V3LessonDocument;
    if (graph.lesson.status === 'FINAL') {
      const { data: finalVersion } = await supabase
        .from('v3_plan_versions')
        .select('snapshot')
        .eq('lesson_plan_id', planId)
        .eq('label', 'FINAL')
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (finalVersion?.snapshot?.document) {
        doc = finalVersion.snapshot.document as V3LessonDocument;
      } else if (finalVersion?.snapshot?.lessonGraph) {
        doc = buildLessonDocument(finalVersion.snapshot.lessonGraph, options);
      } else {
        doc = buildLessonDocument(graph, options);
      }
    } else {
      doc = buildLessonDocument(graph, options);
    }

    const docxBuffer = await generateDocxDocument(doc, packageType);
    const safeFilename = `${doc.metadata.topic.replace(/[/\\?%*:|"<>]/g, '_')}_${packageType === 'teacher' ? 'TeacherPlan' : 'StudentMaterials'}.docx`;

    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
        'X-Document-Source-Hash': doc.documentSourceHash,
        'X-Smart-Plan-Package': packageType,
      },
    });
  } catch (err: any) {
    console.error('[SmartPlanV3] DOCX export error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
