/**
 * עדכונים — האפליקציה "יודעת להגיד שיש עדכון חדש ולעדכן":
 *  • APK (Capacitor): בודקת את version.json באתר (בפתיחה, כל 30 דקות ובחזרה לאפליקציה). גרסה חדשה יורדת ברקע
 *    (@capgo/capacitor-updater), ואז קופצת הודעה "יש עדכון חדש" עם "עדכן עכשיו" / "אחר כך".
 *    "אחר כך" = העדכון יותקן לבד בפתיחה הבאה. אם נדרש APK חדש (minNativeVersion) — הודעה עם כפתור הורדה.
 *  • PWA / אתר: Service Worker עם מזהה בנייה; כשגרסה חדשה מוכנה — אותה הודעה. "אחר כך" = מותקן בפתיחה הבאה.
 * ההודעה מוצגת רק ברגע בטוח (לא באמצע אנימציה או חשיבת מחשב). המשחק הנוכחי נשמר ונטען מחדש אחרי העדכון.
 */
import { Capacitor } from '@capacitor/core';
import { APP_VERSION, BUILD_TIME, UPDATE_URL, APK_URL } from '../config/AppConfig.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
   */
  constructor({ isSafe = () => true, onAvailable = null, onUpdating = () => {}, onNativeRequired = () => {} } = {}) {
    this.isSafe = isSafe;
    this.onAvailable = onAvailable;
    this.onUpdating = onUpdating;
    this.onNativeRequired = onNativeRequired;
    this.native = Capacitor?.isNativePlatform?.() || false;
    this.lastCheck = 0;
    this.offered = new Set();
  }

  async init() {
    if (this.native) return this.initNative();
    return this.initWeb();
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
      this.offered.clear();
      return (await this.checkNow()) || 'none';
    }
    if (!this.reg) return 'unsupported';
    try {
      await this.reg.update();
      await sleep(1500);
      if (this.reg.installing || this.reg.waiting) { this.offered.clear(); if (this.reg.waiting) this.readyFn?.(this.reg.waiting); return 'found'; }
      return 'none';
    } catch { return 'error'; }
  }

  async remoteVersion(base = '') {
    try {
      const res = await fetch(`${base}version.json?ts=${Date.now()}`, { cache: 'no-store' });
      return res.ok ? await res.json() : null;
    } catch { return null; }
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
      const info = await this.remoteVersion('./');
      this.offer(`web-${info?.build || Date.now()}`, info, async () => {
        this.applying = true;
        worker.postMessage({ type: 'SKIP_WAITING' });
      }, () => { /* ה-Service Worker החדש יופעל לבד בפתיחה הבאה */ });
    };
    this.readyFn = ready;
    if (reg.waiting && navigator.serviceWorker.controller) ready(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) ready(nw);
      });
    });
    const check = () => { this.lastCheck = Date.now(); reg.update().catch(() => {}); };
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
    const check = async () => {
      if (this.busy) return;
      this.busy = true;
      this.lastCheck = Date.now();
      try {
        const info = await this.remoteVersion(UPDATE_URL);
        if (!info) return 'error';
        if (!(Number(info.buildTime) > Number(BUILD_TIME))) return 'none';
        const app = await App.getInfo();
        if (info.minNative && cmpVer(app.version, info.minNative) < 0) {
          if (!this.offered.has(`apk-${info.minNative}`)) {
            this.offered.add(`apk-${info.minNative}`);
            await this.waitSafe();
            this.onNativeRequired({ ...info, apk: info.apk || APK_URL });
          }
          return 'found';
        }
        if (this.offered.has(`ota-${info.build}`)) return 'found';
        // מורידים ברקע — כשהמשתמש לוחץ "עדכן עכשיו" ההתקנה מיידית
        const url = new URL(info.bundle, UPDATE_URL).href;
        const bundle = await CapacitorUpdater.download({ url, version: info.build });
        await this.offer(`ota-${info.build}`, info,
          () => CapacitorUpdater.set({ id: bundle.id }), // טוען מחדש עם הגרסה החדשה
          () => CapacitorUpdater.next({ id: bundle.id }).catch(() => {})); // יותקן בפתיחה הבאה
        return 'found';
      } catch {
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
