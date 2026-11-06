/**
 * GameApp — מחבר את כל המערכות: סצנה, לוח, ממלכה, חיות ואווטארים, AI, רשת, סאונד, כלכלה, UI ועדכונים.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { Chess } from 'chess.js';
import { ProgressStore, wipeAllLocalData } from '../core/Storage.js';
import { Economy } from '../core/Economy.js';
import { Achievements } from '../core/Achievements.js';
import { Progression } from '../game/Progression.js';
import { GameController, PIECE_VALUE, GLYPH } from '../game/GameController.js';
import { ChessAI, classifyMove, moveAccuracy, clampCp } from '../engine/ChessAI.js';
import { SceneManager } from '../scene/SceneManager.js';
import { FX } from '../scene/Particles.js';
import { ChessBoard3D, squareToXZ, BOARD_TOP } from '../scene/ChessBoard3D.js';
import { Shockwave, screenFlash } from '../scene/Effects.js';
import { KingdomBuilder } from '../scene/KingdomBuilder.js';
import { ArenaLife } from '../scene/ArenaLife.js';
import { PetCompanion3D } from '../scene/PetCompanion3D.js';
import { PlayerAvatar3D } from '../scene/PlayerAvatar3D.js';
import { eraMaterials } from '../scene/Materials.js';
import { detectSeason, buildSeason } from '../scene/SeasonalEvents.js';
import { SoundEngine } from '../audio/SoundEngine.js';
import { MultiplayerManager } from '../network/MultiplayerManager.js';
import { BotOpponent, createBotProfile } from '../network/BotOpponent.js';
import { UI, h } from '../ui/UI.js';
import { t, tn, setLang, getLang, deviceLang, DIFF_PERSONA, PET_EN } from '../ui/i18n.js';
import * as M from '../ui/Modals.js';
import { openKingdomShop } from '../ui/KingdomShopModal.js';
import { openDailyRewards } from '../ui/DailyRewardsModal.js';
import { shareKingdom } from '../ui/ShareCard.js';
import { Tutorial } from '../ui/Tutorial.js';
import { Updater } from '../update/Updater.js';
import { ERAS, getEra } from '../config/Eras.js';
import { PETS } from '../config/Pets.js';
import { ECONOMY } from '../config/EconomyConfig.js';
import { TIME_CONTROLS, RULES, APP_VERSION } from '../config/AppConfig.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HINT_COST = 30;

export class GameApp {
  constructor() {
    this.store = new ProgressStore();
    this.economy = new Economy();
    this.progression = new Progression(this.store, this.economy);
    this.achievements = new Achievements(this.store, this.economy);
    setLang(this.store.get('settings').lang || deviceLang());
    const s = this.store.get('settings');
    this.sound = new SoundEngine({ sfx: s.sfx, ambience: s.ambience });
    this.root = document.getElementById('app');
    this.ui = new UI(this.root, this.handlers());
    this.sm = new SceneManager(document.getElementById('scene'), {
      getSafeArea: () => ({ top: this.ui.hud?.offsetHeight || 150, bottom: (this.ui.dock?.offsetHeight || 70) + 6 }),
    });
    this.fx = new FX(this.sm);
    this.board = new ChessBoard3D(this.sm, this.fx);
    this.shock = new Shockwave(this.sm, this.fx);
    this.kingdom = new KingdomBuilder(this.sm, this.fx, this.board, this.shock);
    // חיים ברקע: דמויות, כלי טיס, אפקטים וצלילי אווירה לפי העידן המוצג
    this.life = new ArenaLife(this.sm, this.fx, this.sound);
    this.kingdom.onEraReady = (eraId, built) => this.life.setEra(eraId, built, this.kingdom);
    this.kingdom.onEraLeave = () => this.life.leave();
    this.pets = { w: new PetCompanion3D(this.sm, this.fx, this.sound), b: new PetCompanion3D(this.sm, this.fx, this.sound) };
    this.avatars = { w: new PlayerAvatar3D(this.sm, this.fx), b: new PlayerAvatar3D(this.sm, this.fx) };
    this.ai = new ChessAI();
    this.game = new GameController();
    this.net = new MultiplayerManager();
    this.tutorial = new Tutorial(this);
    this.updater = new Updater({
      isSafe: () => this.isSafe() && !this.ui.modals.length,
      onAvailable: (info, act) => this.showUpdateAvailable(info, act),
      onUpdating: (v) => this.ui.toast(`✨ ${t('update')} ${v ? `(v${v})` : ''}`, { kind: 'gold', duration: 3000 }),
      onNativeRequired: (info) => this.ui.modal({
        title: `📲 ${t('updateNative')}`, center: true,
        body: `${t('updateNativeBody')}${info.version ? ` (v${info.version})` : ''}`,
        actions: [{ label: t('later'), onClick: (c) => c.close() }, { label: `⬇️ ${t('download')}`, primary: true, onClick: () => { if (info.apk) location.href = info.apk; } }],
      }),
    });
    this.mode = 'ai';
    this.myColor = 'w';
    this.busy = false;
    this.selected = null;
    this.cursor = 'e2';
    this.opponent = null;
    this.hostView = null;
    this.lastEmote = 0;
    this.reviewQueue = Promise.resolve();
  }

  eraDef(id) { return getEra(id); }
  currentEraMaterials() { return eraMaterials(getEra(this.kingdom.eraId || 1).key); }

  handlers() {
    return {
      onCenter: () => { this.sound.ui(); if (this.sm.panoramaOn) { this.sm.panoramaOn = false; this.ui.setPanorama(false); } this.sm.toGameplay(1.0, this.viewSide()); },
      onShop: () => { this.sound.ui(); this.openShop(); },
      onModes: () => { this.sound.ui(); M.openModes(this); },
      onBuild: () => { this.sound.ui(); this.buildNextStage({ demo: true }); },
      onSfx: () => { const v = !this.store.get('settings').sfx; this.store.setSetting('sfx', v); this.sound.setSfx(v); this.ui.setAudio(v, this.store.get('settings').ambience); },
      onAmb: () => { const v = !this.store.get('settings').ambience; this.store.setSetting('ambience', v); this.sound.setAmbience(v); this.ui.setAudio(this.store.get('settings').sfx, v); },
      onEraTour: () => { this.sound.ui(); if (this.isOnlineMode() || this.busy) { this.ui.toast(t('locked')); return; } M.openEraTour(this); },
      onPanorama: () => { const on = !this.sm.panoramaOn; this.ui.setPanorama(on); this.sm.setPanorama(on); },
      onGemsPlus: () => { this.sound.ui(); this.openShop('gems'); },
      onHint: () => this.hint(),
      onEmote: (e) => this.sendEmote(e),
      onDraw: () => this.offerDraw(),
      onResign: () => this.resign(),
      onShare: () => this.shareKingdom(),
      onSettings: () => { this.sound.ui(); M.openSettings(this); },
      onMuteAll: () => {
        const st = this.store.get('settings'); const on = !(st.sfx || st.ambience);
        this.store.setSetting('sfx', on); this.store.setSetting('ambience', on);
        this.sound.setSfx(on); this.sound.setAmbience(on); this.ui.setAudio(on, on);
        if (on) this.sound.ui();
      },
      onAchievements: () => { this.sound.ui(); M.openAchievements(this); },
    };
  }

  // ======================= אתחול =======================
  async start() {
    this.applyQuality();
    const s = this.store.get('settings');
    this.ui.setAudio(s.sfx, s.ambience);
    this.ui.setGems(this.economy.gems, false);
    this.economy.onChange((evt) => { if (evt.type === 'gems' || evt.type === 'buy' || evt.type === 'daily') this.ui.setGems(this.economy.gems); this.refreshBadges(); });
    this.achievements.onUnlock((a) => { this.ui.toast(`${a.icon} ${t('achievementUnlocked')} ${tn(a.he, a.en)} · +${a.gems}💎`, { kind: 'gold', duration: 3800 }); this.sound.notify(); });

    const era = this.progression.displayEra();
    this.kingdom.show(era, this.progression.progressOf(era));
    this.sound.setEra(era);
    this.placeStations();

    const saved = this.store.get('savedGame');
    if (saved && (saved.mode === 'ai' || saved.mode === 'local') && Array.isArray(saved.uci)) {
      this.mode = saved.mode;
      this.myColor = 'w';
      this.game.loadUci(saved.uci);
      if (saved.tc) { const tc = TIME_CONTROLS.find((x) => x.id === saved.tc); if (tc) this.game.startClock(tc.ms, tc.inc); }
      this.setupOpponentForMode();
      this.board.setPosition(this.game.board);
      const lm = this.game.lastMove();
      if (lm) this.board.setLastMove(lm.from, lm.to);
    } else {
      this.mode = 'ai';
      this.game.reset();
      this.setupOpponentForMode();
      this.board.setPosition(this.game.board);
    }
    this.sm.initView(this.viewSide());
    this.bindInput();
    this.refreshHud();
    this.ui.setActions(this.mode);
    this.setupSeason();
    this.startClockLoop();
    requestAnimationFrame(() => requestAnimationFrame(() => this.hideSplash()));
    this.updater.init();
    if (!this.economy.s.welcomed) { this.economy.s.welcomed = true; this.economy.save(); setTimeout(() => this.ui.toast(`🎁 ${tn(`קיבלת ${ECONOMY.welcomeGems} 💎 מתנת פתיחה!`, `You got ${ECONOMY.welcomeGems} 💎 as a welcome gift!`)}`, { kind: 'gold', duration: 4000 }), 1600); }
    const room = new URLSearchParams(location.search).get('room');
    if (room && /^\d{4}$/.test(room)) {
      history.replaceState(null, '', location.pathname);
      setTimeout(() => this.joinRoom(room), 900);
    } else if (!this.store.get('seenTutorial')) {
      setTimeout(() => this.startTutorial(), 1400);
    } else if (this.economy.hasDailyBadge()) {
      setTimeout(() => this.ui.toast(`🎁 ${t('dailyGift')}`, { kind: 'gold' }), 2400);
    }
    if (this.isAITurn()) setTimeout(() => this.opponentMove(), 800);
    window.__chessOfAges = this;
    window.__gsap = gsap;
    window.__appVersion = APP_VERSION;
  }

  /** "יש עדכון חדש!" — עדכן עכשיו / אחר כך */
  showUpdateAvailable(info, act) {
    this.sound.notify?.();
    const notes = String(info.notes || '').trim();
    const body = h('div', {},
      h('p', { style: { fontSize: '15px' } }, `${t('updateAvailableBody')}${info.version ? ` · v${info.version}` : ''}`),
      notes ? h('p', { style: { textAlign: 'start', fontSize: '13px', color: 'var(--muted)' } }, `${t('whatsNew')}: ${notes}`) : null,
      h('p', { style: { fontSize: '12px', color: 'var(--muted)' } }, t('updateLaterNote')));
    this.ui.modal({
      title: `🎉 ${t('updateAvailable')}`, center: true, body,
      actions: [
        { label: t('later'), onClick: (c) => { c.close(); act.later(); } },
        { label: `✨ ${t('updateNow')}`, primary: true, onClick: (c) => { c.close(); act.now(); } },
      ],
    });
  }

  hideSplash() {
    const sp = document.getElementById('splash');
    if (!sp) return;
    sp.classList.add('hide');
    setTimeout(() => sp.remove(), 700);
  }

  applyQuality() {
    const q = this.store.get('settings').quality || 'auto';
    this.sm.quality.mode = q;
    if (q === 'auto') { this.sm.quality.checked = false; this.sm.setQuality('high'); } else this.sm.setQuality(q === 'low' ? 'low' : 'high');
  }

  setLanguage(l) {
    setLang(l);
    // שם ברירת המחדל ("מלך 123" / "King 123") מתחלף יחד עם השפה
    const prof = this.store.get('profile');
    const mm = /^(מלך|King) (\d{3})$/.exec(prof.name || '');
    if (mm) this.store.set({ profile: { ...prof, name: `${t('defaultName')} ${mm[2]}` } });
    this.ui.render();
    this.ui.setAudio(this.store.get('settings').sfx, this.store.get('settings').ambience);
    this.ui.setGems(this.economy.gems, false);
    this.ui.setActions(this.mode);
    this.refreshHud();
  }

  setupSeason() {
    const season = detectSeason();
    if (!season) return;
    this.season = buildSeason(season, this.sm, this.fx);
    if (this.season) {
      this.sm.world.add(this.season.group);
      this.sm.onUpdate((dt, tt) => this.season.update(dt, tt));
      setTimeout(() => this.ui.toast(tn(season.he, season.en), { kind: 'gold', duration: 4200 }), 2000);
    }
  }

  // ======================= עמדות שחקנים =======================
  placeStations() {
    // העמדות צמודות יותר ללוח, כדי שהלוח יוכל להיות גדול יותר במסך
    this.avatars.w.place(-3.0, 6.4, 2.05);
    this.pets.w.place(3.0, 6.3, -2.0);
    this.avatars.b.place(3.0, -6.5, -0.34);
    this.pets.b.place(-3.0, -6.4, 0.38);
    Object.values(this.avatars).forEach((a) => a.group.scale.setScalar(1.3));
    Object.values(this.pets).forEach((p) => p.group.scale.setScalar(1.25));
    this.applyStationMaterials();
    this.applyLoadout();
  }

  applyStationMaterials() {
    const mats = this.currentEraMaterials();
    Object.values(this.avatars).forEach((a) => a.setEraMaterials(mats));
    Object.values(this.pets).forEach((p) => p.setEraMaterials(mats));
  }

  /** הלבשת האווטאר והחיה של השחקן המקומי (ושל היריב) */
  applyLoadout() {
    this.economy.expireTrials();
    const myLoad = this.economy.loadout, myPet = this.economy.pet;
    if (this.mode === 'local') {
      this.avatars.w.setLoadout(myLoad); this.pets.w.setPet(myPet);
      const e = getEra(this.kingdom.eraId).opponent;
      this.avatars.b.setLoadout(e); this.pets.b.setPet(e.pet);
    } else {
      const me = this.myColor, op = me === 'w' ? 'b' : 'w';
      this.avatars[me].setLoadout(myLoad); this.pets[me].setPet(myPet);
      const o = this.opponent || {};
      this.avatars[op].setLoadout(o.loadout || getEra(this.kingdom.eraId).opponent);
      this.pets[op].setPet(o.pet || getEra(this.kingdom.eraId).opponent.pet);
    }
    this.refreshHud();
  }

  setupOpponentForMode() {
    if (this.mode === 'ai') {
      const d = this.store.get('difficulty') || 'easy';
      const ep = getEra(this.kingdom.eraId).opponent;
      this.opponent = { name: tn(DIFF_PERSONA[d].he, DIFF_PERSONA[d].en), avatar: DIFF_PERSONA[d].icon, pet: ep.pet, loadout: ep, rating: { easy: 800, medium: 1300, hard: 1800 }[d], isAI: true };
    } else if (this.mode === 'local') {
      this.opponent = { name: tn('שחקן 2', 'Player 2'), avatar: '♚', pet: getEra(this.kingdom.eraId).opponent.pet, loadout: getEra(this.kingdom.eraId).opponent };
    }
  }

  // ======================= HUD =======================
  refreshHud() {
    if (!this.ui) return;
    const eraId = this.kingdom.eraId || this.progression.displayEra();
    const era = getEra(eraId);
    const next = this.progression.nextStage();
    this.ui.setEra({
      eraId, eraName: tn(era.name, era.en), premium: era.premium,
      stageNum: this.progression.displayStageNumber(eraId) || (eraId - 1) * 2,
      progress: this.store.get('eraProgress'),
      next: next ? { eraId: next.eraId, idx: next.idx, name: tn(getEra(next.eraId).stageNames[next.idx], getEra(next.eraId).stageNamesEn[next.idx]) } : null,
      lock: this.progression.lockReason(),
    });
    const prof = this.store.get('profile');
    const cap = this.game.captured();
    const turn = this.game.turn;
    const check = this.game.inCheck() && !this.game.result;
    const capStr = (color) => cap.by[color].map((p) => GLYPH[color === 'w' ? 'b' : 'w'][p]).join('');
    const advFor = (color) => { const m = color === 'w' ? cap.material : -cap.material; return m > 0 ? m : 0; };
    const me = this.mode === 'local' ? 'w' : this.myColor;
    const op = me === 'w' ? 'b' : 'w';
    const o = this.opponent || {};
    const petIcon = (id) => PETS[id]?.icon || '';
    let status = '';
    if (this.game.result) status = this.resultText().title;
    else if (check) status = `⚠️ ${t('check')}`;
    else if (this.thinking) status = this.mode === 'ai' ? tn(getEra(eraId).thinking, getEra(eraId).thinkingEn) : t('thinking');
    else if (this.mode === 'local') status = t('yourTurn');
    else if (turn === this.myColor) status = `♟ ${t('yourTurn')}`;
    else status = this.isOnlineMode() ? t('waiting') : t('thinking');
    this.ui.setPlayer('me', {
      name: this.mode === 'local' ? tn('שחקן 1', 'Player 1') : prof.name, avatar: prof.avatar, petIcon: petIcon(this.economy.pet),
      sub: `${me === 'w' ? t('white') : t('black')} · ${this.store.get('rating')}`, captured: capStr(me), adv: advFor(me),
      active: turn === me && !this.game.result, check: check && turn === me, status,
    });
    this.ui.setPlayer('opp', {
      name: o.name || '', avatar: o.avatar || '♚', petIcon: petIcon(o.pet), isBot: !!o.isBot,
      sub: `${op === 'w' ? t('white') : t('black')}${o.rating ? ` · ${o.rating}` : ''}`, captured: capStr(op), adv: advFor(op),
      active: turn === op && !this.game.result, check: check && turn === op, status,
    });
    const showClock = !!this.game.clock;
    this.ui.setClock('me', this.game.clockLeft(me), showClock);
    this.ui.setClock('opp', this.game.clockLeft(op), showClock);
    this.ui.setStatus(status, check);
    this.ui.setEraTourEnabled(this.progression.visitableEras().length > 1);
    this.refreshBadges();
  }

  refreshBadges() { this.ui?.setShopBadge(this.economy.hasDailyBadge()); }

  startClockLoop() {
    setInterval(() => {
      if (!this.game.clock) return;
      const me = this.mode === 'local' ? 'w' : this.myColor;
      const op = me === 'w' ? 'b' : 'w';
      this.ui.setClock('me', this.game.clockLeft(me), true);
      this.ui.setClock('opp', this.game.clockLeft(op), true);
      const flag = this.game.tickClock();
      if (flag) {
        if (this.isOnlineMode() && flag !== this.myColor && this.mode === 'friend') return; // היריב ידווח על עצמו
        this.net.send({ t: 'flag', color: flag });
        this.endGame(this.game.finish(flag === 'w' ? 'b' : 'w', 'timeout'));
      }
      const low = this.game.clockLeft(this.game.turn);
      if (low !== null) this.updateTension(low < 20000 ? 0.3 : 0);
    }, 200);
  }

  updateTension(extra = 0) {
    const cap = this.game.captured();
    const ten = 0.15 + (this.game.inCheck() ? 0.45 : 0) + Math.min(0.3, Math.abs(cap.material) / 25) + extra + (this.game.ply > 60 ? 0.1 : 0);
    this.sound.setTension(ten);
  }

  // ======================= קלט =======================
  bindInput() {
    const canvas = this.sm.canvas;
    let start = null;
    let pointers = 0;
    this.root.addEventListener('pointerdown', (e) => {
      if (e.target !== canvas) return;
      pointers++;
      if (pointers === 1) {
        const onBoard = this.board.hitsBoard(e.clientX, e.clientY);
        this.sm.controls.enableRotate = !onBoard;
        start = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId };
      } else start = null;
    }, { capture: true });
    const end = (e) => {
      if (e.target !== canvas && !start) { pointers = Math.max(0, pointers - 1); return; }
      pointers = Math.max(0, pointers - 1);
      if (pointers === 0) this.sm.controls.enableRotate = true;
      if (!start || e.pointerId !== start.id) return;
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      const dur = e.timeStamp - start.t;
      start = null;
      if (e.type === 'pointerup' && moved < 14 && dur < 650) this.onTap(e.clientX, e.clientY);
    };
    this.root.addEventListener('pointerup', end, { capture: true });
    this.root.addEventListener('pointercancel', end, { capture: true });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => { if (!(e.target instanceof HTMLInputElement)) e.preventDefault(); });
    canvas.addEventListener('keydown', (e) => this.onKey(e));
    canvas.addEventListener('focus', () => { this.board.setCursor(this.cursor); this.ui.announce(t('keyboardHelp')); });
    canvas.addEventListener('blur', () => this.board.setCursor(null));
  }

  onKey(e) {
    const files = 'abcdefgh';
    let f = files.indexOf(this.cursor[0]), r = parseInt(this.cursor[1], 10) - 1;
    const flip = this.viewSide() === 'b' ? -1 : 1;
    const rtl = getLang() === 'he' ? 1 : 1;
    let handled = true;
    switch (e.key) {
      case 'ArrowUp': r += flip; break;
      case 'ArrowDown': r -= flip; break;
      case 'ArrowLeft': f -= flip * rtl; break;
      case 'ArrowRight': f += flip * rtl; break;
      case 'Enter': case ' ': this.onSquare(this.cursor); break;
      case 'Escape': this.deselect(); break;
      default: handled = false;
    }
    if (!handled) return;
    e.preventDefault();
    f = Math.max(0, Math.min(7, f)); r = Math.max(0, Math.min(7, r));
    this.cursor = files[f] + (r + 1);
    this.board.setCursor(this.cursor);
    const p = this.game.pieceAt(this.cursor);
    const names = { p: t('knight') && tn('רגלי', 'pawn'), n: t('knight'), b: t('bishop'), r: t('rook'), q: t('queen'), k: tn('מלך', 'king') };
    this.ui.announce(`${this.cursor}${p ? ` — ${p.color === 'w' ? t('white') : t('black')} ${names[p.type]}` : ''}`);
  }

  onTap(x, y) {
    let prefer = null;
    if (this.canAct()) {
      if (this.selected) prefer = new Set(this.game.legalFrom(this.selected).map((m) => m.to));
      else prefer = new Set(this.game.chess.moves({ verbose: true }).map((m) => m.from));
    }
    const sq = this.board.pickSquare(x, y, prefer);
    if (!sq) { if (this.selected) this.deselect(); return; }
    this.onSquare(sq);
  }

  canAct() {
    if (this.busy || this.game.result || this.ui.modalOpen) return false;
    if (this.mode === 'local') return true;
    return this.game.turn === this.myColor;
  }

  onSquare(sq) {
    if (!this.canAct()) { if (!this.busy && !this.ui.modalOpen && !this.game.result) this.sound.illegal(); return; }
    const piece = this.game.pieceAt(sq);
    const turn = this.game.turn;
    if (this.selected) {
      const moves = this.game.legalFrom(this.selected);
      const mv = moves.find((m) => m.to === sq);
      if (mv) { this.playerMove(mv); return; }
      if (piece && piece.color === turn) { this.select(sq); return; }
      this.sound.illegal();
      this.board.shakeSelected();
      this.deselect();
      return;
    }
    if (piece && piece.color === turn) this.select(sq);
    else this.sound.illegal();
  }

  select(sq) {
    const moves = this.game.legalFrom(sq);
    if (!moves.length) { this.sound.illegal(); return; }
    this.selected = sq;
    this.board.select(sq, moves);
    this.sound.pickup(this.panOf(sq));
    const w = this.board.squareWorld(sq);
    Object.values(this.pets).forEach((p) => p.lookAt(w));
    Object.values(this.avatars).forEach((a) => a.lookAt(w));
    this.tutorial.onSelect();
  }

  deselect() { this.selected = null; this.board.clearSelection(); }

  panOf(sq) {
    const [x] = squareToXZ(sq);
    return (this.viewSide() === 'w' ? x : -x) / 5;
  }

  viewSide() { return this.mode === 'local' ? this.game.turn : this.myColor; }

  isOnlineMode() { return (this.mode === 'friend' || this.mode === 'quick') && !this.bot; }
  isAITurn() { return !this.game.result && ((this.mode === 'ai' && this.game.turn !== this.myColor) || (this.mode === 'quick' && this.bot && this.game.turn !== this.myColor)); }

  isSafe() {
    if (this.busy || this.thinking) return false;
    if (this.net.connected || (this.mode === 'quick' && !this.game.result)) return false;
    return true;
  }

  // ======================= מהלכים =======================
  async playerMove(mv) {
    let promotion;
    if (mv.flags.includes('p')) {
      this.busy = true;
      promotion = await M.openPromotion(this, mv.color);
      this.busy = false;
    }
    this.deselect();
    await this.applyMove({ from: mv.from, to: mv.to, promotion }, { local: true });
    this.tutorial.onMove();
  }

  async applyMove(m, { local = false, remote = false } = {}) {
    const before = this.game.fen;
    const histBefore = this.game.beforeFens();
    const mv = this.game.move(m);
    if (!mv) { if (remote) this.resyncBoard(); return null; }
    this.busy = true;
    this.board.clearHint();
    if (local && this.isOnlineMode()) {
      this.net.send({ t: 'move', uci: mv.lan, ply: this.game.ply, clock: this.game.clock ? { w: this.game.clockLeft('w'), b: this.game.clockLeft('b') } : null });
    }
    const mover = mv.color, victim = mover === 'w' ? 'b' : 'w';
    const pan = this.panOf(mv.to);
    const target = this.board.squareWorld(mv.to);
    Object.values(this.pets).forEach((p) => p.lookAt(target));
    Object.values(this.avatars).forEach((a) => a.lookAt(target));
    this.avatars[mover].command();
    if (!local) this.sound.pickup(pan);
    await this.board.animateMove(mv, {
      onCapture: () => {
        this.sound.capture(pan);
        this.life.react('capture');
        this.pets[mover].react('capture');
        this.pets[victim].react('lost');
        if (this.isLocalHuman(mover)) this.achievements.count('captures');
        if (this.bot && mover === this.myColor && Math.random() < 0.5) this.botEmote('lostPiece');
      },
      onLand: (cap) => { if (!cap) this.sound.move(pan); },
    });
    this.board.setLastMove(mv.from, mv.to);
    if (mv.promotion) { this.sound.promotion(pan); if (this.isLocalHuman(mover)) this.achievements.unlock('promote'); }
    if (this.game.inCheck()) {
      const ks = this.game.kingSquare(this.game.turn);
      this.board.setCheck(ks);
      this.sound.check(pan);
      this.life.react('check');
      this.sm.addShake(0.22);
      this.pets[mover].react('checkAttack');
      this.pets[victim].react('checkDefend');
      this.avatars[mover].check();
      this.ui.announce(t('check'));
    } else this.board.setCheck(null);
    this.saveGame();
    this.queueReview(before, histBefore, mv);
    this.updateTension();
    this.refreshHud();
    if (this.game.result) {
      this.busy = false;
      await this.endGame(this.game.result);
      return mv;
    }
    if (this.mode === 'local') await this.sm.flipTo(this.game.turn);
    this.busy = false;
    this.refreshHud();
    if (this.isAITurn()) this.opponentMove();
    return mv;
  }

  isLocalHuman(color) { return this.mode === 'local' || color === this.myColor; }

  resyncBoard() {
    this.board.setPosition(this.game.board);
    const lm = this.game.lastMove();
    this.board.setLastMove(lm?.from, lm?.to);
  }

  async opponentMove() {
    if (!this.isAITurn() || this.thinking) return;
    this.thinking = true;
    this.refreshHud();
    const t0 = performance.now();
    let res;
    try {
      if (this.bot) res = await this.bot.play(this.game);
      else {
        const hist = this.game.history();
        res = await this.ai.think({ fen: this.game.fen, history: hist.map((h) => h.before), uci: hist.map((h) => h.lan), level: this.store.get('difficulty') || 'easy' });
      }
    } catch { res = null; }
    const wait = Math.max(0, 450 - (performance.now() - t0));
    await sleep(wait);
    this.thinking = false;
    if (this.game.result || !this.isAITurn()) { this.refreshHud(); return; }
    let move = res?.move;
    const legal = this.game.chess.moves({ verbose: true });
    if (!move || !legal.some((m) => m.from === move.from && m.to === move.to)) move = legal[Math.floor(Math.random() * legal.length)];
    if (!move) return;
    // החלטות "אנושיות" של הבוט
    if (this.bot && typeof res?.score === 'number') {
      const d = this.bot.decide(res.score, this.game.ply);
      if (d === 'resign') { this.ui.toast(`🏳️ ${this.opponent.name} ${t('resign')}`); this.endGame(this.game.finish(this.myColor, 'resign')); return; }
      this.lastBotEval = res.score;
    }
    await this.applyMove({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
  }

  // ======================= ניתוח מהלכים =======================
  queueReview(beforeFen, histBefore, mv) {
    const ply = this.game.ply;
    const gameId = this.gameId;
    this.reviewQueue = this.reviewQueue.then(async () => {
      try {
        const [best, after] = [await this.ai.analyze({ fen: beforeFen, history: histBefore, timeMs: 260, maxDepth: 6 }), await this.ai.analyze({ fen: mv.after, history: [...histBefore, beforeFen], timeMs: 260, maxDepth: 6 })];
        if (gameId !== this.gameId) return;
        const bestCp = clampCp(best.score);
        const playedCp = after.move === null ? (after.mate ? 1500 : 0) : clampCp(-after.score);
        const isBest = !!best.move && best.move.from === mv.from && best.move.to === mv.to;
        const loss = Math.max(0, bestCp - playedCp);
        let sacrifice = false;
        if (isBest && PIECE_VALUE[mv.piece] >= 3 && !this.game.result) {
          const opp = mv.color === 'w' ? 'b' : 'w';
          try { sacrifice = this.game.isAttacked(mv.to, opp) && !this.game.isAttacked(mv.to, mv.color) && loss <= 20 && playedCp > -100; } catch { sacrifice = false; }
        }
        const cls = classifyMove(loss, { isBest, sacrifice });
        const acc = moveAccuracy(bestCp, playedCp);
        this.game.reviews[ply] = { ply, color: mv.color, san: mv.san, loss, cls, acc, bestCp, playedCp };
        if (this.isLocalHuman(mv.color) && !this.game.result) this.showMoveBadge(cls, mv.to, ply);
        if (cls === 'brilliant' && this.isLocalHuman(mv.color)) this.achievements.unlock('brilliant');
        if (this.bot && this.isLocalHuman(mv.color) && (cls === 'brilliant' || cls === 'best') && Math.random() < 0.25) this.botEmote('goodMove');
      } catch { /* ניתוח הוא בונוס */ }
    });
  }

  showMoveBadge(cls, sq, ply) {
    if (cls === 'good') return;
    if (cls === 'best') { if (ply < 9 || this.lastBestBadge === ply - 2 || Math.random() < 0.45) return; this.lastBestBadge = ply; }
    const pos = this.sm.projectToScreen(this.board.squareWorld(sq).add(new THREE.Vector3(0, 0.9, 0)));
    this.ui.floatLabel(t(cls), pos, cls, 1.4);
    if (cls === 'brilliant') { this.sound.promotion(); this.fx.sparkle(this.board.squareWorld(sq).toArray(), 50, [0x7ff8ff, 0xffffff, 0x33f0ff], 0.5); }
  }

  async waitReviews(ms = 3500) { await Promise.race([this.reviewQueue, sleep(ms)]); }

  // ======================= סיום משחק =======================
  resultText() {
    const r = this.game.result;
    if (!r) return { title: '', emoji: '' };
    const reason = t(`reason_${r.reason}`);
    if (!r.winner) return { title: t('draw'), emoji: '🤝', reason };
    if (this.mode === 'local') return { title: `${r.winner === 'w' ? t('white') : t('black')} — ${t('victory')}`, emoji: '👑', reason };
    return r.winner === this.myColor ? { title: t('victory'), emoji: '🏆', reason } : { title: t('defeat'), emoji: '🛡️', reason };
  }

  async endGame(result) {
    if (!result || this.ending) return;
    this.ending = true;
    this.busy = true;
    this.thinking = false;
    this.deselect();
    this.store.set({ savedGame: null });
    const winner = result.winner;
    const plies = this.game.ply;
    const iWon = winner && (this.mode === 'local' || winner === this.myColor);
    const iLost = winner && !iWon;
    // מט קולנועי
    if (result.reason === 'checkmate') {
      const loser = winner === 'w' ? 'b' : 'w';
      const ks = this.game.kingSquare(loser);
      this.sound.checkmate();
      const kw = this.board.squareWorld(ks);
      this.sm.animateCamera(this.sm.camera.position.clone().lerp(kw, 0.35).add(new THREE.Vector3(0, 1.5, 0)), kw, 1.6, 'power2.inOut');
      await this.board.toppleKing(ks);
      screenFlash('rgba(255,236,170,0.75)', 1.2);
      this.fx.confetti([kw.x, 1.5, kw.z], 160);
      this.shock.play({ duration: 1.3, maxR: 14 });
      await sleep(600);
    } else if (iWon) this.sound.victory();
    else if (iLost) this.sound.defeat();
    else this.sound.draw();
    if (winner) this.life.react(iLost ? 'defeat' : 'victory');
    if (winner) {
      this.pets[winner].react('victory'); this.avatars[winner].victory();
      const loser = winner === 'w' ? 'b' : 'w';
      this.pets[loser].react('defeat'); this.avatars[loser].defeat();
    }
    if (this.bot && iLost) this.botEmote('win');

    // פרסים
    let gems = 0, stageMsg = '';
    const stats = { wins: this.store.get('wins'), losses: this.store.get('losses'), draws: this.store.get('draws') };
    const multiplayer = this.mode !== 'ai';
    if (iWon) {
      stats.wins++;
      const playerMoves = Math.ceil(plies / 2);
      gems = result.reason === 'checkmate' && playerMoves < ECONOMY.fastMateMaxMoves ? ECONOMY.fastMateGems : ECONOMY.winGems;
      this.economy.addGems(gems, 'win');
      this.achievements.unlock('first_win');
      if (result.reason === 'checkmate' && playerMoves < 20) this.achievements.unlock('fast_mate');
      if (this.mode === 'ai' && this.store.get('difficulty') === 'hard') this.achievements.unlock('beat_hard');
      if (multiplayer && this.mode !== 'local') this.achievements.unlock('online_win');
      this.achievements.count('streak');
      if (this.achievements.counters.streak >= 3) this.achievements.unlock('streak3');
    } else if (iLost) { stats.losses++; this.achievements.resetStreak(); } else stats.draws++;
    if (this.mode === 'local') this.achievements.unlock('pass_play');
    // דירוג
    if (this.opponent?.rating && this.mode !== 'local') {
      const my = this.store.get('rating');
      const exp = 1 / (1 + Math.pow(10, (this.opponent.rating - my) / 400));
      const score = iWon ? 1 : iLost ? 0 : 0.5;
      this.store.set({ rating: Math.round(my + 24 * (score - exp)) });
    }
    this.store.set(stats);
    // בניית שלב
    let built = false;
    const allowed = iWon && (!multiplayer || plies >= RULES.antiFarmPlies);
    if (iWon && multiplayer && plies < RULES.antiFarmPlies) stageMsg = t('antiFarm');
    await sleep(1600);
    if (allowed) {
      if (this.hostView) { this.hostView = null; await this.visitEra(this.progression.displayEra(), { force: true }); this.busy = true; }
      const next = this.progression.nextStage();
      if (next) { built = await this.buildNextStage({ demo: false, quiet: true }); if (built) stageMsg = `🏗️ ${t('stageBuilt')}: ${tn(getEra(next.eraId).stageNames[next.idx], getEra(next.eraId).stageNamesEn[next.idx])} (+${ECONOMY.stageGems}💎)`; gems += built ? ECONOMY.stageGems : 0; }
      else stageMsg = this.progression.lockReason() === 'premium' ? t('premiumLocked') : t('kingdomComplete');
    }
    await this.waitReviews();
    const rv = this.game.reviews.filter(Boolean);
    const myColor = this.mode === 'local' ? 'w' : this.myColor;
    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b.acc, 0) / arr.length : null);
    const acc = { me: avg(rv.filter((r) => r.color === myColor)), opp: avg(rv.filter((r) => r.color !== myColor)) };
    const keyMoments = rv.filter((r) => ['brilliant', 'blunder', 'mistake'].includes(r.cls)).sort((a, b) => (b.cls === 'brilliant') - (a.cls === 'brilliant') || b.loss - a.loss).slice(0, 4)
      .map((r) => ({ moveNo: Math.ceil(r.ply / 2), san: r.san, label: `${r.color === 'w' ? '⚪' : '⚫'} ${t(r.cls)}` }));
    const rt = this.resultText();
    this.busy = false;
    this.ending = false;
    this.sm.toGameplay(1.2, this.viewSide());
    M.openSummary(this, { ...rt, reason: rt.reason, gems, stageMsg, acc, keyMoments, canReplay: plies >= 4, isOnline: this.isOnlineMode() || !!this.bot });
    this.refreshHud();
  }

  async rematch() {
    if (this.isOnlineMode() && this.net.connected) {
      this.net.send({ t: 'rematch-request' });
      this.ui.toast(t('waiting'));
      return;
    }
    if (this.mode === 'quick') { this.quickMatch(this.store.get('timeControl')); return; }
    if (this.mode === 'local') this.startLocal(this.store.get('timeControl'));
    else this.startAI(this.store.get('difficulty'));
  }

  /** הילוך חוזר קולנועי של 8 המסעים האחרונים */
  async replayFinale() {
    const hist = this.game.history();
    const n = Math.min(8, hist.length);
    const start = hist[hist.length - n];
    if (!start) return;
    this.busy = true;
    const tmpChess = Chess;
    const tmp = new tmpChess(start.before);
    this.board.setPosition(tmp.board());
    this.board.setCheck(null);
    this.sm.cinematicOrbit({ target: [0, 0.5, 0], radius: this.sm.view.radius * 0.95, polar: 50, fromAz: this.sm.view.azimuth - 0.7, toAz: this.sm.view.azimuth + 0.7, duration: n * 1.1 + 1 });
    for (let i = hist.length - n; i < hist.length; i++) {
      const mv = tmp.move({ from: hist[i].from, to: hist[i].to, promotion: hist[i].promotion });
      await this.board.animateMove(mv, { onCapture: () => this.sound.capture(), onLand: (c) => { if (!c) this.sound.move(); } }, 0.75);
      if (tmp.inCheck()) { this.board.setCheck(this.findKing(tmp)); this.sound.check(); }
      await sleep(350);
    }
    if (tmp.isCheckmate()) { this.sound.checkmate(); this.fx.confetti([0, 2, 0], 120); }
    await sleep(900);
    this.resyncBoard();
    this.busy = false;
    this.sm.toGameplay(1.2, this.viewSide());
  }

  findKing(c) { for (const row of c.board()) for (const p of row) if (p && p.type === 'k' && p.color === c.turn()) return p.square; return null; }

  // ======================= בניית ממלכה =======================
  async buildNextStage({ demo = false, quiet = false } = {}) {
    if (this.busy && demo) return false;
    const next = this.progression.nextStage();
    if (!next) {
      const reason = this.progression.lockReason();
      if (reason === 'premium') {
        this.ui.toast(`🔒 ${t('premiumLocked')}`, { kind: 'gold', duration: 3800 });
        if (demo) this.openShop('eras');
      } else if (demo && await this.ui.confirm(`${t('kingdomComplete')}\n${t('resetProgress')}`, t('reset'))) {
        this.progression.resetAll();
        await this.visitEra(1, { force: true });
      }
      return false;
    }
    const wasBusy = this.busy;
    this.busy = true;
    this.ui.closeAll();
    if (this.sm.panoramaOn) { this.sm.panoramaOn = false; this.ui.setPanorama(false); }
    this.deselect();
    const prevEra = this.kingdom.eraId;
    const prevMax = this.progression.maxEraReached();
    const info = this.progression.buildNext();
    const era = getEra(info.eraId);
    const hooks = { onRiseStart: () => this.sound.structureRise(true) };
    if (info.eraId !== prevEra) {
      this.sound.eraEvolution();
      setTimeout(() => this.ui.eraTitle(`${t('newEra')} · ${t('era')} ${era.id}`, tn(era.name, era.en), tn(era.materials, era.materialsEn)), 2600);
      await this.kingdom.evolve(info.eraId, info.idx + 1, { raiseFrom: info.idx, hooks: { ...hooks, onShock: () => this.sm.addShake(0.3) } });
      this.sound.setEra(info.eraId);
      this.applyStationMaterials();
    } else {
      await this.kingdom.raiseStage(info.eraId, info.idx, { hooks });
    }
    if (!demo) this.economy.addGems(ECONOMY.stageGems, 'stage');
    this.fx.confetti([0, 3, -6], 120);
    this.ui.toast(`🏗️ ${t('stageBuilt')}: ${tn(era.stageNames[info.idx], era.stageNamesEn[info.idx])}`, { kind: 'gold', duration: 3500 });
    // פתיחת חיות בסיס
    const newMax = this.progression.maxEraReached();
    Object.values(PETS).forEach((p) => { if (!p.premium && p.unlockEra > prevMax && p.unlockEra <= newMax) setTimeout(() => this.ui.toast(`${p.icon} ${tn(`נפתחה חיית מחמד: ${p.name}`, `Pet unlocked: ${PET_EN[p.id]}`)}`, { kind: 'good', duration: 3500 }), 1500); });
    if (!demo) {
      if (newMax >= 2) this.achievements.unlock('era2');
      if (newMax >= 3) this.achievements.unlock('era3');
      if (newMax >= 5) this.achievements.unlock('era5');
      if (this.progression.baseComplete()) this.achievements.unlock('base_done');
    }
    if (this.mode === 'ai') { this.setupOpponentForMode(); }
    this.applyLoadout();
    await this.sm.toGameplay(1.4, this.viewSide());
    this.busy = quiet ? wasBusy : false;
    this.refreshHud();
    return true;
  }

  /** סיור בעידנים / מעבר תצוגה לעידן (ללא שינוי התקדמות) */
  async visitEra(eraId, { force = false, built = null } = {}) {
    if ((this.busy && !force) || (!this.progression.visitable(eraId) && !force && built === null)) return;
    this.busy = true;
    this.deselect();
    const b = built ?? this.progression.progressOf(eraId);
    const era = getEra(eraId);
    this.sound.eraEvolution();
    setTimeout(() => this.ui.eraTitle(`${t('era')} ${era.id}`, tn(era.name, era.en), tn(era.materials, era.materialsEn)), 1500);
    await this.kingdom.evolve(eraId, b, { raiseFrom: 0, speed: 1.35, hooks: { onRiseStart: () => this.sound.structureRise(false) } });
    if (built === null) this.store.set({ selectedEra: eraId === this.progression.homeEra() ? null : eraId });
    this.sound.setEra(eraId);
    this.applyStationMaterials();
    if (this.mode === 'ai') this.setupOpponentForMode();
    this.applyLoadout();
    await this.sm.toGameplay(1.2, this.viewSide());
    this.busy = false;
    this.refreshHud();
  }

  // ======================= מצבי משחק =======================
  async confirmLeave() {
    const inProgress = !this.game.result && this.game.ply > 0;
    if (!inProgress) return true;
    const ok = await this.ui.confirm(t('confirmNew'), t('newGame'));
    if (ok && this.isOnlineMode()) { this.net.send({ t: 'resign' }); }
    return ok;
  }

  resetBoardState() {
    this.gameId = (this.gameId || 0) + 1;
    this.ending = false;
    this.thinking = false;
    this.game.reset();
    this.board.setPosition(this.game.board);
    this.board.setLastMove(null);
    this.board.setCheck(null);
    Object.values(this.pets).forEach((p) => p.reset());
    Object.values(this.avatars).forEach((a) => a.reset());
  }

  async leaveNetwork() {
    if (this.net.connected || this.net.peer) { this.net.send({ t: 'bye' }); this.net.destroy(); }
    this.bot = null;
    if (this.hostView) { this.hostView = null; const era = this.progression.displayEra(); if (era !== this.kingdom.eraId) await this.visitEra(era, { force: true }); }
  }

  async startAI(level) {
    await this.leaveNetwork();
    this.mode = 'ai';
    this.myColor = 'w';
    this.store.set({ difficulty: level });
    this.game.stopClock();
    this.resetBoardState();
    this.setupOpponentForMode();
    this.applyLoadout();
    this.ui.setActions('ai');
    this.saveGame();
    this.sm.toGameplay(1.0, 'w');
    this.refreshHud();
    this.ui.toast(`${DIFF_PERSONA[level].icon} ${tn(DIFF_PERSONA[level].he, DIFF_PERSONA[level].en)} — ${t('gameStarted')}`);
  }

  async startLocal(tcId) {
    await this.leaveNetwork();
    this.mode = 'local';
    this.myColor = 'w';
    const tc = TIME_CONTROLS.find((x) => x.id === tcId);
    if (tc) this.game.startClock(tc.ms, tc.inc); else this.game.stopClock();
    this.resetBoardState();
    this.setupOpponentForMode();
    this.applyLoadout();
    this.ui.setActions('local');
    this.saveGame();
    this.sm.toGameplay(1.0, 'w');
    this.refreshHud();
    this.ui.toast(t('gameStarted'));
  }

  saveGame() {
    if (this.mode !== 'ai' && this.mode !== 'local') return;
    if (this.game.result) { this.store.set({ savedGame: null }); return; }
    this.store.set({ savedGame: { mode: this.mode, uci: this.game.uci(), tc: this.mode === 'local' && this.game.clock ? (TIME_CONTROLS.find((x) => x.ms === this.game.clock.initial) || {}).id : null } });
  }

  // ---------- רשת ----------
  myHello() {
    const eraId = this.progression.displayEra();
    return { t: 'hello', v: 1, name: this.store.get('profile').name, avatar: this.store.get('profile').avatar, rating: this.store.get('rating'), pet: this.economy.pet, loadout: this.economy.loadout, eraId, built: this.progression.progressOf(eraId), app: APP_VERSION };
  }

  bindNet() {
    this.net.on('message', (msg) => this.onNetMessage(msg));
    this.net.on('close', () => {
      if (this.mode !== 'friend' && this.mode !== 'quick') return;
      if (this.bot) return;
      this.ui.toast(`⚠️ ${t('disconnected')}`, { kind: 'bad', duration: 4000 });
      if (!this.game.result && this.game.ply > 0) {
        clearTimeout(this.abandonT);
        this.abandonT = setTimeout(() => { if (!this.net.connected && !this.game.result) this.endGame(this.game.finish(this.myColor, 'abandon')); }, 15000);
      }
    });
  }

  async hostRoom(tcId) {
    if (!(await M.openOnlineNotice(this))) return;
    await this.leaveNetwork();
    this.bindNet();
    let modal;
    try {
      const code = await this.net.createRoom(() => {
        modal?.close();
        this.net.send(this.myHello());
        const hostColor = Math.random() < 0.5 ? 'w' : 'b';
        const tc = TIME_CONTROLS.find((x) => x.id === tcId);
        this.net.send({ t: 'start', hostColor, tc: tc ? tc.id : 0 });
        this.beginOnline('friend', hostColor, tc);
      });
      modal = M.openHostRoom(this, code, () => { if (!this.net.connected) this.net.destroy(); });
    } catch {
      this.ui.toast(t('connError'), { kind: 'bad', duration: 4000 });
    }
  }

  async joinRoom(code) {
    if (!(await M.openOnlineNotice(this))) return;
    await this.leaveNetwork();
    this.bindNet();
    const m = this.ui.modal({ title: `${t('joinRoom')} ${code}`, center: true, body: M.logo('small'), dismissable: false });
    try {
      await this.net.joinRoom(code);
      m.close();
      this.net.send(this.myHello());
      this.pendingRole = 'guest';
    } catch (err) {
      m.close();
      this.net.destroy();
      this.ui.toast(err?.type === 'peer-unavailable' || err?.message === 'busy' ? t('roomNotFound') : t('connError'), { kind: 'bad', duration: 4000 });
    }
  }

  async quickMatch(tcId) {
    if (!(await M.openOnlineNotice(this))) return;
    await this.leaveNetwork();
    this.bindNet();
    let cancelled = false;
    const modal = M.openSearching(this, () => { cancelled = true; });
    let found = false;
    try { found = await this.net.quickMatch(6000); } catch { found = false; }
    if (cancelled) { this.net.destroy(); return; }
    modal.close();
    const tc = TIME_CONTROLS.find((x) => x.id === tcId) || TIME_CONTROLS.find((x) => x.id === 5);
    if (found) {
      this.net.send(this.myHello());
      if (this.net.role === 'host') {
        const hostColor = Math.random() < 0.5 ? 'w' : 'b';
        this.net.send({ t: 'start', hostColor, tc: tc.id });
        this.beginOnline('quick', hostColor, tc);
      }
      return;
    }
    // יריב גיבוי — בוט מוצהר
    this.net.destroy();
    const profile = createBotProfile(this.store.get('rating'));
    this.bot = new BotOpponent(this.ai, profile);
    await M.openBotNotice(this, profile);
    this.mode = 'quick';
    this.myColor = Math.random() < 0.5 ? 'w' : 'b';
    this.opponent = { ...profile };
    this.game.startClock(tc.ms, tc.inc);
    this.resetBoardState();
    this.hostView = { eraId: profile.eraId, built: 2 };
    await this.visitEra(profile.eraId, { force: true, built: 2 });
    this.applyLoadout();
    this.ui.setActions('quick');
    await this.sm.toGameplay(1.0, this.myColor);
    this.refreshHud();
    this.ui.toast(this.myColor === 'w' ? t('youPlayWhite') : t('youPlayBlack'));
    setTimeout(() => this.botEmote('start'), 1500);
    if (this.isAITurn()) this.opponentMove();
  }

  async beginOnline(mode, hostColor, tc) {
    this.mode = mode;
    this.myColor = this.net.role === 'host' ? hostColor : (hostColor === 'w' ? 'b' : 'w');
    if (tc) this.game.startClock(tc.ms, tc.inc); else this.game.stopClock();
    this.resetBoardState();
    this.ui.setActions(mode);
    this.ui.closeAll();
    // אירוח ממלכה: האורח רואה את העידן של המארח
    if (this.net.role === 'guest' && this.remoteHello) {
      this.hostView = { eraId: this.remoteHello.eraId, built: this.remoteHello.built };
      await this.visitEra(this.remoteHello.eraId, { force: true, built: Math.max(0, Math.min(2, this.remoteHello.built | 0)) });
    }
    this.applyLoadout();
    await this.sm.toGameplay(1.0, this.myColor);
    this.refreshHud();
    this.ui.toast(`${t('gameStarted')} ${this.myColor === 'w' ? t('youPlayWhite') : t('youPlayBlack')}`);
  }

  onNetMessage(msg) {
    switch (msg.t) {
      case 'hello': {
        this.remoteHello = msg;
        const okLoad = (o) => o && typeof o === 'object' ? { head: String(o.head || ''), armor: String(o.armor || ''), weapon: String(o.weapon || ''), aura: String(o.aura || '') } : null;
        this.opponent = { name: String(msg.name || '').slice(0, 18) || tn('יריב', 'Opponent'), avatar: String(msg.avatar || '♚').slice(0, 4), rating: Number(msg.rating) || 1200, pet: PETS[msg.pet] ? msg.pet : 'wolf_cub', loadout: okLoad(msg.loadout) };
        this.applyLoadout();
        break;
      }
      case 'start': {
        const tc = TIME_CONTROLS.find((x) => x.id === msg.tc);
        this.beginOnline(this.mode === 'quick' || this.net.code === null ? 'quick' : 'friend', msg.hostColor === 'b' ? 'b' : 'w', tc);
        break;
      }
      case 'move': {
        if (typeof msg.uci !== 'string' || msg.uci.length < 4) return;
        if (msg.clock) this.game.syncClock(Number(msg.clock.w), Number(msg.clock.b));
        this.applyMove({ from: msg.uci.slice(0, 2), to: msg.uci.slice(2, 4), promotion: msg.uci[4] }, { remote: true });
        break;
      }
      case 'resign': if (!this.game.result) this.endGame(this.game.finish(this.myColor, 'resign')); break;
      case 'flag': if (!this.game.result && msg.color !== this.myColor) this.endGame(this.game.finish(this.myColor, 'timeout')); break;
      case 'draw-offer':
        this.ui.modal({ title: `🤝 ${t('drawOffered')}`, center: true, actions: [
          { label: t('decline'), onClick: (c) => { this.net.send({ t: 'draw-decline' }); c.close(); } },
          { label: t('accept'), primary: true, onClick: (c) => { this.net.send({ t: 'draw-accept' }); c.close(); this.endGame(this.game.finish(null, 'agreement')); } }] });
        break;
      case 'draw-accept': if (!this.game.result) this.endGame(this.game.finish(null, 'agreement')); break;
      case 'draw-decline': this.ui.toast(t('drawDeclined')); break;
      case 'rematch-request':
        this.ui.modal({ title: `🔁 ${t('rematchOffered')}`, center: true, actions: [
          { label: t('decline'), onClick: (c) => c.close() },
          { label: t('accept'), primary: true, onClick: (c) => { c.close(); this.ui.closeAll(); this.net.send({ t: 'rematch-accept' }); this.startRematch(true); } }] });
        break;
      case 'rematch-accept': this.ui.closeAll(); this.startRematch(false); break;
      case 'emote': if (typeof msg.e === 'string') this.showEmote(this.myColor === 'w' ? 'b' : 'w', msg.e.slice(0, 4)); break;
      case 'bye': this.ui.toast(t('opponentLeft'), { kind: 'bad' }); if (!this.game.result && this.game.ply > 0) this.endGame(this.game.finish(this.myColor, 'abandon')); break;
      default:
    }
  }

  startRematch(accepted) {
    const tc = this.game.clock ? TIME_CONTROLS.find((x) => x.ms === this.game.clock.initial) : null;
    this.myColor = this.myColor === 'w' ? 'b' : 'w';
    if (tc) this.game.startClock(tc.ms, tc.inc);
    this.resetBoardState();
    this.sm.toGameplay(1.0, this.myColor);
    this.refreshHud();
    this.ui.toast(`${t('gameStarted')} ${this.myColor === 'w' ? t('youPlayWhite') : t('youPlayBlack')}`);
    if (!accepted) { /* היוזם */ }
  }

  async offerDraw() {
    if (this.bot) {
      if (this.bot.acceptsDraw(this.lastBotEval || 0, this.game.ply)) { this.endGame(this.game.finish(null, 'agreement')); } else this.ui.toast(t('drawDeclined'));
      return;
    }
    if (!this.net.connected || this.game.result) return;
    this.net.send({ t: 'draw-offer' });
    this.ui.toast(`🤝 ${t('offerDraw')}…`);
  }

  async resign() {
    if (this.game.result || this.game.ply === 0) return;
    if (!(await this.ui.confirm(t('confirmResign'), t('resign'), { danger: true }))) return;
    this.net.send({ t: 'resign' });
    const winner = this.mode === 'local' ? (this.game.turn === 'w' ? 'b' : 'w') : (this.myColor === 'w' ? 'b' : 'w');
    this.endGame(this.game.finish(winner, 'resign'));
  }

  sendEmote(e) {
    if (performance.now() - this.lastEmote < 2500) return;
    this.lastEmote = performance.now();
    this.net.send({ t: 'emote', e });
    this.showEmote(this.mode === 'local' ? this.game.turn : this.myColor, e);
  }

  botEmote(event) {
    const e = this.bot?.emoteFor(event);
    if (e) setTimeout(() => this.showEmote(this.myColor === 'w' ? 'b' : 'w', e), 600 + Math.random() * 900);
  }

  showEmote(color, e) {
    const av = this.avatars[color];
    const p = av.group.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 2.6, 0));
    this.ui.floatLabel(e, this.sm.projectToScreen(p), 'emote', 1.6);
    av.emote(e);
    this.pets[color].react('emote');
    this.sound.pop();
  }

  // ======================= עוד =======================
  async hint() {
    if (!(this.mode === 'ai' || this.mode === 'local') || !this.canAct()) return;
    if (!this.economy.spend(HINT_COST)) { this.ui.toast(t('notEnoughGems'), { kind: 'bad' }); this.openShop('gems'); return; }
    this.ui.toast(`💡 ${t('hint')}…`);
    const res = await this.ai.analyze({ fen: this.game.fen, history: this.game.beforeFens(), timeMs: 900, maxDepth: 9 }, 'main');
    if (res?.move) { this.board.showHint(res.move.from, res.move.to); this.sound.notify(); }
  }

  openShop(tab = 'wardrobe') { openKingdomShop(this, { tab }); }
  openDaily() { openDailyRewards(this); }
  shareKingdom() { shareKingdom(this); }
  startTutorial() {
    if (this.mode !== 'ai' || this.game.ply > 0) this.startAI(this.store.get('difficulty') || 'easy');
    this.tutorial.start();
  }

  wipeData() {
    wipeAllLocalData();
    location.reload();
  }
}
