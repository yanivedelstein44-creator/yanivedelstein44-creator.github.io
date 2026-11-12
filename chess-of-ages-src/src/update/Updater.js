/**
 * עדכונים — האפליקציה "יודעת להגיד שיש עדכון חדש ולעדכן":
 *  • APK (Capacitor): בודקת את version.json באתר (בפתיחה, כל 30 דקות ובחזרה לאפליקציה). גרסה חדשה יורדת ברקע
 *    (@capgo/capacitor-updater, עם checksum מסוג SHA-256 — חובה בגרסאות 8.x של התוסף), ואז קופצת הודעה
 *    "יש עדכון חדש" עם "עדכן עכשיו" / "אחר כך". "אחר כך" = העדכון יותקן לבד בפתיחה הבאה.
 *    אם נדרש APK חדש (minNative) — הודעה עם כפתור הורדה.
 *  • PWA / אתר: Service Worker עם מזהה בנייה; כשגרסה חדשה מוכנה — אותה הודעה. "אחר כך" = מותקן בפתיחה הבאה.
 * ההודעה מוצגת רק ברגע בטוח (לא באמצע אנימציה או חשיבת מחשב). המשחק הנוכחי נשמר ונטען מחדש אחרי העדכון.
 */
import { Capacitor } from '@capacitor/core';
import { APP_VERSION, BUILD_TIME, APK_URL } from '../config/AppConfig.js';
// UPDATE_BASE: ערוץ העדכונים לפי הגרסה — Play קוראת מ-chess-of-ages-play/, ה-APK מהאתר מ-chess-of-ages/
import { STORE, PLAY_URL, UPDATE_BASE as UPDATE_URL } from '../config/Store.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * כתובת מתוך version.json רק אם היא https באותו שרת של UPDATE_URL (http רק כשגם הבסיס http — בדיקות מקומיות).
 * כך version.json שזויף או השתבש לא יכול לשלוח את האפליקציה להוריד חבילה מאתר זר או לפתוח javascript: / קישור זר.
 */
export function safeUrl(u, base) {
  if (!u || typeof u !== 'string') return '';
  try {
    const b = new URL(base);
    const x = new URL(u, b);
    const proto = x.protocol === 'https:' || (b.protocol === 'http:' && x.protocol === 'http:');
    return proto && x.host === b.host ? x.href : '';
  } catch { return ''; }
}
export function cmpVer(a = '0', b = '0') {
  const pa = String(a).split(/[.-]/).map((x) => parseInt(x, 10) || 0), pb = String(b).split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0); }
  return 0;
}

export class Updater {
  /**
   * @param {object} o
   * @param {() => boolean} o.isSafe — האם אפשר להציג הודעה / לטעון מחדש עכשיו
   * @param {(info, actions:{now:Function, later:Function}) => void} o.onAvailable — הצגת "יש עדכון חדש"
   * @param {(version:string) => void} o.onUpdating — רגע לפני טעינה מחדש
   * @param {(info) => void} o.onNativeRequired — נדרש APK חדש
   * @param {(info) => void} o.onDownloading — עדכון נמצא ומתחיל לרדת (רק בבדיקה ידנית)
   */
  constructor({ isSafe = () => true, onAvailable = null, onUpdating = () => {}, onNativeRequired = () => {}, onDownloading = () => {} } = {}) {
    this.isSafe = isSafe;
    this.onAvailable = onAvailable;
    this.onUpdating = onUpdating;
    this.onNativeRequired = onNativeRequired;
    this.onDownloading = onDownloading;
    this.native = Capacitor?.isNativePlatform?.() || false;
    this.lastCheck = 0;
    this.lastError = '';
    this.offered = new Set();
  }

  async init() {
    if (this.native) return this.initNative();
    return this.initWeb();
  }

  /**
   * גרסת Google Play: עדכון נייטיב דרך החנות בלבד. קודם עדכון מתוך האפליקציה של Play (In-App Updates,
   * דרך ‎@capgo/capacitor-updater‎ ≥ 8), אחר כך דף האפליקציה בחנות, ובסוף הקישור עצמו.
   */
  async openStore(url = '') {
    try {
      const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
      if (typeof CapacitorUpdater.getAppUpdateInfo === 'function') {
        const u = await CapacitorUpdater.getAppUpdateInfo().catch(() => null);
        if (u?.immediateUpdateAllowed && typeof CapacitorUpdater.performImmediateUpdate === 'function') {
          await CapacitorUpdater.performImmediateUpdate();
          return;
        }
      }
      if (typeof CapacitorUpdater.openAppStore === 'function') { await CapacitorUpdater.openAppStore(); return; }
    } catch { /* אין תוסף או אין חנות — גיבוי למטה */ }
    if (url) location.href = url;
  }

  async waitSafe() {
    while (!this.isSafe() || document.hidden) await sleep(800);
  }

  /** מציג את ההודעה פעם אחת לכל גרסה; בלי מסך הודעות — מעדכן מיד */
  async offer(key, info, now, later) {
    if (this.offered.has(key)) return;
    this.offered.add(key);
    await this.waitSafe();
    if (!this.onAvailable) { await now(); return; }
    this.onAvailable(info || {}, {
      now: async () => { this.onUpdating(info?.version || ''); await sleep(700); await now(); },
      later: () => later?.(),
    });
  }

  /** בדיקה ידנית (כפתור "בדוק עדכונים"): 'found' | 'none' | 'error' | 'unsupported' */
  async checkForUpdates() {
    if (this.native) {
      if (!this.checkNow) return 'unsupported';
      // בדיקה אוטומטית כבר רצה (למשל הורדה באמצע) — מחכים לה במקום לענות "אין עדכון"
      for (let i = 0; this.busy && i < 120; i++) await sleep(500);
      this.offered.clear();
      return (await this.checkNow({ manual: true })) || 'none';
    }
    if (!this.reg) return 'unsupported';
    try {
      await this.reg.update();
      const w = await this.waitInstalled(this.reg.installing, 25000);
      const waiting = this.reg.waiting || w;
      if (waiting && navigator.serviceWorker.controller) { this.offered.clear(); this.readyFn?.(waiting); return 'found'; }
      return 'none';
    } catch (e) { this.lastError = String(e?.message || e); return 'error'; }
  }

  async remoteVersion(base = '') {
    try {
      const res = await fetch(`${base}version.json?ts=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) { this.lastError = `version.json HTTP ${res.status}`; return null; }
      return await res.json();
    } catch (e) { this.lastError = `version.json: ${e?.message || e}`; return null; }
  }

  /** מחכה ש-Service Worker חדש יסיים להתקין (או נכשל) */
  waitInstalled(worker, timeout = 20000) {
    if (!worker) return Promise.resolve(null);
    if (worker.state === 'installed' || worker.state === 'activated') return Promise.resolve(worker);
    return new Promise((resolve) => {
      const done = (v) => { clearTimeout(tid); worker.removeEventListener('statechange', onState); resolve(v); };
      const onState = () => {
        if (worker.state === 'installed' || worker.state === 'activated') done(worker);
        else if (worker.state === 'redundant') done(null);
      };
      const tid = setTimeout(() => done(null), timeout);
      worker.addEventListener('statechange', onState);
    });
  }

  // ---------- Web / PWA ----------
  async initWeb() {
    if (!('serviceWorker' in navigator) || import.meta.env.DEV || !/^https?:$/.test(location.protocol)) return;
    let reg;
    try {
      reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
    } catch {
      return; // סביבה שלא מאפשרת SW (למשל תצוגה מקדימה בתוך iframe)
    }
    if (!reg) return;
    this.reg = reg;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!this.applying || this.reloading) return;
      this.reloading = true;
      location.reload();
    });
    const ready = async (worker) => {
      if (!worker || !navigator.serviceWorker.controller) return; // התקנה ראשונה — אין מה להציע
      const info = await this.remoteVersion('./');
      this.offer(`web-${info?.build || worker.scriptURL || 'new'}`, info, async () => {
        this.applying = true;
        worker.postMessage({ type: 'SKIP_WAITING' });
        // גיבוי: אם controllerchange לא הגיע תוך כמה שניות — טוענים מחדש בכל מקרה
        setTimeout(() => { if (!this.reloading) { this.reloading = true; location.reload(); } }, 4000);
      }, () => { /* ה-Service Worker החדש יופעל לבד בפתיחה הבאה */ });
    };
    this.readyFn = ready;
    const track = (worker) => { this.waitInstalled(worker, 120000).then((w) => { if (w && w.state === 'installed') ready(w); }); };
    // בדיקת עדכון שהדפדפן התחיל לפני שהמאזין נרשם — לא מפספסים אותה
    if (reg.waiting) ready(reg.waiting);
    else if (reg.installing) track(reg.installing);
    reg.addEventListener('updatefound', () => { if (reg.installing) track(reg.installing); });
    const check = () => { this.lastCheck = Date.now(); reg.update().catch(() => {}); };
    setTimeout(check, 4000);
    setInterval(check, 20 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - this.lastCheck > 5 * 60 * 1000) check(); });
    window.addEventListener('online', check);
  }

  // ---------- Native (Capacitor APK) ----------
  async initNative() {
    let CapacitorUpdater, App;
    try {
      ({ CapacitorUpdater } = await import('@capgo/capacitor-updater'));
      ({ App } = await import('@capacitor/app'));
    } catch { return; }
    try { await CapacitorUpdater.notifyAppReady(); } catch { /* גרסה מובנית */ }
    if (!UPDATE_URL) return;
    const check = async ({ manual = false } = {}) => {
      if (this.busy) return;
      this.busy = true;
      this.lastCheck = Date.now();
      this.lastError = '';
      try {
        const info = await this.remoteVersion(UPDATE_URL);
        if (!info) return 'error';
        if (!(Number(info.buildTime) > Number(BUILD_TIME))) return 'none';
        const app = await App.getInfo();
        if (info.minNative && cmpVer(app.version, info.minNative) < 0) {
          if (!this.offered.has(`apk-${info.minNative}`)) {
            this.offered.add(`apk-${info.minNative}`);
            await this.waitSafe();
            // גרסת Google Play: אסור להציע הורדת APK — שולחים לדף האפליקציה ב-Play (store: 'play', apk: '')
            this.onNativeRequired(STORE === 'play' ? { ...info, store: STORE, apk: '', storeUrl: PLAY_URL } : { ...info, store: STORE, apk: safeUrl(info.apk, UPDATE_URL) || APK_URL });
          }
          return 'found';
        }
        if (this.offered.has(`ota-${info.build}`)) return 'found';
        if (!info.checksum) { this.lastError = 'version.json: missing checksum'; return 'error'; }
        if (manual) this.onDownloading(info);
        // מורידים ברקע — כשהמשתמש לוחץ "עדכן עכשיו" ההתקנה מיידית
        const url = safeUrl(info.bundle, UPDATE_URL);
        if (!url) { this.lastError = 'version.json: bundle URL rejected'; return 'error'; }
        const bundle = await CapacitorUpdater.download({ url, version: info.build, checksum: info.checksum });
        this.offer(`ota-${info.build}`, info,
          () => CapacitorUpdater.set({ id: bundle.id }), // טוען מחדש עם הגרסה החדשה
          () => CapacitorUpdater.next({ id: bundle.id }).catch(() => {})); // יותקן בפתיחה הבאה
        return 'found';
      } catch (e) {
        this.lastError = String(e?.message || e || 'error');
        return 'error'; // אין רשת / שגיאה — ננסה בבדיקה הבאה
      } finally {
        this.busy = false;
      }
    };
    this.checkNow = check;
    setTimeout(check, 3500);
    setInterval(check, 30 * 60 * 1000);
    App.addListener('resume', () => { if (Date.now() - this.lastCheck > 5 * 60 * 1000) check(); });
  }
}

export { APP_VERSION };
