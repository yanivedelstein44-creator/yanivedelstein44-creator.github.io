/**
 * כלכלת היהלומים: יתרה, בעלות על פריטים וחיות, ניסיון החיות (גור → בוגר → אגדי), ניסיונות זמניים, שברי פריטים ומתנה יומית.
 * יהלומים מרוויחים רק במשחק. הרכישה היחידה בכסף אמיתי: פתיחת המשחק המלא (hook מוכן ל-Google Play Billing).
 */
import {
  ECONOMY, FULL_GAME, EXPANSION, GEM_BOOST, BOARD_SKINS, findSkin, ALL_WEARABLES, findWearable, DEFAULT_LOADOUT,
  DAILY_STREAK, ROYAL_CHEST, WHEEL_SEGMENTS, DUPLICATE_ITEM_GEMS, DUPLICATE_FRAGMENT_GEMS, PET_GROWTH,
} from '../config/EconomyConfig.js';
import { PETS, PREMIUM_PET_IDS, SKY_PET_IDS } from '../config/Pets.js';
import { ERAS } from '../config/Eras.js';
import { readJSON, writeJSON, readObject, repairShape, backupIfRepaired } from './Storage.js';
import { tn, ITEM_EN } from '../ui/i18n.js';
import { isPlayBuild } from '../config/Store.js';

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
  nativePurchase: null, // async (product) => ({ ok, transactionId })
  priceLabel: null, // (product) => מחיר מקומי מהחנות, למשל ProductDetails.formattedPrice ("$4.99")
};

export class Economy {
  constructor() {
    const fresh = {
      gems: ECONOMY.welcomeGems,
      items: ALL_WEARABLES.filter((w) => w.price === 0).map((w) => w.id),
      pets: ['wolf_cub'],
      residents: [],
      petColors: [],
      eras: [],
      fullGame: false, // 30 איי הפרימיום (השם נשמר מהגרסאות הקודמות)
      skins: [],
      boostUntil: 0,
      expansionGranted: false,
      equipped: { ...DEFAULT_LOADOUT, pet: 'wolf_cub', boardSkin: '' },
      trials: {},
      fragments: {},
      lastFreeSpin: 0,
      purchases: [],
      sandbox: ECONOMY.sandboxTestMode,
      welcomed: false,
      petXp: {}, // ניסיון לכל חיה (חיות שגדלות)
      petXpBase: 0, // ניסיון של חיה בלי רישום: שחקן חדש — גור
    };
    const saved = readObject(ECONOMY.storageKey); // [qa] corrupt / wrong-typed state → backed up, defaults used
    if (saved) backupIfRepaired(ECONOMY.storageKey, repairShape(saved, fresh));
    this.s = saved ? { ...fresh, ...saved, equipped: { ...fresh.equipped, ...(saved.equipped || {}) } } : fresh;
    // שחקן מלפני "חיות שגדלות": כל החיות שכבר יש לו נשארות בוגרות (לא מתכווצות פתאום)
    if (saved && saved.petXp == null) { this.s.petXp = {}; this.s.petXpBase = PET_GROWTH.adult; }
    this.login = readJSON(ECONOMY.lastLoginKey, { lastClaimDay: null, streak: 0 });
    this.listeners = new Set();
    this.expireTrials();
    // מי שרכש את "המשחק המלא" בגרסאות הבדיקה הקודמות מקבל את איי הפרימיום והדרקון
    if (this.s.fullGame && !this.s.expansionGranted) this.grantExpansionPerks();
    this.save();
  }

  // ---------- איי הפרימיום, בוסט וסקינים ----------
  grantExpansionPerks() {
    if (!this.s.pets.includes(EXPANSION.pet)) { this.s.pets = [...this.s.pets, EXPANSION.pet]; this.startPet(EXPANSION.pet, true); }
    this.s.expansionGranted = true;
  }
  boostLeftMs() { return Math.max(0, (this.s.boostUntil || 0) - Date.now()); }
  boostActive() { return this.boostLeftMs() > 0; }
  /** x2 יהלומים על ניצחונות נגד בוטים ופיראטים בזמן הבוסט */
  gemMultiplier() { return this.boostActive() ? GEM_BOOST.mult : 1; }

  /** קופה: מצב בדיקה (בלי חיוב) או Google Play Billing כשמחובר */
  async realPurchase(product, confirmSandbox) {
    if (this.sandbox) {
      const ok = await confirmSandbox(product);
      if (!ok) return { ok: false, cancelled: true };
      return { ok: true, tx: `sandbox-${Date.now()}` };
    }
    if (typeof PaymentProvider.nativePurchase === 'function') {
      const res = await PaymentProvider.nativePurchase(product);
      if (!res || !res.ok) return { ok: false, reason: tn('הרכישה לא הושלמה', 'The purchase was not completed') };
      return { ok: true, tx: res.transactionId };
    }
    return { ok: false, reason: tn('הרכישה תהיה זמינה בקרוב', 'Purchasing will be available soon') };
  }
  logPurchase(product, tx) {
    this.s.purchases.push({ id: product.id, price: product.price, tx, at: Date.now(), sandbox: this.sandbox });
  }

  /** בוסט x2 לשבוע — כל קנייה מוסיפה 7 ימים */
  async purchaseBoost(confirmSandbox) {
    const r = await this.realPurchase(GEM_BOOST, confirmSandbox);
    if (!r.ok) return r;
    this.s.boostUntil = Math.max(Date.now(), this.s.boostUntil || 0) + GEM_BOOST.days * 86400000;
    this.logPurchase(GEM_BOOST, r.tx);
    this.save();
    this.emit({ type: 'buy', id: GEM_BOOST.id });
    return { ok: true };
  }

  async purchaseSkin(id, confirmSandbox) {
    const sk = findSkin(id);
    if (!sk || !sk.product) return { ok: false, reason: tn('לא ניתן לקנייה', 'Not for sale') };
    if (this.ownsSkin(id)) return { ok: true, already: true };
    const product = { id: sk.product, price: sk.price };
    const r = await this.realPurchase(product, confirmSandbox);
    if (!r.ok) return r;
    this.s.skins = [...(this.s.skins || []), id];
    this.logPurchase(product, r.tx);
    this.save();
    this.emit({ type: 'buy', id: sk.product });
    return { ok: true };
  }
  ownsSkin(id) { return !id || (this.s.skins || []).includes(id); }
  /** סקינים חינמיים: אחד על כל 20 איים שנכבשים. מחזיר את מה שנפתח עכשיו (להודעה) */
  grantEarnedSkins(conqueredCount) {
    const fresh = BOARD_SKINS.filter((x) => x.earn && conqueredCount >= x.earn && !this.ownsSkin(x.id));
    if (!fresh.length) return [];
    this.s.skins = [...(this.s.skins || []), ...fresh.map((x) => x.id)];
    this.save();
    this.emit({ type: 'skins', ids: fresh.map((x) => x.id) });
    return fresh;
  }
  // ---------- קן השמיים: חיות מעופפות ----------
  /** חיות מעופפות חינמיות: אחת על כל 10 איים שנכבשים. מחזיר את מה שנפתח עכשיו (להודעה) */
  grantEarnedSkyPets(conqueredCount) {
    const fresh = SKY_PET_IDS.filter((id) => PETS[id].earn && conqueredCount >= PETS[id].earn && !this.s.pets.includes(id));
    if (!fresh.length) return [];
    this.s.pets = [...this.s.pets, ...fresh];
    fresh.forEach((id) => this.startPet(id));
    this.save();
    this.emit({ type: 'skyPets', ids: fresh });
    return fresh;
  }
  /** החיות המעופפות האגדיות — בכסף אמיתי */
  async purchaseSkyPet(id, confirmSandbox) {
    const p = PETS[id];
    if (!p || !p.sky || !p.product) return { ok: false, reason: tn('לא ניתן לקנייה', 'Not for sale') };
    if (this.s.pets.includes(id)) return { ok: true, already: true };
    const product = { id: p.product, price: p.price };
    const r = await this.realPurchase(product, confirmSandbox);
    if (!r.ok) return r;
    this.s.pets = [...this.s.pets, id];
    this.startPet(id, true);
    this.logPurchase(product, r.tx);
    this.save();
    this.emit({ type: 'buy', id: p.product });
    return { ok: true };
  }
  get boardSkin() { const id = this.s.equipped.boardSkin || ''; return this.ownsSkin(id) ? id : ''; }
  equipSkin(id) {
    if (!BOARD_SKINS.some((x) => x.id === id) || !this.ownsSkin(id)) return false;
    this.s.equipped.boardSkin = id;
    this.save();
    this.emit({ type: 'equip', slot: 'board', id });
    return true;
  }

  // ---------- בסיס ----------
  save() {
    writeJSON(ECONOMY.storageKey, this.s);
    writeJSON(ECONOMY.lastLoginKey, this.login);
  }
  emit(evt) { this.listeners.forEach((fn) => fn(evt, this)); }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  get gems() { return this.s.gems; }
  /** קופה מדומה (בלי חיוב). בגרסת Google Play אין קופה מדומה — רק Google Play Billing */
  get sandbox() { return !!this.s.sandbox && !isPlayBuild(); }
  setSandbox(v) { this.s.sandbox = !!v; this.save(); this.emit({ type: 'sandbox' }); }
  /** אפשר לקנות בכסף אמיתי עכשיו: קופה מדומה, או ספק תשלום מחובר (Google Play Billing) */
  canBuyReal() { return this.sandbox || typeof PaymentProvider.nativePurchase === 'function'; }

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
  /** אין יותר עידנים בתשלום — כל אזור נפתח בכיבוש האיים שלפניו */
  ownsEra() { return true; }
  /** איי הפרימיום 100–129 */
  ownsFullGame() { return !!this.s.fullGame; }

  get loadout() {
    const e = this.s.equipped;
    return { head: e.head, armor: e.armor, weapon: e.weapon, aura: e.aura };
  }
  get pet() { return this.s.equipped.pet; }
  /** גוון החיה (0 = הצבע המקורי; אחר = הצבע הייחודי של חיית בוט) */
  get petHue() { return this.s.equipped.petHue || 0; }

  // ---------- בוטים וחיות מכל העידנים (נפתחים אחרי כיבוש האי) ----------
  ownsResident(id) { return (this.s.residents || []).includes(id); }
  buyResident(id, price) {
    if (this.ownsResident(id)) return { ok: false, reason: tn('כבר גר אצלך', 'Already a resident') };
    if (!this.spend(price)) return { ok: false, reason: tn('אין מספיק יהלומים', 'Not enough gems'), needGems: price - this.s.gems };
    this.s.residents = [...(this.s.residents || []), id];
    this.save();
    this.emit({ type: 'buy', id: `bot${id}` });
    return { ok: true };
  }
  /** צבע ייחודי של חיה (מפתח "petId:hue") — כולל את החיה עצמה */
  petColorKey(petId, hue) { return `${petId}:${Math.round(hue * 100) / 100}`; }
  ownsPetColor(petId, hue) { return (this.s.petColors || []).includes(this.petColorKey(petId, hue)); }
  buyPetColor(petId, hue, price) {
    const key = this.petColorKey(petId, hue);
    if ((this.s.petColors || []).includes(key)) return { ok: false, reason: tn('כבר בבעלותך', 'Already owned') };
    if (!this.spend(price)) return { ok: false, reason: tn('אין מספיק יהלומים', 'Not enough gems'), needGems: price - this.s.gems };
    this.s.petColors = [...(this.s.petColors || []), key];
    this.save();
    this.emit({ type: 'buy', id: key });
    return { ok: true };
  }
  equipPetColor(petId, hue) {
    if (!this.ownsPetColor(petId, hue)) return false;
    this.s.equipped.pet = petId;
    this.s.equipped.petHue = Math.round(hue * 100) / 100;
    this.save();
    this.emit({ type: 'equip', slot: 'pet', id: petId });
    return true;
  }

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
    this.s.equipped.petHue = 0;
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
    if (!p || !p.premium || p.exclusive || p.sky) return { ok: false, reason: tn('לא ניתן לקנייה', 'Not for sale') };
    if (this.s.pets.includes(id)) return { ok: false, reason: tn('כבר בבעלותך', 'Already owned') };
    if (!this.spend(p.price)) return { ok: false, reason: tn('אין מספיק יהלומים', 'Not enough gems'), needGems: p.price - this.s.gems };
    this.s.pets.push(id);
    this.startPet(id);
    delete this.s.trials[id];
    this.save();
    this.emit({ type: 'buy', id });
    return { ok: true };
  }

  // ---------- חיות שגדלות: גור → בוגר → אגדי ----------
  petXp(id) { return this.s.petXp?.[id] ?? this.s.petXpBase ?? 0; }
  /** 1 = גור, 2 = בוגר, 3 = אגדי */
  petStage(id) { const x = this.petXp(id); return x >= PET_GROWTH.legend ? 3 : x >= PET_GROWTH.adult ? 2 : 1; }
  /** התקדמות בתוך השלב: { stage, have, need } (באגדי — need = 0) */
  petProgress(id) {
    const x = this.petXp(id), st = this.petStage(id);
    if (st === 3) return { stage: 3, have: x, need: 0, pct: 1 };
    const lo = st === 2 ? PET_GROWTH.adult : 0, hi = st === 2 ? PET_GROWTH.legend : PET_GROWTH.adult;
    return { stage: st, have: x, need: hi, pct: (x - lo) / (hi - lo) };
  }
  /** חיה חדשה מתחילה כגור (חיות בכסף אמיתי מגיעות בוגרות) */
  startPet(id, adult = false) {
    if (this.s.petXp?.[id] == null) this.s.petXp = { ...this.s.petXp, [id]: adult ? PET_GROWTH.adult : 0 };
  }
  /** ניסיון לחיה אחרי קרב; מחזיר מה השתנה (לסיכום ולחגיגת ההתפתחות) */
  addPetXp(id, n) {
    if (!id || !PETS[id] || !(n > 0)) return null;
    const before = this.petXp(id), stageBefore = this.petStage(id);
    this.s.petXp = { ...this.s.petXp, [id]: before + n };
    const stageAfter = this.petStage(id);
    this.save();
    this.emit({ type: 'petXp', id, stage: stageAfter, evolved: stageAfter > stageBefore });
    return { id, gained: n, before, after: before + n, stageBefore, stageAfter };
  }

  // ---------- רכישה בכסף אמיתי: המשחק המלא ----------
  /**
   * @param {(product)=>Promise<boolean>} confirmSandbox — מציג קופה מדומה ומחזיר אישור
   */
  async purchaseFullGame(confirmSandbox) {
    if (this.s.fullGame) return { ok: true, already: true };
    const r = await this.realPurchase(FULL_GAME, confirmSandbox);
    if (!r.ok) return r;
    this.s.fullGame = true;
    this.grantExpansionPerks();
    this.logPurchase(FULL_GAME, r.tx);
    this.save();
    this.emit({ type: 'buy', id: FULL_GAME.id });
    return { ok: true };
  }

  /** hook כללי: רכישה לפי מזהה (משחק מלא / בוסט / סקין / חיה מעופפת / פריט / חיה) */
  async purchaseItem(itemId, confirmSandbox) {
    if (itemId === FULL_GAME.id) return this.purchaseFullGame(confirmSandbox);
    if (itemId === GEM_BOOST.id) return this.purchaseBoost(confirmSandbox);
    const sk = BOARD_SKINS.find((x) => x.product === itemId);
    if (sk) return this.purchaseSkin(sk.id, confirmSandbox);
    const sky = SKY_PET_IDS.find((id) => PETS[id].product === itemId);
    if (sky) return this.purchaseSkyPet(sky, confirmSandbox);
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
        return { text: `‎+${seg.amount}`, icon: 'gem', jackpot: !!seg.jackpot };
      case 'item': {
        const r = this.grantItem(seg.item);
        const w = findWearable(seg.item);
        const nm = tn(w.name, ITEM_EN[w.id]);
        return r.duplicate ? { text: tn(`כבר יש לך ${nm} — קיבלת ${r.gems}`, `You already own ${nm} — got ${r.gems}`), icon: 'gem' } : { text: tn(`נפתח: ${nm}!`, `Unlocked: ${nm}!`), icon: 'gift', jackpot: true, itemId: seg.item };
      }
      case 'fragment': {
        const pool = ALL_WEARABLES.filter((w) => w.price > 0 && !this.ownsItemPermanently(w.id));
        if (!pool.length) { this.addGems(DUPLICATE_FRAGMENT_GEMS * 3, 'wheel'); return { text: `‎+${DUPLICATE_FRAGMENT_GEMS * 3}`, icon: 'gem' }; }
        const w = pool[Math.floor(Math.random() * pool.length)];
        const r = this.addFragment(w.id);
        const nm = tn(w.name, ITEM_EN[w.id]);
        return r.unlocked ? { text: tn(`השלמת ${ECONOMY.fragmentsToUnlock} שברים — ${nm} נפתח!`, `${ECONOMY.fragmentsToUnlock} shards collected — ${nm} unlocked!`), icon: 'puzzle', jackpot: true, itemId: w.id }
          : { icon: 'puzzle', text: tn(`שבר של ${nm} (${r.count}/${ECONOMY.fragmentsToUnlock})`, `${nm} shard (${r.count}/${ECONOMY.fragmentsToUnlock})`) };
      }
      case 'era': {
        const missing = ERAS.filter((e) => e.premium && !this.s.eras.includes(e.id));
        if (!missing.length) { this.addGems(1000, 'wheel'); return { text: '‎+1,000', icon: 'gem', jackpot: true }; }
        const e = missing[0];
        this.s.eras.push(e.id);
        this.s.eras.sort((a, b) => a - b);
        this.save();
        this.emit({ type: 'buy', id: `era_${e.id}` });
        return { text: tn(`ג׳קפוט! נפתח האי "${e.name}"`, `Jackpot! Island unlocked: "${e.en}"`), icon: 'temple', jackpot: true, eraId: e.id };
      }
      default:
        return { text: '' };
    }
  }

  hasDailyBadge() { return this.dailyStatus().ready; }
}
