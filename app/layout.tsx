import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BillEasy — 1-click GST e-invoices",
  description:
    "Get GST e-invoices (IRN + QR) in 1 click. Stay compliant with the new ₹2cr e-invoicing rule.",
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
