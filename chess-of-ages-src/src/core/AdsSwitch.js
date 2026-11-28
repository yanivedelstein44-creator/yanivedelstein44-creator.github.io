/**
 * מתג מרחוק לפרסומות האמיתיות בגרסת Google Play (ADS.remoteSwitch ב-config/AdsConfig.js, מ-1.6.8).
 *
 * קובץ קטן באתר, בערוץ העדכונים של Play: chess-of-ages-play/ads.json. שלושה מצבים:
 *  • {"live": false} — סגור לכולם: יחידת הבדיקה של Google, גם כש-ADS.live דולק. ככה עד ההגשה ל-production,
 *    וגם "מתג חירום" אם AdMob מעירה משהו. כך הבודקים, כולל הבודקים בתשלום, לא רואים פרסומות אמיתיות,
 *    ואין סיכון של תנועה לא תקינה בחשבון AdMob.
 *  • {"live": "auto", "fromBuild": 1005} — נפתח לבד: פרסומות אמיתיות רק באפליקציה שמספר הבנייה שלה (versionCode)
 *    הוא fromBuild ומעלה, כלומר ה-AAB של ההשקה, שמוגש רק ל-production. עד ש-Google מאשרת אותו הוא לא אצל אף אחד,
 *    ולכן כולם, כולל הבודקים, מקבלים פרסומות בדיקה. כשהוא מגיע לטלפונים (גם של הבודקים), הפרסומות האמיתיות נפתחות
 *    בלי שמישהו צריך לעשות משהו. רושמים את זה ביום ההגשה: scripts/ads-switch.sh auto <versionCode>.
 *  • {"live": true} — פתוח לכולם (scripts/ads-switch.sh on).
 *
 * שינוי בקובץ לא דורש שינוי קוד, גרסה חדשה או הודעת עדכון. המשחק בודק את הקובץ לפני כל פרסומת. זה אותו שרת
 * שממנו מגיעים עדכוני המשחק, ולכן אין זרימת מידע חדשה.
 * הקובץ אחד לכל העולם, בלי הגדרה לפי מדינה.
 * בלי תשובה (אין רשת, הקובץ חסר, תקלה, יותר מ-5 שניות): ההגדרה האחרונה שהמכשיר קיבל, שנשמרת אצלו, עם מספר הבנייה
 * של עכשיו. כך מכשיר שקיבל פעם "auto" נפתח גם בלי רשת כשגרסת החנות מגיעה אליו. מכשיר שמעולם לא קיבל תשובה: סגור.
 */
const KEY = 'coa.adsSwitch';
const TIMEOUT_MS = 5000;

function readLast(storage, build) {
  try {
    const raw = storage?.getItem(KEY);
    return raw ? decide(JSON.parse(raw), build) : false;
  } catch { return false; }
}
function writeLast(storage, conf) {
  try {
    const c = conf && typeof conf === 'object' ? conf : {};
    storage?.setItem(KEY, JSON.stringify({ live: c.live ?? false, fromBuild: c.fromBuild ?? null }));
  } catch { /* אין אחסון במכשיר */ }
}

/** ההחלטה לפי תוכן הקובץ ומספר הבנייה של האפליקציה (versionCode). כל דבר אחר, או חסר, הוא סגור */
export function decide(conf, build) {
  if (!conf || typeof conf !== 'object') return false;
  if (conf.live === true) return true;
  if (conf.live === 'auto') {
    const from = Number(conf.fromBuild);
    const b = Number(build);
    return Number.isInteger(from) && from > 0 && Number.isFinite(b) && b >= from;
  }
  return false;
}

/**
 * true רק כשהמתג באתר פתוח לאפליקציה הזו.
 * base — כתובת ערוץ העדכונים של Play (UPDATE_BASE, עם / בסוף), file — שם הקובץ (ADS.remoteSwitch),
 * build — מספר הבנייה של האפליקציה (App.getInfo().build), 0 אם לא ידוע.
 */
export async function adsSwitchOpen({ base, file, build = 0, fetchFn = globalThis.fetch, storage = globalThis.localStorage, timeoutMs = TIMEOUT_MS } = {}) {
  const last = readLast(storage, build);
  if (!base || !file || typeof fetchFn !== 'function') return last;
  const work = (async () => {
    const res = await fetchFn(`${base}${file}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res?.ok) throw new Error(`http ${res?.status}`);
    return res.json();
  })();
  work.catch(() => { /* מטופל למטה; כאן רק כדי שלא תהיה דחייה בלי טיפול אחרי שהזמן נגמר */ });
  let timer;
  try {
    const conf = await Promise.race([
      work,
      new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('timeout')), timeoutMs); }),
    ]);
    writeLast(storage, conf);
    return decide(conf, build);
  } catch {
    return last;
  } finally {
    clearTimeout(timer);
  }
}
