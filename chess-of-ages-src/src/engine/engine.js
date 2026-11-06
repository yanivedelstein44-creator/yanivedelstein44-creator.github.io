/**
 * ארמון השחמט — מנוע שחמט מהיר ל-AI (רץ בתוך Web Worker).
 *
 * לוח 0x88, Minimax (Negamax) עם Alpha-Beta, Quiescence, טבלאות מיקום (PST),
 * העמקה איטרטיבית עם מגבלת זמן, טבלת טרנספוזיציה, killer/history ordering
 * וזיהוי חזרות (Zobrist) — כדי שהמחשב לא ייתקע בתיקו כשהוא מנצח.
 *
 * כלים: לבן חיובי, שחור שלילי. 1=רגלי 2=פרש 3=רץ 4=צריח 5=מלכה 6=מלך
 */

export const PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;

const N_OFFS = [33, 31, 18, 14, -14, -18, -31, -33];
const K_OFFS = [1, -1, 16, -16, 15, 17, -15, -17];
const B_OFFS = [15, 17, -15, -17];
const R_OFFS = [1, -1, 16, -16];

const F_CAPTURE = 1, F_EP = 2, F_CASTLE = 4, F_DOUBLE = 8, F_PROMO = 16;

const MATE = 30000;
const MATE_BOUND = 29000;
const INF = 32000;
const MAX_PLY = 64;

const VALUE = [0, 100, 320, 330, 500, 900, 0];
const PHASE_W = [0, 0, 1, 1, 2, 4, 0];

// ---------- טבלאות מיקום (מנקודת המבט של לבן, שורה 8 למעלה) ----------
const PST_P = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0];
const PST_N = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50];
const PST_B = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20];
const PST_R = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0];
const PST_Q = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20];
const PST_K_MG = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20];
const PST_K_EG = [
  -50, -40, -30, -20, -20, -30, -40, -50,
  -30, -20, -10, 0, 0, -10, -20, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -30, 0, 0, 0, 0, -30, -30,
  -50, -30, -30, -30, -30, -30, -30, -50];
const PST = [null, PST_P, PST_N, PST_B, PST_R, PST_Q];

// מסיכת זכויות הצרחה לפי משבצת
const CASTLE_MASK = new Int8Array(128).fill(15);
CASTLE_MASK[0] = 13; CASTLE_MASK[4] = 12; CASTLE_MASK[7] = 14;
CASTLE_MASK[112] = 7; CASTLE_MASK[116] = 3; CASTLE_MASK[119] = 11;

// ---------- Zobrist (32+32 ביט, PRNG דטרמיניסטי) ----------
let seed = 0x9e3779b9 | 0;
function rnd32() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return seed | 0;
}
const Z_PLO = new Int32Array(12 * 128), Z_PHI = new Int32Array(12 * 128);
for (let i = 0; i < 12 * 128; i++) { Z_PLO[i] = rnd32(); Z_PHI[i] = rnd32(); }
const Z_CLO = new Int32Array(16), Z_CHI = new Int32Array(16);
for (let i = 0; i < 16; i++) { Z_CLO[i] = rnd32(); Z_CHI[i] = rnd32(); }
const Z_ELO = new Int32Array(8), Z_EHI = new Int32Array(8);
for (let i = 0; i < 8; i++) { Z_ELO[i] = rnd32(); Z_EHI[i] = rnd32(); }
const Z_SLO = rnd32(), Z_SHI = rnd32();

const pieceIndex = (p) => (p > 0 ? p - 1 : 5 - p); // 0..11

// ---------- טבלת טרנספוזיציה ----------
const TT_BITS = 18;
const TT_SIZE = 1 << TT_BITS;
const TT_MASK = TT_SIZE - 1;
const TT_EXACT = 1, TT_LOWER = 2, TT_UPPER = 3;

const FILES = 'abcdefgh';
export const sqName = (sq) => FILES[sq & 7] + ((sq >> 4) + 1);
export const sqFromName = (s) => (s.charCodeAt(1) - 49) * 16 + (s.charCodeAt(0) - 97);
const PROMO_CHAR = ['', '', 'n', 'b', 'r', 'q'];
const CHAR_PROMO = { n: KNIGHT, b: BISHOP, r: ROOK, q: QUEEN };

const mFrom = (m) => m & 127;
const mTo = (m) => (m >> 7) & 127;
const mPromo = (m) => (m >> 14) & 7;
const mFlags = (m) => (m >> 17) & 31;
const mk = (from, to, promo, flags) => from | (to << 7) | (promo << 14) | (flags << 17);

export class Engine {
  constructor() {
    this.b = new Int8Array(128);
    this.side = 1;
    this.castle = 0;
    this.ep = -1;
    this.half = 0;
    this.kings = [0, 0];
    this.hLo = 0; this.hHi = 0;
    // undo stack
    const S = 512;
    this.sp = 0;
    this.uMove = new Int32Array(S); this.uCap = new Int8Array(S); this.uCastle = new Int8Array(S);
    this.uEp = new Int16Array(S); this.uHalf = new Int16Array(S); this.uLo = new Int32Array(S); this.uHi = new Int32Array(S);
    // repetition history
    this.histLo = new Int32Array(2048); this.histHi = new Int32Array(2048); this.histLen = 0;
    // move buffers
    this.moves = new Int32Array(256 * (MAX_PLY + 2));
    this.scores = new Int32Array(256 * (MAX_PLY + 2));
    // TT
    this.ttLo = new Int32Array(TT_SIZE); this.ttHi = new Int32Array(TT_SIZE);
    this.ttMove = new Int32Array(TT_SIZE); this.ttScore = new Int16Array(TT_SIZE);
    this.ttDepth = new Int8Array(TT_SIZE); this.ttFlag = new Int8Array(TT_SIZE);
    // ordering helpers
    this.killers = new Int32Array(MAX_PLY * 2);
    this.history = new Int32Array(128 * 128);
    this.nodes = 0; this.stop = false; this.deadline = 0;
    this.useQuiescence = true;
  }

  // ---------- FEN ----------
  load(fen) {
    const b = this.b; b.fill(0);
    const [placement, side, castling, ep, half] = fen.trim().split(/\s+/);
    let r = 7, f = 0;
    const map = { p: PAWN, n: KNIGHT, b: BISHOP, r: ROOK, q: QUEEN, k: KING };
    for (const ch of placement) {
      if (ch === '/') { r--; f = 0; continue; }
      if (ch >= '1' && ch <= '8') { f += +ch; continue; }
      const t = map[ch.toLowerCase()];
      const p = ch === ch.toLowerCase() ? -t : t;
      const sq = r * 16 + f;
      b[sq] = p;
      if (p === KING) this.kings[0] = sq; else if (p === -KING) this.kings[1] = sq;
      f++;
    }
    this.side = side === 'b' ? -1 : 1;
    this.castle = 0;
    if (castling && castling !== '-') {
      if (castling.includes('K')) this.castle |= 1;
      if (castling.includes('Q')) this.castle |= 2;
      if (castling.includes('k')) this.castle |= 4;
      if (castling.includes('q')) this.castle |= 8;
    }
    this.ep = ep && ep !== '-' ? sqFromName(ep) : -1;
    this.half = half ? parseInt(half, 10) || 0 : 0;
    this.sp = 0;
    this.computeHash();
  }

  computeHash() {
    let lo = 0, hi = 0;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = this.b[sq];
      if (p) { const i = pieceIndex(p) * 128 + sq; lo ^= Z_PLO[i]; hi ^= Z_PHI[i]; }
    }
    lo ^= Z_CLO[this.castle]; hi ^= Z_CHI[this.castle];
    if (this.ep !== -1) { lo ^= Z_ELO[this.ep & 7]; hi ^= Z_EHI[this.ep & 7]; }
    if (this.side === -1) { lo ^= Z_SLO; hi ^= Z_SHI; }
    this.hLo = lo; this.hHi = hi;
  }

  xorPiece(p, sq) {
    const i = pieceIndex(p) * 128 + sq;
    this.hLo ^= Z_PLO[i]; this.hHi ^= Z_PHI[i];
  }

  // ---------- התקפות ----------
  attacked(sq, by) {
    const b = this.b;
    let s;
    if (by === 1) {
      s = sq - 15; if (!(s & 0x88) && b[s] === 1) return true;
      s = sq - 17; if (!(s & 0x88) && b[s] === 1) return true;
    } else {
      s = sq + 15; if (!(s & 0x88) && b[s] === -1) return true;
      s = sq + 17; if (!(s & 0x88) && b[s] === -1) return true;
    }
    const kn = KNIGHT * by, kg = KING * by, bi = BISHOP * by, ro = ROOK * by, qu = QUEEN * by;
    for (let i = 0; i < 8; i++) { s = sq + N_OFFS[i]; if (!(s & 0x88) && b[s] === kn) return true; }
    for (let i = 0; i < 8; i++) { s = sq + K_OFFS[i]; if (!(s & 0x88) && b[s] === kg) return true; }
    for (let i = 0; i < 4; i++) {
      const o = B_OFFS[i]; s = sq + o;
      while (!(s & 0x88)) { const p = b[s]; if (p) { if (p === bi || p === qu) return true; break; } s += o; }
    }
    for (let i = 0; i < 4; i++) {
      const o = R_OFFS[i]; s = sq + o;
      while (!(s & 0x88)) { const p = b[s]; if (p) { if (p === ro || p === qu) return true; break; } s += o; }
    }
    return false;
  }

  inCheck(side) { return this.attacked(this.kings[side === 1 ? 0 : 1], -side); }

  /** אחרי make: האם השחקן שזז השאיר את המלך שלו מאוים */
  leftInCheck() { const mover = -this.side; return this.attacked(this.kings[mover === 1 ? 0 : 1], this.side); }

  // ---------- יצירת מסעים ----------
  gen(out, n, capturesOnly) {
    const b = this.b, side = this.side;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = b[sq];
      if (p === 0 || (p > 0) !== (side > 0)) continue;
      const t = p > 0 ? p : -p;
      if (t === PAWN) {
        const fwd = 16 * side, rank = sq >> 4;
        const promoRank = side === 1 ? 6 : 1, startRank = side === 1 ? 1 : 6;
        for (let k = 0; k < 2; k++) {
          const c = sq + (side === 1 ? (k ? 17 : 15) : (k ? -17 : -15));
          if (c & 0x88) continue;
          const tp = b[c];
          if (tp !== 0 && (tp > 0) !== (side > 0)) {
            if (rank === promoRank) {
              out[n++] = mk(sq, c, QUEEN, F_CAPTURE | F_PROMO);
              if (!capturesOnly) {
                out[n++] = mk(sq, c, KNIGHT, F_CAPTURE | F_PROMO);
                out[n++] = mk(sq, c, ROOK, F_CAPTURE | F_PROMO);
                out[n++] = mk(sq, c, BISHOP, F_CAPTURE | F_PROMO);
              }
            } else out[n++] = mk(sq, c, 0, F_CAPTURE);
          } else if (c === this.ep && tp === 0) {
            out[n++] = mk(sq, c, 0, F_CAPTURE | F_EP);
          }
        }
        const to = sq + fwd;
        if (!(to & 0x88) && b[to] === 0) {
          if (rank === promoRank) {
            out[n++] = mk(sq, to, QUEEN, F_PROMO);
            if (!capturesOnly) {
              out[n++] = mk(sq, to, KNIGHT, F_PROMO);
              out[n++] = mk(sq, to, ROOK, F_PROMO);
              out[n++] = mk(sq, to, BISHOP, F_PROMO);
            }
          } else if (!capturesOnly) {
            out[n++] = mk(sq, to, 0, 0);
            if (rank === startRank && b[to + fwd] === 0) out[n++] = mk(sq, to + fwd, 0, F_DOUBLE);
          }
        }
      } else if (t === KNIGHT || t === KING) {
        const offs = t === KNIGHT ? N_OFFS : K_OFFS;
        for (let i = 0; i < 8; i++) {
          const to = sq + offs[i];
          if (to & 0x88) continue;
          const tp = b[to];
          if (tp === 0) { if (!capturesOnly) out[n++] = mk(sq, to, 0, 0); }
          else if ((tp > 0) !== (side > 0)) out[n++] = mk(sq, to, 0, F_CAPTURE);
        }
        if (t === KING && !capturesOnly) {
          if (side === 1 && sq === 4) {
            if ((this.castle & 1) && b[5] === 0 && b[6] === 0 && b[7] === ROOK &&
              !this.attacked(4, -1) && !this.attacked(5, -1) && !this.attacked(6, -1)) out[n++] = mk(4, 6, 0, F_CASTLE);
            if ((this.castle & 2) && b[3] === 0 && b[2] === 0 && b[1] === 0 && b[0] === ROOK &&
              !this.attacked(4, -1) && !this.attacked(3, -1) && !this.attacked(2, -1)) out[n++] = mk(4, 2, 0, F_CASTLE);
          } else if (side === -1 && sq === 116) {
            if ((this.castle & 4) && b[117] === 0 && b[118] === 0 && b[119] === -ROOK &&
              !this.attacked(116, 1) && !this.attacked(117, 1) && !this.attacked(118, 1)) out[n++] = mk(116, 118, 0, F_CASTLE);
            if ((this.castle & 8) && b[115] === 0 && b[114] === 0 && b[113] === 0 && b[112] === -ROOK &&
              !this.attacked(116, 1) && !this.attacked(115, 1) && !this.attacked(114, 1)) out[n++] = mk(116, 114, 0, F_CASTLE);
          }
        }
      } else {
        const offs = t === BISHOP ? B_OFFS : t === ROOK ? R_OFFS : K_OFFS;
        const len = offs.length;
        for (let i = 0; i < len; i++) {
          const o = offs[i];
          let to = sq + o;
          while (!(to & 0x88)) {
            const tp = b[to];
            if (tp === 0) { if (!capturesOnly) out[n++] = mk(sq, to, 0, 0); }
            else { if ((tp > 0) !== (side > 0)) out[n++] = mk(sq, to, 0, F_CAPTURE); break; }
            to += o;
          }
        }
      }
    }
    return n;
  }

  // ---------- ביצוע / ביטול מסע ----------
  make(m) {
    const b = this.b;
    const from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, fl = (m >> 17) & 31;
    const sp = this.sp++;
    this.uMove[sp] = m; this.uCastle[sp] = this.castle; this.uEp[sp] = this.ep;
    this.uHalf[sp] = this.half; this.uLo[sp] = this.hLo; this.uHi[sp] = this.hHi;
    this.histLo[this.histLen] = this.hLo; this.histHi[this.histLen] = this.hHi; this.histLen++;

    const side = this.side;
    const p = b[from];
    if (this.ep !== -1) { this.hLo ^= Z_ELO[this.ep & 7]; this.hHi ^= Z_EHI[this.ep & 7]; }
    this.hLo ^= Z_CLO[this.castle]; this.hHi ^= Z_CHI[this.castle];

    this.xorPiece(p, from);
    b[from] = 0;
    let cap;
    if (fl & F_EP) {
      const capSq = to - 16 * side;
      cap = b[capSq]; b[capSq] = 0; this.xorPiece(cap, capSq);
    } else {
      cap = b[to];
      if (cap) this.xorPiece(cap, to);
    }
    const placed = promo ? promo * side : p;
    b[to] = placed; this.xorPiece(placed, to);
    this.uCap[sp] = cap;

    if (fl & F_CASTLE) {
      let rf, rt;
      if (to === from + 2) { rf = from + 3; rt = from + 1; } else { rf = from - 4; rt = from - 1; }
      const r = b[rf]; b[rf] = 0; b[rt] = r;
      this.xorPiece(r, rf); this.xorPiece(r, rt);
    }
    if (p === KING * side) this.kings[side === 1 ? 0 : 1] = to;

    this.castle &= CASTLE_MASK[from] & CASTLE_MASK[to];
    this.hLo ^= Z_CLO[this.castle]; this.hHi ^= Z_CHI[this.castle];

    if (fl & F_DOUBLE) {
      this.ep = from + 16 * side;
      this.hLo ^= Z_ELO[this.ep & 7]; this.hHi ^= Z_EHI[this.ep & 7];
    } else this.ep = -1;

    this.half = (p === PAWN * side || cap !== 0) ? 0 : this.half + 1;
    this.side = -side;
    this.hLo ^= Z_SLO; this.hHi ^= Z_SHI;
  }

  unmake() {
    const sp = --this.sp;
    const m = this.uMove[sp];
    const from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, fl = (m >> 17) & 31;
    const b = this.b;
    this.side = -this.side;
    const side = this.side;
    const p = promo ? PAWN * side : b[to];
    b[from] = p;
    const cap = this.uCap[sp];
    if (fl & F_EP) { b[to] = 0; b[to - 16 * side] = cap; } else b[to] = cap;
    if (fl & F_CASTLE) {
      let rf, rt;
      if (to === from + 2) { rf = from + 3; rt = from + 1; } else { rf = from - 4; rt = from - 1; }
      b[rf] = b[rt]; b[rt] = 0;
    }
    if (p === KING * side) this.kings[side === 1 ? 0 : 1] = from;
    this.castle = this.uCastle[sp]; this.ep = this.uEp[sp]; this.half = this.uHalf[sp];
    this.hLo = this.uLo[sp]; this.hHi = this.uHi[sp];
    this.histLen--;
  }

  isRepetition() {
    const lo = this.hLo, hi = this.hHi;
    const stop = Math.max(0, this.histLen - this.half);
    for (let i = this.histLen - 2; i >= stop; i -= 2) {
      if (this.histLo[i] === lo && this.histHi[i] === hi) return true;
    }
    return false;
  }

  /** מסעים חוקיים בלבד (לשורש) */
  legalMoves() {
    const buf = new Int32Array(256);
    const n = this.gen(buf, 0, false);
    const res = [];
    for (let i = 0; i < n; i++) {
      this.make(buf[i]);
      if (!this.leftInCheck()) res.push(buf[i]);
      this.unmake();
    }
    return res;
  }

  // ---------- הערכת עמדה ----------
  /** ציון מנקודת המבט של הצד שתורו */
  evaluate() {
    const b = this.b;
    let mg = 0, phase = 0, wB = 0, bB = 0, wMat = 0, bMat = 0;
    let wk = 0, bk = 0;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = b[sq];
      if (p === 0) continue;
      const r = sq >> 4, f = sq & 7;
      if (p > 0) {
        if (p === KING) { wk = (7 - r) * 8 + f; continue; }
        mg += VALUE[p] + PST[p][(7 - r) * 8 + f];
        phase += PHASE_W[p]; wMat += VALUE[p];
        if (p === BISHOP) wB++;
      } else {
        const t = -p;
        if (t === KING) { bk = r * 8 + f; continue; }
        mg -= VALUE[t] + PST[t][r * 8 + f];
        phase += PHASE_W[t]; bMat += VALUE[t];
        if (t === BISHOP) bB++;
      }
    }
    if (phase > 24) phase = 24;
    const kw = (PST_K_MG[wk] * phase + PST_K_EG[wk] * (24 - phase)) / 24;
    const kb = (PST_K_MG[bk] * phase + PST_K_EG[bk] * (24 - phase)) / 24;
    let score = mg + kw - kb;
    if (wB >= 2) score += 30;
    if (bB >= 2) score -= 30;

    // Mop-up: בסיום משחק עם יתרון — לדחוק את המלך היריב לפינה
    if (phase <= 8) {
      const diff = wMat - bMat;
      if (Math.abs(diff) >= 300) {
        const wks = this.kings[0], bks = this.kings[1];
        const strongK = diff > 0 ? wks : bks, weakK = diff > 0 ? bks : wks;
        const wr = weakK >> 4, wf = weakK & 7, sr = strongK >> 4, sf = strongK & 7;
        const centerDist = Math.max(3 - wr, wr - 4) + Math.max(3 - wf, wf - 4);
        const kingDist = Math.abs(wr - sr) + Math.abs(wf - sf);
        const bonus = centerDist * 10 + (14 - kingDist) * 4;
        score += diff > 0 ? bonus : -bonus;
      }
    }
    return Math.round(score) * this.side;
  }

  // ---------- סידור מסעים ----------
  scoreMoves(start, end, ply, hashMove) {
    const b = this.b, moves = this.moves, scores = this.scores;
    const k1 = this.killers[ply * 2], k2 = this.killers[ply * 2 + 1];
    for (let i = start; i < end; i++) {
      const m = moves[i];
      if (m === hashMove) { scores[i] = 2000000; continue; }
      const fl = (m >> 17) & 31;
      if (fl & F_CAPTURE) {
        const victim = (fl & F_EP) ? PAWN : Math.abs(b[(m >> 7) & 127]);
        const attacker = Math.abs(b[m & 127]);
        scores[i] = 1000000 + VALUE[victim] * 10 - attacker;
      } else if (fl & F_PROMO) {
        scores[i] = 900000 + VALUE[(m >> 14) & 7];
      } else if (m === k1) scores[i] = 800000;
      else if (m === k2) scores[i] = 700000;
      else scores[i] = this.history[(m & 127) * 128 + ((m >> 7) & 127)];
    }
  }

  pickNext(i, end) {
    const moves = this.moves, scores = this.scores;
    let best = i;
    for (let j = i + 1; j < end; j++) if (scores[j] > scores[best]) best = j;
    if (best !== i) {
      const tm = moves[i]; moves[i] = moves[best]; moves[best] = tm;
      const ts = scores[i]; scores[i] = scores[best]; scores[best] = ts;
    }
    return moves[i];
  }

  checkTime() {
    if ((++this.nodes & 2047) === 0 && Date.now() > this.deadline) this.stop = true;
    return this.stop;
  }

  // ---------- חיפוש ----------
  quiesce(alpha, beta, ply, start) {
    if (this.checkTime()) return 0;
    const stand = this.evaluate();
    if (!this.useQuiescence) return stand;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (ply >= MAX_PLY - 1) return stand;
    const end = this.gen(this.moves, start, true);
    this.scoreMoves(start, end, ply, 0);
    for (let i = start; i < end; i++) {
      const m = this.pickNext(i, end);
      const fl = (m >> 17) & 31;
      // Delta pruning
      if (!(fl & F_PROMO)) {
        const victim = (fl & F_EP) ? PAWN : Math.abs(this.b[(m >> 7) & 127]);
        if (stand + VALUE[victim] + 200 < alpha) continue;
      }
      this.make(m);
      if (this.leftInCheck()) { this.unmake(); continue; }
      const score = -this.quiesce(-beta, -alpha, ply + 1, end);
      this.unmake();
      if (this.stop) return 0;
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  negamax(depth, alpha, beta, ply, start) {
    if (this.checkTime()) return 0;
    if (ply > 0 && (this.half >= 100 || this.isRepetition())) return 0;
    const inCheck = this.inCheck(this.side);
    if (inCheck && ply < MAX_PLY - 4) depth++;
    if (depth <= 0) return this.quiesce(alpha, beta, ply, start);
    if (ply >= MAX_PLY - 2) return this.evaluate();

    // TT
    const ti = this.hLo & TT_MASK;
    let hashMove = 0;
    if (this.ttLo[ti] === this.hLo && this.ttHi[ti] === this.hHi) {
      hashMove = this.ttMove[ti];
      if (ply > 0 && this.ttDepth[ti] >= depth) {
        let s = this.ttScore[ti];
        if (s > MATE_BOUND) s -= ply; else if (s < -MATE_BOUND) s += ply;
        const fl = this.ttFlag[ti];
        if (fl === TT_EXACT) return s;
        if (fl === TT_LOWER && s >= beta) return s;
        if (fl === TT_UPPER && s <= alpha) return s;
      }
    }

    const end = this.gen(this.moves, start, false);
    this.scoreMoves(start, end, ply, hashMove);
    const alphaOrig = alpha;
    let best = -INF, bestMove = 0, legal = 0;
    for (let i = start; i < end; i++) {
      const m = this.pickNext(i, end);
      this.make(m);
      if (this.leftInCheck()) { this.unmake(); continue; }
      legal++;
      let score;
      if (legal === 1) score = -this.negamax(depth - 1, -beta, -alpha, ply + 1, end);
      else {
        score = -this.negamax(depth - 1, -alpha - 1, -alpha, ply + 1, end);
        if (score > alpha && score < beta) score = -this.negamax(depth - 1, -beta, -alpha, ply + 1, end);
      }
      this.unmake();
      if (this.stop) return 0;
      if (score > best) {
        best = score; bestMove = m;
        if (score > alpha) {
          alpha = score;
          if (score >= beta) {
            if (!((m >> 17) & (F_CAPTURE | F_PROMO))) {
              if (this.killers[ply * 2] !== m) {
                this.killers[ply * 2 + 1] = this.killers[ply * 2];
                this.killers[ply * 2] = m;
              }
              const hi = (m & 127) * 128 + ((m >> 7) & 127);
              this.history[hi] = Math.min(600000, this.history[hi] + depth * depth);
            }
            break;
          }
        }
      }
    }
    if (legal === 0) return inCheck ? -MATE + ply : 0;

    let store = best;
    if (store > MATE_BOUND) store += ply; else if (store < -MATE_BOUND) store -= ply;
    this.ttLo[ti] = this.hLo; this.ttHi[ti] = this.hHi; this.ttMove[ti] = bestMove;
    this.ttScore[ti] = store; this.ttDepth[ti] = depth;
    this.ttFlag[ti] = best <= alphaOrig ? TT_UPPER : best >= beta ? TT_LOWER : TT_EXACT;
    return best;
  }

  /**
   * חיפוש מהשורש עם העמקה איטרטיבית.
   * @param {{maxDepth:number,timeMs:number,noise:number,quiescence:boolean}} o
   */
  search(o) {
    const root = this.legalMoves();
    if (root.length === 0) return null;
    this.nodes = 0; this.stop = false;
    this.deadline = Date.now() + o.timeMs;
    this.useQuiescence = o.quiescence !== false;
    this.killers.fill(0);
    for (let i = 0; i < this.history.length; i++) this.history[i] >>= 2;

    const t0 = Date.now();
    if (root.length === 1) return { move: root[0], score: 0, depth: 0, nodes: 0 };

    const noise = o.noise || 0;
    const rootScores = new Float64Array(root.length);
    let bestMove = root[0], bestScore = -INF, doneDepth = 0;
    let order = root.slice();

    for (let depth = 1; depth <= o.maxDepth; depth++) {
      let alpha = -INF;
      const beta = INF;
      let iterBest = 0, iterScore = -INF;
      const iterScores = new Map();
      let completed = true;
      for (let i = 0; i < order.length; i++) {
        const m = order[i];
        this.make(m);
        let score;
        if (noise > 0 || i === 0) {
          score = -this.negamax(depth - 1, -beta, noise > 0 ? INF : -alpha, 1, 0);
        } else {
          score = -this.negamax(depth - 1, -alpha - 1, -alpha, 1, 0);
          if (score > alpha) score = -this.negamax(depth - 1, -beta, -alpha, 1, 0);
        }
        this.unmake();
        if (this.stop) { completed = false; break; }
        iterScores.set(m, score);
        if (score > iterScore) { iterScore = score; iterBest = m; }
        if (noise === 0 && score > alpha) alpha = score;
      }
      if (!completed && depth > 1) break;
      if (iterBest) {
        bestMove = iterBest; bestScore = iterScore; doneDepth = depth;
        for (let i = 0; i < root.length; i++) rootScores[i] = iterScores.has(root[i]) ? iterScores.get(root[i]) : -INF;
      }
      // מסע הכי טוב ראשון באיטרציה הבאה
      order.sort((a, b) => (iterScores.get(b) ?? -INF) - (iterScores.get(a) ?? -INF));
      if (Math.abs(bestScore) > MATE_BOUND) break;
      if (Date.now() - t0 > o.timeMs * 0.5) break;
      if (!completed) break;
    }

    if (noise > 0) {
      let pick = bestMove, pickScore = -INF;
      for (let i = 0; i < root.length; i++) {
        if (rootScores[i] <= -INF) continue;
        // לא "מרעישים" מסעי מט — מט הוא מט
        const isMate = Math.abs(rootScores[i]) > MATE_BOUND;
        const s = rootScores[i] + (isMate ? 0 : (Math.random() * 2 - 1) * noise);
        if (s > pickScore) { pickScore = s; pick = root[i]; }
      }
      bestMove = pick;
    }
    return { move: bestMove, score: bestScore, depth: doneDepth, nodes: this.nodes };
  }

  perft(depth) {
    if (depth === 0) return 1;
    const buf = new Int32Array(256);
    const n = this.gen(buf, 0, false);
    let total = 0;
    for (let i = 0; i < n; i++) {
      this.make(buf[i]);
      if (!this.leftInCheck()) total += this.perft(depth - 1);
      this.unmake();
    }
    return total;
  }
}

export function moveToObj(m) {
  const promo = mPromo(m);
  return { from: sqName(mFrom(m)), to: sqName(mTo(m)), promotion: promo ? PROMO_CHAR[promo] : undefined };
}

export function moveToUci(m) {
  const o = moveToObj(m);
  return o.from + o.to + (o.promotion || '');
}

// ---------- רמות קושי ----------
export const LEVELS = {
  // שומר השער — יריב סלחני: עומק 1, בלי Quiescence, רעש גדול ולפעמים מסע אקראי
  easy: { maxDepth: 1, timeMs: 400, noise: 140, quiescence: false, blunder: 0.18, book: false },
  // אביר הממלכה — רואה 3 מסעים קדימה + חילופים, מעט רעש
  medium: { maxDepth: 3, timeMs: 1400, noise: 22, quiescence: true, blunder: 0, book: true },
  // המלך העליון — העמקה איטרטיבית עד ~2.6 שניות
  hard: { maxDepth: 40, timeMs: 2600, noise: 0, quiescence: true, blunder: 0, book: true },
};

// ספר פתיחות קטן — לגיוון (השחור עונה)
const BOOK = {
  '': [],
  'e2e4': ['e7e5', 'c7c5', 'e7e6', 'c7c6'],
  'd2d4': ['d7d5', 'g8f6', 'e7e6'],
  'c2c4': ['e7e5', 'g8f6', 'c7c5'],
  'g1f3': ['d7d5', 'g8f6'],
  'e2e4 e7e5 g1f3': ['b8c6'],
  'e2e4 c7c5 g1f3': ['d7d6', 'b8c6', 'e7e6'],
  'd2d4 d7d5 c2c4': ['e7e6', 'c7c6'],
  'd2d4 g8f6 c2c4': ['e7e6', 'g7g6'],
};

const engine = new Engine();

/**
 * חושב על המסע הבא.
 * @param {{fen:string, history?:string[], uci?:string[], level?:'easy'|'medium'|'hard', timeScale?:number}} req
 */
export function think(req) {
  const level = LEVELS[req.level] || LEVELS.medium;
  const t0 = Date.now();
  // היסטוריית עמדות לזיהוי חזרות
  engine.histLen = 0;
  for (const f of req.history || []) {
    engine.load(f);
    engine.histLo[engine.histLen] = engine.hLo;
    engine.histHi[engine.histLen] = engine.hHi;
    engine.histLen++;
  }
  const histLen = engine.histLen;
  engine.load(req.fen);
  engine.histLen = histLen;

  const legal = engine.legalMoves();
  if (legal.length === 0) return { move: null };

  // ספר פתיחות
  if (level.book && req.uci) {
    const key = req.uci.join(' ');
    const cands = (BOOK[key] || []).filter((u) => legal.some((m) => moveToUci(m) === u));
    if (cands.length) {
      const u = cands[Math.floor(Math.random() * cands.length)];
      return { move: { from: u.slice(0, 2), to: u.slice(2, 4) }, book: true, depth: 0, nodes: 0, ms: Date.now() - t0 };
    }
  }

  // "טעות מכוונת" ברמה הקלה
  if (level.blunder && Math.random() < level.blunder) {
    const m = legal[Math.floor(Math.random() * legal.length)];
    return { move: moveToObj(m), blunder: true, depth: 0, nodes: 0, ms: Date.now() - t0 };
  }

  const scale = req.timeScale || 1;
  const res = engine.search({
    maxDepth: level.maxDepth,
    timeMs: Math.max(150, level.timeMs * scale),
    noise: level.noise,
    quiescence: level.quiescence,
  });
  return {
    move: res ? moveToObj(res.move) : null,
    score: res ? res.score : 0,
    depth: res ? res.depth : 0,
    nodes: res ? res.nodes : 0,
    ms: Date.now() - t0,
  };
}

export function perft(fen, depth) {
  const e = new Engine();
  e.load(fen);
  return e.perft(depth);
}

/**
 * ניתוח עמדה (לרמזים, משוב על מהלכים וסיכום משחק).
 * מחזיר ציון מנקודת המבט של הצד שתורו + המסע הטוב ביותר.
 */
export function analyze(req) {
  engine.histLen = 0;
  for (const f of req.history || []) {
    engine.load(f);
    engine.histLo[engine.histLen] = engine.hLo;
    engine.histHi[engine.histLen] = engine.hHi;
    engine.histLen++;
  }
  const histLen = engine.histLen;
  engine.load(req.fen);
  engine.histLen = histLen;
  const legal = engine.legalMoves();
  if (legal.length === 0) {
    return { move: null, score: engine.inCheck(engine.side) ? -MATE : 0, depth: 0, mate: engine.inCheck(engine.side) };
  }
  const res = engine.search({ maxDepth: req.maxDepth || 7, timeMs: req.timeMs || 350, noise: 0, quiescence: true });
  return { move: moveToObj(res.move), score: res.score, depth: res.depth };
}
