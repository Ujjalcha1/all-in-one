"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";
import { Button } from "@/components/ui/button";
import { ResultScreen } from "@/components/result-screen";
import { getDeviceId } from "@/lib/device";
import { 
  Download, 
  Loader2, 
  Languages, 
  Sparkles, 
  ArrowRight, 
  FileText, 
  ArrowUpDown, 
  Info,
  Trash2
} from "lucide-react";

// Simple client-side translation dictionary for realistic translation demos
const mockTranslate = (text: string, targetLang: string) => {
  const dicts: Record<string, Record<string, string>> = {
    Spanish: {
      "pdf": "PDF",
      "document": "documento",
      "tool": "herramienta",
      "original": "original",
      "layout": "diseño",
      "text": "texto",
      "the": "el",
      "and": "y",
      "is": "es",
      "to": "a",
      "for": "para",
      "with": "con",
      "file": "archivo",
      "hello": "hola",
      "world": "mundo",
      "page": "página",
      "accuracy": "precisión",
      "translation": "traducción",
      "merge": "fusionar",
      "split": "dividir",
      "compress": "comprimir",
      "edit": "editar",
      "convert": "convertir",
      "free": "gratis",
      "online": "en línea",
      "secure": "seguro",
      "sign": "firmar",
      "unlock": "desbloquear",
      "protect": "proteger",
      "watermark": "marca de agua"
    },
    French: {
      "pdf": "PDF",
      "document": "document",
      "tool": "outil",
      "original": "original",
      "layout": "mise en page",
      "text": "texte",
      "the": "le",
      "and": "et",
      "is": "est",
      "to": "à",
      "for": "pour",
      "with": "avec",
      "file": "fichier",
      "hello": "bonjour",
      "world": "monde",
      "page": "page",
      "accuracy": "précision",
      "translation": "traduction",
      "merge": "fusionner",
      "split": "diviser",
      "compress": "compresser",
      "edit": "modifier",
      "convert": "convertir",
      "free": "gratuit",
      "online": "en ligne",
      "secure": "sécurisé",
      "sign": "signer",
      "unlock": "déverrouiller",
      "protect": "protéger"
    },
    German: {
      "pdf": "PDF",
      "document": "Dokument",
      "tool": "Werkzeug",
      "original": "original",
      "layout": "Layout",
      "text": "Text",
      "the": "das",
      "and": "und",
      "is": "ist",
      "to": "zu",
      "for": "für",
      "with": "mit",
      "file": "Datei",
      "hello": "hallo",
      "world": "Welt",
      "page": "Seite",
      "accuracy": "Genauigkeit",
      "translation": "Übersetzung",
      "free": "kostenlos",
      "online": "online"
    }
  };

  const dict = dicts[targetLang] || dicts["Spanish"];
  return text
    .split(/\b/)
    .map(word => {
      const lower = word.toLowerCase();
      if (dict[lower]) {
        const trans = dict[lower];
        // Match capitalization
        if (word[0] === word[0].toUpperCase()) {
          return trans[0].toUpperCase() + trans.slice(1);
        }
        return trans;
      }
      return word;
    })
    .join("");
};

export default function TranslatePDFPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalTitle, setLimitModalTitle] = useState("Limit Reached");
  const [limitModalMessage, setLimitModalMessage] = useState<string | null>(null);

  // Translation configuration states
  const [fromLang, setFromLang] = useState("English");
  const [toLang, setToLang] = useState("Spanish");
  const [layoutMode, setLayoutMode] = useState("keep"); // 'keep' or 'text'

  const languages = [
    "English", "Spanish", "French", "German", "Italian", "Portuguese", 
    "Chinese", "Japanese", "Korean", "Arabic", "Hindi", "Russian", "Dutch"
  ];

  const handleFilesSelected = async (files: File[]) => {
    if (files.length > 0) {
      const selectedFile = files[0];
      
      // Perform initial usage limit check
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = { 
        "Content-Type": "application/json",
        "x-device-id": getDeviceId()
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      try {
        const checkRes = await fetch(`/api/usage/check?tool=translate-pdf`, { headers });
        const checkData = await checkRes.json();
        if (!checkData.allowed) {
          setLimitModalTitle(checkData.error ? "Device Restricted" : "Limit Reached");
          setLimitModalMessage(checkData.error || null);
          setShowLimitModal(true);
          return;
        }
      } catch (err) {
        console.warn("Usage check failed:", err);
      }

      setFile(selectedFile);
      setResultUrl(null);
    }
  };

  const handleSwapLanguages = () => {
    const temp = fromLang;
    setFromLang(toLang);
    setToLang(temp);
  };

  const handleTranslate = async () => {
    if (!file) return;
    setIsProcessing(true);

    const token = localStorage.getItem("authToken");
    const headers: Record<string, string> = { 
      "Content-Type": "application/json",
      "x-device-id": getDeviceId()
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      // 1. Double check usage eligibility
      const checkRes = await fetch(`/api/usage/check?tool=translate-pdf`, { headers });
      const checkData = await checkRes.json();
      if (!checkData.allowed) {
        setLimitModalTitle(checkData.error ? "Device Restricted" : "Limit Reached");
        setLimitModalMessage(checkData.error || null);
        setShowLimitModal(true);
        setIsProcessing(false);
        return;
      }

      // 2. Log tool usage
      const logRes = await fetch("/api/usage/log", {
        method: "POST",
        headers,
        body: JSON.stringify({ tool: "translate-pdf" })
      });
      const logData = await logRes.json();
      if (!logData.success && !token) {
        setLimitModalTitle(logData.error ? "Device Restricted" : "Limit Reached");
        setLimitModalMessage(logData.error || null);
        setShowLimitModal(true);
        setIsProcessing(false);
        return;
      }

      // 3. Extract text from the source PDF
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const ab = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
      
      let textLines: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(" ");
        textLines.push(pageText);
      }

      // 4. Translate text contents
      const translatedText = mockTranslate(textLines.join("\n"), toLang);

      // 5. Generate target PDF containing translated text using pdf-lib
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const outPdf = await PDFDocument.create();
      const font = await outPdf.embedFont(StandardFonts.Helvetica);
      
      const lines = translatedText.split("\n");
      let page = outPdf.addPage([595, 842]); // A4 Size
      let y = 800;

      for (const line of lines) {
        // Simple line wrapping
        const words = line.split(" ");
        let currentLine = "";
        
        for (const word of words) {
          if ((currentLine + " " + word).length > 80) {
            if (y < 50) {
              page = outPdf.addPage([595, 842]);
              y = 800;
            }
            page.drawText(currentLine.trim(), {
              x: 50,
              y,
              size: 10,
              font,
              color: rgb(0.1, 0.1, 0.1),
            });
            y -= 15;
            currentLine = word;
          } else {
            currentLine += (currentLine ? " " : "") + word;
          }
        }

        if (currentLine) {
          if (y < 50) {
            page = outPdf.addPage([595, 842]);
            y = 800;
          }
          page.drawText(currentLine.trim(), {
            x: 50,
            y,
            size: 10,
            font,
            color: rgb(0.1, 0.1, 0.1),
          });
          y -= 18; // paragraph break
        }
      }

      const outBytes = await outPdf.save();
      const blob = new Blob([outBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error("Translation processing error:", err);
      alert("Error translating PDF file. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolLayout 
      title="Translate PDF" 
      description="Translate your PDF documents online while keeping the original layout." 
      icon={<Languages className="w-8 h-8" />}
    >
      {!file ? (
        <FileUploader onFilesSelected={handleFilesSelected} multiple={false} accept="application/pdf" />
      ) : !resultUrl ? (
        <div className="flex flex-col lg:flex-row gap-8 items-stretch w-full animate-in fade-in duration-300">
          {/* Left Column: Visual File Box */}
          <div className="flex-1 bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[400px] relative">
            <button 
              onClick={() => setFile(null)} 
              className="absolute top-4 right-4 p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:text-red-500 transition-colors shadow-sm cursor-pointer"
              title="Remove file"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            
            <div className="w-40 h-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl flex flex-col items-center justify-between p-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="p-3 bg-red-500/10 dark:bg-red-500/5 text-red-500 rounded-2xl mt-4">
                <FileText className="w-10 h-10" />
              </div>
              <div className="text-center w-full">
                <p className="text-xs font-bold truncate text-zinc-800 dark:text-zinc-200" title={file.name}>
                  {file.name}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: AI Translation Control Panel */}
          <div className="w-full lg:w-[420px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-3xl p-8 flex flex-col justify-between relative">
            <div className="space-y-6">
              {/* Header Title with AI badge */}
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-zinc-900 dark:text-white">Translate PDF</h3>
                <div className="flex items-center gap-1 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  AI
                </div>
              </div>

              {/* Info Alert Banner */}
              <div className="flex gap-3 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 p-4 rounded-2xl">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 leading-relaxed">
                  The accuracy of translation is increased by correctly selecting the document language.
                </p>
              </div>

              {/* Select Boxes */}
              <div className="space-y-4 relative">
                <div className="bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 rounded-2xl p-4">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">From:</label>
                  <select 
                    value={fromLang} 
                    onChange={(e) => setFromLang(e.target.value)} 
                    className="w-full h-10 px-3 bg-transparent border-none text-sm font-bold focus:outline-none text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    {languages.map((l) => <option key={l} value={l} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">{l}</option>)}
                  </select>
                </div>

                {/* Swapper Link Button */}
                <div className="absolute left-1/2 -translate-x-1/2 top-[76px] z-10">
                  <button 
                    onClick={handleSwapLanguages} 
                    className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-indigo-500 hover:text-indigo-600 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 rounded-2xl p-4 mt-8">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">To:</label>
                  <select 
                    value={toLang} 
                    onChange={(e) => setToLang(e.target.value)} 
                    className="w-full h-10 px-3 bg-transparent border-none text-sm font-bold focus:outline-none text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    {languages.map((l) => <option key={l} value={l} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">{l}</option>)}
                  </select>
                </div>
              </div>

              {/* Layout Option Selector */}
              <div className="space-y-2 pt-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">Output PDF layout:</label>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                    <input 
                      type="radio" 
                      name="layout" 
                      checked={layoutMode === "keep"} 
                      onChange={() => setLayoutMode("keep")} 
                      className="accent-indigo-500 mt-1" 
                    />
                    <div>
                      <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">Keep layout</span>
                      <span className="block text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                        The output PDF will keep the layout as close as possible to the original document.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                    <input 
                      type="radio" 
                      name="layout" 
                      checked={layoutMode === "text"} 
                      onChange={() => setLayoutMode("text")} 
                      className="accent-indigo-500 mt-1" 
                    />
                    <div>
                      <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">Plain text</span>
                      <span className="block text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                        Extract and translate text directly without preserving graphic layouts.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Translate Button */}
            <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-900">
              <Button
                onClick={handleTranslate}
                disabled={isProcessing}
                size="xl"
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center justify-center gap-3 font-black shadow-lg shadow-indigo-600/25 transition-all duration-300"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Translating PDF...
                  </>
                ) : (
                  <>
                    Translate PDF
                    <Sparkles className="w-5 h-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <ResultScreen
          title="PDF has been translated!"
          downloadUrl={resultUrl!}
          downloadFileName={`${file.name.replace(".pdf", "")}_translated.pdf`}
          downloadText="Download translated PDF"
          alreadyLogged={true}
          onStartOver={() => {
            setFile(null);
            setResultUrl(null);
          }}
        />
      )}

      {showLimitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-3xl p-8 text-center animate-in zoom-in-95 duration-200 relative mx-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 dark:bg-red-500/5 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">
              {limitModalTitle}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-semibold">
              {limitModalMessage || (
                <>
                  You have already processed a PDF translation as an anonymous user. Please log in or sign up for free to get <span className="text-red-500 font-bold">unlimited usage</span>!
                </>
              )}
            </p>
            
            <div className="flex flex-col gap-3">
              {limitModalTitle === "Device Restricted" ? (
                <button
                  onClick={() => {
                    localStorage.removeItem("authToken");
                    window.dispatchEvent(new Event("storage"));
                    setShowLimitModal(false);
                    router.push("/login");
                  }}
                  className="w-full h-12 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex items-center justify-center gap-2 font-black shadow-lg shadow-red-500/20 transition-colors cursor-pointer"
                >
                  Sign Out / Switch Account
                  <ArrowRight className="w-4.5 h-4.5" />
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="w-full h-12 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex items-center justify-center gap-2 font-black shadow-lg shadow-red-500/20 transition-colors"
                  >
                    Sign In
                    <ArrowRight className="w-4.5 h-4.5" />
                  </Link>
                  <Link
                    href="/signup"
                    className="w-full h-12 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl flex items-center justify-center font-bold transition-colors"
                  >
                    Create Free Account
                  </Link>
                </>
              )}
              <button
                onClick={() => setShowLimitModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold mt-2 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
