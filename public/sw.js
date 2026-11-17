/*
 * IleLagos service worker — makes the installed app open quickly and keep working offline.
 *
 * - Pages: try the network first; if offline, use the last copy of that page, or the offline page.
 * - App files under /_next/static (they never change once built): use the saved copy first.
 * Listing data itself lives in the browser's storage, so nothing private is cached here.
 * No push notifications: this prototype never sends messages outside the app.
 */
const VERSION = "ilelagos-v1";
const PAGES = `${VERSION}-pages`;
const STATIC = `${VERSION}-static`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.addAll([OFFLINE_URL, "/"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Full page loads: network first, then the saved copy, then the offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGES).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match(OFFLINE_URL)) || Response.error()),
    );
    return;
  }

  // Built app files and icons: saved copy first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/app-icon")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC).then((cache) => cache.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
