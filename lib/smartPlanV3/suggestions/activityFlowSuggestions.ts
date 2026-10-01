import { ActivityFlowCandidate } from './types';
import { V3BlueprintActivityDraft } from '../types';

interface ActivityFlowOptions {
  subjectKey: string;
  learningFocus?: string | null;
  topic?: string;
  durationMinutes?: number;
  objectiveIds?: string[];
  evidenceIds?: string[];
}

interface RawActivityInput {
  phase: string;
  title: string;
  minutes: number;
  teacherActions: string | string[];
  studentActions: string | string[];
  quickCheck?: string;
  feedbackMethod?: string;
  linkedObjectiveIds?: string[];
  linkedEvidenceIds?: string[];
}

function toDrafts(rawList: RawActivityInput[]): V3BlueprintActivityDraft[] {
  return rawList.map((r, i) => ({
    temporaryId: `flow-act-${i + 1}`,
    phase: r.phase,
    title: r.title,
    minutes: r.minutes,
    teacherActions: Array.isArray(r.teacherActions) ? r.teacherActions : [r.teacherActions],
    studentActions: Array.isArray(r.studentActions) ? r.studentActions : [r.studentActions],
    linkedObjectiveRefs: r.linkedObjectiveIds && r.linkedObjectiveIds.length > 0 ? ['O1'] : [],
    linkedEvidenceRefs: r.linkedEvidenceIds && r.linkedEvidenceIds.length > 0 ? ['E1'] : [],
    formativeCheck: r.quickCheck ? { enabled: true, description: r.quickCheck } : undefined,
    feedback: r.feedbackMethod ? { enabled: true, description: r.feedbackMethod } : undefined,
  }));
}

/**
 * Normalizes minutes in draft activities so their sum strictly matches targetDuration.
 * Uses Largest Remainder Method with 5-minute increments when divisible by 5.
 */
function normalizeFlowMinutes(drafts: V3BlueprintActivityDraft[], targetDuration: number): V3BlueprintActivityDraft[] {
  if (!drafts || drafts.length === 0) return [];
  const currentTotal = drafts.reduce((sum, d) => sum + (d.minutes || 0), 0);
  if (currentTotal === targetDuration) return drafts;

  const n = drafts.length;
  const useFiveMinStep = targetDuration % 5 === 0 && targetDuration >= n * 5;
  const unitSize = useFiveMinStep ? 5 : 1;
  const totalUnits = Math.round(targetDuration / unitSize);

  const weights = drafts.map((d) => Math.max(1, d.minutes || 5));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const idealUnits = weights.map((w) => (w / totalWeight) * totalUnits);
  const baseUnits = idealUnits.map((u) => Math.max(1, Math.floor(u)));
  let currentSum = baseUnits.reduce((sum, u) => sum + u, 0);

  if (currentSum < totalUnits) {
    const remainders = idealUnits.map((u, idx) => ({ idx, rem: u - baseUnits[idx] }));
    remainders.sort((a, b) => b.rem - a.rem);
    let diff = totalUnits - currentSum;
    for (let i = 0; i < remainders.length && diff > 0; i++) {
      baseUnits[remainders[i].idx] += 1;
      diff--;
    }
  } else if (currentSum > totalUnits) {
    const remainders = idealUnits.map((u, idx) => ({ idx, rem: u - baseUnits[idx] }));
    remainders.sort((a, b) => a.rem - b.rem);
    let diff = currentSum - totalUnits;
    for (let i = 0; i < remainders.length && diff > 0; i++) {
      if (baseUnits[remainders[i].idx] > 1) {
        baseUnits[remainders[i].idx] -= 1;
        diff--;
      }
    }
  }

  return drafts.map((d, i) => ({
    ...d,
    minutes: baseUnits[i] * unitSize,
  }));
}

export function getActivityFlowSuggestions({
  subjectKey,
  learningFocus,
  topic = '',
  durationMinutes = 60,
  objectiveIds = [],
  evidenceIds = [],
}: ActivityFlowOptions): ActivityFlowCandidate[] {
  const cleanTopic = topic.trim() || 'บทเรียน';
  const focusKey = learningFocus?.toUpperCase() || '';
  const firstObj = objectiveIds[0] ? [objectiveIds[0]] : [];
  const firstEvd = evidenceIds[0] ? [evidenceIds[0]] : [];

  // 1. ENGLISH SPEAKING / COMMUNICATION
  if (subjectKey === 'ENGLISH') {
    const rawFlow1: RawActivityInput[] = [
      {
        phase: 'ENGAGE',
        title: `ขั้นนำเข้าสู่บทเรียน (Warm-up & Activation)`,
        minutes: 10,
        teacherActions: `ครูกล่าวทักทายและเปิดคลิปเสียงสั้นหรือภาพสถานการณ์จำลองเกี่ยวกับ ${cleanTopic} จากนั้นถามคำถามกระตุ้นความสนใจ`,
        studentActions: `นักเรียนดูภาพและตอบคำถามแสดงความคิดเห็นร่วมกันในชั้นเรียนเพื่อทบทวนคำศัพท์เดิม`,
        quickCheck: 'สังเกตการตอบคำถามและการออกเสียงคำศัพท์พื้นฐาน',
        feedbackMethod: 'ให้คำชมเชยและแก้ไขการออกเสียงทันทีเป็นรายบุคคล',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: [],
      },
      {
        phase: 'LEARN',
        title: `ขั้นนำเสนอโครงสร้างภาษา (Presentation & Model)`,
        minutes: 15,
        teacherActions: `ครูนำเสนอประโยคตัวอย่างและบทสนทนาเป้าหมายเกี่ยวกับ ${cleanTopic} สาธิตการออกเสียง Intonation และการเน้นเสียง`,
        studentActions: `นักเรียนฝึกออกเสียงตามครูพร้อมกัน (Choral Drill) และระบุโครงสร้างประโยคสำคัญในบทสนทนา`,
        quickCheck: 'สุ่มตรวจการออกเสียงเป็นรายแถวและรายบุคคล',
        feedbackMethod: 'ครูสะท้อนจุดที่ต้องปรับปรุงเรื่องจังหวะและการลงน้ำหนักเสียง',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: [],
      },
      {
        phase: 'PRACTICE',
        title: `ขั้นฝึกปฏิบัติแบบควบคุมและกึ่งควบคุม (Guided Practice)`,
        minutes: 15,
        teacherActions: `ครูแจก Speaking Cards หรือบัตรคำสถานการณ์เรื่อง ${cleanTopic} และอธิบายกติกาการฝึกพูดโต้ตอบ`,
        studentActions: `นักเรียนจับคู่ผลัดกันถาม-ตอบตามบัตรกิจกรรม โดยใช้โครงสร้างประโยคที่กำหนด`,
        quickCheck: 'เดินสังเกตการสนทนาของแต่ละคู่และบันทึกข้อผิดพลาดที่พบบ่อย',
        feedbackMethod: 'ให้คำแนะนำเสริมและสาธิตตัวอย่างเพิ่มเติมเมื่อนักเรียนติดขัด',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: firstEvd,
      },
      {
        phase: 'APPLY',
        title: `ขั้นนำไปใช้สื่อสารอิสระ (Pair Speaking & Performance)`,
        minutes: 15,
        teacherActions: `ครูมอบหมายภารกิจจำลองสถานการณ์จริง ให้นักเรียนสร้างบทสนทนาของตนเองเกี่ยวกับ ${cleanTopic}`,
        studentActions: `นักเรียนจับคู่สนทนาตามสถานการณ์และสลับคู่เพื่อนำเสนอหน้าชั้นเรียนหรือบันทึกเสียง`,
        quickCheck: 'ประเมินการสื่อสารโดยใช้เกณฑ์ Rubric หรือ Observation Checklist',
        feedbackMethod: 'ให้ข้อมูลย้อนกลับเชิงสร้างสรรค์เรื่องความคล่องและการสื่อความหมาย',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: firstEvd,
      },
      {
        phase: 'SUMMARIZE',
        title: `ขั้นสรุปและประเมินผลการเรียนรู้ (Wrap-up & Exit Ticket)`,
        minutes: 5,
        teacherActions: `ครูและนักเรียนร่วมกันสรุปคำศัพท์และสำนวนสำคัญ และแจก Exit Ticket สั้น`,
        studentActions: `นักเรียนพูดประโยคสรุปเกี่ยวกับ ${cleanTopic} 1 ประโยคก่อนออกจากห้องหรือเขียนตอบใน Exit Ticket`,
        quickCheck: 'ตรวจคำตอบ Exit Ticket ของนักเรียนทุกคน',
        feedbackMethod: 'ชื่นชมความพยายามและสรุปภาพรวมสิ่งที่ต้องพัฒนาในคาบต่อไป',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: firstEvd,
      },
    ];

    const rawFlow2: RawActivityInput[] = [
      {
        phase: 'ENGAGE',
        title: `ขั้นเตรียมความพร้อมก่อนทำภารกิจ (Pre-Task & Vocabulary Activation)`,
        minutes: 10,
        teacherActions: `ครูเปิดสถานการณ์ปัญหาเกี่ยวกับ ${cleanTopic} และนำเสนอคำศัพท์สำคัญที่จำเป็นต่อการปฏิบัติงาน`,
        studentActions: `นักเรียนระดมสมองและจับคู่คำศัพท์กับรูปภาพหรือความหมาย`,
        quickCheck: 'ตรวจความเข้าใจคำศัพท์ผ่านเกมสั้น 3 นาที',
        feedbackMethod: 'เสริมคำศัพท์ที่นักเรียนยังไม่คุ้นเคยทันที',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: [],
      },
      {
        phase: 'LEARN',
        title: `ขั้นสาธิตภารกิจภาษา (Task Demonstration & Information Gap)`,
        minutes: 15,
        teacherActions: `ครูสาธิตตัวอย่างกิจกรรม Information Gap ร่วมกับนักเรียนตัวแทน แสดงวิธีถามข้อมูลที่ตนเองไม่มี`,
        studentActions: `นักเรียนสังเกตบทบาทและการใช้ภาษาเพื่อแลกเปลี่ยนข้อมูล`,
        quickCheck: 'ถามคำถามตรวจสอบความเข้าใจในขั้นตอนการทำภารกิจ',
        feedbackMethod: 'ชี้แนะประเด็นที่ควรระวังในการสื่อสาร',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: [],
      },
      {
        phase: 'PRACTICE',
        title: `ขั้นปฏิบัติภารกิจสื่อสาร (Task Cycle & Pair Interview)`,
        minutes: 20,
        teacherActions: `ครูดูแลและคอยช่วยเหลือด้านภาษาขณะนักเรียนทำกิจกรรมสัมภาษณ์ข้อมูลเรื่อง ${cleanTopic}`,
        studentActions: `นักเรียนจับคู่สลับกันถาม-ตอบเพื่อเติมข้อมูลในตารางให้สมบูรณ์โดยห้ามดูเอกสารของคู่ตนเอง`,
        quickCheck: 'ประเมินการมีส่วนร่วมและความถูกต้องของข้อมูลที่ได้รับ',
        feedbackMethod: 'บันทึกภาษาที่นักเรียนใช้จริงเพื่อนำมาวิเคราะห์ร่วมกัน',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: firstEvd,
      },
      {
        phase: 'APPLY',
        title: `ขั้นรายงานผลและสะท้อนทักษะภาษา (Language Focus & Report)`,
        minutes: 10,
        teacherActions: `ครูสุ่มตัวแทนคู่ขึ้นมารายงานข้อมูลที่ได้ และนำประโยคที่น่าสนใจขึ้นกระดาน`,
        studentActions: `นักเรียนนำเสนอข้อมูลเพื่อน และร่วมกันวิเคราะห์โครงสร้างภาษาที่ใช้ในการสื่อสาร`,
        quickCheck: 'ประเมินความสามารถในการถ่ายทอดข้อมูลสรุป',
        feedbackMethod: 'ให้ข้อคิดเห็นเชิงพัฒนาด้านความถูกต้องและความเป็นธรรมชาติของภาษา',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: firstEvd,
      },
      {
        phase: 'SUMMARIZE',
        title: `ขั้นสรุปการเรียนรู้ส่วนบุคคล (Self-Reflection)`,
        minutes: 5,
        teacherActions: `ครูให้นักเรียนประเมินตนเองตามเป้าหมายประจำคาบ`,
        studentActions: `นักเรียนทำเครื่องหมายประเมินความมั่นใจในการพูดเกี่ยวกับ ${cleanTopic}`,
        quickCheck: 'ตรวจสอบแบบประเมินตนเองของนักเรียน',
        feedbackMethod: 'ให้กำลังใจและคำแนะนำเพิ่มเติมสำหรับผู้ที่ยังขาดความมั่นใจ',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: [],
      },
    ];

    const rawFlow3: RawActivityInput[] = [
      {
        phase: 'ENGAGE',
        title: `เกมทายคำและกระตุ้นการสื่อสาร (Language Game)`,
        minutes: 10,
        teacherActions: `ครูจัดเกม Miming หรือ 20 Questions เกี่ยวกับ ${cleanTopic}`,
        studentActions: `นักเรียนแข่งขันทายคำและพูดโต้ตอบด้วยประโยคสั้น`,
        quickCheck: 'สังเกตความตื่นตัวและการมีส่วนร่วมของนักเรียน',
        feedbackMethod: 'สร้างบรรยากาศที่ผ่อนคลายและกระตุ้นการพูดอย่างเป็นกันเอง',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: [],
      },
      {
        phase: 'LEARN',
        title: `บทเรียนขนาดย่อมและบัตรบทสนทนา (Mini-Lesson & Speaking Cards)`,
        minutes: 15,
        teacherActions: `ครูสอนโครงสร้างและสำนวนเฉพาะเจาะจง 2-3 รูปแบบสำหรับใช้สนทนาเรื่อง ${cleanTopic}`,
        studentActions: `นักเรียนบันทึกและฝึกพูดประโยคต้นแบบกับเพื่อนข้างๆ`,
        quickCheck: 'ตรวจฟังประโยคที่นักเรียนสร้างขึ้น',
        feedbackMethod: 'แนะนำคำศัพท์แทนเพื่อเพิ่มความหลากหลายของประโยค',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: [],
      },
      {
        phase: 'PRACTICE',
        title: `การพูดสนทนากลุ่มย่อยแบบหมุนเวียน (Speed Talking / Stations)`,
        minutes: 20,
        teacherActions: `ครูจัดแบ่งสถานีและกำหนดสัญญาณเปลี่ยนคู่สนทนาทุก 3-4 นาที`,
        studentActions: `นักเรียนหมุนเวียนพูดคุยกับเพื่อนใหม่ในหัวข้อ ${cleanTopic} เพื่อสร้างความคล่องแคล่ว`,
        quickCheck: 'สังเกตพัฒนาการความมั่นใจและความคล่องตัวในแต่ละรอบ',
        feedbackMethod: 'ให้ฟีดแบ็กกระตุ้นให้พูดต่อเนื่องและลดการกังวลเรื่องไวยากรณ์ในรอบแรก',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: firstEvd,
      },
      {
        phase: 'APPLY',
        title: `การนำเสนอคู่ยอดเยี่ยม (Spotlight Presentation)`,
        minutes: 10,
        teacherActions: `ครูเปิดโอกาสให้คู่ที่มีความโดดเด่นหรือพัฒนาขึ้นมากนำเสนอต่อหน้าชั้น`,
        studentActions: `เพื่อนในชั้นร่วมรับฟังและประเมินผ่านแบบตรวจสอบสั้น (Peer Checklist)`,
        quickCheck: 'ประเมินการสื่อสารโดยภาพรวม',
        feedbackMethod: 'เพื่อนและครูร่วมให้ข้อเสนอแนะเชิงบวก',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: firstEvd,
      },
      {
        phase: 'SUMMARIZE',
        title: `สรุปคำศัพท์และการนำไปใช้จริง (Real-World Wrap-up)`,
        minutes: 5,
        teacherActions: `ครูสรุปแนวทางการนำภาษาเรื่อง ${cleanTopic} ไปใช้ในชีวิตประจำวัน`,
        studentActions: `นักเรียนระบุ 1 ประโยคที่คิดว่าจะนำไปใช้จริงในชีวิตประจำวัน`,
        quickCheck: 'ตรวจสอบความเข้าใจสุดท้ายของนักเรียน',
        feedbackMethod: 'ชื่นชมความก้าวหน้าในการพูดของนักเรียนทุกคน',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: [],
      },
    ];

    return [
      {
        id: 'flow-1',
        name: 'แบบที่ 1: มาตรฐาน 2W3P เน้นการสื่อสารโต้ตอบจริง',
        patternName: '2W3P (Warm-up, Presentation, Practice, Production, Wrap-up)',
        stepsCount: 5,
        totalMinutes: durationMinutes,
        bestFor: 'เหมาะสำหรับพัฒนาทักษะการสนทนาตั้งแต่พื้นฐานจนถึงการนำไปใช้จริงอย่างเป็นระบบ',
        summary: [
          'นำเข้าสู่บทเรียนด้วยภาพและคำถามกระตุ้น (10 นาที)',
          'นำเสนอโครงสร้างภาษาและเสียงต้นแบบ (15 นาที)',
          'ฝึกปฏิบัติแบบควบคุมด้วย Speaking Cards (15 นาที)',
          'นำไปใช้สนทนาอิสระและการนำเสนอ (15 นาที)',
          'สรุปบทเรียนและประเมินด้วย Exit Ticket (5 นาที)',
        ],
        activities: normalizeFlowMinutes(toDrafts(rawFlow1), durationMinutes),
      },
      {
        id: 'flow-2',
        name: 'แบบที่ 2: การเรียนรู้ภาษาโดยเน้นภารกิจ (Task-Based Learning)',
        patternName: 'Task-Based Language Teaching (TBLT)',
        stepsCount: 5,
        totalMinutes: durationMinutes,
        bestFor: 'เหมาะสำหรับนักเรียนที่ชอบการทำงานเป็นทีม และต้องการใช้ภาษาเพื่อแก้โจทย์หรือค้นหาข้อมูล',
        summary: [
          'เตรียมความพร้อมและกระตุ้นคำศัพท์ที่จำเป็น (10 นาที)',
          'สาธิตภารกิจ Information Gap (15 นาที)',
          'ปฏิบัติภารกิจสัมภาษณ์แลกเปลี่ยนข้อมูล (20 นาที)',
          'รายงานผลและสะท้อนประเด็นภาษา (10 นาที)',
          'สะท้อนผลและประเมินตนเอง (5 นาที)',
        ],
        activities: normalizeFlowMinutes(toDrafts(rawFlow2), durationMinutes),
      },
      {
        id: 'flow-3',
        name: 'แบบที่ 3: กิจกรรมเกมจำลองสถานการณ์และความคล่องแคล่ว (Fluency-Focused)',
        patternName: 'Interactive Discovery & Fluency Stations',
        stepsCount: 5,
        totalMinutes: durationMinutes,
        bestFor: 'เหมาะสำหรับกระตุ้นความมั่นใจ ลดความประหม่า และเพิ่มความคล่องในการออกเสียง',
        summary: [
          'เกมกระตุ้นความสนใจและทายคำ (10 นาที)',
          'บทเรียนขนาดย่อมและแจกบัตรบทบาท (15 นาที)',
          'ฝึกพูดสนทนาแบบหมุนเวียนคู่ (20 นาที)',
          'นำเสนอคู่ยอดเยี่ยมและประเมินโดยเพื่อน (10 นาที)',
          'สรุปการนำไปใช้จริงในชีวิตประจำวัน (5 นาที)',
        ],
        activities: normalizeFlowMinutes(toDrafts(rawFlow3), durationMinutes),
      },
    ];
  }

  // 2. MATHEMATICS (Problem Solving / Concepts)
  if (subjectKey === 'MATHEMATICS') {
    const rawMath1: RawActivityInput[] = [
      {
        phase: 'ENGAGE',
        title: `ขั้นเผชิญสถานการณ์ปัญหา (Problem Context Engagement)`,
        minutes: 10,
        teacherActions: `ครูนำเสนอสถานการณ์ปัญหาในชีวิตจริงเกี่ยวกับ ${cleanTopic} ผ่านสื่อภาพหรือโจทย์เปิด`,
        studentActions: `นักเรียนอ่านสถานการณ์ ทำความเข้าใจ และระบุสิ่งที่โจทย์บอกกับสิ่งที่โจทย์ต้องการทราบ`,
        quickCheck: 'สุ่มถามการตีความสิ่งที่โจทย์กำหนด',
        feedbackMethod: 'ชี้แนะประเด็นเงื่อนไขสำคัญที่นักเรียนอาจมองข้าม',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: [],
      },
      {
        phase: 'LEARN',
        title: `ขั้นวางแผนและร่วมคิดกลยุทธ์ (Strategic Planning & Modeling)`,
        minutes: 15,
        teacherActions: `ครูชวนคิดเชื่อมโยงความรู้เดิม สังเกตรูปแบบ และสาธิตการใช้แผนภาพหรือตารางเพื่อวางแผนแก้ปัญหา`,
        studentActions: `นักเรียนร่วมกันเสนอแนวทางการแก้ปัญหา และทดลองเขียนประโยคสัญลักษณ์หรือแบบจำลอง`,
        quickCheck: 'ตรวจความสมเหตุสมผลของแบบจำลองคณิตศาสตร์',
        feedbackMethod: 'อธิบายทางเลือกของกลยุทธ์ต่างๆ ที่สามารถนำไปสู่คำตอบได้',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: [],
      },
      {
        phase: 'PRACTICE',
        title: `ขั้นลงมือแก้ปัญหาและแสดงขั้นตอนวิธี (Execution & Problem Solving)`,
        minutes: 20,
        teacherActions: `ครูแจกใบงานปัญหาเรื่อง ${cleanTopic} คอยสังเกตแนวคิดและให้คำแนะนำแบบชี้นำมิใช่บอกคำตอบ`,
        studentActions: `นักเรียนลงมือแก้โจทย์ปัญหาเป็นรายบุคคลหรือคู่ แสดงวิธีทำและขั้นตอนคำนวณอย่างละเอียด`,
        quickCheck: 'เดินตรวจแนวทางการคิดของนักเรียนแต่ละคนเพื่อระบุจุดที่มีความเข้าใจคลาดเคลื่อน',
        feedbackMethod: 'ตั้งคำถามกระตุ้นให้นักเรียนตรวจสอบขั้นตอนคำนวณของตนเอง',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: firstEvd,
      },
      {
        phase: 'APPLY',
        title: `ขั้นนำเสนอแนวคิดและตรวจสอบความสมเหตุสมผล (Presentation & Reasoning)`,
        minutes: 10,
        teacherActions: `ครูสุ่มนักเรียนที่มีแนวคิดหลากหลายขึ้นมาเขียนแสดงวิธีทำบนกระดาน และเปิดให้อภิปราย`,
        studentActions: `นักเรียนเปรียบเทียบแนวคิด ตรวจสอบความถูกต้อง และอภิปรายความสมเหตุสมผลของคำตอบร่วมกัน`,
        quickCheck: 'ประเมินการให้เหตุผลและการอธิบายแนวคิดทางคณิตศาสตร์',
        feedbackMethod: 'สรุปจุดเด่นของแต่ละแนวคิดและแนะนำวิธีที่กระชับรัดกุม',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: firstEvd,
      },
      {
        phase: 'SUMMARIZE',
        title: `ขั้นสรุปบทเรียนและมโนทัศน์สำคัญ (Mathematical Closure)`,
        minutes: 5,
        teacherActions: `ครูนำสรุปหลักการสำคัญในการแก้โจทย์เรื่อง ${cleanTopic}`,
        studentActions: `นักเรียนบันทึกสรุปข้อค้นพบหรือทำโจทย์ประเมินผลสั้น 1 ข้อ`,
        quickCheck: 'ตรวจคำตอบของโจทย์ประเมินผลสั้น',
        feedbackMethod: 'ให้ข้อมูลสะท้อนกลับภาพรวมของชั้นเรียน',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: firstEvd,
      },
    ];

    return [
      {
        id: 'flow-1',
        name: 'แบบที่ 1: กระบวนการแก้ปัญหา 4 ขั้นของโพลยา (Polya’s 4-Step Problem Solving)',
        patternName: 'Polya Problem Solving Cycle',
        stepsCount: 5,
        totalMinutes: durationMinutes,
        bestFor: 'เหมาะสำหรับคาบเรียนที่เน้นการแก้โจทย์ปัญหาเชิงลึก การคิดวิเคราะห์ และการให้เหตุผล',
        summary: [
          'ทำความเข้าใจสถานการณ์ปัญหาและระบุเงื่อนไข (10 นาที)',
          'วางแผนและร่วมคิดกลยุทธ์การแก้ปัญหา (15 นาที)',
          'ลงมือปฏิบัติและแสดงขั้นตอนวิธีทำ (20 นาที)',
          'สะท้อนผลและตรวจสอบความสมเหตุสมผล (10 นาที)',
          'สรุปมโนทัศน์และข้อค้นพบทางคณิตศาสตร์ (5 นาที)',
        ],
        activities: normalizeFlowMinutes(toDrafts(rawMath1), durationMinutes),
      },
    ];
  }

  // 3. SCIENCE (Inquiry / Experiment)
  if (subjectKey === 'SCIENCE') {
    const rawSci1: RawActivityInput[] = [
      {
        phase: 'ENGAGE',
        title: `ขั้นสร้างความสนใจ (Engagement)`,
        minutes: 10,
        teacherActions: `ครูสาธิตปรากฏการณ์ทางวิทยาศาสตร์หรือนำเสนอคำถามท้าทายเกี่ยวกับ ${cleanTopic}`,
        studentActions: `นักเรียนสังเกตปรากฏการณ์ ตั้งข้อสงสัย และร่วมกันตั้งสมมติฐานเบื้องต้น`,
        quickCheck: 'สังเกตการตั้งคำถามและความคิดเห็นของนักเรียน',
        feedbackMethod: 'กระตุ้นให้เชื่อมโยงข้อสังเกตสู่สมมติฐานที่ทดสอบได้',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: [],
      },
      {
        phase: 'LEARN',
        title: `ขั้นวางแผนการสำรวจและทดลอง (Exploration Planning)`,
        minutes: 10,
        teacherActions: `ครูแนะนำอุปกรณ์ ข้อควรระวังด้านความปลอดภัย และขั้นตอนการทดลองเรื่อง ${cleanTopic}`,
        studentActions: `นักเรียนตรวจเช็คอุปกรณ์ในกลุ่ม และทำความเข้าใจตารางบันทึกผลการทดลอง`,
        quickCheck: 'ตรวจสอบความพร้อมและความเข้าใจในขั้นตอนปฏิบัติการ',
        feedbackMethod: 'เน้นย้ำเรื่องความปลอดภัยและการควบคุมตัวแปร',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: [],
      },
      {
        phase: 'PRACTICE',
        title: `ขั้นลงมือปฏิบัติการทดลองและบันทึกข้อมูล (Hands-on Experiment)`,
        minutes: 25,
        teacherActions: `ครูเดินสังเกตการปฏิบัติการทดลองของทุกกลุ่ม คอยให้คำแนะนำเมื่อเกิดข้อติดขัด`,
        studentActions: `นักเรียนแบ่งหน้าที่ในกลุ่ม ลงมือทำการทดลอง และบันทึกข้อมูลเชิงปริมาณ/คุณภาพลงในใบบันทึกผล`,
        quickCheck: 'ประเมินทักษะการใช้อุปกรณ์และการบันทึกผลตามความเป็นจริง',
        feedbackMethod: 'แนะนำวิธีสังเกตอย่างละเอียดและการอ่านค่าเครื่องมือให้ถูกต้อง',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: firstEvd,
      },
      {
        phase: 'APPLY',
        title: `ขั้นวิเคราะห์และสรุปผลการทดลอง (Explanation & Discussion)`,
        minutes: 10,
        teacherActions: `ครูนำตารางข้อมูลของแต่ละกลุ่มมาเปรียบเทียบบนกระดาน และนำอภิปรายความสัมพันธ์ของตัวแปร`,
        studentActions: `นักเรียนวิเคราะห์ข้อมูล สรุปผลการทดลอง และตรวจสอบว่าสอดคล้องกับสมมติฐานหรือไม่`,
        quickCheck: 'ประเมินการลงข้อสรุปและการเชื่อมโยงหลักฐานเชิงประจักษ์',
        feedbackMethod: 'ให้ข้อมูลย้อนกลับด้านการให้เหตุผลเชิงวิทยาศาสตร์',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: firstEvd,
      },
      {
        phase: 'SUMMARIZE',
        title: `ขั้นขยายความรู้และประเมินผล (Elaboration & Evaluation)`,
        minutes: 5,
        teacherActions: `ครูอธิบายเชื่อมโยงผลการทดลองสู่ปรากฏการณ์ในชีวิตจริง`,
        studentActions: `นักเรียนตอบคำถามสรุปความรู้สำคัญในใบบันทึกผลการทดลอง`,
        quickCheck: 'ตรวจความสมบูรณ์ของใบบันทึกผลการทดลอง',
        feedbackMethod: 'ชื่นชมการทำงานเป็นทีมและการรักษาความสะอาดของห้องปฏิบัติการ',
        linkedObjectiveIds: firstObj,
        linkedEvidenceIds: firstEvd,
      },
    ];

    return [
      {
        id: 'flow-1',
        name: 'แบบที่ 1: วงจรสืบเสาะหาความรู้ 5E (5E Inquiry Model)',
        patternName: '5E Inquiry Learning Cycle',
        stepsCount: 5,
        totalMinutes: durationMinutes,
        bestFor: 'เหมาะสำหรับการทดลองวิทยาศาสตร์ การสำรวจตรวจสอบ และการสร้างข้อสรุปจากหลักฐาน',
        summary: [
          'สร้างความสนใจด้วยปรากฏการณ์และตั้งสมมติฐาน (10 นาที)',
          'วางแผนการทดลองและเตรียมอุปกรณ์ (10 นาที)',
          'ลงมือทำการทดลองและบันทึกข้อมูลจริง (25 นาที)',
          'วิเคราะห์ข้อมูลและสรุปผลอิงหลักฐาน (10 นาที)',
          'ขยายความรู้สู่ชีวิตประจำวันและสรุปผล (5 นาที)',
        ],
        activities: normalizeFlowMinutes(toDrafts(rawSci1), durationMinutes),
      },
    ];
  }

  // Generic fallback
  const genericActivities: RawActivityInput[] = [
    {
      phase: 'ENGAGE',
      title: `ขั้นนำเข้าสู่บทเรียนและกระตุ้นการเรียนรู้`,
      minutes: 10,
      teacherActions: `ครูจัดกิจกรรมกระตุ้นความสนใจและทบทวนความรู้เดิมเรื่อง ${cleanTopic}`,
      studentActions: `นักเรียนร่วมตอบคำถามและแลกเปลี่ยนความคิดเห็น`,
      quickCheck: 'สังเกตการมีส่วนร่วมของนักเรียน',
      feedbackMethod: 'ให้คำชื่นชมและเสริมแรงเชิงบวก',
      linkedObjectiveIds: firstObj,
      linkedEvidenceIds: [],
    },
    {
      phase: 'LEARN',
      title: `ขั้นเรียนรู้มโนทัศน์และเนื้อหาสำคัญ`,
      minutes: 15,
      teacherActions: `ครูอธิบายสาระสำคัญและยกตัวอย่างประกอบเกี่ยวกับ ${cleanTopic}`,
      studentActions: `นักเรียนฟัง บันทึกสาระสำคัญ และซักถามข้อสงสัย`,
      quickCheck: 'ถามคำถามสั้นเพื่อเช็คความเข้าใจ',
      feedbackMethod: 'อธิบายเพิ่มเติมในจุดที่นักเรียนยังสงสัย',
      linkedObjectiveIds: firstObj,
      linkedEvidenceIds: [],
    },
    {
      phase: 'PRACTICE',
      title: `ขั้นปฏิบัติกิจกรรมหรือฝึกทักษะ`,
      minutes: 20,
      teacherActions: `ครูมอบหมายใบกิจกรรมและดูแลการทำงานของนักเรียน`,
      studentActions: `นักเรียนลงมือทำใบกิจกรรมรายบุคคลหรือกลุ่มย่อย`,
      quickCheck: 'ตรวจดูความคืบหน้าของงาน',
      feedbackMethod: 'ให้คำปรึกษาและคำแนะนำเฉพาะกลุ่ม',
      linkedObjectiveIds: firstObj,
      linkedEvidenceIds: firstEvd,
    },
    {
      phase: 'APPLY',
      title: `ขั้นนำเสนอและประยุกต์ใช้ความรู้`,
      minutes: 10,
      teacherActions: `ครูเปิดโอกาสให้นักเรียนนำเสนอผลงานและร่วมอภิปราย`,
      studentActions: `นักเรียนนำเสนอผลงานและแลกเปลี่ยนเรียนรู้กับเพื่อน`,
      quickCheck: 'ประเมินผลงานตามเกณฑ์การประเมิน',
      feedbackMethod: 'ให้ข้อมูลย้อนกลับเพื่อการพัฒนา',
      linkedObjectiveIds: firstObj,
      linkedEvidenceIds: firstEvd,
    },
    {
      phase: 'SUMMARIZE',
      title: `ขั้นสรุปบทเรียนและประเมินผล`,
      minutes: 5,
      teacherActions: `ครูและนักเรียนร่วมกันสรุปประเด็นสำคัญประจำบทเรียน`,
      studentActions: `นักเรียนบันทึกสรุปความรู้และประเมินความเข้าใจของตนเอง`,
      quickCheck: 'ตรวจสอบความเข้าใจภาพรวม',
      feedbackMethod: 'สรุปจุดเด่นและสิ่งที่ต้องเตรียมตัวในคาบต่อไป',
      linkedObjectiveIds: firstObj,
      linkedEvidenceIds: firstEvd,
    },
  ];

  return [
    {
      id: 'flow-1',
      name: 'แบบมาตรฐาน: การจัดการเรียนรู้เชิงรุก (Active Learning 5 ขั้น)',
      patternName: 'Active Learning Progression',
      stepsCount: 5,
      totalMinutes: durationMinutes,
      bestFor: 'เหมาะสำหรับทุกกลุ่มสาระการเรียนรู้ เน้นการมีส่วนร่วมและการลงมือปฏิบัติจริง',
      summary: [
        'ขั้นนำเข้าสู่บทเรียนและกระตุ้นการเรียนรู้ (10 นาที)',
        'ขั้นเรียนรู้มโนทัศน์และเนื้อหาสำคัญ (15 นาที)',
        'ขั้นปฏิบัติกิจกรรมหรือฝึกทักษะ (20 นาที)',
        'ขั้นนำเสนอและประยุกต์ใช้ความรู้ (10 นาที)',
        'ขั้นสรุปบทเรียนและประเมินผล (5 นาที)',
      ],
      activities: normalizeFlowMinutes(toDrafts(genericActivities), durationMinutes),
    },
  ];
}
