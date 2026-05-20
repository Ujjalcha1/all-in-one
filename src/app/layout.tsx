import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import WorkspaceLayout from "@/components/workspace-layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OmniPDF - Every tool you need to work with PDFs in one place",
  description: "Merge, split, compress, convert, rotate, unlock and watermark PDFs with just a few clicks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full overflow-hidden" suppressHydrationWarning>
      <body className={`${inter.className} h-full overflow-hidden bg-background text-foreground`} suppressHydrationWarning>
        <WorkspaceLayout>{children}</WorkspaceLayout>
      </body>
    </html>
  );
}
