// "התיק שלי" analysis (1.0.13): the numbers behind the portfolio charts. DOM-free (node tests import it).
// Everything comes from the analysed holdings of latest/portfolio.json (each with its StocksCenter stock); nothing
// here re-scores a stock.

import { sectorHe } from "./risk.js";
import { COMPONENTS } from "./scoring/total.js";
import { hasPlan } from "./plan.js";

const isNum = (x) => typeof x === "number" && Number.isFinite(x);

/** The five scores, in the app's order, with the app's Hebrew names (miniBars.js COMPONENT_LABELS). */
export const PROFILE_LABELS = { technical: "טכני", momentum: "מומנטום", quality: "איכות", value: "שווי", analysts: "אנליסטים" };

/** Plan statuses counted by the buy chart, in display order ("none" = no plan for the stock). */
export const BUY_KEYS = ["in_zone", "breakout", "wait", "extended", "no_room", "down", "none"];

export const MAX_SECTORS = 7; // the rest are one "אחר" slice

/** The holdings the program could score, each with its weight among them (0..1; equal when no weights are known). */
export function analysedHoldings(doc) {
  const rows = ((doc && doc.holdings) || []).filter((h) => h && h.stock && typeof h.stock === "object");
  if (!rows.length) return [];
  const raw = rows.map((h) => (isNum(h.weight) && h.weight > 0 ? h.weight : null));
  const known = raw.filter((w) => w != null);
  const sum = known.reduce((a, b) => a + b, 0);
  // weights from the screenshot when every row has one, else equal shares (a partial set would skew everything)
  const useWeights = known.length === rows.length && sum > 0;
  return rows.map((h, i) => ({ h, stock: h.stock, w: useWeights ? raw[i] / sum : 1 / rows.length }));
}

/** Weighted average of `get(stock)` over the rows that have it (weights renormalised among them), rounded. */
function wavg(rows, get) {
  let num = 0;
  let den = 0;
  for (const r of rows) {
    const v = get(r.stock);
    if (isNum(v)) {
      num += v * r.w;
      den += r.w;
    }
  }
  return den > 0 ? Math.round(num / den) : null;
}

const totalOf = (st) => (isNum(st.total) ? st.total : null);

/**
 * The data of the analysis card (portfolioCharts.js portfolioAnalysisCard):
 * {sectors: [{key, label, weight, count, score}], profile: [{key, label, value}],
 *  points: [{symbol, x, y, r, total}], buy: {in_zone: n, ..., none: n}, analyzed, count}
 */
export function portfolioStats(doc) {
  const rows = analysedHoldings(doc);
  const count = ((doc && doc.holdings) || []).length;

  // sectors: share of the analysed stocks, with the value-weighted total score of each
  const bySector = new Map();
  for (const r of rows) {
    const key = r.stock.sector || "Other";
    const s = bySector.get(key) || { key, rows: [] };
    s.rows.push(r);
    bySector.set(key, s);
  }
  let sectors = [...bySector.values()].map((s) => {
    const weight = s.rows.reduce((a, r) => a + r.w, 0);
    const local = s.rows.map((r) => ({ ...r, w: weight > 0 ? r.w / weight : 1 / s.rows.length }));
    return { key: s.key, label: s.key === "Other" ? "אחר" : sectorHe(s.key) || s.key, weight, count: s.rows.length, score: wavg(local, totalOf) };
  });
  sectors.sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label, "he"));
  if (sectors.length > MAX_SECTORS + 1) {
    const rest = sectors.slice(MAX_SECTORS);
    const weight = rest.reduce((a, s) => a + s.weight, 0);
    const scored = rest.filter((s) => isNum(s.score));
    const sw = scored.reduce((a, s) => a + s.weight, 0);
    sectors = sectors.slice(0, MAX_SECTORS).concat({
      key: "other",
      label: "אחר",
      weight,
      count: rest.reduce((a, s) => a + s.count, 0),
      score: sw > 0 ? Math.round(scored.reduce((a, s) => a + s.score * s.weight, 0) / sw) : null,
    });
  }

  const profile = COMPONENTS.map((k) => ({ key: k, label: PROFILE_LABELS[k], value: wavg(rows, (st) => (st.scores ? st.scores[k] : null)) }));

  const points = rows
    .filter((r) => r.stock.scores && isNum(r.stock.scores.momentum) && isNum(r.stock.scores.quality))
    .map((r) => ({ symbol: String(r.h.symbol || r.stock.symbol), x: r.stock.scores.momentum, y: r.stock.scores.quality, r: r.w, total: totalOf(r.stock) }));

  const buy = Object.fromEntries(BUY_KEYS.map((k) => [k, 0]));
  for (const r of rows) {
    const k = hasPlan(r.stock) ? r.stock.entry.status : "none";
    buy[BUY_KEYS.includes(k) ? k : "none"] += 1;
  }

  return { sectors, profile, points, buy, analyzed: rows.length, count };
}

/**
 * One holding's swing plan for its row (portfolioCharts.js priceRange), or null without a plan: the plan's stop, the
 * recommended buy price and the highest one, the first target (stock.entry, like the plan card of the stock sheet),
 * and today's price on that ladder.
 */
export function holdingPlan(stock) {
  if (!hasPlan(stock) || !isNum(stock.price)) return null;
  const e = stock.entry;
  return {
    price: stock.price,
    stop: e.stop,
    entry: e.entry,
    maxEntry: isNum(e.max_entry) ? e.max_entry : null,
    target: isNum(e.tp1) ? e.tp1 : isNum(e.tp2) ? e.tp2 : null,
    currency: stock.currency || "USD",
    status: e.status,
  };
}
