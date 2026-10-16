import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display-face", display: "swap", weight: ["600", "700"] });
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans-face", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://uae-labour-law-assistant.vercel.app"),
  title: { default: "UAE Labour Law Assistant", template: "%s · UAE Labour Law Assistant" },
  description: "Ask questions about your rights at work in the UAE and get answers that cite the exact articles of the Labour Law (Decree-Law 33/2021). With an end-of-service gratuity calculator.",
  openGraph: { title: "UAE Labour Law Assistant", type: "website" },
};

export const viewport: Viewport = { themeColor: "#f7f4ec" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white">
          Skip to content
        </a>
        <Navbar />
        <main id="main" className="pb-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
