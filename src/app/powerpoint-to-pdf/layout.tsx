import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PowerPoint to PDF - Convert PPTX Slides to PDF | OmniPDF",
  description: "Convert Microsoft PowerPoint presentations (.pptx and .ppt) to PDF format online. Keep transitions and design layout.",
  keywords: ["ppt to pdf","convert powerpoint to pdf","pptx to pdf converter","free ppt to pdf"],
  openGraph: {
    title: "PowerPoint to PDF - Convert PPTX Slides to PDF | OmniPDF",
    description: "Convert Microsoft PowerPoint presentations (.pptx and .ppt) to PDF format online. Keep transitions and design layout.",
    type: "website",
  }
};

export default function PowerpointToPdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
