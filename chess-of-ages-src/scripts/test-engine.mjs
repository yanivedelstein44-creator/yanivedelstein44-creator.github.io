// בדיקות מנוע: perft מול ערכים ידועים + בדיקות טקטיות + מהירות
import { perft, think } from '../src/engine/engine.js';
import { Chess } from 'chess.js';

const cases = [
  ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 4, 197281],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 3, 97862],
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 5, 674624],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 4, 422333],
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 3, 62379],
  ['r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', 3, 89890],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R b KQkq - 0 1', 3, null],
];
let ok = true;
for (const [fen, d, expected] of cases) {
  const t = Date.now();
  const got = perft(fen, d);
  const ref = expected ?? new Chess(fen).perft(d);
  const pass = got === ref;
  ok &&= pass;
  console.log(`${pass ? 'PASS' : 'FAIL'} perft(${d}) = ${got} (expected ${ref}) ${Date.now() - t}ms`);
}

// טקטיקה: מט בצעד אחד לשחור
const tactical = [
  ['r5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1', 'a8a1', 'mate in 1 (back rank)'],
  ['6k1/5ppp/8/8/3q4/8/5PPP/4Q1K1 b - - 0 1', null, 'sanity'],
  ['rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR b KQkq - 0 3', null, 'already mate check'],
  ['4k3/8/8/8/8/8/3q4/4K3 b - - 0 1', null, 'free'],
  ['rnbqkb1r/pppp1ppp/5n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', 'g7g6|d8e7|h5f7', 'defend f7 (must not allow Qxf7#)'],
  ['k7/8/1K6/8/8/8/8/7R w - - 0 1', 'h1h8', 'mate in 1 white'],
];
for (const level of ['medium', 'hard']) {
  for (const [fen, best, label] of tactical) {
    const c = new Chess(fen);
    if (c.isGameOver()) { console.log(`skip (game over) ${label}`); continue; }
    const r = think({ fen, level });
    const uci = r.move ? r.move.from + r.move.to + (r.move.promotion || '') : 'none';
    let legal = true; try { c.move(r.move); } catch { legal = false; }
    let pass = legal;
    if (best) pass &&= best.split('|').some((b) => uci.startsWith(b) || (label.includes('defend') && !c.isCheckmate() && true));
    if (label.includes('defend')) { // אחרי המסע של השחור, ללבן אסור שיהיה מט ב-1
      const c2 = new Chess(c.fen());
      pass = legal && !c2.moves({ verbose: true }).some((m) => { c2.move(m); const mate = c2.isCheckmate(); c2.undo(); return mate; });
    }
    ok &&= pass;
    console.log(`${pass ? 'PASS' : 'FAIL'} [${level}] ${label}: ${uci} depth=${r.depth} nodes=${r.nodes} ${r.ms}ms score=${r.score}`);
  }
}

// מהירות מעמדת אמצע משחק
const mid = 'r1bq1rk1/pp2bppp/2n1pn2/3p4/2PP4/2N1PN2/PP1BBPPP/R2QK2R b KQ - 4 8';
for (const level of ['easy', 'medium', 'hard']) {
  const r = think({ fen: mid, level });
  console.log(`[${level}] midgame -> ${JSON.stringify(r.move)} depth=${r.depth} nodes=${r.nodes} ${r.ms}ms nps=${Math.round(r.nodes / Math.max(1, r.ms) * 1000)}`);
}

// משחק שלם מחשב מול מחשב (רמה קשה נגד בינונית) לבדיקת חוקיות לאורך זמן
const g = new Chess();
let plies = 0;
while (!g.isGameOver() && plies < 160) {
  const level = g.turn() === 'w' ? 'medium' : 'hard';
  const hist = g.history({ verbose: true });
  const r = think({ fen: g.fen(), history: hist.map((h) => h.before), uci: hist.map((h) => h.lan), level, timeScale: 0.25 });
  try { g.move(r.move); } catch (e) { console.log('ILLEGAL', g.fen(), JSON.stringify(r.move)); ok = false; break; }
  plies++;
}
console.log(`selfplay: ${plies} plies, result: ${g.isCheckmate() ? 'checkmate (' + (g.turn() === 'w' ? 'black' : 'white') + ' wins)' : g.isDraw() ? 'draw' : 'unfinished'}`);
console.log(ok ? '\nALL OK' : '\nSOME FAILURES');
process.exit(ok ? 0 : 1);
