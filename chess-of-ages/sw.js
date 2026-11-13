/* Service Worker — שחמט העידנים (נוצר אוטומטית בכל build — אל תערוך את dist/sw.js) */
const BUILD = '1.5.3-1794565728852';
const PRECACHE = ["./","./accessibility.html","./assets/esm-DK83B5IJ.js","./assets/esm-DtZE-AzV.js","./assets/esm-UJMYTP6i.js","./assets/esm-wL7XOPGR.js","./assets/fakeBackend-CSdxXlUv.js","./assets/firebaseBackend-BqLC7B8P.js","./assets/index-DCaJMqeV.js","./assets/index-DOsptXJH.css","./assets/rubik-hebrew-400-normal-BQDoxs6C.woff","./assets/rubik-hebrew-400-normal-Dp0lvSRB.woff2","./assets/rubik-hebrew-500-normal--anb7y8_.woff","./assets/rubik-hebrew-500-normal-B_5jqoVI.woff2","./assets/rubik-hebrew-700-normal-B2Hm7hpE.woff","./assets/rubik-hebrew-700-normal-Da14F88e.woff2","./assets/rubik-hebrew-800-normal-CEoY7Wj3.woff2","./assets/rubik-hebrew-800-normal-DgqUxLtA.woff","./assets/rubik-latin-400-normal-BV1Ho3GG.woff","./assets/rubik-latin-400-normal-j0pmKyiQ.woff2","./assets/rubik-latin-700-normal-D-tMm-eS.woff2","./assets/rubik-latin-700-normal-KHOtubUA.woff","./assets/rubik-latin-800-normal-BtaGuVpR.woff2","./assets/rubik-latin-800-normal-Dq1miTTj.woff","./assets/web-BwuE9mFw.js","./assets/web-CHjUfgLM.js","./assets/web-DGB0sdIU.js","./assets/web-DU7pzzNG.js","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-512.png","./index.html","./legal-config.js","./legal-page.js","./legal.css","./licenses.html","./manifest.he.json","./manifest.json","./og-image.jpg","./privacy.html","./terms.html","./test.html"];
// מטמונים משותפים לכל ה-Service Workers באותו origin (באתר יש גם את תיקיית ערוץ Google Play ופרויקטים אחרים),
// לכן השם כולל את ה-scope: SW אחד לעולם לא מוחק מטמון של אחר
const SCOPE = self.registration.scope;
const PREFIX = `chess-ages:${new URL(SCOPE).pathname}:`;
const CACHE = `${PREFIX}${BUILD}`;
const LEGACY = /^chess-ages-\d/; // שמות עד 1.3.17 (בלי scope) — תמיד בניות ישנות של המשחק הזה
const scoped = (u) => new URL(u, SCOPE).href;

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
    await Promise.all(keys.filter((k) => k !== CACHE && (k.startsWith(PREFIX) || LEGACY.test(k))).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // רק קבצים מתוך התיקייה שלנו — תיקיות אחרות באתר (ערוץ Google Play, פרויקטים אחרים) לא שלנו
  if (!req.url.startsWith(SCOPE)) return;
  // קבצי עדכון — תמיד מהרשת
  if (url.pathname.endsWith('/version.json') || url.pathname.includes('/update/')) return;
  if (req.mode === 'navigate') {
    // ניווט לקובץ שאינו דף (APK, zip, תמונה, json) — ישר מהרשת, לא מעטפת המשחק
    if (/\.[a-z0-9]+$/i.test(url.pathname) && !/\.html$/i.test(url.pathname)) return;
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
