const fs = require('fs');
const path = require('path');

const appsDir = path.join(__dirname, 'src', 'app');
const dirs = fs.readdirSync(appsDir).filter(f => fs.statSync(path.join(appsDir, f)).isDirectory());

let updatedCount = 0;

for (const dir of dirs) {
  const pageFile = path.join(appsDir, dir, 'page.tsx');
  if (!fs.existsSync(pageFile)) continue;
  
  let content = fs.readFileSync(pageFile, 'utf8');
  if (content.includes('ResultScreen')) continue;

  // Find the exact result block which is usually the last <div> inside the ternary
  const parts = content.split(') : (');
  if (parts.length < 2) continue;
  
  const lastPart = parts.pop();
  
  // Extract details using independent regexes
  const titleMatch = lastPart.match(/<h2[^>]*>([^<]+)<\/h2>/);
  const downloadHrefMatch = lastPart.match(/href={([^}]+)}/);
  const downloadAttrMatch = lastPart.match(/download=({[^}]+}|"[^"]+")/);
  // Match text inside the download anchor tag, ignoring icons
  const textMatch = lastPart.match(/<a [^>]*>[\s\S]*?(?:<[^>]+>[\s\S]*?)*([^<]+?)\s*<\/a>/);
  const onClickMatch = lastPart.match(/onClick={([^}]+)}/);

  if (titleMatch && downloadHrefMatch && onClickMatch) {
    const title = titleMatch[1].trim();
    const urlVar = downloadHrefMatch[1];
    let downloadAttr = downloadAttrMatch ? downloadAttrMatch[1] : `"${dir}-result.pdf"`;
    if (downloadAttr.startsWith('{')) downloadAttr = downloadAttr.slice(1, -1);
    
    // Find text
    let downloadText = "Download file";
    const aTagMatch = lastPart.match(/<a [^>]*>([\s\S]*?)<\/a>/);
    if (aTagMatch) {
      downloadText = aTagMatch[1].replace(/<[^>]+>/g, '').trim() || "Download file";
    }

    const onClickVar = onClickMatch[1];

    // Build the new replacement block
    const newBlock = `
        <ResultScreen
          title="${title}"
          downloadUrl={${urlVar}}
          downloadFileName={${downloadAttr}}
          downloadText="${downloadText}"
          onStartOver={${onClickVar}}
        />
      )}
    </ToolLayout>
    `;

    // Replace the last part by splitting by `</ToolLayout>`
    const toolLayoutParts = lastPart.split('</ToolLayout>');
    if (toolLayoutParts.length >= 2) {
      content = parts.join(') : (') + ') : (' + newBlock + (toolLayoutParts.length > 2 ? '</ToolLayout>'.join(toolLayoutParts.slice(1)) : toolLayoutParts.pop());
      
      // Add import
      if(!content.includes('ResultScreen')) {
        content = content.replace('import { Button }', 'import { ResultScreen } from "@/components/result-screen";\nimport { Button }');
      }
      
      fs.writeFileSync(pageFile, content);
      console.log(`Updated ${dir}`);
      updatedCount++;
    }
  } else {
    console.log(`Missing required fields in ${dir}: title=${!!titleMatch}, href=${!!downloadHrefMatch}, onClick=${!!onClickMatch}`);
  }
}

console.log(`Updated ${updatedCount} files.`);
