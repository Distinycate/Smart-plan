export const evaluationSections = [
  { id: 'curriculum_alignment', label: 'ความสอดคล้องกับหลักสูตร' },
  { id: 'indicators', label: 'ตัวชี้วัดและจุดประสงค์' },
  { id: 'objectives', label: 'การวัดและประเมินผล' },
  { id: 'active_learning', label: 'กระบวนการจัดการเรียนรู้' },
  { id: 'assessment', label: 'เครื่องมือและเกณฑ์ประเมิน' },
  { id: 'gpas', label: 'การพัฒนาทักษะ GPAS' },
  { id: 'wpa_w9', label: 'การประเมิน ว.PA / ว.9' },
  { id: 'final_summary', label: 'สรุปผลและข้อเสนอแนะภาพรวม' }
];

export const sectionPrompts: Record<string, string> = {
  curriculum_alignment: `คุณเป็นผู้เชี่ยวชาญด้านหลักสูตรแกนกลาง ประเมินความสอดคล้องของแผนการสอนนี้กับหลักสูตร
<<<PLAN_CONTENT>>>
ตอบกลับเป็น JSON Schema นี้เท่านั้น ห้ามมี markdown:
{
  "score": 10,
  "feedback": "คำแนะนำ",
  "strengths": ["จุดแข็ง"],
  "weaknesses": ["จุดอ่อน"]
}`,
  indicators: `คุณเป็นผู้เชี่ยวชาญด้านการวิเคราะห์ตัวชี้วัด ประเมินความถูกต้องของตัวชี้วัดและจุดประสงค์การเรียนรู้
<<<PLAN_CONTENT>>>
ตอบกลับเป็น JSON Schema นี้เท่านั้น ห้ามมี markdown:
{
  "score": 10,
  "feedback": "คำแนะนำ",
  "strengths": ["จุดแข็ง"],
  "weaknesses": ["จุดอ่อน"]
}`,
  objectives: `คุณเป็นผู้เชี่ยวชาญด้านการประเมินจุดประสงค์ ประเมินว่า K P A ครบถ้วนและสอดคล้องกันหรือไม่
<<<PLAN_CONTENT>>>
ตอบกลับเป็น JSON Schema นี้เท่านั้น ห้ามมี markdown:
{
  "score": 10,
  "feedback": "คำแนะนำ",
  "strengths": ["จุดแข็ง"],
  "weaknesses": ["จุดอ่อน"]
}`,
  active_learning: `คุณเป็นผู้เชี่ยวชาญด้าน Active Learning ประเมินกระบวนการจัดการเรียนรู้ว่าเน้นผู้เรียนเป็นสำคัญหรือไม่
<<<PLAN_CONTENT>>>
ตอบกลับเป็น JSON Schema นี้เท่านั้น ห้ามมี markdown:
{
  "score": 20,
  "feedback": "คำแนะนำ",
  "strengths": ["จุดแข็ง"],
  "weaknesses": ["จุดอ่อน"]
}`,
  assessment: `คุณเป็นผู้เชี่ยวชาญด้านการวัดและประเมินผล ประเมินเครื่องมือและเกณฑ์การประเมิน
<<<PLAN_CONTENT>>>
ตอบกลับเป็น JSON Schema นี้เท่านั้น ห้ามมี markdown:
{
  "score": 15,
  "feedback": "คำแนะนำ",
  "strengths": ["จุดแข็ง"],
  "weaknesses": ["จุดอ่อน"]
}`,
  gpas: `คุณเป็นผู้เชี่ยวชาญด้านกระบวนการคิด GPAS ประเมินการจัดกิจกรรมส่งเสริมทักษะ GPAS 5 Steps
<<<PLAN_CONTENT>>>
ตอบกลับเป็น JSON Schema นี้เท่านั้น ห้ามมี markdown:
{
  "score": 15,
  "feedback": "คำแนะนำ",
  "strengths": ["จุดแข็ง"],
  "weaknesses": ["จุดอ่อน"]
}`,
  wpa_w9: `คุณเป็นกรรมการประเมิน ว.PA และ ว.9 ประเมินความสอดคล้องกับเกณฑ์วิทยฐานะ
<<<PLAN_CONTENT>>>
ตอบกลับเป็น JSON Schema นี้เท่านั้น ห้ามมี markdown:
{
  "score": 20,
  "feedback": "คำแนะนำ",
  "strengths": ["จุดแข็ง"],
  "weaknesses": ["จุดอ่อน"]
}`,
  final_summary: `สรุปภาพรวมแผนการสอน
<<<PLAN_CONTENT>>>
ตอบกลับเป็น JSON Schema นี้เท่านั้น ห้ามมี markdown:
{
  "academicSuggestions": "ข้อเสนอแนะทางวิชาการ",
  "detailedFixGuidelines": "แนวทางแก้ไข",
  "mustFix": ["สิ่งที่ต้องแก้ไขด่วน"]
}`
};
