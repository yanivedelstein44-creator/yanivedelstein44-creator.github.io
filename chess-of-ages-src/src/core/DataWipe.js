/**
 * "Delete all my data" — the right to erasure (Israeli Privacy Protection Law, GDPR art. 17).
 * What it deletes:
 *  1. The online rooms this device created (from the server) and the current room, if any.
 *  2. The anonymous Firebase account (deleted, or at least signed out) and its local token
 *     (IndexedDB "firebaseLocalStorageDb" and any "firebase:" keys).
 *  3. All of the game's local data ("chess_ages*" keys): progress, gems, items, pets, settings.
 * The language choice is kept (the player picked it on purpose). The service-worker cache holds
 * only the game's own files, so it stays (the game keeps working offline).
 * Firebase is loaded only if this device used online play — no new anonymous account just to delete.
 */
import { getBackend } from '../net/backend.js';
import { wipeAllLocalData, writeJSON } from './Storage.js';
import { t, getLang } from '../ui/i18n.js';

const FB_DB = 'firebaseLocalStorageDb';
const PROGRESS_KEY = 'chess_ages_progress';

const withTimeout = (p, ms) => Promise.race([
  p,
  new Promise((_, reject) => { setTimeout(() => reject(new Error('timeout')), ms); }),
]);

/** Did this device ever sign in for online play? (IndexedDB of Firebase Auth, or its localStorage fallback) */
async function hasFirebaseSession() {
  try {
    if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      if (dbs.some((d) => d && d.name === FB_DB)) return true;
    }
  } catch { /* not supported */ }
  try {
    for (let i = 0; i < localStorage.length; i++) if ((localStorage.key(i) || '').startsWith('firebase:authUser:')) return true;
  } catch { /* storage unavailable */ }
  return false;
}

/**
 * Leaves the current room, deletes the rooms this device created and removes the anonymous account.
 * Returns { ok, rooms }: ok=false when the server couldn't be reached (the rooms may still exist).
 */
export async function forgetOnline(app, { timeoutMs = 8000 } = {}) {
  const codes = new Set((app.store.get('myRooms') || []).map((r) => r && r.code).filter(Boolean));
  const cur = app.online?.room;
  if (cur && cur.role === 'host' && cur.code) codes.add(cur.code);
  if (cur) { try { await withTimeout(app.online.detach({ remove: true }), timeoutMs); } catch { /* deleted below */ } }
  if (!codes.size && !(await hasFirebaseSession())) return { ok: true, rooms: 0 };
  try {
    const be = await withTimeout(getBackend(), timeoutMs);
    // a room that is already gone answers "permission denied" — that also counts as deleted
    const res = await withTimeout(Promise.allSettled([...codes].map((c) => be.remove(c))), timeoutMs);
    await withTimeout(Promise.resolve(be.forget?.()), timeoutMs).catch(() => {});
    return { ok: true, rooms: codes.size, failed: res.filter((r) => r.status === 'rejected').length };
  } catch (error) {
    return { ok: false, rooms: codes.size, error };
  }
}

/** Removes Firebase's local sign-in data (best effort; the database is deleted when no tab holds it open). */
function wipeFirebaseLocal() {
  // the sign-in token, and the Firebase SDK's own "heartbeat" (its version and the days it was used)
  for (const db of [FB_DB, 'firebase-heartbeat-database']) {
    try { if (typeof indexedDB !== 'undefined') indexedDB.deleteDatabase(db); } catch { /* not available */ }
  }
  for (const st of [() => localStorage, () => sessionStorage]) {
    try {
      const s = st();
      const keys = [];
      for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k && (k.startsWith('firebase:') || k.startsWith('chess_ages'))) keys.push(k); }
      keys.forEach((k) => s.removeItem(k));
    } catch { /* storage unavailable */ }
  }
}

/**
 * The whole flow behind Settings → "Delete all my data" (after the player confirmed).
 * Returns true when the data was deleted (the caller reloads), false when the player cancelled.
 */
export async function wipeEverything(app) {
  const lang = getLang();
  app.ui?.toast?.(t('lgDeleting'), { icon: 'trash' });
  const online = await forgetOnline(app);
  if (!online.ok && online.rooms > 0) {
    const go = await app.ui.confirm(t('lgRoomsFail'), t('lgDeviceOnly'), { danger: true });
    if (!go) return false;
  }
  wipeFirebaseLocal();
  wipeAllLocalData();
  // the language stays: a fresh profile that only remembers it (everything else starts from zero)
  if (lang === 'he') writeJSON(PROGRESS_KEY, { settings: { lang } });
  return true;
}
