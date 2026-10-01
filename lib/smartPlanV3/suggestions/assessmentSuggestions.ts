import { AssessmentCandidate } from './types';
import { V3AssessmentType, V3AssessmentToolType, V3CriteriaType } from '../types';

interface GenerateAssessmentOptions {
  subjectKey: string;
  learningFocus?: string | null;
  topic?: string;
  primaryEvidenceType?: string;
}

/**
 * Generate curated assessment suggestions matching subject rules and learning evidence.
 */
export function getAssessmentSuggestions({
  subjectKey,
  learningFocus,
  topic = '',
  primaryEvidenceType = '',
}: GenerateAssessmentOptions): AssessmentCandidate[] {
  const cleanTopic = topic.trim() || 'บทเรียน';
  const focusKey = learningFocus?.toUpperCase() || '';
  const evdType = primaryEvidenceType?.toUpperCase() || '';

  // 1. ENGLISH SPEAKING / PERFORMANCE
  if (subjectKey === 'ENGLISH' && (focusKey === 'SPEAKING' || evdType === 'SPEAKING' || evdType === 'PERFORMANCE')) {
    return [
      {
        id: 'asm-sug-1',
        name: `แบบประเมินทักษะการพูดสื่อสารเรื่อง ${cleanTopic}`,
        type: 'PERFORMANCE' as V3AssessmentType,
        method: 'การสังเกตและประเมินการพูดสนทนากลุ่ม/คู่ โดยใช้เกณฑ์รูบริก',
        toolType: 'PERFORMANCE_RUBRIC' as V3AssessmentToolType,
        toolTitle: `เกณฑ์รูบริกประเมินการพูดสื่อสาร (4 ระดับ)`,
        criteriaType: 'RUBRIC_LEVEL' as V3CriteriaType,
        criteriaValue: 3,
        criteriaText: 'ผ่านเกณฑ์ระดับคุณภาพ 3 (ดี) ขึ้นไป ในด้านความถูกต้อง ความคล่องแคล่ว และการสื่อความหมาย',
        isRecommended: true,
        description: 'เกณฑ์รูบริก 4 ระดับคุณภาพ ประเมินด้านความถูกต้องทางภาษา (Grammar & Vocabulary), ความคล่องแคล่ว (Fluency), และการสื่อความหมาย (Communication)',
        sampleDescriptors: [
          'ระดับ 4 (ดีมาก): สื่อสารได้คล่องแคล่ว ออกเสียงถูกต้องชัดเจน ใช้คำศัพท์และโครงสร้างประโยคได้เหมาะสมและหลากหลาย',
          'ระดับ 3 (ดี): สื่อสารได้ต่อเนื่อง ออกเสียงถูกต้องเป็นส่วนใหญ่ ใช้คำศัพท์ตรงตามบริบท สื่อความหมายได้ชัดเจน',
          'ระดับ 2 (พอใช้): สื่อสารได้แต่มีติดขัดเป็นระยะ ออกเสียงผิดบางคำ แต่ยังพอสื่อความหมายได้',
          'ระดับ 1 (ปรับปรุง): สื่อสารได้น้อยมาก ออกเสียงไม่ชัดเจน ต้องมีผู้ช่วยเหลือชี้แนะตลอดเวลา',
        ],
      },
      {
        id: 'asm-sug-2',
        name: `แบบตรวจสอบรายการการมีส่วนร่วมในการสนทนา (Speaking Checklist)`,
        type: 'OBSERVATION' as V3AssessmentType,
        method: 'การสังเกตพฤติกรรมการสนทนาและการตอบรับคู่สนทนา',
        toolType: 'CHECKLIST' as V3AssessmentToolType,
        toolTitle: `แบบตรวจสอบรายการการพูดคู่`,
        criteriaType: 'ITEMS_PASSED' as V3CriteriaType,
        criteriaValue: 4,
        criteriaText: 'ผ่านอย่างน้อย 4 ใน 5 รายการที่กำหนด',
        isRecommended: false,
        description: 'ตรวจสอบพฤติกรรมที่สังเกตได้ เช่น ถามตรงประเด็น ตอบตรงคำถาม สบตาผู้ฟัง ใช้ภาษากายเหมาะสม',
      },
      {
        id: 'asm-sug-3',
        name: `การประเมินตั๋วออกจากห้องเรียน (Exit Ticket)`,
        type: 'EXIT_TICKET' as V3AssessmentType,
        method: 'การตอบคำถามสั้นหรือพูดประโยคสรุป 1 ประโยคก่อนหมดคาบ',
        toolType: 'EXIT_TICKET' as V3AssessmentToolType,
        toolTitle: `ตั๋วคำถามท้ายคาบ (Exit Ticket)`,
        criteriaType: 'PASS_FAIL' as V3CriteriaType,
        criteriaValue: 1,
        criteriaText: 'ตอบคำถามหรือสื่อสารประโยคสรุปได้ถูกต้องตามโครงสร้าง',
        isRecommended: false,
        description: 'เช็คความเข้าใจภาพรวมของนักเรียนทุกคนอย่างรวดเร็วก่อนออกจากห้องเรียน',
      },
    ];
  }

  // 2. MATHEMATICS PROBLEM SOLVING
  if (subjectKey === 'MATHEMATICS' && (focusKey === 'PROBLEM_SOLVING' || evdType === 'WORKSHEET' || evdType === 'PROBLEM_SET')) {
    return [
      {
        id: 'asm-sug-1',
        name: `เกณฑ์การให้คะแนนการแก้โจทย์ปัญหาเรื่อง ${cleanTopic}`,
        type: 'WRITTEN_RESPONSE' as V3AssessmentType,
        method: 'การตรวจการแสดงวิธีทำและขั้นตอนการแก้ปัญหาในใบงาน',
        toolType: 'SCORING_GUIDE' as V3AssessmentToolType,
        toolTitle: `เกณฑ์การให้คะแนนตามขั้นตอนของโพลยา (Scoring Guide)`,
        criteriaType: 'PERCENTAGE' as V3CriteriaType,
        criteriaValue: 70,
        criteriaText: 'ได้คะแนนไม่น้อยกว่าร้อยละ 70 ของคะแนนเต็ม',
        isRecommended: true,
        description: 'ให้คะแนนแยกตามขั้นตอน: 1) ความเข้าใจปัญหา (2 คะแนน) 2) การวางแผน (2 คะแนน) 3) การดำเนินการตามแผน (4 คะแนน) 4) การตรวจสอบความสมเหตุสมผล (2 คะแนน)',
      },
      {
        id: 'asm-sug-2',
        name: `รูบริกประเมินการให้เหตุผลทางคณิตศาสตร์`,
        type: 'PRODUCT' as V3AssessmentType,
        method: 'การประเมินผลงานกลุ่มหรือโปสเตอร์แนวคิด',
        toolType: 'RUBRIC' as V3AssessmentToolType,
        toolTitle: `รูบริกการให้เหตุผลและการสื่อความหมายทางคณิตศาสตร์`,
        criteriaType: 'RUBRIC_LEVEL' as V3CriteriaType,
        criteriaValue: 3,
        criteriaText: 'ผ่านระดับคุณภาพ 3 (ดี) ขึ้นไป',
        isRecommended: false,
        description: 'ประเมินความถูกต้องของแบบจำลองคณิตศาสตร์ การใช้สัญลักษณ์ และความสมเหตุสมผลของข้อสรุป',
      },
    ];
  }

  // 3. SCIENCE EXPERIMENT
  if (subjectKey === 'SCIENCE' || evdType === 'EXPERIMENT') {
    return [
      {
        id: 'asm-sug-1',
        name: `แบบประเมินทักษะกระบวนการและการทดลองเรื่อง ${cleanTopic}`,
        type: 'EXPERIMENT' as V3AssessmentType,
        method: 'การสังเกตการปฏิบัติการทดลองและการตรวจใบบันทึกผล',
        toolType: 'PERFORMANCE_RUBRIC' as V3AssessmentToolType,
        toolTitle: `เกณฑ์รูบริกทักษะปฏิบัติการทดลอง (4 ระดับ)`,
        criteriaType: 'RUBRIC_LEVEL' as V3CriteriaType,
        criteriaValue: 3,
        criteriaText: 'ผ่านระดับคุณภาพ 3 (ดี) ขึ้นไป',
        isRecommended: true,
        description: 'ประเมิน 3 มิติ: 1) การใช้อุปกรณ์และความปลอดภัย 2) ความถูกต้องในการบันทึกข้อมูล 3) การวิเคราะห์และสรุปผลอิงหลักฐาน',
      },
      {
        id: 'asm-sug-2',
        name: `แบบตรวจสอบขั้นตอนปฏิบัติการทางวิทยาศาสตร์`,
        type: 'OBSERVATION' as V3AssessmentType,
        method: 'การตรวจเช็คขั้นตอนการควบคุมตัวแปรและการจัดการอุปกรณ์',
        toolType: 'CHECKLIST' as V3AssessmentToolType,
        toolTitle: `Checklist ความปลอดภัยและขั้นตอนการทดลอง`,
        criteriaType: 'ITEMS_PASSED' as V3CriteriaType,
        criteriaValue: 5,
        criteriaText: 'ผ่านอย่างน้อย 5 ใน 6 รายการความปลอดภัย',
        isRecommended: false,
        description: 'ตรวจเช็ครายการสำคัญด้านความปลอดภัยและการรักษาความสะอาดในห้องทดลอง',
      },
    ];
  }

  // Generic fallback
  return [
    {
      id: 'asm-sug-1',
      name: `การประเมินใบงานและผลการปฏิบัติกิจกรรมเรื่อง ${cleanTopic}`,
      type: 'PRODUCT' as V3AssessmentType,
      method: 'การตรวจผลงานและแบบบันทึกกิจกรรมการเรียนรู้',
      toolType: 'SCORING_GUIDE' as V3AssessmentToolType,
      toolTitle: `เกณฑ์การให้คะแนนผลงาน (Scoring Guide)`,
      criteriaType: 'PERCENTAGE' as V3CriteriaType,
      criteriaValue: 70,
      criteriaText: 'ได้คะแนนไม่น้อยกว่าร้อยละ 70',
      isRecommended: true,
      description: 'ประเมินความถูกต้องของเนื้อหา ความครบถ้วนของประเด็น และความเป็นระเบียบเรียบร้อย',
    },
    {
      id: 'asm-sug-2',
      name: `แบบสังเกตพฤติกรรมการมีส่วนร่วมในการเรียนรู้`,
      type: 'OBSERVATION' as V3AssessmentType,
      method: 'การสังเกตความร่วมมือและการแลกเปลี่ยนความคิดเห็นในชั้นเรียน',
      toolType: 'OBSERVATION_FORM' as V3AssessmentToolType,
      toolTitle: `แบบสังเกตพฤติกรรมการเรียนรู้`,
      criteriaType: 'PASS_FAIL' as V3CriteriaType,
      criteriaValue: 1,
      criteriaText: 'มีส่วนร่วมในกิจกรรมการเรียนรู้ตามที่ได้รับมอบหมาย',
      isRecommended: false,
      description: 'สังเกตความกระตือรือร้น การตอบคำถาม และการร่วมกิจกรรมกลุ่ม',
    },
  ];
}
