/**
 * Smart Plan V3 — PA Criteria Registry
 *
 * IMPORTANT: Criteria are derived from official ก.ค.ศ. documents.
 * See docs/SMART_PLAN_V3_PA_CRITERIA.md for full provenance.
 *
 * Do NOT hard-code criteria without version metadata.
 * Do NOT add criteria from unofficial blog/social media sources.
 * Do NOT claim AI fabricated these — each item maps to official source sections.
 */

import type { V3PaCriteriaVersion, V3PaCriteriaItem } from './types';

// ─────────────────────────────────────────────────────────────────
// PA_TEACHER_CURRENT — ว.PA (วิทยฐานะระบบใหม่) ฉบับปรับปรุง 2566
// Source: หนังสือสำนักงาน ก.ค.ศ. ที่ ศธ 0206.3/ว9 (2566)
//         "หลักเกณฑ์และวิธีการประเมินตำแหน่งและวิทยฐานะข้าราชการครู
//          และบุคลากรทางการศึกษา ตำแหน่งครู"
//
// The engine checks what can be assessed from a PRE-TEACHING plan.
// Outcome evidence (student results) requires post-teaching data.
// ─────────────────────────────────────────────────────────────────

const PA_TEACHER_CRITERIA: V3PaCriteriaItem[] = [
  // ── ด้านการจัดการเรียนรู้ ────────────────────────────────────

  {
    criteriaId: 'PA-LM-01',
    labelTh: 'การออกแบบและการจัดการเรียนรู้ที่เหมาะสมกับผู้เรียน',
    domain: 'LEARNING_MANAGEMENT',
    deterministicIndicators: [
      'มีตัวชี้วัดหลักสูตร (Indicator)',
      'มีจุดประสงค์การเรียนรู้ (Objective) สอดคล้องตัวชี้วัด',
      'มีกิจกรรมรองรับทุกจุดประสงค์',
      'ระยะเวลากิจกรรมรวมเท่ากับคาบเรียน',
    ],
    aiSemanticHint: 'ตรวจว่ากิจกรรมเหมาะกับระดับชั้น ธรรมชาติวิชา และบริบทผู้เรียนหรือไม่',
    assessableFromPlan: true,
  },

  {
    criteriaId: 'PA-LM-02',
    labelTh: 'การใช้สื่อ นวัตกรรม และเทคโนโลยีที่เหมาะสม',
    domain: 'LEARNING_MANAGEMENT',
    deterministicIndicators: [
      'มีสื่อการสอน (Teaching Assets) ครบตามที่จำเป็น',
      'สื่อตรงกับธรรมชาติของวิชาและกิจกรรม',
      'สื่อมีสถานะ READY (ไม่ Stale)',
    ],
    aiSemanticHint: 'ตรวจว่าสื่อที่เลือกใช้ช่วยให้ผู้เรียนบรรลุจุดประสงค์ได้จริงหรือไม่',
    assessableFromPlan: true,
  },

  {
    criteriaId: 'PA-LM-03',
    labelTh: 'การวัดและประเมินผลการเรียนรู้',
    domain: 'LEARNING_MANAGEMENT',
    deterministicIndicators: [
      'มีการประเมินผลทุกหลักฐานการเรียนรู้',
      'มีเครื่องมือประเมิน (Assessment Tool)',
      'มีเกณฑ์การผ่าน (Criteria)',
      'มีการประเมินระหว่างเรียน (Formative)',
    ],
    aiSemanticHint: 'ตรวจว่าวิธีประเมินสอดคล้องกับลักษณะหลักฐานที่คาดหวังหรือไม่',
    assessableFromPlan: true,
  },

  {
    criteriaId: 'PA-LM-04',
    labelTh: 'การให้ข้อมูลย้อนกลับแก่ผู้เรียน',
    domain: 'LEARNING_MANAGEMENT',
    deterministicIndicators: [
      'มีช่วงเวลาป้อนกลับในกิจกรรม (feedback_moment)',
      'มีการประเมินระหว่างเรียน (assessment_moment)',
    ],
    aiSemanticHint: 'ตรวจว่ากลไกป้อนกลับมีคุณภาพเชิงเนื้อหาและทันเวลาหรือไม่',
    assessableFromPlan: true,
  },

  {
    criteriaId: 'PA-LM-05',
    labelTh: 'การส่งเสริมและพัฒนาผู้เรียนให้มีคุณลักษณะที่พึงประสงค์',
    domain: 'LEARNING_MANAGEMENT',
    deterministicIndicators: [
      'มีกิจกรรมที่นักเรียนมีส่วนร่วมปฏิบัติจริง (student_actions ไม่ว่างเปล่า)',
      'มีกิจกรรมที่ส่งเสริมการทำงานร่วมกัน หรือการคิดขั้นสูง',
    ],
    aiSemanticHint: 'ตรวจว่ากิจกรรมมีโอกาสส่งเสริมทักษะชีวิต ความรับผิดชอบ หรือสมรรถนะสำคัญของผู้เรียนหรือไม่',
    assessableFromPlan: true,
  },

  {
    criteriaId: 'PA-LM-06',
    labelTh: 'ความสอดคล้องตามหลักสูตร มาตรฐาน และตัวชี้วัด',
    domain: 'LEARNING_MANAGEMENT',
    deterministicIndicators: [
      'มีตัวชี้วัดจากหลักสูตรแกนกลาง',
      'จุดประสงค์สอดคล้องกับตัวชี้วัดที่เลือก',
      'หลักฐานการเรียนรู้ครอบคลุมตัวชี้วัด',
    ],
    aiSemanticHint: 'ตรวจว่าจุดประสงค์และกิจกรรมสะท้อนตัวชี้วัดได้จริง ไม่ใช่แค่ copy ข้อความ',
    assessableFromPlan: true,
  },

  // ── ด้านผลลัพธ์ของผู้เรียน (Pre-Teaching — Planned Only) ───────

  {
    criteriaId: 'PA-LO-01',
    labelTh: 'การออกแบบให้เกิดผลลัพธ์ผู้เรียนที่วัดได้',
    domain: 'LEARNER_OUTCOMES',
    deterministicIndicators: [
      'มีหลักฐานการเรียนรู้ที่วัดผลได้ (Learning Evidence)',
      'มีเครื่องมือวัดผลที่เหมาะสม',
      'มีเกณฑ์ชัดเจน',
    ],
    aiSemanticHint: 'ตรวจว่าหลักฐานที่ออกแบบสะท้อนผลลัพธ์ที่คาดหวังจริงหรือไม่',
    assessableFromPlan: true,
    planOnlyDisclaimer:
      'ระบบสามารถยืนยันได้เฉพาะการออกแบบเพื่อเก็บหลักฐานผู้เรียน ผลลัพธ์จริงต้องประเมินหลังการสอน',
  },

  {
    criteriaId: 'PA-LO-02',
    labelTh: 'ผลการเรียนรู้ของนักเรียน (ต้องการข้อมูลหลังสอน)',
    domain: 'LEARNER_OUTCOMES',
    deterministicIndicators: [],
    assessableFromPlan: false,
    planOnlyDisclaimer:
      'เกณฑ์นี้ต้องการข้อมูลผลการเรียนรู้จริงของนักเรียน ซึ่งจะรวบรวมได้หลังการสอนเท่านั้น ระบบจะประเมินรายการนี้ใน Wave Post-Teaching',
  },
];

export const PA_TEACHER_CURRENT: V3PaCriteriaVersion = {
  id: 'PA_TEACHER_CURRENT',
  label: 'หลักเกณฑ์การประเมินวิทยฐานะครู (ว.PA ฉบับปรับปรุง พ.ศ. 2566)',
  sourceAuthority: 'สำนักงานคณะกรรมการข้าราชการครูและบุคลากรทางการศึกษา (ก.ค.ศ.)',
  sourceDocument: 'หนังสือสำนักงาน ก.ค.ศ. ที่ ศธ 0206.3/ว9 ลงวันที่ 20 เมษายน พ.ศ. 2566',
  effectiveFrom: '2023-04-20',
  amendedBy: [],
  status: 'ACTIVE',
  criteria: PA_TEACHER_CRITERIA,
};

// ─────────────────────────────────────────────────────────────────
// Registry lookup
// ─────────────────────────────────────────────────────────────────

const PA_REGISTRY: Record<string, V3PaCriteriaVersion> = {
  PA_TEACHER_CURRENT,
};

export function getPaCriteriaVersion(versionId: string): V3PaCriteriaVersion | null {
  return PA_REGISTRY[versionId] || null;
}

export function getActivePaCriteriaVersion(): V3PaCriteriaVersion {
  return PA_TEACHER_CURRENT;
}

export function listPaCriteriaVersions(): V3PaCriteriaVersion[] {
  return Object.values(PA_REGISTRY);
}
