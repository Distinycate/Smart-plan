import { SubjectProfile } from './types';

export const PHYSICAL_EDUCATION_PROFILE: SubjectProfile = {
  key: 'PHYSICAL_EDUCATION',
  labelTh: 'พลศึกษา (Physical Education)',
  descriptionTh: 'มุ่งเน้นทักษะกลไกการเคลื่อนไหว การเล่นกีฬา สมรรถภาพทางกาย การทำงานเป็นทีม และการมีน้ำใจนักกีฬา',
  learningFocuses: [
    { key: 'SPORT_SKILL', labelTh: 'ทักษะการเล่นกีฬา (Sport & Game Skills)', descriptionTh: 'เน้นทักษะเฉพาะของกีฬา เช่น การเดาะบอล การส่งลูก การยิงประตู และกลยุทธ์การเล่น' },
    { key: 'MOVEMENT_SKILL', labelTh: 'ทักษะการเคลื่อนไหวพื้นฐาน (Fundamental Movement Skills)', descriptionTh: 'เน้นการเคลื่อนไหวแบบอยู่กับที่ เคลื่อนที่ และใช้อุปกรณ์ประกอบ' },
    { key: 'PHYSICAL_FITNESS', labelTh: 'สมรรถภาพทางกาย (Physical Fitness)', descriptionTh: 'เน้นความแข็งแรง ความอดทน ความอ่อนตัว และความคล่องแคล่วว่องไว' },
    { key: 'TEAM_PLAY', labelTh: 'การทำงานเป็นทีมและน้ำใจนักกีฬา (Team Play & Sportsmanship)', descriptionTh: 'เน้นการปฏิบัติตามกติกา ความมีวินัย การช่วยเหลือกัน และการเคารพคู่แข่งขัน' },
  ],
  objectiveGuidance: {
    'SPORT_SKILL': ['ปฏิบัติตามทักษะเฉพาะกีฬา', 'ส่งและรับลูกได้อย่างแม่นยำ', 'ใช้ยุทธวิธีในการเล่นเกม', 'ควบคุมอุปกรณ์กีฬาได้อย่างถูกต้อง'],
    'MOVEMENT_SKILL': ['เคลื่อนไหวร่างกายอย่างสมดุล', 'ทรงตัวในท่าทางต่างๆ', 'ประสานการทำงานของประสาทและกล้ามเนื้อ'],
    'PHYSICAL_FITNESS': ['ทดสอบสมรรถภาพทางกาย', 'ปฏิบัติกิจกรรมเสริมสร้างกล้ามเนื้อ', 'ประเมินระดับความฟิตของตนเอง'],
    'TEAM_PLAY': ['ปฏิบัติตามกฎกติกาอย่างเคร่งครัด', 'แสดงน้ำใจนักกีฬา', 'สื่อสารและร่วมมือกับเพื่อนร่วมทีม'],
  },
  preferredLearningPatterns: {
    'SPORT_SKILL': ['Practice Style (Mosston Spectrum of Teaching Styles)', 'Games Sense / Teaching Games for Understanding (TGfU)'],
    'MOVEMENT_SKILL': ['Command-Practice Demonstration Model', 'Movement Exploration'],
    'PHYSICAL_FITNESS': ['Circuit Training Station Practicum', 'Interval Activity Design'],
    'TEAM_PLAY': ['Cooperative Learning in PE', 'Sport Education Model (SEM)'],
  },
  evidenceRules: {
    'SPORT_SKILL': {
      preferred: ['PERFORMANCE', 'OBSERVATION'],
      supported: ['PEER_ASSESSMENT', 'CHECKLIST'],
      notRecommended: ['WRITTEN_TEST', 'WORKSHEET', 'MULTIPLE_CHOICE'],
    },
    'MOVEMENT_SKILL': {
      preferred: ['PERFORMANCE', 'OBSERVATION'],
      supported: ['CHECKLIST'],
      notRecommended: ['WORKSHEET', 'ESSAY'],
    },
    'PHYSICAL_FITNESS': {
      preferred: ['FITNESS_DATA_RECORD', 'PERFORMANCE', 'OBSERVATION'],
      supported: ['SELF_ASSESSMENT_SHEET'],
      notRecommended: ['WRITTEN_EXAM'],
    },
    'TEAM_PLAY': {
      preferred: ['OBSERVATION', 'BEHAVIORAL_RECORD'],
      supported: ['PEER_REVIEW', 'REFLECTION'],
      notRecommended: ['ANSWER_KEY'],
    },
  },
  assessmentRules: {
    'SPORT_SKILL': {
      preferred: ['CHECKLIST', 'PERFORMANCE_RUBRIC'],
      supported: ['RATING_SCALE'],
      notRecommended: ['ANSWER_KEY', 'QUIZ'],
    },
    'MOVEMENT_SKILL': {
      preferred: ['CHECKLIST', 'OBSERVATION'],
      supported: ['PERFORMANCE_RUBRIC'],
      notRecommended: ['ANSWER_KEY'],
    },
    'PHYSICAL_FITNESS': {
      preferred: ['FITNESS_STANDARD_CRITERIA', 'DATA_RECORD_SHEET'],
      supported: ['CHECKLIST'],
      notRecommended: ['MULTIPLE_CHOICE_TEST'],
    },
    'TEAM_PLAY': {
      preferred: ['BEHAVIORAL_CHECKLIST', 'RUBRIC'],
      supported: ['OBSERVATION'],
      notRecommended: ['ANSWER_KEY'],
    },
  },
  assetRules: {
    'SPORT_SKILL': {
      preferred: ['DRILL_CARD', 'PERFORMANCE_CHECKLIST', 'STATION_GUIDE'],
      supported: ['TEACHER_PROMPT_SHEET', 'RULE_SUMMARY'],
      notRecommended: ['READING_PASSAGE', 'WORKSHEET'],
    },
    'MOVEMENT_SKILL': {
      preferred: ['MOVEMENT_TASK_CARD', 'CHECKLIST'],
      supported: ['STATION_SIGN'],
      notRecommended: ['PAPER_PENCIL_TEST'],
    },
    'PHYSICAL_FITNESS': {
      preferred: ['FITNESS_RECORD_CARD', 'STATION_INSTRUCTION'],
      supported: ['SELF_EVALUATION_SHEET'],
      notRecommended: ['FILL_IN_BLANK_SHEET'],
    },
    'TEAM_PLAY': {
      preferred: ['BEHAVIORAL_RUBRIC', 'GAME_RULES_CARD'],
      supported: ['TEAM_REFLECTION_CARD'],
      notRecommended: ['GRAMMAR_SHEET'],
    },
  },
  avoidPatterns: [
    'ใช้แบบทดสอบข้อเขียนเป็นหลักฐานหลักในการตัดสินทักษะการเคลื่อนไหวหรือการเล่นกีฬา (Motor Skill Performance)',
    'ละเลยการจัดเวลาให้ผู้เรียนได้ฝึกปฏิบัติจริง (Time on Task ต้องเกิน 60% ของคาบเรียนพลศึกษา)',
    'ตัดสินคะแนนความมีน้ำใจนักกีฬาโดยไม่มีเกณฑ์พฤติกรรมบ่งชี้ที่ชัดเจน',
  ],
};
