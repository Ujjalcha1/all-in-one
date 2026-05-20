import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Protect PDF - Password Protect PDF Files Online | OmniPDF",
  description: "Add passwords and secure encryption to your PDF documents. Restrict opening, copying, or printing of PDF files.",
  keywords: ["protect pdf","password protect pdf","encrypt pdf","secure pdf document online"],
  openGraph: {
    title: "Protect PDF - Password Protect PDF Files Online | OmniPDF",
    description: "Add passwords and secure encryption to your PDF documents. Restrict opening, copying, or printing of PDF files.",
    type: "website",
  }
};

export default function ProtectPdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
