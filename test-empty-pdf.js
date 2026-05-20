const { PDFDocument } = require('pdf-lib');

async function test() {
  try {
    const doc = await PDFDocument.create();
    const bytes = await doc.save();
    console.log("Saved bytes:", bytes.length);
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();
