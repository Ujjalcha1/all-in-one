import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rotate PDF - Spin PDF Pages Online | OmniPDF",
  description: "Rotate specific pages or entire PDF documents. Spin left, right, or upside down and save rotated PDFs for free.",
  keywords: ["rotate pdf","spin pdf pages","flip pdf document online","free pdf rotator"],
  openGraph: {
    title: "Rotate PDF - Spin PDF Pages Online | OmniPDF",
    description: "Rotate specific pages or entire PDF documents. Spin left, right, or upside down and save rotated PDFs for free.",
    type: "website",
  }
};

export default function RotatePdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
