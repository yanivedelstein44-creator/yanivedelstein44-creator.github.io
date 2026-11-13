// Phone tab helpers (DOM-free so node tests can import them): the text of the published-app status line, the size
// format and the WhatsApp share link. The `apk` object is Bridge.getInstallInfo().apk (SPEC §8).
import { fmtDMY } from "../format.js";

export const sizeMb = (bytes) => (bytes / 1e6).toFixed(1).replace(/\.0$/, "") + "MB";

/** wa.me opens a chat in WhatsApp (desktop app or web) with the text ready to send. */
export const whatsappUrl = (link) => "https://wa.me/?text=" + encodeURIComponent("StocksCenter, להתקנה בטלפון: " + link);

/** One status line for the Bridge's `apk` object: {ok, text}. */
export function apkStatus(apk) {
  switch (apk && apk.status) {
    case "ok":
      // the numbers sit in one left-to-right isolate (U+2066 .. U+2069), so version, size and date keep their order in RTL text
      return { ok: true, text: `גרסת האנדרואיד \u2066${apk.version} · ${sizeMb(apk.size)}` + (apk.date ? ` · ${fmtDMY(apk.date)}` : "") + "\u2069" };
    case "missing":
      return { ok: false, text: "קובץ ה-APK עדיין לא פורסם. בינתיים אפשר להתקין את האפליקציה מהדפדפן בטלפון (PWA), בכתובת שלמטה." };
    case "offline":
      return { ok: false, text: "אין חיבור לאינטרנט, ולכן אי אפשר לבדוק את גרסת ה-APK." };
    default:
      return { ok: false, text: "קובץ הגרסה באתר לא תקין. נסה שוב מאוחר יותר." };
  }
}

/* ---------- phone install of the PWA (SPEC §9): which browser, and the manual steps when one tap is not possible ---------- */

/**
 * The browser the phone page runs in, from its user agent.
 * shell = the Android app shell (StocksCenterApp marker), installed = already running as the installed app,
 * inapp = a web view inside another app (cannot install), desktop = not a phone.
 * @param {string} ua
 * @param {{standalone?: boolean, touch?: boolean}} [o]  touch: navigator.maxTouchPoints > 1 (iPadOS reports a Mac)
 */
export function browserKind(ua, { standalone = false, touch = false } = {}) {
  const s = String(ua || "");
  if (/StocksCenterApp/.test(s)) return "shell";
  if (standalone) return "installed";
  if (/iPhone|iPad|iPod/.test(s) || (touch && /Macintosh/.test(s))) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(s) ? "ios-other" : "ios-safari";
  if (!/Android/.test(s)) return "desktop";
  if (/FBAN|FBAV|FB_IAB|Instagram|; wv\)/.test(s)) return "inapp";
  if (/SamsungBrowser\//.test(s)) return "samsung";
  if (/Firefox\//.test(s)) return "firefox";
  if (/EdgA\//.test(s)) return "edge";
  if (/OPR\/|Opera/.test(s)) return "other";
  if (/Chrome\//.test(s)) return "chrome";
  return "other";
}

/** Phone kinds that can show the install page (the shell, the installed app and a PC cannot). */
export const canOfferInstall = (kind) => !["shell", "installed", "desktop"].includes(kind);

/**
 * The manual install steps for one browser kind: {steps: string[], note?: string, copyLink?: boolean}.
 * Used when the browser cannot install in one tap (Chrome allows it only after a few seconds on the page).
 */
export function installSteps(kind) {
  switch (kind) {
    case "chrome":
      return {
        steps: ["לחץ על ⋮ (שלוש הנקודות) בפינה העליונה של Chrome.", "בחר ״התקן אפליקציה״ (או ״הוספה למסך הבית״).", "לחץ ״התקן״. הסמל יופיע במסך הבית."],
        note: "אין ״התקן אפליקציה״ בתפריט? בחר קודם ״פתח ב-Chrome״, ואז שוב ⋮.",
      };
    case "samsung":
      return {
        steps: ["אם בשורת הכתובת מופיע סמל התקנה, לחץ עליו.", "אחרת: לחץ על ≡ (התפריט) בשורה התחתונה, ובחר ״הוספת דף אל״ ואז ״מסך הבית״.", "אשר ״הוסף״. הסמל יופיע במסך הבית."],
      };
    case "firefox":
      return { steps: ["לחץ על ⋮ (שלוש הנקודות).", "בחר ״התקן״ (או ״הוספה למסך הבית״).", "אשר. הסמל יופיע במסך הבית."] };
    case "edge":
      return { steps: ["לחץ על ⋯ בשורה התחתונה.", "בחר ״הוספה לטלפון״.", "אשר ״התקן״."] };
    case "ios-safari":
      return { steps: ["לחץ על כפתור השיתוף (ריבוע עם חץ למעלה).", "בחר ״הוסף למסך הבית״.", "לחץ ״הוסף״."] };
    case "ios-other":
      return { steps: ["לחץ על כפתור השיתוף בשורת הכתובת.", "בחר ״הוסף למסך הבית״.", "לחץ ״הוסף״."] };
    case "inapp":
      return {
        steps: ["הקישור נפתח בתוך אפליקציה אחרת, ומשם אי אפשר להתקין.", "לחץ ״העתק קישור״, פתח את Chrome והדבק אותו בשורת הכתובת.", "בדף שנפתח לחץ ״הורד״."],
        copyLink: true,
      };
    case "desktop":
      return { steps: ["הדף הזה מיועד לטלפון.", "בתוכנה במחשב לחץ ״התקן בטלפון״ וסרוק את הקוד במצלמת הטלפון."] };
    default:
      return { steps: ["פתח את התפריט של הדפדפן.", "בחר ״התקן״ או ״הוספה למסך הבית״.", "אין אפשרות כזו? פתח את הקישור ב-Chrome."] };
  }
}

/** The phone's own pairing link (same form as the desktop QR, SPEC §5), rebuilt from the stored pairing. */
export const pairingLink = (base, code) => String(base || "").replace(/#.*$/, "") + "#pair=" + code;
