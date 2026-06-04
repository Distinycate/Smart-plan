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

  newContent = newContent.replace(/text-pink-500/g, 'text-pink-400');
  newContent = newContent.replace(/text-rose-500/g, 'text-rose-400');
  newContent = newContent.replace(/text-pink-600/g, 'text-pink-500');

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated text colors in ${file}`);
  }
});
