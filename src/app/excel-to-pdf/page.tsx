"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Sheet } from "lucide-react";

export default function ExcelToPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleFiles = (files: File[]) => { setFile(files[0]); setResultUrl(null); };

  const convertToPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/excel-to-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || `Conversion failed with status ${response.status}`);
      }

      const blob = await response.blob();
      setResultUrl(URL.createObjectURL(blob));
    } catch (e: any) { 
      console.error(e); 
      alert(e.message || "Error converting Excel to PDF."); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  return (
    <ToolLayout title="Excel to PDF" description="Make EXCEL spreadsheets easy to read by converting them to PDF." icon={<Sheet className="w-8 h-8" />}>
      {!resultUrl ? (
        <div className="flex flex-col gap-8 items-center">
          <FileUploader onFilesSelected={handleFiles} multiple={false} accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
          {file && (
            <div className="bg-card border rounded-xl p-6 shadow-sm w-full max-w-2xl">
              <p className="text-muted-foreground mb-4">File: <strong>{file.name}</strong></p>
              <div className="flex justify-end">
                <Button size="xl" variant="hero" onClick={convertToPdf} disabled={isProcessing} className="bg-green-600 hover:bg-green-700 shadow-green-600/20">
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
          downloadFileName={`${file?.name.replace(/\.(xlsx?)/i, '')}_result.pdf`}
          downloadText="Download PDF"
          onStartOver={() => { setFile(null); setResultUrl(null); }}
        />
      )}
    </ToolLayout>
    
  );
}
