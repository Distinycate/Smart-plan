/**
 * Smart Plan V3.7R — PA Teacher Criteria Definition
 *
 * Source: หนังสือสำนักงาน ก.ค.ศ. ที่ ศธ 0206.3/ว9 ลงวันที่ 20 พฤษภาคม 2564
 * "หลักเกณฑ์และวิธีการประเมินตำแหน่งและวิทยฐานะข้าราชการครูและบุคลากรทางการศึกษา ตำแหน่งครู"
 *
 * All criteria clearly separate official indicator references from system-interpreted labels.
 * Language adheres strictly to planned-evidence semantics (never claiming student outcomes before actual teaching).
 */

import type { PaCriterion } from './types';

export const PA_TEACHER_CRITERIA: PaCriterion[] = [
  {
    id: 'PLAN_PRIOR_KNOWLEDGE',
    officialCode: 'ว9/2564-ตัวชี้วัดที่ 2',
    officialLabel: 'ผู้เรียนสามารถเชื่อมโยงความรู้หรือสร้างความรู้ใหม่จากประสบการณ์เดิม',
    systemLabel: 'การเชื่อมโยงความรู้เดิมสู่การเรียนรู้ใหม่',
    description: 'แผนนี้ออกแบบให้มีกิจกรรมทบทวนประสบการณ์หรือความรู้เดิมของผู้เรียนเพื่อเตรียมความพร้อมสู่การสร้างความรู้ใหม่',
    sourceRef: {
      criteriaVersionId: 'PA_TEACHER_V9_2564',
      documentCode: 'ว9/2564',
    },
    mappingType: 'INTERPRETED',
    assessableFromPlan: true,
    deterministicIndicators: [
      'มีกิจกรรมในระยะนำเข้าสู่บทเรียน (WARMUP หรือ INTRO)',
      'มีคำถามหรือกิจกรรมทบทวนความรู้เดิม',
    ],
    aiSemanticHint: 'ตรวจดูว่ากิจกรรมเริ่มต้นมีการกระตุ้นประสบการณ์เดิมที่เกี่ยวข้องกับหัวข้อใหม่หรือไม่',
  },
  {
    id: 'STUDENT_ACTIVE_LEARNING',
    officialCode: 'ว9/2564-ตัวชี้วัดที่ 3',
    officialLabel: 'ผู้เรียนได้สร้างความรู้เองหรือได้สร้างประสบการณ์ใหม่จากการเรียนรู้',
    systemLabel: 'การจัดกิจกรรมการเรียนรู้แบบ Active Learning',
    description: 'แผนนี้ออกแบบให้นักเรียนมีบทบาทปฏิบัติการเรียนรู้ด้วยตนเองอย่างกระตือรือร้น ไม่เน้นการรับฟังครูบรรยายฝ่ายเดียว',
    sourceRef: {
      criteriaVersionId: 'PA_TEACHER_V9_2564',
      documentCode: 'ว9/2564',
    },
    mappingType: 'INTERPRETED',
    assessableFromPlan: true,
    deterministicIndicators: [
      'มีบทบาทการลงมือทำของผู้เรียนที่ชัดเจน (student_actions ไม่ว่างเปล่า)',
      'กิจกรรมส่วนใหญ่เน้นผู้เรียนปฏิบัติ ร่วมคิด หรือค้นพบด้วยตนเอง',
    ],
    aiSemanticHint: 'ตรวจสัดส่วนกิจกรรมว่าผู้เรียนได้คิด ลงมือทำ หรือสื่อสารมากกว่าการรับฟังครูฝ่ายเดียว',
  },
  {
    id: 'COGNITIVE_SCAFFOLDING',
    officialCode: 'ว9/2564-ตัวชี้วัดที่ 5',
    officialLabel: 'ผู้เรียนได้รับการพัฒนาทักษะกระบวนการ หรือการคิดขั้นสูง',
    systemLabel: 'การส่งเสริมทักษะและการคิดขั้นสูง (Scaffolding)',
    description: 'แผนนี้ออกแบบลำดับกิจกรรมแบบเป็นขั้นเป็นตอน (Scaffolding) เพื่อนำผู้เรียนจากความเข้าใจพื้นฐานไปสู่การประยุกต์ใช้และการคิดขั้นสูง',
    sourceRef: {
      criteriaVersionId: 'PA_TEACHER_V9_2564',
      documentCode: 'ว9/2564',
    },
    mappingType: 'INTERPRETED',
    assessableFromPlan: true,
    deterministicIndicators: [
      'กิจกรรมมีการจัดลำดับขั้นตอนการเรียนรู้อย่างเป็นระบบ',
      'มีเป้าหมายการพัฒนาทักษะกระบวนการ (P) หรือสมรรถนะ',
    ],
    aiSemanticHint: 'ตรวจดูว่ากิจกรรมมีความท้าทายทางความคิดและมีโครงนั่งร้านการเรียนรู้ที่เหมาะสม',
  },
  {
    id: 'AUTHENTIC_PRACTICE',
    officialCode: 'ว9/2564-ตัวชี้วัดที่ 1',
    officialLabel: 'ผู้เรียนสามารถเข้าถึงสิ่งที่เรียนและเข้าใจบทเรียนผ่านการปฏิบัติ',
    systemLabel: 'การเปิดโอกาสให้นักเรียนมีส่วนร่วมและฝึกปฏิบัติจริง',
    description: 'แผนนี้ออกแบบให้มีช่วงเวลาให้นักเรียนได้ลงมือทำ ฝึกทักษะ หรือประยุกต์ใช้ความรู้ในสถานการณ์จริงหรือจำลอง',
    sourceRef: {
      criteriaVersionId: 'PA_TEACHER_V9_2564',
      documentCode: 'ว9/2564',
    },
    mappingType: 'INTERPRETED',
    assessableFromPlan: true,
    deterministicIndicators: [
      'มีกิจกรรมระยะฝึกปฏิบัติ (PRACTICE หรือ DEVELOP)',
      'มีการจัดสรรเวลาให้ผู้เรียนได้ฝึกฝนอย่างเพียงพอ',
    ],
    aiSemanticHint: 'ตรวจว่ากิจกรรมฝึกปฏิบัติเปิดโอกาสให้นักเรียนทุกคนได้มีส่วนร่วมจริง',
  },
  {
    id: 'FORMATIVE_ASSESSMENT',
    officialCode: 'ว9/2564-ตัวชี้วัดที่ 6',
    officialLabel: 'การวัดและประเมินผลเพื่อพัฒนาการเรียนรู้',
    systemLabel: 'การวัดและประเมินผลที่สอดคล้องกับจุดประสงค์',
    description: 'แผนนี้เตรียมเครื่องมือ วิธีการ และเกณฑ์การประเมินที่ตรงกับหลักฐานและจุดประสงค์การเรียนรู้',
    sourceRef: {
      criteriaVersionId: 'PA_TEACHER_V9_2564',
      documentCode: 'ว9/2564',
    },
    mappingType: 'INTERPRETED',
    assessableFromPlan: true,
    deterministicIndicators: [
      'มีการประเมินผลครอบคลุมทุกหลักฐานการเรียนรู้',
      'มีเครื่องมือประเมิน (Assessment Tool) และเกณฑ์การผ่านที่ระบุไว้ชัดเจน',
    ],
    aiSemanticHint: 'ตรวจว่าวิธีการประเมินและเกณฑ์สะท้อนการวัดพฤติกรรมตามจุดประสงค์จริงหรือไม่',
  },
  {
    id: 'FORMATIVE_FEEDBACK',
    officialCode: 'ว9/2564-ตัวชี้วัดที่ 6',
    officialLabel: 'ผู้เรียนได้รับข้อมูลสะท้อนกลับเพื่อปรับปรุงการเรียนรู้',
    systemLabel: 'การให้ข้อมูลย้อนกลับและการสะท้อนคิด (Feedback & Reflection)',
    description: 'แผนนี้ออกแบบช่วงเวลาให้ข้อมูลย้อนกลับจากครูหรือเพื่อน และกระตุ้นให้ผู้เรียนสะท้อนคิดเพื่อพัฒนาตนเอง',
    sourceRef: {
      criteriaVersionId: 'PA_TEACHER_V9_2564',
      documentCode: 'ว9/2564',
    },
    mappingType: 'INTERPRETED',
    assessableFromPlan: true,
    deterministicIndicators: [
      'มีช่วงเวลาสะท้อนคิดหรือให้ข้อมูลย้อนกลับ (feedback_moment) ในกิจกรรม',
      'มีช่วงตรวจสอบความเข้าใจระหว่างเรียน (assessment_moment)',
    ],
    aiSemanticHint: 'ตรวจว่ากลไกการให้ข้อมูลย้อนกลับระบุไว้ชัดเจนและช่วยพัฒนาผู้เรียนได้ทันท่วงที',
  },
  {
    id: 'LEARNING_RESOURCES',
    officialCode: 'ว9/2564-ตัวชี้วัดที่ 4',
    officialLabel: 'การใช้สื่อ อุปกรณ์ หรือแหล่งเรียนรู้เพื่อกระตุ้นและส่งเสริมการเรียนรู้',
    systemLabel: 'การใช้สื่อ นวัตกรรม หรือแหล่งเรียนรู้ที่เหมาะสม',
    description: 'แผนนี้เตรียมสื่อ นวัตกรรม หรือใบงานที่จำเป็นต่อการจัดกิจกรรมการเรียนรู้ให้บรรลุเป้าหมาย',
    sourceRef: {
      criteriaVersionId: 'PA_TEACHER_V9_2564',
      documentCode: 'ว9/2564',
    },
    mappingType: 'INTERPRETED',
    assessableFromPlan: true,
    deterministicIndicators: [
      'มีรายการสื่อการสอน (Teaching Assets) ที่พร้อมใช้งาน (READY)',
      'สื่อสอดคล้องกับธรรมชาติของกิจกรรมการเรียนรู้',
    ],
    aiSemanticHint: 'ตรวจว่าสื่อการสอนที่จัดเตรียมช่วยสนับสนุนให้ผู้เรียนเข้าใจบทเรียนได้ดียิ่งขึ้น',
  },
  {
    id: 'MEASURABLE_OUTCOMES',
    officialCode: 'ว9/2564-ตัวชี้วัดที่ 1 และ 8',
    officialLabel: 'การกำหนดผลลัพธ์การเรียนรู้ที่สามารถวัดและสังเกตได้เชิงประจักษ์',
    systemLabel: 'การวัดผลสัมฤทธิ์และหลักฐานการเรียนรู้เชิงประจักษ์',
    description: 'แผนนี้เตรียมหลักฐานการเรียนรู้ที่แสดงถึงผลการปฏิบัติหรือผลงานของผู้เรียนที่สามารถสังเกตและวัดได้จริง',
    sourceRef: {
      criteriaVersionId: 'PA_TEACHER_V9_2564',
      documentCode: 'ว9/2564',
    },
    mappingType: 'INTERPRETED',
    assessableFromPlan: true,
    deterministicIndicators: [
      'มีหลักฐานการเรียนรู้เชิงประจักษ์ (Learning Evidence) ครบทุกจุดประสงค์',
      'มีเกณฑ์ประเมินที่วัดผลงานหรือทักษะกระบวนการได้ชัดเจน',
    ],
    aiSemanticHint: 'ตรวจว่าหลักฐานที่ออกแบบไว้เป็นผลงานหรือพฤติกรรมที่ครูสามารถสังเกตและให้คะแนนได้จริง',
  },
  {
    id: 'OBSERVED_STUDENT_OUTCOMES',
    officialCode: 'ว9/2564-ด้านที่ 2',
    officialLabel: 'ผลลัพธ์การเรียนรู้ของผู้เรียน (ผลงานหรือผลการปฏิบัติจริงหลังสอน)',
    systemLabel: 'ผลการเรียนรู้จริงของนักเรียน (ต้องการข้อมูลหลังสอน)',
    description: 'เกณฑ์นี้ประเมินจากผลสัมฤทธิ์ ผลงาน หรือพัฒนาการจริงของผู้เรียนที่เกิดขึ้นหลังการจัดกิจกรรมการเรียนรู้',
    sourceRef: {
      criteriaVersionId: 'PA_TEACHER_V9_2564',
      documentCode: 'ว9/2564',
    },
    mappingType: 'DIRECT',
    assessableFromPlan: false,
    planOnlyDisclaimer: 'ไม่เกี่ยวข้องกับการตรวจแผนก่อนสอน (เกณฑ์นี้ประเมินจากผลลัพธ์จริงในระยะ Post-Teaching เท่านั้น)',
    deterministicIndicators: [],
  },
];
