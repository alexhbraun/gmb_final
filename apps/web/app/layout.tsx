import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GMB Audit Generator",
  description: "Instant Google Business Profile Audit & Recommendations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Gochi+Hand&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased text-gray-900 bg-gray-50">{children}</body>
    </html>
  );
}
