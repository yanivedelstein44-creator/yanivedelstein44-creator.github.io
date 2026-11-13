// Entry point: choose the data adapter, build the shell, start router + polling.
// Phone (< 1024 px): each screen draws its own top (the home header panel or the slim top bar); the nav pill sits at
// the bottom of the three top-level screens. Desktop window (>= 1024 px): the blue sidebar on the right + the content.
import { h, clear, brandMark, isWide, wideMQ } from "./dom.js";
import { app, loadSettings, startPolling, refreshStatus, refreshIndex, refreshDesktopInfo } from "./state.js";
import { startRouter, sectionOf, guardRoute, stampEntry, TOP_LEVEL } from "./router.js";
import { GitHubAdapter, consumePairingFromHash } from "./data/github.js";
import { LocalAdapter, waitForPywebview } from "./data/local.js";
import { initToasts, toast } from "./components/toast.js";
import { mountBanners } from "./components/banner.js";
import { navPill, autoHide } from "./components/navPill.js";
import { sidebar } from "./components/sidebar.js";
import { loadErrorState } from "./components/states.js";
import { closeAllOverlays } from "./components/overlay.js";
import { registerServiceWorker, announceUpdateIfAny } from "./pwa.js";

const q = new URLSearchParams(location.search);
const DESKTOP_WAIT_MS = 15000;

class DesktopConnectError extends Error {
  constructor() {
    super("החיבור לתוכנה נכשל");
    this.name = "DesktopConnectError";
  }
}

/** Full-screen Hebrew error with a reload button (desktop window could not reach the bridge). */
function showDesktopError(root) {
  root.replaceChildren(
    h(
      "div",
      { class: "fatal", role: "alert", "data-testid": "desktop-error" },
      brandMark(56),
      h("h1", { class: "fatal__title" }, "החיבור לתוכנה נכשל"),
      h("p", { class: "fatal__text" }, "החלון לא הצליח להתחבר לתוכנת StocksCenter. סגור והפעל את התוכנה מחדש, או נסה שוב."),
      h("button", { class: "btn btn--primary btn--pill", type: "button", "data-testid": "desktop-retry", onClick: () => location.reload() }, "נסה שוב")
    )
  );
}

async function pickAdapter() {
  if (q.get("demo") === "1") {
    const { FixtureAdapter, installDesktopMock } = await import("./data/fixture.js");
    const a = new FixtureAdapter();
    app.mode.demo = true;
    if (q.get("desktop") === "1") {
      installDesktopMock(a);
      app.mode.desktop = true;
    }
    return a;
  }
  if (q.get("shell") === "desktop") {
    // Inside the desktop program's window (SPEC §8): always the bridge, never GitHub, no service worker.
    app.mode.shell = "desktop";
    const api = await waitForPywebview(DESKTOP_WAIT_MS);
    if (!api) throw new DesktopConnectError();
    app.mode.desktop = true;
    return new LocalAdapter();
  }
  const maybeDesktop = !!window.pywebview || location.protocol === "file:";
  if (maybeDesktop && (await waitForPywebview(8000))) {
    app.mode.desktop = true;
    return new LocalAdapter();
  }
  consumePairingFromHash(location, history, localStorage);
  return new GitHubAdapter({ storage: localStorage });
}

const SCREENS = {
  home: () => import("./screens/home.js").then((m) => m.mount),
  cat: () => import("./screens/category.js").then((m) => m.mount),
  historyCat: () => import("./screens/category.js").then((m) => m.mount),
  combined: () => import("./screens/combined.js").then((m) => m.mount),
  historyCombined: () => import("./screens/combined.js").then((m) => m.mount),
  history: () => import("./screens/history.js").then((m) => m.mountList),
  historyDay: () => import("./screens/history.js").then((m) => m.mountDay),
  settings: () => import("./screens/settings.js").then((m) => m.mount),
  setup: () => import("./screens/setup.js").then((m) => m.mount),
};

/** The status bar matches the top of the screen: blue on the phone's home (header panel), paper elsewhere. */
function setThemeColor(route) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const css = getComputedStyle(document.documentElement);
  const v = (name) => css.getPropertyValue(name).trim();
  meta.setAttribute("content", route.name === "home" && !isWide() ? v("--sc-primary") || "#1E4E9C" : v("--sc-bg") || "#EEF2F8");
}

/** Child screens restore their parent's scroll position when the user comes back. */
const PARENT = (r) => (r.name === "cat" || r.name === "settings" || r.name === "combined" || r.name === "history" ? "#/home" : r.name === "historyDay" ? "#/history" : r.name === "historyCat" || r.name === "historyCombined" ? `#/history/${r.date}` : null);

async function main() {
  app.adapter = await pickAdapter();
  app.toast = toast;
  await loadSettings();
  const root = document.getElementById("app");
  clear(root);
  const view = h("main", { class: "main", id: "view", tabindex: "-1" });
  root.append(view);
  app.bannerBox = h("div", { class: "banners", id: "banners" });
  initToasts(document.getElementById("toasts"));
  let route = { name: "home" };
  mountBanners(app.bannerBox, () => route);
  announceUpdateIfAny();

  // Desktop first run without a GitHub token -> setup wizard.
  let firstRunSetup = false;
  if (app.mode.desktop) {
    const s = await refreshDesktopInfo();
    firstRunSetup = !!s && s.has_github_token === false && !location.hash;
  }
  if (firstRunSetup) location.hash = "#/setup";

  let side = null;
  let nav = null;
  const syncChrome = (r) => {
    const wide = isWide();
    if (wide && r.name !== "setup") {
      if (!side) {
        side = sidebar();
        root.prepend(side.el);
      }
      side.setActive(sectionOf(r));
    } else if (side) {
      side.el.remove();
      side = null;
    }
    const showNav = !wide && TOP_LEVEL.has(r.name);
    if (showNav) {
      if (!nav) {
        nav = navPill();
        document.body.append(nav.el);
      }
      nav.setActive(sectionOf(r));
      nav.show(true);
    } else if (nav) {
      nav.el.remove();
      nav = null;
    }
    document.body.dataset.nav = showNav ? "1" : "0";
    document.body.classList.toggle("is-wide", wide);
  };
  const resetAutoHide = autoHide(() => nav);

  // A pairing link opened while the app is already running (hash-only navigation).
  window.addEventListener("hashchange", async () => {
    if (!location.hash.includes("pair=") || app.adapter.kind !== "github") return;
    const p = consumePairingFromHash(location, history, localStorage);
    if (!p) return toast("קוד החיבור לא תקין");
    app.adapter.setPairing(p);
    app.error = null;
    await Promise.allSettled([refreshStatus(), refreshIndex()]);
    toast("הטלפון מחובר");
    location.hash = "#/home";
  });

  // data first (index feeds the sidebar), polling afterwards
  const dataReady = Promise.allSettled([refreshStatus(), refreshIndex()]);

  let cleanup = null;
  let seq = 0;
  const scrollMemo = new Map();
  startRouter(async (parsed) => {
    const r = guardRoute(parsed, { desktop: app.mode.desktop });
    if (r !== parsed) {
      // QA R2-n7: the wizard exists only inside the desktop program
      history.replaceState(history.state, "", r.hash);
    }
    const prev = route;
    if (prev && prev.hash) scrollMemo.set(prev.hash, window.scrollY);
    route = r;
    stampEntry();
    const mine = ++seq;
    closeAllOverlays();
    cleanup?.();
    cleanup = null;
    document.body.dataset.route = r.name;
    syncChrome(r);
    setThemeColor(r);
    app.bus.emit("route", r);
    const holder = h("div", { class: "view-inner view-inner--" + r.name });
    holder.append(app.bannerBox); // screens move it under their own header
    view.replaceChildren(holder);
    const back = PARENT(prev || {}) === r.hash && scrollMemo.has(r.hash) ? scrollMemo.get(r.hash) : 0;
    window.scrollTo(0, 0);
    resetAutoHide();
    let mountFn;
    try {
      mountFn = await SCREENS[r.name]();
    } catch (e) {
      // QA R2-m3: a screen module that cannot be fetched (offline after an update) -> a calm error, not a blank page
      console.warn("screen load failed", e);
      if (mine === seq) holder.replaceChildren(app.bannerBox, loadErrorState());
      return;
    }
    if (mine !== seq) return;
    const c = await mountFn(holder, r);
    if (mine !== seq) return c?.();
    cleanup = c;
    if (back) requestAnimationFrame(() => window.scrollTo(0, back));
  });
  app.bus.on("index", () => side && side.setActive(sectionOf(route)));
  // "/" opens the stock search (desktop habit; harmless on the phone)
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "") || document.documentElement.classList.contains("has-sheet")) return;
    if (route.name === "setup") return;
    e.preventDefault();
    import("./components/searchSheet.js").then((m) => m.openSearch());
  });
  wideMQ.addEventListener("change", () => {
    app.keepWizardStep = route.name === "setup"; // crossing 1024 px re-renders the screen: the wizard keeps its step
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

  await dataReady;
  if (app.mode.desktop) app.bus.on("tick", () => refreshDesktopInfo()); // phone-token check results land in the status line
  startPolling();
  registerServiceWorker();
}

main().catch((e) => {
  console.error(e);
  const root = document.getElementById("app");
  if (root && e instanceof DesktopConnectError) return showDesktopError(root);
  if (root) root.textContent = "שגיאה בטעינת האפליקציה: " + (e && e.message ? e.message : e);
});
