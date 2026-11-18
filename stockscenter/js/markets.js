// The markets page and the market bar (SPEC §6.11): labels and formatting for latest/market.json.
// DOM-free (node tests import it). The engine computes every number; this only presents them.
import { fmtNum, fmtPrice, fmtPct, weekdayHe, fmtDM, DASH } from "./format.js";
import { daysUntil } from "./risk.js";

const isNum = (x) => typeof x === "number" && Number.isFinite(x);

export const REGIME = {
  supportive: { label: "שוק תומך", tone: "good", size: "גודל פוזיציה רגיל" },
  caution: { label: "זהירות", tone: "warn", size: "חצי מגודל הפוזיציה הרגיל" },
  weak: { label: "שוק חלש", tone: "danger", size: "רבע מהגודל הרגיל, או להמתין" },
};
export const TREND = { up: { label: "עולה", tone: "up" }, down: { label: "יורדת", tone: "down" }, mixed: { label: "מעורבת", tone: "flat" } };
export const STRENGTH = { strong: { label: "חזק", tone: "good" }, neutral: { label: "בינוני", tone: "muted" }, weak: { label: "חלש", tone: "warn" } };
export const PERIODS = [
  ["day", "יום"],
  ["week", "שבוע"],
  ["month", "חודש"],
  ["ytd", "מתחילת השנה"],
];

/** A page worth drawing (the bridge sends an empty page before the first refresh). */
export const hasMarket = (doc) => !!(doc && Array.isArray(doc.groups) && doc.groups.some((g) => (g.items || []).some((i) => isNum(i.price))));

export const toneOf = (v) => (!isNum(v) || v === 0 ? "flat" : v > 0 ? "up" : "down");

/** A change in the item's unit: percent ("+0.4%") or basis points for yields ("+7 נ״ב"). */
export function fmtChange(v, unit = "pct") {
  if (!isNum(v)) return DASH;
  if (unit === "bp") {
    const n = Math.round(v);
    return (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n) + " נ״ב";
  }
  return fmtPct(v / 100, { signed: true });
}

/** The level of an asset: index points, dollars, a yield in percent or a rate. */
export function fmtLevel(item) {
  if (!item || !isNum(item.price)) return DASH;
  switch (item.kind) {
    case "yield":
      return fmtNum(item.price, 2) + "%";
    case "crypto":
    case "commodity":
    case "etf":
      return fmtPrice(item.price);
    case "fx":
      return item.id === "usdils" ? "₪" + fmtNum(item.price, 2) : fmtNum(item.price, 2);
    default:
      return fmtNum(item.price, 2);
  }
}

export function itemById(doc, id) {
  for (const g of doc?.groups || []) for (const i of g.items || []) if (i.id === id) return i;
  return null;
}

/** The markets-page row of a stock's Yahoo sector (case-insensitive), or null. */
export function sectorRow(doc, sector) {
  if (!doc || !sector) return null;
  const want = String(sector).toLowerCase();
  return (doc.sectors || []).find((r) => String(r.sector || "").toLowerCase() === want) || null;
}

/** "חזק · מקום 2 מתוך 11" for a sector row with a rank. */
export function sectorRankHe(row) {
  if (!row || !isNum(row.rank)) return "";
  const of = row._of || null;
  const st = row.strength && STRENGTH[row.strength] ? STRENGTH[row.strength].label + " · " : "";
  return `${st}מקום ${row.rank}${of ? ` מתוך ${of}` : ""}`;
}

/** Sector rows ranked by one-month strength vs the S&P 500 (rows without data last), with `_of` set. */
export function rankedSectors(doc) {
  const rows = (doc?.sectors || []).slice();
  const of = rows.filter((r) => isNum(r.rank)).length;
  rows.sort((a, b) => (isNum(a.rank) ? a.rank : 99) - (isNum(b.rank) ? b.rank : 99));
  return rows.map((r) => ({ ...r, _of: of }));
}

/** CPI / FOMC dates from today up to `days` days ahead, with `days` and a Hebrew "when". */
export function upcomingEvents(doc, now, days = 7) {
  return (doc?.events || [])
    .map((e) => ({ ...e, days: daysUntil(e.date, now) }))
    .filter((e) => e.days != null && e.days >= 0 && e.days <= days)
    .map((e) => ({ ...e, when_he: e.days === 0 ? "היום" : e.days === 1 ? "מחר" : `${weekdayHe(e.date)} ${fmtDM(e.date)}` }));
}

/**
 * The instant of a New York wall-clock time ("2026-12-09", "14:00") and its "HH:MM" in `tz` (default: the viewer's
 * zone): {ms, hm}, or null for bad input. New York is UTC-5 or UTC-4; two corrections settle daylight saving.
 */
export function eventLocalTime(dateStr, timeEt, tz) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
  const t = /^(\d{2}):(\d{2})$/.exec(timeEt || "");
  if (!m || !t) return null;
  const want = Date.UTC(+m[1], +m[2] - 1, +m[3], +t[1], +t[2]);
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  let guess = want + 5 * 3600000;
  for (let i = 0; i < 2; i++) {
    const p = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((x) => [x.type, x.value]));
    guess += want - Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
  }
  const hm = new Date(guess).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: tz });
  return { ms: guess, hm };
}

/** Short names for the bar ("CPI", "ריבית"). */
export const EVENT_SHORT = { cpi: "מדד המחירים (CPI)", fomc: "החלטת ריבית" };

/** "היום 17:05" style freshness is the caller's; this says whether the page is older than two days. */
export function isStale(doc, now) {
  const t = Date.parse(doc?.updated_at || "");
  return !Number.isFinite(t) || now - t > 2 * 86400000;
}
