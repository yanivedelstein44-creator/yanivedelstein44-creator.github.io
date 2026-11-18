// The swing plan of a stock (SPEC §6.10): status labels, position size at the plan and the "הסבר" text.
// DOM-free (node tests import it). The numbers come from the engine (stock.entry); nothing here re-computes them.

const isNum = (x) => typeof x === "number" && Number.isFinite(x);

/** status -> {label, tone, text}. tone matches the .tag--<tone> chips. */
export const PLAN_STATUS = {
  in_zone: { label: "בטווח קנייה", tone: "good", text: "המחיר בתוך טווח הקנייה של התוכנית." },
  wait: { label: "לחכות לתיקון", tone: "warn", text: "המחיר מעל מחיר המקסימום. לפי התוכנית מחכים שהמחיר ירד לטווח." },
  extended: { label: "מתוחה", tone: "warn", text: "המחיר רחוק יותר מ-2 ATR מעל הממוצע של 20 יום. כניסה עכשיו רודפת אחרי המחיר." },
  no_room: { label: "אין מרווח", tone: "muted", text: "גם במחיר המומלץ, הרווח עד טייק פרופיט 1 קטן מפי 2 מהסיכון." },
  breakout: { label: "כניסה בפריצה", tone: "brand", text: "המניה צמודה לשיא של 60 יום, ואין מספיק מרווח בתיקון. לפי התוכנית קונים רק אחרי סגירה יומית מעל מחיר הקנייה." },
  down: { label: "מגמה יורדת", tone: "muted", text: "המחיר מתחת לממוצע של 200 יום. לפי השיטה לא נכנסים לסווינג בקנייה." },
};

export const TREND_HE = { up: "מגמה עולה", mixed: "מגמה מעורבת", down: "מגמה יורדת" };
export const SUPPORT_HE = { sma20: "הממוצע של 20 יום", sma50: "הממוצע של 50 יום", breakout: "רמת הפריצה הקודמת", atr: "ATR אחד מתחת למחיר" };
const TP1_HE = { r60: "השיא של 60 יום", high52: "השיא של 52 שבועות", r_multiple: "פי 2 מהסיכון" };
const TP2_HE = { high52: "השיא של 52 שבועות", r_multiple: "לפחות פי 3 מהסיכון" };

/** A plan worth showing: the engine sends entry null when the price, the ATR or the 200-day average is missing. */
export const hasPlan = (stock) => !!(stock && stock.entry && isNum(stock.entry.entry) && isNum(stock.entry.stop) && PLAN_STATUS[stock.entry.status]);

export const planStatus = (stock) => (hasPlan(stock) ? { key: stock.entry.status, ...PLAN_STATUS[stock.entry.status] } : null);

/** The change from `base` to `x` as a ratio (0.052 = +5.2%); null for bad input. */
export const ratioFromTo = (base, x) => (isNum(base) && isNum(x) && base > 0 ? x / base - 1 : null);

export const tp1BasisHe = (b) => TP1_HE[b] || "";
export const tp2BasisHe = (b) => TP2_HE[b] || "";

/**
 * Shares at the plan's recommended price for the portfolio and risk % in the settings, times an optional size
 * multiplier (the market regime: 1, 0.5 or 0.25). {shares, value, risk} or null.
 */
export function planPositionSize(stock, settings, mult = 1) {
  const e = hasPlan(stock) ? stock.entry : null;
  if (!e || !settings || !(settings.portfolio > 0) || !(e.risk_per_share > 0) || !(e.entry > 0)) return null;
  const m = isNum(mult) && mult > 0 ? mult : 1;
  const shares = Math.floor((settings.portfolio * settings.riskPct * m) / 100 / e.risk_per_share);
  if (!Number.isFinite(shares) || shares < 0) return null;
  return { shares, value: shares * e.entry, risk: shares * e.risk_per_share };
}

/** One short line under the prices: where the recommended price comes from. */
export function whyLine(e) {
  if (!e) return "";
  if (e.status === "breakout") return "מחיר הקנייה הוא השיא של 60 יום ועוד עשירית ATR, ומחיר המקסימום חצי ATR מעליו.";
  if (e.support_basis === "atr") return "אין תמיכה קרובה מתחת למחיר, ולכן המחיר המומלץ הוא ATR אחד מתחת למחיר הנוכחי.";
  return `המחיר המומלץ הוא ${SUPPORT_HE[e.support_basis] || "התמיכה הקרובה"} ועוד רבע ATR.`;
}

/** The "הסבר" text: [{k, t}] in reading order. */
export function explainSections(e) {
  const mult = e && isNum(e.atr_mult) ? e.atr_mult : 2;
  const multHe = Number.isInteger(mult) ? String(mult) : mult.toLocaleString("he-IL");
  const out = [
    { k: "מגמה", t: "עולה: המחיר מעל הממוצע של 50 יום, הממוצע של 50 מעל זה של 200, וזה של 200 עולה. יורדת: המחיר מתחת לממוצע של 200 יום. כל השאר: מעורבת." },
    {
      k: "מחיר קנייה מומלץ",
      t: "התמיכה הקרובה מתחת למחיר: הממוצע של 20 יום, הממוצע של 50 יום, או רמת הפריצה הקודמת (השיא של 3 החודשים שלפני החודש האחרון). מוסיפים לה רבע ATR, כדי שהפקודה תתמלא גם כשהמחיר לא יורד עד הקו עצמו.",
    },
    { k: "סטופ", t: `מחיר הקנייה פחות ${multHe} × ATR. ה-ATR הוא התנודה היומית הממוצעת ב-14 הימים האחרונים. המרחק הזה משאיר למניה מקום לזוז בסווינג של כמה שבועות. את המכפיל משנים בהגדרות.` },
    { k: "טייק פרופיט 1", t: "ההתנגדות הקרובה מעל המחיר: השיא של 60 יום, ואם הוא צמוד מדי למחיר, השיא של 52 שבועות. כשהמניה בשיא חדש ואין התנגדות מעליה, היעד הוא פי 2 מהסיכון." },
    { k: "טייק פרופיט 2", t: "השיא של 52 שבועות כשהוא רחוק יותר, ותמיד לפחות פי 3 מהסיכון." },
    { k: "מחיר מקסימום", t: "המחיר הגבוה ביותר שעוד משאיר רווח של פי 2 מהסיכון עד טייק פרופיט 1. מעליו התוכנית מחכה לתיקון." },
    { k: "ניהול העסקה", t: "בטייק פרופיט 1 מוכרים חצי ומזיזים את הסטופ למחיר הקנייה. את החצי השני מחזיקים עד טייק פרופיט 2, עם סטופ שעולה מתחת לממוצע של 20 יום, או של 50 יום כשהמגמה חזקה." },
  ];
  if (e && e.status === "breakout")
    out.push({ k: "כניסה בפריצה", t: "כשהמגמה עולה והשיא של 60 יום קרוב מדי, אין מספיק מרווח לקנייה בתיקון. אז התוכנית עוברת לפריצה: קונים רק אחרי סגירה יומית מעל השיא ועוד עשירית ATR, הסטופ באותו מרחק מתחת למחיר הקנייה, והיעד לפחות פי 2 מהסיכון. אם השיא של 52 שבועות קרוב מדי מעל הפריצה, נשארים ב״אין מרווח״." });
  else if (e && isNum(e.breakout)) out.push({ k: "כניסה בפריצה", t: "המניה קרובה לשיא של 60 יום. סגירה יומית מעל רמת הפריצה היא כניסה נוספת אפשרית, והסטופ אז הוא רמת הפריצה פחות אותו מרחק." });
  return out;
}

export const PLAN_NOTE = "חישוב לפי כללים קבועים מנתוני הסריקה, לא ייעוץ השקעות.";
