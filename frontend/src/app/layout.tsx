import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "NairaSage | AI-Powered Financial Co-Pilot",
  description: "Your personalized, always-on AI wealth manager for the Nigerian market.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-NG" className="dark">
      <body className={`${inter.variable} font-sans min-h-screen bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
