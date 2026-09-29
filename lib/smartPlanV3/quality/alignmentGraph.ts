/**
 * Smart Plan V3 — Lesson Alignment Graph Builder
 * Builds a traversable alignment graph from a V3LessonGraph.
 * Pure/deterministic — zero AI calls.
 */

import type {
  V3LessonGraph,
  V3LessonObjective,
  V3LearningEvidence,
  V3LessonActivity,
  V3Assessment,
  V3AssessmentTool,
  V3TeachingAsset,
} from '../types';
import type { V3LessonAlignmentGraph, V3AlignmentNode, V3AlignmentEdge } from './types';

/**
 * Assign temporary short references for display.
 * O1, O2 … for objectives; E1, E2 … for evidence; A1, A2 … for activities, etc.
 */
export function buildEntityRefs(graph: V3LessonGraph): {
  objectiveRefs: Record<string, string>; // id → ref (e.g. "O1")
  evidenceRefs: Record<string, string>;
  activityRefs: Record<string, string>;
  assessmentRefs: Record<string, string>;
  toolRefs: Record<string, string>;
  assetRefs: Record<string, string>;
  // Reverse maps
  refToId: Record<string, string>;
} {
  const objectiveRefs: Record<string, string> = {};
  const evidenceRefs: Record<string, string> = {};
  const activityRefs: Record<string, string> = {};
  const assessmentRefs: Record<string, string> = {};
  const toolRefs: Record<string, string> = {};
  const assetRefs: Record<string, string> = {};
  const refToId: Record<string, string> = {};

  const assign = (map: Record<string, string>, prefix: string, items: Array<{ id: string }>) => {
    items.forEach((item, idx) => {
      const ref = `${prefix}${idx + 1}`;
      map[item.id] = ref;
      refToId[ref] = item.id;
    });
  };

  assign(objectiveRefs, 'O', graph.objectives);
  assign(evidenceRefs, 'E', graph.evidence);
  assign(activityRefs, 'A', graph.activities);
  assign(assessmentRefs, 'ASM', graph.assessments);
  assign(toolRefs, 'TOOL', graph.assessmentTools);
  assign(assetRefs, 'AST', graph.teachingAssets);

  return { objectiveRefs, evidenceRefs, activityRefs, assessmentRefs, toolRefs, assetRefs, refToId };
}

/**
 * Build the full alignment graph including orphan detection.
 * This is the central helper used by both the rule engine and PA readiness engine.
 */
export function buildLessonAlignmentGraph(graph: V3LessonGraph): V3LessonAlignmentGraph {
  const refs = buildEntityRefs(graph);
  const nodes: V3AlignmentNode[] = [];
  const edges: V3AlignmentEdge[] = [];

  // Register nodes
  graph.objectives.forEach(o => {
    nodes.push({ type: 'OBJECTIVE', id: o.id, ref: refs.objectiveRefs[o.id], label: o.statement.substring(0, 60) });
  });
  graph.evidence.forEach(e => {
    nodes.push({ type: 'EVIDENCE', id: e.id, ref: refs.evidenceRefs[e.id], label: e.description.substring(0, 60) });
  });
  graph.activities.forEach(a => {
    nodes.push({ type: 'ACTIVITY', id: a.id, ref: refs.activityRefs[a.id], label: (a.title || a.phase).substring(0, 60) });
  });
  graph.assessments.forEach(a => {
    nodes.push({ type: 'ASSESSMENT', id: a.id, ref: refs.assessmentRefs[a.id], label: a.name.substring(0, 60) });
  });
  graph.assessmentTools.forEach(t => {
    nodes.push({ type: 'ASSESSMENT_TOOL', id: t.id, ref: refs.toolRefs[t.id], label: t.title.substring(0, 60) });
  });
  graph.teachingAssets.forEach(a => {
    nodes.push({ type: 'ASSET', id: a.id, ref: refs.assetRefs[a.id], label: a.title.substring(0, 60) });
  });

  // Build edge indexes
  const objectiveToEvidence: Record<string, string[]> = {};
  const evidenceToObjective: Record<string, string[]> = {};
  const evidenceToActivities: Record<string, string[]> = {};
  const activityToEvidence: Record<string, string[]> = {};
  const evidenceToAssessments: Record<string, string[]> = {};
  const assessmentToEvidence: Record<string, string[]> = {};
  const assessmentToTools: Record<string, string[]> = {};
  const activityToObjectives: Record<string, string[]> = {};
  const assetLinks: Set<string> = new Set();

  // Objective ↔ Evidence links
  for (const link of graph.objectiveEvidenceLinks) {
    const objRef = refs.objectiveRefs[link.objective_id];
    const evdRef = refs.evidenceRefs[link.evidence_id];
    if (!objRef || !evdRef) continue;
    (objectiveToEvidence[objRef] ||= []).push(evdRef);
    (evidenceToObjective[evdRef] ||= []).push(objRef);
    edges.push({ fromRef: objRef, toRef: evdRef, relationshipType: 'OBJECTIVE→EVIDENCE' });
  }

  // Activity ↔ Evidence links
  for (const link of graph.activityEvidenceLinks) {
    const actRef = refs.activityRefs[link.activity_id];
    const evdRef = refs.evidenceRefs[link.evidence_id];
    if (!actRef || !evdRef) continue;
    (evidenceToActivities[evdRef] ||= []).push(actRef);
    (activityToEvidence[actRef] ||= []).push(evdRef);
    edges.push({ fromRef: evdRef, toRef: actRef, relationshipType: 'EVIDENCE→ACTIVITY' });
  }

  // Activity ↔ Objective links
  for (const link of graph.activityObjectiveLinks) {
    const actRef = refs.activityRefs[link.activity_id];
    const objRef = refs.objectiveRefs[link.objective_id];
    if (!actRef || !objRef) continue;
    (activityToObjectives[actRef] ||= []).push(objRef);
    edges.push({ fromRef: actRef, toRef: objRef, relationshipType: 'ACTIVITY→OBJECTIVE' });
  }

  // Assessment ↔ Evidence links
  for (const link of graph.assessmentEvidenceLinks) {
    const asmRef = refs.assessmentRefs[link.assessment_id];
    const evdRef = refs.evidenceRefs[link.evidence_id];
    if (!asmRef || !evdRef) continue;
    (evidenceToAssessments[evdRef] ||= []).push(asmRef);
    (assessmentToEvidence[asmRef] ||= []).push(evdRef);
    edges.push({ fromRef: evdRef, toRef: asmRef, relationshipType: 'EVIDENCE→ASSESSMENT' });
  }

  // Assessment → Tool links (tool belongs to an assessment)
  for (const tool of graph.assessmentTools) {
    const asmRef = refs.assessmentRefs[tool.assessment_id];
    const toolRef = refs.toolRefs[tool.id];
    if (!asmRef || !toolRef) continue;
    (assessmentToTools[asmRef] ||= []).push(toolRef);
    edges.push({ fromRef: asmRef, toRef: toolRef, relationshipType: 'ASSESSMENT→TOOL' });
  }

  // Asset links (track which assets have any lesson relationship)
  const linkedAssetIds = new Set<string>();
  for (const link of (graph.assetObjectiveLinks || [])) {
    linkedAssetIds.add(link.asset_id);
    const astRef = refs.assetRefs[link.asset_id];
    const objRef = refs.objectiveRefs[link.objective_id];
    if (astRef && objRef) edges.push({ fromRef: astRef, toRef: objRef, relationshipType: 'ASSET→OBJECTIVE' });
  }
  for (const link of (graph.assetActivityLinks || [])) {
    linkedAssetIds.add(link.asset_id);
    const astRef = refs.assetRefs[link.asset_id];
    const actRef = refs.activityRefs[link.activity_id];
    if (astRef && actRef) edges.push({ fromRef: astRef, toRef: actRef, relationshipType: 'ASSET→ACTIVITY' });
  }
  for (const link of (graph.assetEvidenceLinks || [])) {
    linkedAssetIds.add(link.asset_id);
    const astRef = refs.assetRefs[link.asset_id];
    const evdRef = refs.evidenceRefs[link.evidence_id];
    if (astRef && evdRef) edges.push({ fromRef: astRef, toRef: evdRef, relationshipType: 'ASSET→EVIDENCE' });
  }

  // ── Orphan Detection ────────────────────────────────────────────

  const objectivesWithoutEvidence = graph.objectives
    .filter(o => !(objectiveToEvidence[refs.objectiveRefs[o.id]]?.length))
    .map(o => refs.objectiveRefs[o.id]);

  const evidenceWithoutObjective = graph.evidence
    .filter(e => !(evidenceToObjective[refs.evidenceRefs[e.id]]?.length))
    .map(e => refs.evidenceRefs[e.id]);

  const evidenceWithoutActivity = graph.evidence
    .filter(e => !(evidenceToActivities[refs.evidenceRefs[e.id]]?.length))
    .map(e => refs.evidenceRefs[e.id]);

  const evidenceWithoutAssessment = graph.evidence
    .filter(e => !(evidenceToAssessments[refs.evidenceRefs[e.id]]?.length))
    .map(e => refs.evidenceRefs[e.id]);

  const assessmentsWithoutEvidence = graph.assessments
    .filter(a => !(assessmentToEvidence[refs.assessmentRefs[a.id]]?.length))
    .map(a => refs.assessmentRefs[a.id]);

  const assetsWithoutAnyLink = graph.teachingAssets
    .filter(a => !linkedAssetIds.has(a.id))
    .map(a => refs.assetRefs[a.id]);

  return {
    nodes,
    edges,
    objectiveToEvidence,
    evidenceToActivities,
    evidenceToAssessments,
    assessmentToTools,
    orphans: {
      objectivesWithoutEvidence,
      evidenceWithoutObjective,
      evidenceWithoutActivity,
      evidenceWithoutAssessment,
      assessmentsWithoutEvidence,
      assetsWithoutAnyLink,
    },
  };
}

/**
 * Check that all refs used by AI output are valid (in the known ref set).
 * Rejects phantom refs like "A99".
 */
export function validateAiRefs(
  refs: string[],
  knownRefs: Set<string>
): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const ref of refs) {
    if (knownRefs.has(ref)) valid.push(ref);
    else invalid.push(ref);
  }
  return { valid, invalid };
}

/**
 * Compute a stable content hash of quality-relevant fields.
 * Used to detect staleness of cached AI reviews.
 */
export function computeLessonHash(graph: V3LessonGraph): string {
  const relevant = {
    lesson: { id: graph.lesson?.id, topic: graph.lesson?.topic, focus: graph.lesson?.learning_focus, duration: graph.lesson?.duration_minutes },
    objectives: graph.objectives.map(o => ({ id: o.id, s: o.statement, u: o.updated_at })),
    evidence: graph.evidence.map(e => ({ id: e.id, d: e.description, u: e.updated_at })),
    activities: graph.activities.map(a => ({ id: a.id, m: a.minutes, sa: a.student_actions, u: a.updated_at })),
    assessments: graph.assessments.map(a => ({ id: a.id, t: a.assessment_type, u: a.updated_at })),
    assets: graph.teachingAssets.map(a => ({ id: a.id, t: a.asset_type, s: a.generation_status, u: a.updated_at })),
    links: {
      oe: graph.objectiveEvidenceLinks.length,
      ae: graph.activityEvidenceLinks.length,
      ae2: graph.assessmentEvidenceLinks.length,
    },
  };
  // Simple deterministic hash via JSON stringify + basic sum
  const str = JSON.stringify(relevant);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}
