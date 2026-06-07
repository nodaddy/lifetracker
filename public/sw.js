// This worker intentionally does NOT cache the app shell. Caching here caused
// stale HTML/JS to be served on refresh, making recent UI changes "revert".
// On every activation it wipes any previously created caches so old bundles
// can never be served again.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

// No fetch handler => the browser performs its normal network fetch for every
// request. Nothing is served from cache.
