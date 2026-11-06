/**
 * 10 העידנים של "שחמט העידנים" — 5 בסיסיים + 5 עידני פרימיום.
 * כל עידן = 2 שלבי בנייה. כאן מוגדרים שמות, צבעי שמיים/תאורה, פרופיל סאונד,
 * סגנון כס המלכות וציוד היריב הממוחשב בעידן.
 */
export const ERAS = [
  {
    id: 1, key: 'stone', name: 'עידן האבן', en: 'Stone Age', premium: false,
    stageNames: ['מדורת השבט', 'מעגל המונוליתים'],
    materials: 'אבן גיר מסותתת ועץ אלון כהה',
    thinking: 'מתבונן בגחלי המדורה…',
    stageNamesEn: ['Tribal Bonfire', 'Monolith Circle'], materialsEn: 'Hewn limestone and dark oak', thinkingEn: 'Gazing into the bonfire embers…',
    palette: {
      skyTop: 0x1d1838, skyMid: 0x7a4766, skyHorizon: 0xf4a259, skyBottom: 0x3b2418,
      sunDir: [-0.55, 0.16, -0.82], sunGlow: 0xffb36b, nebula: 0, stars: 0.3,
      key: 0xffc48a, keyIntensity: 2.3, keyDir: [0.5, 0.85, 0.45],
      hemiSky: 0xffd8b0, hemiGround: 0x40301e, hemiIntensity: 0.85,
      fog: 0x9d6553, fogNear: 55, fogFar: 170, exposure: 1.05, env: 0.55, ground: 0x5d8a3a,
    },
    opponent: { head: 'crown_starter', armor: 'tunic_starter', weapon: 'staff_wood', aura: 'aura_none', pet: 'wolf_cub' },
  },
  {
    id: 2, key: 'classical', name: 'האימפריה הקלאסית', en: 'Classical Empire', premium: false,
    stageNames: ['חצר השיש והעמודים', 'אמות המים והמזרקות'],
    materials: 'שיש קרארה מלוטש וברונזה בוהקת',
    thinking: 'שוקל את צעדו כמו קיסר בסנאט…',
    stageNamesEn: ['Marble Colonnade Court', 'Aqueducts & Fountains'], materialsEn: 'Polished Carrara marble and gleaming bronze', thinkingEn: 'Weighing the move like an emperor in the Senate…',
    palette: {
      skyTop: 0x2f6fd0, skyMid: 0x76aee8, skyHorizon: 0xf6e7c8, skyBottom: 0x8aa0b8,
      sunDir: [0.35, 0.55, -0.75], sunGlow: 0xfff3d6, nebula: 0, stars: 0,
      key: 0xfff1dc, keyIntensity: 3.0, keyDir: [0.45, 0.9, 0.35],
      hemiSky: 0xdfeeff, hemiGround: 0x8d7d5e, hemiIntensity: 1.0,
      fog: 0xcbdbea, fogNear: 70, fogFar: 230, exposure: 1.0, env: 0.9, ground: 0x6fa344,
    },
    opponent: { head: 'helm_spartan', armor: 'cape_royal_velvet', weapon: 'scepter_diamond', aura: 'aura_none', pet: 'royal_owl' },
  },
  {
    id: 3, key: 'medieval', name: 'ימי הביניים', en: 'Medieval Kingdom', premium: false,
    stageNames: ['חומות המבצר', 'מגדלי השמירה'],
    materials: 'אבן אובסידיאן, כסף מוברש וזהב מרוקע',
    thinking: 'מתכנן מצור על המלך שלך…',
    stageNamesEn: ['Fortress Walls', 'Watchtowers'], materialsEn: 'Obsidian stone, brushed silver and hammered gold', thinkingEn: 'Planning a siege on your king…',
    palette: {
      skyTop: 0x1c1438, skyMid: 0x5a3a7c, skyHorizon: 0xf7c46c, skyBottom: 0x2b1d2e,
      sunDir: [0.65, 0.12, -0.75], sunGlow: 0xffc27a, nebula: 0, stars: 0.2,
      key: 0xffcf8f, keyIntensity: 2.1, keyDir: [-0.4, 0.8, 0.5],
      hemiSky: 0xc8b6ff, hemiGround: 0x2b2030, hemiIntensity: 0.75,
      fog: 0x6f5170, fogNear: 55, fogFar: 180, exposure: 1.05, env: 0.7, ground: 0x4f7a36,
    },
    opponent: { head: 'crown_gold', armor: 'armor_paladin', weapon: 'sword_excalibur', aura: 'aura_none', pet: 'armor_steed' },
  },
  {
    id: 4, key: 'industrial', name: 'עידן התעשייה', en: 'Industrial Age', premium: false,
    stageNames: ['קשתות הברזל והזכוכית', 'מגדל השעון'],
    materials: 'נחושת מוברשת, מהגוני כהה וגלגלי פלדה',
    thinking: 'גלגלי השיניים מסתובבים במוחו…',
    stageNamesEn: ['Iron & Glass Arcades', 'The Clock Tower'], materialsEn: 'Brushed copper, dark mahogany and steel gears', thinkingEn: 'Gears turning in its mind…',
    palette: {
      skyTop: 0x2a2420, skyMid: 0x6e5440, skyHorizon: 0xe3a463, skyBottom: 0x3a2d22,
      sunDir: [-0.4, 0.14, -0.9], sunGlow: 0xffb36b, nebula: 0, stars: 0,
      key: 0xffc58a, keyIntensity: 1.9, keyDir: [0.35, 0.8, 0.5],
      hemiSky: 0xffdcb4, hemiGround: 0x2c2219, hemiIntensity: 0.8,
      fog: 0x80654f, fogNear: 45, fogFar: 150, exposure: 1.08, env: 0.65, ground: 0x56713a,
    },
    opponent: { head: 'crown_gold', armor: 'cape_royal_velvet', weapon: 'scepter_diamond', aura: 'aura_golden_sparks', pet: 'mythic_griffin' },
  },
  {
    id: 5, key: 'cyber', name: 'עיר הסייבר העתידנית', en: 'Cyber Citadel', premium: false,
    stageNames: ['מגדלי הניאון וגשרי הלייזר', 'טבעות הולוגרמה וכיפת אנרגיה'],
    materials: 'זכוכית כהה וכלי אנרגיה זוהרים',
    thinking: 'מחשב מיליוני עתידים אפשריים…',
    stageNamesEn: ['Neon Towers & Laser Bridges', 'Hologram Rings & Energy Dome'], materialsEn: 'Dark glass and glowing energy pieces', thinkingEn: 'Computing millions of possible futures…',
    palette: {
      skyTop: 0x01020a, skyMid: 0x0a0f2e, skyHorizon: 0x3b1d70, skyBottom: 0x05030c,
      sunDir: [0.25, 0.42, -0.87], sunGlow: 0x9fb8ff, nebula: 0.25, stars: 1,
      key: 0x8fb4ff, keyIntensity: 1.0, keyDir: [0.3, 0.9, 0.4],
      hemiSky: 0x3a5cff, hemiGround: 0x12081e, hemiIntensity: 0.65,
      fog: 0x0b0d24, fogNear: 55, fogFar: 190, exposure: 1.15, env: 0.6, ground: 0x1f3a3a,
    },
    opponent: { head: 'visor_cyber', armor: 'robe_celestial', weapon: 'trident_atlantis', aura: 'aura_cosmic_lightning', pet: 'cyber_fox' },
  },
  {
    id: 6, key: 'samurai', name: 'אימפריית הסמוראים', en: 'Samurai Dynasty', premium: true,
    stageNames: ['שערי טוריי וגשר העץ', 'טירת הפגודה והדובדבן'],
    materials: 'ירקן ולכה אדומה-זהובה',
    thinking: 'מודט כמו שוגון לפני הקרב…',
    stageNamesEn: ['Torii Gates & Wooden Bridge', 'Pagoda Castle & Cherry Blossoms'], materialsEn: 'Jade and red-gold lacquer', thinkingEn: 'Meditating like a shogun before battle…',
    palette: {
      skyTop: 0x3a2f5c, skyMid: 0xd88aa0, skyHorizon: 0xffd2a1, skyBottom: 0x5a4050,
      sunDir: [0.5, 0.2, -0.84], sunGlow: 0xffd9c0, nebula: 0, stars: 0.05,
      key: 0xffe2c8, keyIntensity: 2.4, keyDir: [0.45, 0.85, 0.4],
      hemiSky: 0xffd9e6, hemiGround: 0x4a3a30, hemiIntensity: 0.9,
      fog: 0xe0a8b0, fogNear: 55, fogFar: 180, exposure: 1.0, env: 0.75, ground: 0x6b9a48,
    },
    opponent: { head: 'helm_samurai', armor: 'armor_shogun', weapon: 'sword_excalibur', aura: 'aura_none', pet: 'fire_dragon' },
  },
  {
    id: 7, key: 'egypt', name: 'ממלכת הפרעונים', en: 'Pharaohs Kingdom', premium: true,
    stageNames: ['חצר האובליסקים', 'הפירמידות ושומרי אנוביס'],
    materials: 'לאפיס לזולי וזהב מלוטש',
    thinking: 'קורא את ההירוגליפים של העתיד…',
    stageNamesEn: ['Obelisk Courtyard', 'Pyramids & Anubis Guardians'], materialsEn: 'Lapis lazuli and polished gold', thinkingEn: 'Reading the hieroglyphs of the future…',
    palette: {
      skyTop: 0x2c6bb8, skyMid: 0x8ec0e8, skyHorizon: 0xffe2a8, skyBottom: 0xc89a60,
      sunDir: [-0.3, 0.5, -0.81], sunGlow: 0xfff0c8, nebula: 0, stars: 0,
      key: 0xfff0d0, keyIntensity: 3.1, keyDir: [0.4, 0.92, 0.3],
      hemiSky: 0xfff3dd, hemiGround: 0xb08850, hemiIntensity: 1.0,
      fog: 0xe8d2a8, fogNear: 65, fogFar: 210, exposure: 0.98, env: 0.85, ground: 0xd8b878,
    },
    opponent: { head: 'crown_pharaoh', armor: 'robe_celestial', weapon: 'scepter_diamond', aura: 'aura_golden_sparks', pet: 'golden_phoenix' },
  },
  {
    id: 8, key: 'viking', name: 'מצודת ולהאלה', en: 'Valhalla Fortress', premium: true,
    stageNames: ['אולם הוויקינגים ואבני הרונות', 'כס אודין והזוהר הצפוני'],
    materials: 'ברזל נורדי מגולף וגבישי כפור',
    thinking: 'מתייעץ עם העורבים של אודין…',
    stageNamesEn: ['Viking Hall & Runestones', 'Odin\'s Throne & Northern Lights'], materialsEn: 'Carved Norse iron and frost crystals', thinkingEn: 'Consulting Odin\'s ravens…',
    palette: {
      skyTop: 0x050a1c, skyMid: 0x13284a, skyHorizon: 0x4a7a9a, skyBottom: 0x0a1420,
      sunDir: [0.3, 0.3, -0.9], sunGlow: 0xbfd8ff, nebula: 0, stars: 0.85,
      key: 0xbfd8ff, keyIntensity: 1.5, keyDir: [0.4, 0.85, 0.4],
      hemiSky: 0xa8c8ff, hemiGround: 0x1a2430, hemiIntensity: 0.8,
      fog: 0x2a3e58, fogNear: 45, fogFar: 160, exposure: 1.1, env: 0.7, ground: 0xdfe8f0,
    },
    opponent: { head: 'helm_spartan', armor: 'armor_paladin', weapon: 'sword_excalibur', aura: 'aura_cosmic_lightning', pet: 'mythic_griffin' },
  },
  {
    id: 9, key: 'atlantis', name: 'אטלנטיס השקועה', en: 'Sunken Atlantis', premium: true,
    stageNames: ['עמודי האלמוגים הזוהרים', 'קלשון פוסידון וכיפת האור'],
    materials: 'גביש אקוומרין ופנינים',
    thinking: 'מקשיב לזרמי האוקיינוס…',
    stageNamesEn: ['Glowing Coral Pillars', 'Poseidon\'s Trident & Dome of Light'], materialsEn: 'Aquamarine crystal and pearls', thinkingEn: 'Listening to the ocean currents…',
    palette: {
      skyTop: 0x021a33, skyMid: 0x064a6e, skyHorizon: 0x0e8a9a, skyBottom: 0x01101e,
      sunDir: [0.1, 0.9, -0.4], sunGlow: 0x9fe8ff, nebula: 0, stars: 0,
      key: 0x9fe8ff, keyIntensity: 1.7, keyDir: [0.2, 0.95, 0.25],
      hemiSky: 0x6fd8ff, hemiGround: 0x0a2a3a, hemiIntensity: 0.9,
      fog: 0x0a4a66, fogNear: 30, fogFar: 120, exposure: 1.12, env: 0.7, ground: 0x7aa08a,
    },
    opponent: { head: 'crown_gold', armor: 'robe_celestial', weapon: 'trident_atlantis', aura: 'aura_golden_sparks', pet: 'crystal_unicorn' },
  },
  {
    id: 10, key: 'celestial', name: 'מקדש האלים השמימי', en: 'Celestial Pantheon', premium: true,
    stageNames: ['איי השיש האסטרליים', 'שמשות מסתובבות ונבולה'],
    materials: 'אור כוכבים לבן-זהוב על זכוכית קוסמית',
    thinking: 'שוזר את מסלולי הכוכבים…',
    stageNamesEn: ['Astral Marble Isles', 'Orbiting Suns & Nebula'], materialsEn: 'White-gold starlight on cosmic glass', thinkingEn: 'Weaving the paths of the stars…',
    palette: {
      skyTop: 0x05010f, skyMid: 0x2a0c4a, skyHorizon: 0x7a3aa0, skyBottom: 0x0a0420,
      sunDir: [0.0, 0.35, -0.94], sunGlow: 0xffe6b0, nebula: 1, stars: 1,
      key: 0xfff6e0, keyIntensity: 1.6, keyDir: [0.35, 0.85, 0.4],
      hemiSky: 0xd0c0ff, hemiGround: 0x1a1030, hemiIntensity: 0.8,
      fog: 0x1a0c33, fogNear: 65, fogFar: 230, exposure: 1.1, env: 0.75, ground: 0x2a2240,
    },
    opponent: { head: 'crown_gold', armor: 'robe_celestial', weapon: 'scepter_diamond', aura: 'aura_cosmic_lightning', pet: 'golden_phoenix' },
  },
];

export const TOTAL_STAGES = ERAS.length * 2;
export const getEra = (id) => ERAS[Math.min(ERAS.length, Math.max(1, id)) - 1];
/** מספר השלב הגלובלי (1..20) של שלב idx (0/1) בעידן */
export const stageNumber = (eraId, idx) => (eraId - 1) * 2 + idx + 1;
export const eraOfStage = (stage) => Math.min(ERAS.length, Math.max(1, Math.ceil(stage / 2)));
