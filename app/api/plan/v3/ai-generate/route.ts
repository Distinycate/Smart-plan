import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';
import { getObjectiveSuggestions } from '@/lib/smartPlanV3/suggestions/objectiveSuggestions';
import { getEvidenceSuggestions } from '@/lib/smartPlanV3/suggestions/evidenceSuggestions';
import { getActivityFlowSuggestions } from '@/lib/smartPlanV3/suggestions/activityFlowSuggestions';
import { V3LessonObjective, V3LearningEvidence, V3BlueprintActivityDraft } from '@/lib/smartPlanV3/types';

export const maxDuration = 60;

interface AiPlanPayload {
  prompt?: string;
  subjectKey?: string;
  gradeLevel?: string;
  topic?: string;
  durationMinutes?: number;
}

/**
 * Intelligent Subject Detector from Thai/English keywords
 */
function detectSubjectKey(text: string, explicitKey?: string): string {
  if (explicitKey && explicitKey !== 'GENERAL') return explicitKey;
  const t = text.toLowerCase();
  if (/(english|tense|verb|grammar|vocabulary|speaking|conversation|present|past|pronoun|sentence|reading|writing|listening)/i.test(t)) return 'ENGLISH';
  if (/(คณิต|สมการ|ตัวเลข|เรขา|เศษส่วน|กราฟ|บวก|ลบ|คูณ|หาร|พีชคณิต|สถิติ|ฟังก์ชัน|ตรรกศาสตร์|ทศนิยม|มุม)/.test(t)) return 'MATHEMATICS';
  if (/(วิทย์|พืช|เซลล์|สังเคราะห์ด้วยแสง|แรง|พลังงาน|สาร|ฟิสิกส์|เคมี|ชีว|ระบบสุริยะ|ไฟฟ้า|อะตอม|พันธุ|การทดลอง)/.test(t)) return 'SCIENCE';
  if (/(ภาษาไทย|วรรณคดี|คำราชาศัพท์|กลอน|จับใจความ|สระ|พยัญชนะ|การอ่าน|การเขียน|สำนวน|สุภาษิต|กาพย์|ฉันท์)/.test(t)) return 'THAI';
  if (/(สังคม|ประวัติศาสตร์|ภูมิศาสตร์|เศรษฐศาสตร์|ประชาธิปไตย|ศาสนา|ชุมชน|สิ่งแวดล้อม|กฎหมาย|วัฒนธรรม)/.test(t)) return 'SOCIAL_STUDIES';
  if (/(สุขศึกษา|พละ|ฟุตบอล|กีฬา|สุขภาพ|กล้ามเนื้อ|การเคลื่อนไหว|ปฐมพยาบาล|สุขบัญญัติ|บาสเกตบอล)/.test(t)) return 'HEALTH_AND_PE';
  if (/(ศิลปะ|วาด|ดนตรี|นาฏศิลป์|สีน้ำ|ลายเส้น|ทัศนศิลป์|เพลง|โน้ต)/.test(t)) return 'ART';
  if (/(การงาน|เกษตร|คอม|เทคโนโลยี|โค้ด|โปรแกรม|งานช่าง|อาหาร|ธุรกิจ|ประดิษฐ์)/.test(t)) return 'CAREER';
  return 'GENERAL';
}

/**
 * Detect Grade from text
 */
function detectGrade(text: string, explicitGrade?: string): string {
  if (explicitGrade && explicitGrade.trim()) return explicitGrade.trim();
  const match = text.match(/(ม\.[1-6]|ป\.[1-6])/);
  return match ? match[1] : 'ม.1';
}

/**
 * Subject Curriculum Defaults (Standard & Indicator)
 */
function getSubjectCurriculumDefaults(subjectKey: string, grade: string, topic: string) {
  switch (subjectKey) {
    case 'ENGLISH':
      return {
        standardCode: 'ต 1.1',
        standardName: 'เข้าใจและตีความเรื่องที่ฟังและอ่านจากสื่อประเภทต่างๆ และแสดงความคิดเห็นอย่างมีเหตุผล',
        indicatorCode: `ต 1.1 ${grade}/1`,
        indicatorText: `[ระหว่างทาง] ปฏิบัติตามคำสั่ง คำขอร้อง และใช้ภาษาในการสื่อสาร แลกเปลี่ยนข้อมูลเกี่ยวกับ ${topic}`,
        courseName: 'ภาษาอังกฤษพื้นฐาน',
        courseCode: 'อ21101',
      };
    case 'MATHEMATICS':
      return {
        standardCode: 'ค 1.1',
        standardName: 'เข้าใจความหลากหลายของการแสดงจำนวน ระบบจำนวน การดำเนินการของจำนวน และผลที่เกิดขึ้นจากการดำเนินการ',
        indicatorCode: `ค 1.1 ${grade}/1`,
        indicatorText: `[ระหว่างทาง] เข้าใจและใช้ความรู้ทางคณิตศาสตร์ในการแก้ปัญหาเรื่อง ${topic} และให้เหตุผลอย่างสมเหตุสมผล`,
        courseName: 'คณิตศาสตร์พื้นฐาน',
        courseCode: 'ค21101',
      };
    case 'SCIENCE':
      return {
        standardCode: 'ว 1.2',
        standardName: 'เข้าใจสมบัติของสิ่งมีชีวิต หน่วยพื้นฐานของสิ่งมีชีวิต การลำเลียงสาร ความสัมพันธ์ของโครงสร้างและหน้าที่',
        indicatorCode: `ว 1.2 ${grade}/1`,
        indicatorText: `[ระหว่างทาง] สำรวจ อธิบาย ทดลอง และลงข้อสรุปเกี่ยวกับ ${topic} อย่างเป็นวิทยาศาสตร์`,
        courseName: 'วิทยาศาสตร์และเทคโนโลยี',
        courseCode: 'ว21101',
      };
    case 'THAI':
      return {
        standardCode: 'ท 1.1',
        standardName: 'ใช้กระบวนการอ่านสร้างความรู้และความคิดเพื่อนำไปใช้ตัดสินใจ แก้ปัญหาในการดำเนินชีวิต',
        indicatorCode: `ท 1.1 ${grade}/1`,
        indicatorText: `[ระหว่างทาง] อ่านและจับใจความสำคัญ สรุปความรู้และข้อคิดจากเรื่อง ${topic} เพื่อนำไปประยุกต์ใช้ในชีวิตจริง`,
        courseName: 'ภาษาไทยพื้นฐาน',
        courseCode: 'ท21101',
      };
    case 'SOCIAL_STUDIES':
      return {
        standardCode: 'ส 1.1',
        standardName: 'รู้และเข้าใจประวัติ ความสำคัญ ศาสนา และยึดมั่นในการทำความดีและการอยู่ร่วมกันอย่างสันติสุข',
        indicatorCode: `ส 1.1 ${grade}/1`,
        indicatorText: `[ระหว่างทาง] วิเคราะห์ อธิบายความสำคัญและแนวทางปฏิบัติตนเกี่ยวกับ ${topic}`,
        courseName: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
        courseCode: 'ส21101',
      };
    case 'HEALTH_AND_PE':
      return {
        standardCode: 'พ 1.1',
        standardName: 'เข้าใจการเจริญเติบโตและพัฒนาการของมนุษย์ และการดูแลสุขภาพสมรรถภาพทางกาย',
        indicatorCode: `พ 1.1 ${grade}/1`,
        indicatorText: `[ระหว่างทาง] อธิบายและปฏิบัติตามหลักการดูแลสุขภาพและการเคลื่อนไหวเรื่อง ${topic}`,
        courseName: 'สุขศึกษาและพลศึกษา',
        courseCode: 'พ21101',
      };
    case 'ART':
      return {
        standardCode: 'ศ 1.1',
        standardName: 'สร้างสรรค์งานทัศนศิลป์ตามจินตนาการ และความคิดสร้างสรรค์ วิเคราะห์วิพากษ์วิจารณ์คุณค่างานศิลปะ',
        indicatorCode: `ศ 1.1 ${grade}/1`,
        indicatorText: `[ระหว่างทาง] สร้างสรรค์ผลงานและอธิบายเทคนิควิธีการเกี่ยวกับ ${topic}`,
        courseName: 'ศิลปะ',
        courseCode: 'ศ21101',
      };
    case 'CAREER':
      return {
        standardCode: 'ง 1.1',
        standardName: 'เข้าใจการทำงาน มีความคิดสร้างสรรค์ มีทักษะกระบวนการทำงาน ทักษะการจัดการ และทักษะการทำงานร่วมกัน',
        indicatorCode: `ง 1.1 ${grade}/1`,
        indicatorText: `[ระหว่างทาง] อธิบายขั้นตอนและลงมือปฏิบัติการทำงานเกี่ยวกับ ${topic} อย่างเป็นขั้นตอนและปลอดภัย`,
        courseName: 'การงานอาชีพ',
        courseCode: 'ง21101',
      };
    default:
      return {
        standardCode: 'มฐ. 1.1',
        standardName: 'มาตรฐานการเรียนรู้ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน',
        indicatorCode: `มฐ. 1.1 ${grade}/1`,
        indicatorText: `[ระหว่างทาง] เข้าใจและประยุกต์ใช้ความรู้เกี่ยวกับ ${topic} ได้อย่างถูกต้องตามเกณฑ์`,
        courseName: 'รายวิชาพื้นฐาน',
        courseCode: 'ว21101',
      };
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    const body: AiPlanPayload = await req.json().catch(() => ({}));
    const rawPrompt = (body.prompt || body.topic || '').trim();

    if (!rawPrompt && !body.topic) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุหัวข้อหรือคำสั่งสำหรับให้ AI ออกแบบแผน' }, { status: 400 });
    }

    const duration = body.durationMinutes && body.durationMinutes > 0 ? body.durationMinutes : 60;
    const resolvedSubjectKey = detectSubjectKey(rawPrompt, body.subjectKey);
    const resolvedGrade = detectGrade(rawPrompt, body.gradeLevel);
    const resolvedTopic = body.topic || rawPrompt;

    const currDefaults = getSubjectCurriculumDefaults(resolvedSubjectKey, resolvedGrade, resolvedTopic);

    // ─── Fast Gemini Race (4.5s Timeout) ─────────────────────────────────────
    let aiData: any = null;

    try {
      const modelName = 'gemini-2.5-flash';
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

      const systemPrompt = `คุณเป็นผู้เชี่ยวชาญด้านการจัดทำแผนการจัดการเรียนรู้ตามเกณฑ์กระทรวงศึกษาธิการไทย (หลักสูตรแกนกลาง 2551 ปรับปรุง 2560) และมาตรฐาน ว.PA
หน้าที่ของคุณคือออกแบบโครงสร้างแผนการสอนฉบับสมบูรณ์ ${duration} นาที จากหัวข้อที่ครูกำหนด โดยส่งออกเป็น JSON เท่านั้น`;

      const userPrompt = `กรุณาออกแบบแผนการสอนจากหัวข้อ:
"${rawPrompt}"
กลุ่มสาระ: ${resolvedSubjectKey}
ระดับชั้น: ${resolvedGrade}
ระยะเวลา: ${duration} นาที

ส่งกลับ JSON โครงสร้างนี้เท่านั้น:
{
  "subject_key": "${resolvedSubjectKey}",
  "grade_level": "${resolvedGrade}",
  "topic": "${resolvedTopic}",
  "course_name": "${currDefaults.courseName}",
  "course_code": "${currDefaults.courseCode}",
  "learning_focus": "ACTIVE_LEARNING",
  "standard_code": "${currDefaults.standardCode}",
  "standard_name": "${currDefaults.standardName}",
  "indicator_code": "${currDefaults.indicatorCode}",
  "indicator_text": "${currDefaults.indicatorText}",
  "indicator_type": "during",
  "objectives": [
    { "category": "K", "statement": "นักเรียนสามารถอธิบายและระบุสาระสำคัญเกี่ยวกับ ${resolvedTopic} ได้อย่างถูกต้อง (K)", "observableVerb": "อธิบาย" },
    { "category": "P", "statement": "นักเรียนสามารถปฏิบัติและนำความรู้เกี่ยวกับ ${resolvedTopic} ไปใช้แก้ปัญหาได้ (P)", "observableVerb": "ปฏิบัติ" },
    { "category": "A", "statement": "นักเรียนแสดงออกถึงความมุ่งมั่นและความร่วมมือในการทำงานกลุ่ม (A)", "observableVerb": "มีความมุ่งมั่น" }
  ],
  "evidence": [
    { "evidence_type": "WORKSHEET", "description": "ใบงาน/แบบฝึกทักษะการเรียนรู้เรื่อง ${resolvedTopic}" },
    { "evidence_type": "OBSERVATION", "description": "แบบสังเกตพฤติกรรมการมีส่วนร่วมและการทำงานกลุ่ม" }
  ],
  "activities": [
    { "phase": "WARM_UP", "minutes": 10, "title": "ขั้นนำเข้าสู่บทเรียน (Warm-up & Hook)", "teacher_actions": "ครูทักทาย กระตุ้นความสนใจ...", "student_actions": "นักเรียนร่วมตอบคำถาม..." },
    { "phase": "PRESENTATION", "minutes": 15, "title": "ขั้นจัดการเรียนรู้ (Presentation / Modeling)", "teacher_actions": "ครูอธิบายและยกตัวอย่าง...", "student_actions": "นักเรียนสังเกตและจดบันทึก..." },
    { "phase": "PRACTICE", "minutes": 15, "title": "ขั้นฝึกปฏิบัติ (Guided & Collaborative Practice)", "teacher_actions": "ครูมอบหมายงานกลุ่มและคอยโค้ช...", "student_actions": "นักเรียนฝึกปฏิบัติร่วมกัน..." },
    { "phase": "PRODUCTION", "minutes": 15, "title": "ขั้นนำไปใช้ (Independent Production / Active Application)", "teacher_actions": "ครูตรวจติดตามและให้คำแนะนำ...", "student_actions": "นักเรียนสร้างสรรค์ผลงานเดี่ยว/กลุ่ม..." },
    { "phase": "WRAP_UP", "minutes": 5, "title": "ขั้นสรุปและประเมินผล (Wrap-up & Formative Check)", "teacher_actions": "ครูและนักเรียนร่วมกันสรุปบทเรียน...", "student_actions": "นักเรียนสะท้อนสิ่งที่ได้เรียนรู้..." }
  ]
}`;

      const geminiPayload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 4096,
          temperature: 0.2,
        },
      };

      // Race Gemini call against strict 4.5-second timeout
      const geminiCall = fetchGeminiWithRetry(apiUrl, geminiPayload, 1, undefined, rawPrompt, 4500);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4500));

      const response = await Promise.race([geminiCall, timeoutPromise]);

      if (response && 'json' in response) {
        const resJson = await response.json();
        const rawAiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawAiText) {
          aiData = JSON.parse(rawAiText);
        }
      }
    } catch (aiErr) {
      console.warn('[AI Plan Generate] Gemini call timed out or failed, using ultra-fast deterministic curriculum engine:', aiErr);
    }

    // ─── Instant Deterministic Grounding Fallback ────────────────────────────
    const repo = new V3Repository(supabase);

    // 1. Create Lesson Plan
    const lesson = await repo.createLesson({
      title: resolvedTopic,
      topic: resolvedTopic,
      course_name: aiData?.course_name || currDefaults.courseName,
      course_code: aiData?.course_code || currDefaults.courseCode,
      subject_key: resolvedSubjectKey,
      grade_level: resolvedGrade,
      curriculum_version: 'OBEC-2551-REV60',
      duration_minutes: duration,
      learning_focus: aiData?.learning_focus || 'ACTIVE_LEARNING',
      user_id: user.id,
    });

    const planId = lesson.id;

    // 2. Set Curriculum Link
    const stdCode = aiData?.standard_code || currDefaults.standardCode;
    const indCode = aiData?.indicator_code || currDefaults.indicatorCode;
    const indText = aiData?.indicator_text || currDefaults.indicatorText;
    const stdName = aiData?.standard_name || currDefaults.standardName;

    await repo.replaceCurriculumLinks(planId, [{
      lesson_plan_id: planId,
      curriculum_version: 'OBEC-2551-REV60',
      subject_key: resolvedSubjectKey,
      grade_level: resolvedGrade,
      standard_code: stdCode,
      indicator_code: indCode,
      standard_label_snapshot: stdName,
      indicator_label_snapshot: indText.startsWith('[') ? indText : `[ระหว่างทาง] ${indText}`,
      position: 0,
    }]);

    // 3. Create Objectives (K, P, A)
    let rawObjectives = Array.isArray(aiData?.objectives) && aiData.objectives.length > 0 ? aiData.objectives : null;

    if (!rawObjectives) {
      const candidates = getObjectiveSuggestions({
        subjectKey: resolvedSubjectKey,
        learningFocus: 'ACTIVE_LEARNING',
        topic: resolvedTopic,
        indicatorText: indText,
        durationMinutes: duration,
      });

      rawObjectives = candidates.slice(0, 3).map(c => ({
        category: c.category,
        statement: c.statement,
        observableVerb: c.observableVerb || (c.category === 'K' ? 'อธิบาย' : c.category === 'P' ? 'ปฏิบัติ' : 'มีความมุ่งมั่น'),
      }));
    }

    const createdObjectives: V3LessonObjective[] = [];
    for (let i = 0; i < rawObjectives.length; i++) {
      const o = rawObjectives[i];
      const obj = await repo.createObjective({
        lesson_plan_id: planId,
        statement: o.statement,
        position: i,
        objective_type: o.category || null,
        observable_behavior: o.observableVerb || null,
        source: 'AI',
      });
      createdObjectives.push(obj);
    }

    // 4. Create Learning Evidence
    let rawEvidence = Array.isArray(aiData?.evidence) && aiData.evidence.length > 0 ? aiData.evidence : null;

    if (!rawEvidence) {
      const evdCandidates = getEvidenceSuggestions({
        subjectKey: resolvedSubjectKey,
        learningFocus: 'ACTIVE_LEARNING',
        topic: resolvedTopic,
        objectiveStatements: createdObjectives.map(o => o.statement),
      });

      rawEvidence = evdCandidates.slice(0, 2).map(e => ({
        evidence_type: e.evidenceType || 'WORKSHEET',
        description: e.description,
      }));
    }

    const createdEvidence: V3LearningEvidence[] = [];
    for (let i = 0; i < rawEvidence.length; i++) {
      const e = rawEvidence[i];
      const evd = await repo.createEvidence({
        lesson_plan_id: planId,
        evidence_type: e.evidence_type || 'WORKSHEET',
        description: e.description,
        position: i,
        source: 'AI',
      });
      createdEvidence.push(evd);
    }

    // 5. Link Objectives to Primary Evidence
    if (createdEvidence[0] && createdObjectives.length > 0) {
      for (const obj of createdObjectives) {
        try {
          await repo.linkObjectiveEvidence(obj.id, createdEvidence[0].id);
        } catch {}
      }
    }

    // 6. Create 5-Stage Activities
    let activityDrafts: V3BlueprintActivityDraft[] = [];

    if (Array.isArray(aiData?.activities) && aiData.activities.length > 0) {
      activityDrafts = aiData.activities.map((act: any, idx: number) => ({
        temporaryId: `act-${idx}`,
        phase: act.phase || 'WARM_UP',
        title: act.title || `กิจกรรมที่ ${idx + 1}`,
        minutes: Number(act.minutes) || 10,
        teacherActions: Array.isArray(act.teacher_actions) ? act.teacher_actions : [act.teacher_actions || 'ครูผู้สอนจัดกิจกรรม'],
        studentActions: Array.isArray(act.student_actions) ? act.student_actions : [act.student_actions || 'นักเรียนปฏิบัติกิจกรรม'],
        linkedObjectiveRefs: createdObjectives.map((_, i) => `O${i + 1}`),
        linkedEvidenceRefs: createdEvidence.length > 0 ? ['E1'] : [],
        resolvedObjectiveIds: createdObjectives.map(o => o.id),
        resolvedEvidenceIds: createdEvidence.map(e => e.id),
        formativeCheck: {
          enabled: idx >= 3,
          description: 'สังเกตการมีส่วนร่วมและการตอบคำถาม',
        },
        feedback: {
          enabled: idx === 2,
          description: 'ครูให้คำแนะนำระหว่างฝึกปฏิบัติ',
        },
      }));
    } else {
      const flows = getActivityFlowSuggestions({
        subjectKey: resolvedSubjectKey,
        learningFocus: 'ACTIVE_LEARNING',
        topic: resolvedTopic,
        durationMinutes: duration,
        objectiveIds: createdObjectives.map(o => o.id),
        evidenceIds: createdEvidence.map(e => e.id),
      });

      const chosenFlow = flows[0]?.activities || [];
      activityDrafts = chosenFlow.map((act, idx) => ({
        ...act,
        temporaryId: `act-auto-${idx}`,
        linkedObjectiveRefs: createdObjectives.map((_, i) => `O${i + 1}`),
        linkedEvidenceRefs: createdEvidence.length > 0 ? ['E1'] : [],
        resolvedObjectiveIds: createdObjectives.map(o => o.id),
        resolvedEvidenceIds: createdEvidence.map(e => e.id),
        formativeCheck: act.formativeCheck || {
          enabled: idx >= 3,
          description: 'ประเมินพฤติกรรมและการมีส่วนร่วมของนักเรียน',
        },
        feedback: act.feedback || {
          enabled: idx === 2,
          description: 'ครูให้คำแนะนำเสริมและข้อคิดเห็นทันที',
        },
      }));
    }

    await repo.applyBlueprint(planId, activityDrafts, 'replace');

    try {
      await repo.updateLesson(planId, { status: 'BLUEPRINT_READY' }, user.id, true);
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        id: planId,
        planId: planId,
        topic: resolvedTopic,
        subjectKey: resolvedSubjectKey,
        gradeLevel: resolvedGrade,
        activitiesCount: activityDrafts.length,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('[AI Plan Generation Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการสร้างแผนด้วย AI กรุณาลองใหม่อีกครั้ง',
    }, { status: 500 });
  }
}
