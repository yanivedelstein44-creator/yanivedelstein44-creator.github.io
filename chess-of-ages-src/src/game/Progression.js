/**
 * לוגיקת התקדמות: 10 עידנים × 2 שלבים.
 * עידנים 1-5 נבנים לפי הסדר. עידני פרימיום (6-10) נבנים רק אחרי השלמת הבסיס
 * ורק אם נרכשו — לפי סדר העידנים שבבעלות השחקן.
 */
import { ERAS, stageNumber } from '../config/Eras.js';
import { RULES } from '../config/AppConfig.js';

export class Progression {
  constructor(store, economy) {
    this.store = store;
    this.economy = economy;
  }

  get p() { return this.store.get('eraProgress'); }
  progressOf(eraId) { return this.p[eraId - 1] || 0; }

  baseComplete() {
    for (let e = 1; e <= RULES.baseEras; e++) if (this.progressOf(e) < 2) return false;
    return true;
  }

  totalBuilt() { return this.p.reduce((a, b) => a + b, 0); }

  /** העידן הגבוה ביותר שהשחקן הגיע אליו (לפתיחת חיות בסיס) */
  maxEraReached() {
    let m = 1;
    for (let e = 1; e <= 10; e++) if (this.progressOf(e) > 0) m = Math.max(m, e);
    return m;
  }

  /** השלב הבא לבנייה או null (נעול/הושלם) */
  nextStage() {
    for (let e = 1; e <= RULES.baseEras; e++) {
      const pr = this.progressOf(e);
      if (pr < 2) return { eraId: e, idx: pr, number: stageNumber(e, pr) };
    }
    for (let e = RULES.baseEras + 1; e <= RULES.totalEras; e++) {
      const pr = this.progressOf(e);
      if (pr < 2 && this.economy.ownsEra(e)) return { eraId: e, idx: pr, number: stageNumber(e, pr) };
    }
    return null;
  }

  /** למה אי אפשר לבנות עוד: 'premium' (צריך לרכוש עידן) או 'complete' */
  lockReason() {
    if (this.nextStage()) return null;
    const allDone = ERAS.every((e) => this.progressOf(e.id) >= 2);
    return allDone ? 'complete' : 'premium';
  }

  /** בונה את השלב הבא. מחזיר פרטי השלב (כולל האם נפתח עידן חדש) */
  buildNext() {
    const next = this.nextStage();
    if (!next) return null;
    const arr = this.p.slice();
    arr[next.eraId - 1] = next.idx + 1;
    const prevEra = this.homeEra();
    this.store.set({ eraProgress: arr, lastBuiltEra: next.eraId, selectedEra: null });
    return { ...next, newEra: next.eraId !== prevEra || next.idx === 0, era: ERAS[next.eraId - 1] };
  }

  homeEra() { return this.store.get('lastBuiltEra') || 1; }

  displayEra() {
    const sel = this.store.get('selectedEra');
    return sel && this.visitable(sel) ? sel : this.homeEra();
  }

  visitable(eraId) {
    const era = ERAS[eraId - 1];
    if (!era) return false;
    if (eraId === 1) return true;
    if (era.premium) return this.economy.ownsEra(eraId) && this.baseComplete();
    return this.progressOf(eraId) > 0;
  }

  visitableEras() { return ERAS.filter((e) => this.visitable(e.id)).map((e) => e.id); }

  /** מספר השלב לתצוגה ב-HUD: השלב האחרון שנבנה בעידן (0 אם טרם נבנה דבר) */
  displayStageNumber(eraId) {
    const pr = this.progressOf(eraId);
    return pr === 0 ? (eraId - 1) * 2 : stageNumber(eraId, pr - 1);
  }

  resetAll() {
    this.store.set({ eraProgress: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], lastBuiltEra: 1, selectedEra: null });
  }
}
