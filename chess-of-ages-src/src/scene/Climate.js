/**
 * אקלים לכל אי: פלטת שמיים/תאורה/ערפל (משולבת עם פלטת ערכת העולם) + מזג אוויר חלקיקי.
 * שלג, גשם, אבק, ערפל, גחליליות, עלי דובדבן, עלי שלכת, גחלים, בועות, נצנוצים, כוכבים, פיח, זוהר צפוני וברקים.
 * החלקיקים הם Points אחד לכל שכבה (קריאת ציור אחת), מתעדכנים במעבד — זול גם בטלפון.
 */
import * as THREE from 'three';

const TAU = Math.PI * 2;
// פלטות מלאות (אותם שדות כמו palette של העידנים)
const P = {
  day: { skyTop: 0x2f6fd0, skyMid: 0x6aa8ec, skyHorizon: 0xd2eaff, skyBottom: 0x8fb8d8, sunDir: [0.4, 0.55, -0.7], sunGlow: 0xfff2c8, nebula: 0, stars: 0, key: 0xfff4e0, keyIntensity: 2.6, keyDir: [0.5, 0.85, 0.4], hemiSky: 0xdfefff, hemiGround: 0x4a5a3a, hemiIntensity: 1.0, fog: 0xbcdcf4, fogNear: 60, fogFar: 190, exposure: 1.05, env: 0.6, ground: 0x5d8a3a },
  dusk: { skyTop: 0x1d1838, skyMid: 0x7a4766, skyHorizon: 0xf4a259, skyBottom: 0x3b2418, sunDir: [-0.55, 0.16, -0.82], sunGlow: 0xffb36b, nebula: 0, stars: 0.3, key: 0xffc48a, keyIntensity: 2.3, keyDir: [0.5, 0.85, 0.45], hemiSky: 0xffd8b0, hemiGround: 0x40301e, hemiIntensity: 0.85, fog: 0x9d6553, fogNear: 55, fogFar: 170, exposure: 1.05, env: 0.55, ground: 0x6a7a3a },
  snow: { skyTop: 0x8fa8c8, skyMid: 0xc8d8ec, skyHorizon: 0xeef4fb, skyBottom: 0xdde8f4, sunDir: [0.3, 0.4, -0.8], sunGlow: 0xffffff, nebula: 0, stars: 0, key: 0xeaf2ff, keyIntensity: 2.0, keyDir: [0.4, 0.9, 0.3], hemiSky: 0xf2f8ff, hemiGround: 0x8a9aaa, hemiIntensity: 1.15, fog: 0xe2ecf6, fogNear: 35, fogFar: 140, exposure: 1.0, env: 0.7, ground: 0xe8eef4 },
  snowNight: { skyTop: 0x0a1428, skyMid: 0x1a2a4a, skyHorizon: 0x4a6080, skyBottom: 0x101828, sunDir: [-0.3, 0.5, -0.8], sunGlow: 0xc8d8ff, nebula: 0, stars: 1, key: 0xb8c8ff, keyIntensity: 1.4, keyDir: [0.4, 0.9, 0.3], hemiSky: 0x8a9ac8, hemiGround: 0x20283a, hemiIntensity: 0.85, fog: 0x2a3a58, fogNear: 35, fogFar: 140, exposure: 1.1, env: 0.5, ground: 0xc8d4e4 },
  rain: { skyTop: 0x3a4656, skyMid: 0x5c6a7c, skyHorizon: 0x8c98a6, skyBottom: 0x4a5462, sunDir: [0.2, 0.5, -0.8], sunGlow: 0xc8d4e2, nebula: 0, stars: 0, key: 0xc8d4e2, keyIntensity: 1.6, keyDir: [0.4, 0.9, 0.3], hemiSky: 0xb8c4d2, hemiGround: 0x2a3038, hemiIntensity: 0.95, fog: 0x7e8a98, fogNear: 30, fogFar: 130, exposure: 1.05, env: 0.5, ground: 0x4a7a40 },
  rainNight: { skyTop: 0x05060f, skyMid: 0x141838, skyHorizon: 0x4a2a6a, skyBottom: 0x0a0a18, sunDir: [0.2, 0.4, -0.8], sunGlow: 0xff3ad8, nebula: 0.3, stars: 0.2, key: 0x9ab0ff, keyIntensity: 1.3, keyDir: [0.4, 0.9, 0.3], hemiSky: 0x6a5ab8, hemiGround: 0x0a0a1a, hemiIntensity: 0.8, fog: 0x1a1838, fogNear: 30, fogFar: 130, exposure: 1.15, env: 0.45, ground: 0x2a3040 },
  desert: { skyTop: 0x3a7ac8, skyMid: 0x8cb8e0, skyHorizon: 0xf6dcb0, skyBottom: 0xd8b888, sunDir: [0.3, 0.6, -0.7], sunGlow: 0xfff0c0, nebula: 0, stars: 0, key: 0xfff0d0, keyIntensity: 2.8, keyDir: [0.5, 0.85, 0.3], hemiSky: 0xfff0d8, hemiGround: 0x8a6a40, hemiIntensity: 1.0, fog: 0xe8d0a8, fogNear: 45, fogFar: 170, exposure: 1.05, env: 0.6, ground: 0xd8b880 },
  marsDust: { skyTop: 0x5a2a1a, skyMid: 0xa85a3a, skyHorizon: 0xf0b080, skyBottom: 0x8a4a2a, sunDir: [0.3, 0.5, -0.8], sunGlow: 0xffd0a0, nebula: 0, stars: 0.2, key: 0xffd0b0, keyIntensity: 2.2, keyDir: [0.5, 0.85, 0.3], hemiSky: 0xffc8a8, hemiGround: 0x5a2a1a, hemiIntensity: 0.95, fog: 0xc88060, fogNear: 35, fogFar: 140, exposure: 1.05, env: 0.5, ground: 0xb8603a },
  fog: { skyTop: 0x8a96a4, skyMid: 0xaab4c0, skyHorizon: 0xcfd6de, skyBottom: 0xb8c0ca, sunDir: [0.2, 0.5, -0.8], sunGlow: 0xf0f4f8, nebula: 0, stars: 0, key: 0xe8ecf0, keyIntensity: 1.5, keyDir: [0.4, 0.9, 0.3], hemiSky: 0xdde4ea, hemiGround: 0x5a6470, hemiIntensity: 1.1, fog: 0xc4ccd4, fogNear: 18, fogFar: 95, exposure: 1.0, env: 0.55, ground: 0x6a8a62 },
  night: { skyTop: 0x060a1e, skyMid: 0x101a3e, skyHorizon: 0x2a3a6e, skyBottom: 0x0a1024, sunDir: [-0.3, 0.5, -0.8], sunGlow: 0xaac4ff, nebula: 0.2, stars: 1, key: 0x9ab8ff, keyIntensity: 1.3, keyDir: [0.4, 0.9, 0.3], hemiSky: 0x5a6aa8, hemiGround: 0x101420, hemiIntensity: 0.75, fog: 0x14203e, fogNear: 40, fogFar: 150, exposure: 1.12, env: 0.45, ground: 0x2a4a34 },
  blossom: { skyTop: 0x6a9ae0, skyMid: 0xb8cff0, skyHorizon: 0xffe0ea, skyBottom: 0xf0c8d4, sunDir: [0.3, 0.55, -0.75], sunGlow: 0xfff0f4, nebula: 0, stars: 0, key: 0xfff0f0, keyIntensity: 2.4, keyDir: [0.5, 0.85, 0.35], hemiSky: 0xffe8f0, hemiGround: 0x6a5a5a, hemiIntensity: 1.05, fog: 0xf4d8e2, fogNear: 50, fogFar: 170, exposure: 1.05, env: 0.6, ground: 0x7aa060 },
  autumn: { skyTop: 0x4a6aa0, skyMid: 0xa0a8c0, skyHorizon: 0xf8d0a0, skyBottom: 0xc89a70, sunDir: [-0.4, 0.35, -0.8], sunGlow: 0xffd8a0, nebula: 0, stars: 0, key: 0xffd8a8, keyIntensity: 2.3, keyDir: [0.5, 0.8, 0.35], hemiSky: 0xffe0c0, hemiGround: 0x5a3a20, hemiIntensity: 0.95, fog: 0xe0b890, fogNear: 45, fogFar: 160, exposure: 1.05, env: 0.55, ground: 0x9a7a3a },
  embers: { skyTop: 0x1a0a0a, skyMid: 0x4a1a12, skyHorizon: 0xc84a1a, skyBottom: 0x2a0a06, sunDir: [-0.4, 0.2, -0.85], sunGlow: 0xff6a20, nebula: 0, stars: 0.1, key: 0xffa060, keyIntensity: 2.0, keyDir: [0.5, 0.85, 0.3], hemiSky: 0xff9a6a, hemiGround: 0x2a0a04, hemiIntensity: 0.8, fog: 0x5a2a1a, fogNear: 35, fogFar: 140, exposure: 1.1, env: 0.45, ground: 0x4a3a30 },
  aurora: { skyTop: 0x041020, skyMid: 0x0a2a3a, skyHorizon: 0x2a6a6a, skyBottom: 0x061418, sunDir: [-0.3, 0.5, -0.8], sunGlow: 0x7affc8, nebula: 0.6, stars: 1, key: 0xa8ffe0, keyIntensity: 1.3, keyDir: [0.4, 0.9, 0.3], hemiSky: 0x6ad8c0, hemiGround: 0x0a1418, hemiIntensity: 0.85, fog: 0x0e2a30, fogNear: 40, fogFar: 150, exposure: 1.12, env: 0.45, ground: 0xb8d4dc },
  underwater: { skyTop: 0x02223a, skyMid: 0x064a6a, skyHorizon: 0x1a8aa0, skyBottom: 0x022a3a, sunDir: [0.1, 0.95, -0.2], sunGlow: 0x8af0ff, nebula: 0, stars: 0, key: 0x9af0ff, keyIntensity: 1.8, keyDir: [0.2, 1, 0.1], hemiSky: 0x6ae0f0, hemiGround: 0x022030, hemiIntensity: 1.0, fog: 0x0a5a78, fogNear: 20, fogFar: 110, exposure: 1.08, env: 0.5, ground: 0x5ab8a8 },
  storm: { skyTop: 0x1a1e2a, skyMid: 0x2e3444, skyHorizon: 0x5a6070, skyBottom: 0x20242e, sunDir: [0.2, 0.5, -0.8], sunGlow: 0x9aa4b8, nebula: 0, stars: 0, key: 0xb8c4d8, keyIntensity: 1.4, keyDir: [0.4, 0.9, 0.3], hemiSky: 0x8a96aa, hemiGround: 0x1a1e24, hemiIntensity: 0.85, fog: 0x3a404c, fogNear: 28, fogFar: 120, exposure: 1.1, env: 0.45, ground: 0x3e6040 },
  jungle: { skyTop: 0x3a7aa8, skyMid: 0x8ac0b8, skyHorizon: 0xd8f0c8, skyBottom: 0x5a8a5a, sunDir: [0.3, 0.6, -0.7], sunGlow: 0xf8ffe0, nebula: 0, stars: 0, key: 0xf8ffe0, keyIntensity: 2.2, keyDir: [0.5, 0.85, 0.3], hemiSky: 0xd8ffd8, hemiGround: 0x2a4a2a, hemiIntensity: 1.0, fog: 0x9ac8a0, fogNear: 30, fogFar: 140, exposure: 1.05, env: 0.55, ground: 0x2f7a32 },
  golden: { skyTop: 0x3a5ac8, skyMid: 0x9ab0f0, skyHorizon: 0xfff0c8, skyBottom: 0xf8e0b0, sunDir: [0.35, 0.45, -0.8], sunGlow: 0xfff4d0, nebula: 0.25, stars: 0, key: 0xfff8e0, keyIntensity: 2.7, keyDir: [0.5, 0.85, 0.35], hemiSky: 0xfff8e8, hemiGround: 0x8a7a5a, hemiIntensity: 1.15, fog: 0xf8ecd0, fogNear: 60, fogFar: 200, exposure: 1.05, env: 0.65, ground: 0x9aa05a },
  stars: { skyTop: 0x02020a, skyMid: 0x0a0a24, skyHorizon: 0x2a1a4a, skyBottom: 0x05050f, sunDir: [-0.3, 0.4, -0.8], sunGlow: 0xc8a8ff, nebula: 1, stars: 1, key: 0xd8c8ff, keyIntensity: 1.6, keyDir: [0.4, 0.9, 0.3], hemiSky: 0x8a7ad8, hemiGround: 0x0a0814, hemiIntensity: 0.85, fog: 0x120e28, fogNear: 50, fogFar: 180, exposure: 1.12, env: 0.45, ground: 0x4a3a6a },
  smog: { skyTop: 0x4a4a48, skyMid: 0x7a7468, skyHorizon: 0xc8b090, skyBottom: 0x5a5248, sunDir: [-0.4, 0.3, -0.8], sunGlow: 0xffd8a0, nebula: 0, stars: 0, key: 0xffe0b0, keyIntensity: 2.0, keyDir: [0.5, 0.85, 0.3], hemiSky: 0xd8c8b0, hemiGround: 0x3a3428, hemiIntensity: 0.95, fog: 0x9a8c78, fogNear: 30, fogFar: 140, exposure: 1.05, env: 0.5, ground: 0x6a6450 },
};
// ---------- אקלימי איי הפרימיום (100–129) ----------
const X = (base, o) => ({ ...P[base], ...o });
Object.assign(P, {
  magnetic: X('night', { skyTop: 0x0a1630, skyMid: 0x1a3a6a, skyHorizon: 0x5a9ad8, skyBottom: 0x0e1a30, sunGlow: 0x8ad0ff, nebula: 0.4, stars: 0.6, key: 0xc8e4ff, keyIntensity: 1.9, hemiSky: 0x8ab8ff, hemiGround: 0x1a2030, hemiIntensity: 0.95, fog: 0x1a2e50, exposure: 1.1, ground: 0x5a6474 }),
  glassIce: X('snow', { skyTop: 0x6ab8e8, skyMid: 0xb8e4f8, skyHorizon: 0xf4fcff, skyBottom: 0xd8f0fa, sunGlow: 0xffffff, key: 0xf4fbff, keyIntensity: 2.4, hemiSky: 0xf4fbff, hemiGround: 0x9ac8e0, fog: 0xdff2fa, fogNear: 45, fogFar: 160, env: 0.85, ground: 0xdff2fa }),
  basalt: X('embers', { skyTop: 0x120808, skyMid: 0x3a1210, skyHorizon: 0xe0501a, skyBottom: 0x1a0806, sunGlow: 0xff5a10, key: 0xffa070, keyIntensity: 2.0, fog: 0x3a1a12, ground: 0x2e2e32 }),
  vinyl: X('night', { skyTop: 0x14061e, skyMid: 0x3a1450, skyHorizon: 0xd85a8a, skyBottom: 0x1a0a24, sunGlow: 0xff7ab8, nebula: 0.5, stars: 0.6, key: 0xffd0e8, keyIntensity: 1.7, hemiSky: 0xd88ab8, hemiGround: 0x1a0a1a, hemiIntensity: 0.9, fog: 0x2a1238, exposure: 1.12, ground: 0x3a2a3a }),
  whisper: X('jungle', { skyTop: 0x2a5a4a, skyMid: 0x6a9a7a, skyHorizon: 0xd8f0c0, skyBottom: 0x3a5a3a, sunGlow: 0xf0ffd0, key: 0xf0ffd8, keyIntensity: 1.9, hemiSky: 0xc8f0c8, hemiGround: 0x1e3a1e, fog: 0x7aa88a, fogNear: 24, fogFar: 115, ground: 0x3a6a2e }),
  abyssal: X('underwater', { skyTop: 0x011a2e, skyMid: 0x044a5a, skyHorizon: 0x2ab8b0, skyBottom: 0x012030, sunGlow: 0x9afff0, key: 0xa8fff4, keyIntensity: 1.9, fog: 0x0a6a78, ground: 0x5ab8a8 }),
  clockwork: X('dusk', { skyTop: 0x2a1a10, skyMid: 0x7a4a2a, skyHorizon: 0xf0b860, skyBottom: 0x3a2414, sunGlow: 0xffc070, stars: 0.1, key: 0xffd8a0, keyIntensity: 2.4, hemiSky: 0xffd8a8, hemiGround: 0x3a2a18, fog: 0x8a6040, ground: 0x8a6a3a }),
  candy: X('blossom', { skyTop: 0xff8ac8, skyMid: 0xffb8e0, skyHorizon: 0xfff0f8, skyBottom: 0xffd0e8, sunGlow: 0xfff4fa, key: 0xfff0f8, keyIntensity: 2.4, hemiSky: 0xffe8f4, hemiGround: 0xc87aa0, fog: 0xffd8ec, ground: 0xffc8e0 }),
  mirror: X('golden', { skyTop: 0x6a6aa8, skyMid: 0xb8b8e0, skyHorizon: 0xf4f4ff, skyBottom: 0xd8d8f0, sunGlow: 0xffffff, nebula: 0.4, key: 0xf4f4ff, keyIntensity: 2.4, hemiSky: 0xf0f0ff, hemiGround: 0x8a8aa8, fog: 0xdcdcf4, env: 0.95, ground: 0xc8ccd8 }),
  starDune: X('stars', { skyTop: 0x0a0420, skyMid: 0x2a1458, skyHorizon: 0x9a6ad8, skyBottom: 0x1a0a30, sunGlow: 0xd8b8ff, key: 0xe0d0ff, keyIntensity: 1.8, hemiSky: 0xb89aff, hemiGround: 0x2a1a40, fog: 0x2a1a4a, ground: 0x9a78c8 }),
  cyberLab: X('rainNight', { skyTop: 0x020a0a, skyMid: 0x0a2a24, skyHorizon: 0x1aa86a, skyBottom: 0x020a08, sunGlow: 0x33ff8a, nebula: 0.2, key: 0xb8ffd8, keyIntensity: 1.5, hemiSky: 0x4ad8a8, hemiGround: 0x041410, fog: 0x0a2a24, ground: 0x2a3a4a }),
  library: X('dusk', { skyTop: 0x1a0e08, skyMid: 0x4a2a18, skyHorizon: 0xd89a50, skyBottom: 0x24140a, sunGlow: 0xffc880, stars: 0.4, key: 0xffd8a8, keyIntensity: 2.0, hemiSky: 0xf0c890, hemiGround: 0x2a1a0e, fog: 0x5a3a24, ground: 0x8a6a48 }),
  stormCloud: X('storm', { skyTop: 0x141a26, skyMid: 0x2a3448, skyHorizon: 0x6a7890, skyBottom: 0x1a2030, sunGlow: 0x9ad0ff, key: 0xc8d8f0, ground: 0x6a7480 }),
  ink: X('fog', { skyTop: 0xc8c0b0, skyMid: 0xe0dace, skyHorizon: 0xf4f0e6, skyBottom: 0xe8e2d4, sunDir: [0.5, 0.35, -0.8], sunGlow: 0xff6a4a, key: 0xfff4ea, keyIntensity: 2.0, hemiSky: 0xf4f0e8, hemiGround: 0x6a6460, fog: 0xe8e2d6, fogNear: 30, fogFar: 140, ground: 0xe8e2d4 }),
  reef: X('day', { skyTop: 0x1a8ad8, skyMid: 0x5ac8f0, skyHorizon: 0xd8f8ff, skyBottom: 0x6ad8e8, sunGlow: 0xfff8d8, key: 0xfff8e8, keyIntensity: 2.8, hemiSky: 0xd8fbff, hemiGround: 0x6a8a6a, fog: 0xb8eaf8, ground: 0xe8d8b0 }),
  hive: X('golden', { skyTop: 0xc88a1a, skyMid: 0xf0c050, skyHorizon: 0xfff0b8, skyBottom: 0xf8d880, sunGlow: 0xfff0b0, key: 0xfff0c8, keyIntensity: 2.6, hemiSky: 0xfff0c0, hemiGround: 0x8a6a20, fog: 0xf8dc90, ground: 0xd8a83a }),
  marbleDay: X('day', { skyTop: 0x4a8ad8, skyMid: 0x9ac8f0, skyHorizon: 0xf4f8ff, skyBottom: 0xd8e8f4, sunGlow: 0xfffaf0, key: 0xfffaf0, keyIntensity: 2.8, hemiSky: 0xf4f8ff, hemiGround: 0x8a8a7a, fog: 0xdce8f4, env: 0.75, ground: 0xd8dcd0 }),
  space: X('stars', { skyTop: 0x000004, skyMid: 0x05061a, skyHorizon: 0x1a2048, skyBottom: 0x000008, sunGlow: 0x9ad8ff, nebula: 0.9, key: 0xe8f0ff, keyIntensity: 1.9, hemiSky: 0x6a7ad8, hemiGround: 0x05060c, fog: 0x080a1a, ground: 0x3a3a5a }),
  geyser: X('desert', { skyTop: 0x5a8ab8, skyMid: 0xa8c0d0, skyHorizon: 0xf0dcc0, skyBottom: 0xd8a888, sunGlow: 0xfff0d8, key: 0xfff0e0, keyIntensity: 2.4, hemiSky: 0xf8e8d8, hemiGround: 0x7a4a2a, fog: 0xe0ccb8, fogNear: 30, fogFar: 130, ground: 0xc8885a }),
  mushroom: X('night', { skyTop: 0x0a0a20, skyMid: 0x1a1a40, skyHorizon: 0x3a5a6a, skyBottom: 0x0a1018, sunGlow: 0x9affd8, nebula: 0.4, stars: 0.8, key: 0xb8ffe8, keyIntensity: 1.5, hemiSky: 0x7ad8c8, hemiGround: 0x101a14, hemiIntensity: 0.9, fog: 0x14283a, ground: 0x3a5a3a }),
  porcelain: X('snow', { skyTop: 0x5a8ad8, skyMid: 0xa8c8f0, skyHorizon: 0xf4f8ff, skyBottom: 0xdce8f8, sunGlow: 0xffffff, key: 0xf8fbff, keyIntensity: 2.5, hemiSky: 0xf4f8ff, hemiGround: 0x7a8aa8, fog: 0xe4ecf8, fogNear: 50, fogFar: 170, env: 0.85, ground: 0xe8eef8 }),
  toy: X('day', { skyTop: 0x3a9af0, skyMid: 0x8ad0ff, skyHorizon: 0xfff8d8, skyBottom: 0xffe8a8, sunGlow: 0xfff8d0, key: 0xfff8e8, keyIntensity: 2.7, hemiSky: 0xfff8e8, hemiGround: 0x8a6a4a, fog: 0xd8f0ff, ground: 0x7ac85a }),
  wheat: X('autumn', { skyTop: 0x4a8ad0, skyMid: 0xa8c8e8, skyHorizon: 0xffe8b0, skyBottom: 0xf0d090, sunDir: [-0.45, 0.3, -0.8], sunGlow: 0xffe0a0, key: 0xffe8c0, keyIntensity: 2.5, hemiSky: 0xfff0d0, hemiGround: 0x8a6a30, fog: 0xf0dcb0, ground: 0xd8c070 }),
  sepia: X('golden', { skyTop: 0x8a6a48, skyMid: 0xb89a74, skyHorizon: 0xf0dcb8, skyBottom: 0xc8aa80, sunGlow: 0xfff0d0, nebula: 0, key: 0xfff0d8, keyIntensity: 2.2, hemiSky: 0xf4e4c8, hemiGround: 0x5a4a34, fog: 0xd8c4a0, ground: 0xa88a5a }),
  cobweb: X('fog', { skyTop: 0x101018, skyMid: 0x24242e, skyHorizon: 0x5a5a6a, skyBottom: 0x14141a, sunGlow: 0xc8c8e8, stars: 0.3, key: 0xc8ccf0, keyIntensity: 1.3, hemiSky: 0x8a8aa8, hemiGround: 0x101014, hemiIntensity: 0.8, fog: 0x2a2a34, fogNear: 20, fogFar: 95, exposure: 1.12, ground: 0x3a3a40 }),
  rapids: X('rain', { skyTop: 0x3a5a6a, skyMid: 0x6a8a94, skyHorizon: 0xb8ccd0, skyBottom: 0x4a6a64, sunGlow: 0xe0f0f0, key: 0xe0f0f0, keyIntensity: 1.9, hemiSky: 0xc8e0e0, hemiGround: 0x2a3a2a, fog: 0x8aa4a8, ground: 0x4a7a4a }),
  tundra: X('snowNight', { skyTop: 0x06142a, skyMid: 0x14304a, skyHorizon: 0x5a8aa0, skyBottom: 0x0a1828, sunGlow: 0x7affc8, nebula: 0.3, key: 0xc8e8ff, keyIntensity: 1.6, hemiSky: 0x9ac8e0, hemiGround: 0x2a3a4a, fog: 0x1e3a50, ground: 0xeef4fa }),
  cell: X('underwater', { skyTop: 0x3a0a2a, skyMid: 0x8a2a5a, skyHorizon: 0xf2a8c8, skyBottom: 0x4a1a3a, sunDir: [0.2, 0.9, -0.3], sunGlow: 0xffd0e8, key: 0xffe0f0, keyIntensity: 2.0, hemiSky: 0xf8c8e0, hemiGround: 0x3a0a2a, fog: 0x8a3a6a, ground: 0xe8a8c8 }),
  rune: X('storm', { skyTop: 0x140606, skyMid: 0x3a1414, skyHorizon: 0x8a3a2a, skyBottom: 0x1a0808, sunGlow: 0xff4a2a, key: 0xffb8a0, keyIntensity: 1.6, hemiSky: 0xc87a6a, hemiGround: 0x140808, fog: 0x2a1410, ground: 0x4a4a42 }),
  zenith: X('golden', { skyTop: 0x2a4ab8, skyMid: 0x8ab0f0, skyHorizon: 0xfff8e8, skyBottom: 0xf4f0ff, sunDir: [0.2, 0.7, -0.6], sunGlow: 0xffffff, nebula: 0.4, stars: 0.3, key: 0xfffcf0, keyIntensity: 2.8, hemiSky: 0xfffcf4, hemiGround: 0xa8a0c0, fog: 0xf4f0ff, fogNear: 70, fogFar: 220, env: 0.9, ground: 0xf0f4fa }),
});

/** משקל האקלים מול פלטת ערכת העולם (1 = האקלים בלבד) + שכבות מזג אוויר */
export const CLIMATES = {
  day: { w: 0.55, fx: [{ type: 'pollen' }] },
  dusk: { w: 0.6, fx: [{ type: 'fireflies', n: 70 }] },
  snow: { w: 0.85, fx: [{ type: 'snow' }] },
  snowNight: { w: 0.9, fx: [{ type: 'snow', n: 600 }] },
  rain: { w: 0.85, fx: [{ type: 'rain' }] },
  rainNight: { w: 0.9, fx: [{ type: 'rain', n: 700 }] },
  desert: { w: 0.75, fx: [{ type: 'dust' }] },
  marsDust: { w: 0.9, fx: [{ type: 'dust', color: [0xd88050, 0xb85a3a], n: 600 }] },
  fog: { w: 0.85, fx: [{ type: 'mist' }] },
  night: { w: 0.85, fx: [{ type: 'fireflies' }] },
  blossom: { w: 0.7, fx: [{ type: 'petals' }] },
  autumn: { w: 0.7, fx: [{ type: 'leaves' }] },
  embers: { w: 0.85, fx: [{ type: 'embers' }, { type: 'soot', n: 200 }] },
  aurora: { w: 0.9, fx: [{ type: 'snow', n: 260 }], aurora: true },
  underwater: { w: 0.92, fx: [{ type: 'bubbles' }], shafts: true },
  storm: { w: 0.9, fx: [{ type: 'rain', n: 1100, slant: -5 }], storm: true },
  jungle: { w: 0.75, fx: [{ type: 'fireflies', n: 120 }, { type: 'mist', n: 24 }] },
  golden: { w: 0.7, fx: [{ type: 'sparkles' }] },
  stars: { w: 0.92, fx: [{ type: 'starmotes' }] },
  smog: { w: 0.8, fx: [{ type: 'soot' }] },
  // איי הפרימיום — האקלים שולט כמעט לגמרי (w≈0.97)
  magnetic: { w: 0.97, fx: [{ type: 'shards', color: [0x8ad0ff, 0xffffff, 0x4aa8ff] }, { type: 'mist', n: 14, color: [0x4aa8ff], alpha: 0.07 }] },
  glassIce: { w: 0.97, fx: [{ type: 'snow', n: 260 }, { type: 'shards', n: 120 }] },
  basalt: { w: 0.97, fx: [{ type: 'embers', n: 420 }, { type: 'soot', n: 220 }, { type: 'steam', n: 12 }] },
  vinyl: { w: 0.97, fx: [{ type: 'notes' }, { type: 'sparkles', color: [0xff7ab8, 0xffd8ee, 0x9ad8ff], n: 120 }] },
  whisper: { w: 0.97, fx: [{ type: 'fireflies', n: 140 }, { type: 'leaves', color: [0x6aa84a, 0x9ac85a, 0x4a8a3a], n: 160 }, { type: 'mist', n: 30 }] },
  abyssal: { w: 0.97, fx: [{ type: 'bubbles', n: 420 }], shafts: true },
  clockwork: { w: 0.97, fx: [{ type: 'sparkles', color: [0xffd070, 0xffb040, 0xfff0c0], n: 160 }, { type: 'steam', n: 12 }] },
  candy: { w: 0.97, fx: [{ type: 'confetti', color: [0xff6ab8, 0xffffff, 0x8ae8ff, 0xfff04a, 0xb8ff8a] }, { type: 'sparkles', color: [0xffffff, 0xffc8e8], n: 120 }] },
  mirror: { w: 0.97, fx: [{ type: 'shards', n: 220 }] },
  starDune: { w: 0.97, fx: [{ type: 'dust', color: [0xb48fd6, 0x8a6ab8], n: 360 }, { type: 'starmotes', n: 200 }, { type: 'meteors' }] },
  cyberLab: { w: 0.97, fx: [{ type: 'digital' }, { type: 'sparkles', color: [0x33ff8a, 0x33f0ff], n: 100 }] },
  library: { w: 0.97, fx: [{ type: 'pages' }, { type: 'dust', color: [0xffe0a0, 0xf0c880], n: 200, vx: 0.2, alpha: 0.35 }] },
  stormCloud: { w: 0.97, fx: [{ type: 'rain', n: 1000 }, { type: 'mist', n: 30, color: [0x8a94a8] }], storm: true },
  ink: { w: 0.97, fx: [{ type: 'petals', color: [0xc8282a, 0xffffff, 0xe8a0a0], n: 220 }, { type: 'mist', n: 22, color: [0x2a2a2a], alpha: 0.07 }] },
  reef: { w: 0.97, fx: [{ type: 'sparkles', color: [0xffffff, 0xfff8d0], n: 140 }, { type: 'spray' }] },
  hive: { w: 0.97, fx: [{ type: 'bees' }, { type: 'sparkles', color: [0xffd060, 0xfff0b0], n: 160 }] },
  marbleDay: { w: 0.97, fx: [{ type: 'powder' }, { type: 'petals', color: [0xffffff, 0xf4f0e8], n: 120 }] },
  space: { w: 0.97, fx: [{ type: 'starmotes', n: 360 }, { type: 'meteors', n: 24 }] },
  geyser: { w: 0.97, fx: [{ type: 'steam', n: 46 }, { type: 'spray', n: 160 }] },
  mushroom: { w: 0.97, fx: [{ type: 'spores' }, { type: 'fireflies', color: [0x9affd8, 0xe8a8ff], n: 80 }] },
  porcelain: { w: 0.97, fx: [{ type: 'petals', color: [0x2a58b8, 0xffffff, 0x8ab0e8], n: 260 }] },
  toy: { w: 0.97, fx: [{ type: 'confetti', n: 260 }] },
  wheat: { w: 0.97, fx: [{ type: 'pollen', n: 160, color: [0xfff0b0] }, { type: 'leaves', color: [0xe8c05a, 0xd8a83a, 0xf0d880], n: 140, size: 0.24 }] },
  sepia: { w: 0.97, fx: [{ type: 'dust', color: [0xd8c4a0, 0xb89a74], n: 260, alpha: 0.4 }], css: 'sepia(0.62) contrast(1.06) brightness(1.02)' },
  cobweb: { w: 0.97, fx: [{ type: 'mist', n: 50, color: [0xb8bcc8] }, { type: 'fireflies', color: [0xdfe6ff, 0xb8c8ff], n: 60 }] },
  rapids: { w: 0.97, fx: [{ type: 'rain', n: 360 }, { type: 'spray', n: 260 }, { type: 'mist', n: 30 }] },
  tundra: { w: 0.97, fx: [{ type: 'snow', n: 700, vx: 1.2 }], aurora: true },
  cell: { w: 0.97, fx: [{ type: 'bubbles', color: [0xffd0e8, 0xf2a8c8, 0xffffff], n: 260 }, { type: 'spores', color: [0xff8ac0, 0xd8a8ff], n: 120 }] },
  rune: { w: 0.97, fx: [{ type: 'embers', color: [0xff3a2a, 0xff6a4a], n: 200 }, { type: 'runes' }] },
  zenith: { w: 0.97, fx: [{ type: 'sparkles', n: 260 }, { type: 'starmotes', n: 160 }, { type: 'meteors', n: 10 }] },
};

const COLOR_KEYS = ['skyTop', 'skyMid', 'skyHorizon', 'skyBottom', 'sunGlow', 'key', 'hemiSky', 'hemiGround', 'fog', 'ground'];
const NUM_KEYS = ['nebula', 'stars', 'keyIntensity', 'hemiIntensity', 'fogNear', 'fogFar', 'exposure', 'env'];
const _a = new THREE.Color(), _b = new THREE.Color();
/** פלטת ערכת העולם + האקלים של האי */
export function climatePalette(base, climate) {
  const cfg = CLIMATES[climate] || CLIMATES.day;
  const cp = P[climate] || P.day;
  const w = cfg.w;
  const out = { ...base };
  for (const k of COLOR_KEYS) { if (base[k] == null || cp[k] == null) continue; out[k] = _a.setHex(base[k]).lerp(_b.setHex(cp[k]), w).getHex(); }
  for (const k of NUM_KEYS) { if (cp[k] == null) continue; out[k] = (base[k] ?? cp[k]) + (cp[k] - (base[k] ?? cp[k])) * w; }
  for (const k of ['sunDir', 'keyDir']) { const a = base[k] || cp[k], b = cp[k]; const v = new THREE.Vector3(...a).lerp(new THREE.Vector3(...b), w).normalize(); out[k] = [v.x, v.y, v.z]; }
  return out;
}

// ---------- טקסטורות חלקיקים ----------
const texCache = {};
function tex(kind) {
  if (texCache[kind]) return texCache[kind];
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const radial = (stops) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); stops.forEach(([o, col]) => g.addColorStop(o, col)); x.fillStyle = g; x.fillRect(0, 0, 64, 64); };
  if (kind === 'streak') { const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(29, 0, 6, 64); }
  else if (kind === 'petal') { x.fillStyle = '#fff'; x.beginPath(); x.ellipse(32, 32, 26, 14, 0.6, 0, TAU); x.fill(); }
  else if (kind === 'leaf') { x.fillStyle = '#fff'; x.beginPath(); x.ellipse(32, 32, 28, 15, -0.5, 0, TAU); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 3; x.beginPath(); x.moveTo(10, 46); x.lineTo(54, 18); x.stroke(); }
  else if (kind === 'ring') { x.strokeStyle = 'rgba(255,255,255,0.95)'; x.lineWidth = 5; x.beginPath(); x.arc(32, 32, 24, 0, TAU); x.stroke(); x.fillStyle = 'rgba(255,255,255,0.25)'; x.fill(); x.fillStyle = 'rgba(255,255,255,0.9)'; x.beginPath(); x.arc(24, 23, 5, 0, TAU); x.fill(); }
  else if (kind === 'star') { radial([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]); x.fillStyle = 'rgba(255,255,255,0.9)'; x.fillRect(30, 4, 4, 56); x.fillRect(4, 30, 56, 4); }
  else if (kind === 'mist') radial([[0, 'rgba(255,255,255,0.55)'], [0.6, 'rgba(255,255,255,0.18)'], [1, 'rgba(255,255,255,0)']]);
  else if (kind === 'meteor') { const g = x.createLinearGradient(6, 6, 58, 58); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.85, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,1)'); x.strokeStyle = g; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(8, 8); x.lineTo(56, 56); x.stroke(); }
  else if (kind === 'note') { x.fillStyle = '#fff'; x.beginPath(); x.ellipse(22, 46, 11, 8, -0.4, 0, TAU); x.fill(); x.fillRect(30, 10, 5, 36); x.beginPath(); x.moveTo(35, 10); x.quadraticCurveTo(52, 16, 46, 32); x.lineTo(44, 30); x.quadraticCurveTo(48, 20, 35, 18); x.fill(); }
  else if (kind === 'page') { x.fillStyle = '#fff'; x.fillRect(12, 6, 40, 52); x.fillStyle = 'rgba(0,0,0,0.28)'; for (let i = 0; i < 7; i++) x.fillRect(17, 14 + i * 6, 30 - (i % 3) * 5, 2); }
  else if (kind === 'confetti') { x.fillStyle = '#fff'; x.fillRect(22, 14, 20, 36); }
  else if (kind === 'bee') { x.fillStyle = 'rgba(255,255,255,0.75)'; x.beginPath(); x.ellipse(24, 20, 10, 7, -0.6, 0, TAU); x.fill(); x.beginPath(); x.ellipse(40, 20, 10, 7, 0.6, 0, TAU); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.ellipse(32, 36, 15, 11, 0, 0, TAU); x.fill(); x.fillStyle = '#111'; x.fillRect(27, 26, 4, 20); x.fillRect(35, 26, 4, 20); }
  else if (kind === 'rune') { x.strokeStyle = '#fff'; x.lineWidth = 5; x.lineCap = 'round'; x.shadowColor = '#fff'; x.shadowBlur = 6; x.beginPath(); x.moveTo(32, 8); x.lineTo(32, 56); x.moveTo(32, 20); x.lineTo(46, 10); x.moveTo(32, 34); x.lineTo(18, 24); x.moveTo(32, 44); x.lineTo(46, 52); x.stroke(); }
  else radial([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.75)'], [1, 'rgba(255,255,255,0)']]);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  return (texCache[kind] = tx);
}

// הגדרות שכבות: n, צבע, גודל, מהירות, נדנוד, טקסטורה, חיבור אור
const LAYER = {
  snow: { n: 900, color: [0xffffff], size: 0.22, vy: -1.2, sway: 0.6, tex: 'dot', alpha: 0.95 },
  rain: { n: 900, color: [0xb8d0ff], size: 0.42, vy: -16, vx: -2, sway: 0, tex: 'streak', alpha: 0.5 },
  dust: { n: 420, color: [0xe8c890, 0xd8b070], size: 0.3, vy: 0.08, vx: 1.6, sway: 0.4, tex: 'dot', alpha: 0.45 },
  mist: { n: 50, color: [0xffffff], size: 7, vy: 0, vx: 0.4, sway: 0.2, tex: 'mist', alpha: 0.16, low: true },
  fireflies: { n: 160, color: [0xd8ff6a, 0xfff08a], size: 0.26, vy: 0.05, sway: 0.7, tex: 'dot', add: true, blink: true, low: true },
  petals: { n: 420, color: [0xffb8d0, 0xffd8e6, 0xff9ac0], size: 0.3, vy: -0.9, vx: 0.6, sway: 0.9, tex: 'petal', alpha: 0.95 },
  leaves: { n: 300, color: [0xe0802a, 0xc8502a, 0xf0b040], size: 0.34, vy: -1.1, vx: 0.5, sway: 1.0, tex: 'leaf', alpha: 0.95 },
  embers: { n: 340, color: [0xff8a30, 0xffd060, 0xff5a20], size: 0.2, vy: 1.6, sway: 0.5, tex: 'dot', add: true },
  soot: { n: 300, color: [0x3a3530, 0x4a443c], size: 0.24, vy: 0.5, vx: 0.8, sway: 0.4, tex: 'dot', alpha: 0.6 },
  bubbles: { n: 340, color: [0xc8f6ff, 0xffffff], size: 0.32, vy: 1.4, sway: 0.3, tex: 'ring', alpha: 0.75 },
  sparkles: { n: 240, color: [0xfff0b0, 0xffffff, 0xffd870], size: 0.2, vy: 0.3, sway: 0.4, tex: 'star', add: true, blink: true },
  starmotes: { n: 300, color: [0xd8c8ff, 0xffffff, 0x9ad8ff], size: 0.18, vy: 0.08, sway: 0.2, tex: 'star', add: true, blink: true },
  pollen: { n: 80, color: [0xfffff0], size: 0.12, vy: 0.05, vx: 0.4, sway: 0.5, tex: 'dot', alpha: 0.7, low: true },
  // שכבות של איי הפרימיום
  meteors: { n: 16, color: [0xffffff, 0xbfe8ff], size: 1.7, vy: -7, vx: -11, sway: 0, tex: 'meteor', add: true, alpha: 0.85, y0: 8, h: 16 },
  notes: { n: 56, color: [0xffd8ee, 0xffe08a, 0x9ad8ff], size: 0.5, vy: 0.55, vx: 0.25, sway: 0.7, tex: 'note', alpha: 0.95, y0: 0.6 },
  pages: { n: 42, color: [0xf6eedc, 0xe8dcc0], size: 0.55, vy: -0.22, vx: 0.4, sway: 0.8, tex: 'page', alpha: 0.95, y0: 1 },
  spray: { n: 220, color: [0xeaf8ff, 0xc8ecff], size: 0.16, vy: 0.9, vx: 0.5, sway: 0.6, tex: 'dot', alpha: 0.55, low: true, h: 4 },
  spores: { n: 220, color: [0x9affd8, 0xe8a8ff, 0xfff08a], size: 0.2, vy: 0.35, sway: 0.5, tex: 'dot', add: true, blink: true },
  powder: { n: 240, color: [0xffffff, 0xf0f0f0], size: 0.13, vy: -0.25, vx: 0.3, sway: 0.4, tex: 'dot', alpha: 0.65 },
  steam: { n: 36, color: [0xffffff], size: 6, vy: 0.9, vx: 0.2, sway: 0.3, tex: 'mist', alpha: 0.18, low: true },
  confetti: { n: 300, color: [0xff4a6a, 0xffd23a, 0x4ad8ff, 0x6aff8a, 0xc84aff], size: 0.24, vy: -0.9, vx: 0.3, sway: 1.0, tex: 'confetti', alpha: 1 },
  bees: { n: 36, color: [0xffd23a], size: 0.3, vy: 0.05, vx: 0.3, sway: 1.8, tex: 'bee', alpha: 1, low: true, h: 6 },
  shards: { n: 140, color: [0xffffff, 0xd8d0ff, 0xbfe8ff], size: 0.3, vy: 0.15, sway: 0.3, tex: 'star', add: true, blink: true },
  digital: { n: 480, color: [0x33ff8a, 0x9affc8], size: 0.36, vy: -6, sway: 0, tex: 'streak', alpha: 0.5, add: true },
  runes: { n: 70, color: [0xff4a2a, 0xff8a4a], size: 0.4, vy: 0.4, sway: 0.4, tex: 'rune', add: true, blink: true },
};
const W = 24, H = 15;

export class Weather {
  constructor(sm, sound) {
    this.sm = sm;
    this.sound = sound;
    this.group = new THREE.Group();
    sm.world.add(this.group);
    this.layers = [];
    this.extras = [];
    this.flash = 0;
    this.nextBolt = 4;
    sm.onUpdate((dt, t) => this.update(dt, t));
  }

  /** מחליף אקלים (כולל ניקוי השכבות הקודמות) */
  set(climate, { quality = 'high' } = {}) {
    this.clear();
    this.climate = climate;
    const cfg = CLIMATES[climate] || CLIMATES.day;
    for (const L of cfg.fx || []) if (LAYER[L.type]) this.layers.push(this.makeLayer({ ...LAYER[L.type], ...L, color: L.color || LAYER[L.type].color }, quality));
    if (cfg.aurora) this.addAurora();
    if (cfg.shafts) this.addShafts();
    this.storm = !!cfg.storm;
    // פילטר מסך (למשל ספיה) — רק באיכות בינונית ומעלה
    const el = this.sm.renderer?.domElement;
    if (el) el.style.filter = cfg.css && quality !== 'low' ? cfg.css : '';
  }

  makeLayer(L, quality) {
    const n = Math.max(8, Math.round(L.n * (quality === 'low' ? 0.4 : 1)));
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), ph = new Float32Array(n);
    const c = new THREE.Color();
    const y0 = L.y0 || 0, hh = L.h || H;
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * W; pos[i * 3 + 1] = y0 + Math.random() * hh; pos[i * 3 + 2] = (Math.random() * 2 - 1) * W;
      c.setHex(L.color[i % L.color.length]); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      ph[i] = Math.random() * TAU;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: L.size, map: tex(L.tex), vertexColors: true, transparent: true, depthWrite: false, opacity: L.alpha ?? 0.9, blending: L.add ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = 5;
    this.group.add(pts);
    return { L, pts, pos, ph, n, base: mat.opacity, y0, hh };
  }

  /** זוהר צפוני: וילונות אור מעל האופק בצד הצפוני */
  addAurora() {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec2 vUv; uniform float uTime;
        void main(){ float w = sin(vUv.x*14.0 + uTime*0.6) * 0.5 + sin(vUv.x*31.0 - uTime*0.9) * 0.25 + 0.6;
          float a = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.35, 1.0, vUv.y)) * w;
          vec3 c = mix(vec3(0.2, 1.0, 0.6), vec3(0.6, 0.3, 1.0), vUv.y * 1.2);
          gl_FragColor = vec4(c * a * 0.9, a * 0.8); }`,
    });
    for (let i = 0; i < 3; i++) {
      const g = new THREE.PlaneGeometry(150, 40, 48, 1);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const x = p.getX(k); p.setZ(k, Math.sin(x * 0.05 + i) * 12); }
      const m = new THREE.Mesh(g, mat);
      m.position.set(-20 + i * 20, 55 + i * 6, -110 - i * 10);
      m.rotation.x = 0.25;
      m.renderOrder = -5;
      this.group.add(m);
      this.extras.push(m);
    }
    this.auroraMat = mat;
  }

  /** קרני אור מלמעלה (מתחת למים) */
  addShafts() {
    const c = document.createElement('canvas'); c.width = 8; c.height = 64;
    const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(200,255,255,0.5)'); g.addColorStop(1, 'rgba(200,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 8, 64);
    const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, opacity: 0.55 });
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 3.5, 30, 10, 1, true), mat);
      m.position.set((Math.random() - 0.5) * 34, 14, (Math.random() - 0.5) * 30 - 6);
      m.rotation.z = (Math.random() - 0.5) * 0.25;
      m.userData.ph = Math.random() * TAU;
      this.group.add(m);
      this.extras.push(m);
    }
    this.shaftMat = mat;
  }

  clear() {
    for (const l of this.layers) { this.group.remove(l.pts); l.pts.geometry.dispose(); l.pts.material.dispose(); }
    for (const m of this.extras) { this.group.remove(m); m.geometry.dispose(); }
    this.layers = []; this.extras = [];
    this.auroraMat = this.shaftMat = null;
    if (this.flash) { this.sm.hemi.intensity -= this.flash; this.flash = 0; }
    this.storm = false;
    const el = this.sm.renderer?.domElement;
    if (el && el.style.filter) el.style.filter = '';
  }

  update(dt, t) {
    for (const l of this.layers) {
      const { L, pos, ph, n, y0, hh } = l;
      const vx = L.vx || 0, vy = L.vy || 0, sw = L.sway || 0;
      for (let i = 0; i < n; i++) {
        const k = i * 3, p = ph[i];
        pos[k] += (vx + Math.sin(t * 0.9 + p) * sw) * dt;
        pos[k + 1] += vy * dt * (0.8 + (p % 1) * 0.4);
        pos[k + 2] += Math.cos(t * 0.7 + p * 1.3) * sw * 0.6 * dt;
        if (pos[k + 1] < y0) pos[k + 1] += hh; else if (pos[k + 1] > y0 + hh) pos[k + 1] -= hh;
        if (pos[k] > W) pos[k] -= 2 * W; else if (pos[k] < -W) pos[k] += 2 * W;
        if (pos[k + 2] > W) pos[k + 2] -= 2 * W; else if (pos[k + 2] < -W) pos[k + 2] += 2 * W;
      }
      l.pts.geometry.attributes.position.needsUpdate = true;
      if (L.blink) l.pts.material.opacity = l.base * (0.65 + Math.sin(t * 3.1) * 0.2 + Math.sin(t * 7.3) * 0.15);
    }
    if (this.auroraMat) this.auroraMat.uniforms.uTime.value = t;
    if (this.shaftMat) this.shaftMat.opacity = 0.4 + Math.sin(t * 0.8) * 0.15;
    // סערה: ברקים מדי פעם
    if (this.storm) {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) { this.nextBolt = 3 + Math.random() * 6; this.strike(); }
    }
  }

  /** ברק: הבזק אור קצר ורעם (גם לפי בקשה — למשל הכאה באי הסערה) */
  strike(add = 2.2) {
    this.sm.hemi.intensity += add; this.flash += add;
    setTimeout(() => { this.sm.hemi.intensity -= add; this.flash -= add; }, 90 + Math.random() * 80);
    setTimeout(() => this.sound?.thunder?.(), 250 + Math.random() * 500);
  }
}
