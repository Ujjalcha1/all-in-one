import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compress PDF - Reduce PDF File Size Online | OmniPDF",
  description: "Reduce the size of your PDF files online for free. Keep the original quality while optimizing the file size. Fast and secure.",
  keywords: ["compress pdf","reduce pdf size","shrink pdf","pdf optimizer","free pdf compressor"],
  openGraph: {
    title: "Compress PDF - Reduce PDF File Size Online | OmniPDF",
    description: "Reduce the size of your PDF files online for free. Keep the original quality while optimizing the file size. Fast and secure.",
    type: "website",
  }
};

export default function CompressPdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
