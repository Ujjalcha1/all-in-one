"use client";

import { useState, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/file-uploader";
import {
  Loader2,
  ArrowRight,
  Sparkles,
  Minus,
  Plus,
  Settings,
  Maximize2,
  AlertCircle
} from "lucide-react";

interface CropBox {
  x: number; // percentage
  y: number; // percentage
  w: number; // percentage
  h: number; // percentage
}

interface CropPageCanvasProps {
  pageNum: number;
  pdfDocument: any;
  zoom: number;
  cropBox: CropBox | null;
  isActiveCrop: boolean;
  onMouseDown: (e: React.MouseEvent, pageNum: number) => void;
  onMouseMove: (e: React.MouseEvent, pageNum: number) => void;
  onMouseUp: () => void;
}

function CropPageCanvas({
  pageNum,
  pdfDocument,
  zoom,
  cropBox,
  isActiveCrop,
  onMouseDown,
  onMouseMove,
  onMouseUp
}: CropPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!pdfDocument) return;
    let isRendered = true;

    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(pageNum);
        const scaleMultiplier = zoom / 100;
        const vp = page.getViewport({ scale: 1.5 * scaleMultiplier });

        if (!isRendered) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = vp.width;
        canvas.height = vp.height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
        }

        if (isRendered) {
          setDims({ width: vp.width, height: vp.height });
        }
      } catch (e) {
        console.error(e);
      }
    };

    renderPage();

    return () => {
      isRendered = false;
    };
  }, [pdfDocument, pageNum, zoom]);

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <span className="text-xs font-extrabold text-zinc-400 dark:text-zinc-500">Page {pageNum}</span>
      <div
        onMouseDown={(e) => onMouseDown(e, pageNum)}
        onMouseMove={(e) => onMouseMove(e, pageNum)}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        className="relative bg-white dark:bg-zinc-950 shadow-2xl border border-zinc-200 dark:border-zinc-800 rounded-lg cursor-crosshair overflow-hidden"
        style={{
          width: dims.width || 400,
          height: dims.height || 560,
          visibility: dims.width > 0 ? "visible" : "hidden"
        }}
      >
        <canvas ref={canvasRef} className="block w-full h-full rounded-lg" />

        {/* Shaded boundaries outside crop area */}
        {isActiveCrop && cropBox && (
          <>
            {/* Top Dim */}
            <div className="absolute bg-black/40 pointer-events-none" style={{ top: 0, left: 0, right: 0, height: `${cropBox.y}%` }} />
            {/* Bottom Dim */}
            <div className="absolute bg-black/40 pointer-events-none" style={{ top: `${cropBox.y + cropBox.h}%`, left: 0, right: 0, bottom: 0 }} />
            {/* Left Dim */}
            <div className="absolute bg-black/40 pointer-events-none" style={{ top: `${cropBox.y}%`, left: 0, width: `${cropBox.x}%`, height: `${cropBox.h}%` }} />
            {/* Right Dim */}
            <div className="absolute bg-black/40 pointer-events-none" style={{ top: `${cropBox.y}%`, left: `${cropBox.x + cropBox.w}%`, right: 0, height: `${cropBox.h}%` }} />

            {/* Crop selection overlay outline box */}
            <div
              style={{
                left: `${cropBox.x}%`,
                top: `${cropBox.y}%`,
                width: `${cropBox.w}%`,
                height: `${cropBox.h}%`
              }}
              className="absolute border-2 border-blue-500 select-none z-10"
            >
              {/* 8 Drag handles */}
              <div data-handle="tl" className="w-2.5 h-2.5 bg-blue-500 border border-white rounded-full absolute -top-1.5 -left-1.5 cursor-nwse-resize z-20" />
              <div data-handle="t" className="w-2.5 h-2.5 bg-blue-500 border border-white rounded-full absolute -top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize z-20" />
              <div data-handle="tr" className="w-2.5 h-2.5 bg-blue-500 border border-white rounded-full absolute -top-1.5 -right-1.5 cursor-nesw-resize z-20" />
              <div data-handle="r" className="w-2.5 h-2.5 bg-blue-500 border border-white rounded-full absolute top-1/2 -translate-y-1/2 -right-1.5 cursor-ew-resize z-20" />
              <div data-handle="br" className="w-2.5 h-2.5 bg-blue-500 border border-white rounded-full absolute -bottom-1.5 -right-1.5 cursor-nwse-resize z-20" />
              <div data-handle="b" className="w-2.5 h-2.5 bg-blue-500 border border-white rounded-full absolute -bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize z-20" />
              <div data-handle="bl" className="w-2.5 h-2.5 bg-blue-500 border border-white rounded-full absolute -bottom-1.5 -left-1.5 cursor-nesw-resize z-20" />
              <div data-handle="l" className="w-2.5 h-2.5 bg-blue-500 border border-white rounded-full absolute top-1/2 -translate-y-1/2 -left-1.5 cursor-ew-resize z-20" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CropPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Viewport and page settings
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(84);
  const [cropBox, setCropBox] = useState<CropBox | null>(null);
  const [activeCropPage, setActiveCropPage] = useState<number | null>(null);
  const [pageScope, setPageScope] = useState<"all" | "current">("all");

  // Mouse gestures for cropping box
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartBox, setDragStartBox] = useState({ x: 0, y: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResultUrl(null);
      setCropBox(null);
      setActiveCropPage(null);
      setPdfDocument(null);
    }
  };

  // Load PDF document on file selection
  useEffect(() => {
    if (!file) {
      setPdfDocument(null);
      setTotalPages(0);
      return;
    }
    const loadDoc = async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const ab = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: ab }).promise;
        setPdfDocument(doc);
        setTotalPages(doc.numPages);
      } catch (e) {
        console.error(e);
      }
    };
    loadDoc();
  }, [file]);

  // Crop interaction handlers
  const handleMouseDown = (e: React.MouseEvent, pageNum: number) => {
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;

    const target = e.target as HTMLElement;
    const handle = target.getAttribute("data-handle");

    if (handle && activeCropPage === pageNum) {
      setActiveHandle(handle);
      setDragStart({ x: px, y: py });
      e.stopPropagation();
      return;
    }

    if (cropBox && activeCropPage === pageNum) {
      const isInside =
        px >= cropBox.x &&
        px <= cropBox.x + cropBox.w &&
        py >= cropBox.y &&
        py <= cropBox.y + cropBox.h;

      if (isInside) {
        setIsDraggingBox(true);
        setDragStart({ x: px, y: py });
        setDragStartBox({ x: cropBox.x, y: cropBox.y });
        return;
      }
    }

    // Start drawing new crop box on this page
    setActiveCropPage(pageNum);
    setIsDrawing(true);
    setDragStart({ x: px, y: py });
    setCropBox({ x: px, y: py, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent, pageNum: number) => {
    if (activeCropPage !== pageNum || !cropBox) return;
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const px = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const py = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    if (activeHandle) {
      let { x, y, w, h } = cropBox;
      const right = x + w;
      const bottom = y + h;

      switch (activeHandle) {
        case "tl":
          x = px;
          y = py;
          w = right - px;
          h = bottom - py;
          break;
        case "t":
          y = py;
          h = bottom - py;
          break;
        case "tr":
          y = py;
          w = px - x;
          h = bottom - py;
          break;
        case "r":
          w = px - x;
          break;
        case "br":
          w = px - x;
          h = py - y;
          break;
        case "b":
          h = py - y;
          break;
        case "bl":
          x = px;
          w = right - px;
          h = py - y;
          break;
        case "l":
          x = px;
          w = right - px;
          break;
      }

      if (w < 0) {
        x = x + w;
        w = Math.abs(w);
      }
      if (h < 0) {
        y = y + h;
        h = Math.abs(h);
      }

      setCropBox({ x, y, w: Math.max(2, w), h: Math.max(2, h) });
    } else if (isDraggingBox) {
      const dx = px - dragStart.x;
      const dy = py - dragStart.y;
      const newX = Math.max(0, Math.min(100 - cropBox.w, dragStartBox.x + dx));
      const newY = Math.max(0, Math.min(100 - cropBox.h, dragStartBox.y + dy));
      setCropBox({ ...cropBox, x: newX, y: newY });
    } else if (isDrawing) {
      const x = Math.min(dragStart.x, px);
      const y = Math.min(dragStart.y, py);
      const w = Math.abs(px - dragStart.x);
      const h = Math.abs(py - dragStart.y);
      setCropBox({ x, y, w: Math.max(2, w), h: Math.max(2, h) });
    }
  };

  const handleMouseUp = () => {
    setActiveHandle(null);
    setIsDraggingBox(false);
    setIsDrawing(false);
  };

  const resetCrop = () => {
    setCropBox(null);
    setActiveCropPage(null);
  };

  // Compile final crop using pdf-lib setCropBox API
  const cropPdf = async () => {
    if (!file || !cropBox || activeCropPage === null) return;
    setIsProcessing(true);
    try {
      const ab = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(ab);
      const pages = pdfDoc.getPages();

      // Translate relative percentages to points on PDF
      const crop = (pageIndex: number) => {
        const page = pages[pageIndex];
        const { width, height } = page.getSize();

        const leftPoints = (cropBox.x / 100) * width;
        const widthPoints = (cropBox.w / 100) * width;
        const heightPoints = (cropBox.h / 100) * height;
        // Invert Y coordinate since PDF (0,0) is bottom-left
        const bottomPoints = (1 - (cropBox.y / 100) - (cropBox.h / 100)) * height;

        page.setCropBox(leftPoints, bottomPoints, widthPoints, heightPoints);
      };

      if (pageScope === "all") {
        for (let i = 0; i < pages.length; i++) {
          crop(i);
        }
      } else {
        crop(activeCropPage - 1);
      }

      pdfDoc.setProducer("OmniPDF Cropper Engine");
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error(e);
      alert("Error cropping PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#f3f4f6] dark:bg-zinc-900 select-none">
      {!file ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-xl mx-auto w-full">
          <FileUploader onFilesSelected={(files) => setFile(files[0])} accept="application/pdf" />
        </div>
      ) : resultUrl ? (
        // Result Screen
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xl p-10 text-center space-y-6 max-w-lg w-full">
            <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-2xl w-fit mx-auto text-emerald-500">
              <Sparkles className="w-10 h-10" />
            </div>
            <h3 className="font-extrabold text-2xl text-zinc-900 dark:text-white">PDF Cropped Successfully!</h3>
            <p className="text-sm text-muted-foreground">
              Your margins have been applied to the output document.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                size="xl"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = resultUrl;
                  link.download = `${file.name.replace(".pdf", "")}_cropped.pdf`;
                  link.click();
                }}
                className="w-full h-14 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex items-center justify-center gap-2 font-black shadow-lg shadow-red-500/20"
              >
                Download PDF
                <ArrowRight className="w-4.5 h-4.5" />
              </Button>
              <Button
                size="xl"
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setResultUrl(null);
                  setCropBox(null);
                  setActiveCropPage(null);
                }}
                className="w-full h-14 rounded-2xl font-bold border-zinc-200 dark:border-zinc-800"
              >
                Start Over
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Crop Editor split pane viewports
        <>
          {/* Left Canvas Viewport - Scrollable Page List */}
          <div className="flex-1 overflow-y-auto relative flex flex-col items-center gap-8 py-8 px-4 bg-[#f3f4f6] dark:bg-zinc-900 scroll-smooth">
            {pdfDocument && Array.from({ length: totalPages }).map((_, index) => {
              const pageNum = index + 1;
              return (
                <CropPageCanvas
                  key={pageNum}
                  pageNum={pageNum}
                  pdfDocument={pdfDocument}
                  zoom={zoom}
                  cropBox={cropBox}
                  isActiveCrop={activeCropPage === pageNum}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                />
              );
            })}

            {/* Floating Zoom & settings status bar overlay */}
            <div className="sticky bottom-6 bg-zinc-800 text-white rounded-xl shadow-lg px-4 h-12 flex items-center gap-4 text-xs font-semibold z-30">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoom(prev => Math.max(30, prev - 10))}
                  className="w-6 h-6 hover:bg-zinc-700 rounded flex items-center justify-center font-bold text-sm"
                >
                  -
                </button>
                <button
                  onClick={() => setZoom(prev => Math.min(200, prev + 10))}
                  className="w-6 h-6 hover:bg-zinc-700 rounded flex items-center justify-center font-bold text-sm"
                >
                  +
                </button>
              </div>
              <span>{zoom}%</span>
              <div className="w-[1px] h-4 bg-zinc-700" />
              <button className="p-1 hover:bg-zinc-700 rounded">
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 hover:bg-zinc-700 rounded">
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Options Sidebar */}
          <div className="w-full lg:w-[380px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between shadow-2xl relative h-full">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <h2 className="text-lg font-black tracking-tight text-foreground">Crop PDF</h2>

              {/* Blue Alert prompt info box */}
              <div className="p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900 text-sky-800 dark:text-sky-300 rounded-xl text-xs font-bold leading-relaxed">
                Click and drag on any page to select the area you want to keep. Resize if needed.
              </div>

              {/* Reset link */}
              {cropBox && (
                <div className="flex justify-end">
                  <button
                    onClick={resetCrop}
                    className="text-xs font-black text-red-500 hover:underline"
                  >
                    Reset all
                  </button>
                </div>
              )}

              {/* Pages Scope selection section */}
              <div className="space-y-3">
                <h4 className="text-xs font-black tracking-wider uppercase text-muted-foreground">
                  Pages:
                </h4>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    <input
                      type="radio"
                      name="pageScope"
                      checked={pageScope === "all"}
                      onChange={() => setPageScope("all")}
                      className="w-4 h-4 accent-emerald-500"
                    />
                    All pages
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    <input
                      type="radio"
                      name="pageScope"
                      checked={pageScope === "current"}
                      onChange={() => setPageScope("current")}
                      className="w-4 h-4 accent-emerald-500"
                    />
                    Current page
                  </label>
                </div>
              </div>
            </div>

            {/* Warning block & action button */}
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border-t shrink-0 space-y-4">
              <div className="flex gap-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50 p-4 rounded-xl">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-[10px] font-bold text-orange-800 dark:text-orange-300 leading-relaxed">
                  Remember to review the result of your document before sending private information.
                </p>
              </div>

              <Button
                onClick={cropPdf}
                disabled={isProcessing || !cropBox}
                className="w-full h-14 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex items-center justify-center gap-3 text-sm font-black shadow-lg shadow-red-500/25 transition-all duration-300"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Cropping...
                  </>
                ) : (
                  <>
                    Crop PDF
                    <ArrowRight className="w-5 h-5" />
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
