import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Excel to PDF - Convert Excel Spreadsheets to PDF | OmniPDF",
  description: "Convert Excel spreadsheets (.xlsx and .xls) to high-quality PDF files online. Free, fast, and preserves formatting.",
  keywords: ["excel to pdf","convert xlsx to pdf","convert excel to pdf","free excel to pdf converter"],
  openGraph: {
    title: "Excel to PDF - Convert Excel Spreadsheets to PDF | OmniPDF",
    description: "Convert Excel spreadsheets (.xlsx and .xls) to high-quality PDF files online. Free, fast, and preserves formatting.",
    type: "website",
  }
};

export default function ExcelToPdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
