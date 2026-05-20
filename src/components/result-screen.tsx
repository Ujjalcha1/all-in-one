"use client";

import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Cloud, Link2, Box, Trash2, Layers, SplitSquareHorizontal, Hash, Droplet, RotateCw, Shield } from "lucide-react";
import React from "react";
import Link from "next/link";

interface ResultScreenProps {
  title: string;
  downloadUrl: string;
  downloadFileName: string;
  downloadText?: string;
  onStartOver: () => void;
  children?: React.ReactNode;
}

export function ResultScreen({
  title,
  downloadUrl,
  downloadFileName,
  downloadText = "Download PDF",
  onStartOver,
  children
}: ResultScreenProps) {
  return (
    <div className="flex flex-col items-center max-w-4xl mx-auto w-full py-8 relative">
      <h2 className="text-[32px] font-black mb-8 text-center tracking-tight text-foreground">{title}</h2>
      
      <div className="flex items-center gap-4 mb-10 w-full justify-center">
        <button 
          onClick={onStartOver} 
          className="w-14 h-14 rounded-2xl bg-white dark:bg-card border border-border flex items-center justify-center hover:bg-muted shadow-sm hover:shadow-md transition-all shrink-0 hover:-translate-x-1"
          title="Start over"
        >
          <ArrowLeft className="w-6 h-6 text-muted-foreground" />
        </button>
        
        <Button size="xl" variant="hero" asChild className="px-12 py-8 text-[22px] rounded-2xl h-auto">
          <a href={downloadUrl} download={downloadFileName}>
            <Download className="mr-3 w-7 h-7" /> {downloadText}
          </a>
        </Button>
        
        <div className="grid grid-cols-2 gap-2 shrink-0">
          <button className="w-12 h-12 rounded-xl bg-white dark:bg-card border border-border text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 transition-all shadow-sm hover:shadow-md"><Cloud className="w-5 h-5" /></button>
          <button className="w-12 h-12 rounded-xl bg-white dark:bg-card border border-border text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 transition-all shadow-sm hover:shadow-md"><Link2 className="w-5 h-5" /></button>
          <button className="w-12 h-12 rounded-xl bg-white dark:bg-card border border-border text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 transition-all shadow-sm hover:shadow-md"><Box className="w-5 h-5" /></button>
          <button onClick={onStartOver} className="w-12 h-12 rounded-xl bg-white dark:bg-card border border-border text-rose-500 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-200 transition-all shadow-sm hover:shadow-md" title="Delete and start over"><Trash2 className="w-5 h-5" /></button>
        </div>
      </div>

      {children}

      <div className="w-full bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-3xl shadow-lg border border-white/20 dark:border-white/10 p-8 mb-8 max-w-3xl">
        <h3 className="font-bold text-foreground mb-6 text-lg">Continue to...</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Link href="/merge-pdf" className="flex items-center gap-3 p-3 bg-white dark:bg-card rounded-2xl border border-border hover:border-indigo-300 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/50 dark:to-violet-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><Layers className="w-5 h-5" /></div>
            <span className="text-sm font-semibold flex-1 text-foreground">Merge PDF</span>
          </Link>
          <Link href="/split-pdf" className="flex items-center gap-3 p-3 bg-white dark:bg-card rounded-2xl border border-border hover:border-indigo-300 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/50 dark:to-violet-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><SplitSquareHorizontal className="w-5 h-5" /></div>
            <span className="text-sm font-semibold flex-1 text-foreground">Split PDF</span>
          </Link>
          <Link href="/page-number" className="flex items-center gap-3 p-3 bg-white dark:bg-card rounded-2xl border border-border hover:border-indigo-300 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/50 dark:to-violet-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><Hash className="w-5 h-5" /></div>
            <span className="text-sm font-semibold flex-1 text-foreground">Page numbers</span>
          </Link>
          <Link href="/watermark" className="flex items-center gap-3 p-3 bg-white dark:bg-card rounded-2xl border border-border hover:border-indigo-300 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/50 dark:to-violet-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><Droplet className="w-5 h-5" /></div>
            <span className="text-sm font-semibold flex-1 text-foreground">Watermark</span>
          </Link>
          <Link href="/rotate-pdf" className="flex items-center gap-3 p-3 bg-white dark:bg-card rounded-2xl border border-border hover:border-indigo-300 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/50 dark:to-violet-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><RotateCw className="w-5 h-5" /></div>
            <span className="text-sm font-semibold flex-1 text-foreground">Rotate PDF</span>
          </Link>
          <Link href="/protect-pdf" className="flex items-center gap-3 p-3 bg-white dark:bg-card rounded-2xl border border-border hover:border-indigo-300 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/50 dark:to-violet-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><Shield className="w-5 h-5" /></div>
            <span className="text-sm font-semibold flex-1 text-foreground">Protect PDF</span>
          </Link>
        </div>
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm font-bold text-indigo-500 hover:text-indigo-600 transition-colors">View all tools &rarr;</Link>
        </div>
      </div>
    </div>
  );
}
