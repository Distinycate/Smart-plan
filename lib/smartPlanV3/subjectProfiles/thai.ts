import { SubjectProfile } from './types';

export const THAI_PROFILE: SubjectProfile = {
  key: 'THAI',
  labelTh: 'ภาษาไทย',
  descriptionTh: 'มุ่งเน้นการใช้ภาษาเพื่อการสื่อสาร การคิดวิเคราะห์ การอนุรักษ์วรรณคดีและวรรณกรรมไทย และความภาคภูมิใจในภาษาประจำชาติ',
  learningFocuses: [
    { key: 'READING', labelTh: 'การอ่าน (Reading & Literary Appreciation)', descriptionTh: 'เน้นการอ่านออกเสียง อ่านจับใจความ ตีความ และวิเคราะห์สารจากบทร้อยแก้ว/ร้อยกรอง' },
    { key: 'WRITING', labelTh: 'การเขียน (Writing & Creative Expression)', descriptionTh: 'เน้นการคัดลายมือ การเขียนสื่อสาร เขียนเรียงความ ย่อความ และเขียนเชิงสร้างสรรค์' },
    { key: 'LISTENING_VIEWING', labelTh: 'การฟัง การดู และการพูด (Listening, Viewing & Speaking)', descriptionTh: 'เน้นการจับใจความ วิเคราะห์ความน่าเชื่อถือ และพูดแสดงทรรศนะ' },
    { key: 'LANGUAGE', labelTh: 'หลักการใช้ภาษาไทย (Thai Language Principles)', descriptionTh: 'เน้นเสียง พยัญชนะ สระ วรรณยุกต์ ชนิดของคำ ประโยค และคำยืมภาษาต่างประเทศ' },
    { key: 'LITERATURE', labelTh: 'วรรณคดีและวรรณกรรม (Thai Literature)', descriptionTh: 'เน้นการศึกษาวรรณคดี สรุปเนื้อหา ถอดบทประพันธ์ และวิเคราะห์คุณค่า' },
  ],
  objectiveGuidance: {
    'READING': ['อ่านออกเสียงร้อยแก้ว/ร้อยกรอง', 'ระบุใจความสำคัญ', 'อธิบายความหมายของคำศัพท์', 'วิเคราะห์ข้อเท็จจริงและข้อคิดเห็น'],
    'WRITING': ['คัดลายมือตัวบรรจง', 'เขียนเรียงความ/ย่อความ', 'เขียนอธิบายตามลำดับขั้นตอน', 'เขียนสะกดคำได้ถูกต้องตามอักขรวิธี'],
    'LISTENING_VIEWING': ['สรุปสาระสำคัญจากเรื่องที่ฟังและดู', 'พูดแสดงความคิดเห็นอย่างมีเหตุผล', 'ประเมินความน่าเชื่อถือของสื่อ'],
    'LANGUAGE': ['จำแนกชนิดและหน้าที่ของคำ', 'วิเคราะห์โครงสร้างประโยค', 'สร้างคำในภาษาไทย', 'ระบุลักษณะภาษาพูดและภาษาเขียน'],
    'LITERATURE': ['สรุปเนื้อหาวรรณคดี', 'ถอดคำประพันธ์', 'วิเคราะห์คุณค่าด้านวรรณศิลป์และสังคม', 'ท่องจำบทอาขยาน'],
  },
  preferredLearningPatterns: {
    'READING': ['กระบวนการอ่านแบบ SQ4R', 'การอ่านแบบชี้นำ (Guided Reading)', 'การคิดวิเคราะห์สาร'],
    'WRITING': ['กระบวนการเขียน 5 ขั้นตอน (Process Approach)', 'การเขียนตามรูปแบบบันได 4 ขั้น'],
    'LISTENING_VIEWING': ['การเรียนรู้ผ่านสื่อสถานการณ์จริง', 'เวทีโต้วาที / อภิปรายกลุ่มย่อย'],
    'LANGUAGE': ['การสอนหลักภาษาแบบอุปนัย (Inductive Method)', 'เกมภาษาและแบบฝึกพัฒนาทักษะ'],
    'LITERATURE': ['การวิเคราะห์คุณค่า 3 ด้าน (วรรณศิลป์ เนื้อหา สังคม)', 'การละครสะท้อนวรรณคดี'],
  },
  evidenceRules: {
    'READING': {
      preferred: ['WORKSHEET', 'OBSERVATION', 'QUIZ'],
      supported: ['DISCUSSION', 'TASK_CARD'],
      notRecommended: ['MOTOR_PERFORMANCE'],
    },
    'WRITING': {
      preferred: ['PRODUCT', 'WORKSHEET', 'WRITTEN_COMPOSITION'],
      supported: ['EXERCISE', 'TASK_CARD'],
      notRecommended: ['SPEAKING'],
    },
    'LISTENING_VIEWING': {
      preferred: ['SPEAKING', 'DISCUSSION', 'OBSERVATION'],
      supported: ['WORKSHEET', 'TASK_CARD'],
      notRecommended: ['SILENT_DRILL'],
    },
    'LANGUAGE': {
      preferred: ['WORKSHEET', 'QUIZ', 'EXERCISE'],
      supported: ['CONCEPT_MAP', 'TASK_CARD'],
      notRecommended: ['PERFORMANCE_RUBRIC'],
    },
    'LITERATURE': {
      preferred: ['WRITTEN_ANALYSIS', 'PRODUCT', 'DISCUSSION'],
      supported: ['WORKSHEET', 'RECITATION'],
      notRecommended: ['SPEED_CALCULATION'],
    },
  },
  assessmentRules: {
    'READING': {
      preferred: ['CHECKLIST', 'SCORING_GUIDE', 'ANSWER_KEY'],
      supported: ['RUBRIC'],
      notRecommended: ['MOTOR_TEST'],
    },
    'WRITING': {
      preferred: ['ANALYTIC_RUBRIC', 'SCORING_GUIDE'],
      supported: ['CHECKLIST'],
      notRecommended: ['ANSWER_KEY'],
    },
    'LISTENING_VIEWING': {
      preferred: ['PERFORMANCE_RUBRIC', 'OBSERVATION'],
      supported: ['CHECKLIST'],
      notRecommended: ['ANSWER_KEY'],
    },
    'LANGUAGE': {
      preferred: ['ANSWER_KEY', 'QUIZ'],
      supported: ['CHECKLIST', 'SCORING_GUIDE'],
      notRecommended: ['PERFORMANCE_RUBRIC'],
    },
    'LITERATURE': {
      preferred: ['RUBRIC', 'SCORING_GUIDE'],
      supported: ['RECITATION_CHECKLIST'],
      notRecommended: ['ANSWER_KEY'],
    },
  },
  assetRules: {
    'READING': {
      preferred: ['READING_TEXT', 'WORKSHEET', 'QUESTION_SET'],
      supported: ['VOCABULARY_LIST', 'ANSWER_KEY'],
      notRecommended: ['EXPERIMENT_SHEET'],
    },
    'WRITING': {
      preferred: ['WRITING_FRAME', 'WORKSHEET', 'RUBRIC'],
      supported: ['MODEL_TEXT', 'CHECKLIST'],
      notRecommended: ['SPEAKING_CARD'],
    },
    'LISTENING_VIEWING': {
      preferred: ['AUDIO_VISUAL_PROMPT', 'DISCUSSION_SHEET', 'OBSERVATION_FORM'],
      supported: ['TASK_CARD'],
      notRecommended: ['DRILL_CARD'],
    },
    'LANGUAGE': {
      preferred: ['WORKSHEET', 'ANSWER_KEY', 'TASK_CARD'],
      supported: ['FLASHCARD', 'QUESTION_SET'],
      notRecommended: ['PERFORMANCE_CARD'],
    },
    'LITERATURE': {
      preferred: ['LITERARY_EXCERPT', 'ANALYSIS_WORKSHEET', 'RUBRIC'],
      supported: ['RECITATION_CARD'],
      notRecommended: ['MATH_FORMULA_SHEET'],
    },
  },
  avoidPatterns: [
    'ประเมินการอ่านออกเสียงโดยใช้เพียงข้อสอบกากบาท (Multiple Choice)',
    'ตัดสินงานเขียนเรียงความด้วยคะแนนรวมแบบองค์รวม (Holistic) โดยไม่ชี้แจงเกณฑ์ด้านเนื้อหา ภาษา และการจัดวรรคตอน',
    'ละเลยการประเมินมารยาทในการอ่าน การเขียน การฟัง และการพูด',
  ],
};
