/**
 * GET /api/plan/v3/[id]/document
 *
 * Server-side canonical document builder:
 * 1. Authenticates user & enforces ownership
 * 2. Fetches V3 composite lesson graph
 * 3. Enforces Document Readiness gate (status REVIEWED and zero blockers)
 * 4. Assembles canonical V3LessonDocument
 * 5. Validates model integrity before returning
 *
 * Pure read-only, Zero AI calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { buildLessonAlignmentGraph } from '@/lib/smartPlanV3/quality/alignmentGraph';
import { runStructuralQualityRules } from '@/lib/smartPlanV3/quality/qualityRules';
import { deriveDocumentReadiness } from '@/lib/smartPlanV3/quality/qualityEngine';
import { buildLessonDocument, validateLessonDocumentModel } from '@/lib/smartPlanV3/document';
import type { DocumentOptions } from '@/lib/smartPlanV3/document';

function parseDocumentOptions(url: URL): Partial<DocumentOptions> {
  const options: Partial<DocumentOptions> = {};

  if (url.searchParams.has('includeCover')) {
    options.includeCover = url.searchParams.get('includeCover') === '1' || url.searchParams.get('includeCover') === 'true';
  }
  if (url.searchParams.has('includeStudentAssets')) {
    options.includeStudentAssets = url.searchParams.get('includeStudentAssets') !== '0' && url.searchParams.get('includeStudentAssets') !== 'false';
  }
  if (url.searchParams.has('includeAnswerKeys')) {
    options.includeAnswerKeys = url.searchParams.get('includeAnswerKeys') !== '0' && url.searchParams.get('includeAnswerKeys') !== 'false';
  }
  if (url.searchParams.has('includeAssessmentTools')) {
    options.includeAssessmentTools = url.searchParams.get('includeAssessmentTools') !== '0' && url.searchParams.get('includeAssessmentTools') !== 'false';
  }
  if (url.searchParams.has('includeTeacherGuide')) {
    options.includeTeacherGuide = url.searchParams.get('includeTeacherGuide') === '1' || url.searchParams.get('includeTeacherGuide') === 'true';
  }
  if (url.searchParams.has('includePaReadinessAppendix')) {
    options.includePaReadinessAppendix = url.searchParams.get('includePaReadinessAppendix') === '1' || url.searchParams.get('includePaReadinessAppendix') === 'true';
  }
  if (url.searchParams.has('includePostTeachingPlaceholder')) {
    options.includePostTeachingPlaceholder = url.searchParams.get('includePostTeachingPlaceholder') !== '0' && url.searchParams.get('includePostTeachingPlaceholder') !== 'false';
  }

  return options;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const planId = params.id;
    const url = new URL(request.url);
    const options = parseDocumentOptions(url);

    // Support demo fixtures strictly in local development environment
    if (planId.startsWith('demo-')) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'ชุดข้อมูลตัวอย่างถูกระงับการเข้าถึงในสภาพแวดล้อมจริง (Production)' },
          { status: 403 }
        );
      }
      const { getDemoLessonDocument } = await import('@/lib/smartPlanV3/document/fixtures');
      const doc = getDemoLessonDocument(planId, options);
      if (doc) {
        const validation = validateLessonDocumentModel(doc);
        return NextResponse.json({
          success: true,
          document: doc,
          validation,
        });
      }
      return NextResponse.json({ error: 'ไม่พบชุดข้อมูลตัวอย่างที่ระบุ' }, { status: 404 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const repo = new V3Repository(supabase);

    // 1. Fetch lesson graph with ownership verification
    const graph = await repo.getLessonGraph(planId, user.id);
    if (!graph || !graph.lesson) {
      return NextResponse.json({ error: 'ไม่พบแผนการสอน หรือไม่มีสิทธิ์เข้าถึง' }, { status: 404 });
    }

    // 2. Enforce Document Readiness Gate (Allow REVIEWED or FINAL)
    const alignmentGraph = buildLessonAlignmentGraph(graph);
    const ruleResult = runStructuralQualityRules(graph, alignmentGraph);
    const readiness = deriveDocumentReadiness(graph, ruleResult);

    const isStatusAllowed = graph.lesson.status === 'REVIEWED' || graph.lesson.status === 'FINAL';
    if (!readiness.ready || !isStatusAllowed) {
      const blockerMessages = (readiness.blockers || []).map(b => b.message || b.title);
      return NextResponse.json(
        {
          error: 'ยังไม่พร้อมสร้างเอกสาร กรุณาตรวจประเด็นที่ต้องแก้ในขั้นที่ 6 ให้เรียบร้อยก่อน',
          status: graph.lesson.status,
          ready: false,
          blockers: blockerMessages,
        },
        { status: 409 }
      );
    }

    if (url.searchParams.has('includeCover')) {
      options.includeCover = url.searchParams.get('includeCover') === '1' || url.searchParams.get('includeCover') === 'true';
    }
    if (url.searchParams.has('includeStudentAssets')) {
      options.includeStudentAssets = url.searchParams.get('includeStudentAssets') !== '0' && url.searchParams.get('includeStudentAssets') !== 'false';
    }
    if (url.searchParams.has('includeAnswerKeys')) {
      options.includeAnswerKeys = url.searchParams.get('includeAnswerKeys') !== '0' && url.searchParams.get('includeAnswerKeys') !== 'false';
    }
    if (url.searchParams.has('includeAssessmentTools')) {
      options.includeAssessmentTools = url.searchParams.get('includeAssessmentTools') !== '0' && url.searchParams.get('includeAssessmentTools') !== 'false';
    }
    if (url.searchParams.has('includeTeacherGuide')) {
      options.includeTeacherGuide = url.searchParams.get('includeTeacherGuide') === '1' || url.searchParams.get('includeTeacherGuide') === 'true';
    }
    if (url.searchParams.has('includePaReadinessAppendix')) {
      options.includePaReadinessAppendix = url.searchParams.get('includePaReadinessAppendix') === '1' || url.searchParams.get('includePaReadinessAppendix') === 'true';
    }
    if (url.searchParams.has('includePostTeachingPlaceholder')) {
      options.includePostTeachingPlaceholder = url.searchParams.get('includePostTeachingPlaceholder') !== '0' && url.searchParams.get('includePostTeachingPlaceholder') !== 'false';
    }

    // 4. Optionally fetch PA review for appendix
    let paReviewResult: any = null;
    if (options.includePaReadinessAppendix) {
      const paReview = await repo.getLatestPlanReview(planId, 'PA_READINESS');
      paReviewResult = paReview?.result || null;
    }

    // 5. Fetch teacher and school profile name if available
    let teacherName = 'ครูผู้สอน';
    let schoolName = 'สถานศึกษา';
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, school_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      if (profile.first_name || profile.last_name) {
        teacherName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      }
      if (profile.school_name) {
        schoolName = profile.school_name;
      }
    }

    // 6. Build Canonical Document
    const document = buildLessonDocument(graph, {
      options,
      readiness,
      paReviewResult,
      teacherName,
      schoolName,
    });

    // 7. Validate Document Model
    const validation = validateLessonDocumentModel(document);
    if (!validation.valid) {
      console.warn('[V3 Document Validation Warnings]', validation.errors);
    }

    return NextResponse.json({
      success: true,
      document,
      validation,
    });
  } catch (error: any) {
    console.error('[V3 Document Build GET]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
