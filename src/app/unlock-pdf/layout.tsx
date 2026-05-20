import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unlock PDF - Remove Password & Restrictions | OmniPDF",
  description: "Remove passwords, permissions, copy-print blocks, and encryption security from locked PDF files online.",
  keywords: ["unlock pdf","remove password from pdf","decrypt pdf","pdf permission remover"],
  openGraph: {
    title: "Unlock PDF - Remove Password & Restrictions | OmniPDF",
    description: "Remove passwords, permissions, copy-print blocks, and encryption security from locked PDF files online.",
    type: "website",
  }
};

export default function UnlockPdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
