/**
 * ערוץ ההפצה של העותק הזה של המשחק (Distribution channel).
 *  • 'play' — גרסת Google Play. עטיפת האנדרואיד שנבנית ל-Play (android-wrapper/build-aab.sh) מוסיפה
 *    "CoAStore/play" ל-User-Agent של ה-WebView (android.appendUserAgent ב-capacitor.config).
 *    הזיהוי נעשה בזמן ריצה ולא בזמן בנייה, כי חבילות העדכון (OTA) משותפות לכל הערוצים.
 *  • 'site' — ה-APK שמורידים מהאתר (Capacitor בלי הסימון).
 *  • 'web'  — דפדפן / PWA.
 * לבדיקות ולתצוגה מקדימה בדפדפן: ‎?store=play‎, או VITE_STORE=play בזמן הבנייה.
 *
 * מה משתנה בגרסת Play (מדיניות Device and Network Abuse של Google Play: אפליקציה מ-Play לא מעדכנת את עצמה
 * בשום דרך מלבד מנגנון העדכון של Play, חוץ מקוד שרץ במפרש כמו JavaScript ב-WebView):
 *  • עדכוני המשחק (חבילת ה-web) ממשיכים כרגיל דרך OTA.
 *  • אין הורדת APK: כשנדרשת גרסה נייטיב חדשה — שולחים לדף האפליקציה ב-Play.
 *  • מוצרים בכסף אמיתי — רק דרך Google Play Billing (PaymentProvider ב-core/Economy.js). בלי ספק מחובר
 *    הכפתורים מציגים "בקרוב", ואין קופה מדומה.
 */
import { Capacitor } from '@capacitor/core';
import { UPDATE_URL } from './AppConfig.js';

/** הסימון שה-flavor של Play מוסיף ל-User-Agent */
export const PLAY_UA_MARK = 'CoAStore/play';

/**
 * מזהה החבילה של גרסת Google Play (הוחלט: חבילה חדשה, חתימה בניהול Play App Signing).
 * ה-APK מהאתר נשאר com.chessofages.kingdombuilder עם המפתח הקיים, כך ששתיהן יכולות להיות מותקנות יחד.
 * המזהה נקבע סופית בהעלאה הראשונה ל-Play.
 */
export const PLAY_PACKAGE_ID = 'com.chessofages.islandrealms';

/**
 * ערוץ העדכונים (OTA) של גרסת Play: תיקייה נפרדת באתר, שמתעדכנת רק כשמקדמים גרסה ל-Play
 * (scripts/publish-play.sh). כך כל עדכון מגיע קודם ל-APK מהאתר (בטא), ורק אחר כך לשחקני Play.
 * אפשרות 2 בהמשך: Cloudflare Pages — מגדירים VITE_UPDATE_BASE לכתובת החדשה ומקדמים כרגיל; הכתובת יושבת בקוד ה-web,
 * אז המעבר הוא עדכון OTA רגיל (בתיקייה הישנה) בלי AAB חדש.
 */
export const PLAY_UPDATE_DEFAULT = 'https://yanivedelstein44-creator.github.io/chess-of-ages-play/';

function detect() {
  let forced = '';
  try { forced = new URLSearchParams(location.search).get('store') || ''; } catch { /* אין location */ }
  const env = import.meta.env || {};
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  if (forced === 'play' || env.VITE_STORE === 'play' || ua.includes(PLAY_UA_MARK)) return 'play';
  return Capacitor?.isNativePlatform?.() ? 'site' : 'web';
}

/** 'play' | 'site' | 'web' */
export const STORE = detect();
export const isPlayBuild = () => STORE === 'play';

/** דף האפליקציה בגוגל פליי (באפליקציה: Capacitor פותח את אפליקציית החנות) */
export const PLAY_URL = `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE_ID}`;

const slash = (u) => (!u ? '' : u.endsWith('/') ? u : `${u}/`);

/**
 * מאיפה האפליקציה בודקת עדכוני OTA (version.json + חבילת zip).
 *  • Play: VITE_UPDATE_BASE של בניית Play, ואם חסר — ערוץ Play (PLAY_UPDATE_DEFAULT). ההחלטה בזמן ריצה, אז גם חבילה
 *    שנבנתה בלי הסימון ורצה בתוך אפליקציית Play עדיין קוראת מערוץ Play.
 *  • APK מהאתר / דפדפן: כמו היום (VITE_UPDATE_URL / VITE_PUBLIC_URL).
 */
export const UPDATE_BASE = STORE === 'play'
  ? slash((import.meta.env || {}).VITE_UPDATE_BASE || PLAY_UPDATE_DEFAULT)
  : UPDATE_URL;
