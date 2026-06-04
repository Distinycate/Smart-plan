const fs = require('fs');

const content = fs.readFileSync('lib/subjectStandardsData.ts', 'utf8');

// We will use regex to find indicators that contain the word "มาตรฐาน"
const indicatorRegex = /text:\s*\`(.*?)\`/g;
let match;
let countIndicatorsWithStandard = 0;
while ((match = indicatorRegex.exec(content)) !== null) {
  const text = match[1];
  if (text.includes('มาตรฐาน')) {
    countIndicatorsWithStandard++;
    if (countIndicatorsWithStandard <= 5) {
      console.log('Found "มาตรฐาน" in indicator text:', text.substring(0, 100) + '...');
    }
  }
}
console.log('Total indicators with "มาตรฐาน" in text:', countIndicatorsWithStandard);

// Check standards that contain indicators (e.g. contains a code like ป.1/1 or ม.1/1)
const codeRegex = /[ปม]\.\d\/\d/;
let countStandardsWithIndicator = 0;
// We can't easily distinguish standards vs indicators in regex, so let's just parse the TS file if possible, or use a naive regex for standards array.
const standardBlockRegex = /standards:\s*\[([\s\S]*?)\]/g;
let matchStandardBlock;
while ((matchStandardBlock = standardBlockRegex.exec(content)) !== null) {
  const standardsText = matchStandardBlock[1];
  const standardRegex = /text:\s*\`(.*?)\`/g;
  let standardMatch;
  while ((standardMatch = standardRegex.exec(standardsText)) !== null) {
    const text = standardMatch[1];
    if (codeRegex.test(text)) {
      countStandardsWithIndicator++;
      if (countStandardsWithIndicator <= 5) {
        console.log('Found indicator code in standard text:', text.substring(0, 100) + '...');
      }
    }
  }
}
console.log('Total standards with indicator codes in text:', countStandardsWithIndicator);

