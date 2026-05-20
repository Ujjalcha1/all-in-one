"use client";

import { useState, useCallback, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import {
  Download, Loader2, SplitSquareHorizontal, Plus, Trash2, Check,
} from "lucide-react";

interface PageThumb {
  index: number;
  src: string;
}

interface SplitRange {
  from: number;
  to: number;
}

export default function SplitPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [thumbnails, setThumbnails] = useState<PageThumb[]>([]);
  const [isLoadingThumbs, setIsLoadingThumbs] = useState(false);

  // Split config
  const [splitTab, setSplitTab] = useState<"range" | "pages">("range");

  // Range mode
  const [rangeMode, setRangeMode] = useState<"custom" | "fixed">("custom");
  const [ranges, setRanges] = useState<SplitRange[]>([{ from: 1, to: 1 }]);
  const [fixedSize, setFixedSize] = useState(1);
  const [mergeRanges, setMergeRanges] = useState(false);

  // Pages mode
  const [pagesMode, setPagesMode] = useState<"all" | "select">("all");
  const [pageInput, setPageInput] = useState("");
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [mergePages, setMergePages] = useState(false);

  // Result
  const [isSplitting, setIsSplitting] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setResultUrl(null);
    setThumbnails([]);
    setIsLoadingThumbs(true);
    setSelectedPages(new Set());
    setRanges([{ from: 1, to: 1 }]);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      }
      const ab = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
      setTotalPages(pdf.numPages);
      setRanges([{ from: 1, to: pdf.numPages }]);

      const thumbs: PageThumb[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 0.35 });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp, canvas }).promise;
        thumbs.push({ index: i, src: canvas.toDataURL("image/png") });
        // Update progressively
        setThumbnails([...thumbs]);
      }
    } catch (e) {
      console.error(e);
      alert("Error loading PDF.");
    } finally {
      setIsLoadingThumbs(false);
    }
  }, []);

  // Parse page input string like "1,3,5-8" into page numbers
  const parsePageInput = (input: string, max: number): number[] => {
    const pages = new Set<number>();
    const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes("-")) {
        const [a, b] = part.split("-").map(Number);
        if (!isNaN(a) && !isNaN(b)) {
          for (let i = Math.max(1, a); i <= Math.min(max, b); i++) pages.add(i);
        }
      } else {
        const n = Number(part);
        if (!isNaN(n) && n >= 1 && n <= max) pages.add(n);
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  // Update selected pages when input changes
  useEffect(() => {
    if (pagesMode === "select" && pageInput) {
      const parsed = parsePageInput(pageInput, totalPages);
      setSelectedPages(new Set(parsed));
    } else if (pagesMode === "all") {
      setSelectedPages(new Set(Array.from({ length: totalPages }, (_, i) => i + 1)));
    }
  }, [pageInput, pagesMode, totalPages]);

  // Toggle page selection by clicking thumbnail
  const togglePage = (pageNum: number) => {
    if (splitTab !== "pages" || pagesMode !== "select") return;
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) next.delete(pageNum);
      else next.add(pageNum);
      return next;
    });
    // Update input to match
    setSelectedPages((prev) => {
      const sorted = Array.from(prev).sort((a, b) => a - b);
      setPageInput(sorted.join(","));
      return prev;
    });
  };

  // Check if a page is highlighted (in any range or selected)
  const isPageHighlighted = (pageNum: number): boolean => {
    if (splitTab === "pages") {
      if (pagesMode === "all") return true;
      return selectedPages.has(pageNum);
    }
    // Range mode
    if (rangeMode === "custom") {
      return ranges.some((r) => pageNum >= r.from && pageNum <= r.to);
    }
    // Fixed mode - all pages are included
    return true;
  };

  // Get range label for a page
  const getPageRangeLabel = (pageNum: number): string | null => {
    if (splitTab !== "range" || rangeMode !== "custom") return null;
    const idx = ranges.findIndex((r) => pageNum >= r.from && pageNum <= r.to);
    if (idx >= 0) return `Range ${idx + 1}`;
    return null;
  };

  // Add range
  const addRange = () => {
    setRanges((prev) => [...prev, { from: 1, to: totalPages }]);
  };
  const removeRange = (idx: number) => {
    setRanges((prev) => prev.filter((_, i) => i !== idx));
  };
  const updateRange = (idx: number, field: "from" | "to", value: number) => {
    setRanges((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: Math.max(1, Math.min(totalPages, value)) } : r)));
  };

  // Split PDF
  const splitPdf = async () => {
    if (!file) return;
    setIsSplitting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const zip = new JSZip();

      if (splitTab === "range") {
        if (rangeMode === "custom") {
          if (mergeRanges) {
            const newPdf = await PDFDocument.create();
            for (const range of ranges) {
              const indices = Array.from({ length: range.to - range.from + 1 }, (_, i) => range.from - 1 + i);
              const pages = await newPdf.copyPages(srcDoc, indices);
              pages.forEach((p) => newPdf.addPage(p));
            }
            const bytes = await newPdf.save();
            zip.file("merged_ranges.pdf", bytes);
          } else {
            for (let ri = 0; ri < ranges.length; ri++) {
              const range = ranges[ri];
              const newPdf = await PDFDocument.create();
              const indices = Array.from({ length: range.to - range.from + 1 }, (_, i) => range.from - 1 + i);
              const pages = await newPdf.copyPages(srcDoc, indices);
              pages.forEach((p) => newPdf.addPage(p));
              const bytes = await newPdf.save();
              zip.file(`range_${ri + 1}_pages_${range.from}-${range.to}.pdf`, bytes);
            }
          }
        } else {
          // Fixed range
          for (let start = 0; start < srcDoc.getPageCount(); start += fixedSize) {
            const newPdf = await PDFDocument.create();
            const end = Math.min(start + fixedSize, srcDoc.getPageCount());
            const indices = Array.from({ length: end - start }, (_, i) => start + i);
            const pages = await newPdf.copyPages(srcDoc, indices);
            pages.forEach((p) => newPdf.addPage(p));
            const bytes = await newPdf.save();
            zip.file(`pages_${start + 1}-${end}.pdf`, bytes);
          }
        }
      } else {
        // Pages mode
        const pagesToExtract = pagesMode === "all"
          ? Array.from({ length: totalPages }, (_, i) => i)
          : Array.from(selectedPages).sort((a, b) => a - b).map((p) => p - 1);

        if (mergePages) {
          const newPdf = await PDFDocument.create();
          const pages = await newPdf.copyPages(srcDoc, pagesToExtract);
          pages.forEach((p) => newPdf.addPage(p));
          const bytes = await newPdf.save();
          zip.file("extracted_pages.pdf", bytes);
        } else {
          for (const idx of pagesToExtract) {
            const newPdf = await PDFDocument.create();
            const [page] = await newPdf.copyPages(srcDoc, [idx]);
            newPdf.addPage(page);
            const bytes = await newPdf.save();
            zip.file(`page_${idx + 1}.pdf`, bytes);
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      setResultUrl(URL.createObjectURL(zipBlob));
    } catch (error) {
      console.error("Error splitting PDF:", error);
      alert("An error occurred while splitting the PDF.");
    } finally {
      setIsSplitting(false);
    }
  };

  // Summary text
  const getSummaryText = (): string => {
    if (splitTab === "range") {
      if (rangeMode === "custom") {
        const count = mergeRanges ? 1 : ranges.length;
        return `${count} PDF file${count > 1 ? "s" : ""} will be created.`;
      }
      const count = Math.ceil(totalPages / fixedSize);
      return `${count} PDF file${count > 1 ? "s" : ""} will be created (${fixedSize} page${fixedSize > 1 ? "s" : ""} each).`;
    }
    if (pagesMode === "all") {
      return mergePages ? "All pages merged into 1 PDF." : `${totalPages} separate PDF files will be created.`;
    }
    const count = selectedPages.size;
    if (count === 0) return "No pages selected.";
    return mergePages ? `${count} pages merged into 1 PDF.` : `${count} separate PDF file${count > 1 ? "s" : ""} will be created.`;
  };

  return (
    <ToolLayout
      title="Split PDF"
      description="Separate one page or a whole set for easy conversion into independent PDF files."
      icon={<SplitSquareHorizontal className="w-8 h-8" />}
    >
      {!file ? (
        <FileUploader onFilesSelected={handleFiles} multiple={false} accept="application/pdf" />
      ) : !resultUrl ? (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Page thumbnails */}
          <div className="flex-1 min-w-0">
            {/* Range labels above thumbnails */}
            {splitTab === "range" && rangeMode === "custom" && (
              <div className="mb-3 flex flex-wrap gap-2">
                {ranges.map((r, i) => (
                  <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                    Range {i + 1}: pages {r.from}–{r.to}
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {thumbnails.map((thumb) => {
                const highlighted = isPageHighlighted(thumb.index);
                const rangeLabel = getPageRangeLabel(thumb.index);
                const isClickable = splitTab === "pages" && pagesMode === "select";

                return (
                  <div
                    key={thumb.index}
                    onClick={() => togglePage(thumb.index)}
                    className={`
                      relative group rounded-xl overflow-hidden border-2 transition-all duration-200 shadow-sm
                      ${isClickable ? "cursor-pointer" : ""}
                      ${highlighted
                        ? "border-orange-400 shadow-orange-100 ring-1 ring-orange-200"
                        : "border-border/40 opacity-40 grayscale"
                      }
                      ${isClickable && highlighted ? "hover:shadow-lg hover:-translate-y-0.5" : ""}
                      ${isClickable && !highlighted ? "hover:opacity-70 hover:grayscale-0" : ""}
                    `}
                  >
                    {/* Selection check */}
                    {isClickable && highlighted && (
                      <div className="absolute top-1.5 right-1.5 z-10 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </div>
                    )}

                    {/* Range label */}
                    {rangeLabel && (
                      <div className="absolute top-1.5 left-1.5 z-10 text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500 text-white shadow">
                        {rangeLabel}
                      </div>
                    )}

                    <div className="aspect-[3/4] bg-white flex items-center justify-center overflow-hidden">
                      <img src={thumb.src} alt={`Page ${thumb.index}`} className="w-full h-full object-contain" draggable={false} />
                    </div>
                    <div className="text-center py-1.5 bg-card text-xs font-medium text-muted-foreground">
                      {thumb.index}
                    </div>
                  </div>
                );
              })}

              {isLoadingThumbs && (
                <div className="aspect-[3/4] border-2 border-dashed border-border/40 rounded-xl flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Right: Split controls */}
          <div className="w-full lg:w-80 xl:w-96 shrink-0">
            <div className="bg-card border rounded-2xl shadow-sm p-5 space-y-5 sticky top-20">
              <h2 className="text-xl font-bold text-center">Split</h2>

              {/* Tab selector: Range / Pages */}
              <div className="grid grid-cols-2 gap-1 bg-muted p-1 rounded-xl">
                <button
                  onClick={() => setSplitTab("range")}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    splitTab === "range" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                    <rect x="3" y="3" width="7" height="18" rx="1.5" />
                    <rect x="14" y="3" width="7" height="18" rx="1.5" />
                  </svg>
                  Range
                </button>
                <button
                  onClick={() => setSplitTab("pages")}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    splitTab === "pages" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                  Pages
                </button>
              </div>

              {/* Range tab content */}
              {splitTab === "range" && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2 text-muted-foreground">Range mode:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setRangeMode("custom")}
                        className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                          rangeMode === "custom"
                            ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                            : "border-border text-muted-foreground hover:border-foreground/30"
                        }`}
                      >
                        Custom
                      </button>
                      <button
                        onClick={() => setRangeMode("fixed")}
                        className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                          rangeMode === "fixed"
                            ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                            : "border-border text-muted-foreground hover:border-foreground/30"
                        }`}
                      >
                        Fixed
                      </button>
                    </div>
                  </div>

                  {rangeMode === "custom" ? (
                    <div className="space-y-3">
                      {ranges.map((range, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                              Range {idx + 1}
                            </span>
                            {ranges.length > 1 && (
                              <button onClick={() => removeRange(idx)} className="text-muted-foreground hover:text-red-500 transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">from page</span>
                            <input
                              type="number"
                              min={1}
                              max={totalPages}
                              value={range.from}
                              onChange={(e) => updateRange(idx, "from", parseInt(e.target.value) || 1)}
                              className="w-16 h-8 px-2 text-sm text-center rounded-md border bg-background"
                            />
                            <span className="text-xs text-muted-foreground">to</span>
                            <input
                              type="number"
                              min={1}
                              max={totalPages}
                              value={range.to}
                              onChange={(e) => updateRange(idx, "to", parseInt(e.target.value) || 1)}
                              className="w-16 h-8 px-2 text-sm text-center rounded-md border bg-background"
                            />
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={addRange}
                        className="flex items-center gap-1.5 mx-auto text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
                      >
                        <Plus className="h-4 w-4" /> Add Range
                      </button>
                      <label className="flex items-center gap-2 text-sm cursor-pointer pt-1">
                        <input type="checkbox" checked={mergeRanges} onChange={(e) => setMergeRanges(e.target.checked)} className="rounded" />
                        <span className="text-muted-foreground">Merge all ranges in <strong className="text-foreground">one PDF</strong> file.</span>
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-muted-foreground block mb-1.5">Split every N pages:</label>
                        <input
                          type="number"
                          min={1}
                          max={totalPages}
                          value={fixedSize}
                          onChange={(e) => setFixedSize(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full h-9 px-3 text-sm rounded-md border bg-background"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pages tab content */}
              {splitTab === "pages" && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2 text-muted-foreground">Extract mode:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPagesMode("all")}
                        className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                          pagesMode === "all"
                            ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                            : "border-border text-muted-foreground hover:border-foreground/30"
                        }`}
                      >
                        Extract all pages
                      </button>
                      <button
                        onClick={() => setPagesMode("select")}
                        className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                          pagesMode === "select"
                            ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                            : "border-border text-muted-foreground hover:border-foreground/30"
                        }`}
                      >
                        Select pages
                      </button>
                    </div>
                  </div>

                  {pagesMode === "select" && (
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1.5">Pages to extract:</label>
                      <input
                        type="text"
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value)}
                        placeholder="example: 1,5-8"
                        className="w-full h-9 px-3 text-sm rounded-md border bg-background placeholder:text-muted-foreground/50"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Click on page thumbnails to select, or type page numbers.</p>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={mergePages} onChange={(e) => setMergePages(e.target.checked)} className="rounded" />
                    <span className="text-muted-foreground">Merge extracted pages into <strong className="text-foreground">one PDF</strong> file.</span>
                  </label>
                </div>
              )}

              {/* Summary */}
              <div className="bg-muted/60 rounded-lg px-3 py-2.5 flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center mt-0.5 shrink-0">
                  <span className="text-[10px] font-bold">i</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{getSummaryText()}</p>
              </div>

              {/* Split button */}
              <Button
                size="xl"
                variant="hero"
                onClick={splitPdf}
                disabled={isSplitting || (splitTab === "pages" && pagesMode === "select" && selectedPages.size === 0)}
                className="w-full bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"
              >
                {isSplitting ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Splitting...</>
                ) : (
                  <>Split PDF <Download className="ml-2 h-5 w-5" /></>
                )}
              </Button>

              {/* Start over */}
              <button
                onClick={() => { setFile(null); setResultUrl(null); setThumbnails([]); setTotalPages(0); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                ← Choose a different file
              </button>
            </div>
          </div>
        </div>
      ) : (
        <ResultScreen
          title="PDF split successfully!"
          downloadUrl={resultUrl}
          downloadFileName={`${file?.name.replace(".pdf", "")}_result.zip`}
          downloadText="Download ZIP file"
          onStartOver={() => {
                setFile(null);
                setResultUrl(null);
                setThumbnails([]);
                setTotalPages(0);
              }}
        />
      )}
    </ToolLayout>
    
  );
}
