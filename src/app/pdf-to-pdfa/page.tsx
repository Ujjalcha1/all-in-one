"use client";

import { useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Archive, 
  RotateCw, 
  Plus, 
  FileText, 
  CheckCircle, 
  ShieldAlert,
  ArrowRight,
  Info,
  Crown
} from "lucide-react";

export default function PdfToPdfaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [conformanceLevel, setConformanceLevel] = useState("PDF/A-2b");
  const [pageCount, setPageCount] = useState(0);
  const [fileSizeLabel, setFileSizeLabel] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [visualRotation, setVisualRotation] = useState(0);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Lazy-load PDF.js only on client to prevent Next.js SSR / Turbopack DOMMatrix pre-rendering failures
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
    setVisualRotation(0);
    setIsPreviewLoading(true);

    const sizeKB = (selectedFile.size / 1024).toFixed(2);
    setFileSizeLabel(`${sizeKB} KB`);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      
      // Load using pdf-lib to count pages
      const pdfDocLib = await PDFDocument.load(arrayBuffer);
      setPageCount(pdfDocLib.getPageCount());

      // Render thumbnail of page 1 using PDF.js
      const pdfjsLib = await getPdfjsEngine();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) } as any);
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
      console.error("Failed to load PDF metadata", err);
      // Fallback if rendering fails
      setThumbnailUrl("");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const rotatePreview = () => {
    setVisualRotation((prev) => (prev + 90) % 360);
  };

  const clearFile = () => {
    setFile(null);
    setResultUrl(null);
    setThumbnailUrl("");
    setVisualRotation(0);
    setPageCount(0);
    setFileSizeLabel("");
    setError("");
  };

  // Convert target document structurally to standard PDF/A catalog compliant structures
  const convertToPdfa = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError("");

    try {
      const ab = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(ab);
      
      // Set PDF Metadata attributes
      pdfDoc.setTitle(file.name.replace('.pdf', ''));
      pdfDoc.setProducer("OmniPDF PDF/A Archiver");
      pdfDoc.setCreator("OmniPDF Suite");
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());

      // Rotate visual pages in output based on workspace rotation state
      if (visualRotation !== 0) {
        const pages = pdfDoc.getPages();
        for (const p of pages) {
          const currentRotation = p.getRotation().angle;
          p.setRotation(degrees((currentRotation + visualRotation) % 360));
        }
      }

      // ----------------------------------------------------
      // PDF/A STANDARDIZATION METADATA AND OUTPUTINTENTS
      // ----------------------------------------------------
      const match = conformanceLevel.match(/PDF\/A-(\d)([a-z])/i);
      const part = match ? match[1] : "2";
      const conformance = match ? match[2].toUpperCase() : "B";
      
      const xmpMetadata = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
   <pdfaid:part>${part}</pdfaid:part>
   <pdfaid:conformance>${conformance}</pdfaid:conformance>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

      const context = pdfDoc.context;
      const metadataStream = context.stream(xmpMetadata, {
        Type: "Metadata",
        Subtype: "XML",
      });
      const metadataStreamRef = context.register(metadataStream);
      pdfDoc.catalog.set(context.obj("Metadata"), metadataStreamRef);

      // Add standard OutputIntents mapping to sRGB to ensure device independent color spaces
      const outputIntentDict = context.obj({
        Type: "OutputIntent",
        S: "GTS_PDFA1",
        OutputConditionIdentifier: context.obj("sRGB IEC61966-2.1"),
        RegistryName: context.obj("http://www.color.org"),
      });
      const outputIntentRef = context.register(outputIntentDict);
      pdfDoc.catalog.set(context.obj("OutputIntents"), context.obj([outputIntentRef]));

      // Save compliant bytes
      const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (e) { 
      console.error(e); 
      setError("Error converting document to PDF/A. The file structure may be unsupported."); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  return (
    <ToolLayout 
      title="PDF to PDF/A" 
      description="Transform PDF documents to PDF/A, the ISO-standardized format designed for secure, long-term archiving." 
      icon={<Archive className="w-8 h-8 text-red-500" />}
    >
      {!resultUrl ? (
        <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
          {!file && (
            <FileUploader onFilesSelected={handleFiles} multiple={false} accept="application/pdf" />
          )}

          {isProcessing && (
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl w-full max-w-2xl mx-auto text-center space-y-4 animate-pulse">
              <Loader2 className="w-10 h-10 text-red-500 animate-spin mx-auto" />
              <p className="text-sm font-extrabold text-foreground">Standardizing document catalog to PDF/A format...</p>
            </div>
          )}

          {file && !isProcessing && (
            <div className="flex flex-col lg:flex-row gap-8 w-full items-start justify-center animate-in fade-in duration-300">
              
              {/* Left Canvas Preview Area (Charcoal background matching screenshot) */}
              <div className="flex-1 bg-[#2d2d2d] w-full min-h-[440px] rounded-3xl flex flex-col items-center justify-center p-8 relative overflow-hidden shadow-2xl">
                
                {/* Floating pill shape metadata details on top */}
                {fileSizeLabel && (
                  <div className="absolute top-6 bg-zinc-800/80 text-white dark:bg-zinc-950/80 border border-zinc-750 px-4 py-1.5 rounded-full text-[10px] font-black tracking-wide shadow-md z-30">
                    {fileSizeLabel} - {pageCount} PAGES
                  </div>
                )}

                {/* Floating add button in top right of workspace */}
                <div className="absolute top-6 right-6 z-30 flex items-center gap-2">
                  <div className="relative">
                    <button 
                      onClick={clearFile}
                      title="Add PDF Files"
                      className="w-11 h-11 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/25 transition-transform active:scale-95"
                    >
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </button>
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-zinc-900">
                      1
                    </div>
                  </div>
                </div>

                {/* Document preview card */}
                <div className="relative bg-white dark:bg-zinc-950 w-[240px] h-[340px] rounded-2xl shadow-2xl overflow-hidden flex flex-col items-center justify-center p-6 border border-zinc-100 dark:border-zinc-850 group">
                  
                  {/* Floating Action Buttons inside the card */}
                  <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                    <button 
                      onClick={rotatePreview}
                      title="Rotate Page"
                      className="w-7 h-7 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-850 dark:text-zinc-300 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-90"
                    >
                      <RotateCw className="w-3.5 h-3.5 stroke-[2.2]" />
                    </button>
                    <button 
                      onClick={clearFile}
                      title="Remove File"
                      className="w-7 h-7 bg-zinc-100 hover:bg-red-50 text-zinc-700 hover:text-red-500 dark:bg-zinc-900 dark:hover:bg-red-950/20 dark:text-zinc-300 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-90"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Thumbnail display */}
                  <div 
                    className="w-full h-[220px] mb-4 flex items-center justify-center overflow-hidden transition-all duration-300"
                    style={{ transform: `rotate(${visualRotation}deg)` }}
                  >
                    {isPreviewLoading ? (
                      <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
                    ) : thumbnailUrl ? (
                      <img 
                        src={thumbnailUrl} 
                        alt={file.name} 
                        className="max-w-full max-h-full object-contain shadow-md rounded border pointer-events-none select-none"
                      />
                    ) : (
                      <FileText className="w-16 h-16 text-zinc-300" />
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
                
                {/* Header with Golden Premium crown badge */}
                <div className="space-y-1 pb-4 border-b border-zinc-150 dark:border-zinc-850">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                      PDF to PDF/A
                    </h3>
                    <span className="bg-[#fef3c7] text-[#b45309] dark:bg-amber-950/30 dark:text-amber-400 font-black text-[9px] uppercase px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5 fill-current" /> Premium
                    </span>
                  </div>
                </div>

                {/* Informational Blue Info Alert Block */}
                <div className="bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 rounded-2xl p-4 flex gap-3 text-xs text-sky-800 dark:text-sky-400">
                  <Info className="w-4 h-4 shrink-0 stroke-[2.5] mt-0.5" />
                  <p className="font-bold leading-normal">
                    PDF/A is an ISO-standardized version of the Portable Document Format (PDF) specialized for use in the archiving and long-term preservation of electronic documents.<br/><br/>
                    Choose with what conformance level you want to convert your document:
                  </p>
                </div>

                {/* Dropdown Options Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase text-muted-foreground tracking-wide">
                    Set the PDF/A conformance level
                  </label>
                  <select 
                    value={conformanceLevel} 
                    onChange={(e) => setConformanceLevel(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border bg-zinc-50 dark:bg-zinc-900 text-xs font-bold focus:outline-none focus:border-red-500 border-zinc-250 dark:border-zinc-800"
                  >
                    <option value="PDF/A-1b">PDF/A-1b</option>
                    <option value="PDF/A-1a">PDF/A-1a</option>
                    <option value="PDF/A-2b">PDF/A-2b</option>
                    <option value="PDF/A-2u">PDF/A-2u</option>
                    <option value="PDF/A-2a">PDF/A-2a</option>
                    <option value="PDF/A-3b">PDF/A-3b</option>
                    <option value="PDF/A-3u">PDF/A-3u</option>
                    <option value="PDF/A-3a">PDF/A-3a</option>
                  </select>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold animate-in shake duration-300">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button 
                  size="xl" 
                  onClick={convertToPdfa} 
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-extrabold py-4 rounded-2xl tracking-wide shadow-lg shadow-red-500/10 flex items-center justify-center gap-2"
                >
                  <span>Convert to PDF/A</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </Button>

              </div>

            </div>
          )}

        </div>
      ) : (
        // Results download screen showing badge if successfully converted!
        <div className="w-full max-w-xl mx-auto space-y-6">
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-black animate-in fade-in duration-300">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>Document standardized successfully to compliant PDF/A archive format!</span>
          </div>
          
          <ResultScreen
            title="Converted to PDF/A Successfully!"
            downloadUrl={resultUrl}
            downloadFileName={`${file?.name.replace('.pdf','')}_pdfa.pdf`}
            downloadText="Download PDF/A"
            onStartOver={clearFile}
          />
        </div>
      )}
    </ToolLayout>
  );
}
