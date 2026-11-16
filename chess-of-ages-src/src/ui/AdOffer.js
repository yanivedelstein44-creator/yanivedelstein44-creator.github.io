/**
 * החלונות של הפרסומות המתגמלות (הלוגיקה: core/RewardedAds.js):
 *  1. adOffer — לפני כל פרסומת: "פרסומת · צפה עד הסוף וקבל 20 יהלומים", "צפה בפרסומת" / "לא עכשיו".
 *  2. adChoice — פעם אחת, מחוץ לאזור האירופי: מה Google AdMob מקבלת, ובחירה בין פרסומות כלליות למותאמות אישית
 *     (שני כפתורים שווים, בלי ברירת מחדל מסומנת). סגירה = לא מציגים פרסומת.
 *  3. adLoading — "טוען פרסומת…" עד שהפרסומת מוכנה.
 *  4. adsSettings — הגדרות ← פרסומות: הסבר, ובחירה (או "אפשרויות פרטיות" של Google באירופה).
 *  5. בדיקות בדפדפן (‎?fakeads): פרסומת מדומה וטופס הסכמה מדומה.
 */
import gsap from 'gsap';
import { h, withIcon } from './UI.js';
import { icon } from './icons.js';
import { t } from './i18n.js';
import { segment } from './Modals.js';
import { openLegalPage } from './LegalPages.js';
import { ADS } from '../config/AdsConfig.js';

const fill = (s, vars) => Object.entries(vars).reduce((a, [k, v]) => a.split(`{${k}}`).join(String(v)), s);

/** "פרסומת" — גילוי ברור של הפעולה והפרס לפני כל פרסומת, ו"כן" מפורש. מתממש ל-true רק ב"צפה בפרסומת" */
export const adOffer = (app, { gems, minutes, cap, left }) => new Promise((resolve) => {
  let done = false;
  const finish = (v) => { if (!done) { done = true; resolve(v); } };
  const body = h('div', { class: 'ad-offer' },
    h('div', { class: 'ad-prize', 'aria-hidden': 'true' }, icon('video', { size: 40 }), h('b', {}, `+${gems}`), icon('gem', { size: 34 })),
    h('p', { class: 'ad-main' }, fill(t('adOfferMain'), { n: gems })),
    h('p', { class: 'ad-rule' }, t('adOfferRule')),
    h('p', { class: 'ad-limits' }, fill(t('adOfferLimits'), { m: minutes, cap, left })),
    h('p', { class: 'ad-by' }, t('adOfferBy'), ' ',
      h('button', { class: 'link-btn tap', type: 'button', onclick: () => openLegalPage(app, 'privacy', 'ads') }, t('adPrivacyLink'))));
  app.ui.modal({
    title: t('adTitle'), titleIcon: 'video', center: true, className: 'ad-offer-modal', body,
    actions: [
      { label: t('adNotNow'), onClick: (c) => { finish(false); c.close(); } },
      { label: t('adWatch'), icon: 'video', primary: true, onClick: (c) => { finish(true); c.close(); } },
    ],
    onClose: () => finish(false),
  });
});

/**
 * פעם אחת (מחוץ לאזור האירופי): מה עובר ל-Google AdMob ולמה, ובחירה — כלליות או מותאמות אישית.
 * מתממש ל-false (כלליות), true (מותאמות) או null (נסגר בלי בחירה).
 */
export const adChoice = (app) => new Promise((resolve) => {
  let done = false;
  const finish = (v) => { if (!done) { done = true; resolve(v); } };
  const body = h('div', { class: 'ad-choice' },
    h('p', {}, t('adChoiceBody')),
    h('p', {}, h('b', {}, t('adChoiceQ'))),
    h('p', { class: 'ad-by' }, t('adChoiceNote'), ' ',
      h('button', { class: 'link-btn tap', type: 'button', onclick: () => openLegalPage(app, 'privacy', 'ads') }, t('adPrivacyLink'))));
  app.ui.modal({
    title: t('adChoiceTitle'), titleIcon: 'lock', center: true, className: 'ad-choice-modal', body,
    // שני כפתורים באותו מראה בדיוק — בלי "כן" בולט ובלי בחירה מסומנת מראש
    actions: [
      { label: t('adChoiceNpa'), cls: 'ad-pick', onClick: (c) => { finish(false); c.close(); } },
      { label: t('adChoicePers'), cls: 'ad-pick', onClick: (c) => { finish(true); c.close(); } },
    ],
    onClose: () => finish(null),
  });
});

/** "טוען פרסומת…" — חלון קטן שאי אפשר לסגור (הפרסומת נטענת לכל היותר 25 שניות) */
export function adLoading(app) {
  let ctl = null;
  const api = {
    show() {
      if (ctl && !ctl.closed) return api;
      ctl = app.ui.modal({ center: true, dismissable: false, closeButton: false, className: 'ad-loading', label: t('adLoading'),
        body: h('div', { class: 'ad-load', role: 'status' }, h('i', { class: 'ad-spin', 'aria-hidden': 'true' }), h('span', {}, t('adLoading'))) });
      return api;
    },
    hide() { if (ctl && !ctl.closed) ctl.close(); ctl = null; return api; },
  };
  return api.show();
}

/** הגדרות ← פרסומות (רק בעותק שיש בו פרסומות). מחזיר מערך אלמנטים להכנסה לגוף ההגדרות */
export function adsSettings(app) {
  const ads = app.rewardAds;
  if (!ads?.available) return [];
  const els = [
    h('h3', {}, ...withIcon('video', t('adSettings'), 16)),
    h('p', { style: { textAlign: 'start' } }, fill(t('adSettingsText'), { n: ADS.rewardGems })),
  ];
  if (ads.regulated()) {
    // באזור האירופי: ההסכמה של Google (CMP מאושר) — "אפשרויות פרטיות" שלה, תמיד נגיש מכאן
    els.push(h('div', { class: 'btn-row' }, h('button', { class: 'btn small tap', onclick: () => ads.openPrivacyOptions() }, ...withIcon('lock', t('adPrivacyOptions'), 16))));
  } else {
    const seg = segment([['off', t('adChoiceNpa')], ['on', t('adChoicePers')]], ads.personalized() ? 'on' : 'off', (v) => ads.setPersonalized(v === 'on'));
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', t('adPersonal'));
    els.push(seg, h('p', { class: 'ad-set-note' }, t('adChoiceNote2')));
  }
  return els;
}

// ---------- בדיקות בדפדפן בלבד (‎?fakeads) ----------

/** פרסומת מדומה במסך מלא: ספירה לאחור, ואפשר לסגור בכל רגע. הפרס — רק כשהספירה מסתיימת */
export function fakeAdShow(app, { seconds = 5, onReward, onDismiss }) {
  let left = seconds, rewarded = false, timer = null;
  const count = h('b', { class: 'fa-count' }, String(left));
  const status = h('span', { class: 'fa-status' }, t('adFakeLeft'));
  const close = h('button', { class: 'fa-close tap', type: 'button', 'aria-label': t('close') }, icon('close', { size: 18 }));
  const el = h('div', { class: 'fake-ad', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('adFakeTitle') },
    close,
    h('div', { class: 'fa-card' }, h('small', {}, 'TEST AD'), h('h2', {}, t('adFakeTitle')), h('div', { class: 'fa-ring' }, count), status));
  const end = () => { clearInterval(timer); gsap.to(el, { opacity: 0, duration: 0.2, onComplete: () => el.remove() }); onDismiss?.(); };
  close.onclick = end;
  timer = setInterval(() => {
    left -= 1;
    count.textContent = String(Math.max(0, left));
    if (left <= 0 && !rewarded) { rewarded = true; clearInterval(timer); status.textContent = t('adFakeDone'); onReward?.(); }
  }, 1000);
  document.body.appendChild(el);
  gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2 });
  close.focus();
}

/** טופס ההסכמה המדומה (‎?fakeads=eea) — במקום הטופס של Google */
export const fakeConsentForm = (app) => new Promise((resolve) => {
  let done = false;
  const finish = (v) => { if (!done) { done = true; resolve(v); } };
  app.ui.modal({
    title: t('adFakeConsent'), titleIcon: 'lock', center: true, body: 'TCF / UMP (test)',
    actions: [
      { label: t('adNotNow'), onClick: (c) => { finish(false); c.close(); } },
      { label: 'OK', primary: true, onClick: (c) => { finish(true); c.close(); } },
    ],
    onClose: () => finish(false),
  });
});
