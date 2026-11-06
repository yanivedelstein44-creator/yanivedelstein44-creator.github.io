/**
 * חיות המחמד — 3 בסיסיות (נפתחות בהתקדמות) + 5 בלעדיות (רק בחנות).
 */
export const PETS = {
  wolf_cub: { id: 'wolf_cub', name: 'גור זאבים קדמון', icon: 'paw', island: 1, premium: false, unlockEra: 1, price: 0, voice: 'wolf', desc: 'זאב אפור ונאמן עם זנב מכשכש', descEn: 'A loyal grey wolf with a wagging tail' },
  royal_owl: { id: 'royal_owl', name: 'ינשוף האימפריה', icon: 'paw', island: 2, premium: false, unlockEra: 2, price: 0, voice: 'owl', desc: 'ינשוף חכם בנוצות ברונזה — נפתח בעידן 2', descEn: 'A wise owl with bronze feathers — unlocks in Era 2' },
  armor_steed: { id: 'armor_steed', name: 'סוסון אבירים', icon: 'knight', island: 3, premium: false, unlockEra: 3, price: 0, voice: 'horse', desc: 'סוס מלחמה זעיר משוריין — נפתח בעידן 3', descEn: 'A tiny armored war horse — unlocks in Era 3' },
  fire_dragon: { id: 'fire_dragon', name: 'דרקון אש מלכותי', icon: 'dragon', island: 6, premium: true, price: 900, voice: 'dragon', desc: 'דרקון ארגמן-זהב שנושף להבות על הלוח', descEn: 'A crimson-gold dragon that breathes flames over the board' },
  golden_phoenix: { id: 'golden_phoenix', name: 'עוף חול מוזהב', icon: 'fire', island: 7, premium: true, price: 850, voice: 'phoenix', desc: 'עוף זוהר עם שובל גחלים מוזהבות', descEn: 'A radiant bird with a trail of golden embers' },
  cyber_fox: { id: 'cyber_fox', name: 'שועל סייבר הולוגרפי', icon: 'paw', island: 5, premium: true, price: 750, voice: 'fox', desc: 'שועל ניאון שקוף עם שני זנבות וטבעות לייזר', descEn: 'A translucent neon fox with twin tails and laser rings' },
  mythic_griffin: { id: 'mythic_griffin', name: 'גריפון אגדי', icon: 'star', island: 8, premium: true, price: 800, voice: 'griffin', desc: 'אריה-נשר עם כנפי זהב וגל רעם', descEn: 'A lion-eagle with golden wings and a thunder wave' },
  crystal_unicorn: { id: 'crystal_unicorn', name: 'חד-קרן קריסטל', icon: 'sparkle', island: 10, premium: true, price: 700, voice: 'unicorn', desc: 'חד-קרן מנצנץ עם קרן ספירלה והילת קשת', descEn: 'A sparkling unicorn with a spiral horn and a rainbow halo' },
};

export const PET_IDS = Object.keys(PETS);
export const PREMIUM_PET_IDS = PET_IDS.filter((id) => PETS[id].premium);
