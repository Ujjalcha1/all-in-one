import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Repair PDF - Fix and Recover Damaged PDF Files | OmniPDF",
  description: "Analyze, fix, and repair corrupted or unreadable PDF files online. Reconstruct broken document structures.",
  keywords: ["repair pdf","fix corrupted pdf","recover damaged pdf file","free pdf recovery"],
  openGraph: {
    title: "Repair PDF - Fix and Recover Damaged PDF Files | OmniPDF",
    description: "Analyze, fix, and repair corrupted or unreadable PDF files online. Reconstruct broken document structures.",
    type: "website",
  }
};

export default function RepairPdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
