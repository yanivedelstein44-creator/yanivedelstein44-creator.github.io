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
/** מאיפה אפליקציית ה-APK בודקת עדכונים (version.json + bundle zip). גרסת Play: UPDATE_BASE ב-config/Store.js */
export const UPDATE_URL = withSlash(env.VITE_UPDATE_BASE || env.VITE_UPDATE_URL || env.VITE_PUBLIC_URL || '');
/** קישור להורדת APK חדש (רק כשנדרש עדכון "מקומי" מלא) */
export const APK_URL = env.VITE_APK_URL || '';
/** סרטונים גדולים (הטריילר בקולנוע) נטענים מהאתר רק כשצופים בהם — לא בתוך חבילת העדכון */
export const MEDIA_URL = withSlash(env.VITE_MEDIA_URL || 'https://yanivedelstein44-creator.github.io/chess-of-ages-media/');

/**
 * Firebase — משחק אונליין עם חבר שמזמינים (חדרים פרטיים בלבד, בלי שידוך עם זרים).
 * הערכים האלה ציבוריים מטבעם (הם יושבים בכל אפליקציית ווב); ההגנה היא בכללי האבטחה של מסד הנתונים
 * (firebase/database.rules.json): אי אפשר לרשום את החדרים, רק מי שיודע את הקוד נכנס, ורק השחקן שתורו מזיז.
 */
export const FIREBASE = {
  apiKey: env.VITE_FB_API_KEY || 'AIzaSyDEm7E9494AMCY_yh3R0QvoV8PqyV1wSAM',
  authDomain: env.VITE_FB_AUTH_DOMAIN || 'chess-of-ages-80e2a.firebaseapp.com',
  databaseURL: env.VITE_FB_DB_URL || 'https://chess-of-ages-80e2a-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: env.VITE_FB_PROJECT || 'chess-of-ages-80e2a',
  storageBucket: 'chess-of-ages-80e2a.firebasestorage.app',
  messagingSenderId: '634742687640',
  appId: env.VITE_FB_APP_ID || '1:634742687640:web:e2387ba12651ab15808ded',
};

/** חדרי אונליין: קוד בן 6 תווים בלי תווים מבלבלים (בלי I, O, 0, 1) */
export const ONLINE = {
  codeLen: 6,
  alphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  rejoinMs: 12 * 60 * 60 * 1000, // אחרי סגירת האפליקציה — חוזרים לחדר עד 12 שעות
  emotes: [['hi', 'smile'], ['gg', 'thumb'], ['wow', 'wow'], ['lol', 'laugh'], ['fire', 'fire'], ['heart', 'heart']],
};

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
