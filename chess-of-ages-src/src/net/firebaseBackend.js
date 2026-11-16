/**
 * צד השרת של משחק אונליין (חבר וזירת העידנים) — Firebase Realtime Database + התחברות אנונימית.
 * הקובץ נטען רק כשנכנסים למשחק אונליין (import דינמי), כדי שהפתיחה של המשחק תישאר מהירה.
 * כל ההרשאות נאכפות בשרת (firebase/database.rules.json).
 */
import { initializeApp } from 'firebase/app';
import {
  initializeAuth, signInAnonymously, indexedDBLocalPersistence, browserLocalPersistence,
  browserSessionPersistence, inMemoryPersistence,
} from 'firebase/auth';
import { getDatabase, ref, set, update, get, onValue, onDisconnect, remove, serverTimestamp, query, orderByChild, limitToLast } from 'firebase/database';
import { FIREBASE } from '../config/AppConfig.js';

/**
 * בלי אינטרנט, או כשהשרת מלא (בתוכנית החינמית: 100 חיבורים בו-זמנית), Firebase מחכה בשקט עד שיתחבר —
 * והמשחק היה נתקע על "מתחבר…". לכן לפעולות שהשחקן מחכה להן יש זמן מקסימלי, ואז שגיאה 'timeout' עם הודעה ברורה.
 * (מהלכים ונוכחות לא מוגבלים: הם נשלחים לבד כשהחיבור חוזר.)
 */
const LIMIT_MS = 12000;
export function withTimeout(p, ms = LIMIT_MS) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'timeout' })), ms); })])
    .finally(() => clearTimeout(t));
}

export async function createFirebaseBackend({ tabSession = false } = {}) {
  const app = initializeApp(FIREBASE);
  // tabSession (?fbtab בבדיקות): זהות נפרדת לכל לשונית — כדי לשחק נגד עצמך בשתי לשוניות
  const persistence = tabSession
    ? [browserSessionPersistence, inMemoryPersistence]
    : [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence];
  const auth = initializeAuth(app, { persistence });
  await withTimeout(auth.authStateReady(), 15000);
  if (!auth.currentUser) await withTimeout(signInAnonymously(auth), 15000);
  const uid = auth.currentUser.uid;
  const db = getDatabase(app);
  const roomRef = (code, sub = '') => ref(db, `rooms/${code}${sub ? `/${sub}` : ''}`);
  const live = new Map(); // נוכחות פעילה: path → ref (כדי לבטל onDisconnect ביציאה)

  return {
    kind: 'firebase',
    uid,
    ts: () => serverTimestamp(),
    create: (code, data) => withTimeout(set(roomRef(code), data)),
    get: async (code) => (await withTimeout(get(roomRef(code)))).val(),
    update: (code, patch) => update(roomRef(code), patch),
    remove: (code) => withTimeout(remove(roomRef(code))),
    /** [legal] "Delete all my data": deletes the anonymous account, or at least signs it out on this device */
    async forget() {
      try { await auth.currentUser?.delete(); } catch { try { await auth.signOut(); } catch { /* offline: the local token is wiped anyway */ } }
    },
    watch(code, cb, onError) {
      return onValue(roomRef(code), (snap) => cb(snap.val()), (err) => onError?.(err));
    },
    /** ערך שנמחק לבד כשהחיבור נופל (נוכחות שחקן / צופה) */
    async setLive(code, sub, value) {
      const r = roomRef(code, sub);
      await onDisconnect(r).remove();
      await set(r, value);
      live.set(`${code}/${sub}`, r);
    },
    async clearLive(code, sub) {
      const key = `${code}/${sub}`;
      const r = live.get(key) || roomRef(code, sub);
      live.delete(key);
      try { await withTimeout(onDisconnect(r).cancel(), 5000); } catch { /* כבר לא מחובר */ }
      try { await withTimeout(remove(r), 5000); } catch { /* החדר נמחק / אין חיבור — onDisconnect ינקה */ }
    },
    onConnection(cb) {
      return onValue(ref(db, '.info/connected'), (snap) => cb(!!snap.val()));
    },
    // ---------- הלובי של זירת העידנים: רק חדרים שמחכים ליריב ----------
    /** החדרים הפנויים (החדשים ביותר), כאובייקט { CODE: { v, t, host, n, e, i } } */
    async lobbyList(limit) {
      return (await withTimeout(get(query(ref(db, 'lobby'), orderByChild('t'), limitToLast(limit))))).val() || {};
    },
    lobbyWatch(limit, cb, onError) {
      return onValue(query(ref(db, 'lobby'), orderByChild('t'), limitToLast(limit)), (snap) => cb(snap.val() || {}), (err) => onError?.(err));
    },
    /** החדר שלך בלובי — נמחק לבד אם החיבור נופל */
    async lobbyOpen(code, entry) {
      const r = ref(db, `lobby/${code}`);
      await withTimeout(set(r, entry));
      // אחרי שהרשומה קיימת (חוקי השרת מתירים למחוק רק רשומה קיימת שלך). רשומה שנשארה בכל זאת — מסוננת אחרי 10 דקות
      await withTimeout(onDisconnect(r).remove());
    },
    lobbyTouch: (code) => update(ref(db, `lobby/${code}`), { t: serverTimestamp() }),
    async lobbyClose(code) {
      const r = ref(db, `lobby/${code}`);
      try { await onDisconnect(r).cancel(); } catch { /* לא מחובר */ }
      try { await remove(r); } catch { /* כבר נמחק */ }
    },
  };
}
