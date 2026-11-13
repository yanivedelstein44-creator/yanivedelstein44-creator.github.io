// Local watchlist (design/DESIGN.md, stock sheet "הוסף למעקב"). DOM-free: node tests import it.
// Phone / PWA: localStorage "sc.watch". Desktop window: ui_prefs.watchlist through the bridge's saveSettings
// (pywebview runs in private mode, so its localStorage does not survive a restart).
// An entry keeps the name and exchange too, so a watched stock that left every list can still be shown and opened.

export const WATCH_KEY = "sc.watch";
export const WATCH_MAX = 200;
const SYMBOL_RE = /^[A-Z0-9][A-Z0-9.\-_]{0,14}$/;

const clean = (s, max) => (typeof s === "string" ? s.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max) : "");

/** Accepts strings ("NVDA") or objects ({symbol, name, exchange}); drops junk and duplicates; keeps the order. */
export function normalizeWatch(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const o = typeof item === "string" ? { symbol: item } : item && typeof item === "object" ? item : null;
    if (!o) continue;
    const symbol = clean(o.symbol, 40).toUpperCase();
    if (!SYMBOL_RE.test(symbol) || seen.has(symbol)) continue; // 1-15 ticker characters, never truncated into another one
    seen.add(symbol);
    const entry = { symbol };
    const name = clean(o.name, 120);
    const exchange = clean(o.exchange, 20).toUpperCase();
    if (name) entry.name = name;
    if (exchange) entry.exchange = exchange;
    out.push(entry);
    if (out.length >= WATCH_MAX) break;
  }
  return out;
}

export const isWatched = (list, symbol) => (list || []).some((e) => e.symbol === String(symbol || "").toUpperCase());

/** Returns a NEW list: the stock added at the top, or removed when it is already watched. */
export function toggleWatch(list, stock) {
  const sym = String(stock?.symbol || "").toUpperCase();
  const cur = normalizeWatch(list);
  if (isWatched(cur, sym)) return cur.filter((e) => e.symbol !== sym);
  return normalizeWatch([{ symbol: sym, name: stock?.name, exchange: stock?.exchange }, ...cur]);
}

/** localStorage (or any Storage-like object) -> list. Bad JSON -> []. */
export function readWatch(storage) {
  try {
    return normalizeWatch(JSON.parse(storage.getItem(WATCH_KEY) || "[]"));
  } catch {
    return [];
  }
}

export function writeWatch(storage, list) {
  storage.setItem(WATCH_KEY, JSON.stringify(normalizeWatch(list)));
}

/** The partial for the bridge's saveSettings (ui_prefs is shallow-merged on the desktop side). */
export const watchPrefsPatch = (list) => ({ ui_prefs: { watchlist: normalizeWatch(list) } });
