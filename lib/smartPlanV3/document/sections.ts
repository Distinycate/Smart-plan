/**
 * Smart Plan V3 — Canonical Document Section Builders
 *
 * Constructs structured DocumentSection objects from V3LessonGraph.
 * Pure deterministic functions — ZERO AI calls.
 */

import type { V3LessonGraph } from '../types';
import type {
  DocumentSection,
  BulletListSection,
  KeyValueSection,
  ParagraphSection,
  ActivityTimelineSection,
  ActivityTimelineRow,
  AssessmentSection,
  AssessmentTableRow,
  AssetSection,
  AssetSummaryRow,
  PostTeachingPlaceholderSection,
  DocumentAppendix,
  AppendixItem,
  DocumentOptions,
} from './types';
import {
  SECTION_TITLES,
  getAssetTypeLabel,
  getAudienceLabel,
  getAssessmentToolTypeLabel,
  getAssessmentMethodLabel,
  getAppendixCategoryLabel,
} from './labels';
import {
  formatDocumentDuration,
  formatDocumentThaiDate,
  formatObjectiveRefNumbers,
  sanitizeDocumentText,
  getThaiAppendixLetter,
} from './formatters';
import { getSubjectLabel, getStatusLabel, getPhaseLabel } from '../labels';

// ─── 1. Metadata Section ────────────────────────────────────────────────

export function buildMetadataSection(graph: V3LessonGraph): KeyValueSection {
  const lesson = graph.lesson;
  const subjectLabel = getSubjectLabel(lesson.subject_key || '');

  const pairs: Array<{ key: string; value: string }> = [
    { key: 'กลุ่มสาระการเรียนรู้', value: subjectLabel },
    { key: 'หน่วยการเรียนรู้ / เรื่อง', value: lesson.topic || 'ไม่ระบุ' },
    { key: 'ระดับชั้น', value: lesson.grade_level || 'ไม่ระบุ' },
    { key: 'เวลาที่ใช้จัดการเรียนรู้', value: formatDocumentDuration(lesson.duration_minutes || 60) },
  ];

  if (lesson.course_code) {
    pairs.push({ key: 'รหัสวิชา', value: lesson.course_code });
  }
  if (lesson.unit_reference) {
    pairs.push({ key: 'หน่วยการเรียนรู้ที่', value: lesson.unit_reference });
  }
  if (lesson.teaching_date) {
    pairs.push({ key: 'วันที่จัดการเรียนรู้', value: formatDocumentThaiDate(lesson.teaching_date) });
  }

  return {
    id: 'SEC_METADATA',
    type: 'keyValue',
    title: SECTION_TITLES.METADATA,
    sectionNumber: 1,
    pairs,
    avoidBreakInside: true,
  };
}

// ─── 2. Curriculum Standards & Indicators Section ───────────────────────

export function buildCurriculumSection(graph: V3LessonGraph): BulletListSection {
  const links = graph.curriculumLinks || [];
  const items = links.map((link, idx) => ({
    id: `CURR_${idx + 1}`,
    bullet: `${idx + 1}.`,
    text: `${link.indicator_code}: ${sanitizeDocumentText(link.indicator_label_snapshot || link.indicator_code)}`,
    subItems: link.standard_label_snapshot
      ? [`(มาตรฐาน ${link.standard_code}: ${sanitizeDocumentText(link.standard_label_snapshot)})`]
      : undefined,
  }));

  return {
    id: 'SEC_CURRICULUM',
    type: 'bulletList',
    title: SECTION_TITLES.CURRICULUM,
    sectionNumber: 2,
    introText: 'การจัดการเรียนรู้ในแผนนี้สอดคล้องตามมาตรฐานการเรียนรู้และตัวชี้วัด ดังนี้',
    items,
    avoidBreakInside: items.length <= 4,
  };
}

// ─── 3. Key Concept Section ─────────────────────────────────────────────

export function buildKeyConceptSection(graph: V3LessonGraph): ParagraphSection {
  const lesson = graph.lesson;
  const focus = lesson.learning_focus ? ` โดยมุ่งเน้นการพัฒนาทักษะเชิงรุกด้าน "${lesson.learning_focus}"` : '';
  const content = sanitizeDocumentText(
    `การจัดการเรียนรู้เรื่อง "${lesson.topic}" จัดขึ้นเพื่อให้ผู้เรียนเกิดความรู้ความเข้าใจและทักษะที่จำเป็น${focus} ผ่านกระบวนการคิด การลงมือปฏิบัติจริง และการประเมินเพื่อพัฒนาการเรียนรู้`
  );

  return {
    id: 'SEC_KEY_CONCEPT',
    type: 'paragraph',
    title: SECTION_TITLES.KEY_CONCEPT,
    sectionNumber: 3,
    content,
    isIndent: true,
    avoidBreakInside: true,
  };
}

// ─── 4. Learning Objectives Section ─────────────────────────────────────

export function buildObjectivesSection(graph: V3LessonGraph): BulletListSection {
  const objectives = [...(graph.objectives || [])].sort((a, b) => (a.position || 0) - b.position);

  const items = objectives.map((obj, idx) => ({
    id: `OBJ_${idx + 1}`,
    bullet: `${idx + 1}.`,
    text: sanitizeDocumentText(obj.statement),
  }));

  return {
    id: 'SEC_OBJECTIVES',
    type: 'bulletList',
    title: SECTION_TITLES.OBJECTIVES,
    sectionNumber: 4,
    introText: 'เมื่อสิ้นสุดการจัดการเรียนรู้ ผู้เรียนสามารถ:',
    items,
    avoidBreakInside: items.length <= 5,
  };
}

// ─── 5. Learning Contents Section ───────────────────────────────────────

export function buildLearningContentsSection(graph: V3LessonGraph): BulletListSection {
  const lesson = graph.lesson;
  const items = [
    {
      id: 'CNT_1',
      bullet: '•',
      text: `เนื้อหาหลัก: ${sanitizeDocumentText(lesson.topic)}`,
    },
  ];

  if (lesson.learning_focus) {
    items.push({
      id: 'CNT_2',
      bullet: '•',
      text: `ทักษะกระบวนการ / จุดเน้นการเรียนรู้: ${sanitizeDocumentText(lesson.learning_focus)}`,
    });
  }

  return {
    id: 'SEC_CONTENTS',
    type: 'bulletList',
    title: SECTION_TITLES.CONTENTS,
    sectionNumber: 5,
    items,
    avoidBreakInside: true,
  };
}

// ─── 6. Learning Evidence / Artifacts Section ───────────────────────────

export function buildEvidenceSection(
  graph: V3LessonGraph,
  appendixMap: Map<string, string>
): BulletListSection {
  const evidenceList = [...(graph.evidence || [])].sort((a, b) => (a.position || 0) - b.position);

  const items = evidenceList.map((evd, idx) => {
    // Cross reference to asset appendix if matching asset exists
    const matchingAsset = (graph.teachingAssets || []).find(
      a => a.generation_status === 'READY' &&
        (a.title.includes(evd.description) || evd.description.includes(a.title))
    );
    const appRef = matchingAsset ? appendixMap.get(matchingAsset.id) : null;
    const refSuffix = appRef ? ` (${appRef})` : '';

    return {
      id: `EVD_${idx + 1}`,
      bullet: `${idx + 1}.`,
      text: `${sanitizeDocumentText(evd.description)}${refSuffix}`,
    };
  });

  return {
    id: 'SEC_EVIDENCE',
    type: 'bulletList',
    title: SECTION_TITLES.EVIDENCE,
    sectionNumber: 6,
    introText: 'หลักฐานเชิงประจักษ์และชิ้นงาน/ภาระงานที่สะท้อนการบรรลุจุดประสงค์การเรียนรู้ของผู้เรียน ประกอบด้วย:',
    items,
    avoidBreakInside: items.length <= 4,
  };
}

// ─── 7. Learning Process / Activity Timeline Section ────────────────────

export function buildActivityTimelineSection(graph: V3LessonGraph): ActivityTimelineSection {
  const activities = [...(graph.activities || [])].sort((a, b) => (a.position || 0) - b.position);

  let totalMinutes = 0;
  const rows: ActivityTimelineRow[] = activities.map((act, idx) => {
    totalMinutes += act.minutes || 0;
    const phaseLabel = getPhaseLabel(act.phase);

    return {
      position: idx + 1,
      phase: act.phase,
      phaseLabel,
      minutes: act.minutes || 0,
      title: sanitizeDocumentText(act.title || phaseLabel),
      teacherActions: sanitizeDocumentText(act.teacher_actions),
      studentActions: sanitizeDocumentText(act.student_actions),
      assessmentMoment: act.assessment_moment ? sanitizeDocumentText(act.assessment_moment) : null,
      feedbackMoment: act.feedback_moment ? sanitizeDocumentText(act.feedback_moment) : null,
    };
  });

  return {
    id: 'SEC_ACTIVITIES',
    type: 'activityTimeline',
    title: SECTION_TITLES.PROCESS,
    sectionNumber: 7,
    totalMinutes,
    rows,
    repeatHeaderOnBreak: true,
  };
}

// ─── 8. Media & Teaching Resources Section ──────────────────────────────

export function buildTeachingAssetSection(
  graph: V3LessonGraph,
  appendixMap: Map<string, string>
): AssetSection {
  const assets = (graph.teachingAssets || []).filter(a => a.generation_status === 'READY');

  const rows: AssetSummaryRow[] = assets.map((asset, idx) => {
    const appendixRef = appendixMap.get(asset.id) || 'ดูภาคผนวก';
    return {
      ref: `AT${idx + 1}`,
      title: sanitizeDocumentText(asset.title),
      assetType: asset.asset_type,
      assetTypeLabel: getAssetTypeLabel(asset.asset_type),
      audience: asset.audience,
      audienceLabel: getAudienceLabel(asset.audience),
      appendixRef,
    };
  });

  return {
    id: 'SEC_MEDIA',
    type: 'asset',
    title: SECTION_TITLES.MEDIA,
    sectionNumber: 8,
    rows,
    avoidBreakInside: rows.length <= 4,
  };
}

// ─── 9. Assessment & Evaluation Section ─────────────────────────────────

export function buildAssessmentSection(
  graph: V3LessonGraph,
  appendixMap: Map<string, string>
): AssessmentSection {
  const objectives = [...(graph.objectives || [])].sort((a, b) => (a.position || 0) - b.position);
  const evidenceList = graph.evidence || [];
  const assessments = graph.assessments || [];
  const tools = graph.assessmentTools || [];

  const rows: AssessmentTableRow[] = [];

  // Group assessments by distinct assessment record to prevent row duplication
  for (const asm of assessments) {
    // 1. Find all evidence linked to this assessment
    const linkedEvdIds = (graph.assessmentEvidenceLinks || [])
      .filter(l => l.assessment_id === asm.id)
      .map(l => l.evidence_id);

    // 2. Find all objectives linked to these evidences
    const linkedObjIds = new Set<string>();
    for (const evdId of linkedEvdIds) {
      const objLinks = (graph.objectiveEvidenceLinks || []).filter(l => l.evidence_id === evdId);
      for (const ol of objLinks) linkedObjIds.add(ol.objective_id);
    }

    // Determine objective ref numbers (e.g. "ข้อ 1, 2")
    const matchedObjPositions: number[] = [];
    const matchedStatements: string[] = [];
    objectives.forEach((o, i) => {
      if (linkedObjIds.has(o.id)) {
        matchedObjPositions.push(i + 1);
        matchedStatements.push(o.statement);
      }
    });

    const objectiveRefs = formatObjectiveRefNumbers(matchedObjPositions);

    // Get evidence descriptions
    const evidenceDescs = evidenceList
      .filter(e => linkedEvdIds.includes(e.id))
      .map(e => sanitizeDocumentText(e.description));
    const evidenceDescription = evidenceDescs.join(' / ') || 'ภาระงานตามแผน';

    // Tool lookup
    const tool = tools.find(t => t.assessment_id === asm.id);
    const toolTypeLabel = tool ? getAssessmentToolTypeLabel(tool.tool_type) : 'แบบประเมิน';
    const toolName = tool?.title ? sanitizeDocumentText(tool.title) : asm.name;

    // Cross reference to assessment tool appendix
    const appendixRef = tool ? appendixMap.get(tool.id) || null : null;

    rows.push({
      objectiveRefs,
      objectiveStatements: matchedStatements,
      evidenceRef: linkedEvdIds.length > 0 ? `E${linkedEvdIds.length}` : '',
      evidenceDescription,
      method: getAssessmentMethodLabel(asm.method || 'OBSERVATION'),
      toolType: toolTypeLabel,
      toolName,
      criteria: sanitizeDocumentText(asm.criteria_text || (asm as any).criteria || 'ผ่านเกณฑ์ระดับดีขึ้นไป หรือได้คะแนนร้อยละ 70 ขึ้นไป'),
      isFormative: Boolean(asm.formative),
      appendixRef,
    });
  }

  return {
    id: 'SEC_ASSESSMENT',
    type: 'assessment',
    title: SECTION_TITLES.EVALUATION,
    sectionNumber: 9,
    rows,
  };
}

// ─── 10. Post-Teaching Reflection Placeholder Section ───────────────────

export function buildPostTeachingPlaceholderSection(): PostTeachingPlaceholderSection {
  return {
    id: 'SEC_POST_TEACHING',
    type: 'postTeachingPlaceholder',
    title: SECTION_TITLES.POST_TEACHING,
    sectionNumber: 10,
    hasOutcomesRecorded: false,
    resultsPlaceholder: '....................................................................................................................................\n....................................................................................................................................',
    problemsPlaceholder: '....................................................................................................................................\n....................................................................................................................................',
    solutionsPlaceholder: '....................................................................................................................................\n....................................................................................................................................',
    avoidBreakInside: true,
  };
}

// ─── Build Appendices & Dynamic Lettering ───────────────────────────────

export function buildDocumentAppendices(
  graph: V3LessonGraph,
  options: DocumentOptions,
  paReviewResult?: any
): { appendices: DocumentAppendix[]; appendixMap: Map<string, string> } {
  const appendixMap = new Map<string, string>(); // entityId -> "ดูภาคผนวก ก"
  const rawCategories: Array<{
    category: 'STUDENT_ASSETS' | 'ANSWER_KEYS' | 'ASSESSMENT_TOOLS' | 'TEACHER_GUIDE' | 'PA_READINESS';
    title: string;
    items: AppendixItem[];
  }> = [];

  const assets = graph.teachingAssets || [];
  const tools = graph.assessmentTools || [];

  // 1. Student Assets (Category 1)
  if (options.includeStudentAssets) {
    const studentAssets = assets.filter(
      a => a.generation_status === 'READY' &&
        a.asset_type !== 'TEACHER_GUIDE' &&
        a.asset_type !== 'ANSWER_KEY' &&
        a.audience !== 'TEACHER'
    );
    if (studentAssets.length > 0) {
      rawCategories.push({
        category: 'STUDENT_ASSETS',
        title: getAppendixCategoryLabel('STUDENT_ASSETS'),
        items: studentAssets.map(a => ({
          id: a.id,
          title: sanitizeDocumentText(a.title),
          itemType: a.asset_type,
          itemTypeLabel: getAssetTypeLabel(a.asset_type),
          content: a.content,
          audience: a.audience,
          isAnswerKey: false,
        })),
      });
    }
  }

  // 2. Answer Keys (Category 2)
  if (options.includeAnswerKeys) {
    const answerKeyAssets = assets.filter(
      a => a.generation_status === 'READY' &&
        (a.asset_type === 'ANSWER_KEY' || a.audience === 'TEACHER') &&
        a.asset_type !== 'TEACHER_GUIDE'
    );
    if (answerKeyAssets.length > 0) {
      rawCategories.push({
        category: 'ANSWER_KEYS',
        title: getAppendixCategoryLabel('ANSWER_KEYS'),
        items: answerKeyAssets.map(a => ({
          id: a.id,
          title: sanitizeDocumentText(a.title),
          itemType: a.asset_type,
          itemTypeLabel: getAssetTypeLabel(a.asset_type),
          content: a.content,
          audience: 'TEACHER',
          isAnswerKey: true,
        })),
      });
    }
  }

  // 3. Assessment Tools (Category 3)
  if (options.includeAssessmentTools && tools.length > 0) {
    rawCategories.push({
      category: 'ASSESSMENT_TOOLS',
      title: getAppendixCategoryLabel('ASSESSMENT_TOOLS'),
      items: tools.map(t => ({
        id: t.id,
        title: sanitizeDocumentText(t.title || getAssessmentToolTypeLabel(t.tool_type)),
        itemType: t.tool_type,
        itemTypeLabel: getAssessmentToolTypeLabel(t.tool_type),
        content: t.content,
      })),
    });
  }

  // 4. Teacher Guides (Category 4)
  if (options.includeTeacherGuide) {
    const teacherGuides = assets.filter(
      a => a.generation_status === 'READY' && a.asset_type === 'TEACHER_GUIDE'
    );
    if (teacherGuides.length > 0) {
      rawCategories.push({
        category: 'TEACHER_GUIDE',
        title: getAppendixCategoryLabel('TEACHER_GUIDE'),
        items: teacherGuides.map(a => ({
          id: a.id,
          title: sanitizeDocumentText(a.title),
          itemType: a.asset_type,
          itemTypeLabel: getAssetTypeLabel(a.asset_type),
          content: a.content,
          audience: 'TEACHER',
        })),
      });
    }
  }

  // 5. PA Readiness Summary (Category 5)
  if (options.includePaReadinessAppendix && paReviewResult) {
    rawCategories.push({
      category: 'PA_READINESS',
      title: getAppendixCategoryLabel('PA_READINESS'),
      items: [
        {
          id: 'PA_APPENDIX_ITEM',
          title: 'รายงานการตรวจความสอดคล้องตามองค์ประกอบการประเมิน (PA ว9/2564)',
          itemType: 'PA_SUMMARY',
          itemTypeLabel: 'รายงานผลการตรวจความสอดคล้อง',
          content: paReviewResult,
        },
      ],
    });
  }

  // Dynamic Lettering Assignment: ก, ข, ค, ง, ...
  const appendices: DocumentAppendix[] = [];
  rawCategories.forEach((cat, idx) => {
    const letter = getThaiAppendixLetter(idx);
    const appendixId = `APPENDIX_${letter}`;
    const fullTitle = `ภาคผนวก ${letter}: ${cat.title}`;

    // Record cross-reference mapping for each item
    cat.items.forEach(item => {
      appendixMap.set(item.id, `ดูภาคผนวก ${letter}`);
    });

    appendices.push({
      id: appendixId,
      letter,
      category: cat.category,
      categoryLabel: cat.title,
      title: fullTitle,
      items: cat.items,
      pageBreakBefore: true,
    });
  });

  return { appendices, appendixMap };
}
