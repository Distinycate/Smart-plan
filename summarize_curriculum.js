const fs = require('fs');
const content = fs.readFileSync('lib/subjectStandardsData.ts', 'utf8');

// Regex to find subject declarations: const SUBJECT_ID: SubjectCurriculumData = { ... }
const subjectRegex = /const\s+([A-Z_0-9]+)\s*:\s*SubjectCurriculumData\s*=\s*\{([^]*?)\};/g;

let match;
console.log("Subject | Grade | Learning Area | Standards Count | Indicators (During) | Indicators (Final)");
console.log("---------------------------------------------------------------------------------------------");

while ((match = subjectRegex.exec(content)) !== null) {
  const objName = match[1];
  const objContent = match[2];
  
  const subjectNameMatch = objContent.match(/subjectName:\s*'([^']+)'/);
  const gradeMatch = objContent.match(/gradeLevel:\s*'([^']+)'/);
  const areaMatch = objContent.match(/learningArea:\s*'([^']+)'/);
  
  const subjectName = subjectNameMatch ? subjectNameMatch[1] : 'Unknown';
  const grade = gradeMatch ? gradeMatch[1] : 'Unknown';
  const area = areaMatch ? areaMatch[1] : 'Unknown';
  
  const standardsBlock = objContent.match(/standards:\s*\[([^\]]+)\]/);
  const indicatorsBlock = objContent.match(/indicators:\s*\[([^\]]+)\]/);
  
  let stdCount = 0;
  if (standardsBlock) {
    stdCount = (standardsBlock[1].match(/\{/g) || []).length;
  }
  
  let duringCount = 0;
  let finalCount = 0;
  if (indicatorsBlock) {
    duringCount = (indicatorsBlock[1].match(/type:\s*'during'/g) || []).length;
    finalCount = (indicatorsBlock[1].match(/type:\s*'final'/g) || []).length;
  }
  
  console.log(`${subjectName} | ${grade} | ${area} | ${stdCount} | ${duringCount} | ${finalCount}`);
}
