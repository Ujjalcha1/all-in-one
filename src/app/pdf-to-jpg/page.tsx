"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon, CheckCircle2, ImageUp } from "lucide-react";
import JSZip from "jszip";

export default function PdfToJpgPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  
  // Layout Options States
  const [conversionMode, setConversionMode] = useState<"pages" | "extract">("pages");
  const [qualityPreset, setQualityPreset] = useState<"normal" | "high">("normal");
  const [pageCount, setPageCount] = useState<number>(0);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isLoadingCover, setIsLoadingCover] = useState(false);

  const handleFiles = async (files: File[]) => {
    const selectedFile = files[0];
    setFile(selectedFile);
    setResultUrl(null);
    setCoverUrl(null);
    setPageCount(0);
    
    // Asynchronously render cover page thumbnail preview
    setIsLoadingCover(true);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPageCount(pdf.numPages);

      // Render page 1
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.6 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        setCoverUrl(canvas.toDataURL("image/jpeg", 0.85));
      }
    } catch (e) {
      console.error("Failed to generate PDF cover preview:", e);
    } finally {
      setIsLoadingCover(false);
    }
  };

  const convertToJpg = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const zip = new JSZip();
      
      const targetQuality = qualityPreset === "high" ? 1.0 : 0.88;

      if (conversionMode === "extract") {
        // Mode: Extract Images
        let imageCounter = 0;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const operatorList = await page.getOperatorList();
          const commonObjs = page.commonObjs;

          for (let j = 0; j < operatorList.fnArray.length; j++) {
            const fn = operatorList.fnArray[j];
            const args = operatorList.argsArray[j];

            if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject) {
              const imgKey = args[0];
              let img: any;
              
              try {
                img = commonObjs.get(imgKey);
              } catch (e) {
                continue;
              }

              if (img && img.width && img.height) {
                imageCounter++;
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                  const imgData = ctx.createImageData(img.width, img.height);
                  imgData.data.set(img.data);
                  ctx.putImageData(imgData, 0, 0);

                  const blob = await new Promise<Blob>((resolve) => {
                    canvas.toBlob((b) => resolve(b!), "image/jpeg", targetQuality);
                  });
                  zip.file(`extracted_image_${imageCounter}.jpg`, blob);
                }
              }
            }
          }
        }

        if (imageCounter === 0) {
          alert("No embedded graphics or images were found in this PDF. We will convert pages to JPG instead.");
          setConversionMode("pages");
          setIsProcessing(false);
          return;
        }
      } else {
        // Mode: Page to JPG
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;

          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), "image/jpeg", targetQuality);
          });

          zip.file(`page_${i}.jpg`, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      setResultUrl(URL.createObjectURL(zipBlob));
    } catch (error) {
      console.error(error);
      alert("Error converting PDF to JPG.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Full viewport immersive workspace when a file is selected and not yet converted
  if (file && !resultUrl) {
    return (
      <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#f3f4f6] dark:bg-zinc-900">
        {/* Left Area: Immersive centered visual canvas preview */}
        <div className="flex-1 flex items-center justify-center p-8 relative overflow-y-auto min-h-[50vh] lg:min-h-0">
          {isLoadingCover ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-red-500" />
              <p className="text-xs font-semibold text-muted-foreground animate-pulse">Generating preview...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              {/* Document card cover */}
              <div className="relative bg-white dark:bg-zinc-950 p-4 pb-6 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 transition-all duration-300 hover:scale-[1.02] max-w-[280px]">
                {/* Floating red counter badge */}
                <div className="absolute -top-3.5 -right-3.5 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-black shadow-lg border-2 border-white animate-bounce-slow z-30">
                  {pageCount}
                  <span className="text-[10px] ml-0.5">+</span>
                </div>
                
                {coverUrl ? (
                  <img 
                    src={coverUrl} 
                    alt="PDF Cover Preview" 
                    className="rounded-lg border shadow-sm max-h-[320px] object-contain pointer-events-none"
                  />
                ) : (
                  <div className="w-[180px] h-[240px] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center rounded-lg border border-dashed border-zinc-300">
                    <ImageIcon className="w-12 h-12 text-zinc-300" />
                  </div>
                )}
                
                {/* Name of document */}
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 text-center truncate mt-4 max-w-[200px] mx-auto">
                  {file.name}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Area: Dedicated solid options panel stretching top-to-bottom */}
        <div className="w-full lg:w-[380px] xl:w-[420px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between p-6 h-full overflow-y-auto shadow-2xl">
          <div className="space-y-6">
            <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-extrabold text-xl text-foreground tracking-tight">PDF to JPG options</h3>
            </div>

            <div className="space-y-4">
              {/* Option 1: PAGE TO JPG */}
              <div
                onClick={() => setConversionMode("pages")}
                className={`cursor-pointer border rounded-2xl p-4.5 transition-all duration-200 relative flex items-start gap-4 ${
                  conversionMode === "pages"
                    ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/30"
                    : "border-border hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-950/5"
                }`}
              >
                <div className={`p-2.5 rounded-xl border ${conversionMode === "pages" ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-muted border-border text-muted-foreground"}`}>
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1 pr-6">
                  <h4 className={`font-bold text-sm leading-none ${conversionMode === "pages" ? "text-red-500" : "text-foreground"}`}>
                    PAGE TO JPG
                  </h4>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-semibold">
                    Every page of this PDF will be converted into a JPG file. <span className="text-red-500 font-bold">{pageCount || 1}</span> JPG will be created.
                  </p>
                </div>
                {conversionMode === "pages" && (
                  <CheckCircle2 className="w-5 h-5 text-green-500 absolute top-4 right-4 fill-green-500/10" />
                )}
              </div>

              {/* Option 2: EXTRACT IMAGES */}
              <div
                onClick={() => setConversionMode("extract")}
                className={`cursor-pointer border rounded-2xl p-4.5 transition-all duration-200 relative flex items-start gap-4 ${
                  conversionMode === "extract"
                    ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/30"
                    : "border-border hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-950/5"
                }`}
              >
                <div className={`p-2.5 rounded-xl border ${conversionMode === "extract" ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-muted border-border text-muted-foreground"}`}>
                  <ImageUp className="w-6 h-6" />
                </div>
                <div className="space-y-1 pr-6">
                  <h4 className={`font-bold text-sm leading-none ${conversionMode === "extract" ? "text-red-500" : "text-foreground"}`}>
                    EXTRACT IMAGES
                  </h4>
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-semibold">
                    All embedded images inside the PDF will be extracted as JPG images.
                  </p>
                </div>
                {conversionMode === "extract" && (
                  <CheckCircle2 className="w-5 h-5 text-green-500 absolute top-4 right-4 fill-green-500/10" />
                )}
              </div>
            </div>

            {/* Quality Selection */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Image quality</label>
              <div className="grid grid-cols-2 gap-3">
                {/* Normal button */}
                <button
                  onClick={() => setQualityPreset("normal")}
                  className={`py-3 px-4 rounded-xl border transition-all duration-200 text-center flex flex-col items-center justify-center gap-1 ${
                    qualityPreset === "normal"
                      ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/30"
                      : "border-border hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-950/5"
                  }`}
                >
                  <span className="font-bold text-sm leading-tight text-foreground">Normal</span>
                  <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wide">Recommended</span>
                </button>

                {/* High button */}
                <button
                  onClick={() => setQualityPreset("high")}
                  className={`py-3 px-4 rounded-xl border transition-all duration-200 text-center flex flex-col items-center justify-center gap-1 ${
                    qualityPreset === "high"
                      ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/30"
                      : "border-border hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-950/5"
                  }`}
                >
                  <span className="font-bold text-sm leading-tight text-foreground">High</span>
                  <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wide">Maximum</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action button locked to the bottom */}
          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 mt-auto">
            <Button 
              size="xl" 
              variant="hero" 
              onClick={convertToJpg} 
              disabled={isProcessing} 
              className="w-full bg-red-500 hover:bg-red-600 shadow-red-500/20 gap-2 font-extrabold tracking-wide py-4.5 rounded-xl text-base"
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Converting...</>
              ) : (
                <>Convert to JPG &rarr;</>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render Uploader or ResultScreen inside standard page layout template
  return (
    <ToolLayout title="PDF to JPG" description="Convert each PDF page into a JPG or extract all images contained in a PDF." icon={<ImageIcon className="w-8 h-8" />}>
      {!resultUrl ? (
        <div className="flex flex-col items-center justify-center w-full">
          <FileUploader onFilesSelected={handleFiles} multiple={false} accept="application/pdf" />
        </div>
      ) : (
        <ResultScreen
          title="Conversion complete!"
          downloadUrl={resultUrl}
          downloadFileName={`${file?.name.replace('.pdf', '')}_result.zip`}
          downloadText="Download ZIP"
          onStartOver={() => { setFile(null); setResultUrl(null); setPageCount(0); setCoverUrl(null); }}
        />
      )}
    </ToolLayout>
  );
}
