"use client";

import { useState, useEffect } from "react";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Droplet,
  Trash2,
  Plus,
  Type,
  Image as ImageIcon,
  Grid,
  RotateCw,
  Layers,
  Check,
  ChevronDown,
  ArrowRight,
  Sparkles,
  FileText
} from "lucide-react";

interface WatermarkSettings {
  mode: "text" | "image";
  text: string;
  fontFamily: "Arial" | "Courier" | "Helvetica" | "Times";
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  color: string;
  imageUrl: string | null;
  position: "topLeft" | "topCenter" | "topRight" | "middleLeft" | "middleCenter" | "middleRight" | "bottomLeft" | "bottomCenter" | "bottomRight";
  mosaic: boolean;
  transparency: 0 | 0.25 | 0.5 | 0.75;
  rotation: 0 | 45 | 90 | 180;
  fromPage: number;
  toPage: number;
  layer: "over" | "below";
}

export default function WatermarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isRenderingPages, setIsRenderingPages] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Premium Watermark Options State
  const [settings, setSettings] = useState<WatermarkSettings>({
    mode: "text",
    text: "OmniPDF",
    fontFamily: "Helvetica",
    fontSize: 32,
    isBold: true,
    isItalic: false,
    isUnderline: false,
    color: "#EF4444",
    imageUrl: null,
    position: "bottomCenter",
    mosaic: false,
    transparency: 0.25,
    rotation: 0,
    fromPage: 1,
    toPage: 1,
    layer: "over"
  });

  // Render Page Previews using PDF.js worker
  useEffect(() => {
    if (!file) {
      setThumbnails([]);
      setPageCount(0);
      return;
    }

    const renderPages = async () => {
      setIsRenderingPages(true);
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPageCount(pdf.numPages);
        setSettings(prev => ({ ...prev, toPage: pdf.numPages }));

        setThumbnails([]);
        const pagesToRender = pdf.numPages;

        for (let i = 1; i <= pagesToRender; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.8 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport, canvas }).promise;
            const imgData = canvas.toDataURL("image/jpeg", 0.7);
            setThumbnails(prev => [...prev, imgData]);
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      } catch (e) {
        console.error("Failed to render PDF pages:", e);
      } finally {
        setIsRenderingPages(false);
      }
    };

    renderPages();
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResultUrl(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const imgFile = e.target.files?.[0];
    if (imgFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSettings(prev => ({ ...prev, imageUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(imgFile);
    }
  };

  const base64ToUint8Array = (base64Data: string): Uint8Array => {
    const base64Str = base64Data.split(",")[1];
    const binaryStr = atob(base64Str);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  };

  // Convert Hex Color to RGB decimals
  const hexToRgb = (hex: string) => {
    const cleanHex = hex.replace("#", "");
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    return rgb(r, g, b);
  };

  // Watermark PDF compiler using PDF-Lib offline embedding
  const compileWatermarkedPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      // Embed Fonts
      let font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      if (settings.fontFamily === "Courier") {
        font = settings.isBold
          ? await pdfDoc.embedFont(StandardFonts.CourierBold)
          : await pdfDoc.embedFont(StandardFonts.Courier);
      } else if (settings.fontFamily === "Times") {
        font = settings.isBold
          ? await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
          : await pdfDoc.embedFont(StandardFonts.TimesRoman);
      } else {
        // Arial or Helvetica
        font = settings.isBold
          ? await pdfDoc.embedFont(StandardFonts.HelveticaBold)
          : await pdfDoc.embedFont(StandardFonts.Helvetica);
      }

      // Embed image if in image mode
      let embeddedImage: any = null;
      if (settings.mode === "image" && settings.imageUrl) {
        const imageBytes = base64ToUint8Array(settings.imageUrl);
        const isPng = settings.imageUrl.startsWith("data:image/png");
        embeddedImage = isPng ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);
      }

      // Draw watermark only on specified page bounds
      const startIdx = Math.max(0, settings.fromPage - 1);
      const endIdx = Math.min(pages.length - 1, settings.toPage - 1);

      for (let i = startIdx; i <= endIdx; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();

        // Target opacity
        const opacityValue = 1 - settings.transparency;
        const colorValue = hexToRgb(settings.color);
        const textFontSize = settings.fontSize;
        const rotDegrees = degrees(settings.rotation);

        const textWidth = font.widthOfTextAtSize(settings.text, textFontSize);
        const textHeight = textFontSize;

        const drawWidth = settings.mode === "image" && embeddedImage ? 120 : textWidth;
        const drawHeight = settings.mode === "image" && embeddedImage ? 120 : textHeight;

        // Position coordinates
        const positionsMap = {
          topLeft: { x: 30, y: height - drawHeight - 40 },
          topCenter: { x: (width - drawWidth) / 2, y: height - drawHeight - 40 },
          topRight: { x: width - drawWidth - 30, y: height - drawHeight - 40 },
          middleLeft: { x: 30, y: (height - drawHeight) / 2 },
          middleCenter: { x: (width - drawWidth) / 2, y: (height - drawHeight) / 2 },
          middleRight: { x: width - drawWidth - 30, y: (height - drawHeight) / 2 },
          bottomLeft: { x: 30, y: 40 },
          bottomCenter: { x: (width - drawWidth) / 2, y: 40 },
          bottomRight: { x: width - drawWidth - 30, y: 40 }
        };

        const activeCoords = positionsMap[settings.position];

        if (settings.mosaic) {
          // Mosaic: Tile watermark over the entire page layout (e.g. 3x3 sectors grid)
          const cols = 3;
          const rows = 3;
          for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
              const xPos = (width / cols) * c + (width / cols - drawWidth) / 2;
              const yPos = (height / rows) * r + (height / rows - drawHeight) / 2;

              if (settings.mode === "text") {
                page.drawText(settings.text, {
                  x: xPos,
                  y: yPos,
                  size: textFontSize,
                  font,
                  color: colorValue,
                  opacity: opacityValue,
                  rotate: rotDegrees
                });
              } else if (embeddedImage) {
                page.drawImage(embeddedImage, {
                  x: xPos,
                  y: yPos,
                  width: drawWidth,
                  height: drawHeight,
                  opacity: opacityValue,
                  rotate: rotDegrees
                });
              }
            }
          }
        } else {
          // Draw standard single position watermark
          if (settings.mode === "text") {
            page.drawText(settings.text, {
              x: activeCoords.x,
              y: activeCoords.y,
              size: textFontSize,
              font,
              color: colorValue,
              opacity: opacityValue,
              rotate: rotDegrees
            });

            // Handle Underline annotation manually
            if (settings.isUnderline) {
              page.drawLine({
                start: { x: activeCoords.x, y: activeCoords.y - 2 },
                end: { x: activeCoords.x + textWidth, y: activeCoords.y - 2 },
                thickness: 1.5,
                color: colorValue,
                opacity: opacityValue
              });
            }
          } else if (embeddedImage) {
            page.drawImage(embeddedImage, {
              x: activeCoords.x,
              y: activeCoords.y,
              width: drawWidth,
              height: drawHeight,
              opacity: opacityValue,
              rotate: rotDegrees
            });
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error(e);
      alert("Error generating watermarked PDF document.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#f3f4f6] dark:bg-zinc-900">

      {!file ? (
        // Standard Drag and Drop landing box if no file is selected
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-xl bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xl p-12 text-center space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/40 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Droplet className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Watermark PDF Document</h2>
              <p className="text-sm font-semibold text-muted-foreground max-w-md mx-auto">
                Stamp visual text labels or graphic images over your PDF pages instantly. Choose placements, rotation angles, styles, and tile layouts.
              </p>
            </div>

            <label className="block w-full cursor-pointer">
              <div className="border-2 border-dashed border-red-200 dark:border-red-950 hover:border-red-500 dark:hover:border-red-500 bg-red-50/50 dark:bg-red-950/5 rounded-2xl p-8 transition-colors flex flex-col items-center justify-center gap-3">
                <Sparkles className="w-8 h-8 text-red-500" />
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Choose PDF Document</span>
                <span className="text-xs font-semibold text-muted-foreground">or drag and drop your file here</span>
              </div>
              <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        </div>
      ) : resultUrl ? (
        // Show download screen
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-lg">
            <ResultScreen
              title="Watermark Applied Successfully!"
              downloadUrl={resultUrl}
              downloadFileName={`${file.name.replace('.pdf', '')}_watermarked.pdf`}
              downloadText="Download Watermarked PDF"
              onStartOver={() => { setFile(null); setResultUrl(null); }}
            />
          </div>
        </div>
      ) : (
        // Split-Screen dynamic workspace workspace
        <>
          {/* Left Area: Visual Document previews */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Top Workspace Bar */}
            <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 flex items-center justify-between shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 border bg-zinc-50 dark:bg-zinc-900 px-3.5 py-1.5 rounded-xl">
                  <FileText className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 max-w-[200px] truncate">
                    {file.name}
                  </span>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="p-2 text-zinc-400 hover:text-red-500 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Floating notification badge + Button */}
              <div className="relative">
                <label className="flex items-center gap-2 h-10 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black shadow-lg shadow-red-500/20 cursor-pointer transition-transform active:scale-95">
                  <Plus className="w-4 h-4" />
                  ADD FILES
                  <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
                </label>
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-950 border-2 border-white text-white rounded-full flex items-center justify-center text-[9px] font-black">
                  1
                </div>
              </div>
            </div>

            {/* Scrollable page cards previews grid layout */}
            <div className="flex-1 overflow-y-auto p-8 flex flex-wrap justify-center gap-8 items-start">
              {isRenderingPages ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <Loader2 className="w-10 h-10 animate-spin text-red-500" />
                  <span className="text-sm font-bold text-muted-foreground">Rendering document pages...</span>
                </div>
              ) : (
                thumbnails.map((src, index) => {
                  const pageNum = index + 1;
                  const isWatermarkedPage = pageNum >= settings.fromPage && pageNum <= settings.toPage;

                  return (
                    <div key={index} className="relative flex flex-col items-center gap-2.5">
                      {/* Document Card */}
                      <div className="relative bg-white dark:bg-zinc-950 p-2.5 rounded-2xl border shadow-md hover:shadow-xl transition-all duration-300 group max-w-[200px]">
                        <img
                          src={src}
                          alt={`Page ${pageNum}`}
                          className="w-full h-auto object-contain rounded-lg pointer-events-none"
                        />

                        {/* Interactive Watermarking Indicator overlays */}
                        {isWatermarkedPage && (
                          <div className="absolute inset-0 p-2.5 pointer-events-none flex items-center justify-center">
                            {settings.mosaic ? (
                              // Mosaic tiling red dots overlay
                              <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-2">
                                {Array.from({ length: 9 }).map((_, i) => (
                                  <div key={i} className="flex items-center justify-center">
                                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow shadow-red-500/50 animate-pulse" />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              // Single position red dot overlay
                              <div className="w-full h-full relative">
                                {settings.position === "topLeft" && <div className="absolute top-2 left-2 w-3.5 h-3.5 bg-red-500 rounded-full border border-white shadow-lg animate-pulse" />}
                                {settings.position === "topCenter" && <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-red-500 rounded-full border border-white shadow-lg animate-pulse" />}
                                {settings.position === "topRight" && <div className="absolute top-2 right-2 w-3.5 h-3.5 bg-red-500 rounded-full border border-white shadow-lg animate-pulse" />}
                                {settings.position === "middleLeft" && <div className="absolute top-1/2 -translate-y-1/2 left-2 w-3.5 h-3.5 bg-red-500 rounded-full border border-white shadow-lg animate-pulse" />}
                                {settings.position === "middleCenter" && <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-red-500 rounded-full border border-white shadow-lg animate-pulse" />}
                                {settings.position === "middleRight" && <div className="absolute top-1/2 -translate-y-1/2 right-2 w-3.5 h-3.5 bg-red-500 rounded-full border border-white shadow-lg animate-pulse" />}
                                {settings.position === "bottomLeft" && <div className="absolute bottom-2 left-2 w-3.5 h-3.5 bg-red-500 rounded-full border border-white shadow-lg animate-pulse" />}
                                {settings.position === "bottomCenter" && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-red-500 rounded-full border border-white shadow-lg animate-pulse" />}
                                {settings.position === "bottomRight" && <div className="absolute bottom-2 right-2 w-3.5 h-3.5 bg-red-500 rounded-full border border-white shadow-lg animate-pulse" />}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Floating bottom counter page circle */}
                      <div className="w-7 h-7 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow shadow-red-500/20">
                        {pageNum}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>


          <div className="w-full lg:w-[380px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between shadow-2xl relative h-full">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <h3 className="font-extrabold text-2xl text-foreground text-center tracking-tight border-b pb-4">
                Watermark options
              </h3>

              {/* Mode Tabs segmented selectors */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl relative">
                {/* Place Text Tab */}
                <button
                  onClick={() => setSettings(prev => ({ ...prev, mode: "text" }))}
                  className={`relative flex flex-col items-center justify-center gap-1.5 py-4.5 rounded-lg text-xs font-bold border transition-all ${settings.mode === "text"
                    ? "bg-white dark:bg-zinc-950 border-zinc-250 text-foreground shadow"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {settings.mode === "text" && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center scale-75">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                  <Type className="w-5 h-5 text-zinc-500" />
                  Place text
                </button>

                {/* Place Image Tab */}
                <button
                  onClick={() => setSettings(prev => ({ ...prev, mode: "image" }))}
                  className={`relative flex flex-col items-center justify-center gap-1.5 py-4.5 rounded-lg text-xs font-bold border transition-all ${settings.mode === "image"
                    ? "bg-white dark:bg-zinc-950 border-zinc-250 text-foreground shadow"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {settings.mode === "image" && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center scale-75">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                  <ImageIcon className="w-5 h-5 text-zinc-500" />
                  Place image
                </button>
              </div>

              {/* Dynamic Sub-settings display */}
              {settings.mode === "text" ? (
                // Text Watermarking Configuration Forms
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wide block">Text:</label>
                    <input
                      type="text"
                      value={settings.text}
                      onChange={(e) => setSettings(prev => ({ ...prev, text: e.target.value }))}
                      className="h-10 px-3.5 w-full border rounded-xl bg-white dark:bg-zinc-950 text-sm font-semibold focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Formatting Toolbar */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wide block">Text format:</label>
                    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-zinc-50 dark:bg-zinc-900 border rounded-xl">
                      {/* Font select dropdown */}
                      <select
                        value={settings.fontFamily}
                        onChange={(e) => setSettings(prev => ({ ...prev, fontFamily: e.target.value as any }))}
                        className="h-8 pl-2 pr-4 border rounded bg-white dark:bg-zinc-950 text-[10px] font-bold focus:outline-none"
                      >
                        <option value="Helvetica">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Courier">Courier</option>
                        <option value="Times">Times New Roman</option>
                      </select>

                      {/* Size select dropdown */}
                      <select
                        value={settings.fontSize}
                        onChange={(e) => setSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                        className="h-8 pl-1 pr-3 border rounded bg-white dark:bg-zinc-950 text-[10px] font-bold focus:outline-none"
                      >
                        <option value="12">12</option>
                        <option value="18">18</option>
                        <option value="24">24</option>
                        <option value="32">32</option>
                        <option value="48">48</option>
                        <option value="64">64</option>
                        <option value="72">72</option>
                      </select>

                      {/* Bold button */}
                      <button
                        onClick={() => setSettings(prev => ({ ...prev, isBold: !prev.isBold }))}
                        className={`w-8 h-8 rounded text-xs font-black flex items-center justify-center transition-colors ${settings.isBold ? "bg-red-500 text-white" : "hover:bg-zinc-200 dark:hover:bg-zinc-800"}`}
                      >
                        B
                      </button>

                      {/* Italic button */}
                      <button
                        onClick={() => setSettings(prev => ({ ...prev, isItalic: !prev.isItalic }))}
                        className={`w-8 h-8 rounded text-xs italic font-black flex items-center justify-center transition-colors ${settings.isItalic ? "bg-red-500 text-white" : "hover:bg-zinc-200 dark:hover:bg-zinc-800"}`}
                      >
                        I
                      </button>

                      {/* Underline button */}
                      <button
                        onClick={() => setSettings(prev => ({ ...prev, isUnderline: !prev.isUnderline }))}
                        className={`w-8 h-8 rounded text-xs underline font-black flex items-center justify-center transition-colors ${settings.isUnderline ? "bg-red-500 text-white" : "hover:bg-zinc-200 dark:hover:bg-zinc-800"}`}
                      >
                        U
                      </button>

                      {/* Color Picker input */}
                      <input
                        type="color"
                        value={settings.color}
                        onChange={(e) => setSettings(prev => ({ ...prev, color: e.target.value }))}
                        className="w-8 h-8 border rounded-lg overflow-hidden cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Image Upload Button tab
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wide block">Image Asset:</label>
                  {settings.imageUrl ? (
                    <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-900 border rounded-xl text-center">
                      <img
                        src={settings.imageUrl}
                        alt="Uploaded Stamp"
                        className="h-20 object-contain mx-auto rounded border bg-white"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSettings(prev => ({ ...prev, imageUrl: null }))}
                        className="text-red-500 hover:text-red-600 font-bold text-xs"
                      >
                        Choose different image
                      </Button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 h-11 border-2 border-dashed border-red-200 hover:border-red-500 rounded-xl bg-red-50/10 hover:bg-red-50/20 cursor-pointer font-black text-xs text-red-500 transition-colors">
                      <ImageIcon className="w-4.5 h-4.5" />
                      ADD IMAGE
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                </div>
              )}

              {/* Shared settings controls */}
              <div className="space-y-4 pt-2 border-t">
                {/* 3x3 Placement Grid + Mosaic */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wide block">Position:</label>
                  <div className="flex items-center gap-6">
                    {/* 3x3 grid */}
                    <div className="grid grid-cols-3 gap-1 bg-zinc-200 dark:bg-zinc-800 p-1.5 rounded-xl w-24 h-24">
                      {(["topLeft", "topCenter", "topRight", "middleLeft", "middleCenter", "middleRight", "bottomLeft", "bottomCenter", "bottomRight"] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setSettings(prev => ({ ...prev, position: pos }))}
                          className={`w-6 h-6 rounded-md bg-white dark:bg-zinc-950 flex items-center justify-center border transition-all ${settings.position === pos && !settings.mosaic
                            ? "border-red-500 ring-2 ring-red-500/10"
                            : "border-transparent"
                            }`}
                        >
                          {settings.position === pos && !settings.mosaic && (
                            <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Mosaic Checkbox */}
                    <label className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 flex-1">
                      <input
                        type="checkbox"
                        checked={settings.mosaic}
                        onChange={(e) => setSettings(prev => ({ ...prev, mosaic: e.target.checked }))}
                        className="rounded border-zinc-300 accent-red-500 w-4 h-4"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-extrabold text-foreground">Mosaic</span>
                        <p className="text-[9px] text-muted-foreground font-medium">
                          Tile watermarks grid
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Transparency Dropdown select */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wide block">Transparency:</label>
                  <div className="relative">
                    <select
                      value={settings.transparency}
                      onChange={(e) => setSettings(prev => ({ ...prev, transparency: parseFloat(e.target.value) as any }))}
                      className="w-full h-10 px-3.5 border rounded-xl bg-white dark:bg-zinc-950 text-xs font-extrabold appearance-none focus:outline-none"
                    >
                      <option value="0">No transparency (solid)</option>
                      <option value="0.25">25% Transparency</option>
                      <option value="0.5">50% Transparency</option>
                      <option value="0.75">75% Transparency</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                {/* Rotation Dropdown select */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wide block">Rotation:</label>
                  <div className="relative">
                    <select
                      value={settings.rotation}
                      onChange={(e) => setSettings(prev => ({ ...prev, rotation: parseInt(e.target.value) as any }))}
                      className="w-full h-10 px-3.5 border rounded-xl bg-white dark:bg-zinc-950 text-xs font-extrabold appearance-none focus:outline-none"
                    >
                      <option value="0">Do not rotate (0°)</option>
                      <option value="45">Rotate 45 degrees</option>
                      <option value="90">Rotate 90 degrees</option>
                      <option value="180">Rotate 180 degrees</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                {/* Page range inputs bounds */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wide block">Pages:</label>
                  <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/40 p-2 border rounded-xl">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase pl-1">From page</span>
                    <input
                      type="number"
                      min="1"
                      max={pageCount || 1}
                      value={settings.fromPage}
                      onChange={(e) => setSettings(prev => ({ ...prev, fromPage: Math.max(1, Math.min(pageCount, parseInt(e.target.value) || 1)) }))}
                      className="h-8 w-12 border rounded bg-white dark:bg-zinc-950 text-xs font-bold text-center"
                    />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">To page</span>
                    <input
                      type="number"
                      min="1"
                      max={pageCount || 1}
                      value={settings.toPage}
                      onChange={(e) => setSettings(prev => ({ ...prev, toPage: Math.max(1, Math.min(pageCount, parseInt(e.target.value) || 1)) }))}
                      className="h-8 w-12 border rounded bg-white dark:bg-zinc-950 text-xs font-bold text-center"
                    />
                  </div>
                </div>

                {/* Layer Cards */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wide block">Layer:</label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Over the PDF content card */}
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, layer: "over" }))}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${settings.layer === "over"
                        ? "border-red-500 bg-red-500/5 text-red-500 shadow-md shadow-red-500/5"
                        : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-500"
                        }`}
                    >
                      <Layers className="w-5 h-5 mb-1.5" />
                      <span className="text-[10px] font-bold tracking-tight leading-tight text-center">Over the PDF content</span>
                    </button>

                    {/* Below the PDF content card */}
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, layer: "below" }))}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${settings.layer === "below"
                        ? "border-red-500 bg-red-500/5 text-red-500 shadow-md shadow-red-500/5"
                        : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-500"
                        }`}
                    >
                      <Layers className="w-5 h-5 mb-1.5" />
                      <span className="text-[10px] font-bold tracking-tight leading-tight text-center">Below the PDF content</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom action compile button locked to bottom of sidebar */}
            <div className="p-4 border-t bg-zinc-50 dark:bg-zinc-900/50 shrink-0">
              <Button
                onClick={compileWatermarkedPdf}
                disabled={isProcessing || (settings.mode === "image" && !settings.imageUrl)}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-extrabold h-12 rounded-xl text-sm tracking-wide shadow-lg shadow-red-500/10 flex items-center justify-center gap-2 group transition-transform active:scale-98"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    APPLYING WATERMARK...
                  </>
                ) : (
                  <>
                    Add watermark
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
