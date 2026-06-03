import pandas as pd
import re

f = "/Users/distinycate/Desktop/แผน/เอกสารอ้างอิง/reference_excel_combined/เอกสารอ้างอิง_จัดเรียงใหม่_หลักสูตร_ตัวชี้วัด_วัดผล.xlsx"
xls = pd.ExcelFile(f)

sheets = {
    'ตัวชี้วัด_ภาษาไทย': ('thai', 'ภาษาไทย', 'ท'),
    'ตัวชี้วัด_คณิตศาสตร์': ('math', 'คณิตศาสตร์', 'ค'),
    'ตัวชี้วัด_วิทยาศาสตร์และเทคโนโล': ('sci', 'วิทยาศาสตร์และเทคโนโลยี', 'ว'),
    'ตัวชี้วัด_สังคมศึกษา ศาสนาและวั': ('social', 'สังคมศึกษา ศาสนาและวัฒนธรรม', 'ส'),
    'ตัวชี้วัด_สุขศึกษาและพลศึกษา': ('pe', 'สุขศึกษาและพลศึกษา', 'พ'),
    'ตัวชี้วัด_ศิลปะ': ('art', 'ศิลปะ', 'ศ'),
    'ตัวชี้วัด_การงานอาชีพ': ('career', 'การงานอาชีพ', 'ง'),
    'ตัวชี้วัด_ภาษาต่างประเทศ_อังกฤษ': ('eng', 'ภาษาต่างประเทศ (ภาษาอังกฤษ)', 'อ')
}

def thai_num_to_arabic(text):
    thai_nums = '๐๑๒๓๔๕๖๗๘๙'
    arabic_nums = '0123456789'
    trans = str.maketrans(thai_nums, arabic_nums)
    return text.translate(trans)

data = {} 

indicator_regex = re.compile(r"([ทควัสพศงอต]\s*\d+\.\d+)\s*(ป\.|ม\.)\s*(\d+(?:-\d+)?)/(\d+)\s*(.*?)(?=(?:[ทควัสพศงอต]\s*\d+\.\d+\s*(?:ป\.|ม\.)\s*\d+(?:-\d+)?/\d+)|$)", re.DOTALL)
standard_regex = re.compile(r"มาตรฐาน\s*([ทควัสพศงอต]\s*\d+\.\d+)\s*(.*?)(?=(?:มาตรฐาน|$))", re.DOTALL)

for sheet, (subj_key, subj_name, subj_prefix) in sheets.items():
    try:
        df = pd.read_excel(xls, sheet_name=sheet)
    except Exception:
        continue
        
    data[subj_key] = {'name': subj_name, 'prefix': subj_prefix, 'grades': {}}
    
    current_grade = None
    for _, row in df.iterrows():
        content = row.get('เนื้อหา', '')
        if pd.isna(content):
            continue
        content = str(content)
        content_arabic = thai_num_to_arabic(content)
        
        m_grade = re.search(r"ชั้น(ประถม|มัธยม)ศึกษาปีที่\s*(\d+(?:-\d+)?)", content_arabic)
        if m_grade:
            lvl = "ป." if m_grade.group(1) == "ประถม" else "ม."
            current_grade = f"{lvl}{m_grade.group(2)}"
            if current_grade not in data[subj_key]['grades']:
                data[subj_key]['grades'][current_grade] = {'standards': {}, 'indicators': []}
                
        if not current_grade:
            continue
            
        std_matches = standard_regex.finditer(content_arabic)
        for m in std_matches:
            code = m.group(1).replace(' ', '')
            code = f"{code[0]} {code[1:]}"
            text = m.group(2).strip().replace('\n', ' ')
            data[subj_key]['grades'][current_grade]['standards'][code] = text
            
        ind_matches = indicator_regex.finditer(content_arabic)
        for m in ind_matches:
            std_code = m.group(1).replace(' ', '')
            std_code = f"{std_code[0]} {std_code[1:]}"
            grade_lvl = f"{m.group(2)}{m.group(3)}"
            ind_num = m.group(4)
            code = f"{std_code} {grade_lvl}/{ind_num}"
            text = m.group(5).strip().replace('\n', ' ')
            itype = 'final' if 'ปลายทาง' in content else 'during'
            
            data[subj_key]['grades'][current_grade]['indicators'].append({
                'id': f"{subj_key}_{current_grade.replace('.','').replace('-','_')}_{ind_num}_{std_code.replace('.','').replace(' ','')}",
                'code': code,
                'text': text[:200],
                'type': itype
            })

ts_content = """/**
 * subjectStandardsData.ts
 * ข้อมูลมาตรฐานการเรียนรู้และตัวชี้วัดแยกตามรายวิชา (สร้างอัตโนมัติจากไฟล์อ้างอิง)
 */

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

"""

all_configs = []

def map_grade_code(grade):
    if "ป.1" in grade: return "11101"
    if "ป.2" in grade: return "12101"
    if "ป.3" in grade: return "13101"
    if "ป.4" in grade: return "14101"
    if "ป.5" in grade: return "15101"
    if "ป.6" in grade: return "16101"
    if "ม.1" in grade: return "21101"
    if "ม.2" in grade: return "22101"
    if "ม.3" in grade: return "23101"
    if "ม.4" in grade: return "31101"
    if "ม.5" in grade: return "32101"
    if "ม.6" in grade: return "33101"
    return "00000"

for subj_key, subj_data in data.items():
    subj_name = subj_data['name']
    prefix = subj_data['prefix']
    
    for grade, gdata in subj_data['grades'].items():
        if len(gdata['standards']) == 0 and len(gdata['indicators']) == 0:
            continue
            
        var_name = f"{subj_key.upper()}_{grade.replace('.','').replace('-','_')}"
        all_configs.append(var_name)
        
        gcode = map_grade_code(grade)
        
        ts_content += f"const {var_name}: SubjectCurriculumData = {{\n"
        ts_content += f"  subjectKey: '{subj_key}_{grade.replace('.','')}',\n"
        ts_content += f"  subjectName: '{subj_name}',\n"
        ts_content += f"  subjectCode: '{prefix}{gcode}',\n"
        ts_content += f"  gradeLevel: '{grade}',\n"
        ts_content += f"  learningArea: '{subj_name.split(' (')[0]}',\n" # clean up eng name
        
        ts_content += "  standards: [\n"
        for scode, stext in gdata['standards'].items():
            ts_content += f"    {{ code: '{scode}', text: `{stext.replace('`','')} ` }},\n"
        ts_content += "  ],\n"
        
        ts_content += "  indicators: [\n"
        for ind in gdata['indicators']:
            ts_content += f"    {{ id: '{ind['id']}', code: '{ind['code']}', text: `{ind['text'].replace('`','')}`, type: '{ind['type']}' }},\n"
        ts_content += "  ]\n"
        ts_content += "};\n\n"

ts_content += "const ALL_SUBJECT_CURRICULUM: SubjectCurriculumData[] = [\n"
for c in all_configs:
    ts_content += f"  {c},\n"
ts_content += "];\n\n"

ts_content += """
export function getCurriculumBySubject(gradeLevel: string, subjectName: string): SubjectCurriculumData | null {
  const grade = gradeLevel.trim();
  const name = subjectName.trim();
  return ALL_SUBJECT_CURRICULUM.find(
    s => s.gradeLevel === grade && s.subjectName === name
  ) || null;
}

export function getSubjectsByGrade(gradeLevel: string): SubjectCurriculumData[] {
  return ALL_SUBJECT_CURRICULUM.filter(s => s.gradeLevel === gradeLevel.trim());
}

export function getAllGradeLevels(): string[] {
  const order = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6', 'ม.4-6'];
  const grades = Array.from(new Set(ALL_SUBJECT_CURRICULUM.map(s => s.gradeLevel)));
  return grades.sort((a, b) => {
      let ia = order.indexOf(a);
      let ib = order.indexOf(b);
      if (ia === -1) ia = 99;
      if (ib === -1) ib = 99;
      return ia - ib;
  });
}

export function formatStandards(curriculum: SubjectCurriculumData): string {
  return curriculum.standards.map(s => `${s.code} ${s.text}`).join('\\n');
}

export function formatDuringIndicators(curriculum: SubjectCurriculumData): string {
  return curriculum.indicators
    .filter(i => i.type === 'during')
    .map(i => `${i.code} ${i.text}`)
    .join('\\n');
}

export function formatFinalIndicators(curriculum: SubjectCurriculumData): string {
  return curriculum.indicators
    .filter(i => i.type === 'final')
    .map(i => `${i.code} ${i.text}`)
    .join('\\n');
}
"""

with open('new_subjectStandardsData.ts', 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f"Generated new_subjectStandardsData.ts with {len(all_configs)} configurations.")
