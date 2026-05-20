const fs = require('fs');
const path = require('path');

const appsDir = path.join(__dirname, 'src', 'app');
const dirs = fs.readdirSync(appsDir).filter(f => fs.statSync(path.join(appsDir, f)).isDirectory());

let fixedCount = 0;

for (const dir of dirs) {
  const pageFile = path.join(appsDir, dir, 'page.tsx');
  if (!fs.existsSync(pageFile)) continue;
  
  let content = fs.readFileSync(pageFile, 'utf8');
  
  if (content.includes('<ResultScreen') && !content.includes('import { ResultScreen }')) {
    content = content.replace('import { Button }', 'import { ResultScreen } from "@/components/result-screen";\nimport { Button }');
    fs.writeFileSync(pageFile, content);
    console.log(`Added import to ${dir}`);
    fixedCount++;
  }
}

console.log(`Fixed imports in ${fixedCount} files.`);
