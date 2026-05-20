"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Table } from "lucide-react";

export default function PdfToExcelPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleFiles = (files: File[]) => { setFile(files[0]); setResultUrl(null); };

  const convertToExcel = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const ab = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const sheet = workbook.addWorksheet(`Page ${i}`);
        let row = 1;
        let lastY: number | null = null;
        let currentRow: string[] = [];

        for (const item of content.items) {
          const t = item as any;
          if (lastY !== null && Math.abs(t.transform[5] - lastY) > 5) {
            if (currentRow.length > 0) {
              sheet.addRow(currentRow);
              row++;
              currentRow = [];
            }
          }
          currentRow.push(t.str);
          lastY = t.transform[5];
        }
        if (currentRow.length > 0) sheet.addRow(currentRow);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      setResultUrl(URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })));
    } catch (e) { console.error(e); alert("Error converting to Excel."); }
    finally { setIsProcessing(false); }
  };

  return (
    <ToolLayout title="PDF to Excel" description="Pull data straight from PDFs into Excel spreadsheets in a few short seconds." icon={<Table className="w-8 h-8" />}>
      {!resultUrl ? (
        <div className="flex flex-col gap-8 items-center">
          <FileUploader onFilesSelected={handleFiles} multiple={false} accept="application/pdf" />
          {file && (
            <div className="bg-card border rounded-xl p-6 shadow-sm w-full max-w-2xl">
              <p className="text-muted-foreground mb-4">File: <strong>{file.name}</strong></p>
              <div className="flex justify-end">
                <Button size="xl" variant="hero" onClick={convertToExcel} disabled={isProcessing} className="bg-green-600 hover:bg-green-700 shadow-green-600/20">
                  {isProcessing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Converting...</> : "Convert to Excel"}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <ResultScreen
          title="Converted to Excel!"
          downloadUrl={resultUrl}
          downloadFileName={`${file?.name.replace('.pdf', '')}_result.xlsx`}
          downloadText="Download XLSX"
          onStartOver={() => { setFile(null); setResultUrl(null); }}
        />
      )}
    </ToolLayout>
    
  );
}
