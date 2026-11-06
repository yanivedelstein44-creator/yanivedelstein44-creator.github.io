/**
 * בוחר את צד השרת: Firebase אמיתי, או שרת מדומה לבדיקות (?fakenet).
 * נטען פעם אחת ונשמר; Firebase עצמו נטען רק כאן (import דינמי — קובץ נפרד).
 */
let pending = null;

export function getBackend() {
  if (!pending) {
    const q = new URLSearchParams(location.search);
    pending = (q.has('fakenet')
      ? import('./fakeBackend.js').then((m) => m.createFakeBackend())
      : import('./firebaseBackend.js').then((m) => m.createFirebaseBackend({ tabSession: q.has('fbtab') })))
      .catch((e) => { pending = null; throw e; });
  }
  return pending;
}
