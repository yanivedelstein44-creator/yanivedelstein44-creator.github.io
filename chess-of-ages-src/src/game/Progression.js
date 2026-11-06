/**
 * התקדמות: 99 איים, בכל סדר שהשחקן רוצה.
 * - כל אי פתוח לביקור ולכיבוש. איים 6–99 דורשים את המשחק המלא (רכישה חד-פעמית).
 * - אחרי כיבוש: הבוט עוזב לאי המרכזי (אפשר לקנות אותו בחנות), החלק של האי מצטרף לפסיפס במרכז,
 *   ופיראטי זמן תופסים את האי — באותה רמת קושי. ניצחון עליהם = יהלומים; הם בורחים וחוזרים אחרי כמה שעות.
 * - אין יותר שלבי בנייה: כל אי מוצג במלואו, והאי המרכזי גדל עם כל כיבוש.
 */
import { ISLAND_COUNT, FREE_ISLANDS, HUB_ID, regionOf, regionIslands } from '../config/Islands.js';
import { PIRATE_RESPAWN_MS } from '../config/Pirates.js';

export class Progression {
  constructor(store, economy) {
    this.store = store;
    this.economy = economy;
    this.migrate();
  }

  /** שחקנים מגרסה קודמת: שלבים שנבנו → איים כבושים */
  migrate() {
    if (this.store.get('islands')) return;
    const conquered = [];
    const ep = this.store.get('eraProgress') || [];
    for (let r = 1; r <= 10; r++) {
      const k = ep[r - 1] || 0;
      if (!k) continue;
      const list = regionIslands(r);
      conquered.push(...list.slice(0, k >= 2 ? list.length : 5));
    }
    this.store.set({ islands: { conquered, current: HUB_ID } });
  }

  get isl() { return this.store.get('islands') || { conquered: [], current: HUB_ID }; }
  save(patch) { this.store.set({ islands: { ...this.isl, ...patch } }); }
  get conqueredSet() { return new Set(this.isl.conquered); }
  isConquered(id) { return this.isl.conquered.includes(id); }
  conqueredCount() { return this.isl.conquered.length; }
  /** סדר הכיבוש (לחלקים בפסיפס) */
  conqueredList() { return [...this.isl.conquered]; }
  regionConquered(r) { const set = this.conqueredSet; return regionIslands(r).filter((i) => set.has(i)).length; }

  /** אי מומלץ להמשך: הראשון שעוד לא נכבש וזמין (או null אם כולם נכבשו) */
  frontier() {
    const set = this.conqueredSet;
    for (let i = 1; i <= ISLAND_COUNT; i++) if (!set.has(i) && !this.needsFullGame(i)) return i;
    for (let i = 1; i <= ISLAND_COUNT; i++) if (!set.has(i)) return i;
    return null;
  }
  /** אין חסימות שלבים — כל אי פתוח */
  isUnlocked() { return true; }
  needsFullGame(id) { return id > FREE_ISLANDS && !this.economy.ownsFullGame(); }
  canPlay(id) { return !this.needsFullGame(id); }

  currentIsland() { const c = this.isl.current; return c >= 1 && c <= ISLAND_COUNT ? c : HUB_ID; }
  setCurrent(id) { this.save({ current: id }); }

  /** כיבוש אי. הפיראטים נוחתים מיד אחרי שהבוט עוזב */
  conquer(id) {
    if (this.isConquered(id)) return { first: false };
    const pirates = { ...(this.isl.pirates || {}) };
    pirates[id] = { cleared: 0, crew: 0 };
    this.save({ conquered: [...this.isl.conquered, id], pirates });
    return { first: true };
  }

  // ---------- פיראטי הזמן ----------
  pirateState(id) { return (this.isl.pirates || {})[id] || { cleared: 0, crew: 0 }; }
  hasPirates(id) {
    if (id === HUB_ID || !this.isConquered(id)) return false;
    return Date.now() - (this.pirateState(id).cleared || 0) >= PIRATE_RESPAWN_MS;
  }
  /** כמה זמן (ms) עד שהפיראטים חוזרים (0 = הם כבר שם) */
  pirateReturnIn(id) { return Math.max(0, (this.pirateState(id).cleared || 0) + PIRATE_RESPAWN_MS - Date.now()); }
  pirateCrewIndex(id) { return this.pirateState(id).crew || 0; }
  defeatPirates(id) {
    const st = this.pirateState(id);
    this.save({ pirates: { ...(this.isl.pirates || {}), [id]: { cleared: Date.now(), crew: (st.crew || 0) + 1 } }, piratesBeaten: (this.isl.piratesBeaten || 0) + 1 });
  }
  piratesBeaten() { return this.isl.piratesBeaten || 0; }
  pirateIslands() { return this.isl.conquered.filter((id) => this.hasPirates(id)); }

  // ---------- כוכבים (1–3 לכל אי, נשמר השיא) ----------
  starsOf(id) { return (this.isl.stars || {})[id] || 0; }
  setStars(id, n) {
    const prev = this.starsOf(id);
    if (n <= prev) return 0;
    this.save({ stars: { ...(this.isl.stars || {}), [id]: n } });
    return n - prev;
  }
  totalStars() { return Object.values(this.isl.stars || {}).reduce((a, b) => a + b, 0); }
  starRewardsClaimed() { return this.isl.starRewards || 0; }
  setStarRewardsClaimed(n) { this.save({ starRewards: n }); }

  // ---------- תצוגה ----------
  /** ערכת התפאורה של אי (העולם שלו). האי המרכזי — מוזיאון הזמן על ערכת השיש */
  displayEra(id = this.currentIsland()) { return id === HUB_ID ? 2 : regionOf(id); }
  /** העולם הגבוה שבו נכבש אי כלשהו (לפתיחת חיות הבסיס) */
  maxEraReached() { let m = 1; for (const id of this.isl.conquered) m = Math.max(m, regionOf(id)); return m; }
  /** 'fullGame' — כל האיים החינמיים נכבשו וצריך לפתוח את המשחק; 'complete' — הכול נכבש */
  lockReason() {
    const f = this.frontier();
    if (!f) return 'complete';
    return this.needsFullGame(f) ? 'fullGame' : null;
  }

  resetAll() { this.store.set({ islands: { conquered: [], current: HUB_ID } }); }
}
