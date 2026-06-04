const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('/Users/distinycate/Desktop/แผน/ระบบแผนการสอน/app');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // Gradients
  newContent = newContent.replace(/from-pink-500 to-rose-500/g, 'from-pink-200 to-rose-200');
  newContent = newContent.replace(/from-pink-400 to-rose-400/g, 'from-pink-200 to-rose-200');
  newContent = newContent.replace(/from-pink-500 via-rose-500 to-pink-600/g, 'from-pink-400 via-rose-400 to-pink-500');
  
  // Backgrounds
  newContent = newContent.replace(/bg-pink-500/g, 'bg-pink-200');
  newContent = newContent.replace(/bg-pink-600/g, 'bg-pink-300');
  newContent = newContent.replace(/bg-rose-500/g, 'bg-rose-200');
  newContent = newContent.replace(/bg-rose-600/g, 'bg-rose-300');
  
  newContent = newContent.replace(/hover:bg-pink-600/g, 'hover:bg-pink-300');
  newContent = newContent.replace(/hover:bg-pink-700/g, 'hover:bg-pink-400');
  newContent = newContent.replace(/hover:from-pink-400 hover:to-rose-400/g, 'hover:from-pink-300 hover:to-rose-300');
  
  // Shadows
  newContent = newContent.replace(/shadow-pink-500/g, 'shadow-pink-200');
  newContent = newContent.replace(/shadow-pink-400/g, 'shadow-pink-200');
  
  // Borders
  newContent = newContent.replace(/border-pink-500/g, 'border-pink-300');

  // Fix text-white to text-pink-900 on pastel backgrounds
  // We'll do this in a loop because JS regex lookbehind is tricky for variable length
  // We'll just replace 'text-white' with 'text-pink-900' if 'bg-pink-200' or 'from-pink-200' is in the same className
  
  let lines = newContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('className="') || lines[i].includes('className={`')) {
      if ((lines[i].includes('bg-pink-200') || lines[i].includes('from-pink-200')) && lines[i].includes('text-white')) {
        lines[i] = lines[i].replace(/text-white/g, 'text-pink-900');
      }
    }
  }
  newContent = lines.join('\n');

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated ${file}`);
  }
});
