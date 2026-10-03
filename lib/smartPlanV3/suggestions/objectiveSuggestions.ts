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
 * Generate 3 distinct K-P-A objective candidates (Knowledge / Process / Attitude)
 * Strictly deterministic and grounded in OBEC / ว.PA standards & Bloom's taxonomy.
 */
export function getObjectiveSuggestions({
  subjectKey,
  learningFocus,
  topic,
  indicatorText = '',
  durationMinutes = 60,
}: GenerateObjectiveOptions): ObjectiveCandidate[] {
  const cleanTopic = topic.trim() || 'บทเรียน';
  const focusKey = learningFocus?.toUpperCase() || '';

  // Extract clean indicator core if available
  const cleanIndicator = indicatorText.replace(/^[ตคยวสศงพ]\s*\d+(\.\d+)?\s*(ม\.\d+\/\d+|ป\.\d+\/\d+)?\s*[-—:]?\s*/i, '').trim();

  // ──────────────────────────────────────────────────────────────────────────
  // ENGLISH (ภาษาต่างประเทศ / ภาษาอังกฤษ)
  // ──────────────────────────────────────────────────────────────────────────
  if (subjectKey === 'ENGLISH' || subjectKey === 'FOREIGN_LANGUAGE') {
    if (focusKey === 'SPEAKING' || focusKey === 'COMMUNICATION') {
      return [
        {
          id: 'obj-sug-k',
          category: 'K',
          categoryLabelTh: 'ด้านความรู้ (Knowledge: K)',
          categoryBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
          level: 'FOUNDATION',
          levelLabelTh: 'K - ด้านความรู้',
          levelBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
          statement: `นักเรียนสามารถอธิบายโครงสร้างประโยคและระบุความหมายของคำศัพท์เกี่ยวกับ ${cleanTopic} ได้อย่างถูกต้อง (K)`,
          rationale: 'เน้นความถูกต้องของโครงสร้างภาษาและการจำแนกคำศัพท์ตามกรอบ CEFR',
          observableVerb: 'อธิบายและระบุ',
        },
        {
          id: 'obj-sug-p',
          category: 'P',
          categoryLabelTh: 'ด้านทักษะกระบวนการ (Process: P)',
          categoryBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          level: 'TARGET',
          levelLabelTh: 'P - ด้านทักษะ/ปฏิบัติ (เป้าหมายหลัก)',
          levelBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          statement: `นักเรียนสามารถพูดสนทนาถาม-ตอบและออกเสียงสื่อสารเกี่ยวกับ ${cleanTopic} กับคู่สนทนาได้อย่างคล่องแคล่วและถูกต้องตามสถานการณ์ (P)`,
          rationale: 'วัดการสื่อสารสองทางตามเป้าหมายของคาบเรียน มีเกณฑ์เชิงปริมาณและคุณภาพที่สังเกตได้',
          observableVerb: 'พูดสนทนาและออกเสียงสื่อสาร',
        },
        {
          id: 'obj-sug-a',
          category: 'A',
          categoryLabelTh: 'ด้านคุณลักษณะ/เจตคติ (Attitude: A)',
          categoryBadgeCls: 'bg-amber-100 text-amber-800 border-amber-200',
          level: 'EXTENDED',
          levelLabelTh: 'A - คุณลักษณะอันพึงประสงค์',
          levelBadgeCls: 'bg-amber-100 text-amber-800 border-amber-200',
          statement: `นักเรียนมีความกระตือรือร้น ใฝ่เรียนรู้ และมีความมั่นใจกล้าแสดงออกในการสื่อสารภาษาอังกฤษ (A)`,
          rationale: 'ส่งเสริมเจตคติเชิงบวก ความกล้าใช้ภาษา และคุณลักษณะอันพึงประสงค์ตามหลักสูตร',
          observableVerb: 'ใฝ่เรียนรู้และกล้าแสดงออก',
        },
      ];
    } else if (focusKey === 'READING') {
      return [
        {
          id: 'obj-sug-k',
          category: 'K',
          categoryLabelTh: 'ด้านความรู้ (Knowledge: K)',
          categoryBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
          level: 'FOUNDATION',
          levelLabelTh: 'K - ด้านความรู้',
          levelBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
          statement: `นักเรียนสามารถบอกความหมายของคำศัพท์สำคัญและระบุใจความสำคัญจากเรื่อง ${cleanTopic} ที่อ่านได้อย่างถูกต้อง (K)`,
          rationale: 'เน้นการถอดรหัสความหมายและระบุสาระสำคัญระดับข้อความ',
          observableVerb: 'บอกความหมายและระบุใจความสำคัญ',
        },
        {
          id: 'obj-sug-p',
          category: 'P',
          categoryLabelTh: 'ด้านทักษะกระบวนการ (Process: P)',
          categoryBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          level: 'TARGET',
          levelLabelTh: 'P - ด้านทักษะ/ปฏิบัติ (เป้าหมายหลัก)',
          levelBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          statement: `นักเรียนสามารถตอบคำถามจับใจความ เรียงลำดับเหตุการณ์ และสรุปประเด็นจากบทอ่านเรื่อง ${cleanTopic} ได้ถูกต้องอย่างน้อยร้อยละ 70 (P)`,
          rationale: 'วัดความเข้าใจในการอ่านเชิงวิเคราะห์ตามตัวชี้วัด',
          observableVerb: 'ตอบคำถามและเรียงลำดับ',
        },
        {
          id: 'obj-sug-a',
          category: 'A',
          categoryLabelTh: 'ด้านคุณลักษณะ/เจตคติ (Attitude: A)',
          categoryBadgeCls: 'bg-amber-100 text-amber-800 border-amber-200',
          level: 'EXTENDED',
          levelLabelTh: 'A - คุณลักษณะอันพึงประสงค์',
          levelBadgeCls: 'bg-amber-100 text-amber-800 border-amber-200',
          statement: `นักเรียนมีวินัย มีนิสัยรักการอ่าน และมุ่งมั่นในการสืบค้นข้อมูลความรู้เพิ่มเติม (A)`,
          rationale: 'ปลูกฝังนิสัยรักการอ่านและการเรียนรู้ตลอดชีวิต',
          observableVerb: 'มีวินัยและมุ่งมั่น',
        },
      ];
    } else if (focusKey === 'WRITING') {
      return [
        {
          id: 'obj-sug-k',
          category: 'K',
          categoryLabelTh: 'ด้านความรู้ (Knowledge: K)',
          categoryBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
          level: 'FOUNDATION',
          levelLabelTh: 'K - ด้านความรู้',
          levelBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
          statement: `นักเรียนสามารถเขียนสะกดคำศัพท์และอธิบายโครงสร้างไวยากรณ์ที่ใช้ในการเขียนเกี่ยวกับ ${cleanTopic} ได้ถูกต้อง (K)`,
          rationale: 'สร้างความแม่นยำในการเขียนระดับคำและโครงสร้างประโยค',
          observableVerb: 'เขียนสะกดคำและอธิบายโครงสร้าง',
        },
        {
          id: 'obj-sug-p',
          category: 'P',
          categoryLabelTh: 'ด้านทักษะกระบวนการ (Process: P)',
          categoryBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          level: 'TARGET',
          levelLabelTh: 'P - ด้านทักษะ/ปฏิบัติ (เป้าหมายหลัก)',
          levelBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          statement: `นักเรียนสามารถเขียนประโยคบรรยายหรือข้อความสั้นเกี่ยวกับ ${cleanTopic} ได้อย่างถูกต้องตามหลักไวยากรณ์และสื่อความหมายชัดเจน (P)`,
          rationale: 'มุ่งเน้นการสื่อสารความหมายในการเขียนตามกรอบตัวชี้วัด',
          observableVerb: 'เขียนประโยคบรรยาย',
        },
        {
          id: 'obj-sug-a',
          category: 'A',
          categoryLabelTh: 'ด้านคุณลักษณะ/เจตคติ (Attitude: A)',
          categoryBadgeCls: 'bg-amber-100 text-amber-800 border-amber-200',
          level: 'EXTENDED',
          levelLabelTh: 'A - คุณลักษณะอันพึงประสงค์',
          levelBadgeCls: 'bg-amber-100 text-amber-800 border-amber-200',
          statement: `นักเรียนมีความละเอียดรอบคอบ มุ่งมั่นในการทำงาน และตรวจทานงานเขียนของตนเองอย่างสม่ำเสมอ (A)`,
          rationale: 'ส่งเสริมวินัยการตรวจทานงานและจิตพิสัยในการทำงาน',
          observableVerb: 'มีความรอบคอบและมุ่งมั่น',
        },
      ];
    } else {
      // General English Communicative default
      return [
        {
          id: 'obj-sug-k',
          category: 'K',
          categoryLabelTh: 'ด้านความรู้ (Knowledge: K)',
          categoryBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
          level: 'FOUNDATION',
          levelLabelTh: 'K - ด้านความรู้',
          levelBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
          statement: `นักเรียนสามารถอธิบายโครงสร้างไวยากรณ์และระบุความหมายของคำศัพท์เกี่ยวกับ ${cleanTopic} ได้อย่างถูกต้อง (K)`,
          rationale: 'ความรู้ความเข้าใจด้านคำศัพท์และโครงสร้างภาษาตามกรอบ CEFR',
          observableVerb: 'อธิบายและระบุ',
        },
        {
          id: 'obj-sug-p',
          category: 'P',
          categoryLabelTh: 'ด้านทักษะกระบวนการ (Process: P)',
          categoryBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          level: 'TARGET',
          levelLabelTh: 'P - ด้านทักษะ/ปฏิบัติ (เป้าหมายหลัก)',
          levelBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          statement: `นักเรียนสามารถแต่งประโยคและพูดสื่อสารเกี่ยวกับ ${cleanTopic} ได้อย่างถูกต้องและคล่องแคล่ว (P)`,
          rationale: 'ทักษะการปฏิบัติและการสื่อสารเชิงสถานการณ์จริง',
          observableVerb: 'แต่งประโยคและพูดสื่อสาร',
        },
        {
          id: 'obj-sug-a',
          category: 'A',
          categoryLabelTh: 'ด้านคุณลักษณะ/เจตคติ (Attitude: A)',
          categoryBadgeCls: 'bg-amber-100 text-amber-800 border-amber-200',
          level: 'EXTENDED',
          levelLabelTh: 'A - คุณลักษณะอันพึงประสงค์',
          levelBadgeCls: 'bg-amber-100 text-amber-800 border-amber-200',
          statement: `นักเรียนมีความกระตือรือร้น ใฝ่เรียนรู้ และมีความมั่นใจในการใช้ภาษาอังกฤษเพื่อการสื่อสาร (A)`,
          rationale: 'ส่งเสริมเจตคติที่ดีและคุณลักษณะอันพึงประสงค์ตามหลักสูตรแกนกลาง',
          observableVerb: 'ใฝ่เรียนรู้และมั่นใจ',
        },
      ];
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MATHEMATICS
  // ──────────────────────────────────────────────────────────────────────────
  if (subjectKey === 'MATHEMATICS') {
    return [
      {
        id: 'obj-sug-k',
        category: 'K',
        categoryLabelTh: 'ด้านความรู้ (Knowledge: K)',
        categoryBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
        level: 'FOUNDATION',
        levelLabelTh: 'K - ด้านความรู้',
        levelBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
        statement: `นักเรียนสามารถอธิบายมโนทัศน์ สมบัติ และหลักการทางคณิตศาสตร์เรื่อง ${cleanTopic} ได้อย่างถูกต้อง (K)`,
        rationale: 'เน้นความเข้าใจเชิงมโนทัศน์ (Conceptual Understanding)',
        observableVerb: 'อธิบายมโนทัศน์',
      },
      {
        id: 'obj-sug-p',
        category: 'P',
        categoryLabelTh: 'ด้านทักษะกระบวนการ (Process: P)',
        categoryBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        level: 'TARGET',
        levelLabelTh: 'P - ด้านทักษะ/ปฏิบัติ (เป้าหมายหลัก)',
        levelBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        statement: `นักเรียนสามารถคำนวณ วางแผน และแสดงขั้นตอนการแก้โจทย์ปัญหาเรื่อง ${cleanTopic} ได้อย่างถูกต้องและเป็นระบบ (P)`,
        rationale: 'ความคล่องแคล่วในการคำนวณและการแก้ปัญหาตามขั้นตอนวิธี',
        observableVerb: 'คำนวณและแสดงวิธีทำ',
      },
      {
        id: 'obj-sug-a',
        category: 'A',
        categoryLabelTh: 'ด้านคุณลักษณะ/เจตคติ (Attitude: A)',
        categoryBadgeCls: 'bg-amber-100 text-amber-800 border-amber-200',
        level: 'EXTENDED',
        levelLabelTh: 'A - คุณลักษณะอันพึงประสงค์',
        levelBadgeCls: 'bg-amber-100 text-amber-800 border-amber-200',
        statement: `นักเรียนมีความละเอียดรอบคอบ มุ่งมั่นในการทำงาน และมีเจตคติที่ดีต่อคณิตศาสตร์ (A)`,
        rationale: 'สร้างวินัยความรอบคอบในการคิดคำนวณและเจตคติที่ดี',
        observableVerb: 'มีความรอบคอบและมุ่งมั่น',
      },
    ];
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SCIENCE
  // ──────────────────────────────────────────────────────────────────────────
  if (subjectKey === 'SCIENCE') {
    return [
      {
        id: 'obj-sug-k',
        category: 'K',
        categoryLabelTh: 'ด้านความรู้ (Knowledge: K)',
        categoryBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
        level: 'FOUNDATION',
        levelLabelTh: 'K - ด้านความรู้',
        levelBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
        statement: `นักเรียนสามารถระบุและอธิบายหลักการทางวิทยาศาสตร์เกี่ยวกับ ${cleanTopic} ได้อย่างถูกต้อง (K)`,
        rationale: 'ความรู้ความเข้าใจพื้นฐานเชิงวิทยาศาสตร์',
        observableVerb: 'ระบุและอธิบาย',
      },
      {
        id: 'obj-sug-p',
        category: 'P',
        categoryLabelTh: 'ด้านทักษะกระบวนการ (Process: P)',
        categoryBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        level: 'TARGET',
        levelLabelTh: 'P - ด้านทักษะ/ปฏิบัติ (เป้าหมายหลัก)',
        levelBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        statement: `นักเรียนสามารถปฏิบัติการทดลอง/สำรวจ บันทึกผล และแปลความหมายข้อมูลเรื่อง ${cleanTopic} โดยใช้หลักฐานเชิงประจักษ์ได้ (P)`,
        rationale: 'ทักษะกระบวนการทางวิทยาศาสตร์และการลงมือปฏิบัติจริง',
        observableVerb: 'ปฏิบัติการทดลองและแปลผล',
      },
      {
        id: 'obj-sug-a',
        category: 'A',
        categoryLabelTh: 'ด้านคุณลักษณะ/เจตคติ (Attitude: A)',
        categoryBadgeCls: 'bg-amber-100 text-amber-800 border-amber-200',
        level: 'EXTENDED',
        levelLabelTh: 'A - คุณลักษณะอันพึงประสงค์',
        levelBadgeCls: 'bg-amber-100 text-amber-800 border-amber-200',
        statement: `นักเรียนมีความซื่อสัตย์ในการบันทึกข้อมูล ใฝ่เรียนรู้ และทำงานร่วมกับผู้อื่นได้อย่างสร้างสรรค์ (A)`,
        rationale: 'ส่งเสริมจิตวิทยาศาสตร์และการทำงานเป็นทีม',
        observableVerb: 'มีความซื่อสัตย์และใฝ่เรียนรู้',
      },
    ];
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GENERIC FALLBACK (Thai, Social Studies, Arts, PE, Health, etc.)
  // ──────────────────────────────────────────────────────────────────────────
  const baseContent = cleanIndicator || cleanTopic;
  return [
    {
      id: 'obj-sug-k',
      category: 'K',
      categoryLabelTh: 'ด้านความรู้ (Knowledge: K)',
      categoryBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
      level: 'FOUNDATION',
      levelLabelTh: 'K - ด้านความรู้',
      levelBadgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
      statement: `นักเรียนสามารถอธิบายความรู้และหลักการสำคัญเกี่ยวกับ ${baseContent} ได้อย่างถูกต้อง (K)`,
      rationale: 'ความรู้ความจำและความเข้าใจพื้นฐานในเนื้อหาบทเรียน',
      observableVerb: 'อธิบายความรู้',
    },
    {
      id: 'obj-sug-p',
      category: 'P',
      categoryLabelTh: 'ด้านทักษะกระบวนการ (Process: P)',
      categoryBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      level: 'TARGET',
      levelLabelTh: 'P - ด้านทักษะ/ปฏิบัติ (เป้าหมายหลัก)',
      levelBadgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      statement: `นักเรียนสามารถปฏิบัติกิจกรรมหรือประยุกต์ใช้ทักษะเรื่อง ${baseContent} ได้ตามเกณฑ์ที่กำหนดในคาบเรียน ${durationMinutes} นาที (P)`,
      rationale: 'ทักษะและการนำไปใช้จริงสอดคล้องกับตัวชี้วัด',
      observableVerb: 'ปฏิบัติกิจกรรมหรือประยุกต์ใช้',
    },
    {
      id: 'obj-sug-a',
      category: 'A',
      categoryLabelTh: 'ด้านคุณลักษณะ/เจตคติ (Attitude: A)',
      categoryBadgeCls: 'bg-amber-100 text-amber-800 border-amber-200',
      level: 'EXTENDED',
      levelLabelTh: 'A - คุณลักษณะอันพึงประสงค์',
      levelBadgeCls: 'bg-amber-100 text-amber-800 border-amber-200',
      statement: `นักเรียนมีความมุ่งมั่นในการทำงาน ใฝ่เรียนรู้ และมีส่วนร่วมในกิจกรรมการเรียนรู้อย่างมีความรับผิดชอบ (A)`,
      rationale: 'การคิดวิเคราะห์ขั้นสูงและเจตคติคุณค่า',
      observableVerb: 'มีความมุ่งมั่นและรับผิดชอบ',
    },
  ];
}
