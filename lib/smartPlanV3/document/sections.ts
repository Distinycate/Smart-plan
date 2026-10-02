/**
 * Smart Plan V3 — Canonical Document Section Builders
 *
 * Constructs structured DocumentSection objects from V3LessonGraph.
 * Pure deterministic functions — ZERO AI calls.
 */

import type { V3LessonGraph } from '../types';
import type { TeacherProfile } from '../teacherProfile';
import type {
  DocumentSection,
  BulletListSection,
  KeyValueSection,
  ParagraphSection,
  TableSection,
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

export function buildMetadataSection(
  graph: V3LessonGraph,
  teacherProfile?: Partial<TeacherProfile>
): KeyValueSection {
  const lesson = graph.lesson;
  const subjectLabel = getSubjectLabel(lesson.subject_key || '');

  const school = teacherProfile?.schoolName || 'โรงเรียนเตรียมอุดมศึกษา ภาคตะวันออกเฉียงเหนือ';
  const affiliation = teacherProfile?.affiliation || 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาสกลนคร';
  const teacher = teacherProfile?.teacherName || 'นายทศพร ศรีพลพา';
  const position = teacherProfile?.teacherPosition || 'ครูชำนาญการพิเศษ';
  const year = teacherProfile?.academicYear || '2567';
  const sem = teacherProfile?.semester || '1';

  const pairs: Array<{ key: string; value: string }> = [
    { key: 'สถานศึกษา', value: school },
    { key: 'สังกัด', value: affiliation },
    { key: 'กลุ่มสาระการเรียนรู้', value: subjectLabel },
    { key: 'รายวิชา', value: `${lesson.course_name || lesson.topic} ${lesson.course_code ? `(${lesson.course_code})` : ''}`.trim() },
    { key: 'ระดับชั้น', value: lesson.grade_level || 'มัธยมศึกษา' },
    { key: 'ภาคเรียน / ปีการศึกษา', value: `ภาคเรียนที่ ${sem} ปีการศึกษา ${year}` },
    { key: 'หน่วยการเรียนรู้ / เรื่อง', value: `${lesson.unit_reference ? `หน่วยที่ ${lesson.unit_reference} ` : ''}${lesson.topic || 'ไม่ระบุ'}`.trim() },
    { key: 'เวลาที่ใช้จัดการเรียนรู้', value: formatDocumentDuration(lesson.duration_minutes || 60) },
    { key: 'ครูผู้สอน', value: `${teacher} (${position})` },
  ];

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

  const duringItems: Array<{ id: string; bullet: string; text: string; subItems?: string[] }> = [];
  const finalItems: Array<{ id: string; bullet: string; text: string; subItems?: string[] }> = [];

  links.forEach((link, idx) => {
    const isSummative = (link as any).indicator_type === 'final' || 
      link.indicator_label_snapshot?.includes('[ปลายทาง]') ||
      ['ต 1.1 ม.4-6/2', 'ต 1.1 ม.4-6/4', 'ต 1.2 ม.4-6/1', 'ต 1.2 ม.4-6/2', 'ต 1.2 ม.4-6/5',
       'ต 1.1 ม.1/1', 'ต 1.1 ม.1/2', 'ต 1.1 ม.1/3', 'ต 1.1 ม.1/4',
       'ต 1.1 ม.2/1', 'ต 1.1 ม.2/2', 'ต 1.1 ม.2/4', 'ต 1.2 ม.2/1',
       'ต 1.1 ม.3/1', 'ต 1.1 ม.3/2', 'ต 1.1 ม.3/4', 'ต 1.2 ม.3/1'].includes(link.indicator_code?.trim());

    const item = {
      id: `CURR_${idx + 1}`,
      bullet: `•`,
      text: `${link.indicator_code}: ${sanitizeDocumentText(link.indicator_label_snapshot || link.indicator_code)}`,
      subItems: link.standard_label_snapshot
        ? [`(มาตรฐาน ${link.standard_code}: ${sanitizeDocumentText(link.standard_label_snapshot)})`]
        : undefined,
    };

    if (isSummative) {
      finalItems.push(item);
    } else {
      duringItems.push(item);
    }
  });

  const allItems: Array<{ id: string; bullet: string; text: string; subItems?: string[] }> = [];

  if (duringItems.length > 0) {
    allItems.push({
      id: 'CURR_GROUP_DURING',
      bullet: 'ก.',
      text: 'ตัวชี้วัดระหว่างทาง (Formative Indicators) — ใช้ประเมินเพื่อพัฒนาการเรียนรู้ตลอดกระบวนการจัดการเรียนรู้',
      subItems: duringItems.map(d => `${d.text} ${d.subItems ? d.subItems.join(' ') : ''}`)
    });
  }

  if (finalItems.length > 0) {
    allItems.push({
      id: 'CURR_GROUP_FINAL',
      bullet: 'ข.',
      text: 'ตัวชี้วัดปลายทาง (Summative Indicators) — ใช้ประเมินผลสัมฤทธิ์เมื่อสิ้นสุดกระบวนการเรียนรู้',
      subItems: finalItems.map(f => `${f.text} ${f.subItems ? f.subItems.join(' ') : ''}`)
    });
  }

  // Fallback if none categorized
  if (allItems.length === 0) {
    links.forEach((link, idx) => {
      allItems.push({
        id: `CURR_${idx + 1}`,
        bullet: `${idx + 1}.`,
        text: `${link.indicator_code}: ${sanitizeDocumentText(link.indicator_label_snapshot || link.indicator_code)}`,
        subItems: link.standard_label_snapshot ? [`(มาตรฐาน ${link.standard_code}: ${sanitizeDocumentText(link.standard_label_snapshot)})`] : undefined,
      });
    });
  }

  return {
    id: 'SEC_CURRICULUM',
    type: 'bulletList',
    title: SECTION_TITLES.CURRICULUM,
    sectionNumber: 2,
    introText: 'การจัดการเรียนรู้ในแผนนี้สอดคล้องตามมาตรฐานการเรียนรู้ ตัวชี้วัดระหว่างทาง และตัวชี้วัดปลายทาง (ตาม ว1532/2566) ดังนี้:',
    items: allItems,
    avoidBreakInside: allItems.length <= 4,
  };
}

// ─── 3. Key Concept Section ─────────────────────────────────────────────

export function buildKeyConceptSection(graph: V3LessonGraph): ParagraphSection {
  const lesson = graph.lesson;
  const isEnglish = (lesson.subject_key || '').toUpperCase() === 'ENGLISH' || (lesson.subject_key || '').toUpperCase() === 'FOREIGN_LANGUAGE';

  let content = '';
  if (isEnglish) {
    content = sanitizeDocumentText(
      `การจัดการเรียนรู้เรื่อง "${lesson.topic}" มุ่งเน้นให้ผู้เรียนมีความรู้ความเข้าใจในโครงสร้างไวยากรณ์ คำศัพท์ และหน้าที่ทางภาษาสำหรับการสื่อสาร โดยสามารถนำไปประยุกต์ใช้ในการรับสาร (ฟัง-อ่าน) และส่งสาร (พูด-เขียน) ในชีวิตประจำวันได้อย่างถูกต้องตามกาลเทศะ มารยาทสังคม และวัฒนธรรมของเจ้าของภาษา ผ่านกิจกรรมการเรียนรู้เชิงรุก (Active Learning) ที่เปิดโอกาสให้ผู้เรียนได้ลงมือปฏิบัติจริง มีปฏิสัมพันธ์ และสะท้อนคิด`
    );
  } else {
    const focus = lesson.learning_focus ? ` โดยมุ่งเน้นการพัฒนาทักษะเชิงรุกด้าน "${lesson.learning_focus}"` : '';
    content = sanitizeDocumentText(
      `การจัดการเรียนรู้เรื่อง "${lesson.topic}" จัดขึ้นเพื่อให้ผู้เรียนเกิดความรู้ความเข้าใจ ทักษะกระบวนการ และเจตคติที่จำเป็น${focus} ผ่านกระบวนการคิดวิเคราะห์ การลงมือปฏิบัติจริงร่วมกับผู้อื่น และการประเมินเพื่อพัฒนาการเรียนรู้ (Assessment for Learning)`
    );
  }

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

// ─── 4. Learning Objectives Section (K-P-A) ─────────────────────────────

export function buildObjectivesSection(graph: V3LessonGraph): BulletListSection {
  const objectives = [...(graph.objectives || [])].sort((a, b) => (a.position || 0) - b.position);

  const kItems: string[] = [];
  const pItems: string[] = [];
  const aItems: string[] = [];

  objectives.forEach(obj => {
    const text = sanitizeDocumentText(obj.statement);
    const domain = (obj as any).domain?.toUpperCase();
    if (domain === 'K' || domain === 'KNOWLEDGE' || text.includes('ด้านความรู้') || text.includes('อธิบาย') || text.includes('ระบุ') || text.includes('บอก') || text.includes('เข้าใจ')) {
      kItems.push(text.replace(/^[1-9]\.\s*/, '').replace(/^ด้านความรู้\s*\(?K\)?\s*[:\-]?\s*/i, ''));
    } else if (domain === 'A' || domain === 'ATTITUDE' || text.includes('คุณลักษณะ') || text.includes('เจตคติ') || text.includes('ใฝ่เรียนรู้') || text.includes('มุ่งมั่น') || text.includes('วินัย')) {
      aItems.push(text.replace(/^[1-9]\.\s*/, '').replace(/^ด้านคุณลักษณะ\s*\(?A\)?\s*[:\-]?\s*/i, ''));
    } else {
      pItems.push(text.replace(/^[1-9]\.\s*/, '').replace(/^ด้านทักษะ\s*\(?P\)?\s*[:\-]?\s*/i, ''));
    }
  });

  const items: Array<{ id: string; bullet: string; text: string; subItems?: string[] }> = [];

  items.push({
    id: 'OBJ_K',
    bullet: '1.',
    text: 'ด้านความรู้ (Knowledge: K)',
    subItems: kItems.length > 0 
      ? kItems.map((s, i) => `1.${i + 1} ผู้เรียนสามารถ${s}`)
      : [`1.1 ผู้เรียนสามารถอธิบายโครงสร้าง หลักการใช้ และความหมายของเนื้อหาเรื่อง "${graph.lesson.topic}" ได้ถูกต้องตามหลักวิชา`]
  });

  items.push({
    id: 'OBJ_P',
    bullet: '2.',
    text: 'ด้านทักษะกระบวนการ (Process/Skill: P)',
    subItems: pItems.length > 0 
      ? pItems.map((s, i) => `2.${i + 1} ผู้เรียนสามารถ${s}`)
      : [`2.1 ผู้เรียนสามารถฝึกปฏิบัติ พูด และเขียนสื่อสารเกี่ยวกับเรื่อง "${graph.lesson.topic}" ได้อย่างถูกต้องและคล่องแคล่ว`]
  });

  items.push({
    id: 'OBJ_A',
    bullet: '3.',
    text: 'ด้านคุณลักษณะอันพึงประสงค์ (Attitude: A)',
    subItems: aItems.length > 0 
      ? aItems.map((s, i) => `3.${i + 1} ผู้เรียนมี${s}`)
      : ['3.1 ผู้เรียนมีความใฝ่เรียนรู้ มุ่งมั่นในการทำงานร่วมกับผู้อื่น และมีความรับผิดชอบต่อหน้าที่']
  });

  return {
    id: 'SEC_OBJECTIVES',
    type: 'bulletList',
    title: SECTION_TITLES.OBJECTIVES,
    sectionNumber: 4,
    introText: 'เมื่อสิ้นสุดกระบวนการจัดการเรียนรู้ ผู้เรียนมีความรู้ ทักษะ และคุณลักษณะอันพึงประสงค์ ดังนี้:',
    items,
    avoidBreakInside: true,
  };
}

// ─── 5. Learner Key Competencies Section ────────────────────────────────

export function buildCompetenciesSection(graph: V3LessonGraph): BulletListSection {
  const isEnglish = (graph.lesson.subject_key || '').toUpperCase() === 'ENGLISH' || (graph.lesson.subject_key || '').toUpperCase() === 'FOREIGN_LANGUAGE';

  const items = [
    {
      id: 'COMP_1',
      bullet: '1.',
      text: 'ความสามารถในการสื่อสาร (Communication Capacity)',
      subItems: [
        isEnglish
          ? 'ใช้ภาษาอังกฤษในการรับ-ส่งสาร ถ่ายทอดความรู้ ความคิด และความรู้สึก ผ่านการฟัง พูด อ่าน และเขียนได้อย่างเหมาะสมตามสถานการณ์และมารยาททางสังคม'
          : 'มีความสามารถในการใช้ภาษาถ่ายทอดความรู้ ความคิด ความเข้าใจ ความรู้สึก และทัศนะของตนเองด้วยการพูดและการเขียน'
      ]
    },
    {
      id: 'COMP_2',
      bullet: '2.',
      text: 'ความสามารถในการคิด (Thinking Capacity)',
      subItems: [
        'มีทักษะการคิดวิเคราะห์ การคิดสังเคราะห์ การคิดอย่างสร้างสรรค์ และการคิดอย่างมีวิจารณญาณ เพื่อสร้างองค์ความรู้และตัดสินใจ'
      ]
    },
    {
      id: 'COMP_3',
      bullet: '3.',
      text: 'ความสามารถในการแก้ปัญหา (Problem-Solving Capacity)',
      subItems: [
        'เข้าใจปัญหา จัดการและแก้ปัญหาและอุปสรรคต่าง ๆ ได้อย่างถูกต้องเหมาะสมบนพื้นฐานของเหตุผลและข้อมูล'
      ]
    },
    {
      id: 'COMP_4',
      bullet: '4.',
      text: 'ความสามารถในการใช้ทักษะชีวิต (Life Skills Capacity)',
      subItems: [
        'นำกระบวนการเรียนรู้ไปใช้ในการดำเนินชีวิตประจำวัน การทำงานร่วมกับผู้อื่น และการปรับตัวให้เข้ากับการเปลี่ยนแปลงของสังคม'
      ]
    },
    {
      id: 'COMP_5',
      bullet: '5.',
      text: 'ความสามารถในการใช้เทคโนโลยี (Capacity for Technological Application)',
      subItems: [
        'เลือกและใช้เทคโนโลยีสารสนเทศในการสืบค้น รวบรวมข้อมูล และพัฒนาการเรียนรู้ได้อย่างมีประสิทธิภาพและมีคุณธรรม'
      ]
    }
  ];

  return {
    id: 'SEC_COMPETENCIES',
    type: 'bulletList',
    title: SECTION_TITLES.COMPETENCIES,
    sectionNumber: 5,
    introText: 'การจัดการเรียนรู้มุ่งเน้นการพัฒนาสมรรถนะสำคัญของผู้เรียนตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551 ดังนี้:',
    items,
    avoidBreakInside: true,
  };
}

// ─── 6. Desirable Characteristics Section ──────────────────────────────

export function buildCharacteristicsSection(_graph: V3LessonGraph): BulletListSection {
  const items = [
    {
      id: 'CHAR_1',
      bullet: '1.',
      text: 'ใฝ่เรียนรู้',
      subItems: ['ตั้งใจ เพียรพยายามในการเรียนรู้ และเข้าร่วมกิจกรรมการเรียนรู้ แสวงหาความรู้จากแหล่งเรียนรู้ต่าง ๆ ทั้งภายในและภายนอกห้องเรียน']
    },
    {
      id: 'CHAR_2',
      bullet: '2.',
      text: 'มุ่งมั่นในการทำงาน',
      subItems: ['เอาใจใส่ต่อการปฏิบัติหน้าที่ที่ได้รับมอบหมาย ตั้งใจและรับผิดชอบในการทำงานให้สำเร็จอย่างมีคุณภาพ']
    },
    {
      id: 'CHAR_3',
      bullet: '3.',
      text: 'มีวินัย',
      subItems: ['ปฏิบัติตามข้อตกลง กฎเกณฑ์ ระเบียบ ข้อบังคับของห้องเรียนและสถานศึกษา ตรงต่อเวลาในการปฏิบัติกิจกรรม']
    },
    {
      id: 'CHAR_4',
      bullet: '4.',
      text: 'ซื่อสัตย์สุจริต',
      subItems: ['ประพฤติตรงตามความเป็นจริงต่อตนเองและผู้อื่นในการทำงานและการประเมินผลการเรียนรู้']
    }
  ];

  return {
    id: 'SEC_CHARACTERISTICS',
    type: 'bulletList',
    title: SECTION_TITLES.CHARACTERISTICS,
    sectionNumber: 6,
    introText: 'การจัดการเรียนรู้มุ่งพัฒนาคุณลักษณะอันพึงประสงค์ของผู้เรียน เพื่อให้สามารถอยู่ร่วมกับผู้อื่นในสังคมได้อย่างมีความสุข ดังนี้:',
    items,
    avoidBreakInside: true,
  };
}

// ─── 7. Learning Contents Section ───────────────────────────────────────

export function buildLearningContentsSection(graph: V3LessonGraph): BulletListSection {
  const lesson = graph.lesson;
  const isEnglish = (lesson.subject_key || '').toUpperCase() === 'ENGLISH' || (lesson.subject_key || '').toUpperCase() === 'FOREIGN_LANGUAGE';

  const items = isEnglish ? [
    {
      id: 'CNT_1',
      bullet: '1.',
      text: `เนื้อหาและโครงสร้างไวยากรณ์ (Grammar Structure): ${sanitizeDocumentText(lesson.topic)}`,
      subItems: ['โครงสร้างประโยคบอกเล่า ปฏิเสธ และประโยคคำถาม รวมถึงหลักการใช้ในสถานการณ์จริง']
    },
    {
      id: 'CNT_2',
      bullet: '2.',
      text: 'คำศัพท์และสำนวน (Vocabulary & Expressions)',
      subItems: ['คำศัพท์หลัก กริยา และกลุ่มคำที่เกี่ยวข้องกับบริบทของบทเรียน']
    },
    {
      id: 'CNT_3',
      bullet: '3.',
      text: `ทักษะทางภาษาและจุดเน้น (Language Skills & Focus): ${lesson.learning_focus || 'การฟัง พูด อ่าน และเขียนเพื่อการสื่อสาร'}`,
      subItems: ['การฝึกปฏิบัติผ่านสถานการณ์จำลอง การทำงานกลุ่ม และการนำเสนอผลงาน']
    }
  ] : [
    {
      id: 'CNT_1',
      bullet: '1.',
      text: `สาระความรู้หลัก: ${sanitizeDocumentText(lesson.topic)}`,
    },
    {
      id: 'CNT_2',
      bullet: '2.',
      text: `ทักษะกระบวนการ / จุดเน้นการเรียนรู้: ${sanitizeDocumentText(lesson.learning_focus || 'กระบวนการคิดและการปฏิบัติจริง')}`,
    }
  ];

  return {
    id: 'SEC_CONTENTS',
    type: 'bulletList',
    title: SECTION_TITLES.CONTENTS,
    sectionNumber: 7,
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
    sectionNumber: 8,
    introText: 'หลักฐานเชิงประจักษ์และชิ้นงาน/ภาระงานที่สะท้อนการบรรลุจุดประสงค์การเรียนรู้ของผู้เรียน ประกอบด้วย:',
    items,
    avoidBreakInside: items.length <= 4,
  };
}

// ─── 9. Learning Process / Activity Timeline Section ────────────────────

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
    sectionNumber: 9,
    totalMinutes,
    rows,
    repeatHeaderOnBreak: true,
  };
}

// ─── 10. Media & Teaching Resources Section ─────────────────────────────

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
    sectionNumber: 10,
    rows,
    avoidBreakInside: rows.length <= 4,
  };
}

// ─── 11. Assessment & Evaluation Section ────────────────────────────────

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
    sectionNumber: 11,
    rows,
  };
}

// ─── 12. Assessment Rubrics Criteria Section ────────────────────────────

export function buildRubricsSection(graph: V3LessonGraph): TableSection {
  const isEnglish = (graph.lesson.subject_key || '').toUpperCase() === 'ENGLISH' || (graph.lesson.subject_key || '').toUpperCase() === 'FOREIGN_LANGUAGE';

  const headers = ['ประเด็นการประเมิน', 'ดีมาก (4 คะแนน)', 'ดี (3 คะแนน)', 'พอใช้ (2 คะแนน)', 'ปรับปรุง (1 คะแนน)'];

  const rows: string[][] = isEnglish ? [
    [
      '1. ด้านความรู้ (Knowledge: K)\nความเข้าใจโครงสร้างไวยากรณ์และคำศัพท์',
      'อธิบายและระบุโครงสร้างไวยากรณ์ ความหมายคำศัพท์ และบริบทการใช้ได้อย่างถูกต้องครบถ้วนสมบูรณ์ (ร้อยละ 90-100)',
      'อธิบายและระบุโครงสร้างไวยากรณ์ และคำศัพท์ได้ถูกต้องเป็นส่วนใหญ่ (ร้อยละ 70-89)',
      'อธิบายและระบุโครงสร้างไวยากรณ์และคำศัพท์ได้บางส่วน ต้องมีคำแนะนำเพิ่มเติม (ร้อยละ 50-69)',
      'ยังไม่สามารถอธิบายโครงสร้างหรือคำศัพท์ได้ถูกต้อง หรือได้ต่ำกว่าร้อยละ 50'
    ],
    [
      '2. ด้านทักษะ/กระบวนการ (Process: P)\nการสื่อสาร (ฟัง พูด อ่าน เขียน)',
      'สื่อสารได้คล่องแคล่ว ถูกต้องตามหลักไวยากรณ์ การออกเสียงชัดเจน สื่อความหมายได้ครบถ้วนสมบูรณ์',
      'สื่อสารได้ถูกต้องตามหลักไวยากรณ์และออกเสียงได้ดี อาจมีข้อผิดพลาดเล็กน้อยที่ไม่กระทบการสื่อสาร',
      'สื่อสารได้พอใช้ มีข้อผิดพลาดทางไวยากรณ์หรือการออกเสียงเป็นบางจุด แต่ยังพอเข้าใจความหมายได้',
      'สื่อสารได้จำกัด มีข้อผิดพลาดมาก ทำให้ไม่สามารถสื่อความหมายได้ชัดเจน ต้องได้รับการช่วยเหลือ'
    ],
    [
      '3. ด้านคุณลักษณะอันพึงประสงค์ (Attitude: A)\nความใฝ่เรียนรู้ และมุ่งมั่นในการทำงาน',
      'ตั้งใจเรียน ให้ความร่วมมือในกิจกรรมอย่างกระตือรือร้น ทำงานเสร็จตรงเวลา และช่วยเหลือเพื่อนในกลุ่ม',
      'ตั้งใจเรียน ร่วมกิจกรรมอย่างสม่ำเสมอ ทำงานเสร็จตามกำหนดเวลา',
      'ร่วมกิจกรรมเมื่อได้รับการกระตุ้นเตือน ทำงานเสร็จแต่ล่าช้ากว่ากำหนดเล็กน้อย',
      'ไม่ค่อยให้ความร่วมมือในกิจกรรม หรือไม่ส่งงานตามที่มอบหมาย'
    ]
  ] : [
    [
      '1. ด้านความรู้ (Knowledge: K)',
      'อธิบายเนื้อหาและหลักการสำคัญได้ถูกต้อง ครบถ้วน ชัดเจน และยกตัวอย่างประกอบได้สมบูรณ์ (ร้อยละ 80 ขึ้นไป)',
      'อธิบายเนื้อหาและหลักการสำคัญได้ถูกต้องเป็นส่วนใหญ่ (ร้อยละ 70-79)',
      'อธิบายเนื้อหาและหลักการสำคัญได้ถูกต้องบางส่วน ต้องได้รับคำแนะนำ (ร้อยละ 50-69)',
      'ยังไม่สามารถอธิบายเนื้อหาสำคัญได้ถูกต้อง (ต่ำกว่าร้อยละ 50)'
    ],
    [
      '2. ด้านทักษะ/กระบวนการ (Process: P)',
      'ปฏิบัติกิจกรรม/ทำแบบฝึกหัดได้ถูกต้องตามขั้นตอน คล่องแคล่ว ผลงานมีความประณีตและสำเร็จตามเวลา',
      'ปฏิบัติกิจกรรมได้ถูกต้องตามขั้นตอน ผลงานเรียบร้อยและสำเร็จตามเวลา',
      'ปฏิบัติกิจกรรมได้ แต่ต้องได้รับคำแนะนำ ผลงานสำเร็จแต่ล่าช้า',
      'ยังไม่สามารถปฏิบัติกิจกรรมได้ตามขั้นตอน ผลงานไม่สำเร็จ'
    ],
    [
      '3. ด้านคุณลักษณะอันพึงประสงค์ (Attitude: A)',
      'มีความกระตือรือร้นในการเรียน มีวินัย รับผิดชอบ และมุ่งมั่นทำงานร่วมกับผู้อื่นได้เป็นอย่างดีเยี่ยม',
      'มีความตั้งใจเรียน มีวินัย และทำงานที่ได้รับมอบหมายเสร็จเรียบร้อย',
      'ทำงานเสร็จเมื่อได้รับการกระตุ้นเตือน ปฏิบัติตามข้อตกลงได้บางส่วน',
      'ขาดความกระตือรือร้น ไม่ปฏิบัติตามข้อตกลงในห้องเรียน'
    ]
  ];

  return {
    id: 'SEC_RUBRICS',
    type: 'table',
    title: SECTION_TITLES.RUBRICS,
    sectionNumber: 12,
    headers,
    rows,
    columnWidths: ['22%', '20%', '20%', '19%', '19%'],
    repeatHeaderOnBreak: true,
  };
}

// ─── 13. Post-Teaching Reflection Placeholder Section (ว.PA) ───────────

export function buildPostTeachingPlaceholderSection(): PostTeachingPlaceholderSection {
  return {
    id: 'SEC_POST_TEACHING',
    type: 'postTeachingPlaceholder',
    title: SECTION_TITLES.POST_TEACHING,
    sectionNumber: 13,
    hasOutcomesRecorded: false,
    resultsPlaceholder:
      '1. ผลการจัดการเรียนรู้ (ระบุจำนวน/ร้อยละผู้เรียนที่ผ่านตามจุดประสงค์ K, P, A):\n' +
      '  - ด้านความรู้ (K): ผู้เรียนผ่านเกณฑ์การประเมินจำนวน ............ คน คิดเป็นร้อยละ ............, ไม่ผ่านเกณฑ์จำนวน ............ คน คิดเป็นร้อยละ ............\n' +
      '  - ด้านทักษะกระบวนการ (P): ผู้เรียนผ่านเกณฑ์การประเมินจำนวน ............ คน คิดเป็นร้อยละ ............, ไม่ผ่านเกณฑ์จำนวน ............ คน คิดเป็นร้อยละ ............\n' +
      '  - ด้านคุณลักษณะอันพึงประสงค์ (A): ผู้เรียนผ่านเกณฑ์การประเมินจำนวน ............ คน คิดเป็นร้อยละ ............\n' +
      '  - ผลการประเมินสมรรถนะสำคัญ: ผู้เรียนมีความสามารถในการสื่อสารและการคิดในระดับ ............',
    problemsPlaceholder:
      '2. ปัญหาและอุปสรรคที่พบในการจัดการเรียนรู้:\n' +
      '  ........................................................................................................................................................................\n' +
      '3. สาเหตุของปัญหา/อุปสรรคที่พบในการจัดการเรียนรู้:\n' +
      '  ........................................................................................................................................................................',
    solutionsPlaceholder:
      '4. วิธีการแก้ไขหรือพัฒนาการจัดการเรียนรู้ให้สอดคล้องกับผู้เรียน (Remediation & Action Plan):\n' +
      '  ........................................................................................................................................................................\n\n' +
      'ลงชื่อ..........................................................ครูผู้สอน\n' +
      '     (..........................................................)\n' +
      'ตำแหน่ง.......................................................\n\n' +
      '5. ความเห็นของผู้บริหารสถานศึกษาหรือผู้ที่ได้รับมอบหมาย:\n' +
      '  [  ] แผนการจัดการเรียนรู้มีองค์ประกอบครบถ้วนและสอดคล้องกับมาตรฐาน/ตัวชี้วัด\n' +
      '  [  ] กิจกรรมการเรียนรู้เน้น Active Learning ส่งเสริมสมรรถนะผู้เรียนอย่างแท้จริง\n' +
      '  [  ] มีการวัดและประเมินผลที่หลากหลายตรงตามสภาพจริง\n' +
      '  ข้อเสนอแนะเพิ่มเติม: ................................................................................................................................\n\n' +
      'ลงชื่อ..........................................................ผู้ตรวจ\n' +
      '     (..........................................................)\n' +
      'ตำแหน่ง.......................................................',
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
