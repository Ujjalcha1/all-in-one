"use client";

import { useState, useRef } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  LayoutGrid, 
  Trash2, 
  RotateCw, 
  Plus, 
  ArrowUpDown, 
  FileText, 
  CheckCircle, 
  ShieldAlert,
  ArrowRight,
  GripVertical
} from "lucide-react";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  letter: string; // A, B, C...
  pageCount: number;
  arrayBuffer: ArrayBuffer;
}

interface PageItem {
  id: string;
  fileId: string;
  fileLetter: string;
  originalIndex: number;
  thumbnailUrl: string;
  rotation: number; // 0, 90, 180, 270
}

export default function OrganizePDFPage() {
  const [filesList, setFilesList] = useState<UploadedFile[]>([]);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Lazy-load PDF.js only in client context to satisfy SSR rules
  const getPdfjsEngine = async () => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    return pdfjsLib;
  };

  const getNextLetter = (index: number) => {
    return String.fromCharCode(65 + index); // 65 is 'A'
  };

  // Extract pages and render thumbnails asynchronously
  const loadPdfPages = async (file: File, letter: string, fileId: string) => {
    const arrayBuffer = await file.arrayBuffer();
    
    // Load with pdf-lib to get count
    const pdfDocLib = await PDFDocument.load(arrayBuffer);
    const count = pdfDocLib.getPageCount();
    
    // Load with PDF.js for visual thumbnails
    const pdfjsLib = await getPdfjsEngine();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) } as any);
    const pdfjsDoc = await loadingTask.promise;
    
    const renderedPages: PageItem[] = [];
    for (let i = 0; i < count; i++) {
      let thumbnailUrl = "";
      try {
        const page = await pdfjsDoc.getPage(i + 1);
        const viewport = page.getViewport({ scale: 0.25 }); // Low scale is extremely fast
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport } as any).promise;
          thumbnailUrl = canvas.toDataURL("image/jpeg", 0.7);
        }
      } catch (err) {
        console.error("Failed to render page thumbnail", i, err);
      }
      
      renderedPages.push({
        id: `${fileId}-${i}-${Math.random()}`,
        fileId,
        fileLetter: letter,
        originalIndex: i,
        thumbnailUrl,
        rotation: 0,
      });
    }
    return { pageCount: count, pages: renderedPages, arrayBuffer };
  };

  const processFiles = async (newFiles: File[]) => {
    setIsProcessing(true);
    setError("");
    setStatusMessage("Extracting and rendering PDF pages...");

    try {
      const loadedFiles: UploadedFile[] = [];
      const allNewPages: PageItem[] = [];
      
      for (let idx = 0; idx < newFiles.length; idx++) {
        const file = newFiles[idx];
        const letter = getNextLetter(filesList.length + loadedFiles.length);
        const fileId = `file-${Date.now()}-${idx}`;
        
        const { pageCount, pages: newPages, arrayBuffer } = await loadPdfPages(file, letter, fileId);
        
        loadedFiles.push({
          id: fileId,
          name: file.name,
          size: file.size,
          letter,
          pageCount,
          arrayBuffer,
        });
        
        allNewPages.push(...newPages);
      }
      
      setFilesList((prev) => [...prev, ...loadedFiles]);
      setPages((prev) => [...prev, ...allNewPages]);
    } catch (err) {
      console.error(err);
      setError("Failed to load PDF documents. Files might be password-protected or corrupted.");
    } finally {
      setIsProcessing(false);
      setStatusMessage("");
    }
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    processFiles(selectedFiles);
  };

  // Add more files from workspace button
  const triggerAddFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAddFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  // Reset all uploads
  const resetAll = () => {
    setFilesList([]);
    setPages([]);
    setResultUrl(null);
    setError("");
  };

  // Remove single file
  const removeFile = (fileId: string) => {
    const updatedFiles = filesList.filter((f) => f.id !== fileId).map((f, idx) => ({
      ...f,
      letter: getNextLetter(idx),
    }));
    
    setFilesList(updatedFiles);
    
    setPages((prev) => {
      const filtered = prev.filter((p) => p.fileId !== fileId);
      return filtered.map((p) => {
        const match = updatedFiles.find((f) => f.id === p.fileId);
        return {
          ...p,
          fileLetter: match ? match.letter : p.fileLetter,
        };
      });
    });
  };

  // Page manipulation actions
  const rotatePage = (id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const removePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleSortOrder = () => {
    setPages((prev) => [...prev].reverse());
  };

  // Drag and Drop ordering handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedPageId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    
    setPages((prev) => {
      const list = [...prev];
      const draggedIdx = list.findIndex((p) => p.id === id);
      if (draggedIdx === -1) return prev;
      const [draggedItem] = list.splice(draggedIdx, 1);
      list.splice(index, 0, draggedItem);
      return list;
    });
    setDraggedPageId(null);
  };

  const compileOrganizedPdf = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);
    setError("");
    setStatusMessage("Compiling your organized PDF document...");

    try {
      const newDoc = await PDFDocument.create();
      const docCache: { [id: string]: PDFDocument } = {};

      for (const fileObj of filesList) {
        docCache[fileObj.id] = await PDFDocument.load(fileObj.arrayBuffer);
      }

      for (const page of pages) {
        const srcDoc = docCache[page.fileId];
        if (!srcDoc) continue;

        const [copiedPage] = await newDoc.copyPages(srcDoc, [page.originalIndex]);
        if (page.rotation !== 0) {
          copiedPage.setRotation(degrees(page.rotation));
        }
        newDoc.addPage(copiedPage);
      }

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      console.error(err);
      setError("Error building PDF document. A source file may be corrupted.");
    } finally {
      setIsProcessing(false);
      setStatusMessage("");
    }
  };

  return (
    <ToolLayout 
      title="Organize PDF" 
      description="Sort, rotate, add or delete PDF pages. Drag and reorder pages to organize your documents exactly as you need." 
      icon={<LayoutGrid className="w-8 h-8 text-red-500" />}
    >
      <input 
        type="file" 
        multiple 
        accept="application/pdf" 
        ref={fileInputRef} 
        onChange={handleAddFileChange} 
        className="hidden" 
      />

      {!resultUrl ? (
        <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
          {filesList.length === 0 && (
            <FileUploader onFilesSelected={handleFilesSelected} multiple={true} accept="application/pdf" />
          )}

          {isProcessing && (
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl w-full max-w-2xl mx-auto text-center space-y-4 animate-pulse">
              <Loader2 className="w-10 h-10 text-red-500 animate-spin mx-auto" />
              <p className="text-sm font-extrabold text-foreground">{statusMessage || "Processing documents..."}</p>
            </div>
          )}

          {filesList.length > 0 && !isProcessing && (
            <div className="flex flex-col lg:flex-row gap-8 w-full items-start justify-center animate-in fade-in duration-300">
              
              {/* Left Canvas Preview Area (Charcoal/White workspace matching screenshot) */}
              <div className="flex-1 bg-zinc-50 dark:bg-zinc-900/30 w-full min-h-[500px] rounded-3xl p-8 relative shadow-inner border border-zinc-150 dark:border-zinc-800">
                
                {/* Floating buttons block (Top Right) */}
                <div className="absolute top-6 right-6 flex items-center gap-3 z-30">
                  {/* White circular sorting toggle button */}
                  <button 
                    onClick={toggleSortOrder}
                    title="Sort Pages Order"
                    className="w-11 h-11 bg-white hover:bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300 rounded-full flex items-center justify-center shadow-lg border border-zinc-200 dark:border-zinc-800 transition-transform active:scale-95"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                  </button>

                  {/* Red circular add button */}
                  <div className="relative">
                    <button 
                      onClick={triggerAddFileInput}
                      title="Add PDF Files"
                      className="w-11 h-11 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/25 transition-transform active:scale-95"
                    >
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </button>
                    {/* Dark counter tag bubble */}
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-zinc-900">
                      {filesList.length}
                    </div>
                  </div>
                </div>

                {/* Pages grid container */}
                {pages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[350px] text-center space-y-2">
                    <FileText className="w-12 h-12 text-zinc-300" />
                    <p className="text-sm font-extrabold text-muted-foreground">All pages removed. Upload more files to build a new PDF.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-6 pt-12">
                    {pages.map((page, idx) => (
                      <div 
                        key={page.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, page.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, idx)}
                        className={`flex flex-col items-center group cursor-grab active:cursor-grabbing transition-opacity duration-200 ${
                          draggedPageId === page.id ? "opacity-35" : ""
                        }`}
                      >
                        {/* Page Preview Card with Red/Pink border matching iLovePDF exactly! */}
                        <div 
                          className="relative w-full aspect-[1/1.414] bg-white dark:bg-zinc-950 rounded-2xl shadow-md border-2 border-pink-200 dark:border-pink-900/40 group-hover:border-red-400 dark:group-hover:border-red-500/60 overflow-hidden flex items-center justify-center transition-all duration-200"
                          style={{ transform: `rotate(${page.rotation}deg)` }}
                        >
                          {page.thumbnailUrl ? (
                            <img 
                              src={page.thumbnailUrl} 
                              alt={`Page ${idx + 1}`} 
                              className="w-full h-full object-contain pointer-events-none select-none"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-zinc-300 gap-1 select-none">
                              <FileText className="w-8 h-8" />
                              <span className="text-[10px] font-black">PAGE</span>
                            </div>
                          )}

                          {/* Hover Operations Overlay */}
                          <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2.5 z-10">
                            {/* Rotate Button */}
                            <button 
                              onClick={(e) => { e.stopPropagation(); rotatePage(page.id); }}
                              title="Rotate Page"
                              className="w-8 h-8 bg-white hover:bg-zinc-100 text-zinc-800 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-90"
                            >
                              <RotateCw className="w-4 h-4 stroke-[2.5]" />
                            </button>
                            {/* Delete Button */}
                            <button 
                              onClick={(e) => { e.stopPropagation(); removePage(page.id); }}
                              title="Remove Page"
                              className="w-8 h-8 bg-white hover:bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-90"
                            >
                              <Trash2 className="w-4 h-4 stroke-[2.5]" />
                            </button>
                          </div>

                          {/* Colored tag tag pill representing page source (Letter code) */}
                          <div className="absolute top-2 left-2 px-2 py-0.5 bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-400 border border-pink-200 dark:border-pink-900 text-[9px] font-black rounded-md tracking-wider">
                            File {page.fileLetter}
                          </div>
                        </div>

                        {/* Page number centered below preview */}
                        <span className="text-xs font-black text-zinc-400 dark:text-zinc-500 mt-2 select-none">
                          {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* Right Options Sidebar Panel matching screenshot */}
              <div className="w-full lg:w-[350px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6 shrink-0">
                
                <div className="space-y-1 pb-4 border-b border-zinc-150 dark:border-zinc-850">
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                    Organize PDF
                  </h3>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Manage multiple documents, drag pages to reorder, and click Organize below.
                  </p>
                </div>

                {/* Files Section with Reset all tag */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-muted-foreground">
                    <span>Files:</span>
                    <button 
                      onClick={resetAll}
                      className="text-red-500 hover:text-red-600 underline cursor-pointer normal-case font-black"
                    >
                      Reset all
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {filesList.map((fileObj) => (
                      <div 
                        key={fileObj.id}
                        className="flex items-center justify-between p-3 bg-pink-50 border border-pink-100 dark:bg-pink-950/20 dark:border-pink-900/30 text-pink-700 dark:text-pink-400 rounded-2xl text-xs font-bold"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <GripVertical className="w-4 h-4 shrink-0 text-pink-300 dark:text-pink-800 cursor-grab" />
                          <span className="px-1.5 py-0.5 bg-pink-200 dark:bg-pink-900 text-pink-800 dark:text-pink-300 text-[10px] font-black rounded-md shrink-0">
                            {fileObj.letter}
                          </span>
                          <span className="truncate pr-2">{fileObj.name}</span>
                        </div>
                        <button 
                          onClick={() => removeFile(fileObj.id)}
                          title="Remove Document"
                          className="text-pink-400 hover:text-pink-600 dark:hover:text-pink-300 shrink-0 font-extrabold text-sm px-1.5"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold animate-in shake duration-300">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button 
                  size="xl" 
                  onClick={compileOrganizedPdf} 
                  disabled={pages.length === 0}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:bg-zinc-150 disabled:text-zinc-400 disabled:shadow-none dark:disabled:bg-zinc-900 dark:disabled:text-zinc-650 text-white font-extrabold py-4 rounded-2xl tracking-wide shadow-lg shadow-red-500/10 flex items-center justify-center gap-2"
                >
                  <span>Organize</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </Button>

              </div>

            </div>
          )}

        </div>
      ) : (
        // Results download screen showing badge if successfully organized!
        <div className="w-full max-w-xl mx-auto space-y-6">
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-black animate-in fade-in duration-300">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>PDF Pages organized successfully! Output compiled to a single document.</span>
          </div>
          
          <ResultScreen
            title="PDF Organized Successfully!"
            downloadUrl={resultUrl}
            downloadFileName="organized_document.pdf"
            downloadText="Download PDF"
            onStartOver={resetAll}
          />
        </div>
      )}
    </ToolLayout>
  );
}
