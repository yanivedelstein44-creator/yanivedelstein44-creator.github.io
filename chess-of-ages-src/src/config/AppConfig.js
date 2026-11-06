/**
 * הגדרות כלליות של האפליקציה — מיתוג, גרסה, כתובות וחוקים.
 */
export const APP = {
  titleHe: 'שחמט העידנים',
  subtitleHe: 'שחמט העידנים: ממלכות האיים',
  titleEn: 'Chess of Ages: Island Realms',
  logoEn: 'CHESS OF AGES',
  packageId: 'com.chessofages.kingdombuilder',
};

/* global __APP_VERSION__, __BUILD_ID__, __BUILD_TIME__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev';
export const BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';
export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 0;

const env = import.meta.env || {};
const withSlash = (u) => (!u ? '' : u.endsWith('/') ? u : `${u}/`);

/** כתובת האתר הציבורי (קישור בכרטיס השיתוף + עדכונים ל-APK). מוגדר ב-.env או ב-GitHub Actions */
export const PUBLIC_URL = withSlash(env.VITE_PUBLIC_URL || '');
/** מאיפה אפליקציית ה-APK בודקת עדכונים (version.json + bundle zip) */
export const UPDATE_URL = withSlash(env.VITE_UPDATE_URL || env.VITE_PUBLIC_URL || '');
/** קישור להורדת APK חדש (רק כשנדרש עדכון "מקומי" מלא) */
export const APK_URL = env.VITE_APK_URL || '';

export const RULES = {
  antiFarmPlies: 30, // שני שחקנים באותו מכשיר: ניצחון בונה שלב רק אחרי 15 מהלכים לפחות
  baseEras: 5,
  totalEras: 10,
  stagesPerEra: 2,
};

export const TIME_CONTROLS = [
  { id: 3, label: '3 דק׳', labelEn: '3 min', ms: 3 * 60000, inc: 2000 },
  { id: 5, label: '5 דק׳', labelEn: '5 min', ms: 5 * 60000, inc: 3000 },
  { id: 10, label: '10 דק׳', labelEn: '10 min', ms: 10 * 60000, inc: 0 },
  { id: 15, label: '15 דק׳', labelEn: '15 min', ms: 15 * 60000, inc: 5000 },
];
