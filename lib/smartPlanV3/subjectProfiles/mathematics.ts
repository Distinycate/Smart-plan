import { SubjectProfile } from './types';

export const MATHEMATICS_PROFILE: SubjectProfile = {
  key: 'MATHEMATICS',
  labelTh: 'คณิตศาสตร์',
  descriptionTh: 'มุ่งเน้นการสร้างมโนทัศน์ การคิดคำนวณ การแก้ปัญหา การให้เหตุผล และการสื่อสารความหมายทางคณิตศาสตร์',
  learningFocuses: [
    { key: 'CALCULATION', labelTh: 'ทักษะการคำนวณและขั้นตอนวิธี (Calculation & Algorithm)', descriptionTh: 'เน้นความคล่องแคล่วในการคำนวณ ความถูกต้องแม่นยำ และการใช้สมบัติทางคณิตศาสตร์' },
    { key: 'PROBLEM_SOLVING', labelTh: 'การแก้ปัญหาทางคณิตศาสตร์ (Problem Solving)', descriptionTh: 'เน้นกระบวนการ 4 ขั้นตอนของโพลยา (ทำความเข้าใจ วางแผน ปฏิบัติ ตรวจสอบ)' },
    { key: 'CONCEPT', labelTh: 'มโนทัศน์และความเข้าใจเชิงมโนทัศน์ (Conceptual Understanding)', descriptionTh: 'เน้นการนิยาม ความเชื่อมโยง และโครงสร้างความรู้ทางคณิตศาสตร์' },
    { key: 'REASONING', labelTh: 'การให้เหตุผลและการพิสูจน์ (Reasoning & Proof)', descriptionTh: 'เน้นการอธิบายข้อสรุป การสร้างข้อความคาดการณ์ และการให้เหตุผลเชิงตรรกะ' },
    { key: 'MATHEMATICAL_COMMUNICATION', labelTh: 'การสื่อสารและสื่อความหมายทางคณิตศาสตร์ (Mathematical Communication)', descriptionTh: 'เน้นการใช้สัญลักษณ์ ตาราง กราฟ และแผนภูมิในการถ่ายทอดแนวคิด' },
  ],
  objectiveGuidance: {
    'CALCULATION': ['คำนวณหาคำตอบ', 'หาค่าของนิพจน์', 'ดำเนินการทางคณิตศาสตร์', 'ประมาณค่าผลลัพธ์', 'ตรวจสอบความถูกต้องของการคำนวณ'],
    'PROBLEM_SOLVING': ['วิเคราะห์สถานการณ์ปัญหา', 'วางแผนและเลือกยุทธวิธี', 'แสดงขั้นตอนการแก้ปัญหา', 'แก้โจทย์ปัญหาหลายขั้นตอน', 'ตรวจสอบความสมเหตุสมผลของคำตอบ'],
    'CONCEPT': ['ระบุสมบัติ', 'จำแนกประเภท', 'สร้างแบบจำลองแทนแนวคิด', 'อธิบายความสัมพันธ์ทางคณิตศาสตร์', 'เชื่อมโยงความรู้'],
    'REASONING': ['อธิบายเหตุผล', 'ให้ข้อสนับสนุนหรือโต้แย้ง', 'สร้างข้อความคาดการณ์', 'สรุปความสัมพันธ์เชิงตรรกะ'],
    'MATHEMATICAL_COMMUNICATION': ['เขียนแสดงวิธีทำเป็นขั้นตอน', 'แปลความหมายจากกราฟ/ตาราง', 'ใช้สัญลักษณ์ทางคณิตศาสตร์ได้อย่างถูกต้อง'],
  },
  preferredLearningPatterns: {
    'CALCULATION': ['Explicit Direct Instruction', 'Deliberate Practice with Immediate Feedback', 'Concrete-Representational-Abstract (CRA)'],
    'PROBLEM_SOLVING': ['Polya 4-Step Problem Solving', 'Open-Approach Teaching', 'Problem-Based Learning (PBL)'],
    'CONCEPT': ['Concept Attainment Model', 'Inquiry-Based Learning in Math', 'Visual Manipulatives Modeling'],
    'REASONING': ['Number Talks', 'Mathematical Discourse & Debates', 'Counterexample Analysis'],
    'MATHEMATICAL_COMMUNICATION': ['Think-Pair-Share on Solutions', 'Guided Math Journaling', 'Poster Presentation of Proofs'],
  },
  evidenceRules: {
    'CALCULATION': {
      preferred: ['WORKSHEET', 'QUIZ', 'EXERCISE'],
      supported: ['TASK_CARD', 'EXIT_TICKET'],
      notRecommended: ['PERFORMANCE_RUBRIC', 'OBSERVATION'],
    },
    'PROBLEM_SOLVING': {
      preferred: ['WRITTEN_SOLUTION', 'PROBLEM_SET', 'EXPLANATION'],
      supported: ['WORKSHEET', 'PERFORMANCE', 'PROJECT'],
      notRecommended: ['SIMPLE_MULTIPLE_CHOICE'],
    },
    'CONCEPT': {
      preferred: ['WORKSHEET', 'CONCEPT_MAP', 'DISCUSSION'],
      supported: ['QUIZ', 'TASK_CARD'],
      notRecommended: ['SPEED_DRILL'],
    },
    'REASONING': {
      preferred: ['EXPLANATION', 'DISCUSSION', 'WRITTEN_ARGUMENT'],
      supported: ['WORKSHEET', 'TASK_CARD'],
      notRecommended: ['SIMPLE_ANSWER_KEY'],
    },
    'MATHEMATICAL_COMMUNICATION': {
      preferred: ['PRODUCT', 'POSTER', 'WRITTEN_REPORT'],
      supported: ['WORKSHEET', 'PRESENTATION'],
      notRecommended: ['TRUE_FALSE_TEST'],
    },
  },
  assessmentRules: {
    'CALCULATION': {
      preferred: ['ANSWER_KEY', 'SCORING_GUIDE'],
      supported: ['CHECKLIST'],
      notRecommended: ['PERFORMANCE_RUBRIC', 'HOLISTIC_RUBRIC'],
    },
    'PROBLEM_SOLVING': {
      preferred: ['ANALYTIC_RUBRIC', 'SCORING_GUIDE'],
      supported: ['CHECKLIST', 'RATING_SCALE'],
      notRecommended: ['SIMPLE_ANSWER_KEY'],
    },
    'CONCEPT': {
      preferred: ['SCORING_GUIDE', 'CHECKLIST'],
      supported: ['RUBRIC', 'ANSWER_KEY'],
      notRecommended: ['MOTOR_PERFORMANCE_RUBRIC'],
    },
    'REASONING': {
      preferred: ['RUBRIC', 'SCORING_GUIDE'],
      supported: ['OBSERVATION_CHECKLIST'],
      notRecommended: ['ANSWER_KEY'],
    },
    'MATHEMATICAL_COMMUNICATION': {
      preferred: ['PRODUCT_RUBRIC', 'CHECKLIST'],
      supported: ['RATING_SCALE'],
      notRecommended: ['ANSWER_KEY'],
    },
  },
  assetRules: {
    'CALCULATION': {
      preferred: ['WORKSHEET', 'ANSWER_KEY', 'DRILL_CARD'],
      supported: ['EXIT_TICKET', 'QUESTION_SET'],
      notRecommended: ['SPEAKING_CARD'],
    },
    'PROBLEM_SOLVING': {
      preferred: ['PROBLEM_SET', 'WORKSHEET', 'SCORING_GUIDE'],
      supported: ['EXIT_TICKET', 'TASK_CARD', 'TEACHER_GUIDE'],
      notRecommended: ['MULTIPLE_CHOICE_FLASHCARD'],
    },
    'CONCEPT': {
      preferred: ['ACTIVITY_SHEET', 'MANIPULATIVE_GUIDE', 'WORKSHEET'],
      supported: ['TASK_CARD', 'GRAPH_TEMPLATE'],
      notRecommended: ['LISTENING_AUDIO'],
    },
    'REASONING': {
      preferred: ['QUESTION_SET', 'TASK_CARD', 'RUBRIC'],
      supported: ['DISCUSSION_FRAME', 'WORKSHEET'],
      notRecommended: ['FILL_IN_BLANK_DRILL'],
    },
    'MATHEMATICAL_COMMUNICATION': {
      preferred: ['GRAPH_TEMPLATE', 'WORKSHEET', 'RUBRIC'],
      supported: ['POSTER_TEMPLATE', 'TASK_CARD'],
      notRecommended: ['AUDIO_TRACK'],
    },
  },
  avoidPatterns: [
    'ประเมินเฉพาะคำตอบสุดท้ายโดยไม่ให้คะแนนกระบวนการและเหตุผลในการแก้โจทย์ปัญหา (Problem Solving)',
    'ใช้แบบทดสอบความเร็ว (Speed Test) เป็นตัวตัดสินความเข้าใจเชิงมโนทัศน์ (Concept)',
    'ละเลยการประเมินการตรวจสอบความสมเหตุสมผลของคำตอบ',
  ],
};
