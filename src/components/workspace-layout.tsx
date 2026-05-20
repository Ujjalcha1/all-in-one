"use client";

import * as React from "react";
import { Sidebar } from "@/components/Sidebar";
import Header from "@/components/Header";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setCollapsed] = React.useState(false);
  const [isOpenMobile, setOpenMobile] = React.useState(false);

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-zinc-50 dark:bg-zinc-950 text-foreground">
      {/* Collapsible/Responsive Left Sidebar */}
      <Sidebar 
        isCollapsed={isCollapsed} 
        setCollapsed={setCollapsed} 
        isOpenMobile={isOpenMobile} 
        setOpenMobile={setOpenMobile} 
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <Header onToggleMobileMenu={() => setOpenMobile(!isOpenMobile)} />

        {/* Scrollable Content Workspace */}
        <main className="flex-1 overflow-y-auto relative min-w-0 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
