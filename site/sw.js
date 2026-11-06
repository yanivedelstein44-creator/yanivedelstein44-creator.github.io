// היומן שלנו – service worker
// Bump VERSION on every release: installed apps (browser, home screen, APK) pick up the new version automatically.
const VERSION = '1.0.1';
const CACHE = 'hayoman-' + VERSION;
const SB_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.js';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/badge-96.png', '/icons/favicon-48.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })));
    try { const r = await fetch(SB_JS, { mode: 'cors' }); if (r.ok) await c.put(SB_JS, r); } catch (_) {}
  })());
});

self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k.startsWith('hayoman-')) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function networkFirst(req, key) {
  const c = await caches.open(CACHE);
  try {
    const r = await fetch(req, { cache: 'no-store' });
    if (r.ok) c.put(key, r.clone());
    return r;
  } catch (_) {
    return (await c.match(key)) || (await c.match('/')) || Response.error();
  }
}
async function cacheFirst(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok || r.type === 'opaque') c.put(req, r.clone());
  return r;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') { e.respondWith(networkFirst(req, '/')); return; }
    if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.webmanifest') { e.respondWith(cacheFirst(req)); return; }
    return;
  }
  if (req.url === SB_JS) e.respondWith(cacheFirst(req));
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil((async () => {
    await self.registration.showNotification(d.title || 'היומן שלנו', {
      body: d.body || '', tag: d.tag || undefined, renotify: !!d.tag, dir: 'rtl', lang: 'he',
      icon: '/icons/icon-192.png', badge: '/icons/badge-96.png', data: { url: d.url || '/' },
      requireInteraction: !!d.sticky
    });
    for (const c of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) c.postMessage({ type: 'push', data: d });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.startsWith(self.location.origin)) {
        await c.focus();
        c.postMessage({ type: 'open', url });
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
