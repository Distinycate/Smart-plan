const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const cheerio = require('cheerio');
const crypto = require('crypto');

const subjectMapping = {
  '1. ภาษาไทย .docx': 'ภาษาไทย',
  '2. คณิตศาสตร์ .docx': 'คณิตศาสตร์',
  '3. วิทยาศาสตร์และเทคโนโลยี.docx': 'วิทยาศาสตร์',
  '4. สังคมศึกษา ศาสนา และวัฒนธรรม.docx': 'สังคมศึกษา',
  '5. สุขศึกษาและพลศึกษา .docx': 'สุขศึกษาและพลศึกษา',
  '6.ศิลปะ.docx': 'ศิลปะ',
  '7. การงานอาชีพ.docx': 'การงานอาชีพ',
  '8. ภาษาต่างประเทศ (อังกฤษ).docx': 'ภาษาต่างประเทศ'
};

const thaiNumbers = ['๐','๑','๒','๓','๔','๕','๖','๗','๘','๙'];
function replaceThaiNumerals(str) {
  if(!str) return '';
  let res = '';
  for(let char of str) {
    const idx = thaiNumbers.indexOf(char);
    if(idx !== -1) res += idx;
    else res += char;
  }
  return res;
}

function extractIndicatorCode(text) {
  const normText = replaceThaiNumerals(text).trim().replace(/\s+/g, ' ');
  // Match code like: ท 1.1 ป.1/1 or ส 2.1 ม.4-6/1 or ว 1.2 ป.1/1
  const match = normText.match(/^([ก-ฮa-zA-Z]+\s*\d+\.\d+\s*(?:ป\.|ม\.)\s*\d+(?:\-\d+)?\/\d+)/);
  if(match) return match[1];
  return null;
}

async function run() {
  const dir = '/Users/distinycate/Desktop/แผน/ตัวชี้วัด word';
  const allIndicators = [];

  for (const [filename, subjectName] of Object.entries(subjectMapping)) {
    const p = path.join(dir, filename);
    const result = await mammoth.convertToHtml({path: p});
    const $ = cheerio.load(result.value);

    let currentStandardCode = '';
    let currentStandardText = '';

    $('table').each((i, table) => {
      $(table).find('tr').each((j, row) => {
        const cells = $(row).find('td, th');
        if(cells.length === 0) return;
        
        const rowText = replaceThaiNumerals($(row).text().trim());
        if(rowText.startsWith('มาตรฐาน')) {
           // Since multiple standards can be in one cell, just take the first one for simplicity, 
           // or keep the whole text. The Supabase schema just needs standardCode and standardText.
           const match = rowText.match(/มาตรฐาน\s*([ก-ฮa-zA-Z]+\s*\d+\.\d+)\s*(.*)/);
           if(match) {
             currentStandardCode = match[1].trim();
             currentStandardText = match[2].trim();
           } else {
             // Fallback
             currentStandardCode = 'Unknown';
             currentStandardText = rowText;
           }
           return;
        }

        if(cells.length === 3) {
           const processCell = (html, type) => {
             if(!html) return;
             const $$ = cheerio.load(html);
             let currentIndicator = null;
             
             $$('p').each((idx, pTag) => {
               const rawText = $$(pTag).text().trim();
               if(!rawText) return;
               
               const code = extractIndicatorCode(rawText);
               if(code) {
                 const desc = rawText.substring(rawText.indexOf(code) + code.length).trim();
                 let gradeLevel = '';
                 const gradeMatch = code.match(/(ป\.|ม\.)\s*(\d+(?:\-\d+)?)/);
                 if(gradeMatch) {
                    gradeLevel = gradeMatch[1].replace(' ','') + gradeMatch[2]; 
                 }
                 
                 currentIndicator = {
                   indicatorId: 'IND-' + crypto.randomUUID().substring(0,8).toUpperCase(),
                   learningArea: subjectName,
                   gradeLevel: gradeLevel,
                   standardCode: currentStandardCode,
                   standardText: currentStandardText,
                   indicatorType: type,
                   indicatorCode: code.replace(/\s+/g, ' '),
                   indicatorText: desc,
                   isActive: true
                 };
                 allIndicators.push(currentIndicator);
               } else if (currentIndicator) {
                 // Append to the last indicator
                 currentIndicator.indicatorText += ' ' + rawText;
               }
             });
           };

           processCell($(cells[1]).html(), 'during');
           processCell($(cells[2]).html(), 'final');
        }
      });
    });
  }

  // Clean up whitespace in text
  for(let ind of allIndicators) {
    ind.indicatorText = ind.indicatorText.replace(/\s+/g, ' ').trim();
  }

  fs.writeFileSync('parsed_indicators_v2.json', JSON.stringify(allIndicators, null, 2));
  console.log(`Extracted ${allIndicators.length} indicators using V2.`);
}

run();
