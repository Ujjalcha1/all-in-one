"use client";

import { useState, useRef } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import { Loader2, Edit3, Type, Bold, Italic, Trash2, RefreshCw, Eraser, Plus } from "lucide-react";

interface Annotation {
  id: string;
  type: "text" | "eraser";
  page: number; // 1-indexed
  x: number; // percentage (0-100) from left
  y: number; // percentage (0-100) from top
  
  // Text specific
  text: string;
  fontSize: number;
  color: string; // hex
  isBold: boolean;
  isItalic: boolean;
  fontFamily: "Helvetica" | "Times" | "Courier";
  
  // Eraser specific
  width: number; // percentage of page width (1-100)
  height: number; // percentage of page height (1-100)
}

export default function EditPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  
  // UI states for interactive editing
  const [pagesData, setPagesData] = useState<{ width: number; height: number; pageNumber: number }[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnoId, setSelectedAnnoId] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [activePage, setActivePage] = useState<number>(1);
  
  // Ref for rendering canvases
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const canvasesRef = useRef<Map<number, HTMLCanvasElement>>(new Map());

  const handleFiles = async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setResultUrl(null);
    setAnnotations([]);
    setSelectedAnnoId(null);
    setPagesData([]);
    setActivePage(1);
    
    // Start rendering the PDF pages
    setIsLoadingPdf(true);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      }

      const ab = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
      
      const sizes: { width: number; height: number; pageNumber: number }[] = [];
      
      // Load and record details of pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // High-quality rendering scale
        sizes.push({
          width: viewport.width,
          height: viewport.height,
          pageNumber: i
        });
      }
      
      setPagesData(sizes);
      
      // Delay slightly to let the canvas DOM render before mounting canvases
      setTimeout(() => {
        sizes.forEach(async (pData) => {
          const page = await pdf.getPage(pData.pageNumber);
          const canvas = canvasesRef.current.get(pData.pageNumber);
          if (canvas) {
            const context = canvas.getContext("2d");
            if (context) {
              const viewport = page.getViewport({ scale: 1.5 });
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              
              const renderContext = {
                canvasContext: context,
                viewport: viewport,
                canvas: canvas
              };
              await page.render(renderContext).promise;
            }
          }
        });
      }, 100);
      
    } catch (e) {
      console.error("Failed to load PDF visually:", e);
      alert("Error loading PDF preview. You can still annotate, but visual rendering failed.");
    } finally {
      setIsLoadingPdf(false);
    }
  };



  // Add a new Text Box via Button
  const addTextBox = () => {
    const offset = Math.floor(Math.random() * 15) - 7; // -7% to +7%
    const newAnno: Annotation = {
      id: crypto.randomUUID(),
      type: "text",
      page: activePage,
      x: 40 + offset,
      y: 40 + offset,
      text: "Type here...",
      fontSize: 16,
      color: "#000000",
      isBold: false,
      isItalic: false,
      fontFamily: "Helvetica",
      width: 15,
      height: 4
    };
    setAnnotations(prev => [...prev, newAnno]);
    setSelectedAnnoId(newAnno.id);
  };

  // Add a new Whiteout / Eraser Block
  const addEraserBox = () => {
    const offset = Math.floor(Math.random() * 15) - 7; // -7% to +7%
    const newAnno: Annotation = {
      id: crypto.randomUUID(),
      type: "eraser",
      page: activePage,
      x: 35 + offset,
      y: 35 + offset,
      text: "",
      fontSize: 14,
      color: "#ffffff",
      isBold: false,
      isItalic: false,
      fontFamily: "Helvetica",
      width: 20, // Default 20% width of page
      height: 5  // Default 5% height of page
    };
    setAnnotations(prev => [...prev, newAnno]);
    setSelectedAnnoId(newAnno.id);
  };

  // Custom drag logic
  const handleBoxMouseDown = (e: React.MouseEvent, annoId: string) => {
    e.stopPropagation();
    setSelectedAnnoId(annoId);
    
    const anno = annotations.find(t => t.id === annoId);
    if (!anno) return;

    const pageOverlay = e.currentTarget.parentElement;
    if (!pageOverlay) return;
    
    const rect = pageOverlay.getBoundingClientRect();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
      
      setAnnotations(prev => prev.map(t => t.id === annoId ? {
        ...t,
        x: Math.max(0, Math.min(100 - (t.type === "eraser" ? t.width : 5), x)),
        y: Math.max(0, Math.min(100 - (t.type === "eraser" ? t.height : 2), y))
      } : t));
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const updateSelectedAnno = (fields: Partial<Annotation>) => {
    if (!selectedAnnoId) return;
    setAnnotations(prev => prev.map(t => t.id === selectedAnnoId ? { ...t, ...fields } : t));
  };

  const deleteSelectedAnno = () => {
    if (!selectedAnnoId) return;
    setAnnotations(prev => prev.filter(t => t.id !== selectedAnnoId));
    setSelectedAnnoId(null);
  };

  const selectedAnno = annotations.find(t => t.id === selectedAnnoId);

  // Convert Hex string to pdf-lib rgb Color
  const hexToRgb = (hex: string) => {
    const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;
    const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
    const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
    const b = parseInt(cleanHex.slice(4, 6), 16) / 255;
    return rgb(r, g, b);
  };

  // Maps logical typeface names to exact CSS font family styles
  const getCssFontFamily = (family: "Helvetica" | "Times" | "Courier") => {
    switch (family) {
      case "Times": return "'Times New Roman', Times, serif";
      case "Courier": return "'Courier New', Courier, monospace";
      default: return "Helvetica, Arial, sans-serif";
    }
  };

  const editPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const ab = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(ab);
      
      // Embed standard Helvetica fonts
      const fontHelvReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontHelvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontHelvItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      const fontHelvBI = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

      // Embed standard Times Roman fonts
      const fontTimesReg = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const fontTimesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const fontTimesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      const fontTimesBI = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

      // Embed standard Courier fonts
      const fontCourReg = await pdfDoc.embedFont(StandardFonts.Courier);
      const fontCourBold = await pdfDoc.embedFont(StandardFonts.CourierBold);
      const fontCourItalic = await pdfDoc.embedFont(StandardFonts.CourierOblique);
      const fontCourBI = await pdfDoc.embedFont(StandardFonts.CourierBoldOblique);

      const pages = pdfDoc.getPages();

      // 1. Draw all whiteout erasers first (Background layer)
      for (const anno of annotations) {
        if (anno.type !== "eraser") continue;
        const pageIndex = anno.page - 1;
        const page = pages[pageIndex];
        if (!page) continue;

        const { width, height } = page.getSize();
        const pdfX = (anno.x / 100) * width;
        const rectWidth = (anno.width / 100) * width;
        const rectHeight = (anno.height / 100) * height;
        const pdfY = height - ((anno.y / 100) * height) - rectHeight;

        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: rectWidth,
          height: rectHeight,
          color: rgb(1, 1, 1), // solid white
        });
      }

      // 2. Draw all text annotations on top (Foreground layer)
      for (const anno of annotations) {
        if (anno.type !== "text") continue;
        const pageIndex = anno.page - 1;
        const page = pages[pageIndex];
        if (!page) continue;

        const { width, height } = page.getSize();
        const pdfX = (anno.x / 100) * width;
        const pdfY = height - ((anno.y / 100) * height) - (anno.fontSize * 0.8);

        // Select correct typeface variation based on styles
        let selectedFont = fontHelvReg;
        
        if (anno.fontFamily === "Times") {
          if (anno.isBold && anno.isItalic) selectedFont = fontTimesBI;
          else if (anno.isBold) selectedFont = fontTimesBold;
          else if (anno.isItalic) selectedFont = fontTimesItalic;
          else selectedFont = fontTimesReg;
        } else if (anno.fontFamily === "Courier") {
          if (anno.isBold && anno.isItalic) selectedFont = fontCourBI;
          else if (anno.isBold) selectedFont = fontCourBold;
          else if (anno.isItalic) selectedFont = fontCourItalic;
          else selectedFont = fontCourReg;
        } else { // Helvetica
          if (anno.isBold && anno.isItalic) selectedFont = fontHelvBI;
          else if (anno.isBold) selectedFont = fontHelvBold;
          else if (anno.isItalic) selectedFont = fontHelvItalic;
          else selectedFont = fontHelvReg;
        }

        page.drawText(anno.text, {
          x: pdfX,
          y: pdfY,
          size: anno.fontSize,
          font: selectedFont,
          color: hexToRgb(anno.color)
        });
      }

      const pdfBytes = await pdfDoc.save();
      setResultUrl(URL.createObjectURL(new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" })));
    } catch (e) {
      console.error("Failed to edit and save PDF:", e);
      alert("Error generating edited PDF. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolLayout title="Edit PDF" description="Cover existing text with Whiteout and add customized text annotations visually." icon={<Edit3 className="w-8 h-8" />}>
      {!resultUrl ? (
        <div className="w-full">
          {!file ? (
            <div className="flex flex-col items-center">
              <FileUploader onFilesSelected={handleFiles} multiple={false} accept="application/pdf" />
            </div>
          ) : isLoadingPdf ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse font-medium">Rendering PDF Pages...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start w-full">
              {/* Left Column: Visual interactive document editor */}
              <div className="lg:col-span-3 flex flex-col items-center gap-8 bg-zinc-950/20 dark:bg-black/40 border border-border/60 rounded-3xl p-6 md:p-8 max-h-[85vh] overflow-y-auto shadow-inner">
                {/* Floating dynamic toolbar inside page wrapper */}
                <div className="flex justify-between items-center w-full max-w-2xl bg-card border px-4 py-2.5 rounded-2xl shadow-md gap-4">
                  <div className="text-xs font-bold text-muted-foreground">Active Page: {activePage}</div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addTextBox} className="bg-primary/10 hover:bg-primary/20 text-primary gap-1.5 h-9 rounded-xl border border-primary/10">
                      <Plus className="w-4 h-4" />
                      Add Text
                    </Button>
                    <Button size="sm" onClick={addEraserBox} className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 gap-1.5 h-9 rounded-xl border border-orange-500/10">
                      <Eraser className="w-4 h-4" />
                      Whiteout (Eraser)
                    </Button>
                  </div>
                </div>

                <div ref={pageContainerRef} className="flex flex-col gap-10 w-full max-w-2xl select-none">
                  {pagesData.map((pData) => (
                    <div key={pData.pageNumber} className="relative flex flex-col items-center">
                      <div className="absolute -left-10 top-2 text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20 backdrop-blur shadow-sm">
                        Page {pData.pageNumber}
                      </div>
                      
                      {/* Active rendering container */}
                      <div 
                        onClick={() => setSelectedAnnoId(null)}
                        onMouseEnter={() => setActivePage(pData.pageNumber)}
                        className="relative bg-white shadow-2xl border border-zinc-200 rounded-lg cursor-default overflow-hidden hover:shadow-primary/5 transition-all duration-300"
                        style={{
                          width: "100%",
                          maxWidth: `${pData.width}px`,
                          aspectRatio: `${pData.width} / ${pData.height}`
                        }}
                      >
                        {/* Rendered PDF canvas */}
                        <canvas
                          ref={(el) => {
                            if (el) canvasesRef.current.set(pData.pageNumber, el);
                            else canvasesRef.current.delete(pData.pageNumber);
                          }}
                          className="w-full h-full pointer-events-none block"
                        />
                        
                        {/* Annotation interaction overlay layer */}
                        <div className="absolute inset-0 w-full h-full top-0 left-0">
                          {annotations
                            .filter((t) => t.page === pData.pageNumber)
                            .map((anno) => {
                              if (anno.type === "eraser") {
                                return (
                                  <div
                                    key={anno.id}
                                    onMouseDown={(e) => handleBoxMouseDown(e, anno.id)}
                                    onClick={(e) => { e.stopPropagation(); setSelectedAnnoId(anno.id); }}
                                    className={`absolute annotation-element cursor-move transition-all bg-white border ${
                                      selectedAnnoId === anno.id 
                                        ? "border-orange-500 shadow-md shadow-orange-500/20" 
                                        : "border-zinc-300/40 hover:border-orange-400"
                                    }`}
                                    style={{
                                      left: `${anno.x}%`,
                                      top: `${anno.y}%`,
                                      width: `${anno.width}%`,
                                      height: `${anno.height}%`,
                                      transform: "translate(0, 0)",
                                      zIndex: 10
                                    }}
                                  >
                                    {selectedAnnoId === anno.id && (
                                      <div className="absolute -top-6 left-0 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                                        Whiteout Box
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={anno.id}
                                  onMouseDown={(e) => handleBoxMouseDown(e, anno.id)}
                                  onClick={(e) => { e.stopPropagation(); setSelectedAnnoId(anno.id); }}
                                  className={`absolute annotation-element px-2 py-1 rounded border cursor-move transition-all duration-200 ${
                                    selectedAnnoId === anno.id 
                                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10" 
                                      : "border-transparent hover:border-zinc-300 hover:bg-zinc-100/30"
                                  }`}
                                  style={{
                                    left: `${anno.x}%`,
                                    top: `${anno.y}%`,
                                    fontSize: `${anno.fontSize}px`,
                                    color: anno.color,
                                    fontWeight: anno.isBold ? "bold" : "normal",
                                    fontStyle: anno.isItalic ? "italic" : "normal",
                                    fontFamily: getCssFontFamily(anno.fontFamily),
                                    transform: "translate(0, 0)",
                                    whiteSpace: "nowrap",
                                    zIndex: selectedAnnoId === anno.id ? 30 : 20
                                  }}
                                >
                                  {selectedAnnoId === anno.id ? (
                                    <input
                                      type="text"
                                      value={anno.text}
                                      onChange={(e) => updateSelectedAnno({ text: e.target.value })}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      autoFocus
                                      className="bg-transparent border-none outline-none p-0 m-0 w-auto font-inherit text-inherit select-text min-w-[120px]"
                                      style={{
                                        fontSize: "inherit",
                                        color: "inherit",
                                        fontWeight: "inherit",
                                        fontStyle: "inherit",
                                        fontFamily: "inherit"
                                      }}
                                    />
                                  ) : (
                                    anno.text || <span className="opacity-40 italic">Type here...</span>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Custom glassmorphic controls sidebar */}
              <div className="bg-card border rounded-3xl p-6 shadow-xl space-y-6 lg:sticky lg:top-8 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center gap-3 pb-3 border-b animate-pulse">
                  <Type className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg">Editor Panel</h3>
                </div>

                {selectedAnno ? (
                  <div className="space-y-6">
                    {selectedAnno.type === "eraser" ? (
                      <div className="space-y-6">
                        {/* Eraser Width & Height Control */}
                        <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 space-y-4">
                          <div className="flex items-center gap-2 text-orange-500 font-bold text-sm">
                            <Eraser className="w-4 h-4" />
                            <span>Whiteout Properties</span>
                          </div>
                          
                          {/* Width */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Width Scale</label>
                            <input
                              type="range"
                              min="2"
                              max="100"
                              value={selectedAnno.width}
                              onChange={(e) => updateSelectedAnno({ width: parseInt(e.target.value) })}
                              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-zinc-200 dark:bg-zinc-800 accent-orange-500"
                            />
                            <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                              <span>Min</span>
                              <span className="text-orange-500">{selectedAnno.width}%</span>
                              <span>Max</span>
                            </div>
                          </div>

                          {/* Height */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Height Scale</label>
                            <input
                              type="range"
                              min="1"
                              max="40"
                              value={selectedAnno.height}
                              onChange={(e) => updateSelectedAnno({ height: parseInt(e.target.value) })}
                              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-zinc-200 dark:bg-zinc-800 accent-orange-500"
                            />
                            <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                              <span>Min</span>
                              <span className="text-orange-500">{selectedAnno.height}%</span>
                              <span>Max</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-[11px] leading-relaxed text-muted-foreground/80 bg-zinc-950/5 p-3.5 rounded-xl border border-dashed">
                          💡 <strong>How to Redact/Replace:</strong> Place this white block over the text you wish to remove (like "three"). Then, click <strong>"Add Text"</strong>, position it directly on top of this block, and type "four"!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Text field input */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Edit Content</label>
                          <input
                            type="text"
                            value={selectedAnno.text}
                            onChange={(e) => updateSelectedAnno({ text: e.target.value })}
                            className="w-full h-10 px-3 py-2 rounded-xl border bg-zinc-900/10 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                          />
                        </div>

                        {/* Font Family Selection Dropdown */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Font Family</label>
                          <select
                            value={selectedAnno.fontFamily}
                            onChange={(e) => updateSelectedAnno({ fontFamily: e.target.value as any })}
                            className="w-full h-10 px-3 rounded-xl border bg-zinc-900/10 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-primary/40 font-semibold"
                          >
                            <option value="Helvetica" style={{ fontFamily: getCssFontFamily("Helvetica") }}>Sans-Serif (Helvetica)</option>
                            <option value="Times" style={{ fontFamily: getCssFontFamily("Times") }}>Serif (Times Roman)</option>
                            <option value="Courier" style={{ fontFamily: getCssFontFamily("Courier") }}>Monospace (Courier)</option>
                          </select>
                        </div>

                        {/* Size and Style */}
                        <div className="space-y-3">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Typography</label>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <input
                                type="range"
                                min="8"
                                max="64"
                                value={selectedAnno.fontSize}
                                onChange={(e) => updateSelectedAnno({ fontSize: parseInt(e.target.value) })}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-zinc-200 dark:bg-zinc-800 accent-primary"
                              />
                              <div className="flex justify-between text-[10px] text-muted-foreground font-semibold mt-1.5">
                                <span>8px</span>
                                <span className="text-primary font-bold">{selectedAnno.fontSize}px</span>
                                <span>64px</span>
                              </div>
                            </div>
                            <div className="flex gap-1.5 border p-1 rounded-xl bg-zinc-950/5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateSelectedAnno({ isBold: !selectedAnno.isBold })}
                                className={`w-9 h-9 p-0 rounded-lg ${selectedAnno.isBold ? "bg-primary/10 text-primary hover:bg-primary/20" : ""}`}
                              >
                                <Bold className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateSelectedAnno({ isItalic: !selectedAnno.isItalic })}
                                className={`w-9 h-9 p-0 rounded-lg ${selectedAnno.isItalic ? "bg-primary/10 text-primary hover:bg-primary/20" : ""}`}
                              >
                                <Italic className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Color presets + Custom color */}
                        <div className="space-y-3">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Text Color</label>
                          <div className="flex flex-wrap gap-2">
                            {["#000000", "#ffffff", "#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#eab308"].map((c) => (
                              <button
                                key={c}
                                onClick={() => updateSelectedAnno({ color: c })}
                                className={`w-7 h-7 rounded-full border shadow-sm transition-all duration-200 hover:scale-110 ${
                                  selectedAnno.color === c ? "ring-2 ring-primary ring-offset-2 scale-105" : ""
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                            {/* Custom Hex input */}
                            <div className="flex items-center gap-1.5 border rounded-xl px-2.5 py-1 bg-zinc-950/5 h-8">
                              <span className="text-xs font-bold text-muted-foreground">#</span>
                              <input
                                type="text"
                                maxLength={6}
                                value={selectedAnno.color.replace("#", "")}
                                onChange={(e) => updateSelectedAnno({ color: `#${e.target.value}` })}
                                className="bg-transparent border-none outline-none w-14 font-mono text-xs font-bold text-right"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Delete Annotation */}
                    <Button 
                      variant="ghost" 
                      onClick={deleteSelectedAnno} 
                      className="w-full text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-2 border border-red-500/10 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Annotation
                    </Button>
                  </div>
                ) : (
                  <div className="bg-zinc-950/5 dark:bg-black/10 border border-dashed border-border/80 rounded-2xl p-5 text-center shadow-inner">
                    <p className="text-sm font-semibold text-muted-foreground">No Element Selected</p>
                    <p className="text-xs text-muted-foreground/60 mt-1.5 leading-relaxed">
                      Click anywhere on a page to add Text, or click <strong>"Whiteout (Eraser)"</strong> in the toolbar to block out existing text on the PDF.
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t space-y-4">
                  {annotations.length > 0 && (
                    <Button
                      variant="ghost"
                      onClick={() => { setAnnotations([]); setSelectedAnnoId(null); }}
                      className="w-full text-muted-foreground hover:bg-muted-foreground/5 gap-2 rounded-xl"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Clear All Elements
                    </Button>
                  )}

                  <Button 
                    size="xl" 
                    variant="hero" 
                    onClick={editPdf} 
                    disabled={isProcessing} 
                    className="w-full bg-purple-500 hover:bg-purple-600 shadow-purple-500/20"
                  >
                    {isProcessing ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Saving PDF...</>
                    ) : (
                      <>Save & Export PDF</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <ResultScreen
          title="PDF edited successfully!"
          downloadUrl={resultUrl}
          downloadFileName={`${file?.name.replace('.pdf', '')}_result.pdf`}
          downloadText="Download Edited PDF"
          onStartOver={() => { setFile(null); setResultUrl(null); setAnnotations([]); setSelectedAnnoId(null); }}
        />
      )}
    </ToolLayout>
  );
}
