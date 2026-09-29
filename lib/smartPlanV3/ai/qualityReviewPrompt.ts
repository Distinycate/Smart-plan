/**
 * Smart Plan V3 — AI Quality Review Prompt Builder (Layer 2)
 * Builds system instruction and user prompt for qualitative review.
 * Input is sanitized — no PII, no student data.
 */

/** Sanitized review context sent to Gemini */
export interface V3QualityReviewContext {
  subject: string;
  subjectKey: string;
  grade: string;
  topic: string;
  durationMinutes: number;
  learningFocus: string;
  indicators: Array<{ code: string; text: string }>;
  objectives: Array<{ ref: string; statement: string; type: string | null }>;
  evidence: Array<{ ref: string; evidenceType: string; description: string }>;
  activities: Array<{
    ref: string;
    phase: string;
    minutes: number;
    title?: string;
    studentActions: string;
    teacherActions: string;
    linkedObjectiveRefs: string[];
    linkedEvidenceRefs: string[];
    hasFeedback: boolean;
    hasFormativeCheck: boolean;
  }>;
  assessments: Array<{
    ref: string;
    name: string;
    assessmentType: string;
    method: string;
    isFormative: boolean;
    toolType?: string;
    linkedEvidenceRefs: string[];
  }>;
  assetsSummary: Array<{ ref: string; type: string; audience: string }>;
  subjectProfileHints: {
    preferredPatterns: string[];
    avoidPatterns: string[];
    assessmentGuidance: string[];
  };
  /** All valid refs — used for AI output validation */
  validRefs: {
    objectives: string[];
    evidence: string[];
    activities: string[];
    assessments: string[];
    assets: string[];
  };
}

export function buildQualityReviewSystemInstruction(): string {
  return `คุณคือผู้ช่วยตรวจคุณภาพแผนการเรียนรู้ภาษาไทยระดับมืออาชีพ

บทบาทของคุณ:
- ตรวจสอบคุณภาพเชิงการเรียนรู้เท่านั้น ไม่ตัดสินว่าครูผ่านหรือไม่ผ่านวิทยฐานะ
- รายงานเฉพาะประเด็นที่พิสูจน์ได้จากข้อมูลในแผน อย่าสมมติสิ่งที่ไม่มี
- ใช้ภาษาไทยกระชับ มืออาชีพ ตรงประเด็น
- ห้ามใช้คำฟุ้งเฟ้อเช่น "ยอดเยี่ยมมาก" หรือ "สมบูรณ์แบบ" โดยไม่มีหลักฐาน
- ใช้ภาษาแบบ "พบว่า...", "ยังไม่พบ...", "ควรพิจารณา..."
- คืนผลเป็น JSON ตามรูปแบบที่กำหนด เท่านั้น ห้ามเพิ่ม field อื่น

สิ่งที่ตรวจ (AI Layer เท่านั้น — ไม่ซ้ำกับ Rule Engine):
1. ความสอดคล้องเชิงความหมาย: Indicator ↔ Objective ↔ Activity
2. ความพอเพียงของหลักฐาน (Evidence sufficiency)
3. คุณภาพการมีส่วนร่วมของผู้เรียน (Meaningful participation)
4. ความเหมาะสมทางการรู้คิด (Cognitive demand)
5. ความสมเหตุสมผลในบริบทห้องเรียนจริง (Classroom feasibility)
6. ความแท้จริงตามธรรมชาติวิชา (Subject authenticity)
7. ความสอดคล้องของการประเมินกับหลักฐาน (Assessment validity)
8. กระแสการเรียนรู้ตลอดคาบ (Learning flow coherence)

การอ้างอิง:
- ใช้ ref สั้นเช่น O1, E1, A3, ASM1, AST2 เท่านั้น
- ระบุ locationRef เพียง 1 ตัวต่อ 1 issue ห้ามใส่หลายตัวรวมกัน เช่น "O2, A2"
- ห้ามอ้าง ref ที่ไม่มีในรายการ validRefs
- ถ้าไม่พบปัญหา ให้ issues = []`;
}

export function buildQualityReviewPrompt(ctx: V3QualityReviewContext): string {
  const objectivesText = ctx.objectives
    .map(o => `  ${o.ref}: [${o.type || 'K'}] "${o.statement}"`)
    .join('\n');

  const evidenceText = ctx.evidence
    .map(e => `  ${e.ref}: [${e.evidenceType}] "${e.description}"`)
    .join('\n');

  const activitiesText = ctx.activities
    .map(a =>
      `  ${a.ref} (${a.phase}, ${a.minutes}นาที): ${a.title || ''}
    ครู: ${a.teacherActions.substring(0, 100)}
    นักเรียน: ${a.studentActions.substring(0, 100)}
    เชื่อมโยง: [${a.linkedObjectiveRefs.join(',')}] [${a.linkedEvidenceRefs.join(',')}]
    ป้อนกลับ: ${a.hasFeedback ? 'มี' : 'ไม่มี'} | ตรวจสอบ: ${a.hasFormativeCheck ? 'มี' : 'ไม่มี'}`
    )
    .join('\n\n');

  const assessmentsText = ctx.assessments
    .map(a =>
      `  ${a.ref}: "${a.name}" [${a.assessmentType}] เครื่องมือ: ${a.toolType || 'ไม่มี'} หลักฐาน: [${a.linkedEvidenceRefs.join(',')}]`
    )
    .join('\n');

  const validRefsText = [
    ...ctx.validRefs.objectives,
    ...ctx.validRefs.evidence,
    ...ctx.validRefs.activities,
    ...ctx.validRefs.assessments,
    ...ctx.validRefs.assets,
  ].join(', ');

  return `ตรวจคุณภาพแผนการเรียนรู้ต่อไปนี้:

## ข้อมูลพื้นฐาน
วิชา: ${ctx.subject} (${ctx.subjectKey})
ระดับชั้น: ${ctx.grade}
หัวข้อ: ${ctx.topic}
เวลา: ${ctx.durationMinutes} นาที
Learning Focus: ${ctx.learningFocus}

## ตัวชี้วัดหลักสูตร
${ctx.indicators.map(i => `  ${i.code}: ${i.text}`).join('\n')}

## จุดประสงค์การเรียนรู้
${objectivesText}

## หลักฐานการเรียนรู้
${evidenceText}

## กิจกรรมการเรียนรู้
${activitiesText}

## การวัดและประเมินผล
${assessmentsText}

## สื่อการสอน
${ctx.assetsSummary.map(a => `  ${a.ref}: ${a.type} [${a.audience}]`).join('\n')}

## แนวทางตามธรรมชาติวิชา
รูปแบบที่แนะนำ: ${ctx.subjectProfileHints.preferredPatterns.join(', ')}
สิ่งที่ควรหลีกเลี่ยง: ${ctx.subjectProfileHints.avoidPatterns.join(', ')}

## Valid Refs ที่อนุญาตในการอ้างอิง
${validRefsText}

## คำสั่ง
ตรวจเฉพาะประเด็นที่ Rule Engine ตรวจไม่ได้ (ความหมาย ความสมเหตุสมผล คุณภาพ)
ห้ามอ้าง ref นอก validRefs ข้างต้น

คืนผลในรูปแบบ JSON เท่านั้น:
{
  "issues": [
    {
      "category": "ALIGNMENT|ACTIVITY|ASSESSMENT|FEEDBACK|SUBJECT|TIME",
      "severity": "ERROR|WARNING|INFO",
      "locationType": "LESSON|OBJECTIVE|EVIDENCE|ACTIVITY|ASSESSMENT|ASSESSMENT_TOOL|ASSET",
      "locationRef": "<ref หรือ null>",
      "reason": "<เหตุผลภาษาไทย>",
      "suggestion": "<ข้อเสนอแนะภาษาไทย>",
      "proposedChange": {
        "field": "<field ที่แนะนำให้เปลี่ยน หรือ null>",
        "replacement": "<ข้อความที่เสนอ หรือ null>"
      }
    }
  ]
}

ถ้าไม่พบปัญหา ให้คืน: {"issues": []}`;
}
