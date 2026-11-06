/**
 * פיראטי הזמן: כשבוט עוזב את האי שלו לאי המרכזי, האי נתפס על ידי צוות פיראטים — באותה רמת קושי בדיוק.
 * אין פלישות ואין התראות: חוזרים מתי שרוצים, מנצחים ומקבלים יהלומים. אחרי הניצחון הם בורחים,
 * ואחרי כמה שעות צוות חדש (עם קפטן אחר) נוחת בשקט.
 */
import { islandDef } from './Islands.js';

export const PIRATE_RESPAWN_MS = 6 * 60 * 60 * 1000;

const CAPTAINS = [
  ['קפטן שעון-חול', 'Captain Sandglass', 'm'], ['קפטנית מטוטלת', 'Captain Pendulum', 'f'], ['קפטן טיק-טק', 'Captain Tick-Tock', 'm'], ['קפטנית חצות', 'Captain Midnight', 'f'],
  ['קפטן פרדוקס', 'Captain Paradox', 'm'], ['קפטנית אתמול', 'Captain Yesterday', 'f'], ['קפטן מחרתיים', 'Captain Overmorrow', 'm'], ['קפטנית שבריר', 'Captain Splitsecond', 'f'],
  ['קפטן גלגל-שיניים', 'Captain Cogtooth', 'm'], ['קפטנית ליקוי', 'Captain Eclipse', 'f'], ['קפטן מאה', 'Captain Century', 'm'], ['קפטנית סערה', 'Captain Squall', 'f'],
  ['קפטן חלודה', 'Captain Rust', 'm'], ['קפטנית רגע', 'Captain Moment', 'f'], ['קפטן עידן', 'Captain Epoch', 'm'], ['קפטנית לולאה', 'Captain Loop', 'f'],
];

/** יהלומים על ניצחון בפיראטים (מקור היהלומים העיקרי במשחק) */
export const pirateGems = (id) => 14 + Math.round(id * 1.0);

/** הצוות שתופס את האי (crew = מספר הצוות, מתחלף אחרי כל ניצחון) */
export function pirateCrew(id, crew = 0) {
  const d = islandDef(id);
  const b = d.bot;
  const [he, en, g] = CAPTAINS[(id * 7 + crew * 5) % CAPTAINS.length];
  return {
    name: { he, en }, gender: g,
    title: { he: g === 'f' ? 'קפטנית פיראטי הזמן' : 'קפטן פיראטי הזמן', en: 'Time Pirate Captain' },
    rating: b.rating, strength: b.strength, emblem: 'swords',
    look: { skin: b.look.skin, hair: 0x1a1210, cloth: 0x5a1a2a },
    loadout: { head: 'hat_tricorn', armor: 'coat_pirate', weapon: 'cutlass', aura: b.loadout.aura },
    pet: b.pet, petHue: (b.petHue + 0.5) % 1, petScale: b.petScale,
  };
}
