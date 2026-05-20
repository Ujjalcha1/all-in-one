"use client";

import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Minimize2, Check, Plus, Trash2, ArrowLeft, Cloud, Link2, Box, SplitSquareHorizontal, Layers, Hash, Droplet, RotateCw, Shield } from "lucide-react";

interface PdfItem {
  id: string;
  file: File;
  thumbnail: string | null;
  pageCount: number;
}

type CompressionLevel = "extreme" | "recommended" | "less";

async function generateThumbnail(file: File): Promise<{ thumbnail: string; pageCount: number }> {
  const pdfjsLib = await import("pdfjs-dist");
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  const ab = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
  const page = await pdf.getPage(1);
  const vp = page.getViewport({ scale: 0.4 });
  const canvas = document.createElement("canvas");
  canvas.width = vp.width;
  canvas.height = vp.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
  return { thumbnail: canvas.toDataURL("image/png"), pageCount: pdf.numPages };
}

export default function CompressPDFPage() {
  const [items, setItems] = useState<PdfItem[]>([]);
  const [level, setLevel] = useState<CompressionLevel>("recommended");
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<{ original: number; compressed: number } | null>(null);

  const handleFilesSelected = useCallback(async (newFiles: File[]) => {
    setResultUrl(null);
    setStats(null);
    const newItems: PdfItem[] = [];
    for (const file of newFiles) {
      const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      newItems.push({ id, file, thumbnail: null, pageCount: 0 });
    }
    setItems((prev) => [...prev, ...newItems]);

    // Generate thumbnails in background
    for (const item of newItems) {
      try {
        const { thumbnail, pageCount } = await generateThumbnail(item.file);
        setItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, thumbnail, pageCount } : p))
        );
      } catch (e) {
        console.error("Failed to generate thumbnail for", item.file.name, e);
      }
    }
  }, []);

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setResultUrl(null);
    setStats(null);
  };

  const compressPdf = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);
    try {
      let totalOriginalSize = 0;
      let totalCompressedSize = 0;
      
      const processCompression = async (file: File, compLevel: CompressionLevel): Promise<Uint8Array> => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("action", "compress");
        formData.append("level", compLevel);

        const response = await fetch("/api/process-pdf", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.details || `Server failed with status ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      };

      if (items.length === 1) {
        const item = items[0];
        const compressedBytes = await processCompression(item.file, level);
        totalOriginalSize = item.file.size;
        totalCompressedSize = compressedBytes.length;
        
        const blob = new Blob([compressedBytes as unknown as BlobPart], { type: "application/pdf" });
        setResultUrl(URL.createObjectURL(blob));
      } else {
        const zip = new JSZip();
        for (const item of items) {
          const compressedBytes = await processCompression(item.file, level);
          totalOriginalSize += item.file.size;
          totalCompressedSize += compressedBytes.length;
          zip.file(`compressed_${item.file.name}`, compressedBytes);
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        setResultUrl(URL.createObjectURL(zipBlob));
      }

      setStats({ original: totalOriginalSize, compressed: totalCompressedSize });
    } catch (error: any) {
      console.error(error);
      alert("Error compressing PDF: " + (error?.message || error));
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  return (
    <ToolLayout title="Compress PDF" description="Reduce file size while optimizing for maximal PDF quality." icon={<Minimize2 className="w-8 h-8" />}>
      {items.length === 0 ? (
        <FileUploader onFilesSelected={handleFilesSelected} multiple={true} accept="application/pdf" />
      ) : !resultUrl ? (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Previews */}
          <div className="flex-1 min-w-0 bg-secondary/20 rounded-2xl p-6 min-h-[400px] flex content-center justify-center flex-wrap gap-4">
            {items.map((item, idx) => (
              <div key={item.id} className="relative group w-36 h-48 md:w-48 md:h-64 shrink-0 transition-transform hover:scale-[1.02]">
                <div className="absolute -top-3 -right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => removeItem(item.id)} className="bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="absolute top-2 left-2 z-10">
                  <div className="bg-black/70 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                    {idx + 1}
                  </div>
                </div>

                <div className="w-full h-full bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden flex flex-col">
                  <div className="flex-1 bg-muted/30 flex items-center justify-center p-2 overflow-hidden">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.file.name} className="w-full h-full object-contain drop-shadow-sm" draggable={false} />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="text-xs">Loading...</span>
                      </div>
                    )}
                  </div>
                  <div className="px-2 py-2 border-t bg-card">
                    <p className="text-xs font-medium truncate text-center" title={item.file.name}>{item.file.name}</p>
                    <p className="text-[10px] text-muted-foreground text-center mt-0.5">{formatSize(item.file.size)}</p>
                  </div>
                </div>
              </div>
            ))}
            
            <label className="w-36 h-48 md:w-48 md:h-64 border-2 border-dashed border-red-300 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-red-50/50 hover:border-red-400 transition-colors shrink-0">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 shadow-sm">
                <Plus className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-red-600">Add More</span>
              <input
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFilesSelected(Array.from(e.target.files));
                    e.target.value = "";
                  }
                }}
              />
            </label>
          </div>

          {/* Right: Controls */}
          <div className="w-full lg:w-80 xl:w-96 shrink-0">
            <div className="bg-card border rounded-2xl shadow-sm overflow-hidden sticky top-20">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-center">Compression level</h2>
              </div>
              
              <div className="flex flex-col">
                <button 
                  onClick={() => setLevel("extreme")}
                  className={`p-5 text-left border-b transition-colors relative ${level === "extreme" ? "bg-muted" : "hover:bg-muted/50"}`}
                >
                  <h3 className="font-semibold text-red-500 mb-1">EXTREME COMPRESSION</h3>
                  <p className="text-sm text-muted-foreground">Less quality, high compression</p>
                  {level === "extreme" && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white shadow-sm">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>
                
                <button 
                  onClick={() => setLevel("recommended")}
                  className={`p-5 text-left border-b transition-colors relative ${level === "recommended" ? "bg-muted" : "hover:bg-muted/50"}`}
                >
                  <h3 className="font-semibold text-red-500 mb-1">RECOMMENDED COMPRESSION</h3>
                  <p className="text-sm text-muted-foreground">Good quality, good compression</p>
                  {level === "recommended" && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white shadow-sm">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>
                
                <button 
                  onClick={() => setLevel("less")}
                  className={`p-5 text-left transition-colors relative ${level === "less" ? "bg-muted" : "hover:bg-muted/50"}`}
                >
                  <h3 className="font-semibold text-red-500 mb-1">LESS COMPRESSION</h3>
                  <p className="text-sm text-muted-foreground">High quality, less compression</p>
                  {level === "less" && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white shadow-sm">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>
              </div>

              <div className="p-6 bg-card border-t mt-4">
                <Button 
                  size="xl" 
                  variant="hero" 
                  onClick={compressPdf} 
                  disabled={isProcessing} 
                  className="w-full bg-red-600 hover:bg-red-700 shadow-red-600/20 py-7 text-lg rounded-xl"
                >
                  {isProcessing ? (
                    <><Loader2 className="mr-2 h-6 w-6 animate-spin" />Compressing...</>
                  ) : (
                    <>Compress PDF <Download className="ml-2 h-6 w-6 rotate-[-90deg]" /></>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <ResultScreen
          title="PDFs have been compressed!"
          downloadUrl={resultUrl!}
          downloadFileName={items.length === 1 ? `${items[0].file.name.replace('.pdf','')}_compressed.pdf` : "compressed_pdfs.zip"}
          downloadText={items.length === 1 ? "Download compressed PDF" : "Download compressed PDFs"}
          onStartOver={() => { setItems([]); setResultUrl(null); setStats(null); }}
        >
          {stats && (
            <div className="flex items-center gap-6 mb-14">
              <div className="relative w-[100px] h-[100px] flex items-center justify-center rounded-full border-[8px] border-[#e8e8eb] shrink-0">
                <div 
                  className="absolute inset-[-8px] rounded-full border-[8px] border-[#e5322d] border-t-transparent border-r-transparent rotate-45 transition-all duration-1000"
                ></div>
                <div className="text-center relative z-10 flex flex-col items-center">
                  <div className="text-[22px] font-extrabold text-[#33333b] dark:text-gray-100 leading-none mb-1">{stats.compressed < stats.original ? Math.round((1 - stats.compressed / stats.original) * 100) : 0}%</div>
                  <div className="text-[9px] font-bold text-[#707078] tracking-[0.1em]">SAVED</div>
                </div>
              </div>
              <div>
                <p className="text-[#707078] text-[15px] mb-1">Your PDF are now {stats.compressed < stats.original ? Math.round((1 - stats.compressed / stats.original) * 100) : 0}% smaller!</p>
                <p className="text-[#33333b] dark:text-gray-200 font-semibold text-[15px]">{(stats.original / 1024).toFixed(2)} KB ➔ {(stats.compressed / 1024).toFixed(2)} KB</p>
              </div>
            </div>
          )}
        </ResultScreen>
      )}
    </ToolLayout>
  );
}
