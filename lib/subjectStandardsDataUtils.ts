export interface SubjectIndicator {
  id: string;
  code: string;
  text: string;
  type: 'during' | 'final';
}

export interface SubjectStandard {
  code: string;
  text: string;
}

export interface SubjectCurriculumData {
  subjectKey: string;
  subjectName: string;
  subjectCode: string;
  gradeLevel: string;
  learningArea: string;
  standards: SubjectStandard[];
  indicators: SubjectIndicator[];
}

export const formatStandards = (curriculum: SubjectCurriculumData): string => {
  return curriculum.standards.map((s) => `- ${s.code} ${s.text}`).join('\n');
};

export const formatDuringIndicators = (curriculum: SubjectCurriculumData): string => {
  return curriculum.indicators
    .filter((i) => i.type === 'during')
    .map((i) => `- ${i.code} ${i.text}`)
    .join('\n');
};

export const formatFinalIndicators = (curriculum: SubjectCurriculumData): string => {
  return curriculum.indicators
    .filter((i) => i.type === 'final')
    .map((i) => `- ${i.code} ${i.text}`)
    .join('\n');
};
