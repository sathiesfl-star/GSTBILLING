import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gstbilling-omega.vercel.app";
const TITLE = "BillEasy — GST Billing & E-Invoicing Software for India";
const DESCRIPTION =
  "Create GST-compliant invoices, generate e-invoice IRN + QR in 1 click, send on WhatsApp, and file GSTR-1 & 3B — built for Indian businesses. Free 14-day trial.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · BillEasy",
  },
  description: DESCRIPTION,
  applicationName: "BillEasy",
  keywords: [
    "GST billing software",
    "e-invoice software India",
    "GST e-invoicing",
    "IRN generation",
    "GST invoice generator",
    "GSTR-1 filing",
    "GSTR-3B",
    "e-way bill",
    "GST software for small business",
    "online billing software India",
    "HSN SAC GST",
    "tax invoice India",
  ],
  authors: [{ name: "BillEasy" }],
  creator: "BillEasy",
  publisher: "BillEasy",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "BillEasy",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "business software",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
