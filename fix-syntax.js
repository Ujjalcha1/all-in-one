const fs = require('fs');
const path = require('path');

const appsDir = path.join(__dirname, 'src', 'app');
const dirs = fs.readdirSync(appsDir).filter(f => fs.statSync(path.join(appsDir, f)).isDirectory());

let fixedCount = 0;

for (const dir of dirs) {
  const pageFile = path.join(appsDir, dir, 'page.tsx');
  if (!fs.existsSync(pageFile)) continue;
  
  let content = fs.readFileSync(pageFile, 'utf8');
  let changed = false;

  // Fix unclosed backtick in downloadFileName={...
  content = content.replace(/downloadFileName=\{\`([^\n\`]+)$/gm, (match, p1) => {
    changed = true;
    let ext = '.pdf';
    if (dir.includes('word')) ext = '.docx';
    else if (dir.includes('excel')) ext = '.xlsx';
    else if (dir.includes('powerpoint')) ext = '.pptx';
    else if (dir.includes('jpg')) ext = '.zip';
    else if (dir === 'split-pdf') ext = '.zip';
    return `downloadFileName={\`${p1}_result${ext}\`}`;
  });

  // Fix unclosed setFile(null); setResultUrl(null); }
  content = content.replace(/onStartOver=\{\(\) => \{ ([^\n]+); \}\s*\/>/gm, (match, p1) => {
    changed = true;
    return `onStartOver={() => { ${p1}; }}\n        />`;
  });

  if (changed) {
    fs.writeFileSync(pageFile, content);
    console.log(`Fixed ${dir}`);
    fixedCount++;
  }
}

console.log(`Fixed ${fixedCount} files.`);
