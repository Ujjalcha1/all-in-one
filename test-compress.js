const fs = require('fs');
const { PDFDocument, StandardFonts } = require('pdf-lib');

async function test() {
  // Create a dummy PDF with some text and unreferenced objects
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([500, 500]);
  page.drawText('Hello World!', { x: 50, y: 400, font, size: 50 });
  
  // Add some junk
  for(let i=0; i<100; i++) {
    doc.context.obj({ junk: 'This is some junk data to bloat the file. '.repeat(10) });
  }
  
  const originalBytes = await doc.save();
  console.log('Original size:', originalBytes.length);

  // Method 1: Just load and save
  const doc1 = await PDFDocument.load(originalBytes);
  const bytes1 = await doc1.save({ useObjectStreams: true });
  console.log('Method 1 (load/save with streams):', bytes1.length);

  // Method 2: Copy to new doc
  const doc2 = await PDFDocument.load(originalBytes);
  const newDoc = await PDFDocument.create();
  const pages = await newDoc.copyPages(doc2, doc2.getPageIndices());
  pages.forEach(p => newDoc.addPage(p));
  const bytes2 = await newDoc.save({ useObjectStreams: true });
  console.log('Method 2 (copy pages):', bytes2.length);
}

test().catch(console.error);
