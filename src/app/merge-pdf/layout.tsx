import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Merge PDF - Combine PDF Files Online | OmniPDF",
  description: "Combine multiple PDF documents into a single file online. Reorder pages, merge files, and organize PDFs easily for free.",
  keywords: ["merge pdf","combine pdf files","join pdf","free pdf merger online"],
  openGraph: {
    title: "Merge PDF - Combine PDF Files Online | OmniPDF",
    description: "Combine multiple PDF documents into a single file online. Reorder pages, merge files, and organize PDFs easily for free.",
    type: "website",
  }
};

export default function MergePdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
