/**
 * Feature Flags Configuration for Smart Plan System
 * Ensures safe, non-destructive rollout of V3 features while preserving legacy workflows.
 */

export const FEATURE_FLAGS = {
  /**
   * Master Feature Flag for Smart Plan V3 (PA-Ready Teaching Package)
   * Can be toggled via NEXT_PUBLIC_SMART_PLAN_V3 environment variable.
   * Default: true in dev / configurable in production.
   */
  SMART_PLAN_V3: process.env.NEXT_PUBLIC_SMART_PLAN_V3 !== 'false',

  /**
   * Flag for V3 Objective-Evidence-Assessment Linkage Engine
   */
  V3_ALIGNMENT_ENGINE: process.env.NEXT_PUBLIC_V3_ALIGNMENT_ENGINE !== 'false',

  /**
   * Flag for PA Readiness Audit
   */
  V3_PA_READINESS: process.env.NEXT_PUBLIC_V3_PA_READINESS !== 'false',
} as const;

export function isV3Enabled(): boolean {
  return FEATURE_FLAGS.SMART_PLAN_V3;
}
