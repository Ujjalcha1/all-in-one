const fs = require('fs');
const path = require('path');

const tools = [
  'split-pdf', 'compress-pdf', 'pdf-to-word', 'pdf-to-powerpoint', 'pdf-to-excel', 
  'word-to-pdf', 'powerpoint-to-pdf', 'excel-to-pdf', 'edit-pdf', 'pdf-to-jpg', 
  'jpg-to-pdf', 'sign-pdf', 'watermark', 'rotate-pdf', 'html-to-pdf', 'unlock-pdf', 
  'protect-pdf', 'organize-pdf', 'pdf-to-pdfa', 'repair-pdf', 'page-number', 
  'scan-pdf', 'ocr-pdf', 'compare-pdf', 'redact-pdf', 'crop-pdf', 'pdf-forms', 'translate-pdf'
];

tools.forEach(tool => {
  const dirPath = path.join(__dirname, 'src', 'app', tool);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const title = tool.replace(/-/g, ' ').toUpperCase();

  const content = `"use client";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";

export default function Page() {
  const handleFiles = (files: File[]) => {
    alert("This tool is currently a stub. We need a backend API or custom JS logic to process: " + files.map(f => f.name).join(", "));
  };

  return (
    <ToolLayout 
      title="${title}" 
      description="This feature is coming soon."
    >
      <FileUploader onFilesSelected={handleFiles} />
    </ToolLayout>
  );
}
`;

  fs.writeFileSync(path.join(dirPath, 'page.tsx'), content);
});

console.log('Stubs created successfully.');
