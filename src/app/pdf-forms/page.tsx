"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  PDFOptionList,
  PDFButton,
  PDFName,
  rgb
} from "pdf-lib";
import { Button } from "@/components/ui/button";
import { getDeviceId } from "@/lib/device";
import { FileUploader } from "@/components/file-uploader";
import {
  Loader2,
  Check,
  ArrowRight,
  Sparkles,
  Settings,
  Maximize2,
  AlertCircle,
  FileText,
  Type,
  Trash2
} from "lucide-react";

interface ExtractedWidget {
  pageIndex: number;
  rect: { x: number; y: number; width: number; height: number };
  onValue?: string;
}

interface ExtractedField {
  name: string;
  type: "text" | "checkbox" | "radio" | "dropdown" | "listbox" | "button" | "unknown";
  value: any;
  options?: string[];
  widgets: ExtractedWidget[];
  isMultiline?: boolean;
  isRequired?: boolean;
  initialValue?: any;
  isReadOnly?: boolean;
  calculateScript?: string;
  buttonAction?: { type: string; value?: string };
}

const getFieldError = (field: ExtractedField, value: any): string | null => {
  // Required check
  if (field.isRequired && (!value || (typeof value === "string" && value.trim() === ""))) {
    return "Required field";
  }
  
  // Format checks
  if (typeof value === "string" && value.trim() !== "") {
    const lowerName = field.name.toLowerCase();
    if (lowerName.includes("email")) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return "Invalid email";
      }
    }
    if (lowerName.includes("phone") || lowerName.includes("mobile") || lowerName.includes("tel")) {
      const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;
      if (!phoneRegex.test(value)) {
        return "Invalid phone number";
      }
    }
    if (lowerName.includes("number") || lowerName.includes("numeric")) {
      if (isNaN(Number(value))) {
        return "Must be a number";
      }
    }
  }
  return null;
};

const getCalculateScript = (field: any): string | undefined => {
  try {
    const dicts = [];
    if (field.acroField?.dict) {
      dicts.push(field.acroField.dict);
    }
    const widgets = field.acroField?.getWidgets?.() || [];
    widgets.forEach((w: any) => {
      if (w.dict) dicts.push(w.dict);
    });
    
    for (const dict of dicts) {
      const aa = dict.lookup(PDFName.of("AA"));
      if (aa && typeof aa.lookup === "function") {
        const c = aa.lookup(PDFName.of("C"));
        if (c && typeof c.lookup === "function") {
          const js = c.lookup(PDFName.of("JS"));
          if (js) {
            if (typeof js.decodeText === "function") return js.decodeText();
            if (typeof js.getUncompressedContents === "function") {
              return new TextDecoder().decode(js.getUncompressedContents());
            }
            if (typeof js.asString === "function") return js.asString();
          }
        }
      }
      
      const a = dict.lookup(PDFName.of("A"));
      if (a && typeof a.lookup === "function") {
        const js = a.lookup(PDFName.of("JS"));
        if (js) {
          if (typeof js.decodeText === "function") return js.decodeText();
          if (typeof js.getUncompressedContents === "function") {
            return new TextDecoder().decode(js.getUncompressedContents());
          }
          if (typeof js.asString === "function") return js.asString();
        }
      }
    }
  } catch (err) {
    console.warn("Failed to parse calculate script:", err);
  }
  return undefined;
};

interface CustomNote {
  id: string;
  page: number; // 1-indexed
  x: number; // percentage
  y: number; // percentage
  text: string;
}

const getWidgetPageIndex = (widget: any, pdfDoc: any) => {
  const pageRef = widget.P();
  if (pageRef) {
    const idx = pdfDoc.getPages().findIndex((p: any) => p.ref === pageRef);
    if (idx !== -1) return idx;
  }
  // Fallback: search annotations array of each page
  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const annots = pages[i].node.Annots();
    if (annots) {
      const arr = annots.asArray();
      for (let j = 0; j < arr.length; j++) {
        if (arr[j] === widget.ref) {
          return i;
        }
      }
    }
  }
  return 0;
};

interface FormPageCanvasProps {
  pageNum: number;
  pdfDocument: any;
  zoom: number;
  fields: ExtractedField[];
  fieldValues: { [fieldName: string]: any };
  customNotes: CustomNote[];
  enableCustomNotes: boolean;
  onValueChange: (fieldName: string, value: any) => void;
  onAddCustomNote: (pageNum: number, x: number, y: number) => void;
  onUpdateCustomNote: (id: string, text: string) => void;
  onRemoveCustomNote: (id: string) => void;
  hiddenFieldNames: string[];
  onButtonClick: (field: ExtractedField) => void;
}

function FormPageCanvas({
  pageNum,
  pdfDocument,
  zoom,
  fields,
  fieldValues,
  customNotes,
  enableCustomNotes,
  onValueChange,
  onAddCustomNote,
  onUpdateCustomNote,
  onRemoveCustomNote,
  hiddenFieldNames,
  onButtonClick
}: FormPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [pageWidth, setPageWidth] = useState(1);
  const [pageHeight, setPageHeight] = useState(1);

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

        if (isRendered) {
          setPageWidth(page.getViewport({ scale: 1.0 }).width);
          setPageHeight(page.getViewport({ scale: 1.0 }).height);
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

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!enableCustomNotes || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    onAddCustomNote(pageNum, px, py);
  };

  const pageFields = fields.filter((f) =>
    f.widgets.some((w) => w.pageIndex === pageNum - 1)
  );

  const pageNotes = customNotes.filter((n) => n.page === pageNum);

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <span className="text-xs font-extrabold text-zinc-400 dark:text-zinc-500">Page {pageNum}</span>
      <div
        ref={containerRef}
        onClick={handleCanvasClick}
        className="relative bg-white dark:bg-zinc-950 shadow-2xl border border-zinc-200 dark:border-zinc-800 rounded-lg select-none shrink-0"
        style={{
          width: dims.width || 400,
          height: dims.height || 560,
          visibility: dims.width > 0 ? "visible" : "hidden",
          cursor: enableCustomNotes ? "cell" : "default"
        }}
      >
        <canvas ref={canvasRef} className="block w-full h-full rounded-lg" />

        {/* Standard AcroForm interactive elements overlay */}
        {dims.width > 0 &&
          pageFields.map((field) => {
            return field.widgets
              .filter((w) => w.pageIndex === pageNum - 1)
              .map((widget, widx) => {
                const wScale = dims.width / pageWidth;
                const hScale = dims.height / pageHeight;

                const left = widget.rect.x * wScale;
                const width = widget.rect.width * wScale;
                const height = widget.rect.height * hScale;
                const top = (pageHeight - widget.rect.y - widget.rect.height) * hScale;

                const inputKey = `${field.name}-${widx}`;
                const error = getFieldError(field, fieldValues[field.name]);
                const borderStyle = error
                  ? "border-red-500 hover:border-red-600 focus:border-red-600 focus:ring-red-600"
                  : "border-blue-400/30 hover:border-red-500 focus:border-red-500 focus:ring-red-500";

                const val = fieldValues[field.name];
                const hasVal = val !== undefined && val !== "" && !(Array.isArray(val) && val.length === 0);
                const isCalculated = !!field.calculateScript || field.isReadOnly;
                const bgClass = (hasVal || isCalculated)
                  ? "bg-white" 
                  : (error ? "bg-red-500/5 hover:bg-red-500/10 focus:bg-white" : "bg-blue-500/5 hover:bg-blue-500/10 focus:bg-white");

                if (hiddenFieldNames.includes(field.name)) {
                  return (
                    <div
                      key={inputKey}
                      style={{ left, top, width, height }}
                      className="absolute bg-white border border-transparent z-10 pointer-events-none"
                    />
                  );
                }

                return (
                  <div key={inputKey}>
                    {field.type === "text" && (
                      field.isMultiline ? (
                        <textarea
                          readOnly={field.isReadOnly}
                          value={fieldValues[field.name] || ""}
                          onChange={(e) => onValueChange(field.name, e.target.value)}
                          style={{ left, top, width, height }}
                          className={`absolute border ${borderStyle} ${bgClass} text-zinc-900 focus:outline-none p-1 text-[9px] leading-tight resize-none rounded-sm transition-all z-10 focus:ring-1 ${field.isReadOnly ? "bg-zinc-100/60 cursor-not-allowed select-none" : ""}`}
                        />
                      ) : (
                        <input
                          type="text"
                          readOnly={field.isReadOnly}
                          value={fieldValues[field.name] || ""}
                          onChange={(e) => onValueChange(field.name, e.target.value)}
                          style={{ left, top, width, height }}
                          className={`absolute border ${borderStyle} ${bgClass} text-zinc-900 focus:outline-none px-1 text-[9px] leading-tight rounded-sm transition-all z-10 focus:ring-1 ${field.isReadOnly ? "bg-zinc-100/60 cursor-not-allowed select-none" : ""}`}
                        />
                      )
                    )}

                    {field.type === "checkbox" && (
                      <input
                        type="checkbox"
                        checked={!!fieldValues[field.name]}
                        onChange={(e) => onValueChange(field.name, e.target.checked)}
                        style={{ left, top, width, height }}
                        className={`absolute accent-red-500 cursor-pointer border ${error ? "border-red-500" : "border-blue-400/30"} z-10 focus:ring-0 focus:outline-none`}
                      />
                    )}

                    {field.type === "dropdown" && (
                      <select
                        value={fieldValues[field.name] || ""}
                        onChange={(e) => onValueChange(field.name, e.target.value)}
                        style={{ left, top, width, height }}
                        className={`absolute border ${borderStyle} ${bgClass} text-zinc-900 focus:outline-none text-[8px] px-0.5 rounded-sm transition-all z-10`}
                      >
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt} className="text-zinc-900 bg-white">
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}

                    {field.type === "listbox" && (
                      <select
                        multiple
                        value={Array.isArray(fieldValues[field.name]) ? fieldValues[field.name] : [fieldValues[field.name]].filter(Boolean)}
                        onChange={(e) => {
                          const selectedOptions = Array.from(e.target.selectedOptions).map(opt => opt.value);
                          onValueChange(field.name, selectedOptions);
                        }}
                        style={{ left, top, width, height }}
                        className={`absolute border ${borderStyle} ${bgClass} text-zinc-900 focus:outline-none text-[8px] p-0.5 rounded-sm transition-all z-10 overflow-y-auto`}
                      >
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt} className="text-zinc-900 bg-white">
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}

                    {field.type === "radio" && (
                      <input
                        type="radio"
                        name={field.name}
                        checked={fieldValues[field.name] === widget.onValue}
                        onChange={() => onValueChange(field.name, widget.onValue)}
                        style={{ left, top, width, height }}
                        className={`absolute accent-red-500 cursor-pointer ${error ? "ring-1 ring-red-500" : ""} z-10 focus:ring-0 focus:outline-none`}
                      />
                    )}

                    {field.type === "button" && (
                      <button
                        type="button"
                        onClick={() => onButtonClick(field)}
                        style={{ left, top, width, height }}
                        className="absolute bg-transparent hover:bg-black/5 active:bg-black/10 border border-transparent rounded-sm z-10 cursor-pointer select-none transition-all focus:outline-none"
                      />
                    )}

                    {error && (field.type === "text" || field.type === "dropdown" || field.type === "listbox") && (
                      <div
                        style={{
                          left: left + width - 12,
                          top: top + (height - 10) / 2
                        }}
                        title={error}
                        className="absolute w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center pointer-events-none z-20 animate-bounce shadow-md"
                      >
                        !
                      </div>
                    )}
                  </div>
                );
              });
          })}

        {/* Custom text notes overlay */}
        {pageNotes.map((note) => {
          return (
            <div
              key={note.id}
              style={{ left: `${note.x}%`, top: `${note.y}%` }}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 group bg-amber-50 dark:bg-zinc-800 border border-amber-300 dark:border-zinc-700 px-1.5 py-0.5 rounded shadow-lg animate-in zoom-in-95 duration-150"
            >
              <input
                type="text"
                value={note.text}
                onChange={(e) => onUpdateCustomNote(note.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-none text-[10px] font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none w-24"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveCustomNote(note.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity p-0.5"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PdfFormsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalTitle, setLimitModalTitle] = useState("Limit Reached");
  const [limitModalMessage, setLimitModalMessage] = useState<string | null>(null);

  // PDF.js / form states
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [zoom, setZoom] = useState(84);

  // AcroForm fields
  const [formFields, setFormFields] = useState<ExtractedField[]>([]);
  const [fieldValues, setFieldValues] = useState<{ [fieldName: string]: any }>({});

  // Custom manually added notes
  const [customNotes, setCustomNotes] = useState<CustomNote[]>([]);
  const [enableCustomNotes, setEnableCustomNotes] = useState(false);
  const [hiddenFieldNames, setHiddenFieldNames] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResultUrl(null);
      setPdfDocument(null);
      setFormFields([]);
      setFieldValues({});
      setCustomNotes([]);
      setEnableCustomNotes(false);
    }
  };

  // Extract Form fields and load PDF
  useEffect(() => {
    if (!file) {
      setPdfDocument(null);
      setThumbnails([]);
      setTotalPages(0);
      setFormFields([]);
      setFieldValues({});
      return;
    }

    const loadDoc = async () => {
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = { 
        "Content-Type": "application/json",
        "x-device-id": getDeviceId()
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      try {
        const checkRes = await fetch("/api/usage/check?tool=pdf-forms", { headers });
        const checkData = await checkRes.json();
        if (!checkData.allowed) {
          setLimitModalTitle(checkData.error ? "Device Restricted" : "Limit Reached");
          setLimitModalMessage(checkData.error || null);
          setShowLimitModal(true);
          setFile(null);
          return;
        }
      } catch (err) {
        console.warn("Usage check failed during load:", err);
      }

      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const ab = await file.arrayBuffer();

        // Load PDF.js document for rendering pages
        const doc = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
        setPdfDocument(doc);
        setTotalPages(doc.numPages);

        // Load pdf-lib document for form metadata extraction
        const pdfDoc = await PDFDocument.load(ab);
        const form = pdfDoc.getForm();
        const fields = form.getFields();

        const extracted: ExtractedField[] = [];
        const initialValues: { [key: string]: any } = {};

        fields.forEach((field) => {
          const name = field.getName();
          let type: ExtractedField["type"] = "unknown";
          let val: any = "";
          let options: string[] = [];
          let isMultiline = false;
          const isRequired = typeof field.isRequired === "function" ? field.isRequired() : false;
          const isReadOnly = typeof field.isReadOnly === "function" ? field.isReadOnly() : false;
          const calculateScript = getCalculateScript(field);

          let buttonAction: { type: string; value?: string } | undefined;

          if (field instanceof PDFTextField) {
            type = "text";
            val = field.getText() || "";
            isMultiline = field.isMultiline();
          } else if (field instanceof PDFCheckBox) {
            type = "checkbox";
            val = field.isChecked() || false;
          } else if (field instanceof PDFDropdown) {
            type = "dropdown";
            val = field.getSelected()?.[0] || "";
            options = field.getOptions() || [];
          } else if (field instanceof PDFOptionList) {
            type = "listbox";
            val = field.getSelected() || [];
            options = field.getOptions() || [];
          } else if (field instanceof PDFRadioGroup) {
            type = "radio";
            val = field.getSelected() || "";
            options = field.getOptions() || [];
          } else if (field instanceof PDFButton) {
            type = "button";
            val = "";
            options = [];
            
            try {
              const dict = field.acroField.dict;
              let actionDict = dict.lookup(PDFName.of("A"));
              if (!actionDict) {
                const aa = dict.lookup(PDFName.of("AA"));
                if (aa) {
                  const aaResolved = pdfDoc.context.lookup(aa);
                  if (aaResolved && typeof (aaResolved as any).lookup === "function") {
                    actionDict = (aaResolved as any).lookup(PDFName.of("U")) || (aaResolved as any).lookup(PDFName.of("D"));
                  }
                }
              }
              
              if (actionDict) {
                const actionResolved = pdfDoc.context.lookup(actionDict);
                if (actionResolved && typeof (actionResolved as any).lookup === "function") {
                  const s = (actionResolved as any).lookup(PDFName.of("S"));
                  const actionType = s ? s.toString() : "";
                  
                  if (actionType === "/URI") {
                    const uri = (actionResolved as any).lookup(PDFName.of("URI"));
                    if (uri) {
                      const uriResolved = pdfDoc.context.lookup(uri);
                      if (uriResolved) {
                        const uriStr = typeof (uriResolved as any).decodeText === "function" 
                          ? (uriResolved as any).decodeText() 
                          : (typeof (uriResolved as any).asString === "function" ? (uriResolved as any).asString() : uriResolved.toString());
                        buttonAction = {
                          type: "uri",
                          value: uriStr.replace(/^\(|\)$/g, "").trim()
                        };
                      }
                    }
                  } else if (actionType === "/SubmitForm") {
                    buttonAction = { type: "submit" };
                  } else if (actionType === "/ResetForm") {
                    buttonAction = { type: "reset" };
                  } else if (actionType === "/JavaScript") {
                    const js = (actionResolved as any).lookup(PDFName.of("JS"));
                    if (js) {
                      const jsResolved = pdfDoc.context.lookup(js);
                      if (jsResolved) {
                        const jsStr = typeof (jsResolved as any).decodeText === "function" 
                          ? (jsResolved as any).decodeText() 
                          : (typeof (jsResolved as any).getUncompressedContents === "function" 
                              ? new TextDecoder().decode((jsResolved as any).getUncompressedContents()) 
                              : jsResolved.toString());
                        buttonAction = {
                          type: "js",
                          value: jsStr
                        };
                      }
                    }
                  } else if (actionType === "/GoTo" || actionType === "/Named") {
                    const N = (actionResolved as any).lookup(PDFName.of("N"));
                    const destStr = N ? N.toString().toLowerCase() : "";
                    if (destStr.includes("nextpage")) {
                      buttonAction = { type: "next" };
                    } else if (destStr.includes("prevpage")) {
                      buttonAction = { type: "prev" };
                    } else if (destStr.includes("firstpage")) {
                      buttonAction = { type: "first" };
                    } else if (destStr.includes("lastpage")) {
                      buttonAction = { type: "last" };
                    }
                  }
                }
              }
            } catch (err) {
              console.warn("Failed to extract button action:", err);
            }
            
            // Name fallback
            if (!buttonAction) {
              const lower = name.toLowerCase();
              if (lower.includes("next")) {
                buttonAction = { type: "next" };
              } else if (lower.includes("prev")) {
                buttonAction = { type: "prev" };
              } else if (lower.includes("first")) {
                buttonAction = { type: "first" };
              } else if (lower.includes("last")) {
                buttonAction = { type: "last" };
              } else if (lower.includes("reset") || lower.includes("clear")) {
                buttonAction = { type: "reset" };
              } else if (lower.includes("submit")) {
                buttonAction = { type: "submit" };
              } else if (lower.includes("google") || lower.includes("link") || lower.includes("url")) {
                buttonAction = { type: "uri", value: "https://www.google.com" };
              }
            }
          }

          initialValues[name] = val;

          const widgets = field.acroField.getWidgets();
          const extractedWidgets: ExtractedWidget[] = widgets.map((widget: any, widx: number) => {
            const rect = widget.getRectangle();
            const pageIndex = getWidgetPageIndex(widget, pdfDoc);
            let onValue: string | undefined;

            if (type === "radio") {
              onValue = options[widx] || widget.getOnValue()?.toString();
            }

            return {
              pageIndex,
              rect: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
              },
              onValue
            };
          });

          extracted.push({
            name,
            type,
            value: val,
            options,
            widgets: extractedWidgets,
            isMultiline,
            isRequired,
            initialValue: val,
            isReadOnly,
            calculateScript,
            buttonAction
          });
        });

        setFormFields(extracted);
        setFieldValues(initialValues);

        // Generate thumbnails
        setThumbnails([]);
        for (let p = 1; p <= doc.numPages; p++) {
          const page = await doc.getPage(p);
          const vp = page.getViewport({ scale: 0.25 });
          const canvas = document.createElement("canvas");
          canvas.width = vp.width;
          canvas.height = vp.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
            const imgData = canvas.toDataURL("image/png");
            setThumbnails((prev) => [...prev, imgData]);
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      } catch (e) {
        console.error("Failed to load PDF Form:", e);
      }
    };

    loadDoc();
  }, [file]);

  const handleValueChange = (fieldName: string, value: any) => {
    setFieldValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleAddCustomNote = (pageNum: number, x: number, y: number) => {
    setCustomNotes((prev) => [
      ...prev,
      {
        id: `note-${Date.now()}-${Math.random()}`,
        page: pageNum,
        x,
        y,
        text: "Custom Text"
      }
    ]);
  };

  const handleUpdateCustomNote = (id: string, text: string) => {
    setCustomNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, text } : n))
    );
  };

  const handleRemoveCustomNote = (id: string) => {
    setCustomNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const validationErrors = formFields
    .filter((f) => !hiddenFieldNames.includes(f.name))
    .map((f) => ({
      name: f.name,
      error: getFieldError(f, fieldValues[f.name]),
      page: f.widgets[0]?.pageIndex !== undefined ? f.widgets[0].pageIndex + 1 : null
    }))
    .filter((item) => item.error !== null) as { name: string; error: string; page: number | null }[];

  const hasErrors = validationErrors.length > 0;

  const scrollToPage = (pageNum: number) => {
    const el = document.getElementById(`page-container-${pageNum}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleButtonClick = (field: ExtractedField) => {
    const action = field.buttonAction;
    
    // 1. Explicit buttonAction from PDF triggers
    if (action) {
      if (action.type === "reset") {
        const resetVals: { [key: string]: any } = {};
        formFields.forEach((f) => {
          resetVals[f.name] = f.initialValue !== undefined ? f.initialValue : "";
        });
        setFieldValues(resetVals);
        setCustomNotes([]);
        return;
      }
      if (action.type === "next") {
        const currentPageNum = (field.widgets[0]?.pageIndex ?? 0) + 1;
        const target = currentPageNum + 1;
        if (target <= totalPages) scrollToPage(target);
        return;
      }
      if (action.type === "prev") {
        const currentPageNum = (field.widgets[0]?.pageIndex ?? 0) + 1;
        const target = currentPageNum - 1;
        if (target >= 1) scrollToPage(target);
        return;
      }
      if (action.type === "first") {
        scrollToPage(1);
        return;
      }
      if (action.type === "last") {
        scrollToPage(totalPages);
        return;
      }
      if (action.type === "uri" && action.value) {
        window.open(action.value, "_blank", "noopener,noreferrer");
        return;
      }
      if (action.type === "submit") {
        saveForm();
        return;
      }
    }

    // 2. Name-based fallbacks (if action parsing is incomplete or unavailable)
    const lowerName = field.name.toLowerCase();
    if (lowerName.includes("reset") || lowerName.includes("clear")) {
      const resetVals: { [key: string]: any } = {};
      formFields.forEach((f) => {
        resetVals[f.name] = f.initialValue !== undefined ? f.initialValue : "";
      });
      setFieldValues(resetVals);
      setCustomNotes([]);
    } else if (lowerName.includes("next")) {
      const currentPageNum = (field.widgets[0]?.pageIndex ?? 0) + 1;
      const target = currentPageNum + 1;
      if (target <= totalPages) scrollToPage(target);
    } else if (lowerName.includes("prev")) {
      const currentPageNum = (field.widgets[0]?.pageIndex ?? 0) + 1;
      const target = currentPageNum - 1;
      if (target >= 1) scrollToPage(target);
    } else if (lowerName.includes("first")) {
      scrollToPage(1);
    } else if (lowerName.includes("last")) {
      scrollToPage(totalPages);
    } else if (lowerName.includes("google") || lowerName.includes("link") || lowerName.includes("url")) {
      window.open("https://www.google.com", "_blank", "noopener,noreferrer");
    } else if (lowerName.includes("submit")) {
      saveForm();
    } else if (lowerName.includes("hide") || lowerName.includes("show") || lowerName.includes("toggle")) {
      const targetFields = formFields.filter(f => f.name.toLowerCase().includes("hidden"));
      if (targetFields.length > 0) {
        setHiddenFieldNames(prev => {
          const isCurrentlyHidden = targetFields.some(tf => prev.includes(tf.name));
          if (isCurrentlyHidden) {
            return prev.filter(name => !targetFields.some(tf => tf.name === name));
          } else {
            return [...prev, ...targetFields.map(tf => tf.name)];
          }
        });
      }
    }
  };

  // Calculation engine effect
  useEffect(() => {
    let changed = false;
    const newValues = { ...fieldValues };
    
    // Acrobat runs calculations in passes (max 5 passes to resolve dependencies)
    for (let pass = 0; pass < 5; pass++) {
      let passChanged = false;
      
      formFields.forEach((field) => {
        if (!field.calculateScript) return;
        
        const context = {
          event: { value: newValues[field.name] !== undefined ? newValues[field.name] : "" },
          getField: (name: string) => {
            const cleanName = name.trim().toLowerCase();
            const actualKey = Object.keys(newValues).find(
              (key) => key.trim().toLowerCase() === cleanName
            );
            const val = actualKey ? newValues[actualKey] : "";
            
            const numericVal = parseFloat(val);
            const isNum = !isNaN(numericVal) && val !== "";
            const num = isNum ? numericVal : 0;
            
            return {
              value: num,
              valueAsString: String(val !== undefined ? val : ""),
              valueOf: () => num,
              toString: () => String(val !== undefined ? val : "")
            };
          },
          AFSimple_Calculate: (op: string, fields: string[]) => {
            const vals = fields.map(f => {
              const cleanName = f.trim().toLowerCase();
              const actualKey = Object.keys(newValues).find(
                (key) => key.trim().toLowerCase() === cleanName
              );
              const v = actualKey ? newValues[actualKey] : "";
              const num = parseFloat(v);
              return isNaN(num) ? 0 : num;
            });
            if (op === "SUM") {
              context.event.value = vals.reduce((a, b) => a + b, 0);
            } else if (op === "PRD") {
              context.event.value = vals.reduce((a, b) => a * b, 1);
            } else if (op === "AVG") {
              context.event.value = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
            } else if (op === "MIN") {
              context.event.value = Math.min(...vals);
            } else if (op === "MAX") {
              context.event.value = Math.max(...vals);
            }
          }
        };
        
        try {
          const fn = new Function("getField", "event", "AFSimple_Calculate", `
            ${field.calculateScript}
          `);
          fn.call(context, context.getField, context.event, context.AFSimple_Calculate);
          
          let resultVal = context.event.value;
          if (typeof resultVal === "number") {
            if (isNaN(resultVal)) resultVal = 0;
          } else {
            const parsed = parseFloat(String(resultVal));
            resultVal = isNaN(parsed) ? 0 : parsed;
          }

          if (String(resultVal) !== String(newValues[field.name] !== undefined ? newValues[field.name] : "")) {
            newValues[field.name] = resultVal;
            passChanged = true;
            changed = true;
          }
        } catch (err) {
          const scriptText = field.calculateScript || "";
          if (scriptText.includes("AFSimple_Calculate")) {
            const match = scriptText.match(/AFSimple_Calculate\s*\(\s*["']([^"']+)["']\s*,\s*([\s\S]+)\)/);
            if (match) {
              const op = match[1];
              const namesMatch = match[2].match(/["']([^"']+)["']/g);
              if (namesMatch) {
                const fieldsList = namesMatch.map(s => s.replace(/["']/g, "").trim());
                context.AFSimple_Calculate(op, fieldsList);
                
                let resultVal = context.event.value;
                if (typeof resultVal === "number") {
                  if (isNaN(resultVal)) resultVal = 0;
                } else {
                  const parsed = parseFloat(String(resultVal));
                  resultVal = isNaN(parsed) ? 0 : parsed;
                }

                if (String(resultVal) !== String(newValues[field.name] !== undefined ? newValues[field.name] : "")) {
                  newValues[field.name] = resultVal;
                  passChanged = true;
                  changed = true;
                }
              }
            }
          }
        }
      });
      
      if (!passChanged) break;
    }
    
    if (changed) {
      setFieldValues(newValues);
    }
  }, [fieldValues, formFields]);

  // Compile final PDF Form with updated inputs using pdf-lib
  const saveForm = async () => {
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
      const checkRes = await fetch("/api/usage/check?tool=pdf-forms", { headers });
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
        body: JSON.stringify({ tool: "pdf-forms" })
      });
      const logData = await logRes.json();
      if (!logData.success && !token) {
        setLimitModalTitle(logData.error ? "Device Restricted" : "Limit Reached");
        setLimitModalMessage(logData.error || null);
        setShowLimitModal(true);
        setIsProcessing(false);
        return;
      }

      const ab = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(ab);
      const form = pdfDoc.getForm();
      const pages = pdfDoc.getPages();

      // Write AcroForm fields
      formFields.forEach((field) => {
        const val = fieldValues[field.name];
        if (val === undefined) return;

        try {
          const formField = form.getField(field.name);
          if (formField instanceof PDFTextField) {
            formField.setText(val || "");
          } else if (formField instanceof PDFCheckBox) {
            if (val) formField.check();
            else formField.uncheck();
          } else if (formField instanceof PDFDropdown) {
            if (val) formField.select(val);
          } else if (formField instanceof PDFRadioGroup) {
            if (val) formField.select(val);
          } else if (formField instanceof PDFOptionList) {
            if (Array.isArray(val)) formField.select(val);
            else if (val) formField.select([val]);
          }
        } catch (err) {
          console.warn(`Failed to set value for field: ${field.name}`, err);
        }
      });

      // Write manual custom notes onto page canvas stream
      customNotes.forEach((note) => {
        if (note.page <= pages.length) {
          const page = pages[note.page - 1];
          const { width, height } = page.getSize();

          const noteX = (note.x / 100) * width;
          const noteY = (1 - note.y / 100) * height - 8; // offset text alignment

          page.drawText(note.text, {
            x: noteX,
            y: noteY,
            size: 11,
            color: rgb(0.1, 0.1, 0.1)
          });
        }
      });

      pdfDoc.setProducer("OmniPDF Form Engine");
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error(e);
      alert("Error saving form values.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#f3f4f6] dark:bg-zinc-900">
      {!file ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-xl mx-auto w-full">
          <FileUploader onFilesSelected={(files) => setFile(files[0])} accept="application/pdf" />
        </div>
      ) : resultUrl ? (
        // Saved Output download page
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xl p-10 text-center space-y-6 max-w-lg w-full">
            <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-2xl w-fit mx-auto text-emerald-500">
              <Check className="w-10 h-10" />
            </div>
            <h3 className="font-extrabold text-2xl text-zinc-900 dark:text-white">PDF Saved Successfully!</h3>
            <p className="text-sm text-muted-foreground">
              Your form entries have been embedded into the document.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                size="xl"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = resultUrl;
                  link.download = `${file.name.replace(".pdf", "")}_filled.pdf`;
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
                  setFormFields([]);
                  setFieldValues({});
                  setCustomNotes([]);
                }}
                className="w-full h-14 rounded-2xl font-bold border-zinc-200 dark:border-zinc-800"
              >
                Start Over
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Three column Form Editor Workspace
        <>
          {/* Left Column: Thumbnails Navigation */}
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

          {/* Center Column: Scrollable document page canvas views */}
          <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-zinc-200 dark:border-zinc-800">
            {/* Topbar options */}
            <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 flex items-center gap-2 shadow-sm shrink-0 select-none">
              <Button
                variant={enableCustomNotes ? "default" : "outline"}
                size="sm"
                onClick={() => setEnableCustomNotes(!enableCustomNotes)}
                className="gap-2 font-bold h-10 px-4 rounded-xl text-xs"
              >
                <Type className="w-4 h-4" />
                Add custom text note
              </Button>
            </div>

            {/* Scrollable list of page canvases */}
            <div className="flex-1 overflow-y-auto bg-[#f3f4f6] dark:bg-zinc-900 flex flex-col items-center gap-8 py-8 px-4 scroll-smooth">
              {pdfDocument &&
                Array.from({ length: totalPages }).map((_, index) => {
                  const pageNum = index + 1;
                  return (
                    <div key={pageNum} id={`page-container-${pageNum}`} className="scroll-mt-6">
                      <FormPageCanvas
                        pageNum={pageNum}
                        pdfDocument={pdfDocument}
                        zoom={zoom}
                        fields={formFields}
                        fieldValues={fieldValues}
                        customNotes={customNotes}
                        enableCustomNotes={enableCustomNotes}
                        onValueChange={handleValueChange}
                        onAddCustomNote={handleAddCustomNote}
                        onUpdateCustomNote={handleUpdateCustomNote}
                        onRemoveCustomNote={handleRemoveCustomNote}
                        hiddenFieldNames={hiddenFieldNames}
                        onButtonClick={handleButtonClick}
                      />
                    </div>
                  );
                })}
            </div>

            {/* Bottom Status bar */}
            <div className="h-12 bg-zinc-800 text-white border-t border-zinc-700 flex items-center justify-between px-6 shrink-0 select-none">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom((prev) => Math.max(30, prev - 10))}
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
                  <option value="84">84%</option>
                  <option value="100">100%</option>
                  <option value="125">125%</option>
                  <option value="150">150%</option>
                </select>
                <button
                  onClick={() => setZoom((prev) => Math.min(200, prev + 10))}
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

          {/* Right Sidebar: Details and submit */}
          <div className="w-full lg:w-[380px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between shadow-2xl relative h-full select-none">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <h2 className="text-lg font-black tracking-tight text-foreground">PDF Forms</h2>

              {formFields.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="text-xs font-black tracking-wider uppercase text-muted-foreground">
                    Interactive Fields Found: {formFields.length}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    We automatically detected interactive fields on your PDF document. You can fill them out directly on the document pages.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-xs font-black tracking-wider uppercase text-muted-foreground">
                    No Interactive Fields Found
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This PDF does not have native interactive form inputs.
                  </p>
                  <div className="p-4 bg-amber-50 dark:bg-zinc-900/50 border border-amber-200 dark:border-zinc-800 rounded-xl text-xs font-bold leading-relaxed text-amber-800 dark:text-amber-400">
                    Pro Tip: Click the <strong>&quot;Add custom text note&quot;</strong> button above, then click anywhere on the pages to manually add your text entries!
                  </div>
                </div>
              )}

              {/* Validation errors summary section */}
              {validationErrors.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-zinc-150 dark:border-zinc-800/80 animate-in fade-in slide-in-from-top-2 duration-300">
                  <h4 className="text-xs font-black tracking-wider uppercase text-red-500 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                    Validation Errors ({validationErrors.length})
                  </h4>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {validationErrors.map((err, idx) => (
                      <div
                        key={idx}
                        onClick={() => err.page && scrollToPage(err.page)}
                        className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-xl text-[10px] font-bold text-red-800 dark:text-red-300 cursor-pointer hover:bg-red-100/50 dark:hover:bg-red-950/30 transition-colors flex justify-between items-center"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-extrabold uppercase text-[8px] text-red-600 dark:text-red-400 truncate">
                            {err.name}
                          </span>
                          <span className="truncate">{err.error}</span>
                        </div>
                        {err.page && (
                          <span className="text-[8px] uppercase tracking-wider bg-red-200/50 dark:bg-red-900/50 px-1.5 py-0.5 rounded shrink-0">
                            Page {err.page}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Compile Button */}
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border-t shrink-0 space-y-4">
              <div className="flex gap-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50 p-4 rounded-xl">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-[10px] font-bold text-orange-800 dark:text-orange-300 leading-relaxed">
                  Remember to review the result of your document before sending private information.
                </p>
              </div>

              <Button
                onClick={saveForm}
                disabled={isProcessing || hasErrors}
                className="w-full h-14 bg-red-500 hover:bg-red-600 text-white disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600 rounded-2xl flex items-center justify-center gap-3 text-sm font-black shadow-lg shadow-red-500/25 transition-all duration-300"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving Form...
                  </>
                ) : hasErrors ? (
                  <>
                    Please Fix Errors ({validationErrors.length})
                  </>
                ) : (
                  <>
                    Download
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
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
                  You have already processed a PDF form as an anonymous user. Please log in or sign up for free to get <span className="text-red-500 font-bold">unlimited usage</span>!
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
    </div>
  );
}
