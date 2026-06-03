import pandas as pd
import re
import json

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

grade_map = {
    'ป.1': 'ป.1', 'ป.2': 'ป.2', 'ป.3': 'ป.3', 'ป.4': 'ป.4', 'ป.5': 'ป.5', 'ป.6': 'ป.6',
    'ม.1': 'ม.1', 'ม.2': 'ม.2', 'ม.3': 'ม.3', 'ม.4': 'ม.4-6', 'ม.5': 'ม.4-6', 'ม.6': 'ม.4-6'
}
# Note: High school is often grouped as ม.4-6 in the curriculum. We'll map them appropriately later.

def thai_num_to_arabic(text):
    thai_nums = '๐๑๒๓๔๕๖๗๘๙'
    arabic_nums = '0123456789'
    trans = str.maketrans(thai_nums, arabic_nums)
    return text.translate(trans)

data = {} # nested dict: subject -> grade -> {standards: set, indicators: list}

indicator_regex = re.compile(r"([ทควัสพศงอ]\s*\d+\.\d+)\s*(ป\.|ม\.)\s*(\d+(?:-\d+)?)/(\d+)\s*(.*?)(?=(?:[ทควัสพศงอ]\s*\d+\.\d+\s*(?:ป\.|ม\.)\s*\d+(?:-\d+)?/\d+)|$)", re.DOTALL)
standard_regex = re.compile(r"มาตรฐาน\s*([ทควัสพศงอ]\s*\d+\.\d+)\s*(.*?)(?=(?:มาตรฐาน|$))", re.DOTALL)

for sheet, (subj_key, subj_name, subj_prefix) in sheets.items():
    try:
        df = pd.read_excel(xls, sheet_name=sheet)
    except Exception as e:
        print(f"Error reading sheet {sheet}: {e}")
        continue
        
    data[subj_key] = {}
    
    current_grade = None
    for _, row in df.iterrows():
        content = row.get('เนื้อหา', '')
        if pd.isna(content):
            continue
        content = str(content)
        content_arabic = thai_num_to_arabic(content)
        
        # Check for grade header
        m_grade = re.search(r"ชั้น(ประถม|มัธยม)ศึกษาปีที่\s*(\d+(?:-\d+)?)", content_arabic)
        if m_grade:
            lvl = "ป." if m_grade.group(1) == "ประถม" else "ม."
            current_grade = f"{lvl}{m_grade.group(2)}"
            if current_grade not in data[subj_key]:
                data[subj_key][current_grade] = {'standards': {}, 'indicators': []}
                
        if not current_grade:
            continue
            
        # Extract standards
        std_matches = standard_regex.finditer(content_arabic)
        for m in std_matches:
            code = m.group(1).replace(' ', '')
            code = f"{code[0]} {code[1:]}" # normalize format
            text = m.group(2).strip().replace('\n', ' ')
            data[subj_key][current_grade]['standards'][code] = text
            
        # Extract indicators
        ind_matches = indicator_regex.finditer(content_arabic)
        for m in ind_matches:
            std_code = m.group(1).replace(' ', '')
            std_code = f"{std_code[0]} {std_code[1:]}"
            grade_lvl = f"{m.group(2)}{m.group(3)}"
            ind_num = m.group(4)
            code = f"{std_code} {grade_lvl}/{ind_num}"
            text = m.group(5).strip().replace('\n', ' ')
            
            # Determine type by simple heuristic if it's not explicitly labeled
            # Actually, the excel has 'ระหว่างทาง' and 'ปลายทาง' in headers, but it's hard to track.
            # We'll just default to 'during' for now unless it explicitly matches a 'final' pattern or we just set 'during' for all.
            # For the MVP, we just set all to 'during' if we can't tell, or try to guess.
            itype = 'final' if 'ปลายทาง' in content else 'during'
            
            data[subj_key][current_grade]['indicators'].append({
                'id': f"{subj_key}_{current_grade.replace('.','')}_{ind_num}",
                'code': code,
                'text': text[:200] + ('...' if len(text) > 200 else ''),
                'type': itype
            })

# Let's inspect what we extracted
for subj in data:
    for grade in data[subj]:
        print(f"{subj} {grade}: {len(data[subj][grade]['standards'])} standards, {len(data[subj][grade]['indicators'])} indicators")

