import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { DemoBanner, SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IleLagos — homes to rent and buy (prototype)",
  description:
    "Prototype home marketplace for Lagos. Fictional demo listings with clear costs, status labels and separate trust checks.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f3ec",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-NG" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <StoreProvider>
          <a href="#main" className="sr-only z-50 rounded-lg bg-white px-4 py-2 font-semibold text-brand-800 shadow-raised focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
            Skip to main content
          </a>
          <DemoBanner />
          <SiteHeader />
          <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">{children}</main>
          <SiteFooter />
        </StoreProvider>
      </body>
    </html>
  );
}
