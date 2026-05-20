import * as React from "react";
import { cn } from "./ui/button";

interface ToolLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function ToolLayout({ title, description, children, icon }: ToolLayoutProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] w-full relative flex flex-col items-center">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 bg-background overflow-hidden -z-10">
        <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="w-full pt-16 pb-12 px-4 flex flex-col items-center border-b border-border/50 bg-white/40 dark:bg-black/40 backdrop-blur-xl">
        <div className="w-full max-w-4xl flex flex-col items-center text-center">
          {icon && (
            <div className="mb-6 p-4 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400 shadow-inner border border-indigo-500/10">
              {icon}
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl font-medium">
            {description}
          </p>
        </div>
      </div>
      
      <div className="w-full max-w-5xl px-4 py-12 flex-1 flex flex-col items-stretch">
        {children}
      </div>
    </div>
  );
}
