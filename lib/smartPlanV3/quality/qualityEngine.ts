/**
 * Smart Plan V3 — Document Readiness Gate & Quality Engine Orchestrator
 * Combines Layer 1 (Rules) + Layer 3 (PA) into a unified quality check.
 * Layer 2 (AI) is called on-demand separately.
 */

import type { V3LessonGraph } from '../types';
import type { V3DocumentReadiness, V3QualityRuleResult } from './types';
import { buildLessonAlignmentGraph } from './alignmentGraph';
import { runStructuralQualityRules } from './qualityRules';

/**
 * Derive document readiness gate.
 * All blocking conditions must be cleared before Step 7 unlocks.
 * AI warnings do NOT block by default.
 */
export function deriveDocumentReadiness(
  graph: V3LessonGraph,
  ruleResult: V3QualityRuleResult
): V3DocumentReadiness {
  const blockingConditions: string[] = [];
  const warnings: string[] = [];

  // 1. Package must be PACKAGE_READY or higher
  const validStatuses = ['PACKAGE_READY', 'REVIEWED', 'FINAL', 'TAUGHT', 'REFLECTED'];
  const packageReady = validStatuses.includes(graph.lesson.status);
  if (!packageReady) {
    blockingConditions.push(`สถานะแผน (${graph.lesson.status}) ยังไม่ถึง PACKAGE_READY`);
  }

  // 2. No blocking quality errors
  const noBlockingErrors = ruleResult.blockingErrorCount === 0;
  if (!noBlockingErrors) {
    blockingConditions.push(`มีข้อผิดพลาดที่ต้องแก้ไข ${ruleResult.blockingErrorCount} รายการ`);
  }

  // 3. No stale required assets (needs_review = true)
  const staleRequired = graph.teachingAssets.filter(a => a.needs_review);
  const noStaleRequired = staleRequired.length === 0;
  if (!noStaleRequired) {
    blockingConditions.push(`สื่อที่จำเป็นต้องตรวจสอบอีกครั้ง ${staleRequired.length} รายการ`);
  }

  // 4. Assessment ready (all evidence assessed)
  const assessedEvdIds = new Set(graph.assessmentEvidenceLinks.map(l => l.evidence_id));
  const unassessedEvidence = graph.evidence.filter(e => !assessedEvdIds.has(e.id));
  const assessmentReady = graph.evidence.length > 0 && unassessedEvidence.length === 0;
  if (!assessmentReady) {
    blockingConditions.push(`มีหลักฐานที่ยังไม่มีการประเมิน ${unassessedEvidence.length} รายการ`);
  }

  // 5. Duration valid
  const total = graph.activities.reduce((s, a) => s + (Number(a.minutes) || 0), 0);
  const target = graph.lesson.duration_minutes || 60;
  const durationValid = graph.activities.length > 0 && total === target;
  if (!durationValid && graph.activities.length > 0) {
    blockingConditions.push(`เวลากิจกรรมรวม (${total} นาที) ไม่ตรงกับคาบเรียน (${target} นาที)`);
  }

  // 6. Objective coverage complete
  const coveredObjIds = new Set(graph.activityObjectiveLinks.map(l => l.objective_id));
  const uncoveredObjs = graph.objectives.filter(o => !coveredObjIds.has(o.id));
  const objectiveCoverageComplete = graph.objectives.length > 0 && uncoveredObjs.length === 0;
  if (!objectiveCoverageComplete && graph.objectives.length > 0) {
    blockingConditions.push(`มีจุดประสงค์ที่ยังไม่มีกิจกรรมรองรับ ${uncoveredObjs.length} ข้อ`);
  }

  // 7. Evidence coverage (all evidence linked to at least 1 activity)
  const linkedEvdIds = new Set(graph.activityEvidenceLinks.map(l => l.evidence_id));
  const unlinkedEvd = graph.evidence.filter(e => !linkedEvdIds.has(e.id));
  const evidenceCoverageComplete = graph.evidence.length > 0 && unlinkedEvd.length === 0;
  if (!evidenceCoverageComplete && graph.evidence.length > 0) {
    warnings.push(`มีหลักฐาน ${unlinkedEvd.length} รายการที่ยังไม่เชื่อมโยงกับกิจกรรม`);
  }

  // Non-blocking warnings from rule result
  const ruleWarnings = ruleResult.issues.filter(i => !i.isBlocking && i.severity === 'WARNING');
  for (const w of ruleWarnings) {
    if (!warnings.includes(w.title)) {
      warnings.push(w.title);
    }
  }

  const ready = blockingConditions.length === 0;

  return {
    ready,
    requiredStatus: 'REVIEWED',
    blockingConditions,
    warnings,
    checklist: {
      packageReady,
      noBlockingErrors,
      noStaleRequiredAssets: noStaleRequired,
      assessmentReady,
      durationValid,
      objectiveCoverageComplete,
      evidenceCoverageComplete,
    },
  };
}

/**
 * Run full deterministic quality check (Layer 1 + document gate).
 * Returns everything needed to render Step 6 without any AI calls.
 */
export function runQualityCheck(graph: V3LessonGraph): {
  alignmentGraph: ReturnType<typeof buildLessonAlignmentGraph>;
  ruleResult: V3QualityRuleResult;
  documentReadiness: V3DocumentReadiness;
} {
  const alignmentGraph = buildLessonAlignmentGraph(graph);
  const ruleResult = runStructuralQualityRules(graph, alignmentGraph);
  const documentReadiness = deriveDocumentReadiness(graph, ruleResult);

  return { alignmentGraph, ruleResult, documentReadiness };
}
