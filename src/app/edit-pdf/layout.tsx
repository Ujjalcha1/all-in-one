import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit PDF - Free Online PDF Editor | OmniPDF",
  description: "Add text, shapes, comments, and highlight sections on your PDF documents directly from your browser. Easy-to-use free online PDF editor.",
  keywords: ["edit pdf","online pdf editor","free pdf editor","write on pdf"],
  openGraph: {
    title: "Edit PDF - Free Online PDF Editor | OmniPDF",
    description: "Add text, shapes, comments, and highlight sections on your PDF documents directly from your browser. Easy-to-use free online PDF editor.",
    type: "website",
  }
};

export default function EditPdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
