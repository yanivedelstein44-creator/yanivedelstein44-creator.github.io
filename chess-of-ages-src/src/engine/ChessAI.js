/**
 * ChessAI — עטיפה למנוע: שני Web Workers (חשיבה + ניתוח) עם נפילה חכמה ל-main thread
 * (setTimeout קצר) אם Workers לא זמינים — כך שהממשק לעולם לא קופא.
 */
import AIWorker from './ai.worker.js?worker&inline';
import { think as thinkSync, analyze as analyzeSync } from './engine.js';

class WorkerLane {
  constructor(name) {
    this.name = name;
    this.pending = new Map();
    this.seq = 0;
    this.broken = false;
    try {
      this.w = new AIWorker();
      this.w.onmessage = (e) => {
        const { id, ok, result, error } = e.data || {};
        const p = this.pending.get(id);
        if (!p) return;
        clearTimeout(p.timer);
        this.pending.delete(id);
        ok ? p.resolve(result) : p.reject(new Error(error));
      };
      this.w.onerror = () => this.fail();
    } catch {
      this.broken = true;
    }
  }

  fail() {
    this.broken = true;
    for (const [, p] of this.pending) { clearTimeout(p.timer); p.fallback(); }
    this.pending.clear();
    try { this.w?.terminate(); } catch { /* ok */ }
  }

  run(type, payload, expectedMs) {
    const sync = () => new Promise((res) => setTimeout(() => {
      const scaled = { ...payload, timeScale: Math.min(payload.timeScale || 1, 0.6), timeMs: payload.timeMs ? Math.min(payload.timeMs, 400) : undefined };
      res(type === 'analyze' ? analyzeSync(scaled) : thinkSync(scaled));
    }, 30));
    if (this.broken || !this.w) return sync();
    return new Promise((resolve, reject) => {
      const id = ++this.seq;
      const fallback = () => sync().then(resolve, reject);
      const timer = setTimeout(() => { this.pending.delete(id); this.fail(); fallback(); }, expectedMs * 3 + 4000);
      this.pending.set(id, { resolve, reject, timer, fallback });
      this.w.postMessage({ id, type, payload });
    });
  }
}

export class ChessAI {
  constructor() {
    this.main = new WorkerLane('main');
    this.review = new WorkerLane('review');
  }

  /** @returns {Promise<{move:{from,to,promotion}, score, depth, nodes}>} */
  think({ fen, history, uci, level }) {
    const ms = { easy: 400, medium: 1400, hard: 2600 }[level] || 1500;
    return this.main.run('think', { fen, history, uci, level }, ms);
  }

  analyze({ fen, history, timeMs = 350, maxDepth = 7 }, lane = 'review') {
    return (lane === 'main' ? this.main : this.review).run('analyze', { fen, history, timeMs, maxDepth }, timeMs);
  }
}

/** סיווג מהלך לפי הפסד בסנטי-פאונים */
export function classifyMove(loss, { isBest, sacrifice }) {
  if (isBest && sacrifice) return 'brilliant';
  if (isBest || loss <= 12) return 'best';
  if (loss < 60) return 'good';
  if (loss < 150) return 'inaccuracy';
  if (loss < 300) return 'mistake';
  return 'blunder';
}

const clampCp = (s) => Math.max(-1500, Math.min(1500, s));
export const winProb = (cp) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clampCp(cp))) - 1);
export function moveAccuracy(bestCp, playedCp) {
  const diff = Math.max(0, winProb(bestCp) - winProb(playedCp));
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * diff) - 3.1669));
}
export { clampCp };
