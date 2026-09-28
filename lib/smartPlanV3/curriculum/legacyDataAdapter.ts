import { 
  CurriculumProvider, 
  CurriculumVersion, 
  CurriculumSubject, 
  CurriculumStandard, 
  CurriculumIndicator 
} from './types';
import { ALL_SUBJECT_CURRICULUM, SubjectCurriculumData } from '@/lib/subjectStandardsData';

export const CANONICAL_CURRICULUM_VERSION: CurriculumVersion = {
  id: 'OBEC-2551-REV60',
  name: 'หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551 (ปรับปรุง 2560)',
  year: 2560,
  isDefault: true,
};

// Map between standard subject key and learning areas
const SUBJECT_AREA_MAP: Record<string, { nameTh: string; area: string }> = {
  'THAI': { nameTh: 'ภาษาไทย', area: 'ภาษาไทย' },
  'MATHEMATICS': { nameTh: 'คณิตศาสตร์', area: 'คณิตศาสตร์' },
  'SCIENCE': { nameTh: 'วิทยาศาสตร์และเทคโนโลยี', area: 'วิทยาศาสตร์และเทคโนโลยี' },
  'SOCIAL_STUDIES': { nameTh: 'สังคมศึกษา ศาสนาและวัฒนธรรม', area: 'สังคมศึกษา ศาสนาและวัฒนธรรม' },
  'HEALTH_AND_PE': { nameTh: 'สุขศึกษาและพลศึกษา', area: 'สุขศึกษาและพลศึกษา' },
  'ART': { nameTh: 'ศิลปะ', area: 'ศิลปะ' },
  'CAREER': { nameTh: 'การงานอาชีพ', area: 'การงานอาชีพ' },
  'FOREIGN_LANGUAGE': { nameTh: 'ภาษาต่างประเทศ (ภาษาอังกฤษ)', area: 'ภาษาต่างประเทศ' },
};

export class LegacyCurriculumAdapter implements CurriculumProvider {
  private indexedByAreaAndGrade: Map<string, SubjectCurriculumData> = new Map();

  constructor() {
    this.buildIndex();
  }

  private buildIndex() {
    for (const item of ALL_SUBJECT_CURRICULUM) {
      const areaKey = item.learningArea?.trim() || item.subjectName?.trim();
      const grade = item.gradeLevel?.trim();
      if (areaKey && grade) {
        this.indexedByAreaAndGrade.set(`${areaKey}::${grade}`, item);
      }
    }
  }

  async getVersions(): Promise<CurriculumVersion[]> {
    return [CANONICAL_CURRICULUM_VERSION];
  }

  async getSubjects(): Promise<CurriculumSubject[]> {
    return Object.entries(SUBJECT_AREA_MAP).map(([key, info]) => {
      // Find all supported grades for this area
      const grades = ALL_SUBJECT_CURRICULUM
        .filter(c => c.learningArea === info.area || c.subjectName === info.area)
        .map(c => c.gradeLevel);

      return {
        subjectKey: key,
        nameTh: info.nameTh,
        learningArea: info.area,
        supportedGrades: Array.from(new Set(grades)),
      };
    });
  }

  async getGrades(subjectKey: string): Promise<string[]> {
    const info = SUBJECT_AREA_MAP[subjectKey.toUpperCase()];
    if (!info) return [];
    
    const grades = ALL_SUBJECT_CURRICULUM
      .filter(c => c.learningArea === info.area || c.subjectName === info.area)
      .map(c => c.gradeLevel);
      
    return Array.from(new Set(grades));
  }

  async getStandards(subjectKey: string, gradeLevel: string, versionId?: string): Promise<CurriculumStandard[]> {
    const info = SUBJECT_AREA_MAP[subjectKey.toUpperCase()];
    if (!info) return [];

    const item = this.indexedByAreaAndGrade.get(`${info.area}::${gradeLevel.trim()}`);
    if (!item || !item.standards) return [];

    return item.standards.map(s => ({
      code: s.code.trim(),
      text: s.text.trim(),
      learningArea: info.area,
    }));
  }

  async getIndicators(
    subjectKey: string, 
    gradeLevel: string, 
    standardCode?: string, 
    versionId?: string
  ): Promise<CurriculumIndicator[]> {
    const info = SUBJECT_AREA_MAP[subjectKey.toUpperCase()];
    if (!info) return [];

    const item = this.indexedByAreaAndGrade.get(`${info.area}::${gradeLevel.trim()}`);
    if (!item || !item.indicators) return [];

    let list = item.indicators.map(i => {
      // Extract standard code prefix if not explicit
      // e.g. from 'ต 1.1 ม.1/1' standardCode is 'ต 1.1'
      const parts = i.code.trim().split(/\s+/);
      const stdCode = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : '';

      return {
        id: i.id,
        code: i.code.trim(),
        text: i.text.trim(),
        type: i.type,
        standardCode: stdCode,
        subjectKey: subjectKey.toUpperCase(),
        gradeLevel: gradeLevel.trim(),
      };
    });

    if (standardCode) {
      const targetStd = standardCode.trim().toLowerCase();
      list = list.filter(i => i.standardCode.toLowerCase() === targetStd || i.code.toLowerCase().startsWith(targetStd));
    }

    return list;
  }
}
