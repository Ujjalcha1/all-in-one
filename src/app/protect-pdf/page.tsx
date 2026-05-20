"use client";

import { useState } from "react";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt-lite";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Shield, FileText, Check, ShieldAlert } from "lucide-react";

export default function ProtectPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleFiles = (files: File[]) => {
    setFile(files[0]);
    setResultUrl(null);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "None", color: "bg-zinc-200" };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { score, label: "Weak", color: "bg-red-500" };
    if (score <= 4) return { score, label: "Good", color: "bg-amber-500" };
    return { score, label: "Strong", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength(password);

  const protectPdf = async () => {
    if (!file) return;
    if (!password) {
      setError("Please set a password to encrypt your PDF.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify your entry.");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);

      // Perform binary client-side encryption using RC4 128-bit security stream
      const encryptedBytes = await encryptPDF(fileBytes, password);

      const blob = new Blob([encryptedBytes as any], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      console.error("Encryption error:", err);
      setError("An unexpected error occurred while encrypting the PDF. The file may be corrupted.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolLayout 
      title="Protect PDF" 
      description="Encrypt your PDF with a password to restrict unauthorized access and keep sensitive data confidential." 
      icon={<Lock className="w-8 h-8 text-red-500" />}
    >
      {!resultUrl ? (
        <div className="flex flex-col gap-8 items-center w-full max-w-4xl mx-auto">
          {!file && (
            <FileUploader onFilesSelected={handleFiles} multiple={false} accept="application/pdf" />
          )}

          {isProcessing && (
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 rounded-3xl p-8 shadow-xl w-full max-w-2xl text-center space-y-4 animate-pulse">
              <Loader2 className="w-10 h-10 text-red-500 animate-spin mx-auto" />
              <p className="text-sm font-extrabold text-foreground">Encrypting document streams...</p>
            </div>
          )}

          {file && !isProcessing && (
            <div className="flex flex-col lg:flex-row gap-8 w-full items-start justify-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {/* Left Canvas Preview Area (Charcoal background) */}
              <div className="flex-1 bg-[#2d2d2d] w-full min-h-[380px] lg:min-h-[440px] rounded-3xl flex flex-col items-center justify-center p-8 relative overflow-hidden shadow-2xl">
                
                {/* Floating cancel button */}
                <button 
                  onClick={() => { setFile(null); setPassword(""); setConfirmPassword(""); }}
                  className="absolute top-6 right-6 w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 z-20"
                >
                  ✕
                </button>

                {/* Document preview card */}
                <div className="relative bg-white dark:bg-zinc-950 w-[240px] h-[340px] rounded-2xl shadow-2xl overflow-hidden flex flex-col items-center justify-center p-6 border border-zinc-100 dark:border-zinc-800 group">
                  <div className="w-20 h-20 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
                    <FileText className="w-10 h-10 stroke-[1.8]" />
                  </div>
                  <h4 className="font-extrabold text-zinc-850 dark:text-zinc-100 text-sm text-center line-clamp-2 max-w-[180px] mb-1">
                    {file.name}
                  </h4>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  
                  {/* Status badge */}
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-black rounded-full uppercase tracking-wider">
                      Ready to Encrypt
                    </span>
                  </div>
                </div>

              </div>

              {/* Right Options Sidebar Card */}
              <div className="w-full lg:w-[360px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6 shrink-0">
                
                <div className="space-y-1 pb-4 border-b border-zinc-150 dark:border-zinc-850">
                  <h4 className="font-black text-zinc-900 dark:text-white tracking-tight">
                    Security Settings
                  </h4>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Define a secure password to restrict document access.
                  </p>
                </div>

                {/* Password field */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase text-muted-foreground tracking-wide">
                    Document Password
                  </label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Enter security password..." 
                    className="w-full h-11 px-4 rounded-xl border bg-zinc-50 dark:bg-zinc-900 text-xs font-bold focus:outline-none focus:border-red-500 border-zinc-250 dark:border-zinc-800" 
                  />
                  
                  {/* Password Strength Bar */}
                  {password && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-muted-foreground">Strength:</span>
                        <span className={strength.score <= 2 ? "text-red-500" : strength.score <= 4 ? "text-amber-500" : "text-emerald-500"}>
                          {strength.label}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-300 ${strength.color}`} style={{ width: `${(strength.score / 5) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password field */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase text-muted-foreground tracking-wide">
                    Confirm Password
                  </label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="Verify security password..." 
                    className="w-full h-11 px-4 rounded-xl border bg-zinc-50 dark:bg-zinc-900 text-xs font-bold focus:outline-none focus:border-red-500 border-zinc-250 dark:border-zinc-800" 
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold animate-in shake duration-300">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button 
                  size="xl" 
                  onClick={protectPdf} 
                  disabled={!password || !confirmPassword || password !== confirmPassword}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:bg-zinc-150 disabled:text-zinc-400 disabled:shadow-none dark:disabled:bg-zinc-900 dark:disabled:text-zinc-650 text-white font-extrabold py-4 rounded-2xl tracking-wide shadow-lg shadow-red-500/10 flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Protect PDF
                </Button>

              </div>

            </div>
          )}

        </div>
      ) : (
        // Results download screen showing badge if successfully encrypted!
        <div className="w-full max-w-xl mx-auto space-y-6">
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-black animate-in fade-in duration-300">
            <Shield className="w-5 h-5 shrink-0" />
            <span>PDF Encryption Completed! The document is now protected with 128-bit key security.</span>
          </div>
          
          <ResultScreen
            title="PDF Protected Successfully!"
            downloadUrl={resultUrl}
            downloadFileName={`${file?.name.replace('.pdf','')}_protected.pdf`}
            downloadText="Download Protected PDF"
            onStartOver={() => { 
              setFile(null); 
              setResultUrl(null); 
              setPassword(""); 
              setConfirmPassword("");
            }}
          />
        </div>
      )}
    </ToolLayout>
  );
}
