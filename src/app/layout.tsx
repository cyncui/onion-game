import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const argentPixel = localFont({
  src: "../../public/fonts/Argent_Pixel_CF.woff2",
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trove Pitch Deck",
  description:
    "Interactive stories that capture real behavior. People have layers — so does Trove.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${argentPixel.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
