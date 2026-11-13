// Display helpers for a stock's risk, insider and earnings data (DOM-free; node tests import it).
import { nyToday, fmtCompact } from "./format.js";

const isNum = (x) => typeof x === "number" && Number.isFinite(x);

/** Shares for a given portfolio, risk % and per-share risk (SPEC §6.9). null when it can't be computed. */
export function positionSize(stock, settings) {
  const risk = stock && stock.risk;
  if (!settings || !settings.portfolio || !risk || !(risk.risk_per_share > 0) || !(stock.price > 0)) return null;
  const shares = Math.floor((settings.portfolio * settings.riskPct) / 100 / risk.risk_per_share);
  if (!Number.isFinite(shares) || shares < 0) return null;
  return { shares, value: shares * stock.price };
}

/** A risk object worth showing (the engine sends null when ATR or the price is missing). */
export const hasRisk = (stock) => !!(stock && stock.risk && (isNum(stock.risk.stop) || isNum(stock.risk.target)));

/** Whole calendar days from the New York "today" to YYYY-MM-DD (negative = past). null for bad input. */
export function daysUntil(dateStr, now) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(nyToday(now));
  if (!m || !t) return null;
  return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(+t[1], +t[2] - 1, +t[3])) / 86400000);
}

export function inDaysHe(n) {
  if (n == null) return "";
  if (n === 0) return "היום";
  if (n === 1) return "מחר";
  if (n === 2) return "מחרתיים";
  return n > 0 ? `בעוד ${n} ימים` : "";
}

/** "1 קנייה" / "3 קניות" ... */
export const buysHe = (n) => (n === 0 ? "אין קניות" : n === 1 ? "קנייה אחת" : `${n} קניות`);
export const sellsHe = (n) => (n === 1 ? "מכירה אחת" : `${n} מכירות`);

const ROLES = [
  [/\bCEO\b|chief executive/i, "מנכ״ל"],
  [/\bCFO\b|chief financial/i, "סמנכ״ל כספים"],
  [/\bCOO\b|chief operating/i, "סמנכ״ל תפעול"],
  [/\bCTO\b|chief technology/i, "סמנכ״ל טכנולוגיות"],
  [/chairman|chair\b/i, "יו״ר"],
  [/president/i, "נשיא"],
  [/director/i, "דירקטור"],
  [/chief|officer/i, "נושא משרה"],
];

/** Hebrew role for an insider position ("CEO" -> "מנכ״ל"); "" when unknown. */
export function roleHe(position) {
  const p = String(position || "");
  for (const [re, he] of ROLES) if (re.test(p)) return he;
  return "";
}

/** The chip text for an executive open-market buy: "קניית בכיר: מנכ״ל $181K" (falls back to "קניית בכיר"). */
export function execBuyText(insider) {
  if (!insider || !insider.exec_open_market_buy) return null;
  const top = (insider.top || []).filter((t) => t && t.type === "buy" && roleHe(t.role)).sort((a, b) => (b.value || 0) - (a.value || 0))[0];
  if (!top) return "קניית בכיר";
  return `קניית בכיר: ${roleHe(top.role)}${isNum(top.value) && top.value > 0 ? " " + fmtCompact(top.value) : ""}`;
}

const SECTORS = {
  technology: "טכנולוגיה",
  energy: "אנרגיה",
  healthcare: "בריאות",
  "health care": "בריאות",
  "financial services": "פיננסים",
  financials: "פיננסים",
  "consumer cyclical": "צריכה מחזורית",
  "consumer discretionary": "צריכה מחזורית",
  "consumer defensive": "צריכה בסיסית",
  "consumer staples": "צריכה בסיסית",
  industrials: "תעשייה",
  "basic materials": "חומרי גלם",
  materials: "חומרי גלם",
  "real estate": "נדל״ן",
  utilities: "תשתיות",
  "communication services": "תקשורת",
};
/** Yahoo sector -> Hebrew (unknown sectors stay as they are). */
export const sectorHe = (s) => (s ? SECTORS[String(s).toLowerCase()] || String(s) : "");
