/**
 * Smart Plan V3 — Assessment Tool Prompt Builder
 * Generates scoped prompts for AI tool generation (Rubric, Checklist, Scoring Guide, etc.)
 */

export interface AssessmentToolPromptInput {
  subjectKey: string;
  subjectName: string;
  gradeLevel: string;
  topic: string;
  learningFocus: string;
  toolType: string;
  evidenceTitle: string;
  evidenceDescription?: string | null;
  evidenceType?: string | null;
  objectives: Array<{ text: string }>;
  activityContext?: {
    title?: string | null;
    teacher_actions?: string;
    student_actions?: string;
    assessment_moment?: string | null;
  } | null;
  levelsCount?: number; // 3, 4, or 5 (default 4)
}

export function buildAssessmentToolPrompt(input: AssessmentToolPromptInput): {
  systemInstruction: string;
  userPrompt: string;
} {
  const levelsCount = input.levelsCount || 4;

  const systemInstruction = `คุณคือผู้เชี่ยวชาญด้านการวัดและประเมินผลการเรียนรู้ตามสภาพจริง (Authentic Assessment Expert) ในระบบ Smart Plan V3 สำหรับครูไทย
หน้าที่ของคุณคือ: ออกแบบเครื่องมือวัดและประเมินผล (Assessment Tool) ที่สอดคล้องกับหลักฐานการเรียนรู้และธรรมชาติของวิชา

กฎเหล็กสำคัญ:
1. สร้างเฉพาะเครื่องมือประเมินตามประเภทที่กำหนด (${input.toolType}) เท่านั้น
2. ต้องใช้พฤติกรรมที่ "สังเกตได้จริงและวัดได้เชิงประจักษ์" (Observable & Measurable Behavior)
3. ห้ามใช้คำประเมินลอย ๆ เช่น "ดีมาก", "เข้าใจดี", "มีเจตคติที่ดี" โดยไม่มีคำอธิบายพฤติกรรมบ่งชี้ที่ชัดเจน
4. ขนาดเครื่องมือต้องกะทัดรัด เหมาะกับคาบเรียน 60 นาที:
   - Rubric: สร้างประมาณ 3-4 เกณฑ์ (Criteria) เท่านั้น (ห้ามสร้างเกิน 5 เกณฑ์)
   - Checklist: สร้างประมาณ 4-8 รายการพฤติกรรม (Items)
   - Scoring Guide: กำหนดขั้นตอน/เกณฑ์ให้คะแนนอย่างชัดเจน 3-5 รายการ รวม 5-10 คะแนน
5. ห้ามเปลี่ยนจุดประสงค์การเรียนรู้ และห้ามแต่งหลักฐานใหม่
6. ตอบเป็น JSON ที่ถูกต้องตาม Schema ที่กำหนดเท่านั้น ห้ามมี Markdown หรือข้อความนอก JSON`;

  let formatInstructions = '';
  if (['RUBRIC', 'PERFORMANCE_RUBRIC', 'PRODUCT_RUBRIC'].includes(input.toolType)) {
    const levelLabels =
      levelsCount === 3
        ? [
            { score: 3, label: 'ระดับ 3 (ดี/ผ่านเกณฑ์ยอดเยี่ยม)' },
            { score: 2, label: 'ระดับ 2 (พอใช้/ผ่านเกณฑ์)' },
            { score: 1, label: 'ระดับ 1 (ปรับปรุง/ยังไม่ผ่าน)' },
          ]
        : levelsCount === 5
        ? [
            { score: 5, label: 'ระดับ 5 (ยอดเยี่ยม)' },
            { score: 4, label: 'ระดับ 4 (ดีมาก)' },
            { score: 3, label: 'ระดับ 3 (ดี)' },
            { score: 2, label: 'ระดับ 2 (พอใช้)' },
            { score: 1, label: 'ระดับ 1 (ต้องปรับปรุง)' },
          ]
        : [
            { score: 4, label: 'ระดับ 4 (ดีเยี่ยม)' },
            { score: 3, label: 'ระดับ 3 (ดี/ผ่านเกณฑ์)' },
            { score: 2, label: 'ระดับ 2 (พอใช้/กำลังพัฒนา)' },
            { score: 1, label: 'ระดับ 1 (ต้องช่วยเหลือ)' },
          ];

    formatInstructions = `
โครงสร้าง JSON สำหรับ Rubric (${levelsCount} ระดับ):
{
  "title": "ชื่อแบบประเมิน (เช่น แบบประเมินทักษะการพูดสนทนา)",
  "levels": ${JSON.stringify(levelLabels)},
  "criteria": [
    {
      "name": "ชื่อเกณฑ์ที่ 1",
      "weight": 1,
      "descriptors": {
        ${levelLabels.map((l) => `"${l.score}": "คำอธิบายพฤติกรรมระดับ ${l.score} ที่ชัดเจน"`).join(',\n        ')}
      }
    }
  ]
}
* หมายเหตุ: ต้องมีคำอธิบาย (descriptor) ครบทุกระดับสำหรับทุกเกณฑ์ ห้ามเว้นว่าง`;
  } else if (input.toolType === 'CHECKLIST') {
    formatInstructions = `
โครงสร้าง JSON สำหรับ Checklist:
{
  "title": "ชื่อแบบประเมินรายการพฤติกรรม (Checklist)",
  "passingThreshold": 4,
  "items": [
    {
      "id": "C1",
      "criterion": "พฤติกรรมบ่งชี้ที่สังเกตได้ข้อที่ 1",
      "observable": true
    },
    {
      "id": "C2",
      "criterion": "พฤติกรรมบ่งชี้ที่สังเกตได้ข้อที่ 2",
      "observable": true
    }
  ]
}`;
  } else if (input.toolType === 'SCORING_GUIDE') {
    formatInstructions = `
โครงสร้าง JSON สำหรับ Scoring Guide:
{
  "title": "เกณฑ์การให้คะแนน (Scoring Guide)",
  "totalPoints": 5,
  "items": [
    {
      "criterion": "การระบุข้อมูล/คำตอบที่ถูกต้อง",
      "maxPoints": 2,
      "description": "ระบุคำตอบถูกต้องครบถ้วน"
    },
    {
      "criterion": "การแสดงวิธีคิดหรือกระบวนการ",
      "maxPoints": 2,
      "description": "แสดงขั้นตอนและวิธีการแก้ปัญหาอย่างเป็นระบบ"
    },
    {
      "criterion": "การให้เหตุผลประกอบ",
      "maxPoints": 1,
      "description": "อธิบายเหตุผลสนับสนุนข้อสรุปได้สมเหตุสมผล"
    }
  ]
}`;
  } else if (input.toolType === 'OBSERVATION_FORM') {
    formatInstructions = `
โครงสร้าง JSON สำหรับ Observation Form:
{
  "title": "แบบสังเกตพฤติกรรมการเรียนรู้",
  "notesPrompt": "บันทึกข้อสังเกตเพิ่มเติมสำหรับนักเรียนที่ต้องการการสนับสนุน",
  "behaviors": [
    {
      "id": "B1",
      "targetBehavior": "พฤติกรรมเป้าหมายที่ 1",
      "lookFors": [
        "สิ่งที่มองหา 1.1",
        "สิ่งที่มองหา 1.2"
      ]
    }
  ]
}`;
  } else {
    formatInstructions = `
โครงสร้าง JSON สำหรับ Rating Scale:
{
  "title": "แบบประเมินมาตรประมาณค่า",
  "scale": [
    { "value": 3, "label": "ปฏิบัติได้ดี/สม่ำเสมอ" },
    { "value": 2, "label": "ปฏิบัติได้บางครั้ง/มีครูช่วย" },
    { "value": 1, "label": "ยังไม่สามารถปฏิบัติได้" }
  ],
  "items": [
    { "id": "R1", "criterion": "รายการพฤติกรรมที่ 1" },
    { "id": "R2", "criterion": "รายการพฤติกรรมที่ 2" }
  ]
}`;
  }

  const userPrompt = `โปรดสร้างเครื่องมือประเมินประเภท "${input.toolType}" สำหรับบริบทต่อไปนี้:

บริบทการจัดการเรียนรู้:
- กลุ่มสาระ: ${input.subjectName} (${input.subjectKey})
- ระดับชั้น: ${input.gradeLevel}
- หัวข้อ/เรื่อง: ${input.topic}
- จุดเน้นวิชา (Learning Focus): ${input.learningFocus}

จุดประสงค์การเรียนรู้ที่ต้องยืนยัน:
${input.objectives.map((o, idx) => `${idx + 1}. ${o.text}`).join('\n')}

หลักฐานการเรียนรู้เป้าหมาย (Evidence to Assess):
- ชื่อหลักฐาน: ${input.evidenceTitle}
${input.evidenceDescription ? `- คำอธิบายหลักฐาน: ${input.evidenceDescription}` : ''}
${input.evidenceType ? `- ประเภทหลักฐาน: ${input.evidenceType}` : ''}

${
  input.activityContext
    ? `บริบทกิจกรรมการเรียนรู้ที่หลักฐานนี้เกิดขึ้น:
- ชื่อกิจกรรม: ${input.activityContext.title || 'กิจกรรมในคาบเรียน'}
- สิ่งที่นักเรียนปฏิบัติ: ${input.activityContext.student_actions || '-'}
${input.activityContext.assessment_moment ? `- จุดประเมินในกิจกรรม: ${input.activityContext.assessment_moment}` : ''}
`
    : ''
}
รูปแบบ JSON ที่ต้องส่งกลับ:
${formatInstructions}
`;

  return { systemInstruction, userPrompt };
}
