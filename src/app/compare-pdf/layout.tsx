import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare PDF - Check Differences Between PDF Files | OmniPDF",
  description: "Compare two PDF files online side-by-side to highlight and inspect text or layout differences. Fast, secure, and free.",
  keywords: ["compare pdf","pdf difference checker","diff pdf online","free pdf comparison tool"],
  openGraph: {
    title: "Compare PDF - Check Differences Between PDF Files | OmniPDF",
    description: "Compare two PDF files online side-by-side to highlight and inspect text or layout differences. Fast, secure, and free.",
    type: "website",
  }
};

export default function ComparePdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
