"use client";

import * as React from "react";
import { UploadCloud, File as FileIcon, X } from "lucide-react";
import { Button } from "./ui/button";

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  title?: string;
  description?: string;
}

export function FileUploader({ 
  onFilesSelected, 
  accept = "application/pdf", 
  multiple = false,
  maxFiles = 10,
  title,
  description
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = (newFiles: File[]) => {
    let validFiles = newFiles;
    if (accept) {
      const acceptedTypes = accept.split(",").map(t => t.trim().replace(".*", ""));
      validFiles = validFiles.filter(file => {
        return acceptedTypes.some(type => file.type.includes(type) || file.name.toLowerCase().endsWith(type.toLowerCase()));
      });
    }

    if (!multiple && validFiles.length > 0) {
      validFiles = [validFiles[0]];
    }

    if (validFiles.length > maxFiles) {
      validFiles = validFiles.slice(0, maxFiles);
      alert(`You can only upload up to ${maxFiles} files at once.`);
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    } else {
      alert(`Please select valid files. Accepted: ${accept}`);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Determine fallback prompts based on accept prop
  const getPromptTitle = () => {
    if (title) return title;
    if (accept.includes("word")) return "Choose Word Document";
    if (accept.includes("presentation") || accept.includes("powerpoint")) return "Choose PowerPoint";
    if (accept.includes("sheet") || accept.includes("excel")) return "Choose Excel Table";
    if (accept.includes("image")) return "Choose Image File";
    return `Choose PDF ${multiple ? "Documents" : "Document"}`;
  };

  const getPromptDesc = () => {
    if (description) return description;
    if (accept.includes("word")) return "or drag and drop Word files here";
    if (accept.includes("presentation") || accept.includes("powerpoint")) return "or drag and drop PowerPoint files here";
    if (accept.includes("sheet") || accept.includes("excel")) return "or drag and drop Excel files here";
    if (accept.includes("image")) return "or drag and drop image files here";
    return `or drag and drop your ${multiple ? "PDF files" : "file"} here`;
  };

  return (
    <div className="w-full relative group">
      <div className={`absolute inset-0 bg-gradient-to-r from-red-500/5 to-rose-500/5 rounded-[2rem] blur-xl transition-opacity duration-500 ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
      
      <div
        className={`w-full h-80 md:h-96 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300 relative bg-white/50 dark:bg-black/50 backdrop-blur-sm shadow-sm hover:shadow-xl hover:shadow-red-500/5 ${
          isDragging
            ? "border-red-500 bg-red-50/50 dark:bg-red-950/20 scale-[1.01]"
            : "border-zinc-200 dark:border-zinc-800 hover:border-red-500 dark:hover:border-red-500"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-red-500/10 to-rose-500/10 flex items-center justify-center text-red-500 border border-red-550/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
          <UploadCloud className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-black mb-1.5 tracking-tight text-zinc-800 dark:text-zinc-100">{getPromptTitle()}</h3>
        <p className="text-muted-foreground mb-8 font-semibold text-xs">{getPromptDesc()}</p>
        
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
        />
        <Button 
          onClick={() => fileInputRef.current?.click()} 
          className="bg-red-500 hover:bg-red-600 text-white font-extrabold px-10 h-12 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-red-500/10 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          Select File
        </Button>
      </div>
    </div>
  );
}
