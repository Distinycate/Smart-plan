import { SubjectProfile } from './types';

export const SOCIAL_STUDIES_PROFILE: SubjectProfile = {
  key: 'SOCIAL_STUDIES',
  labelTh: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
  descriptionTh: 'มุ่งเน้นการเป็นพลเมืองดี การคิดวิเคราะห์เหตุการณ์ทางประวัติศาสตร์ ความเข้าใจระบบเศรษฐกิจ ภูมิศาสตร์ และหลักธรรมทางศาสนา',
  learningFocuses: [
    { key: 'HISTORY', labelTh: 'ประวัติศาสตร์และวิธีการทางประวัติศาสตร์ (History & Historical Inquiry)', descriptionTh: 'เน้นการตั้งประเด็น รวบรวมหลักฐานชั้นต้น/ชั้นรอง ตรวจสอบความน่าเชื่อถือ และตีความเหตุการณ์' },
    { key: 'RELIGION_ETHICS', labelTh: 'ศาสนา ศีลธรรม และจริยธรรม (Religion & Ethics)', descriptionTh: 'เน้นหลักธรรม การปฏิบัติตนตามวิถีศาสนา และการประยุกต์ใช้ในการดำเนินชีวิต' },
    { key: 'CIVICS', labelTh: 'หน้าที่พลเมืองและระบอบประชาธิปไตย (Civics & Government)', descriptionTh: 'เน้นสิทธิ หน้าที่ กฎหมาย การอยู่ร่วมกันในสังคมพหุวัฒนธรรม และการมีส่วนร่วมทางการเมือง' },
    { key: 'ECONOMICS', labelTh: 'เศรษฐศาสตร์และการบริหารจัดการ (Economics)', descriptionTh: 'เน้นอุปสงค์ อุปทาน ปรัชญาเศรษฐกิจพอเพียง และบทบาทผู้ผลิต/ผู้บริโภค' },
    { key: 'GEOGRAPHY', labelTh: 'ภูมิศาสตร์และปฏิสัมพันธ์สิ่งแวดล้อม (Geography & Environment)', descriptionTh: 'เน้นการใช้แผนที่ เครื่องมือทางภูมิศาสตร์ ภัยพิบัติธรรมชาติ และการอนุรักษ์สิ่งแวดล้อม' },
  ],
  objectiveGuidance: {
    'HISTORY': ['รวบรวมหลักฐานทางประวัติศาสตร์', 'ตรวจสอบความน่าเชื่อถือของหลักฐาน', 'ลำดับเหตุการณ์ตามเส้นเวลา (Timeline)', 'วิเคราะห์สาเหตุและผลกระทบของเหตุการณ์'],
    'RELIGION_ETHICS': ['อธิบายหลักธรรมสำคัญ', 'วิเคราะห์สถานการณ์เพื่อนำหลักธรรมไปปรับใช้', 'ปฏิบัติตนตามศาสนพิธี', 'ประเมินการกระทำตามกรอบจริยธรรม'],
    'CIVICS': ['ระบุสิทธิและหน้าที่ของตนเอง', 'ปฏิบัติตามกฎหมายที่เกี่ยวข้องในชีวิตประจำวัน', 'เสนอแนวทางแก้ปัญหาความขัดแย้งในสังคม'],
    'ECONOMICS': ['วิเคราะห์ปัจจัยการตัดสินใจเลือกซื้อสินค้า', 'ประยุกต์ใช้หลักปรัชญาของเศรษฐกิจพอเพียง', 'อธิบายความสัมพันธ์ของผู้ผลิตและผู้บริโภค'],
    'GEOGRAPHY': ['อ่านและแปลความหมายจากแผนที่', 'วิเคราะห์การเปลี่ยนแปลงทางกายภาพของพื้นที่', 'เสนอแนวทางป้องกันภัยพิบัติในท้องถิ่น'],
  },
  preferredLearningPatterns: {
    'HISTORY': ['Historical Inquiry Method (5 ขั้นตอนวิธีการทางประวัติศาสตร์)', 'Timeline & Primary Source Document Analysis'],
    'RELIGION_ETHICS': ['Case Study Moral Dilemma Discussion (กรณีศึกษาคุณธรรม)', 'Storytelling & Role-Play Reflection'],
    'CIVICS': ['Simulated Mock Trial / Town Hall Council', 'Deliberative Democracy Workshop'],
    'ECONOMICS': ['Market Simulation Game (ตลาดจำลอง)', 'Family Budget Project-Based Learning'],
    'GEOGRAPHY': ['Fieldwork & Map Reading Workshop', 'GIS & Remote Sensing Inquiry'],
  },
  evidenceRules: {
    'HISTORY': {
      preferred: ['HISTORICAL_INQUIRY_REPORT', 'TIMELINE_PRODUCT', 'PRIMARY_SOURCE_ANALYSIS'],
      supported: ['WORKSHEET', 'DISCUSSION'],
      notRecommended: ['ROTE_MEMORIZATION_SPEED_TEST'],
    },
    'RELIGION_ETHICS': {
      preferred: ['CASE_STUDY_REFLECTION', 'BEHAVIORAL_OBSERVATION', 'MORAL_DILEMMA_RESPONSE'],
      supported: ['WORKSHEET', 'ROLE_PLAY'],
      notRecommended: ['HISTORICAL_TIMELINE'],
    },
    'CIVICS': {
      preferred: ['PROJECT', 'DEBATE_PERFORMANCE', 'COMMUNITY_ACTION_PLAN'],
      supported: ['WORKSHEET', 'QUIZ'],
      notRecommended: ['SIMPLE_RECITATION'],
    },
    'ECONOMICS': {
      preferred: ['SIMULATION_LOG', 'FINANCIAL_PLAN', 'WORKSHEET'],
      supported: ['QUIZ', 'PRODUCT'],
      notRecommended: ['MOTOR_PERFORMANCE'],
    },
    'GEOGRAPHY': {
      preferred: ['MAP_PRODUCT', 'GEOGRAPHIC_ANALYSIS_SHEET', 'FIELD_REPORT'],
      supported: ['WORKSHEET', 'QUIZ'],
      notRecommended: ['RECITATION'],
    },
  },
  assessmentRules: {
    'HISTORY': {
      preferred: ['RUBRIC', 'SCORING_GUIDE'],
      supported: ['CHECKLIST', 'ANSWER_KEY'],
      notRecommended: ['BEHAVIORAL_FREQUENCY_CHECKLIST'],
    },
    'RELIGION_ETHICS': {
      preferred: ['RUBRIC', 'BEHAVIORAL_OBSERVATION_CHECKLIST'],
      supported: ['SELF_REFLECTION_SCORING'],
      notRecommended: ['ANSWER_KEY'],
    },
    'CIVICS': {
      preferred: ['DELIBERATION_RUBRIC', 'PRODUCT_RUBRIC'],
      supported: ['CHECKLIST'],
      notRecommended: ['ANSWER_KEY'],
    },
    'ECONOMICS': {
      preferred: ['SCORING_GUIDE', 'RUBRIC'],
      supported: ['ANSWER_KEY'],
      notRecommended: ['PERFORMANCE_RUBRIC'],
    },
    'GEOGRAPHY': {
      preferred: ['MAP_RUBRIC', 'SCORING_GUIDE'],
      supported: ['CHECKLIST', 'ANSWER_KEY'],
      notRecommended: ['MORAL_DILEMMA_RUBRIC'],
    },
  },
  assetRules: {
    'HISTORY': {
      preferred: ['PRIMARY_SOURCE_CARD', 'TIMELINE_SHEET', 'INQUIRY_WORKSHEET'],
      supported: ['RUBRIC', 'TEACHER_PROMPT'],
      notRecommended: ['FITNESS_CARD'],
    },
    'RELIGION_ETHICS': {
      preferred: ['CASE_STUDY_CARD', 'MORAL_DILEMMA_SHEET', 'REFLECTION_JOURNAL'],
      supported: ['CHECKLIST'],
      notRecommended: ['MAP_TEMPLATE'],
    },
    'CIVICS': {
      preferred: ['SCENARIO_CARD', 'LAW_SUMMARY_SHEET', 'RUBRIC'],
      supported: ['DEBATE_FRAME'],
      notRecommended: ['EXPERIMENT_SHEET'],
    },
    'ECONOMICS': {
      preferred: ['SIMULATION_MONEY_TOKENS', 'MARKET_TABLE', 'WORKSHEET'],
      supported: ['ANSWER_KEY'],
      notRecommended: ['CHORAL_SHEET'],
    },
    'GEOGRAPHY': {
      preferred: ['BASE_MAP_TEMPLATE', 'GEOGRAPHIC_KEY_SHEET', 'DATA_SHEET'],
      supported: ['WORKSHEET', 'RUBRIC'],
      notRecommended: ['POETRY_FRAME'],
    },
  },
  avoidPatterns: [
    'ประเมินวิชาประวัติศาสตร์ด้วยการจำ พ.ศ. หรือชื่อบุคคลเพียงอย่างเดียวโดยละเลยทักษะการวิเคราะห์หลักฐานและสาเหตุผลกระทบ',
    'ประเมินวิชาศาสนาและหน้าที่พลเมืองด้วยข้อสอบความจำปรนัยโดยไม่มีการวัดเจตคติและการนำไปปฏิบัติในชีวิตจริง',
    'ละเลยการเชื่อมโยงความรู้ภูมิศาสตร์กับปัญหาสิ่งแวดล้อมร่วมสมัยในท้องถิ่น',
  ],
};
