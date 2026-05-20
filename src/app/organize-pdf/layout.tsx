import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organize PDF - Reorder, Rotate, Delete PDF Pages | OmniPDF",
  description: "Rearrange, rotate, delete, or add pages inside your PDF documents with our visual online PDF organizer.",
  keywords: ["organize pdf","reorder pdf pages","delete pdf pages","free pdf page manager"],
  openGraph: {
    title: "Organize PDF - Reorder, Rotate, Delete PDF Pages | OmniPDF",
    description: "Rearrange, rotate, delete, or add pages inside your PDF documents with our visual online PDF organizer.",
    type: "website",
  }
};

export default function OrganizePdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
