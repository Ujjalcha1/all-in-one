"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon, Sparkles, CheckCircle2 } from "lucide-react";

export default function JpgToPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  
  // Custom design parameters
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [pageSize, setPageSize] = useState<"fit" | "a4" | "letter">("a4");
  const [marginSize, setMarginSize] = useState<"no" | "small" | "big">("no");

  const handleFiles = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setResultUrl(null);
  };

  const convertToPdf = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();

      // Resolve Margin Size in PDF points
      let margin = 0;
      if (marginSize === "small") margin = 20;
      else if (marginSize === "big") margin = 50;

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        
        let image;
        if (file.type === "image/png" || file.name.toLowerCase().endsWith(".png")) {
          image = await pdfDoc.embedPng(uint8);
        } else {
          image = await pdfDoc.embedJpg(uint8);
        }

        if (pageSize === "fit") {
          // Fit: page size is dynamically scaled to match image dimensions + padding
          const pageWidth = image.width + margin * 2;
          const pageHeight = image.height + margin * 2;
          const page = pdfDoc.addPage([pageWidth, pageHeight]);
          page.drawImage(image, { 
            x: margin, 
            y: margin, 
            width: image.width, 
            height: image.height 
          });
        } else {
          // Explicit Page Size: A4 or US Letter
          // A4 dimensions: 595.27 x 841.89 points
          // Letter dimensions: 612 x 792 points
          let baseWidth = 595.27;
          let baseHeight = 841.89;

          if (pageSize === "letter") {
            baseWidth = 612;
            baseHeight = 792;
          }

          // Apply orientation swap if landscape
          const pageWidth = orientation === "portrait" ? baseWidth : baseHeight;
          const pageHeight = orientation === "portrait" ? baseHeight : baseWidth;

          const page = pdfDoc.addPage([pageWidth, pageHeight]);

          // Compute available drawing space after margins
          const availWidth = pageWidth - margin * 2;
          const availHeight = pageHeight - margin * 2;

          // Scale proportionally keeping image ratio perfect
          const scale = Math.min(availWidth / image.width, availHeight / image.height);
          const drawWidth = image.width * scale;
          const drawHeight = image.height * scale;

          // Center image perfectly inside printable page area
          const x = margin + (availWidth - drawWidth) / 2;
          const y = margin + (availHeight - drawHeight) / 2;

          page.drawImage(image, { 
            x, 
            y, 
            width: drawWidth, 
            height: drawHeight 
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (error) {
      console.error(error);
      alert("Error converting images to PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Immersive split-screen viewport workspace when files are loaded
  if (files.length > 0 && !resultUrl) {
    // Generate object URL preview for the cover thumbnail
    const firstFilePreview = URL.createObjectURL(files[0]);

    return (
      <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#f3f4f6] dark:bg-zinc-900">
        {/* Left Area: Visual visual cover thumbnail centering area */}
        <div className="flex-1 flex items-center justify-center p-8 relative overflow-y-auto min-h-[50vh] lg:min-h-0">
          <div className="flex flex-col items-center gap-6">
            {/* Document preview card */}
            <div className="relative bg-white dark:bg-zinc-950 p-4 pb-6 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 transition-all duration-300 hover:scale-[1.02] max-w-[280px]">
              {/* Floating red counter badge */}
              <div className="absolute -top-3.5 -right-3.5 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-black shadow-lg border-2 border-white animate-bounce-slow z-30">
                {files.length}
                <span className="text-[10px] ml-0.5">+</span>
              </div>
              
              <img 
                src={firstFilePreview} 
                alt="Uploaded Cover Preview" 
                className="rounded-lg border shadow-sm max-h-[320px] object-contain pointer-events-none"
              />
              
              {/* Image name */}
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 text-center truncate mt-4 max-w-[200px] mx-auto">
                {files[0].name}
              </p>
            </div>
          </div>
        </div>

        {/* Right Area: Dedicated solid options panel stretching top-to-bottom */}
        <div className="w-full lg:w-[380px] xl:w-[420px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between p-6 h-full overflow-y-auto shadow-2xl">
          <div className="space-y-6">
            <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-extrabold text-xl text-foreground tracking-tight">Image to PDF options</h3>
            </div>

            {/* Page Orientation options */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Page orientation</label>
              <div className="grid grid-cols-2 gap-3">
                {/* Portrait */}
                <button
                  onClick={() => setOrientation("portrait")}
                  className={`py-4.5 px-4 rounded-2xl border transition-all duration-200 text-center flex flex-col items-center justify-center gap-2 ${
                    orientation === "portrait"
                      ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/30 text-red-500 font-bold"
                      : "border-border hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-950/5 text-muted-foreground"
                  }`}
                >
                  <svg className="w-6 h-8 fill-current" viewBox="0 0 24 32">
                    <rect x="3" y="2" width="18" height="28" rx="2" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  </svg>
                  <span className="text-sm font-bold leading-none">Portrait</span>
                </button>

                {/* Landscape */}
                <button
                  onClick={() => setOrientation("landscape")}
                  className={`py-4.5 px-4 rounded-2xl border transition-all duration-200 text-center flex flex-col items-center justify-center gap-2 ${
                    orientation === "landscape"
                      ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/30 text-red-500 font-bold"
                      : "border-border hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-950/5 text-muted-foreground"
                  }`}
                >
                  <svg className="w-8 h-6 fill-current" viewBox="0 0 32 24">
                    <rect x="2" y="3" width="28" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  </svg>
                  <span className="text-sm font-bold leading-none">Landscape</span>
                </button>
              </div>
            </div>

            {/* Page Size Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Page size</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as any)}
                className="w-full h-11 px-3.5 rounded-xl border bg-zinc-900/5 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-red-500/40 font-bold text-sm"
              >
                <option value="fit">Fit (Same page size as image)</option>
                <option value="a4">A4 (297x210 mm)</option>
                <option value="letter">US Letter (215x279.4 mm)</option>
              </select>
            </div>

            {/* Margin selections */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Margin</label>
              <div className="grid grid-cols-3 gap-2">
                {/* No Margin */}
                <button
                  onClick={() => setMarginSize("no")}
                  className={`py-3 px-2 rounded-xl border transition-all duration-200 text-center flex flex-col items-center justify-center gap-2 ${
                    marginSize === "no"
                      ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/30 text-red-500 font-bold"
                      : "border-border hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-950/5 text-muted-foreground"
                  }`}
                >
                  <svg className="w-6 h-6 fill-none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <rect x="7" y="7" width="10" height="10" strokeDasharray="3 3" />
                  </svg>
                  <span className="text-[11px] font-bold">No margin</span>
                </button>

                {/* Small Margin */}
                <button
                  onClick={() => setMarginSize("small")}
                  className={`py-3 px-2 rounded-xl border transition-all duration-200 text-center flex flex-col items-center justify-center gap-2 ${
                    marginSize === "small"
                      ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/30 text-red-500 font-bold"
                      : "border-border hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-950/5 text-muted-foreground"
                  }`}
                >
                  <svg className="w-6 h-6 fill-none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <rect x="9" y="9" width="6" height="6" strokeDasharray="3 3" />
                  </svg>
                  <span className="text-[11px] font-bold">Small</span>
                </button>

                {/* Big Margin */}
                <button
                  onClick={() => setMarginSize("big")}
                  className={`py-3 px-2 rounded-xl border transition-all duration-200 text-center flex flex-col items-center justify-center gap-2 ${
                    marginSize === "big"
                      ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/30 text-red-500 font-bold"
                      : "border-border hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-950/5 text-muted-foreground"
                  }`}
                >
                  <svg className="w-6 h-6 fill-none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <rect x="11" y="11" width="2" height="2" strokeDasharray="3 3" />
                  </svg>
                  <span className="text-[11px] font-bold">Big</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action button locked to bottom of sidebar */}
          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 mt-auto">
            <Button 
              size="xl" 
              variant="hero" 
              onClick={convertToPdf} 
              disabled={isProcessing} 
              className="w-full bg-red-500 hover:bg-red-600 shadow-red-500/20 gap-2 font-extrabold tracking-wide py-4.5 rounded-xl text-base"
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Converting...</>
              ) : (
                <>Convert to PDF &rarr;</>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render file uploader inside standard brand layouts
  return (
    <ToolLayout title="JPG to PDF" description="Convert JPG images to PDF in seconds. Easily adjust orientation and margins." icon={<ImageIcon className="w-8 h-8" />}>
      {!resultUrl ? (
        <div className="flex flex-col items-center justify-center w-full">
          <FileUploader onFilesSelected={handleFiles} multiple accept="image/jpeg,image/png,.jpg,.jpeg,.png" />
        </div>
      ) : (
        <ResultScreen
          title="PDF created successfully!"
          downloadUrl={resultUrl}
          downloadFileName={"images_converted.pdf"}
          downloadText="Download PDF"
          onStartOver={() => { setFiles([]); setResultUrl(null); }}
        />
      )}
    </ToolLayout>
  );
}
