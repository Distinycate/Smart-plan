import { SubjectProfile } from './types';

export const SCIENCE_PROFILE: SubjectProfile = {
  key: 'SCIENCE',
  labelTh: 'วิทยาศาสตร์และเทคโนโลยี',
  descriptionTh: 'มุ่งเน้นกระบวนการสืบเสาะหาความรู้ การทดลอง การใช้หลักฐานเชิงประจักษ์ การคิดวิเคราะห์ และการแก้ปัญหาเชิงวิทยาศาสตร์และเทคโนโลยี',
  learningFocuses: [
    { key: 'EXPERIMENT', labelTh: 'การทดลองและทักษะกระบวนการ (Scientific Experiment & Inquiry)', descriptionTh: 'เน้นการตั้งสมมติฐาน ออกแบบการทดลอง ควบคุมตัวแปร ปฏิบัติการ และบันทึกผล' },
    { key: 'INQUIRY', labelTh: 'การสืบเสาะหาความรู้ทางวิทยาศาสตร์ (Scientific Inquiry)', descriptionTh: 'เน้นการตั้งคำถาม ค้นคว้าข้อมูล รวบรวมหลักฐาน และอภิปรายผล' },
    { key: 'DATA_ANALYSIS', labelTh: 'การวิเคราะห์และแปลความหมายข้อมูล (Data Analysis & Interpretation)', descriptionTh: 'เน้นการอ่านค่าจากตาราง กราฟ แปลผลเชิงประจักษ์ และระบุความคลาดเคลื่อน' },
    { key: 'SCIENTIFIC_EXPLANATION', labelTh: 'การสร้างคำอธิบายเชิงวิทยาศาสตร์ (CER: Claim-Evidence-Reasoning)', descriptionTh: 'เน้นการเชื่อมโยงข้ออ้าง หลักฐาน และหลักการทางวิทยาศาสตร์' },
    { key: 'CONCEPT', labelTh: 'มโนทัศน์และความรู้ทางวิทยาศาสตร์ (Scientific Concepts)', descriptionTh: 'เน้นความเข้าใจในหลักการ ปรากฏการณ์ธรรมชาติ และทฤษฎีทางวิทยาศาสตร์' },
    { key: 'ENGINEERING_DESIGN', labelTh: 'การออกแบบเชิงวิศวกรรมและเทคโนโลยี (Engineering Design Process)', descriptionTh: 'เน้นการระบุปัญหา ออกแบบชิ้นงาน/วิธีการ ทดสอบ และปรับปรุงแก้ไข' },
  ],
  objectiveGuidance: {
    'EXPERIMENT': ['ตั้งสมมติฐาน', 'ระบุตัวแปร (ต้น/ตาม/ควบคุม)', 'ปฏิบัติการทดลองตามขั้นตอน', 'สังเกตและบันทึกผลเชิงประจักษ์', 'ใช้อุปกรณ์ได้อย่างถูกต้องปลอดภัย'],
    'INQUIRY': ['ตั้งคำถามที่นำไปสู่การสำรวจ', 'รวบรวมข้อมูลจากแหล่งเรียนรู้', 'เปรียบเทียบข้อมูล', 'อภิปรายสรุปผล'],
    'DATA_ANALYSIS': ['อ่านและแปลผลจากตาราง/กราฟ', 'วิเคราะห์ความสัมพันธ์ของตัวแปร', 'ระบุแนวโน้มของข้อมูลเชิงตัวเลข'],
    'SCIENTIFIC_EXPLANATION': ['สร้างคำอธิบายเชิงวิทยาศาสตร์ (CER)', 'ให้เหตุผลสนับสนุนข้อสรุป', 'ประเมินความน่าเชื่อถือของหลักฐาน'],
    'CONCEPT': ['อธิบายปรากฏการณ์', 'จำแนกประเภทสาร/สิ่งมีชีวิต', 'ระบุความสัมพันธ์ในระบบนิเวศ', 'อธิบายกลไกทางธรรมชาติ'],
    'ENGINEERING_DESIGN': ['ระบุข้อจำกัดของปัญหา', 'ออกแบบชิ้นงาน/โมเดล', 'สร้างและทดสอบต้นแบบ', 'ประเมินและปรับปรุงผลงาน'],
  },
  preferredLearningPatterns: {
    'EXPERIMENT': ['5E Inquiry-Based Learning (Engagement, Exploration, Explanation, Elaboration, Evaluation)', 'Scientific Method Lab Practicum'],
    'INQUIRY': ['Guided Inquiry Model', 'Phenomenon-Based Learning (PhenoBL)'],
    'DATA_ANALYSIS': ['Data-Driven Investigation', 'Claim-Evidence-Reasoning (CER) Framework'],
    'SCIENTIFIC_EXPLANATION': ['Science Talk / Argumentation from Evidence', 'Model-Based Reasoning'],
    'CONCEPT': ['Predict-Observe-Explain (POE)', 'Concept Mapping & Analogy'],
    'ENGINEERING_DESIGN': ['Design Thinking in STEM', 'Engineering Design Cycle (EDP)'],
  },
  evidenceRules: {
    'EXPERIMENT': {
      preferred: ['EXPERIMENT', 'DATA_TABLE', 'OBSERVATION', 'SCIENTIFIC_EXPLANATION'],
      supported: ['WORKSHEET', 'PERFORMANCE', 'LAB_REPORT'],
      notRecommended: ['SIMPLE_MULTIPLE_CHOICE', 'RECITATION'],
    },
    'INQUIRY': {
      preferred: ['WORKSHEET', 'DISCUSSION', 'OBSERVATION'],
      supported: ['TASK_CARD', 'PRODUCT'],
      notRecommended: ['SPEED_TEST'],
    },
    'DATA_ANALYSIS': {
      preferred: ['DATA_TABLE', 'WRITTEN_ANALYSIS', 'WORKSHEET'],
      supported: ['GRAPH', 'QUIZ'],
      notRecommended: ['RECITATION'],
    },
    'SCIENTIFIC_EXPLANATION': {
      preferred: ['SCIENTIFIC_EXPLANATION', 'WRITTEN_ARGUMENT', 'DISCUSSION'],
      supported: ['WORKSHEET', 'PRESENTATION'],
      notRecommended: ['TRUE_FALSE_TEST'],
    },
    'CONCEPT': {
      preferred: ['WORKSHEET', 'QUIZ', 'CONCEPT_MAP'],
      supported: ['DISCUSSION', 'TASK_CARD'],
      notRecommended: ['MOTOR_PERFORMANCE'],
    },
    'ENGINEERING_DESIGN': {
      preferred: ['PRODUCT', 'DESIGN_SHEET', 'PROTOTYPE'],
      supported: ['PERFORMANCE', 'PRESENTATION'],
      notRecommended: ['PAPER_PENCIL_TEST_ONLY'],
    },
  },
  assessmentRules: {
    'EXPERIMENT': {
      preferred: ['CHECKLIST', 'PERFORMANCE_RUBRIC', 'OBSERVATION'],
      supported: ['SCORING_GUIDE', 'RATING_SCALE'],
      notRecommended: ['ANSWER_KEY'],
    },
    'INQUIRY': {
      preferred: ['OBSERVATION', 'CHECKLIST', 'SCORING_GUIDE'],
      supported: ['RUBRIC'],
      notRecommended: ['ANSWER_KEY'],
    },
    'DATA_ANALYSIS': {
      preferred: ['SCORING_GUIDE', 'ANSWER_KEY'],
      supported: ['RUBRIC', 'CHECKLIST'],
      notRecommended: ['PERFORMANCE_RUBRIC'],
    },
    'SCIENTIFIC_EXPLANATION': {
      preferred: ['CER_RUBRIC', 'SCORING_GUIDE'],
      supported: ['CHECKLIST'],
      notRecommended: ['ANSWER_KEY'],
    },
    'CONCEPT': {
      preferred: ['ANSWER_KEY', 'SCORING_GUIDE'],
      supported: ['CHECKLIST', 'RUBRIC'],
      notRecommended: ['MOTOR_PERFORMANCE_RUBRIC'],
    },
    'ENGINEERING_DESIGN': {
      preferred: ['PRODUCT_RUBRIC', 'CHECKLIST'],
      supported: ['HOLISTIC_RUBRIC'],
      notRecommended: ['ANSWER_KEY'],
    },
  },
  assetRules: {
    'EXPERIMENT': {
      preferred: ['EXPERIMENT_SHEET', 'DATA_TABLE', 'CHECKLIST', 'TEACHER_GUIDE'],
      supported: ['SAFETY_SHEET', 'EXIT_TICKET'],
      notRecommended: ['SPEAKING_CARD'],
    },
    'INQUIRY': {
      preferred: ['ACTIVITY_SHEET', 'QUESTION_SET', 'WORKSHEET'],
      supported: ['TASK_CARD', 'GRAPHIC_ORGANIZER'],
      notRecommended: ['DRILL_CARD'],
    },
    'DATA_ANALYSIS': {
      preferred: ['DATA_TABLE', 'GRAPH_TEMPLATE', 'WORKSHEET'],
      supported: ['ANSWER_KEY', 'QUESTION_SET'],
      notRecommended: ['PERFORMANCE_CARD'],
    },
    'SCIENTIFIC_EXPLANATION': {
      preferred: ['CER_FRAMEWORK_SHEET', 'RUBRIC', 'WORKSHEET'],
      supported: ['MODEL_EXPLANATION_GUIDE'],
      notRecommended: ['FLASHCARD'],
    },
    'CONCEPT': {
      preferred: ['WORKSHEET', 'ANSWER_KEY', 'CONCEPT_MAP_SHEET'],
      supported: ['QUESTION_SET', 'TASK_CARD'],
      notRecommended: ['LAB_CHECKLIST'],
    },
    'ENGINEERING_DESIGN': {
      preferred: ['DESIGN_BRIEF', 'PROTOTYPE_RUBRIC', 'ACTIVITY_SHEET'],
      supported: ['CHECKLIST', 'TEACHER_GUIDE'],
      notRecommended: ['MULTIPLE_CHOICE_SHEET'],
    },
  },
  avoidPatterns: [
    'ประเมินเฉพาะคำตอบหลังการทดลอง โดยละเลยการประเมินทักษะกระบวนการและการบันทึกข้อมูลเชิงประจักษ์',
    'ทำการทดลองแบบ Cookbook Lab ที่บอกขั้นตอนสำเร็จรูปโดยไม่มีโอกาสให้ผู้เรียนตั้งข้อสังเกตหรือตั้งสมมติฐาน',
    'วัดผลด้านความปลอดภัยในห้องปฏิบัติการด้วยข้อสอบปรนัยเพียงอย่างเดียวโดยไม่สังเกตพฤติกรรมจริง',
  ],
};
