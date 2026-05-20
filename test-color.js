const fs = require('fs');

async function testPdfjs() {
  const { PDFDocument, rgb } = require('pdf-lib');
  
  // 1. Create a PDF with blue text
  const doc = await PDFDocument.create();
  const pageDoc = doc.addPage([500, 500]);
  pageDoc.drawText('Sample PDF', { x: 50, y: 400, size: 24, color: rgb(0.2, 0.4, 0.8) });
  pageDoc.drawText('Another line', { x: 50, y: 300, size: 24, color: rgb(0.8, 0.1, 0.1) });
  
  const pdfBytes = await doc.save();

  // 2. Read it with pdfjs-dist
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  
  const textContent = await page.getTextContent();
  const opList = await page.getOperatorList();
  
  let currentColor = "#000000";
  const opColors = [];
  
  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];
    const opName = Object.keys(pdfjsLib.OPS).find(k => pdfjsLib.OPS[k] === fn);
    
    if (opName === 'setFillRGBColor' || opName === 'setFillColor') {
      currentColor = typeof args[0] === 'string' && args[0].startsWith('#') ? args[0] : currentColor;
      // sometimes args is [r, g, b]
      if (args.length === 3 && typeof args[0] === 'number') {
        currentColor = '#' + args.map(c => c.toString(16).padStart(2, '0')).join('');
      }
    } else if (opName === 'showText' || opName === 'showSpacedText') {
      opColors.push(currentColor);
    }
  }
  
  console.log("TextContent items length:", textContent.items.length);
  console.log("Text operators length:", opColors.length);
  console.log("Mapped colors:", opColors);
}

testPdfjs().catch(console.error);
