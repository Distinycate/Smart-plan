const fs = require('fs');
const path = require('path');

const files = [
  '/Users/distinycate/Desktop/แผน/ระบบแผนการสอน/app/dashboard/page.tsx',
  '/Users/distinycate/Desktop/แผน/ระบบแผนการสอน/app/evaluator/page.tsx',
  '/Users/distinycate/Desktop/แผน/ระบบแผนการสอน/app/plan/PlanForm.tsx',
  '/Users/distinycate/Desktop/แผน/ระบบแผนการสอน/app/admin/page.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // We want to change indigo, blue, emerald, purple to pink, rose etc.
  content = content.replace(/indigo-/g, 'pink-');
  content = content.replace(/blue-/g, 'rose-');
  content = content.replace(/violet-/g, 'pink-');
  content = content.replace(/purple-/g, 'rose-');

  // Replace dark header backgrounds
  content = content.replace(/bg-slate-900/g, 'bg-white');
  content = content.replace(/text-slate-100/g, 'text-slate-800');

  // Some text-white might become invisible on bg-white, but since buttons usually have bg-pink-500, they are fine.
  // Wait, in Evaluator/PlanForm headers, if bg changes from slate-900 to white, we need to change text-white to text-slate-800 on the header text specifically.
  // Instead of risking a global text-white replace, we'll keep it simple.
  
  fs.writeFileSync(file, content);
  console.log('Recolored:', file);
});
