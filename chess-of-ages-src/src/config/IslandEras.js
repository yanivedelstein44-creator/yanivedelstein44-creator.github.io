/**
 * לכל אי עידן משלו: שם, אקלים ומונומנט (1–99 חינם, 100–129 איי הפרימיום).
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
  // ===== איי הפרימיום (100–129): לכל אחד אקלים, לוח, מונומנט ותפאורה מונפשת משלו =====
  // 11 — ממלכות הפלא
  100: ['ממלכת המגנטים המרחפים', 'Floating Magnets', 'magnetic', 'xMagnet'],
  101: ['ארמון קרח הזכוכית', 'Glass Ice Palace', 'glassIce', 'xGlassIce'],
  102: ['מצוקי הבזלת המותכת', 'Molten Basalt Cliffs', 'basalt', 'xBasalt'],
  103: ['מועדון הוויניל', 'Vinyl Lounge', 'vinyl', 'xVinyl'],
  104: ['היער הלוחש', 'Whispering Woods', 'whisper', 'xWhisperTree'],
  105: ['שער אטלנטיס', 'Atlantis Gate', 'abyssal', 'xAtlantisGate'],
  106: ['מגדל השעונים', 'Clockwork Tower', 'clockwork', 'xClockTower'],
  107: ['ממלכת הממתקים', 'Candy Kingdom', 'candy', 'xCandy'],
  108: ['ממד המראות', 'Mirror Dimension', 'mirror', 'xMirror'],
  109: ['דיונות אור הכוכבים', 'Starlight Dunes', 'starDune', 'xStarDune'],
  // 12 — ממלכות החלום
  110: ['מעבדת הסייבר', 'Cyber Lab', 'cyberLab', 'xCyberLab'],
  111: ['הספרייה המרחפת', 'Floating Library', 'library', 'xLibrary'],
  112: ['ענן הסערה', 'Storm Cloud', 'stormCloud', 'xStormCloud'],
  113: ['דיו ומשי', 'Ink & Silk', 'ink', 'xInkBrush'],
  114: ['שוניות הפיראטים', 'Pirate Reefs', 'reef', 'xPirateReef'],
  115: ['כוורת הזהב', 'Golden Hive', 'hive', 'xHive'],
  116: ['גן הפסלים', 'Statue Garden', 'marbleDay', 'xStatue'],
  117: ['חגורת האסטרואידים', 'Asteroid Belt', 'space', 'xAsteroid'],
  118: ['עמק הגייזרים', 'Geyser Valley', 'geyser', 'xGeyser'],
  119: ['יער הפטריות הזוהרות', 'Glowshroom Forest', 'mushroom', 'xMushroom'],
  // 13 — ממלכות הזניט
  120: ['ארמון הפורצלן', 'Porcelain Palace', 'porcelain', 'xPorcelainVase'],
  121: ['חדר הצעצועים', 'Toy Room', 'toy', 'xToyBlocks'],
  122: ['שדות החיטה', 'Wheat Fields', 'wheat', 'xWindmill'],
  123: ['זיכרונות בספיה', 'Sepia Memories', 'sepia', 'xSepiaCamera'],
  124: ['טירת קורי העכביש', 'Cobweb Castle', 'cobweb', 'xCobweb'],
  125: ['גשר הנהר הגועש', 'Raging River Bridge', 'rapids', 'xRiverBridge'],
  126: ['טונדרת השלג', 'Snow Tundra', 'tundra', 'xIgloo'],
  127: ['עולם התאים', 'Micro Cell World', 'cell', 'xCell'],
  128: ['מעגל הרונות', 'Rune Circle', 'rune', 'xRuneCircle'],
  129: ['פסגת הזניט', 'Zenith Summit', 'zenith', 'xZenith'],
};

/** צבע הקרקע של החלק שמצטרף לאי המרכזי (ושל האי במפה) לפי האקלים */
export const GROUND = {
  day: 0x6aa04a, dusk: 0x7a8a3a, snow: 0xeef3f8, snowNight: 0xd8e2ee, rain: 0x4f8a46, desert: 0xe2c68a, fog: 0x7e9a72, night: 0x2f5a3e,
  blossom: 0x8ab06a, autumn: 0xc8883a, embers: 0x4a3a34, aurora: 0xcfe4ea, underwater: 0x6ad0c0, storm: 0x45704a, jungle: 0x2f8a3a,
  golden: 0xc8c070, stars: 0x5a4a8a, smog: 0x7a7060, rainNight: 0x2a3a4a, marsDust: 0xc8603a,
  // איי הפרימיום
  magnetic: 0x5a6474, glassIce: 0xdff2fa, basalt: 0x2e2e32, vinyl: 0x3a2a3a, whisper: 0x3a6a2e, abyssal: 0x5ab8a8,
  clockwork: 0x8a6a3a, candy: 0xffc8e0, mirror: 0xc8ccd8, starDune: 0x9a78c8, cyberLab: 0x2a3a4a, library: 0x8a6a48,
  stormCloud: 0x6a7480, ink: 0xe8e2d4, reef: 0xe8d8b0, hive: 0xd8a83a, marbleDay: 0xd8dcd0, space: 0x3a3a5a,
  geyser: 0xc8885a, mushroom: 0x3a5a3a, porcelain: 0xe8eef8, toy: 0x7ac85a, wheat: 0xd8c070, sepia: 0xa88a5a,
  cobweb: 0x3a3a40, rapids: 0x4a7a4a, tundra: 0xeef4fa, cell: 0xe8a8c8, rune: 0x4a4a42, zenith: 0xf0f4fa,
};

/** העידן של אי: { he, en, climate, monument }. האי המרכזי הוא מוזיאון הזמן */
export function eraOf(id) {
  if (id === HUB_ID) return { id, he: 'מוזיאון הזמן', en: 'Time Museum', climate: 'day', monument: null };
  const e = E[id];
  return e ? { id, he: e[0], en: e[1], climate: e[2], monument: e[3] } : { id, he: '', en: '', climate: 'day', monument: 'fireRing' };
}
