import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Translate PDF - Online PDF Document Translator | OmniPDF",
  description: "Translate your PDF documents online into Spanish, French, German, Japanese, and other languages while preserving formatting.",
  keywords: ["translate pdf","pdf translator online","translate document to english","free doc translation"],
  openGraph: {
    title: "Translate PDF - Online PDF Document Translator | OmniPDF",
    description: "Translate your PDF documents online into Spanish, French, German, Japanese, and other languages while preserving formatting.",
    type: "website",
  }
};

export default function TranslatePdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
