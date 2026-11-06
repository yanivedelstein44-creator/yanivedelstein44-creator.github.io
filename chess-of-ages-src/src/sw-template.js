/* Service Worker — שחמט העידנים (נוצר אוטומטית בכל build — אל תערוך את dist/sw.js) */
const BUILD = '__BUILD_ID__';
const PRECACHE = __PRECACHE__;
const CACHE = `chess-ages-${BUILD}`;
const scoped = (u) => new URL(u, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(PRECACHE.map((u) => new Request(scoped(u), { cache: 'reload' })));
    // התקנה ראשונה — מפעילים מיד. עדכון — ממתינים שהאפליקציה תבקש (ברגע בטוח במשחק)
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener('message', (event) => {
  const d = event.data;
  if (d === 'SKIP_WAITING' || (d && d.type === 'SKIP_WAITING')) self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('chess-ages-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // קבצי עדכון — תמיד מהרשת
  if (url.pathname.endsWith('/version.json') || url.pathname.includes('/update/')) return;
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      // עמודים סטטיים נוספים (למשל privacy.html) — מהמטמון או מהרשת, לא מעטפת המשחק
      if (/\.html$/.test(url.pathname) && !url.pathname.endsWith('/index.html')) {
        const page = await cache.match(req, { ignoreSearch: true });
        if (page) return page;
        try { return await fetch(req); } catch { /* offline — נופלים למעטפת */ }
      }
      return (await cache.match(scoped('./index.html'))) || (await cache.match(scoped('./'))) || fetch(req);
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch (err) {
      return Response.error();
    }
  })());
});
