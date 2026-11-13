// Every stock of the latest scan, merged across the 10 category files: feeds the search sheet, the watchlist and the
// alerts. Loaded lazily, once per index version (a new scan changes the key).
import { app } from "./state.js";

let cache = null; // {key, promise}

const keyOf = (idx) => (idx ? [idx.updated_at || "", ...(idx.categories || []).map((c) => `${c.id}:${c.scanned_at || ""}:${c.count ?? ""}`)].join("|") : "");

/** @returns {Promise<{stocks: object[], bySymbol: Map<string, object>, failed: number}>} newest copy of each symbol */
export function loadUniverse() {
  const idx = app.index;
  const key = keyOf(idx);
  if (cache && cache.key === key) return cache.promise;
  const ids = (idx?.categories || []).filter((c) => c.count > 0 && !c.error).map((c) => c.id);
  const promise = Promise.allSettled(ids.map((id) => app.adapter.getCategory(id))).then((results) => {
    const bySymbol = new Map();
    let failed = 0;
    for (const r of results) {
      if (r.status !== "fulfilled" || !r.value) {
        failed += 1;
        continue;
      }
      const cat = r.value;
      for (const s of cat.stocks || []) {
        if (!s || !s.symbol) continue;
        const prev = bySymbol.get(s.symbol);
        if (!prev || String(cat.scanned_at || "") > String(prev._at || "")) bySymbol.set(s.symbol, { ...s, _at: cat.scanned_at || null, _trade: cat.trade_date || null });
      }
    }
    return { stocks: [...bySymbol.values()], bySymbol, failed };
  });
  cache = { key, promise };
  // a failed load is not kept: the next call tries again
  promise.then((u) => u.failed && cache && cache.key === key && (cache = null), () => (cache = null));
  return promise;
}

export const dropUniverse = () => {
  cache = null;
};
