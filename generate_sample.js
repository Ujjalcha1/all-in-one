const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');

async function run() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 800]);
  page.drawText("CONFIDENTIAL - Employee Records", { x: 50, y: 700, size: 20 });
  page.drawText("Name: John Michael Smith", { x: 50, y: 650, size: 14 });
  page.drawText("DOB: 15/02/1985", { x: 50, y: 620, size: 14 });
  page.drawText("SSN: XXX-XX-4521", { x: 50, y: 590, size: 14 });
  
  const pdfBytes = await doc.save();
  fs.writeFileSync('sample.pdf', pdfBytes);
  console.log("sample.pdf generated successfully!");
}

run().catch(console.error);
