/**
 * לכל אי עידן משלו: שם, אקלים ומונומנט.
 * 10 העולמות (האזורים) קובעים את ערכת התפאורה סביב הלוח; כל אי בתוך העולם הוא עידן/תרבות אחרת,
 * עם אקלים (שמיים, תאורה ומזג אוויר) ומונומנט ייחודי — שהוא גם החלק שמצטרף לאי המרכזי אחרי הכיבוש.
 * [עברית, English, אקלים, מונומנט]
 */
const HUB_ID = 1; // בלי ייבוא מ-Islands.js (כדי למנוע תלות מעגלית)

const E = {
  // 1 — פרה-היסטוריה
  2: ['גילוי האש', 'Dawn of Fire', 'dusk', 'fireRing'],
  3: ['עידן הקרח', 'Ice Age', 'snow', 'mammoth'],
  4: ['ציירי המערות', 'Cave Painters', 'day', 'caveArch'],
  5: ['עמק הדינוזאורים', 'Dino Valley', 'jungle', 'dinoSkeleton'],
  6: ['שבט הר הגעש', 'Volcano Tribe', 'embers', 'volcano'],
  7: ['כפר הכלונסאות', 'Stilt Village', 'rain', 'stiltHut'],
  8: ['חורשת הטוטמים', 'Totem Grove', 'fog', 'totem'],
  9: ['תקופת הברונזה', 'Bronze Age', 'day', 'forge'],
  10: ['סטונהנג׳', 'Stonehenge', 'fog', 'stonehenge'],
  // 2 — העולם הקלאסי
  11: ['כרתים המינואית', 'Minoan Crete', 'day', 'bullHorns'],
  12: ['אתונה', 'Athens', 'day', 'parthenon'],
  13: ['ספרטה', 'Sparta', 'dusk', 'helmetStatue'],
  14: ['אולימפיה', 'Olympia', 'day', 'torch'],
  15: ['טרויה', 'Troy', 'desert', 'trojanHorse'],
  16: ['אלכסנדריה', 'Alexandria', 'day', 'lighthouse'],
  17: ['קרתגו', 'Carthage', 'desert', 'elephant'],
  18: ['פומפיי', 'Pompeii', 'embers', 'vesuvius'],
  19: ['ביזנטיון', 'Byzantium', 'golden', 'byzDome'],
  20: ['רומא הקיסרית', 'Imperial Rome', 'day', 'colosseum'],
  // 3 — ימי הביניים והרנסנס
  21: ['קמלוט', 'Camelot', 'day', 'swordStone'],
  22: ['מבצר האבירים', 'Knights’ Keep', 'dusk', 'keep'],
  23: ['אל-אנדלוס', 'Al-Andalus', 'golden', 'moorishArch'],
  24: ['הרמה הסקוטית', 'Highlands', 'rain', 'highlandTower'],
  25: ['פראג הגותית', 'Gothic Prague', 'fog', 'gothicSpire'],
  26: ['ונציה', 'Venice', 'day', 'rialto'],
  27: ['פירנצה של הרנסנס', 'Renaissance Florence', 'golden', 'duomo'],
  28: ['הסדנה של לאונרדו', 'Da Vinci’s Workshop', 'day', 'ornithopter'],
  29: ['פיזה', 'Pisa', 'day', 'leaningTower'],
  30: ['ממלכת הכתר', 'Crown Kingdom', 'dusk', 'grandCastle'],
  // 4 — עידן התעשייה
  31: ['לונדון של הקיטור', 'Steam London', 'fog', 'clockTower'],
  32: ['המערב הפרוע', 'Wild West', 'desert', 'waterTower'],
  33: ['פריז 1889', 'Paris 1889', 'day', 'latticeTower'],
  34: ['מסילת הברזל', 'Iron Railroad', 'smog', 'locomotive'],
  35: ['עיר השעונים', 'Clockwork City', 'golden', 'gearTower'],
  36: ['נמל הצפלינים', 'Zeppelin Port', 'day', 'zeppelin'],
  37: ['הבהלה לזהב', 'Gold Rush', 'desert', 'mineCart'],
  38: ['מעבדת החשמל', 'Electric Lab', 'storm', 'teslaCoil'],
  39: ['ניו יורק 1920', 'Jazz Age New York', 'night', 'decoSkyscraper'],
  40: ['מצודת הברזל', 'Iron Citadel', 'smog', 'factory'],
  // 5 — העתיד
  41: ['טוקיו 2099', 'Neo Tokyo 2099', 'rainNight', 'neonTower'],
  42: ['המושבה במאדים', 'Mars Colony', 'marsDust', 'marsDome'],
  43: ['תחנת החלל', 'Orbital Station', 'stars', 'orbitalRing'],
  44: ['מפעל הרובוטים', 'Robot Foundry', 'smog', 'giantRobot'],
  45: ['שוק ההולוגרמות', 'Holo Bazaar', 'night', 'holoTree'],
  46: ['המעבדה הארקטית', 'Arctic Lab', 'snow', 'radarDish'],
  47: ['מדבר השמש', 'Solar Desert', 'desert', 'solarTower'],
  48: ['עיר הריחוף', 'Hover City', 'day', 'floatingCity'],
  49: ['הרשת הווירטואלית', 'Virtual Grid', 'night', 'dataCube'],
  50: ['ליבת הבינה', 'AI Core', 'stars', 'aiCore'],
  // 6 — המזרח הרחוק
  51: ['אדו היפנית', 'Edo Japan', 'blossom', 'torii'],
  52: ['קיוטו', 'Kyoto', 'autumn', 'pagoda'],
  53: ['החומה הגדולה', 'Great Wall', 'fog', 'greatWall'],
  54: ['העיר האסורה', 'Forbidden City', 'golden', 'chineseGate'],
  55: ['ערבות מונגוליה', 'Mongol Steppe', 'day', 'yurt'],
  56: ['קוריאה של ג׳וסון', 'Joseon Korea', 'blossom', 'bellPavilion'],
  57: ['דרך המשי', 'Silk Road', 'desert', 'camel'],
  58: ['אנגקור', 'Angkor', 'jungle', 'khmerTemple'],
  59: ['מנזר ההימלאיה', 'Himalaya Monastery', 'snow', 'stupa'],
  60: ['טירת השוגון', 'Shogun Castle', 'blossom', 'japaneseCastle'],
  // 7 — המזרח הקדום ומצרים
  61: ['שומר', 'Sumer', 'desert', 'ziggurat'],
  62: ['בבל', 'Babylon', 'golden', 'ishtarGate'],
  63: ['עמק הנילוס', 'Nile Valley', 'day', 'obelisk'],
  64: ['הספינקס של גיזה', 'Sphinx of Giza', 'desert', 'sphinx'],
  65: ['עמק המלכים', 'Valley of the Kings', 'night', 'rockTemple'],
  66: ['פרספוליס', 'Persepolis', 'golden', 'persianColumns'],
  67: ['פטרה', 'Petra', 'dusk', 'petraFacade'],
  68: ['נוביה', 'Nubia', 'desert', 'nubianPyramids'],
  69: ['פניקיה', 'Phoenicia', 'day', 'tradeShip'],
  70: ['הפירמידה הגדולה', 'Great Pyramid', 'desert', 'pyramid'],
  // 8 — הצפון
  71: ['גבעות הרונות', 'Rune Hills', 'fog', 'runeStone'],
  72: ['כפר הפיורד', 'Fjord Village', 'snow', 'longhouse'],
  73: ['נמל הספינות הארוכות', 'Longship Harbor', 'day', 'longship'],
  74: ['מעגל הדרואידים', 'Druid Circle', 'fog', 'druidOak'],
  75: ['יער העורבים', 'Raven Woods', 'dusk', 'ravenTotem'],
  76: ['היכל הדבש', 'Mead Hall', 'snowNight', 'meadHall'],
  77: ['טונדרת הזוהר', 'Aurora Tundra', 'aurora', 'iceSpires'],
  78: ['ארץ הגייזרים', 'Geyser Land', 'fog', 'geyser'],
  79: ['פסגת הרעם', 'Thunder Peak', 'storm', 'hammer'],
  80: ['ולהאלה', 'Valhalla', 'aurora', 'valhallaGate'],
  // 9 — הים והאגדות
  81: ['ממלכת האלמוגים', 'Coral Kingdom', 'underwater', 'coralPalace'],
  82: ['ארמון הפנינים', 'Pearl Palace', 'underwater', 'giantShell'],
  83: ['מפרץ הפיראטים', 'Pirate Cove', 'day', 'pirateShip'],
  84: ['למוריה האבודה', 'Lost Lemuria', 'jungle', 'sunkenTemple'],
  85: ['מעמקי הנאוטילוס', 'Nautilus Deep', 'underwater', 'submarine'],
  86: ['תהום הקראקן', 'Kraken Abyss', 'storm', 'kraken'],
  87: ['לגונת הסירנות', 'Siren Lagoon', 'dusk', 'sirenRock'],
  88: ['מפרץ הספינות הטרופות', 'Shipwreck Bay', 'fog', 'shipwreck'],
  89: ['מקדש הקלשון', 'Trident Temple', 'underwater', 'tridentStatue'],
  90: ['אטלנטיס השקועה', 'Sunken Atlantis', 'underwater', 'atlantisDome'],
  // 10 — השמיים
  91: ['גני הערפילית', 'Nebula Gardens', 'stars', 'crystalTree'],
  92: ['נמל השביטים', 'Comet Harbor', 'stars', 'comet'],
  93: ['ארמון הזוהר', 'Aurora Palace', 'aurora', 'crystalPalace'],
  94: ['מקדש ההילה', 'Halo Temple', 'golden', 'haloTemple'],
  95: ['מקדש הירח', 'Moon Temple', 'night', 'moonShrine'],
  96: ['ארמון השמש', 'Sun Palace', 'golden', 'sunDisc'],
  97: ['מצפה הכוכבים', 'Star Observatory', 'stars', 'orrery'],
  98: ['גשר הקשת', 'Rainbow Bridge', 'aurora', 'rainbowArch'],
  99: ['האולימפוס', 'Mount Olympus', 'golden', 'olympusTemple'],
};

/** צבע הקרקע של החלק שמצטרף לאי המרכזי (ושל האי במפה) לפי האקלים */
export const GROUND = {
  day: 0x6aa04a, dusk: 0x7a8a3a, snow: 0xeef3f8, snowNight: 0xd8e2ee, rain: 0x4f8a46, desert: 0xe2c68a, fog: 0x7e9a72, night: 0x2f5a3e,
  blossom: 0x8ab06a, autumn: 0xc8883a, embers: 0x4a3a34, aurora: 0xcfe4ea, underwater: 0x6ad0c0, storm: 0x45704a, jungle: 0x2f8a3a,
  golden: 0xc8c070, stars: 0x5a4a8a, smog: 0x7a7060, rainNight: 0x2a3a4a, marsDust: 0xc8603a,
};

/** העידן של אי: { he, en, climate, monument }. האי המרכזי הוא מוזיאון הזמן */
export function eraOf(id) {
  if (id === HUB_ID) return { id, he: 'מוזיאון הזמן', en: 'Time Museum', climate: 'day', monument: null };
  const e = E[id];
  return e ? { id, he: e[0], en: e[1], climate: e[2], monument: e[3] } : { id, he: '', en: '', climate: 'day', monument: 'fireRing' };
}
