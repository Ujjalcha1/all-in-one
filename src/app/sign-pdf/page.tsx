"use client";

import { useState, useRef, useEffect } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import { Loader2, PenTool, CheckCircle2, User, Users, GripVertical, Check, Trash2, Calendar, FileText, Printer, Image as ImageIcon } from "lucide-react";

interface SignatureStyle {
  fontFamily: string;
  className: string;
}

interface DraggedField {
  id: string;
  type: "signature" | "initials" | "name" | "date" | "text" | "stamp";
  x: number; // percent 0-100
  y: number; // percent 0-100
  width: number;
  height: number;
  page: number;
  text?: string; // Custom user editable text value
}

export default function SignPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // PDF Page structures parsed via pdf.js
  const [pageCount, setPageCount] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [activePage, setActivePage] = useState<number>(1);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfDocInstance, setPdfDocInstance] = useState<any>(null);

  // High-fidelity active page canvas preview
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRenderingPage, setIsRenderingPage] = useState(false);

  // Wizard Flow States
  const [wizardStep, setWizardStep] = useState<"upload" | "choice" | "details" | "request" | "editor">("upload");
  const [signName, setSignName] = useState("");
  const [signInitials, setSignInitials] = useState("U");
  const [activeTab, setActiveTab] = useState<"signature" | "initials" | "stamp">("signature");
  const [selectedStyleIndex, setSelectedStyleIndex] = useState(0);
  const [signatureColor, setSignatureColor] = useState("#1e3a8a"); // Navy Blue
  const [stampImgUrl, setStampImgUrl] = useState<string | null>(null); // Real company stamp OLE image upload

  // Hook to draw active page onto workspace canvas with retina sharpness
  useEffect(() => {
    if (!pdfDocInstance || wizardStep !== "editor") return;

    const renderActivePage = async () => {
      setIsRenderingPage(true);
      try {
        const page = await pdfDocInstance.getPage(activePage);
        // Render at crisp retina 1.5x resolution scale
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: ctx, viewport }).promise;
          }
        }
      } catch (e) {
        console.error("Failed to render sharp PDF page preview:", e);
      } finally {
        setIsRenderingPage(false);
      }
    };

    renderActivePage();
  }, [pdfDocInstance, activePage, wizardStep]);

  // Draggable fields on editor canvas
  const [placedFields, setPlacedFields] = useState<DraggedField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Signature script font presets
  const signatureFonts: SignatureStyle[] = [
    { fontFamily: "'Dancing Script', cursive", className: "font-[family-name:var(--font-dancing-script)]" },
    { fontFamily: "'Alex Brush', cursive", className: "font-[family-name:var(--font-alex-brush)]" },
    { fontFamily: "'Great Vibes', cursive", className: "font-[family-name:var(--font-great-vibes)]" },
    { fontFamily: "'Sacramento', cursive", className: "font-[family-name:var(--font-sacramento)]" },
  ];

  // Colors available for signing
  const availableColors = ["#171717", "#dc2626", "#2563eb", "#16a34a"]; // Charcoal, Red, Blue, Green

  // Receiver list for several people path
  const [receivers, setReceivers] = useState<{ id: string; name: string; email: string }[]>([
    { id: "1", name: "", email: "" }
  ]);

  const addReceiver = () => {
    setReceivers([...receivers, { id: crypto.randomUUID(), name: "", email: "" }]);
  };

  const handleFiles = async (files: File[]) => {
    const selectedFile = files[0];
    setFile(selectedFile);
    setResultUrl(null);
    setPlacedFields([]);
    setIsLoadingPdf(true);
    setWizardStep("choice");

    // Load PDF page details and generate page thumbnails dynamically
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPageCount(pdf.numPages);
      setPdfDocInstance(pdf);

      const tempThumbs: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.25 }); // Low scale for thumbnail list speed
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          tempThumbs.push(canvas.toDataURL("image/jpeg", 0.7));
        }
      }
      setThumbnails(tempThumbs);
    } catch (e) {
      console.error("Failed to parse PDF pages:", e);
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // Add signature or initial details to the placed fields array
  const addFieldToWorkspace = (type: DraggedField["type"]) => {
    let initialText = "";
    if (type === "name") initialText = signName;
    else if (type === "date") initialText = new Date().toISOString().split("T")[0];
    else if (type === "text") initialText = "Type here...";

    const newField: DraggedField = {
      id: crypto.randomUUID(),
      type,
      x: 35 + Math.random() * 15,
      y: 40 + Math.random() * 15,
      width: type === "signature" ? 180 : type === "initials" ? 80 : type === "stamp" ? 140 : 120,
      height: type === "signature" ? 60 : type === "initials" ? 50 : type === "stamp" ? 70 : 40,
      page: activePage,
      text: initialText
    };
    setPlacedFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  // Drag and Drop implementation inside workspace
  const handleFieldMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    setSelectedFieldId(fieldId);

    const field = placedFields.find(t => t.id === fieldId);
    if (!field) return;

    const overlay = e.currentTarget.parentElement;
    if (!overlay) return;

    const rect = overlay.getBoundingClientRect();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;

      setPlacedFields(prev => prev.map(f => f.id === fieldId ? {
        ...f,
        x: Math.max(0, Math.min(100 - (f.width / rect.width * 100), x)),
        y: Math.max(0, Math.min(100 - (f.height / rect.height * 100), y))
      } : f));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const removeField = (fieldId: string) => {
    setPlacedFields((prev) => prev.filter((f) => f.id !== fieldId));
    setSelectedFieldId(null);
  };

  const updateFieldText = (fieldId: string, val: string) => {
    setPlacedFields((prev) => prev.map((f) => f.id === fieldId ? { ...f, text: val } : f));
  };

  // Generate a vector graphic for the handwritten cursive signature or initials
  // using HTML Canvas stream transparent PNG OLE injection
  const renderCalligraphyPng = (text: string, isInit: boolean): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = signatureColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const selectedFont = isInit ? "'Alex Brush', cursive" : signatureFonts[selectedStyleIndex].fontFamily;
      ctx.font = `italic 56px ${selectedFont}`;
      ctx.fillText(text || "Signature", 200, 60);

      return canvas.toDataURL("image/png");
    }
    return "";
  };

  const base64ToUint8Array = (base64Data: string): Uint8Array => {
    const base64Str = base64Data.split(",")[1];
    const binaryStr = atob(base64Str);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  };

  // Core signature insertion compiler
  const compileSignedPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      // Standard Fonts for Text blocks
      const stdFont = await pdfDoc.embedFont("Helvetica");

      for (const field of placedFields) {
        const pageIndex = field.page - 1;
        const page = pages[pageIndex];
        if (!page) continue;

        const { width, height } = page.getSize();

        // Physical coordinates on vector PDF grid (bottom-up system)
        // Convert screen pixel bounds (based on 480px reference grid) to precise page percentages
        const fieldWidth = (field.width / 480) * width;
        const fieldHeight = (field.height / 680) * height;
        const pdfX = (field.x / 100) * width;
        const pdfY = height - ((field.y / 100) * height) - fieldHeight;

        if (field.type === "signature") {
          const pngUrl = renderCalligraphyPng(signName, false);
          const pngBytes = base64ToUint8Array(pngUrl);
          const pngImage = await pdfDoc.embedPng(pngBytes);
          page.drawImage(pngImage, { x: pdfX, y: pdfY, width: fieldWidth, height: fieldHeight });
        } else if (field.type === "initials") {
          const pngUrl = renderCalligraphyPng(signInitials, true);
          const pngBytes = base64ToUint8Array(pngUrl);
          const pngImage = await pdfDoc.embedPng(pngBytes);
          page.drawImage(pngImage, { x: pdfX, y: pdfY, width: fieldWidth, height: fieldHeight });
        } else if (field.type === "date") {
          page.drawText(field.text || "", { x: pdfX, y: pdfY + 12, size: 12, font: stdFont, color: rgb(0.1, 0.1, 0.1) });
        } else if (field.type === "name") {
          page.drawText(field.text || "", { x: pdfX, y: pdfY + 12, size: 12, font: stdFont, color: rgb(0.1, 0.1, 0.1) });
        } else if (field.type === "text") {
          page.drawText(field.text || "", { x: pdfX, y: pdfY + 12, size: 12, font: stdFont, color: rgb(0.1, 0.1, 0.1) });
        } else if (field.type === "stamp") {
          if (stampImgUrl) {
            const stampBytes = base64ToUint8Array(stampImgUrl);
            const isPng = stampImgUrl.startsWith("data:image/png");
            const stampImage = isPng ? await pdfDoc.embedPng(stampBytes) : await pdfDoc.embedJpg(stampBytes);
            page.drawImage(stampImage, { x: pdfX, y: pdfY, width: fieldWidth, height: fieldHeight });
          } else {
            // Mock company logo stamp fallback
            page.drawRectangle({ x: pdfX, y: pdfY, width: fieldWidth, height: fieldHeight, color: rgb(0.9, 0.9, 0.9) });
            page.drawText("COMPANY STAMP", { x: pdfX + 10, y: pdfY + 15, size: 10, font: stdFont, color: rgb(0.3, 0.3, 0.3) });
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      setResultUrl(URL.createObjectURL(new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" })));
      setWizardStep("upload");
    } catch (e) {
      console.error(e);
      alert("Error compiling signatures on PDF document.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyDetails = () => {
    const lastPageNum = pageCount || 1;
    const defaultFields: DraggedField[] = [
      {
        id: crypto.randomUUID(),
        type: "signature",
        x: 72,
        y: 76,
        width: 140,
        height: 50,
        page: lastPageNum
      },
      {
        id: crypto.randomUUID(),
        type: "date",
        x: 72,
        y: 84,
        width: 140,
        height: 25,
        page: lastPageNum,
        text: `Date: ${new Date().toISOString().split("T")[0]}`
      }
    ];
    setPlacedFields(defaultFields);
    setWizardStep("editor");
    setActivePage(lastPageNum);
  };

  // ---------------- WIZARD SCREENS ----------------

  // Modal 1: Who will sign this document?
  if (wizardStep === "choice" && file) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-zinc-950 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
          <div className="p-8 text-center">
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-8">
              Who will sign this document?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Only me */}
              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-between text-center gap-6">
                <div className="relative w-48 h-36 bg-blue-100/40 rounded-xl flex items-center justify-center">
                  {/* Visual Signature Vector drawing */}
                  <PenTool className="w-16 h-16 text-blue-600 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => setWizardStep("details")}
                    className="bg-red-500 hover:bg-red-600 text-white font-extrabold px-10 py-3 rounded-xl text-base shadow-lg shadow-red-500/20"
                  >
                    Only me
                  </Button>
                  <p className="text-sm font-semibold text-muted-foreground">Sign this document</p>
                </div>
              </div>

              {/* Several people */}
              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-between text-center gap-6">
                <div className="relative w-48 h-36 bg-emerald-100/40 rounded-xl flex items-center justify-center">
                  <Users className="w-16 h-16 text-emerald-600" />
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => setWizardStep("request")}
                    className="bg-red-500 hover:bg-red-600 text-white font-extrabold px-10 py-3 rounded-xl text-base shadow-lg shadow-red-500/20"
                  >
                    Several people
                  </Button>
                  <p className="text-sm font-semibold text-muted-foreground">Invite others to sign</p>
                </div>
              </div>
            </div>

            <p className="text-xs font-bold text-muted-foreground">
              Uploaded documents: <span className="text-zinc-800 dark:text-zinc-300 font-extrabold">{file.name}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Modal 2: Set your signature details
  if (wizardStep === "details" && file) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-zinc-950 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
            <h3 className="font-extrabold text-2xl text-foreground tracking-tight">Set your signature details</h3>
            <button className="text-xs font-bold text-red-500 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/5">Login</button>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Full name:</label>
                <input
                  type="text"
                  value={signName}
                  onChange={(e) => setSignName(e.target.value)}
                  placeholder="Your name"
                  className="w-full h-11 px-4 rounded-xl border bg-zinc-50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-red-500/40 font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Initials:</label>
                <input
                  type="text"
                  value={signInitials}
                  onChange={(e) => setSignInitials(e.target.value)}
                  placeholder="Initials"
                  className="w-full h-11 px-4 rounded-xl border bg-zinc-50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-red-500/40 font-bold"
                />
              </div>
            </div>

            {/* Signature Tab Navigation */}
            <div className="border-b flex gap-6">
              <button
                onClick={() => setActiveTab("signature")}
                className={`pb-3 font-extrabold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === "signature" ? "border-red-500 text-red-500" : "border-transparent text-muted-foreground"
                  }`}
              >
                <PenTool className="w-4 h-4" /> Signature
              </button>
              <button
                onClick={() => setActiveTab("initials")}
                className={`pb-3 font-extrabold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === "initials" ? "border-red-500 text-red-500" : "border-transparent text-muted-foreground"
                  }`}
              >
                Initials
              </button>
              <button
                onClick={() => setActiveTab("stamp")}
                className={`pb-3 font-extrabold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === "stamp" ? "border-red-500 text-red-500" : "border-transparent text-muted-foreground"
                  }`}
              >
                Company Stamp
              </button>
            </div>

            {activeTab === "signature" && (
              <div className="space-y-4">
                {/* Dynamically Styled cursive list */}
                <div className="border rounded-2xl divide-y overflow-hidden max-h-56 overflow-y-auto">
                  {signatureFonts.map((style, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedStyleIndex(idx)}
                      className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-all ${selectedStyleIndex === idx ? "bg-red-500/5" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                        }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedStyleIndex === idx ? "border-red-500" : "border-zinc-300"}`}>
                        {selectedStyleIndex === idx && <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />}
                      </div>
                      <span
                        style={{ fontFamily: style.fontFamily, color: signatureColor }}
                        className="text-3xl tracking-wide select-none"
                      >
                        {signName || "Signature"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Color picker */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Color:</span>
                  <div className="flex gap-2.5">
                    {availableColors.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSignatureColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full border-2 shadow-sm transition-all ${signatureColor === c ? "border-red-500 scale-110" : "border-transparent hover:scale-105"
                          }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "initials" && (
              <div className="p-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border text-center space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Calligraphy Preview</p>
                <div
                  style={{ fontFamily: "'Alex Brush', cursive", color: signatureColor }}
                  className="text-6xl py-4 select-none"
                >
                  {signInitials || "I"}
                </div>
              </div>
            )}

            {activeTab === "stamp" && (
              <div className="p-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border text-center space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Upload Company Stamp</p>
                {stampImgUrl ? (
                  <div className="space-y-3">
                    <img
                      src={stampImgUrl}
                      alt="Uploaded Stamp"
                      className="w-36 h-24 object-contain mx-auto border rounded-xl bg-white shadow"
                    />
                    <div className="flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStampImgUrl(null)}
                        className="text-red-500 hover:text-red-600 text-xs font-bold"
                      >
                        Remove Stamp
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="w-36 h-24 bg-white dark:bg-zinc-950 border border-zinc-200 border-dashed rounded-xl mx-auto flex flex-col items-center justify-center text-[10px] font-black text-muted-foreground gap-1.5 shadow-inner cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <Printer className="w-6 h-6 text-zinc-400" />
                    CLICK TO UPLOAD
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => setStampImgUrl(event.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setWizardStep("choice")}
              className="font-extrabold px-6 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyDetails}
              className="bg-red-500 hover:bg-red-600 text-white font-extrabold px-8 rounded-xl"
            >
              Apply
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Modal 3: Several People invitation settings
  if (wizardStep === "request" && file) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-zinc-950 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="font-extrabold text-2xl text-foreground tracking-tight">Create your signature request</h3>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide block">Who will receive your document?</label>

              {receivers.map((r, index) => (
                <div key={r.id} className="flex flex-wrap md:flex-nowrap gap-3 items-center bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border">
                  <GripVertical className="w-5 h-5 text-zinc-400 cursor-grab" />
                  <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    placeholder="Name"
                    className="h-10 px-3.5 border rounded-lg flex-1 bg-white dark:bg-zinc-950 text-sm font-semibold"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    className="h-10 px-3.5 border rounded-lg flex-1 bg-white dark:bg-zinc-950 text-sm font-semibold"
                  />
                  <select className="h-10 px-2.5 border rounded-lg text-xs font-bold bg-white dark:bg-zinc-950">
                    <option>Signer</option>
                    <option>Viewer</option>
                  </select>
                </div>
              ))}

              <Button
                onClick={addReceiver}
                variant="outline"
                className="w-full border-dashed border-red-500/30 text-red-500 hover:bg-red-500/5 font-extrabold h-11 rounded-xl"
              >
                + ADD RECEIVER
              </Button>
            </div>

            {/* Checklist options */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">Settings</h4>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border cursor-pointer">
                  <input type="checkbox" className="mt-1 rounded border-zinc-300 accent-red-500" />
                  <div className="space-y-0.5">
                    <span className="text-xs font-extrabold text-foreground">Set the order of receivers</span>
                    <p className="text-[10px] text-muted-foreground font-medium leading-normal">
                      A signer won't receive a request until the previous person has completed their document.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border cursor-pointer">
                  <input type="checkbox" className="rounded border-zinc-300 accent-red-500" />
                  <span className="text-xs font-extrabold text-foreground">Change expiration date</span>
                </label>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setWizardStep("choice")}
              className="font-extrabold text-red-500 hover:text-red-600 hover:bg-red-500/5 px-6 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyDetails}
              className="bg-red-500 hover:bg-red-600 text-white font-extrabold px-8 rounded-xl"
            >
              Apply
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main Visual Interactive Editor workspace
  if (wizardStep === "editor" && file) {
    return (
      <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#f3f4f6] dark:bg-zinc-900">

        {/* Left Area: Page list Thumbnail strip sidebar */}
        <div className="w-full lg:w-[200px] border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col p-4 gap-4 overflow-y-auto max-h-[25vh] lg:max-h-none">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block border-b pb-2">Document Pages</span>

          <div className="flex lg:flex-col gap-4">
            {thumbnails.map((url, idx) => (
              <div
                key={idx}
                onClick={() => setActivePage(idx + 1)}
                className={`cursor-pointer group flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${activePage === idx + 1
                    ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/20"
                    : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                  }`}
              >
                <img
                  src={url}
                  alt={`Page ${idx + 1}`}
                  className="rounded border shadow-sm max-h-[120px] object-contain pointer-events-none group-hover:scale-[1.01] transition-transform"
                />
                <span className="text-[10px] font-black text-muted-foreground">
                  {idx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Center Area: PDF Page Canvas with Drag and Drop layers */}
        <div
          onClick={() => setSelectedFieldId(null)}
          className="flex-1 flex items-center justify-center p-8 relative overflow-y-auto min-h-[50vh] lg:min-h-0 cursor-default"
        >
          {isLoadingPdf ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-red-500" />
              <p className="text-xs font-semibold text-muted-foreground animate-pulse">Rendering canvas...</p>
            </div>
          ) : (
            <div className="relative bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 transition-all duration-300 max-w-full">
              {/* Cover dynamic sizing page renderer */}
              <div className="relative overflow-hidden select-none">
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    className="w-full max-w-[480px] h-auto object-contain rounded-lg border shadow-inner bg-white pointer-events-none"
                  />
                  {isRenderingPage && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-zinc-950/70 flex items-center justify-center rounded-lg">
                      <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                    </div>
                  )}
                </div>

                {/* Drag-and-Drop Floating Interactive Layer */}
                <div className="absolute inset-0 w-full h-full top-0 left-0">
                  {placedFields
                    .filter((f) => f.page === activePage)
                    .map((field) => (
                      <div
                        key={field.id}
                        onMouseDown={(e) => handleFieldMouseDown(e, field.id)}
                        onClick={(e) => { e.stopPropagation(); setSelectedFieldId(field.id); }}
                        className={`absolute px-3.5 py-2.5 rounded-xl border-2 flex items-center justify-center cursor-move transition-all ${selectedFieldId === field.id
                            ? "border-red-500 bg-red-500/5 shadow-lg shadow-red-500/10 z-40"
                            : "border-zinc-400 border-dashed bg-white/75 dark:bg-zinc-950/75 hover:border-zinc-600"
                          }`}
                        style={{
                          left: `${field.x}%`,
                          top: `${field.y}%`,
                          width: `${field.width}px`,
                          height: `${field.height}px`,
                          transform: "translate(0, 0)",
                          zIndex: 20
                        }}
                      >
                        {/* Remove tiny edit badge */}
                        {selectedFieldId === field.id && (
                          <button
                            onClick={() => removeField(field.id)}
                            className="absolute -top-3.5 -right-3.5 w-7 h-7 bg-zinc-900 dark:bg-zinc-800 text-white rounded-full flex items-center justify-center border border-zinc-200 shadow hover:bg-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {field.type === "signature" && (
                          <span
                            style={{ fontFamily: signatureFonts[selectedStyleIndex].fontFamily, color: signatureColor }}
                            className="text-2xl tracking-wide select-none"
                          >
                            {signName || "Signature"}
                          </span>
                        )}

                        {field.type === "initials" && (
                          <span
                            style={{ fontFamily: "'Alex Brush', cursive", color: signatureColor }}
                            className="text-3xl tracking-wide select-none"
                          >
                            {signInitials || "I"}
                          </span>
                        )}

                        {field.type === "date" && (
                          <div className="flex items-center gap-1.5 w-full h-full justify-center px-1">
                            <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                            {selectedFieldId === field.id ? (
                              <input
                                type="text"
                                value={field.text || ""}
                                onChange={(e) => updateFieldText(field.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="bg-transparent border-none outline-none text-xs font-bold text-zinc-800 dark:text-zinc-200 w-full p-0 m-0 focus:ring-0 focus:outline-none"
                              />
                            ) : (
                              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate select-none">{field.text}</span>
                            )}
                          </div>
                        )}

                        {field.type === "name" && (
                          <div className="flex items-center gap-1.5 w-full h-full justify-center px-1">
                            <User className="w-4 h-4 text-zinc-400 shrink-0" />
                            {selectedFieldId === field.id ? (
                              <input
                                type="text"
                                value={field.text || ""}
                                onChange={(e) => updateFieldText(field.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="bg-transparent border-none outline-none text-xs font-bold text-zinc-800 dark:text-zinc-200 w-full p-0 m-0 focus:ring-0 focus:outline-none"
                              />
                            ) : (
                              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate select-none">{field.text}</span>
                            )}
                          </div>
                        )}

                        {field.type === "text" && (
                          <div className="flex items-center gap-1.5 w-full h-full justify-center px-1">
                            <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                            {selectedFieldId === field.id ? (
                              <input
                                type="text"
                                value={field.text || ""}
                                onChange={(e) => updateFieldText(field.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="bg-transparent border-none outline-none text-xs font-bold text-zinc-800 dark:text-zinc-200 w-full p-0 m-0 focus:ring-0 focus:outline-none"
                              />
                            ) : (
                              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate select-none">{field.text}</span>
                            )}
                          </div>
                        )}

                        {field.type === "stamp" && (
                          <div className="w-full h-full flex items-center justify-center overflow-hidden">
                            {stampImgUrl ? (
                              <img
                                src={stampImgUrl}
                                alt="Company Stamp"
                                className="w-full h-full object-contain pointer-events-none rounded-lg"
                              />
                            ) : (
                              <div className="text-[8px] font-black text-muted-foreground flex flex-col items-center leading-none select-none">
                                <Printer className="w-4.5 h-4.5 mb-0.5 text-zinc-400" />
                                NO STAMP
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Area: Dedicated options tools side panel stretching top-to-bottom */}
        <div className="w-full lg:w-[380px] xl:w-[420px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between p-6 h-full overflow-y-auto shadow-2xl">
          <div className="space-y-6">
            <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="font-extrabold text-lg text-foreground tracking-tight">Required fields</h3>
              <button
                onClick={() => setWizardStep("details")}
                className="text-[11px] font-bold text-red-500 hover:underline"
              >
                Edit signature
              </button>
            </div>

            {/* Draggable Card 1: Cursive Signature */}
            <div className="space-y-4">
              <div
                onClick={() => addFieldToWorkspace("signature")}
                className="cursor-pointer border rounded-2xl p-4 transition-all duration-200 bg-red-500/5 border-red-500/20 hover:border-red-500 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-zinc-400" />
                  <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <span
                    style={{ fontFamily: signatureFonts[selectedStyleIndex].fontFamily, color: signatureColor }}
                    className="text-2xl select-none"
                  >
                    {signName || ""}
                  </span>
                </div>
                <div className="w-6 h-6 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center text-[10px] font-black">
                  +
                </div>
              </div>
            </div>

            {/* Optional Fields header */}
            <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800 pt-2">
              <h3 className="font-extrabold text-sm text-muted-foreground uppercase tracking-wider">Optional fields</h3>
            </div>

            {/* Optional field triggers */}
            <div className="grid grid-cols-2 gap-3">
              {/* Initials */}
              <button
                onClick={() => addFieldToWorkspace("initials")}
                className="border rounded-2xl p-3.5 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-950/5 flex flex-col items-center gap-1.5 transition-all text-center"
              >
                <span
                  style={{ fontFamily: "'Alex Brush', cursive", color: signatureColor }}
                  className="text-3xl leading-none"
                >
                  {signInitials || "I"}
                </span>
                <span className="text-[11px] font-bold text-muted-foreground">Initials</span>
              </button>

              {/* Name */}
              <button
                onClick={() => addFieldToWorkspace("name")}
                className="border rounded-2xl p-3.5 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-950/5 flex flex-col items-center gap-1.5 transition-all text-center"
              >
                <User className="w-6 h-6 text-zinc-400" />
                <span className="text-[11px] font-bold text-muted-foreground">Name</span>
              </button>

              {/* Date */}
              <button
                onClick={() => addFieldToWorkspace("date")}
                className="border rounded-2xl p-3.5 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-950/5 flex flex-col items-center gap-1.5 transition-all text-center"
              >
                <Calendar className="w-6 h-6 text-zinc-400" />
                <span className="text-[11px] font-bold text-muted-foreground">Date</span>
              </button>

              {/* Custom Text */}
              <button
                onClick={() => addFieldToWorkspace("text")}
                className="border rounded-2xl p-3.5 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-950/5 flex flex-col items-center gap-1.5 transition-all text-center"
              >
                <FileText className="w-6 h-6 text-zinc-400" />
                <span className="text-[11px] font-bold text-muted-foreground">Text</span>
              </button>

              {/* Company Stamp */}
              <button
                onClick={() => addFieldToWorkspace("stamp")}
                className="col-span-2 border rounded-2xl p-3.5 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-950/5 flex items-center justify-center gap-4 transition-all"
              >
                <div className="w-16 h-10 bg-white border rounded border-dashed flex items-center justify-center text-[7px] font-black text-zinc-400 leading-none">
                  STAMP
                </div>
                <span className="text-[11px] font-bold text-muted-foreground">Company Stamp</span>
              </button>
            </div>
          </div>

          {/* Action button locked to the bottom */}
          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 mt-auto">
            <Button
              size="xl"
              variant="hero"
              onClick={compileSignedPdf}
              disabled={isProcessing || placedFields.length === 0}
              className="w-full bg-red-500 hover:bg-red-600 shadow-red-500/20 gap-2 font-extrabold tracking-wide py-4.5 rounded-xl text-base"
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Signing...</>
              ) : (
                <>Sign &rarr;</>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render original landing uploader screen before files
  return (
    <ToolLayout title="Sign PDF" description="Sign yourself or request electronic signatures from others." icon={<PenTool className="w-8 h-8" />}>
      {!resultUrl ? (
        <div className="flex flex-col items-center justify-center w-full">
          <FileUploader onFilesSelected={handleFiles} multiple={false} accept="application/pdf" />
        </div>
      ) : (
        <ResultScreen
          title="Document signed successfully!"
          downloadUrl={resultUrl}
          downloadFileName={`${file?.name.replace('.pdf', '')}_signed.pdf`}
          downloadText="Download Signed PDF"
          onStartOver={() => { setFile(null); setResultUrl(null); setWizardStep("upload"); }}
        />
      )}
    </ToolLayout>
  );
}
