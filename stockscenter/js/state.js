// Shared app state, settings persistence, status polling and scan requests.
import { clock, nyToday } from "./format.js";
import { callBridge } from "./data/local.js";
import { normalizeWatch, readWatch, writeWatch, toggleWatch as toggledList, isWatched, watchPrefsPatch } from "./watchlist.js";

export class Emitter {
  #m = new Map();
  on(ev, fn) {
    if (!this.#m.has(ev)) this.#m.set(ev, new Set());
    this.#m.get(ev).add(fn);
    return () => this.#m.get(ev).delete(fn);
  }
  emit(ev, data) {
    for (const fn of [...(this.#m.get(ev) || [])]) {
      try {
        fn(data);
      } catch (e) {
        console.error(e);
      }
    }
  }
}

/**
 * Subscribe `fn` to app events for as long as `el` lives: the first event after `el` was attached and then removed
 * from the document unsubscribes. Returns the unsubscribe function.
 */
export function onLive(el, events, fn) {
  let seen = false;
  const offs = [];
  const off = () => offs.splice(0).forEach((o) => o());
  const handler = (d) => {
    if (el.isConnected) seen = true;
    else if (seen) return off();
    fn(d);
  };
  for (const ev of [].concat(events)) offs.push(app.bus.on(ev, handler));
  return off;
}

export const OFFLINE_AFTER_MS = 5 * 60 * 1000;
const SETTINGS_KEY = "sc.settings";
export const DEFAULT_SETTINGS = { portfolio: null, riskPct: 1, defaultSlider: 50 };

export const app = {
  adapter: null,
  mode: { demo: false, desktop: false },
  bus: new Emitter(),
  settings: { ...DEFAULT_SETTINGS },
  slider: 50,
  sortKey: "total",
  status: null,
  index: null,
  offline: false, // the phone has no connection (online/offline events, network failures)
  error: null, // {message_he, needsSettings}
  pendingScan: null, // {ids, id, at, baseline}
  desktopInfo: null, // desktop only: last getSettings() (secrets_persistent, has_phone_token, ...)
  watch: [], // [{symbol, name?, exchange?}] (watchlist.js)
  nav: (hash) => {
    location.hash = hash;
  },
  toast: () => {},
};

/* ---------- settings (portfolio / risk / default slider) ---------- */

const clampNum = (v, lo, hi, dflt) => {
  const n = typeof v === "string" ? parseFloat(v.replace(/,/g, "")) : v;
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};

export function normalizeSettings(raw) {
  const s = raw && typeof raw === "object" ? raw : {};
  const p = s.portfolio == null || s.portfolio === "" ? null : clampNum(s.portfolio, 0, 1e9, null);
  return {
    portfolio: p && p > 0 ? p : null,
    riskPct: clampNum(s.riskPct, 0.05, 10, 1),
    defaultSlider: Math.round(clampNum(s.defaultSlider, 0, 100, 50)),
  };
}

export async function loadSettings() {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
  } catch {
    /* ignore */
  }
  // pywebview runs in private mode by default (localStorage is not persisted) -> the bridge's ui_prefs is the store there.
  let prefs = null;
  if (app.mode.desktop) {
    try {
      const s = await callBridge("getSettings");
      prefs = s && s.ui_prefs && typeof s.ui_prefs === "object" ? s.ui_prefs : null;
    } catch {
      /* ignore */
    }
    if (!app.mode.demo && prefs && Object.keys(prefs).some((k) => k !== "watchlist")) raw = prefs;
  }
  app.settings = normalizeSettings(raw);
  app.slider = app.settings.defaultSlider;
  if (app.mode.desktop) app.watch = normalizeWatch(prefs?.watchlist);
  else {
    try {
      app.watch = readWatch(localStorage);
    } catch {
      app.watch = [];
    }
  }
}

/* ---------- watchlist (phone: localStorage sc.watch; desktop: ui_prefs.watchlist) ---------- */

export const watched = (symbol) => isWatched(app.watch, symbol);

/** Toggle a stock in the watchlist. Resolves with the new state (true = watched); a failed desktop save reverts and throws. */
export async function toggleWatch(stock) {
  const prev = app.watch;
  app.watch = toggledList(prev, stock);
  app.bus.emit("watch", app.watch);
  if (app.mode.desktop) {
    try {
      await callBridge("saveSettings", watchPrefsPatch(app.watch));
    } catch (e) {
      app.watch = prev;
      app.bus.emit("watch", app.watch);
      throw e;
    }
  } else {
    try {
      writeWatch(localStorage, app.watch);
    } catch {
      /* storage full or blocked: the list still works for this session */
    }
  }
  return isWatched(app.watch, stock?.symbol);
}

export async function saveSettings(patch) {
  const prevDefault = app.settings.defaultSlider;
  app.settings = normalizeSettings({ ...app.settings, ...patch });
  if (app.settings.defaultSlider !== prevDefault) app.slider = app.settings.defaultSlider;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(app.settings));
  } catch {
    /* ignore */
  }
  if (app.mode.desktop) {
    try {
      await callBridge("saveSettings", { ui_prefs: app.settings });
    } catch {
      /* non-fatal */
    }
  }
  app.bus.emit("settings");
}

/** Desktop only: re-read the bridge settings (feeds the "keys are not persistent" banner). Returns the settings or null. */
export async function refreshDesktopInfo() {
  if (!app.mode.desktop) return null;
  try {
    app.desktopInfo = await callBridge("getSettings");
  } catch {
    return null;
  }
  app.bus.emit("desktop", app.desktopInfo);
  return app.desktopInfo;
}

/* ---------- status helpers ---------- */

/** The phone itself has no connection (navigator.onLine or a network failure). Never true inside the desktop window. */
export const phoneOffline = () => !app.mode.desktop && app.offline === true;

export function pcState(status, now = clock.now()) {
  if (!status) return { kind: "unknown" };
  // The phone is offline: the PC's state is unknown (not "המחשב לא מחובר").
  if (phoneOffline()) return { kind: "unknown", phoneOffline: true };
  // Inside the desktop window the desktop IS the PC: never "offline".
  if (app.mode.desktop) return status.state === "scanning" ? { kind: "scanning", current: status.current } : status.state === "error" ? { kind: "error", last_error: status.last_error } : { kind: "online" };
  const age = now - Date.parse(status.heartbeat_at || 0);
  if (!Number.isFinite(age) || age > OFFLINE_AFTER_MS) return { kind: "offline", heartbeat_at: status.heartbeat_at };
  if (status.state === "scanning") return { kind: "scanning", current: status.current };
  if (status.state === "error") return { kind: "error", last_error: status.last_error };
  return { kind: "online" };
}

export const isScanning = () => app.status?.state === "scanning" || !!app.pendingScan;

export const catName = (id) => app.index?.categories.find((c) => c.id === id)?.name_he || id;

const nyDateOf = (iso) => (iso && Number.isFinite(Date.parse(iso)) ? nyToday(Date.parse(iso)) : null);

/**
 * The scan summary under the home header and in the sidebar: how many lists the last scan day covered and when.
 * @returns {{total:number, done:number, at:string|null, never:boolean}}
 */
export function scanSummary(index, status) {
  const cats = index?.categories || [];
  const times = cats.map((c) => c.scanned_at).filter((t) => t && Number.isFinite(Date.parse(t)));
  const last = [status?.last_scan_at, ...times].filter(Boolean).sort().pop() || null;
  if (!times.length) return { total: cats.length || 10, done: 0, at: last, never: true };
  const day = nyDateOf(times.slice().sort().pop());
  const done = cats.filter((c) => !c.error && nyDateOf(c.scanned_at) === day).length;
  return { total: cats.length, done, at: last, never: false };
}

/* ---------- data refresh ---------- */

function setError(e) {
  if (e && e.code === "offline" && app.adapter.stale) return;
  if (e && e.code === "nodata") return; // before the first scan: not an error
  app.error = { message_he: e?.message_he || e?.message || "שגיאה לא צפויה", needsSettings: !!e?.needsSettings, code: e?.code };
  app.bus.emit("error", app.error);
}

/** Set the phone's connectivity; a change re-renders the banners and status pills right away (event "status"). */
export function setOffline(v) {
  v = !!v;
  if (app.offline === v) return;
  app.offline = v;
  app.bus.emit("status", app.status);
}

export async function refreshIndex() {
  try {
    app.index = await app.adapter.getIndex();
    app.error = null;
    if (!app.adapter.stale && typeof navigator !== "undefined" && navigator.onLine !== false) setOffline(false);
    app.bus.emit("index", app.index);
  } catch (e) {
    if (e && e.code === "offline") setOffline(true);
    setError(e);
  }
  return app.index;
}

export async function refreshStatus() {
  let st;
  try {
    st = await app.adapter.getStatus();
  } catch (e) {
    if (e && e.code === "offline") setOffline(true);
    setError(e);
    app.bus.emit("status", app.status);
    return null;
  }
  if (!app.adapter.stale && typeof navigator !== "undefined" && navigator.onLine !== false) setOffline(false);
  else if (app.adapter.stale) setOffline(true);
  const prev = app.status;
  app.status = st;
  app.error = null;
  const p = app.pendingScan;
  if (p) {
    if (st.state === "scanning" || st.last_command_id === p.id || st.last_scan_at !== p.baseline) app.pendingScan = null;
    else if (st.restoring) p.at = Date.now(); // the desktop restores the remote history first: the scan waits for it
    else if (Date.now() - p.at > 90000) {
      app.pendingScan = null;
      app.toast("המחשב לא הגיב לבקשה. בדוק שהתוכנה פועלת.");
    }
  }
  const restored = !!(prev && prev.restoring && !st.restoring); // the desktop finished restoring the history from GitHub
  const finished = (prev && prev.state === "scanning" && st.state !== "scanning") || restored;
  const changed = prev && prev.last_scan_at !== st.last_scan_at;
  if (changed) app.adapter.dropImages?.(); // new scan: cached screenshot object URLs are stale
  if (finished || changed) {
    await refreshIndex();
    app.bus.emit("refresh");
  }
  app.bus.emit("status", st);
  return st;
}

export async function requestScan(ids) {
  if (phoneOffline()) {
    app.toast("אין חיבור לאינטרנט");
    return false;
  }
  const pc = pcState(app.status);
  if (pc.kind === "offline") {
    app.toast("המחשב לא מחובר");
    return false;
  }
  if (isScanning()) return false;
  try {
    const r = await app.adapter.requestScan(ids);
    app.pendingScan = { ids, id: r && r.id, at: Date.now(), baseline: app.status?.last_scan_at };
    app.toast(app.status?.restoring ? "הבקשה נשלחה. הסריקה תתחיל כשהשחזור מ-GitHub יסתיים." : "הבקשה נשלחה למחשב");
    app.bus.emit("status", app.status);
    schedulePoll(1200);
    return true;
  } catch (e) {
    app.toast(e?.message_he || "שליחת הבקשה נכשלה");
    return false;
  }
}

/* ---------- polling: 3 s while scanning, otherwise 30 s while the page is visible ---------- */

let timer = null;
export function schedulePoll(ms) {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    if (!document.hidden) await refreshStatus();
    schedulePoll();
  }, ms ?? (isScanning() || app.status?.restoring ? 3000 : 30000));
}

export function startPolling() {
  if (typeof window !== "undefined" && !app.mode.desktop) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) setOffline(true);
    window.addEventListener("offline", () => setOffline(true));
    window.addEventListener("online", () => {
      setOffline(false); // optimistic; the re-poll below confirms or flips it back
      schedulePoll(0);
      if (app.error || app.adapter?.stale) refreshIndex();
    });
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) schedulePoll(0);
  });
  schedulePoll(app.status?.restoring || isScanning() ? 3000 : 30000);
  // relative times ("לפני 4 דק'") refresh on this tick
  setInterval(() => !document.hidden && app.bus.emit("tick"), 30000);
}
