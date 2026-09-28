/**
 * Smart Plan V3 Subject Profile Engine Types
 * Deterministic configurations modeling pedagogical nature of each subject.
 */

export type SubjectProfileKey = 
  | 'ENGLISH'
  | 'THAI'
  | 'MATHEMATICS'
  | 'SCIENCE'
  | 'SOCIAL_STUDIES'
  | 'HEALTH'
  | 'PHYSICAL_EDUCATION'
  | 'ART'
  | 'CAREER';

export interface LearningFocusConfig {
  key: string;
  labelTh: string;
  descriptionTh: string;
}

export interface RecommendationTier {
  preferred: string[];      // สิ่งที่ควรใช้เป็นหลัก (Primary)
  supported: string[];      // สิ่งที่ใช้สนับสนุนได้ (Secondary/Contextual)
  notRecommended: string[]; // สิ่งที่ไม่ควรใช้เป็นตัวหลักสำหรับบริบทนี้ (Avoid/Anti-pattern)
}

export interface SubjectProfile {
  key: SubjectProfileKey;
  labelTh: string;
  descriptionTh: string;
  learningFocuses: LearningFocusConfig[];
  
  // Guidance on active observable verbs per learning focus
  objectiveGuidance: Record<string, string[]>;

  // Preferred pedagogical patterns (e.g. 2W3P, Inquiry, Active Learning)
  preferredLearningPatterns: Record<string, string[]>;

  // Evidence rules per learning focus
  evidenceRules: Record<string, RecommendationTier>;

  // Assessment rules per learning focus
  assessmentRules: Record<string, RecommendationTier>;

  // Asset recommendation rules per learning focus
  assetRules: Record<string, RecommendationTier>;

  // Avoid patterns and common pitfalls for this subject
  avoidPatterns: string[];
}
