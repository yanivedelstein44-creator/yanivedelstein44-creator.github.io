/**
 * אייקונים וקטוריים בסגנון משחק (Game UI) — במקום אימוג'ים.
 * כל אייקון בנוי משכבות נתיב (24×24) עם גרדיאנט, קו מתאר כהה אחיד וברק עדין לנפח.
 * אותם נתונים מצוירים גם כ-SVG בממשק וגם על Canvas (גלגל המזל, כרטיס שיתוף, אימוג'ים מעל הדמויות).
 */
const NS = 'http://www.w3.org/2000/svg';
const OUTLINE = '#22140a';

// גרדיאנטים משותפים (מלמעלה למטה)
export const GRADS = {
  gold: ['#fff6c2', '#f5cd55', '#b5832a'],
  gem: ['#d9fbff', '#5fd3ff', '#7b4dff'],
  green: ['#c2ffe0', '#2ee59d', '#0b7f58'],
  red: ['#ffc0c6', '#ff4d5e', '#a3122a'],
  silver: ['#ffffff', '#cdd2dc', '#7c8290'],
  blue: ['#cfe8ff', '#5aa8ff', '#2b47b8'],
  fire: ['#fff3a8', '#ff9a40', '#cf3a1a'],
  purple: ['#f1dcff', '#b07aff', '#5a2aa8'],
  wood: ['#e7b986', '#9a6436', '#5a3a1e'],
  dark: ['#6a5a86', '#3a2d52', '#1c1430'],
  ice: ['#ffffff', '#bfefff', '#6fb8e8'],
  ivory: ['#ffffff', '#f6efe0', '#cdbf9e'],
};

// ---------- עזרי צורות ----------
const n2 = (v) => +v.toFixed(2);
const C = (cx, cy, r) => `M${n2(cx - r)} ${cy}a${r} ${r} 0 1 0 ${n2(2 * r)} 0a${r} ${r} 0 1 0 ${n2(-2 * r)} 0z`;
const R = (x, y, w, h, r = 0) => (r
  ? `M${x + r} ${y}h${n2(w - 2 * r)}a${r} ${r} 0 0 1 ${r} ${r}v${n2(h - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${r}h${n2(-(w - 2 * r))}a${r} ${r} 0 0 1 ${-r} ${-r}v${n2(-(h - 2 * r))}a${r} ${r} 0 0 1 ${r} ${-r}z`
  : `M${x} ${y}h${w}v${h}h${-w}z`);
const poly = (pts) => `M${pts.map((p) => p.map(n2).join(' ')).join('L')}z`;
const star = (cx, cy, ro, ri, n = 5, rot = -90) => poly(Array.from({ length: n * 2 }, (_, i) => {
  const a = ((rot + (i * 180) / n) * Math.PI) / 180, r = i % 2 ? ri : ro;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
}));
const gear = (cx, cy, ro, ri, teeth = 8) => {
  const pts = [], step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    [[a - step * 0.32, ri], [a - step * 0.2, ro], [a + step * 0.2, ro], [a + step * 0.32, ri]].forEach(([aa, r]) => pts.push([cx + Math.cos(aa) * r, cy + Math.sin(aa) * r]));
  }
  return poly(pts);
};
const gemPath = (cx, cy, s) => poly([[cx - 6 * s, cy - 9 * s], [cx + 6 * s, cy - 9 * s], [cx + 10 * s, cy - 3 * s], [cx, cy + 9.5 * s], [cx - 10 * s, cy - 3 * s]]);

// שכבה: [d, צבע/גרדיאנט, אפשרויות]  ·  line:true = קו בלבד (עם מתאר כהה מתחתיו)
const L = (d, fill, o = {}) => ({ d, fill, ...o });
const HL = (d, op = 0.45) => ({ d, fill: '#ffffff', op, noOutline: true });

export const ICONS = {
  gem: [L(gemPath(12, 12, 1), 'gem'), L('M2 9h20M8 3.2 6.8 9 12 21M16 3.2 17.2 9 12 21M6.8 9 12 3.2 17.2 9', '#ffffff', { line: true, w: 0.8, op: 0.55, noOutline: true }), HL(poly([[6.5, 4], [10.6, 4], [7.4, 8.4], [3.6, 8.4]]))],
  gems: [L(gemPath(7.5, 14, 0.62), 'gem'), L(gemPath(16.5, 14, 0.62), 'purple'), L(gemPath(12, 9.5, 0.7), 'gem'), HL(poly([[9.2, 4.2], [11.4, 4.2], [9.6, 6.8], [7.6, 6.8]]))],
  plus: [L('M10.2 4h3.6v6.2H20v3.6h-6.2V20h-3.6v-6.2H4v-3.6h6.2z', 'gold')],
  close: [L('M6.3 4.2 12 9.9l5.7-5.7 2.1 2.1L14.1 12l5.7 5.7-2.1 2.1L12 14.1l-5.7 5.7-2.1-2.1L9.9 12 4.2 6.3z', 'currentColor', { noOutline: true })],
  sound: [L('M3 9h4.2L12.5 4.6v14.8L7.2 15H3z', 'gold'), L('M15.6 8.6a4.8 4.8 0 0 1 0 6.8M18.1 6.1a8.4 8.4 0 0 1 0 11.8', 'gold', { line: true, w: 2.1 })],
  mute: [L('M3 9h4.2L12.5 4.6v14.8L7.2 15H3z', 'silver'), L('M15.6 9.2l5 5.6M20.6 9.2l-5 5.6', 'red', { line: true, w: 2.4 })],
  music: [L('M10 17.5a2.5 2.5 0 1 1-2.5-2.5H10V6l10-2.2v11.7a2.5 2.5 0 1 1-2.5-2.5H20V7.4l-10 2z', 'gold')],
  compass: [L(C(12, 12, 9.6), 'dark'), L(C(12, 12, 9.6), 'gold', { line: true, w: 1.6 }), L(poly([[12, 4.6], [14.6, 12], [9.4, 12]]), 'red'), L(poly([[12, 19.4], [9.4, 12], [14.6, 12]]), 'silver'), L(C(12, 12, 1.4), 'gold')],
  panorama: [L(R(2.5, 5, 19, 14, 2.6), 'blue'), L(poly([[4.2, 17.3], [9, 11], [12.4, 14.6], [15, 11.8], [19.8, 17.3]]), 'green'), L(C(16.6, 8.8, 1.8), 'gold')],
  trophy: [L('M7 3.5h10v4.6a5 5 0 0 1-10 0z', 'gold'), L('M7 5.2H4.6a2.8 2.8 0 0 0 3 4.2M17 5.2h2.4a2.8 2.8 0 0 1-3 4.2', 'gold', { line: true, w: 1.8 }), L(R(10.8, 12.8, 2.4, 3.4), 'gold'), L(R(7.4, 16, 9.2, 3.6, 1.1), 'wood'), HL('M8.7 4.6h1.9v3.6c0 1.2.4 2.2 1 2.9-1.8-.4-2.9-1.9-2.9-3.7z')],
  gear: [L(`${gear(12, 12, 10.2, 7.6, 8)}${C(12, 12, 3.2)}`, 'silver', { rule: 'evenodd' })],
  target: [L(C(12, 12, 9.6), 'red'), L(C(12, 12, 6.6), 'ivory'), L(C(12, 12, 3.6), 'red'), L(C(12, 12, 1.2), '#ffffff', { noOutline: true })],
  crown: [L('M3 8.6l4.6 3.9L12 5.2l4.4 7.3L21 8.6l-1.9 9H4.9z', 'gold'), L(R(4.6, 17.4, 14.8, 3.1, 1), 'gold'), L(C(12, 14.2, 1.45), 'red'), L(C(7.7, 15, 1), 'gem'), L(C(16.3, 15, 1), 'gem'), L(C(3, 8.4, 1.3), 'gold'), L(C(12, 5, 1.3), 'gold'), L(C(21, 8.4, 1.3), 'gold'), HL('M5.6 12.3 7.6 14l.6 2.5H6z', 0.35)],
  pawn: [L(C(12, 6.3, 3.3), 'silver'), L('M9.6 10.2h4.8l-.8 2.2 1.6 4.6H8.8l1.6-4.6z', 'silver'), L(R(6.5, 17.4, 11, 3.4, 1.4), 'silver'), HL(C(10.9, 5.3, 1.1), 0.55)],
  bolt: [L(poly([[13.6, 2], [4.4, 13.6], [11, 13.6], [9.4, 22], [19.6, 9.8], [13, 9.8], [15.2, 2]]), 'gold'), HL(poly([[13.2, 3.4], [6.8, 12.4], [9.2, 12.4]]), 0.4)],
  camera: [L('M3 8.2h4l1.8-2.7h6.4L17 8.2h4v11.3H3z', 'silver'), L(C(12, 13.6, 4), 'blue'), L(C(12, 13.6, 1.8), '#ffffff', { op: 0.55, noOutline: true }), L(C(18.3, 10.4, 0.9), 'gold')],
  bulb: [L('M12 2.6a6.6 6.6 0 0 0-4 11.8v2.1h8v-2.1A6.6 6.6 0 0 0 12 2.6z', 'gold'), L(R(8.6, 17.2, 6.8, 1.9, 0.6), 'silver'), L(R(9.6, 19.5, 4.8, 1.9, 0.6), 'silver'), L('M9.4 6a3.6 3.6 0 0 1 2.6-1.4', '#ffffff', { line: true, w: 1.4, op: 0.7, noOutline: true })],
  smile: [L(C(12, 12, 9.6), 'gold'), L(C(8.8, 10, 1.3), OUTLINE, { noOutline: true }), L(C(15.2, 10, 1.3), OUTLINE, { noOutline: true }), L('M7.8 14a4.8 4.8 0 0 0 8.4 0', OUTLINE, { line: true, w: 1.7, noOutline: true })],
  handshake: [L(poly([[1.6, 9.6], [5.4, 7.4], [9, 13.6], [5.2, 15.8]]), 'blue'), L(poly([[22.4, 9.6], [18.6, 7.4], [15, 13.6], [18.8, 15.8]]), 'blue'), L('M6.4 9.4 10.6 7.6l2.2.9 2.8-.8 3.2 2.2-.6 3.4-4.4 3.9c-.7.6-1.7.6-2.3-.1l-.5-.5-.6.5c-.7.5-1.6.4-2.2-.2z', 'gold'), L('M10.6 7.6 8.2 10.8c-.4.6.3 1.4 1 1l2.6-1.6M12.9 13.9l1.6 1.5M11.2 15.2l1.4 1.3', OUTLINE, { line: true, w: 1, noOutline: true, op: 0.8 })],
  flag: [L(R(4.3, 2.8, 2, 18.6, 1), 'wood'), L('M6.3 4h11.6l-2.4 4.2 2.4 4.3H6.3z', 'ivory')],
  lock: [L('M8 10.5V7.6a4 4 0 0 1 8 0v2.9', 'silver', { line: true, w: 2.4 }), L(R(5, 10.2, 14, 10.6, 2.4), 'gold'), L(`${C(12, 14.4, 1.5)}${R(11.3, 14.8, 1.4, 3.2)}`, OUTLINE, { noOutline: true })],
  check: [L('M4.5 12.6l4.8 4.8L19.5 7', 'green', { line: true, w: 3.2 })],
  gift: [L(R(4.5, 11.2, 15, 9.6, 1), 'red'), L(R(3, 7.4, 18, 4, 1), 'red'), L(R(10.9, 7.4, 2.2, 13.4), 'gold'), L('M12 7.4C10 3.4 6 4.2 7.4 7.4zM12 7.4c2-4 6-3.2 4.6 0z', 'gold')],
  chest: [L(R(3, 10.5, 18, 9.5, 1.2), 'wood'), L('M3 10.5V9a5 4 0 0 1 5-4h8a5 4 0 0 1 5 4v1.5z', 'wood'), L(R(3, 9.8, 18, 1.8), 'gold'), L(R(10.4, 10.6, 3.2, 4.2, 0.8), 'gold')],
  wheel: [L(C(12, 12, 9.6), 'gold'), L(C(12, 12, 7.6), 'purple'), L('M12 4.4v15.2M4.4 12h15.2M6.6 6.6l10.8 10.8M17.4 6.6 6.6 17.4', 'gold', { line: true, w: 1.3, noOutline: true }), L(C(12, 12, 1.9), 'gold'), L(poly([[12, 0.9], [14.2, 4.4], [9.8, 4.4]]), 'red')],
  hourglass: [L(R(5, 2.5, 14, 2, 1), 'wood'), L(R(5, 19.5, 14, 2, 1), 'wood'), L('M6.6 4.5h10.8c0 4-3.6 5.6-3.6 7.5s3.6 3.5 3.6 7.5H6.6c0-4 3.6-5.6 3.6-7.5S6.6 8.5 6.6 4.5z', 'ice'), L('M9 18.6h6c-.6-1.8-2-2.6-3-3.6-1 1-2.4 1.8-3 3.6z', 'fire', { noOutline: true })],
  paw: [L('M12 11.5c3.2 0 6 3.2 6 5.6 0 2-1.6 3-3.2 3-1.2 0-1.8-.6-2.8-.6s-1.6.6-2.8.6C7.6 20.1 6 19.1 6 17.1c0-2.4 2.8-5.6 6-5.6z', 'gold'), L(`${C(7, 9.4, 1.9)}${C(10.2, 6.3, 1.9)}${C(13.8, 6.3, 1.9)}${C(17, 9.4, 1.9)}`, 'gold')],
  shield: [L('M12 2.4l8 3v6c0 5.4-3.4 9.3-8 10.8-4.6-1.5-8-5.4-8-10.8v-6z', 'blue'), L('M12 5.3l5.4 2v4c0 3.8-2.3 6.7-5.4 7.9z', 'gold', { noOutline: true, op: 0.95 })],
  swords: [L('M3.5 3.5h3l11 11-3 3-11-11z', 'silver'), L('M20.5 3.5h-3l-11 11 3 3 11-11z', 'silver'), L('M14 19.8l5.8-5.8M10 19.8 4.2 14', 'gold', { line: true, w: 2 }), L(`${C(20.4, 20.4, 1.4)}${C(3.6, 20.4, 1.4)}`, 'gold')],
  star: [L(star(12, 12.6, 10, 4.4), 'gold'), HL(poly([[12, 4.4], [13.4, 9.4], [10.6, 9.4]]), 0.4)],
  info: [L(C(12, 12, 9.6), 'blue'), L(`${R(11, 10.4, 2, 6.8, 0.6)}${C(12, 7.6, 1.3)}`, '#ffffff', { noOutline: true })],
  refresh: [L('M19 12a7 7 0 1 1-2.1-5', 'green', { line: true, w: 2.6 }), L(poly([[20.6, 3.8], [20.6, 9.4], [15.1, 9.4]]), 'green')],
  doc: [L('M6 2.5h8.5L19 7v14.5H6z', 'ivory'), L('M14.5 2.5V7H19M8.5 11h8M8.5 14h8M8.5 17h5.5', OUTLINE, { line: true, w: 1.1, noOutline: true })],
  globe: [L(C(12, 12, 9.6), 'blue'), L('M12 2.5c-3.2 3-3.2 16 0 19M12 2.5c3.2 3 3.2 16 0 19M2.6 12h18.8M4.4 7.4h15.2M4.4 16.6h15.2', '#ffffff', { line: true, w: 1.1, op: 0.75, noOutline: true })],
  palette: [L('M12 2.6c5.5 0 9.4 3.9 9.4 8.3 0 3-2.4 4.4-4.6 4.4h-2c-1.2 0-1.8 1.4-1 2.3.9 1 .3 3.8-1.8 3.8C6.6 21.4 2.6 17.2 2.6 12 2.6 6.8 6.6 2.6 12 2.6z', 'ivory'), L(C(7.4, 11, 1.6), 'red'), L(C(9.9, 6.8, 1.6), 'blue'), L(C(14.9, 6.8, 1.6), 'green'), L(C(17.6, 10.8, 1.6), 'purple')],
  trash: [L(R(9.5, 2.8, 5, 2.4, 1), 'silver'), L(R(4, 5, 16, 2.6, 1), 'silver'), L('M6 8.4h12l-1.2 12.8H7.2z', 'red'), L('M10 10.8v8M14 10.8v8', OUTLINE, { line: true, w: 1.2, noOutline: true })],
  link: [L('M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1', 'silver', { line: true, w: 2.4 })],
  share: [L('M8.4 10.8l7.2-4M8.4 13.2l7.2 4', 'green', { line: true, w: 2 }), L(`${C(18, 5.5, 2.8)}${C(6, 12, 2.8)}${C(18, 18.5, 2.8)}`, 'green')],
  robot: [L('M12 7.5V4.3', 'silver', { line: true, w: 1.6 }), L(C(12, 3.6, 1.3), 'red'), L(`${R(3.1, 11, 1.9, 4, 0.8)}${R(19, 11, 1.9, 4, 0.8)}`, 'silver'), L(R(5, 7.5, 14, 11, 3), 'silver'), L(`${C(9.3, 12.5, 1.6)}${C(14.7, 12.5, 1.6)}`, 'gem'), L('M9.5 15.8h5', OUTLINE, { line: true, w: 1.2, noOutline: true })],
  users: [L(C(16.6, 8.8, 2.8), 'silver'), L('M14.6 13.9c.7-.3 1.4-.4 2-.4 2.6 0 4.8 1.8 5.1 5.3h-5', 'silver'), L(C(9, 8, 3.4), 'gold'), L('M2.8 20c.4-4 3-6.2 6.2-6.2s5.8 2.2 6.2 6.2z', 'gold')],
  search: [L('M15.2 15.2l5 5', 'gold', { line: true, w: 3.2 }), L(C(10.5, 10.5, 6.6), 'ice'), HL('M7 8.4a4 4 0 0 1 3-2.6', 0.7)],
  device: [L(R(7, 2.5, 10, 19, 2.2), 'dark'), L(R(8.4, 5, 7.2, 12.8, 0.8), 'blue', { noOutline: true }), L(C(12, 19.7, 0.8), 'silver', { noOutline: true })],
  cap: [L('M6 11.2v4.3c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.3l-6 2.9z', 'dark'), L('M12 4 1.5 9 12 14l10.5-5z', 'dark'), L('M21 9.4v5.4', 'gold', { line: true, w: 1.4 }), L(C(21, 15.4, 1.1), 'gold')],
  chat: [L('M4 4.5h16a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5h-9l-4.6 3.7v-3.7H4A1.5 1.5 0 0 1 2.5 16V6A1.5 1.5 0 0 1 4 4.5z', 'blue'), L(`${C(8, 11, 1.3)}${C(12, 11, 1.3)}${C(16, 11, 1.3)}`, '#ffffff', { noOutline: true })],
  chart: [L(R(4, 12, 4, 8.5, 1), 'blue'), L(R(10, 7, 4, 13.5, 1), 'green'), L(R(16, 3.5, 4, 17, 1), 'gold')],
  shirt: [L('M8 3.5 3 6.3l1.9 4 2.1-.9V20.5h10V9.4l2.1.9 1.9-4L16 3.5c-.6 1.6-2.2 2.6-4 2.6S8.6 5.1 8 3.5z', 'red'), L('M8 3.5c.6 1.6 2.2 2.6 4 2.6s3.4-1 4-2.6', 'gold', { line: true, w: 1.2, noOutline: true })],
  castle: [L('M12 6.5V2.5', 'wood', { line: true, w: 1.2, noOutline: true }), L(poly([[12, 2.5], [16, 3.6], [12, 4.8]]), 'red'), L('M3 21V9h3V6.5h2V9h2V6.5h2V9h2V6.5h2V9h3v12h-6v-4.5a2 2 0 0 0-4 0V21z', 'silver')],
  puzzle: [L('M5 8h3.4a2.3 2.3 0 1 1 4.2 0H16v3.4a2.3 2.3 0 1 1 0 4.2V19h-3.4a2.3 2.3 0 1 0-4.2 0H5v-3.4a2.3 2.3 0 1 0 0-4.2z', 'purple')],
  sparkle: [L(star(11, 13, 9, 2.4, 4), 'gold'), L(star(19, 5, 3.4, 0.9, 4), 'gold')],
  fire: [L('M12 2.5c1 3.6 5.8 5.5 5.8 11a5.8 5.8 0 0 1-11.6 0c0-3 1.6-4.6 2.8-6 .2 2 1 3 2 3.4C10.6 8 11 5 12 2.5z', 'fire'), L('M12 12.5c.6 1.6 2.6 2.4 2.6 4.6a2.6 2.6 0 0 1-5.2 0c0-1.6 1.6-2.6 2.6-4.6z', 'gold', { noOutline: true })],
  heart: [L('M12 20.5S3 15 3 8.9A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 9 2.3C21 15 12 20.5 12 20.5z', 'red'), HL('M6 7.2a2.6 2.6 0 0 1 3-.5', 0.6)],
  snowflake: [L('M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9.6 4.2 12 6.6l2.4-2.4M9.6 19.8 12 17.4l2.4 2.4', 'ice', { line: true, w: 1.9 })],
  moon: [L('M15.2 2.8a9 9 0 1 0 6 14.6A7.4 7.4 0 0 1 15.2 2.8z', 'silver'), HL('M8.2 6.2a6 6 0 0 1 3-1.6', 0.55)],
  burst: [L(star(12, 12, 10.2, 4.2, 8), 'fire'), L(C(12, 12, 2.4), 'gold')],
  lantern: [L(R(9, 3, 6, 2, 1), 'wood'), L(R(9.5, 19, 5, 1.9, 0.8), 'wood'), L(R(6, 5, 12, 14, 5), 'red'), L('M10 5.6v12.8M14 5.6v12.8', 'gold', { line: true, w: 1, op: 0.8, noOutline: true })],
  pumpkin: [L(R(11, 3.5, 2, 4.4, 1), 'green'), L('M12 7c5 0 8.5 2.8 8.5 6.8S17 20.5 12 20.5 3.5 17.8 3.5 13.8 7 7 12 7z', 'fire'), L('M12 7.6v12.6M8 8.6c-1.6 3.2-1.6 8.1 0 11.2M16 8.6c1.6 3.2 1.6 8.1 0 11.2', OUTLINE, { line: true, w: 1, op: 0.45, noOutline: true })],
  axe: [L('M7 21 15.5 6', 'wood', { line: true, w: 2.4 }), L('M13 4.5c2.4-1.6 5.8-1.4 7.5.5l-4.2 4.4-1.4-.8-1.6 2.8-2.2-1.2z', 'silver')],
  setsquare: [L(`${poly([[3, 21], [3, 3], [21, 21]])}${poly([[6, 18], [6, 9.6], [14.4, 18]])}`, 'gold', { rule: 'evenodd' })],
  rook: [L('M6 3.5h2.6v2h2.1v-2h2.6v2h2.1v-2H18v4.5l-1.8 1.6.8 7.4H7l.8-7.4L6 8z', 'silver'), L(R(5, 17, 14, 3.9, 1.2), 'silver')],
  knight: [L('M8 21h10v-2.4c0-3-1-5.4-2.6-7.6.8-.2 1.6-.9 1.6-2 0-2.6-2.2-5.8-6.4-6.3l-.6-1.2-1.3 1.8C6.6 4.4 5 6.4 5.2 9.4l2.6 1.4 1.8-1.2.4 1.6c-1.4 1.6-2 4.4-2 7.4z', 'silver'), L(R(6.5, 19, 11, 2.6, 1), 'silver')],
  eye: [L('M12 5.5C6.5 5.5 3 12 3 12s3.5 6.5 9 6.5 9-6.5 9-6.5-3.5-6.5-9-6.5z', 'ivory'), L(C(12, 12, 3.4), 'blue'), L(C(12, 12, 1.5), OUTLINE, { noOutline: true })],
  chevron: [L('M9 5l7 7-7 7', 'currentColor', { line: true, w: 2.6, noOutline: true })],
  pin: [L('M12 22s-6.5-7-6.5-12a6.5 6.5 0 0 1 13 0c0 5-6.5 12-6.5 12z', 'red'), L(C(12, 10, 2.4), '#ffffff', { noOutline: true })],
  thumb: [L('M7 20.5H3.8V10.2H7zM8.6 20.5h8.2a2 2 0 0 0 2-1.6l1.5-6.6a2 2 0 0 0-2-2.4h-4.9l.8-3.8a1.9 1.9 0 0 0-1.8-2.3L8.6 10z', 'gold')],
  wow: [L(C(12, 12, 9.6), 'gold'), L(`${C(8.8, 9.6, 1.3)}${C(15.2, 9.6, 1.3)}${C(12, 15.4, 2.3)}`, OUTLINE, { noOutline: true })],
  laugh: [L(C(12, 12, 9.6), 'gold'), L('M7.4 9.6l2.4 1M16.6 9.6l-2.4 1', OUTLINE, { line: true, w: 1.6, noOutline: true }), L('M7.2 13h9.6a4.8 4.8 0 0 1-9.6 0z', OUTLINE, { noOutline: true })],
  angry: [L(C(12, 12, 9.6), 'fire'), L('M6.8 8.4l3.6 1.6M17.2 8.4l-3.6 1.6M8.4 16.6a4.6 4.6 0 0 1 7.2 0', OUTLINE, { line: true, w: 1.8, noOutline: true }), L(`${C(9, 11.6, 1.2)}${C(15, 11.6, 1.2)}`, OUTLINE, { noOutline: true })],
  coin: [L(C(12, 12, 9.4), 'gold'), L(C(12, 12, 6.2), '#b5832a', { line: true, w: 1.3, noOutline: true, op: 0.9 }), L(star(12, 12.3, 3.6, 1.6), '#fff3b8', { noOutline: true, op: 0.9 }), HL('M6.6 8.2a6.4 6.4 0 0 1 4-3', 0.7)],
  calendar: [L(R(3.5, 5, 17, 15.5, 2), 'ivory'), L(R(3.5, 5, 17, 4.5, 2), 'red'), L('M8 3.2v3.6M16 3.2v3.6', 'silver', { line: true, w: 1.8 }), L(`${R(7, 12, 3, 2.6)}${R(11, 12, 3, 2.6)}${R(15, 12, 2.4, 2.6)}${R(7, 15.6, 3, 2.6)}`, OUTLINE, { noOutline: true, op: 0.55 })],
  city: [L('M3 21V11h4V6h5v15zM12 21V3h5v6h4v12z', 'blue'), L('M5 13h1M5 16h1M9 8h1M9 11h1M9 14h1M14 6h1M14 9h1M14 12h1M18.5 11h1M18.5 14h1', '#fff3a8', { line: true, w: 1, noOutline: true })],
  temple: [L(poly([[2.5, 8], [12, 3], [21.5, 8]]), 'ivory'), L('M5 9.5h2.4v8.5H5zM10.8 9.5h2.4v8.5h-2.4zM16.6 9.5H19v8.5h-2.4z', 'ivory'), L(R(3, 18.2, 18, 2.8, 0.8), 'ivory')],
  download: [L('M12 3.5v10.5M7.4 9.8 12 14.4l4.6-4.6', 'green', { line: true, w: 2.8 }), L(R(3.5, 16.6, 17, 4, 1.6), 'silver')],
  play: [L(C(12, 12, 9.6), 'red'), L(poly([[9.6, 7.4], [17, 12], [9.6, 16.6]]), '#ffffff', { noOutline: true })],
  dotLight: [L(C(12, 12, 6.4), 'ivory')],
  dotDark: [L(C(12, 12, 6.4), 'dark')],
  noAura: [L(C(12, 12, 8.4), 'silver', { line: true, w: 2.4 }), L('M6.2 17.8 17.8 6.2', 'silver', { line: true, w: 2.4 })],
  fireRing: [L(`${C(12, 13.5, 7.2)}${C(12, 13.5, 4.4)}`, 'fire', { rule: 'evenodd' }), L('M6.4 9.4c-.4-2.4.8-4 2-4.8-.2 1.4.4 2.2 1 2.6M17.6 9.4c.4-2.4-.8-4-2-4.8.2 1.4-.4 2.2-1 2.6M12 6.4c-.8-1.8 0-3.4 1-4 0 1.2.6 2 1.2 2.4', 'fire', { line: true, w: 1.6 })],
  boltPurple: [L(poly([[13.6, 2], [4.4, 13.6], [11, 13.6], [9.4, 22], [19.6, 9.8], [13, 9.8], [15.2, 2]]), 'purple'), HL(poly([[13.2, 3.4], [6.8, 12.4], [9.2, 12.4]]), 0.5)],
  checker: [L('M3.5 14.2v2.6c0 2 3.8 3.7 8.5 3.7s8.5-1.7 8.5-3.7v-2.6z', 'red'), L('M3.5 14.2c0-2 3.8-3.7 8.5-3.7s8.5 1.7 8.5 3.7-3.8 3.7-8.5 3.7-8.5-1.7-8.5-3.7z', 'red'), L('M3.5 8.6v2.6c0 2 3.8 3.7 8.5 3.7s8.5-1.7 8.5-3.7V8.6z', 'ivory'), L('M3.5 8.6c0-2 3.8-3.7 8.5-3.7s8.5 1.7 8.5 3.7-3.8 3.7-8.5 3.7-8.5-1.7-8.5-3.7z', 'ivory'), L('M7.4 8.6c0-1.1 2-2 4.6-2s4.6.9 4.6 2-2 2-4.6 2-4.6-.9-4.6-2z', OUTLINE, { line: true, w: 0.9, noOutline: true, op: 0.4 })],
  checkerKing: [L('M3.5 14.6v2.4c0 2 3.8 3.6 8.5 3.6s8.5-1.6 8.5-3.6v-2.4z', 'dark'), L('M3.5 14.6c0-2 3.8-3.6 8.5-3.6s8.5 1.6 8.5 3.6-3.8 3.6-8.5 3.6-8.5-1.6-8.5-3.6z', 'dark'), L('M6.6 13.2 7.4 6.8l2.6 2.6L12 5l2 4.4 2.6-2.6.8 6.4c-1.4.6-3.3 1-5.4 1s-4-.4-5.4-1z', 'gold')],
  home: [L('M3 11.2 12 3.6l9 7.6V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', 'gold')],
  dragon: [L('M3.2 15.4c.6-4.6 4-8 8.6-8.4l2-3.6 1.6 3.8c2.8.4 5 2 6.2 4.4l-3.8.8.8 2.4-4.2-.4c-1.2 2.6-3.6 4.2-6.6 4.2H5.6l-1.8 2.6-.9-3.2z', 'red'), L('M11.8 7l-2.2-3.4 3.6 2.6', 'gold', { line: true, w: 1.2 }), L(C(15.6, 9.4, 1.1), 'gold', { noOutline: true }), L('M14.4 13.6l1.4 1.1M12.4 14.4l1.2 1.2', OUTLINE, { line: true, w: 0.9, noOutline: true, op: 0.6 })],
};

// אימוג'ים ישנים → אייקון (להמרה אוטומטית בטקסטים)
export const EMOJI_ICON = {
  '💎': 'gem', '👑': 'crown', '🎁': 'gift', '✨': 'sparkle', '🏆': 'trophy', '🏗️': 'castle', '🏗': 'castle', '⚡': 'bolt', '🔒': 'lock', '✓': 'check', '✅': 'check',
  '🔄': 'refresh', '⚠️': 'info', '⚠': 'info', 'ℹ️': 'info', 'ℹ': 'info', '📲': 'device', '🎉': 'sparkle', '🤖': 'robot', '🤝': 'handshake', '🏳️': 'flag', '🏳': 'flag',
  '⚙️': 'gear', '⚙': 'gear', '🌐': 'globe', '🎨': 'palette', '📄': 'doc', '🗑️': 'trash', '🗑': 'trash', '🔗': 'link', '🧭': 'compass', '🎯': 'target', '📸': 'camera',
  '💡': 'bulb', '😀': 'smile', '🔊': 'sound', '🔇': 'mute', '🎵': 'music', '🔕': 'mute', '🔭': 'panorama', '🧩': 'puzzle', '⏳': 'hourglass', '🐾': 'paw', '🎡': 'wheel',
  '🏯': 'temple', '🧰': 'chest', '⭐': 'star', '🌟': 'star', '🔥': 'fire', '🛡️': 'shield', '🛡': 'shield', '⚔️': 'swords', '⚔': 'swords', '🏰': 'castle', '🏛️': 'temple', '🏛': 'temple',
  '🌆': 'city', '📅': 'calendar', '🧥': 'shirt', '📐': 'setsquare', '🪓': 'axe', '🎆': 'burst', '🏮': 'lantern', '💖': 'heart', '🎃': 'pumpkin', '❄️': 'snowflake', '❄': 'snowflake',
  '💰': 'coin', '🔎': 'search', '🔍': 'search', '📱': 'device', '🎓': 'cap', '💬': 'chat', '📈': 'chart', '📍': 'pin', '👍': 'thumb', '😮': 'wow', '😂': 'laugh', '😡': 'angry',
  '🐉': 'dragon', '🦁': 'shield', '🦅': 'star', '🧪': 'sparkle', '♟️': 'pawn', '♟': 'pawn', '➕': 'plus', '✕': 'close', '🌍': 'globe', '🐺': 'paw', '🦉': 'paw',
  '🐴': 'knight', '🦊': 'paw', '🦄': 'paw', '🧥️': 'shirt', '⬇️': 'download', '⬇': 'download', '🎬': 'play', '🔁': 'refresh', '⚪': 'dotLight', '⚫': 'dotDark', '🏠': 'home',
};

// סמלי שחקן (אמבלמים) — מזהים חדשים + המרה מערכים ישנים
export const EMBLEMS = ['crown', 'shield', 'swords', 'star', 'castle', 'fire', 'gem', 'rook', 'knight'];
const LEGACY_EMBLEM = { '♔': 'crown', '♚': 'rook', '🦁': 'shield', '🦅': 'star', '🐉': 'dragon', '🛡️': 'shield', '⚔️': 'swords', '🌟': 'star', '🔥': 'fire', '🏰': 'castle', '👑': 'crown' };
export const emblemIcon = (v) => (ICONS[v] ? v : LEGACY_EMBLEM[v] || 'crown');

// ---------- רינדור SVG ----------
let defsReady = false;
export function ensureIconDefs() {
  if (defsReady || typeof document === 'undefined') return;
  defsReady = true;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  const defs = document.createElementNS(NS, 'defs');
  for (const [k, [a, b, c]] of Object.entries(GRADS)) {
    const g = document.createElementNS(NS, 'linearGradient');
    g.id = `ig-${k}`; g.setAttribute('x1', '0'); g.setAttribute('y1', '0'); g.setAttribute('x2', '0'); g.setAttribute('y2', '1');
    [[0, a], [0.5, b], [1, c]].forEach(([o, col]) => { const s = document.createElementNS(NS, 'stop'); s.setAttribute('offset', String(o)); s.setAttribute('stop-color', col); g.appendChild(s); });
    defs.appendChild(g);
  }
  svg.appendChild(defs);
  document.body.appendChild(svg);
}

const paint = (fill) => (GRADS[fill] ? `url(#ig-${fill})` : fill);

/** אייקון כאלמנט SVG. size בפיקסלים; title — שם נגיש (אחרת דקורטיבי) */
export function icon(name, { size = 22, title = null, cls = '' } = {}) {
  ensureIconDefs();
  const layers = ICONS[name] || ICONS.star;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size)); svg.setAttribute('height', String(size));
  svg.setAttribute('class', `gi ${cls}`.trim());
  if (title) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', title); } else svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const ly of layers) {
    const mk = () => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', ly.d); if (ly.rule) p.setAttribute('fill-rule', ly.rule); return p; };
    if (ly.line) {
      if (!ly.noOutline) { const o = mk(); o.setAttribute('fill', 'none'); o.setAttribute('stroke', OUTLINE); o.setAttribute('stroke-width', String((ly.w || 2) + 1.7)); o.setAttribute('stroke-linecap', 'round'); o.setAttribute('stroke-linejoin', 'round'); svg.appendChild(o); }
      const p = mk(); p.setAttribute('fill', 'none'); p.setAttribute('stroke', paint(ly.fill)); p.setAttribute('stroke-width', String(ly.w || 2)); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
      if (ly.op != null) p.setAttribute('opacity', String(ly.op));
      svg.appendChild(p);
    } else {
      const p = mk();
      p.setAttribute('fill', paint(ly.fill));
      if (!ly.noOutline) { p.setAttribute('stroke', OUTLINE); p.setAttribute('stroke-width', '1.7'); p.setAttribute('stroke-linejoin', 'round'); p.setAttribute('paint-order', 'stroke fill'); }
      if (ly.op != null) p.setAttribute('opacity', String(ly.op));
      svg.appendChild(p);
    }
  }
  return svg;
}

// ---------- רינדור Canvas ----------
const p2d = new Map();
const path2d = (d) => { if (!p2d.has(d)) p2d.set(d, new Path2D(d)); return p2d.get(d); };
export function drawIcon(ctx, name, cx, cy, size) {
  const layers = ICONS[name] || ICONS.star;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const fillOf = (f) => {
    if (!GRADS[f]) return f === 'currentColor' ? '#ffffff' : f;
    const g = ctx.createLinearGradient(0, 0, 0, 24);
    GRADS[f].forEach((c, i) => g.addColorStop(i / 2, c));
    return g;
  };
  for (const ly of layers) {
    const p = path2d(ly.d);
    ctx.globalAlpha = ly.op ?? 1;
    if (ly.line) {
      if (!ly.noOutline) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = (ly.w || 2) + 1.7; ctx.stroke(p); }
      ctx.strokeStyle = fillOf(ly.fill); ctx.lineWidth = ly.w || 2; ctx.stroke(p);
    } else {
      if (!ly.noOutline) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.7; ctx.stroke(p); }
      ctx.fillStyle = fillOf(ly.fill); ctx.fill(p, ly.rule || 'nonzero');
    }
  }
  ctx.restore();
}

// ---------- המרת טקסט עם אימוג'ים ----------
const EMOJI_RE = /(?![♔-♟])(\p{Extended_Pictographic}|[☀-➿])(️|‍[\p{Extended_Pictographic}️]*)?/gu;
export const stripEmoji = (s) => String(s ?? '').replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim();

/** טקסט עם אימוג'ים ישנים → כל אימוג'י ממופה מוחלף במקומו באייקון SVG; אימוג'י לא ממופה נמחק */
export function decorate(text, { size = 18 } = {}) {
  const frag = document.createDocumentFragment();
  const s = String(text ?? '');
  let last = 0;
  const push = (str) => { const v = str.replace(/\s{2,}/g, ' '); if (v) frag.appendChild(document.createTextNode(v)); };
  for (const m of s.matchAll(EMOJI_RE)) {
    push(s.slice(last, m.index));
    const name = EMOJI_ICON[m[0]] || EMOJI_ICON[m[0].replace(/\uFE0F/g, '')];
    if (name) frag.appendChild(icon(name, { size, cls: 'inline' }));
    last = m.index + m[0].length;
  }
  push(s.slice(last));
  return frag;
}
