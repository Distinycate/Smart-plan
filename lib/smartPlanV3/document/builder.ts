/**
 * Smart Plan V3 — Canonical Document Builder
 *
 * Assembles pure V3LessonDocument from V3LessonGraph:
 * 1. Checks document readiness gate (blocks if not ready)
 * 2. Assigns dynamic appendix letters and builds appendix map
 * 3. Builds canonical sections 1 to 10 in exact order
 * 4. Calculates document source hash
 *
 * Immutable: Does NOT mutate input graph.
 * Pure deterministic: ZERO AI calls.
 */

import * as crypto from 'crypto';
import type { V3LessonGraph } from '../types';
import type { V3DocumentReadiness } from '../quality/types';
import type { V3LessonDocument, DocumentOptions, DocumentMetadata, DocumentSection } from './types';
import { DEFAULT_DOCUMENT_OPTIONS } from './types';
import { getSubjectLabel, getStatusLabel } from '../labels';
import { formatDocumentDuration } from './formatters';
import { computeLessonHash } from '../quality/alignmentGraph';
import {
  buildMetadataSection,
  buildCurriculumSection,
  buildKeyConceptSection,
  buildObjectivesSection,
  buildCompetenciesSection,
  buildCharacteristicsSection,
  buildLearningContentsSection,
  buildEvidenceSection,
  buildActivityTimelineSection,
  buildTeachingAssetSection,
  buildAssessmentSection,
  buildRubricsSection,
  buildPostTeachingPlaceholderSection,
  buildDocumentAppendices,
} from './sections';

export interface BuildDocumentOptions {
  options?: Partial<DocumentOptions>;
  readiness?: V3DocumentReadiness;
  paReviewResult?: any;
  teacherName?: string;
  teacherPosition?: string;
  schoolName?: string;
  affiliation?: string;
  academicYear?: string;
  semester?: string;
  teacherProfile?: any;
}

export function buildLessonDocument(
  graph: V3LessonGraph,
  params: BuildDocumentOptions | Partial<DocumentOptions> = {}
): V3LessonDocument {
  const isDirectOptions =
    'includeStudentAssets' in params ||
    'includeAnswerKeys' in params ||
    'includeCover' in params ||
    'includeAssessmentTools' in params;

  const customOptions: Partial<DocumentOptions> = isDirectOptions
    ? (params as Partial<DocumentOptions>)
    : (params as BuildDocumentOptions).options || {};

  const docParams = isDirectOptions ? ({} as BuildDocumentOptions) : (params as BuildDocumentOptions);
  const profile = docParams.teacherProfile || {};

  const teacherName = docParams.teacherName || profile.teacherName || 'นายทศพร ศรีพลพา';
  const teacherPosition = docParams.teacherPosition || profile.teacherPosition || 'ครูชำนาญการพิเศษ';
  const schoolName = docParams.schoolName || profile.schoolName || 'โรงเรียนเตรียมอุดมศึกษา ภาคตะวันออกเฉียงเหนือ';
  const affiliation = docParams.affiliation || profile.affiliation || 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาสกลนคร';
  const academicYear = docParams.academicYear || profile.academicYear || '2567';
  const semester = docParams.semester || profile.semester || '1';

  const effectiveProfile = {
    teacherName,
    teacherPosition,
    schoolName,
    affiliation,
    academicYear,
    semester,
  };

  const { readiness, paReviewResult } = docParams;

  // 1. Verify Document Readiness Gate
  if (readiness && !readiness.ready) {
    const blockerMsgs = (readiness.blockers || []).map(b => b.message || b.title).join(', ');
    throw new Error(
      `ยังไม่พร้อมสร้างเอกสาร: พบประเด็นขัดข้องที่ต้องแก้ไข (${blockerMsgs || 'ไม่ผ่านเกณฑ์ความพร้อมเชิงโครงสร้าง'})`
    );
  }

  const options: DocumentOptions = {
    ...DEFAULT_DOCUMENT_OPTIONS,
    ...customOptions,
  };

  const lesson = graph.lesson;
  const subjectLabel = getSubjectLabel(lesson.subject_key || '');
  const statusLabel = getStatusLabel(lesson.status || 'DRAFT');

  // 2. Metadata
  const metadata: DocumentMetadata = {
    lessonId: lesson.id,
    topic: lesson.topic || 'ไม่ระบุหัวข้อ',
    unitTitle: lesson.unit_reference || 'หน่วยการเรียนรู้',
    subject: subjectLabel,
    subjectKey: lesson.subject_key || '',
    courseName: lesson.course_name || lesson.topic || 'รายวิชาพื้นฐาน',
    courseCode: lesson.course_code || '',
    grade: lesson.grade_level || 'มัธยมศึกษา',
    durationMinutes: lesson.duration_minutes || 60,
    durationFormatted: formatDocumentDuration(lesson.duration_minutes || 60),
    teacherName,
    teacherPosition,
    schoolName,
    affiliation,
    academicYear,
    semester,
    curriculumVersion: lesson.curriculum_version || 'หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551',
    teachingDate: lesson.teaching_date || null,
    status: lesson.status,
    statusLabel,
    learningFocus: lesson.learning_focus || null,
    learningFocusLabel: lesson.learning_focus || null,
  };

  // 3. Build Appendices FIRST to obtain cross-reference mapping (Requirement 24)
  const { appendices, appendixMap } = buildDocumentAppendices(graph, options, paReviewResult);

  // 4. Build Canonical Sections in Exact Sequence (13 Authentic PA Sections)
  const sections: DocumentSection[] = [
    // 1. ข้อมูลแผนการจัดการเรียนรู้
    buildMetadataSection(graph, effectiveProfile),

    // 2. มาตรฐานการเรียนรู้ / ตัวชี้วัด (ระหว่างทาง & ปลายทาง)
    buildCurriculumSection(graph),

    // 3. สาระสำคัญ / ความคิดรวบยอด
    buildKeyConceptSection(graph),

    // 4. จุดประสงค์การเรียนรู้ (K - P - A)
    buildObjectivesSection(graph),

    // 5. สมรรถนะสำคัญของผู้เรียน (5 ด้าน)
    buildCompetenciesSection(graph),

    // 6. คุณลักษณะอันพึงประสงค์ (8 ประการ)
    buildCharacteristicsSection(graph),

    // 7. สาระการเรียนรู้ (ความรู้ / ทักษะ)
    buildLearningContentsSection(graph),

    // 8. หลักฐาน / ภาระงานของผู้เรียน
    buildEvidenceSection(graph, appendixMap),

    // 9. กระบวนการจัดการเรียนรู้ (Active Learning Timeline)
    buildActivityTimelineSection(graph),

    // 10. สื่อ / แหล่งเรียนรู้
    buildTeachingAssetSection(graph, appendixMap),

    // 11. การวัดและประเมินผลการเรียนรู้
    buildAssessmentSection(graph, appendixMap),

    // 12. เกณฑ์การประเมินผลการเรียนรู้แบบรูบริกส์ (Rubrics 4 ระดับ)
    buildRubricsSection(graph),
  ];

  // 13. บันทึกหลังการจัดการเรียนรู้ 4 มิติตาม ว.PA
  if (options.includePostTeachingPlaceholder) {
    sections.push(buildPostTeachingPlaceholderSection());
  }

  // 5. Calculate Document Source Hash
  const sourceHash = computeLessonHash(graph);
  const optionsString = JSON.stringify(options);
  const documentSourceHash = crypto
    .createHash('sha256')
    .update(`${sourceHash}:::${optionsString}`)
    .digest('hex')
    .substring(0, 16);

  return {
    metadata,
    options,
    sections,
    appendices,
    generatedAt: new Date().toISOString(),
    sourceLessonUpdatedAt: lesson.updated_at || new Date().toISOString(),
    documentSourceHash,
  };
}
