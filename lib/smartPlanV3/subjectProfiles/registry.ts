import { SubjectProfile, SubjectProfileKey, RecommendationTier, LearningFocusConfig } from './types';
import { ENGLISH_PROFILE } from './english';
import { MATHEMATICS_PROFILE } from './mathematics';
import { SCIENCE_PROFILE } from './science';
import { PHYSICAL_EDUCATION_PROFILE } from './physicalEducation';
import { THAI_PROFILE } from './thai';
import { SOCIAL_STUDIES_PROFILE } from './socialStudies';
import { HEALTH_PROFILE } from './health';
import { ART_PROFILE } from './art';
import { CAREER_PROFILE } from './career';

const PROFILE_REGISTRY: Record<SubjectProfileKey, SubjectProfile> = {
  'ENGLISH': ENGLISH_PROFILE,
  'MATHEMATICS': MATHEMATICS_PROFILE,
  'SCIENCE': SCIENCE_PROFILE,
  'PHYSICAL_EDUCATION': PHYSICAL_EDUCATION_PROFILE,
  'THAI': THAI_PROFILE,
  'SOCIAL_STUDIES': SOCIAL_STUDIES_PROFILE,
  'HEALTH': HEALTH_PROFILE,
  'ART': ART_PROFILE,
  'CAREER': CAREER_PROFILE,
};

export function getSubjectProfile(subjectKey: string): SubjectProfile | null {
  if (!subjectKey) return null;
  const normalizedKey = subjectKey.trim().toUpperCase() as SubjectProfileKey;
  return PROFILE_REGISTRY[normalizedKey] || null;
}

export function getAllSubjectProfiles(): SubjectProfile[] {
  return Object.values(PROFILE_REGISTRY);
}

export function getLearningFocusOptions(subjectKey: string): LearningFocusConfig[] {
  const profile = getSubjectProfile(subjectKey);
  return profile ? profile.learningFocuses : [];
}

export function getObjectiveGuidance(subjectKey: string, learningFocus?: string): string[] {
  const profile = getSubjectProfile(subjectKey);
  if (!profile) return [];
  if (learningFocus && profile.objectiveGuidance[learningFocus.toUpperCase()]) {
    return profile.objectiveGuidance[learningFocus.toUpperCase()];
  }
  // Fallback to first focus or combined guidance
  const firstFocus = profile.learningFocuses[0]?.key;
  return firstFocus ? (profile.objectiveGuidance[firstFocus] || []) : [];
}

export function getRecommendedEvidenceTypes(subjectKey: string, learningFocus?: string): RecommendationTier {
  const profile = getSubjectProfile(subjectKey);
  const empty: RecommendationTier = { preferred: [], supported: [], notRecommended: [] };
  if (!profile) return empty;

  const focusKey = learningFocus ? learningFocus.toUpperCase() : profile.learningFocuses[0]?.key;
  return profile.evidenceRules[focusKey] || empty;
}

export function getRecommendedAssessmentTypes(subjectKey: string, learningFocus?: string): RecommendationTier {
  const profile = getSubjectProfile(subjectKey);
  const empty: RecommendationTier = { preferred: [], supported: [], notRecommended: [] };
  if (!profile) return empty;

  const focusKey = learningFocus ? learningFocus.toUpperCase() : profile.learningFocuses[0]?.key;
  return profile.assessmentRules[focusKey] || empty;
}

export function getRecommendedAssetTypes(subjectKey: string, learningFocus?: string): RecommendationTier {
  const profile = getSubjectProfile(subjectKey);
  const empty: RecommendationTier = { preferred: [], supported: [], notRecommended: [] };
  if (!profile) return empty;

  const focusKey = learningFocus ? learningFocus.toUpperCase() : profile.learningFocuses[0]?.key;
  return profile.assetRules[focusKey] || empty;
}

/**
 * Validate that every registered Subject Profile satisfies the mandatory contract (Requirement 15)
 */
export function validateAllProfiles(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [key, profile] of Object.entries(PROFILE_REGISTRY)) {
    if (!profile.labelTh) {
      errors.push(`Profile ${key} is missing labelTh`);
    }
    if (!Array.isArray(profile.learningFocuses) || profile.learningFocuses.length === 0) {
      errors.push(`Profile ${key} must have at least 1 learningFocus`);
    } else {
      for (const focus of profile.learningFocuses) {
        if (!profile.evidenceRules[focus.key]) {
          errors.push(`Profile ${key} is missing evidenceRules for focus ${focus.key}`);
        }
        if (!profile.assessmentRules[focus.key]) {
          errors.push(`Profile ${key} is missing assessmentRules for focus ${focus.key}`);
        }
        if (!profile.assetRules[focus.key]) {
          errors.push(`Profile ${key} is missing assetRules for focus ${focus.key}`);
        }
        if (!profile.objectiveGuidance[focus.key]) {
          errors.push(`Profile ${key} is missing objectiveGuidance for focus ${focus.key}`);
        }
      }
    }
    if (!Array.isArray(profile.avoidPatterns) || profile.avoidPatterns.length === 0) {
      errors.push(`Profile ${key} must have avoidPatterns`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
