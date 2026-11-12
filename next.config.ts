import type { NextConfig } from "next";

// Prototype note: all listing data lives in the browser (localStorage), so the
// pages are client-rendered. Cache Components / partial prefetching are left off.
const nextConfig: NextConfig = {
  // The dev-only Next.js badge defaults to bottom-left, where it covers the mobile WhatsApp button.
  devIndicators: { position: "top-left" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
