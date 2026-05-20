"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileType2 } from "lucide-react";

export default function WordToPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleFiles = (files: File[]) => { setFile(files[0]); setResultUrl(null); };

  const convertToPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const mammoth = await import("mammoth");
      const ab = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: ab });
      const text = result.value;

      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 12;
      const margin = 50;
      const lineHeight = fontSize * 1.4;
      const pageWidth = 595;
      const pageHeight = 842;
      const maxWidth = pageWidth - margin * 2;

      const lines: string[] = [];
      for (const paragraph of text.split("\n")) {
        if (!paragraph.trim()) { lines.push(""); continue; }
        const words = paragraph.split(" ");
        let currentLine = "";
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
      }

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;

      for (const line of lines) {
        if (y < margin + lineHeight) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        if (line) {
          page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
        }
        y -= lineHeight;
      }

      const pdfBytes = await pdfDoc.save();
      setResultUrl(URL.createObjectURL(new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" })));
    } catch (e) { console.error(e); alert("Error converting Word to PDF."); }
    finally { setIsProcessing(false); }
  };

  return (
    <ToolLayout title="Word to PDF" description="Make DOC and DOCX files easy to read by converting them to PDF." icon={<FileType2 className="w-8 h-8" />}>
      {!resultUrl ? (
        <div className="flex flex-col gap-8 items-center">
          <FileUploader onFilesSelected={handleFiles} multiple={false} accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
          {file && (
            <div className="bg-card border rounded-xl p-6 shadow-sm w-full max-w-2xl">
              <p className="text-muted-foreground mb-4">File: <strong>{file.name}</strong></p>
              <div className="flex justify-end">
                <Button size="xl" variant="hero" onClick={convertToPdf} disabled={isProcessing} className="bg-blue-500 hover:bg-blue-600 shadow-blue-500/20">
                  {isProcessing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Converting...</> : "Convert to PDF"}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <ResultScreen
          title="Converted to PDF!"
          downloadUrl={resultUrl}
          downloadFileName={`${file?.name.replace(/\.(docx?)/i, '')}_result.docx`}
          downloadText="Download PDF"
          onStartOver={() => { setFile(null); setResultUrl(null); }}
        />
      )}
    </ToolLayout>

  );
}
