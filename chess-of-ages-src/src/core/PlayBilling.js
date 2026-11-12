/**
 * Google Play Billing — רכישות בכסף אמיתי בגרסת Google Play בלבד.
 * הספרייה: @capgo/native-purchases (צד אנדרואיד: Play Billing Library 9). התוסף הנייטיב קיים רק בעטיפת Play
 * מגרסה 1002 ומעלה (android-wrapper/build-aab.sh). בעטיפה 1001 אין תוסף — הכול נשאר "בקרוב", בלי שגיאות.
 *
 * הזרימה (בלי שרת — הכול מול Google Play על המכשיר):
 *  1. בפתיחה: getProducts → מחירים מקומיים מהחנות (priceString). מוצר שלא הופעל בקונסול נשאר "בקרוב".
 *  2. קנייה: purchaseProduct בלי אישור אוטומטי. הפריט ניתן רק אחרי שהחנות החזירה PURCHASED (purchaseState "1"),
 *     ורק אחרי שהמצב נשמר — acknowledge (פריט קבוע) או consume (הבוסט השבועי, אפשר לקנות שוב).
 *     חובה לאשר תוך 3 ימים, אחרת Google מחזירה את הכסף — מה שלא אושר בגלל קריסה מושלם בשחזור הבא.
 *  3. שחזור (בפתיחה, בחזרה לאפליקציה, ובכפתור "שחזור רכישות"): getPurchases → הענקה של מה שחסר,
 *     אישור/צריכה של מה שלא הושלם, ורכישה ממתינה (מזומן/העברה) ניתנת רק כשהיא הושלמה.
 *  4. החזר כספי/ביטול: פריט קבוע שקיבלת מהחנות ונעלם מרשימת הרכישות בשתי בדיקות רצופות (לפחות שעה בין הראשונה
 *     להסרה) — מוסר. בזמן שחלון התשלום פתוח השחזור נדחה, כדי שאותה רכישה לא תינתן פעמיים.
 *     בוסט שכבר נצרך אי אפשר לזהות בלי שרת (Voided Purchases API) — מגבלה מתועדת.
 */
import { Capacitor } from '@capacitor/core';
import { isPlayBuild } from '../config/Store.js';
import { PaymentProvider } from './Economy.js';
import { FULL_GAME, GEM_BOOST, BOARD_SKINS } from '../config/EconomyConfig.js';
import { PETS, SKY_PET_IDS } from '../config/Pets.js';
import { t } from '../ui/i18n.js';

/** כל המוצרים בכסף אמיתי (מזהי Google Play) */
export const STORE_PRODUCT_IDS = [
  FULL_GAME.id,
  GEM_BOOST.id,
  ...BOARD_SKINS.filter((s) => s.product).map((s) => s.product),
  ...SKY_PET_IDS.filter((id) => PETS[id].product).map((id) => PETS[id].product),
];
/** מוצרים מתכלים (נצרכים אחרי ההענקה ואפשר לקנות שוב) */
export const CONSUMABLE_IDS = new Set([GEM_BOOST.id]);

const MISS_KEY = 'chess_ages_store_miss';
const state = { plugin: null, type: 'inapp', products: new Map(), busy: false, busySince: 0, seq: 0, ready: false, initializing: null, lastInit: 0, lastRestore: 0, economy: null, notify: null, listening: false };
/** רכישה שלא חזרה תשובה עליה (האפליקציה הושהתה / התוסף לא ענה) לא חוסמת לנצח — אחרי 4 דקות אפשר לנסות שוב */
const PURCHASE_WATCHDOG_MS = 4 * 60 * 1000;
/** פריט שהוחזר עליו כסף מוסר רק אם חסר ברשימת Google Play בשתי בדיקות, ולפחות שעה אחרי הפעם הראשונה */
const REVOKE_AFTER_MS = 60 * 60 * 1000;

function errCode(e) {
  if (e?.code) return String(e.code);
  return /pending/i.test(String(e?.message || e || '')) ? 'PENDING' : '';
}
// רק "1" = PURCHASED. בספריית Play Billing ‏PENDING הוא "2" (ו-0 = לא ידוע) — אף פעם לא מעניקים בלי אישור מפורש
const purchased = (p) => String(p?.purchaseState ?? '') === '1';
const tokenOf = (p) => p?.purchaseToken || p?.transactionId || '';
const orderOf = (p) => p?.orderId || tokenOf(p);
const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/**
 * התוסף לבדיקות: רק בדפדפן (לא באפליקציה), וכשהבדיקה הגדירה window.__coaBillingMock.
 * באפליקציה האמיתית תמיד התוסף הנייטיב — ואם אין כזה (עטיפה 1001), אין רכישות.
 */
function mockPlugin() {
  try { return !Capacitor.isNativePlatform?.() && typeof window !== 'undefined' ? window.__coaBillingMock || null : null; } catch { return null; }
}

export function billingAvailable() {
  if (!isPlayBuild()) return false;
  if (mockPlugin()) return true;
  try { return !!(Capacitor.isNativePlatform?.() && Capacitor.isPluginAvailable?.('NativePurchases')); } catch { return false; }
}

async function loadPlugin() {
  const mock = mockPlugin();
  if (mock) return { plugin: mock, type: 'inapp' };
  const mod = await import('@capgo/native-purchases');
  return { plugin: mod.NativePurchases, type: mod.PURCHASE_TYPE?.INAPP || 'inapp' };
}

/**
 * מפעיל את Google Play Billing. מחזיר true כשיש לפחות מוצר אחד פעיל בחנות.
 * בטוח לקרוא שוב (ensurePlayBilling): אם בפתיחה לא היה אינטרנט, או שהמוצרים עוד לא הופעלו בקונסול,
 * ננסה שוב כשחוזר החיבור / כשחוזרים לאפליקציה / כשפותחים את החנות (לכל היותר פעם ב-30 שניות).
 */
export async function initPlayBilling(economy, { notify } = {}) {
  if (economy) state.economy = economy;
  if (notify) state.notify = notify;
  if (state.ready || !billingAvailable() || !state.economy) return state.ready;
  if (state.initializing) return state.initializing;
  state.lastInit = Date.now();
  state.initializing = (async () => {
    try {
      const { plugin, type } = await loadPlugin();
      // אישור/צריכה רק אחרי שהפריט ניתן ונשמר (לא אוטומטית בתוך התוסף)
      await Promise.resolve(plugin.configure?.({ autoFinishTransactions: false })).catch(() => {});
      listen();
      if (offline()) return false;
      const sup = await plugin.isBillingSupported().catch(() => ({ isBillingSupported: false }));
      if (!sup?.isBillingSupported) return false;
      const { products } = await plugin.getProducts({ productIdentifiers: STORE_PRODUCT_IDS, productType: type });
      const found = new Map((products || []).filter((p) => p?.identifier && STORE_PRODUCT_IDS.includes(p.identifier)).map((p) => [p.identifier, p]));
      if (!found.size) return false; // המוצרים עוד לא הופעלו בקונסול → נשאר "בקרוב"
      state.plugin = plugin;
      state.type = type;
      state.products = found;
      PaymentProvider.priceLabel = (product) => state.products.get(product?.id)?.priceString || null;
      PaymentProvider.has = (product) => state.products.has(product?.id);
      PaymentProvider.nativePurchase = (product) => purchase(product);
      PaymentProvider.restore = () => restore({ manual: true });
      state.ready = true;
      if (mockPlugin()) window.__coaBillingDebug = { state, restore, ensurePlayBilling }; // בדיקות בדפדפן בלבד
      state.economy.emit({ type: 'store' }); // החנות פתוחה? מציירת מחדש עם המחירים
      announce(await restore({ silent: true }));
      return true;
    } catch (e) {
      console.warn('[billing] init failed:', e?.message || e);
      return false;
    } finally {
      state.initializing = null;
    }
  })();
  return state.initializing;
}

/** ניסיון חוזר (מנוהל): לא יותר מפעם ב-30 שניות, ורק כשעוד לא מוכן */
export function ensurePlayBilling() {
  if (state.ready || state.initializing || !billingAvailable() || !state.economy) return Promise.resolve(state.ready);
  if (Date.now() - state.lastInit < 30000) return Promise.resolve(false);
  return initPlayBilling();
}

const restoredText = (n) => (n === 1 ? t('restored1') : t('restoredN').replace('{n}', String(n)));
function announce(r) {
  if (r?.granted && state.notify) state.notify(restoredText(r.granted));
}

/** מאזינים פעם אחת: חזרה לאפליקציה / חזרת האינטרנט → ניסיון הפעלה חוזר או בדיקת רכישות ממתינות */
function listen() {
  if (state.listening || typeof document === 'undefined') return;
  state.listening = true;
  const wake = (force = false) => {
    if (!state.ready) { if (force) initPlayBilling(); else ensurePlayBilling(); return; }
    // רכישה ממתינה שהושלמה בזמן שהאפליקציה ברקע — נבדק כשחוזרים (לכל היותר פעם בדקה)
    if (Date.now() - state.lastRestore < 60000) return;
    restore({ silent: true }).then(announce);
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wake(); });
  if (typeof window !== 'undefined') window.addEventListener('online', () => wake(true)); // האינטרנט חזר — מיד
}

/** אישור (פריט קבוע) או צריכה (מתכלה) בחנות — אחרי שהפריט ניתן ונשמר */
async function finish(productId, token) {
  if (!token || !state.plugin) return;
  if (CONSUMABLE_IDS.has(productId)) await state.plugin.consumePurchase({ purchaseToken: token });
  else await state.plugin.acknowledgePurchase({ purchaseToken: token });
}

async function purchase(product) {
  const id = product?.id;
  if (state.busy && Date.now() - state.busySince < PURCHASE_WATCHDOG_MS) return { ok: false, busy: true, reason: t('payBusy') };
  if (!state.plugin || !state.products.has(id)) return { ok: false, reason: t('payUnavailable') };
  if (offline()) return { ok: false, reason: t('payOffline') };
  const mine = ++state.seq;
  state.busy = true;
  state.busySince = Date.now();
  try {
    const tx = await state.plugin.purchaseProduct({
      productIdentifier: id, productType: state.type, isConsumable: false, autoAcknowledgePurchases: false,
    });
    if (!tx || !purchased(tx)) return { ok: false, pending: true, reason: t('payPending') };
    const token = tokenOf(tx);
    return { ok: true, transactionId: orderOf(tx), finalize: () => finish(id, token) };
  } catch (e) {
    const code = errCode(e);
    if (code === 'USER_CANCELED') return { ok: false, cancelled: true };
    if (code === 'PENDING') return { ok: false, pending: true, reason: t('payPending') };
    if (code === 'ITEM_ALREADY_OWNED') {
      if (mine === state.seq) state.busy = false;
      const r = await restore({ silent: true });
      return { ok: false, restored: true, reason: r.ok ? t('alreadyOwnedRestored') : t('restoreFail') };
    }
    if (['NETWORK_ERROR', 'SERVICE_UNAVAILABLE', 'SERVICE_DISCONNECTED'].includes(code)) return { ok: false, reason: t('payOffline') };
    if (['BILLING_UNAVAILABLE', 'ITEM_UNAVAILABLE', 'FEATURE_NOT_SUPPORTED', 'DEVELOPER_ERROR'].includes(code)) return { ok: false, reason: t('payUnavailable') };
    return { ok: false, reason: t('payFailed') };
  } finally {
    // רק הרכישה האחרונה משחררת את הנעילה (רכישה ישנה שחזרה אחרי ה-watchdog לא משחררת רכישה חדשה)
    if (mine === state.seq) state.busy = false;
  }
}

function readMiss() { try { return JSON.parse(localStorage.getItem(MISS_KEY) || '{}') || {}; } catch { return {}; } }
function writeMiss(m) { try { localStorage.setItem(MISS_KEY, JSON.stringify(m)); } catch { /* אחסון חסום */ } }

/**
 * שחזור: מעניק מה שנקנה ועוד לא קיים במשחק, משלים אישור/צריכה, ומסיר פריט קבוע שהוחזר עליו כסף (2 בדיקות רצופות).
 * manual — מהכפתור: גם כשאין מה לשחזר מוצגת הודעה.
 */
export async function restore({ silent = false, manual = false } = {}) {
  const economy = state.economy;
  if (!state.plugin || !economy) return { ok: false, granted: 0, reason: t('restoreFail') };
  if (manual && offline()) return { ok: false, granted: 0, reason: t('payOffline') };
  // בזמן שחלון התשלום פתוח לא משחזרים: את הרכישה הזו מעניקה זרימת הקנייה עצמה (בלי הענקה כפולה)
  if (state.busy && Date.now() - state.busySince < PURCHASE_WATCHDOG_MS) {
    return manual ? { ok: false, granted: 0, reason: t('payBusy') } : { ok: true, granted: 0, deferred: true };
  }
  state.lastRestore = Date.now();
  let list;
  try {
    ({ purchases: list } = await state.plugin.getPurchases({ productType: state.type }));
  } catch (e) {
    if (!silent) console.warn('[billing] restore failed:', e?.message || e);
    return { ok: false, granted: 0, reason: t('restoreFail') };
  }
  let granted = 0;
  const owned = new Set();
  for (const p of list || []) {
    const id = p?.productIdentifier;
    if (!STORE_PRODUCT_IDS.includes(id) || !purchased(p)) continue; // ממתינה — תינתן כשתושלם
    const token = tokenOf(p);
    if (CONSUMABLE_IDS.has(id)) {
      // מתכלה שעוד ברשימה = לא נצרך: מעניקים פעם אחת לכל הזמנה, ואז צורכים
      if (economy.grantStoreProduct(id, orderOf(p))) granted++;
      await Promise.resolve(state.plugin.consumePurchase({ purchaseToken: token })).catch(() => {});
      continue;
    }
    owned.add(id);
    if (economy.grantStoreProduct(id, orderOf(p))) granted++;
    else economy.markStoreGranted(id, orderOf(p));
    if (!p.isAcknowledged) await Promise.resolve(state.plugin.acknowledgePurchase({ purchaseToken: token })).catch(() => {});
  }
  // החזר כספי / ביטול: פריט קבוע מהחנות שלא מופיע ברשימה בשתי בדיקות רצופות, ולפחות שעה אחרי הפעם
  // הראשונה, מוסר. (חשבון Google אחר ב-Play יראה רשימה אחרת — כשחוזרים לחשבון, השחזור מחזיר את הפריטים.)
  const miss = readMiss();
  const now = Date.now();
  for (const id of Object.keys(economy.s.storeGranted || {})) {
    if (CONSUMABLE_IDS.has(id) || owned.has(id)) { delete miss[id]; continue; }
    const m = typeof miss[id] === 'object' && miss[id] ? miss[id] : { n: 0, first: now };
    m.n += 1;
    miss[id] = m;
    if (m.n >= 2 && now - m.first >= REVOKE_AFTER_MS && economy.revokeStoreProduct(id)) delete miss[id];
  }
  writeMiss(miss);
  if (granted) economy.emit({ type: 'restored', granted });
  return { ok: true, granted, reason: granted ? restoredText(granted) : t('restoreNone') };
}

/** למצב בדיקה בלבד */
export const __billingState = state;
