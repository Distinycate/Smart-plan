/**
 * Smart Plan V3 — Post-Teaching Document Overlay
 *
 * Implements Architecture Rule:
 * Immutable FINAL Snapshot + Post-Teaching Record + Observed Evidence = Post-Teaching Document View
 *
 * Requirements:
 * - Does NOT mutate the input FINAL snapshot document.
 * - Produces canonical V3LessonDocument for TAUGHT or REFLECTED lifecycle states.
 * - Preserves baseFinalHash for complete provenance.
 * - Generates deterministic postTeachingSourceHash.
 * - ZERO AI calls.
 */

import * as crypto from 'crypto';
import type {
  V3LessonDocument,
  DocumentSection,
  PostTeachingRecordedSection,
} from './types';
import type {
  PostTeachingOverlayData,
  V3PostTeachingRecord,
  V3ObservedStudentEvidence,
  ObservedOutcomeEvidenceSummary,
} from '../types';
import { SECTION_TITLES } from './labels';

export function computePostTeachingHash(overlay: PostTeachingOverlayData): string {
  const rec = overlay.record;
  const canonicalData = {
    taught_at: rec?.taught_at || '',
    students_total: rec?.students_total ?? 0,
    students_present: rec?.students_present ?? null,
    students_absent: rec?.students_absent ?? null,
    students_assessed: rec?.students_assessed ?? null,
    students_passed: rec?.students_passed ?? 0,
    students_need_support: rec?.students_need_support ?? 0,
    actual_teaching_notes: rec?.actual_teaching_notes || '',
    what_worked: rec?.what_worked || '',
    problems: rec?.problems || '',
    adjustments_made: rec?.adjustments_made || '',
    feedback_given: rec?.feedback_given || '',
    remediation_plan: rec?.remediation_plan || '',
    next_lesson_adjustment: rec?.next_lesson_adjustment || '',
    reflection: rec?.reflection || '',
    evidence: (overlay.observedEvidence || []).map(e => ({
      id: e.id,
      title: e.title,
      type: e.evidence_type,
      status: e.outcome_status,
      objective_id: e.objective_id,
    })),
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalData))
    .digest('hex')
    .substring(0, 16);
}

export function buildPostTeachingDocument(
  finalDocument: V3LessonDocument,
  overlay: PostTeachingOverlayData
): V3LessonDocument {
  const record = overlay.record;
  const isReflected = Boolean(record?.reflection && record.reflection.trim().length > 0);
  const status: 'TAUGHT' | 'REFLECTED' = isReflected ? 'REFLECTED' : 'TAUGHT';

  // 1. Calculate Hashes
  const baseFinalHash = finalDocument.baseFinalHash || finalDocument.documentSourceHash;
  const postTeachingSourceHash = computePostTeachingHash(overlay);
  const documentSourceHash = `${baseFinalHash}:${postTeachingSourceHash}`;

  // 2. Prepare Observed Evidence Summary Rows
  const observedEvidenceSummary = (overlay.observedEvidence || []).map(e => ({
    title: e.title,
    evidenceType: e.evidence_type,
    description: e.description || '',
    outcomeStatus: e.outcome_status,
    sampleLabel: e.sample_label,
  }));

  // 3. Prepare Observed Outcomes List
  const observedOutcomes = (overlay.outcomeSummary?.items || []).map(item => ({
    objectiveTitle: item.objectiveTitle || 'จุดประสงค์การเรียนรู้',
    status: item.status,
    evidenceCount: item.evidenceCount,
    evidenceRefs: item.evidenceRefs,
  }));

  // 4. Construct Section 10: PostTeachingRecordedSection
  const postTeachingSection: PostTeachingRecordedSection = {
    id: 'SEC_POST_TEACHING',
    type: 'postTeachingRecorded',
    title: SECTION_TITLES.POST_TEACHING,
    sectionNumber: 10,
    status,
    taughtAt: record?.taught_at || null,
    actualDurationMinutes: record?.actual_duration_minutes || null,
    studentsTotal: record?.students_total || null,
    studentsPresent: record?.students_present ?? null,
    studentsAbsent: record?.students_absent ?? null,
    studentsAssessed: record?.students_assessed ?? null,
    studentsPassed: record?.students_passed || null,
    studentsNeedSupport: record?.students_need_support || null,
    actualTeachingNotes: record?.actual_teaching_notes || '',
    whatWorked: isReflected ? record?.what_worked || null : null,
    problems: isReflected ? record?.problems || null : null,
    adjustmentsMade: isReflected ? record?.adjustments_made || null : null,
    feedbackGiven: isReflected ? record?.feedback_given || null : null,
    remediationPlan: isReflected ? record?.remediation_plan || null : null,
    nextLessonAdjustment: isReflected ? record?.next_lesson_adjustment || null : null,
    reflection: isReflected ? record?.reflection || null : null,
    observedEvidenceSummary,
    observedOutcomes,
    avoidBreakInside: false,
  };

  // 5. Replace Section 10 in Sections Array
  const newSections: DocumentSection[] = finalDocument.sections.map(sec => {
    if (sec.id === 'SEC_POST_TEACHING' || sec.type === 'postTeachingPlaceholder') {
      return postTeachingSection;
    }
    return sec;
  });

  // If section 10 wasn't in original document (e.g. placeholder was false), append it
  const hasPostTeaching = newSections.some(s => s.id === 'SEC_POST_TEACHING');
  if (!hasPostTeaching) {
    newSections.push(postTeachingSection);
  }

  // 6. Return New Overlaid Canonical Document (Immutable copy)
  return {
    ...finalDocument,
    metadata: {
      ...finalDocument.metadata,
      status,
      statusLabel: status === 'REFLECTED' ? 'สะท้อนผลสมบูรณ์ (REFLECTED)' : 'จัดกิจกรรมแล้ว (TAUGHT)',
    },
    sections: newSections,
    documentSourceHash,
    baseFinalHash,
    postTeachingSourceHash,
  };
}
