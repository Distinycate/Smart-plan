const xlsx = require('xlsx');
const fs = require('fs');

const filePath = '/Users/distinycate/Desktop/แผน/เอกสารอ้างอิง/reference_excel_combined/เอกสารอ้างอิง_จัดเรียงใหม่_หลักสูตร_ตัวชี้วัด_วัดผล.xlsx';
const workbook = xlsx.readFile(filePath);

const targetSheets = [
  'ตัวชี้วัด_ภาษาไทย',
  'ตัวชี้วัด_คณิตศาสตร์',
  'ตัวชี้วัด_วิทยาศาสตร์และเทคโนโล',
  'ตัวชี้วัด_สังคมศึกษา ศาสนาและวั',
  'ตัวชี้วัด_สุขศึกษาและพลศึกษา',
  'ตัวชี้วัด_ศิลปะ',
  'ตัวชี้วัด_การงานอาชีพ',
  'ตัวชี้วัด_ภาษาต่างประเทศ_อังกฤษ'
];

const results = [];

// Helper to convert Thai numerals to Arabic
function thaiToArabic(str) {
  const thaiNumerals = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return str.replace(/[๐-๙]/g, match => thaiNumerals.indexOf(match));
}

// Regex to capture the indicator format: e.g. ท ๑.๑ ป.๓/๓
// [ก-ฮ] = Subject letter
// \s* = Optional space
// \d+\.\d+ = Standard number (can be Thai or Arabic)
// \s+ = Space
// (ป|ม)\.\d+ = Grade
// / = Slash
// \d+ = Indicator number
const indicatorRegex = /([ก-ฮ]\s*[๐-๙0-9]+\.[๐-๙0-9]+)\s+((?:ป|ม)\.[๐-๙0-9]+(?:-[๐-๙0-9]+)?)\/([๐-๙0-9]+)([\s\S]*)/;

targetSheets.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return;
  const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
  
  let currentStandard = "";
  let currentType = "ระหว่างทาง"; // Default or track it
  
  // We skip header row
  for(let i=1; i<data.length; i++) {
    const row = data[i];
    if(!row || row.length < 6) continue;
    const content = row[5]; // Index 5 is 'เนื้อหา'
    if(!content || typeof content !== 'string') continue;
    
    // Split by newlines as sometimes multiple indicators are in one cell
    const lines = content.split('\n');
    for(let line of lines) {
      line = line.trim();
      if(!line) continue;
      
      const match = line.match(indicatorRegex);
      if(match) {
        const standardCode = thaiToArabic(match[1].trim().replace(/\s+/g, ' '));
        const gradeLevel = thaiToArabic(match[2].trim());
        const indicatorNo = thaiToArabic(match[3].trim());
        const indicatorText = match[4].trim();
        const indicatorCode = `${standardCode} ${gradeLevel}/${indicatorNo}`;
        
        // Subject deduction
        let subjectName = sheetName.replace('ตัวชี้วัด_', '');
        
        results.push({
          Subject: subjectName,
          Grade: gradeLevel,
          StandardCode: standardCode,
          IndicatorCode: indicatorCode,
          IndicatorNo: parseInt(indicatorNo),
          IndicatorText: indicatorText.replace(/\r/g, '').replace(/\n/g, ' ').trim()
        });
      }
    }
  }
});

fs.writeFileSync('parsed_curriculum.json', JSON.stringify(results, null, 2));
console.log(`Parsed ${results.length} indicators successfully.`);
