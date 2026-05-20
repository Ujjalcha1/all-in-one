import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JPG to PDF - Convert Images to PDF Online | OmniPDF",
  description: "Convert JPG, PNG, GIF, and other image files to PDF documents in seconds. Merge multiple images into a single PDF.",
  keywords: ["jpg to pdf","convert images to pdf","png to pdf","free image to pdf converter"],
  openGraph: {
    title: "JPG to PDF - Convert Images to PDF Online | OmniPDF",
    description: "Convert JPG, PNG, GIF, and other image files to PDF documents in seconds. Merge multiple images into a single PDF.",
    type: "website",
  }
};

export default function JpgToPdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
