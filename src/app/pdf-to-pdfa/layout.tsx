import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDF to PDF/A Converter - Archive PDF Files Online | OmniPDF",
  description: "Convert your PDF files to PDF/A format (ISO standard for long-term archiving). Free online preservation tool.",
  keywords: ["pdf to pdf/a","pdfa converter","convert pdf to pdfa","archive pdf online"],
  openGraph: {
    title: "PDF to PDF/A Converter - Archive PDF Files Online | OmniPDF",
    description: "Convert your PDF files to PDF/A format (ISO standard for long-term archiving). Free online preservation tool.",
    type: "website",
  }
};

export default function PdfToPdfaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
