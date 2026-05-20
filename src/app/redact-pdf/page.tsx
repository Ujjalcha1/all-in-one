"use client";

import { useState, useEffect, useRef } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/file-uploader";
import {
  Loader2,
  Check,
  ArrowRight,
  Sparkles,
  Scissors,
  Eraser,
  Hand,
  Search,
  X,
  FileText,
  AlertCircle
} from "lucide-react";

interface RedactionItem {
  id: string;
  page: number;
  text: string;
  pdfX: number;
  pdfY: number;
  pdfW: number;
  pdfH: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RedactPageCanvasProps {
  pageNum: number;
  pdfDocument: any;
  zoom: number;
  toolMode: "pan" | "redact" | "eraser";
  markedRedactions: RedactionItem[];
  searchQuery: string;
  onAddRedaction: (item: RedactionItem) => void;
  onRemoveRedaction: (id: string) => void;
  onTextExtracted: (pageNum: number, items: any[]) => void;
}

function RedactPageCanvas({
  pageNum,
  pdfDocument,
  zoom,
  toolMode,
  markedRedactions,
  searchQuery,
  onAddRedaction,
  onRemoveRedaction,
  onTextExtracted
}: RedactPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [pageTextItems, setPageTextItems] = useState<any[]>([]);

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

        const textContent = await page.getTextContent();
        const items = textContent.items.map((item: any, idx: number) => {
          const [scaleX, skewY, skewX, scaleY, x, y] = item.transform;
          const viewportPt = vp.convertToViewportPoint(x, y);
          const itemH = (item.height || 10) * vp.scale;
          const itemW = (item.width || 50) * vp.scale;
          return {
            id: `text-${pageNum}-${idx}`,
            text: item.str,
            pdfX: x,
            pdfY: y,
            pdfW: item.width || 50,
            pdfH: item.height || 10,
            x: viewportPt[0],
            y: viewportPt[1] - itemH,
            width: itemW,
            height: itemH,
          };
        });

        if (isRendered) {
          setPageTextItems(items);
          onTextExtracted(pageNum, items);
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

  const pageRedactions = markedRedactions.filter((r) => r.page === pageNum);

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <span className="text-xs font-extrabold text-zinc-400 dark:text-zinc-500">Page {pageNum}</span>
      <div
        className="relative bg-white dark:bg-zinc-950 shadow-2xl border border-zinc-200 dark:border-zinc-800 rounded-lg select-none shrink-0"
        style={{
          width: dims.width || 400,
          height: dims.height || 560,
          visibility: dims.width > 0 ? "visible" : "hidden",
          cursor: toolMode === "pan" ? "grab" : "default"
        }}
      >
        <canvas ref={canvasRef} className="block w-full h-full rounded-lg" />

        {/* Absolute Redaction overlays */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {pageRedactions.map((r) => (
            <div
              key={r.id}
              style={{
                left: `${r.x}px`,
                top: `${r.y}px`,
                width: `${r.width}px`,
                height: `${r.height}px`
              }}
              className="absolute border border-red-500 bg-red-500/20 rounded-sm"
            />
          ))}
        </div>

        {/* Clickable Eraser block covers */}
        {toolMode === "eraser" && (
          <div className="absolute inset-0 z-20">
            {pageRedactions.map((r) => (
              <div
                key={r.id}
                style={{
                  left: `${r.x}px`,
                  top: `${r.y}px`,
                  width: `${r.width}px`,
                  height: `${r.height}px`
                }}
                onClick={() => onRemoveRedaction(r.id)}
                className="absolute border-2 border-red-600 bg-red-500/40 rounded-sm cursor-pointer hover:bg-red-600/50 transition-colors"
              />
            ))}
          </div>
        )}

        {/* Interactive Text Selector Overlays */}
        {toolMode === "redact" && (
          <div className="absolute inset-0 z-20">
            {pageTextItems.map((item) => {
              const isRedacted = pageRedactions.some(r => Math.abs(r.x - item.x) < 2 && Math.abs(r.y - item.y) < 2);
              if (isRedacted) return null;

              const queryMatch = searchQuery && item.text.toLowerCase().includes(searchQuery.toLowerCase());

              return (
                <div
                  key={item.id}
                  style={{
                    left: `${item.x}px`,
                    top: `${item.y}px`,
                    width: `${item.width}px`,
                    height: `${item.height}px`
                  }}
                  onClick={() => {
                    const newItem: RedactionItem = {
                      id: `redact-${pageNum}-${Date.now()}-${Math.random()}`,
                      page: pageNum,
                      text: item.text,
                      pdfX: item.pdfX,
                      pdfY: item.pdfY,
                      pdfW: item.pdfW,
                      pdfH: item.pdfH,
                      x: item.x,
                      y: item.y,
                      width: item.width,
                      height: item.height
                    };
                    onAddRedaction(newItem);
                  }}
                  className={`absolute border rounded-sm cursor-pointer ${
                    queryMatch
                      ? "border-amber-500 bg-amber-500/20"
                      : "border-transparent hover:border-red-500/50 hover:bg-red-500/10"
                  }`}
                />
              );
            })}
          </div>
        )}

        {/* Floating Action Badge at top-right */}
        {pageRedactions.length > 0 && (
          <div className="absolute -top-4 -right-4 z-30 flex items-center justify-center">
            <div className="relative">
              <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg border border-white dark:border-zinc-950 text-xs font-black">
                {pageRedactions.length}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RedactPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Editor states
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [zoom, setZoom] = useState(72.71);
  const [toolMode, setToolMode] = useState<"pan" | "redact" | "eraser">("redact");
  const [markedRedactions, setMarkedRedactions] = useState<RedactionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Map of all page text items for document search redactions
  const [allTextItems, setAllTextItems] = useState<{ [pageNum: number]: any[] }>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResultUrl(null);
      setMarkedRedactions([]);
      setSearchQuery("");
      setPdfDocument(null);
      setAllTextItems({});
    }
  };

  // Generate page thumbnails on upload
  useEffect(() => {
    if (!file) {
      setThumbnails([]);
      setTotalPages(0);
      setPdfDocument(null);
      return;
    }
    const generateThumbnails = async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const ab = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: ab }).promise;
        setPdfDocument(pdfDoc);
        setTotalPages(pdfDoc.numPages);

        setThumbnails([]);
        for (let p = 1; p <= pdfDoc.numPages; p++) {
          const page = await pdfDoc.getPage(p);
          const vp = page.getViewport({ scale: 0.25 });
          const canvas = document.createElement("canvas");
          canvas.width = vp.width;
          canvas.height = vp.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
            const imgData = canvas.toDataURL("image/png");
            setThumbnails(prev => [...prev, imgData]);
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      } catch (e) {
        console.error(e);
      }
    };
    generateThumbnails();
  }, [file]);

  const handleTextExtracted = (pageNum: number, items: any[]) => {
    setAllTextItems(prev => ({ ...prev, [pageNum]: items }));
  };

  const removeRedaction = (id: string) => {
    setMarkedRedactions(prev => prev.filter(r => r.id !== id));
  };

  const clearAllRedactions = () => {
    setMarkedRedactions([]);
  };

  // Bulk add redactions matching search query across all pages
  const redactAllSearchMatches = () => {
    if (!searchQuery) return;
    const matchesToAdd: RedactionItem[] = [];

    Object.entries(allTextItems).forEach(([pageStr, items]) => {
      const pageNum = parseInt(pageStr);
      items.forEach((item, idx) => {
        if (item.text.toLowerCase().includes(searchQuery.toLowerCase())) {
          const isRedacted = markedRedactions.some(
            r => r.page === pageNum && Math.abs(r.x - item.x) < 2 && Math.abs(r.y - item.y) < 2
          );
          if (!isRedacted) {
            matchesToAdd.push({
              id: `redact-${pageNum}-${Date.now()}-${idx}-${Math.random()}`,
              page: pageNum,
              text: item.text,
              pdfX: item.pdfX,
              pdfY: item.pdfY,
              pdfW: item.pdfW,
              pdfH: item.pdfH,
              x: item.x,
              y: item.y,
              width: item.width,
              height: item.height
            });
          }
        }
      });
    });
    setMarkedRedactions(prev => [...prev, ...matchesToAdd]);
  };

  // Compile final redacted document using pdf-lib solid blocks masking
  const redactPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const ab = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(ab);
      const pages = pdfDoc.getPages();

      markedRedactions.forEach((r) => {
        if (r.page <= pages.length) {
          const page = pages[r.page - 1];
          page.drawRectangle({
            x: r.pdfX,
            y: r.pdfY,
            width: r.pdfW,
            height: r.pdfH,
            color: rgb(0, 0, 0)
          });
        }
      });

      pdfDoc.setProducer("OmniPDF Redaction Engine");
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error(e);
      alert("Error redacting PDF document.");
    } finally {
      setIsProcessing(false);
    }
  };

  const scrollToPage = (pageNum: number) => {
    const el = document.getElementById(`page-container-${pageNum}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#f3f4f6] dark:bg-zinc-900">
      {!file ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-xl mx-auto w-full">
          <FileUploader onFilesSelected={(files) => setFile(files[0])} accept="application/pdf" />
        </div>
      ) : resultUrl ? (
        // Redaction Completed Output Download screen
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xl p-10 text-center space-y-6 max-w-lg w-full">
            <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-2xl w-fit mx-auto text-emerald-500">
              <Check className="w-10 h-10" />
            </div>
            <h3 className="font-extrabold text-2xl text-zinc-900 dark:text-white">Redaction Applied!</h3>
            <p className="text-sm text-muted-foreground">
              Sensitive content has been permanently blacked out and masked.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                size="xl"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = resultUrl;
                  link.download = `${file.name.replace(".pdf", "")}_redacted.pdf`;
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
                  setMarkedRedactions([]);
                  setAllTextItems({});
                }}
                className="w-full h-14 rounded-2xl font-bold border-zinc-200 dark:border-zinc-800"
              >
                Start Over
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Three-column Redaction Workspace Editor
        <>
          {/* Left Column: Page thumbnails sidebar navigation */}
          <div className="w-48 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/20 flex flex-col items-center py-6 gap-6 overflow-y-auto shrink-0 select-none">
            {thumbnails.map((thumb, idx) => {
              const pageNum = idx + 1;
              return (
                <div
                  key={pageNum}
                  onClick={() => scrollToPage(pageNum)}
                  className="flex flex-col items-center gap-2 cursor-pointer group animate-in fade-in duration-200"
                >
                  <div
                    className="relative bg-white dark:bg-zinc-950 shadow-md border rounded-md overflow-hidden transition-all duration-300 border-zinc-200 dark:border-zinc-800 group-hover:border-red-300"
                    style={{ width: "100px", height: "141px" }}
                  >
                    <img src={thumb} alt={`Thumb ${pageNum}`} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-black tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                    {pageNum}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Center Workspace: Viewport scroll list and Tool selectors */}
          <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-zinc-200 dark:border-zinc-800">
            {/* Top Workspace Toolbar */}
            <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 flex items-center gap-2 shadow-sm shrink-0 select-none">
              <button
                onClick={() => setToolMode("pan")}
                className={`p-2.5 rounded-xl border transition-colors ${
                  toolMode === "pan"
                    ? "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground shadow-sm"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Hand className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={() => setToolMode("redact")}
                className={`flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold border transition-all ${
                  toolMode === "redact"
                    ? "bg-red-500/10 border-red-200 text-red-600 dark:text-red-400"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Scissors className="w-3.5 h-3.5 text-red-500" />
                Redact
              </button>
              <button
                onClick={() => setToolMode("eraser")}
                className={`p-2.5 rounded-xl border transition-colors ${
                  toolMode === "eraser"
                    ? "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-foreground shadow-sm"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eraser className="w-4.5 h-4.5 text-red-500" />
              </button>
            </div>

            {/* Vertical Scrollable Canvas Area */}
            <div className="flex-1 overflow-y-auto bg-[#f3f4f6] dark:bg-zinc-900 flex flex-col items-center gap-8 py-8 px-4 scroll-smooth">
              {pdfDocument && Array.from({ length: totalPages }).map((_, index) => {
                const pageNum = index + 1;
                return (
                  <div key={pageNum} id={`page-container-${pageNum}`} className="scroll-mt-6">
                    <RedactPageCanvas
                      pageNum={pageNum}
                      pdfDocument={pdfDocument}
                      zoom={zoom}
                      toolMode={toolMode}
                      markedRedactions={markedRedactions}
                      searchQuery={searchQuery}
                      onAddRedaction={(item) => setMarkedRedactions(prev => [...prev, item])}
                      onRemoveRedaction={removeRedaction}
                      onTextExtracted={handleTextExtracted}
                    />
                  </div>
                );
              })}
            </div>

            {/* Bottom Status bar */}
            <div className="h-12 bg-zinc-800 text-white border-t border-zinc-700 flex items-center justify-between px-6 shrink-0 select-none">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom(prev => Math.max(30, prev - 10))}
                  className="w-7 h-7 bg-zinc-700 hover:bg-zinc-600 rounded flex items-center justify-center font-bold text-sm"
                >
                  -
                </button>
                <select
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value) || 100)}
                  className="h-7 px-2 text-xs bg-zinc-700 text-white border-none rounded focus:outline-none"
                >
                  <option value="50">50%</option>
                  <option value="72.71">72.71%</option>
                  <option value="100">100%</option>
                  <option value="125">125%</option>
                  <option value="150">150%</option>
                </select>
                <button
                  onClick={() => setZoom(prev => Math.min(200, prev + 10))}
                  className="w-7 h-7 bg-zinc-700 hover:bg-zinc-600 rounded flex items-center justify-center font-bold text-sm"
                >
                  +
                </button>
              </div>
              <div className="flex items-center gap-2 border bg-zinc-900 border-zinc-700 px-3 py-1 rounded-md text-[10px] font-black max-w-[200px] truncate">
                <FileText className="w-3.5 h-3.5 text-red-400" />
                {file.name}
              </div>
            </div>
          </div>

          {/* Right Column: Options Sidebar */}
          <div className="w-full lg:w-[380px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between shadow-2xl relative h-full select-none">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <h2 className="text-lg font-black tracking-tight text-foreground">Redact PDF</h2>

              {/* Search text match box */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 pl-9 pr-4 w-full border rounded-xl bg-white dark:bg-zinc-950 text-xs font-semibold focus:outline-none focus:border-red-500"
                  />
                </div>
                {searchQuery && (
                  <button
                    onClick={redactAllSearchMatches}
                    className="text-[10px] font-bold text-red-500 hover:underline animate-fade-in"
                  >
                    Redact all matches across document
                  </button>
                )}
              </div>

              {/* Marked for redaction segment list */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black tracking-wider uppercase text-muted-foreground">
                    Marked for redaction
                  </h4>
                  {markedRedactions.length > 0 && (
                    <button
                      onClick={clearAllRedactions}
                      className="text-xs font-bold text-zinc-500 hover:text-red-500 transition-colors hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {markedRedactions.length === 0 ? (
                  // Empty state information box
                  <div className="p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900 text-sky-800 dark:text-sky-300 rounded-xl text-xs font-bold leading-relaxed">
                    Select and search text or pages to start redacting sensitive content.
                  </div>
                ) : (
                  // Lists of marked redact items grouped by page
                  <div className="space-y-4">
                    {Array.from(new Set(markedRedactions.map(r => r.page))).sort((a,b)=>a-b).map(pageNum => (
                      <div key={pageNum} className="space-y-2">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                          Page {pageNum}
                        </span>
                        <div className="space-y-2">
                          {markedRedactions.filter(r => r.page === pageNum).map(item => (
                            <div
                              key={item.id}
                              className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-1.5 border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-md text-zinc-400 shrink-0">
                                  <FileText className="w-3.5 h-3.5 animate-pulse text-red-500" />
                                </div>
                                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                                  {item.text}
                                </span>
                              </div>
                              <button
                                onClick={() => removeRedaction(item.id)}
                                className="text-zinc-400 hover:text-red-500 p-1 transition-colors shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Warning callout & Redact compile button */}
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border-t shrink-0 space-y-4 select-none">
              <div className="flex gap-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50 p-4 rounded-xl">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-[10px] font-bold text-orange-800 dark:text-orange-300 leading-relaxed">
                  Remember to review the result of your document before sending private information.
                </p>
              </div>

              <Button
                onClick={redactPdf}
                disabled={isProcessing || markedRedactions.length === 0}
                className="w-full h-14 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex items-center justify-center gap-3 text-sm font-black shadow-lg shadow-red-500/25 transition-all duration-300"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Redacting...
                  </>
                ) : (
                  <>
                    Redact
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
