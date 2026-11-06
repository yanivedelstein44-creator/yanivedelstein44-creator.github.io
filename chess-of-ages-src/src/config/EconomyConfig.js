/**
 * כלכלת היהלומים 💎 — מקור האמת היחיד למחירים, חבילות, פריטים, פרסים יומיים וגלגל המזל.
 * שינוי מחיר כאן משתקף מיד בכל החנות.
 *
 * רכישות בכסף אמיתי (חבילות יהלומים) עוברות דרך Economy.purchaseGemPack() —
 * hook אסינכרוני שמוכן לחיבור Google Play Billing / RevenueCat (ראה README).
 */
export const ECONOMY = {
  currencySymbol: '₪', // אפשר גם '$'
  currencyPosition: 'before', // '₪7.90'
  sandboxTestMode: true, // קופה מדומה בלחיצה אחת — בלי חיוב כסף
  storageKey: 'chess_ages_economy',
  lastLoginKey: 'chess_ages_last_login',
  welcomeGems: 150,
  winGems: 25,
  fastMateGems: 40,
  fastMateMaxMoves: 25, // מט בפחות מ-25 מהלכים של השחקן
  stageGems: 50,
  extraSpinCost: 50,
  devFreeGems: 500,
  trialHours: 24,
  fragmentsToUnlock: 3,
};

export const GEM_PACKS = [
  { id: 'pack_handful', name: 'חופן יהלומים', nameEn: 'Handful of Gems', gems: 250, price: 7.9 },
  { id: 'pack_chest', name: 'תיבת יהלומים', nameEn: 'Gem Chest', gems: 750, price: 19.9 },
  { id: 'pack_treasury', name: 'אוצר הממלכה', nameEn: 'Kingdom Treasury', gems: 2000, price: 44.9 },
  { id: 'pack_emperor', name: 'כספת הקיסר', nameEn: "Emperor's Vault", gems: 5500, price: 99.9 },
];

/**
 * תגיות חבילות מחושבות מהנתונים עצמם (לא טקסט קבוע) כדי שלא יהיו מטעות:
 * בונוס = כמה יותר יהלומים לכל שקל לעומת החבילה הקטנה; "הכי משתלם" = היחס הטוב ביותר בפועל.
 */
export function packBadges(packs = GEM_PACKS) {
  const rate = (p) => p.gems / p.price;
  const base = rate(packs[0]);
  const best = packs.reduce((a, b) => (rate(b) > rate(a) ? b : a));
  return Object.fromEntries(packs.map((p) => [p.id, { bonusPct: Math.round((rate(p) / base - 1) * 100), best: p.id === best.id }]));
}

export const ERA_PRICES = { single: 600, bundle: 2200 };

/** פריטי לבוש — 4 קטגוריות. price=0 → ברירת מחדל חינמית */
export const WEARABLES = {
  head: [
    { id: 'crown_starter', name: 'נזר עץ פשוט', price: 0, rarity: 'common' },
    { id: 'crown_gold', name: 'כתר מלכותי משובץ אבני אודם', price: 200, rarity: 'rare' },
    { id: 'helm_spartan', name: 'קסדת גלדיאטור ספרטנית עם נוצה אדומה', price: 350, rarity: 'rare' },
    { id: 'helm_samurai', name: 'קסדת קאבוטו סמוראית מוזהבת', price: 500, rarity: 'epic' },
    { id: 'crown_pharaoh', name: 'כתר נמס פרעוני עם קוברה מוזהבת', price: 650, rarity: 'epic' },
    { id: 'visor_cyber', name: 'משקף הולוגרמה סייברפאנק זוהר', price: 800, rarity: 'legendary' },
  ],
  armor: [
    { id: 'tunic_starter', name: 'גלימת בד פשוטה', price: 0, rarity: 'common' },
    { id: 'cape_royal_velvet', name: 'גלימת קטיפה ארגמנית עם פרוות מלכים', price: 250, rarity: 'rare' },
    { id: 'armor_paladin', name: 'שריון אבירים כסוף ומעוטר בזהב', price: 450, rarity: 'epic' },
    { id: 'armor_shogun', name: 'שריון סמוראי שחור-זהב', price: 600, rarity: 'epic' },
    { id: 'robe_celestial', name: 'גלימת כוכבים מרחפת עם חלקיקי אור', price: 950, rarity: 'legendary' },
  ],
  weapon: [
    { id: 'staff_wood', name: 'מטה עץ', price: 0, rarity: 'common' },
    { id: 'scepter_diamond', name: 'שרביט יהלום מלכותי', price: 300, rarity: 'rare' },
    { id: 'sword_excalibur', name: 'חרב אקסקליבר זוהרת', price: 550, rarity: 'epic' },
    { id: 'trident_atlantis', name: 'קלשון אטלנטיס חשמלי', price: 750, rarity: 'legendary' },
  ],
  aura: [
    { id: 'aura_none', name: 'ללא הילה', price: 0, rarity: 'common' },
    { id: 'aura_golden_sparks', name: 'הילת ניצוצות זהב', price: 400, rarity: 'rare' },
    { id: 'aura_fire_ring', name: 'טבעת להבות מלכותית', price: 700, rarity: 'epic' },
    { id: 'aura_cosmic_lightning', name: 'ברקים קוסמיים סביב הדמות', price: 1100, rarity: 'legendary' },
  ],
};

export const SLOT_LABELS = { head: 'כתרים וקסדות', armor: 'גלימות ושריונות', weapon: 'שרביטים ונשקים', aura: 'הילות' };
export const SLOT_LABELS_EN = { head: 'Crowns & Helmets', armor: 'Capes & Armor', weapon: 'Scepters & Weapons', aura: 'Auras' };
export const DEFAULT_LOADOUT = { head: 'crown_starter', armor: 'tunic_starter', weapon: 'staff_wood', aura: 'aura_none' };
export const RARITY = {
  common: { label: 'רגיל', labelEn: 'Common', color: '#b9b2a3' },
  rare: { label: 'נדיר', labelEn: 'Rare', color: '#5fb4ff' },
  epic: { label: 'אפי', labelEn: 'Epic', color: '#c77dff' },
  legendary: { label: 'אגדי', labelEn: 'Legendary', color: '#ffc94d' },
};

export const ALL_WEARABLES = Object.entries(WEARABLES).flatMap(([slot, items]) => items.map((it) => ({ ...it, slot })));
export const findWearable = (id) => ALL_WEARABLES.find((w) => w.id === id);

/** רצף התחברות יומי — 7 ימים */
export const DAILY_STREAK = [
  { day: 1, gems: 30 },
  { day: 2, gems: 50 },
  { day: 3, gems: 80, trial: 'cosmetic' },
  { day: 4, gems: 120 },
  { day: 5, gems: 200 },
  { day: 6, gems: 350 },
  { day: 7, chest: true, label: 'תיבת האוצר המלכותית', labelEn: 'Royal Treasure Chest' },
];

/** תוצאות תיבת היום השביעי (סיכויים שקופים) */
export const ROYAL_CHEST = [
  { type: 'gems', amount: 600, weight: 40, label: '‎+600 💎' },
  { type: 'wearable', weight: 35, label: 'פריט לבוש נדיר לצמיתות', labelEn: 'Permanent rare outfit item' },
  { type: 'petTrial', weight: 25, label: 'חיית מחמד בלעדית ל-24 שעות', labelEn: 'Exclusive pet for 24 hours' },
];

/**
 * גלגל המזל המלכותי — weight = סיכוי באחוזים (מוצג לשחקן לפני כל סיבוב).
 * תוחלת היהלומים לסיבוב קטנה ממחיר סיבוב נוסף, כך שאי אפשר "לחרוש" יהלומים בסיבובים.
 */
export const WHEEL_SEGMENTS = [
  { id: 'g25', type: 'gems', amount: 25, label: '25', icon: '💎', weight: 41.7, color: '#3a2a6b' },
  { id: 'frag', type: 'fragment', label: 'שבר פריט', labelEn: 'Item shard', icon: '🧩', weight: 26, color: '#1f4d5c' },
  { id: 'g50', type: 'gems', amount: 50, label: '50', icon: '💎', weight: 18, color: '#5a2448' },
  { id: 'g100', type: 'gems', amount: 100, label: '100', icon: '💎', weight: 7, color: '#2a4a2a' },
  { id: 'crown', type: 'item', item: 'crown_gold', label: 'כתר זהב', labelEn: 'Gold crown', icon: '👑', weight: 3, color: '#6b4a12' },
  { id: 'g250', type: 'gems', amount: 250, label: '250', icon: '💎', weight: 2, color: '#24345a' },
  { id: 'aura', type: 'item', item: 'aura_golden_sparks', label: 'הילת זהב', labelEn: 'Gold aura', icon: '✨', weight: 1.8, color: '#5a3a12' },
  { id: 'g1000', type: 'gems', amount: 1000, label: '1,000', icon: '💰', weight: 0.3, color: '#7a5a10', jackpot: true },
  { id: 'era', type: 'era', label: 'עידן פרימיום', labelEn: 'Premium era', icon: '🏯', weight: 0.2, color: '#5a1020', jackpot: true },
];
export const DUPLICATE_ITEM_GEMS = 60;
export const DUPLICATE_FRAGMENT_GEMS = 10;

export function formatPrice(amount) {
  const n = Number(amount).toFixed(2);
  return ECONOMY.currencyPosition === 'before' ? `${ECONOMY.currencySymbol}${n}` : `${n} ${ECONOMY.currencySymbol}`;
}
export const formatGems = (n) => Number(n).toLocaleString('en-US');
