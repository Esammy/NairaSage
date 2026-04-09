import type { Metadata } from "next";
import { Lora, Outfit } from "next/font/google";
import { Analytics } from "@/components/Analytics";
import { AuthHydrate } from "@/components/AuthHydrate";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const lora = Lora({
  subsets: ["latin"],
  style: ["italic", "normal"],
  variable: "--font-lora",
});

export const metadata: Metadata = {
  title: "NairaSage | AI-Powered Wealth for Nigeria",
  description:
    "The AI that turns ordinary Nigerians into sophisticated investors. NGX, FIRS, and a full board of specialist agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${lora.variable} font-sans bg-white text-ink antialiased`}
      >
        <AuthHydrate>{children}</AuthHydrate>
        <Analytics />
      </body>
    </html>
  );
}
