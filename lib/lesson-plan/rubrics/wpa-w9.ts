import type {
  EvaluationRubric,
  RubricAnchor,
} from './master-rubric';

const anchors = (maxScore: number, focus: string): RubricAnchor[] => [
  { score: 0, label: 'ไม่พบหลักฐาน', description: `ไม่พบหลักฐานด้าน${focus}` },
  { score: Math.round(maxScore * 0.33), label: 'ต้องปรับปรุง', description: `มีหลักฐานด้าน${focus}เล็กน้อยและยังไม่ชัดเจน` },
  { score: Math.round(maxScore * 0.65), label: 'พอใช้', description: `มีหลักฐานด้าน${focus}เพียงพอบางส่วน` },
  { score: Math.round(maxScore * 0.85), label: 'ดี', description: `มีหลักฐานด้าน${focus}ชัดเจนเกือบครบ` },
  { score: maxScore, label: 'ดีเยี่ยม', description: `มีหลักฐานด้าน${focus}ครบถ้วน เชื่อมโยง และตรวจสอบได้` },
];

export const wpaW9Rubric = {
  mode: 'wpa_w9',
  totalScore: 100,
  criteria: [
    {
      key: 'curriculum_alignment',
      title: 'ความถูกต้องและสอดคล้องกับหลักสูตร',
      maxScore: 15,
      requiredEvidence: ['standards', 'indicators', 'objectiveAlignment', 'coreContent'],
      anchors: anchors(15, 'ความสอดคล้องกับหลักสูตร'),
    },
    {
      key: 'active_learning_design',
      title: 'การออกแบบ Active Learning และกระบวนการเรียนรู้',
      maxScore: 20,
      requiredEvidence: ['studentAction', 'collaboration', 'gpas', 'teacherAndStudentRoles'],
      anchors: anchors(20, 'การออกแบบ Active Learning'),
    },
    {
      key: 'learner_outcome_evidence',
      title: 'ผลลัพธ์ผู้เรียนและหลักฐานเชิงประจักษ์',
      maxScore: 20,
      requiredEvidence: ['learnerOutcomes', 'studentProducts', 'observableEvidence', 'achievementEvidence'],
      anchors: anchors(20, 'ผลลัพธ์ผู้เรียนและหลักฐานเชิงประจักษ์'),
    },
    {
      key: 'authentic_assessment',
      title: 'การวัดและประเมินผลตามสภาพจริง',
      maxScore: 15,
      requiredEvidence: ['authenticTask', 'assessmentMethods', 'assessmentTools', 'rubric'],
      anchors: anchors(15, 'การประเมินตามสภาพจริง'),
    },
    {
      key: 'reflection_improvement',
      title: 'การใช้ข้อมูลสะท้อนผลและพัฒนา',
      maxScore: 10,
      requiredEvidence: ['studentReflection', 'teacherReflection', 'improvementPlan'],
      anchors: anchors(10, 'การสะท้อนผลและพัฒนา'),
    },
    {
      key: 'innovation_media',
      title: 'ความเป็นนวัตกรรม / สื่อ / เทคโนโลยี',
      maxScore: 10,
      requiredEvidence: ['innovation', 'mediaPurpose', 'technologyUse', 'learningImpact'],
      anchors: anchors(10, 'นวัตกรรม สื่อ และเทคโนโลยี'),
    },
    {
      key: 'wpa_w9_readiness',
      title: 'ความพร้อมสำหรับการประเมินวิทยฐานะ',
      maxScore: 10,
      requiredEvidence: ['coherentPlan', 'verifiableEvidence', 'learnerImpact', 'implementationReadiness'],
      anchors: anchors(10, 'ความพร้อมสำหรับ วPA/ว9'),
    },
  ],
} as const satisfies EvaluationRubric;
