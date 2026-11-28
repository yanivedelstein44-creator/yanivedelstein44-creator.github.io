// בדיקות למתג הפרסומות מרחוק (src/core/AdsSwitch.js). הרצה: npm run test:ads
import assert from 'node:assert/strict';
import { adsSwitchOpen, decide } from '../src/core/AdsSwitch.js';

const base = 'https://example.test/chess-of-ages-play/';
const file = 'ads.json';
const KEY = 'coa.adsSwitch';
const mem = (conf) => {
  const m = new Map(conf === undefined ? [] : [[KEY, JSON.stringify(conf)]]);
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, m };
};
const saved = (s) => JSON.parse(s.m.get(KEY));
const ok = (body) => async () => ({ ok: true, status: 200, json: async () => body });
const status = (code) => async () => ({ ok: false, status: code, json: async () => ({}) });
const boom = async () => { throw new Error('network'); };
const never = () => new Promise(() => {});
const AUTO = { live: 'auto', fromBuild: 1005 };

const cases = [];
const test = (name, fn) => cases.push([name, fn]);

test('פתוח כשהקובץ אומר live: true, וההגדרה נשמרת במכשיר', async () => {
  const s = mem();
  assert.equal(await adsSwitchOpen({ base, file, fetchFn: ok({ live: true }), storage: s }), true);
  assert.equal(saved(s).live, true);
});
test('סגור כשהקובץ אומר live: false, וההגדרה נשמרת במכשיר', async () => {
  const s = mem({ live: true });
  assert.equal(await adsSwitchOpen({ base, file, fetchFn: ok({ live: false }), storage: s }), false);
  assert.equal(saved(s).live, false);
});
test('רק true בדיוק פותח (לא "true" ולא 1)', async () => {
  assert.equal(await adsSwitchOpen({ base, file, fetchFn: ok({ live: 'true' }), storage: mem() }), false);
  assert.equal(await adsSwitchOpen({ base, file, fetchFn: ok({ live: 1 }), storage: mem() }), false);
  assert.equal(await adsSwitchOpen({ base, file, fetchFn: ok(null), storage: mem() }), false);
});
test('קובץ חסר (404) בלי הגדרה שמורה: סגור', async () => {
  assert.equal(await adsSwitchOpen({ base, file, fetchFn: status(404), storage: mem() }), false);
});
test('תקלת רשת: ההגדרה האחרונה שנשמרה', async () => {
  assert.equal(await adsSwitchOpen({ base, file, fetchFn: boom, storage: mem({ live: true }) }), true);
  assert.equal(await adsSwitchOpen({ base, file, fetchFn: boom, storage: mem({ live: false }) }), false);
  assert.equal(await adsSwitchOpen({ base, file, fetchFn: boom, storage: mem() }), false);
});
test('אין תשובה תוך הזמן: ההגדרה האחרונה, בלי לחכות יותר', async () => {
  const t0 = Date.now();
  assert.equal(await adsSwitchOpen({ base, file, fetchFn: never, storage: mem({ live: true }), timeoutMs: 120 }), true);
  assert.ok(Date.now() - t0 < 1000);
});
test('אחסון שזורק שגיאה או תוכן פגום לא מפילים את הבדיקה', async () => {
  const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(await adsSwitchOpen({ base, file, fetchFn: ok({ live: true }), storage: bad }), true);
  assert.equal(await adsSwitchOpen({ base, file, fetchFn: boom, storage: bad }), false);
  const junk = { getItem: () => '{not json', setItem() {} };
  assert.equal(await adsSwitchOpen({ base, file, fetchFn: boom, storage: junk }), false);
});
test('הכתובת: ערוץ Play + הקובץ, בלי מטמון', async () => {
  let seen;
  await adsSwitchOpen({ base, file, fetchFn: async (u, o) => { seen = { u, o }; return { ok: true, json: async () => ({ live: false }) }; }, storage: mem() });
  assert.match(seen.u, /^https:\/\/example\.test\/chess-of-ages-play\/ads\.json\?t=\d+$/);
  assert.equal(seen.o.cache, 'no-store');
});
test('בלי כתובת או בלי שם קובץ: ההגדרה האחרונה', async () => {
  assert.equal(await adsSwitchOpen({ base: '', file, fetchFn: ok({ live: true }), storage: mem() }), false);
  assert.equal(await adsSwitchOpen({ base, file: '', fetchFn: ok({ live: true }), storage: mem({ live: true }) }), true);
});
test('auto: נפתח רק מה-versionCode של ההשקה ומעלה', () => {
  assert.equal(decide(AUTO, 1004), false); // הבדיקה הסגורה (1004) — פרסומות בדיקה
  assert.equal(decide(AUTO, 1005), true);
  assert.equal(decide(AUTO, 1012), true);
  assert.equal(decide(AUTO, 0), false); // מספר בנייה לא ידוע — סגור
  assert.equal(decide(AUTO, '1005'), true); // App.getInfo().build מגיע כמחרוזת
});
test('auto בלי מספר תקין: סגור', () => {
  assert.equal(decide({ live: 'auto' }, 2000), false);
  assert.equal(decide({ live: 'auto', fromBuild: 'abc' }, 2000), false);
  assert.equal(decide({ live: 'auto', fromBuild: 0 }, 2000), false);
  assert.equal(decide({ live: 'auto', fromBuild: 1005.5 }, 2000), false);
});
test('true ו-false גוברים על מספר הבנייה', () => {
  assert.equal(decide({ live: true }, 0), true);
  assert.equal(decide({ live: false, fromBuild: 1 }, 9999), false);
});
test('auto מקצה לקצה: הבנייה עוברת דרך הבדיקה', async () => {
  const s = mem();
  assert.equal(await adsSwitchOpen({ base, file, build: 1004, fetchFn: ok(AUTO), storage: s }), false);
  assert.equal(await adsSwitchOpen({ base, file, build: 1005, fetchFn: ok(AUTO), storage: s }), true);
  assert.deepEqual(saved(s), AUTO);
});
test('auto בלי רשת: מכשיר שקיבל פעם את ההגדרה נפתח כשגרסת החנות מגיעה אליו', async () => {
  const s = mem();
  assert.equal(await adsSwitchOpen({ base, file, build: 1004, fetchFn: ok(AUTO), storage: s }), false); // בודק, לפני ההשקה
  assert.equal(await adsSwitchOpen({ base, file, build: 1005, fetchFn: boom, storage: s }), true); // אחרי עדכון מהחנות, בלי רשת
  assert.equal(await adsSwitchOpen({ base, file, build: 1004, fetchFn: boom, storage: s }), false);
});

let failed = 0;
for (const [name, fn] of cases) {
  try { await fn(); console.log(`✔ ${name}`); } catch (e) { failed++; console.log(`✘ ${name}\n  ${e.message}`); }
}
console.log(failed ? `${failed} נכשלו` : `כל ${cases.length} הבדיקות עברו`);
process.exit(failed ? 1 : 0);
