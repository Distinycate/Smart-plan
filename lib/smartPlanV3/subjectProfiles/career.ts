import { SubjectProfile } from './types';

export const CAREER_PROFILE: SubjectProfile = {
  key: 'CAREER',
  labelTh: 'การงานอาชีพ',
  descriptionTh: 'มุ่งเน้นกระบวนการทำงาน ทักษะการจัดการ การทำงานร่วมกัน ความปลอดภัยในการปฏิบัติงาน และการเตรียมความพร้อมสู่อาชีพสุจริต',
  learningFocuses: [
    { key: 'WORK_PROCESS', labelTh: 'กระบวนการทำงานและการจัดการ (Work Process & Management)', descriptionTh: 'เน้นขั้นตอนการวางแผน ปฏิบัติงาน ตรวจสอบ และปรับปรุงการทำงานบ้าน/งานช่าง/งานเกษตร' },
    { key: 'PRACTICAL_SKILL', labelTh: 'ทักษะการปฏิบัติงานจริง (Practical Hands-on Skills)', descriptionTh: 'เน้นการใช้อุปกรณ์ เครื่องมือช่าง การปลูกพืช การประกอบอาหาร และการประดิษฐ์' },
    { key: 'DESIGN_MAKING', labelTh: 'การออกแบบและสร้างสรรค์ผลงาน (Design & Craftsmanship)', descriptionTh: 'เน้นการเลือกวัสดุท้องถิ่น การแปรรูป และการสร้างมูลค่าเพิ่ม' },
    { key: 'CAREER_EXPLORATION', labelTh: 'การสำรวจและเตรียมตัวสู่อาชีพ (Career Exploration)', descriptionTh: 'เน้นการวิเคราะห์เส้นทางอาชีพ คุณธรรมในการประกอบอาชีพ และเจตคติที่ดีต่องานสุจริต' },
  ],
  objectiveGuidance: {
    'WORK_PROCESS': ['วางแผนขั้นตอนการทำงาน', 'แบ่งหน้าที่ความรับผิดชอบในการทำงานกลุ่ม', 'ประเมินและปรับปรุงผลงาน'],
    'PRACTICAL_SKILL': ['ใช้อุปกรณ์และเครื่องมือได้อย่างถูกต้องปลอดภัย', 'ประกอบอาหารตามขั้นตอนสุขอนามัย', 'ดูแลรักษาเครื่องใช้'],
    'DESIGN_MAKING': ['ออกแบบชิ้นงานจากวัสดุเหลือใช้', 'ประดิษฐ์ของใช้ของตกแต่ง', 'คำนวณต้นทุนและกำหนดราคาจำหน่าย'],
    'CAREER_EXPLORATION': ['ระบุคุณสมบัติที่จำเป็นของอาชีพที่สนใจ', 'สำรวจตลาดแรงงานในท้องถิ่น', 'สะท้อนคุณธรรมจริยธรรมในการประกอบอาชีพ'],
  },
  preferredLearningPatterns: {
    'WORK_PROCESS': ['PDCA Work Cycle (Plan-Do-Check-Act)', 'Task-Based Collaborative Learning'],
    'PRACTICAL_SKILL': ['Demonstration and Guided Hands-on Practice', 'Safety-First Apprenticeship Practicum'],
    'DESIGN_MAKING': ['Makerspace Workshop', 'Product Value-Add Project'],
    'CAREER_EXPLORATION': ['Career Day Interview', 'Entrepreneurial Simulation'],
  },
  evidenceRules: {
    'WORK_PROCESS': {
      preferred: ['WORK_PLAN_SHEET', 'OBSERVATION', 'PROCESS_LOG'],
      supported: ['CHECKLIST', 'WORKSHEET'],
      notRecommended: ['SPEED_MEMORY_TEST'],
    },
    'PRACTICAL_SKILL': {
      preferred: ['PRODUCT', 'PERFORMANCE', 'OBSERVATION'],
      supported: ['PRACTICAL_CHECKLIST'],
      notRecommended: ['PAPER_EXAM_ONLY'],
    },
    'DESIGN_MAKING': {
      preferred: ['PRODUCT', 'DESIGN_SKETCH', 'PROTOTYPE'],
      supported: ['PORTFOLIO', 'PRESENTATION'],
      notRecommended: ['MULTIPLE_CHOICE'],
    },
    'CAREER_EXPLORATION': {
      preferred: ['CAREER_PORTFOLIO', 'INTERVIEW_REPORT', 'REFLECTION'],
      supported: ['WORKSHEET'],
      notRecommended: ['MOTOR_TEST'],
    },
  },
  assessmentRules: {
    'WORK_PROCESS': {
      preferred: ['PROCESS_CHECKLIST', 'RUBRIC'],
      supported: ['OBSERVATION'],
      notRecommended: ['ANSWER_KEY'],
    },
    'PRACTICAL_SKILL': {
      preferred: ['PRACTICAL_RUBRIC', 'CHECKLIST'],
      supported: ['OBSERVATION_FORM'],
      notRecommended: ['ANSWER_KEY'],
    },
    'DESIGN_MAKING': {
      preferred: ['PRODUCT_RUBRIC', 'HOLISTIC_RUBRIC'],
      supported: ['CHECKLIST'],
      notRecommended: ['ANSWER_KEY'],
    },
    'CAREER_EXPLORATION': {
      preferred: ['RUBRIC', 'PORTFOLIO_SCORING'],
      supported: ['CHECKLIST'],
      notRecommended: ['MOTOR_PERFORMANCE_TEST'],
    },
  },
  assetRules: {
    'WORK_PROCESS': {
      preferred: ['WORK_PLAN_TEMPLATE', 'PROCESS_CHECKLIST', 'TEACHER_GUIDE'],
      supported: ['ROLES_CARD'],
      notRecommended: ['READING_PASSAGE'],
    },
    'PRACTICAL_SKILL': {
      preferred: ['TOOL_SAFETY_GUIDE', 'STEP_BY_STEP_CARD', 'PRACTICAL_CHECKLIST'],
      supported: ['RECIPE_SHEET'],
      notRecommended: ['TEST_PAPER'],
    },
    'DESIGN_MAKING': {
      preferred: ['DESIGN_SKETCH_SHEET', 'PRODUCT_RUBRIC'],
      supported: ['MATERIAL_LIST'],
      notRecommended: ['DRILL_CARD'],
    },
    'CAREER_EXPLORATION': {
      preferred: ['CAREER_SURVEY_SHEET', 'INTERVIEW_FORM'],
      supported: ['PORTFOLIO_GUIDE'],
      notRecommended: ['SCIENCE_EQUIPMENT_LOG'],
    },
  },
  avoidPatterns: [
    'ประเมินทักษะการทำอาหารหรืองานช่างด้วยแบบทดสอบข้อเขียนโดยไม่มีการสังเกตการลงมือทำและความสะอาดปลอดภัย',
    'ละเลยการประเมินทักษะการจัดการและการทำงานร่วมกันเป็นทีม',
  ],
};
