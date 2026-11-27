// he-IL formatting helpers. All return plain strings; wrap numbers/tickers with dom.ltr() when put in RTL text.

/** Clock used for all relative times; demo mode shifts it to the fixture's "today". */
export const clock = {
  offset: 0,
  now() {
    return Date.now() + this.offset;
  },
};

export const DASH = "—";
const isNum = (x) => typeof x === "number" && Number.isFinite(x);
const nf = (min, max) => new Intl.NumberFormat("he-IL", { minimumFractionDigits: min, maximumFractionDigits: max });
const NF0 = nf(0, 0);
const NF1 = nf(0, 1);
const NF2 = nf(2, 2);

const sign = (n) => (n < 0 ? "−" : "");

export const fmtInt = (n) => (isNum(n) ? sign(n) + NF0.format(Math.abs(n)) : DASH);
export const fmtNum = (n, digits = 1) =>
  isNum(n) ? sign(n) + (digits === 0 ? NF0 : digits === 1 ? NF1 : NF2).format(Math.abs(n)) : DASH;

const RLI = "⁧"; // right-to-left isolate
const PDI = "⁩"; // its end
/**
 * $1,234.56. `cur` (1.0.12, "התיק שלי"): "ILA" = agorot (Tel Aviv prices on Yahoo), "ILS" = ₪. Agorot read
 * "1,234.56 אג׳" (the number, then the unit) inside a right-to-left isolate, so they look the same in Hebrew text and in
 * the left-to-right boxes prices sit in (ltr / bdi dir=ltr): the unit to the left of the number. Without the isolate a
 * left-to-right box shows the unit to the right of the number, which reads "אג׳ 1,234.56".
 */
export const fmtPrice = (n, cur = "USD") => {
  if (!isNum(n)) return DASH;
  if (cur === "ILA") return RLI + sign(n) + NF2.format(Math.abs(n)) + "\u00A0אג׳" + PDI; // no-break space: the unit never wraps alone
  return sign(n) + (cur === "ILS" ? "₪" : "$") + NF2.format(Math.abs(n));
};
/** fmtPrice in parts, for a box that styles the unit: {num, unit, rtl}; rtl = the unit follows the number, right to left. */
export const priceParts = (n, cur = "USD") => {
  if (!isNum(n)) return { num: DASH, unit: "", rtl: false };
  const num = sign(n) + NF2.format(Math.abs(n));
  if (cur === "ILA") return { num, unit: "אג׳", rtl: true };
  return { num, unit: cur === "ILS" ? "₪" : "$", rtl: false };
};
/** $12,450 (whole dollars) */
export const fmtMoney = (n) => (isNum(n) ? sign(n) + "$" + NF0.format(Math.abs(n)) : DASH);

/** ratio -> percent. fmtPct(0.014) = "1.4%"; {signed:true} -> "+1.4%" */
export function fmtPct(r, { signed = false, digits = 1 } = {}) {
  if (!isNum(r)) return DASH;
  const v = r * 100;
  const body = (digits === 0 ? NF0 : NF1).format(Math.abs(v));
  const s = v < 0 && Number(body.replace(/[^\d.]/g, "")) !== 0 ? "−" : signed && v > 0 ? "+" : "";
  return s + body + "%";
}

export function fmtCompact(n) {
  if (!isNum(n)) return DASH;
  const a = Math.abs(n);
  if (a >= 1e12) return "$" + NF1.format(a / 1e12) + "T";
  if (a >= 1e9) return "$" + NF1.format(a / 1e9) + "B";
  if (a >= 1e6) return "$" + NF1.format(a / 1e6) + "M";
  if (a >= 1e3) return "$" + NF1.format(a / 1e3) + "K";
  return "$" + NF0.format(a);
}

/** Hebrew relative time: "הרגע", "לפני 5 דק'", "לפני 3 שע'", "אתמול", "לפני 4 ימים". */
export function timeAgo(iso, now = clock.now()) {
  if (!iso) return "";
  const t = typeof iso === "number" ? iso : Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const sec = Math.max(0, Math.round((now - t) / 1000));
  if (sec < 45) return "הרגע";
  const min = Math.round(sec / 60);
  if (min < 60) return min <= 1 ? "לפני דקה" : `לפני ${min} דק'`;
  const hr = Math.round(min / 60);
  if (hr < 24) return hr === 1 ? "לפני שעה" : `לפני ${hr} שע'`;
  const day = Math.round(hr / 24);
  if (day === 1) return "אתמול";
  if (day < 30) return `לפני ${day} ימים`;
  const mon = Math.round(day / 30);
  return mon <= 1 ? "לפני חודש" : `לפני ${mon} חודשים`;
}

/** "2026-11-18" -> "18.11" */
export function fmtDM(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || "");
  return m ? `${m[3]}.${m[2]}` : DASH;
}
/** "2026-11-18" -> "18.11.2026" */
export function fmtDMY(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || "");
  return m ? `${m[3]}.${m[2]}.${m[1]}` : DASH;
}

const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
export function weekdayHe(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || "");
  if (!m) return "";
  return "יום " + WEEKDAYS[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()];
}

/** HH:MM in the viewer's local zone (he-IL). */
export const fmtClock = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : DASH;

/** New York trading date for "now" (YYYY-MM-DD). */
export function nyToday(now = clock.now()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
  return p;
}

export const plural = (n, one, many) => (n === 1 ? one : many);

/** "N מניות" with the Hebrew singular. */
export const stocksHe = (n) => (n === 1 ? "מניה אחת" : `${fmtInt(n)} מניות`);

/** Newspaper dateline in the viewer's zone: "יום חמישי, 12 בנובמבר". */
export function datelineHe(now = clock.now()) {
  try {
    return new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long" }).format(new Date(now));
  } catch {
    return "";
  }
}

/** Edition word by the viewer's time of day. */
export function editionHe(now = clock.now()) {
  const hr = new Date(now).getHours();
  return hr >= 5 && hr < 11 ? "מהדורת בוקר" : hr >= 11 && hr < 16 ? "מהדורת צהריים" : hr >= 16 && hr < 22 ? "מהדורת ערב" : "מהדורת לילה";
}

const localDay = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** "היום 17:05" / "אתמול 17:05" / "ב-10.11 · 17:05" in the viewer's zone ("" for no time). */
export function whenHe(iso, now = clock.now()) {
  const t = Date.parse(iso || "");
  if (!Number.isFinite(t)) return "";
  const hm = fmtClock(iso);
  if (localDay(t) === localDay(now)) return `היום ${hm}`;
  if (localDay(t) === localDay(now - 86400000)) return `אתמול ${hm}`;
  const d = new Date(t);
  return `ב-${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")} · ${hm}`;
}

/** The first sentence of a text and the rest (for the report's headline and body). */
export function splitFirstSentence(text) {
  const s = String(text || "").trim();
  const m = /^(.+?[.!?؟])(\s+|$)/su.exec(s);
  if (!m || m[1].length < 12) return { head: s, rest: "" };
  return { head: m[1].trim(), rest: s.slice(m[0].length).trim() };
}

/** The first 1-2 sentences of a text, capped near maxLen characters on a word boundary. */
export function firstSentences(text, n = 2, maxLen = 190) {
  const s = String(text || "").trim();
  const parts = s.match(/[^.!?]+[.!?]+(\s|$)/gu) || (s ? [s] : []);
  let out = "";
  for (const p of parts.slice(0, n)) {
    if (out && (out + p).length > maxLen) break;
    out += p;
  }
  out = out.trim() || s;
  if (out.length > maxLen + 20) out = out.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
  return out;
}

/** True only for absolute http(s) URLs: the only kind a news headline may link to. */
export const isHttpUrl = (u) => typeof u === "string" && /^https?:\/\//i.test(u);

/** "1.0.10" >= "1.0.9": numeric parts, missing parts are 0; false for anything that is not a version. */
export function versionAtLeast(v, min) {
  const a = String(v || "").split(".").map((x) => Number(x));
  const b = String(min).split(".").map((x) => Number(x));
  if (!v || a.some((x) => !Number.isInteger(x))) return false;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x !== y) return x > y;
  }
  return true;
}
