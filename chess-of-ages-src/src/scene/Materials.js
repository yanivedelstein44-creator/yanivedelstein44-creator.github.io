/**
 * ערכות חומרים (PBR) לכל עידן: משבצות, מסגרת, במה וכלים לבנים/שחורים.
 * נבנות בעצלות ונשמרות במטמון.
 */
import * as THREE from 'three';
import { marbleTex, woodTex, stoneTex, brushedTex, hammeredTex, speckleTex, drawnTexture, addRim } from './kit.js';

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

const SETS = {};
export function eraMaterials(key) {
  if (!SETS[key]) SETS[key] = BUILDERS[key]();
  return SETS[key];
}

/** חומרים משותפים לכל העידנים */
export const COMMON = {
  get gold() { return this._gold || (this._gold = gold(0.22)); },
  get darkGold() { return this._dg || (this._dg = std({ color: 0x9a7224, metalness: 1, roughness: 0.35 })); },
  get ivory() { return this._iv || (this._iv = std({ color: 0xf2ead8, roughness: 0.5 })); },
  get black() { return this._bk || (this._bk = std({ color: 0x111014, roughness: 0.6 })); },
};
