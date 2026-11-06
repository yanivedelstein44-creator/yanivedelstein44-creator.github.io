/**
 * GameController — חוקי שחמט (chess.js), שעונים, כלים שנאכלו, יתרון חומרי ותוצאות.
 */
import { Chess } from 'chess.js';

const VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export class GameController {
  constructor() {
    this.chess = new Chess();
    this.result = null;
    this.clock = null;
    this.reviews = [];
  }

  reset() {
    this.chess.reset();
    this.result = null;
    this.reviews = [];
    if (this.clock) this.startClock(this.clock.initial, this.clock.inc);
  }

  /** שחזור משחק שמור מרשימת מהלכי UCI */
  loadUci(list) {
    this.chess.reset();
    this.result = null;
    for (const u of list) {
      try { this.chess.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
    }
  }

  get turn() { return this.chess.turn(); }
  get fen() { return this.chess.fen(); }
  get ply() { return this.chess.history().length; }
  get board() { return this.chess.board(); }

  history() { return this.chess.history({ verbose: true }); }
  uci() { return this.history().map((m) => m.lan); }
  beforeFens() { return this.history().map((m) => m.before); }
  lastMove() { const h = this.history(); return h[h.length - 1] || null; }

  legalFrom(sq) { return this.chess.moves({ square: sq, verbose: true }); }
  pieceAt(sq) { return this.chess.get(sq); }
  inCheck() { return this.chess.inCheck(); }

  move(m) {
    if (this.result) return null;
    try {
      const mv = this.chess.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
      if (this.clock && this.clock.running) {
        const now = performance.now();
        const side = mv.color;
        this.clock[side] -= now - this.clock.last;
        this.clock[side] += this.clock.inc;
        this.clock.last = now;
        this.clock.running = this.chess.turn();
      }
      this.checkEnd();
      return mv;
    } catch {
      return null;
    }
  }

  checkEnd() {
    const c = this.chess;
    if (c.isCheckmate()) this.result = { winner: c.turn() === 'w' ? 'b' : 'w', reason: 'checkmate' };
    else if (c.isStalemate()) this.result = { winner: null, reason: 'stalemate' };
    else if (c.isThreefoldRepetition()) this.result = { winner: null, reason: 'repetition' };
    else if (c.isInsufficientMaterial()) this.result = { winner: null, reason: 'insufficient' };
    else if (c.isDrawByFiftyMoves()) this.result = { winner: null, reason: 'fifty' };
    if (this.result && this.clock) this.clock.running = null;
    return this.result;
  }

  finish(winner, reason) {
    if (this.result) return this.result;
    this.result = { winner, reason };
    if (this.clock) this.clock.running = null;
    return this.result;
  }

  kingSquare(color) {
    for (const row of this.chess.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square;
    return null;
  }

  /** כלים שנאכלו לפי צבע האוכל + יתרון חומרי (חיובי = לבן) */
  captured() {
    const by = { w: [], b: [] };
    for (const m of this.history()) if (m.captured) by[m.color].push(m.captured);
    const order = 'qrbnp';
    by.w.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    by.b.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    let mat = 0;
    for (const row of this.chess.board()) for (const p of row) if (p) mat += (p.color === 'w' ? 1 : -1) * VALUES[p.type];
    return { by, material: mat };
  }

  // ---------- שעון ----------
  startClock(initialMs, incMs = 0) {
    this.clock = { initial: initialMs, inc: incMs, w: initialMs, b: initialMs, running: 'w', last: performance.now() };
  }
  stopClock() { this.clock = null; }

  /** מחזיר צבע שנגמר לו הזמן (או null) */
  tickClock() {
    const c = this.clock;
    if (!c || !c.running || this.result) return null;
    const now = performance.now();
    const left = c[c.running] - (now - c.last);
    if (left <= 0) { c[c.running] = 0; return c.running; }
    return null;
  }

  clockLeft(color) {
    const c = this.clock;
    if (!c) return null;
    if (c.running === color && !this.result) return Math.max(0, c[color] - (performance.now() - c.last));
    return c[color];
  }

  /** סנכרון שעון מהיריב ברשת */
  syncClock(w, b) {
    if (!this.clock) return;
    this.clock.w = w; this.clock.b = b; this.clock.last = performance.now();
  }

  isAttacked(square, byColor) { return this.chess.isAttacked(square, byColor); }
}

export const PIECE_VALUE = VALUES;
export const GLYPH = { w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' }, b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' } };
