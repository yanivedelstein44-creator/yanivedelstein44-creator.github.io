/**
 * החנות (באי המרכזי): במת תצוגה תלת-ממדית חזיתית עם סיבוב איטי (Idle Orbit) ומיקוד מצלמה לפי הפריט,
 * ורשת כרטיסים (2 בשורה) עם תמונת תלת-ממד לכל פריט, שם קצר וכפתור רכישה ביהלומים.
 * יהלומים מרוויחים בקרבות. בכסף אמיתי (לשונית פרימיום, לוחות ומעופפות): איי הפרימיום, בוסט יהלומים כפולים לשבוע, סקינים ללוח
 * ושלוש החיות המעופפות האגדיות של קן השמיים.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { h, withIcon } from './UI.js';
import { t, tn, shortName, islandName } from './i18n.js';
import { icon } from './icons.js';
import { WEARABLES, RARITY, formatGems, BOARD_SKINS, FULL_GAME, GEM_BOOST, formatPrice } from '../config/EconomyConfig.js';
import { PaymentProvider } from '../core/Economy.js';
import { eraMaterials } from '../scene/Materials.js';
import { skinPreview } from '../scene/PieceSprites.js';
import { PETS, PET_IDS, SKY_PET_IDS, CLASSIC_FLYER_IDS, isFlyer } from '../config/Pets.js';
import { PlayerAvatar3D } from '../scene/PlayerAvatar3D.js';
import { PetCompanion3D } from '../scene/PetCompanion3D.js';
import { FX } from '../scene/Particles.js';
import { HUB_ID, islandDef, residentPrice, petColorPrice } from '../config/Islands.js';
import { openLegalPage } from './LegalPages.js';
import { watchShopCards } from './A11yCards.js';

const AURA_ICON = { aura_none: 'noAura', aura_golden_sparks: 'sparkle', aura_fire_ring: 'fireRing', aura_cosmic_lightning: 'boltPurple' };
const SLOT_ICON = { head: 'crown', armor: 'shirt', weapon: 'swords', aura: 'sparkle' };
const SLOT_SHORT = { head: ['כתרים', 'Crowns'], armor: ['גלימות', 'Armor'], weapon: ['נשקים', 'Weapons'], aura: ['הילות', 'Auras'] };
// חנויות הלבוש שסביב הלוח באי המרכזי: כל מבנה פותח חנות של קטגוריה אחת
const SINGLE_TITLE = { head: ['בית הכתרים', 'Crown House'], armor: ['אוהל הגלימות', 'Robe Pavilion'], weapon: ['נפחיית הנשקים', 'Weapon Forge'], aura: ['מקדש ההילות', 'Aura Sanctum'], boards: ['בית הלוחות', 'Board House'], pets: ['בית החיות', 'Pet House'], sky: ['קן השמיים', 'Sky Nest'], premium: ['פרימיום', 'Premium'] };
const SINGLE_ICON = { ...SLOT_ICON, boards: 'checker', pets: 'paw', sky: 'wing', premium: 'crown' };
const SINGLE_TABS = ['boards', 'pets', 'sky', 'premium'];

// תמונות תצוגה של סקינים — נבנות בהדרגה (כדי לא לתקוע את הממשק) ונשמרות לכל ההפעלה
const SKIN_PREVIEWS = new Map();
let previewChain = Promise.resolve();
function skinThumb(key, done) {
  if (SKIN_PREVIEWS.has(key)) { done(SKIN_PREVIEWS.get(key)); return; }
  previewChain = previewChain.then(() => new Promise((res) => setTimeout(() => {
    try { if (!SKIN_PREVIEWS.has(key)) SKIN_PREVIEWS.set(key, skinPreview(eraMaterials(key))); done(SKIN_PREVIEWS.get(key)); } catch { /* נשארים עם הצבעים */ }
    res();
  }, 16)));
}
/** תווית מחיר לכסף אמיתי (מחנות האפליקציות כשמחוברת) */
export const realPrice = (product) => (typeof PaymentProvider.priceLabel === 'function' && PaymentProvider.priceLabel(product)) || (product.price ? formatPrice(product.price) : null);

/** במת התצוגה: מצלמה חזיתית, נדנוד עדין, גרירה מסובבת וחוזרת לחזית, מיקוד לפי הקטגוריה */
class MiniStage {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.scene.add(new THREE.HemisphereLight(0xffeedd, 0x2a1a3a, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(2.5, 4.5, 5); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xb08aff, 1.8); rim.position.set(-4, 3, -4); this.scene.add(rim);
    this.world = new THREE.Group();
    this.scene.add(this.world);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.9, 0.2, 48), new THREE.MeshStandardMaterial({ color: 0x2a1f40, metalness: 0.6, roughness: 0.3 }));
    plat.position.y = -0.1;
    this.world.add(plat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.72, 0.045, 8, 64), new THREE.MeshStandardMaterial({ color: 0xf2c94c, metalness: 1, roughness: 0.2, emissive: 0x6a4a10, emissiveIntensity: 0.5 }));
    ring.rotation.x = Math.PI / 2;
    this.world.add(ring);
    this.updaters = new Set();
    this.drag = 0; this.dragVel = 0; this.time = 0;
    this.focus = { target: new THREE.Vector3(0.15, 1.0, 0), dist: 5.4, height: 0.55 };
    this.camTarget = this.focus.target.clone();
    this.camDist = this.focus.dist;
    let dragging = false, lastX = 0;
    canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; this.drag += dx * 0.012; this.dragVel = dx * 0.4; });
    const up = () => { dragging = false; };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    this.dragging = () => dragging;
    this.loop = this.loop.bind(this);
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.loop);
  }
  onUpdate(fn) { this.updaters.add(fn); return () => this.updaters.delete(fn); }
  addShake() {}
  setFocus(target, dist, height = 0.45) { this.focus = { target: new THREE.Vector3(...target), dist, height }; }
  loop(now) {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.time += dt;
    const w = this.canvas.clientWidth, hh = this.canvas.clientHeight;
    if (w && hh && (this.canvas.width !== Math.floor(w * this.renderer.getPixelRatio()))) { this.renderer.setSize(w, hh, false); this.camera.aspect = w / hh; this.camera.updateProjectionMatrix(); }
    // גרירה עם אינרציה, ואז חזרה רכה לחזית + נדנוד איטי שמזמין לגרור
    if (!this.dragging()) { this.drag += this.dragVel * dt * 0.02; this.dragVel *= 0.9; this.drag *= Math.pow(0.35, dt); }
    this.world.rotation.y = this.drag + Math.sin(this.time * 0.45) * 0.26;
    const f = this.focus;
    const k = 1 - Math.exp(-dt * 5);
    this.camTarget.lerp(f.target, k);
    this.camDist += (f.dist - this.camDist) * k;
    this.camera.position.set(this.camTarget.x, this.camTarget.y + f.height * (this.camDist / 4), this.camTarget.z + this.camDist);
    this.camera.lookAt(this.camTarget);
    this.updaters.forEach((fn) => fn(dt, this.time));
    this.renderer.render(this.scene, this.camera);
  }
  dispose() { this.running = false; this.renderer.dispose(); try { this.renderer.forceContextLoss(); } catch { /* ok */ } }
}

// נקודות מיקוד (במרחב הבמה): האווטאר משמאל, החיה מימין
const AV = [-0.75, 0, 0.25];
const FOCUS = {
  all: [[0.1, 1.0, 0], 5.4, 0.55],
  head: [[AV[0] + 0.05, 1.5, AV[2]], 2.2, 0.15],
  armor: [[AV[0] + 0.05, 1.05, AV[2]], 2.9, 0.25],
  weapon: [[AV[0] + 0.25, 1.0, AV[2] + 0.2], 3.1, 0.25],
  aura: [[AV[0] + 0.1, 0.95, AV[2]], 4.0, 0.4],
  pets: [[1.15, 1.0, -0.1], 3.0, 0.3],
  sky: [[1.1, 1.6, -0.1], 3.9, 0.3], // החיות המעופפות מרחפות גבוה מעל הכן
};

/**
 * החנות. single — חנות של קטגוריה אחת בלבד (בלי לשוניות), כשנכנסים מאחד המבנים שבאי המרכזי:
 * קטגוריית לבוש לפי slot, או לשונית אחת: 'boards' / 'pets' / 'sky' (קן השמיים) / 'premium'
 */
export function openKingdomShop(app, { tab = 'wardrobe', slot: wantSlot = null, single: solo = false } = {}) {
  const { economy, ui, sound } = app;
  const maxEra = app.progression.maxEraReached();
  let preview = { ...economy.loadout };
  let previewPet = economy.pet;
  const single = !solo ? null : SINGLE_TABS.includes(tab) ? tab : WEARABLES[wantSlot] ? wantSlot : null;
  let curTab = SINGLE_TABS.includes(single) ? single : single ? 'wardrobe' : ['pets', 'sky', 'bots', 'boards', 'premium'].includes(tab) ? tab : 'wardrobe';
  // בקן השמיים מציגים חיה מעופפת על הבמה: המולבשת אם היא מעופפת, אחרת זו שחגה מעל העיר
  if (curTab === 'sky' && !isFlyer(previewPet)) previewPet = app.museum?.sky?.id || SKY_PET_IDS[0];
  let previewBot = null;
  let slot = WEARABLES[wantSlot] ? wantSlot : 'head';
  const title = single ? tn(...SINGLE_TITLE[single]) : t('shopTitle');

  const canvas = h('canvas', { role: 'img', 'aria-label': t('previewLabel') });
  const stageBox = h('div', { class: 'shop-stage' }, canvas, h('div', { class: 'stage-hint', 'aria-hidden': 'true' }, icon('chevron', { size: 12, cls: 'flip' }), t('dragRotate'), icon('chevron', { size: 12 })));
  const gemsEl = h('b', {}, formatGems(economy.gems));
  const giftBadge = h('span', { class: 'badge-dot', hidden: !economy.hasDailyBadge() }, '!');
  const head = h('div', { class: 'shop-head' },
    h('h2', {}, icon(single ? SINGLE_ICON[single] : 'chest', { size: 26 }), h('span', {}, title)),
    h('div', { class: 'head-right' },
      h('button', { class: 'icon-btn round tap gift', 'aria-label': t('dailyGift'), onclick: () => app.openDaily() }, icon('gift', { size: 24 }), giftBadge),
      h('div', { class: 'gems-pill', 'aria-label': t('gems') }, icon('gem', { size: 20 }), gemsEl)));
  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  const sub = h('div', { class: 'subtabs' });
  const grid = h('div', { class: 'shop-grid', role: 'tabpanel' });
  watchShopCards(grid, () => t('a11yPreview')); // [a11y] no nested buttons; Enter on Buy/Equip buys/equips
  const body = h('div', { class: 'shop' }, stageBox, tabs, sub, grid, h('p', { class: 'earn-note' }, ...withIcon('swords', tn('יהלומים מרוויחים בניצחונות על בוטים ועל פיראטי הזמן.', 'Gems are earned by beating bots and the Time Pirates.'), 14)));
  // הסצנה הראשית מוסתרת מאחורי החנות — משהים אותה כדי שהבמה תרוץ חלק
  const wasPaused = app.sm.paused;
  app.sm.paused = true;
  const m = ui.modal({ title: head, label: title, body, full: true, className: single ? `shop-modal shop-${single}` : 'shop-modal', onClose: () => { stage.dispose(); unsub(); app.sm.paused = wasPaused; app.applyLoadout(); } });

  // במת תצוגה
  const stage = new MiniStage(canvas);
  const miniFx = new FX(stage);
  const avatar = new PlayerAvatar3D(stage, miniFx);
  avatar.place(AV[0], AV[2], 0.28);
  avatar.setEraMaterials(app.currentEraMaterials());
  const pet = new PetCompanion3D(stage, miniFx, sound, { canFly: false });
  pet.place(1.15, -0.1, -0.35);
  pet.setEraMaterials(app.currentEraMaterials());
  let previewHue = previewPet === economy.pet ? economy.petHue : 0;
  const refreshPreview = () => {
    if (previewBot) { const b = islandDef(previewBot).bot; avatar.setLoadout(b.loadout); avatar.setLook(b.look); pet.setPet(b.pet, { hue: b.petHue }); return; }
    avatar.setLoadout(preview); avatar.setLook({}); pet.setPet(previewPet, { hue: previewHue, stage: economy.ownsPet(previewPet, maxEra) ? economy.petStage(previewPet) : 2 });
  };
  refreshPreview();
  avatar.lookAt(new THREE.Vector3(0, 1.3, 6));
  pet.lookAt(new THREE.Vector3(0, 1.0, 6));
  const focus = (k) => { const [tg, d, hgt] = FOCUS[k] || FOCUS.all; stage.setFocus(tg, d, hgt); };

  const unsub = economy.onChange(() => { gemsEl.textContent = formatGems(economy.gems); giftBadge.hidden = !economy.hasDailyBadge(); render(); });

  const result = (res) => {
    if (res.ok) { sound.coin(); ui.toast(t('purchased'), { kind: 'good', icon: 'check' }); return; }
    ui.toast(res.needGems ? tn(`חסרים ${formatGems(res.needGems)} יהלומים — נצח עוד קרבות!`, `${formatGems(res.needGems)} more gems needed — win more battles!`) : res.reason, { kind: 'bad', icon: 'gem' });
  };

  const tabFocus = (id) => (id === 'pets' || id === 'sky' ? id : id === 'bots' || id === 'boards' || id === 'premium' ? 'all' : slot);
  function setTab(id) {
    curTab = id;
    if (id !== 'bots' && previewBot) previewBot = null;
    // מעבר בין החיות למעופפות: על הבמה עומדת חיה מהלשונית הנוכחית
    if (id === 'sky' && !isFlyer(previewPet)) { previewPet = app.museum?.sky?.id || SKY_PET_IDS[0]; previewHue = 0; }
    else if (id === 'pets' && PETS[previewPet]?.sky) { previewPet = economy.pet; previewHue = economy.petHue; }
    refreshPreview();
    focus(tabFocus(id));
    render();
  }
  function render() {
    tabs.classList.add('six');
    tabs.hidden = !!single;
    tabs.replaceChildren(...[['wardrobe', 'shirt', t('tabWardrobe')], ['pets', 'paw', t('tabPets')], ['premium', 'crown', t('tabPremium')], ['sky', 'wing', t('tabSky')], ['bots', 'users', t('tabBots')], ['boards', 'checker', t('tabBoards')]].map(([id, ic, label]) => id === 'premium'
      ? h('button', { class: 'tap prem-tab', role: 'tab', 'aria-selected': String(curTab === id), onclick: () => setTab(id) }, h('span', { class: 'xb' }, 'x2'), h('i', { class: 'sp s1', 'aria-hidden': 'true' }), h('i', { class: 'sp s2', 'aria-hidden': 'true' }), icon(ic, { size: 30 }), h('span', {}, label))
      : h('button', { class: 'tap', role: 'tab', 'aria-selected': String(curTab === id), onclick: () => setTab(id) }, icon(ic, { size: 20 }), h('span', {}, label))));
    sub.hidden = !!single || curTab !== 'wardrobe';
    if (curTab === 'wardrobe') sub.replaceChildren(...Object.keys(WEARABLES).map((s) => h('button', { class: 'tap', 'aria-pressed': String(slot === s), onclick: () => { slot = s; focus(s); render(); } }, icon(SLOT_ICON[s], { size: 18 }), h('span', {}, tn(...SLOT_SHORT[s])))));
    const won = app.progression.conqueredList().filter((id) => id !== HUB_ID || app.progression.isConquered(HUB_ID)).sort((a, b) => a - b);
    if (curTab === 'wardrobe') grid.replaceChildren(...WEARABLES[slot].map(itemCard));
    else if (curTab === 'pets') grid.replaceChildren(h('p', { class: 'shop-note' }, ...withIcon('paw', t('petGrowNote'), 14)), ...PET_IDS.map((id) => petCard(id)), ...won.filter((id) => islandDef(id).bot.petHue).map(petColorCard));
    else if (curTab === 'sky') grid.replaceChildren(h('p', { class: 'shop-note' }, ...withIcon('gift', t('skyNote'), 14)), ...SKY_PET_IDS.map(skyCard), ...CLASSIC_FLYER_IDS.map((id) => petCard(id, 'sky')), ...payNote());
    else if (curTab === 'boards') grid.replaceChildren(h('p', { class: 'shop-note' }, ...withIcon('gift', t('boardsNote'), 14)), ...BOARD_SKINS.map(skinCard), ...payNote());
    else if (curTab === 'premium') grid.replaceChildren(...premiumCards(), ...payNote());
    else grid.replaceChildren(...won.map(botCard), h('div', { class: 'card hint-card' }, icon('flag', { size: 34 }), h('small', {}, won.length ? t('moreBotsHint') : t('noBotsHint'))));
  }

  /** [legal] גילוי לפני קנייה בכסף אמיתי (מה מקבלים, איפה רואים מחיר) + קישור לתנאים ולהחזרים. מערך — ריק כשאין מכירה */
  function payNote() {
    if (!economy.sandbox && !economy.canBuyReal()) return []; // Play לפני חיבור Billing: הכפתורים מציגים "בקרוב"
    const restoreBtn = typeof PaymentProvider.restore === 'function' && !economy.sandbox
      ? [' · ', h('button', { class: 'link-btn tap', type: 'button', onclick: (e) => { e.stopPropagation(); restoreNow(); } }, t('restorePurchases'))] : [];
    return [h('p', { class: 'shop-note pay-note' }, ...withIcon('info', t(economy.sandbox ? 'lgBuyNoteTest' : 'lgBuyNote'), 14), ' ',
      h('button', { class: 'link-btn tap', type: 'button', onclick: (e) => { e.stopPropagation(); openLegalPage(app, 'terms', 'pay'); } }, t('lgTermsLink')), ...restoreBtn)];
  }

  /** "שחזור רכישות": בודק מול Google Play ומחזיר את מה שנקנה בחשבון הזה */
  let restoring = false;
  async function restoreNow() {
    if (restoring) return;
    restoring = true;
    ui.toast(t('restoring'), { icon: 'info' });
    try {
      const r = await PaymentProvider.restore();
      ui.toast(r?.reason || t('restoreFail'), { kind: r?.ok ? (r.granted ? 'good' : '') : 'bad', icon: r?.ok ? 'check' : 'info', duration: 3600 });
      if (r?.granted) { app.applyLoadout?.(); render(); }
    } finally { restoring = false; }
  }

  /** קנייה בכסף אמיתי: מצב בדיקה = מיידי וללא חיוב; בגוגל פליי — חלון התשלום של החנות */
  const realBuy = async (fn, onDone) => {
    const res = await fn(() => Promise.resolve(true));
    if (res.ok) { sound.jackpot?.(); ui.toast(t('purchased'), { kind: 'gold', icon: 'check' }); onDone?.(); render(); }
    else if (res.restored) { ui.toast(res.reason, { kind: 'good', icon: 'check' }); app.applyLoadout?.(); render(); }
    else if (res.pending) ui.toast(res.reason, { icon: 'hourglass', duration: 4200 });
    else if (res.busy) ui.toast(res.reason, { icon: 'hourglass' });
    else if (!res.cancelled) ui.toast(res.reason, { kind: 'bad' });
  };
  const realBtn = (product, onClick, label) => {
    const price = realPrice(product);
    // גרסת Google Play לפני חיבור Play Billing (או מוצר שלא הופעל בחנות): "בקרוב" במקום קנייה (בלי קופה מדומה)
    if (!economy.canBuyReal(product)) return h('button', { class: 'buy real soon tap', 'aria-disabled': 'true', 'aria-label': `${t('playSoonAria')} ${label}`, onclick: (e) => { e.stopPropagation(); ui.toast(t('playSoonBody'), { icon: 'info' }); } }, h('b', {}, t('playSoon')));
    const vis = economy.sandbox ? `${t('buyReal')} (${tn('בדיקה', 'test')})` : (price || t('buyReal'));
    // [a11y] WCAG 2.5.3: השם הנגיש מתחיל בטקסט הנראה (המחיר), ואחריו מה קונים
    const aria = vis === t('buyReal') ? `${t('buyReal')} ${label}` : `${vis} · ${t('buyReal')} ${label}`;
    return h('button', { class: 'buy real tap', 'aria-label': aria, onclick: (e) => { e.stopPropagation(); onClick(); } }, h('b', {}, vis));
  };

  /** סקין ללוח: לוח האי / חינמי (כל 20 איים) / בכסף אמיתי */
  function skinCard(sk) {
    const owned = economy.ownsSkin(sk.id);
    const equipped = economy.boardSkin === sk.id;
    const name = sk.id ? tn(sk.he, sk.en) : t('islandBoard');
    const key = sk.id || app.board.islandBoardKey || app.board.eraKey || 'stone';
    const [c1, c2] = sk.colors;
    const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;
    const box = h('div', { class: 'thumb', style: { background: `repeating-conic-gradient(${hex(c1)} 0 25%, ${hex(c2)} 0 50%) 0 0 / 50% 50%` } }, icon(sk.icon || 'checker', { size: 40, cls: 'ph' }));
    skinThumb(key, (url) => box.replaceChildren(h('img', { src: url, alt: '' })));
    let foot;
    if (equipped) foot = h('span', { class: 'state on' }, icon('check', { size: 16 }), t('equipped'));
    else if (owned) foot = h('button', { class: 'equip tap', onclick: (e) => { e.stopPropagation(); economy.equipSkin(sk.id); sound.pop?.(); } }, t('equip'));
    else if (sk.earn) foot = h('span', { class: 'earn' }, icon('lock', { size: 14 }), `${t('earnSkinAt').replace('{n}', sk.earn)} (${Math.min(sk.earn, app.progression.conqueredCount())}/${sk.earn})`);
    else foot = realBtn({ id: sk.product, price: sk.price }, () => realBuy((c) => economy.purchaseSkin(sk.id, c), () => economy.equipSkin(sk.id)), name);
    return h('div', { class: `card skin rar-${sk.product ? 'legendary' : sk.earn ? 'epic' : 'common'} ${equipped ? 'sel' : ''}`, role: 'group', 'aria-label': name },
      box, sk.product ? h('span', { class: 'region-tag' }, t('premiumTag')) : sk.earn ? h('span', { class: 'region-tag' }, `${sk.earn}`) : null,
      h('b', { class: 'nm' }, name), h('div', { class: 'card-foot' }, foot));
  }

  /** כרטיסי פרימיום: איי הפרימיום (חד-פעמי) ובוסט יהלומים כפולים לשבוע */
  function premiumCards() {
    const ownsIslands = economy.ownsFullGame();
    const islands = h('div', { class: 'card premium', role: 'group', 'aria-label': t('fullTitle') },
      h('div', { class: 'p-head' }, icon('castle', { size: 40 }), h('h3', {}, t('fullTitle'))),
      h('ul', {}, h('li', {}, t('premiumPoint1')), h('li', {}, t('premiumPoint2')), h('li', {}, t('premiumPoint3')), h('li', { class: 'bonus' }, t('dragonBonus'))),
      h('div', { class: 'p-foot' }, h('span', { class: 'p-note' }, t('noAdsNote')),
        ownsIslands ? h('span', { class: 'state on' }, icon('check', { size: 16 }), t('owned'))
          : realBtn(FULL_GAME, () => realBuy((c) => economy.purchaseFullGame(c), () => app.onPremiumUnlocked?.()), t('fullTitle'))));
    const left = economy.boostLeftMs();
    const days = Math.floor(left / 86400000), hrs = Math.floor((left % 86400000) / 3600000);
    const boost = h('div', { class: 'card premium', role: 'group', 'aria-label': t('boostTitle') },
      h('div', { class: 'p-head' }, icon('gem', { size: 40 }), h('h3', {}, t('boostTitle'))),
      h('p', { style: { margin: 0, fontSize: '13px' } }, t('boostBody')),
      left > 0 ? h('div', { class: 'state on' }, icon('hourglass', { size: 15 }), `${t('boostActive')} · ${t('boostLeft').replace('{t}', `${days}${t('daysShort')} ${hrs}${t('hShort')}`)}`) : null,
      h('div', { class: 'p-foot' }, h('span', { class: 'p-note' }, t('gemsX2')), realBtn(GEM_BOOST, () => realBuy((c) => economy.purchaseBoost(c), () => app.ui.setBoost?.(economy.boostLeftMs())), t('boostTitle'))));
    return [islands, boost];
  }

  /** תמונה בכרטיס: תלת-ממד (מרונדר ברקע ונשמר במטמון) או אייקון להילות */
  function thumb(kind, id) {
    const box = h('div', { class: 'thumb' });
    if (kind === 'item' && AURA_ICON[id]) { box.appendChild(icon(AURA_ICON[id], { size: 64 })); return box; }
    const key = kind === 'item' ? `item:${id}` : `pet:${id}`;
    const ready = app.thumbs.get(key);
    if (ready) box.appendChild(h('img', { src: ready, alt: '' }));
    else {
      box.appendChild(icon(kind === 'item' ? SLOT_ICON[slot] : 'paw', { size: 40, cls: 'ph' }));
      (kind === 'item' ? app.thumbs.item(id, 256) : app.thumbs.pet(id, 256)).then((url) => { if (url) box.replaceChildren(h('img', { src: url, alt: '' })); });
    }
    return box;
  }
  const buyBtn = (price, onBuy, label) => h('button', { class: 'buy tap', 'aria-label': `${t('buy')} ${label} ${formatGems(price)}`, onclick: (e) => { e.stopPropagation(); onBuy(); } }, icon('gem', { size: 18 }), h('b', {}, formatGems(price)));
  const regionTag = (r) => (r ? h('span', { class: 'region-tag' }, islandName(r)) : null);

  function itemCard(it) {
    const owned = economy.ownsItem(it.id);
    const equipped = economy.loadout[slot] === it.id;
    const r = RARITY[it.rarity];
    const trial = economy.trialLeft(it.id);
    const frag = economy.s.fragments[it.id];
    const name = shortName(it.id);
    let foot;
    if (equipped) foot = h('span', { class: 'state on' }, icon('check', { size: 16 }), t('equipped'));
    else if (owned) foot = h('button', { class: 'equip tap', onclick: (e) => { e.stopPropagation(); economy.equipItem(it.id); preview = { ...economy.loadout }; refreshPreview(); app.applyLoadout(); sound.pop(); if (it.price > 0) app.achievements.unlock('dresser'); } }, t('equip'));
    else foot = buyBtn(it.price, () => result(economy.buyItem(it.id)), name);
    return h('div', { class: `card rar-${it.rarity} ${preview[slot] === it.id ? 'sel' : ''}`, role: 'button', tabindex: '0', 'aria-label': `${name} — ${tn(r.label, r.labelEn)}`,
      onclick: () => { preview = { ...preview, [slot]: it.id }; refreshPreview(); focus(slot); sound.ui(); render(); },
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } } },
      thumb('item', it.id),
      h('span', { class: 'rar-dot', style: { background: r.color }, title: tn(r.label, r.labelEn) }),
      regionTag(it.island),
      trial ? h('span', { class: 'trial' }, icon('hourglass', { size: 12 }), `${Math.ceil(trial / 3600000)}${t('hours')}`) : null,
      frag ? h('span', { class: 'trial' }, icon('puzzle', { size: 12 }), `${frag}/3`) : null,
      h('b', { class: 'nm' }, name),
      h('div', { class: 'card-foot' }, foot));
  }

  /** שלב הגדילה של חיה שבבעלותך: גור / בוגר / אגדי ופס עד השלב הבא */
  function growChip(id) {
    const g = economy.petProgress(id);
    return h('div', { class: 'grow', title: t('petGrowNote') }, h('span', {}, t(`petStage${g.stage}`)), h('i', {}, h('b', { style: { width: `${Math.round(g.pct * 100)}%` } })));
  }

  function petCard(id, fk = 'pets') {
    const p = PETS[id];
    const owned = economy.ownsPet(id, maxEra);
    const equipped = economy.pet === id && !economy.petHue;
    const name = shortName(id);
    let foot;
    if (equipped) foot = h('span', { class: 'state on' }, icon('check', { size: 16 }), t('equipped'));
    else if (owned) foot = h('button', { class: 'equip tap', onclick: (e) => { e.stopPropagation(); economy.equipPet(id, maxEra); previewPet = id; refreshPreview(); app.applyLoadout(); } }, t('equip'));
    else if (p.exclusive) foot = h('button', { class: 'equip tap', onclick: (e) => { e.stopPropagation(); setTab('premium'); } }, icon('crown', { size: 15 }), t('fullTitle'));
    else if (p.premium) foot = buyBtn(p.price, () => result(economy.buyPet(id)), name);
    else foot = h('span', { class: 'state' }, icon('lock', { size: 14 }), `${t('era')} ${p.unlockEra}`);
    return h('div', { class: `card rar-${p.premium ? 'legendary' : 'common'} ${previewPet === id ? 'sel' : ''}`, role: 'button', tabindex: '0', 'aria-label': name,
      onclick: () => { previewBot = null; previewPet = id; previewHue = 0; refreshPreview(); focus(fk); sound.petVoice(p.voice); render(); },
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } } },
      thumb('pet', id),
      regionTag(p.island),
      h('b', { class: 'nm' }, name),
      owned ? growChip(id) : null,
      h('div', { class: 'card-foot' }, foot));
  }

  /** חיה מעופפת של קן השמיים: חינם על כל 10 איים שנכבשים, או אחת משלוש האגדיות בכסף אמיתי */
  function skyCard(id) {
    const p = PETS[id];
    const owned = economy.ownsPet(id, maxEra);
    const equipped = economy.pet === id && !economy.petHue;
    const name = shortName(id);
    const wear = () => { economy.equipPet(id, maxEra); previewPet = id; previewHue = 0; refreshPreview(); app.applyLoadout(); };
    let foot;
    if (equipped) foot = h('span', { class: 'state on' }, icon('check', { size: 16 }), t('equipped'));
    else if (owned) foot = h('button', { class: 'equip tap', onclick: (e) => { e.stopPropagation(); wear(); sound.pop?.(); } }, t('equip'));
    else if (p.earn) foot = h('span', { class: 'earn' }, icon('lock', { size: 14 }), `${t('earnSkinAt').replace('{n}', p.earn)} (${Math.min(p.earn, app.progression.conqueredCount())}/${p.earn})`);
    else foot = realBtn({ id: p.product, price: p.price }, () => realBuy((c) => economy.purchaseSkyPet(id, c), wear), name);
    return h('div', { class: `card rar-${p.product ? 'legendary' : 'epic'} ${previewPet === id ? 'sel' : ''}`, role: 'button', tabindex: '0', 'aria-label': name,
      onclick: () => { previewBot = null; previewPet = id; previewHue = 0; refreshPreview(); focus('sky'); sound.petVoice(p.voice); render(); },
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } } },
      thumb('pet', id),
      h('span', { class: 'region-tag' }, p.product ? t('premiumTag') : `${p.earn}`),
      h('b', { class: 'nm' }, name),
      owned ? growChip(id) : null,
      h('div', { class: 'card-foot' }, foot));
  }

  /** בוט שנכבש: קונים → גר באי המרכזי ואפשר להזמין אותו למשחק */
  function botCard(id) {
    const d = islandDef(id), b = d.bot;
    const owned = economy.ownsResident(id);
    const price = residentPrice(id);
    const name = tn(b.name.he, b.name.en);
    const box = h('div', { class: 'thumb portrait-thumb' });
    const ready = app.thumbs.get(`bot${id}`);
    if (ready) box.appendChild(h('img', { src: ready, alt: '' }));
    else { box.appendChild(icon('crown', { size: 40, cls: 'ph' })); app.thumbs.avatar(`bot${id}`, b.loadout, b.look, 220).then((url) => { if (url) box.replaceChildren(h('img', { src: url, alt: '' })); }); }
    const foot = owned
      ? h('button', { class: 'equip tap', onclick: (e) => { e.stopPropagation(); m.close(); app.playResident(id); } }, icon('swords', { size: 15 }), t('invitePlay'))
      : buyBtn(price, () => { const res = economy.buyResident(id, price); result(res); if (res.ok) { app.museum.setResidents?.(economy.s.residents); app.achievements.unlock('dresser'); } }, name);
    return h('div', { class: `card rar-${d.boss ? 'legendary' : 'rare'} ${previewBot === id ? 'sel' : ''}`, role: 'button', tabindex: '0', 'aria-label': name,
      onclick: () => { previewBot = id; refreshPreview(); focus('all'); sound.ui(); render(); },
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } } },
      box, owned ? h('span', { class: 'trial' }, icon('home', { size: 12 }), t('resident')) : null,
      h('span', { class: 'region-tag' }, tn(d.era.he, d.era.en)),
      h('b', { class: 'nm' }, name), h('div', { class: 'card-foot' }, foot));
  }

  /** הצבע הייחודי של חיית הבוט (כולל החיה עצמה) */
  function petColorCard(id) {
    const b = islandDef(id).bot;
    const hue = b.petHue;
    const owned = economy.ownsPetColor(b.pet, hue);
    const equipped = economy.pet === b.pet && Math.abs(economy.petHue - Math.round(hue * 100) / 100) < 0.005;
    const price = petColorPrice(id);
    const name = tn(`${shortName(b.pet)} של ${b.name.he}`, `${b.name.en}'s ${shortName(b.pet)}`);
    const box = h('div', { class: 'thumb' });
    const key = `pet:${b.pet}:${Math.round(hue * 100) / 100}`;
    const ready = app.thumbs.get(key);
    if (ready) box.appendChild(h('img', { src: ready, alt: '' }));
    else { box.appendChild(icon('paw', { size: 40, cls: 'ph' })); app.thumbs.pet(b.pet, 256, { hue }).then((url) => { if (url) box.replaceChildren(h('img', { src: url, alt: '' })); }); }
    let foot;
    if (equipped) foot = h('span', { class: 'state on' }, icon('check', { size: 16 }), t('equipped'));
    else if (owned) foot = h('button', { class: 'equip tap', onclick: (e) => { e.stopPropagation(); economy.equipPetColor(b.pet, hue); previewPet = b.pet; previewHue = economy.petHue; refreshPreview(); app.applyLoadout(); } }, t('equip'));
    else foot = buyBtn(price, () => result(economy.buyPetColor(b.pet, hue, price)), name);
    return h('div', { class: `card rar-epic ${previewPet === b.pet && Math.abs(previewHue - hue) < 0.01 ? 'sel' : ''}`, role: 'button', tabindex: '0', 'aria-label': name,
      onclick: () => { previewBot = null; previewPet = b.pet; previewHue = hue; refreshPreview(); focus('pets'); sound.ui(); render(); },
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } } },
      box, h('span', { class: 'region-tag' }, `${t('island')} ${id}`), h('b', { class: 'nm' }, name), h('div', { class: 'card-foot' }, foot));
  }

  focus(tabFocus(curTab));
  render();
  return m;
}
