const fs = require('fs');

const file = '/Users/distinycate/Desktop/แผน/ระบบแผนการสอน/app/profile/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix the link to dashboard
content = content.replace(/href="\/"/g, 'href="/dashboard"');

// Recolor
content = content.replace(/indigo-/g, 'pink-');
content = content.replace(/blue-/g, 'rose-');
content = content.replace(/violet-/g, 'pink-');
content = content.replace(/purple-/g, 'rose-');

fs.writeFileSync(file, content);
console.log('Recolored Profile page');
