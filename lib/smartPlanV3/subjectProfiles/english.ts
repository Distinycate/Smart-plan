import { SubjectProfile } from './types';

export const ENGLISH_PROFILE: SubjectProfile = {
  key: 'ENGLISH',
  labelTh: 'ภาษาต่างประเทศ (ภาษาอังกฤษ)',
  descriptionTh: 'มุ่งเน้นการสื่อสารจริงตามกรอบ CEFR พัฒนาทักษะการฟัง พูด อ่าน เขียน และการใช้ภาษาในชีวิตประจำวัน',
  learningFocuses: [
    { key: 'SPEAKING', labelTh: 'ทักษะการพูด (Speaking & Interaction)', descriptionTh: 'เน้นการสื่อสาร การออกเสียง การสนทนาถาม-ตอบ และการนำเสนอ' },
    { key: 'LISTENING', labelTh: 'ทักษะการฟัง (Listening Comprehension)', descriptionTh: 'เน้นการจับใจความสำคัญ ระบุรายละเอียด และปฏิบัติตามคำสั่งที่ได้ยิน' },
    { key: 'READING', labelTh: 'ทักษะการอ่าน (Reading Comprehension)', descriptionTh: 'เน้นการถอดรหัสคำศัพท์ อ่านจับใจความ ตีความ และสรุปสาระสำคัญ' },
    { key: 'WRITING', labelTh: 'ทักษะการเขียน (Writing & Composition)', descriptionTh: 'เน้นการเขียนประโยค ย่อหน้า และเรียบเรียงข้อความสื่อสาร' },
    { key: 'LANGUAGE_USE', labelTh: 'การใช้ไวยากรณ์และคำศัพท์ (Vocabulary & Grammar in Context)', descriptionTh: 'เน้นโครงสร้างภาษาและคำศัพท์ในบริบทการใช้งานจริง' },
    { key: 'INTEGRATED', labelTh: 'ทักษะบูรณาการ (Integrated Skills)', descriptionTh: 'การใช้ภาษาเพื่อการสื่อสารข้ามทักษะในสถานการณ์จำลอง' },
  ],
  objectiveGuidance: {
    'SPEAKING': ['ถามและตอบ', 'สนทนาแลกเปลี่ยน', 'บรรยายข้อมูล', 'นำเสนอ', 'ออกเสียงถูกต้องตามหลักสัทศาสตร์', 'สื่อสารตามสถานการณ์'],
    'LISTENING': ['ระบุใจความสำคัญ', 'ปฏิบัติตามคำสั่ง', 'จำแนกเสียงคำศัพท์', 'ตอบคำถามจากเรื่องที่ฟัง'],
    'READING': ['ระบุใจความสำคัญ', 'บอกความหมายคำศัพท์', 'เรียงลำดับเหตุการณ์', 'คาดคะเนเหตุการณ์', 'สรุปความ'],
    'WRITING': ['เขียนประโยคสื่อสาร', 'เขียนให้ข้อมูลส่วนตัว', 'เขียนบรรยาย', 'เรียบเรียงย่อหน้าตามโครงสร้าง'],
    'LANGUAGE_USE': ['เลือกใช้คำศัพท์ถูกต้องตามบริบท', 'สร้างประโยคตามโครงสร้างไวยากรณ์', 'ระบุหน้าที่ของคำ'],
    'INTEGRATED': ['รวบรวมข้อมูลและนำเสนอ', 'ปฏิบัติกิจกรรมกลุ่มตามบทบาทสมมติ', 'ผลิตสื่อนำเสนอข้อมูลภาษาอังกฤษ'],
  },
  preferredLearningPatterns: {
    'SPEAKING': ['2W3P (Warm-up, Presentation, Practice, Production, Wrap-up)', 'Task-Based Language Teaching (TBLT)', 'Role-Play & Information Gap'],
    'LISTENING': ['Pre-Listening, While-Listening, Post-Listening', 'Total Physical Response (TPR)'],
    'READING': ['Pre-Reading, During-Reading, Post-Reading', 'SQ3R / Guided Reading'],
    'WRITING': ['Process Writing (Pre-write, Draft, Revise, Edit, Publish)', 'Genre-Based Writing'],
    'LANGUAGE_USE': ['PPP (Presentation, Practice, Production)', 'Inductive Grammar Discovery'],
    'INTEGRATED': ['Project-Based Learning (PBL)', 'Content and Language Integrated Learning (CLIL)'],
  },
  evidenceRules: {
    'SPEAKING': {
      preferred: ['SPEAKING', 'PERFORMANCE', 'DISCUSSION'],
      supported: ['TASK_CARD', 'WORKSHEET'],
      notRecommended: ['ANSWER_KEY', 'WRITTEN_TEST'],
    },
    'LISTENING': {
      preferred: ['WORKSHEET', 'OBSERVATION', 'QUIZ'],
      supported: ['DISCUSSION', 'TASK_CARD'],
      notRecommended: ['PRODUCT_RUBRIC'],
    },
    'READING': {
      preferred: ['WORKSHEET', 'QUIZ', 'PRODUCT'],
      supported: ['DISCUSSION', 'TASK_CARD'],
      notRecommended: ['PERFORMANCE_RUBRIC'],
    },
    'WRITING': {
      preferred: ['PRODUCT', 'WORKSHEET', 'WRITTEN_COMPOSITION'],
      supported: ['TASK_CARD', 'QUIZ'],
      notRecommended: ['SPEAKING'],
    },
    'LANGUAGE_USE': {
      preferred: ['WORKSHEET', 'QUIZ', 'EXERCISE'],
      supported: ['TASK_CARD', 'PRODUCT'],
      notRecommended: ['OBSERVATION'],
    },
    'INTEGRATED': {
      preferred: ['PRODUCT', 'PERFORMANCE', 'PROJECT'],
      supported: ['WORKSHEET', 'SPEAKING'],
      notRecommended: ['MULTIPLE_CHOICE_QUIZ'],
    },
  },
  assessmentRules: {
    'SPEAKING': {
      preferred: ['PERFORMANCE_RUBRIC', 'OBSERVATION'],
      supported: ['CHECKLIST', 'RATING_SCALE'],
      notRecommended: ['ANSWER_KEY', 'QUIZ'],
    },
    'LISTENING': {
      preferred: ['ANSWER_KEY', 'CHECKLIST'],
      supported: ['RATING_SCALE', 'RUBRIC'],
      notRecommended: ['PERFORMANCE_RUBRIC'],
    },
    'READING': {
      preferred: ['ANSWER_KEY', 'SCORING_GUIDE'],
      supported: ['CHECKLIST', 'RUBRIC'],
      notRecommended: ['OBSERVATION'],
    },
    'WRITING': {
      preferred: ['PRODUCT_RUBRIC', 'ANALYTIC_RUBRIC'],
      supported: ['CHECKLIST', 'SCORING_GUIDE'],
      notRecommended: ['ANSWER_KEY'],
    },
    'LANGUAGE_USE': {
      preferred: ['ANSWER_KEY', 'QUIZ'],
      supported: ['CHECKLIST', 'SCORING_GUIDE'],
      notRecommended: ['PERFORMANCE_RUBRIC'],
    },
    'INTEGRATED': {
      preferred: ['HOLISTIC_RUBRIC', 'PRODUCT_RUBRIC'],
      supported: ['CHECKLIST', 'RATING_SCALE'],
      notRecommended: ['ANSWER_KEY'],
    },
  },
  assetRules: {
    'SPEAKING': {
      preferred: ['SPEAKING_CARD', 'TASK_CARD', 'RUBRIC'],
      supported: ['FLASHCARD', 'EXIT_TICKET', 'TEACHER_GUIDE'],
      notRecommended: ['EXTENSIVE_READING_PASSAGE'],
    },
    'LISTENING': {
      preferred: ['WORKSHEET', 'ANSWER_KEY', 'AUDIO_SCRIPT'],
      supported: ['CHECKLIST', 'FLASHCARD'],
      notRecommended: ['SPEAKING_CARD'],
    },
    'READING': {
      preferred: ['READING_TEXT', 'WORKSHEET', 'ANSWER_KEY'],
      supported: ['QUESTION_SET', 'VOCABULARY_SHEET'],
      notRecommended: ['SPORT_CHECKLIST'],
    },
    'WRITING': {
      preferred: ['WORKSHEET', 'WRITING_FRAME', 'RUBRIC'],
      supported: ['MODEL_TEXT', 'CHECKLIST'],
      notRecommended: ['SPEAKING_CARD'],
    },
    'LANGUAGE_USE': {
      preferred: ['WORKSHEET', 'ANSWER_KEY', 'QUESTION_SET'],
      supported: ['TASK_CARD', 'FLASHCARD'],
      notRecommended: ['PERFORMANCE_CARD'],
    },
    'INTEGRATED': {
      preferred: ['ACTIVITY_SHEET', 'RUBRIC', 'TEACHER_GUIDE'],
      supported: ['TASK_CARD', 'WORKSHEET'],
      notRecommended: ['SINGLE_DRILL_SHEET'],
    },
  },
  avoidPatterns: [
    'ใช้ข้อสอบไวยากรณ์ (Grammar Quiz) เป็นหลักฐานหลักในการประเมินทักษะการพูด (Speaking)',
    'กำหนดจุดประสงค์การพูดที่ใช้คำกว้าง เช่น "เข้าใจความหมายคำศัพท์" โดยไม่มี Observable Action พฤติกรรมการพูด',
    'ประเมินการเขียนโดยใช้เกณฑ์ความถูกผิดของคำศัพท์เพียงอย่างเดียวโดยละเลยการจัดโครงสร้างประโยคและการสื่อความ',
  ],
};
