"use client";

import Link from "next/link";
import { useState } from "react";
import { categories } from "@/components/Sidebar";
import { Search, ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  const [search, setSearch] = useState("");

  const filteredCategories = categories.map(cat => {
    const filteredTools = cat.tools.filter(t => 
      t.name.toLowerCase().includes(search.toLowerCase()) || 
      t.desc.toLowerCase().includes(search.toLowerCase())
    );
    return { ...cat, tools: filteredTools };
  }).filter(cat => cat.tools.length > 0);

  return (
    <div className="h-full w-full flex flex-col p-6 md:p-10 relative overflow-hidden bg-background select-none">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-background overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[20%] left-[30%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute bottom-[20%] right-[20%] w-[40%] h-[40%] rounded-full bg-violet-500/5 blur-[120px]" />
      </div>

      <div className="w-full max-w-5xl mx-auto flex flex-col flex-1 min-h-0">
        {/* Greetings Section */}
        <section className="mb-8 flex-shrink-0">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-wider border border-red-500/15">
            <Sparkles className="w-3 h-3" />
            <span>Workspace</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-2 text-zinc-900 dark:text-white">
            Welcome to <span className="bg-gradient-to-r from-red-500 to-rose-500 bg-clip-text text-transparent">OmniPDF</span> Portal
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground font-medium max-w-3xl leading-relaxed">
            Select a PDF tool from the left navigation panel or search directly below to begin your document workflow.
          </p>
        </section>

        {/* Global Tool Search Bar */}
        <section className="mb-8 w-full max-w-md flex-shrink-0">
          <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-3.5 py-2.5 shadow-lg shadow-zinc-550/5 focus-within:border-red-500 transition-all duration-300">
            <Search className="w-4.5 h-4.5 text-zinc-400 mr-2.5 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search PDF tools (e.g. merge, word, sign)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs w-full focus:outline-none placeholder-zinc-400 text-zinc-800 dark:text-zinc-200 font-semibold"
            />
          </div>
        </section>

        {/* Dynamic Categories Grid - Internally Scrollable */}
        <section className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800/80">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
            {filteredCategories.map((cat) => {
              const CatIcon = cat.icon;
              return (
                <div 
                  key={cat.name} 
                  className="bg-white/40 dark:bg-zinc-900/30 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-5 hover:shadow-xl hover:shadow-zinc-500/5 transition-all duration-300"
                >
                  <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 dark:bg-red-500/5 text-red-500 flex items-center justify-center border border-red-500/10">
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-xs text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">{cat.name}</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {cat.tools.map((tool) => {
                      const ToolIcon = tool.icon;
                      return (
                        <Link
                          key={tool.id}
                          href={`/${tool.id}`}
                          className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-800/50 transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 group-hover:bg-red-500/10 group-hover:text-red-500 flex items-center justify-center transition-colors flex-shrink-0">
                              <ToolIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-red-500 transition-colors truncate">
                                {tool.name}
                              </h4>
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
                                {tool.desc}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
