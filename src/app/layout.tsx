import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Layers } from "lucide-react";
import Header from "@/components/Header";

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col`} suppressHydrationWarning>
        <Header />

        <main className="flex-1">
          {children}
        </main>

        <footer className="border-t bg-muted/40 py-8 mt-16">
          <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 font-semibold">
              <Layers className="h-5 w-5 text-primary" />
              <span>OmniPDF</span>
            </div>
            <p className="text-sm text-muted-foreground text-center md:text-left">
              &copy; {new Date().getFullYear()} OmniPDF. All rights reserved.
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
