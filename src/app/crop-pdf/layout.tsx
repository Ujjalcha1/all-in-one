import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crop PDF - Trim PDF Pages and Margins Online | OmniPDF",
  description: "Crop your PDF documents online. Select pages, adjust margins, and trim canvas dimensions with our free interactive cropping tool.",
  keywords: ["crop pdf","trim pdf page","pdf margin crop","crop pdf pages online"],
  openGraph: {
    title: "Crop PDF - Trim PDF Pages and Margins Online | OmniPDF",
    description: "Crop your PDF documents online. Select pages, adjust margins, and trim canvas dimensions with our free interactive cropping tool.",
    type: "website",
  }
};

export default function CropPdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
