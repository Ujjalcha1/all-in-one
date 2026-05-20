import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDF to Word Converter - Edit PDF in Microsoft Word | OmniPDF",
  description: "Convert PDF files to editable Microsoft Word documents (.docx) online with high text formatting accuracy. Free and secure.",
  keywords: ["pdf to word","convert pdf to docx","pdf to word converter","free pdf to doc converter"],
  openGraph: {
    title: "PDF to Word Converter - Edit PDF in Microsoft Word | OmniPDF",
    description: "Convert PDF files to editable Microsoft Word documents (.docx) online with high text formatting accuracy. Free and secure.",
    type: "website",
  }
};

export default function PdfToWordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
