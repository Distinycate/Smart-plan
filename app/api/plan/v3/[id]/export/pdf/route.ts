/**
 * GET /api/plan/v3/[id]/export/pdf
 *
 * Deterministic Server-Side PDF Export Route:
 * - Single Source of Truth: Consumes canonical V3LessonDocument
 * - Accurate deterministic page numbering (Page X / Total) and headers/footers
 * - Deployable: Headless Chrome with robust pdf-lib fallback
 * - Supports Teacher Package vs Student Package
 * - Returns application/pdf binary
 * - Zero AI calls
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { buildLessonAlignmentGraph } from '@/lib/smartPlanV3/quality/alignmentGraph';
import { runStructuralQualityRules } from '@/lib/smartPlanV3/quality/qualityRules';
import { deriveDocumentReadiness } from '@/lib/smartPlanV3/quality/qualityEngine';
import { buildLessonDocument } from '@/lib/smartPlanV3/document/builder';
import { DEFAULT_DOCUMENT_OPTIONS, type DocumentOptions } from '@/lib/smartPlanV3/document/types';
import { generatePdfDocument, type PdfPackageType } from '@/lib/smartPlanV3/export/pdf';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const planId = params.id;
    const url = new URL(request.url);
    const packageParam = url.searchParams.get('package');
    const packageType: PdfPackageType = packageParam === 'student' ? 'student' : 'teacher';

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

      const pdfBuffer = await generatePdfDocument(doc, packageType);
      const safeFilename = `${doc.metadata.topic.replace(/[/\\?%*:|"<>]/g, '_')}_${packageType === 'teacher' ? 'TeacherPlan' : 'StudentMaterials'}.pdf`;

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
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

    // 4. Assemble canonical model & generate PDF
    const doc = buildLessonDocument(graph, options);
    const pdfBuffer = await generatePdfDocument(doc, packageType);
    const safeFilename = `${doc.metadata.topic.replace(/[/\\?%*:|"<>]/g, '_')}_${packageType === 'teacher' ? 'TeacherPlan' : 'StudentMaterials'}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
        'X-Document-Source-Hash': doc.documentSourceHash,
        'X-Smart-Plan-Package': packageType,
      },
    });
  } catch (err: any) {
    console.error('[SmartPlanV3] PDF export error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
