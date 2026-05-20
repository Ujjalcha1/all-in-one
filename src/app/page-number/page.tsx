"use client";

import { useState, useEffect } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/file-uploader";
import {
  Loader2,
  Trash2,
  Plus,
  ArrowRight,
  Sparkles,
  FileText,
  Hash
} from "lucide-react";

interface PageNumberSettings {
  pageMode: "single" | "facing";
  firstPageIsCover: boolean;
  position: "topLeft" | "topCenter" | "topRight" | "middleLeft" | "middleCenter" | "middleRight" | "bottomLeft" | "bottomCenter" | "bottomRight";
  margin: "recommended" | "small" | "large";
  firstNumber: number;
  fromPage: number;
  toPage: number;
  textTemplate: "onlyNumber" | "pageN" | "pageNofX" | "hyphenN";
  fontFamily: "Arial" | "Courier" | "Times";
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  fontColor: string;
}

export default function PageNumberPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isRenderingPages, setIsRenderingPages] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Premium Options State
  const [settings, setSettings] = useState<PageNumberSettings>({
    pageMode: "single",
    firstPageIsCover: false,
    position: "bottomRight",
    margin: "recommended",
    firstNumber: 1,
    fromPage: 1,
    toPage: 1,
    textTemplate: "onlyNumber",
    fontFamily: "Arial",
    fontSize: 12,
    isBold: false,
    isItalic: false,
    isUnderline: false,
    fontColor: "#EF4444" // matches the red dot visual accent in the grid selection
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
        setSettings(prev => ({ 
          ...prev, 
          toPage: pdf.numPages,
          fromPage: 1
        }));

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

  const getVisualPosition = (pageNum: number, actualPos: string, pageMode: "single" | "facing", firstPageIsCover: boolean) => {
    if (pageMode === "single") return actualPos;
    
    // Facing pages logic:
    // Determine whether this page falls on the left-hand slot or right-hand slot of a spread
    let isLeftPage = false;
    if (firstPageIsCover) {
      // Page 1 is on the right slot (cover page)
      // Even pages (2, 4, 6) reside in the left slots
      isLeftPage = pageNum % 2 === 0;
    } else {
      // Page 1 is on the left slot of Spread 1
      // Odd pages (1, 3, 5) reside in the left slots
      isLeftPage = pageNum % 2 !== 0;
    }

    if (!isLeftPage) {
      return actualPos; // Right slot pages keep standard positions
    }

    // Left slot pages mirror horizontal positions:
    // Left <-> Right
    switch (actualPos) {
      case "topLeft": return "topRight";
      case "topRight": return "topLeft";
      case "middleLeft": return "middleRight";
      case "middleRight": return "middleLeft";
      case "bottomLeft": return "bottomRight";
      case "bottomRight": return "bottomLeft";
      default: return actualPos;
    }
  };

  const hexToRgb = (hex: string) => {
    const cleanHex = hex.replace("#", "");
    const r = parseInt(cleanHex.substring(0, 2) || "00", 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4) || "00", 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6) || "00", 16) / 255;
    return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
  };

  const getEmbedFont = async (pdfDoc: PDFDocument) => {
    let fontName = StandardFonts.Helvetica;
    
    if (settings.fontFamily === "Courier") {
      if (settings.isBold && settings.isItalic) fontName = StandardFonts.CourierBoldOblique;
      else if (settings.isBold) fontName = StandardFonts.CourierBold;
      else if (settings.isItalic) fontName = StandardFonts.CourierOblique;
      else fontName = StandardFonts.Courier;
    } else if (settings.fontFamily === "Times") {
      if (settings.isBold && settings.isItalic) fontName = StandardFonts.TimesRomanBoldItalic;
      else if (settings.isBold) fontName = StandardFonts.TimesRomanBold;
      else if (settings.isItalic) fontName = StandardFonts.TimesRomanItalic;
      else fontName = StandardFonts.TimesRoman;
    } else {
      // Helvetica/Arial
      if (settings.isBold && settings.isItalic) fontName = StandardFonts.HelveticaBoldOblique;
      else if (settings.isBold) fontName = StandardFonts.HelveticaBold;
      else if (settings.isItalic) fontName = StandardFonts.HelveticaOblique;
      else fontName = StandardFonts.Helvetica;
    }
    
    return await pdfDoc.embedFont(fontName);
  };

  const addPageNumbers = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const font = await getEmbedFont(pdfDoc);
      const rgbColor = hexToRgb(settings.fontColor);
      const pages = pdfDoc.getPages();

      pages.forEach((page, idx) => {
        const pageNum = idx + 1;
        // Skip numbering if page falls outside requested bounds
        if (pageNum < settings.fromPage || pageNum > settings.toPage) return;

        // Calculate actual string output using template format
        let text = "";
        const nVal = settings.firstNumber + (pageNum - settings.fromPage);
        const xVal = settings.toPage - settings.fromPage + settings.firstNumber;

        switch (settings.textTemplate) {
          case "onlyNumber": text = `${nVal}`; break;
          case "pageN": text = `Page ${nVal}`; break;
          case "pageNofX": text = `Page ${nVal} of ${xVal}`; break;
          case "hyphenN": text = `-${nVal}-`; break;
          default: text = `${nVal}`;
        }

        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, settings.fontSize);
        const textHeight = font.heightAtSize(settings.fontSize) || (settings.fontSize * 0.8);

        // Determine margin offset in PDF points
        let marginVal = 30;
        if (settings.margin === "small") marginVal = 15;
        else if (settings.margin === "large") marginVal = 50;

        // Determine mirrored alignment depending on page layout slot (left/right spread slot)
        const activePos = getVisualPosition(pageNum, settings.position, settings.pageMode, settings.firstPageIsCover);

        let x = 0;
        let y = 0;

        // Compute x coordinate
        if (activePos.toLowerCase().endsWith("left")) {
          x = marginVal;
        } else if (activePos.toLowerCase().endsWith("right")) {
          x = width - marginVal - textWidth;
        } else {
          x = (width - textWidth) / 2; // Center
        }

        // Compute y coordinate
        if (activePos.toLowerCase().startsWith("top")) {
          y = height - marginVal - textHeight;
        } else if (activePos.toLowerCase().startsWith("middle")) {
          y = (height - textHeight) / 2;
        } else {
          y = marginVal; // Bottom
        }

        // Draw standard page number string
        page.drawText(text, {
          x,
          y,
          size: settings.fontSize,
          font,
          color: rgbColor,
        });

        // Add underline stroke if specified
        if (settings.isUnderline) {
          const underlineY = y - 2;
          const thickness = Math.max(1, settings.fontSize / 12);
          page.drawLine({
            start: { x, y: underlineY },
            end: { x: x + textWidth, y: underlineY },
            thickness,
            color: rgbColor,
          });
        }
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (error) {
      console.error(error);
      alert("Error adding page numbers.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getSpreads = () => {
    const spreads: { left: number | null; right: number | null }[] = [];
    if (settings.firstPageIsCover) {
      spreads.push({ left: null, right: 1 });
      for (let i = 2; i <= thumbnails.length; i += 2) {
        spreads.push({
          left: i,
          right: i + 1 <= thumbnails.length ? i + 1 : null
        });
      }
    } else {
      for (let i = 1; i <= thumbnails.length; i += 2) {
        spreads.push({
          left: i,
          right: i + 1 <= thumbnails.length ? i + 1 : null
        });
      }
    }
    return spreads;
  };

  const positionClasses = {
    topLeft: "top-2.5 left-2.5",
    topCenter: "top-2.5 left-1/2 -translate-x-1/2",
    topRight: "top-2.5 right-2.5",
    middleLeft: "top-1/2 -translate-y-1/2 left-2.5",
    middleCenter: "top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2",
    middleRight: "top-1/2 -translate-y-1/2 right-2.5",
    bottomLeft: "bottom-2.5 left-2.5",
    bottomCenter: "bottom-2.5 left-1/2 -translate-x-1/2",
    bottomRight: "bottom-2.5 right-2.5",
  };

  const renderSingleThumbnail = (src: string, index: number) => {
    const pageNum = index + 1;
    const isNumbered = pageNum >= settings.fromPage && pageNum <= settings.toPage;
    const activePos = getVisualPosition(pageNum, settings.position, settings.pageMode, settings.firstPageIsCover);
    const indicatorClass = positionClasses[activePos as keyof typeof positionClasses];

    return (
      <div key={index} className="relative flex flex-col items-center gap-2">
        <div className="relative bg-white dark:bg-zinc-950 p-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-md hover:shadow-xl transition-all duration-300 max-w-[200px]">
          <img src={src} alt={`Page ${pageNum}`} className="w-full h-auto object-contain rounded-lg pointer-events-none" />
          {isNumbered && (
            <div className={`absolute ${indicatorClass} w-3.5 h-3.5 bg-red-500 rounded-full border border-white shadow-lg animate-pulse z-20`} />
          )}
        </div>
        <div className="w-7 h-7 bg-zinc-800 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow">
          {pageNum}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#f3f4f6] dark:bg-zinc-900">
      {!file ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-xl mx-auto w-full">
          <FileUploader onFilesSelected={(files) => setFile(files[0])} accept="application/pdf" />
        </div>
      ) : resultUrl ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-lg">
            <ResultScreen
              title="Page Numbers Added Successfully!"
              downloadUrl={resultUrl}
              downloadFileName={`${file.name.replace('.pdf', '')}_numbered.pdf`}
              downloadText="Download Numbered PDF"
              onStartOver={() => { setFile(null); setResultUrl(null); }}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Left Canvas Preview Panel */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 flex items-center justify-between shadow-sm shrink-0">
              <div className="flex items-center gap-3 mx-auto lg:mx-0">
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

              {/* Floating Add Files pill */}
              <div className="relative hidden lg:block">
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

            {/* Previews canvas wrap */}
            <div className="flex-1 overflow-y-auto p-8 flex flex-wrap justify-center gap-8 items-start">
              {isRenderingPages ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <Loader2 className="w-10 h-10 animate-spin text-red-500" />
                  <span className="text-sm font-bold text-muted-foreground">Rendering document pages...</span>
                </div>
              ) : settings.pageMode === "single" ? (
                thumbnails.map((src, index) => renderSingleThumbnail(src, index))
              ) : (
                // Facing Pages cards
                getSpreads().map((spread, sIdx) => {
                  return (
                    <div key={sIdx} className="flex flex-col items-center gap-2">
                      <div className="bg-white dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-md hover:shadow-xl transition-all duration-300 flex items-stretch gap-1 max-w-[380px]">
                        {/* Left spread page card */}
                        {spread.left !== null ? (
                          <div className="relative flex-1 bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                            <img src={thumbnails[spread.left - 1]} alt={`Page ${spread.left}`} className="w-full h-auto object-contain rounded" />
                            {spread.left >= settings.fromPage && spread.left <= settings.toPage && (
                              <div className={`absolute ${positionClasses[getVisualPosition(spread.left, settings.position, "facing", settings.firstPageIsCover) as keyof typeof positionClasses]} w-3 h-3 bg-red-500 rounded-full border border-white shadow animate-pulse z-20`} />
                            )}
                            <div className="absolute bottom-1 right-1 text-[8px] font-black text-zinc-400 bg-white/80 dark:bg-zinc-950/80 px-1 rounded">
                              {spread.left}
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 bg-zinc-150/40 dark:bg-zinc-900/10 rounded border border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center min-w-[150px] min-h-[200px]">
                            <span className="text-[10px] font-extrabold text-zinc-400 tracking-wider">COVER LEFT</span>
                          </div>
                        )}

                        {/* Right spread page card */}
                        {spread.right !== null ? (
                          <div className="relative flex-1 bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                            <img src={thumbnails[spread.right - 1]} alt={`Page ${spread.right}`} className="w-full h-auto object-contain rounded" />
                            {spread.right >= settings.fromPage && spread.right <= settings.toPage && (
                              <div className={`absolute ${positionClasses[getVisualPosition(spread.right, settings.position, "facing", settings.firstPageIsCover) as keyof typeof positionClasses]} w-3 h-3 bg-red-500 rounded-full border border-white shadow animate-pulse z-20`} />
                            )}
                            <div className="absolute bottom-1 left-1 text-[8px] font-black text-zinc-400 bg-white/80 dark:bg-zinc-950/80 px-1 rounded">
                              {spread.right}
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 bg-zinc-150/40 dark:bg-zinc-900/10 rounded border border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center min-w-[150px] min-h-[200px]">
                            <span className="text-[10px] font-extrabold text-zinc-400 tracking-wider">END RIGHT</span>
                          </div>
                        )}
                      </div>
                      <div className="w-16 h-6 bg-zinc-800 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow">
                        SPREAD {sIdx + 1}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Configuration Options Sidebar */}
          <div className="w-full lg:w-[380px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between shadow-2xl relative h-full">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <h3 className="font-extrabold text-2xl text-foreground text-center tracking-tight border-b pb-4">
                Page Number options
              </h3>

              {/* Page mode segmented selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wide block">Page mode</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl border hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                    <input
                      type="radio"
                      name="pageMode"
                      checked={settings.pageMode === "single"}
                      onChange={() => setSettings(prev => ({ ...prev, pageMode: "single" }))}
                      className="w-4 h-4 text-red-500 focus:ring-red-500 border-zinc-300 accent-red-500"
                    />
                    <span className="text-xs font-bold text-foreground">Single page</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl border hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                    <input
                      type="radio"
                      name="pageMode"
                      checked={settings.pageMode === "facing"}
                      onChange={() => setSettings(prev => ({ ...prev, pageMode: "facing" }))}
                      className="w-4 h-4 text-red-500 focus:ring-red-500 border-zinc-300 accent-red-500"
                    />
                    <span className="text-xs font-bold text-foreground">Facing pages</span>
                  </label>
                </div>
                {settings.pageMode === "facing" && (
                  <label className="flex items-center gap-2 cursor-pointer mt-2 pl-1 animate-in slide-in-from-top-1 duration-200">
                    <input
                      type="checkbox"
                      checked={settings.firstPageIsCover}
                      onChange={(e) => setSettings(prev => ({ ...prev, firstPageIsCover: e.target.checked }))}
                      className="rounded text-red-500 focus:ring-red-500 accent-red-500"
                    />
                    <span className="text-xs font-semibold text-muted-foreground">First page is cover page</span>
                  </label>
                )}
              </div>

              {/* Grid Selector + Margin Row */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                {/* 3x3 Position Grid */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wide block">Position:</label>
                  <div className="grid grid-cols-3 grid-rows-3 w-[72px] h-[72px] border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
                    {(["topLeft", "topCenter", "topRight", "middleLeft", "middleCenter", "middleRight", "bottomLeft", "bottomCenter", "bottomRight"] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, position: pos }))}
                        className="border-[0.5px] border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center relative hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      >
                        {settings.position === pos && (
                          <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow shadow-red-500/50" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Margin Dropdown */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wide block">Margin:</label>
                  <select
                    value={settings.margin}
                    onChange={(e) => setSettings(prev => ({ ...prev, margin: e.target.value as any }))}
                    className="w-full h-10 px-3.5 rounded-xl border bg-white dark:bg-zinc-950 text-xs font-bold focus:outline-none"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="small">Small</option>
                    <option value="large">Large</option>
                  </select>
                </div>
              </div>

              {/* Numeric Configuration settings */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-[11px] font-black uppercase text-muted-foreground tracking-wide block">Pages</h4>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-foreground">First number:</span>
                  <input
                    type="number"
                    value={settings.firstNumber}
                    onChange={(e) => setSettings(prev => ({ ...prev, firstNumber: Math.max(1, parseInt(e.target.value) || 1) }))}
                    min={1}
                    className="w-20 h-10 px-3 rounded-xl border bg-white dark:bg-zinc-950 text-xs font-extrabold focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-foreground block">Which pages do you want to number?</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-xl overflow-hidden bg-white dark:bg-zinc-950">
                      <span className="text-[10px] font-black text-muted-foreground px-3 bg-zinc-50 dark:bg-zinc-900 border-r py-2">from page</span>
                      <input
                        type="number"
                        value={settings.fromPage}
                        onChange={(e) => setSettings(prev => ({ ...prev, fromPage: Math.max(1, Math.min(pageCount, parseInt(e.target.value) || 1)) }))}
                        min={1}
                        max={pageCount}
                        className="w-16 text-center text-xs font-black bg-transparent focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center border rounded-xl overflow-hidden bg-white dark:bg-zinc-950">
                      <span className="text-[10px] font-black text-muted-foreground px-3 bg-zinc-50 dark:bg-zinc-900 border-r py-2">to</span>
                      <input
                        type="number"
                        value={settings.toPage}
                        onChange={(e) => setSettings(prev => ({ ...prev, toPage: Math.max(1, Math.min(pageCount, parseInt(e.target.value) || 1)) }))}
                        min={1}
                        max={pageCount}
                        className="w-16 text-center text-xs font-black bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Templates Select */}
              <div className="space-y-2 pt-4 border-t">
                <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wide block">Text:</label>
                <select
                  value={settings.textTemplate}
                  onChange={(e) => setSettings(prev => ({ ...prev, textTemplate: e.target.value as any }))}
                  className="w-full h-10 px-3.5 rounded-xl border bg-white dark:bg-zinc-950 text-xs font-bold focus:outline-none"
                >
                  <option value="onlyNumber">Insert only page number (recommended)</option>
                  <option value="pageN">Page &#123;n&#125;</option>
                  <option value="pageNofX">Page &#123;n&#125; of &#123;x&#125;</option>
                  <option value="hyphenN">-&#123;n&#125;-</option>
                </select>
              </div>

              {/* Text formatting layout */}
              <div className="space-y-2 pt-4 border-t">
                <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wide block">Text format:</label>
                <div className="flex items-center flex-wrap gap-2">
                  {/* Font dropdown */}
                  <select
                    value={settings.fontFamily}
                    onChange={(e) => setSettings(prev => ({ ...prev, fontFamily: e.target.value as any }))}
                    className="h-10 px-3 rounded-xl border bg-white dark:bg-zinc-950 text-xs font-bold focus:outline-none flex-1 min-w-[90px]"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Courier">Courier</option>
                    <option value="Times">Times New Roman</option>
                  </select>

                  {/* Font Size select */}
                  <select
                    value={settings.fontSize}
                    onChange={(e) => setSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) || 12 }))}
                    className="h-10 px-2 rounded-xl border bg-white dark:bg-zinc-950 text-xs font-bold focus:outline-none w-16"
                  >
                    {[9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32].map(sz => (
                      <option key={sz} value={sz}>{sz}px</option>
                    ))}
                  </select>

                  {/* Bold Button */}
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, isBold: !prev.isBold }))}
                    className={`w-9 h-9 rounded-xl text-xs font-black flex items-center justify-center border transition-all ${settings.isBold ? "bg-red-500 border-red-500 text-white shadow-md shadow-red-500/20" : "bg-white dark:bg-zinc-950 text-foreground hover:bg-zinc-50"}`}
                  >
                    B
                  </button>

                  {/* Italic Button */}
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, isItalic: !prev.isItalic }))}
                    className={`w-9 h-9 rounded-xl text-xs italic font-black flex items-center justify-center border transition-all ${settings.isItalic ? "bg-red-500 border-red-500 text-white shadow-md shadow-red-500/20" : "bg-white dark:bg-zinc-950 text-foreground hover:bg-zinc-50"}`}
                  >
                    I
                  </button>

                  {/* Underline Button */}
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, isUnderline: !prev.isUnderline }))}
                    className={`w-9 h-9 rounded-xl text-xs underline font-black flex items-center justify-center border transition-all ${settings.isUnderline ? "bg-red-500 border-red-500 text-white shadow-md shadow-red-500/20" : "bg-white dark:bg-zinc-950 text-foreground hover:bg-zinc-50"}`}
                  >
                    U
                  </button>

                  {/* Color Swatch Picker Custom Input */}
                  <input
                    type="color"
                    value={settings.fontColor}
                    onChange={(e) => setSettings(prev => ({ ...prev, fontColor: e.target.value }))}
                    className="w-9 h-9 rounded-xl overflow-hidden border cursor-pointer bg-white p-0.5"
                  />
                </div>
              </div>
            </div>

            {/* Sidebar bottom action */}
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border-t shrink-0">
              <Button
                onClick={addPageNumbers}
                disabled={isProcessing}
                className="w-full h-14 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex items-center justify-center gap-3 text-sm font-black shadow-lg shadow-red-500/25 transition-all duration-300"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Adding page numbers...
                  </>
                ) : (
                  <>
                    Add page numbers
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
