"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Trash2, RotateCw, GripVertical, Plus, Layers } from "lucide-react";

interface PdfItem {
  id: string;
  file: File;
  thumbnail: string | null;
  pageCount: number;
  rotation: number;
}

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

export default function MergePDFPage() {
  const [items, setItems] = useState<PdfItem[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleFilesSelected = useCallback(async (newFiles: File[]) => {
    setMergedPdfUrl(null);
    const newItems: PdfItem[] = [];
    for (const file of newFiles) {
      const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      newItems.push({ id, file, thumbnail: null, pageCount: 0, rotation: 0 });
    }
    setItems((prev) => [...prev, ...newItems]);

    // Generate thumbnails in background
    for (const item of newItems) {
      try {
        const { thumbnail, pageCount } = await generateThumbnail(item.file);
        setItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, thumbnail, pageCount } : p))
        );
      } catch {
        // Failed to generate thumbnail, leave as null
      }
    }
  }, []);

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setMergedPdfUrl(null);
  };

  const rotateItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, rotation: (item.rotation + 90) % 360 } : item))
    );
    setMergedPdfUrl(null);
  };

  // Drag and drop reorder
  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(null);
    setDragOverIdx(null);
    setMergedPdfUrl(null);
  };
  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const mergePdfs = async () => {
    if (items.length < 2) {
      alert("Please select at least 2 PDF files to merge.");
      return;
    }
    setIsMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const item of items) {
        const arrayBuffer = await item.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => {
          if (item.rotation !== 0) {
            const current = page.getRotation().angle;
            page.setRotation(degrees(current + item.rotation));
          }
          mergedPdf.addPage(page);
        });
      }
      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes as unknown as BlobPart], { type: "application/pdf" });
      setMergedPdfUrl(URL.createObjectURL(blob));
    } catch (error) {
      console.error("Error merging PDFs:", error);
      alert("An error occurred while merging the PDFs.");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <ToolLayout
      title="Merge PDF"
      description="Combine PDFs in the order you want with the easiest PDF merger available."
      icon={<Layers className="w-8 h-8" />}
    >
      {!mergedPdfUrl ? (
        <div className="flex flex-col gap-8">
          <FileUploader onFilesSelected={handleFilesSelected} multiple accept="application/pdf" />

          {items.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">
                  {items.length} PDF{items.length !== 1 ? "s" : ""} selected
                  <span className="text-muted-foreground font-normal text-sm ml-2">
                    ({items.reduce((sum, i) => sum + i.pageCount, 0)} total pages)
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground">Drag to reorder</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    className={`
                      group relative bg-card border-2 rounded-xl overflow-hidden shadow-sm
                      transition-all duration-200 cursor-grab active:cursor-grabbing
                      hover:shadow-lg hover:-translate-y-1 hover:border-primary/40
                      ${dragIdx === idx ? "opacity-40 scale-95" : ""}
                      ${dragOverIdx === idx && dragIdx !== idx ? "border-primary ring-2 ring-primary/20 scale-105" : "border-border/60"}
                    `}
                  >
                    {/* Drag handle */}
                    <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black/60 text-white rounded-md p-1">
                        <GripVertical className="h-4 w-4" />
                      </div>
                    </div>

                    {/* Order badge */}
                    <div className="absolute top-2 right-2 z-10">
                      <div className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                        {idx + 1}
                      </div>
                    </div>

                    {/* Thumbnail */}
                    <div className="aspect-[3/4] bg-muted flex items-center justify-center overflow-hidden">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.file.name}
                          className="w-full h-full object-contain"
                          style={{ transform: `rotate(${item.rotation}deg)` }}
                          draggable={false}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="text-xs">Loading...</span>
                        </div>
                      )}
                    </div>

                    {/* Info & actions */}
                    <div className="p-2.5 space-y-2">
                      <p className="text-xs font-medium truncate" title={item.file.name}>
                        {item.file.name}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          {item.pageCount > 0 ? `${item.pageCount} pg` : "..."} · {(item.file.size / 1024).toFixed(0)}KB
                        </span>
                        <div className="flex gap-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); rotateItem(item.id); }}
                            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Rotate 90°"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                            className="p-1 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {item.rotation !== 0 && (
                        <div className="text-[10px] text-primary font-medium">
                          ↻ Rotated {item.rotation}°
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add more button */}
                <label className="aspect-[3/4] border-2 border-dashed border-border/60 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Add More</span>
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

              <div className="flex justify-end pt-2">
                <Button
                  size="xl"
                  variant="hero"
                  onClick={mergePdfs}
                  disabled={items.length < 2 || isMerging}
                >
                  {isMerging ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Merging {items.length} PDFs...
                    </>
                  ) : (
                    `Merge ${items.length} PDFs`
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <ResultScreen
          title="PDFs merged successfully!"
          downloadUrl={mergedPdfUrl}
          downloadFileName={"merged.pdf"}
          downloadText="Download merged PDF"
          onStartOver={() => {
                setItems([]);
                setMergedPdfUrl(null);
              }}
        />
      )}
    </ToolLayout>
  );
}
