import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HTML to PDF - Convert Web Pages to PDF | OmniPDF",
  description: "Convert HTML files or website URLs to beautifully formatted PDF documents online. Free Web page to PDF converter.",
  keywords: ["html to pdf","url to pdf","convert webpage to pdf","free webpage to pdf"],
  openGraph: {
    title: "HTML to PDF - Convert Web Pages to PDF | OmniPDF",
    description: "Convert HTML files or website URLs to beautifully formatted PDF documents online. Free Web page to PDF converter.",
    type: "website",
  }
};

export default function HtmlToPdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
