"use client";

import { useState, useEffect, useRef } from "react";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Trash2,
  Plus,
  ArrowRight,
  Sparkles,
  FileText,
  ChevronDown,
  GitCompare,
  Hand,
  Check,
  Search,
  Layers,
  FileText as FileTextIcon
} from "lucide-react";

interface DiffCard {
  id: string;
  page: number;
  type: "deletion" | "addition" | "edit";
  oldText?: string;
  newText?: string;
  offset: number;
}

interface PageComparison {
  page: number;
  imgA: string;
  imgB: string;
  highlightsA: any[];
  highlightsB: any[];
  widthA: number;
  heightA: number;
  widthB: number;
  heightB: number;
}

export default function ComparePDFPage() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [comparisons, setComparisons] = useState<PageComparison[]>([]);
  const [changeReport, setChangeReport] = useState<DiffCard[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"semantic" | "overlay">("semantic");
  const [focusedHighlightId, setFocusedHighlightId] = useState<string | null>(null);

  // Viewport zoom & scroll sync configurations
  const [zoomA, setZoomA] = useState(72.5);
  const [zoomB, setZoomB] = useState(72.5);
  const [scrollSync, setScrollSync] = useState(true);
  const [splitPercentage, setSplitPercentage] = useState(50);

  const handleOldClick = (pageNum: number, oldText: string) => {
    const comp = comparisons.find(c => c.page === pageNum);
    if (!comp) return;
    const match = comp.highlightsA.find(h => 
      oldText.toLowerCase().includes(h.text.trim().toLowerCase()) ||
      h.text.trim().toLowerCase().includes(oldText.toLowerCase())
    );
    if (match) {
      setFocusedHighlightId(match.id);
      setTimeout(() => {
        const el = document.getElementById(match.id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  };

  const handleNewClick = (pageNum: number, newText: string) => {
    const comp = comparisons.find(c => c.page === pageNum);
    if (!comp) return;
    const match = comp.highlightsB.find(h => 
      newText.toLowerCase().includes(h.text.trim().toLowerCase()) ||
      h.text.trim().toLowerCase().includes(newText.toLowerCase())
    );
    if (match) {
      setFocusedHighlightId(match.id);
      setTimeout(() => {
        const el = document.getElementById(match.id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const containerARef = useRef<HTMLDivElement>(null);
  const containerBRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  // Synchronized scrolling mechanism
  const handleScrollA = () => {
    if (!scrollSync || isSyncing.current) return;
    if (containerARef.current && containerBRef.current) {
      isSyncing.current = true;
      containerBRef.current.scrollTop = containerARef.current.scrollTop;
      containerBRef.current.scrollLeft = containerARef.current.scrollLeft;
      setTimeout(() => { isSyncing.current = false; }, 50);
    }
  };

  const handleScrollB = () => {
    if (!scrollSync || isSyncing.current) return;
    if (containerARef.current && containerBRef.current) {
      isSyncing.current = true;
      containerARef.current.scrollTop = containerBRef.current.scrollTop;
      containerARef.current.scrollLeft = containerBRef.current.scrollLeft;
      setTimeout(() => { isSyncing.current = false; }, 50);
    }
  };

  // Drag resizer trigger
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const offset = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setSplitPercentage(Math.max(20, Math.min(80, offset)));
    };
    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleFileAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFileA(selectedFile);
      setComparisons([]);
      setChangeReport([]);
    }
  };

  const handleFileBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFileB(selectedFile);
      setComparisons([]);
      setChangeReport([]);
    }
  };

  // Pure LCS word diffing generator
  const computePageDiffs = (str1: string, str2: string, pageNum: number): DiffCard[] => {
    const words1 = str1.split(/\s+/).filter(Boolean);
    const words2 = str2.split(/\s+/).filter(Boolean);
    
    const dp: number[][] = Array(words1.length + 1).fill(0).map(() => Array(words2.length + 1).fill(0));
    for (let i = 1; i <= words1.length; i++) {
      for (let j = 1; j <= words2.length; j++) {
        if (words1[i - 1] === words2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const diffs: { type: "add" | "remove" | "match"; word: string }[] = [];
    let i = words1.length;
    let j = words2.length;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && words1[i - 1] === words2[j - 1]) {
        diffs.unshift({ type: "match", word: words1[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        diffs.unshift({ type: "add", word: words2[j - 1] });
        j--;
      } else {
        diffs.unshift({ type: "remove", word: words1[i - 1] });
        i--;
      }
    }

    const cards: DiffCard[] = [];
    let idx = 0;
    
    while (idx < diffs.length) {
      if (diffs[idx].type === "match") {
        idx++;
        continue;
      }

      let removals: string[] = [];
      let additions: string[] = [];

      while (idx < diffs.length && diffs[idx].type === "remove") {
        removals.push(diffs[idx].word);
        idx++;
      }

      while (idx < diffs.length && diffs[idx].type === "add") {
        additions.push(diffs[idx].word);
        idx++;
      }

      const oldVal = removals.join(" ");
      const newVal = additions.join(" ");

      if (removals.length > 0 && additions.length > 0) {
        cards.push({
          id: `card-${pageNum}-${idx}`,
          page: pageNum,
          type: "edit",
          oldText: oldVal,
          newText: newVal,
          offset: newVal.length - oldVal.length
        });
      } else if (removals.length > 0) {
        cards.push({
          id: `card-${pageNum}-${idx}`,
          page: pageNum,
          type: "deletion",
          oldText: oldVal,
          offset: -oldVal.length
        });
      } else if (additions.length > 0) {
        cards.push({
          id: `card-${pageNum}-${idx}`,
          page: pageNum,
          type: "addition",
          newText: newVal,
          offset: newVal.length
        });
      }
    }

    return cards;
  };

  const comparePdfs = async () => {
    if (!fileA || !fileB) return;
    setIsProcessing(true);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const abA = await fileA.arrayBuffer();
      const abB = await fileB.arrayBuffer();
      const pdfA = await pdfjsLib.getDocument({ data: abA }).promise;
      const pdfB = await pdfjsLib.getDocument({ data: abB }).promise;
      const maxPages = Math.max(pdfA.numPages, pdfB.numPages);
      
      const pageComps: PageComparison[] = [];
      let combinedDiffReport: DiffCard[] = [];

      for (let p = 1; p <= Math.min(maxPages, 10); p++) {
        let imgA = "";
        let imgB = "";
        let itemsA: any[] = [];
        let itemsB: any[] = [];
        let widthA = 0, heightA = 0, widthB = 0, heightB = 0;

        // Render & extract PDF A page data
        if (p <= pdfA.numPages) {
          const pageA = await pdfA.getPage(p);
          // Scale matching zoom multiplier
          const scaleMultiplier = zoomA / 100;
          const vpA = pageA.getViewport({ scale: 1.5 * scaleMultiplier });
          widthA = vpA.width;
          heightA = vpA.height;

          const canvas = document.createElement("canvas");
          canvas.width = vpA.width;
          canvas.height = vpA.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await pageA.render({ canvasContext: ctx, viewport: vpA, canvas }).promise;
            imgA = canvas.toDataURL("image/png");
          }

          // Extract coordinates
          const textContentA = await pageA.getTextContent();
          itemsA = textContentA.items.map((item: any) => {
            const [scaleX, skewY, skewX, scaleY, x, y] = item.transform;
            const viewportPt = vpA.convertToViewportPoint(x, y);
            const itemH = (item.height || 10) * vpA.scale;
            const itemW = (item.width || 50) * vpA.scale;
            return {
              text: item.str,
              x: viewportPt[0],
              y: viewportPt[1] - itemH,
              width: itemW,
              height: itemH,
            };
          });
        }

        // Render & extract PDF B page data
        if (p <= pdfB.numPages) {
          const pageB = await pdfB.getPage(p);
          const scaleMultiplier = zoomB / 100;
          const vpB = pageB.getViewport({ scale: 1.5 * scaleMultiplier });
          widthB = vpB.width;
          heightB = vpB.height;

          const canvas = document.createElement("canvas");
          canvas.width = vpB.width;
          canvas.height = vpB.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await pageB.render({ canvasContext: ctx, viewport: vpB, canvas }).promise;
            imgB = canvas.toDataURL("image/png");
          }

          const textContentB = await pageB.getTextContent();
          itemsB = textContentB.items.map((item: any) => {
            const [scaleX, skewY, skewX, scaleY, x, y] = item.transform;
            const viewportPt = vpB.convertToViewportPoint(x, y);
            const itemH = (item.height || 10) * vpB.scale;
            const itemW = (item.width || 50) * vpB.scale;
            return {
              text: item.str,
              x: viewportPt[0],
              y: viewportPt[1] - itemH,
              width: itemW,
              height: itemH,
            };
          });
        }

        const textStringsA = itemsA.map(i => i.text.trim()).filter(Boolean);
        const textStringsB = itemsB.map(i => i.text.trim()).filter(Boolean);

        // Map deletions (red outline overlays on original)
        const hA = itemsA.map((item, idx) => {
          const trimmed = item.text.trim();
          if (!trimmed) return null;
          const isDeleted = !textStringsB.includes(trimmed);
          return isDeleted ? { ...item, id: `hl-a-${p}-${idx}`, type: "delete" } : null;
        }).filter(Boolean);

        // Map additions (green backgrounds overlays on modified)
        const hB = itemsB.map((item, idx) => {
          const trimmed = item.text.trim();
          if (!trimmed) return null;
          const isAdded = !textStringsA.includes(trimmed);
          return isAdded ? { ...item, id: `hl-b-${p}-${idx}`, type: "add" } : null;
        }).filter(Boolean);

        // Build report diffs
        const rawTextA = itemsA.map(i => i.text).join(" ");
        const rawTextB = itemsB.map(i => i.text).join(" ");
        const pageDiffs = computePageDiffs(rawTextA, rawTextB, p);
        combinedDiffReport = [...combinedDiffReport, ...pageDiffs];

        pageComps.push({
          page: p,
          imgA,
          imgB,
          highlightsA: hA,
          highlightsB: hB,
          widthA,
          heightA,
          widthB,
          heightB
        });
      }

      setComparisons(pageComps);
      setChangeReport(combinedDiffReport);
    } catch (e) {
      console.error(e);
      alert("Error comparing PDF files.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadReport = async () => {
    if (changeReport.length === 0) return;
    
    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
      
      let page = doc.addPage([595, 842]); // A4 Size
      let y = 780;
      const margin = 50;
      const contentWidth = 495;
      
      const checkPageBreak = (neededHeight: number) => {
        if (y - neededHeight < margin) {
          page = doc.addPage([595, 842]);
          y = 780;
        }
      };

      const wrapText = (text: string, maxWidth: number, fontSize: number, currentFont: any): string[] => {
        const words = text.split(" ");
        const lines: string[] = [];
        let currentLine = "";
        
        for (const word of words) {
          const testLine = currentLine ? currentLine + " " + word : word;
          const width = currentFont.widthOfTextAtSize(testLine, fontSize);
          if (width > maxWidth) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }
        return lines;
      };

      // Header Title
      page.drawText("OMNIPDF COMPARISON REPORT", {
        x: margin,
        y: y,
        size: 16,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.2)
      });
      y -= 30;

      // Metadata details
      page.drawText(`Original file: ${fileA?.name || "Original"}`, { x: margin, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) });
      y -= 14;
      page.drawText(`Modified file: ${fileB?.name || "Modified"}`, { x: margin, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) });
      y -= 14;
      page.drawText(`Generated on: ${new Date().toLocaleString()}`, { x: margin, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) });
      y -= 14;
      page.drawText(`Total differences: ${changeReport.length}`, { x: margin, y, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.2) });
      y -= 25;

      // Horizontal separator line
      page.drawLine({
        start: { x: margin, y },
        end: { x: margin + contentWidth, y },
        thickness: 1,
        color: rgb(0.85, 0.85, 0.85)
      });
      y -= 25;

      // Group change list by Page numbers
      const grouped: Record<number, typeof changeReport> = {};
      changeReport.forEach(item => {
        if (!grouped[item.page]) grouped[item.page] = [];
        grouped[item.page].push(item);
      });

      const pages = Object.keys(grouped).map(Number).sort((a, b) => a - b);
      
      for (const pNum of pages) {
        checkPageBreak(30);
        page.drawText(`Page ${pNum}`, {
          x: margin,
          y,
          size: 12,
          font: fontBold,
          color: rgb(0.15, 0.15, 0.25)
        });
        y -= 20;

        for (const item of grouped[pNum]) {
          let oldLines: string[] = [];
          let newLines: string[] = [];
          
          if (item.oldText) oldLines = wrapText(item.oldText, contentWidth - 40, 8.5, font);
          if (item.newText) newLines = wrapText(item.newText, contentWidth - 40, 8.5, font);
          
          // Estimate vertical height needed for the item block
          const headerHeight = 15;
          const oldBlockHeight = oldLines.length > 0 ? (oldLines.length * 11) + 12 : 0;
          const newBlockHeight = newLines.length > 0 ? (newLines.length * 11) + 12 : 0;
          const blockPaddingHeight = 15;
          const totalItemHeight = headerHeight + oldBlockHeight + newBlockHeight + blockPaddingHeight;
          
          checkPageBreak(totalItemHeight + 10);

          // Draw card outline
          page.drawRectangle({
            x: margin,
            y: y - totalItemHeight + 5,
            width: contentWidth,
            height: totalItemHeight - 5,
            borderColor: rgb(0.9, 0.9, 0.92),
            borderWidth: 1,
            color: rgb(0.98, 0.98, 0.99)
          });
          
          let blockY = y - 12;

          if (item.type === "deletion") {
            // Header Badge text
            page.drawText(`DELETION (Offset: ${item.offset})`, {
              x: margin + 12,
              y: blockY,
              size: 8.5,
              font: fontBold,
              color: rgb(0.8, 0.2, 0.2)
            });
            blockY -= 14;

            page.drawText("Old:", { x: margin + 15, y: blockY, size: 8, font: fontBold, color: rgb(0.8, 0.2, 0.2) });
            blockY -= 11;

            oldLines.forEach(line => {
              page.drawText(line, { x: margin + 25, y: blockY, size: 8, font, color: rgb(0.25, 0.25, 0.25) });
              blockY -= 11;
            });
          }
          else if (item.type === "addition") {
            page.drawText(`ADDITION (Offset: +${item.offset})`, {
              x: margin + 12,
              y: blockY,
              size: 8.5,
              font: fontBold,
              color: rgb(0.1, 0.6, 0.3)
            });
            blockY -= 14;

            page.drawText("New:", { x: margin + 15, y: blockY, size: 8, font: fontBold, color: rgb(0.1, 0.6, 0.3) });
            blockY -= 11;

            newLines.forEach(line => {
              page.drawText(line, { x: margin + 25, y: blockY, size: 8, font, color: rgb(0.25, 0.25, 0.25) });
              blockY -= 11;
            });
          }
          else {
            page.drawText(`EDIT (Offset: ${item.offset > 0 ? "+" : ""}${item.offset})`, {
              x: margin + 12,
              y: blockY,
              size: 8.5,
              font: fontBold,
              color: rgb(0.9, 0.5, 0.1)
            });
            blockY -= 14;

            page.drawText("Old:", { x: margin + 15, y: blockY, size: 8, font: fontBold, color: rgb(0.8, 0.2, 0.2) });
            blockY -= 11;
            oldLines.forEach(line => {
              page.drawText(line, { x: margin + 25, y: blockY, size: 8, font, color: rgb(0.25, 0.25, 0.25) });
              blockY -= 11;
            });

            blockY -= 4;
            page.drawText("New:", { x: margin + 15, y: blockY, size: 8, font: fontBold, color: rgb(0.1, 0.6, 0.3) });
            blockY -= 11;
            newLines.forEach(line => {
              page.drawText(line, { x: margin + 25, y: blockY, size: 8, font, color: rgb(0.25, 0.25, 0.25) });
              blockY -= 11;
            });
          }
          
          y = blockY - 12;
        }
        y -= 12;
      }
      
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `comparison_report_${fileA?.name.replace(".pdf", "")}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Error generating PDF report.");
    }
  };

  // Re-trigger comparison render on zoom changes
  useEffect(() => {
    if (fileA && fileB && comparisons.length > 0) {
      comparePdfs();
    }
  }, [zoomA, zoomB]);

  const filteredReport = changeReport.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.oldText?.toLowerCase().includes(q) ||
      item.newText?.toLowerCase().includes(q) ||
      `page ${item.page}`.includes(q)
    );
  });

  return (
    <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#f3f4f6] dark:bg-zinc-900">
      {comparisons.length === 0 ? (
        // Side-by-Side Dual Drag & Drop files selector UI
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            {/* File A original selection card */}
            <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xl p-8 text-center space-y-4">
              <h3 className="font-extrabold text-lg text-zinc-900 dark:text-white">Original PDF</h3>
              {fileA ? (
                <div className="border border-red-200 dark:border-red-950 bg-red-50/20 dark:bg-red-950/5 p-6 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-red-500" />
                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 text-left max-w-[200px] truncate">
                      {fileA.name}
                    </span>
                  </div>
                  <button onClick={() => setFileA(null)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              ) : (
                <label className="block w-full cursor-pointer">
                  <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-red-500 dark:hover:border-red-500 rounded-2xl p-8 transition-colors flex flex-col items-center justify-center gap-3 bg-zinc-50/50 dark:bg-zinc-900/10">
                    <Sparkles className="w-8 h-8 text-zinc-400" />
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Choose Original PDF</span>
                    <span className="text-xs font-semibold text-muted-foreground">or drag and drop here</span>
                  </div>
                  <input type="file" accept="application/pdf" onChange={handleFileAChange} className="hidden" />
                </label>
              )}
            </div>

            {/* File B modified selection card */}
            <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xl p-8 text-center space-y-4">
              <h3 className="font-extrabold text-lg text-zinc-900 dark:text-white">Modified PDF</h3>
              {fileB ? (
                <div className="border border-violet-200 dark:border-violet-950 bg-violet-50/20 dark:bg-violet-950/5 p-6 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-violet-500" />
                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 text-left max-w-[200px] truncate">
                      {fileB.name}
                    </span>
                  </div>
                  <button onClick={() => setFileB(null)} className="p-2 text-zinc-400 hover:text-violet-500 transition-colors">
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              ) : (
                <label className="block w-full cursor-pointer">
                  <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-violet-500 dark:hover:border-violet-500 rounded-2xl p-8 transition-colors flex flex-col items-center justify-center gap-3 bg-zinc-50/50 dark:bg-zinc-900/10">
                    <Sparkles className="w-8 h-8 text-zinc-400" />
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Choose Modified PDF</span>
                    <span className="text-xs font-semibold text-muted-foreground">or drag and drop here</span>
                  </div>
                  <input type="file" accept="application/pdf" onChange={handleFileBChange} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Action Comparison Trigger */}
          {fileA && fileB && (
            <Button
              size="xl"
              onClick={comparePdfs}
              disabled={isProcessing}
              className="bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 px-10 h-14 rounded-2xl font-black transition-all active:scale-95"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Comparing documents...
                </>
              ) : (
                <>
                  Compare PDFs
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      ) : (
        // Side-by-side Resizable Comparison workspace panel
        <>
          {/* Left / Center comparison canvas viewports */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Top Toolbar controls */}
            <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 flex items-center justify-between shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                <button className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-zinc-600 transition-colors">
                  <Hand className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setScrollSync(!scrollSync)}
                  className={`flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold border transition-all ${
                    scrollSync
                      ? "bg-red-500/10 border-red-200 text-red-600 dark:text-red-400"
                      : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600"
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 ${scrollSync ? "opacity-100" : "opacity-0"}`} />
                  Scroll sync
                </button>
              </div>

              {/* Close Comparison Workspace trigger */}
              <button
                onClick={() => {
                  setComparisons([]);
                  setChangeReport([]);
                  setFileA(null);
                  setFileB(null);
                }}
                className="text-xs font-bold text-muted-foreground hover:text-red-500 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                Close Comparison
              </button>
            </div>

            {/* Split pane viewport container */}
            <div ref={containerRef} className="flex-1 flex overflow-hidden relative bg-[#f3f4f6] dark:bg-zinc-900">
              {/* Document A viewport wrapper */}
              <div
                style={{ width: `${splitPercentage}%` }}
                className="h-full flex flex-col overflow-hidden border-r border-zinc-200 dark:border-zinc-800 relative"
              >
                <div
                  ref={containerARef}
                  onScroll={handleScrollA}
                  className="flex-1 overflow-auto p-8 space-y-8 flex flex-col items-center"
                >
                  {comparisons.map((c) => (
                    <div
                      key={c.page}
                      className="relative bg-white dark:bg-zinc-950 shadow-lg border border-zinc-200 dark:border-zinc-800 rounded-md shrink-0"
                      style={{ width: c.widthA, height: c.heightA }}
                    >
                      <img src={c.imgA} alt={`Page A ${c.page}`} className="w-full h-full block object-contain select-none" />
                      {/* Highlight outline borders */}
                      <div className="absolute inset-0 pointer-events-none">
                        {c.highlightsA.map((h, idx) => {
                          const isFocused = focusedHighlightId === h.id;
                          return (
                            <div
                              id={h.id}
                              key={idx}
                              style={{
                                left: `${h.x}px`,
                                top: `${h.y}px`,
                                width: `${h.width}px`,
                                height: `${h.height}px`
                              }}
                              className={`absolute rounded-sm transition-all duration-300 ${
                                isFocused
                                  ? "border-2 border-red-600 bg-red-500/30 shadow-[0_0_12px_#ef4444] scale-105 z-20 animate-pulse"
                                  : "border border-red-500 bg-red-500/10"
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status Bar A */}
                <div className="h-12 bg-zinc-800 text-white border-t border-zinc-700 flex items-center justify-between px-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setZoomA(prev => Math.max(50, prev - 10))}
                      className="w-7 h-7 bg-zinc-700 hover:bg-zinc-600 rounded flex items-center justify-center font-bold text-sm"
                    >
                      -
                    </button>
                    <select
                      value={zoomA}
                      onChange={(e) => setZoomA(parseFloat(e.target.value) || 100)}
                      className="h-7 px-2 text-xs bg-zinc-700 text-white border-none rounded focus:outline-none"
                    >
                      <option value="50">50%</option>
                      <option value="72.5">72.5%</option>
                      <option value="100">100%</option>
                      <option value="125">125%</option>
                      <option value="150">150%</option>
                      <option value="200">200%</option>
                    </select>
                    <button
                      onClick={() => setZoomA(prev => Math.min(200, prev + 10))}
                      className="w-7 h-7 bg-zinc-700 hover:bg-zinc-600 rounded flex items-center justify-center font-bold text-sm"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-2 border bg-zinc-900 border-zinc-700 px-3 py-1 rounded-md text-[10px] font-black max-w-[150px] truncate">
                    <FileText className="w-3.5 h-3.5 text-red-400" />
                    {fileA?.name}
                  </div>
                </div>
              </div>

              {/* Central drag-resizable divider bar */}
              <div
                onMouseDown={handleMouseDown}
                className="w-1.5 hover:w-2 bg-zinc-200 hover:bg-red-500 dark:bg-zinc-800 dark:hover:bg-red-500 cursor-col-resize shrink-0 transition-all flex items-center justify-center relative z-30 shadow"
              >
                <div className="w-0.5 h-6 bg-zinc-400 dark:bg-zinc-600 rounded-full" />
              </div>

              {/* Document B viewport wrapper */}
              <div
                style={{ width: `${100 - splitPercentage}%` }}
                className="h-full flex flex-col overflow-hidden relative"
              >
                <div
                  ref={containerBRef}
                  onScroll={handleScrollB}
                  className="flex-1 overflow-auto p-8 space-y-8 flex flex-col items-center"
                >
                  {comparisons.map((c) => (
                    <div
                      key={c.page}
                      className="relative bg-white dark:bg-zinc-950 shadow-lg border border-zinc-200 dark:border-zinc-800 rounded-md shrink-0"
                      style={{ width: c.widthB, height: c.heightB }}
                    >
                      <img src={c.imgB} alt={`Page B ${c.page}`} className="w-full h-full block object-contain select-none" />
                      {/* Highlight green fills */}
                      <div className="absolute inset-0 pointer-events-none">
                        {c.highlightsB.map((h, idx) => {
                          const isFocused = focusedHighlightId === h.id;
                          return (
                            <div
                              id={h.id}
                              key={idx}
                              style={{
                                left: `${h.x}px`,
                                top: `${h.y}px`,
                                width: `${h.width}px`,
                                height: `${h.height}px`
                              }}
                              className={`absolute rounded-sm transition-all duration-300 ${
                                isFocused
                                  ? "bg-emerald-500/40 border-2 border-emerald-500 shadow-[0_0_12px_#10b981] scale-105 z-20 animate-pulse"
                                  : "bg-emerald-500/20 border border-emerald-500/50"
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status Bar B */}
                <div className="h-12 bg-zinc-800 text-white border-t border-zinc-700 flex items-center justify-between px-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setZoomB(prev => Math.max(50, prev - 10))}
                      className="w-7 h-7 bg-zinc-700 hover:bg-zinc-600 rounded flex items-center justify-center font-bold text-sm"
                    >
                      -
                    </button>
                    <select
                      value={zoomB}
                      onChange={(e) => setZoomB(parseFloat(e.target.value) || 100)}
                      className="h-7 px-2 text-xs bg-zinc-700 text-white border-none rounded focus:outline-none"
                    >
                      <option value="50">50%</option>
                      <option value="72.5">72.5%</option>
                      <option value="100">100%</option>
                      <option value="125">125%</option>
                      <option value="150">150%</option>
                      <option value="200">200%</option>
                    </select>
                    <button
                      onClick={() => setZoomB(prev => Math.min(200, prev + 10))}
                      className="w-7 h-7 bg-zinc-700 hover:bg-zinc-600 rounded flex items-center justify-center font-bold text-sm"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-2 border bg-zinc-900 border-zinc-700 px-3 py-1 rounded-md text-[10px] font-black max-w-[150px] truncate">
                    <FileText className="w-3.5 h-3.5 text-violet-400" />
                    {fileB?.name}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Change Report Options Sidebar */}
          <div className="w-full lg:w-[380px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between shadow-2xl relative h-full">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Tabs header selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl relative">
                <button
                  onClick={() => setActiveTab("semantic")}
                  className={`relative flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold border transition-all ${
                    activeTab === "semantic"
                      ? "bg-white dark:bg-zinc-950 border-zinc-200 text-foreground shadow"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileTextIcon className="w-4 h-4 text-zinc-500" />
                  Semantic Text
                </button>
                <button
                  onClick={() => setActiveTab("overlay")}
                  className={`relative flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold border transition-all ${
                    activeTab === "overlay"
                      ? "bg-white dark:bg-zinc-950 border-zinc-200 text-foreground shadow"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="w-4 h-4 text-zinc-500" />
                  Content Overlay
                </button>
              </div>

              {/* Blue Alert prompt info box */}
              <div className="p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900 text-sky-800 dark:text-sky-300 rounded-xl text-xs font-bold">
                Compare text changes between two PDFs.
              </div>

              {/* Search text box */}
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

              {/* Change report lists grouped by page */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-foreground">
                  Change report ({filteredReport.length})
                </h4>

                <div className="space-y-4">
                  {/* Group cards by Page */}
                  {Array.from(new Set(filteredReport.map(item => item.page))).map(pageNum => (
                    <div key={pageNum} className="space-y-2">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                        Page {pageNum}
                      </span>
                      <div className="space-y-2.5">
                        {filteredReport.filter(item => item.page === pageNum).map((item) => (
                          <div
                            key={item.id}
                            className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border rounded-xl space-y-2 relative overflow-hidden"
                          >
                            {/* Card headers depending on action diff type */}
                            {item.type === "deletion" && (
                              <>
                                <div className="flex justify-between items-center text-[10px] font-black text-red-500">
                                  <span>Deletion</span>
                                  <span>{item.offset}</span>
                                </div>
                                <div 
                                  onClick={() => handleOldClick(item.page, item.oldText || "")}
                                  className="text-xs text-foreground/80 bg-red-500/5 dark:bg-red-500/10 p-2 rounded-lg border border-red-500/20 cursor-pointer hover:border-red-500 hover:ring-2 hover:ring-red-500/15 hover:-translate-y-0.5 transition-all"
                                >
                                  <span className="font-extrabold text-[9px] text-red-500 block mb-1">Old (Click to highlight)</span>
                                  {item.oldText}
                                </div>
                              </>
                            )}

                            {item.type === "addition" && (
                              <>
                                <div className="flex justify-between items-center text-[10px] font-black text-emerald-500">
                                  <span>New</span>
                                  <span>+{item.offset}</span>
                                </div>
                                <div 
                                  onClick={() => handleNewClick(item.page, item.newText || "")}
                                  className="text-xs text-foreground/80 bg-emerald-500/5 dark:bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 cursor-pointer hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/15 hover:-translate-y-0.5 transition-all"
                                >
                                  <span className="font-extrabold text-[9px] text-emerald-500 block mb-1">New (Click to highlight)</span>
                                  {item.newText}
                                </div>
                              </>
                            )}

                            {item.type === "edit" && (
                              <>
                                <div className="flex justify-between items-center text-[10px] font-black text-amber-500">
                                  <span>Edit</span>
                                  <span>{item.offset > 0 ? `+${item.offset}` : item.offset}</span>
                                </div>
                                <div className="space-y-1.5">
                                  <div 
                                    onClick={() => handleOldClick(item.page, item.oldText || "")}
                                    className="text-xs text-foreground/80 bg-red-500/5 dark:bg-red-500/10 p-2 rounded-lg border border-red-500/20 cursor-pointer hover:border-red-500 hover:ring-2 hover:ring-red-500/15 hover:-translate-y-0.5 transition-all"
                                  >
                                    <span className="font-extrabold text-[9px] text-red-500 block mb-1">Old (Click to highlight)</span>
                                    {item.oldText}
                                  </div>
                                  <div 
                                    onClick={() => handleNewClick(item.page, item.newText || "")}
                                    className="text-xs text-foreground/80 bg-emerald-500/5 dark:bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 cursor-pointer hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/15 hover:-translate-y-0.5 transition-all"
                                  >
                                    <span className="font-extrabold text-[9px] text-emerald-500 block mb-1">New (Click to highlight)</span>
                                    {item.newText}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar bottom action */}
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border-t shrink-0">
              <Button
                onClick={downloadReport}
                disabled={changeReport.length === 0}
                className="w-full h-14 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex items-center justify-center gap-3 text-sm font-black shadow-lg shadow-red-500/25 transition-all duration-300"
              >
                Download report
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
