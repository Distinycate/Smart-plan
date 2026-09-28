/**
 * Phase 0 architecture contract.
 *
 * This registry identifies the only routes that new product work may extend.
 * Compatibility routes remain available for existing callers, but must not be
 * selected for new UI flows or features.
 */
export const CANONICAL_FLOW_REGISTRY = {
  planning: {
    lessonPlanBuilder: ['/plan/new', '/plan/[id]'],
    unitPlanner: ['/unit-plans/new', '/unit-plans/[id]'],
    planApi: ['/api/plans', '/api/plans/[id]'],
  },
  ai: {
    generate: ['/api/ai-process-core', '/api/ai-process-activity'],
    complete: [
      '/api/ai-completion-k',
      '/api/ai-completion-p',
      '/api/ai-completion-a',
      '/api/ai-completion-reflection',
    ],
    evaluate: [
      '/api/evaluations/create',
      '/api/evaluations/process',
      '/api/evaluations/status/[jobId]',
      '/api/evaluations/result/[jobId]',
      '/api/evaluations/retry/[jobId]',
    ],
    improve: ['/api/lesson-plans/patch/create', '/api/lesson-plans/patch/process'],
  },
  compatibility: {
    // Kept for existing callers only. New features must not depend on them.
    deprecatedAiGeneration: ['/api/ai', '/api/ai-phase1', '/api/ai-phase2'],
    deprecatedSavedPlanEvaluation: [
      '/api/ai-evaluate',
      '/api/ai-evaluate-pa8',
      '/api/ai-evaluate-v4',
      '/api/evaluation-jobs/*',
    ],
    // Uploaded DOCX has no persisted lessonPlanId, so it remains a separate
    // compatibility flow until an import/preview design is approved.
    uploadedDocumentEvaluation: ['/api/ai-evaluate'],
    directPatchPreview: ['/api/lesson-plans/patch'],
  },
} as const;

export type CanonicalFlowRegistry = typeof CANONICAL_FLOW_REGISTRY;

export const AI_IMPROVEMENT_POLICY = {
  mode: 'preview_first',
  teacherReviewRequired: true,
  automaticLessonPlanWriteAllowed: false,
  note: 'AI may create proposed patches, but only a future explicit teacher-apply action may update LessonPlans.',
} as const;
