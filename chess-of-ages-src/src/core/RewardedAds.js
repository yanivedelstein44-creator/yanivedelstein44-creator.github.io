/**
 * פרסומות מתגמלות (Google AdMob, פורמט Rewarded) — הדולפין של האי המרכזי: כשיש פרסומת זמינה הוא בלגונה שמול
 * רחבת השחמט עם תגית "בונוס", ובהמתנה הוא בים הפתוח (scene/Dolphin3D.js, scene/HubLagoon.js).
 *
 * איפה זה פועל: רק בגרסת Google Play, באפליקציה שיש בה את התוסף הנייטיב '@capacitor-community/admob'
 * (עטיפת Play מגרסה 1003 ומעלה — android-wrapper/build-aab.sh). בדפדפן, ב-APK מהאתר ובעטיפות ישנות אין פרסומות:
 * הדולפין רק שוחה וקופץ (קישוט), בלי תג ובלי חלון. לבדיקות בדפדפן: ‎?fakeads (פרסומת מדומה של 5 שניות;
 * ‎?fakeads=eea מדמה את טופס ההסכמה האירופי, ‎?fakeads=nofill — אין פרסומת).
 * עד ההשקה ב-Google Play גם גרסת Play מציגה פרסומות בדיקה של Google ("Test Ad") — ADS.live ב-config/AdsConfig.js.
 *
 * הזרימה (כל שלב רק אחרי לחיצה של השחקן):
 *  1. נגיעה בדולפין → חלון "פרסומת: צפה עד הסוף וקבל 20 יהלומים" (ui/AdOffer.js) עם "צפה בפרסומת" / "לא עכשיו".
 *  2. "צפה בפרסומת" → בדיקת הסכמה של Google (UMP): באזור הכלכלי האירופי, בבריטניה ובשווייץ — טופס ההסכמה של Google
 *     (CMP מאושר, חובה לפי מדיניות AdMob). מחוץ להם, בפעם הראשונה — חלון שלנו: "פרסומות כלליות" או "מותאמות אישית",
 *     בכפתורים שווים (ברירת המחדל: כלליות; לפי עמדת הרשות להגנת הפרטיות, פרופיילינג לפרסום — רק בהסכמה אקטיבית).
 *  3. טעינת פרסומת והצגה. **היהלומים ניתנים רק באירוע onRewardedVideoAdReward** — כש-AdMob מדווחת שהצפייה הושלמה.
 *     סגירה מוקדמת, תקלה או אין פרסומת → בלי יהלומים. כל פרסומת נותנת פרס פעם אחת לכל היותר.
 *  4. מנוחה של 5 דקות אחרי כל צפייה מלאה, ועד 10 ביום (config/AdsConfig.js). אחרי ניסיון שלא הסתיים — 30 שניות.
 *
 * המצב נשמר בכלכלה (economy.s.ads: יום, מונה, זמן הצפייה האחרונה) ונמחק ב"מחק את כל הנתונים שלי",
 * שגם מאפס את ההסכמה של Google במכשיר (resetConsentInfo).
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { isPlayBuild } from '../config/Store.js';
import { ADS, ADMOB_IDS } from '../config/AdsConfig.js';
import { t } from '../ui/i18n.js';
import { adOffer, adChoice, adLoading, fakeAdShow, fakeConsentForm } from '../ui/AdOffer.js';

const EV = {
  rewarded: 'onRewardedVideoAdReward',
  dismissed: 'onRewardedVideoAdDismissed',
  failedShow: 'onRewardedVideoAdFailedToShow',
};
/** היום המקומי של המכשיר (המונה היומי מתאפס בחצות) */
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** ‏125 → "2:05" */
export const mmss = (secs) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => { setTimeout(() => rej(new Error('timeout')), ms); })]);
const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

function nativeAvailable() {
  try { return isPlayBuild() && !!Capacitor.isNativePlatform?.() && !!Capacitor.isPluginAvailable?.('AdMob'); } catch { return false; }
}
function fakeMode() {
  try { if (Capacitor.isNativePlatform?.()) return null; const p = new URLSearchParams(location.search); return p.has('fakeads') ? p.get('fakeads') || 'on' : null; } catch { return null; }
}
/** תשובת UMP אחידה: regulated = אזור שבו Google דורשת הסכמה (טופס ההסכמה ו"אפשרויות פרטיות" שלה) */
const norm = (r = {}) => ({
  status: r.status || 'UNKNOWN',
  formAvailable: !!r.isConsentFormAvailable,
  canRequestAds: r.canRequestAds !== false,
  regulated: r.privacyOptionsRequirementStatus === 'REQUIRED' || r.status === 'REQUIRED',
});

/** AdMob אמיתי דרך התוסף הנייטיב (רק בעטיפת Play עם התוסף) */
class NativeAds {
  constructor() {
    this.p = registerPlugin('AdMob');
    this.inited = false;
    this.listening = null;
    this.h = null;
  }
  listen() {
    // אירועי התוסף מגיעים לכל המאזינים; ההפניה לפרסומת הנוכחית היא דרך this.h
    this.listening ||= Promise.all([
      this.p.addListener(EV.rewarded, (item) => this.h?.onReward?.(item)),
      this.p.addListener(EV.dismissed, () => this.h?.onDismiss?.()),
      this.p.addListener(EV.failedShow, (e) => this.h?.onFail?.(e)),
    ]);
    return this.listening;
  }
  async consent() { return norm(await this.p.requestConsentInfo({})); }
  async consentForm() { return norm(await this.p.showConsentForm()); }
  async privacyOptions() { await this.p.showPrivacyOptionsForm(); }
  async init() {
    if (this.inited) return;
    await this.p.initialize({ maxAdContentRating: ADS.maxAdContentRating, tagForChildDirectedTreatment: false, tagForUnderAgeOfConsent: false });
    this.inited = true;
  }
  async load({ npa }) {
    await this.listen();
    const real = ADS.live ? ADMOB_IDS.rewarded : '';
    // עד ההשקה (ADS.live כבוי) או בלי מזהה אמיתי — יחידת הבדיקה של Google (פרסומות "Test Ad", בלי הכנסות ובלי סיכון לחשבון)
    await this.p.prepareRewardVideoAd({ adId: real || ADMOB_IDS.testRewarded, isTesting: !real, npa: !!npa, immersiveMode: true });
  }
  show(h) {
    this.h = h;
    // ההבטחה של showRewardVideoAd מתממשת רק כשהפרס הושג (אחרת לא חוזרת) — לכן ההחלטה רק לפי האירועים
    this.p.showRewardVideoAd().catch((e) => h.onFail?.(e));
  }
  async reset() { try { await this.p.resetConsentInfo(); } catch { /* אין מה לאפס */ } }
}

/** פרסומת מדומה לבדיקות בדפדפן (‎?fakeads) — אותה זרימה בדיוק, בלי Google */
class FakeAds {
  constructor(app, mode) { this.app = app; this.mode = mode; this.consented = false; }
  async consent() {
    const eea = this.mode === 'eea';
    return { status: eea ? (this.consented ? 'OBTAINED' : 'REQUIRED') : 'NOT_REQUIRED', formAvailable: eea, canRequestAds: !eea || this.consented, regulated: eea };
  }
  async consentForm() { this.consented = await fakeConsentForm(this.app); return this.consent(); }
  async privacyOptions() { await this.consentForm(); }
  async init() {}
  async load() {
    await new Promise((r) => { setTimeout(r, 700); });
    if (this.mode === 'nofill') throw new Error('No fill');
  }
  show(h) { fakeAdShow(this.app, { seconds: 5, onReward: () => h.onReward?.({ type: 'gems', amount: ADS.rewardGems }), onDismiss: () => h.onDismiss?.() }); }
  async reset() { this.consented = false; }
}

export class RewardedAds {
  constructor(app) {
    this.app = app;
    const fake = fakeMode();
    this.provider = nativeAvailable() ? new NativeAds() : fake ? new FakeAds(app, fake) : null;
    this.busy = false;
    this.lastOffer = '';
    if (this.provider) setInterval(() => this.syncBadge(), 1000);
    this.syncBadge();
  }

  /** האם בעותק הזה של המשחק יש פרסומות בכלל (גרסת Play עם התוסף, או בדיקה) */
  get available() { return !!this.provider; }

  get st() {
    const s = this.app.economy.s;
    if (!s.ads || typeof s.ads !== 'object') s.ads = { day: '', count: 0, lastAt: 0, tryAt: 0 };
    return s.ads;
  }
  todayCount() { const s = this.st; return s.day === dayKey() ? s.count || 0 : 0; }
  left() { return Math.max(0, ADS.dailyCap - this.todayCount()); }

  /** { state: 'off' | 'ready' | 'wait' | 'done', secs } — איפה הדולפין (ready = בלגונה, אחרת בים) ומה קורה בנגיעה בו */
  status(now = Date.now()) {
    if (!this.available) return { state: 'off', secs: 0 };
    if (this.left() <= 0) return { state: 'done', secs: 0 };
    const s = this.st;
    let wait = Math.max((s.lastAt || 0) + ADS.cooldownMin * 60e3, (s.tryAt || 0) + ADS.retrySec * 1e3) - now;
    wait = Math.min(wait, ADS.cooldownMin * 60e3); // שעון המכשיר שזז אחורה לא נועל את הדולפין ליותר מזמן המנוחה
    return wait > 0 ? { state: 'wait', secs: Math.ceil(wait / 1000) } : { state: 'ready', secs: 0 };
  }

  syncBadge() {
    const d = this.app.museum?.dolphin;
    if (!d) return;
    const o = this.status();
    const key = `${o.state}|${o.secs}`;
    if (key === this.lastOffer) return;
    this.lastOffer = key;
    d.setOffer(o);
  }

  /** נגיעה בדולפין (GameApp.onTap) */
  async onDolphinTap() {
    const { app } = this;
    const d = app.museum?.dolphin;
    if (this.busy || app.ui.modalOpen) return;
    const s = this.status();
    if (s.state === 'off') { d?.wave(); return; }
    if (s.state === 'done') { d?.wave(); app.ui.toast(t('adDone'), { icon: 'moon' }); return; }
    if (s.state === 'wait') { d?.wave(); app.ui.toast(t('adWait').replace('{t}', mmss(s.secs)), { icon: 'hourglass' }); return; }
    if (offline()) { app.ui.toast(t('adOffline'), { kind: 'bad' }); return; }
    this.busy = true;
    try {
      // לפני כל פרסומת: מה צריך לעשות ומה מקבלים, ו"כן" מפורש (מדיניות AdMob)
      const go = await adOffer(app, { gems: ADS.rewardGems, minutes: ADS.cooldownMin, cap: ADS.dailyCap, left: this.left() });
      if (go) await this.watch();
    } finally {
      this.busy = false;
      this.syncBadge();
    }
  }

  /** הסכמה (UMP + הבחירה שלנו), טעינה והצגה. מחזיר 'ok' | 'early' | 'nofill' | 'consent' | 'cancel' | 'fail' */
  async watch() {
    const { app } = this;
    const loading = adLoading(app);
    const fail = (key, kind = 'bad') => { loading.hide(); this.st.tryAt = Date.now(); app.economy.save(); if (key) app.ui.toast(t(key), { kind, duration: 4200 }); };
    try {
      let c = await withTimeout(this.provider.consent(), 15000);
      if (c.status === 'REQUIRED' && c.formAvailable) { loading.hide(); c = await this.provider.consentForm(); }
      this.rememberRegion(c.regulated);
      if (!c.canRequestAds) { fail('adNoConsent'); return 'consent'; }
      // מחוץ לאזור האירופי — בפעם הראשונה בוחרים: כלליות או מותאמות אישית (בכפתורים שווים). סגירה — לא מציגים
      if (!c.regulated && !this.choiceMade()) {
        loading.hide();
        const pers = await adChoice(app);
        if (pers === null) return 'cancel';
        this.setPersonalized(pers);
      }
      loading.show();
      await withTimeout(this.provider.init(), 15000);
      // באזור האירופי ההסכמה של Google (TCF) קובעת; מחוץ לו — הבחירה של השחקן (npa = פרסומות כלליות)
      await withTimeout(this.provider.load({ npa: c.regulated ? false : !this.personalized() }), 25000);
      loading.hide();
    } catch (e) {
      const msg = String(e?.message || e || '');
      fail(/timeout|network|internet/i.test(msg) && offline() ? 'adOffline' : 'adNoFill', '');
      return 'nofill';
    }
    return this.present();
  }

  /** מציגים את הפרסומת שנטענה. הפרס — רק באירוע "הצפייה הושלמה", פעם אחת */
  present() {
    const { app } = this;
    return new Promise((resolve) => {
      const sess = { rewarded: false, closed: false, done: false };
      const end = (kind) => { if (sess.done) return; sess.done = true; resolve(kind); };
      const watchdog = setTimeout(() => { if (!sess.rewarded) this.noteTry(); end(sess.rewarded ? 'ok' : 'fail'); }, 4 * 60e3);
      this.provider.show({
        onReward: () => {
          if (sess.rewarded) return;
          sess.rewarded = true;
          this.grant();
          // אם הפרס הגיע אחרי שהחלון כבר נסגר — מודיעים עכשיו
          if (sess.closed) { this.thanks(); clearTimeout(watchdog); end('ok'); }
        },
        onDismiss: () => {
          if (sess.closed) return;
          sess.closed = true;
          // אירוע הפרס יכול להגיע רגע אחרי הסגירה — מחכים מעט לפני שמחליטים
          setTimeout(() => {
            if (sess.done) return;
            clearTimeout(watchdog);
            if (sess.rewarded) { this.thanks(); end('ok'); } else { this.noteTry(); app.ui.toast(t('adEarly'), { icon: 'info', duration: 4200 }); end('early'); }
          }, 700);
        },
        onFail: () => {
          if (sess.rewarded || sess.done) return;
          clearTimeout(watchdog);
          this.noteTry();
          app.ui.toast(t('adNoFill'), { duration: 4200 });
          end('fail');
        },
      });
    });
  }

  /** הענקת הפרס — נקראת רק מאירוע הפרס של AdMob */
  grant() {
    const s = this.st, today = dayKey();
    if (s.day !== today) { s.day = today; s.count = 0; }
    s.count = (s.count || 0) + 1;
    s.lastAt = Date.now();
    s.tryAt = 0;
    this.app.economy.addGems(ADS.rewardGems, 'ad'); // שומר גם את מצב הפרסומות (חלק מהכלכלה)
    this.syncBadge();
  }

  thanks() {
    const { app } = this;
    const d = app.museum?.dolphin;
    d?.celebrate();
    app.sound?.chime?.(2);
    const p = d && app.sm.projectToScreen ? app.sm.projectToScreen(d.worldPos().setY(d.worldPos().y + 2.4)) : null;
    if (p) app.ui.floatLabel(`+${ADS.rewardGems}`, p, 'gems', 1.8, 'gem');
    app.ui.toast(t('adThanks').replace('{n}', ADS.rewardGems), { kind: 'good', icon: 'gem', duration: 3200 });
  }

  noteTry() { this.st.tryAt = Date.now(); this.app.economy.save(); this.syncBadge(); }

  // ---------- פרטיות ----------
  choiceMade() { return !!this.app.store.get('settings').adsChoiceAt; }
  personalized() { const v = this.app.store.get('settings').adsPersonal; return v == null ? ADS.personalizedDefault : !!v; }
  /** הבחירה נשמרת עם זמן הבחירה (תיעוד ההסכמה); אפשר לשנות בכל עת בהגדרות */
  setPersonalized(on) {
    this.app.store.setSetting('adsPersonal', !!on);
    this.app.store.setSetting('adsChoiceAt', Date.now());
  }
  /** האם Google דורשת כאן את ההסכמה שלה (אירופה) — כדי שההגדרות יציגו את "אפשרויות פרטיות" שלה */
  rememberRegion(regulated) { if (this.app.store.get('settings').adsRegulated !== !!regulated) this.app.store.setSetting('adsRegulated', !!regulated); }
  regulated() { return !!this.app.store.get('settings').adsRegulated; }
  async openPrivacyOptions() {
    if (!this.provider) return;
    try { await this.provider.privacyOptions(); } catch { this.app.ui.toast(t('adNoFill'), { duration: 3000 }); }
  }
  /** "מחק את כל הנתונים שלי": גם ההסכמה של Google במכשיר */
  async resetConsent() { await this.provider?.reset?.(); }
}
