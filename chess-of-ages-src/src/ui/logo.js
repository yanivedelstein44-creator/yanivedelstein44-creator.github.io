/**
 * הלוגו של Chess of Ages: Island Realms.
 * סמל: מדליון זהב מוברש עם מלך שחמט על אי קטן, שעון חול ברקע (הזמן), טבעת שעות, ענפי דפנה וים טורקיז.
 * כיתוב: CHESS OF AGES בזהב מוברש + סרט ארגמן עם ISLAND REALMS.
 * SVG טהור (בלי קבצים) — משמש במסך הפתיחה, בראש המסך, בסרט ובאייקונים.
 */
let seq = 0;

function defs(p) {
  return `<defs>
<linearGradient id="${p}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff9da"/><stop offset=".38" stop-color="#f8d772"/><stop offset=".52" stop-color="#c8952c"/><stop offset=".66" stop-color="#f4cf63"/><stop offset="1" stop-color="#8a5a14"/></linearGradient>
<linearGradient id="${p}gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3bc"/><stop offset=".45" stop-color="#e6b44c"/><stop offset=".7" stop-color="#b07a22"/><stop offset="1" stop-color="#6e450c"/></linearGradient>
<radialGradient id="${p}bg" cx=".5" cy=".36" r=".72"><stop offset="0" stop-color="#43308a"/><stop offset=".55" stop-color="#1e1446"/><stop offset="1" stop-color="#0b0720"/></radialGradient>
<linearGradient id="${p}sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6ff4ee"/><stop offset=".5" stop-color="#2bb3c8"/><stop offset="1" stop-color="#145c8a"/></linearGradient>
<linearGradient id="${p}rb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b3264a"/><stop offset=".55" stop-color="#7a1232"/><stop offset="1" stop-color="#4c0820"/></linearGradient>
<linearGradient id="${p}shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="${p}clip"><circle cx="100" cy="100" r="83"/></clipPath>
<filter id="${p}sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".55"/></filter>
</defs>`;
}

function laurel(p, side) {
  // ענף דפנה לאורך הטבעת (צד שמאל; הימני הוא מראה)
  const leaves = [];
  for (let i = 0; i < 7; i++) {
    const deg = 106 + i * 16;
    const a = (deg * Math.PI) / 180;
    const x = (100 + Math.cos(a) * 91).toFixed(1), y = (100 + Math.sin(a) * 91).toFixed(1);
    const rot = (deg + 90 + (i % 2 ? 32 : -32)).toFixed(1);
    leaves.push(`<ellipse cx="${x}" cy="${y}" rx="8.5" ry="3.8" transform="rotate(${rot} ${x} ${y})"/>`);
  }
  return `<g fill="url(#${p}gd)" stroke="#2a1704" stroke-width="1.3" ${side > 0 ? 'transform="translate(200 0) scale(-1 1)"' : ''}>${leaves.join('')}</g>`;
}

/** הסמל בלבד (viewBox 0 0 200 200) */
export function emblemSVG(p) {
  const ticks = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r1 = i % 3 === 0 ? 72 : 76, r2 = 81;
    ticks.push(`<line x1="${(100 + Math.cos(a) * r1).toFixed(1)}" y1="${(100 + Math.sin(a) * r1).toFixed(1)}" x2="${(100 + Math.cos(a) * r2).toFixed(1)}" y2="${(100 + Math.sin(a) * r2).toFixed(1)}"/>`);
  }
  return `<g>
<circle cx="100" cy="100" r="96" fill="url(#${p}gd)" stroke="#2a1704" stroke-width="3"/>
<circle cx="100" cy="100" r="90" fill="none" stroke="#fff3c0" stroke-opacity=".55" stroke-width="1.5"/>
<circle cx="100" cy="100" r="84" fill="url(#${p}bg)" stroke="#4a2e08" stroke-width="2.5"/>
<g clip-path="url(#${p}clip)">
  <g fill="#fff" opacity=".8"><circle cx="58" cy="52" r="1.3"/><circle cx="146" cy="60" r="1.1"/><circle cx="132" cy="38" r=".9"/><circle cx="70" cy="34" r=".8"/><circle cx="152" cy="92" r="1"/><circle cx="46" cy="88" r=".9"/></g>
  <path d="M60 38 H140 L107 100 L140 162 H60 L93 100 Z" fill="none" stroke="url(#${p}g)" stroke-width="3.2" stroke-linejoin="round" opacity=".38"/>
  <path d="M86 150 Q100 140 114 150 Z" fill="#f4cf63" opacity=".35"/>
  <path d="M10 134 Q36 126 62 134 T114 134 T166 134 T200 134 V200 H10 Z" fill="url(#${p}sea)"/>
  <path d="M10 146 Q36 139 62 146 T114 146 T166 146 T200 146" fill="none" stroke="#c8fbff" stroke-opacity=".6" stroke-width="2"/>
  <ellipse cx="100" cy="138" rx="40" ry="9" fill="#e9cc8c" stroke="#5a3a10" stroke-width="1.5"/>
  <ellipse cx="100" cy="135" rx="33" ry="6" fill="#5fa04a"/>
</g>
<g stroke="url(#${p}g)" stroke-width="3" stroke-linecap="round">${ticks.join('')}</g>
${laurel(p, -1)}${laurel(p, 1)}
<g filter="url(#${p}sh)" stroke="#2a1704" stroke-width="2.6" stroke-linejoin="round" paint-order="stroke fill" fill="url(#${p}g)">
  <rect x="96" y="30" width="8" height="24" rx="2"/><rect x="88" y="37" width="24" height="8" rx="2"/>
  <path d="M84 79 L81 58 L91 65 L100 53 L109 65 L119 58 L116 79 Z"/>
  <rect x="83" y="76" width="34" height="8" rx="3"/>
  <path d="M80 129 C84 113 88 98 90 86 L110 86 C112 98 116 113 120 129 Z"/>
  <rect x="75" y="127" width="50" height="9" rx="3"/>
  <rect x="69" y="134" width="62" height="10" rx="4"/>
</g>
<circle cx="100" cy="70" r="3.4" fill="#ff4d5e" stroke="#5a0a14" stroke-width="1.2"/>
<path d="M92 92 L95 124" stroke="#fff6cf" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"/>
<path d="M150 46 l2.2 5.8 5.8 2.2 -5.8 2.2 -2.2 5.8 -2.2 -5.8 -5.8 -2.2 5.8 -2.2z" fill="#fff6cf"/>
<path d="M50 120 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" fill="#fff6cf" opacity=".85"/>
</g>`;
}

/** The logo markup goes through innerHTML: escape the only text that comes from outside (the translated title) */
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** לוגו מלא: סמל + כיתוב + סרט (viewBox 0 0 640 400) */
export function fullLogoSVG({ width = 320, title = 'Chess of Ages: Island Realms' } = {}) {
  const p = `lg${++seq}_`;
  return `<svg class="game-logo" direction="ltr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="${Number(width) || 320}" role="img" aria-label="${escAttr(title)}">${defs(p)}
<g transform="translate(220 0) scale(1)">${emblemSVG(p)}</g>
<g font-family="Cinzel, 'Trajan Pro', Georgia, 'Times New Roman', serif" font-weight="700" text-anchor="middle">
  <text x="320" y="282" font-size="70" letter-spacing="5" fill="url(#${p}g)" stroke="#2a1704" stroke-width="5" paint-order="stroke fill" filter="url(#${p}sh)">CHESS OF AGES</text>
</g>
<g filter="url(#${p}sh)">
  <path d="M140 304 H500 L486 322 L500 340 H140 L154 322 Z" fill="url(#${p}rb)" stroke="#f2c14e" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M140 304 L112 300 L124 322 L112 344 L140 340 Z" fill="#5c0c26" stroke="#f2c14e" stroke-width="2" stroke-linejoin="round"/>
  <path d="M500 304 L528 300 L516 322 L528 344 L500 340 Z" fill="#5c0c26" stroke="#f2c14e" stroke-width="2" stroke-linejoin="round"/>
  <text x="320" y="330" font-family="Cinzel, 'Trajan Pro', Georgia, serif" font-weight="700" font-size="22" letter-spacing="6" text-anchor="middle" fill="#ffe9a8">ISLAND REALMS</text>
</g>
</svg>`;
}

/** לוגו מצומצם לראש המסך (viewBox 0 0 252 52) */
export function compactLogoSVG({ height = 34, title = 'Chess of Ages: Island Realms' } = {}) {
  const p = `lc${++seq}_`;
  return `<svg class="game-logo compact" direction="ltr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 252 52" height="${Number(height) || 34}" role="img" aria-label="${escAttr(title)}">${defs(p)}
<g transform="translate(1 1) scale(0.25)">${emblemSVG(p)}</g>
<g font-family="Cinzel, 'Trajan Pro', Georgia, 'Times New Roman', serif" font-weight="700">
  <text x="58" y="30" font-size="19.5" letter-spacing="1" fill="url(#${p}g)" stroke="#2a1704" stroke-width="2.4" paint-order="stroke fill">CHESS OF AGES</text>
  <text x="59" y="45" font-size="9" letter-spacing="4.4" fill="#ffd970">ISLAND REALMS</text>
</g>
</svg>`;
}

/** סמל בלבד (לאייקונים ולמקומות קטנים) */
export function emblemOnlySVG({ size = 64, bg = false } = {}) {
  const p = `le${++seq}_`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}">${defs(p)}${bg ? '<rect width="200" height="200" fill="#120a2a"/>' : ''}${emblemSVG(p)}</svg>`;
}
