/* Service Worker — MegaGlest Mobile (PWA): index/version מהרשת תחילה, נכסים (assets/) מהמטמון תחילה */
const BUILD = '1.0.0-1794070911';
const CACHE = 'megaglest-' + BUILD;
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html', './manifest.json'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('megaglest-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return; const url = new URL(req.url); if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/version.json')) return; // always network
  if (url.pathname.includes('/assets/')) { // cache-first (large, immutable per build)
    e.respondWith(caches.open(CACHE).then(async c => { const hit = await c.match(req); if (hit) return hit; const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; }));
    return;
  }
  e.respondWith(fetch(req).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone())); return res; }).catch(() => caches.match(req)));
});
