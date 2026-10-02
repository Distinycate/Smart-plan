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

function resolveSubjectInfo(subjectOrKey: string): { nameTh: string; area: string } | null {
  if (!subjectOrKey) return null;
  const upper = subjectOrKey.trim().toUpperCase();
  if (SUBJECT_AREA_MAP[upper]) return SUBJECT_AREA_MAP[upper];

  // Check aliases
  if (upper === 'ENGLISH' || upper === 'ENG' || upper.includes('ภาษาอังกฤษ') || upper.includes('ภาษาต่างประเทศ')) {
    return SUBJECT_AREA_MAP['FOREIGN_LANGUAGE'];
  }
  if (upper.includes('ไทย')) return SUBJECT_AREA_MAP['THAI'];
  if (upper.includes('คณิต')) return SUBJECT_AREA_MAP['MATHEMATICS'];
  if (upper.includes('วิทย์') || upper.includes('วิทยาศาสตร์')) return SUBJECT_AREA_MAP['SCIENCE'];
  if (upper.includes('สังคม')) return SUBJECT_AREA_MAP['SOCIAL_STUDIES'];
  if (upper.includes('สุข') || upper.includes('พล')) return SUBJECT_AREA_MAP['HEALTH_AND_PE'];
  if (upper.includes('ศิลปะ')) return SUBJECT_AREA_MAP['ART'];
  if (upper.includes('การงาน')) return SUBJECT_AREA_MAP['CAREER'];

  // Check values in map
  for (const info of Object.values(SUBJECT_AREA_MAP)) {
    if (info.area === subjectOrKey.trim() || info.nameTh === subjectOrKey.trim()) {
      return info;
    }
  }

  return null;
}

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

  private findItem(area: string, gradeLevel: string): SubjectCurriculumData | undefined {
    const g = gradeLevel.trim();
    // 1. Direct match
    let item = this.indexedByAreaAndGrade.get(`${area}::${g}`);
    if (item) return item;

    // 2. High school match: ม.4, ม.5, ม.6 -> ม.4-6
    if (['ม.4', 'ม.5', 'ม.6', 'มัธยมศึกษาปีที่ 4', 'มัธยมศึกษาปีที่ 5', 'มัธยมศึกษาปีที่ 6'].includes(g)) {
      item = this.indexedByAreaAndGrade.get(`${area}::ม.4-6`) || 
             this.indexedByAreaAndGrade.get(`${area}::ม.4 - 6`) || 
             this.indexedByAreaAndGrade.get(`${area}::ม.4`);
      if (item) return item;
    }

    // 3. Middle school match: ม.1, ม.2, ม.3
    if (['ม.1', 'ม.2', 'ม.3'].includes(g)) {
      item = this.indexedByAreaAndGrade.get(`${area}::${g}`) || this.indexedByAreaAndGrade.get(`${area}::ม.1-3`);
      if (item) return item;
    }

    // 4. Primary match: ป.1 - ป.6
    if (g.startsWith('ป.') || g.startsWith('ประถมศึกษา')) {
      const num = g.replace(/[^0-9]/g, '');
      if (num) {
        item = this.indexedByAreaAndGrade.get(`${area}::ป.${num}`);
        if (item) return item;
      }
    }

    // 5. Fallback iterate
    for (const [key, data] of Array.from(this.indexedByAreaAndGrade.entries())) {
      if (key.startsWith(`${area}::`)) {
        const dataGrade = key.split('::')[1];
        if (dataGrade.includes(g) || g.includes(dataGrade)) {
          return data;
        }
      }
    }

    return undefined;
  }

  async getVersions(): Promise<CurriculumVersion[]> {
    return [CANONICAL_CURRICULUM_VERSION];
  }

  async getSubjects(): Promise<CurriculumSubject[]> {
    return Object.entries(SUBJECT_AREA_MAP).map(([key, info]) => {
      // Find all supported grades for this area
      const rawGrades = ALL_SUBJECT_CURRICULUM
        .filter(c => c.learningArea === info.area || c.subjectName === info.area)
        .map(c => c.gradeLevel);

      // Expand ม.4-6 to ม.4, ม.5, ม.6 for friendly UI selection
      const gradeSet = new Set<string>();
      for (const rg of rawGrades) {
        if (rg === 'ม.4-6' || rg === 'ม.4 - 6') {
          gradeSet.add('ม.4');
          gradeSet.add('ม.5');
          gradeSet.add('ม.6');
        } else {
          gradeSet.add(rg);
        }
      }

      return {
        subjectKey: key,
        nameTh: info.nameTh,
        learningArea: info.area,
        supportedGrades: Array.from(gradeSet),
      };
    });
  }

  async getGrades(subjectKey: string): Promise<string[]> {
    const info = resolveSubjectInfo(subjectKey);
    if (!info) return [];
    
    const rawGrades = ALL_SUBJECT_CURRICULUM
      .filter(c => c.learningArea === info.area || c.subjectName === info.area)
      .map(c => c.gradeLevel);

    const gradeSet = new Set<string>();
    for (const rg of rawGrades) {
      if (rg === 'ม.4-6' || rg === 'ม.4 - 6') {
        gradeSet.add('ม.4');
        gradeSet.add('ม.5');
        gradeSet.add('ม.6');
      } else {
        gradeSet.add(rg);
      }
    }
      
    return Array.from(gradeSet);
  }

  async getStandards(subjectKey: string, gradeLevel: string, _versionId?: string): Promise<CurriculumStandard[]> {
    const info = resolveSubjectInfo(subjectKey);
    if (!info) return [];

    const item = this.findItem(info.area, gradeLevel);
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
    _versionId?: string
  ): Promise<CurriculumIndicator[]> {
    const info = resolveSubjectInfo(subjectKey);
    if (!info) return [];

    const item = this.findItem(info.area, gradeLevel);
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
        type: (i.type === 'during' || i.type === 'final') ? i.type : 'during',
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
