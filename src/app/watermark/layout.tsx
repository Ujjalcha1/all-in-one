import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Watermark PDF - Add Text or Image Watermarks | OmniPDF",
  description: "Stamp text or image watermarks onto your PDF files online. Customize opacity, size, angle, and positioning.",
  keywords: ["watermark pdf","add watermark to pdf","pdf stamp online","free pdf watermarker"],
  openGraph: {
    title: "Watermark PDF - Add Text or Image Watermarks | OmniPDF",
    description: "Stamp text or image watermarks onto your PDF files online. Customize opacity, size, angle, and positioning.",
    type: "website",
  }
};

export default function WatermarkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
