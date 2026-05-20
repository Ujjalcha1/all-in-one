"use client";

import Link from "next/link";
import { 
  Layers, SplitSquareHorizontal, Minimize2, FileText, Presentation, Table, 
  FileType2, MonitorPlay, Sheet, Edit3, Image as ImageIcon, FileImage, 
  PenTool, Droplet, RotateCw, Globe, Unlock, Lock, LayoutGrid, Archive, 
  Wrench, Hash, Scan, FileSearch, GitCompare, Scissors, Crop, FormInput, 
  Languages 
} from "lucide-react";
import { motion } from "framer-motion";

const tools = [
  { id: 'merge-pdf', name: 'Merge PDF', description: 'Combine PDFs in the order you want with the easiest PDF merger available.', icon: Layers, color: 'text-red-500' },
  { id: 'split-pdf', name: 'Split PDF', description: 'Separate one page or a whole set for easy conversion into independent PDF files.', icon: SplitSquareHorizontal, color: 'text-orange-500' },
  { id: 'compress-pdf', name: 'Compress PDF', description: 'Reduce file size while optimizing for maximal PDF quality.', icon: Minimize2, color: 'text-green-500' },
  { id: 'pdf-to-word', name: 'PDF to Word', description: 'Easily convert your PDF files into easy to edit DOC and DOCX documents.', icon: FileText, color: 'text-blue-500' },
  { id: 'pdf-to-powerpoint', name: 'PDF to PowerPoint', description: 'Turn your PDF files into easy to edit PPT and PPTX slideshows.', icon: Presentation, color: 'text-orange-600' },
  { id: 'pdf-to-excel', name: 'PDF to Excel', description: 'Pull data straight from PDFs into Excel spreadsheets in a few short seconds.', icon: Table, color: 'text-green-600' },
  { id: 'word-to-pdf', name: 'Word to PDF', description: 'Make DOC and DOCX files easy to read by converting them to PDF.', icon: FileType2, color: 'text-blue-500' },
  { id: 'powerpoint-to-pdf', name: 'PowerPoint to PDF', description: 'Make PPT and PPTX slideshows easy to view by converting them to PDF.', icon: MonitorPlay, color: 'text-orange-600' },
  { id: 'excel-to-pdf', name: 'Excel to PDF', description: 'Make EXCEL spreadsheets easy to read by converting them to PDF.', icon: Sheet, color: 'text-green-600' },
  { id: 'edit-pdf', name: 'Edit PDF', description: 'Add text, images, shapes or freehand annotations to a PDF document.', icon: Edit3, color: 'text-purple-500' },
  { id: 'pdf-to-jpg', name: 'PDF to JPG', description: 'Convert each PDF page into a JPG or extract all images contained in a PDF.', icon: ImageIcon, color: 'text-yellow-500' },
  { id: 'jpg-to-pdf', name: 'JPG to PDF', description: 'Convert JPG images to PDF in seconds. Easily adjust orientation and margins.', icon: FileImage, color: 'text-yellow-600' },
  { id: 'sign-pdf', name: 'Sign PDF', description: 'Sign yourself or request electronic signatures from others.', icon: PenTool, color: 'text-indigo-500' },
  { id: 'watermark', name: 'Watermark', description: 'Stamp an image or text over your PDF in seconds.', icon: Droplet, color: 'text-cyan-500' },
  { id: 'rotate-pdf', name: 'Rotate PDF', description: 'Rotate your PDFs the way you need them.', icon: RotateCw, color: 'text-rose-500' },
  { id: 'html-to-pdf', name: 'HTML to PDF', description: 'Convert webpages in HTML to PDF.', icon: Globe, color: 'text-sky-500' },
  { id: 'unlock-pdf', name: 'Unlock PDF', description: 'Remove PDF password security, giving you the freedom to use your PDFs as you want.', icon: Unlock, color: 'text-gray-500' },
  { id: 'protect-pdf', name: 'Protect PDF', description: 'Encrypt your PDF with a password to keep sensitive data confidential.', icon: Lock, color: 'text-slate-700' },
  { id: 'organize-pdf', name: 'Organize PDF', description: 'Sort, add and delete PDF pages.', icon: LayoutGrid, color: 'text-pink-500' },
  { id: 'pdf-to-pdfa', name: 'PDF to PDF/A', description: 'Transform your PDF to PDF/A, the ISO-standardized version of PDF for long-term archiving.', icon: Archive, color: 'text-emerald-500' },
  { id: 'repair-pdf', name: 'Repair PDF', description: 'Repair a damaged PDF and recover data from corrupt PDF.', icon: Wrench, color: 'text-zinc-500' },
  { id: 'page-number', name: 'Page Numbers', description: 'Add page numbers into PDFs with ease.', icon: Hash, color: 'text-fuchsia-500' },
  { id: 'compare-pdf', name: 'Compare PDF', description: 'Compare two PDF files side by side to spot differences.', icon: GitCompare, color: 'text-violet-500' },
  { id: 'redact-pdf', name: 'Redact PDF', description: 'Permanently remove visible text and graphics from a document.', icon: Scissors, color: 'text-red-600' },
  { id: 'crop-pdf', name: 'Crop PDF', description: 'Crop PDF margins, change PDF page size.', icon: Crop, color: 'text-lime-600' },
  { id: 'pdf-forms', name: 'PDF Forms', description: 'Create and fill PDF forms.', icon: FormInput, color: 'text-amber-500' },
  { id: 'translate-pdf', name: 'Translate PDF', description: 'Translate a PDF document into any language.', icon: Languages, color: 'text-indigo-400' },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center pt-16 pb-24 relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 bg-background -z-10 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[100px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-violet-500/10 blur-[100px]" />
      </div>

      <section className="w-full text-center px-4 mb-20 max-w-4xl mx-auto relative z-10">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-semibold text-sm shadow-sm">
          ✨ The Premium PDF Toolkit
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent drop-shadow-sm">
          Every tool you need to work with PDFs in one place
        </h1>
        <p className="text-xl text-muted-foreground mb-8 leading-relaxed font-medium">
          Every tool you need to use PDFs, at your fingertips. All are 100% FREE and easy to use! 
          Merge, split, compress, convert, rotate, unlock and watermark PDFs with just a few clicks.
        </p>
      </section>

      <section className="w-full max-w-[1400px] px-4 md:px-8 relative z-10">
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <motion.div key={tool.id} variants={item}>
                <Link 
                  href={`/${tool.id}`}
                  className="block h-full group bg-white/60 dark:bg-black/40 backdrop-blur-md border border-border/50 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 rounded-[2rem] p-6 hover:-translate-y-1 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-violet-500/0 group-hover:from-indigo-500/5 group-hover:to-violet-500/5 transition-all duration-500" />
                  <div className="flex flex-col items-center text-center h-full relative z-10">
                    <div className={`mb-5 p-4 rounded-2xl bg-white dark:bg-card shadow-sm border border-border/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 ${tool.color}`}>
                      <Icon strokeWidth={2} className="w-10 h-10" />
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{tool.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 font-medium">{tool.description}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </section>
    </div>
  );
}
