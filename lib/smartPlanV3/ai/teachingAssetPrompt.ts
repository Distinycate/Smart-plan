/**
 * System Prompts and Family-Specific Prompt Builders for V3 Teaching Assets
 * 1 Scoped Asset = 1 Targeted Prompt
 */

export const TEACHING_ASSET_SYSTEM_INSTRUCTION = `คุณคือผู้เชี่ยวชาญด้านการออกแบบสื่อและเอกสารประกอบการจัดการเรียนรู้เชิงรุก (Active Learning Pedagogical Asset Designer)
มีหน้าที่สร้าง "ชุดพร้อมสอน" (Teaching Asset) ประจำคาบเรียน 60 นาที ตามธรรมชาติของแต่ละสาขาวิชา

กฎเหล็กสำคัญ:
1. ปฏิบัติตามธรรมชาติวิชาอย่างเคร่งครัด:
   - ภาษาต่างประเทศที่เน้นการพูด: ต้องสร้าง Speaking Card / Information Gap เพื่อให้ผู้เรียนได้สนทนาโต้ตอบจริง ไม่ใช่แบบฝึกหัดไวยากรณ์ปรนัย 20 ข้อ
   - คณิตศาสตร์ที่เน้นการแก้ปัญหา: ต้องสร้าง Problem Set ที่มีสถานการณ์โจทย์ พื้นที่แสดงวิธีคิด และพื้นที่อธิบายเหตุผล ไม่ใช่คำตอบตัวเลขสั้นๆ
   - วิทยาศาสตร์การทดลอง: ต้องสร้าง Experiment Sheet ที่มีวัสดุ ขั้นตอน ข้อควรระวังความปลอดภัย ตารางบันทึกผล และคำถามวิเคราะห์จากหลักฐาน
   - พลศึกษา: ต้องสร้าง Skill Task Card ประจำฐานปฏิบัติการและข้อควรระวังความปลอดภัย ไม่ใช่ใบงานข้อเขียน
2. ขอบเขตเวลา: ออกแบบให้เหมาะสมกับเวลาที่จัดสรรในกิจกรรม (5-15 นาที) อย่าให้ยาวเกินไป
3. ความเป็นเอกสารพร้อมพิมพ์: โครงสร้างข้อมูลต้องเป็น JSON ตาม Schema ที่กำหนดอย่างเคร่งครัด
4. ห้ามส่งคืน Markdown หรือคำนำ ให้ส่งคืนเฉพาะ JSON string บริสุทธิ์เท่านั้น`;

export interface TeachingAssetPromptContext {
  subject: string;
  grade: string;
  topic: string;
  learningFocus: string;
  durationMinutes: number;
  assetType: string;
  indicators: Array<{ code: string; text: string }>;
  objectives: Array<{ statement: string; type?: string | null }>;
  activities: Array<{
    position: number;
    phase: string;
    minutes: number;
    title: string | null;
    teacherActions: string;
    studentActions: string;
  }>;
  evidence: Array<{ description: string; type: string }>;
  assessmentToolSummary?: string;
  parentAssetContent?: any; // For Answer Key
  userPromptNotes?: string;
}

export function buildTeachingAssetPrompt(ctx: TeachingAssetPromptContext): string {
  const normType = (ctx.assetType || '').toUpperCase().trim();

  const baseHeader = `
[ข้อมูลบริบทแผนการจัดการเรียนรู้]
- วิชา: ${ctx.subject} (ระดับชั้น: ${ctx.grade})
- หัวข้อ/เรื่อง: ${ctx.topic}
- จุดเน้นการเรียนรู้ (Learning Focus): ${ctx.learningFocus || 'ตามธรรมชาติวิชา'}
- เวลาคาบเรียน: ${ctx.durationMinutes} นาที
- ประเภทสื่อที่ต้องการสร้าง: ${ctx.assetType}

[ตัวชี้วัด]
${ctx.indicators.map((i) => `- ${i.code}: ${i.text}`).join('\n') || '- ตามมาตรฐานการเรียนรู้'}

[จุดประสงค์การเรียนรู้]
${ctx.objectives.map((o, idx) => `${idx + 1}. [${o.type || 'P'}] ${o.statement}`).join('\n')}

[กิจกรรมที่เกี่ยวข้อง]
${ctx.activities.map((a) => `- ขั้นที่ ${a.position} [${a.phase}] (${a.minutes} นาที) ${a.title || ''}: ครู "${a.teacherActions.slice(0, 80)}..." | นักเรียน "${a.studentActions.slice(0, 80)}..."`).join('\n')}

[หลักฐานการเรียนรู้]
${ctx.evidence.map((e) => `- [${e.type}] ${e.description}`).join('\n')}
${ctx.userPromptNotes ? `\n[บันทึกความต้องการเพิ่มเติมจากครู]: ${ctx.userPromptNotes}\n` : ''}
`;

  switch (normType) {
    case 'SPEAKING_CARD':
      return `${baseHeader}
[ภารกิจ]
สร้างบัตรกิจกรรมการสนทนา (Speaking Card / Information Gap / Role Play) สำหรับผู้เรียนฝึกพูดสื่อสารจริงเป็นคู่หรือกลุ่ม

[รูปแบบ JSON ที่ต้องการ]
{
  "title": "ชื่อชุดบัตรสนทนา",
  "instruction": "คำสั่งการปฏิบัติสำหรับนักเรียน (เช่น จับคู่ผลัดกันถาม-ตอบตามข้อมูลในบัตร)",
  "estimatedMinutes": 10,
  "roleOrCardType": "STUDENT_A_B",
  "cards": [
    {
      "cardId": "CARD_A",
      "assignedTo": "Student A (ผู้ถาม/ผู้สัมภาษณ์)",
      "roleTitle": "ลูกค้า / ผู้ซักถาม",
      "situation": "สถานการณ์จำลองที่ต้องสื่อสาร",
      "cuesOrClues": ["คำถามนำ 1", "คำถามนำ 2"],
      "targetVocabulary": ["คำศัพท์ 1", "คำศัพท์ 2"],
      "expectedUtterances": ["ประโยคตัวอย่างที่ควรพูดได้"]
    },
    {
      "cardId": "CARD_B",
      "assignedTo": "Student B (ผู้ให้ข้อมูล/ผู้ตอบ)",
      "roleTitle": "ผู้ให้บริการ / ผู้ให้ข้อมูล",
      "situation": "ข้อมูลเฉพาะที่ Student B รู้ และต้องตอบเมื่อถูกถาม",
      "cuesOrClues": ["ข้อมูลคำตอบ 1", "ข้อมูลคำตอบ 2"],
      "targetVocabulary": ["คำศัพท์ 1", "คำศัพท์ 2"],
      "expectedUtterances": ["ประโยคตัวอย่างที่ควรพูดได้"]
    }
  ],
  "interactionRules": [
    "ห้ามเปิดดูบัตรของคู่สนทนา",
    "ใช้ภาษาอังกฤษในการซักถามและตอบเท่านั้น"
  ]
}`;

    case 'PROBLEM_SET':
    case 'WORKSHEET':
      return `${baseHeader}
[ภารกิจ]
สร้างชุดแบบฝึกหัด / ใบงานสถานการณ์ปัญหา (Problem Set / Worksheet) ที่เน้นกระบวนการคิด การแก้ปัญหา และการอธิบายเหตุผล

[รูปแบบ JSON ที่ต้องการ]
{
  "title": "ชื่อใบงาน/ชุดแบบฝึก",
  "instruction": "คำชี้แจงการทำใบงาน",
  "estimatedMinutes": 15,
  "targetGrade": "${ctx.grade}",
  "sections": [
    {
      "title": "ตอนที่ 1: สถานการณ์ปัญหาและการแก้ปัญหา",
      "instruction": "คำสั่งเฉพาะตอน",
      "items": [
        {
          "itemNumber": 1,
          "questionType": "OPEN_RESPONSE",
          "prompt": "สถานการณ์โจทย์ปัญหาที่ท้าทายความคิด...",
          "answerSpace": "พื้นที่แสดงวิธีคิดและเขียนอธิบายเหตุผล 4-5 บรรทัด",
          "points": 5
        },
        {
          "itemNumber": 2,
          "questionType": "SHORT_ANSWER",
          "prompt": "คำถามสะท้อนแนวคิดสำคัญ...",
          "answerSpace": "พื้นที่เขียนคำตอบและให้เหตุผลสั้น",
          "points": 3
        }
      ]
    }
  ]
}`;

    case 'EXPERIMENT_SHEET':
    case 'DATA_TABLE':
      return `${baseHeader}
[ภารกิจ]
สร้างใบกิจกรรมการทดลองวิทยาศาสตร์ (Experiment Sheet) ที่มีตารางบันทึกผล คำถามวิเคราะห์ และสรุปผลจากหลักฐานเชิงประจักษ์

[รูปแบบ JSON ที่ต้องการ]
{
  "title": "ใบกิจกรรมการทดลองเรื่อง...",
  "instruction": "คำชี้แจงการทดลอง",
  "estimatedMinutes": 20,
  "materials": ["อุปกรณ์ 1", "อุปกรณ์ 2"],
  "safetyGuidance": ["ข้อควรระวังความปลอดภัยในการทดลอง"],
  "steps": [
    "ขั้นที่ 1: การเตรียมการ...",
    "ขั้นที่ 2: การลงมือสังเกต/ทดลอง..."
  ],
  "dataTable": {
    "title": "ตารางบันทึกผลการทดลอง",
    "columns": ["ตัวแปร/รายการทดสอบ", "ผลการสังเกต", "ค่าที่วัดได้", "การเปลี่ยนแปลง"],
    "initialRows": [
      ["ชุดทดลองที่ 1", "", "", ""],
      ["ชุดทดลองที่ 2", "", "", ""]
    ]
  },
  "analysisQuestions": [
    "จากข้อมูลในตาราง เกิดการเปลี่ยนแปลงอะไรขึ้นเพราะเหตุใด?",
    "หลักฐานใดสนับสนุนสมมติฐานการทดลอง?"
  ],
  "evidenceSummaryPrompt": "สรุปผลการทดลองโดยใช้ข้อมูลหลักฐานเชิงประจักษ์ (Claim-Evidence-Reasoning)"
}`;

    case 'TASK_CARD':
      return `${baseHeader}
[ภารกิจ]
สร้างบัตรภารกิจ/สถานีปฏิบัติทักษะ (Skill Task Card) สำหรับกิจกรรมปฏิบัติการหรือพลศึกษา

[รูปแบบ JSON ที่ต้องการ]
{
  "title": "บัตรสถานีฝึกปฏิบัติ...",
  "instruction": "คำชี้แจงการฝึกประจำฐาน",
  "estimatedMinutes": 15,
  "tasks": [
    {
      "stationNumber": 1,
      "stationName": "ฐานที่ 1: ...",
      "goal": "เป้าหมายการฝึกของฐานนี้",
      "steps": ["ขั้นตอนที่ 1...", "ขั้นตอนที่ 2..."],
      "keyTechniques": ["จุดสำคัญในการวางท่าทางหรือการควบคุม"],
      "repsOrDuration": "ทำซ้ำ 5 ครั้ง / ปฏิบัติ 3 นาที",
      "safetyNotes": "ข้อควรระวังเพื่อป้องกันการบาดเจ็บ"
    }
  ]
}`;

    case 'EXIT_TICKET':
      return `${baseHeader}
[ภารกิจ]
สร้างบัตรสรุปการเรียนรู้ด่วน (Exit Ticket) สำหรับประเมินความเข้าใจรวดเร็วใน 2-4 นาทีสุดท้ายของคาบ

[รูปแบบ JSON ที่ต้องการ]
{
  "title": "บัตรสรุปการเรียนรู้ (Exit Ticket)",
  "instruction": "ตอบคำถามสั้นๆ 2 ข้อก่อนออกจากชั้นเรียน",
  "estimatedMinutes": 3,
  "prompts": [
    {
      "promptNumber": 1,
      "question": "คำถามตรวจสอบความเข้าใจมโนทัศน์หลัก 1 ข้อ...",
      "promptType": "QUICK_CHECK",
      "sampleAnswerOrCriteria": "แนวคำตอบที่ถูกต้องสั้นๆ"
    },
    {
      "promptNumber": 2,
      "question": "สิ่งที่ยังสงสัยหรืออยากรู้เพิ่มเติมเกี่ยวกับบทเรียนนี้คืออะไร?",
      "promptType": "SHORT_REFLECTION"
    }
  ]
}`;

    case 'ANSWER_KEY': {
      const parentStr = ctx.parentAssetContent ? JSON.stringify(ctx.parentAssetContent, null, 2) : '';
      return `${baseHeader}
[ภารกิจสำคัญ]
สร้างเฉลยและเกณฑ์การให้คะแนน (Answer Key & Scoring Criteria) โดยต้อง derive คำตอบตรงจากเนื้อหาของสื่อต้นฉบับต่อไปนี้เท่านั้น:
${parentStr}

[รูปแบบ JSON ที่ต้องการ]
{
  "title": "เฉลยและแนวคำตอบ: ${ctx.parentAssetContent?.title || 'แบบฝึกหัด'}",
  "targetAssetTitle": "${ctx.parentAssetContent?.title || 'แบบฝึกหัด'}",
  "targetAssetType": "WORKSHEET",
  "items": [
    {
      "itemNumber": 1,
      "sectionTitle": "ตอนที่ 1",
      "questionPrompt": "ข้อความโจทย์...",
      "exactAnswer": "คำตอบที่ถูกต้อง (ถ้าเป็นข้อปิด)",
      "scoringCriteria": "แนวคำตอบและเกณฑ์ตรวจ (ถ้าเป็นข้อเปิดหรือแสดงวิธีคิด)",
      "points": 5
    }
  ],
  "totalPoints": 10
}`;
    }

    case 'TEACHER_GUIDE':
      return `${baseHeader}
[ภารกิจ]
สร้างข้อมูลส่วนสนับสนุนสำหรับครู (Teacher Prompts, Expected Responses, Teaching Tips) ประจำแต่ละช่วงกิจกรรมในคาบเรียน 60 นาที

[รูปแบบ JSON ที่ต้องการ]
{
  "title": "คู่มือแนวทางการจัดการเรียนรู้สำหรับครู (Teacher Guide)",
  "totalMinutes": ${ctx.durationMinutes},
  "materialsNeeded": ["สื่อและอุปกรณ์ทั้งหมดที่ครูต้องจัดเตรียม"],
  "timeline": [
    ${ctx.activities
      .map(
        (a, idx) => `{
      "phaseName": "${a.phase} (${a.title || 'กิจกรรมที่ ' + a.position})",
      "timeRange": "${a.minutes} นาที",
      "teacherActions": ["${a.teacherActions.replace(/"/g, "'")}"],
      "studentActions": ["${a.studentActions.replace(/"/g, "'")}"],
      "mediaOrAssets": ["สื่อที่ใช้ในขั้นนี้"],
      "observableCheck": "สิ่งที่ครูควรสังเกตในขั้นนี้",
      "teacherPrompts": ["คำถามกระตุ้นคิดที่ครูควรพูด"],
      "expectedResponses": ["คำตอบหรือพฤติกรรมที่คาดหวังจากนักเรียน"],
      "teachingTips": ["ข้อแนะนำในการดูแลนักเรียนหรือการปรับกิจกรรม"]
    }`
      )
      .join(',\n')}
  ]
}`;

    default:
      return `${baseHeader}
[ภารกิจ]
สร้างสื่อการเรียนรู้ ${ctx.assetType} ที่สอดคล้องกับจุดประสงค์และกิจกรรม

[รูปแบบ JSON ที่ต้องการ]
{
  "title": "ชื่อสื่อการเรียนรู้",
  "instruction": "คำสั่งหรือคำแนะนำการใช้งาน",
  "estimatedMinutes": 10,
  "description": "เนื้อหารายละเอียดของสื่อ...",
  "items": [
    "รายการที่ 1",
    "รายการที่ 2"
  ]
}`;
  }
}
