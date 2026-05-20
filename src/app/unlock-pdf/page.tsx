"use client";

import { useState } from "react";
import { decryptPDF } from "@pdfsmaller/pdf-decrypt";
import { ToolLayout } from "@/components/tool-layout";
import { FileUploader } from "@/components/file-uploader";
import { ResultScreen } from "@/components/result-screen";
import { Button } from "@/components/ui/button";
import { Loader2, Unlock, Key, CheckCircle, ShieldAlert, FileText, Check } from "lucide-react";

export default function UnlockPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  
  // Custom smart unlocking states
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isAutoUnlocked, setIsAutoUnlocked] = useState(false);
  const [decryptedBlob, setDecryptedBlob] = useState<Blob | null>(null);

  // Auto-run smart password bypass sequence when a file is selected!
  const handleFiles = async (files: File[]) => {
    const selectedFile = files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setResultUrl(null);
    setError("");
    setPassword("");
    setShowPasswordInput(false);
    setIsAutoUnlocked(false);
    setDecryptedBlob(null);
    setIsProcessing(true);
    setStatusMessage("Analyzing document security...");

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();

      // 1. FAST BYTE-SCAN CHECK FOR ENCRYPTION DICTIONARY
      // A PDF is encrypted only if its trailer contains the `/Encrypt` key.
      const bytes = new Uint8Array(arrayBuffer);
      let encryptedCheck = false;
      
      // ASCII pattern for "/Encrypt": [47, 69, 110, 99, 114, 121, 112, 116]
      const pattern = [47, 69, 110, 99, 114, 121, 112, 116];
      for (let i = 0; i < bytes.length - 8; i++) {
        let match = true;
        for (let j = 0; j < 8; j++) {
          if (bytes[i + j] !== pattern[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          encryptedCheck = true;
          break;
        }
      }

      setIsEncrypted(encryptedCheck);

      // If the document is NOT encrypted, it is already unlocked!
      // We keep it in the workspace and let the user click "Unlock PDF" to download the original file.
      if (!encryptedCheck) {
        setIsProcessing(false);
        setStatusMessage("");
        return;
      }

      // 2. Document requires password. Attempt to bypass silently using common passwords!
      setStatusMessage("Scanning lock for standard/default passwords...");
      const easyPasswords = ["1234", "0000", "123456", "password", "admin", "1111", "12345", "123"];
      
      let bypassSuccess = false;
      const fileBytes = new Uint8Array(arrayBuffer);
      for (const p of easyPasswords) {
        try {
          // Attempt binary level stream decryption using modern decryptor engine
          const decryptedBytes = await decryptPDF(fileBytes, p);
          
          // Silently succeeded! Compile the completely unlocked PDF blob!
          const blob = new Blob([decryptedBytes as any], { type: "application/pdf" });
          setDecryptedBlob(blob);
          setIsAutoUnlocked(true);
          bypassSuccess = true;
          break;
        } catch (easyErr) {
          // Password incorrect, move to the next easy password
          continue;
        }
      }

      setIsProcessing(false);
      setStatusMessage("");

      if (bypassSuccess) {
        // Silently unlocked! We show a friendly status in the workspace card
        return;
      }

      // 3. All easy passwords failed. Display the custom password input.
      setShowPasswordInput(true);

    } catch (err: any) {
      console.error("Auto Unlock Error:", err);
      setIsProcessing(false);
      setError("Error loading PDF. The file structure may be corrupted.");
    }
  };

  // Triggered when user clicks "Unlock PDF" button
  const handleUnlockAction = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError("");

    try {
      // CASE 1: File was already unencrypted from the start
      if (!isEncrypted) {
        setResultUrl(URL.createObjectURL(file));
        setIsProcessing(false);
        return;
      }

      // CASE 2: File was already silently bypassed using default passwords
      if (isAutoUnlocked && decryptedBlob) {
        setResultUrl(URL.createObjectURL(decryptedBlob));
        setIsProcessing(false);
        return;
      }

      // CASE 3: Standard password decryption using custom user password input
      setStatusMessage("Decrypting PDF with custom password...");
      const arrayBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);

      // Decrypt the file bytes using the correct password
      const decryptedBytes = await decryptPDF(fileBytes, password);
      
      // Compile into a clean, unencrypted PDF Blob
      const blob = new Blob([decryptedBytes as any], { type: "application/pdf" });
      
      setResultUrl(URL.createObjectURL(blob));
      setShowPasswordInput(false);
    } catch (err: any) {
      console.error("Manual Unlock Action Error:", err);
      setError("Incorrect password. Please enter the correct password to unlock this PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolLayout title="Unlock PDF" description="Remove PDF password security instantly, giving you the freedom to print, edit, and use your PDFs." icon={<Unlock className="w-8 h-8 text-red-500" />}>
      {!resultUrl ? (
        <div className="flex flex-col gap-8 items-center w-full max-w-4xl mx-auto">
          
          {!file && (
            <FileUploader onFilesSelected={handleFiles} multiple={false} accept="application/pdf" />
          )}
          
          {/* Smart background analysis processing loader */}
          {isProcessing && (
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 rounded-3xl p-8 shadow-xl w-full max-w-2xl text-center space-y-4 animate-pulse">
              <Loader2 className="w-10 h-10 text-red-500 animate-spin mx-auto" />
              <p className="text-sm font-extrabold text-foreground">{statusMessage || "Processing..."}</p>
            </div>
          )}

          {/* Premium workspace document layout card matching merge/watermark */}
          {file && !isProcessing && (
            <div className="flex flex-col lg:flex-row gap-8 w-full items-start justify-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {/* Left Canvas Preview Area (Charcoal background) */}
              <div className="flex-1 bg-[#2d2d2d] w-full min-h-[380px] lg:min-h-[440px] rounded-3xl flex flex-col items-center justify-center p-8 relative overflow-hidden shadow-2xl">
                
                {/* Floating cancel button */}
                <button 
                  onClick={() => { setFile(null); setShowPasswordInput(false); setDecryptedBlob(null); }}
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

                  {/* Encryption / Lock status badge */}
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                    {!isEncrypted ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-full uppercase tracking-wider">
                        <Check className="w-3.5 h-3.5 stroke-[3]" /> Already Unlocked
                      </span>
                    ) : isAutoUnlocked ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-[10px] font-black rounded-full uppercase tracking-wider">
                        <Check className="w-3.5 h-3.5 stroke-[3]" /> Lock Bypassed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 text-[10px] font-black rounded-full uppercase tracking-wider">
                        🔒 Encrypted Lock
                      </span>
                    )}
                  </div>

                </div>

              </div>

              {/* Right Options Sidebar Card */}
              <div className="w-full lg:w-[360px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6 shrink-0">
                
                <div className="space-y-1 pb-4 border-b border-zinc-150">
                  <h4 className="font-black text-zinc-900 dark:text-white tracking-tight">
                    Unlock Options
                  </h4>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {!isEncrypted 
                      ? "This PDF does not require any passwords." 
                      : isAutoUnlocked 
                      ? "Default passwords matched! Ready to decrypt." 
                      : "Enter the user security password below to complete decryption."}
                  </p>
                </div>

                {/* Password field only if document is encrypted and custom input is required */}
                {isEncrypted && showPasswordInput && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <label className="block text-xs font-black uppercase text-muted-foreground tracking-wide">
                      Document Password
                    </label>
                    <input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="Enter security password..." 
                      className="w-full h-11 px-4 rounded-xl border bg-zinc-50 dark:bg-zinc-900 text-xs font-bold focus:outline-none focus:border-red-500" 
                    />
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold animate-in shake duration-300">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button 
                  size="xl" 
                  onClick={handleUnlockAction} 
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-extrabold py-4 rounded-2xl tracking-wide shadow-lg shadow-red-500/10 flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  Unlock PDF
                </Button>

              </div>

            </div>
          )}

        </div>
      ) : (
        // Results download screen showing badge if instantly auto-bypassed!
        <div className="w-full max-w-xl mx-auto space-y-6">
          {isAutoUnlocked && (
            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-black animate-in fade-in duration-300">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>Smart security bypass completed! PDF unlocked instantly without password!</span>
            </div>
          )}
          
          <ResultScreen
            title={!isEncrypted ? "Original File Download Ready!" : "PDF Unlocked Successfully!"}
            downloadUrl={resultUrl}
            downloadFileName={!isEncrypted ? file?.name || "document.pdf" : `${file?.name.replace('.pdf','')}_unlocked.pdf`}
            downloadText="Download Unlocked PDF"
            onStartOver={() => { 
              setFile(null); 
              setResultUrl(null); 
              setPassword(""); 
              setShowPasswordInput(false);
              setIsAutoUnlocked(false);
              setDecryptedBlob(null);
            }}
          />
        </div>
      )}
    </ToolLayout>
  );
}
