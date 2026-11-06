/**
 * 99 איים עם בוטים. אי 1 הוא האי המרכזי — הבסיס והתפריט: הבוט הראשון, משחק נגד חבר, החנות והמתנות.
 * 10 אזורים (כל אזור בסגנון של עידן אחד) × 10 איים (באזור האחרון 9). איים 2–99 מסודרים סביבו בספירלה.
 * לכל אי בוט ייחודי: שם, תואר, דירוג, מראה (עור / שיער / בגד), לבוש מלא וחיית מחמד בגוון משלה.
 * הכול נוצר באופן דטרמיניסטי מתוך מספר האי — כך שכל שחקן רואה את אותם 99 בוטים.
 */
import { WEARABLES } from './EconomyConfig.js';
import { BOT_PET_IDS } from './Pets.js';
import { eraOf } from './IslandEras.js';

/** 99 איי הבסיס (חינם) + 30 איי הפרימיום (100–129, ארכיפלג צמוד לאי המרכזי) */
export const ISLAND_COUNT = 129;
export const BASE_ISLANDS = 99;
export const PREMIUM_FIRST = 100;
export const REGION_COUNT = 13;
/** האי המרכזי (הבית): אי 1 */
export const HUB_ID = 1;
/** איים 1–99 חינמיים לגמרי; 100–129 נפתחים ברכישה חד-פעמית. אין סדר חובה — כל אי פתוח בכל רגע */
export const FREE_ISLANDS = 99;
export const isPremium = (id) => id >= PREMIUM_FIRST;
export const regionOf = (id) => (id <= 0 ? 0 : id <= BASE_ISLANDS ? Math.min(10, Math.ceil(id / 10)) : Math.min(REGION_COUNT, 10 + Math.ceil((id - BASE_ISLANDS) / 10)));
export const isBoss = (id) => id > 0 && (id <= BASE_ISLANDS ? (id % 10 === 0 || id === BASE_ISLANDS) : (id - BASE_ISLANDS) % 10 === 0);
/** שלבי הבנייה של אזור נפתחים אחרי כיבוש 5 ואחרי כיבוש כל איי האזור */
export const regionThresholds = (r) => (r === 10 ? [5, 9] : [5, 10]);
export const regionIslands = (r) => {
  if (r > 10) { const a = PREMIUM_FIRST + (r - 11) * 10; return Array.from({ length: 10 }, (_, i) => a + i); }
  const a = (r - 1) * 10 + 1; return Array.from({ length: r === 10 ? 9 : 10 }, (_, i) => a + i);
};
/** שמות 3 עולמות הפרימיום (העולמות 1–10 — בעידנים) */
export const PREMIUM_WORLDS = {
  11: { he: 'ממלכות הפלא', en: 'Wonder Realms' },
  12: { he: 'ממלכות החלום', en: 'Dream Realms' },
  13: { he: 'ממלכות הזניט', en: 'Zenith Realms' },
};

// ---------- שמות ----------
const PLACES = {
  1: [['הצור', 'Flint'], ['הגחלת', 'Ember'], ['הממותה', 'Mammoth'], ['קרן הצבי', 'Antler'], ['האוכרה', 'Ochre'], ['הטחב', 'Moss'], ['החט', 'Tusk'], ['המערה', 'Cavern'], ['המדורה', 'Bonfire'], ['האפר', 'Ash']],
  2: [['השיש', 'Marble'], ['הדפנה', 'Laurel'], ['הזית', 'Olive'], ['האגורה', 'Agora'], ['האורקל', 'Oracle'], ['העמוד', 'Column'], ['הכד', 'Amphora'], ['הסנאט', 'Senate'], ['התרירמה', 'Trireme'], ['אפולו', 'Apollo']],
  3: [['הדגל', 'Banner'], ['החפיר', 'Moat'], ['הגריפון', 'Griffin'], ['המנזר', 'Abbey'], ['הרומח', 'Lance'], ['הדרדר', 'Thistle'], ['מגן האלון', 'Oakshield'], ['הבז', 'Falcon'], ['החומה', 'Rampart'], ['הכתר', 'Crown']],
  4: [['גלגל השיניים', 'Cog'], ['הקיטור', 'Steam'], ['הנחושת', 'Copper'], ['הכבשן', 'Furnace'], ['המסמרת', 'Rivet'], ['הבוכנה', 'Piston'], ['בית היציקה', 'Foundry'], ['השעון', 'Clockwork'], ['המסילה', 'Railway'], ['הארובה', 'Smokestack']],
  5: [['הניאון', 'Neon'], ['המעגל', 'Circuit'], ['הפיקסל', 'Pixel'], ['הקוונטים', 'Quantum'], ['ההולוגרמה', 'Hologram'], ['הבייט', 'Byte'], ['הכרום', 'Chrome'], ['הדופק', 'Pulse'], ['המטריקס', 'Matrix'], ['הנקסוס', 'Nexus']],
  6: [['הסאקורה', 'Sakura'], ['הבמבוק', 'Bamboo'], ['הטוריי', 'Torii'], ['הקוי', 'Koi'], ['הלוטוס', 'Lotus'], ['הקטאנה', 'Katana'], ['הפנס', 'Lantern'], ['הפגודה', 'Pagoda'], ['העגור', 'Crane'], ['הדרקון', 'Dragon']],
  7: [['החרפושית', 'Scarab'], ['הפפירוס', 'Papyrus'], ['הנווה', 'Oasis'], ['הספינקס', 'Sphinx'], ['האנך', 'Ankh'], ['האובליסק', 'Obelisk'], ['הדיונה', 'Dune'], ['הורוס', 'Horus'], ['הנילוס', 'Nile'], ['הפירמידה', 'Pyramid']],
  8: [['הרונה', 'Rune'], ['הפיורד', 'Fjord'], ['הספינה הארוכה', 'Longship'], ['הכפור', 'Frost'], ['העורב', 'Raven'], ['המיד', 'Mead'], ['הזאב', 'Wolf'], ['הגרזן', 'Axe'], ['הרעם', 'Thunder'], ['ולהאלה', 'Valhalla']],
  9: [['האלמוגים', 'Coral'], ['הפנינה', 'Pearl'], ['הגאות', 'Tide'], ['האצות', 'Kelp'], ['הנאוטילוס', 'Nautilus'], ['התהום', 'Abyss'], ['הלגונה', 'Lagoon'], ['הקלשון', 'Trident'], ['הסירנה', 'Siren'], ['פוסידון', 'Poseidon']],
  10: [['הערפילית', 'Nebula'], ['השביט', 'Comet'], ['הזוהר', 'Aurora'], ['ההילה', 'Halo'], ['הזניט', 'Zenith'], ['המסלול', 'Orbit'], ['מפל הכוכבים', 'Starfall'], ['הליקוי', 'Eclipse'], ['אולימפוס', 'Olympus']],
  11: [['המגנטים', 'Magnet'], ['קרח הזכוכית', 'Glass Ice'], ['הבזלת', 'Basalt'], ['הוויניל', 'Vinyl'], ['היער המדבר', 'Whisperwood'], ['אטלנטיס', 'Atlantis'], ['השעונים', 'Clockwork'], ['הממתקים', 'Candy'], ['המראות', 'Mirror'], ['דיונות הכוכבים', 'Starlight Dune']],
  12: [['המעבדה', 'Cyber Lab'], ['הספרייה', 'Library'], ['הרעם', 'Thunder'], ['הדיו', 'Ink & Silk'], ['השונית', 'Reef'], ['הכוורת', 'Honeycomb'], ['הפסלים', 'Statue'], ['האסטרואידים', 'Asteroid'], ['הגייזרים', 'Geyser'], ['הפטריות', 'Mushroom']],
  13: [['הפורצלן', 'Porcelain'], ['הצעצועים', 'Toy'], ['שדות החיטה', 'Wheatfield'], ['הספיה', 'Sepia'], ['קורי העכביש', 'Cobweb'], ['הנהר הגועש', 'Rapids'], ['הטונדרה', 'Tundra'], ['התאים', 'Cell'], ['הרונות', 'Rune'], ['הזניט', 'Zenith Summit']],
};

// 99 שמות ייחודיים לבוטים [עברית, English, מין]
const NAMES = [
  ['ארי', 'Ari', 'm'], ['בלה', 'Bela', 'f'], ['סיירוס', 'Cyrus', 'm'], ['דינה', 'Dina', 'f'], ['איתן', 'Eitan', 'm'], ['פרייה', 'Freya', 'f'], ['גדעון', 'Gideon', 'm'], ['האנה', 'Hana', 'f'], ['איגור', 'Igor', 'm'], ['ג׳ונו', 'Juno', 'f'],
  ['קנג׳י', 'Kenji', 'm'], ['לירה', 'Lyra', 'f'], ['מרקו', 'Marco', 'm'], ['נדיה', 'Nadia', 'f'], ['עומר', 'Omar', 'm'], ['פטרה', 'Petra', 'f'], ['קוויל', 'Quill', 'm'], ['רוזה', 'Rosa', 'f'], ['סילאס', 'Silas', 'm'], ['טליה', 'Talia', 'f'],
  ['אולריק', 'Ulric', 'm'], ['ורה', 'Vera', 'f'], ['ויקטור', 'Viktor', 'm'], ['יוקי', 'Yuki', 'f'], ['זנדר', 'Xander', 'm'], ['זארה', 'Zara', 'f'], ['עמוס', 'Amos', 'm'], ['קליאו', 'Cleo', 'f'], ['בראם', 'Bram', 'm'], ['אלזה', 'Elsa', 'f'],
  ['דריוס', 'Darius', 'm'], ['גרטה', 'Greta', 'f'], ['פליקס', 'Felix', 'm'], ['אינס', 'Ines', 'f'], ['הוגו', 'Hugo', 'm'], ['קירה', 'Kira', 'f'], ['ג׳ספר', 'Jasper', 'm'], ['מירה', 'Mira', 'f'], ['לאון', 'Leon', 'm'], ['אודט', 'Odette', 'f'],
  ['ניקו', 'Nico', 'm'], ['טרה', 'Tara', 'f'], ['פבלו', 'Pablo', 'm'], ['וסנה', 'Vesna', 'f'], ['רונן', 'Ronan', 'm'], ['וילה', 'Willa', 'f'], ['זנו', 'Zeno', 'm'], ['יארה', 'Yara', 'f'], ['בוריס', 'Boris', 'm'], ['אניה', 'Anya', 'f'],
  ['דב', 'Dov', 'm'], ['כרמן', 'Carmen', 'f'], ['פין', 'Finn', 'm'], ['אסמה', 'Esme', 'f'], ['הארוטו', 'Haruto', 'm'], ['גאיה', 'Gaia', 'f'], ['יונס', 'Jonas', 'm'], ['אייבי', 'Ivy', 'f'], ['לארס', 'Lars', 'm'], ['קאיה', 'Kaia', 'f'],
  ['נועם', 'Noam', 'm'], ['מאיה', 'Maya', 'f'], ['פייטרו', 'Pietro', 'm'], ['אולגה', 'Olga', 'f'], ['תאו', 'Theo', 'm'], ['סאגה', 'Saga', 'f'], ['ויטו', 'Vito', 'm'], ['אולה', 'Ulla', 'f'], ['יוסף', 'Yosef', 'm'], ['ונדה', 'Wanda', 'f'],
  ['בסטיאן', 'Bastian', 'm'], ['זולה', 'Zola', 'f'], ['דמיטרי', 'Dmitri', 'm'], ['עלמה', 'Alma', 'f'], ['עזרא', 'Ezra', 'm'], ['סיליה', 'Celia', 'f'], ['גוסטב', 'Gustav', 'm'], ['פיונה', 'Fiona', 'f'], ['אילן', 'Ilan', 'm'], ['הלגה', 'Helga', 'f'],
  ['קופי', 'Kofi', 'm'], ['ג׳ייד', 'Jade', 'f'], ['מתאו', 'Mateo', 'm'], ['לונה', 'Luna', 'f'], ['אוסקר', 'Oskar', 'm'], ['נור', 'Noor', 'f'], ['רמי', 'Rami', 'm'], ['פריה', 'Priya', 'f'], ['סוון', 'Sven', 'm'], ['ולריה', 'Valeria', 'f'],
  ['אוגו', 'Ugo', 'm'], ['חימנה', 'Ximena', 'f'], ['יונתן', 'Yonatan', 'm'], ['רפאלה', 'Rafaela', 'f'], ['זולטן', 'Zoltan', 'm'], ['סלין', 'Selene', 'f'], ['קסבר', 'Kasper', 'm'], ['אמארה', 'Amara', 'f'], ['טיטוס', 'Titus', 'm'],
  // איי הפרימיום 100–129
  ['מגנוס', 'Magnus', 'm'], ['אסטריד', 'Astrid', 'f'], ['וולקן', 'Vulcan', 'm'], ['ג׳אז', 'Jazz', 'f'], ['אורן', 'Oren', 'm'], ['מרינה', 'Marina', 'f'], ['גיר', 'Gear', 'm'], ['סוכריה', 'Candy', 'f'], ['מירו', 'Miro', 'm'], ['סהרה', 'Sahara', 'f'],
  ['נאו', 'Neo', 'm'], ['ליבי', 'Libby', 'f'], ['ראד', 'Raiden', 'm'], ['מיי', 'Mei', 'f'], ['קורל', 'Corwin', 'm'], ['מליסה', 'Melissa', 'f'], ['פידיאס', 'Phidias', 'm'], ['נובה', 'Nova', 'f'], ['גייזר', 'Geyr', 'm'], ['פונגי', 'Fungi', 'f'],
  ['מינג', 'Ming', 'm'], ['דולי', 'Dolly', 'f'], ['הארווי', 'Harvey', 'm'], ['גרטרוד', 'Gertrude', 'f'], ['ארכנו', 'Arachno', 'm'], ['ריבר', 'River', 'f'], ['בורג', 'Borg', 'm'], ['סלה', 'Cella', 'f'], ['רונר', 'Runar', 'm'], ['זניה', 'Zenia', 'f'],
];

// תארים לפי אזור: [עברית זכר, עברית נקבה, English]; האחרון = תואר הבוס
const TITLES = {
  1: [['צייד', 'ציידת', 'Hunter'], ['שאמאן', 'שאמאנית', 'Shaman'], ['גשש', 'גששית', 'Tracker'], ['זקן השבט', 'זקנת השבט', 'Elder'], ['חוצב אבן', 'חוצבת אבן', 'Stonecarver'], ['מלך הממותות', 'מלכת הממותות', 'Mammoth Sovereign']],
  2: [['סנאטור', 'סנאטורית', 'Senator'], ['קנטוריון', 'קנטוריונית', 'Centurion'], ['אורקל', 'אורקלית', 'Oracle'], ['פילוסוף', 'פילוסופית', 'Philosopher'], ['גלדיאטור', 'גלדיאטורית', 'Gladiator'], ['הקיסר', 'הקיסרית', 'Emperor']],
  3: [['אביר', 'אבירה', 'Knight'], ['קשת', 'קשתית', 'Archer'], ['ברון', 'ברונית', 'Baron'], ['נזיר', 'נזירה', 'Monk'], ['נושא כלים', 'נושאת כלים', 'Squire'], ['המלך הגדול', 'המלכה הגדולה', 'High Monarch']],
  4: [['מהנדס', 'מהנדסת', 'Engineer'], ['ממציא', 'ממציאה', 'Inventor'], ['קפטן', 'קפטנית', 'Captain'], ['מכונאי', 'מכונאית', 'Mechanic'], ['טייס', 'טייסת', 'Aviator'], ['ברון הברזל', 'ברונית הברזל', 'Iron Magnate']],
  5: [['האקר', 'האקרית', 'Hacker'], ['אנדרואיד', 'אנדרואידית', 'Android'], ['רץ רשת', 'רצת רשת', 'Netrunner'], ['סינת׳', 'סינת׳ית', 'Synth'], ['מטיס רחפנים', 'מטיסת רחפנים', 'Drone Pilot'], ['הבינה המרכזית', 'הבינה המרכזית', 'Core Intelligence']],
  6: [['רונין', 'רונינית', 'Ronin'], ['סנסיי', 'סנסיי', 'Sensei'], ['נינג׳ה', 'נינג׳ה', 'Ninja'], ['קשת', 'קשתית', 'Kyudo Archer'], ['נזיר', 'נזירה', 'Monk'], ['השוגון', 'השוגונית', 'Shogun']],
  7: [['סופר', 'סופרת', 'Scribe'], ['כוהן', 'כוהנת', 'Priest'], ['וזיר', 'וזירה', 'Vizier'], ['רכב מרכבה', 'רוכבת מרכבה', 'Charioteer'], ['אדריכל', 'אדריכלית', 'Architect'], ['פרעה', 'מלכת הנילוס', 'Pharaoh']],
  8: [['יארל', 'יארלית', 'Jarl'], ['סקאלד', 'סקאלדית', 'Skald'], ['לוחם מגן', 'לוחמת מגן', 'Shield Warrior'], ['ברסרקר', 'ברסרקרית', 'Berserker'], ['רואה', 'רואה', 'Seer'], ['אדון הרעם', 'גבירת הרעם', 'Thunder Lord']],
  9: [['קורא הגאות', 'קוראת הגאות', 'Tidecaller'], ['אביר הים', 'אבירת הים', 'Sea Knight'], ['צולל פנינים', 'צוללת פנינים', 'Pearl Diver'], ['אורקל הים', 'אורקלית הים', 'Sea Oracle'], ['שומר השונית', 'שומרת השונית', 'Reef Guard'], ['מלך הים', 'מלכת הים', 'Sea Sovereign']],
  10: [['חכם הכוכבים', 'חכמת הכוכבים', 'Star Sage'], ['שרף', 'שרפית', 'Seraph'], ['טיטאן', 'טיטאנית', 'Titan'], ['כוהן הירח', 'כוהנת הירח', 'Moon Priest'], ['רוכב השביט', 'רוכבת השביט', 'Comet Rider'], ['קיסר השמיים', 'קיסרית השמיים', 'Sky Emperor']],
  11: [['שומר הפלאות', 'שומרת הפלאות', 'Wonder Warden'], ['קוסם', 'קוסמת', 'Enchanter'], ['ממציא', 'ממציאה', 'Tinkerer'], ['נווד הממדים', 'נוודת הממדים', 'Realm Walker'], ['אמן', 'אמנית', 'Artisan'], ['אדון הפלאות', 'גבירת הפלאות', 'Wonder Sovereign']],
  12: [['חולם', 'חולמת', 'Dreamer'], ['חוקר', 'חוקרת', 'Explorer'], ['שומר הספרים', 'שומרת הספרים', 'Lorekeeper'], ['מאלף סערות', 'מאלפת סערות', 'Stormtamer'], ['פסל', 'פסלת', 'Sculptor'], ['אדון החלומות', 'גבירת החלומות', 'Dream Sovereign']],
  13: [['שומר הזניט', 'שומרת הזניט', 'Zenith Guard'], ['יוצר', 'יוצרת', 'Maker'], ['קוסם הרונות', 'קוסמת הרונות', 'Rune Mage'], ['רוכב העננים', 'רוכבת העננים', 'Cloud Rider'], ['חכם', 'חכמה', 'Sage'], ['קיסר הזניט', 'קיסרית הזניט', 'Zenith Emperor']],
};

// פריטי "חתימה" של כל אזור — הבוטים של האזור לובשים אותם לעתים קרובות
const REGION_STYLE = {
  1: { head: ['crown_starter'], armor: ['tunic_starter'], weapon: ['staff_wood'] },
  2: { head: ['helm_spartan', 'crown_gold'], armor: ['cape_royal_velvet', 'tunic_starter'], weapon: ['scepter_diamond', 'staff_wood'] },
  3: { head: ['crown_gold', 'helm_spartan'], armor: ['armor_paladin', 'cape_royal_velvet'], weapon: ['sword_excalibur'] },
  4: { head: ['crown_gold', 'visor_cyber'], armor: ['armor_paladin', 'cape_royal_velvet'], weapon: ['scepter_diamond', 'staff_wood'] },
  5: { head: ['visor_cyber'], armor: ['robe_celestial', 'armor_paladin'], weapon: ['trident_atlantis', 'scepter_diamond'] },
  6: { head: ['helm_samurai'], armor: ['armor_shogun'], weapon: ['sword_excalibur', 'staff_wood'] },
  7: { head: ['crown_pharaoh'], armor: ['robe_celestial', 'cape_royal_velvet'], weapon: ['scepter_diamond', 'staff_wood'] },
  8: { head: ['helm_spartan', 'crown_gold'], armor: ['armor_paladin', 'armor_shogun'], weapon: ['sword_excalibur', 'trident_atlantis'] },
  9: { head: ['crown_gold', 'visor_cyber'], armor: ['robe_celestial', 'armor_paladin'], weapon: ['trident_atlantis'] },
  10: { head: ['crown_gold', 'crown_pharaoh'], armor: ['robe_celestial'], weapon: ['scepter_diamond', 'trident_atlantis'] },
  11: { head: ['visor_cyber', 'crown_gold'], armor: ['robe_celestial', 'armor_paladin'], weapon: ['scepter_diamond', 'trident_atlantis'] },
  12: { head: ['crown_pharaoh', 'helm_samurai'], armor: ['armor_shogun', 'robe_celestial'], weapon: ['sword_excalibur', 'scepter_diamond'] },
  13: { head: ['crown_gold', 'visor_cyber'], armor: ['robe_celestial'], weapon: ['trident_atlantis', 'sword_excalibur'] },
};
const REGION_PETS = { 1: ['wolf_cub'], 2: ['royal_owl'], 3: ['armor_steed', 'mythic_griffin'], 4: ['armor_steed', 'royal_owl'], 5: ['cyber_fox'], 6: ['fire_dragon', 'cyber_fox'], 7: ['golden_phoenix'], 8: ['mythic_griffin', 'wolf_cub'], 9: ['crystal_unicorn', 'cyber_fox'], 10: ['crystal_unicorn', 'golden_phoenix'], 11: ['cyber_fox', 'fire_dragon'], 12: ['mythic_griffin', 'golden_phoenix'], 13: ['crystal_unicorn', 'fire_dragon'] };

const SKIN = [0xf3d3b5, 0xe6b991, 0xd29e74, 0xb57a52, 0x8f5a3a, 0x6b4129];
const HAIR = [0x1a1210, 0x3a2418, 0x6a4020, 0xa8743c, 0xd9b26a, 0xe8e2d6, 0x8a2a1a, 0x4a4a56, 0x2a3a6a];
const CLOTH = { 1: [0x6a4a2c, 0x7a5a38, 0x4a3a2a], 2: [0xe8e0d0, 0x8a1a2a, 0x3a5a8a], 3: [0x2a3a6a, 0x6a1a1a, 0x3a5a3a], 4: [0x4a3a2a, 0x2a2a30, 0x6a4a2a], 5: [0x1a1a2a, 0x0a2a3a, 0x2a1a3a], 6: [0x1a1418, 0x8a1a1a, 0x2a3a2a], 7: [0xe8d8a8, 0x1a3a8a, 0xc8a050], 8: [0x4a5a6a, 0x5a3a2a, 0x2a3a4a], 9: [0x1a5a6a, 0x2a7a7a, 0x1a3a5a], 10: [0x2a1a5a, 0xe8e0f0, 0x1a1a3a], 11: [0x2a2a4a, 0x6a3a8a, 0x1a4a5a], 12: [0x5a1a4a, 0x1a3a5a, 0xe8d8b0], 13: [0xf0f0f8, 0x2a4a8a, 0xc8a050] };

// ---------- מחולל ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const RARITY_RANK = { common: 0, rare: 1, epic: 2, legendary: 3 };
/** פריטים אקראיים לפי דרגה: בוטים מוקדמים לובשים פריטים צנועים, המתקדמים — אגדיים */
const ids = (slot, tier) => WEARABLES[slot].filter((w) => RARITY_RANK[w.rarity] <= Math.min(3, tier + 1)).map((w) => w.id);
const AURA_BY_TIER = [['aura_none'], ['aura_none', 'aura_golden_sparks'], ['aura_golden_sparks', 'aura_fire_ring'], ['aura_fire_ring', 'aura_cosmic_lightning'], ['aura_cosmic_lightning', 'aura_fire_ring']];

/** דירוג (Elo משוער): 400 באי 1 → 2400 באי 99. איי הפרימיום: 1100 → 2430 (כל אחד ברמה משלו) */
export const ratingOf = (id) => (id <= BASE_ISLANDS ? Math.round(400 + ((id - 1) / (BASE_ISLANDS - 1)) * 2000) : Math.round(1100 + (id - PREMIUM_FIRST) * 46));
/** חוזק המנוע 0..1 */
export const strengthOf = (id) => (id <= BASE_ISLANDS ? (id - 1) / (BASE_ISLANDS - 1) : Math.min(1, (ratingOf(id) - 400) / 2000));
/** דרגת קושי לתצוגה */
export const TIERS = [
  { min: 0, he: 'מתחיל', en: 'Beginner', color: '#8fe3a0' },
  { min: 700, he: 'חובב', en: 'Novice', color: '#9fd8ff' },
  { min: 1000, he: 'בינוני', en: 'Intermediate', color: '#ffe17a' },
  { min: 1350, he: 'מתקדם', en: 'Advanced', color: '#ffb36b' },
  { min: 1700, he: 'מומחה', en: 'Expert', color: '#ff8a96' },
  { min: 2050, he: 'רב-אמן', en: 'Master', color: '#c77dff' },
];
export const tierOf = (rating) => TIERS.reduce((acc, t) => (rating >= t.min ? t : acc), TIERS[0]);
/** פרס יהלומים: כיבוש ראשון / ניצחון חוזר */
export const conquestGems = (id) => 40 + id * 2 + (isBoss(id) ? 60 : 0);
export const repeatGems = (id) => 10 + Math.round(id * 0.8);
/** מחירי החנות: בוט שנכבש (גר באי המרכזי ומשחק נגדך) / הצבע הייחודי של החיה שלו */
export const residentPrice = (id) => 120 + id * 4 + (isBoss(id) ? 150 : 0);
export const petColorPrice = (id) => 90 + id * 3;

const cache = new Map();
let built = false;
function buildAll() {
  if (built) return;
  built = true;
  const used = new Set();
  for (let id = 1; id <= ISLAND_COUNT; id++) {
    const r = rng(id * 7919 + 13);
    const region = regionOf(id);
    const idx = id <= BASE_ISLANDS ? (id - 1) % 10 : (id - PREMIUM_FIRST) % 10;
    const boss = isBoss(id);
    const [placeHe, placeEn] = PLACES[region][idx];
    const [nameHe, nameEn, gender] = NAMES[id - 1];
    const titles = TITLES[region];
    const tt = boss ? titles[5] : titles[(id * 3 + idx) % 5];
    const tier = Math.min(4, Math.floor(strengthOf(id) * 5));
    const style = REGION_STYLE[region];
    let loadout, pet, hue, key, tries = 0;
    do {
      const sig = (slot) => (r() < (boss ? 1 : 0.62) ? pick(r, style[slot]) : pick(r, ids(slot, tier)));
      const auras = AURA_BY_TIER[Math.min(4, tier + (boss ? 1 : 0))];
      loadout = { head: sig('head'), armor: sig('armor'), weapon: sig('weapon'), aura: boss ? auras[auras.length - 1] : pick(r, auras) };
      // הבוס של כל אזור בולט: כתר מלכותי באזורים הראשונים והילה מרשימה
      if (boss && region <= 4) loadout.head = 'crown_gold';
      pet = r() < 0.7 ? pick(r, REGION_PETS[region]) : pick(r, BOT_PET_IDS);
      hue = Math.round(r() * 12) / 12;
      key = `${loadout.head}|${loadout.armor}|${loadout.weapon}|${loadout.aura}|${pet}|${hue}`;
    } while (used.has(key) && ++tries < 40);
    used.add(key);
    const look = { skin: pick(r, SKIN), hair: pick(r, HAIR), cloth: pick(r, CLOTH[region]) };
    const emblems = ['crown', 'shield', 'swords', 'star', 'castle', 'fire', 'gem', 'rook', 'knight', 'dragon'];
    cache.set(id, {
      id, region, eraId: region, boss, era: eraOf(id),
      place: { he: placeHe, en: placeEn },
      bot: {
        name: { he: nameHe, en: nameEn }, gender,
        title: { he: gender === 'f' ? tt[1] : tt[0], en: tt[2] },
        rating: ratingOf(id), strength: strengthOf(id), emblem: boss ? 'crown' : pick(r, emblems),
        look, loadout, pet, petHue: pet === 'cyber_fox' || pet === 'crystal_unicorn' ? hue * 0.6 : hue, petScale: boss ? 1.12 : 0.92 + r() * 0.14,
      },
      reward: conquestGems(id),
    });
  }
}

/** @returns {object|null} הגדרת אי 1..99 (או null) */
export function islandDef(id) {
  buildAll();
  return cache.get(id) || null;
}
export const allIslands = () => { buildAll(); return [...cache.values()]; };
