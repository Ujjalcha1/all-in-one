"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Presentation } from "lucide-react";
import JSZip from "jszip";

export default function PdfToPowerpointPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleFiles = (files: File[]) => { setFile(files[0]); setResultUrl(null); };

  const convertToPptx = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const PptxGenJS = (await import("pptxgenjs")).default;

      const ab = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
      const pptx = new PptxGenJS();

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width; canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp, canvas }).promise;

        const imgData = canvas.toDataURL("image/png");
        const slide = pptx.addSlide();
        slide.addImage({ data: imgData, x: 0, y: 0, w: "100%", h: "100%" });
      }

      const blob = await pptx.write({ outputType: "blob" }) as Blob;
      setResultUrl(URL.createObjectURL(blob));
    } catch (e) { console.error(e); alert("Error converting to PowerPoint."); }
    finally { setIsProcessing(false); }
  };

  return (
    <ToolLayout title="PDF to PowerPoint" description="Turn your PDF files into easy to edit PPT and PPTX slideshows." icon={<Presentation className="w-8 h-8" />}>
      {!resultUrl ? (
        <div className="flex flex-col gap-8 items-center">
          <FileUploader onFilesSelected={handleFiles} multiple={false} accept="application/pdf" />
          {file && (
            <div className="bg-card border rounded-xl p-6 shadow-sm w-full max-w-2xl">
              <p className="text-muted-foreground mb-4">File: <strong>{file.name}</strong></p>
              <div className="flex justify-end">
                <Button size="xl" variant="hero" onClick={convertToPptx} disabled={isProcessing} className="bg-orange-600 hover:bg-orange-700 shadow-orange-600/20">
                  {isProcessing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Converting...</> : "Convert to PPTX"}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <ResultScreen
          title="Converted to PowerPoint!"
          downloadUrl={resultUrl}
          downloadFileName={`${file?.name.replace('.pdf', '')}_result.pptx`}
          downloadText="Download PPTX"
          onStartOver={() => { setFile(null); setResultUrl(null); }}
        />
      )}
    </ToolLayout>
    
  );
}
