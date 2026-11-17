import type { MetadataRoute } from "next";

/** Lets people install IleLagos on their phone or computer like an app ("Add to Home Screen"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IleLagos — homes to rent and buy",
    short_name: "IleLagos",
    description: "Find homes to rent and buy in Lagos with the full cost up front. Beta version with sample homes.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0a7656",
    lang: "en-NG",
    categories: ["lifestyle", "shopping"],
    icons: [
      { src: "/app-icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Homes for rent", url: "/search?mode=rent" },
      { name: "Homes for sale", url: "/search?mode=sale" },
      { name: "Saved homes", url: "/saved" },
    ],
  };
}
