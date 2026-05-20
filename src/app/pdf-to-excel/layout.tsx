import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDF to Excel Converter - Export PDF to Excel Sheet | OmniPDF",
  description: "Convert PDF documents to editable Microsoft Excel spreadsheets (.xlsx) online. Highly accurate tables and text extraction.",
  keywords: ["pdf to excel","convert pdf to xlsx","pdf to spreadsheet converter","extract table from pdf"],
  openGraph: {
    title: "PDF to Excel Converter - Export PDF to Excel Sheet | OmniPDF",
    description: "Convert PDF documents to editable Microsoft Excel spreadsheets (.xlsx) online. Highly accurate tables and text extraction.",
    type: "website",
  }
};

export default function PdfToExcelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
