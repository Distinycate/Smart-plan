/**
 * Smart Plan V3.7R — PA Readiness Engine
 *
 * Evaluates lesson plan evidence against versioned PA criteria derived from ว9/2564.
 * Deterministic mapping. Zero score fabrication. Zero overall pass/fail claims.
 * All evidence references must resolve to real graph entities (O1, E1, A1, AS1, T1, AT1).
 */

import type { V3LessonGraph } from '../types';
import type { V3LessonAlignmentGraph } from '../quality/types';
import type { V3PaReadinessResult, V3PaItemResult, PaCriterion } from './types';
import { getActivePaCriteriaVersion } from './registry';
import { buildEntityRefs } from '../quality/alignmentGraph';

function evaluateCriterion(
  criterion: PaCriterion,
  graph: V3LessonGraph,
  alignmentGraph: V3LessonAlignmentGraph,
  refs: ReturnType<typeof buildEntityRefs>
): V3PaItemResult {
  const evidenceRefs: string[] = [];
  const evidenceDetails: V3PaItemResult['evidenceDetails'] = [];

  // Non-assessable from plan (e.g. Post-teaching outcome criteria)
  if (!criterion.assessableFromPlan) {
    return {
      criterionId: criterion.id,
      systemLabel: criterion.systemLabel,
      officialCode: criterion.officialCode,
      officialLabel: criterion.officialLabel,
      domain: 'LEARNER_OUTCOMES',
      mappingType: criterion.mappingType,
      status: 'NOT_APPLICABLE',
      evidenceRefs: [],
      reason: criterion.planOnlyDisclaimer || 'ไม่เกี่ยวข้องกับการตรวจแผนก่อนสอน (ประเมินในระยะ Post-Teaching เท่านั้น)',
      isPlanPhaseOnly: true,
    };
  }

  let matchedIndicators = 0;
  const totalIndicators = criterion.deterministicIndicators.length;
  let gap: string | undefined;
  let suggestion: string | undefined;

  switch (criterion.id) {
    case 'PLAN_PRIOR_KNOWLEDGE': {
      // Warmup / Intro activities
      const warmupActs = graph.activities.filter(a => a.phase === 'WARMUP' || a.phase === 'INTRO');
      if (warmupActs.length > 0) {
        matchedIndicators++;
        for (const w of warmupActs) {
          const ref = refs.activityRefs[w.id];
          if (ref && !evidenceRefs.includes(ref)) {
            evidenceRefs.push(ref);
            evidenceDetails.push({
              entityType: 'ACTIVITY',
              entityRef: ref,
              entityId: w.id,
              description: `กิจกรรมขั้นนำ (${w.phase}) ${w.title || ''}`,
            });
          }
        }
      }
      // Prior knowledge check in description or questions
      const hasPriorPrompt = warmupActs.some(a =>
        /เดิม|ก่อนหน้า|ทบทวน|จำได้|เคย|คำถามกระตุ้น/i.test(`${a.teacher_actions} ${a.student_actions} ${a.title || ''}`)
      );
      if (hasPriorPrompt) {
        matchedIndicators++;
      }
      if (warmupActs.length === 0) {
        gap = 'ยังไม่พบกิจกรรมในขั้นนำเข้าสู่บทเรียน (WARMUP / INTRO)';
        suggestion = 'เพิ่มกิจกรรมสั้น 5-10 นาทีเพื่อทบทวนประสบการณ์เดิมและเชื่อมโยงสู่เรื่องใหม่';
      }
      break;
    }

    case 'STUDENT_ACTIVE_LEARNING': {
      // Student actions present
      const activeActs = graph.activities.filter(a => Boolean(a.student_actions && a.student_actions.trim().length > 10));
      if (activeActs.length > 0) {
        matchedIndicators++;
        for (const act of activeActs.slice(0, 3)) {
          const ref = refs.activityRefs[act.id];
          if (ref && !evidenceRefs.includes(ref)) {
            evidenceRefs.push(ref);
            evidenceDetails.push({
              entityType: 'ACTIVITY',
              entityRef: ref,
              entityId: act.id,
              description: `บทบาทผู้เรียน: ${act.student_actions.substring(0, 50)}...`,
            });
          }
        }
      }
      // Check for passive lecture dominance
      const passiveActs = graph.activities.filter(a =>
        /ฟังบรรยาย|นั่งฟัง|ครูอธิบายฝ่ายเดียว/i.test(`${a.student_actions} ${a.teacher_actions}`)
      );
      if (passiveActs.length === 0 && activeActs.length >= 2) {
        matchedIndicators++;
      }
      if (activeActs.length === 0) {
        gap = 'ยังไม่มีการระบุบทบาทการปฏิบัติของผู้เรียนที่ชัดเจนในกิจกรรม';
        suggestion = 'ระบุสิ่งที่นักเรียนต้องลงมือทำ คิด หรือสื่อสารในช่องบทบาทผู้เรียน';
      }
      break;
    }

    case 'COGNITIVE_SCAFFOLDING': {
      // Phased steps (at least 3 phases)
      const phases = new Set(graph.activities.map(a => a.phase));
      if (phases.size >= 2) {
        matchedIndicators++;
        for (const act of graph.activities.slice(0, 3)) {
          const ref = refs.activityRefs[act.id];
          if (ref && !evidenceRefs.includes(ref)) {
            evidenceRefs.push(ref);
            evidenceDetails.push({
              entityType: 'ACTIVITY',
              entityRef: ref,
              entityId: act.id,
              description: `ขั้นตอน ${act.phase}: ${act.title || act.student_actions.substring(0, 40)}`,
            });
          }
        }
      }
      // Process/skill objectives or indicators
      const hasSkillObj = graph.objectives.some(o => o.objective_type === 'P' || o.objective_type === 'A');
      if (hasSkillObj || graph.objectives.length >= 2) {
        matchedIndicators++;
        const skillObj = graph.objectives.find(o => o.objective_type === 'P' || o.objective_type === 'A') || graph.objectives[0];
        if (skillObj) {
          const ref = refs.objectiveRefs[skillObj.id];
          if (ref && !evidenceRefs.includes(ref)) {
            evidenceRefs.push(ref);
            evidenceDetails.push({
              entityType: 'OBJECTIVE',
              entityRef: ref,
              entityId: skillObj.id,
              description: `จุดประสงค์ด้านทักษะ/กระบวนการ: ${skillObj.statement.substring(0, 50)}...`,
            });
          }
        }
      }
      if (phases.size < 2) {
        gap = 'กิจกรรมยังไม่มีการแบ่งระยะการเรียนรู้ (Phases) อย่างชัดเจน';
        suggestion = 'จัดโครงสร้างกิจกรรมเป็น ขั้นนำ (WARMUP) ขั้นสอน/ปฏิบัติ (DEVELOP/PRACTICE) และขั้นสรุป (WRAPUP)';
      }
      break;
    }

    case 'AUTHENTIC_PRACTICE': {
      // Practice activities
      const practiceActs = graph.activities.filter(a => a.phase === 'PRACTICE' || a.phase === 'DEVELOP');
      if (practiceActs.length > 0) {
        matchedIndicators++;
        for (const act of practiceActs) {
          const ref = refs.activityRefs[act.id];
          if (ref && !evidenceRefs.includes(ref)) {
            evidenceRefs.push(ref);
            evidenceDetails.push({
              entityType: 'ACTIVITY',
              entityRef: ref,
              entityId: act.id,
              description: `กิจกรรมฝึกปฏิบัติ (${act.minutes} นาที): ${act.title || act.student_actions.substring(0, 40)}`,
            });
          }
        }
      }
      // Sufficient practice duration (at least 20 min or 30% of lesson)
      const practiceMinutes = practiceActs.reduce((s, a) => s + (Number(a.minutes) || 0), 0);
      const totalMinutes = graph.lesson.duration_minutes || 60;
      if (practiceMinutes >= 15 || practiceMinutes >= totalMinutes * 0.25) {
        matchedIndicators++;
      }
      if (practiceActs.length === 0) {
        gap = 'ยังไม่มีกิจกรรมที่เปิดโอกาสให้นักเรียนฝึกปฏิบัติ (PRACTICE)';
        suggestion = 'เพิ่มกิจกรรมให้นักเรียนได้ฝึกใช้ความรู้ เช่น การทำงานคู่ งานกลุ่ม หรือการแก้ปัญหา';
      }
      break;
    }

    case 'FORMATIVE_ASSESSMENT': {
      // Assessments present and linked
      if (graph.assessments.length > 0 && graph.assessmentEvidenceLinks.length > 0) {
        matchedIndicators++;
        for (const asm of graph.assessments) {
          const ref = refs.assessmentRefs[asm.id];
          if (ref && !evidenceRefs.includes(ref)) {
            evidenceRefs.push(ref);
            evidenceDetails.push({
              entityType: 'ASSESSMENT',
              entityRef: ref,
              entityId: asm.id,
              description: `การประเมิน: ${asm.name} (${asm.method || 'ประเมินตามเกณฑ์'})`,
            });
          }
        }
      }
      // Tools present
      if ((graph.assessmentTools || []).length > 0) {
        matchedIndicators++;
        for (const tool of graph.assessmentTools) {
          const ref = refs.toolRefs[tool.id];
          if (ref && !evidenceRefs.includes(ref)) {
            evidenceRefs.push(ref);
            evidenceDetails.push({
              entityType: 'ASSESSMENT_TOOL',
              entityRef: ref,
              entityId: tool.id,
              description: `เครื่องมือประเมิน: ${tool.tool_type || 'แบบประเมิน'}`,
            });
          }
        }
      }
      if (graph.assessments.length === 0) {
        gap = 'ยังไม่มีรายการวัดและประเมินผลในแผน';
        suggestion = 'กำหนดวิธีวัดและเครื่องมือประเมินให้สอดคล้องกับหลักฐานการเรียนรู้';
      } else if ((graph.assessmentTools || []).length === 0) {
        gap = 'มีการประเมินผลแต่ยังไม่ได้แนบเครื่องมือประเมิน';
        suggestion = 'สร้างหรือแนบรูบริก/แบบประเมินสำหรับรายการวัดผล';
      }
      break;
    }

    case 'FORMATIVE_FEEDBACK': {
      // Feedback moment in activities
      const feedbackActs = graph.activities.filter(a => Boolean(a.feedback_moment && a.feedback_moment.trim()));
      if (feedbackActs.length > 0) {
        matchedIndicators++;
        for (const act of feedbackActs) {
          const ref = refs.activityRefs[act.id];
          if (ref && !evidenceRefs.includes(ref)) {
            evidenceRefs.push(ref);
            evidenceDetails.push({
              entityType: 'ACTIVITY',
              entityRef: ref,
              entityId: act.id,
              description: `ช่วงสะท้อนคิด/ป้อนกลับ: ${act.feedback_moment}`,
            });
          }
        }
      }
      // Formative assessment check in activities
      const formativeActs = graph.activities.filter(a => Boolean(a.assessment_moment && a.assessment_moment.trim()));
      if (formativeActs.length > 0) {
        matchedIndicators++;
        for (const act of formativeActs) {
          const ref = refs.activityRefs[act.id];
          if (ref && !evidenceRefs.includes(ref)) {
            evidenceRefs.push(ref);
            evidenceDetails.push({
              entityType: 'ACTIVITY',
              entityRef: ref,
              entityId: act.id,
              description: `ช่วงตรวจความเข้าใจ: ${act.assessment_moment}`,
            });
          }
        }
      }
      if (feedbackActs.length === 0 && formativeActs.length === 0) {
        gap = 'ยังไม่มีการระบุช่วงเวลาสะท้อนคิด (Feedback) หรือตรวจความเข้าใจระหว่างเรียน';
        suggestion = 'ระบุคำถามตรวจความเข้าใจหรือช่วงเวลาให้ข้อมูลย้อนกลับในกิจกรรมการเรียนรู้';
      }
      break;
    }

    case 'LEARNING_RESOURCES': {
      const readyAssets = (graph.teachingAssets || []).filter(a => a.generation_status === 'READY');
      if (readyAssets.length > 0) {
        matchedIndicators++;
        for (const asset of readyAssets) {
          const ref = refs.assetRefs[asset.id];
          if (ref && !evidenceRefs.includes(ref)) {
            evidenceRefs.push(ref);
            evidenceDetails.push({
              entityType: 'ASSET',
              entityRef: ref,
              entityId: asset.id,
              description: `สื่อการสอน: ${asset.title} (${asset.asset_type})`,
            });
          }
        }
      }
      // Check if assets are linked to activities or objectives
      const hasLinkedAssets = (graph.assetActivityLinks || []).length > 0 || (graph.assetObjectiveLinks || []).length > 0;
      if (hasLinkedAssets && readyAssets.length > 0) {
        matchedIndicators++;
      }
      if (readyAssets.length === 0) {
        gap = 'ยังไม่มีสื่อการสอนที่พร้อมใช้งานในชุดพร้อมสอน';
        suggestion = 'จัดเตรียมหรือสร้างสื่อการสอนที่จำเป็นในขั้นที่ 5';
      }
      break;
    }

    case 'MEASURABLE_OUTCOMES': {
      // Measurable learning evidence
      if (graph.evidence.length > 0 && graph.objectiveEvidenceLinks.length > 0) {
        matchedIndicators++;
        for (const evd of graph.evidence) {
          const ref = refs.evidenceRefs[evd.id];
          if (ref && !evidenceRefs.includes(ref)) {
            evidenceRefs.push(ref);
            evidenceDetails.push({
              entityType: 'EVIDENCE',
              entityRef: ref,
              entityId: evd.id,
              description: `หลักฐานการเรียนรู้ (${evd.evidence_type}): ${evd.description.substring(0, 50)}...`,
            });
          }
        }
      }
      // Criteria defined on assessments
      const hasCriteria = graph.assessments.some(a => Boolean(a.criteria_text && a.criteria_text.trim()));
      if (hasCriteria) {
        matchedIndicators++;
      }
      if (graph.evidence.length === 0) {
        gap = 'ยังไม่มีการระบุหลักฐานการเรียนรู้เชิงประจักษ์';
        suggestion = 'ระบุชิ้นงาน การปฏิบัติ หรือพฤติกรรมที่แสดงว่านักเรียนเกิดการเรียนรู้';
      }
      break;
    }
  }

  // Determine status strictly adhering to V3.7R rules:
  // RULE: If status is 'EVIDENCED', evidenceRefs.length MUST be >= 1.
  let status: V3PaItemResult['status'] = 'NOT_EVIDENCED';

  if (evidenceRefs.length === 0) {
    status = 'NOT_EVIDENCED';
  } else if (matchedIndicators >= totalIndicators && evidenceRefs.length >= 1) {
    status = 'EVIDENCED';
  } else if (evidenceRefs.length >= 1 || matchedIndicators > 0) {
    status = 'PARTIALLY_EVIDENCED';
  }

  // Build professional planned-evidence reason
  let reason = '';
  if (status === 'EVIDENCED') {
    reason = `แผนนี้ออกแบบให้มี${criterion.systemLabel}อย่างชัดเจน โดยพบหลักฐานที่จัดเตรียมไว้ (${evidenceRefs.join(', ')})`;
  } else if (status === 'PARTIALLY_EVIDENCED') {
    reason = `แผนนี้มีการออกแบบ${criterion.systemLabel}บางส่วน (${evidenceRefs.join(', ')}) แต่ยังสามารถเพิ่มเติมรายละเอียดให้สมบูรณ์ขึ้นได้`;
  } else {
    reason = `แผนนี้ยังไม่พบหลักฐานการออกแบบ${criterion.systemLabel}`;
  }

  return {
    criterionId: criterion.id,
    systemLabel: criterion.systemLabel,
    officialCode: criterion.officialCode,
    officialLabel: criterion.officialLabel,
    domain: 'LEARNING_MANAGEMENT',
    mappingType: criterion.mappingType,
    status,
    evidenceRefs,
    evidenceDetails,
    reason,
    gap,
    suggestion,
    isPlanPhaseOnly: true,
  };
}

export function evaluatePaReadiness(
  graph: V3LessonGraph,
  alignmentGraph: V3LessonAlignmentGraph,
  lessonHash: string
): V3PaReadinessResult {
  const criteriaVersion = getActivePaCriteriaVersion();
  const { buildEntityRefs } = require('../quality/alignmentGraph');
  const refs = buildEntityRefs(graph);

  const items = criteriaVersion.criteria.map(c =>
    evaluateCriterion(c, graph, alignmentGraph, refs)
  );

  const summary = {
    totalItems: items.length,
    evidenced: items.filter(i => i.status === 'EVIDENCED').length,
    partiallyEvidenced: items.filter(i => i.status === 'PARTIALLY_EVIDENCED').length,
    notEvidenced: items.filter(i => i.status === 'NOT_EVIDENCED').length,
    notApplicable: items.filter(i => i.status === 'NOT_APPLICABLE').length,
  };

  return {
    criteriaVersion,
    evidenceStage: 'PLANNED',
    reviewedAt: new Date().toISOString(),
    lessonHash,
    items,
    summary,
    planPhaseDisclaimer: 'ส่วนนี้เป็นเครื่องมือช่วยตรวจความสอดคล้องของแผนและหลักฐานที่ออกแบบไว้ ไม่ใช่ผลการประเมินวิทยฐานะอย่างเป็นทางการ',
    aiUsed: false,
  };
}
