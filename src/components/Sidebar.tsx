"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Layers, SplitSquareHorizontal, Minimize2, FileText, Presentation, Table, 
  FileType2, MonitorPlay, Sheet, Edit3, Image as ImageIcon, FileImage, 
  PenTool, Droplet, RotateCw, Globe, Unlock, Lock, LayoutGrid, Archive, 
  Wrench, Hash, GitCompare, Scissors, Crop, FormInput, Languages,
  Search, ChevronDown, ChevronRight, X, Menu, Settings
} from "lucide-react";

export const categories = [
  {
    name: "Organize PDF",
    icon: Layers,
    tools: [
      { id: "merge-pdf", name: "Merge PDF", icon: Layers, desc: "Combine PDFs in your desired order." },
      { id: "split-pdf", name: "Split PDF", icon: SplitSquareHorizontal, desc: "Separate pages into independent files." },
      { id: "organize-pdf", name: "Organize PDF", icon: LayoutGrid, desc: "Sort, add, or delete PDF pages." },
      { id: "rotate-pdf", name: "Rotate PDF", icon: RotateCw, desc: "Rotate pages of your PDF." },
      { id: "crop-pdf", name: "Crop PDF", icon: Crop, desc: "Trim PDF page margins." },
    ]
  },
  {
    name: "Convert to PDF",
    icon: FileType2,
    tools: [
      { id: "word-to-pdf", name: "Word to PDF", icon: FileText, desc: "Convert Word files to PDF." },
      { id: "powerpoint-to-pdf", name: "PowerPoint to PDF", icon: MonitorPlay, desc: "Convert PPT presentations to PDF." },
      { id: "excel-to-pdf", name: "Excel to PDF", icon: Sheet, desc: "Convert Excel tables to PDF." },
      { id: "html-to-pdf", name: "HTML to PDF", icon: Globe, desc: "Convert web pages to PDF." },
      { id: "jpg-to-pdf", name: "JPG to PDF", icon: FileImage, desc: "Convert images to PDF." },
    ]
  },
  {
    name: "Convert from PDF",
    icon: FileText,
    tools: [
      { id: "pdf-to-word", name: "PDF to Word", icon: FileText, desc: "Convert PDF back to Word." },
      { id: "pdf-to-powerpoint", name: "PDF to PowerPoint", icon: Presentation, desc: "Convert PDF to PPT." },
      { id: "pdf-to-excel", name: "PDF to Excel", icon: Table, desc: "Convert PDF to Excel sheets." },
      { id: "pdf-to-jpg", name: "PDF to JPG", icon: ImageIcon, desc: "Extract or convert pages to images." },
      { id: "pdf-to-pdfa", name: "PDF to PDF/A", icon: Archive, desc: "Convert PDF to PDF/A format." },
    ]
  },
  {
    name: "Edit & Security",
    icon: Edit3,
    tools: [
      { id: "edit-pdf", name: "Edit PDF", icon: Edit3, desc: "Add text, shapes, or notes to PDF." },
      { id: "sign-pdf", name: "Sign PDF", icon: PenTool, desc: "Sign documents with your signature." },
      { id: "watermark", name: "Watermark PDF", icon: Droplet, desc: "Stamp watermarks onto your PDF." },
      { id: "unlock-pdf", name: "Unlock PDF", icon: Unlock, desc: "Remove passwords from PDFs." },
      { id: "protect-pdf", name: "Protect PDF", icon: Lock, desc: "Secure PDFs with a password." },
      { id: "repair-pdf", name: "Repair PDF", icon: Wrench, desc: "Recover data from broken PDFs." },
      { id: "page-number", name: "Page Numbers", icon: Hash, desc: "Number your PDF pages." },
      { id: "compare-pdf", name: "Compare PDF", icon: GitCompare, desc: "Spot differences between two PDFs." },
      { id: "redact-pdf", name: "Redact PDF", icon: Scissors, desc: "Blackout confidential information." },
      { id: "pdf-forms", name: "PDF Forms", icon: FormInput, desc: "Fill out or construct PDF forms." },
      { id: "translate-pdf", name: "Translate PDF", icon: Languages, desc: "Translate PDF contents." },
    ]
  }
];

interface SidebarProps {
  isCollapsed: boolean;
  setCollapsed: (val: boolean) => void;
  isOpenMobile: boolean;
  setOpenMobile: (val: boolean) => void;
}

export function Sidebar({ isCollapsed, setCollapsed, isOpenMobile, setOpenMobile }: SidebarProps) {
  const pathname = usePathname();
  const [search, setSearch] = React.useState("");
  const [expandedCats, setExpandedCats] = React.useState<Record<string, boolean>>({
    "Organize PDF": true,
    "Convert to PDF": true,
    "Convert from PDF": true,
    "Edit & Security": true,
  });

  const toggleCategory = (catName: string) => {
    setExpandedCats(prev => ({ ...prev, [catName]: !prev[catName] }));
  };

  const filteredCategories = categories.map(cat => {
    const filteredTools = cat.tools.filter(t => 
      t.name.toLowerCase().includes(search.toLowerCase()) || 
      t.desc.toLowerCase().includes(search.toLowerCase())
    );
    return { ...cat, tools: filteredTools };
  }).filter(cat => cat.tools.length > 0);

  const sidebarWidthClass = isCollapsed ? "w-16" : "w-64";

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setOpenMobile(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col h-screen bg-zinc-900 text-zinc-100 border-r border-zinc-800 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${sidebarWidthClass} ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand & Mobile Close button */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800">
          <Link 
            href="/" 
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
            onClick={() => setOpenMobile(false)}
          >
            <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
              <Layers className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <span className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                OmniPDF
              </span>
            )}
          </Link>

          {/* Collapsible toggle (Desktop) */}
          <button
            onClick={() => setCollapsed(!isCollapsed)}
            className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>

          {/* Close button (Mobile) */}
          <button
            onClick={() => setOpenMobile(false)}
            className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search tool */}
        {!isCollapsed && (
          <div className="p-4 border-b border-zinc-800/50">
            <div className="relative flex items-center bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-1.5 focus-within:border-zinc-500 transition-colors">
              <Search className="w-4 h-4 text-zinc-500 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search tools..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-xs w-full focus:outline-none placeholder-zinc-500 text-zinc-200"
              />
              {search && (
                <button 
                  onClick={() => setSearch("")} 
                  className="text-zinc-500 hover:text-zinc-200 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tools Menu List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
          {filteredCategories.map((cat) => {
            const CatIcon = cat.icon;
            const isExpanded = expandedCats[cat.name] || search.length > 0;

            return (
              <div key={cat.name} className="space-y-1">
                {/* Category Header */}
                {!isCollapsed ? (
                  <button
                    onClick={() => toggleCategory(cat.name)}
                    className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-500 hover:text-zinc-300 py-1.5 px-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <CatIcon className="w-3.5 h-3.5" />
                      <span>{cat.name}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                ) : (
                  <div className="w-full border-b border-zinc-800/30 my-2" />
                )}

                {/* Category Tools */}
                {(isExpanded || isCollapsed) && (
                  <div className="space-y-0.5">
                    {cat.tools.map((t) => {
                      const ToolIcon = t.icon;
                      const isActive = pathname === `/${t.id}`;

                      return (
                        <Link
                          key={t.id}
                          href={`/${t.id}`}
                          onClick={() => setOpenMobile(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group relative ${
                            isActive
                              ? "bg-red-500/10 text-red-400 border border-red-500/20 font-semibold"
                              : "hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 border border-transparent"
                          }`}
                          title={isCollapsed ? t.name : undefined}
                        >
                          <ToolIcon className={`w-4.5 h-4.5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                            isActive ? "text-red-500" : "text-zinc-500 group-hover:text-zinc-400"
                          }`} />
                          
                          {!isCollapsed && (
                            <span className="text-xs truncate">{t.name}</span>
                          )}

                          {/* Hover Tooltip (when collapsed) */}
                          {isCollapsed && (
                            <div className="absolute left-14 bg-zinc-950 text-zinc-100 text-xs px-2.5 py-1.5 rounded-lg border border-zinc-800 shadow-xl opacity-0 translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all z-50 whitespace-nowrap">
                              <p className="font-bold">{t.name}</p>
                              <p className="text-[10px] text-zinc-400 font-normal">{t.desc}</p>
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer/Settings Info */}
        {!isCollapsed && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 text-[10px] text-zinc-500 font-medium">
            <p>&copy; {new Date().getFullYear()} OmniPDF Portal</p>
          </div>
        )}
      </aside>
    </>
  );
}
