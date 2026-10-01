import { ObjectiveCandidate } from './types';
import { getSubjectProfile } from '../subjectProfiles/registry';

interface GenerateObjectiveOptions {
  subjectKey: string;
  learningFocus?: string | null;
  topic: string;
  indicatorText?: string;
  durationMinutes?: number;
}

/**
 * Generate 3 distinct tiered objective candidates (Foundation / Target / Extended)
 * Strictly deterministic and grounded in Bloom's taxonomy & Subject Profile rules.
 */
export function getObjectiveSuggestions({
  subjectKey,
  learningFocus,
  topic,
  indicatorText = '',
  durationMinutes = 60,
}: GenerateObjectiveOptions): ObjectiveCandidate[] {
  const profile = getSubjectProfile(subjectKey);
  const cleanTopic = topic.trim() || 'บทเรียน';
  const focusKey = learningFocus?.toUpperCase() || '';

  // Extract clean indicator core if available
  const cleanIndicator = indicatorText.replace(/^[ตคยวสศงพ]\s*\d+(\.\d+)?\s*(ม\.\d+\/\d+|ป\.\d+\/\d+)?\s*[-—:]?\s*/i, '').trim();

  // Tailored patterns by subject & focus
  if (subjectKey === 'ENGLISH') {
    if (focusKey === 'SPEAKING' || focusKey === 'COMMUNICATION') {
      return [
        {
          id: 'obj-sug-1',
          level: 'FOUNDATION',
          levelLabelTh: 'ระดับพื้นฐาน (Foundation)',
          levelBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
          statement: `นักเรียนสามารถออกเสียงคำศัพท์และระบุสำนวนภาษาอังกฤษเกี่ยวกับ ${cleanTopic} ได้อย่างถูกต้อง`,
          rationale: 'เน้นความถูกต้องของการออกเสียงและจำแนกคำศัพท์พื้นฐานตามกรอบ CEFR',
          observableVerb: 'ออกเสียงและระบุ',
        },
        {
          id: 'obj-sug-2',
          level: 'TARGET',
          levelLabelTh: 'ระดับเป้าหมายหลักคาบนี้ (Recommended)',
          levelBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          statement: `นักเรียนสามารถพูดถาม-ตอบและสนทนาแลกเปลี่ยนข้อมูลเกี่ยวกับ ${cleanTopic} กับคู่สนทนาได้อย่างน้อย 4-6 ประโยคตามโครงสร้างที่กำหนด`,
          rationale: 'วัดการสื่อสารสองทางตามเป้าหมายของคาบเรียน มีเกณฑ์เชิงปริมาณและคุณภาพที่ชัดเจน',
          observableVerb: 'พูดถาม-ตอบและสนทนา',
        },
        {
          id: 'obj-sug-3',
          level: 'EXTENDED',
          levelLabelTh: 'ระดับท้าทาย/ขยายผล (Extended)',
          levelBadgeCls: 'bg-purple-100 text-purple-800 border-purple-200',
          statement: `นักเรียนสามารถนำเสนอหรือแสดงบทบาทสมมติเพื่อสื่อสารเกี่ยวกับ ${cleanTopic} ได้อย่างคล่องแคล่วและสื่อความหมายได้เหมาะสมกับสถานการณ์`,
          rationale: 'ส่งเสริมการประยุกต์ใช้ภาษาในสถานการณ์จำลอง (Production/Performance)',
          observableVerb: 'นำเสนอและแสดงบทบาทสมมติ',
        },
      ];
    } else if (focusKey === 'READING') {
      return [
        {
          id: 'obj-sug-1',
          level: 'FOUNDATION',
          levelLabelTh: 'ระดับพื้นฐาน (Foundation)',
          levelBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
          statement: `นักเรียนสามารถบอกความหมายของคำศัพท์สำคัญและระบุใจความสำคัญจากเรื่อง ${cleanTopic} ที่อ่านได้`,
          rationale: 'เน้นการถอดรหัสความหมายและระบุสาระสำคัญระดับข้อความ',
          observableVerb: 'บอกความหมายและระบุใจความสำคัญ',
        },
        {
          id: 'obj-sug-2',
          level: 'TARGET',
          levelLabelTh: 'ระดับเป้าหมายหลักคาบนี้ (Recommended)',
          levelBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          statement: `นักเรียนสามารถตอบคำถามจับใจความและเรียงลำดับเหตุการณ์จากบทอ่านเรื่อง ${cleanTopic} ได้ถูกต้องอย่างน้อยร้อยละ 70`,
          rationale: 'วัดความเข้าใจในการอ่านเชิงวิเคราะห์ตามตัวชี้วัด',
          observableVerb: 'ตอบคำถามและเรียงลำดับ',
        },
        {
          id: 'obj-sug-3',
          level: 'EXTENDED',
          levelLabelTh: 'ระดับท้าทาย/ขยายผล (Extended)',
          levelBadgeCls: 'bg-purple-100 text-purple-800 border-purple-200',
          statement: `นักเรียนสามารถสรุปความและแสดงความคิดเห็นหรือคาดคะเนเหตุการณ์จากเรื่อง ${cleanTopic} พร้อมให้เหตุผลประกอบได้`,
          rationale: 'พัฒนาทักษะการคิดวิเคราะห์ขั้นสูงและการตีความ',
          observableVerb: 'สรุปความและแสดงความคิดเห็น',
        },
      ];
    } else if (focusKey === 'WRITING') {
      return [
        {
          id: 'obj-sug-1',
          level: 'FOUNDATION',
          levelLabelTh: 'ระดับพื้นฐาน (Foundation)',
          levelBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
          statement: `นักเรียนสามารถเขียนสะกดคำและแต่งประโยคเดี่ยวเกี่ยวกับ ${cleanTopic} ได้ถูกต้องตามโครงสร้างไวยากรณ์`,
          rationale: 'สร้างความแม่นยำในการเขียนระดับประโยค',
          observableVerb: 'เขียนสะกดคำและแต่งประโยค',
        },
        {
          id: 'obj-sug-2',
          level: 'TARGET',
          levelLabelTh: 'ระดับเป้าหมายหลักคาบนี้ (Recommended)',
          levelBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          statement: `นักเรียนสามารถเขียนบรรยายหรือให้ข้อมูลเกี่ยวกับ ${cleanTopic} เป็นข้อความสั้นหรือย่อหน้า (3-5 ประโยค) ได้อย่างถูกต้องและสื่อความหมาย`,
          rationale: 'มุ่งเน้นการสื่อสารความหมายในการเขียนตามกรอบตัวชี้วัด',
          observableVerb: 'เขียนบรรยาย',
        },
        {
          id: 'obj-sug-3',
          level: 'EXTENDED',
          levelLabelTh: 'ระดับท้าทาย/ขยายผล (Extended)',
          levelBadgeCls: 'bg-purple-100 text-purple-800 border-purple-200',
          statement: `นักเรียนสามารถเขียนเรียบเรียงข้อมูลเกี่ยวกับ ${cleanTopic} และตรวจทานปรับปรุงความถูกต้องของงานเขียนของตนเองได้`,
          rationale: 'ส่งเสริมกระบวนการเขียน (Process Writing) และการแก้ไขงาน',
          observableVerb: 'เขียนเรียบเรียงและตรวจทาน',
        },
      ];
    }
  }

  if (subjectKey === 'MATHEMATICS') {
    if (focusKey === 'PROBLEM_SOLVING') {
      return [
        {
          id: 'obj-sug-1',
          level: 'FOUNDATION',
          levelLabelTh: 'ระดับพื้นฐาน (Foundation)',
          levelBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
          statement: `นักเรียนสามารถวิเคราะห์สถานการณ์ปัญหาเรื่อง ${cleanTopic} และระบุสิ่งที่โจทย์กำหนดกับสิ่งที่โจทย์ต้องการทราบได้อย่างถูกต้อง`,
          rationale: 'ขั้นทำความเข้าใจปัญหา (Understand the problem) ตามหลักโพลยา',
          observableVerb: 'วิเคราะห์และระบุ',
        },
        {
          id: 'obj-sug-2',
          level: 'TARGET',
          levelLabelTh: 'ระดับเป้าหมายหลักคาบนี้ (Recommended)',
          levelBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          statement: `นักเรียนสามารถวางแผนและแสดงขั้นตอนการแก้โจทย์ปัญหาเรื่อง ${cleanTopic} ได้อย่างเป็นลำดับขั้นตอนและได้คำตอบที่ถูกต้อง`,
          rationale: 'วัดกระบวนการแก้ปัญหาและการแสดงวิธีทำเป็นขั้นตอน',
          observableVerb: 'วางแผนและแสดงวิธีแก้ปัญหา',
        },
        {
          id: 'obj-sug-3',
          level: 'EXTENDED',
          levelLabelTh: 'ระดับท้าทาย/ขยายผล (Extended)',
          levelBadgeCls: 'bg-purple-100 text-purple-800 border-purple-200',
          statement: `นักเรียนสามารถอธิบายเหตุผลและตรวจสอบความสมเหตุสมผลของคำตอบในการแก้ปัญหาเรื่อง ${cleanTopic} ได้`,
          rationale: 'ขั้นตรวจสอบและสะท้อนผล (Look back & Reasoning) เพื่อสร้างความเข้าใจลึกซึ้ง',
          observableVerb: 'อธิบายเหตุผลและตรวจสอบ',
        },
      ];
    } else {
      return [
        {
          id: 'obj-sug-1',
          level: 'FOUNDATION',
          levelLabelTh: 'ระดับพื้นฐาน (Foundation)',
          levelBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
          statement: `นักเรียนสามารถอธิบายมโนทัศน์หรือสมบัติทางคณิตศาสตร์ที่เกี่ยวข้องกับ ${cleanTopic} ได้อย่างถูกต้อง`,
          rationale: 'เน้นความเข้าใจเชิงมโนทัศน์ (Conceptual Understanding)',
          observableVerb: 'อธิบายมโนทัศน์',
        },
        {
          id: 'obj-sug-2',
          level: 'TARGET',
          levelLabelTh: 'ระดับเป้าหมายหลักคาบนี้ (Recommended)',
          levelBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          statement: `นักเรียนสามารถคำนวณและหาคำตอบของโจทย์เรื่อง ${cleanTopic} ได้อย่างถูกต้องแม่นยำอย่างน้อยร้อยละ 70`,
          rationale: 'ความคล่องแคล่วในการคำนวณตามขั้นตอนวิธี',
          observableVerb: 'คำนวณและหาคำตอบ',
        },
        {
          id: 'obj-sug-3',
          level: 'EXTENDED',
          levelLabelTh: 'ระดับท้าทาย/ขยายผล (Extended)',
          levelBadgeCls: 'bg-purple-100 text-purple-800 border-purple-200',
          statement: `นักเรียนสามารถประยุกต์ใช้ความรู้เรื่อง ${cleanTopic} ในการแก้ปัญหาหรือสร้างตัวอย่างโจทย์ทางคณิตศาสตร์ได้`,
          rationale: 'การคิดขั้นสูงและการประยุกต์ใช้ความรู้',
          observableVerb: 'ประยุกต์ใช้และสร้างโจทย์',
        },
      ];
    }
  }

  if (subjectKey === 'SCIENCE') {
    return [
      {
        id: 'obj-sug-1',
        level: 'FOUNDATION',
        levelLabelTh: 'ระดับพื้นฐาน (Foundation)',
        levelBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
        statement: `นักเรียนสามารถระบุและอธิบายหลักการวิทยาศาสตร์เกี่ยวกับ ${cleanTopic} ได้อย่างถูกต้อง`,
        rationale: 'ความรู้ความเข้าใจพื้นฐานเชิงวิทยาศาสตร์',
        observableVerb: 'ระบุและอธิบาย',
      },
      {
        id: 'obj-sug-2',
        level: 'TARGET',
        levelLabelTh: 'ระดับเป้าหมายหลักคาบนี้ (Recommended)',
        levelBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        statement: `นักเรียนสามารถปฏิบัติการทดลอง/สำรวจ และบันทึกข้อมูลผลการทดลองเรื่อง ${cleanTopic} ได้อย่างถูกต้องและเป็นระบบ`,
        rationale: 'ทักษะกระบวนการทางวิทยาศาสตร์และการลงมือปฏิบัติจริง',
        observableVerb: 'ปฏิบัติการทดลองและบันทึกผล',
      },
      {
        id: 'obj-sug-3',
        level: 'EXTENDED',
        levelLabelTh: 'ระดับท้าทาย/ขยายผล (Extended)',
        levelBadgeCls: 'bg-purple-100 text-purple-800 border-purple-200',
        statement: `นักเรียนสามารถวิเคราะห์ แปลความหมายข้อมูล และสรุปผลการทดลองเรื่อง ${cleanTopic} โดยใช้หลักฐานเชิงประจักษ์ได้`,
        rationale: 'การลงข้อสรุปและการให้เหตุผลทางวิทยาศาสตร์โดยอิงหลักฐาน',
        observableVerb: 'วิเคราะห์และสรุปผล',
      },
    ];
  }

  // Generic fallback for any other subject (Social, Thai, PE, Arts, etc.)
  const baseContent = cleanIndicator || cleanTopic;
  return [
    {
      id: 'obj-sug-1',
      level: 'FOUNDATION',
      levelLabelTh: 'ระดับพื้นฐาน (Foundation)',
      levelBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
      statement: `นักเรียนสามารถอธิบายความรู้และหลักการสำคัญเกี่ยวกับ ${baseContent} ได้อย่างถูกต้อง`,
      rationale: 'ความรู้ความจำและความเข้าใจพื้นฐานในเนื้อหาบทเรียน',
      observableVerb: 'อธิบายความรู้',
    },
    {
      id: 'obj-sug-2',
      level: 'TARGET',
      levelLabelTh: 'ระดับเป้าหมายหลักคาบนี้ (Recommended)',
      levelBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      statement: `นักเรียนสามารถปฏิบัติกิจกรรมหรือประยุกต์ใช้ความรู้เรื่อง ${baseContent} ได้ตามเกณฑ์ที่กำหนดในคาบเรียน ${durationMinutes} นาที`,
      rationale: 'ทักษะและการนำไปใช้จริงสอดคล้องกับตัวชี้วัด',
      observableVerb: 'ปฏิบัติกิจกรรมหรือประยุกต์ใช้',
    },
    {
      id: 'obj-sug-3',
      level: 'EXTENDED',
      levelLabelTh: 'ระดับท้าทาย/ขยายผล (Extended)',
      levelBadgeCls: 'bg-purple-100 text-purple-800 border-purple-200',
      statement: `นักเรียนสามารถวิเคราะห์ สะท้อนความคิดเห็น และเชื่อมโยงความรู้เรื่อง ${baseContent} สู่ชีวิตจริงหรือสถานการณ์จำลองได้`,
      rationale: 'การคิดวิเคราะห์ขั้นสูงและเจตคติคุณค่า',
      observableVerb: 'วิเคราะห์และสะท้อนความคิดเห็น',
    },
  ];
}
