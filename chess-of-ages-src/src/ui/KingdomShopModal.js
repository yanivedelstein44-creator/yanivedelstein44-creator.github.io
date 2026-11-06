/**
 * חנות הממלכה והאווטאר 💎 — מודל מסך מלא עם במת תצוגה תלת-ממדית חיה (סיבוב בגרירה)
 * ו-4 לשוניות: הלבשת אווטאר, חיות מחמד, עידנים חדשים, קניית יהלומים.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { h } from './UI.js';
import { t, tn, getLang, PET_EN, ITEM_EN } from './i18n.js';
import { WEARABLES, SLOT_LABELS, SLOT_LABELS_EN, RARITY, GEM_PACKS, ERA_PRICES, ECONOMY, formatPrice, formatGems, packBadges } from '../config/EconomyConfig.js';
import { PaymentProvider } from '../core/Economy.js';
import { PETS, PET_IDS } from '../config/Pets.js';
import { ERAS } from '../config/Eras.js';
import { PlayerAvatar3D } from '../scene/PlayerAvatar3D.js';
import { PetCompanion3D } from '../scene/PetCompanion3D.js';
import { FX } from '../scene/Particles.js';

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
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    this.camera.position.set(0, 2.1, 6.4);
    this.camera.lookAt(0, 1.0, 0);
    this.scene.add(new THREE.HemisphereLight(0xffeedd, 0x2a1a3a, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 5, 4); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xb08aff, 1.6); rim.position.set(-4, 3, -4); this.scene.add(rim);
    this.world = new THREE.Group();
    this.scene.add(this.world);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.2, 48), new THREE.MeshStandardMaterial({ color: 0x2a1f40, metalness: 0.6, roughness: 0.3 }));
    plat.position.y = -0.1;
    this.world.add(plat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.04, 8, 64), new THREE.MeshStandardMaterial({ color: 0xf2c94c, metalness: 1, roughness: 0.2, emissive: 0x6a4a10, emissiveIntensity: 0.5 }));
    ring.rotation.x = Math.PI / 2;
    this.world.add(ring);
    this.updaters = new Set();
    this.rotY = 0; this.vel = 0.25;
    this.time = 0;
    let dragging = false, lastX = 0;
    canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; this.rotY += dx * 0.012; this.vel = dx * 0.6; });
    canvas.addEventListener('pointerup', () => { dragging = false; });
    this.loop = this.loop.bind(this);
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.loop);
  }
  onUpdate(fn) { this.updaters.add(fn); return () => this.updaters.delete(fn); }
  addShake() {}
  loop(now) {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.time += dt;
    const w = this.canvas.clientWidth, hh = this.canvas.clientHeight;
    if (w && hh && (this.canvas.width !== Math.floor(w * this.renderer.getPixelRatio()))) { this.renderer.setSize(w, hh, false); this.camera.aspect = w / hh; this.camera.updateProjectionMatrix(); }
    this.vel *= 0.92; this.rotY += dt * 0.25 + this.vel * dt * 0.02;
    this.world.rotation.y = this.rotY;
    this.updaters.forEach((fn) => fn(dt, this.time));
    this.renderer.render(this.scene, this.camera);
  }
  dispose() { this.running = false; this.renderer.dispose(); try { this.renderer.forceContextLoss(); } catch { /* ok */ } }
}

const itemName = (it) => tn(it.name, ITEM_EN[it.id]);
const petName = (id) => tn(PETS[id].name, PET_EN[id]);
const packName = (pk) => tn(pk.name, pk.nameEn);
/** מחיר לתצוגה: מחיר רשמי מהחנות (Google Play Billing) אם הספק מחזיר אחד, אחרת מחיר הייחוס מהקונפיג */
const priceOf = (pk) => (typeof PaymentProvider.priceLabel === 'function' && PaymentProvider.priceLabel(pk)) || formatPrice(pk.price);

export function openKingdomShop(app, { tab = 'wardrobe' } = {}) {
  const { economy, ui, sound } = app;
  const maxEra = app.progression.maxEraReached();
  let preview = { ...economy.loadout };
  let previewPet = economy.pet;
  let curTab = tab;
  let slot = 'head';

  const canvas = h('canvas', { role: 'img', 'aria-label': t('previewLabel') });
  const stageBox = h('div', { class: 'shop-stage' }, canvas, h('div', { class: 'stage-hint', 'aria-hidden': 'true' }, t('dragRotate')));
  const gemsEl = h('b', {}, formatGems(economy.gems));
  const head = h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingInlineEnd: '40px' } },
    h('div', { class: 'logo small' }, h('span', { class: 'he' }, t('appTitle')), h('span', { class: 'en' }, t('logoEn'))),
    h('div', { style: { fontSize: '15px', fontWeight: 800 } }, t('shopTitle')),
    h('div', { class: 'gems-pill', style: { paddingInlineEnd: '10px' } }, '💎 ', gemsEl));
  const giftBanner = h('button', { class: 'banner-gift shimmer', onclick: () => app.openDaily() }, h('span', {}, t('dailyGift')), h('span', {}, economy.hasDailyBadge() ? '✨ !' : '›'));
  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  const sub = h('div', { class: 'subtabs' });
  const list = h('div', { class: 'shop-list', role: 'tabpanel' });
  const body = h('div', { class: 'shop' }, head, giftBanner, stageBox, tabs, sub, list);
  const m = ui.modal({ body, full: true, label: t('shopTitle'), onClose: () => { stage.dispose(); unsub(); app.applyLoadout(); } });

  // במת תצוגה
  const stage = new MiniStage(canvas);
  const miniFx = new FX(stage);
  const avatar = new PlayerAvatar3D(stage, miniFx);
  avatar.place(-0.9, 0.2, 0.35);
  avatar.setEraMaterials(app.currentEraMaterials());
  const pet = new PetCompanion3D(stage, miniFx, sound);
  pet.place(1.25, 0.3, -0.4);
  pet.setEraMaterials(app.currentEraMaterials());
  const refreshPreview = () => { avatar.setLoadout(preview); pet.setPet(previewPet); };
  refreshPreview();
  avatar.lookAt(new THREE.Vector3(0, 1.2, 6));
  pet.lookAt(new THREE.Vector3(0, 1.0, 6));

  const unsub = economy.onChange(() => { gemsEl.textContent = formatGems(economy.gems); renderList(); });

  const needGems = (res) => {
    if (res.ok) { sound.coin(); ui.toast(t('purchased'), { kind: 'good' }); return; }
    ui.toast(res.reason || t('notEnoughGems'), { kind: 'bad' });
    if (res.needGems) setTab('gems');
  };

  const TABS = [['wardrobe', t('tabWardrobe')], ['pets', t('tabPets')], ['eras', t('tabEras')], ['gems', t('tabGems')]];
  function setTab(id) { curTab = id; renderTabs(); renderList(); }
  function renderTabs() {
    tabs.replaceChildren(...TABS.map(([id, label]) => h('button', { role: 'tab', 'aria-selected': String(curTab === id), onclick: () => setTab(id) }, label)));
    sub.replaceChildren();
    sub.hidden = curTab !== 'wardrobe';
    if (curTab === 'wardrobe') {
      Object.keys(WEARABLES).forEach((s) => sub.appendChild(h('button', { 'aria-pressed': String(slot === s), onclick: () => { slot = s; renderTabs(); renderList(); } }, tn(SLOT_LABELS[s], SLOT_LABELS_EN[s]))));
    }
  }

  function trialBadge(id) {
    const ms = economy.trialLeft(id);
    return ms ? h('span', { class: 'rar', style: { color: '#7fd8ff' } }, ` ⏳ ${t('trialLeft')} ${Math.ceil(ms / 3600000)}${t('hours')}`) : null;
  }

  function renderList() {
    list.replaceChildren();
    if (curTab === 'wardrobe') {
      for (const it of WEARABLES[slot]) {
        const owned = economy.ownsItem(it.id);
        const equipped = economy.loadout[slot] === it.id;
        const r = RARITY[it.rarity];
        const acts = h('div', { class: 'acts' },
          h('button', { class: 'btn small', onclick: () => { preview = { ...preview, [slot]: it.id }; refreshPreview(); sound.ui(); } }, t('tryOn')),
          !owned ? h('button', { class: 'btn small primary', onclick: () => needGems(economy.buyItem(it.id)) }, `${t('buyFor')}${formatGems(it.price)} 💎`) : null,
          owned && !equipped ? h('button', { class: 'btn small', onclick: () => { economy.equipItem(it.id); preview = { ...economy.loadout }; refreshPreview(); app.applyLoadout(); sound.pop(); if (it.price > 0) app.achievements.unlock('dresser'); } }, t('equip')) : null,
          equipped ? h('button', { class: 'btn small', disabled: true }, `✓ ${t('equipped')}`) : null);
        list.appendChild(h('div', { class: `item ${preview[slot] === it.id ? 'sel' : ''}` },
          h('div', {}, h('b', {}, itemName(it)), h('span', { class: 'rar', style: { color: r.color } }, tn(r.label, r.labelEn)), trialBadge(it.id), economy.s.fragments[it.id] ? h('span', { class: 'rar' }, ` 🧩 ${economy.s.fragments[it.id]}/${ECONOMY.fragmentsToUnlock}`) : null),
          acts));
      }
    } else if (curTab === 'pets') {
      for (const id of PET_IDS) {
        const p = PETS[id];
        const owned = economy.ownsPet(id, maxEra);
        const equipped = economy.pet === id;
        const locked = !p.premium && !owned;
        const acts = h('div', { class: 'acts' },
          h('button', { class: 'btn small', onclick: () => { previewPet = id; refreshPreview(); sound.petVoice(p.voice); } }, t('tryOn')),
          p.premium && !economy.s.pets.includes(id) ? h('button', { class: 'btn small primary', onclick: () => needGems(economy.buyPet(id)) }, `${t('buyFor')}${formatGems(p.price)} 💎`) : null,
          owned && !equipped ? h('button', { class: 'btn small', onclick: () => { economy.equipPet(id, maxEra); previewPet = id; refreshPreview(); app.applyLoadout(); } }, t('equip')) : null,
          equipped ? h('button', { class: 'btn small', disabled: true }, `✓ ${t('equipped')}`) : null,
          locked ? h('button', { class: 'btn small', disabled: true }, `🔒 ${t('unlockAt')} ${p.unlockEra}`) : null);
        list.appendChild(h('div', { class: `item ${previewPet === id ? 'sel' : ''}` }, h('div', {}, h('b', {}, `${p.icon} ${petName(id)}`), h('span', { class: 'rar', style: { color: p.premium ? '#ffc94d' : '#b9b2a3' } }, p.premium ? tn('בלעדי', 'Exclusive') : tn('בסיסי', 'Base')), trialBadge(id), h('div', { style: { fontSize: '11px', color: 'var(--muted)' } }, tn(p.desc, p.descEn))), acts));
      }
    } else if (curTab === 'eras') {
      const missing = ERAS.filter((e) => e.premium && !economy.ownsEra(e.id));
      if (missing.length) {
        list.appendChild(h('div', { class: 'pack' }, h('div', { class: 'gem-ic' }, '🏯'), h('div', {}, h('b', {}, t('bundle')), h('div', { style: { fontSize: '11px', color: 'var(--muted)' } }, ERAS.filter((e) => e.premium).map((e) => tn(e.name, e.en)).join(' · '))),
          h('button', { class: 'btn primary small', onclick: () => needGems(economy.buyEraBundle()) }, `${formatGems(ERA_PRICES.bundle)} 💎`)));
      }
      for (const e of ERAS.filter((x) => x.premium)) {
        const owned = economy.ownsEra(e.id);
        const p = e.palette;
        const sw = h('div', { class: 'sw', style: { width: '52px', height: '52px', borderRadius: '12px', background: `linear-gradient(180deg, #${p.skyTop.toString(16).padStart(6, '0')}, #${p.skyMid.toString(16).padStart(6, '0')} 55%, #${p.skyHorizon.toString(16).padStart(6, '0')})` } });
        list.appendChild(h('div', { class: 'item', style: { gridTemplateColumns: '52px 1fr auto' } }, sw,
          h('div', {}, h('b', {}, `${t('era')} ${e.id}: ${tn(e.name, e.en)}`), h('div', { style: { fontSize: '11px', color: 'var(--muted)' } }, `${tn(e.stageNames.join(' · '), e.stageNamesEn.join(' · '))} — ${tn(e.materials, e.materialsEn)}`)),
          owned ? h('button', { class: 'btn small', disabled: !app.progression.baseComplete(), onclick: () => { m.close(); app.visitEra(e.id); } }, app.progression.baseComplete() ? t('visit') : `✓ ${t('owned')}`)
            : h('button', { class: 'btn small primary', onclick: () => needGems(economy.buyEra(e.id)) }, `${formatGems(ERA_PRICES.single)} 💎`)));
      }
    } else if (curTab === 'gems') {
      const sandboxSw = h('button', { class: 'switch', role: 'switch', 'aria-checked': String(economy.sandbox), 'aria-label': t('sandbox'), onclick: () => { economy.setSandbox(!economy.sandbox); } });
      list.appendChild(h('div', { class: 'toggle' }, h('span', {}, `🧪 ${t('sandbox')}`), sandboxSw));
      const badges = packBadges();
      for (const pk of GEM_PACKS) {
        const b = badges[pk.id];
        const tag = b.best ? `⭐ ${t('bestValue')}` : b.bonusPct > 0 ? `‎+${b.bonusPct}% ${t('bonus')}` : '';
        list.appendChild(h('div', { class: 'pack' }, h('div', { class: 'gem-ic', 'aria-hidden': 'true' }, pk.gems >= 5000 ? '👑' : pk.gems >= 2000 ? '🏆' : pk.gems >= 750 ? '🧰' : '💎'),
          h('div', {}, h('b', {}, packName(pk)), tag ? h('span', { class: 'tag' }, tag) : null, h('div', { style: { fontSize: '13px', color: 'var(--gold-2)', direction: 'ltr', textAlign: getLang() === 'en' ? 'left' : 'right' } }, `${formatGems(pk.gems)} 💎`)),
          h('button', { class: 'btn primary small', 'aria-label': `${packName(pk)}: ${formatGems(pk.gems)} 💎 — ${priceOf(pk)}`, onclick: () => buyPack(pk.id) }, priceOf(pk))));
      }
      if (economy.sandbox) list.appendChild(h('button', { class: 'btn', onclick: () => { economy.addGems(ECONOMY.devFreeGems, 'dev'); sound.coin(); } }, t('devGems')));
      list.appendChild(h('p', { style: { fontSize: '11px' } }, economy.sandbox ? `${t('sandboxNote')} ${t('pricesNote')}` : tn('רכישות מתבצעות דרך חנות האפליקציות.', 'Purchases are processed by the app store.')));
    }
  }

  async function buyPack(id) {
    const res = await economy.purchaseGemPack(id, (pack) => new Promise((resolve) => {
      let ok = false;
      ui.modal({
        title: t('sandboxCheckout'), center: true,
        body: h('div', {}, h('p', {}, `${packName(pack)} — ${formatGems(pack.gems)} 💎`), h('p', { style: { fontSize: '22px', color: 'var(--gold-2)', fontWeight: 800 } }, priceOf(pack)), h('p', {}, `🧪 ${t('sandboxNote')}`)),
        actions: [{ label: t('cancel'), onClick: (c) => c.close() }, { label: t('confirmPurchase'), primary: true, onClick: (c) => { ok = true; c.close(); } }],
        onClose: () => resolve(ok),
      });
    }));
    if (res.ok) { sound.jackpot(); ui.toast(`‎+${formatGems(res.gems)} 💎`, { kind: 'gold' }); }
    else if (!res.cancelled) ui.toast(res.reason, { kind: 'bad' });
  }

  renderTabs();
  renderList();
  return m;
}
