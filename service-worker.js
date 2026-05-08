// Kill-switch service worker.
// Clears all caches and unregisters itself so stale cached content is wiped.
// Browser will download this updated file and run it, fixing any blank-screen
// caused by old cached HTML from previous deployments.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      try { client.navigate(client.url); } catch {}
    }
    await self.registration.unregister();
  })());
});

// Never serve from cache — always pass through to the network.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
