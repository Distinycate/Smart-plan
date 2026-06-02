export interface EflTopicTemplate {
  lessonTopic: string;
  objectiveK: string;
  objectiveP: string;
  objectiveA: string;
  learningContent: string;
  grammarFocus: string;
  vocabulary: string;
  teachingMethods: string;
  highlightActivity: string;
  assessmentMethods: string;
  competencies: string[];
  skills21: string[];
}

export const EFL_CONTEXT_UNIT_NAME = 'EFL โคก หนอง นา อาชีพ และเทคโนโลยี';
export const EFL_CONTEXT_UNIT_NUMBER = 99;

export const EFL_TOPIC_TEMPLATES: EflTopicTemplate[] = [
  {
    lessonTopic: 'My Community',
    objectiveK: 'รู้จักคำศัพท์เกี่ยวกับชุมชน',
    objectiveP: 'พูดแนะนำชุมชนได้',
    objectiveA: 'ภาคภูมิใจในชุมชน',
    learningContent: 'การแนะนำชุมชน สถานที่สำคัญ วิถีชีวิต',
    grammarFocus: 'There is/There are, Prepositions',
    vocabulary: 'temple, market, village, school, community',
    teachingMethods: 'CLT, Cooperative Learning',
    highlightActivity: 'Community Map, Mini Presentation',
    assessmentMethods: 'Observation, Speaking Rubric',
    competencies: ['ความสามารถในการสื่อสาร', 'ความสามารถในการใช้ทักษะชีวิต'],
    skills21: ['Communication', 'Collaboration', 'Cultural Awareness'],
  },
  {
    lessonTopic: 'Farm & Garden',
    objectiveK: 'รู้จักพื้นที่เกษตร',
    objectiveP: 'อธิบายพื้นที่โคก หนอง นาได้',
    objectiveA: 'เห็นคุณค่าการเกษตร',
    learningContent: 'โคก หนอง นา พื้นที่เกษตร การปลูกพืช',
    grammarFocus: 'Present Simple, There is/There are',
    vocabulary: 'rice field, vegetable, fish pond, organic farming',
    teachingMethods: 'Project-Based Learning, Inquiry-Based Learning',
    highlightActivity: 'School Farm Tour, Label the Farm',
    assessmentMethods: 'Project Rubric, Participation',
    competencies: ['ความสามารถในการคิด', 'ความสามารถในการใช้ทักษะชีวิต', 'ความสามารถในการใช้เทคโนโลยี'],
    skills21: ['Critical Thinking', 'Environmental Literacy', 'Collaboration'],
  },
  {
    lessonTopic: 'Local Food & Cooking',
    objectiveK: 'รู้จักอาหารท้องถิ่น',
    objectiveP: 'อธิบายอาหารได้',
    objectiveA: 'ภูมิใจในอาหารท้องถิ่น',
    learningContent: 'อาหารท้องถิ่น การทำอาหาร เมนู',
    grammarFocus: 'Can I have...?, I would like..., Adjectives',
    vocabulary: 'sticky rice, herbs, spicy, grilled chicken',
    teachingMethods: 'Experiential Learning, Role Play',
    highlightActivity: 'Cooking Demonstration, English Menu',
    assessmentMethods: 'Performance Assessment, Speaking',
    competencies: ['ความสามารถในการสื่อสาร', 'ความสามารถในการแก้ปัญหา', 'ความสามารถในการใช้ทักษะชีวิต'],
    skills21: ['Creativity', 'Communication', 'Cultural Literacy'],
  },
  {
    lessonTopic: 'Sustainable Living',
    objectiveK: 'เข้าใจการใช้ชีวิตพอเพียง',
    objectiveP: 'อธิบายการดูแลสิ่งแวดล้อมได้',
    objectiveA: 'มีจิตสำนึกสิ่งแวดล้อม',
    learningContent: 'การใช้ชีวิตอย่างพอเพียง สิ่งแวดล้อม',
    grammarFocus: 'Imperatives, Modal Verbs',
    vocabulary: 'recycle, compost, save water, natural farming',
    teachingMethods: 'Active Learning, Problem-Based Learning',
    highlightActivity: 'Eco Poster, Recycling Campaign',
    assessmentMethods: 'Poster Rubric, Observation',
    competencies: ['ความสามารถในการคิด', 'ความสามารถในการแก้ปัญหา', 'ความสามารถในการใช้ทักษะชีวิต'],
    skills21: ['Environmental Literacy', 'Critical Thinking', 'Responsibility'],
  },
  {
    lessonTopic: 'Animals & Farming',
    objectiveK: 'รู้จักสัตว์และการเลี้ยงสัตว์',
    objectiveP: 'พูดอธิบายการดูแลสัตว์ได้',
    objectiveA: 'รักและดูแลสัตว์',
    learningContent: 'สัตว์ในฟาร์ม การดูแลสัตว์',
    grammarFocus: 'Present Simple',
    vocabulary: 'buffalo, chicken, duck, cow, feed',
    teachingMethods: 'TPR, CLT',
    highlightActivity: 'Farm Role Play, Animal Care Activity',
    assessmentMethods: 'Checklist, Speaking',
    competencies: ['ความสามารถในการสื่อสาร', 'ความสามารถในการใช้ทักษะชีวิต'],
    skills21: ['Communication', 'Compassion', 'Collaboration'],
  },
  {
    lessonTopic: 'Jobs & Careers',
    objectiveK: 'รู้จักอาชีพต่าง ๆ',
    objectiveP: 'พูดเกี่ยวกับอาชีพได้',
    objectiveA: 'เห็นคุณค่าของอาชีพ',
    learningContent: 'อาชีพ ความฝันในอนาคต',
    grammarFocus: 'Want to, Future Tense',
    vocabulary: 'farmer, nurse, teacher, engineer, YouTuber',
    teachingMethods: 'Career-Based Learning, Pair Work',
    highlightActivity: 'Dream Job Interview',
    assessmentMethods: 'Speaking Rubric, Peer Assessment',
    competencies: ['ความสามารถในการสื่อสาร', 'ความสามารถในการคิด', 'ความสามารถในการใช้เทคโนโลยี'],
    skills21: ['Career Skills', 'Communication', 'Creativity'],
  },
  {
    lessonTopic: 'Selling Products Online',
    objectiveK: 'เข้าใจการขายออนไลน์',
    objectiveP: 'นำเสนอสินค้าได้',
    objectiveA: 'มีแนวคิดผู้ประกอบการ',
    learningContent: 'การขายสินค้าออนไลน์ การเขียนโฆษณา',
    grammarFocus: 'Present Continuous, Persuasive Language',
    vocabulary: 'customer, order, delivery, review, product',
    teachingMethods: 'Task-Based Learning, Digital Learning',
    highlightActivity: 'Live Selling Simulation',
    assessmentMethods: 'Product Presentation Rubric',
    competencies: ['ความสามารถในการใช้เทคโนโลยี', 'ความสามารถในการสื่อสาร', 'ความสามารถในการคิด'],
    skills21: ['Digital Literacy', 'Entrepreneurship', 'Creativity'],
  },
  {
    lessonTopic: 'Cafe & Restaurant English',
    objectiveK: 'รู้จักบทสนทนาในร้านอาหาร',
    objectiveP: 'สั่งอาหารได้',
    objectiveA: 'กล้าสื่อสาร',
    learningContent: 'การสั่งอาหาร รับออเดอร์',
    grammarFocus: 'Can I have...?, How much...?',
    vocabulary: 'menu, order, drink, dessert, bill',
    teachingMethods: 'CLT, Role Play',
    highlightActivity: 'Restaurant Simulation',
    assessmentMethods: 'Role Play Assessment',
    competencies: ['ความสามารถในการสื่อสาร', 'ความสามารถในการใช้ทักษะชีวิต'],
    skills21: ['Communication', 'Collaboration', 'Service Mind'],
  },
  {
    lessonTopic: 'Tourism English',
    objectiveK: 'รู้จักคำศัพท์การท่องเที่ยว',
    objectiveP: 'แนะนำสถานที่ได้',
    objectiveA: 'ภูมิใจในท้องถิ่น',
    learningContent: 'การแนะนำสถานที่ท่องเที่ยว',
    grammarFocus: 'Present Simple, Adjectives',
    vocabulary: 'waterfall, temple, tourist, guide',
    teachingMethods: 'Project-Based Learning, CLT',
    highlightActivity: 'Tourist Guide Video',
    assessmentMethods: 'Presentation Rubric',
    competencies: ['ความสามารถในการสื่อสาร', 'ความสามารถในการคิด', 'ความสามารถในการใช้เทคโนโลยี'],
    skills21: ['Cultural Awareness', 'Creativity', 'Media Literacy'],
  },
  {
    lessonTopic: 'Technology in Daily Life',
    objectiveK: 'เข้าใจเทคโนโลยีในชีวิตประจำวัน',
    objectiveP: 'อธิบายการใช้เทคโนโลยีได้',
    objectiveA: 'ใช้เทคโนโลยีอย่างเหมาะสม',
    learningContent: 'เทคโนโลยีในชีวิตประจำวัน',
    grammarFocus: 'Present Simple',
    vocabulary: 'smartphone, internet, application, AI',
    teachingMethods: 'Inquiry-Based Learning, Digital Learning',
    highlightActivity: 'App Review Activity',
    assessmentMethods: 'Worksheet, Observation',
    competencies: ['ความสามารถในการใช้เทคโนโลยี', 'ความสามารถในการคิด'],
    skills21: ['ICT Literacy', 'Critical Thinking', 'Information Literacy'],
  },
  {
    lessonTopic: 'Social Media English',
    objectiveK: 'รู้จักภาษาในโซเชียลมีเดีย',
    objectiveP: 'เขียน caption ได้',
    objectiveA: 'ใช้สื่ออย่างสร้างสรรค์',
    learningContent: 'ภาษาอังกฤษในสื่อออนไลน์',
    grammarFocus: 'Present Continuous, Informal Language',
    vocabulary: 'post, caption, comment, follow',
    teachingMethods: 'Active Learning, Media-Based Learning',
    highlightActivity: 'Create Social Media Caption',
    assessmentMethods: 'Creative Rubric',
    competencies: ['ความสามารถในการใช้เทคโนโลยี', 'ความสามารถในการสื่อสาร'],
    skills21: ['Media Literacy', 'Creativity', 'Digital Citizenship'],
  },
  {
    lessonTopic: 'AI for English Learning',
    objectiveK: 'เข้าใจ AI เบื้องต้น',
    objectiveP: 'ใช้ AI ช่วยเรียนภาษาได้',
    objectiveA: 'ใช้ AI อย่างมีจริยธรรม',
    learningContent: 'การใช้ AI ช่วยเรียนภาษาอังกฤษ',
    grammarFocus: 'Question Forms',
    vocabulary: 'chatbot, prompt, translate, generate',
    teachingMethods: 'Connectivism, Digital Learning',
    highlightActivity: 'Ask AI Questions',
    assessmentMethods: 'Reflection, Participation',
    competencies: ['ความสามารถในการใช้เทคโนโลยี', 'ความสามารถในการคิด', 'ความสามารถในการแก้ปัญหา'],
    skills21: ['AI Literacy', 'Critical Thinking', 'Self-Directed Learning'],
  },
  {
    lessonTopic: 'Online Safety',
    objectiveK: 'รู้จักความปลอดภัยออนไลน์',
    objectiveP: 'ระบุความเสี่ยงออนไลน์ได้',
    objectiveA: 'ใช้อินเทอร์เน็ตอย่างปลอดภัย',
    learningContent: 'ความปลอดภัยออนไลน์',
    grammarFocus: 'Modal Verbs (should/should not)',
    vocabulary: 'password, scam, private, account',
    teachingMethods: 'Problem-Based Learning',
    highlightActivity: 'Scam Detection Activity',
    assessmentMethods: 'Quiz, Observation',
    competencies: ['ความสามารถในการใช้เทคโนโลยี', 'ความสามารถในการใช้ทักษะชีวิต'],
    skills21: ['Digital Citizenship', 'Information Literacy', 'Responsibility'],
  },
  {
    lessonTopic: 'Shopping & Money',
    objectiveK: 'รู้จักการซื้อขาย',
    objectiveP: 'ถาม-ตอบราคาได้',
    objectiveA: 'ใช้เงินอย่างเหมาะสม',
    learningContent: 'การซื้อขาย ราคา การใช้เงิน',
    grammarFocus: 'How much...?, Demonstratives',
    vocabulary: 'baht, cheap, expensive, buy, sell',
    teachingMethods: 'Role Play, Game-Based Learning',
    highlightActivity: 'Market Simulation',
    assessmentMethods: 'Checklist, Speaking',
    competencies: ['ความสามารถในการสื่อสาร', 'ความสามารถในการคิด', 'ความสามารถในการใช้ทักษะชีวิต'],
    skills21: ['Financial Literacy', 'Communication', 'Problem Solving'],
  },
  {
    lessonTopic: 'Health & Wellness',
    objectiveK: 'เข้าใจการดูแลสุขภาพ',
    objectiveP: 'อธิบายพฤติกรรมสุขภาพได้',
    objectiveA: 'ใส่ใจสุขภาพ',
    learningContent: 'สุขภาพ การดูแลตนเอง',
    grammarFocus: 'Should/Should not',
    vocabulary: 'exercise, healthy food, sleep, water',
    teachingMethods: 'Cooperative Learning, Inquiry',
    highlightActivity: 'Healthy Lifestyle Survey',
    assessmentMethods: 'Survey Report',
    competencies: ['ความสามารถในการใช้ทักษะชีวิต', 'ความสามารถในการคิด'],
    skills21: ['Health Literacy', 'Self-Management', 'Critical Thinking'],
  },
  {
    lessonTopic: 'Emergency & Safety',
    objectiveK: 'รู้จักคำศัพท์ฉุกเฉิน',
    objectiveP: 'ขอความช่วยเหลือได้',
    objectiveA: 'ตระหนักเรื่องความปลอดภัย',
    learningContent: 'การขอความช่วยเหลือ เหตุฉุกเฉิน',
    grammarFocus: 'Imperatives',
    vocabulary: 'help, hospital, emergency, accident',
    teachingMethods: 'Role Play, TPR',
    highlightActivity: 'Emergency Call Simulation',
    assessmentMethods: 'Speaking Assessment',
    competencies: ['ความสามารถในการสื่อสาร', 'ความสามารถในการแก้ปัญหา', 'ความสามารถในการใช้ทักษะชีวิต'],
    skills21: ['Problem Solving', 'Communication', 'Decision Making'],
  },
  {
    lessonTopic: 'Communication Skills',
    objectiveK: 'รู้จักรูปแบบการสนทนา',
    objectiveP: 'สนทนาและแสดงความคิดเห็นได้',
    objectiveA: 'เคารพความคิดเห็นผู้อื่น',
    learningContent: 'การสนทนาในชีวิตประจำวัน',
    grammarFocus: 'Question Forms, Expressions',
    vocabulary: 'opinion, agree, question, answer',
    teachingMethods: 'CLT, Think-Pair-Share',
    highlightActivity: 'Discussion Circle',
    assessmentMethods: 'Observation, Participation',
    competencies: ['ความสามารถในการสื่อสาร', 'ความสามารถในการคิด'],
    skills21: ['Communication', 'Collaboration', 'Critical Thinking'],
  },
  {
    lessonTopic: 'School Business Project',
    objectiveK: 'เข้าใจพื้นฐานธุรกิจ',
    objectiveP: 'วางแผนและนำเสนอธุรกิจได้',
    objectiveA: 'มีความคิดสร้างสรรค์',
    learningContent: 'การทำธุรกิจในโรงเรียน',
    grammarFocus: 'Future Tense',
    vocabulary: 'customer, menu, service, business',
    teachingMethods: 'Project-Based Learning',
    highlightActivity: 'School Market Activity',
    assessmentMethods: 'Project Rubric',
    competencies: ['ความสามารถในการคิด', 'ความสามารถในการแก้ปัญหา', 'ความสามารถในการใช้เทคโนโลยี'],
    skills21: ['Entrepreneurship', 'Collaboration', 'Creativity'],
  },
  {
    lessonTopic: 'School Farm English Tour',
    objectiveK: 'รู้จักพื้นที่การเกษตรในโรงเรียน',
    objectiveP: 'นำชมฟาร์มได้',
    objectiveA: 'ภูมิใจในโรงเรียน',
    learningContent: 'แนะนำแหล่งเรียนรู้โคก หนอง นา',
    grammarFocus: 'Present Simple',
    vocabulary: 'guide, vegetable, pond, organic',
    teachingMethods: 'Experiential Learning',
    highlightActivity: 'English Farm Tour',
    assessmentMethods: 'Performance Assessment',
    competencies: ['ความสามารถในการสื่อสาร', 'ความสามารถในการใช้ทักษะชีวิต'],
    skills21: ['Communication', 'Leadership', 'Cultural Awareness'],
  },
  {
    lessonTopic: 'Soft Power Project',
    objectiveK: 'เข้าใจ soft power ท้องถิ่น',
    objectiveP: 'นำเสนอวัฒนธรรมได้',
    objectiveA: 'รักท้องถิ่น',
    learningContent: 'อาหาร วัฒนธรรม ภูมิปัญญาท้องถิ่น',
    grammarFocus: 'Adjectives, Present Simple',
    vocabulary: 'culture, local wisdom, tradition',
    teachingMethods: 'PBL, Cooperative Learning',
    highlightActivity: 'Soft Power Presentation',
    assessmentMethods: 'Presentation Rubric',
    competencies: ['ความสามารถในการสื่อสาร', 'ความสามารถในการคิด', 'ความสามารถในการใช้เทคโนโลยี'],
    skills21: ['Creativity', 'Cultural Literacy', 'Presentation Skills'],
  },
];

const toBulletText = (items: string[]) => items.map(item => `- ${item}`).join('\n');

const makeSafeIdPart = (value: any) =>
  String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9ก-๙_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function buildEflSupplementalMasterData(subjects: any[] = [], units: any[] = [], topics: any[] = []) {
  const existingUnitIds = new Set(units.map(unit => unit.unitId));
  const existingTopicIds = new Set(topics.map(topic => topic.topicId));
  const supplementalUnits: any[] = [];
  const supplementalTopics: any[] = [];

  subjects.forEach(subject => {
    const idPart = makeSafeIdPart(subject.subjectId || subject.subjectCode || subject.gradeLevel);
    if (!idPart) return;

    const unitId = `UNIT-EFL-CONTEXT-${idPart}`;

    if (!existingUnitIds.has(unitId)) {
      supplementalUnits.push({
        unitId,
        subjectId: subject.subjectId,
        unitNumber: EFL_CONTEXT_UNIT_NUMBER,
        unitName: EFL_CONTEXT_UNIT_NAME,
        indicatorIds: '',
        isActive: true,
        source: 'efl-context-template',
      });
    }

    EFL_TOPIC_TEMPLATES.forEach((template, index) => {
      const topicId = `TOPIC-EFL-CONTEXT-${idPart}-${String(index + 1).padStart(2, '0')}`;
      if (existingTopicIds.has(topicId)) return;

      supplementalTopics.push({
        ...template,
        topicId,
        unitId,
        topicNumber: index + 1,
        defaultHours: 2,
        isActive: true,
        competencies: toBulletText(template.competencies),
        skills21: toBulletText(template.skills21),
        source: 'efl-context-template',
      });
    });
  });

  return {
    units: [...units, ...supplementalUnits],
    topics: [...topics, ...supplementalTopics],
  };
}
