/**
 * חיות המחמד — 3 בסיסיות (נפתחות בהתקדמות) + 5 בלעדיות (רק בחנות).
 * קן השמיים (sky: true): 12 חיות מעופפות — 9 בחינם, אחת על כל 10 איים שנכבשים (earn), ו-3 אגדיות בכסף אמיתי (product).
 * החיות המעופפות לא מופיעות בבית החיות ולא אצל הבוטים (כדי שהחיות של הבוטים לא ישתנו).
 */
export const PETS = {
  wolf_cub: { id: 'wolf_cub', name: 'גור זאבים קדמון', icon: 'paw', island: 1, premium: false, unlockEra: 1, price: 0, voice: 'wolf', desc: 'זאב אפור ונאמן עם זנב מכשכש', descEn: 'A loyal grey wolf with a wagging tail' },
  royal_owl: { id: 'royal_owl', name: 'ינשוף האימפריה', icon: 'paw', island: 2, premium: false, unlockEra: 2, price: 0, voice: 'owl', desc: 'ינשוף חכם בנוצות ברונזה — נפתח בעידן 2', descEn: 'A wise owl with bronze feathers — unlocks in Era 2' },
  armor_steed: { id: 'armor_steed', name: 'סוסון אבירים', icon: 'knight', island: 3, premium: false, unlockEra: 3, price: 0, voice: 'horse', desc: 'סוס מלחמה זעיר משוריין — נפתח בעידן 3', descEn: 'A tiny armored war horse — unlocks in Era 3' },
  fire_dragon: { id: 'fire_dragon', name: 'דרקון אש מלכותי', icon: 'dragon', island: 6, premium: true, price: 900, voice: 'dragon', desc: 'דרקון ארגמן-זהב שנושף להבות על הלוח', descEn: 'A crimson-gold dragon that breathes flames over the board' },
  golden_phoenix: { id: 'golden_phoenix', name: 'עוף חול מוזהב', icon: 'fire', island: 7, premium: true, price: 850, voice: 'phoenix', desc: 'עוף זוהר עם שובל גחלים מוזהבות', descEn: 'A radiant bird with a trail of golden embers' },
  cyber_fox: { id: 'cyber_fox', name: 'שועל סייבר הולוגרפי', icon: 'paw', island: 5, premium: true, price: 750, voice: 'fox', desc: 'שועל ניאון שקוף עם שני זנבות וטבעות לייזר', descEn: 'A translucent neon fox with twin tails and laser rings' },
  mythic_griffin: { id: 'mythic_griffin', name: 'גריפון אגדי', icon: 'star', island: 8, premium: true, price: 800, voice: 'griffin', desc: 'אריה-נשר עם כנפי זהב וגל רעם', descEn: 'A lion-eagle with golden wings and a thunder wave' },
  clockwork_dragon: { id: 'clockwork_dragon', name: 'דרקון שעונים זהוב', icon: 'dragon', island: 11, premium: true, exclusive: true, price: 0, voice: 'dragon', desc: 'דרקון מכני מזהב ופליז עם גלגלי שיניים מסתובבים — בלעדי להרחבת הפרימיום', descEn: 'A gold-and-brass mechanical dragon with spinning gears — exclusive to the premium expansion' },
  crystal_unicorn: { id: 'crystal_unicorn', name: 'חד-קרן קריסטל', icon: 'sparkle', island: 10, premium: true, price: 700, voice: 'unicorn', desc: 'חד-קרן מנצנץ עם קרן ספירלה והילת קשת', descEn: 'A sparkling unicorn with a spiral horn and a rainbow halo' },
  // ---------- קן השמיים ----------
  sky_parrot: { id: 'sky_parrot', name: 'תוכי טרופי', icon: 'wing', sky: true, premium: true, earn: 10, voice: 'parrot', desc: 'תוכי אדום-כחול שצווח בכל הכאה', descEn: 'A red-and-blue parrot that squawks at every capture' },
  sky_raven: { id: 'sky_raven', name: 'עורב הסערה', icon: 'wing', sky: true, premium: true, earn: 20, voice: 'raven', desc: 'עורב שחור עם עיני ברק וניצוצות חשמל', descEn: 'A black raven with lightning eyes and electric sparks' },
  sky_eagle: { id: 'sky_eagle', name: 'נשר הזהב', icon: 'wing', sky: true, premium: true, earn: 30, voice: 'eagle', desc: 'נשר אצילי עם כנפיים רחבות בקצוות זהב', descEn: 'A noble eagle with broad gold-tipped wings' },
  sky_bat: { id: 'sky_bat', name: 'עטלף הירח', icon: 'moon', sky: true, premium: true, earn: 40, voice: 'bat', desc: 'עטלף סגול עם ירח קטן שזוהר מעליו', descEn: 'A purple bat with a little glowing moon above it' },
  sky_pegasus: { id: 'sky_pegasus', name: 'פגסוס', icon: 'wing', sky: true, premium: true, earn: 50, voice: 'pegasus', desc: 'סוס לבן מכונף עם רעמה תכלת ופרסות זהב', descEn: 'A white winged horse with a sky-blue mane and golden hooves' },
  sky_ice_dragon: { id: 'sky_ice_dragon', name: 'דרקון הכפור', icon: 'snowflake', sky: true, premium: true, earn: 60, voice: 'dragon', desc: 'דרקון קרח עם קוצי קריסטל ונשימת כפור', descEn: 'An ice dragon with crystal spikes and frost breath' },
  sky_wyvern: { id: 'sky_wyvern', name: 'ווירן הירקן', icon: 'dragon', sky: true, premium: true, earn: 70, voice: 'dragon', desc: 'דרקון ירקן על שתי רגליים עם כנפיים ענקיות', descEn: 'A two-legged jade dragon with huge wings' },
  sky_butterfly: { id: 'sky_butterfly', name: 'פרפר הקשת', icon: 'sparkle', sky: true, premium: true, earn: 80, voice: 'butterfly', desc: 'פרפר ענק בצבעי הקשת עם שובל נצנצים', descEn: 'A giant rainbow butterfly with a trail of sparkles' },
  sky_star_phoenix: { id: 'sky_star_phoenix', name: 'עוף חול הכוכבים', icon: 'star', sky: true, premium: true, earn: 90, voice: 'phoenix', desc: 'עוף חול קוסמי שכוכבים חגים סביבו', descEn: 'A cosmic phoenix circled by tiny stars' },
  sky_thunder_dragon: { id: 'sky_thunder_dragon', name: 'דרקון הברקים', icon: 'bolt', sky: true, premium: true, product: 'pet_thunder_dragon', price: null, voice: 'dragon', desc: 'דרקון כחול-לילה שברקים רצים על כנפיו', descEn: 'A midnight-blue dragon with lightning racing across its wings' },
  sky_crystal_griffin: { id: 'sky_crystal_griffin', name: 'גריפון הקריסטל', icon: 'gem', sky: true, premium: true, product: 'pet_crystal_griffin', price: null, voice: 'griffin', desc: 'גריפון מקריסטל קשתי עם כנפיים שקופות', descEn: 'A griffin of rainbow crystal with see-through wings' },
  sky_whale: { id: 'sky_whale', name: 'לווייתן השמיים', icon: 'star', sky: true, premium: true, product: 'pet_sky_whale', price: null, voice: 'whale', desc: 'לווייתן שט בין העננים עם כוכבים על הגב', descEn: 'A whale that swims through the clouds with stars on its back' },
};

/** החיות של בית החיות (בלי החיות המעופפות של קן השמיים) */
export const PET_IDS = Object.keys(PETS).filter((id) => !PETS[id].sky);
export const PREMIUM_PET_IDS = PET_IDS.filter((id) => PETS[id].premium && !PETS[id].exclusive); // בלי הבלעדיות (רק בהרחבה)
export const BOT_PET_IDS = PET_IDS.filter((id) => !PETS[id].exclusive);
/** קן השמיים: קודם החינמיות לפי הסדר (10, 20…), אחריהן האגדיות */
export const SKY_PET_IDS = Object.keys(PETS).filter((id) => PETS[id].sky);
export const SKY_EVERY = 10;
/** החיות המעופפות הוותיקות (מבית החיות) — מופיעות גם בקן השמיים */
export const CLASSIC_FLYER_IDS = ['royal_owl', 'fire_dragon', 'golden_phoenix', 'mythic_griffin', 'clockwork_dragon'];
const FLYERS = new Set([...CLASSIC_FLYER_IDS, ...SKY_PET_IDS]);
/** חיה שעפה (ברכיבה במפה ומעל העיר) */
export const isFlyer = (id) => FLYERS.has(id);
