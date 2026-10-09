// Offline support. The game files are cached as they load, so once you've
// played it with a connection it keeps working with no signal.
// The page itself is fetched fresh when online, so updates show up.
const CACHE = 'fossicking-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === 'navigate';
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (isPage) {
      // Network first for the page, so a new version arrives when online.
      try {
        const res = await fetch(req);
        cache.put(req, res.clone());
        return res;
      } catch {
        return (await cache.match(req)) || (await cache.match('./')) || Response.error();
      }
    }
    // Everything else (hashed scripts, models, icons): cache first.
    const hit = await cache.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  })());
});
