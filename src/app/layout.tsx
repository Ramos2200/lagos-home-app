import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { DemoBanner, SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TranslationNotice } from "@/components/LanguageSelect";
import { PwaSetup } from "@/components/PwaSetup";
import { I18nProvider } from "@/lib/i18n";
import { PhotoProvider } from "@/lib/photos";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IleLagos — homes to rent and buy (beta)",
  description:
    "Find homes to rent and buy in Lagos with the full cost up front, clear status labels and separate trust checks. Beta version with sample homes.",
  applicationName: "IleLagos",
  appleWebApp: { capable: true, title: "IleLagos", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-NG" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <StoreProvider>
          <PhotoProvider>
          <I18nProvider>
          <a href="#main" className="sr-only z-50 rounded-lg bg-white px-4 py-2 font-semibold text-brand-800 shadow-raised focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
            Skip to main content
          </a>
          <DemoBanner />
          <SiteHeader />
          <TranslationNotice />
          <PwaSetup />
          <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">{children}</main>
          <SiteFooter />
          </I18nProvider>
          </PhotoProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
