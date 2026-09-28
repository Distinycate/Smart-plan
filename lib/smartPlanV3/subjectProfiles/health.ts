import { SubjectProfile } from './types';

export const HEALTH_PROFILE: SubjectProfile = {
  key: 'HEALTH',
  labelTh: 'สุขศึกษา (Health Education)',
  descriptionTh: 'มุ่งเน้นความรู้ความเข้าใจเรื่องการเจริญเติบโต การสร้างเสริมสุขภาพ การป้องกันโรค อาหาร และพฤติกรรมความปลอดภัย',
  learningFocuses: [
    { key: 'HEALTH_BEHAVIOR', labelTh: 'พฤติกรรมสุขภาพและสุขอนามัย (Health Behaviors)', descriptionTh: 'เน้นสุขบัญญัติแห่งชาติ การรับประทานอาหาร การพักผ่อน และการดูแลสุขอนามัยส่วนบุคคล' },
    { key: 'HEALTH_KNOWLEDGE', labelTh: 'ความรู้ความเข้าใจด้านสุขภาพ (Health Knowledge & Literacy)', descriptionTh: 'เน้นระบบการทำงานของร่างกาย โรคติดต่อ/ไม่ติดต่อ และสารเสพติด' },
    { key: 'DECISION_MAKING', labelTh: 'การตัดสินใจและการปฏิเสธ (Decision Making & Refusal Skills)', descriptionTh: 'เน้นทักษะชีวิต การหลีกเลี่ยงพฤติกรรมเสี่ยง และการตัดสินใจเลือกซื้อผลิตภัณฑ์สุขภาพ' },
    { key: 'LIFE_SKILLS', labelTh: 'ทักษะชีวิตและความปลอดภัย (Life Skills & Safety)', descriptionTh: 'เน้นการปฐมพยาบาลเบื้องต้น ความปลอดภัยจากอุบัติเหตุ และการจัดการอารมณ์ความเครียด' },
  ],
  objectiveGuidance: {
    'HEALTH_BEHAVIOR': ['ปฏิบัติตามหลักสุขอนามัย', 'เลือกรับประทานอาหารที่มีประโยชน์', 'หลีกเลี่ยงปัจจัยเสี่ยงต่อสุขภาพ'],
    'HEALTH_KNOWLEDGE': ['อธิบายการทำงานของระบบอวัยวะ', 'ระบุสาเหตุและการป้องกันโรค', 'วิเคราะห์ผลกระทบของสารเสพติด'],
    'DECISION_MAKING': ['ใช้ทักษะการปฏิเสธในสถานการณ์เสี่ยง', 'วิเคราะห์ฉลากผลิตภัณฑ์สุขภาพ', 'ตัดสินใจเลือกรับบริการสุขภาพ'],
    'LIFE_SKILLS': ['สาธิตขั้นตอนการปฐมพยาบาล', 'เสนอแนวทางป้องกันอุบัติภัย', 'ประยุกต์ใช้วิธีจัดการความเครียด'],
  },
  preferredLearningPatterns: {
    'HEALTH_BEHAVIOR': ['Health Habit Tracking Log', 'Behavior Modification Challenge'],
    'HEALTH_KNOWLEDGE': ['Concept Mapping', 'Scientific Health Literacy Discovery'],
    'DECISION_MAKING': ['Role-Play Refusal Skills Workshop', 'Consumer Product Investigation'],
    'LIFE_SKILLS': ['First Aid Simulation & Practice', 'Emergency Response Drill'],
  },
  evidenceRules: {
    'HEALTH_BEHAVIOR': {
      preferred: ['HEALTH_LOG', 'OBSERVATION', 'SELF_ASSESSMENT'],
      supported: ['WORKSHEET'],
      notRecommended: ['SPEED_TEST'],
    },
    'HEALTH_KNOWLEDGE': {
      preferred: ['WORKSHEET', 'QUIZ', 'CONCEPT_MAP'],
      supported: ['DISCUSSION'],
      notRecommended: ['MOTOR_PERFORMANCE'],
    },
    'DECISION_MAKING': {
      preferred: ['ROLE_PLAY_PERFORMANCE', 'CASE_STUDY_RESPONSE'],
      supported: ['WORKSHEET'],
      notRecommended: ['ROTE_MEMORY'],
    },
    'LIFE_SKILLS': {
      preferred: ['PERFORMANCE', 'PRACTICAL_DEMONSTRATION'],
      supported: ['CHECKLIST', 'WORKSHEET'],
      notRecommended: ['MULTIPLE_CHOICE_ONLY'],
    },
  },
  assessmentRules: {
    'HEALTH_BEHAVIOR': {
      preferred: ['CHECKLIST', 'RATING_SCALE'],
      supported: ['RUBRIC'],
      notRecommended: ['ANSWER_KEY'],
    },
    'HEALTH_KNOWLEDGE': {
      preferred: ['ANSWER_KEY', 'SCORING_GUIDE'],
      supported: ['CHECKLIST'],
      notRecommended: ['PERFORMANCE_RUBRIC'],
    },
    'DECISION_MAKING': {
      preferred: ['PERFORMANCE_RUBRIC', 'SCORING_GUIDE'],
      supported: ['CHECKLIST'],
      notRecommended: ['ANSWER_KEY'],
    },
    'LIFE_SKILLS': {
      preferred: ['PRACTICAL_CHECKLIST', 'RUBRIC'],
      supported: ['OBSERVATION'],
      notRecommended: ['ANSWER_KEY'],
    },
  },
  assetRules: {
    'HEALTH_BEHAVIOR': {
      preferred: ['HEALTH_HABIT_TRACKER', 'CHECKLIST'],
      supported: ['WORKSHEET'],
      notRecommended: ['SPORT_DRILL'],
    },
    'HEALTH_KNOWLEDGE': {
      preferred: ['WORKSHEET', 'INFOGRAPHIC_SHEET', 'ANSWER_KEY'],
      supported: ['QUESTION_SET'],
      notRecommended: ['SPEAKING_CARD'],
    },
    'DECISION_MAKING': {
      preferred: ['SCENARIO_PROMPT_CARD', 'RUBRIC'],
      supported: ['WORKSHEET'],
      notRecommended: ['TIMELINE_TEMPLATE'],
    },
    'LIFE_SKILLS': {
      preferred: ['FIRST_AID_GUIDE_SHEET', 'PRACTICAL_CHECKLIST'],
      supported: ['EMERGENCY_SCENARIO_CARD'],
      notRecommended: ['MUSIC_SCORE'],
    },
  },
  avoidPatterns: [
    'ประเมินทักษะการปฐมพยาบาลด้วยข้อสอบปรนัยโดยไม่มีการสาธิตหรือประเมินภาคปฏิบัติ',
    'วัดพฤติกรรมสุขภาพด้วยการถามความจำแทนการสังเกตและบันทึกพฤติกรรมต่อเนื่อง',
  ],
};
