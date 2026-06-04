const fs = require('fs');

let content = fs.readFileSync('lib/subjectStandardsData.ts', 'utf8');

// Regex for finding indicator codes in standard text (e.g. " ท 1.1 ป.1/1 ", " 1 - ท 1.1 ป.1/1 ", " ต 4.1 ม.1/1 ")
// Matches optional digits/dashes, then Thai/English subject code, space, digits.digits, space, Grade (ป/ม).digits/digits
const standardJunkRegex = /(?:\s+\d+\s*-?\s*)?[ก-ฮa-zA-Z]+\s*\d+\.\d+\s*[ปม]\.\d+(?:-\d+)?\/\d+/;

// Clean standards
let standardBlockRegex = /standards:\s*\[([\s\S]*?)\]/g;
content = content.replace(standardBlockRegex, (match, standardsText) => {
  let newStandardsText = standardsText.replace(/(text:\s*\`)(.*?)(\`)/g, (m, p1, p2, p3) => {
    let junkMatch = standardJunkRegex.exec(p2);
    if (junkMatch) {
      return p1 + p2.substring(0, junkMatch.index).trim() + p3;
    }
    return m;
  });
  return `standards: [${newStandardsText}]`;
});


// Regex for finding standard descriptions inside indicator text
// e.g. " มาตรฐาน ว 2.3 เข้าใจความหมาย..." or " มาตรฐาน ต 1.1 เข้าใจและตีความ..."
// Also we must catch cases where "มาตรฐาน" is right next to a code: "มาตรฐานว" or "มาตรฐาน 1.3" (sometimes OCR misses the space or character)
const indicatorJunkRegex = /\s+มาตรฐาน\s*(?:[ก-ฮa-zA-Z]+\s*)?\d+\.\d+/;

// Clean indicators
let indicatorBlockRegex = /indicators:\s*\[([\s\S]*?)\]/g;
content = content.replace(indicatorBlockRegex, (match, indicatorsText) => {
  let newIndicatorsText = indicatorsText.replace(/(text:\s*\`)(.*?)(\`)/g, (m, p1, p2, p3) => {
    let junkMatch = indicatorJunkRegex.exec(p2);
    if (junkMatch) {
      p2 = p2.substring(0, junkMatch.index).trim();
    }
    
    // Also clean up trailing standalone numbers or dashes from OCR
    // e.g. "ตามหลักการอ่าน 2", "ง่ายๆ 5"
    p2 = p2.replace(/\s+-\s*$/, '');
    p2 = p2.replace(/\s+\d+\s*$/, '');
    
    return p1 + p2.trim() + p3;
  });
  return `indicators: [${newIndicatorsText}]`;
});

fs.writeFileSync('lib/subjectStandardsData.ts', content);
console.log('Cleanup completed successfully.');
