"use client";

import { Button } from "@/components/ui/button";
import { Download, Trash2, Layers, SplitSquareHorizontal, Hash, Droplet, RotateCw, Shield } from "lucide-react";
import React from "react";
import Link from "next/link";

import { getDeviceId } from "@/lib/device";

interface ResultScreenProps {
  title: string;
  downloadUrl: string;
  downloadFileName: string;
  downloadText?: string;
  onStartOver: () => void;
  children?: React.ReactNode;
  alreadyLogged?: boolean;
}

export function ResultScreen({
  title,
  downloadUrl,
  downloadFileName,
  downloadText = "Download PDF",
  onStartOver,
  children,
  alreadyLogged = false
}: ResultScreenProps) {
  React.useEffect(() => {
    if (alreadyLogged) return;

    // Log tool usage automatically
    const tool = window.location.pathname.replace(/^\//, "") || "pdf-tool";
    const token = localStorage.getItem("authToken");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-device-id": getDeviceId()
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    fetch("/api/usage/log", {
      method: "POST",
      headers,
      body: JSON.stringify({ tool })
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Auto-logged usage successfully:", data);
      })
      .catch((err) => {
        console.warn("Failed to auto-log usage:", err);
      });
  }, [alreadyLogged]);

  return (
    <div className="flex flex-col items-center max-w-4xl mx-auto w-full py-6 relative">
      {/* Central Premium Card */}
      <div className="w-full max-w-3xl bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md rounded-3xl border border-border p-8 md:p-12 shadow-2xl flex flex-col items-center mb-8 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />

        {/* Status Illustration */}
        <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 mb-6 z-10">
          <div className="absolute inset-0 rounded-full bg-indigo-500/5 animate-ping" />
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Download className="w-7 h-7 text-white" />
          </div>
        </div>

        <h2 className="text-[28px] md:text-[34px] font-black mb-3 text-center tracking-tight text-foreground z-10">
          {title}
        </h2>

        {/* File Name Info Badge */}
        <div className="mb-8 px-4 py-2.5 rounded-xl bg-muted/60 dark:bg-zinc-900/60 border border-border/80 text-sm font-medium text-muted-foreground max-w-md truncate text-center z-10">
          File Name: <span className="text-foreground font-semibold">{downloadFileName}</span>
        </div>

        {/* Main Actions Group */}
        <div className="flex items-center gap-4 justify-center w-full max-w-md mb-4 z-10">
          <Button size="xl" variant="hero" asChild className="flex-1 px-8 py-7 text-[18px] rounded-2xl h-auto shadow-lg shadow-indigo-500/25">
            <a href={downloadUrl} download={downloadFileName}>
              <Download className="mr-3 w-6 h-6" /> {downloadText}
            </a>
          </Button>

          <button 
            onClick={onStartOver} 
            className="w-14 h-14 rounded-2xl border border-rose-200 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 hover:bg-rose-100/50 dark:hover:bg-rose-900/30 hover:border-rose-300 dark:hover:border-rose-800 transition-all flex items-center justify-center shrink-0 shadow-sm hover:shadow-md hover:scale-105"
            title="Delete file and start over"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        </div>

        {children}
      </div>

      {/* Suggested next steps */}
      <div className="w-full bg-white/60 dark:bg-zinc-950/40 backdrop-blur-md rounded-3xl shadow-lg border border-border p-8 max-w-3xl">
        <h3 className="font-bold text-foreground mb-6 text-lg">Continue to...</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Link href="/merge-pdf" className="flex items-center gap-3 p-3 bg-white dark:bg-card rounded-2xl border border-border hover:border-indigo-300 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/50 dark:to-violet-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold flex-1 text-foreground">Merge PDF</span>
          </Link>
          <Link href="/split-pdf" className="flex items-center gap-3 p-3 bg-white dark:bg-card rounded-2xl border border-border hover:border-indigo-300 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/50 dark:to-violet-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <SplitSquareHorizontal className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold flex-1 text-foreground">Split PDF</span>
          </Link>
          <Link href="/page-number" className="flex items-center gap-3 p-3 bg-white dark:bg-card rounded-2xl border border-border hover:border-indigo-300 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/50 dark:to-violet-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Hash className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold flex-1 text-foreground">Page numbers</span>
          </Link>
          <Link href="/watermark" className="flex items-center gap-3 p-3 bg-white dark:bg-card rounded-2xl border border-border hover:border-indigo-300 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/50 dark:to-violet-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Droplet className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold flex-1 text-foreground">Watermark</span>
          </Link>
          <Link href="/rotate-pdf" className="flex items-center gap-3 p-3 bg-white dark:bg-card rounded-2xl border border-border hover:border-indigo-300 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/50 dark:to-violet-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <RotateCw className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold flex-1 text-foreground">Rotate PDF</span>
          </Link>
          <Link href="/protect-pdf" className="flex items-center gap-3 p-3 bg-white dark:bg-card rounded-2xl border border-border hover:border-indigo-300 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/50 dark:to-violet-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold flex-1 text-foreground">Protect PDF</span>
          </Link>
        </div>
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
            View all tools &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
