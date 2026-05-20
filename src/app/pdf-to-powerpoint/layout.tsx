import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDF to PowerPoint Converter - Convert PDF to PPTX | OmniPDF",
  description: "Convert PDF documents to editable Microsoft PowerPoint slide presentations (.pptx) online. Free and easy.",
  keywords: ["pdf to ppt","pdf to powerpoint","convert pdf to pptx","free pdf to presentation"],
  openGraph: {
    title: "PDF to PowerPoint Converter - Convert PDF to PPTX | OmniPDF",
    description: "Convert PDF documents to editable Microsoft PowerPoint slide presentations (.pptx) online. Free and easy.",
    type: "website",
  }
};

export default function PdfToPowerpointLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
