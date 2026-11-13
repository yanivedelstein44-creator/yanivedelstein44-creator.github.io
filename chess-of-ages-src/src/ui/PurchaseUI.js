/**
 * רכישות בכסף אמיתי — משותף לחנות (KingdomShopModal), למסך איי הפרימיום (Modals.openFullGame) ולהגדרות:
 *  1. הודעה "רכישה בכסף אמיתי" לפני חלון התשלום של Google ("המשך לרכישה" / "ביטול").
 *  2. כרטיס "הרכישה הושלמה" אחרי הצלחה: מה נקנה, מחיר, מספר הזמנה, פרטי המפתח וקישור לתנאי הביטול.
 *  3. רישום ב"הרכישות שלי" (נשמר במכשיר, במצב הכלכלה): רק רכישה חדשה שבוצעה כאן — שחזור רכישות לא נרשם.
 *  4. החלון "הרכישות שלי" בהגדרות.
 * מצב בדיקה (בלי חיוב) עובר באותה דרך: הקנייה מיידית, ובכרטיס וברשימה מופיע "מצב בדיקה — לא חויבת".
 */
import { h } from './UI.js';
import { t, tn, getLang, shortName, PET_EN } from './i18n.js';
import { FULL_GAME, GEM_BOOST, BOARD_SKINS, formatPrice } from '../config/EconomyConfig.js';
import { PaymentProvider } from '../core/Economy.js';
import { PETS, SKY_PET_IDS } from '../config/Pets.js';
import { SELLER } from '../config/AppConfig.js';
import { openLegalPage } from './LegalPages.js';

/** תווית מחיר לכסף אמיתי (מחנות האפליקציות כשמחוברת) */
export const realPrice = (product) => (typeof PaymentProvider.priceLabel === 'function' && PaymentProvider.priceLabel(product)) || (product?.price ? formatPrice(product.price) : null);

const isTest = (tx) => /^sandbox-/.test(String(tx || ''));
const ltr = (v) => h('bdi', { dir: 'ltr' }, v);

/**
 * מה נקנה, בשפה הנוכחית: { product, title, includes } לפי מזהה המוצר בחנות (או null למוצר לא מוכר).
 * משמש את הכרטיס, את הרישום ואת "הרכישות שלי" (שם מוצג בשפה שנבחרה עכשיו).
 */
export function productInfo(productId) {
  if (productId === FULL_GAME.id) return { product: FULL_GAME, title: t('fullTitle'), includes: `${t('rcIslandsIncl')} + ${tn(PETS.clockwork_dragon.name, PET_EN.clockwork_dragon)}` };
  if (productId === GEM_BOOST.id) return { product: GEM_BOOST, title: t('boostTitle'), includes: t('boostBody') };
  const sk = BOARD_SKINS.find((x) => x.product && x.product === productId);
  if (sk) return { product: { id: sk.product, price: sk.price }, title: tn(sk.he, sk.en), includes: t('rcSkinIncl') };
  const sky = SKY_PET_IDS.find((id) => PETS[id].product && PETS[id].product === productId);
  if (sky) return { product: { id: PETS[sky].product, price: PETS[sky].price }, title: shortName(sky), includes: t('rcSkyIncl') };
  return null;
}

/**
 * לפני כל רכישה בכסף אמיתי: "רכישה בכסף אמיתי. מתחת לגיל 18 — רק באישור הורה."
 * "המשך לרכישה" — ממשיכים לחלון התשלום של Google; "ביטול" (או סגירה) — לא קורה כלום.
 */
export const paidNotice = (ui) => new Promise((resolve) => {
  let done = false;
  const finish = (v) => { if (!done) { done = true; resolve(v); } };
  ui.modal({
    title: t('pnTitle'), titleIcon: 'info', center: true, className: 'paid-notice',
    body: h('p', { class: 'pn-text' }, t('pnBody')),
    actions: [
      { label: t('pnCancel'), onClick: (c) => { finish(false); c.close(); } },
      { label: t('pnContinue'), primary: true, onClick: (c) => { finish(true); c.close(); } },
    ],
    onClose: () => finish(false),
  });
});

/** פרטי המפתח, הכתובת ב-Google Play וקישור לתנאי הביטול — בכרטיס הרכישה ובתחתית "הרכישות שלי" */
function devFooter(app) {
  const row = (k, v) => (v ? h('div', { class: 'rc-row' }, h('span', {}, k), h('b', {}, ltr(v))) : null);
  return [
    row(t('rcDev'), SELLER.name),
    row(t('rcDevEmail'), SELLER.email),
    h('p', { class: 'rc-note' }, t('rcAddr1'), ' ', h('span', { class: 'nowrap' }, t('rcAddr2'))),
    h('button', { class: 'link-btn tap rc-terms', type: 'button', onclick: () => openLegalPage(app, 'terms', 'refunds') }, t('rcTerms')),
  ];
}

/**
 * כרטיס "הרכישה הושלמה" אחרי רכישה בכסף אמיתי: מה קנית ומה זה כולל, מחיר ומספר הזמנה (מגוגל),
 * פרטי המפתח וקישור לתנאי הביטול. שורה בלי ערך לא מוצגת. במצב בדיקה (בלי חיוב) — בלי מספר הזמנה ובלי "נשלחה קבלה".
 * מחזיר Promise שמתממש כשהכרטיס נסגר.
 */
export function purchaseCard(app, item, res) {
  const test = isTest(res?.tx);
  const row = (k, v) => (v ? h('div', { class: 'rc-row' }, h('span', {}, k), h('b', {}, ltr(v))) : null);
  const body = h('div', { class: 'rc' },
    h('div', { class: 'rc-item' }, h('b', {}, item?.title || t('purchased')), item?.includes ? h('span', {}, item.includes) : null),
    row(t('rcPrice'), item?.product ? realPrice(item.product) : null),
    row(t('rcOrder'), test ? null : res?.tx),
    h('p', { class: 'rc-note' }, test ? t('rcTest') : t('rcEmailed')),
    ...devFooter(app));
  return new Promise((resolve) => {
    app.ui.modal({ title: t('rcTitle'), titleIcon: 'check', center: true, className: 'receipt', body, actions: [{ label: t('close'), onClick: (c) => c.close() }], onClose: () => resolve() });
  });
}

/** רישום ב"הרכישות שלי" — רק אחרי רכישה חדשה שהצליחה כאן (עם מספר הזמנה; בבדיקה: מזהה הבדיקה) */
export function recordReceipt(economy, item, res) {
  if (!res?.tx || typeof economy?.addReceipt !== 'function') return false;
  return economy.addReceipt({
    id: item?.product?.id || null,
    title: item?.title || '',
    includes: item?.includes || '',
    price: (item?.product && realPrice(item.product)) || '',
    order: String(res.tx),
    at: Date.now(),
    test: isTest(res.tx),
  });
}

let inFlight = false;
/**
 * קנייה בכסף אמיתי — הדרך היחידה מהממשק: הודעה → חלון התשלום (או מצב בדיקה) → רישום + כרטיס.
 * item = { product, title, includes } (productInfo); fn = (confirmSandbox) => economy.purchaseX(…, confirmSandbox).
 * onDone(res) — אחרי הצלחה (לפני הכרטיס); afterCard() — אחרי שהכרטיס (או ההודעה הקצרה) נסגר;
 * onRestored(res) — החנות אמרה "כבר בבעלותך" והפריט הוחזר בלי חיוב (לא נרשם ב"הרכישות שלי").
 */
export async function realPurchase(app, item, fn, { onDone, afterCard, onRestored } = {}) {
  const { economy, ui, sound } = app;
  if (inFlight) return { ok: false, busy: true, silent: true }; // לחיצה כפולה בזמן שההודעה או חלון התשלום פתוחים
  inFlight = true;
  let res;
  try {
    if (!(await paidNotice(ui))) return { ok: false, cancelled: true };
    res = await fn(() => Promise.resolve(true));
  } catch (e) {
    console.warn('[purchase]', e?.message || e);
    res = { ok: false };
  } finally { inFlight = false; }
  if (res?.ok) {
    sound?.jackpot?.();
    if (res.tx) recordReceipt(economy, item, res);
    onDone?.(res);
    if (res.tx) await purchaseCard(app, item, res);
    else ui.toast(t('purchased'), { kind: 'gold', icon: 'check' });
    afterCard?.(res);
  }
  else if (res?.restored) { ui.toast(res.reason, { kind: 'good', icon: 'check' }); onRestored?.(res); }
  else if (res?.pending) ui.toast(res.reason, { icon: 'hourglass', duration: 4200 });
  else if (res?.busy) ui.toast(res.reason, { icon: 'hourglass' });
  else if (!res?.cancelled) ui.toast(res?.reason || tn('הרכישה לא הושלמה', 'The purchase was not completed'), { kind: 'bad' });
  return res;
}

/** תאריך ושעה בשפה הנוכחית */
function when(at) {
  const d = new Date(at);
  if (!Number.isFinite(d.getTime())) return '';
  try { return new Intl.DateTimeFormat(getLang() === 'he' ? 'he-IL' : 'en', { dateStyle: 'medium', timeStyle: 'short' }).format(d); }
  catch { return d.toLocaleString(); }
}

/**
 * הגדרות → "הרכישות שלי": הרכישות בכסף אמיתי שבוצעו במכשיר הזה (החדשה ראשונה) — תאריך, פריט, מחיר ומספר הזמנה,
 * ובתחתית פרטי המפתח וקישור לתנאי הביטול. "מחיקת כל הנתונים שלי" מוחקת גם את הרשימה.
 */
export function openMyPurchases(app) {
  const list = app.economy.receipts?.() || [];
  const item = (r) => {
    const info = r.id ? productInfo(r.id) : null; // שם הפריט בשפה הנוכחית (ואם המוצר כבר לא קיים — כפי שנרשם)
    const title = info?.title || r.title || t('purchased');
    const includes = info?.includes || r.includes || '';
    const iso = Number.isFinite(new Date(r.at).getTime()) ? new Date(r.at).toISOString() : null;
    return h('li', { class: 'mp-item' },
      h('div', { class: 'mp-head' }, h('b', { class: 'mp-name' }, title), r.price ? h('b', { class: 'mp-price' }, ltr(r.price)) : null),
      includes ? h('span', { class: 'mp-incl' }, includes) : null,
      h('div', { class: 'mp-meta' },
        h('time', { class: 'mp-date', datetime: iso }, when(r.at)),
        r.test ? h('span', { class: 'mp-test' }, t('rcTest'))
          : (r.order ? h('span', { class: 'mp-order' }, `${t('rcOrder')}: `, ltr(r.order)) : null)));
  };
  const body = h('div', { class: 'rc mp' },
    list.length ? h('ul', { class: 'mp-list', role: 'list' }, ...list.map(item)) : h('p', { class: 'mp-empty' }, t('mpEmpty')),
    h('div', { class: 'mp-foot' }, ...devFooter(app)));
  return app.ui.modal({ title: t('mpTitle'), titleIcon: 'coin', center: true, className: 'receipt my-purchases', body, actions: [{ label: t('close'), onClick: (c) => c.close() }] });
}
