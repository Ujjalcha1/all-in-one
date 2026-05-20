"use client";

import * as React from "react";
import { UploadCloud, File as FileIcon, X } from "lucide-react";
import { Button } from "./ui/button";

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
}

export function FileUploader({ 
  onFilesSelected, 
  accept = "application/pdf", 
  multiple = false,
  maxFiles = 10 
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
    // Filter by accepted types (very basic check)
    let validFiles = newFiles;
    if (accept) {
      const acceptedTypes = accept.split(",").map(t => t.trim().replace(".*", ""));
      validFiles = validFiles.filter(file => {
        return acceptedTypes.some(type => file.type.includes(type) || file.name.endsWith(type));
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

  return (
    <div className="w-full relative group">
      <div className={`absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 rounded-[2rem] blur-xl transition-opacity duration-500 ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
      
      <div
        className={`w-full h-80 md:h-96 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300 relative bg-white/50 dark:bg-black/50 backdrop-blur-sm shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 ${
          isDragging
            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[1.02]"
            : "border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-500"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner group-hover:scale-110 transition-transform duration-500">
          <UploadCloud className="w-12 h-12" />
        </div>
        <h3 className="text-3xl font-black mb-3 tracking-tight text-foreground">Select {multiple ? "PDF files" : "a PDF file"}</h3>
        <p className="text-muted-foreground mb-10 font-medium text-lg">or drag and drop {multiple ? "PDFs" : "PDF"} here</p>
        
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
        />
        <Button size="xl" variant="hero" onClick={() => fileInputRef.current?.click()} className="px-12 rounded-full shadow-lg hover:shadow-indigo-500/30">
          Choose {multiple ? "Files" : "File"}
        </Button>
      </div>
    </div>
  );
}
