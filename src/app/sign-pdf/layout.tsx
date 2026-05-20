import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign PDF - Electronic Signatures for PDF Online | OmniPDF",
  description: "Draw, upload, or type your signature to sign PDF documents electronically. Secure, legally-binding, and free e-signatures.",
  keywords: ["sign pdf","electronic signature pdf","e-sign pdf online","free pdf signer"],
  openGraph: {
    title: "Sign PDF - Electronic Signatures for PDF Online | OmniPDF",
    description: "Draw, upload, or type your signature to sign PDF documents electronically. Secure, legally-binding, and free e-signatures.",
    type: "website",
  }
};

export default function SignPdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
