"use client";

import { useState, useEffect } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/file-uploader";
import { 
  Loader2, 
  RotateCw, 
  RotateCcw,
  Trash2, 
  Plus, 
  Info,
  X,
  ArrowRight,
  FileText,
  Sparkles
} from "lucide-react";

export default function RotatePDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isLoadingCover, setIsLoadingCover] = useState(false);
  const [visualRotation, setVisualRotation] = useState<number>(0);
  const [isRotating, setIsRotating] = useState(false);
  const [rotatedPdfUrl, setRotatedPdfUrl] = useState<string | null>(null);

  // Asynchronously render cover page thumbnail preview using pdfjs-dist
  useEffect(() => {
    if (!file) {
      setCoverUrl(null);
      setPageCount(0);
      setVisualRotation(0);
      return;
    }

    const generateCoverPreview = async () => {
      setIsLoadingCover(true);
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPageCount(pdf.numPages);

        // Render page 1
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.8 });
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

    generateCoverPreview();
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setRotatedPdfUrl(null);
      setVisualRotation(0);
    }
  };

  const handleRotateRight = () => {
    setVisualRotation((prev) => (prev + 90) % 360);
  };

  const handleRotateLeft = () => {
    setVisualRotation((prev) => (prev - 90 + 360) % 360);
  };

  const handleReset = () => {
    setVisualRotation(0);
  };

  // Compile rotated PDF pages via pdf-lib
  const processRotatedPdf = async () => {
    if (!file) return;

    setIsRotating(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      const pages = pdfDoc.getPages();
      pages.forEach((page) => {
        const currentRotation = page.getRotation().angle;
        // Apply the visualRotation relative offset
        page.setRotation(degrees(currentRotation + visualRotation));
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setRotatedPdfUrl(url);
    } catch (error) {
      console.error("Error rotating PDF:", error);
      alert("An error occurred while rotating the PDF. Make sure it is not encrypted.");
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#f3f4f6] dark:bg-zinc-900">
      
      {!file ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-xl mx-auto w-full">
          <FileUploader onFilesSelected={(files) => setFile(files[0])} accept="application/pdf" />
        </div>
      ) : rotatedPdfUrl ? (
        // Show download screen
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-lg">
            <ResultScreen
              title="PDF Rotated Successfully!"
              downloadUrl={rotatedPdfUrl}
              downloadFileName={`${file.name.replace('.pdf', '')}_rotated.pdf`}
              downloadText="Download Rotated PDF"
              onStartOver={() => { setFile(null); setRotatedPdfUrl(null); setVisualRotation(0); }}
            />
          </div>
        </div>
      ) : (
        // Split-Screen Workspace layout
        <>
          {/* Left Area: Dynamic Visual cover previews */}
          <div className="flex-1 flex flex-col h-full overflow-hidden relative justify-center items-center">
            
            {/* Black Tooltip File info Banner */}
            <div className="absolute top-8 bg-zinc-800 text-white dark:bg-zinc-950 border border-zinc-750 px-4 py-2 rounded-xl text-xs font-black tracking-wide shadow-md z-30 flex items-center gap-2">
              <span>{(file.size / 1024).toFixed(1)} KB</span>
              <span className="opacity-40">•</span>
              <span>{pageCount} pages</span>
            </div>

            {/* Floating add button + notification dot */}
            <div className="absolute top-8 right-8 z-30">
              <label className="w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/20 cursor-pointer transition-transform active:scale-95">
                <Plus className="w-6 h-6" />
                <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
              </label>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-zinc-950 border-2 border-white text-white rounded-full flex items-center justify-center text-[9px] font-black">
                1
              </div>
            </div>

            {/* Centered single interactive card */}
            <div className="relative flex flex-col items-center gap-4">
              {isLoadingCover ? (
                <div className="flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-red-500" />
                  <span className="text-sm font-bold text-muted-foreground">Generating visual preview...</span>
                </div>
              ) : (
                coverUrl && (
                  <div className="relative bg-white dark:bg-zinc-950 p-4 rounded-3xl border shadow-xl hover:shadow-2xl transition-all duration-300 group max-w-[240px]">
                    {/* Hover buttons overlays */}
                    <div className="absolute top-6 right-6 flex items-center gap-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {/* Smooth Rotation arrow overlay */}
                      <button
                        onClick={handleRotateRight}
                        title="Rotate Page"
                        className="w-8 h-8 rounded-full bg-zinc-900/80 hover:bg-red-500 text-white flex items-center justify-center border border-zinc-200/20 shadow backdrop-blur transition-all"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>

                      {/* Remove page cross overlay */}
                      <button
                        onClick={() => setFile(null)}
                        title="Remove Document"
                        className="w-8 h-8 rounded-full bg-zinc-900/80 hover:bg-red-500 text-white flex items-center justify-center border border-zinc-200/20 shadow backdrop-blur transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Cover Thumbnail Image with CSS smooth rotation animations */}
                    <div className="overflow-hidden rounded-2xl bg-zinc-50 dark:bg-zinc-900">
                      <img 
                        src={coverUrl} 
                        alt="PDF Cover Page" 
                        style={{ transform: `rotate(${visualRotation}deg)` }}
                        className="w-full h-auto object-contain pointer-events-none transition-transform duration-300 ease-out"
                      />
                    </div>

                    {/* Bottom file label */}
                    <div className="mt-3 text-center">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate block max-w-[200px] mx-auto">
                        {file.name}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Right Area: Premium Rotation options sidebar */}
          <div className="w-full lg:w-[380px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between shadow-2xl relative h-full">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <h3 className="font-extrabold text-2xl text-foreground text-center tracking-tight border-b pb-4">
                Rotate PDF
              </h3>

              {/* Blue Info Alert */}
              <div className="p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-950 text-sky-800 dark:text-sky-300 rounded-2xl flex items-start gap-3 shadow-inner">
                <Info className="w-5 h-5 mt-0.5 shrink-0 text-sky-500" />
                <p className="text-xs font-semibold leading-relaxed">
                  Mouse over PDF file below and a <RotateCw className="w-3.5 h-3.5 inline mx-0.5" /> icon will appear, click on the arrows to rotate PDFs.
                </p>
              </div>

              {/* Reset all button links */}
              <div className="flex justify-end">
                <button 
                  onClick={handleReset}
                  className="text-xs font-bold text-red-500 hover:text-red-650 hover:underline tracking-wide"
                >
                  Reset all
                </button>
              </div>

              {/* Rotation select segmented blocks */}
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase text-muted-foreground tracking-wide block">Rotation</span>
                
                <div className="space-y-2">
                  {/* Rotate right cards */}
                  <button
                    onClick={handleRotateRight}
                    className="w-full flex items-center gap-4 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-150 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-red-500/40 hover:shadow-md transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-red-500 text-white flex items-center justify-center shadow shadow-red-500/20">
                      <RotateCw className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-foreground">RIGHT</span>
                      <p className="text-[10px] text-muted-foreground font-semibold leading-none">Rotate clockwise by 90°</p>
                    </div>
                  </button>

                  {/* Rotate left cards */}
                  <button
                    onClick={handleRotateLeft}
                    className="w-full flex items-center gap-4 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-150 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-red-500/40 hover:shadow-md transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-red-500 text-white flex items-center justify-center shadow shadow-red-500/20">
                      <RotateCcw className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-foreground">LEFT</span>
                      <p className="text-[10px] text-muted-foreground font-semibold leading-none">Rotate counter-clockwise by 90°</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Locked Action solid red button */}
            <div className="p-4 border-t bg-zinc-50 dark:bg-zinc-900/50 shrink-0">
              <Button
                onClick={processRotatedPdf}
                disabled={isRotating}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-extrabold h-12 rounded-xl text-sm tracking-wide shadow-lg shadow-red-500/10 flex items-center justify-center gap-2 group transition-transform active:scale-98"
              >
                {isRotating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    ROTATING PDF...
                  </>
                ) : (
                  <>
                    Rotate PDF
                    <div className="w-5 h-5 rounded-full border border-white flex items-center justify-center transition-transform group-hover:translate-x-1 duration-200">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </>
                )}
              </Button>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
