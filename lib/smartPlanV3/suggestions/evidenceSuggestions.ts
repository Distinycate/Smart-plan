import { EvidenceCandidate } from './types';
import { getSubjectProfile } from '../subjectProfiles/registry';

interface GenerateEvidenceOptions {
  subjectKey: string;
  learningFocus?: string | null;
  topic?: string;
  objectiveStatements?: string[];
}

/**
 * Generate curated learning evidence candidates based on Subject Profile and learning focus.
 */
export function getEvidenceSuggestions({
  subjectKey,
  learningFocus,
  topic = '',
  objectiveStatements = [],
}: GenerateEvidenceOptions): EvidenceCandidate[] {
  const profile = getSubjectProfile(subjectKey);
  const focusKey = learningFocus?.toUpperCase() || '';
  const cleanTopic = topic.trim() || 'บทเรียน';

  if (subjectKey === 'ENGLISH') {
    if (focusKey === 'SPEAKING' || focusKey === 'COMMUNICATION') {
      return [
        {
          id: 'evd-sug-1',
          evidenceType: 'SPEAKING',
          labelTh: 'การสนทนาโต้ตอบแบบคู่ (Pair Speaking Task)',
          description: `บทสนทนาถาม-ตอบและการพูดโต้ตอบเกี่ยวกับ ${cleanTopic} ในการทำงานเป็นคู่`,
          recommended: true,
          tag: 'แนะนำ',
        },
        {
          id: 'evd-sug-2',
          evidenceType: 'PERFORMANCE',
          labelTh: 'การแสดงบทบาทสมมติ (Role Play)',
          description: `การแสดงบทบาทสมมติเพื่อสื่อสารสถานการณ์จำลองเกี่ยวกับ ${cleanTopic} หน้าชั้นเรียน`,
          recommended: true,
          tag: 'แนะนำ',
        },
        {
          id: 'evd-sug-3',
          evidenceType: 'DISCUSSION',
          labelTh: 'การบันทึกเสียงสนทนาสั้น (Audio Clip Recording)',
          description: `คลิปเสียงการพูดแนะนำและสนทนาสั้น 1-2 นาทีเกี่ยวกับ ${cleanTopic}`,
          recommended: false,
          tag: 'ทางเลือก ICT',
        },
        {
          id: 'evd-sug-4',
          evidenceType: 'WORKSHEET',
          labelTh: 'ใบงานบันทึกข้อมูลการสำรวจคำตอบเพื่อน (Survey Worksheet)',
          description: `ใบกิจกรรมบันทึกคำตอบจากการสัมภาษณ์เพื่อนในชั้นเรียนเกี่ยวกับ ${cleanTopic}`,
          recommended: false,
          tag: 'ใบงานประกอบ',
        },
      ];
    } else if (focusKey === 'READING') {
      return [
        {
          id: 'evd-sug-1',
          evidenceType: 'WORKSHEET',
          labelTh: 'ใบงานอ่านจับใจความ (Reading Comprehension Sheet)',
          description: `ใบงานตอบคำถามและเขียนแผนภาพความคิดจากเรื่อง ${cleanTopic}`,
          recommended: true,
          tag: 'แนะนำหลัก',
        },
        {
          id: 'evd-sug-2',
          evidenceType: 'QUIZ',
          labelTh: 'แบบทดสอบย่อยวัดความเข้าใจ (Reading Quiz)',
          description: `แบบทดสอบสั้น 5-10 ข้อ วัดการจับใจความและคำศัพท์จากเรื่อง ${cleanTopic}`,
          recommended: false,
          tag: 'ทางเลือก',
        },
      ];
    }
  }

  if (subjectKey === 'MATHEMATICS') {
    if (focusKey === 'PROBLEM_SOLVING') {
      return [
        {
          id: 'evd-sug-1',
          evidenceType: 'WORKSHEET',
          labelTh: 'ใบงานแสดงขั้นตอนวิธีแก้โจทย์ปัญหา (Problem Solving Worksheet)',
          description: `ใบงานแสดงการวิเคราะห์โจทย์ การวางแผน ขั้นตอนการแก้ปัญหา และคำตอบเรื่อง ${cleanTopic}`,
          recommended: true,
          tag: 'แนะนำหลัก',
        },
        {
          id: 'evd-sug-2',
          evidenceType: 'PRODUCT',
          labelTh: 'ผลงานกลุ่มบันทึกกระบวนการคิด (Group Problem Solving Poster)',
          description: `โปสเตอร์หรือแผ่นบันทึกแนวทางการแก้โจทย์ประยุกต์ร่วมกันในกลุ่มเรื่อง ${cleanTopic}`,
          recommended: true,
          tag: 'แนะนำกลุ่ม',
        },
        {
          id: 'evd-sug-3',
          evidenceType: 'OBSERVATION',
          labelTh: 'แบบสังเกตการให้เหตุผลและการอภิปรายคำตอบ (Math Reasoning Log)',
          description: `การอธิบายเหตุผลและตรวจสอบความสมเหตุสมผลของคำตอบระหว่างกิจกรรมชั้นเรียน`,
          recommended: false,
          tag: 'กระบวนการ',
        },
      ];
    } else {
      return [
        {
          id: 'evd-sug-1',
          evidenceType: 'WORKSHEET',
          labelTh: 'แบบฝึกทักษะการคำนวณ (Calculation Practice Sheet)',
          description: `แบบฝึกทักษะการคำนวณและแสดงวิธีทำเรื่อง ${cleanTopic}`,
          recommended: true,
          tag: 'แนะนำหลัก',
        },
        {
          id: 'evd-sug-2',
          evidenceType: 'QUIZ',
          labelTh: 'แบบทดสอบย่อยท้ายคาบ (Exit Quiz)',
          description: `แบบทดสอบสั้นตรวจสอบความถูกต้องแม่นยำในการหาคำตอบ`,
          recommended: false,
          tag: 'ทางเลือก',
        },
      ];
    }
  }

  if (subjectKey === 'SCIENCE') {
    return [
      {
        id: 'evd-sug-1',
        evidenceType: 'EXPERIMENT',
        labelTh: 'ใบบันทึกผลการทดลองและตารางข้อมูล (Lab Report & Data Table)',
        description: `ตารางบันทึกผลการสังเกตและข้อมูลที่ได้จากการทดลองเรื่อง ${cleanTopic}`,
        recommended: true,
        tag: 'แนะนำหลัก',
      },
      {
        id: 'evd-sug-2',
        evidenceType: 'OBSERVATION',
        labelTh: 'แบบประเมินทักษะปฏิบัติการทดลอง (Lab Process Observation)',
        description: `การสังเกตทักษะการใช้อุปกรณ์ ความถูกต้องในขั้นตอน และความปลอดภัยในการทดลอง`,
        recommended: true,
        tag: 'กระบวนการ',
      },
      {
        id: 'evd-sug-3',
        evidenceType: 'PRODUCT',
        labelTh: 'แผนภาพสรุปและอภิปรายผลการทดลอง (Conclusion & Concept Map)',
        description: `แผนภาพความคิดหรือบทสรุปความสัมพันธ์ของตัวแปรและผลการทดลอง`,
        recommended: false,
        tag: 'ผลงานสรุป',
      },
    ];
  }

  // Fallback for Thai, Social Studies, Art, PE, etc.
  return [
    {
      id: 'evd-sug-1',
      evidenceType: 'WORKSHEET',
      labelTh: `ใบกิจกรรมการเรียนรู้เรื่อง ${cleanTopic}`,
      description: `ใบงานบันทึกผลการปฏิบัติและการตอบคำถามสำคัญประจำบทเรียน`,
      recommended: true,
      tag: 'แนะนำหลัก',
    },
    {
      id: 'evd-sug-2',
      evidenceType: 'PRODUCT',
      labelTh: `ชิ้นงาน/ผลงานสรุปความรู้ (Student Artifact)`,
      description: `ผลงานสรุปแนวคิด แผนผัง หรือชิ้นงานสร้างสรรค์จากกิจกรรมการเรียนรู้`,
      recommended: true,
      tag: 'ชิ้นงาน',
    },
    {
      id: 'evd-sug-3',
      evidenceType: 'OBSERVATION',
      labelTh: `การสังเกตพฤติกรรมการมีส่วนร่วมและการทำงานกลุ่ม`,
      description: `แบบบันทึกการสังเกตความร่วมมือและการสื่อสารระหว่างปฏิบัติกิจกรรม`,
      recommended: false,
      tag: 'การสังเกต',
    },
  ];
}
