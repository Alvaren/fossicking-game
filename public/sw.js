// Offline support. The game files are cached as they load, so once you've
// played it with a connection it keeps working with no signal.
//  - Built scripts and styles carry a content hash in their name (assets/),
//    so a cached copy is always the right one: cache first.
//  - Everything else keeps its name between versions (the page, models,
//    icons, the manifest): network first, so an update arrives when you're
//    online, and the cached copy when you're not.
// Bump CACHE when the caching rules change; old caches are cleared on activate.
const CACHE = 'fossicking-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const isPage = req.mode === 'navigate';
  const hashed = url.pathname.includes('/assets/');
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (hashed) {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }
    try {
      // Revalidate with the server (a cheap "not modified" when nothing changed).
      const res = isPage ? await fetch(req) : await fetch(req, { cache: 'no-cache' });
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      return (await cache.match(req)) || (isPage && (await cache.match('./'))) || Response.error();
    }
  })());
});
