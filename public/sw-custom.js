// 785 Tickets — custom service worker
// Extends next-pwa's generated worker with offline check-in sync via Workbox BackgroundSyncPlugin.
// next-pwa injects the Workbox runtime before this file.

importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js");

const { backgroundSync, routing, strategies, expiration, cacheableResponse } = workbox;

// ─── Background Sync for /api/checkins ───────────────────────────────────────
const bgSyncPlugin = new backgroundSync.BackgroundSyncPlugin("checkins-queue", {
  maxRetentionTime: 7 * 24 * 60, // replay for up to 7 days (minutes)
});

routing.registerRoute(
  ({ url }) => url.pathname === "/api/checkins",
  new strategies.NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  "POST"
);

// ─── Cache API routes (GET) with NetworkFirst ─────────────────────────────────
routing.registerRoute(
  ({ url }) => url.pathname.startsWith("/api/") && self.fetch.arguments?.[0]?.method !== "POST",
  new strategies.NetworkFirst({
    cacheName: "api-cache",
    networkTimeoutSeconds: 5,
    plugins: [
      new expiration.ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 300 }),
      new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ─── Cache static assets with StaleWhileRevalidate ───────────────────────────
routing.registerRoute(
  ({ request }) =>
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image",
  new strategies.StaleWhileRevalidate({
    cacheName: "static-assets",
    plugins: [
      new expiration.ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// ─── Offline fallback ─────────────────────────────────────────────────────────
routing.setCatchHandler(async ({ event }) => {
  if (event.request.destination === "document") {
    return caches.match("/");
  }
  return Response.error();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
