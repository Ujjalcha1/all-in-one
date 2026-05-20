import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Word to PDF - Convert DOCX Documents to PDF | OmniPDF",
  description: "Convert Microsoft Word documents (.docx and .doc) to PDF format online. High-fidelity rendering preserves layouts.",
  keywords: ["word to pdf","convert docx to pdf","convert word to pdf","free word to pdf converter"],
  openGraph: {
    title: "Word to PDF - Convert DOCX Documents to PDF | OmniPDF",
    description: "Convert Microsoft Word documents (.docx and .doc) to PDF format online. High-fidelity rendering preserves layouts.",
    type: "website",
  }
};

export default function WordToPdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
