import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDF to JPG Converter - Convert PDF Pages to JPG Images | OmniPDF",
  description: "Extract images from PDF or convert PDF pages to high-quality JPG/PNG format online. Fast and free page extractor.",
  keywords: ["pdf to jpg","pdf to png","convert pdf to image","extract pdf pages to image"],
  openGraph: {
    title: "PDF to JPG Converter - Convert PDF Pages to JPG Images | OmniPDF",
    description: "Extract images from PDF or convert PDF pages to high-quality JPG/PNG format online. Fast and free page extractor.",
    type: "website",
  }
};

export default function PdfToJpgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
