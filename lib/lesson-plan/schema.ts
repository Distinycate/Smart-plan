export const LESSON_PLAN_SCHEMA_VERSION = '1.0.0' as const;

export type EvaluationMode =
  | 'lesson_plan_basic'
  | 'wpa_w9'
  | 'committee_4d';

export type IndicatorType = 'during' | 'terminal' | 'unspecified';
export type LearningActivityStepType =
  | 'gathering'
  | 'processing'
  | 'applying'
  | 'self_regulating'
  | 'communication'
  | 'other';
export type AssessmentMethodType =
  | 'for_learning'
  | 'as_learning'
  | 'of_learning'
  | 'unspecified';
export type AssessmentToolType =
  | 'rubric'
  | 'checklist'
  | 'observation'
  | 'worksheet'
  | 'quiz'
  | 'portfolio'
  | 'performance_task'
  | 'other';

export interface LessonPlan {
  id?: string;
  metadata: {
    subjectGroup: string;
    subjectName: string;
    subjectCode?: string;
    gradeLevel: string;
    unitName: string;
    unitNumber?: string;
    planNumber?: string;
    lessonTitle: string;
    totalHours: number;
    teacherName?: string;
    schoolName?: string;
  };
  curriculum: {
    standards: Array<{
      code: string;
      description: string;
    }>;
    indicators: Array<{
      code: string;
      description: string;
      type: IndicatorType;
    }>;
    coreContent?: string[];
    localContent?: string[];
  };
  essence: {
    mainConcept: string;
    keyConcepts?: string[];
  };
  objectives: {
    knowledge: string[];
    process: string[];
    attitude: string[];
    competencyObjectives?: string[];
  };
  competencies: Array<{
    name: string;
    indicators?: string[];
    observableBehaviors?: string[];
    assessmentEvidence?: string[];
  }>;
  desirableCharacteristics: Array<{
    name: string;
    observableBehaviors?: string[];
    assessmentEvidence?: string[];
  }>;
  learningActivities: Array<{
    step: string;
    stepType?: LearningActivityStepType;
    durationMinutes?: number;
    teacherRole: string;
    studentRole: string;
    activeLearningTechniques?: string[];
    expectedEvidence?: string[];
    relatedObjectives?: string[];
    relatedIndicators?: string[];
  }>;
  activeLearning: {
    model?: string;
    techniques: string[];
    evidence: string[];
    studentCenteredEvidence?: string[];
  };
  gpas: {
    gathering?: string;
    processing?: string;
    applying?: string;
    selfRegulating?: string;
    communication?: string;
  };
  media: Array<{
    name: string;
    type?: string;
    purpose?: string;
    usedInActivityStep?: string;
  }>;
  assessment: {
    methods: Array<{
      name: string;
      type: AssessmentMethodType;
      targetObjectives: string[];
      targetIndicators?: string[];
      timing?: string;
    }>;
    tools: Array<{
      name: string;
      type: AssessmentToolType;
      targetObjectives: string[];
      criteria?: string[];
    }>;
    evidence: string[];
  };
  rubric: Array<{
    title: string;
    criteria: Array<{
      name: string;
      levels: Array<{
        score: number;
        description: string;
      }>;
    }>;
  }>;
  reflection?: {
    studentReflection?: string[];
    teacherReflection?: string[];
    improvementPlan?: string[];
  };
  homework?: string[];
  aiMetadata?: {
    generatedBy?: string;
    generatedAt?: string;
    sourceKnowledgeBaseVersion?: string;
    schemaVersion?: string;
  };
}

type JsonSchema = {
  readonly $schema?: string;
  readonly $id?: string;
  readonly title?: string;
  readonly type: string;
  readonly additionalProperties?: boolean;
  readonly required?: readonly string[];
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly items?: JsonSchema;
  readonly enum?: readonly (string | number | boolean | null)[];
  readonly minimum?: number;
};

const stringSchema = { type: 'string' } as const;
const stringArraySchema = { type: 'array', items: stringSchema } as const;

/**
 * Runtime JSON Schema for integrations that cannot consume TypeScript types.
 * It intentionally allows omitted optional properties but rejects unknown keys.
 */
export const LESSON_PLAN_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `https://smart-plan.local/schemas/lesson-plan/${LESSON_PLAN_SCHEMA_VERSION}`,
  title: 'Canonical Lesson Plan',
  type: 'object',
  additionalProperties: false,
  required: [
    'metadata',
    'curriculum',
    'essence',
    'objectives',
    'competencies',
    'desirableCharacteristics',
    'learningActivities',
    'activeLearning',
    'gpas',
    'media',
    'assessment',
    'rubric',
  ],
  properties: {
    id: stringSchema,
    metadata: {
      type: 'object',
      additionalProperties: false,
      required: [
        'subjectGroup',
        'subjectName',
        'gradeLevel',
        'unitName',
        'lessonTitle',
        'totalHours',
      ],
      properties: {
        subjectGroup: stringSchema,
        subjectName: stringSchema,
        subjectCode: stringSchema,
        gradeLevel: stringSchema,
        unitName: stringSchema,
        unitNumber: stringSchema,
        planNumber: stringSchema,
        lessonTitle: stringSchema,
        totalHours: { type: 'number', minimum: 0 },
        teacherName: stringSchema,
        schoolName: stringSchema,
      },
    },
    curriculum: {
      type: 'object',
      additionalProperties: false,
      required: ['standards', 'indicators'],
      properties: {
        standards: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['code', 'description'],
            properties: {
              code: stringSchema,
              description: stringSchema,
            },
          },
        },
        indicators: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['code', 'description', 'type'],
            properties: {
              code: stringSchema,
              description: stringSchema,
              type: {
                type: 'string',
                enum: ['during', 'terminal', 'unspecified'],
              },
            },
          },
        },
        coreContent: stringArraySchema,
        localContent: stringArraySchema,
      },
    },
    essence: {
      type: 'object',
      additionalProperties: false,
      required: ['mainConcept'],
      properties: {
        mainConcept: stringSchema,
        keyConcepts: stringArraySchema,
      },
    },
    objectives: {
      type: 'object',
      additionalProperties: false,
      required: ['knowledge', 'process', 'attitude'],
      properties: {
        knowledge: stringArraySchema,
        process: stringArraySchema,
        attitude: stringArraySchema,
        competencyObjectives: stringArraySchema,
      },
    },
    competencies: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name'],
        properties: {
          name: stringSchema,
          indicators: stringArraySchema,
          observableBehaviors: stringArraySchema,
          assessmentEvidence: stringArraySchema,
        },
      },
    },
    desirableCharacteristics: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name'],
        properties: {
          name: stringSchema,
          observableBehaviors: stringArraySchema,
          assessmentEvidence: stringArraySchema,
        },
      },
    },
    learningActivities: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['step', 'teacherRole', 'studentRole'],
        properties: {
          step: stringSchema,
          stepType: {
            type: 'string',
            enum: [
              'gathering',
              'processing',
              'applying',
              'self_regulating',
              'communication',
              'other',
            ],
          },
          durationMinutes: { type: 'number', minimum: 0 },
          teacherRole: stringSchema,
          studentRole: stringSchema,
          activeLearningTechniques: stringArraySchema,
          expectedEvidence: stringArraySchema,
          relatedObjectives: stringArraySchema,
          relatedIndicators: stringArraySchema,
        },
      },
    },
    activeLearning: {
      type: 'object',
      additionalProperties: false,
      required: ['techniques', 'evidence'],
      properties: {
        model: stringSchema,
        techniques: stringArraySchema,
        evidence: stringArraySchema,
        studentCenteredEvidence: stringArraySchema,
      },
    },
    gpas: {
      type: 'object',
      additionalProperties: false,
      properties: {
        gathering: stringSchema,
        processing: stringSchema,
        applying: stringSchema,
        selfRegulating: stringSchema,
        communication: stringSchema,
      },
    },
    media: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name'],
        properties: {
          name: stringSchema,
          type: stringSchema,
          purpose: stringSchema,
          usedInActivityStep: stringSchema,
        },
      },
    },
    assessment: {
      type: 'object',
      additionalProperties: false,
      required: ['methods', 'tools', 'evidence'],
      properties: {
        methods: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'type', 'targetObjectives'],
            properties: {
              name: stringSchema,
              type: {
                type: 'string',
                enum: [
                  'for_learning',
                  'as_learning',
                  'of_learning',
                  'unspecified',
                ],
              },
              targetObjectives: stringArraySchema,
              targetIndicators: stringArraySchema,
              timing: stringSchema,
            },
          },
        },
        tools: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'type', 'targetObjectives'],
            properties: {
              name: stringSchema,
              type: {
                type: 'string',
                enum: [
                  'rubric',
                  'checklist',
                  'observation',
                  'worksheet',
                  'quiz',
                  'portfolio',
                  'performance_task',
                  'other',
                ],
              },
              targetObjectives: stringArraySchema,
              criteria: stringArraySchema,
            },
          },
        },
        evidence: stringArraySchema,
      },
    },
    rubric: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'criteria'],
        properties: {
          title: stringSchema,
          criteria: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'levels'],
              properties: {
                name: stringSchema,
                levels: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['score', 'description'],
                    properties: {
                      score: { type: 'number', minimum: 0 },
                      description: stringSchema,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    reflection: {
      type: 'object',
      additionalProperties: false,
      properties: {
        studentReflection: stringArraySchema,
        teacherReflection: stringArraySchema,
        improvementPlan: stringArraySchema,
      },
    },
    homework: stringArraySchema,
    aiMetadata: {
      type: 'object',
      additionalProperties: false,
      properties: {
        generatedBy: stringSchema,
        generatedAt: stringSchema,
        sourceKnowledgeBaseVersion: stringSchema,
        schemaVersion: stringSchema,
      },
    },
  },
} as const satisfies JsonSchema;
