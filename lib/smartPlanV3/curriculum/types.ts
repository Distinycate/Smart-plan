/**
 * Smart Plan V3 Curriculum Engine Types
 */

export interface CurriculumVersion {
  id: string; // e.g. 'OBEC-2551-REV60'
  name: string;
  year: number;
  isDefault: boolean;
}

export interface CurriculumSubject {
  subjectKey: string; // e.g. 'FOREIGN_LANGUAGE' | 'THAI' | 'MATHEMATICS'
  nameTh: string;
  learningArea: string;
  supportedGrades: string[];
}

export interface CurriculumStandard {
  code: string; // e.g. 'ต 1.1'
  text: string;
  learningArea: string;
}

export interface CurriculumIndicator {
  id: string;
  code: string; // e.g. 'ต 1.1 ม.1/1'
  text: string;
  type: 'during' | 'final'; // ระหว่างทาง / ปลายทาง
  standardCode: string;
  subjectKey: string;
  gradeLevel: string;
}

export interface CurriculumProvider {
  getVersions(): Promise<CurriculumVersion[]>;
  getSubjects(): Promise<CurriculumSubject[]>;
  getGrades(subjectKey: string): Promise<string[]>;
  getStandards(subjectKey: string, gradeLevel: string, versionId?: string): Promise<CurriculumStandard[]>;
  getIndicators(subjectKey: string, gradeLevel: string, standardCode?: string, versionId?: string): Promise<CurriculumIndicator[]>;
}
