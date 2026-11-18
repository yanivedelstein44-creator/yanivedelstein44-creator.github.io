// "מחיר מומלץ" (1.0.9, SPEC §6.13): the stocks of the latest scan whose price reached the plan's buy zone, or is
// close to it. DOM-free (node tests import it). The plan comes from the engine (stock.entry, SPEC §6.10) and the
// price is the scan price, so nothing here re-computes a plan.

import { hasPlan } from "./plan.js";

const isNum = (x) => typeof x === "number" && Number.isFinite(x);

/** "קרובות": at most one ATR (about one day's average move) away from the buy zone. */
export const NEAR_ATR = 1;

/** The ATR the plan was built with (risk_per_share = atr_mult × ATR), or null. */
export const planAtr = (e) => (e && isNum(e.risk_per_share) && isNum(e.atr_mult) && e.atr_mult > 0 && e.risk_per_share > 0 ? e.risk_per_share / e.atr_mult : null);

/**
 * Where the scan price stands against the plan, or null when the stock is not reached and not near.
 * {group: "reached"|"near", kind: "zone"|"pullback"|"breakout", gapAtr, gapPct, aboveEntryPct, aboveEntryAtr}
 * - zone (reached): in_zone, the price is between the recommended price and the highest price.
 * - pullback (near): wait, the price is at most `near` ATR above the highest price; gapPct < 0 is the drop to it.
 * - breakout (near): breakout, the price is at most `near` ATR under the buy-above price; gapPct > 0 is the rise.
 */
export function buyState(stock, near = NEAR_ATR) {
  if (!hasPlan(stock)) return null;
  const e = stock.entry;
  const price = stock.price;
  const atr = planAtr(e);
  if (!isNum(price) || price <= 0 || !isNum(atr) || !(e.entry > 0)) return null;
  const aboveEntryPct = price / e.entry - 1;
  const aboveEntryAtr = (price - e.entry) / atr;
  if (e.status === "in_zone") return { group: "reached", kind: "zone", gapAtr: 0, gapPct: 0, aboveEntryPct, aboveEntryAtr };
  if (e.status === "wait" && isNum(e.max_entry) && price > e.max_entry) {
    const gapAtr = (price - e.max_entry) / atr;
    if (gapAtr <= near + 1e-9) return { group: "near", kind: "pullback", gapAtr, gapPct: e.max_entry / price - 1, aboveEntryPct, aboveEntryAtr };
  }
  if (e.status === "breakout" && price < e.entry) {
    const gapAtr = (e.entry - price) / atr;
    if (gapAtr <= near + 1e-9) return { group: "near", kind: "breakout", gapAtr, gapPct: e.entry / price - 1, aboveEntryPct, aboveEntryAtr };
  }
  return null;
}

const bySym = (a, b) => String(a.stock.symbol).localeCompare(String(b.stock.symbol));

/**
 * The two lists of the screen, in the order of the % the rows show: reached closest to the recommended price first,
 * near with the smallest move to the zone first (who is listed is decided in ATR, see buyState).
 * @returns {{reached: {stock, state}[], near: {stock, state}[]}}
 */
export function buyLists(stocks, near = NEAR_ATR) {
  const reached = [];
  const close = [];
  for (const stock of stocks || []) {
    const state = buyState(stock, near);
    if (state) (state.group === "reached" ? reached : close).push({ stock, state });
  }
  reached.sort((a, b) => a.state.aboveEntryPct - b.state.aboveEntryPct || bySym(a, b));
  close.sort((a, b) => Math.abs(a.state.gapPct) - Math.abs(b.state.gapPct) || bySym(a, b));
  return { reached, near: close };
}

export const buyCounts = (stocks, near = NEAR_ATR) => {
  const l = buyLists(stocks, near);
  return { reached: l.reached.length, near: l.near.length };
};

/** kind -> {label, tone}: the chip of a row (tone matches the .tag--<tone> chips). */
export const BUY_KIND = {
  zone: { label: "בטווח קנייה", tone: "good" },
  pullback: { label: "מעל הטווח", tone: "warn" },
  breakout: { label: "לפני פריצה", tone: "brand" },
};

const pct = (r) => `${(Math.abs(r) * 100).toFixed(1)}%`;

/** One short line: where the price is against the plan. */
export function gapLineHe(state) {
  if (!state) return "";
  if (state.kind === "zone") return state.aboveEntryPct < 0.001 ? "במחיר המומלץ" : `${pct(state.aboveEntryPct)} מעל המחיר המומלץ`;
  if (state.kind === "pullback") return `עוד ירידה של ${pct(state.gapPct)} לטווח הקנייה`;
  return `עוד עלייה של ${pct(state.gapPct)} עד מחיר הקנייה בפריצה`;
}

/** The table's short form of gapLineHe (the "מרחק" column). */
export function gapShortHe(state) {
  if (!state) return "";
  if (state.kind === "zone") return state.aboveEntryPct < 0.001 ? "במחיר המומלץ" : `${pct(state.aboveEntryPct)} מעל המומלץ`;
  if (state.kind === "pullback") return `ירידה של ${pct(state.gapPct)}`;
  return `עלייה של ${pct(state.gapPct)}`;
}

export const BUY_ABOUT = [
  "הגיעו: המחיר בסריקה בתוך טווח הקנייה של התוכנית, בין המחיר המומלץ למחיר המקסימום. הקרובות ביותר למחיר המומלץ ראשונות.",
  "קרובות: עד ATR אחד, בערך תנודה של יום, מהטווח. ״מעל הטווח״ מחכה לתיקון קטן, ״לפני פריצה״ מחכה לסגירה מעל מחיר הקנייה.",
  "המחירים מהסריקה האחרונה של כל רשימה. מניה ברשימה שלא נסרקה היום מסומנת בתאריך שלה.",
];
