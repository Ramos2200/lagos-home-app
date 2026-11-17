import type { NextConfig } from "next";

// Prototype note: all listing data lives in the browser (localStorage), so the
// pages are client-rendered. Cache Components / partial prefetching are left off.
const nextConfig: NextConfig = {
  // The dev-only Next.js badge defaults to bottom-left, where it covers the mobile WhatsApp button.
  devIndicators: { position: "top-left" },
  // The service worker (public/sw.js) must never be cached, so app updates reach people straight away.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
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
