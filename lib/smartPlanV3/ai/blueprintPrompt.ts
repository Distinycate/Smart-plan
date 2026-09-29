/**
 * Smart Plan V3 — Blueprint Prompt Architecture
 * Modular prompt construction: System Instruction, Subject Profile Guidance,
 * Lesson Context, Output Contract.
 */

import { V3LessonGenerationContext } from '../types';

export function buildBlueprintPrompt(context: V3LessonGenerationContext): {
  systemInstruction: string;
  userPrompt: string;
} {
  // 1. SYSTEM INSTRUCTION
  const systemInstruction = `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบการจัดการเรียนรู้เชิงรุก (Active Learning) สำหรับครูไทย
หน้าที่ของคุณคือออกแบบแผนกิจกรรมการเรียนรู้แบบโครงสร้าง (Lesson Blueprint) สำหรับคาบเรียน 1 คาบ (${context.durationMinutes} นาที)

หลักการสำคัญที่ต้องยึดถืออย่างเคร่งครัด:
1. ยึดตัวชี้วัด จุดประสงค์การเรียนรู้ และหลักฐานการเรียนรู้ที่ได้รับเท่านั้น ห้ามคิดตัวชี้วัดใหม่ ห้ามดัดแปลงหรือตัดทอนจุดประสงค์
2. กิจกรรมต้องสามารถเกิดขึ้นจริงได้ภายในเวลา ${context.durationMinutes} นาที (ปกติ 4–7 กิจกรรม)
3. เน้นการลงมือปฏิบัติของผู้เรียน (Active Learning) ทุกกิจกรรมต้องระบุบทบาทผู้เรียน (studentActions) ชัดเจน ห้ามมีกิจกรรมที่ผู้เรียนนั่งฟังบรรยายอย่างเดียว
4. การเขียนบทบาทครู (teacherActions) และผู้เรียน (studentActions):
   - เขียนกระชับ ปฏิบัติได้จริง สังเกตพฤติกรรมได้
   - ไม่เป็นบทความ ไม่ใช้ภาษาวิชาการฟุ่มเฟือย
   - ตัวอย่างที่ดี: "ครูแสดงภาพอาชีพ 4 ภาพและถามคำถามนำ", "นักเรียนจับคู่ถาม-ตอบเกี่ยวกับอาชีพโดยใช้โครงสร้างที่กำหนด"
   - หลีกเลี่ยง: "ครูดำเนินการจัดกระบวนการเรียนรู้โดยใช้เทคนิคการจัดการเรียนรู้ที่มุ่งเน้น..."
5. ภาษาที่ใช้: ภาษาไทยเป็นหลัก ยกเว้นคำศัพท์ ตัวอย่างประโยค หรือเนื้อหาเฉพาะของวิชาภาษาต่างประเทศให้คงภาษาอังกฤษไว้
6. ส่งผลลัพธ์กลับมาเป็น JSON ตามรูปแบบที่กำหนดเท่านั้น ห้ามใส่ข้อความเกริ่นนำหรือปิดท้ายนอก JSON`;

  // 2. SUBJECT PROFILE & AVOID PATTERNS
  const profileGuidanceLines: string[] = [
    `กลุ่มสาระ/วิชา: ${context.subjectProfile.labelTh} (${context.subject})`,
    `ลักษณะสำคัญของวิชา (Learning Focus): ${context.subjectProfile.learningFocusTh || context.learningFocus}`,
  ];

  if (context.subjectProfile.preferredLearningPatterns.length > 0) {
    profileGuidanceLines.push(`แนวทางการจัดกิจกรรมที่แนะนำ: ${context.subjectProfile.preferredLearningPatterns.join(', ')}`);
  }

  if (context.subjectProfile.objectiveGuidance.length > 0) {
    profileGuidanceLines.push(`พฤติกรรมบ่งชี้ที่สอดคล้อง: ${context.subjectProfile.objectiveGuidance.join(', ')}`);
  }

  if (context.subjectProfile.evidenceGuidance.length > 0) {
    profileGuidanceLines.push(`หลักฐานการเรียนรู้หลักที่ควรเกิดขึ้น: ${context.subjectProfile.evidenceGuidance.join(', ')}`);
  }

  if (context.subjectProfile.avoidPatterns.length > 0) {
    profileGuidanceLines.push(`ข้อควรระวัง/สิ่งที่ไม่ควรทำ (Avoid Patterns):`);
    context.subjectProfile.avoidPatterns.forEach(p => profileGuidanceLines.push(`  - ${p}`));
  }

  // 3. LESSON CONTEXT
  const indicatorsText = context.indicators
    .map(ind => `- [${ind.code}] ${ind.text}`)
    .join('\n');

  const objectivesText = context.objectives
    .map(obj => `- [${obj.ref}] ${obj.statement} ${obj.objective_type ? `(${obj.objective_type})` : ''}`)
    .join('\n');

  const evidenceText = context.evidence
    .map(evd => `- [${evd.ref}] ${evd.description} (ประเภท: ${evd.evidence_type})`)
    .join('\n');

  const objEvdLinksText = context.objectiveEvidenceLinks
    .map(link => `- ${link.objectiveRef} เชื่อมโยงกับ ${link.evidenceRef}`)
    .join('\n');

  // 4. USER PROMPT WITH OUTPUT CONTRACT
  const validObjectiveRefsStr = context.objectives.map(o => o.ref).join(', ');
  const validEvidenceRefsStr = context.evidence.map(e => e.ref).join(', ');

  const userPrompt = `กรุณาออกแบบ Lesson Blueprint 60 นาที โดยใช้ข้อมูลต่อไปนี้:

=== ข้อมูลวิชาและบริบท ===
${profileGuidanceLines.join('\n')}

=== ข้อมูลแผนการสอน ===
- ระดับชั้น: ${context.grade}
- เรื่อง: ${context.topic}
- เวลาทั้งหมด: ${context.durationMinutes} นาที

=== ตัวชี้วัดหลักสูตร ===
${indicatorsText}

=== จุดประสงค์การเรียนรู้ (ต้องเชื่อมโยงให้ครบทุกข้อ) ===
${objectivesText}

=== หลักฐานการเรียนรู้ (เชื่อมโยงกับกิจกรรมที่สร้างหรือสังเกตหลักฐานนี้) ===
${evidenceText}

=== ความเชื่อมโยงจุดประสงค์ ↔ หลักฐานเดิม ===
${objEvdLinksText || '-'}

=== ข้อกำหนดโครงสร้างผลลัพธ์ (JSON OUTPUT CONTRACT) ===
สร้าง JSON โครงสร้างดังนี้:
{
  "summary": {
    "lessonApproach": "แนวคิดและแนวทางการจัดกิจกรรมโดยรวม (1-2 ประโยค)",
    "learningFlow": "ลำดับกระบวนการเรียนรู้สรุป (เช่น นำเข้าสู่บทเรียน -> สำรวจ -> ฝึกปฏิบัติ -> สรุป)"
  },
  "activities": [
    {
      "temporaryId": "A1",
      "phase": "ENGAGE",
      "title": "ชื่อกิจกรรมสั้นๆ",
      "minutes": 5,
      "teacherActions": [
        "บทบาทการกระทำของครูข้อที่ 1",
        "บทบาทครูข้อที่ 2 (ถ้ามี)"
      ],
      "studentActions": [
        "บทบาทการลงมือปฏิบัติของผู้เรียนข้อที่ 1 (ห้ามว่าง)",
        "บทบาทผู้เรียนข้อที่ 2 (ถ้ามี)"
      ],
      "linkedObjectiveRefs": ["O1"],
      "linkedEvidenceRefs": ["E1"],
      "formativeCheck": {
        "enabled": true,
        "description": "วิธีตรวจสอบความเข้าใจระหว่างเรียน (ถ้ามี ถ้าไม่มีให้ enabled: false, description: '')"
      },
      "feedback": {
        "enabled": false,
        "description": "จังหวะให้ข้อมูลย้อนกลับเพื่อปรับปรุงการเรียนรู้ (ถ้ามี)"
      },
      "requiredAssetHints": ["FLASHCARD"]
    }
  ]
}

กฎสำคัญเพิ่มเติม:
1. จำนวนกิจกรรม: ประมาณ 4 ถึง 7 กิจกรรม รวมเวลา (sum of minutes) ต้องเท่ากับ ${context.durationMinutes} นาทีพอดี
2. ช่วงกิจกรรม (phase) อนุญาตเฉพาะ: ENGAGE, EXPLORE, LEARN, MODEL, PRACTICE, APPLY, PERFORM, DISCUSS, INVESTIGATE, CREATE, ASSESS, REFLECT, SUMMARIZE, OTHER
3. linkedObjectiveRefs: อ้างอิงได้เฉพาะ [${validObjectiveRefsStr}] เท่านั้น และทุกจุดประสงค์ต้องถูกเชื่อมกับกิจกรรมอย่างน้อย 1 กิจกรรม
4. linkedEvidenceRefs: อ้างอิงได้เฉพาะ [${validEvidenceRefsStr}] เท่านั้น
5. studentActions ต้องไม่ว่างในทุกกิจกรรม ผู้เรียนต้องมีกิจกรรมที่ได้ทำจริง
6. ส่งคืนเฉพาะ JSON เท่านั้น ไม่ต้องมี backtick codeblock นอกเหนือจาก JSON`;

  return { systemInstruction, userPrompt };
}
