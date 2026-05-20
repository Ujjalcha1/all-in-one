import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Split PDF - Extract Pages or Separate PDF Files | OmniPDF",
  description: "Split PDF files online by page ranges, extract single pages, or separate every page of the document into separate PDFs.",
  keywords: ["split pdf","extract pdf pages","separate pdf file","free pdf splitter online"],
  openGraph: {
    title: "Split PDF - Extract Pages or Separate PDF Files | OmniPDF",
    description: "Split PDF files online by page ranges, extract single pages, or separate every page of the document into separate PDFs.",
    type: "website",
  }
};

export default function SplitPdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
