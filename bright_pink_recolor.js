const fs = require('fs');
const path = require('path');

const files = [
  'app/dashboard/page.tsx',
  'app/evaluator/page.tsx',
  'app/plan/PlanForm.tsx',
  'app/layout.tsx',
  'app/page.tsx'
];

files.forEach(relativePath => {
  const file = path.join('/Users/distinycate/Desktop/แผน/ระบบแผนการสอน', relativePath);
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');

  // Dashboard hero gradient
  content = content.replace(/linear-gradient\(135deg, #1e1b4b 0%, #312e81 45%, #4f46e5 80%, #6d28d9 100%\)/g, 'linear-gradient(135deg, #be185d 0%, #db2777 45%, #ec4899 80%, #f43f5e 100%)');
  // Dashboard text color in hero button
  content = content.replace(/color:#4338ca/g, 'color:#db2777');
  content = content.replace(/background: '#6366f1', borderColor: '#6366f1'/g, "background: '#ec4899', borderColor: '#ec4899'");
  content = content.replace(/color: '#6366f1'/g, "color: '#ec4899'");
  
  // Evaluator hero gradient (pink-black -> bright pink)
  content = content.replace(/from-pink-950 via-slate-900 to-pink-900/g, 'from-pink-500 via-rose-500 to-pink-600');
  content = content.replace(/shadow-pink-950\/20/g, 'shadow-pink-500/40');
  content = content.replace(/border-pink-400\/30 bg-pink-500\/10/g, 'border-pink-200/50 bg-white/20');
  content = content.replace(/text-pink-950/g, 'text-pink-700');
  
  // General buttons
  // Convert dark slate buttons to pink
  content = content.replace(/bg-slate-900/g, 'bg-pink-600');
  content = content.replace(/hover:bg-slate-800/g, 'hover:bg-pink-700');
  
  // Convert any remaining blue/indigo/purple classes if missed
  content = content.replace(/bg-indigo-600/g, 'bg-pink-600');
  content = content.replace(/hover:bg-indigo-700/g, 'hover:bg-pink-700');
  content = content.replace(/text-indigo-600/g, 'text-pink-600');
  
  // Specific replacements in PlanForm
  content = content.replace(/bg-slate-800/g, 'bg-pink-500');
  content = content.replace(/hover:bg-slate-700/g, 'hover:bg-pink-600');
  
  fs.writeFileSync(file, content);
  console.log('Recolored to Bright Pink: ' + relativePath);
});
