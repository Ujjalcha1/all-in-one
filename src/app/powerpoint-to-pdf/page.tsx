"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import { Download, Loader2, MonitorPlay } from "lucide-react";

export default function PowerpointToPdfPage() {
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

      const response = await fetch("/api/powerpoint-to-pdf", {
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
      alert(e.message || "Error converting PowerPoint to PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolLayout title="PowerPoint to PDF" description="Make PPT and PPTX slideshows easy to view by converting them to PDF." icon={<MonitorPlay className="w-8 h-8" />}>
      {!resultUrl ? (
        <div className="flex flex-col gap-8 items-center">
          <FileUploader onFilesSelected={handleFiles} multiple={false} accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" />
          {file && (
            <div className="bg-card border rounded-xl p-6 shadow-sm w-full max-w-2xl">
              <p className="text-muted-foreground mb-4">File: <strong>{file.name}</strong></p>
              <div className="flex justify-end">
                <Button size="xl" variant="hero" onClick={convertToPdf} disabled={isProcessing}>
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
          downloadFileName={`${file?.name.replace(/\.(pptx?)/i, '')}_result.pdf`}
          downloadText="Download PDF"
          onStartOver={() => { setFile(null); setResultUrl(null); }}
        />
      )}
    </ToolLayout>
    
  );
}
