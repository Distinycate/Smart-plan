import {
  V3AssessmentType,
  V3AssessmentToolType,
  V3CriteriaType,
  V3BlueprintActivityDraft,
  V3AudienceType,
} from '../types';

export interface ObjectiveCandidate {
  id: string;
  level: 'FOUNDATION' | 'TARGET' | 'EXTENDED';
  levelLabelTh: string;
  levelBadgeCls: string;
  statement: string;
  rationale: string;
  observableVerb: string;
}

export interface EvidenceCandidate {
  id: string;
  evidenceType: string;
  labelTh: string;
  description: string;
  recommended: boolean;
  tag: string;
}

export interface ActivityFlowCandidate {
  id: string;
  name: string;
  patternName: string;
  stepsCount: number;
  totalMinutes: number;
  bestFor: string;
  summary: string[];
  activities: V3BlueprintActivityDraft[];
}

export interface AssessmentCandidate {
  id: string;
  name: string;
  type: V3AssessmentType;
  method: string;
  toolType: V3AssessmentToolType;
  toolTitle: string;
  criteriaType: V3CriteriaType;
  criteriaValue: number;
  criteriaText: string;
  isRecommended: boolean;
  description: string;
  sampleDescriptors?: string[];
}

export interface TeachingAssetChoice {
  assetType: string;
  labelTh: string;
  descriptionTh: string;
  audience: V3AudienceType;
  recommended: boolean;
  selectedByDefault: boolean;
}

export interface PostTeachingChipGroup {
  field: 'whatWorked' | 'problems' | 'remediationPlan' | 'nextLessonAdjustment' | 'actualTeachingNotes';
  title: string;
  chips: string[];
}
