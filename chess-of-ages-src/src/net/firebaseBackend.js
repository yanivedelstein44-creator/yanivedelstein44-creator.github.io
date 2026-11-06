/**
 * צד השרת של משחק אונליין עם חבר — Firebase Realtime Database + התחברות אנונימית.
 * הקובץ נטען רק כשנכנסים למשחק אונליין (import דינמי), כדי שהפתיחה של המשחק תישאר מהירה.
 * כל ההרשאות נאכפות בשרת (firebase/database.rules.json).
 */
import { initializeApp } from 'firebase/app';
import {
  initializeAuth, signInAnonymously, indexedDBLocalPersistence, browserLocalPersistence,
  browserSessionPersistence, inMemoryPersistence,
} from 'firebase/auth';
import { getDatabase, ref, set, update, get, onValue, onDisconnect, remove, serverTimestamp } from 'firebase/database';
import { FIREBASE } from '../config/AppConfig.js';

export async function createFirebaseBackend({ tabSession = false } = {}) {
  const app = initializeApp(FIREBASE);
  // tabSession (?fbtab בבדיקות): זהות נפרדת לכל לשונית — כדי לשחק נגד עצמך בשתי לשוניות
  const persistence = tabSession
    ? [browserSessionPersistence, inMemoryPersistence]
    : [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence];
  const auth = initializeAuth(app, { persistence });
  await auth.authStateReady();
  if (!auth.currentUser) await signInAnonymously(auth);
  const uid = auth.currentUser.uid;
  const db = getDatabase(app);
  const roomRef = (code, sub = '') => ref(db, `rooms/${code}${sub ? `/${sub}` : ''}`);
  const live = new Map(); // נוכחות פעילה: path → ref (כדי לבטל onDisconnect ביציאה)

  return {
    kind: 'firebase',
    uid,
    ts: () => serverTimestamp(),
    create: (code, data) => set(roomRef(code), data),
    get: async (code) => (await get(roomRef(code))).val(),
    update: (code, patch) => update(roomRef(code), patch),
    remove: (code) => remove(roomRef(code)),
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
      try { await onDisconnect(r).cancel(); } catch { /* כבר לא מחובר */ }
      try { await remove(r); } catch { /* החדר נמחק */ }
    },
    onConnection(cb) {
      return onValue(ref(db, '.info/connected'), (snap) => cb(!!snap.val()));
    },
  };
}
