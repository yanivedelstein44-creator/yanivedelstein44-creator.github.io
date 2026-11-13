// TOTAL score recomputed in the browser from component scores + list count + slider (SPEC §6.7).
// Must agree with the Python engine; vectors from §6.8 are checked in tests/total.test.mjs.

export const COMPONENTS = ["technical", "momentum", "quality", "value", "analysts"];

// Weight vectors in COMPONENTS order for slider = 0 / 50 / 100.
export const W0 = [37.5, 37.5, 5, 5, 15];
export const W50 = [25, 25, 20, 15, 15];
export const W100 = [10, 10, 35, 30, 15];

/** Round half up (never Python-style banker's rounding). */
export const rhu = (x) => Math.floor(x + 0.5);

/** Weight vector for a slider value s in [0, 100]. */
export function weightsFor(s) {
  const v = Math.min(100, Math.max(0, Number(s)));
  const [a, b, k, d] = v <= 50 ? [W0, W50, v, 50] : [W50, W100, v - 50, 50];
  return a.map((w0, i) => w0 + ((b[i] - w0) * k) / d);
}

const isNum = (x) => typeof x === "number" && Number.isFinite(x);

/**
 * @param {Object<string, number|null>} scores  keys technical..analysts
 * @param {number} listsCount number of categories the stock appears in (>= 1)
 * @param {number} s slider 0..100
 * @returns {{total:number|null, total_raw:number|null, bonus:number, gate:boolean}}
 */
export function computeTotal(scores, listsCount, s = 50) {
  const W = weightsFor(s);
  let num = 0;
  let den = 0;
  let gate = false;
  let avail = 0;
  COMPONENTS.forEach((key, i) => {
    const v = scores ? scores[key] : null;
    if (!isNum(v)) return;
    avail += 1;
    num += W[i] * v;
    den += W[i];
    if (v < 40) gate = true;
  });
  const bonus = 3 * Math.min(2, Math.max(1, listsCount || 1) - 1);
  if (avail === 0 || den === 0) return { total: null, total_raw: null, bonus, gate: false };
  const raw = num / den;
  let total = Math.min(100, rhu(raw + bonus));
  if (gate) total = Math.min(total, 70);
  return { total, total_raw: Math.round(raw * 100) / 100, bonus, gate };
}

/** good >= 70, warn 50-69, bad < 50 (null -> "none"). */
export function tierOf(total) {
  if (!isNum(total)) return "none";
  return total >= 70 ? "good" : total >= 50 ? "warn" : "bad";
}

export const SORT_KEYS = ["total", ...COMPONENTS];

/**
 * Recompute totals for the slider and sort high -> low, nulls last.
 * key = "total" or a component name. Ties fall back to total, then symbol (stable & deterministic).
 * @returns {Array<{stock:Object,total:number|null,total_raw:number|null,bonus:number,gate:boolean}>}
 */
export function rankStocks(stocks, key = "total", s = 50) {
  const rows = (stocks || []).map((stock) => ({
    stock,
    ...computeTotal(stock.scores, (stock.lists || []).length, s),
  }));
  const val = (r) => (key === "total" ? r.total : r.stock.scores ? r.stock.scores[key] : null);
  const cmp = (x, y) => {
    const a = val(x);
    const b = val(y);
    const an = !isNum(a);
    const bn = !isNum(b);
    if (an !== bn) return an ? 1 : -1;
    if (!an && a !== b) return b - a;
    const ta = x.total;
    const tb = y.total;
    const tan = !isNum(ta);
    const tbn = !isNum(tb);
    if (tan !== tbn) return tan ? 1 : -1;
    if (!tan && ta !== tb) return tb - ta;
    return String(x.stock.symbol).localeCompare(String(y.stock.symbol));
  };
  return rows.sort(cmp);
}
