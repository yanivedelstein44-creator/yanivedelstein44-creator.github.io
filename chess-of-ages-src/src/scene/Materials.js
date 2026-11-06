/**
 * ערכות חומרים (PBR) לכל עידן: משבצות, מסגרת, במה וכלים לבנים/שחורים.
 * נבנות בעצלות ונשמרות במטמון.
 */
import * as THREE from 'three';
import { marbleTex, woodTex, stoneTex, brushedTex, hammeredTex, speckleTex, drawnTexture, addRim } from './kit.js';

const TAU = Math.PI * 2;
const std = (o) => new THREE.MeshStandardMaterial(o);
const phys = (o) => new THREE.MeshPhysicalMaterial(o);

function edgeGlowTex(key, color) {
  return drawnTexture(key, 128, (ctx, s) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.shadowColor = color; ctx.shadowBlur = 10;
    ctx.strokeRect(6, 6, s - 12, s - 12);
    ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(s / 2, 14); ctx.lineTo(s / 2, 30); ctx.moveTo(s / 2, s - 14); ctx.lineTo(s / 2, s - 30); ctx.stroke();
  });
}

function frameLineTex(key, color) {
  return drawnTexture(key, 256, (ctx, s) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, 40 + i * 60); ctx.lineTo(s, 40 + i * 60); ctx.stroke(); }
  });
}

function starSpeckle(key, base, star) {
  return speckleTex(key, base, star, { density: 0.993, seed: 21, glow: true });
}

const gold = (rough = 0.25) => std({ color: 0xe8b84a, metalness: 1, roughness: rough });

const BUILDERS = {
  stone() {
    const lime = stoneTex('lime', 0xe8dfca, 0xb3a586, { freq: 5, seed: 1, pits: 0.3 });
    const oak = woodTex('oak', 0x6e4c2f, 0x37220f, { rings: 7, seed: 2 });
    return {
      light: std({ map: lime, roughness: 0.92 }),
      dark: std({ map: oak, roughness: 0.72 }),
      frame: std({ map: stoneTex('limeDark', 0x9a8c74, 0x5a4f40, { freq: 4, seed: 3 }), roughness: 0.95 }),
      trim: std({ map: oak, roughness: 0.7 }),
      dais: std({ map: stoneTex('slab', 0x857b6b, 0x4a4238, { freq: 3, seed: 4 }), roughness: 1 }),
      white: { body: std({ map: lime, roughness: 0.86 }), accent: std({ color: 0xcdb98f, roughness: 0.8 }) },
      black: { body: std({ map: oak, roughness: 0.6 }), accent: std({ color: 0x24160b, roughness: 0.6 }) },
      glow: 0xffb36b,
    };
  },
  classical() {
    const carrara = marbleTex('carrara', 0xf6f3ec, 0x8a8e96, { freq: 2, turb: 4.5, sharp: 7, seed: 5 });
    const brownMarble = marbleTex('brownMarble', 0x6e5c48, 0x2a2016, { freq: 2, turb: 5, sharp: 5, seed: 6 });
    const bronzeMap = brushedTex('bronze', 0xffffff, { streak: 0.12, seed: 3 });
    return {
      light: phys({ map: carrara, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.15 }),
      dark: phys({ map: brownMarble, roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
      frame: std({ color: 0xb37b3c, metalness: 1, roughness: 0.32, map: bronzeMap }),
      trim: gold(0.22),
      dais: phys({ map: marbleTex('daisMarble', 0xdcd6ca, 0x9c958a, { seed: 7 }), roughness: 0.3, clearcoat: 0.3 }),
      white: { body: phys({ map: carrara, roughness: 0.15, clearcoat: 0.85, clearcoatRoughness: 0.1 }), accent: gold(0.2) },
      black: { body: std({ color: 0xb8803e, metalness: 1, roughness: 0.27, map: bronzeMap }), accent: std({ color: 0x6e4420, metalness: 1, roughness: 0.35 }) },
      glow: 0xfff0c8,
    };
  },
  medieval() {
    const silver = brushedTex('silver', 0xffffff, { streak: 0.2, seed: 4 });
    const obs = speckleTex('obsidian', 0x17141e, 0x8a7ab0, { density: 0.994, seed: 12 });
    const hg = hammeredTex('hgold', 0xffffff, { seed: 3 });
    return {
      light: std({ map: stoneTex('silverStone', 0xc4c8d0, 0x80848e, { freq: 4, seed: 5 }), roughness: 0.5, metalness: 0.35 }),
      dark: phys({ map: obs, roughness: 0.1, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06 }),
      frame: std({ color: 0xd9a94a, metalness: 1, roughness: 0.35, map: hg }),
      trim: std({ color: 0xc9ced8, metalness: 1, roughness: 0.3, map: silver }),
      dais: std({ map: stoneTex('darkStone', 0x4c4852, 0x222028, { freq: 4, seed: 6 }), roughness: 0.9 }),
      white: { body: std({ color: 0xdde2ea, metalness: 1, roughness: 0.28, map: silver }), accent: std({ color: 0xe0ad48, metalness: 1, roughness: 0.32, map: hg }) },
      black: { body: phys({ map: obs, roughness: 0.08, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 }), accent: std({ color: 0xe0ad48, metalness: 1, roughness: 0.32, map: hg }) },
      glow: 0xffc27a,
    };
  },
  industrial() {
    const copperMap = brushedTex('copper', 0xffffff, { streak: 0.26, seed: 6 });
    const steelMap = brushedTex('steel', 0xffffff, { streak: 0.2, seed: 8 });
    const mahog = woodTex('mahogany', 0x6e2c1a, 0x260c06, { rings: 11, seed: 8 });
    return {
      light: std({ color: 0xd08a5c, metalness: 1, roughness: 0.38, map: copperMap }),
      dark: std({ map: mahog, roughness: 0.42 }),
      frame: std({ color: 0x9aa2ac, metalness: 1, roughness: 0.36, map: steelMap }),
      trim: std({ color: 0xd0a040, metalness: 1, roughness: 0.3 }),
      dais: std({ map: stoneTex('soot', 0x4a3a30, 0x221812, { freq: 5, seed: 9 }), roughness: 0.95 }),
      white: { body: std({ color: 0xd07a4c, metalness: 1, roughness: 0.32, map: copperMap }), accent: std({ color: 0xa8b0ba, metalness: 1, roughness: 0.3, map: steelMap }) },
      black: { body: std({ map: mahog, roughness: 0.38 }), accent: std({ color: 0xd4a444, metalness: 1, roughness: 0.28 }) },
      glow: 0xffb36b,
    };
  },
  cyber() {
    const edgeC = edgeGlowTex('edgeCyan', '#33f0ff');
    const edgeV = edgeGlowTex('edgeViolet', '#9a5cff');
    return {
      light: phys({ color: 0x1a2a44, roughness: 0.08, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.9, emissive: 0x00d8ff, emissiveMap: edgeC, emissiveIntensity: 0.9 }),
      dark: phys({ color: 0x05070f, roughness: 0.06, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.92, emissive: 0x9a5cff, emissiveMap: edgeV, emissiveIntensity: 0.7 }),
      frame: std({ color: 0x10141c, metalness: 0.9, roughness: 0.3, emissive: 0x00e5ff, emissiveMap: frameLineTex('frameCyan', '#33f0ff'), emissiveIntensity: 1.2 }),
      trim: std({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.4 }),
      dais: std({ color: 0x0b0e16, metalness: 0.8, roughness: 0.35, emissive: 0x2a1060, emissiveIntensity: 0.4 }),
      white: {
        body: addRim(std({ color: 0x0b3e48, emissive: 0x00e5ff, emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.3 }), 0x8ffcff, 2.0, 1.7),
        accent: std({ color: 0xffffff, emissive: 0xaaffff, emissiveIntensity: 1.5 }),
      },
      black: {
        body: addRim(std({ color: 0x3e2c08, emissive: 0xffb020, emissiveIntensity: 0.5, roughness: 0.22, metalness: 0.4 }), 0xffe28a, 2.0, 1.6),
        accent: std({ color: 0xffffff, emissive: 0xffd060, emissiveIntensity: 1.5 }),
      },
      glow: 0x33f0ff,
    };
  },
  samurai() {
    const jade = marbleTex('jade', 0x6cbf98, 0x1c5440, { freq: 2, turb: 3, sharp: 3, seed: 9 });
    return {
      light: phys({ map: marbleTex('jadeLight', 0xb8e4cc, 0x4f9a78, { freq: 2, turb: 3, sharp: 3, seed: 10 }), roughness: 0.16, clearcoat: 0.8 }),
      dark: phys({ color: 0x9c121a, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05 }),
      frame: phys({ color: 0x0e0a0a, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }),
      trim: gold(0.22),
      dais: std({ map: woodTex('walnut', 0x4a3220, 0x1e120a, { rings: 6, seed: 11 }), roughness: 0.6 }),
      white: { body: phys({ map: jade, roughness: 0.14, clearcoat: 0.9, clearcoatRoughness: 0.08 }), accent: gold(0.2) },
      black: { body: phys({ color: 0xa3121a, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 }), accent: gold(0.2) },
      glow: 0xffd9c0,
    };
  },
  egypt() {
    const lapis = speckleTex('lapis', 0x1c3c9e, 0xf2c94c, { density: 0.991, seed: 10 });
    return {
      light: std({ map: stoneTex('sandstoneSq', 0xe6cc96, 0xb48e5c, { freq: 5, seed: 12 }), roughness: 0.8 }),
      dark: std({ map: lapis, roughness: 0.32, metalness: 0.1 }),
      frame: std({ color: 0xf2c14e, metalness: 1, roughness: 0.2 }),
      trim: std({ map: lapis, roughness: 0.3 }),
      dais: std({ map: stoneTex('sandstone', 0xd8b880, 0xa07848, { freq: 4, seed: 13 }), roughness: 0.9 }),
      white: { body: std({ color: 0xf5c451, metalness: 1, roughness: 0.16 }), accent: std({ map: lapis, roughness: 0.3 }) },
      black: { body: std({ map: lapis, roughness: 0.28, metalness: 0.1 }), accent: std({ color: 0xf5c451, metalness: 1, roughness: 0.18 }) },
      glow: 0xffd27a,
    };
  },
  viking() {
    const frostMap = marbleTex('frost', 0xeef8ff, 0x8cb8e0, { freq: 3, turb: 6, sharp: 4, seed: 14 });
    const ironMap = stoneTex('iron', 0x6a6e76, 0x26282c, { freq: 6, seed: 15 });
    return {
      light: phys({ map: frostMap, roughness: 0.15, clearcoat: 1, emissive: 0x1a4a7a, emissiveIntensity: 0.15 }),
      dark: std({ map: ironMap, color: 0x8a8e96, metalness: 0.85, roughness: 0.55 }),
      frame: std({ map: woodTex('nordwood', 0x5a4632, 0x2a1e14, { rings: 8, seed: 16 }), roughness: 0.75 }),
      trim: std({ color: 0x3a3e46, metalness: 0.9, roughness: 0.45 }),
      dais: std({ map: stoneTex('snowStone', 0xe8eef4, 0x8a94a0, { freq: 4, seed: 17, pits: 0.1 }), roughness: 0.85 }),
      white: { body: addRim(phys({ map: frostMap, roughness: 0.1, clearcoat: 1, emissive: 0x2a5a8a, emissiveIntensity: 0.2 }), 0xcfeeff, 2.4, 0.7), accent: std({ color: 0xd8e4f0, metalness: 1, roughness: 0.25 }) },
      black: { body: std({ map: ironMap, color: 0x9aa0a8, metalness: 0.9, roughness: 0.5 }), accent: std({ color: 0x4ac8ff, emissive: 0x2aa8ff, emissiveIntensity: 1.2 }) },
      glow: 0x9fd8ff,
    };
  },
  atlantis() {
    return {
      light: phys({ color: 0xf6f0ea, roughness: 0.25, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessMinimum: 200, iridescenceThicknessMaximum: 700, clearcoat: 0.7 }),
      dark: phys({ color: 0x2bb8c0, roughness: 0.08, clearcoat: 1, emissive: 0x0a4a50, emissiveIntensity: 0.4 }),
      frame: std({ color: 0x3a8a80, metalness: 0.8, roughness: 0.42 }),
      trim: gold(0.25),
      dais: std({ map: stoneTex('seaStone', 0x4a7a7a, 0x1a3a40, { freq: 5, seed: 18 }), roughness: 0.85 }),
      white: { body: phys({ color: 0xf8f2ec, roughness: 0.22, iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessMinimum: 180, iridescenceThicknessMaximum: 650, clearcoat: 0.8 }), accent: gold(0.2) },
      black: { body: addRim(phys({ color: 0x2ccfcf, roughness: 0.06, clearcoat: 1, emissive: 0x0a5a5a, emissiveIntensity: 0.45 }), 0xaafff4, 2.2, 1.0), accent: phys({ color: 0xffffff, roughness: 0.2, iridescence: 1 }) },
      glow: 0x7fffe8,
    };
  },
  celestial() {
    const stars = starSpeckle('cosmicStars', 0x241a4a, 0xffffff);
    return {
      light: phys({ color: 0x4a3a7a, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.8, emissive: 0xcbb8ff, emissiveMap: stars, emissiveIntensity: 1.0 }),
      dark: phys({ color: 0x0a0618, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.86, emissive: 0x8a7aff, emissiveMap: stars, emissiveIntensity: 0.8 }),
      frame: std({ color: 0xf2c14e, metalness: 1, roughness: 0.18, emissive: 0x6a4a10, emissiveIntensity: 0.4 }),
      trim: std({ color: 0xffffff, emissive: 0xffe8b0, emissiveIntensity: 1.3 }),
      dais: std({ color: 0x1a1236, metalness: 0.6, roughness: 0.25, emissive: 0x2a1a5a, emissiveIntensity: 0.5 }),
      white: { body: addRim(std({ color: 0xfff6e0, emissive: 0xffe8b0, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.6 }), 0xffffff, 2.2, 1.0), accent: std({ color: 0xf2c14e, metalness: 1, roughness: 0.15, emissive: 0x8a6010, emissiveIntensity: 0.6 }) },
      black: { body: addRim(std({ color: 0x1c1444, emissive: 0x3a2a8a, emissiveIntensity: 0.45, roughness: 0.15, metalness: 0.5, map: stars }), 0xffd27a, 2.0, 1.3), accent: std({ color: 0xf2c14e, metalness: 1, roughness: 0.15, emissive: 0x8a6010, emissiveIntensity: 0.6 }) },
      glow: 0xffe6b0,
    };
  },
};


// ======================= סקינים ללוח + לוחות איי הפרימיום =======================
const metal = (color, rough = 0.3, extra = {}) => std({ color, metalness: 1, roughness: rough, ...extra });
const gloss = (color, extra = {}) => phys({ color, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08, ...extra });
const matte = (color, rough = 0.85, extra = {}) => std({ color, roughness: rough, ...extra });
const lit = (color, emissive = color, ei = 1.2, extra = {}) => std({ color, emissive, emissiveIntensity: ei, roughness: 0.35, ...extra });
const kitSet = (light, dark, frame, trim, dais, wBody, wAcc, bBody, bAcc, glow = 0xffe6b0) => ({ light, dark, frame, trim, dais, white: { body: wBody, accent: wAcc }, black: { body: bBody, accent: bAcc }, glow });
function hexTex(key, base, line) {
  return drawnTexture(key, 256, (c, s) => {
    c.fillStyle = base; c.fillRect(0, 0, s, s);
    c.strokeStyle = line; c.lineWidth = 5; const r = s / 6;
    for (let y = -1; y < 5; y++) for (let x = -1; x < 5; x++) {
      const cx = x * r * 1.5 + r, cy = y * r * 1.732 + (x % 2 ? r * 0.866 : 0) + r;
      c.beginPath(); for (let i = 0; i <= 6; i++) { const a = (i / 6) * TAU; c[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } c.stroke();
    }
  });
}
function floralTex(key) {
  return drawnTexture(key, 256, (c, s) => {
    c.fillStyle = '#f7f9fc'; c.fillRect(0, 0, s, s);
    c.strokeStyle = '#2a58b8'; c.fillStyle = '#2a58b8'; c.lineWidth = 3;
    for (const [x, y, r] of [[64, 64, 26], [192, 192, 26], [192, 64, 14], [64, 192, 14]]) {
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; c.beginPath(); c.ellipse(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, r * 0.42, r * 0.2, a, 0, TAU); c.fill(); }
      c.beginPath(); c.arc(x, y, r * 0.2, 0, TAU); c.stroke();
    }
    c.beginPath(); c.moveTo(0, 128); c.bezierCurveTo(64, 96, 128, 160, 256, 128); c.stroke();
    c.strokeRect(6, 6, s - 12, s - 12);
  });
}
function runeTex(key, color) {
  return drawnTexture(key, 256, (c, s) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, s, s);
    c.strokeStyle = color; c.shadowColor = color; c.shadowBlur = 10; c.lineWidth = 5;
    const glyphs = [[[0, 0], [0, 1], [0.5, 0.6]], [[0, 0], [0.5, 0.5], [0, 1]], [[0.5, 0], [0, 0.5], [0.5, 1], [1, 0.5], [0.5, 0]], [[0, 1], [0.5, 0], [1, 1]]];
    glyphs.forEach((g, i) => { const ox = 30 + (i % 2) * 120, oy = 30 + Math.floor(i / 2) * 120; c.beginPath(); g.forEach(([x, y], k) => c[k ? 'lineTo' : 'moveTo'](ox + x * 70, oy + y * 80)); c.stroke(); });
  });
}
function edgeTex2(key, color) { return edgeGlowTex(key, color); }

Object.assign(BUILDERS, {
  // ---------- 4 סקינים שמרוויחים (כל 30 איים) ----------
  oakAncient() {
    const oL = woodTex('oakAncL', 0xe6d2a8, 0xb89a68, { rings: 6, seed: 31 }), oD = woodTex('oakAncD', 0x6a4424, 0x2e1a0c, { rings: 9, seed: 32 });
    return kitSet(std({ map: oL, roughness: 0.6 }), std({ map: oD, roughness: 0.55 }), std({ map: woodTex('oakAncF', 0x5a3a20, 0x24140a, { rings: 7, seed: 33 }), roughness: 0.6 }), metal(0xb07a3a, 0.35),
      std({ map: stoneTex('oakDais', 0x8a7a64, 0x4a3e30, { freq: 4, seed: 34 }), roughness: 0.95 }), phys({ color: 0xf2e6cc, roughness: 0.3, clearcoat: 0.6 }), metal(0xb07a3a, 0.3), std({ map: oD, roughness: 0.45 }), metal(0xe0b048, 0.25), 0xffd8a0);
  },
  emeraldMarble() {
    const wm = marbleTex('emWhite', 0xf2f0ea, 0xa8b0a8, { freq: 2, turb: 4, sharp: 6, seed: 35 }), em = marbleTex('emGreen', 0x1f7a5a, 0x082a1e, { freq: 2, turb: 5, sharp: 5, seed: 36 });
    return kitSet(phys({ map: wm, roughness: 0.15, clearcoat: 0.7 }), phys({ map: em, roughness: 0.12, clearcoat: 0.8 }), gold(0.2), gold(0.22), phys({ map: em, roughness: 0.3, clearcoat: 0.3 }),
      phys({ map: wm, roughness: 0.12, clearcoat: 0.9 }), gold(0.2), phys({ map: em, roughness: 0.1, clearcoat: 1 }), gold(0.2), 0xb8ffd8);
  },
  royalSapphire() {
    const sv = brushedTex('sapSilver', 0xffffff, { streak: 0.2, seed: 37 }), sp = speckleTex('sapphire', 0x1d3a8a, 0x9ac8ff, { density: 0.992, seed: 38 });
    return kitSet(phys({ map: marbleTex('sapWhite', 0xdfe6f2, 0x9aa8c8, { freq: 2, seed: 39 }), roughness: 0.15, clearcoat: 0.7 }), phys({ map: sp, roughness: 0.08, clearcoat: 1 }), metal(0xc9d1dc, 0.28, { map: sv }), metal(0xdfe6f2, 0.25),
      std({ color: 0x1a2a5a, metalness: 0.4, roughness: 0.4 }), metal(0xdfe4ee, 0.22, { map: sv }), gold(0.2), phys({ map: sp, roughness: 0.06, clearcoat: 1 }), metal(0xdfe4ee, 0.22), 0xb8d8ff);
  },
  sunfire() {
    return kitSet(phys({ color: 0xffe2a0, roughness: 0.2, clearcoat: 0.6, emissive: 0xff9a30, emissiveIntensity: 0.18 }), std({ map: stoneTex('sunfireD', 0xc8501a, 0x6a1a08, { freq: 4, seed: 40 }), roughness: 0.4, emissive: 0xff5a10, emissiveIntensity: 0.25 }),
      metal(0xf2c14e, 0.18, { emissive: 0x8a4a10, emissiveIntensity: 0.5 }), lit(0xffd060, 0xffa020, 1.1), std({ color: 0x3a1a0a, roughness: 0.6, emissive: 0x5a1a04, emissiveIntensity: 0.5 }),
      addRim(metal(0xffc040, 0.2, { emissive: 0xff8a10, emissiveIntensity: 0.45 }), 0xfff0a0, 2, 1.2), lit(0xffffff, 0xffd060, 1.4), addRim(std({ color: 0x8a2a0a, emissive: 0xff4a10, emissiveIntensity: 0.4, roughness: 0.3 }), 0xffa040, 2, 1.2), metal(0xf2c14e, 0.2), 0xffb050);
  },
  silverMoon() {
    const mb = brushedTex('moonBrush', 0xffffff, { streak: 0.2, seed: 100 });
    return kitSet(phys({ map: marbleTex('moonPearl', 0xe8ecf2, 0xb0b8c8, { freq: 2, seed: 98 }), roughness: 0.2, clearcoat: 0.7 }), std({ map: stoneTex('slateMoon', 0x3a4250, 0x1a1e28, { freq: 6, seed: 99 }), roughness: 0.55, metalness: 0.2 }),
      metal(0xc0c8d4, 0.25, { map: mb }), lit(0xe0ecff, 0xb8d0ff, 0.9), std({ color: 0x2a303c, roughness: 0.7 }),
      metal(0xe8ecf4, 0.18, { map: mb }), lit(0xffffff, 0xd0e0ff, 1.0), addRim(std({ color: 0x2a3040, metalness: 0.6, roughness: 0.3 }), 0xc8d8ff, 2.2, 1.0), metal(0xc0c8d4, 0.2), 0xd0e0ff);
  },
  amethystAurora() {
    const am = speckleTex('amethystD', 0x5a2a8a, 0xd8b8ff, { density: 0.99, seed: 101 });
    return kitSet(phys({ color: 0xe8dcf4, roughness: 0.12, clearcoat: 1, iridescence: 0.6 }), phys({ map: am, roughness: 0.08, clearcoat: 1 }),
      metal(0xc8b8e8, 0.2, { emissive: 0x3affc8, emissiveMap: frameLineTex('frameAurora', '#3affc8'), emissiveIntensity: 0.9 }), lit(0x7affd8, 0x3affc8, 1.2), std({ color: 0x24143a, roughness: 0.5, metalness: 0.3 }),
      addRim(phys({ color: 0xf2eaff, roughness: 0.08, clearcoat: 1, flatShading: true }), 0xb8fff0, 2.2, 1.0), lit(0xffffff, 0x9affe0, 1.2),
      addRim(phys({ color: 0x4a1a7a, roughness: 0.06, clearcoat: 1, flatShading: true }), 0x9affe0, 2.2, 1.2), lit(0x7affd8, 0x3affc8, 1.3), 0x9affe0);
  },
  // ---------- 10 סקינים בכסף אמיתי ----------
  obsidianGold() {
    const vein = marbleTex('obsGoldVein', 0x34303a, 0xd8a83a, { freq: 2, turb: 5, sharp: 8, seed: 41 }), hg = hammeredTex('obsHGold', 0xffffff, { seed: 42 });
    const obs = speckleTex('obsidianG', 0x0c0b10, 0x8a7a5a, { density: 0.995, seed: 43 });
    return kitSet(phys({ map: vein, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 }), phys({ map: obs, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03, metalness: 0.2 }),
      metal(0xd8a83a, 0.28, { map: hg }), gold(0.18), phys({ color: 0x141218, roughness: 0.2, clearcoat: 1 }),
      metal(0xf2c14e, 0.14, { map: hg }), phys({ color: 0x0c0b10, roughness: 0.05, clearcoat: 1 }), phys({ map: obs, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, metalness: 0.25 }), gold(0.16), 0xffd27a);
  },
  crystalPrism() {
    const cr = (color, o = {}) => phys({ color, roughness: 0.04, metalness: 0.05, iridescence: 1, iridescenceIOR: 1.45, clearcoat: 1, flatShading: true, ...o });
    return kitSet(cr(0xeaf6ff, { transparent: true, opacity: 0.9 }), cr(0x9fc8ff, { transparent: true, opacity: 0.92 }), metal(0xdfe8f4, 0.15), lit(0xffffff, 0xd8ecff, 1.2), cr(0xc8dcf8),
      addRim(cr(0xf6fbff), 0xffffff, 2.2, 1.0), lit(0xffffff, 0xcfe8ff, 1.3), addRim(cr(0x6a7aff), 0xd8c8ff, 2.2, 1.0), lit(0xffffff, 0xb8a8ff, 1.3), 0xd8ecff);
  },
  royalJade() {
    const jd = marbleTex('royalJade', 0x2f8a5e, 0x0e3a24, { freq: 2, turb: 3, sharp: 3, seed: 44 });
    return kitSet(phys({ color: 0xf2ead8, roughness: 0.2, clearcoat: 0.8 }), phys({ map: jd, roughness: 0.12, clearcoat: 1 }), gold(0.2), gold(0.22), std({ map: woodTex('jadeWalnut', 0x4a3220, 0x1e120a, { rings: 6, seed: 45 }), roughness: 0.6 }),
      phys({ color: 0xf6efe0, roughness: 0.18, clearcoat: 0.9 }), gold(0.2), phys({ map: jd, roughness: 0.1, clearcoat: 1 }), gold(0.2), 0xc8ffd8);
  },
  neonGrid() {
    const ec = edgeTex2('neonCyanEdge', '#33f0ff'), em = edgeTex2('neonPinkEdge', '#ff3ad8');
    return kitSet(phys({ color: 0x1a1f44, roughness: 0.08, clearcoat: 1, emissive: 0x33f0ff, emissiveMap: ec, emissiveIntensity: 1.0 }), phys({ color: 0x07081a, roughness: 0.06, clearcoat: 1, emissive: 0xff3ad8, emissiveMap: em, emissiveIntensity: 0.9 }),
      std({ color: 0x0a0c18, metalness: 0.9, roughness: 0.3, emissive: 0xff3ad8, emissiveMap: frameLineTex('framePink', '#ff3ad8'), emissiveIntensity: 1.2 }), lit(0x33f0ff, 0x33f0ff, 1.5), std({ color: 0x080a14, metalness: 0.8, roughness: 0.35, emissive: 0x3a0a4a, emissiveIntensity: 0.5 }),
      addRim(std({ color: 0x0b3e48, emissive: 0x33f0ff, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.3 }), 0x9ffcff, 2, 1.7), lit(0xffffff, 0xaaffff, 1.5),
      addRim(std({ color: 0x48103e, emissive: 0xff3ad8, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.3 }), 0xffa8f0, 2, 1.7), lit(0xffffff, 0xffa8f0, 1.5), 0x33f0ff);
  },
  rubyGold() {
    const cr = marbleTex('rubyCream', 0xf6e6c8, 0xc8b08a, { freq: 2, seed: 46 });
    return kitSet(phys({ map: cr, roughness: 0.18, clearcoat: 0.7 }), gloss(0x9a1428), gold(0.18), gold(0.2), gloss(0x3a0a12),
      phys({ map: cr, roughness: 0.15, clearcoat: 0.9 }), gold(0.18), addRim(gloss(0xb0182e), 0xff8a9a, 2.2, 0.8), gold(0.18), 0xffc8c8);
  },
  galaxy() {
    const st = starSpeckle('galaxyStarsA', 0x3a2a7a, 0xffffff), st2 = starSpeckle('galaxyStarsB', 0x0c0a24, 0x9ad8ff);
    return kitSet(phys({ color: 0x5a4aa8, roughness: 0.05, clearcoat: 1, emissive: 0xc8b8ff, emissiveMap: st, emissiveIntensity: 0.9 }), phys({ color: 0x0c0a24, roughness: 0.05, clearcoat: 1, emissive: 0x8ad8ff, emissiveMap: st2, emissiveIntensity: 0.9 }),
      metal(0xc8ccd8, 0.2, { emissive: 0x2a2a6a, emissiveIntensity: 0.4 }), lit(0xffffff, 0xd8e8ff, 1.2), std({ color: 0x120e30, metalness: 0.5, roughness: 0.3, emissive: 0x2a1a5a, emissiveIntensity: 0.5 }),
      addRim(std({ color: 0xe8e8ff, emissive: 0x9a9aff, emissiveIntensity: 0.4, roughness: 0.2, metalness: 0.5, map: st }), 0xffffff, 2, 1.1), lit(0xffffff, 0x9ad8ff, 1.3),
      addRim(std({ color: 0x1a1450, emissive: 0x4a3aaa, emissiveIntensity: 0.5, roughness: 0.15, metalness: 0.5, map: st2 }), 0xb8a8ff, 2, 1.3), lit(0xffffff, 0xd8a8ff, 1.3), 0xc8b8ff);
  },
  moltenLava() {
    const cracks = speckleTex('lavaCracks', 0x1a1210, 0xff5a1a, { density: 0.975, seed: 47, glow: true });
    return kitSet(std({ map: stoneTex('lavaRockL', 0x4a3a36, 0x221a18, { freq: 5, seed: 48 }), roughness: 0.85 }), std({ color: 0x1a1210, roughness: 0.6, emissive: 0xff5a1a, emissiveMap: cracks, emissiveIntensity: 1.3 }),
      std({ map: stoneTex('lavaFrame', 0x2a2220, 0x0e0a08, { freq: 4, seed: 49 }), roughness: 0.9, emissive: 0xff3a0a, emissiveMap: cracks, emissiveIntensity: 0.8 }), lit(0xff6a20, 0xff4a10, 1.5), std({ color: 0x140e0c, roughness: 0.9, emissive: 0x4a0a02, emissiveIntensity: 0.5 }),
      addRim(std({ color: 0xff7a20, emissive: 0xff5010, emissiveIntensity: 0.9, roughness: 0.4 }), 0xffd060, 2, 1.4), lit(0xffe080, 0xffc040, 1.4),
      std({ color: 0x1a1412, roughness: 0.5, emissive: 0xff3a0a, emissiveMap: cracks, emissiveIntensity: 1.0 }), lit(0xff6a20, 0xff4a10, 1.4), 0xff7a30);
  },
  frostDiamond() {
    const ice = (color, o = {}) => phys({ color, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.4, ...o });
    return kitSet(ice(0xf4fbff), ice(0x8ec8e8, { emissive: 0x1a4a7a, emissiveIntensity: 0.15 }), metal(0xdfeaf4, 0.18), lit(0xe8f8ff, 0xbfe8ff, 1.1), ice(0xcfe6f4),
      addRim(ice(0xf8fdff, { transparent: true, opacity: 0.92 }), 0xffffff, 2.4, 0.9), lit(0xffffff, 0xcff0ff, 1.2), addRim(ice(0x3a7ab8), 0xbfe8ff, 2.2, 1.0), lit(0xffffff, 0xbfe8ff, 1.2), 0xbfe8ff);
  },
  rosePearl() {
    const pearl = (o = {}) => phys({ color: 0xfbf2f0, roughness: 0.22, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessMinimum: 200, iridescenceThicknessMaximum: 700, clearcoat: 0.8, ...o });
    const rose = metal(0xd89a8a, 0.28);
    return kitSet(pearl(), metal(0xd89a8a, 0.32), metal(0xe8b0a0, 0.25), pearl(), pearl({ color: 0xf2e0dc }), pearl(), metal(0xe8b0a0, 0.22), rose, pearl(), 0xffd8d0);
  },
  pharaohLapis() {
    const lapis = speckleTex('lapis', 0x1c3c9e, 0xf2c94c, { density: 0.991, seed: 10 });
    return kitSet(std({ color: 0xf2d68a, metalness: 0.6, roughness: 0.3 }), std({ map: lapis, roughness: 0.28, metalness: 0.1 }), metal(0xf2c14e, 0.18), std({ map: lapis, roughness: 0.3 }),
      std({ map: stoneTex('lapisDais', 0xd8b880, 0xa07848, { freq: 4, seed: 50 }), roughness: 0.9 }), metal(0xf5c451, 0.15), std({ map: lapis, roughness: 0.3 }), std({ map: lapis, roughness: 0.25, metalness: 0.15 }), metal(0xf5c451, 0.16), 0xffd27a);
  },

  // ---------- לוחות 30 איי הפרימיום (100–129) ----------
  i100() { // מגנטים מרחפים
    const br = brushedTex('magBrush', 0xffffff, { streak: 0.22, seed: 51 });
    return kitSet(metal(0xc9d1dc, 0.3, { map: br }), metal(0x5b6474, 0.32, { map: br }), std({ color: 0xa8b4c4, metalness: 1, roughness: 0.2, emissive: 0x4aa8ff, emissiveMap: frameLineTex('frameBlue', '#4aa8ff'), emissiveIntensity: 1.1 }), lit(0x8ad0ff, 0x4aa8ff, 1.3),
      metal(0x3a4250, 0.4), metal(0xe8eef6, 0.15, { map: br }), lit(0xb8e4ff, 0x4aa8ff, 1.2), metal(0x3a404c, 0.25, { map: br }), lit(0x4aa8ff, 0x2a88ff, 1.4), 0x8ad0ff);
  },
  i101() { // קרח זכוכית
    const ice = (color, o = {}) => phys({ color, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.86, ...o });
    return kitSet(ice(0xe6f7ff), ice(0x7ab8d8, { opacity: 0.92 }), phys({ color: 0xcfeaff, roughness: 0.3, clearcoat: 0.6 }), lit(0xe8f8ff, 0xbfe8ff, 0.9), phys({ color: 0xb8dcf0, roughness: 0.2, clearcoat: 0.8 }),
      addRim(ice(0xf8fdff, { opacity: 0.94 }), 0xffffff, 2.4, 0.8), lit(0xffffff, 0xcff0ff, 1.1), addRim(ice(0x2a5a98, { opacity: 0.96 }), 0xbfe8ff, 2.2, 1.0), lit(0xffffff, 0xbfe8ff, 1.1), 0xbfe8ff);
  },
  i102() { // בזלת מותכת
    const cr = speckleTex('basaltCracks', 0x18181b, 0xff6a20, { density: 0.982, seed: 52, glow: true });
    return kitSet(std({ map: stoneTex('basaltL', 0x4a4a4f, 0x2a2a2e, { freq: 6, seed: 53 }), roughness: 0.9 }), std({ color: 0x18181b, roughness: 0.75, emissive: 0xff6a20, emissiveMap: cr, emissiveIntensity: 1.1 }),
      std({ map: stoneTex('basaltF', 0x26262a, 0x101012, { freq: 4, seed: 54 }), roughness: 0.95, emissive: 0xff4a10, emissiveMap: cr, emissiveIntensity: 0.6 }), lit(0xff6a20, 0xff4a10, 1.3), std({ color: 0x141416, roughness: 0.95 }),
      addRim(std({ color: 0xff8a30, emissive: 0xff5a10, emissiveIntensity: 0.85, roughness: 0.45 }), 0xffd060, 2, 1.3), lit(0xffe080, 0xffc040, 1.3), std({ map: stoneTex('basaltP', 0x2a2a2e, 0x0e0e10, { freq: 7, seed: 55 }), roughness: 0.7 }), lit(0xff6a20, 0xff4a10, 1.2), 0xff8a40);
  },
  i103() { // פטיפון ויניל
    return kitSet(gloss(0x3a3a3c), gloss(0x0e0e10), std({ map: woodTex('vinylWalnut', 0x5a3820, 0x24140a, { rings: 8, seed: 56 }), roughness: 0.45 }), gold(0.22), std({ color: 0x1a1414, roughness: 0.6 }),
      phys({ color: 0xf6f0e2, roughness: 0.2, clearcoat: 0.9 }), gold(0.2), gloss(0x0c0c0e), gold(0.2), 0xffd8a0);
  },
  i104() { // היער המדבר
    const mossL = woodTex('forestL', 0x7a8a4a, 0x4a5a2a, { rings: 5, seed: 57 }), bark = woodTex('forestD', 0x3a2a18, 0x140c06, { rings: 10, seed: 58 });
    return kitSet(std({ map: mossL, roughness: 0.8 }), std({ map: bark, roughness: 0.75 }), std({ map: woodTex('forestF', 0x4a3a22, 0x1e140a, { rings: 6, seed: 59 }), roughness: 0.9 }), lit(0x7aff6a, 0x4aff3a, 1.1), std({ color: 0x2a3a1a, roughness: 0.95 }),
      std({ map: woodTex('birch', 0xe8e4d4, 0xb8b0a0, { rings: 4, seed: 60 }), roughness: 0.6 }), lit(0x9aff7a, 0x6aff4a, 1.2), std({ map: bark, roughness: 0.6 }), lit(0x7aff6a, 0x4aff3a, 1.3), 0x9aff7a);
  },
  i105() { // אטלנטיס השקועה
    return kitSet(phys({ map: marbleTex('atlL', 0xd8f2ea, 0x6ab8a8, { freq: 2, seed: 61 }), roughness: 0.18, clearcoat: 0.7 }), phys({ map: marbleTex('atlD', 0x1f6f7a, 0x08303a, { freq: 2, seed: 62 }), roughness: 0.12, clearcoat: 0.9 }),
      metal(0x3a8a70, 0.45), gold(0.25), std({ map: stoneTex('atlDais', 0x4a7a7a, 0x1a3a40, { freq: 5, seed: 63 }), roughness: 0.85 }),
      phys({ color: 0xf8f2ec, roughness: 0.22, iridescence: 1, iridescenceIOR: 1.35, clearcoat: 0.8 }), gold(0.2), addRim(phys({ color: 0x2ccfcf, roughness: 0.06, clearcoat: 1, emissive: 0x0a5a5a, emissiveIntensity: 0.4 }), 0xaafff4, 2.2, 1.0), gold(0.2), 0x7fffe8);
  },
  i106() { // מנגנון השעונים
    const br = brushedTex('brassBrush', 0xffffff, { streak: 0.24, seed: 64 });
    return kitSet(metal(0xd0a040, 0.32, { map: br }), metal(0x9a5a30, 0.36, { map: br }), metal(0x3a3a40, 0.45), metal(0xe0b048, 0.28), std({ map: stoneTex('clockDais', 0x4a3a30, 0x221812, { freq: 5, seed: 65 }), roughness: 0.95 }),
      metal(0xe8c060, 0.22, { map: br }), metal(0xb07a3a, 0.3), metal(0x2a2a30, 0.35), metal(0xc87a40, 0.3), 0xffc070);
  },
  i107() { // ממתקי קריסטל
    return kitSet(phys({ color: 0xf7e3c3, roughness: 0.35, clearcoat: 0.6 }), gloss(0x6b3a1e), gloss(0xff8ac8), lit(0xffd8ee, 0xff9ad8, 0.9), phys({ color: 0xfff0f6, roughness: 0.4, clearcoat: 0.5 }),
      phys({ color: 0xfff8f0, roughness: 0.3, clearcoat: 0.8 }), gloss(0xff6ab8), gloss(0x4a2410), gloss(0x8ae8ff), 0xffc8e8);
  },
  i108() { // ממד המראות
    return kitSet(metal(0xdfe6ee, 0.05), metal(0x6d7784, 0.08), metal(0xf0f4f8, 0.06), lit(0xe8e0ff, 0xb8a8ff, 0.9), metal(0x9aa2ae, 0.12),
      metal(0xf4f6fa, 0.04), metal(0xb8a8ff, 0.1), metal(0x3a404a, 0.06), metal(0xe8e0ff, 0.08), 0xd8d0ff);
  },
  i109() { // מדבר אור הכוכבים
    return kitSet(std({ map: stoneTex('starSandL', 0xb48fd6, 0x7a5aa0, { freq: 6, seed: 66, pits: 0.1 }), roughness: 0.8 }), std({ map: stoneTex('starSandD', 0x6c4a8f, 0x3a2458, { freq: 6, seed: 67, pits: 0.1 }), roughness: 0.75 }),
      lit(0xe8dcff, 0xb8a0ff, 0.8, { roughness: 0.15 }), lit(0x8ffcff, 0x4ae8ff, 1.3), std({ color: 0x3a2458, roughness: 0.85 }),
      addRim(phys({ color: 0xe8dcff, roughness: 0.1, clearcoat: 1, flatShading: true }), 0xffffff, 2.2, 1.0), lit(0x8ffcff, 0x4ae8ff, 1.3), addRim(phys({ color: 0x4a2a7a, roughness: 0.1, clearcoat: 1, flatShading: true }), 0xd8a8ff, 2.2, 1.1), lit(0x8ffcff, 0x4ae8ff, 1.3), 0xc8a8ff);
  },
  i110() { // מעבדת סייברפאנק (הצבעים מתחלפים — ExpansionStage)
    const eg = edgeTex2('labGreenEdge', '#33ff8a'), ec = edgeTex2('labCyanEdge', '#33f0ff');
    return kitSet(phys({ color: 0x2a3a5a, roughness: 0.08, clearcoat: 1, emissive: 0x33ff8a, emissiveMap: eg, emissiveIntensity: 1.0 }), phys({ color: 0x0a0f1a, roughness: 0.06, clearcoat: 1, emissive: 0x33f0ff, emissiveMap: ec, emissiveIntensity: 0.9 }),
      std({ color: 0x10141c, metalness: 0.9, roughness: 0.3, emissive: 0x33ff8a, emissiveMap: frameLineTex('frameGreen', '#33ff8a'), emissiveIntensity: 1.2 }), lit(0x33ff8a, 0x33ff8a, 1.4), std({ color: 0x0b0e16, metalness: 0.8, roughness: 0.35, emissive: 0x0a3a2a, emissiveIntensity: 0.4 }),
      addRim(std({ color: 0x0b483e, emissive: 0x33ff8a, emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.3 }), 0x9fffd0, 2, 1.7), lit(0xffffff, 0xaaffd8, 1.5),
      addRim(std({ color: 0x0b3e48, emissive: 0x33f0ff, emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.3 }), 0x9ffcff, 2, 1.7), lit(0xffffff, 0xaaffff, 1.5), 0x33ff8a);
  },
  i111() { // הספרייה המרחפת
    return kitSet(std({ map: stoneTex('parchment', 0xe8d8b0, 0xc8b088, { freq: 3, seed: 68, pits: 0.05 }), roughness: 0.9 }), std({ map: stoneTex('leather', 0x6a3a1e, 0x3a1a0a, { freq: 8, seed: 69, pits: 0.4 }), roughness: 0.7 }),
      std({ map: woodTex('libMahog', 0x5a2416, 0x200a04, { rings: 10, seed: 70 }), roughness: 0.45 }), gold(0.25), std({ color: 0x2a1810, roughness: 0.8 }),
      phys({ color: 0xf2e8cc, roughness: 0.3, clearcoat: 0.5 }), lit(0x3a6ad8, 0x1a4ab8, 0.8), std({ color: 0x5a2a12, roughness: 0.5 }), gold(0.22), 0xffe0a0);
  },
  i112() { // ענן הסערה (המסגרת מהבהבת בברקים — ExpansionStage)
    return kitSet(std({ color: 0xd8dce4, roughness: 0.7 }), std({ color: 0x4a5468, roughness: 0.6 }), std({ color: 0x2a3040, metalness: 0.8, roughness: 0.35, emissive: 0x6ab8ff, emissiveIntensity: 0.3 }), lit(0xb8e0ff, 0x6ab8ff, 1.2), std({ color: 0x3a4250, roughness: 0.8 }),
      metal(0xe8ecf4, 0.25), lit(0xb8e0ff, 0x6ab8ff, 1.2), std({ color: 0x2a3448, metalness: 0.5, roughness: 0.4 }), lit(0xb8e0ff, 0x6ab8ff, 1.3), 0x9ad0ff);
  },
  i113() { // דיו ומשי
    return kitSet(std({ map: stoneTex('ricePaper', 0xf2efe6, 0xd8d2c4, { freq: 3, seed: 71, pits: 0.02 }), roughness: 0.9 }), gloss(0x2b2b2b), gloss(0xa01a1a), gold(0.25), std({ color: 0x2a2420, roughness: 0.7 }),
      phys({ color: 0xf8f6f0, roughness: 0.2, clearcoat: 0.9 }), gloss(0xa01a1a), gloss(0x141414), gold(0.22), 0xffd8c0);
  },
  i114() { // שוניות הפיראטים
    return kitSet(std({ map: stoneTex('reefSand', 0xe8c8a8, 0xb89a78, { freq: 6, seed: 72 }), roughness: 0.85 }), std({ map: woodTex('pirateWood', 0x4a2e1e, 0x1e120a, { rings: 9, seed: 73 }), roughness: 0.7 }),
      std({ map: woodTex('driftwood', 0x7a6a58, 0x3a3028, { rings: 7, seed: 74 }), roughness: 0.85 }), metal(0xb07a3a, 0.35), std({ color: 0x3a3a3a, roughness: 0.9 }),
      std({ color: 0xeee6d0, roughness: 0.55 }), gold(0.25), std({ map: woodTex('pirateWood', 0x4a2e1e, 0x1e120a, { rings: 9, seed: 73 }), roughness: 0.55 }), gold(0.25), 0xffd890);
  },
  i115() { // כוורת הזהב
    const hx = hexTex('honeyHexL', '#f6d36b', '#c8962a'), hx2 = hexTex('honeyHexD', '#b5821c', '#7a5208');
    return kitSet(phys({ map: hx, roughness: 0.18, clearcoat: 0.9, emissive: 0x8a5a0a, emissiveIntensity: 0.12 }), phys({ map: hx2, roughness: 0.15, clearcoat: 1 }), std({ color: 0xe8b84a, roughness: 0.5 }), gold(0.2), std({ color: 0x6a4a10, roughness: 0.6 }),
      metal(0xf2c14e, 0.18), gloss(0xb5821c), gloss(0x7a4a08, { emissive: 0x3a1a00, emissiveIntensity: 0.3 }), gold(0.2), 0xffd060);
  },
  i116() { // פסלי השיש
    const carrara = marbleTex('carrara', 0xf6f3ec, 0x8a8e96, { freq: 2, turb: 4.5, sharp: 7, seed: 5 }), grey = marbleTex('greyMarble', 0x8a8e96, 0x3a3e46, { freq: 2, turb: 5, sharp: 6, seed: 75 });
    return kitSet(phys({ map: carrara, roughness: 0.2, clearcoat: 0.6 }), phys({ map: grey, roughness: 0.22, clearcoat: 0.6 }), phys({ map: carrara, roughness: 0.3, clearcoat: 0.3 }), gold(0.22), phys({ map: grey, roughness: 0.35 }),
      phys({ map: carrara, roughness: 0.15, clearcoat: 0.85 }), gold(0.2), phys({ map: grey, roughness: 0.15, clearcoat: 0.85 }), gold(0.2), 0xfff0c8);
  },
  i117() { // חלל עמוק
    const s1 = starSpeckle('spaceStarsA', 0x3b3f6b, 0xffffff), s2 = starSpeckle('spaceStarsB', 0x15172e, 0x9ad8ff);
    return kitSet(phys({ color: 0x3b3f6b, roughness: 0.05, clearcoat: 1, emissive: 0xc8c8ff, emissiveMap: s1, emissiveIntensity: 0.8 }), phys({ color: 0x15172e, roughness: 0.05, clearcoat: 1, emissive: 0x8ad8ff, emissiveMap: s2, emissiveIntensity: 0.8 }),
      metal(0x6a7488, 0.3, { emissive: 0x33a8ff, emissiveMap: frameLineTex('frameSpace', '#33a8ff'), emissiveIntensity: 0.8 }), lit(0x9ad8ff, 0x33a8ff, 1.2), std({ color: 0x10122a, metalness: 0.6, roughness: 0.3 }),
      addRim(metal(0xdfe4ee, 0.2), 0xffffff, 2, 1.0), lit(0x9ad8ff, 0x33a8ff, 1.3), addRim(std({ color: 0x1a1c40, roughness: 0.15, metalness: 0.5, map: s2 }), 0x9ad8ff, 2, 1.2), lit(0xd8a8ff, 0x9a6aff, 1.3), 0x9ad8ff);
  },
  i118() { // גייזרים וקיטור
    return kitSet(std({ map: stoneTex('terraL', 0xe3a77a, 0xb87a50, { freq: 6, seed: 76 }), roughness: 0.85 }), std({ map: stoneTex('terraD', 0x9b5532, 0x5a2a12, { freq: 6, seed: 77 }), roughness: 0.85 }),
      std({ map: stoneTex('terraF', 0x7a4228, 0x3a1a0a, { freq: 4, seed: 78 }), roughness: 0.9 }), lit(0x5ad8c8, 0x2ab8a8, 0.9), std({ color: 0x5a3a28, roughness: 0.9 }),
      phys({ color: 0xf2e6d0, roughness: 0.3, clearcoat: 0.6 }), lit(0x5ad8c8, 0x2ab8a8, 1.0), std({ color: 0x7a3a1a, roughness: 0.5 }), lit(0x5ad8c8, 0x2ab8a8, 1.0), 0xffd0a0);
  },
  i119() { // יער הפטריות
    return kitSet(std({ map: stoneTex('mossL', 0x5a8a4a, 0x2e5a26, { freq: 7, seed: 79 }), roughness: 0.9 }), std({ map: speckleTex('capD', 0x8a3a2a, 0xf2e6d0, { density: 0.985, seed: 80 }), roughness: 0.6 }),
      std({ map: woodTex('shroomBark', 0x4a3a2a, 0x1e140a, { rings: 8, seed: 81 }), roughness: 0.9 }), lit(0x9affd8, 0x4affb8, 1.2), std({ color: 0x1e2a1a, roughness: 0.95 }),
      addRim(std({ color: 0xf2ece0, emissive: 0x9affd8, emissiveIntensity: 0.25, roughness: 0.5 }), 0xc8fff0, 2, 1.0), lit(0x9affd8, 0x4affb8, 1.3), addRim(std({ color: 0x4a1a5a, emissive: 0xc84aff, emissiveIntensity: 0.3, roughness: 0.45 }), 0xe8a8ff, 2, 1.1), lit(0xe8a8ff, 0xc84aff, 1.3), 0xb8ffe0);
  },
  i120() { // פורצלן
    const fl = floralTex('porcelainFloral');
    return kitSet(phys({ map: fl, roughness: 0.12, clearcoat: 1 }), gloss(0x1f4fa0), phys({ color: 0xf7f9fc, roughness: 0.12, clearcoat: 1 }), gloss(0x2a58b8), phys({ color: 0xe8eef8, roughness: 0.2, clearcoat: 0.8 }),
      phys({ map: fl, roughness: 0.1, clearcoat: 1 }), gloss(0x2a58b8), gloss(0x1f4fa0), phys({ color: 0xf7f9fc, roughness: 0.1, clearcoat: 1 }), 0xd8e8ff);
  },
  i121() { // חדר הצעצועים
    const pl = (color) => phys({ color, roughness: 0.35, clearcoat: 0.6 });
    return kitSet(pl(0xffe7a3), pl(0xe2664f), pl(0x3a7ae0), pl(0xffd23a), pl(0x5ab85a), pl(0xfff8e8), pl(0xffd23a), pl(0x2a4aa8), pl(0xe2664f), 0xfff0b0);
  },
  i122() { // שדות הכפר
    return kitSet(std({ map: stoneTex('wheatSq', 0xe8d08a, 0xc8a85a, { freq: 9, seed: 82, pits: 0.05 }), roughness: 0.85 }), std({ map: stoneTex('soilSq', 0x7a5a32, 0x4a3218, { freq: 8, seed: 83 }), roughness: 0.95 }),
      std({ map: woodTex('fenceWood', 0x9a7a52, 0x5a4228, { rings: 6, seed: 84 }), roughness: 0.85 }), gloss(0xb8282a), std({ color: 0x5a8a3a, roughness: 0.95 }),
      std({ map: woodTex('strawWood', 0xf2e0b0, 0xc8b080, { rings: 5, seed: 85 }), roughness: 0.6 }), gloss(0xb8282a), std({ map: woodTex('darkOakField', 0x5a3a20, 0x24140a, { rings: 8, seed: 86 }), roughness: 0.55 }), metal(0xb07a3a, 0.4), 0xfff0c0);
  },
  i123() { // זיכרונות בספיה (פילטר ספיה על המסך — ExpansionStage)
    return kitSet(std({ color: 0xd8c8a8, roughness: 0.7 }), std({ color: 0x6a5238, roughness: 0.65 }), std({ map: woodTex('sepiaWood', 0x8a7052, 0x3a2a1a, { rings: 8, seed: 87 }), roughness: 0.6 }), std({ color: 0xc8a878, metalness: 0.6, roughness: 0.4 }), std({ color: 0x4a3a28, roughness: 0.8 }),
      std({ color: 0xeee2c8, roughness: 0.45 }), std({ color: 0xa88a5a, metalness: 0.5, roughness: 0.4 }), std({ color: 0x3a2a1a, roughness: 0.45 }), std({ color: 0xa88a5a, metalness: 0.5, roughness: 0.4 }), 0xf0dcb0);
  },
  i124() { // תעלומת קורי העכביש
    return kitSet(std({ map: stoneTex('gothL', 0x4a4a52, 0x2a2a30, { freq: 5, seed: 88 }), roughness: 0.8 }), std({ map: stoneTex('gothD', 0x1e1e24, 0x0a0a0e, { freq: 5, seed: 89 }), roughness: 0.75 }),
      metal(0x2a2a30, 0.45), lit(0xdfe6ff, 0xb8c8ff, 0.9), std({ color: 0x16161a, roughness: 0.9 }),
      addRim(metal(0xd8dde8, 0.2), 0xe8f0ff, 2.2, 0.9), lit(0xdfe6ff, 0xb8c8ff, 1.0), std({ color: 0x141418, roughness: 0.3, metalness: 0.3 }), lit(0xdfe6ff, 0xb8c8ff, 1.0), 0xc8d8ff);
  },
  i125() { // גשר הנהר הגועש
    return kitSet(std({ map: stoneTex('riverStoneL', 0xb8b8a8, 0x7a7a6a, { freq: 5, seed: 90 }), roughness: 0.85 }), std({ map: stoneTex('mossStoneD', 0x5a6a52, 0x2a3424, { freq: 5, seed: 91 }), roughness: 0.85 }),
      std({ map: stoneTex('cobble', 0x8a8478, 0x4a463e, { freq: 3, seed: 92, pits: 0.5 }), roughness: 0.95 }), metal(0x6a6e76, 0.5), std({ color: 0x4a5a44, roughness: 0.95 }),
      std({ color: 0xe0ddd2, roughness: 0.6 }), metal(0x9aa2ac, 0.4), std({ color: 0x3a403c, roughness: 0.55 }), metal(0x9aa2ac, 0.4), 0xe0f0ff);
  },
  i126() { // שדות השלג
    return kitSet(std({ map: stoneTex('snowSq', 0xf4f8fc, 0xd0dce8, { freq: 4, seed: 93, pits: 0.05 }), roughness: 0.8 }), phys({ color: 0x6aa4cc, roughness: 0.1, clearcoat: 1 }),
      std({ map: woodTex('frostWood', 0x8a8070, 0x4a4238, { rings: 6, seed: 94 }), roughness: 0.85 }), lit(0x7affc8, 0x3affa8, 1.1), std({ color: 0xd8e4ee, roughness: 0.85 }),
      addRim(phys({ color: 0xf8fcff, roughness: 0.2, clearcoat: 0.8 }), 0xffffff, 2.2, 0.8), lit(0x7affc8, 0x3affa8, 1.2), addRim(phys({ color: 0x1e4a78, roughness: 0.1, clearcoat: 1 }), 0xb8ffe8, 2.2, 1.0), lit(0x7affc8, 0x3affa8, 1.2), 0xb8ffe8);
  },
  i127() { // תאים מיקרוסקופיים
    const cell = (color, e) => phys({ color, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.88, emissive: e, emissiveIntensity: 0.25 });
    return kitSet(cell(0xf2b8c8, 0xff6a9a), cell(0x8a4aa8, 0x8a2ac8), phys({ color: 0xf28ab0, roughness: 0.3, clearcoat: 0.8 }), lit(0xffb8d8, 0xff6aa8, 1.0), phys({ color: 0x5a2a5a, roughness: 0.4 }),
      addRim(cell(0xffe8f0, 0xff9ac0), 0xffffff, 2, 1.0), lit(0xffb8d8, 0xff6aa8, 1.2), addRim(cell(0x6a2a8a, 0xa84aff), 0xe8b8ff, 2, 1.1), lit(0xd8a8ff, 0xa84aff, 1.2), 0xffb8d8);
  },
  i128() { // מעגל הרונות
    const rn = runeTex('runesRed', '#ff3a2a');
    return kitSet(std({ map: stoneTex('runeL', 0x7a7a74, 0x4a4a44, { freq: 5, seed: 95 }), roughness: 0.9 }), std({ map: stoneTex('runeD', 0x34342e, 0x14140f, { freq: 5, seed: 96 }), roughness: 0.9 }),
      std({ map: stoneTex('runeF', 0x3a3a34, 0x1a1a16, { freq: 4, seed: 97 }), roughness: 0.95, emissive: 0xff3a2a, emissiveMap: rn, emissiveIntensity: 1.2 }), lit(0xff4a2a, 0xff2a10, 1.3), std({ color: 0x2a2a26, roughness: 0.95 }),
      std({ color: 0xc8c8c0, roughness: 0.8 }), lit(0xff4a2a, 0xff2a10, 1.2), std({ color: 0x2a2a26, roughness: 0.75, emissive: 0xff3a2a, emissiveMap: rn, emissiveIntensity: 0.6 }), lit(0xff4a2a, 0xff2a10, 1.3), 0xff6a4a);
  },
  i129() { // פסגת הזניט
    const cr = (color, o = {}) => phys({ color, roughness: 0.04, iridescence: 0.8, iridescenceIOR: 1.4, clearcoat: 1, flatShading: true, ...o });
    return kitSet(cr(0xf3fbff), cr(0x8fb4e0), metal(0xfff6e0, 0.15, { emissive: 0xffe8b0, emissiveIntensity: 0.4 }), lit(0xffffff, 0xfff0c8, 1.4), cr(0xe8f2fa),
      addRim(cr(0xffffff), 0xffffff, 2.2, 1.0), lit(0xffffff, 0xfff0c8, 1.4), addRim(cr(0x3a64b0), 0xe8f4ff, 2.2, 1.0), lit(0xffffff, 0xfff0c8, 1.4), 0xfff6e0);
  },
});

const SETS = {};
export const hasMaterialSet = (key) => !!BUILDERS[key];
export function eraMaterials(key) {
  if (!SETS[key]) SETS[key] = (BUILDERS[key] || BUILDERS.stone)();
  return SETS[key];
}

/** חומרים משותפים לכל העידנים */
export const COMMON = {
  get gold() { return this._gold || (this._gold = gold(0.22)); },
  get darkGold() { return this._dg || (this._dg = std({ color: 0x9a7224, metalness: 1, roughness: 0.35 })); },
  get ivory() { return this._iv || (this._iv = std({ color: 0xf2ead8, roughness: 0.5 })); },
  get black() { return this._bk || (this._bk = std({ color: 0x111014, roughness: 0.6 })); },
};
