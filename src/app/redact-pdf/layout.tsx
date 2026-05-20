import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Redact PDF - Securely Black Out Sensitive PDF Text | OmniPDF",
  description: "Black out private information, redact text paragraphs, or hide metadata elements securely in your PDF files online.",
  keywords: ["redact pdf","black out pdf text","remove private information from pdf","pdf redaction tool"],
  openGraph: {
    title: "Redact PDF - Securely Black Out Sensitive PDF Text | OmniPDF",
    description: "Black out private information, redact text paragraphs, or hide metadata elements securely in your PDF files online.",
    type: "website",
  }
};

export default function RedactPdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
