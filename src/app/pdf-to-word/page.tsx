"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileText } from "lucide-react";

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFiles = (files: File[]) => { setFile(files[0]); setResultUrl(null); setProgress(0); };

  const convertToWord = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      }

      const ab = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
      const docx = await import("docx");
      const allParagraphs: any[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        setProgress(Math.round((i / pdf.numPages) * 100));
        const page = await pdf.getPage(i);
        
        // Extract text content and operator list in parallel for color mapping
        const content = await page.getTextContent();
        const opList = await page.getOperatorList();
        
        // Map operators to track fill colors
        const itemColors: string[] = [];
        let currentColor = "000000";
        
        for (let j = 0; j < opList.fnArray.length; j++) {
          const fn = opList.fnArray[j];
          const args = opList.argsArray[j];
          // Locate the operator name by finding the key in pdfjsLib.OPS matching 'fn'
          // We can use a simpler approach: check fn names directly if possible, but OPS is a map
          // In pdf.js, OPS is typically available. To avoid deep OPS lookup on every iteration:
          if (args && args.length > 0 && typeof args[0] === 'string' && args[0].startsWith('#')) {
            // pdfjs often pre-processes colors into hex strings for setFillRGBColor
            currentColor = args[0].replace('#', '');
          }
          
          // Operator codes 82 (showText) and 83 (showSpacedText) usually correspond to text items.
          // Since we can't easily reverse-lookup OPS in the browser safely across all pdfjs versions,
          // we'll rely on the structure: args containing fontChar/unicode implies text drawing.
          const isTextOperator = args && Array.isArray(args[0]) && args[0].length > 0 && (args[0][0].fontChar !== undefined || args[0][0].unicode !== undefined);
          
          if (isTextOperator) {
            itemColors.push(currentColor);
          }
        }

        let currentParagraphChildren: any[] = [];
        let currentParagraphIndent = 0;
        let lastY: number | null = null;
        let lastX: number | null = null;
        let lastWidth: number | null = null;
        let lastString = "";

        for (let idx = 0; idx < content.items.length; idx++) {
          const item = content.items[idx];
          const t = item as any;
          if (t.str === undefined) continue;
          
          const fontSizePts = Math.abs(t.transform[3]) || 12; 
          const docxSize = Math.max(16, Math.round(fontSizePts * 2)); 
          const xOffset = t.transform[4];

          const yDiff = lastY !== null ? Math.abs(t.transform[5] - lastY) : 0;
          const isNewParagraph = lastY === null || yDiff > fontSizePts * 1.8;
          const isNewLine = yDiff > 5;

          if (isNewParagraph) {
            if (currentParagraphChildren.length > 0) {
              allParagraphs.push(new docx.Paragraph({ 
                children: currentParagraphChildren,
                indent: { left: currentParagraphIndent }
              }));
              currentParagraphChildren = [];
              lastString = "";
            }
            // 1 point = 20 twips. Convert X coordinate to docx indentation.
            currentParagraphIndent = Math.max(0, Math.round(xOffset * 20));
          } else if (isNewLine && currentParagraphChildren.length > 0) {
            if (lastString && !lastString.endsWith(" ")) {
              currentParagraphChildren.push(new docx.TextRun({ text: " " }));
              lastString = " ";
            }
          } else if (!isNewParagraph && !isNewLine && currentParagraphChildren.length > 0) {
            // Same line, check X distance to add spaces if there is a gap
            const expectedNextX = (lastX || 0) + ((lastWidth || 0));
            if (xOffset - expectedNextX > fontSizePts * 0.5) {
               currentParagraphChildren.push(new docx.TextRun({ text: " " }));
               lastString = " ";
            }
          }
          
          const style = content.styles[t.fontName];
          let fontFamily = style?.fontFamily || "Arial";
          if (fontFamily.includes(",")) fontFamily = fontFamily.split(",")[0].trim();
          fontFamily = fontFamily.replace(/^g_d\d+_f\d+/, "").trim() || "Arial";
          
          const fontNameLower = t.fontName ? t.fontName.toLowerCase() : "";
          const isBold = fontNameLower.includes("bold") || fontNameLower.includes("black") || fontNameLower.includes("heavy");
          const isItalic = fontNameLower.includes("italic") || fontNameLower.includes("oblique");

          // Use the mapped color from OperatorList, or fallback to black
          let colorHex = itemColors[idx] || "000000";

          if (t.str) {
            currentParagraphChildren.push(
              new docx.TextRun({ 
                text: t.str, 
                size: docxSize, 
                font: fontFamily,
                color: colorHex,
                bold: isBold,
                italics: isItalic
              })
            );
            lastString = t.str;
          }
          
          lastY = t.transform[5];
          lastX = xOffset;
          lastWidth = t.width;
        }

        if (currentParagraphChildren.length > 0) {
          allParagraphs.push(new docx.Paragraph({ 
            children: currentParagraphChildren,
            indent: { left: currentParagraphIndent }
          }));
        }

        if (i < pdf.numPages) {
          allParagraphs.push(
            new docx.Paragraph({ children: [], pageBreakBefore: true })
          );
        }
      }

      if (allParagraphs.length === 0) {
        allParagraphs.push(new docx.Paragraph({ children: [new docx.TextRun("(No extractable text found in this PDF)")] }));
      }

      const doc = new docx.Document({
        sections: [{ 
          children: allParagraphs,
          footers: {
            default: new docx.Footer({
              children: [
                new docx.Paragraph({
                  alignment: docx.AlignmentType.CENTER,
                  children: [
                    new docx.TextRun({
                      children: [docx.PageNumber.CURRENT],
                    }),
                  ],
                }),
              ],
            }),
          },
        }],
      });
      const buffer = await docx.Packer.toBuffer(doc);
      const blob = new Blob([buffer as unknown as BlobPart], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      console.error("PDF to Word error:", e);
      alert(`Error converting PDF to Word: ${e?.message || "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolLayout title="PDF to Word" description="Easily convert your PDF files into easy to edit DOC and DOCX documents." icon={<FileText className="w-8 h-8" />}>
      {!resultUrl ? (
        <div className="flex flex-col gap-8 items-center">
          <FileUploader onFilesSelected={handleFiles} multiple={false} accept="application/pdf" />
          {file && (
            <div className="bg-card border rounded-xl p-6 shadow-sm w-full max-w-2xl">
              <p className="text-muted-foreground mb-4">File: <strong>{file.name}</strong></p>
              {isProcessing && progress > 0 && (
                <div className="mb-4">
                  <div className="h-3 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
                  <p className="text-sm text-muted-foreground mt-1">{progress}%</p>
                </div>
              )}
              <div className="flex justify-end">
                <Button size="xl" variant="hero" onClick={convertToWord} disabled={isProcessing}>
                  {isProcessing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Converting...</> : "Convert to Word"}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <ResultScreen
          title="Converted to Word!"
          downloadUrl={resultUrl}
          downloadFileName={`${file?.name.replace('.pdf', '')}_result.docx`}
          downloadText="Download DOCX"
          onStartOver={() => { setFile(null); setResultUrl(null); }}
        />
      )}
    </ToolLayout>
    
  );
}
