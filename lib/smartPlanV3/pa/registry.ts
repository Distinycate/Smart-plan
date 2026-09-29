/**
 * Smart Plan V3.7R — PA Criteria Registry
 *
 * Official Authority: สำนักงานคณะกรรมการข้าราชการครูและบุคลากรทางการศึกษา (ก.ค.ศ.)
 * Base Document: หนังสือสำนักงาน ก.ค.ศ. ที่ ศธ 0206.3/ว9 ลงวันที่ 20 พฤษภาคม 2564
 *
 * Detailed amendment trajectory checked as of 2026-09-29.
 * See docs/SMART_PLAN_V3_PA_CRITERIA.md for comprehensive provenance.
 */

import type { PaCriteriaVersion } from './types';
import { PA_TEACHER_CRITERIA } from './teacherCriteria';

export const PA_CRITERIA_V9_2564: PaCriteriaVersion = {
  id: 'PA_TEACHER_V9_2564',
  label: 'เกณฑ์การประเมินตำแหน่งและวิทยฐานะข้าราชการครู (ว9/2564)',
  authority: 'สำนักงานคณะกรรมการข้าราชการครูและบุคลากรทางการศึกษา (ก.ค.ศ.)',
  baseDocument: {
    code: 'ว9/2564',
    date: '20 พฤษภาคม 2564',
    title: 'หลักเกณฑ์และวิธีการประเมินตำแหน่งและวิทยฐานะข้าราชการครูและบุคลากรทางการศึกษา ตำแหน่งครู',
  },
  amendments: [
    {
      code: 'ว22/2564',
      date: '3 กันยายน 2564',
      title: 'การซักซ้อมความเข้าใจการประเมินตำแหน่งและวิทยฐานะข้าราชการครูและบุคลากรทางการศึกษา',
      note: 'ซักซ้อมแนวปฏิบัติและแนวทางการจัดทำข้อตกลงในการพัฒนางาน (PA)',
    },
    {
      code: '456/2566',
      date: 'พ.ศ. 2566',
      title: 'แนวทางการประเมินผลการปฏิบัติงานผ่านระบบ DPA',
      note: 'แนวปฏิบัติการบันทึกและส่งข้อมูลผลการประเมินผ่านระบบดิจิทัล',
    },
    {
      code: '1122/2567',
      date: 'พ.ศ. 2567',
      title: 'แนวปฏิบัติการประเมินช่วงเปลี่ยนผ่านและการใช้งานระบบ DPA',
      note: 'ชี้แจงเกณฑ์คุณสมบัติและการนับระยะเวลาช่วงเปลี่ยนผ่าน',
    },
    {
      code: '1144/2567',
      date: 'พ.ศ. 2567',
      title: 'การปรับปรุงขั้นตอนการตรวจสอบเอกสารและหลักฐานในระบบประเมิน',
      note: 'ปรับปรุงกระบวนการตรวจสอบเอกสารดิจิทัลของผู้ขอรับการประเมิน',
    },
    {
      code: '1683/2567',
      date: 'พ.ศ. 2567',
      title: 'เกณฑ์การจัดทำและส่งไฟล์คลิปและแผนการจัดการเรียนรู้ดิจิทัล',
      note: 'ระบุข้อกำหนดทางเทคนิคของไฟล์แผนการจัดการเรียนรู้และคลิปการสอน',
    },
    {
      code: 'ล1222/2568',
      date: 'พ.ศ. 2568',
      title: 'แนวปฏิบัติการจัดการเรียนรู้และการประเมินวิทยฐานะ',
      note: 'ย้ำความสอดคล้องระหว่างแผนการจัดการเรียนรู้กับหลักฐานเชิงประจักษ์',
    },
    {
      code: 'OTEPC-SUMMARY-2569',
      date: 'มกราคม 2569',
      title: 'สรุปเส้นทางการแก้ไขเพิ่มเติมหลักเกณฑ์ ว.PA สำนักงาน ก.ค.ศ.',
      note: 'ยืนยันว่าเกณฑ์การประเมินด้านที่ 1 แผนการจัดการเรียนรู้ 8 ตัวชี้วัดหลักยังคงใช้เกณฑ์ฐาน ว9/2564 โดยเอกสารแก้ไขเพิ่มเติมส่วนใหญ่ปรับปรุงกระบวนการยื่นคำขอ ผ่านระบบ DPA และการนับระยะเวลา/ภาระงาน',
    },
  ],
  effectiveFrom: '2021-05-20',
  checkedAsOf: '2026-09-29',
  status: 'ACTIVE',
  criteria: PA_TEACHER_CRITERIA,
};

const PA_REGISTRY: Record<string, PaCriteriaVersion> = {
  PA_TEACHER_V9_2564: PA_CRITERIA_V9_2564,
  PA_TEACHER_CURRENT: PA_CRITERIA_V9_2564, // Alias for backward compatibility
};

export function getPaCriteriaVersion(versionId: string): PaCriteriaVersion | null {
  return PA_REGISTRY[versionId] || null;
}

export function getActivePaCriteriaVersion(): PaCriteriaVersion {
  return PA_CRITERIA_V9_2564;
}

export function listPaCriteriaVersions(): PaCriteriaVersion[] {
  return [PA_CRITERIA_V9_2564];
}
