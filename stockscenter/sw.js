/* StocksCenter service worker: caches the app shell only.
   Never touches api.github.com (data + token) or ../fixtures (demo data); those go straight to the network.
   Bump VERSION on every publish (tests/shell.test.mjs checks it equals APP_VERSION in version.js, and that SHELL lists
   every module, stylesheet and font the app loads: QA R2-m3). */
const VERSION = "1.3.0";
const CACHE = `stockscenter-shell-${VERSION}`;

const SHELL = [
  "./", "./index.html", "./manifest.webmanifest", "./version.js",
  "./css/tokens.css", "./css/fonts.css", "./css/base.css", "./css/components.css", "./css/screens.css",
  "./js/components/alertsSheet.js", "./js/components/banner.js", "./js/components/chrome.js",
  "./js/components/extLink.js", "./js/components/flags.js", "./js/components/imageViewer.js",
  "./js/components/installCard.js", "./js/components/installFlow.js",
  "./js/components/miniBars.js", "./js/components/navPill.js", "./js/components/overlay.js",
  "./js/components/rankList.js", "./js/components/rankTable.js", "./js/components/ranking.js",
  "./js/components/report.js", "./js/components/scanButton.js", "./js/components/scoreRing.js",
  "./js/components/searchSheet.js", "./js/components/sheet.js", "./js/components/shot.js",
  "./js/components/sidebar.js", "./js/components/slider.js", "./js/components/sortChips.js",
  "./js/components/states.js", "./js/components/statusPill.js", "./js/components/stockSheet.js",
  "./js/components/toast.js", "./js/data/github.js", "./js/data/links.js",
  "./js/data/install.js", "./js/data/local.js", "./js/dom.js", "./js/format.js",
  "./js/installPrompt.js", "./js/main.js", "./js/pwa.js", "./js/risk.js",
  "./js/router.js", "./js/scoring/total.js", "./js/screens/category.js",
  "./js/screens/combined.js", "./js/screens/history.js", "./js/screens/home.js", "./js/screens/install.js",
  "./js/screens/phone.js", "./js/screens/phoneTab.js", "./js/screens/settings.js", "./js/screens/setup.js",
  "./js/state.js", "./js/universe.js", "./js/watchlist.js",
  "./fonts/frank-ruhl-libre-hebrew-500-normal.woff2", "./fonts/frank-ruhl-libre-hebrew-700-normal.woff2", "./fonts/frank-ruhl-libre-hebrew-900-normal.woff2",
  "./fonts/frank-ruhl-libre-latin-500-normal.woff2", "./fonts/frank-ruhl-libre-latin-700-normal.woff2", "./fonts/frank-ruhl-libre-latin-900-normal.woff2",
  "./fonts/rubik-hebrew-400-normal.woff2", "./fonts/rubik-hebrew-500-normal.woff2", "./fonts/rubik-hebrew-600-normal.woff2",
  "./fonts/rubik-hebrew-700-normal.woff2", "./fonts/rubik-hebrew-800-normal.woff2", "./fonts/rubik-latin-400-normal.woff2",
  "./fonts/rubik-latin-500-normal.woff2", "./fonts/rubik-latin-600-normal.woff2", "./fonts/rubik-latin-700-normal.woff2",
  "./fonts/rubik-latin-800-normal.woff2",
  "./icons/icon-32.png", "./icons/icon-180.png", "./icons/icon-192.png",
  "./icons/icon-512.png", "./icons/maskable-192.png", "./icons/maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("stockscenter-shell-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "get-version" && event.source) {
    event.source.postMessage({ type: "sw-version", version: VERSION, requested: true });
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // api.github.com etc.: not ours
  if (url.pathname.includes("/fixtures/")) return; // demo data: always network
  // Network first (fresh code when online), cached shell when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error())))
  );
});
