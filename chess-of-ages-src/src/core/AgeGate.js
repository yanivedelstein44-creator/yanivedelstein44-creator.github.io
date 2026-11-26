/**
 * בדיקת גיל לפי חוק — Texas SB 2420 (App Store Accountability Act) וחוקים דומים שיחולו בעתיד.
 *
 * מי עושה מה:
 *  • Google Play מאמתת את הגיל, מנהלת את אישור ההורים (Family Link) להורדה ולרכישות, ויודעת על מי החוק חל
 *    (לפי המיקום והחשבון של המשתמש). אנחנו לא בודקים מדינה בעצמנו.
 *  • המשחק רק שואל את Google Play דרך Play Age Signals API (תוסף נייטיב 'AgeSignals', android-wrapper/native/
 *    AgeSignalsPlugin.java, בעטיפת Play מגרסה 1004) ומגיב לתשובה:
 *      – החוק לא חל על המשתמש (ישראל, אירופה וכו'): לא קורה כלום, ואף חלון לא מוצג (גם לא חלון השיתוף של Google).
 *      – החוק חל והגיל לא אומת: מסך חוסם "אימות גיל ב-Google Play" עם כפתור לחנות ו"בדוק שוב".
 *      – ילד בפיקוח הורים, והורה דחה "שינוי משמעותי" שדיווחנו ב-Play Console: מסך "צריך אישור של הורה".
 *        (עד היום לא דיווחנו על שינוי כזה, אז בפועל המסך הזה לא מופיע.)
 *      – תקלה (אין חנות, אין רשת, מכשיר שלא נתמך): לא חוסמים, ובודקים שוב בפתיחה הבאה ובחזרה מהרקע.
 *  • בודקים בכל פתיחה ובכל חזרה מהרקע (לכל היותר פעם בדקה; כשהמסך החוסם פתוח — בכל חזרה), כמו שהתיעוד ממליץ.
 *
 * פרטיות: טווח הגיל נשאר רק בזיכרון של המשחק בזמן ריצה. לא נשמר, לא נשלח לשום שרת, ולא משמש לפרסומות או לניתוח
 * (תנאי השירות של Play Age Signals). מידע שלא יוצא מהמכשיר לא נחשב "נאסף" ב-Data safety.
 *
 * בדפדפן ובעטיפות ישנות (בלי התוסף): אין בדיקה. לבדיקות בדפדפן: ‎?fakeage=verify | pass (עובר בבדיקה השנייה)
 * | parent | ok | none | error.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { isPlayBuild, PLAY_URL } from '../config/Store.js';
import { h } from '../ui/UI.js';
import { t } from '../ui/i18n.js';
import { icon } from '../ui/icons.js';

const RECHECK_MS = 60 * 1000;
const TIMEOUT_MS = 20 * 1000;
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => { setTimeout(() => rej(new Error('timeout')), ms); })]);

function nativeAvailable() {
  try { return isPlayBuild() && !!Capacitor.isNativePlatform?.() && !!Capacitor.isPluginAvailable?.('AgeSignals'); } catch { return false; }
}
function fakeMode() {
  try {
    if (Capacitor.isNativePlatform?.()) return null;
    const p = new URLSearchParams(location.search);
    return p.has('fakeage') ? p.get('fakeage') || 'verify' : null;
  } catch { return null; }
}
/** תשובות מדומות באותו מבנה של התוסף (לבדיקות בדפדפן בלבד) */
function fakeResult(mode, n) {
  const shared = (o = {}) => ({ ok: true, mandatory: true, status: 'SHARED', ageLower: 18, ...o });
  const verify = { ok: true, mandatory: true, status: 'VERIFICATION_REQUIRED' };
  switch (mode) {
    case 'none': return { ok: true, mandatory: false };
    case 'error': return { ok: false, stage: 'features', error: 'PLAY_STORE_NOT_FOUND' };
    case 'ok': return shared();
    case 'parent': return shared({ ageLower: 13, ageUpper: 15, change: 'DECLINED' });
    case 'pass': return n < 1 ? verify : shared();
    default: return verify;
  }
}

/**
 * ההחלטה מתוך תשובת התוסף: 'ok' | 'verify' | 'parent'.
 * חוסמים רק כש-Google Play אומרת שהחוק חל (mandatory) — ורק במצבים המוכרים. כל השאר: לא חוסמים.
 */
export function decideAgeGate(r) {
  if (!r || r.ok === false || !r.mandatory) return 'ok';
  if (r.status === 'VERIFICATION_REQUIRED' || r.status === 'NOT_SHARED') return 'verify';
  if (r.status === 'SHARED') {
    const minor = typeof r.ageLower === 'number' && r.ageLower < 18;
    if (minor && r.change === 'DECLINED') return 'parent';
  }
  return 'ok';
}

export class AgeGate {
  constructor(app) {
    this.app = app;
    this.fake = fakeMode();
    this.enabled = !!this.fake || nativeAvailable();
    this.state = 'ok';
    this.last = 0;
    this.tries = 0;
    this.modal = null;
    this.running = null;
    if (!this.enabled) return;
    this.plugin = this.fake ? null : registerPlugin('AgeSignals');
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.check(); });
    this.check(true);
  }

  get blocked() { return this.state !== 'ok'; }

  async query() {
    if (this.fake) {
      await new Promise((r) => { setTimeout(r, 350); });
      return fakeResult(this.fake, this.tries++);
    }
    try { return await withTimeout(this.plugin.check(), TIMEOUT_MS); } catch (e) { return { ok: false, stage: 'js', error: String(e?.message || e) }; }
  }

  /** בודק מול Google Play ומציג/סוגר את המסך החוסם. force — גם אם נבדק לפני רגע */
  check(force = false) {
    if (!this.enabled) return Promise.resolve('ok');
    if (this.running) return this.running;
    if (!force && !this.modal && Date.now() - this.last < RECHECK_MS) return Promise.resolve(this.state);
    this.running = this.query().then((r) => {
      this.last = Date.now();
      this.state = decideAgeGate(r);
      if (r && r.ok === false) console.warn('[AgeGate] no answer from Google Play:', r.stage || '', r.error || '');
      this.render();
      return this.state;
    }).finally(() => { this.running = null; });
    return this.running;
  }

  render() {
    if (this.state === 'ok') { this.close(); return; }
    if (this.modal && this.modal.kind === this.state) return;
    this.close();
    this.open(this.state);
  }

  open(kind) {
    const verify = kind === 'verify';
    const note = h('p', { class: 'age-note small', role: 'status', 'aria-live': 'polite' });
    const body = h('div', { class: 'waiting age-gate-body' },
      h('div', { class: 'hero-ic', 'aria-hidden': 'true' }, icon(verify ? 'shield' : 'users', { size: 50 })),
      h('p', {}, t(verify ? 'ageVerifyBody' : 'ageParentBody')),
      verify ? h('p', { class: 'muted small' }, t('ageVerifySteps')) : null,
      note,
      h('p', { class: 'muted small age-privacy' }, icon('lock', { size: 14 }), h('span', {}, t('agePrivacy'))));
    const actions = [];
    if (verify) actions.push({ label: t('ageOpenPlay'), icon: 'link', primary: true, onClick: () => this.openPlay() });
    actions.push({ label: t('ageCheckAgain'), icon: 'refresh', primary: !verify, onClick: () => this.retry() });
    const m = this.app.ui.modal({
      title: t(verify ? 'ageVerifyTitle' : 'ageParentTitle'), titleIcon: verify ? 'shield' : 'users', body, actions,
      center: true, dismissable: false, closeButton: false, sticky: true, className: 'waiting-modal age-gate',
      // ליתר ביטחון: אם משהו סגר את המסך בזמן שעדיין חסום — פותחים אותו שוב
      onClose: () => { if (this.modal === m) { this.modal = null; if (this.blocked) setTimeout(() => this.render(), 0); } },
    });
    m.kind = kind;
    m.note = note;
    this.modal = m;
  }

  close() {
    const m = this.modal;
    this.modal = null;
    m?.close();
  }

  async retry() {
    if (this.running) return;
    const kind = this.modal?.kind;
    if (this.modal?.note) this.modal.note.textContent = t('ageChecking');
    const st = await this.check(true);
    if (st !== 'ok' && this.modal && this.modal.kind === kind && this.modal.note) this.modal.note.textContent = t('ageStillBlocked');
  }

  /** אפליקציית Google Play, בדף של המשחק — שם Google מבקשת לאמת גיל או להגדיר פיקוח הורים */
  async openPlay() {
    if (this.fake) { this.app.ui.toast('Google Play (test)', { icon: 'link', duration: 2000 }); return; }
    try {
      const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
      if (typeof CapacitorUpdater.openAppStore === 'function') { await CapacitorUpdater.openAppStore(); return; }
    } catch { /* אין תוסף — גיבוי למטה */ }
    try { location.href = PLAY_URL; } catch { /* */ }
  }
}
