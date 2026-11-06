/**
 * הגדרות כלליות של האפליקציה — מיתוג, גרסה, כתובות וחוקים.
 */
export const APP = {
  titleHe: 'שחמט העידנים',
  subtitleHe: 'שחמט העידנים: בוני הממלכה',
  titleEn: 'Chess of Ages: Kingdom Builder',
  logoEn: 'CHESS OF AGES',
  packageId: 'com.chessofages.kingdombuilder',
};

/* global __APP_VERSION__, __BUILD_ID__, __BUILD_TIME__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev';
export const BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';
export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 0;

const env = import.meta.env || {};
const withSlash = (u) => (!u ? '' : u.endsWith('/') ? u : `${u}/`);

/** כתובת האתר הציבורי (קישורי הזמנה לוואטסאפ + עדכונים ל-APK). מוגדר ב-.env או ב-GitHub Actions */
export const PUBLIC_URL = withSlash(env.VITE_PUBLIC_URL || '');
/** מאיפה אפליקציית ה-APK בודקת עדכונים (version.json + bundle zip) */
export const UPDATE_URL = withSlash(env.VITE_UPDATE_URL || env.VITE_PUBLIC_URL || '');
/** קישור להורדת APK חדש (רק כשנדרש עדכון "מקומי" מלא) */
export const APK_URL = env.VITE_APK_URL || '';

export const NET = {
  prefix: 'chessofages-kb-v1-',
  lobbySlots: 5,
  matchmakingMs: 6000,
  protocol: 1,
};

/**
 * הגדרות PeerJS. ברירת מחדל: שרת הענן הציבורי של PeerJS + שרתי STUN/TURN ברירת המחדל של הספרייה.
 * לפרודקשן מומלץ שרת משלכם (PeerServer + coturn) — מגדירים ב-.env:
 * VITE_PEER_HOST, VITE_PEER_PORT, VITE_PEER_PATH, VITE_PEER_SECURE, VITE_PEER_KEY,
 * VITE_ICE_SERVERS='[{"urls":"stun:stun.example.com:3478"},{"urls":"turn:turn.example.com:3478","username":"u","credential":"p"}]'
 * (אם משנים שרתים — לעדכן גם את public/privacy.html)
 */
export const PEER_OPTIONS = (() => {
  const o = { debug: 0 };
  if (env.VITE_PEER_HOST) {
    o.host = env.VITE_PEER_HOST;
    o.port = Number(env.VITE_PEER_PORT) || 443;
    o.path = env.VITE_PEER_PATH || '/';
    o.secure = env.VITE_PEER_SECURE !== 'false';
    if (env.VITE_PEER_KEY) o.key = env.VITE_PEER_KEY;
  }
  if (env.VITE_ICE_SERVERS) {
    try { o.config = { iceServers: JSON.parse(env.VITE_ICE_SERVERS) }; } catch { /* JSON לא תקין — נשארים עם ברירת המחדל */ }
  }
  return o;
})();

export const RULES = {
  antiFarmPlies: 30, // במצבי מולטיפלייר/מכשיר משותף: ניצחון בונה שלב רק אחרי 15 מהלכים לפחות
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
