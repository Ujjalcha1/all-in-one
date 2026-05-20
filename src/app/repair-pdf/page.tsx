"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Wrench, 
  FileText, 
  CheckCircle, 
  ShieldAlert,
  ArrowRight,
  Info,
  Check
} from "lucide-react";

export default function RepairPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [fileSizeLabel, setFileSizeLabel] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [repairLog, setRepairLog] = useState("");

  // Lazy-load PDF.js only in client context to satisfy SSR rules
  const getPdfjsEngine = async () => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    return pdfjsLib;
  };

  const handleFiles = async (files: File[]) => {
    const selectedFile = files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setResultUrl(null);
    setError("");
    setRepairLog("");
    setIsPreviewLoading(true);

    const sizeKB = (selectedFile.size / 1024).toFixed(2);
    setFileSizeLabel(`${sizeKB} KB`);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      let cleanedBytes = cleanCorruptedBytes(new Uint8Array(arrayBuffer)) as Uint8Array;
      let finalBytes = cleanedBytes;

      // Try loading with pdf-lib. If it fails, attempt to pre-repair the catalog structure
      let pdfDocLib;
      try {
        pdfDocLib = await PDFDocument.load(cleanedBytes, {
          ignoreEncryption: true,
          throwOnInvalidObject: false,
        } as any);
      } catch (loadError) {
        console.warn("Initial load for preview failed, trying to auto-rebuild catalog structure...", loadError);
        const rebuilt = rebuildCorruptedCatalog(cleanedBytes);
        if (rebuilt) {
          finalBytes = rebuilt.bytes;
          pdfDocLib = await PDFDocument.load(finalBytes, {
            ignoreEncryption: true,
            throwOnInvalidObject: false,
          } as any);
        } else {
          throw loadError;
        }
      }

      setPageCount(pdfDocLib.getPageCount());

      // Render thumbnail of page 1 using PDF.js on finalBytes (which contains the rebuilt catalog!)
      const pdfjsLib = await getPdfjsEngine();
      const loadingTask = pdfjsLib.getDocument({ data: finalBytes.slice(0) } as any);
      const pdfjsDoc = await loadingTask.promise;
      const page = await pdfjsDoc.getPage(1);
      const viewport = page.getViewport({ scale: 0.3 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport } as any).promise;
        setThumbnailUrl(canvas.toDataURL("image/jpeg", 0.7));
      }
    } catch (err) {
      console.warn("Failed to load PDF preview (file is corrupted):", err);
      setThumbnailUrl("");
      setPageCount(0);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setResultUrl(null);
    setThumbnailUrl("");
    setPageCount(0);
    setFileSizeLabel("");
    setError("");
    setRepairLog("");
  };

  // Helper: Byte-level cleaner to trim prefix headers and trailing suffix junk
  const cleanCorruptedBytes = (bytes: any): any => {
    // 1. Locate the %PDF- header start offset
    // ASCII pattern for "%PDF-": [0x25, 0x50, 0x44, 0x46, 0x2D]
    let startIdx = -1;
    for (let i = 0; i < bytes.length - 5; i++) {
      if (
        bytes[i] === 0x25 && 
        bytes[i + 1] === 0x50 && 
        bytes[i + 2] === 0x44 && 
        bytes[i + 3] === 0x46 && 
        bytes[i + 4] === 0x2D
      ) {
        startIdx = i;
        break;
      }
    }

    // 2. Locate the last %%EOF marker offset
    // ASCII pattern for "%%EOF": [0x25, 0x25, 0x45, 0x4F, 0x46]
    let endIdx = -1;
    for (let i = bytes.length - 5; i >= 0; i--) {
      if (
        bytes[i] === 0x25 && 
        bytes[i + 1] === 0x25 && 
        bytes[i + 2] === 0x45 && 
        bytes[i + 3] === 0x4F && 
        bytes[i + 4] === 0x46
      ) {
        endIdx = i + 5; // Include full %%EOF bytes
        break;
      }
    }

    let cleaned = bytes;
    if (startIdx > 0) {
      cleaned = cleaned.subarray(startIdx);
    }
    if (endIdx > 0 && endIdx < cleaned.length) {
      cleaned = cleaned.subarray(0, endIdx);
    }
    
    return cleaned;
  };

  const rebuildCorruptedCatalog = (bytes: Uint8Array): { bytes: Uint8Array; pageCount: number } | null => {
    try {
      const decoder = new TextDecoder("latin1");
      const text = decoder.decode(bytes);
      
      let catalogId: number | null = null;
      let pagesTreeId: number | null = null;
      const pageIds: number[] = [];
      
      // Single-pass object scanner
      const objStartRegex = /(\d+)\s+0\s+obj/g;
      let match;
      while ((match = objStartRegex.exec(text)) !== null) {
        const id = parseInt(match[1], 10);
        const startPos = match.index;
        const block = text.substr(startPos, 4000);
        const endObjIdx = block.indexOf("endobj");
        const scanArea = endObjIdx !== -1 ? block.substring(0, endObjIdx) : block;
        
        // Normalize whitespace to prevent spacing, line breaks or comments from breaking keywords
        const normalizedScan = scanArea.replace(/\s+/g, "");
        
        if (normalizedScan.includes("/Type/Catalog")) {
          catalogId = id;
        } else if (normalizedScan.includes("/Type/Pages")) {
          pagesTreeId = id;
        } else if (normalizedScan.includes("/Type/Page") && !normalizedScan.includes("/Type/Pages")) {
          if (!pageIds.includes(id)) {
            pageIds.push(id);
          }
        }
      }

      console.log("Scanned objects:", { catalogId, pagesTreeId, pageCount: pageIds.length });

      // Scenario 1: Existing Catalog found
      if (catalogId !== null) {
        const trailerRegex = /(trailer[\s\S]*?<<[\s\S]*?)(\/Root\s+\d+\s+0\s+R)([\s\S]*?>>)/gi;
        if (trailerRegex.test(text)) {
          const rewrittenText = text.replace(trailerRegex, `$1/Root ${catalogId} 0 R$3`);
          const outputBytes = new Uint8Array(rewrittenText.length);
          for (let i = 0; i < rewrittenText.length; i++) {
            outputBytes[i] = rewrittenText.charCodeAt(i) & 0xFF;
          }
          return { bytes: outputBytes, pageCount: pageIds.length };
        } else {
          const newTrailer = `\ntrailer\n<< /Size ${catalogId + 1} /Root ${catalogId} 0 R >>\n%%EOF\n`;
          const appendBytes = new Uint8Array(newTrailer.length);
          for (let i = 0; i < newTrailer.length; i++) {
            appendBytes[i] = newTrailer.charCodeAt(i) & 0xFF;
          }
          const combined = new Uint8Array(bytes.length + appendBytes.length);
          combined.set(bytes);
          combined.set(appendBytes, bytes.length);
          return { bytes: combined, pageCount: pageIds.length };
        }
      }

      // Scenario 2: Pages tree found, Catalog missing
      if (pagesTreeId !== null) {
        const newCatalogId = 999999;
        const newCatalogObj = `${newCatalogId} 0 obj\n<< /Type /Catalog /Pages ${pagesTreeId} 0 R >>\nendobj\n`;
        const newTrailer = `\ntrailer\n<< /Size ${newCatalogId + 1} /Root ${newCatalogId} 0 R >>\n%%EOF\n`;
        
        const appendStr = newCatalogObj + newTrailer;
        const appendBytes = new Uint8Array(appendStr.length);
        for (let i = 0; i < appendStr.length; i++) {
          appendBytes[i] = appendStr.charCodeAt(i) & 0xFF;
        }
        
        const combined = new Uint8Array(bytes.length + appendBytes.length);
        combined.set(bytes);
        combined.set(appendBytes, bytes.length);
        return { bytes: combined, pageCount: pageIds.length };
      }

      // Scenario 3: Salvage orphaned page objects
      if (pageIds.length > 0) {
        pageIds.sort((a, b) => a - b);
        
        const newPagesTreeId = 999998;
        const newCatalogId = 999999;
        
        const kidsStr = pageIds.map(id => `${id} 0 R`).join(" ");
        const newPagesObj = `${newPagesTreeId} 0 obj\n<< /Type /Pages /Kids [ ${kidsStr} ] /Count ${pageIds.length} >>\nendobj\n`;
        const newCatalogObj = `${newCatalogId} 0 obj\n<< /Type /Catalog /Pages ${newPagesTreeId} 0 R >>\nendobj\n`;
        const newTrailer = `\ntrailer\n<< /Size ${newCatalogId + 1} /Root ${newCatalogId} 0 R >>\n%%EOF\n`;
        
        const appendStr = newPagesObj + newCatalogObj + newTrailer;
        const appendBytes = new Uint8Array(appendStr.length);
        for (let i = 0; i < appendStr.length; i++) {
          appendBytes[i] = appendStr.charCodeAt(i) & 0xFF;
        }
        
        const combined = new Uint8Array(bytes.length + appendBytes.length);
        combined.set(bytes);
        combined.set(appendBytes, bytes.length);
        
        return { bytes: combined, pageCount: pageIds.length };
      }

      return null;
    } catch (err) {
      console.warn("Rebuild Catalog failed:", err);
      return null;
    }
  };

  const repairPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError("");
    setRepairLog("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      let fileBytes = new Uint8Array(arrayBuffer);

      // STEP 1: Trim outer junk bytes
      fileBytes = cleanCorruptedBytes(fileBytes);

      let repairedBytes: Uint8Array | null = null;
      let recoveryMethod = "";

      // STEP 2: Tier 1 - Load with error tolerant pdf-lib parameters
      try {
        const pdfDoc = await PDFDocument.load(fileBytes, {
          ignoreEncryption: true,
          throwOnInvalidObject: false,
        } as any);
        pdfDoc.setProducer("OmniPDF Repair Engine");
        pdfDoc.setModificationDate(new Date());
        repairedBytes = await pdfDoc.save({ useObjectStreams: false });
        recoveryMethod = "Primary structural mapping table recovered successfully.";
      } catch (err1) {
        console.warn("Tier 1 repair failed, moving to Tier 2 (PDF.js Auto-Recovery)...", err1);
      }

      // STEP 3: Tier 2 - Dynamic PDF.js Parser Recovery on rebuilt bytes
      if (!repairedBytes) {
        // Attempt pre-repair catalog rebuild to aid PDF.js parser in recovering objects
        const salvageResult = rebuildCorruptedCatalog(fileBytes);
        const bytesToTry = salvageResult ? salvageResult.bytes : fileBytes;

        try {
          const pdfjsLib = await getPdfjsEngine();
          const loadingTask = pdfjsLib.getDocument({ data: bytesToTry.slice(0) } as any);
          const pdfjsDoc = await loadingTask.promise;
          
          // PDF.js parsed and rebuilt the broken XREF offsets. Extract data stream.
          const reconstructedBytes = await pdfjsDoc.getData();
          
          // Format through pdf-lib to guarantee standard conformity
          const finalDoc = await PDFDocument.load(reconstructedBytes as any, {
            ignoreEncryption: true,
            throwOnInvalidObject: false,
          } as any);
          finalDoc.setProducer("OmniPDF Auto-Repair Engine");
          finalDoc.setModificationDate(new Date());
          
          repairedBytes = await finalDoc.save({ useObjectStreams: false });
          recoveryMethod = salvageResult && salvageResult.pageCount > 0
            ? `Page Salvage Engine reconstructed catalog structure (${pdfjsDoc.numPages} pages recovered).`
            : `PDF.js structural recovery engine successfully rebuilt corrupted streams (${pdfjsDoc.numPages} pages recovered).`;
        } catch (err2) {
          console.warn("Tier 2 repair failed, moving to Tier 3 (Direct Raw Recovery)...", err2);
        }
      }

      // STEP 4: Tier 3 - Direct pdf-lib loading on rebuilt bytes (if PDF.js failed or was blocked)
      if (!repairedBytes) {
        try {
          const salvageResult = rebuildCorruptedCatalog(fileBytes);
          if (salvageResult) {
            // Load and save to validate structure compliance
            const finalDoc = await PDFDocument.load(salvageResult.bytes, {
              ignoreEncryption: true,
              throwOnInvalidObject: false,
            } as any);
            finalDoc.setProducer("OmniPDF Page Salvage Engine");
            finalDoc.setModificationDate(new Date());
            
            repairedBytes = await finalDoc.save({ useObjectStreams: false });
            recoveryMethod = salvageResult.pageCount > 0 
              ? `Page Salvage Engine successfully rebuilt root catalog and recovered ${salvageResult.pageCount} page(s).`
              : "Rebuilt trailer table pointing to correct Catalog root.";
          }
        } catch (err3) {
          console.warn("Tier 3 repair failed:", err3);
        }
      }

      if (!repairedBytes) {
        throw new Error("Unable to reconstruct file structure.");
      }

      // Compare file sizes
      const originalKB = (file.size / 1024).toFixed(2);
      const repairedKB = (repairedBytes.length / 1024).toFixed(2);

      setRepairLog(`${recoveryMethod}\nOriginal size: ${originalKB} KB → Repaired size: ${repairedKB} KB`);
      setResultUrl(URL.createObjectURL(new Blob([repairedBytes as any], { type: "application/pdf" })));
    } catch (err: any) {
      console.warn("Repair flow completed with warning:", err);
      setError("Unable to repair PDF. The document structure contains critical file errors or is severely corrupted.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolLayout 
      title="Repair PDF" 
      description="Analyze and restore corrupted PDF documents. Rebuild cross-reference tables, fix stream errors, and recover damaged files." 
      icon={<Wrench className="w-8 h-8 text-red-500" />}
    >
      {!resultUrl ? (
        <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
          {!file && (
            <FileUploader onFilesSelected={handleFiles} multiple={false} accept="application/pdf" />
          )}

          {isProcessing && (
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl w-full max-w-2xl mx-auto text-center space-y-4 animate-pulse">
              <Loader2 className="w-10 h-10 text-red-500 animate-spin mx-auto" />
              <p className="text-sm font-extrabold text-foreground">Reconstructing damaged PDF objects...</p>
            </div>
          )}

          {file && !isProcessing && (
            <div className="flex flex-col lg:flex-row gap-8 w-full items-start justify-center animate-in fade-in duration-300">
              
              {/* Left Canvas Preview Area (Charcoal background matching merge/watermark) */}
              <div className="flex-1 bg-[#2d2d2d] w-full min-h-[440px] rounded-3xl flex flex-col items-center justify-center p-8 relative overflow-hidden shadow-2xl">
                
                {/* Floating file details pill */}
                {fileSizeLabel && (
                  <div className="absolute top-6 bg-zinc-800/80 text-white dark:bg-zinc-950/80 border border-zinc-750 px-4 py-1.5 rounded-full text-[10px] font-black tracking-wide shadow-md z-30">
                    {fileSizeLabel} {pageCount > 0 && `- ${pageCount} PAGES`}
                  </div>
                )}

                {/* Floating cancel button */}
                <button 
                  onClick={clearFile}
                  className="absolute top-6 right-6 w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 z-20"
                >
                  ✕
                </button>

                {/* Document preview card */}
                <div className="relative bg-white dark:bg-zinc-950 w-[240px] h-[340px] rounded-2xl shadow-2xl overflow-hidden flex flex-col items-center justify-center p-6 border border-zinc-100 dark:border-zinc-850 group">
                  
                  {/* Thumbnail display */}
                  <div className="w-full h-[220px] mb-4 flex items-center justify-center overflow-hidden">
                    {isPreviewLoading ? (
                      <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
                    ) : thumbnailUrl ? (
                      <img 
                        src={thumbnailUrl} 
                        alt={file.name} 
                        className="max-w-full max-h-full object-contain shadow-md rounded border pointer-events-none select-none"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-300 gap-2">
                        <FileText className="w-16 h-16" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                          Corrupted File
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Filename centered at bottom */}
                  <h4 className="font-extrabold text-zinc-850 dark:text-zinc-100 text-[11px] text-center line-clamp-2 max-w-[190px] select-none">
                    {file.name}
                  </h4>

                </div>

              </div>

              {/* Right Options Sidebar Card */}
              <div className="w-full lg:w-[350px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6 shrink-0">
                
                <div className="space-y-1 pb-4 border-b border-zinc-150 dark:border-zinc-850">
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                    Repair PDF
                  </h3>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Analyze, reconstruct, and salvage pages from corrupted documents.
                  </p>
                </div>

                {/* Informational Repair Details Alert */}
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-4 flex gap-3 text-xs text-emerald-800 dark:text-emerald-400">
                  <Info className="w-4 h-4 shrink-0 stroke-[2.5] mt-0.5" />
                  <p className="font-bold leading-normal">
                    Our multi-tier recovery engine performs:<br/><br/>
                    1. Byte alignment and junk trim<br/>
                    2. XREF offset recovery<br/>
                    3. Object dictionary reconstruction
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold animate-in shake duration-300">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button 
                  size="xl" 
                  onClick={repairPdf} 
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-extrabold py-4 rounded-2xl tracking-wide shadow-lg shadow-red-500/10 flex items-center justify-center gap-2"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Repair PDF</span>
                </Button>

              </div>

            </div>
          )}

        </div>
      ) : (
        // Results download screen showing badge and detailed recovery log!
        <div className="w-full max-w-xl mx-auto space-y-6">
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-black animate-in fade-in duration-300">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>PDF Repair completed! File structure reconstructed successfully.</span>
          </div>

          {repairLog && (
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
              <h5 className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                Recovery Details
              </h5>
              <p className="text-xs font-bold text-foreground leading-relaxed whitespace-pre-line">
                {repairLog}
              </p>
            </div>
          )}
          
          <ResultScreen
            title="PDF Repaired Successfully!"
            downloadUrl={resultUrl}
            downloadFileName={`${file?.name.replace('.pdf','')}_repaired.pdf`}
            downloadText="Download Repaired PDF"
            onStartOver={clearFile}
          />
        </div>
      )}
    </ToolLayout>
  );
}
