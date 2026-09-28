import { SubjectProfile } from './types';

export const ART_PROFILE: SubjectProfile = {
  key: 'ART',
  labelTh: 'ศิลปะ (ทัศนศิลป์ ดนตรี นาฏศิลป์)',
  descriptionTh: 'มุ่งเน้นการสร้างสรรค์จินตนาการ สุนทรียภาพทางทัศนศิลป์ ดนตรี และนาฏศิลป์ การแสดงออกทางอารมณ์ความรู้สึก และการเห็นคุณค่าทางวัฒนธรรม',
  learningFocuses: [
    { key: 'VISUAL_ART', labelTh: 'ทัศนศิลป์ (Visual Arts & Drawing)', descriptionTh: 'เน้นทัศนธาตุ รูปร่าง รูปทรง สี แสงเงา การวาดภาพระบายสี และงานปั้น' },
    { key: 'MUSIC', labelTh: 'ดนตรี (Music & Rhythm)', descriptionTh: 'เน้นจังหวะ ทำนอง การขับร้อง การบรรเลงเครื่องดนตรี และการฟังเพลงอย่างซาบซึ้ง' },
    { key: 'PERFORMING_ARTS', labelTh: 'นาฏศิลป์และการละคร (Performing Arts & Dance)', descriptionTh: 'เน้นท่ารำ ภาษาท่า นาฏยศัพท์ การเคลื่อนไหวประกอบจังหวะ และการแสดงละคร' },
  ],
  objectiveGuidance: {
    'VISUAL_ART': ['วาดภาพระบายสีถ่ายทอดความคิด', 'จัดองค์ประกอบศิลป์', 'ใช้วัสดุอุปกรณ์ทัศนศิลป์ได้อย่างถูกต้อง', 'วิเคราะห์คุณค่าของงานศิลปะ'],
    'MUSIC': ['ขับร้องเพลงตามจังหวะและทำนอง', 'บรรเลงเครื่องดนตรีเบื้องต้น', 'จำแนกเสียงและอารมณ์ของบทเพลง'],
    'PERFORMING_ARTS': ['ปฏิบัติท่ารำพื้นฐาน (นาฏยศัพท์)', 'เคลื่อนไหวร่างกายตามจังหวะเพลง', 'แสดงบทบาทสมมติในการละคร'],
  },
  preferredLearningPatterns: {
    'VISUAL_ART': ['Studio Workshop / Creative Practicum', 'Art Criticism Gallery Walk'],
    'MUSIC': ['Orff / Kodály Method', 'Choral and Instrumental Ensemble Practice'],
    'PERFORMING_ARTS': ['Imitation and Exploration (การเลียนแบบและต่อท่ารำ)', 'Creative Drama Workshop'],
  },
  evidenceRules: {
    'VISUAL_ART': {
      preferred: ['PRODUCT', 'ARTWORK', 'PORTFOLIO'],
      supported: ['OBSERVATION', 'CRITIQUE_RECORD'],
      notRecommended: ['ANSWER_KEY', 'MULTIPLE_CHOICE_ONLY'],
    },
    'MUSIC': {
      preferred: ['PERFORMANCE', 'OBSERVATION', 'AUDIO_RECORDING'],
      supported: ['CHECKLIST', 'SELF_ASSESSMENT'],
      notRecommended: ['WRITTEN_TEST_ONLY'],
    },
    'PERFORMING_ARTS': {
      preferred: ['PERFORMANCE', 'OBSERVATION'],
      supported: ['PEER_ASSESSMENT', 'CHECKLIST'],
      notRecommended: ['PAPER_PENCIL_TEST'],
    },
  },
  assessmentRules: {
    'VISUAL_ART': {
      preferred: ['PRODUCT_RUBRIC', 'HOLISTIC_RUBRIC'],
      supported: ['CHECKLIST'],
      notRecommended: ['ANSWER_KEY'],
    },
    'MUSIC': {
      preferred: ['PERFORMANCE_RUBRIC', 'RATING_SCALE'],
      supported: ['CHECKLIST'],
      notRecommended: ['ANSWER_KEY'],
    },
    'PERFORMING_ARTS': {
      preferred: ['PERFORMANCE_RUBRIC', 'OBSERVATION_CHECKLIST'],
      supported: ['RATING_SCALE'],
      notRecommended: ['ANSWER_KEY'],
    },
  },
  assetRules: {
    'VISUAL_ART': {
      preferred: ['ARTWORK_BRIEF', 'TECHNIQUE_GUIDE', 'PRODUCT_RUBRIC'],
      supported: ['COLOR_PALETTE_GUIDE', 'PORTFOLIO_CHECKLIST'],
      notRecommended: ['READING_PASSAGE'],
    },
    'MUSIC': {
      preferred: ['MUSIC_SCORE_SHEET', 'RHYTHM_CARD', 'PERFORMANCE_RUBRIC'],
      supported: ['LYRIC_SHEET', 'INSTRUMENT_GUIDE'],
      notRecommended: ['MATH_GRAPH'],
    },
    'PERFORMING_ARTS': {
      preferred: ['MOVEMENT_CHOREO_CARD', 'PERFORMANCE_RUBRIC'],
      supported: ['STAGE_LAYOUT_SHEET'],
      notRecommended: ['WORKSHEET'],
    },
  },
  avoidPatterns: [
    'ประเมินทักษะการวาดภาพหรือเล่นดนตรีด้วยข้อสอบปรนัยข้อเขียนโดยไม่มีการตรวจชิ้นงานจริงหรือฟังเสียงบรรเลง',
    'จำกัดความคิดสร้างสรรค์ด้วยการบังคับให้ผลงานศิลปะของนักเรียนทุกคนต้องเหมือนของครู 100%',
  ],
};
