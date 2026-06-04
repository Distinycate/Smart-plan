const fs = require('fs');

let content = fs.readFileSync('lib/subjectStandardsData.ts', 'utf8');

// The English subject keys are eng_ป1 up to eng_ม3. 
// We want to fix the `text` field in standards and indicators for ALL english grades.
// Wait, we can just use regex for all `text: \`...\`` inside ENG_* objects.

// For standards, we want to capture only the first sentence or part before a number or another code.
// E.g. 'เข้าใจและตีความเรื่องที่ฟังและอ่านจากสื่อประเภทต่าง ๆ และแสดงความคิดเห็นอย่างมีเหตุผล ' -> keep
// E.g. 'นำเสนอข้อมูลข่าวสาร ความคิดรวบยอด และความคิดเห็นในเรื่องต่าง ๆ โดยการพูด  และการเขียน  3 ต 1.2 ป.1/3...' -> keep only before ' 3 ต '
// General rule for standards: The text is usually the first phrase. If it contains ` ต X.Y`, that's junk. If it contains numbers alone like ` 5 ต `, the junk starts at the number.

// For indicators, e.g. 'ใช้คำสั่งง่าย ๆ ตามแบบที่ฟัง  มาตรฐาน ต 3.1...' -> junk starts at 'มาตรฐาน'.

// Let's implement a manual cleaner for the known standards since there are only 8 English standards!
const standardTexts = {
  'ต 1.1': 'เข้าใจและตีความเรื่องที่ฟังและอ่านจากสื่อประเภทต่าง ๆ และแสดงความคิดเห็นอย่างมีเหตุผล',
  'ต 1.2': 'มีทักษะการสื่อสารทางภาษาในการแลกเปลี่ยนข้อมูลข่าวสาร แสดงความรู้สึก และความคิดเห็นอย่างมีประสิทธิภาพ',
  'ต 1.3': 'นำเสนอข้อมูลข่าวสาร ความคิดรวบยอด และความคิดเห็นในเรื่องต่าง ๆ โดยการพูดและการเขียน',
  'ต 2.1': 'เข้าใจความสัมพันธ์ระหว่างภาษากับวัฒนธรรมของเจ้าของภาษา และนำไปใช้ได้อย่างเหมาะสมกับกาลเทศะ',
  'ต 2.2': 'เข้าใจความเหมือนและความแตกต่างระหว่างภาษาและวัฒนธรรมของเจ้าของภาษากับภาษาและวัฒนธรรมไทย และนำมาใช้อย่างถูกต้องและเหมาะสม',
  'ต 3.1': 'ใช้ภาษาต่างประเทศในการเชื่อมโยงความรู้กับกลุ่มสาระการเรียนรู้อื่น และเป็นพื้นฐานในการพัฒนา แสวงหาความรู้ และเปิดโลกทัศน์ของตน',
  'ต 4.1': 'ใช้ภาษาต่างประเทศในสถานการณ์ต่าง ๆ ทั้งในสถานศึกษา ชุมชน และสังคม',
  'ต 4.2': 'ใช้ภาษาต่างประเทศเป็นเครื่องมือพื้นฐานในการศึกษาต่อ การประกอบอาชีพ และการแลกเปลี่ยนเรียนรู้กับสังคมโลก'
};

// Replace standard texts
for (const [code, text] of Object.entries(standardTexts)) {
  const regex = new RegExp(`{ code: '${code}', text: \\\`[^\`]*\\\` }`, 'g');
  content = content.replace(regex, `{ code: '${code}', text: \`${text}\` }`);
}

// For indicators, if `text` contains `มาตรฐาน`, remove `มาตรฐาน` and everything after it.
// E.g. `text: \`ใช้คำสั่งง่าย ๆ ตามแบบที่ฟัง  มาตรฐาน ต 3.1...\`` -> `text: \`ใช้คำสั่งง่าย ๆ ตามแบบที่ฟัง\``
content = content.replace(/(text:\s*\`)(.*?)(\s*มาตรฐาน\s+ต\s*\d\.\d.*?)(?=\`)/g, '$1$2');

// Also some indicators might have trailing numbers like ` ตามหลักการอ่าน  2` -> ` ตามหลักการอ่าน`
content = content.replace(/(text:\s*\`.*?)(\s+\d+)\`/g, '$1`');

fs.writeFileSync('lib/subjectStandardsData.ts', content);
console.log('Cleaned English standards and indicators in subjectStandardsData.ts');
