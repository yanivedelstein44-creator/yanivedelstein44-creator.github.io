/**
 * כלכלת היהלומים: יתרה, בעלות על פריטים/חיות/עידנים, ניסיונות זמניים, שברי פריטים,
 * פרס כניסה יומי, גלגל המזל ורכישת חבילות יהלומים (hook מוכן ל-IAP אמיתי).
 */
import {
  ECONOMY, GEM_PACKS, ERA_PRICES, ALL_WEARABLES, findWearable, DEFAULT_LOADOUT,
  DAILY_STREAK, ROYAL_CHEST, WHEEL_SEGMENTS, DUPLICATE_ITEM_GEMS, DUPLICATE_FRAGMENT_GEMS,
} from '../config/EconomyConfig.js';
import { PETS, PREMIUM_PET_IDS } from '../config/Pets.js';
import { ERAS } from '../config/Eras.js';
import { readJSON, writeJSON } from './Storage.js';
import { tn, ITEM_EN } from '../ui/i18n.js';

const DAY = 24 * 3600 * 1000;
const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayDiff = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / DAY);

function weightedPick(list) {
  const total = list.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const x of list) { r -= x.weight; if (r <= 0) return x; }
  return list[list.length - 1];
}

/**
 * ספק תשלום — כאן מחברים Google Play Billing / RevenueCat.
 * צריך להחזיר Promise שמתממש ב-{ ok:true, transactionId } או נדחה בשגיאה.
 * כל עוד אין ספק מחובר (ו-sandbox כבוי) — רכישה בכסף אמיתי לא תאושר.
 */
export const PaymentProvider = {
  nativePurchase: null, // async (pack) => ({ ok, transactionId })
  priceLabel: null, // (pack) => מחיר מקומי מהחנות, למשל ProductDetails.formattedPrice ("$2.49")
};

export class Economy {
  constructor() {
    const fresh = {
      gems: ECONOMY.welcomeGems,
      items: ALL_WEARABLES.filter((w) => w.price === 0).map((w) => w.id),
      pets: ['wolf_cub'],
      eras: [],
      equipped: { ...DEFAULT_LOADOUT, pet: 'wolf_cub' },
      trials: {},
      fragments: {},
      lastFreeSpin: 0,
      purchases: [],
      sandbox: ECONOMY.sandboxTestMode,
      welcomed: false,
    };
    const saved = readJSON(ECONOMY.storageKey, null);
    this.s = saved ? { ...fresh, ...saved, equipped: { ...fresh.equipped, ...(saved.equipped || {}) } } : fresh;
    this.login = readJSON(ECONOMY.lastLoginKey, { lastClaimDay: null, streak: 0 });
    this.listeners = new Set();
    this.expireTrials();
    this.save();
  }

  // ---------- בסיס ----------
  save() {
    writeJSON(ECONOMY.storageKey, this.s);
    writeJSON(ECONOMY.lastLoginKey, this.login);
  }
  emit(evt) { this.listeners.forEach((fn) => fn(evt, this)); }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  get gems() { return this.s.gems; }
  get sandbox() { return !!this.s.sandbox; }
  setSandbox(v) { this.s.sandbox = !!v; this.save(); this.emit({ type: 'sandbox' }); }

  addGems(n, reason = '') {
    this.s.gems = Math.max(0, Math.round(this.s.gems + n));
    this.save();
    this.emit({ type: 'gems', delta: n, reason });
  }

  spend(n) {
    if (this.s.gems < n) return false;
    this.s.gems -= n;
    this.save();
    this.emit({ type: 'gems', delta: -n });
    return true;
  }

  // ---------- בעלות ----------
  expireTrials() {
    const now = Date.now();
    let changed = false;
    for (const [id, exp] of Object.entries(this.s.trials)) {
      if (exp <= now) { delete this.s.trials[id]; changed = true; }
    }
    if (changed) {
      // אם פריט ניסיון שפג היה מולבש — חוזרים לברירת המחדל
      const eq = this.s.equipped;
      for (const slot of ['head', 'armor', 'weapon', 'aura']) {
        if (!this.ownsItem(eq[slot])) eq[slot] = DEFAULT_LOADOUT[slot];
      }
      if (!this.ownsPet(eq.pet)) eq.pet = 'wolf_cub';
      this.save();
      this.emit({ type: 'trial-expired' });
    }
  }
  trialLeft(id) { const exp = this.s.trials[id]; return exp && exp > Date.now() ? exp - Date.now() : 0; }
  ownsItem(id) { return this.s.items.includes(id) || this.trialLeft(id) > 0; }
  ownsItemPermanently(id) { return this.s.items.includes(id); }

  /** חיה בסיסית נפתחת לפי העידן הגבוה שהושג; בלעדית — רק ברכישה/ניסיון */
  ownsPet(id, maxEraReached = 1) {
    const p = PETS[id];
    if (!p) return false;
    if (!p.premium && maxEraReached >= p.unlockEra) return true;
    return this.s.pets.includes(id) || this.trialLeft(id) > 0;
  }
  ownsEra(eraId) { const e = ERAS[eraId - 1]; return e && (!e.premium || this.s.eras.includes(eraId)); }
  get ownedPremiumEras() { return this.s.eras.slice(); }

  get loadout() {
    const e = this.s.equipped;
    return { head: e.head, armor: e.armor, weapon: e.weapon, aura: e.aura };
  }
  get pet() { return this.s.equipped.pet; }

  equipItem(id) {
    const w = findWearable(id);
    if (!w || !this.ownsItem(id)) return false;
    this.s.equipped[w.slot] = id;
    this.save();
    this.emit({ type: 'equip', slot: w.slot, id });
    return true;
  }
  equipPet(id, maxEra) {
    if (!this.ownsPet(id, maxEra)) return false;
    this.s.equipped.pet = id;
    this.save();
    this.emit({ type: 'equip', slot: 'pet', id });
    return true;
  }

  // ---------- קנייה ביהלומים ----------
  buyItem(id) {
    const w = findWearable(id);
    if (!w) return { ok: false, reason: tn('פריט לא קיים', 'Item not found') };
    if (this.ownsItemPermanently(id)) return { ok: false, reason: tn('כבר בבעלותך', 'Already owned') };
    if (!this.spend(w.price)) return { ok: false, reason: tn('אין מספיק יהלומים', 'Not enough gems'), needGems: w.price - this.s.gems };
    this.s.items.push(id);
    delete this.s.trials[id];
    this.save();
    this.emit({ type: 'buy', id });
    return { ok: true };
  }

  buyPet(id) {
    const p = PETS[id];
    if (!p || !p.premium) return { ok: false, reason: tn('לא ניתן לקנייה', 'Not for sale') };
    if (this.s.pets.includes(id)) return { ok: false, reason: tn('כבר בבעלותך', 'Already owned') };
    if (!this.spend(p.price)) return { ok: false, reason: tn('אין מספיק יהלומים', 'Not enough gems'), needGems: p.price - this.s.gems };
    this.s.pets.push(id);
    delete this.s.trials[id];
    this.save();
    this.emit({ type: 'buy', id });
    return { ok: true };
  }

  buyEra(eraId) {
    const e = ERAS[eraId - 1];
    if (!e || !e.premium) return { ok: false, reason: tn('עידן לא זמין', 'Era not available') };
    if (this.s.eras.includes(eraId)) return { ok: false, reason: tn('כבר בבעלותך', 'Already owned') };
    if (!this.spend(ERA_PRICES.single)) return { ok: false, reason: tn('אין מספיק יהלומים', 'Not enough gems'), needGems: ERA_PRICES.single - this.s.gems };
    this.s.eras.push(eraId);
    this.s.eras.sort((a, b) => a - b);
    this.save();
    this.emit({ type: 'buy', id: `era_${eraId}` });
    return { ok: true };
  }

  buyEraBundle() {
    const missing = ERAS.filter((e) => e.premium && !this.s.eras.includes(e.id));
    if (!missing.length) return { ok: false, reason: tn('כל העידנים כבר בבעלותך', 'You already own every era') };
    if (!this.spend(ERA_PRICES.bundle)) return { ok: false, reason: tn('אין מספיק יהלומים', 'Not enough gems'), needGems: ERA_PRICES.bundle - this.s.gems };
    missing.forEach((e) => this.s.eras.push(e.id));
    this.s.eras.sort((a, b) => a - b);
    this.save();
    this.emit({ type: 'buy', id: 'era_bundle' });
    return { ok: true };
  }

  // ---------- רכישת יהלומים בכסף אמיתי ----------
  /**
   * @param {string} packId
   * @param {(pack)=>Promise<boolean>} confirmSandbox — מציג קופה מדומה ומחזיר אישור
   */
  async purchaseGemPack(packId, confirmSandbox) {
    const pack = GEM_PACKS.find((p) => p.id === packId);
    if (!pack) throw new Error('Unknown gem pack');
    let tx = null;
    if (this.sandbox) {
      const ok = await confirmSandbox(pack);
      if (!ok) return { ok: false, cancelled: true };
      tx = `sandbox-${Date.now()}`;
    } else if (typeof PaymentProvider.nativePurchase === 'function') {
      const res = await PaymentProvider.nativePurchase(pack);
      if (!res || !res.ok) return { ok: false, reason: tn('הרכישה לא הושלמה', 'The purchase was not completed') };
      tx = res.transactionId;
    } else {
      return { ok: false, reason: tn('רכישות בכסף אמיתי יהיו זמינות בקרוב', 'Real-money purchases are coming soon') };
    }
    this.s.purchases.push({ id: pack.id, gems: pack.gems, price: pack.price, tx, at: Date.now(), sandbox: this.sandbox });
    this.addGems(pack.gems, pack.id);
    return { ok: true, gems: pack.gems };
  }

  /** hook כללי: רכישה לפי מזהה (חבילה / פריט / חיה / עידן) */
  async purchaseItem(itemId, confirmSandbox) {
    if (itemId.startsWith('pack_')) return this.purchaseGemPack(itemId, confirmSandbox);
    if (itemId === 'era_bundle') return this.buyEraBundle();
    if (itemId.startsWith('era_')) return this.buyEra(parseInt(itemId.slice(4), 10));
    if (PETS[itemId]) return this.buyPet(itemId);
    return this.buyItem(itemId);
  }

  // ---------- ניסיונות ושברים ----------
  grantTrial(id, hours = ECONOMY.trialHours) {
    this.s.trials[id] = Date.now() + hours * 3600 * 1000;
    this.save();
    this.emit({ type: 'trial', id });
  }

  grantItem(id) {
    if (this.ownsItemPermanently(id)) { this.addGems(DUPLICATE_ITEM_GEMS, 'duplicate'); return { duplicate: true, gems: DUPLICATE_ITEM_GEMS }; }
    this.s.items.push(id);
    delete this.s.trials[id];
    this.save();
    this.emit({ type: 'grant', id });
    return { duplicate: false };
  }

  addFragment(id) {
    if (this.ownsItemPermanently(id)) { this.addGems(DUPLICATE_FRAGMENT_GEMS, 'fragment-dup'); return { duplicate: true, gems: DUPLICATE_FRAGMENT_GEMS, id }; }
    const n = (this.s.fragments[id] || 0) + 1;
    if (n >= ECONOMY.fragmentsToUnlock) {
      delete this.s.fragments[id];
      this.grantItem(id);
      return { unlocked: true, id, count: ECONOMY.fragmentsToUnlock };
    }
    this.s.fragments[id] = n;
    this.save();
    this.emit({ type: 'fragment', id });
    return { unlocked: false, id, count: n };
  }

  // ---------- פרס יומי ----------
  dailyStatus() {
    const today = todayKey();
    const { lastClaimDay, streak } = this.login;
    if (lastClaimDay === today) return { ready: false, day: streak, nextDay: (streak % 7) + 1 };
    const continues = lastClaimDay && dayDiff(lastClaimDay, today) === 1;
    const day = continues ? (streak % 7) + 1 : 1;
    return { ready: true, day, broken: !!lastClaimDay && !continues };
  }

  claimDaily() {
    const st = this.dailyStatus();
    if (!st.ready) return null;
    const def = DAILY_STREAK[st.day - 1];
    const result = { day: st.day, gems: 0, rewards: [] };
    if (def.gems) { this.addGems(def.gems, 'daily'); result.gems = def.gems; result.rewards.push({ type: 'gems', amount: def.gems }); }
    if (def.trial === 'cosmetic') {
      const pool = ALL_WEARABLES.filter((w) => w.price > 0 && !this.ownsItem(w.id));
      if (pool.length) {
        const w = pool[Math.floor(Math.random() * pool.length)];
        this.grantTrial(w.id);
        result.rewards.push({ type: 'trial', id: w.id, name: w.name });
      }
    }
    if (def.chest) result.rewards.push(this.openRoyalChest());
    this.login = { lastClaimDay: todayKey(), streak: st.day };
    this.save();
    this.emit({ type: 'daily', result });
    return result;
  }

  openRoyalChest() {
    const pick = weightedPick(ROYAL_CHEST);
    if (pick.type === 'wearable') {
      const pool = ALL_WEARABLES.filter((w) => (w.rarity === 'epic' || w.rarity === 'legendary' || w.rarity === 'rare') && !this.ownsItemPermanently(w.id));
      if (pool.length) {
        const w = pool[Math.floor(Math.random() * pool.length)];
        this.grantItem(w.id);
        return { type: 'item', id: w.id, name: w.name };
      }
    }
    if (pick.type === 'petTrial') {
      const pool = PREMIUM_PET_IDS.filter((id) => !this.s.pets.includes(id));
      if (pool.length) {
        const id = pool[Math.floor(Math.random() * pool.length)];
        this.grantTrial(id);
        return { type: 'petTrial', id, name: PETS[id].name };
      }
    }
    this.addGems(600, 'chest');
    return { type: 'gems', amount: 600 };
  }

  // ---------- גלגל המזל ----------
  freeSpinReadyIn() { return Math.max(0, this.s.lastFreeSpin + DAY - Date.now()); }
  canFreeSpin() { return this.freeSpinReadyIn() === 0; }

  /** בוחר תוצאה (לפני האנימציה) ומחייב/מסמן סיבוב. מחזיר {index, segment} או null */
  spinWheel() {
    if (this.canFreeSpin()) {
      this.s.lastFreeSpin = Date.now();
    } else if (!this.spend(ECONOMY.extraSpinCost)) {
      return null;
    }
    const seg = weightedPick(WHEEL_SEGMENTS);
    this.save();
    return { index: WHEEL_SEGMENTS.indexOf(seg), segment: seg };
  }

  /** מעניק את הפרס אחרי שהגלגל נעצר */
  applyWheelPrize(seg) {
    switch (seg.type) {
      case 'gems':
        this.addGems(seg.amount, 'wheel');
        return { text: `‎+${seg.amount} 💎`, jackpot: !!seg.jackpot };
      case 'item': {
        const r = this.grantItem(seg.item);
        const w = findWearable(seg.item);
        const nm = tn(w.name, ITEM_EN[w.id]);
        return r.duplicate ? { text: tn(`כבר יש לך ${nm} — קיבלת ${r.gems} 💎`, `You already own ${nm} — got ${r.gems} 💎`) } : { text: tn(`נפתח: ${nm}!`, `Unlocked: ${nm}!`), jackpot: true, itemId: seg.item };
      }
      case 'fragment': {
        const pool = ALL_WEARABLES.filter((w) => w.price > 0 && !this.ownsItemPermanently(w.id));
        if (!pool.length) { this.addGems(DUPLICATE_FRAGMENT_GEMS * 3, 'wheel'); return { text: `‎+${DUPLICATE_FRAGMENT_GEMS * 3} 💎` }; }
        const w = pool[Math.floor(Math.random() * pool.length)];
        const r = this.addFragment(w.id);
        const nm = tn(w.name, ITEM_EN[w.id]);
        return r.unlocked ? { text: tn(`השלמת ${ECONOMY.fragmentsToUnlock} שברים — ${nm} נפתח!`, `${ECONOMY.fragmentsToUnlock} shards collected — ${nm} unlocked!`), jackpot: true, itemId: w.id }
          : { text: tn(`שבר של ${nm} (${r.count}/${ECONOMY.fragmentsToUnlock})`, `${nm} shard (${r.count}/${ECONOMY.fragmentsToUnlock})`) };
      }
      case 'era': {
        const missing = ERAS.filter((e) => e.premium && !this.s.eras.includes(e.id));
        if (!missing.length) { this.addGems(1000, 'wheel'); return { text: '‎+1,000 💎', jackpot: true }; }
        const e = missing[0];
        this.s.eras.push(e.id);
        this.s.eras.sort((a, b) => a - b);
        this.save();
        this.emit({ type: 'buy', id: `era_${e.id}` });
        return { text: tn(`ג׳קפוט! נפתח העידן "${e.name}"`, `Jackpot! Era unlocked: "${e.en}"`), jackpot: true, eraId: e.id };
      }
      default:
        return { text: '' };
    }
  }

  hasDailyBadge() { return this.dailyStatus().ready || this.canFreeSpin(); }
}
