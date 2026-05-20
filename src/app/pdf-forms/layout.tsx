import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fill & Sign PDF Forms - Free Interactive PDF Form Filler | OmniPDF",
  description: "Fill interactive PDF form fields, add custom text notes, and download completed PDF forms online. Secure and free form filler.",
  keywords: ["pdf form filler","fill pdf online","interactive pdf forms","free pdf form reader"],
  openGraph: {
    title: "Fill & Sign PDF Forms - Free Interactive PDF Form Filler | OmniPDF",
    description: "Fill interactive PDF form fields, add custom text notes, and download completed PDF forms online. Secure and free form filler.",
    type: "website",
  }
};

export default function PdfFormsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
