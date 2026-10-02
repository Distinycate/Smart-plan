import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';
import { subjectNameToKey } from '@/lib/smartPlanV3/labels';
import { V3LessonObjective, V3LearningEvidence, V3BlueprintActivityDraft } from '@/lib/smartPlanV3/types';

export const maxDuration = 60;

interface AiPlanPayload {
  prompt?: string;
  subjectKey?: string;
  gradeLevel?: string;
  topic?: string;
  durationMinutes?: number;
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
    const modelName = 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

    const systemPrompt = `คุณเป็นผู้เชี่ยวชาญด้านการจัดทำแผนการจัดการเรียนรู้ตามเกณฑ์กระทรวงศึกษาธิการไทย (หลักสูตรแกนกลาง 2551 ปรับปรุง 2560) และมาตรฐาน ว.PA (PA-Ready)
หน้าที่ของคุณคือออกแบบโครงสร้างแผนการสอนฉบับสมบูรณ์ 60 นาที (หรือตามเวลาที่ระบุ) จากหัวข้อที่ครูกำหนด โดยต้องส่งออกผลลัพธ์เป็น JSON ตามโครงสร้างที่กำหนดเท่านั้น`;

    const userPrompt = `กรุณาออกแบบแผนการสอนจากหัวข้อ/ความต้องการดังนี้:
"${rawPrompt}"
${body.subjectKey ? `กลุ่มสาระที่กำหนด: ${body.subjectKey}` : ''}
${body.gradeLevel ? `ระดับชั้นที่กำหนด: ${body.gradeLevel}` : ''}
ระยะเวลา: ${duration} นาที

ส่งกลับ JSON โครงสร้างนี้เท่านั้น:
{
  "subject_key": "ENGLISH" | "MATHEMATICS" | "SCIENCE" | "THAI" | "SOCIAL_STUDIES" | "HEALTH_PE" | "ARTS" | "CAREER_TECH" | "FOREIGN_LANGUAGE" | "GENERAL",
  "grade_level": "เช่น ม.1, ม.4, ป.5",
  "topic": "ชื่อหัวข้อบทเรียนที่กระชับ ชัดเจน",
  "course_name": "ชื่อวิชา เช่น ภาษาอังกฤษพื้นฐาน, คณิตศาสตร์พื้นฐาน",
  "course_code": "รหัสวิชา เช่น อ31101, ค21101",
  "learning_focus": "ACTIVE_LEARNING หรือจุดเน้นสำคัญ",
  "standard_code": "รหัสมาตรฐาน เช่น ต 1.1 หรือ ค 1.1",
  "standard_name": "ชื่อมาตรฐานการเรียนรู้",
  "indicator_code": "รหัสตัวชี้วัด เช่น ต 1.1 ม.4/1",
  "indicator_text": "ข้อความตัวชี้วัด",
  "indicator_type": "during" | "final",
  "objectives": [
    { "category": "K", "statement": "ข้อความจุดประสงค์ด้านความรู้ (Knowledge: K) ที่ขึ้นต้นด้วย นักเรียนสามารถ...", "observableVerb": "อธิบาย/ระบุ" },
    { "category": "P", "statement": "ข้อความจุดประสงค์ด้านทักษะกระบวนการ (Process: P) ที่ขึ้นต้นด้วย นักเรียนสามารถ...", "observableVerb": "เขียน/สื่อสาร/ปฏิบัติ" },
    { "category": "A", "statement": "ข้อความจุดประสงค์ด้านเจตคติ/คุณลักษณะ (Attitude: A) ที่ขึ้นต้นด้วย นักเรียนแสดงออกถึง...", "observableVerb": "มีความมุ่งมั่น/ร่วมมือ" }
  ],
  "evidence": [
    { "evidence_type": "WORKSHEET", "description": "ใบงาน/แบบฝึกปฏิบัติ/ภาระงานเชิงประจักษ์" },
    { "evidence_type": "OBSERVATION", "description": "แบบสังเกตพฤติกรรมการเรียนรู้และการทำงานร่วมกัน" }
  ],
  "activities": [
    { "phase": "WARM_UP", "minutes": 10, "title": "ขั้นนำเข้าสู่บทเรียน (Warm-up & Hook)", "teacher_actions": "ครูทักทาย กระตุ้นความสนใจ...", "student_actions": "นักเรียนร่วมตอบคำถาม..." },
    { "phase": "PRESENTATION", "minutes": 15, "title": "ขั้นจัดการเรียนรู้ (Presentation / Modeling)", "teacher_actions": "ครูอธิบายและยกตัวอย่าง...", "student_actions": "นักเรียนสังเกตและจดบันทึก..." },
    { "phase": "PRACTICE", "minutes": 15, "title": "ขั้นฝึกปฏิบัติ (Guided & Collaborative Practice)", "teacher_actions": "ครูมอบหมายงานกลุ่มและคอยโค้ช...", "student_actions": "นักเรียนฝึกปฏิบัติร่วมกัน..." },
    { "phase": "PRODUCTION", "minutes": 15, "title": "ขั้นนำไปใช้ (Independent Production / Active Application)", "teacher_actions": "ครูตรวจติดตามและให้คำแนะนำ...", "student_actions": "นักเรียนสร้างสรรค์ผลงานเดี่ยว/กลุ่ม..." },
    { "phase": "WRAP_UP", "minutes": 5, "title": "ขั้นสรุปและประเมินผล (Wrap-up & Formative Check)", "teacher_actions": "ครูและนักเรียนร่วมกันสรุปบทเรียน...", "student_actions": "นักเรียนสะท้อนสิ่งที่ได้เรียนรู้ (Exit Ticket)..." }
  ]
}`;

    const geminiPayload = {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 8192,
        temperature: 0.2,
      },
    };

    const response = await fetchGeminiWithRetry(apiUrl, geminiPayload, 3);
    const resJson = await response.json();
    const rawAiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawAiText) {
      return NextResponse.json({ success: false, error: 'ไม่ได้รับข้อมูลจาก AI กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
    }

    const aiData = JSON.parse(rawAiText);
    const repo = new V3Repository(supabase);

    // 1. Create Lesson Plan
    const resolvedSubjectKey = body.subjectKey || aiData.subject_key || 'GENERAL';
    const resolvedGrade = body.gradeLevel || aiData.grade_level || 'ม.1';
    const resolvedTopic = body.topic || aiData.topic || rawPrompt;

    const lesson = await repo.createLesson({
      title: resolvedTopic,
      topic: resolvedTopic,
      course_name: aiData.course_name || resolvedTopic,
      course_code: aiData.course_code || 'ว31101',
      subject_key: resolvedSubjectKey,
      grade_level: resolvedGrade,
      curriculum_version: 'OBEC-2551-REV60',
      duration_minutes: duration,
      learning_focus: aiData.learning_focus || 'ACTIVE_LEARNING',
      user_id: user.id,
    });

    const planId = lesson.id;

    // 2. Set Curriculum Link
    const stdCode = aiData.standard_code || 'มฐ.1';
    const indCode = aiData.indicator_code || `${stdCode} ${resolvedGrade}/1`;
    const indText = aiData.indicator_text || `เข้าใจและประยุกต์ใช้ความรู้เกี่ยวกับ ${resolvedTopic}`;
    const indTypeBadge = aiData.indicator_type === 'final' ? '[ปลายทาง]' : '[ระหว่างทาง]';

    await repo.replaceCurriculumLinks(planId, [{
      lesson_plan_id: planId,
      curriculum_version: 'OBEC-2551-REV60',
      subject_key: resolvedSubjectKey,
      grade_level: resolvedGrade,
      standard_code: stdCode,
      indicator_code: indCode,
      standard_label_snapshot: aiData.standard_name || stdCode,
      indicator_label_snapshot: `${indTypeBadge} ${indText}`,
      position: 0,
    }]);

    // 3. Create Objectives (K, P, A)
    const rawObjectives = Array.isArray(aiData.objectives) && aiData.objectives.length > 0
      ? aiData.objectives
      : [
          { category: 'K', statement: `นักเรียนสามารถอธิบายและระบุสาระสำคัญเกี่ยวกับ ${resolvedTopic} ได้อย่างถูกต้อง (K)`, observableVerb: 'อธิบาย' },
          { category: 'P', statement: `นักเรียนสามารถปฏิบัติและนำความรู้เกี่ยวกับ ${resolvedTopic} ไปใช้แก้ปัญหาได้ (P)`, observableVerb: 'ปฏิบัติ' },
          { category: 'A', statement: `นักเรียนแสดงความกระตือรือร้นและมุ่งมั่นในการทำงานร่วมกับผู้อื่น (A)`, observableVerb: 'มีความมุ่งมั่น' },
        ];

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
    const rawEvidence = Array.isArray(aiData.evidence) && aiData.evidence.length > 0
      ? aiData.evidence
      : [
          { evidence_type: 'WORKSHEET', description: `ใบงาน/แบบฝึกทักษะการเรียนรู้เรื่อง ${resolvedTopic}` },
          { evidence_type: 'OBSERVATION', description: `แบบสังเกตพฤติกรรมการมีส่วนร่วมและการทำงานกลุ่ม` },
        ];

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
    const rawActivities = Array.isArray(aiData.activities) && aiData.activities.length > 0
      ? aiData.activities
      : [
          { phase: 'WARM_UP', minutes: 10, title: 'ขั้นนำเข้าสู่บทเรียน (Warm-up & Hook)', teacher_actions: `ครูกระตุ้นความสนใจด้วยคำถามเกี่ยวกับ ${resolvedTopic}`, student_actions: 'นักเรียนตอบคำถามและร่วมอภิปราย' },
          { phase: 'PRESENTATION', minutes: 15, title: 'ขั้นจัดการเรียนรู้ (Presentation)', teacher_actions: `ครูสาธิตและอธิบายเนื้อหา ${resolvedTopic}`, student_actions: 'นักเรียนสังเกต บันทึกประเด็นสำคัญ' },
          { phase: 'PRACTICE', minutes: 15, title: 'ขั้นฝึกปฏิบัติ (Guided Practice)', teacher_actions: 'ครูมอบหมายงานกลุ่มและให้คำปรึกษา', student_actions: 'นักเรียนจับคู่หรือรวมกลุ่มฝึกปฏิบัติ' },
          { phase: 'PRODUCTION', minutes: 15, title: 'ขั้นนำไปใช้ (Independent Application)', teacher_actions: 'ครูประเมินผลการนำเสนอผลงาน', student_actions: 'นักเรียนทำใบงานและนำเสนอคำตอบ' },
          { phase: 'WRAP_UP', minutes: 5, title: 'ขั้นสรุปและประเมินผล (Wrap-up)', teacher_actions: 'ครูและนักเรียนร่วมกันสรุปข้อคิดและหลักการ', student_actions: 'นักเรียนทำ Exit Ticket สรุปความเข้าใจ' },
        ];

    const activityDrafts: V3BlueprintActivityDraft[] = rawActivities.map((act: any, idx: number) => ({
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
