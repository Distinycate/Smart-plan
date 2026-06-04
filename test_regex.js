const fs = require('fs');
let content = fs.readFileSync('lib/subjectStandardsData.ts', 'utf8');

const codeRegex = /(?:\s+\d+\s*-?\s*)?[ก-ฮa-zA-Z]+\s*\d+\.\d+\s*[ปม]\.\d+\/\d+/;

let standardBlockRegex = /standards:\s*\[([\s\S]*?)\]/g;
let matchStandardBlock;
let cleanedStandards = 0;
while ((matchStandardBlock = standardBlockRegex.exec(content)) !== null) {
  let standardsText = matchStandardBlock[1];
  let standardRegex = /text:\s*\`(.*?)\`/g;
  let standardMatch;
  while ((standardMatch = standardRegex.exec(standardsText)) !== null) {
    let text = standardMatch[1];
    let match = codeRegex.exec(text);
    if (match) {
      let cleanText = text.substring(0, match.index).trim();
      // console.log('Standard clean text:', cleanText);
      cleanedStandards++;
    }
  }
}
console.log('Standards that can be cleaned:', cleanedStandards);

const indicatorJunkRegex = /\s+มาตรฐาน\s+[ก-ฮa-zA-Z]+\s*\d+\.\d+/;
let indicatorBlockRegex = /indicators:\s*\[([\s\S]*?)\]/g;
let matchIndicatorBlock;
let cleanedIndicators = 0;
while ((matchIndicatorBlock = indicatorBlockRegex.exec(content)) !== null) {
  let indicatorsText = matchIndicatorBlock[1];
  let indicatorRegex = /text:\s*\`(.*?)\`/g;
  let indicatorMatch;
  while ((indicatorMatch = indicatorRegex.exec(indicatorsText)) !== null) {
    let text = indicatorMatch[1];
    let match = indicatorJunkRegex.exec(text);
    if (match) {
      let cleanText = text.substring(0, match.index).trim();
      // console.log('Indicator clean text:', cleanText);
      cleanedIndicators++;
    }
  }
}
console.log('Indicators that can be cleaned:', cleanedIndicators);

