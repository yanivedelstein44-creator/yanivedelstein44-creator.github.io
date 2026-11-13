/**
 * כלכלת היהלומים — מקור האמת היחיד למחירים, חבילות, פריטים ופרסים יומיים.
 * שינוי מחיר כאן משתקף מיד בכל החנות.
 *
 * יהלומים לא נקנים בכסף — מרוויחים אותם רק מניצחונות (בוטים / חברים) ומהפרס היומי.
 * בלי פרסומות בכלל. איים 1–99 חינמיים לגמרי.
 * רכישות בכסף אמיתי (hook אסינכרוני שמוכן לחיבור Google Play Billing — ראה README):
 *   1) 30 איי הפרימיום (100–129) + דרקון השעונים הזהוב — Economy.purchaseFullGame()
 *   2) בוסט x2 יהלומים לשבוע (אפשר לקנות שוב — כל קנייה מוסיפה 7 ימים) — Economy.purchaseBoost()
 *   3) סקינים ללוח ולכלים — Economy.purchaseSkin(id)
 *   4) 3 החיות המעופפות האגדיות של קן השמיים (pet_thunder_dragon / pet_crystal_griffin / pet_sky_whale) — Economy.purchaseSkyPet(id)
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
  devFreeGems: 500,
  friendWinGems: 15, // ניצחון במשחק נגד חבר (מינימום 15 מהלכים)
  trialHours: 24,
};

/**
 * חיות שגדלות: החיה המלווה צוברת ניסיון בכל קרב — גור (0) → בוגר (adult) → אגדי (legend).
 * חיה חדשה מתחילה כגור; חיות שנקנו בכסף אמיתי מגיעות בוגרות; החיות של מי ששיחק לפני העדכון נשארות בוגרות.
 */
export const PET_GROWTH = {
  adult: 60,
  legend: 220,
  xp: { win: 12, draw: 6, loss: 4, capture: 1, capMax: 6, fastMate: 6 }, // ניצחון / תיקו / הפסד, +1 לכל הכאה (עד 6), +6 על מט מהיר
};

/**
 * מוצרים בכסף אמיתי. price = null → "המחיר ייקבע בקרוב" (קובעים כאן כשמחליטים, למשל 9.9).
 * בגרסת גוגל פליי המחיר מגיע מהחנות (PaymentProvider.priceLabel).
 */
/** 30 איי הפרימיום (100–129) + דרקון השעונים הזהוב — רכישה חד-פעמית */
export const FULL_GAME = { id: 'premium_islands', price: null };
export const EXPANSION = { firstIsland: 100, pet: 'clockwork_dragon' };
/** בוסט x2 יהלומים (ניצחונות על בוטים ופיראטים) לשבוע — מוצר מתכלה, אפשר לקנות שוב */
export const GEM_BOOST = { id: 'gem_boost_week', price: null, days: 7, mult: 2, consumable: true };
/**
 * סקינים ללוח ולכלים ('' = הלוח של האי/העידן).
 *  • 4 בחינם — על כל 30 איים שנכבשים (earn: 30/60/90/120)
 *  • 10 פרימיום — כל אחד רכישה חד-פעמית בכסף אמיתי (product)
 * colors = [משבצת בהירה, משבצת כהה] — לתצוגה בחנות. המראה המלא: scene/Materials.js
 */
export const BOARD_SKINS = [
  { id: '', icon: 'checker', he: 'לוח האי', en: 'Island board', colors: [0xe8dfca, 0x6e4c2f] },
  // סקין חינם על כל 20 איים שנכבשו (20/40/60/80 בחינם; 100/120 עם איי הפרימיום)
  { id: 'oakAncient', earn: 20, icon: 'castle', he: 'אלון עתיק', en: 'Ancient Oak', colors: [0xe6d2a8, 0x6a4424] },
  { id: 'emeraldMarble', earn: 40, icon: 'gem', he: 'שיש אמרלד', en: 'Emerald Marble', colors: [0xf2f0ea, 0x1f7a5a] },
  { id: 'silverMoon', earn: 60, icon: 'moon', he: 'כסף הירח', en: 'Silver Moon', colors: [0xe8ecf2, 0x3a4250] },
  { id: 'royalSapphire', earn: 80, icon: 'shield', he: 'ספיר מלכותי', en: 'Royal Sapphire', colors: [0xdfe6f2, 0x1d3a8a] },
  { id: 'amethystAurora', earn: 100, icon: 'sparkle', he: 'אמטיסט זוהר', en: 'Amethyst Aurora', colors: [0xe8dcf4, 0x5a2a8a] },
  { id: 'sunfire', earn: 120, icon: 'fire', he: 'אש השמש', en: 'Sunfire', colors: [0xffe2a0, 0xc8501a] },
  { id: 'obsidianGold', product: 'skin_obsidian_gold', price: null, icon: 'crown', he: 'אובסידיאן וזהב', en: 'Obsidian Gold', colors: [0x2a2630, 0xd8a83a] },
  { id: 'crystalPrism', product: 'skin_crystal_prism', price: null, icon: 'sparkle', he: 'פריזמת קריסטל', en: 'Crystal Prism', colors: [0xeaf6ff, 0x9fc8ff] },
  { id: 'royalJade', product: 'skin_royal_jade', price: null, icon: 'temple', he: 'ירקן מלכותי', en: 'Royal Jade', colors: [0xf2ead8, 0x2f8a5e] },
  { id: 'neonGrid', product: 'skin_neon_grid', price: null, icon: 'bolt', he: 'רשת ניאון', en: 'Neon Grid', colors: [0x1a1f44, 0x33f0ff] },
  { id: 'rubyGold', product: 'skin_ruby_gold', price: null, icon: 'heart', he: 'אודם וזהב', en: 'Ruby & Gold', colors: [0xf6e6c8, 0x9a1428] },
  { id: 'galaxy', product: 'skin_galaxy', price: null, icon: 'star', he: 'גלקסיה', en: 'Galaxy', colors: [0x3a2a7a, 0x0c0a24] },
  { id: 'moltenLava', product: 'skin_molten_lava', price: null, icon: 'fire', he: 'לבה מותכת', en: 'Molten Lava', colors: [0x4a3a36, 0x1a1210] },
  { id: 'frostDiamond', product: 'skin_frost_diamond', price: null, icon: 'snowflake', he: 'יהלום כפור', en: 'Frost Diamond', colors: [0xf4fbff, 0x8ec8e8] },
  { id: 'rosePearl', product: 'skin_rose_pearl', price: null, icon: 'heart', he: 'פנינה וזהב ורוד', en: 'Rose Gold Pearl', colors: [0xfbf2f0, 0xd89a8a] },
  { id: 'pharaohLapis', product: 'skin_pharaoh_lapis', price: null, icon: 'temple', he: 'לפיס פרעוני', en: 'Pharaoh Lapis', colors: [0xf2d68a, 0x1f3f9a] },
];
export const findSkin = (id) => BOARD_SKINS.find((x) => x.id === id) || null;
export const SKIN_EVERY = 20;

/** פריטי לבוש — 4 קטגוריות. price=0 → ברירת מחדל חינמית */
export const WEARABLES = {
  head: [
    { id: 'crown_starter', name: 'נזר עץ פשוט', price: 0, rarity: 'common', island: 1 },
    { id: 'crown_gold', name: 'כתר מלכותי משובץ אבני אודם', price: 200, rarity: 'rare' },
    { id: 'helm_spartan', name: 'קסדת גלדיאטור ספרטנית עם נוצה אדומה', price: 350, rarity: 'rare', island: 2 },
    { id: 'helm_samurai', name: 'קסדת קאבוטו סמוראית מוזהבת', price: 500, rarity: 'epic', island: 6 },
    { id: 'crown_pharaoh', name: 'כתר נמס פרעוני עם קוברה מוזהבת', price: 650, rarity: 'epic', island: 7 },
    { id: 'visor_cyber', name: 'משקף הולוגרמה סייברפאנק זוהר', price: 800, rarity: 'legendary', island: 5 },
  ],
  armor: [
    { id: 'tunic_starter', name: 'גלימת בד פשוטה', price: 0, rarity: 'common', island: 1 },
    { id: 'cape_royal_velvet', name: 'גלימת קטיפה ארגמנית עם פרוות מלכים', price: 250, rarity: 'rare' },
    { id: 'armor_paladin', name: 'שריון אבירים כסוף ומעוטר בזהב', price: 450, rarity: 'epic', island: 3 },
    { id: 'armor_shogun', name: 'שריון סמוראי שחור-זהב', price: 600, rarity: 'epic', island: 6 },
    { id: 'robe_celestial', name: 'גלימת כוכבים מרחפת עם חלקיקי אור', price: 950, rarity: 'legendary', island: 10 },
  ],
  weapon: [
    { id: 'staff_wood', name: 'מטה עץ', price: 0, rarity: 'common', island: 1 },
    { id: 'scepter_diamond', name: 'שרביט יהלום מלכותי', price: 300, rarity: 'rare' },
    { id: 'sword_excalibur', name: 'חרב אקסקליבר זוהרת', price: 550, rarity: 'epic', island: 3 },
    { id: 'trident_atlantis', name: 'קלשון אטלנטיס חשמלי', price: 750, rarity: 'legendary', island: 9 },
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
/** המתנה היומית (בועה מעל בית המתנות): סכום קבוע וידוע מראש לכל יום ברצף — בלי הגרלות */
export const DAILY_STREAK = [
  { day: 1, gems: 30 },
  { day: 2, gems: 50 },
  { day: 3, gems: 80 },
  { day: 4, gems: 120 },
  { day: 5, gems: 200 },
  { day: 6, gems: 350 },
  { day: 7, gems: 600 },
];

/** תוצאות תיבת היום השביעי (סיכויים שקופים) */
export const ROYAL_CHEST = [
  { type: 'gems', amount: 600, weight: 40, label: '‎+600', icon: 'gem' },
  { type: 'wearable', weight: 35, label: 'פריט לבוש נדיר לצמיתות', labelEn: 'Permanent rare outfit item' },
  { type: 'petTrial', weight: 25, label: 'חיית מחמד בלעדית ל-24 שעות', labelEn: 'Exclusive pet for 24 hours' },
];

export const DUPLICATE_ITEM_GEMS = 60;

export function formatPrice(amount) {
  const n = Number(amount).toFixed(2);
  return ECONOMY.currencyPosition === 'before' ? `${ECONOMY.currencySymbol}${n}` : `${n} ${ECONOMY.currencySymbol}`;
}
export const formatGems = (n) => Number(n).toLocaleString('en-US');
