import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Page Numbers to PDF - Free Page Numbering Tool | OmniPDF",
  description: "Number PDF pages online. Customize fonts, colors, positioning, and page ranges with our free page numbering tool.",
  keywords: ["add page numbers to pdf","pdf page numberer","insert page numbers in pdf"],
  openGraph: {
    title: "Add Page Numbers to PDF - Free Page Numbering Tool | OmniPDF",
    description: "Number PDF pages online. Customize fonts, colors, positioning, and page ranges with our free page numbering tool.",
    type: "website",
  }
};

export default function PageNumberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
