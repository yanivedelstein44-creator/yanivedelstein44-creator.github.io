/**
 * GameApp — מחבר את כל המערכות: סצנה, לוח, ממלכה, חיות ואווטארים, AI, סאונד, כלכלה, UI ועדכונים.
 * מסע כיבוש 99 איים: בכל אי בוט ייחודי. האי המרכזי (אי 1) הוא הבית: הבוט הראשון, חנות, מתנה יומית ומשחק נגד חבר.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { Chess } from 'chess.js';
import { ProgressStore } from '../core/Storage.js';
import { wipeEverything } from '../core/DataWipe.js';
import { Economy } from '../core/Economy.js';
import { initPlayBilling, ensurePlayBilling } from '../core/PlayBilling.js';
import { Achievements } from '../core/Achievements.js';
import { Progression } from '../game/Progression.js';
import { GameController, PIECE_VALUE, GLYPH } from '../game/GameController.js';
import { ChessAI, classifyMove, moveAccuracy, clampCp } from '../engine/ChessAI.js';
import { SceneManager } from '../scene/SceneManager.js';
import { FX } from '../scene/Particles.js';
import { ChessBoard3D, squareToXZ } from '../scene/ChessBoard3D.js';
import { Shockwave, screenFlash } from '../scene/Effects.js';
import { KingdomBuilder } from '../scene/KingdomBuilder.js';
import { ArenaLife } from '../scene/ArenaLife.js';
import { PetCompanion3D } from '../scene/PetCompanion3D.js';
import { PlayerAvatar3D } from '../scene/PlayerAvatar3D.js';
import { ThumbRenderer } from '../scene/ThumbRenderer.js';
import { WorldMap } from '../scene/WorldMap.js';
import { Weather, climatePalette } from '../scene/Climate.js';
import { makeMonument } from '../scene/Monuments.js';
import { HubMuseum } from '../scene/HubMuseum.js';
import { WhiteFlag } from '../scene/WhiteFlag.js';
import { HorizonIslands } from '../scene/HorizonIslands.js';
import { ExpansionStage } from '../scene/ExpansionStage.js';
import { eraMaterials } from '../scene/Materials.js';
import { detectSeason, buildSeason } from '../scene/SeasonalEvents.js';
import { SoundEngine } from '../audio/SoundEngine.js';
import { UI, h } from '../ui/UI.js';
import { t, tn, setLang, PET_EN, islandName, islandLabel, shortName } from '../ui/i18n.js';
import * as M from '../ui/Modals.js';
import { buildMapUi } from '../ui/MapPanel.js';
import * as CloudWipe from '../ui/CloudWipe.js';
import { openCinema as openCinemaModal } from '../ui/Cinema.js';
import { openKingdomShop } from '../ui/KingdomShopModal.js';
import { openDailyRewards } from '../ui/DailyRewardsModal.js';
import { shareKingdom } from '../ui/ShareCard.js';
import { Tutorial } from '../ui/Tutorial.js';
import { Updater } from '../update/Updater.js';
import { OnlineController } from './OnlineController.js';
import { openFriendHub, joinFromLink, openEmotePicker } from '../ui/OnlineModal.js';
import { getEra } from '../config/Eras.js';
import { PETS, isFlyer } from '../config/Pets.js';
import { ECONOMY, PET_GROWTH } from '../config/EconomyConfig.js';
import { TIME_CONTROLS, RULES, APP_VERSION, ONLINE } from '../config/AppConfig.js';
import { ISLAND_COUNT, BASE_ISLANDS, HUB_ID, islandDef, regionOf, regionIslands, isBoss, isPremium, tierOf, conquestGems, repeatGems } from '../config/Islands.js';
import { botLine, pirateLine } from '../config/BotLines.js';
import { pirateCrew, pirateGems } from '../config/Pirates.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HINT_COST = 30;
// סימני שחמט כטקסט (לא אימוג'י) — בורר התצוגה FE0E
const TXT = '︎';
const STAR_MILESTONE = 25;
/** משך זמן קצר לתצוגה: "3h 20m" */
const fmtDur = (ms) => { const m = Math.max(1, Math.ceil(ms / 60000)); const hh = Math.floor(m / 60), mm = m % 60; return hh ? `${hh}${t('hShort')} ${mm}${t('mShort')}` : `${mm}${t('mShort')}`; };
const STAR_MILESTONE_GEMS = 150;

export class GameApp {
  constructor() {
    // בדיקות במכשירים איטיים: ?fastfx מבטל את החלקת הקפיצות של gsap
    if (typeof location !== 'undefined' && location.search.includes('fastfx')) gsap.ticker.lagSmoothing(0);
    this.store = new ProgressStore();
    this.economy = new Economy();
    this.progression = new Progression(this.store, this.economy);
    this.achievements = new Achievements(this.store, this.economy);
    setLang(this.store.get('settings').lang || 'en'); // ברירת מחדל: אנגלית; עברית בהגדרות
    const s = this.store.get('settings');
    this.sound = new SoundEngine({ sfx: s.sfx, ambience: s.ambience });
    this.root = document.getElementById('app');
    this.ui = new UI(this.root, this.handlers());
    this.sm = new SceneManager(document.getElementById('scene'), {
      getSafeArea: () => {
        const bottom = (this.ui.dock?.offsetHeight || 70) + 6;
        // שורת הפעולות (מרכז / צילום / רמז / כניעה) יושבת מעל הסרגל — הלוח לא יורד מתחתיה
        const a = this.ui.actions;
        const clear = a?.offsetHeight ? Math.max(bottom, window.innerHeight - a.getBoundingClientRect().top + 6) : bottom;
        return { top: this.ui.hud?.offsetHeight || 150, bottom, clear };
      },
    });
    this.fx = new FX(this.sm);
    this.board = new ChessBoard3D(this.sm, this.fx);
    this.shock = new Shockwave(this.sm, this.fx);
    this.kingdom = new KingdomBuilder(this.sm, this.fx, this.board, this.shock);
    // חיים ברקע: דמויות, כלי טיס, אפקטים וצלילי אווירה לפי העידן המוצג
    this.life = new ArenaLife(this.sm, this.fx, this.sound);
    this.life.extraObstacles = () => (this.atHub && this.museum ? this.museum.obstacleBoxes() : []);
    // פעם ראשונה שמתרחקים מהלוח: הסבר קצר איך חוזרים למשחק
    this.sm.controls.addEventListener('end', () => {
      if (this.store.get('seenZoomHint') || this.map.isOpen || !this.sm.isFarFromGameplay()) return;
      this.store.set({ seenZoomHint: true });
      this.ui.toast(t('zoomBackHint'), { icon: 'target', duration: 3600 });
    });
    this.kingdom.onEraReady = (eraId, built) => this.life.setEra(eraId, built, this.kingdom);
    this.kingdom.onEraLeave = () => this.life.leave();
    this.kingdom.onEraHidden = () => this.life.clear();
    this.pets = { w: new PetCompanion3D(this.sm, this.fx, this.sound), b: new PetCompanion3D(this.sm, this.fx, this.sound) };
    this.avatars = { w: new PlayerAvatar3D(this.sm, this.fx), b: new PlayerAvatar3D(this.sm, this.fx) };
    this.thumbs = new ThumbRenderer(this.sm.renderer);
    this.map = new WorldMap(this);
    this.weather = new Weather(this.sm, this.sound);
    this.museum = new HubMuseum(this);
    this.horizon = new HorizonIslands(this.sm);
    // תפאורה מונפשת לאיי הפרימיום (100–129)
    this.expansion = new ExpansionStage(this.sm, { board: this.board, weather: this.weather, fx: this.fx, sound: this.sound });
    this.ai = new ChessAI();
    this.game = new GameController();
    this.tutorial = new Tutorial(this);
    this.online = new OnlineController(this);
    this.updater = new Updater({
      isSafe: () => this.isSafe() && !this.ui.modals.length && !this.map.isOpen,
      onAvailable: (info, act) => this.showUpdateAvailable(info, act),
      onUpdating: (v) => this.ui.toast(`${t('update')} ${v ? `(v${v})` : ''}`, { kind: 'gold', duration: 3000, icon: 'refresh' }),
      onDownloading: (info) => this.ui.toast(`${t('downloadingUpdate')}${info?.version ? ` (v${info.version})` : ''}`, { kind: 'gold', duration: 4000, icon: 'download' }),
      // גרסת Google Play (info.store === 'play'): עדכון דרך החנות במקום הורדת APK
      onNativeRequired: (info) => this.ui.modal({
        title: info.store === 'play' ? t('playUpdateTitle') : t('updateNative'), titleIcon: 'device', center: true,
        body: `${info.store === 'play' ? t('playUpdateBody') : t('updateNativeBody')}${info.version ? ` (v${info.version})` : ''}`,
        actions: [{ label: t('later'), onClick: (c) => c.close() }, info.store === 'play'
          ? { label: t('playOpenStore'), icon: 'download', primary: true, onClick: (c) => { c?.close?.(); this.updater.openStore(info.storeUrl); } }
          : { label: t('download'), icon: 'download', primary: true, onClick: () => { if (info.apk) location.href = info.apk; } }],
      }),
    });
    this.mode = 'ai';
    this.myColor = 'w';
    this.busy = false;
    this.selected = null;
    this.cursor = 'e2';
    this.opponent = null;
    this.lastSay = 0;
    this.reviewQueue = Promise.resolve();
  }

  eraDef(id) { return getEra(id); }
  currentEraMaterials() { return eraMaterials(getEra(this.kingdom.eraId || 1).key); }
  get islandId() { return this.progression.currentIsland(); }
  get atHub() { return this.islandId === HUB_ID; }

  handlers() {
    return {
      onCenter: () => { this.sound.ui(); if (this.sm.panoramaOn) { this.sm.panoramaOn = false; this.ui.setPanorama(false); } this.sm.toGameplay(1.0, this.viewSide()); },
      onMap: () => this.openMap(),
      onShop: () => { this.sound.ui(); this.openShop(); },
      onFriend: () => { this.sound.ui(); openFriendHub(this); },
      onEmote: () => { this.sound.ui(); openEmotePicker(this); },
      onLeave: () => { this.sound.ui(); this.online.leave(); },
      onHome: () => { this.sound.ui(); this.travelTo(HUB_ID, { battle: false, overview: true }); },
      onBattle: () => { this.sound.ui(); this.newBattle(); },
      onSfx: () => { const v = !this.store.get('settings').sfx; this.store.setSetting('sfx', v); this.sound.setSfx(v); this.ui.setAudio(v, this.store.get('settings').ambience); },
      onAmb: () => { const v = !this.store.get('settings').ambience; this.store.setSetting('ambience', v); this.sound.setAmbience(v); this.ui.setAudio(this.store.get('settings').sfx, v); },
      onPanorama: () => { const on = !this.sm.panoramaOn; this.ui.setPanorama(on); this.sm.setPanorama(on); },
      onHint: () => this.hint(),
      onDraw: () => this.offerDraw(),
      onResign: () => this.resign(),
      onShare: () => this.shareKingdom(),
      onSettings: () => { this.sound.ui(); M.openSettings(this); },
      onLanguage: (where) => { this.sound.ui(); this.toggleLanguage(where); },
      onTutorial: () => { this.sound.ui(); this.startTutorial(); },
      onAlbum: () => { this.sound.ui(); M.openAlbum(this); },
      onCinema: () => { this.sound.ui(); this.openCinema(); },
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
    this.applyMotion();
    const s = this.store.get('settings');
    this.ui.setAudio(s.sfx, s.ambience);
    this.ui.setGems(this.economy.gems, false);
    this.economy.onChange((evt) => {
      if (evt.type === 'gems' || evt.type === 'buy' || evt.type === 'daily') this.ui.setGems(this.economy.gems);
      // החיה שחגה מעל העיר מתעדכנת כשמקבלים / קונים / מלבישים חיה
      if ((evt.type === 'equip' && evt.slot === 'pet') || evt.type === 'skyPets' || evt.type === 'buy' || evt.type === 'petXp') this.museum?.syncSkyPet?.();
      if (evt.type === 'equip' && evt.slot === 'board') this.board.setSkin(this.economy.boardSkin, { flash: true });
      if (evt.type === 'boost' || evt.type === 'buy') this.ui.setBoost?.(this.economy.boostLeftMs());
      // רכישה שבוטלה/הוחזר עליה כסף ב-Google Play — הפריט הוסר (core/PlayBilling.js)
      if (evt.type === 'revoked') {
        this.afterIntro(() => this.ui.toast(t('storeRevoked'), { icon: 'info', duration: 4200 }), 300);
        this.board.setSkin(this.economy.boardSkin);
        this.applyLoadout();
        this.museum?.syncSkyPet?.();
      }
      if (evt.type === 'buy' && evt.restored) { this.board.setSkin(this.economy.boardSkin); this.applyLoadout(); }
      this.refreshBadges();
    });
    // Google Play Billing: רק בגרסת Play עם עטיפה 1002 ומעלה (בעטיפה 1001 אין תוסף — נשאר "בקרוב")
    // ההודעה "שוחזרו N רכישות" מוצגת אחרי הפתיחה הקולנועית (בזמן הפתיחה הממשק מוסתר)
    initPlayBilling(this.economy, { notify: (msg) => this.afterIntro(() => this.ui.toast(msg, { kind: 'good', icon: 'check', duration: 4200 }), 300) })
      .catch(() => false);
    this.board.setSkin(this.economy.boardSkin);
    this.grantEarnedSkins(false);
    this.grantEarnedSkyPets(false);
    this.ui.setBoost(this.economy.boostLeftMs());
    setInterval(() => this.ui.setBoost(this.economy.boostLeftMs()), 30000);
    this.achievements.onUnlock((a) => { this.ui.toast(`${t('achievementUnlocked')} ${tn(a.he, a.en)} · +${a.gems}`, { kind: 'gold', duration: 3800, icon: a.icon }); this.sound.notify(); });

    // משחק שמור (באמצע) → חוזרים לאותו אי; אחרת מתחילים בבית — האי המרכזי
    const saved = this.store.get('savedGame');
    const resumable = saved && (saved.mode === 'ai' || saved.mode === 'local') && Array.isArray(saved.uci) && saved.uci.length > 0;
    if (resumable && saved.island && this.progression.canPlay(saved.island)) this.progression.setCurrent(saved.island);
    else if (!resumable) this.progression.setCurrent(HUB_ID);
    this.showIsland(this.islandId);
    this.progression.visit(this.islandId);
    this.ui.setDock(this.atHub);

    let resumed = false;
    if (resumable && (saved.mode === 'local' ? this.atHub : true)) {
      this.mode = saved.mode;
      this.myColor = 'w';
      this.game.loadUci(saved.uci);
      if (saved.tc) { const tc = TIME_CONTROLS.find((x) => x.id === saved.tc); if (tc) this.game.startClock(tc.ms, tc.inc); }
      resumed = this.game.ply > 0 && !this.game.result;
    } else {
      this.mode = 'ai';
      this.game.reset();
    }
    this.placeStations();
    this.setupOpponentForMode();
    this.applyLoadout();
    this.board.setPosition(this.game.board);
    const lm = this.game.lastMove();
    if (lm) this.board.setLastMove(lm.from, lm.to);
    this.sm.initView(this.viewSide());
    this.bindInput();
    this.refreshHud();
    this.ui.setActions(this.mode);
    this.setupSeason();
    this.startClockLoop();
    const bootQ = new URLSearchParams(location.search);
    const bootRoom = bootQ.get('room') || (this.store.get('onlineRoom')?.code && Date.now() - (this.store.get('onlineRoom').at || 0) < ONLINE.rejoinMs);
    if (!bootRoom) this.playIslandIntro(this.islandId);
    requestAnimationFrame(() => requestAnimationFrame(() => this.hideSplash()));
    this.updater.init();
    if (!this.economy.s.welcomed) { this.economy.s.welcomed = true; this.economy.save(); setTimeout(() => this.ui.toast(tn(`קיבלת ${ECONOMY.welcomeGems} יהלומים מתנת פתיחה!`, `You got ${ECONOMY.welcomeGems} gems as a welcome gift!`), { kind: 'gold', duration: 4000, icon: 'gift' }), 1600); }
    // הזמנה לחדר אונליין (?room=CODE, ‎&watch=1 לצופים) או חזרה לחדר אחרי שהאפליקציה נסגרה
    const q = new URLSearchParams(location.search);
    const linkRoom = q.get('room');
    if (linkRoom) {
      const linkWatch = q.has('watch');
      q.delete('room'); q.delete('watch');
      history.replaceState(null, '', `${location.pathname}${q.toString() ? `?${q}` : ''}`);
      setTimeout(() => joinFromLink(this, linkRoom, linkWatch), 900);
    } else {
      const or = this.store.get('onlineRoom');
      if (or?.code && Date.now() - (or.at || 0) < ONLINE.rejoinMs) setTimeout(() => this.rejoinOnline(or.code), 1200);
      else if ((this.store.get('myRooms') || []).length) setTimeout(() => this.online.cleanupMyRooms(), 20000);
    }
    if (!this.store.get('seenCinemaHint')) { this.store.set({ seenCinemaHint: true }); setTimeout(() => this.ui.toast(t('cinemaHint'), { icon: 'play', duration: 4200 }), 1600); }
    else if (resumed) setTimeout(() => this.ui.toast(t('gameResumed'), { icon: 'knight' }), 1200);
    else this.afterIntro(() => this.botSay('intro', true), 500);
    if (this.economy.hasDailyBadge() && this.store.get('seenTutorial')) setTimeout(() => this.ui.toast(t('giftWaiting'), { kind: 'gold', icon: 'gift' }), 3200);
    if (this.isAITurn()) this.afterIntro(() => this.opponentMove(), 400);
    // תמונות ממוזערות לכרטיסי השחקנים — ברקע, אחרי שהסצנה עלתה
    setTimeout(() => { this.thumbsReady = true; this.refreshPetThumbs(); }, 2500);
    if (this.atHub && !resumed) this.afterIntro(() => this.dockPending(), 600);
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
      title: t('updateAvailable'), titleIcon: 'sparkle', center: true, body,
      actions: [
        { label: t('later'), onClick: (c) => { c.close(); act.later(); } },
        { label: t('updateNow'), icon: 'refresh', primary: true, onClick: (c) => { c.close(); act.now(); } },
      ],
    });
  }

  hideSplash() {
    const sp = document.getElementById('splash');
    if (!sp) return;
    sp.classList.add('hide');
    setTimeout(() => sp.remove(), 700);
  }

  /** [a11y] Reduce motion: the device setting (prefers-reduced-motion) or the in-game switch in Settings */
  applyMotion() {
    const on = !!this.store.get('settings').reducedMotion || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.sm.reducedMotion = on;
    document.documentElement.classList.toggle('reduce-motion', on);
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
    this.ui.setDock(this.atHub);
    this.ui.setAudio(this.store.get('settings').sfx, this.store.get('settings').ambience);
    this.ui.setGems(this.economy.gems, false);
    this.ui.setActions(this.mode);
    this.setupOpponentForMode();
    this.refreshHud();
    // שלטים תלת-ממדיים עם טקסט (האי המרכזי, שלטי העולמות במפה) והחלונית של המפה מתחלפים גם הם
    this.museum?.relabel?.();
    this.map?.relabel?.();
    this.ui.announce?.(t('lngSwitched'));
  }

  /** כפתור השפה בסרגל העליון: אנגלית ↔ עברית, נשמר כבחירה מפורשת של השחקן */
  toggleLanguage(where = 'hud') {
    const next = (this.store.get('settings').lang || 'en') === 'he' ? 'en' : 'he';
    this.store.setSetting('lang', next);
    if (where === 'map' && this.map) this.map.focusLang = true;
    this.setLanguage(next);
    // הסרגל נבנה מחדש בשפה החדשה: המיקוד חוזר לכפתור השפה (חשוב למקלדת ולקוראי מסך)
    if (where !== 'map') requestAnimationFrame(() => this.ui.langBtn?.focus({ preventScroll: true }));
  }

  setupSeason() {
    const season = detectSeason();
    if (!season) return;
    this.season = buildSeason(season, this.sm, this.fx);
    if (this.season) {
      this.sm.world.add(this.season.group);
      this.sm.onUpdate((dt, tt) => this.season.update(dt, tt));
      this.museum?.placeSeason();
      setTimeout(() => this.ui.toast(tn(season.he, season.en), { kind: 'gold', duration: 4200, icon: season.icon }), 2000);
    }
  }

  // ======================= עמדות שחקנים =======================
  placeStations(compact = this.compactStations !== false) {
    // compact: הדמויות והחיות יושבות צמוד ללוח (מעל ומתחת), כדי שהלוח ימלא את המסך
    if (compact) {
      this.avatars.w.place(-2.95, 5.78, 2.05);
      this.pets.w.place(2.95, 5.7, -2.0);
      this.avatars.b.place(2.95, -5.86, -0.34);
      this.pets.b.place(-2.95, -5.76, 0.38);
      Object.values(this.avatars).forEach((a) => a.group.scale.setScalar(1.12));
      Object.values(this.pets).forEach((p) => p.group.scale.setScalar(1.08));
    } else {
      this.avatars.w.place(-3.0, 6.4, 2.05);
      this.pets.w.place(3.0, 6.3, -2.0);
      this.avatars.b.place(3.0, -6.5, -0.34);
      this.pets.b.place(-3.0, -6.4, 0.38);
      Object.values(this.avatars).forEach((a) => a.group.scale.setScalar(1.3));
      Object.values(this.pets).forEach((p) => p.group.scale.setScalar(1.25));
    }
    this.applyStationMaterials();
  }

  applyStationMaterials() {
    const mats = this.currentEraMaterials();
    Object.values(this.avatars).forEach((a) => a.setEraMaterials(mats));
    Object.values(this.pets).forEach((p) => p.setEraMaterials(mats));
  }

  /** אווטאר אחד וחיה אחת שמטיילים איתך; מולך — הבוט של האי (לבוש, מראה וחיה בגוון משלו) או שחקן 2 */
  applyLoadout() {
    this.economy.expireTrials();
    const mine = { loadout: this.economy.loadout, look: {}, pet: this.economy.pet, petHue: this.economy.petHue, petScale: 1, petStage: this.economy.petStage(this.economy.pet) };
    const o = this.opponent || {};
    const opp = { loadout: o.loadout || getEra(this.kingdom.eraId || 1).opponent, look: o.look || {}, pet: o.pet || 'wolf_cub', petHue: o.petHue || 0, petScale: o.petScale || 1 };
    // העמדות לפי צבע: הלבן תמיד בצד של הלבן. אונליין כשחור — אתה יושב בצד השחור
    let W = mine, B = opp;
    if (this.mode === 'online' && this.myColor === 'b') { W = opp; B = mine; }
    if (this.mode === 'watch' && this.watchWhite) W = { ...this.watchWhite, look: {} };
    this.avatars.w.setLoadout(W.loadout || {});
    this.avatars.w.setLook(W.look || {});
    this.pets.w.setPet(W.pet || 'wolf_cub', { hue: W.petHue || 0, scale: W.petScale || 1, stage: W.petStage || 2 });
    this.avatars.b.setLoadout(B.loadout || {});
    this.avatars.b.setLook(B.look || {});
    this.pets.b.setPet(B.pet || 'wolf_cub', { hue: B.petHue || 0, scale: B.petScale || 1, stage: B.petStage || 2 });
    this.syncFlyingCompanion();
    this.refreshHud();
    this.refreshPetThumbs();
  }

  /** תמונה ממוזערת תלת-ממדית של חיות המחמד בכרטיסי השחקנים */
  refreshPetThumbs() {
    if (!this.thumbsReady) return;
    const o = this.opponent || {};
    this.thumbs.pet(this.economy.pet, 96, { hue: this.economy.petHue }).then(() => this.refreshHud()).catch(() => {});
    if (o.pet) this.thumbs.pet(o.pet, 96, { hue: o.petHue }).then(() => this.refreshHud()).catch(() => {});
    const ww = this.watchWhite;
    if (ww?.pet) this.thumbs.pet(ww.pet, 96, { hue: ww.petHue }).then(() => this.refreshHud()).catch(() => {});
  }
  petThumb(id, hue = 0) { const hh = Math.round(hue * 100) / 100; return this.thumbs.get(`pet:${id}${hh ? `:${hh}` : ''}`); }

  /** היריב: הבוט של האי הנוכחי, או "שחקן 2" במשחק נגד חבר */
  setupOpponentForMode() {
    if ((this.mode === 'online' || this.mode === 'watch') && this.online.room) {
      // משחק אונליין: היריב הוא החבר (שם, לבוש וחיה כפי שהוא נראה אצלו). בצפייה: הלבן מול השחור
      const r = this.online.room;
      const asOpp = (p, waiting) => ({
        name: p.name || (waiting ? t('waitingShort') : t('friend')), avatar: p.look.avatar || 'knight', pet: p.look.pet || 'wolf_cub', petHue: p.look.petHue || 0,
        loadout: p.look.loadout, look: {}, friend: true, online: p.online, joined: p.joined, uid: p.uid,
      });
      if (this.mode === 'watch') { this.watchWhite = asOpp(r.player('w')); this.opponent = asOpp(r.player('b')); }
      else { this.watchWhite = null; this.opponent = asOpp(r.player(this.myColor === 'w' ? 'b' : 'w'), !r.hasGuest); }
      return;
    }
    this.watchWhite = null;
    if (this.mode === 'local') {
      const ep = getEra(this.kingdom.eraId || 1).opponent;
      this.opponent = { name: tn('שחקן 2', 'Player 2'), avatar: 'knight', pet: ep.pet, loadout: ep, look: {} };
      return;
    }
    if (this.residentOpp && this.atHub) {
      // בוט שגר באי המרכזי והוזמן למשחק ליד השולחן (משחק אימון)
      const rd = islandDef(this.residentOpp), rb = rd.bot;
      this.opponent = {
        name: tn(rb.name.he, rb.name.en), title: tn(rb.title.he, rb.title.en), avatar: rb.emblem, islandId: rd.id,
        pet: rb.pet, petHue: rb.petHue, petScale: rb.petScale, loadout: rb.loadout, look: rb.look,
        rating: rb.rating, strength: rb.strength, isAI: true, boss: rd.boss, resident: true,
      };
      return;
    }
    const d = islandDef(this.islandId);
    if (d.id !== HUB_ID && this.progression.isConquered(d.id)) {
      // הבוט עבר לאי המרכזי, והאי נתפס על ידי פיראטי הזמן — באותה רמת קושי.
      // אחרי שמנצחים אותם הם מתארגנים מחדש: אפשר להתאמן נגדם, והפרס חוזר כשהם נוחתים שוב.
      const p = pirateCrew(d.id, this.progression.pirateCrewIndex(d.id));
      const practice = !this.progression.hasPirates(d.id);
      this.opponent = {
        name: tn(p.name.he, p.name.en), title: tn(p.title.he, p.title.en), avatar: 'swords', islandId: d.id,
        pet: p.pet, petHue: p.petHue, petScale: p.petScale, loadout: p.loadout, look: p.look,
        rating: p.rating, strength: p.strength, isAI: true, boss: d.boss, pirates: true, practice,
      };
      return;
    }
    const b = d.bot;
    this.opponent = {
      name: tn(b.name.he, b.name.en), title: tn(b.title.he, b.title.en), avatar: b.emblem, islandId: d.id,
      pet: b.pet, petHue: b.petHue, petScale: b.petScale, loadout: b.loadout, look: b.look,
      rating: b.rating, strength: b.strength, isAI: true, boss: d.boss,
    };
  }

  // ======================= HUD =======================
  refreshHud() {
    if (!this.ui) return;
    const id = this.islandId;
    const d = islandDef(id);
    const pr = this.progression;
    const front = pr.frontier();
    const lock = pr.lockReason();
    let next = '';
    if (id === HUB_ID) next = `${t('museumPieces')}: ${pr.conqueredCount()}`;
    else if (this.opponent?.pirates && !this.opponent.practice) next = t('piratesHere');
    else if (this.opponent?.pirates) next = t('piratesReturn').replace('{t}', fmtDur(pr.pirateReturnIn(id)));
    else next = t('beatToConquer');
    this.ui.setIsland({
      id, name: id === HUB_ID ? t('hubName') : islandLabel(id), regionName: tn(d.era.he, d.era.en), boss: d.boss, region: regionOf(id),
      conquered: pr.conqueredCount(), total: ISLAND_COUNT, frontier: front, next, lock, pirates: !!this.opponent?.pirates,
    });
    const prof = this.store.get('profile');
    const cap = this.game.captured();
    const turn = this.game.turn;
    const check = this.game.inCheck() && !this.game.result;
    const me = this.mode === 'local' || this.mode === 'watch' ? 'w' : this.myColor;
    const op = me === 'w' ? 'b' : 'w';
    const advFor = (color) => { const m = color === 'w' ? cap.material : -cap.material; return m > 0 ? m : 0; };
    const capStr = (color) => cap.by[color].map((p) => GLYPH[color === 'w' ? 'b' : 'w'][p] + TXT).join('');
    const o = this.opponent || {};
    const era = getEra(pr.displayEra(id));
    let status = '';
    const room = (this.mode === 'online' || this.mode === 'watch') ? this.online.room : null;
    const colorName = (c) => (c === 'w' ? t('white') : t('black'));
    if (this.game.result) status = this.resultText().title;
    else if (room && !room.hasGuest) status = t('waitingFriend');
    else if (check) status = t('check');
    else if (this.thinking) status = this.mode === 'ai' ? tn(era.thinking, era.thinkingEn) : t('thinking');
    else if (this.mode === 'online') status = turn === me ? t('yourTurn') : t('friendTurn');
    else if (this.mode === 'watch') status = `${t('turnOf')} ${colorName(turn)}`;
    else status = t('yourTurn');
    const watchers = room && room.spectators ? ` · ${t('spectatorsN').replace('{n}', String(room.spectators))}` : '';
    if (this.mode === 'watch') {
      const ww = this.watchWhite || {};
      this.ui.setPlayer('me', {
        name: ww.name || '', avatar: ww.avatar || 'knight', petImg: ww.pet ? this.petThumb(ww.pet, ww.petHue) : null,
        sub: `${t('white')}${room.player('w').joined && !room.player('w').online ? ` · ${t('friendOffline')}` : ''}`, captured: capStr('w'), adv: advFor('w'),
        active: turn === 'w' && !this.game.result, check: check && turn === 'w', status,
      });
    } else {
      this.ui.setPlayer('me', {
        name: this.mode === 'local' ? tn('שחקן 1', 'Player 1') : prof.name, avatar: prof.avatar, petImg: this.petThumb(this.economy.pet, this.economy.petHue),
        sub: room ? `${colorName(me)}${watchers}` : `${colorName(me)} · ${this.store.get('rating')}`, captured: capStr(me), adv: advFor(me),
        active: turn === me && !this.game.result, check: check && turn === me, status,
      });
    }
    const oppLive = room ? room.player(op) : null; // נוכחות חיה (לא מהרגע שהחבר נכנס)
    const oppSub = room
      ? `${colorName(op)}${!oppLive?.joined ? '' : ` · ${oppLive.online ? t('friendOnline') : t('friendOffline')}`}${this.mode === 'watch' ? watchers : ''}`
      : (o.title ? `${o.title} · ${o.rating}` : colorName(op));
    this.ui.setPlayer('opp', {
      name: o.name || '', avatar: o.avatar || 'knight', petImg: o.pet ? this.petThumb(o.pet, o.petHue) : null, isBot: this.mode === 'ai',
      sub: oppSub, captured: capStr(op), adv: advFor(op),
      active: turn === op && !this.game.result, check: check && turn === op, status,
    });
    const showClock = !!this.game.clock;
    this.ui.setClock('me', this.game.clockLeft(me), showClock);
    this.ui.setClock('opp', this.game.clockLeft(op), showClock);
    this.ui.setStatus(status, check);
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
      if (flag) this.endGame(this.game.finish(flag === 'w' ? 'b' : 'w', 'timeout'));
      const low = this.game.clockLeft(this.game.turn);
      if (low !== null) this.updateTension(low < 20000 ? 0.3 : 0);
    }, 200);
  }

  updateTension(extra = 0) {
    const cap = this.game.captured();
    const ten = 0.15 + (this.game.inCheck() ? 0.45 : 0) + Math.min(0.3, Math.abs(cap.material) / 25) + extra + (this.game.ply > 60 ? 0.1 : 0);
    this.sound.setTension(ten);
  }

  // ======================= בועות דיבור של הבוט =======================
  botSay(event, force = false) {
    if (this.mode !== 'ai' || !this.opponent?.islandId) return;
    const now = performance.now();
    if (!force && now - this.lastSay < 3800) return;
    const line = this.opponent.pirates ? pirateLine(event) : botLine(this.opponent.islandId, event);
    if (!line) return;
    this.lastSay = now;
    const p = this.avatars.b.group.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 2.9, 0));
    this.ui.speech(tn(line[0], line[1]), this.sm.projectToScreen(p), this.opponent.name);
  }

  // ======================= קלט =======================
  bindInput() {
    const canvas = this.sm.canvas;
    let start = null;
    let pointers = 0;
    this.root.addEventListener('pointerdown', (e) => {
      if (e.target !== canvas || this.map.isOpen) return;
      pointers++;
      if (pointers === 1) {
        // נגיעה על הלוח: המצלמה לא זזה בכלל (רק בוחרים כלים). גרירה מחוץ ללוח: טיול חופשי
        const onBoard = this.board.hitsBoard(e.clientX, e.clientY);
        this.sm.setGestureBlocked(onBoard);
        start = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId };
      } else start = null;
    }, { capture: true });
    const end = (e) => {
      if (this.map.isOpen) { start = null; pointers = 0; return; }
      if (e.target !== canvas && !start) { pointers = Math.max(0, pointers - 1); return; }
      pointers = Math.max(0, pointers - 1);
      if (pointers === 0) this.sm.setGestureBlocked(false);
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
    canvas.addEventListener('keydown', (e) => { if (!this.map.isOpen) this.onKey(e); });
    canvas.addEventListener('focus', () => { if (this.map.isOpen) return; this.board.setCursor(this.cursor); this.ui.announce(t('keyboardHelp')); });
    canvas.addEventListener('blur', () => this.board.setCursor(null));
  }

  onKey(e) {
    const files = 'abcdefgh';
    let f = files.indexOf(this.cursor[0]), r = parseInt(this.cursor[1], 10) - 1;
    const flip = this.viewSide() === 'b' ? -1 : 1;
    let handled = true;
    switch (e.key) {
      case 'ArrowUp': r += flip; break;
      case 'ArrowDown': r -= flip; break;
      case 'ArrowLeft': f -= flip; break;
      case 'ArrowRight': f += flip; break;
      case 'Enter': case ' ': this.kbInput = true; this.onSquare(this.cursor); this.kbInput = false; break;
      case 'Escape': this.deselect(); break;
      default: handled = false;
    }
    if (!handled) return;
    e.preventDefault();
    f = Math.max(0, Math.min(7, f)); r = Math.max(0, Math.min(7, r));
    this.cursor = files[f] + (r + 1);
    this.board.setCursor(this.cursor);
    const p = this.game.pieceAt(this.cursor);
    // [a11y] square + piece ("e2 — white pawn"), plus "legal move" when a selected piece can go there
    const canGo = this.selected && this.game.legalFrom(this.selected).some((m) => m.to === this.cursor);
    this.ui.announce(`${this.cursor}${p ? ` — ${this.a11yPiece(p.color, p.type)}` : ''}${canGo ? ` · ${t('a11yTarget')}` : ''}`);
  }

  /** משבצות "מועדפות" לבחירה במגע (עוזר כשהאצבע נוחתת בין משבצות) */
  preferredSquares() {
    if (!this.canAct()) return null;
    if (this.selected) return new Set(this.game.legalFrom(this.selected).map((m) => m.to));
    return new Set(this.game.chess.moves({ verbose: true }).map((m) => m.from));
  }

  onTap(x, y) {
    if (this.introPlaying) return;
    // באי המרכזי: נגיעה בבית הקולנוע, בחנות הכללית או באחת מחנויות הלבוש שסביב הלוח
    let bld = this.atHub && !this.busy ? this.museum.pick(x, y) : null;
    // החיה המעופפת לא "גונבת" נגיעות מהלוח (למשל כשהיא צוללת מעליו)
    if (bld === 'shop_sky' && this.board.hitsBoard(x, y)) bld = null;
    if (bld === 'cinema') { this.sound.ui(); this.openCinema(); return; }
    if (bld === 'shop_sky') { if (this.museum.sky?.loopT >= 0) return; this.sound.ui(); this.museum.skyLoop(); setTimeout(() => { if (this.atHub && !this.ui.modalOpen) this.openShop('sky', null, true); }, 600); return; }
    if (bld === 'shop_gifts') { this.sound.ui(); this.openDaily(); return; }
    if (bld === 'shop_boards' || bld === 'shop_pets' || bld === 'shop_premium') { this.sound.ui(); this.openShop(bld.slice(5), null, true); return; }
    if (bld?.startsWith('shop_')) { this.sound.ui(); this.openShop('wardrobe', bld.slice(5), true); return; }
    if (bld === 'museum') { this.sound.ui(); M.openAlbum(this); return; }
    if (this.sm.overviewOn) { if (this.board.hitsBoard(x, y)) { this.sound.ui(); this.sm.toGameplay(1.1, this.viewSide()); } return; }
    // בכל אי: מורחקים מהלוח (צביטה / סיבוב) — נגיעה בלוח רק מחזירה אותו לגודל הכי טוב לשחק, בלי לבחור כלי בטעות
    if (this.sm.isFarFromGameplay() && this.board.hitsBoard(x, y)) { this.sound.ui(); this.deselect(); this.sm.toGameplay(0.9, this.viewSide()); return; }
    const sq = this.board.pickSquare(x, y, this.preferredSquares());
    if (!sq) { if (this.selected) this.deselect(); return; }
    this.onSquare(sq);
  }

  canAct() {
    if (this.busy || this.game.result || this.ui.modalOpen || this.map.isOpen) return false;
    if (this.mode === 'local') return true;
    if (this.mode === 'watch') return false;
    if (this.mode === 'online' && !this.online.room?.hasGuest) return false;
    return this.game.turn === this.myColor;
  }

  onSquare(sq) {
    if (!this.canAct()) { if (!this.busy && !this.ui.modalOpen && !this.game.result) this.sound.illegal(); if (this.kbInput && !this.ui.modalOpen && !this.game.result) this.ui.announce(t('a11yNotYourTurn')); return; }
    const piece = this.game.pieceAt(sq);
    const turn = this.game.turn;
    if (this.selected) {
      const moves = this.game.legalFrom(this.selected);
      const mv = moves.find((m) => m.to === sq);
      if (mv) { this.playerMove(mv); return; }
      if (piece && piece.color === turn) { this.select(sq); return; }
      this.sound.illegal();
      this.board.shakeSelected();
      if (this.kbInput) this.ui.announce(t('a11yIllegal'));
      this.deselect();
      return;
    }
    if (piece && piece.color === turn) this.select(sq);
    else { this.sound.illegal(); if (this.kbInput) this.ui.announce(t('a11yIllegal')); }
  }

  select(sq) {
    const moves = this.game.legalFrom(sq);
    if (!moves.length) { this.sound.illegal(); return; }
    // בוחרים כלי אחרי טיול חופשי — חוזרים בעדינות לזווית המשחק הטובה
    if (this.sm.freeLook && !this.sm.panoramaOn && !this.sm.animatingCamera) this.sm.toGameplay(0.8, this.viewSide());
    this.selected = sq;
    this.board.select(sq, moves);
    const sp = this.game.pieceAt(sq);
    if (sp) this.ui.say?.(t('a11ySelected').replace('{piece}', this.a11yPiece(sp.color, sp.type)).replace('{sq}', sq).replace('{n}', String(moves.length)));
    this.sound.pickup(this.panOf(sq));
    const w = this.board.squareWorld(sq);
    Object.values(this.pets).forEach((p) => p.lookAt(w));
    Object.values(this.avatars).forEach((a) => a.lookAt(w));
    this.tutorial.onSelect();
  }

  deselect() { this.selected = null; this.board.clearSelection(); }

  // [a11y] screen-reader wording for pieces and moves (in the current language, with Hebrew gender agreement)
  a11yPiece(color, type) { return t('a11yPcs').split('|')[(color === 'b' ? 6 : 0) + 'pnbrqk'.indexOf(type)] || type; }

  a11yMoveText(mv) {
    const side = mv.color === 'w' ? t('white') : t('black');
    let s;
    if (mv.flags?.includes('k') || mv.flags?.includes('q')) s = t(mv.flags.includes('k') ? 'a11yCastleK' : 'a11yCastleQ').replace('{side}', side);
    else {
      s = t('a11yMove').replace('{piece}', this.a11yPiece(mv.color, mv.piece)).replace('{from}', mv.from).replace('{to}', mv.to);
      if (mv.captured) s += t(mv.piece === 'q' ? 'a11yTakesF' : 'a11yTakesM').replace('{piece}', this.a11yPiece(mv.color === 'w' ? 'b' : 'w', mv.captured));
      if (mv.promotion) s += t('a11yPromo').replace('{piece}', t('a11yPromoNames').split('|')['pnbrqk'.indexOf(mv.promotion)] || mv.promotion);
    }
    const c = this.game.chess;
    if (c?.isCheckmate?.()) s += t('a11yMate');
    else if (this.game.inCheck()) s += t('a11yCheck');
    return s;
  }

  panOf(sq) {
    const [x] = squareToXZ(sq);
    return (this.viewSide() === 'w' ? x : -x) / 5;
  }

  viewSide() { return this.mode === 'local' ? this.game.turn : this.mode === 'watch' ? 'w' : this.myColor; }
  isAITurn() { return !this.game.result && this.mode === 'ai' && this.game.turn !== this.myColor; }
  isSafe() { return !(this.busy || this.thinking); }
  isLocalHuman(color) { return this.mode === 'local' || (this.mode !== 'watch' && color === this.myColor); }

  hopHooks(mover, pan) {
    const victim = mover === 'w' ? 'b' : 'w';
    return {
      onCapture: () => {
        this.sound.capture(pan);
        this.life.react('capture');
        this.pets[mover].react('capture');
        this.pets[victim].react('lost');
        if (this.isLocalHuman(mover)) this.achievements.count('captures');
        if (this.mode === 'ai' && Math.random() < 0.6) setTimeout(() => this.botSay(mover === this.myColor ? 'lost' : 'capture'), 500);
      },
      onLand: (cap) => { if (!cap) this.sound.move(pan); },
    };
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

  async applyMove(m, { local = false } = {}) {
    const before = this.game.fen;
    const histBefore = this.game.beforeFens();
    const mv = this.game.move(m);
    if (!mv) { this.resyncBoard(); return null; }
    if (local && this.mode === 'online') this.online.sendMove();
    this.busy = true;
    this.board.clearHint();
    const mover = mv.color, victim = mover === 'w' ? 'b' : 'w';
    const pan = this.panOf(mv.to);
    const target = this.board.squareWorld(mv.to);
    Object.values(this.pets).forEach((p) => p.lookAt(target));
    Object.values(this.avatars).forEach((a) => a.lookAt(target));
    this.avatars[mover].command();
    if (!local) this.sound.pickup(pan);
    await this.board.animateMove(mv, this.hopHooks(mover, pan));
    this.board.setLastMove(mv.from, mv.to);
    this.expansion.onMove(mv);
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
      if (this.mode === 'ai' && mover !== this.myColor && !this.game.result) setTimeout(() => this.botSay('check'), 400);
    } else this.board.setCheck(null);
    this.ui.say?.(this.a11yMoveText(mv)); // [a11y] every move (yours, the bot's, your friend's), incl. check / mate
    this.queueReview(before, histBefore, mv);
    await this.afterMove();
    return mv;
  }

  /** הזנב המשותף של כל מהלך: שמירה, מתח מוזיקלי, HUD, סיום / היפוך מצלמה / תור הבוט */
  async afterMove() {
    this.saveGame();
    this.updateTension();
    this.refreshHud();
    if (this.game.result) {
      this.busy = false;
      await this.endGame(this.game.result);
      return;
    }
    if (this.mode === 'local') await this.sm.flipTo(this.game.turn);
    this.busy = false;
    this.refreshHud();
    if (this.isAITurn()) this.opponentMove();
  }

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
    const gameId = this.gameId;
    let res;
    try {
      const hist = this.game.history();
      res = await this.ai.think({ fen: this.game.fen, history: hist.map((x) => x.before), uci: hist.map((x) => x.lan), strength: this.opponent?.strength ?? 0 });
    } catch { res = null; }
    const wait = Math.max(0, 450 - (performance.now() - t0));
    await sleep(wait);
    this.thinking = false;
    if (gameId !== this.gameId || this.game.result || !this.isAITurn()) { this.refreshHud(); return; }
    let move = res?.move;
    const legal = this.game.chess.moves({ verbose: true });
    if (!move || !legal.some((x) => x.from === move.from && x.to === move.to)) move = legal[Math.floor(Math.random() * legal.length)];
    if (!move) return;
    await this.applyMove({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
  }

  // ======================= ניתוח מהלכים =======================
  queueReview(beforeFen, histBefore, mv) {
    const ply = this.game.ply;
    const gameId = this.gameId;
    const game = this.game;
    this.reviewQueue = this.reviewQueue.then(async () => {
      try {
        const [best, after] = [await this.ai.analyze({ fen: beforeFen, history: histBefore, timeMs: 260, maxDepth: 6 }), await this.ai.analyze({ fen: mv.after, history: [...histBefore, beforeFen], timeMs: 260, maxDepth: 6 })];
        if (gameId !== this.gameId) return;
        const bestCp = clampCp(best.score);
        const playedCp = after.move === null ? (after.mate ? 1500 : 0) : clampCp(-after.score);
        const isBest = !!best.move && best.move.from === mv.from && best.move.to === mv.to;
        const loss = Math.max(0, bestCp - playedCp);
        let sacrifice = false;
        if (isBest && PIECE_VALUE[mv.piece] >= 3 && !game.result) {
          const opp = mv.color === 'w' ? 'b' : 'w';
          try { sacrifice = game.isAttacked(mv.to, opp) && !game.isAttacked(mv.to, mv.color) && loss <= 20 && playedCp > -100; } catch { sacrifice = false; }
        }
        const cls = classifyMove(loss, { isBest, sacrifice });
        const acc = moveAccuracy(bestCp, playedCp);
        game.reviews[ply] = { ply, color: mv.color, san: mv.san, loss, cls, acc, bestCp, playedCp };
        if (this.isLocalHuman(mv.color) && !game.result) this.showMoveBadge(cls, mv.to, ply);
        if (cls === 'brilliant' && this.isLocalHuman(mv.color)) this.achievements.unlock('brilliant');
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
    if (!r) return { title: '', icon: '' };
    const reason = t(`reason_${r.reason}`);
    if (!r.winner) return { title: t('draw'), icon: 'handshake', reason };
    if (this.mode === 'local' || this.mode === 'watch') return { title: `${r.winner === 'w' ? t('white') : t('black')} — ${t('victory')}`, icon: 'crown', reason };
    return r.winner === this.myColor ? { title: t('victory'), icon: 'trophy', reason } : { title: t('defeat'), icon: 'shield', reason };
  }

  /** כוכבים: ניצחון = 1 · דיוק 75%+ = 2 · דיוק 85%+ בפחות מ-40 מהלכים = 3 */
  starsFor(acc, plies) {
    const moves = Math.ceil(plies / 2);
    if (acc !== null && acc >= 85 && moves < 40) return 3;
    if (acc !== null && acc >= 75) return 2;
    return 1;
  }

  async endGame(result) {
    if (!result || this.ending) return;
    try {
      await this.finishGame(result);
    } catch (e) {
      console.error('endGame', e);
      this.busy = false;
      this.ending = false;
      this.refreshHud();
    }
  }

  async finishGame(result) {
    this.ending = true;
    this.busy = true;
    this.thinking = false;
    this.deselect();
    this.store.set({ savedGame: null });
    const winner = result.winner;
    const plies = this.game.ply;
    const vsBot = this.mode === 'ai';
    const online = this.mode === 'online' || this.mode === 'watch';
    if (this.mode === 'online') this.online.reportResult(result);
    const iWon = winner && this.mode !== 'watch' && (this.mode === 'local' || winner === this.myColor);
    const iLost = winner && !iWon && this.mode !== 'watch';
    const islandId = this.islandId;
    // מט קולנועי
    if (result.reason === 'checkmate') {
      const loser = winner === 'w' ? 'b' : 'w';
      const ks = this.game.kingSquare(loser);
      this.sound.checkmate();
      const kw = this.board.squareWorld(ks);
      this.sm.animateCamera(this.sm.camera.position.clone().lerp(kw, 0.35).add(new THREE.Vector3(0, 1.5, 0)), kw, 1.6, 'power2.inOut');
      await Promise.race([this.board.toppleKing(ks), sleep(3000)]);
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
    if (vsBot && winner) setTimeout(() => this.botSay(iWon ? 'lose' : 'win', true), 900);

    // דיוק (לכוכבים ולסיכום)
    await this.waitReviews(result.reason === 'resign' ? 1200 : 3500);
    const rv = this.game.reviews.filter(Boolean);
    const myColor = this.mode === 'local' ? 'w' : this.myColor;
    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b.acc, 0) / arr.length : null);
    const acc = { me: avg(rv.filter((r) => r.color === myColor)), opp: avg(rv.filter((r) => r.color !== myColor)) };
    const keyMoments = rv.filter((r) => ['brilliant', 'blunder', 'mistake'].includes(r.cls)).sort((a, b) => (b.cls === 'brilliant') - (a.cls === 'brilliant') || b.loss - a.loss).slice(0, 4)
      .map((r) => ({ moveNo: Math.ceil(r.ply / 2), san: r.san, color: r.color, label: t(r.cls) }));

    // פרסים
    let gems = 0, stageMsg = '';
    const island = vsBot ? { id: islandId, first: false, stars: 0, prevStars: this.progression.starsOf(islandId) } : null;
    const stats = { wins: this.store.get('wins'), losses: this.store.get('losses'), draws: this.store.get('draws') };
    if (online) {
      // משחק ידידותי אונליין: בלי יהלומים ובלי דירוג (שלא יהיה "חוות ניצחונות" עם חבר)
      if (this.mode === 'online' && plies >= 2) this.achievements.unlock('online1');
      stageMsg = this.mode === 'online' ? t('friendlyMatch') : '';
    } else if (iWon) {
      stats.wins++;
      this.achievements.unlock('first_win');
      if (result.reason === 'checkmate' && Math.ceil(plies / 2) < 20) this.achievements.unlock('fast_mate');
      this.achievements.count('streak');
      if (this.achievements.counters.streak >= 3) this.achievements.unlock('streak3');
    } else if (iLost) { stats.losses++; this.achievements.resetStreak(); } else stats.draws++;
    if (!online) this.store.set(stats);
    if (this.mode === 'local') {
      this.achievements.unlock('pass_play');
      if (winner && plies >= RULES.antiFarmPlies) { gems = ECONOMY.friendWinGems; this.economy.addGems(gems, 'friend'); }
      else if (winner) stageMsg = t('antiFarm');
    }
    const petGain = this.awardPetXp({ vsBot, iWon, iLost, plies, reason: result.reason, myColor });
    const evolved = petGain && petGain.stageAfter > petGain.stageBefore;
    if (evolved) this.celebratePetEvolution(petGain);
    await sleep((result.reason === 'resign' ? 500 : 1400) + (evolved ? 2200 : 0));
    // בוסט יהלומים כפולים (קנייה שבועית) — חל על ניצחונות נגד בוטים ופיראטים
    const gemMult = this.economy.gemMultiplier();
    if (vsBot && iWon) {
      // דירוג
      const my = this.store.get('rating');
      const exp = 1 / (1 + Math.pow(10, ((this.opponent?.rating || 1200) - my) / 400));
      this.store.set({ rating: Math.round(my + 24 * (1 - exp)) });
      if (this.opponent?.resident) stageMsg = t('residentPractice');
      else if (this.opponent?.pirates) {
        island.pirates = true;
        if (this.opponent.practice) stageMsg = t('practiceNoGems');
        else {
          // הפיראטים בורחים — יהלומים, והאי שקט עד שצוות חדש נוחת
          gems = pirateGems(islandId) * gemMult;
          this.economy.addGems(gems, 'pirates');
          this.progression.defeatPirates(islandId);
          stageMsg = t('piratesFled');
          this.achievements.unlock('pirates1');
          if (this.progression.piratesBeaten() >= 10) this.achievements.unlock('pirates10');
        }
      } else {
        const res = this.progression.conquer(islandId);
        island.first = res.first;
        gems = (res.first ? conquestGems(islandId) : repeatGems(islandId)) * gemMult;
        this.economy.addGems(gems, res.first ? 'conquest' : 'win');
        island.stars = this.starsFor(acc.me, plies);
        const gained = this.progression.setStars(islandId, island.stars);
        if (gained) this.checkStarMilestones();
        if (res.first) {
          this.syncWhiteFlag(islandId, { raise: true });
          this.ui.toast(`${t('islandConquered')}: ${islandLabel(islandId)}`, { kind: 'gold', duration: 3500, icon: 'flag' });
          if (islandId !== HUB_ID) { stageMsg = t('pieceToMuseum'); this.store.set({ pendingDocks: [...(this.store.get('pendingDocks') || []), islandId] }); }
          if ((this.opponent?.rating || 0) >= 2050) this.achievements.unlock('beat_hard');
          this.checkIslandAchievements();
          this.grantEarnedSkins(true);
          this.grantEarnedSkyPets(true);
          // עולם שלם נכבש → תיבת אוצר
          const r = regionOf(islandId);
          if (this.progression.regionConquered(r) === regionIslands(r).length) { const chest = this.economy.openRoyalChest(); this.ui.toast(`${t('regionComplete')} · ${t('royalChest')}`, { kind: 'gold', duration: 4200, icon: 'chest' }); if (chest?.id) this.applyLoadout(); }
          if (isBoss(islandId)) this.achievements.unlock('boss1');
        }
      }
    } else if (vsBot && iLost) {
      const my = this.store.get('rating');
      const exp = 1 / (1 + Math.pow(10, ((this.opponent?.rating || 1200) - my) / 400));
      this.store.set({ rating: Math.max(100, Math.round(my - 24 * exp)) });
    }
    const rt = this.resultText();
    this.busy = false;
    this.ending = false;
    this.sm.toGameplay(1.2, this.viewSide());
    const front = this.progression.frontier();
    M.openSummary(this, {
      ...rt, reason: rt.reason, gems, stageMsg, acc, keyMoments, canReplay: plies >= 4, vsBot, won: !!iWon && vsBot,
      island, nextId: front && front !== islandId ? front : null, online: online ? this.mode : null, boosted: gemMult > 1 && vsBot && iWon, petGain,
    });
    this.refreshHud();
  }

  /**
   * חיות שגדלות: ניסיון לחיה המלווה בסוף כל קרב (לא בצפייה; עם חבר — רק אחרי מספיק מהלכים).
   * ניצחון 12 / תיקו 6 / הפסד 4, +1 לכל כלי שהכית (עד 6), +6 על מט מהיר. משחק על אותו מכשיר — 6 (שני הצדדים שלך).
   */
  awardPetXp({ vsBot, iWon, iLost, plies, reason, myColor }) {
    if (this.mode === 'watch' || plies < (vsBot ? 2 : RULES.antiFarmPlies)) return null;
    const X = PET_GROWTH.xp, local = this.mode === 'local';
    const caps = (this.game.captured?.()?.by?.[myColor] || []).length;
    const fast = !local && iWon && reason === 'checkmate' && Math.ceil(plies / 2) < ECONOMY.fastMateMaxMoves;
    const xp = (local ? X.draw : iWon ? X.win : iLost ? X.loss : X.draw) + Math.min(X.capMax, caps) * X.capture + (fast ? X.fastMate : 0);
    return this.economy.addPetXp(this.economy.pet, xp);
  }

  /** החיה עלתה שלב: מסתחררת בנצנצים, גדלה מול העיניים, והודעה */
  celebratePetEvolution(g) {
    const side = this.mode === 'online' && this.myColor === 'b' ? 'b' : 'w';
    this.pets[side].evolve(g.stageAfter, { hue: this.economy.petHue, scale: 1 });
    // חיה מעופפת באי המרכזי חגה מעל העיר (אין לה כן) — היא עושה לולאה עם נצנצים בשמיים
    if (!this.pets[side].group.visible) setTimeout(() => this.museum?.skyLoop?.(), 300);
    this.sound.jackpot?.();
    setTimeout(() => this.ui.toast(`${t('petEvolved')} ${shortName(g.id)} · ${t(`petStage${g.stageAfter}`)}`, { kind: 'gold', icon: 'paw', duration: 4400 }), 1000);
    this.refreshPetThumbs();
  }

  /** אחרי רכישת איי הפרימיום: הדרקון מתחיל לרחף מעל האי המרכזי, המפה והסרגל מתעדכנים */
  onPremiumUnlocked() {
    this.museum.syncDragon?.();
    if (this.map.isOpen) this.map.refresh();
    this.refreshHud();
    setTimeout(() => this.ui.toast(tn('דרקון השעונים הזהוב הצטרף אליך!', 'The Golden Clockwork Dragon joined you!'), { kind: 'gold', icon: 'dragon', duration: 3800 }), 1400);
  }

  /** סקין לוח חינמי על כל 20 איים שנכבשים (20/40/60/80/100/120) — עם הודעה כשנפתח חדש */
  grantEarnedSkins(announce = true) {
    const fresh = this.economy.grantEarnedSkins(this.progression.conqueredCount());
    if (announce) {
      fresh.forEach((sk, i) => setTimeout(() => {
        this.ui.toast(`${tn('סקין לוח חדש נפתח!', 'New board skin unlocked!')} ${tn(sk.he, sk.en)}`, { kind: 'gold', duration: 4200, icon: 'gem' });
        this.sound.notify?.();
      }, 2400 + i * 1600));
    }
    return fresh;
  }

  /** חיה מעופפת חינמית על כל 10 איים שנכבשים (10/20/…/90) — עם הודעה; היא מצטרפת לחיה שחגה מעל העיר */
  grantEarnedSkyPets(announce = true) {
    const fresh = this.economy.grantEarnedSkyPets(this.progression.conqueredCount());
    if (announce) {
      fresh.forEach((id, i) => setTimeout(() => {
        this.ui.toast(`${t('skyPetUnlocked')} ${shortName(id)} — ${t('skyWaiting')}`, { kind: 'gold', duration: 4600, icon: 'wing' });
        this.sound.notify?.();
      }, 4400 + i * 1800));
    }
    return fresh;
  }

  checkIslandAchievements() {
    const n = this.progression.conqueredCount();
    if (n >= 5) this.achievements.unlock('island5');
    if (n >= 25) this.achievements.unlock('island25');
    if (n >= 50) this.achievements.unlock('island50');
    if (this.progression.baseConqueredCount() >= BASE_ISLANDS) this.achievements.unlock('island99');
    if (n >= ISLAND_COUNT) this.achievements.unlock('island129');
    if (n >= 10) this.achievements.unlock('base_done');
    const mx = this.progression.maxEraReached();
    if (mx >= 2) this.achievements.unlock('era2');
    if (mx >= 3) this.achievements.unlock('era3');
    if (mx >= 5) this.achievements.unlock('era5');
  }

  /** כל 25 כוכבים — מענק יהלומים */
  checkStarMilestones() {
    const total = this.progression.totalStars();
    const claimed = this.progression.starRewardsClaimed();
    const due = Math.floor(total / STAR_MILESTONE);
    if (due > claimed) {
      const n = due - claimed;
      this.progression.setStarRewardsClaimed(due);
      this.economy.addGems(STAR_MILESTONE_GEMS * n, 'stars');
      setTimeout(() => this.ui.toast(`${t('starMilestone')} ${due * STAR_MILESTONE} · +${STAR_MILESTONE_GEMS * n}`, { kind: 'gold', duration: 3800, icon: 'star' }), 1800);
    }
  }

  rematch() {
    if (this.mode === 'online') { this.online.requestRematch(); return; }
    if (this.mode === 'watch') return;
    if (this.mode === 'local') this.startFriendGame(this.store.get('timeControl'));
    else this.newBattle({ confirm: false });
  }

  /** הילוך חוזר קולנועי של 8 המסעים האחרונים */
  async replayFinale() {
    const hist = this.game.history();
    const n = Math.min(8, hist.length);
    const start = hist[hist.length - n];
    if (!start) return;
    this.busy = true;
    const tmp = new Chess(start.before);
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

  // ======================= איים: מפה, טיול, קרבות =======================
  openMap(focus) {
    if (this.busy) { this.ui.toast(t('waitMove')); return; }
    this.ui.closeAll();
    this.deselect();
    this.map.open({ focus });
  }
  buildMapUi(map) { return buildMapUi(this, map); }

  /**
   * מסע לאי: האווטאר רוכב על החיה במפה (בדרך הכניסה של אי היעד), ענני מעבר,
   * ואז המצלמה צוללת מגובה אל הלוח של האי — והבוט מברך אותך.
   */
  async travelTo(id, { battle = true, overview = false } = {}) {
    if (this.busy || this.traveling) return;
    const pr = this.progression;
    if (!pr.isUnlocked(id)) { this.ui.toast(t('lockedBeatPrev').replace('{n}', String(id - 1)), { kind: 'bad', icon: 'lock' }); return; }
    if (pr.needsFullGame(id)) { M.openFullGame(this, () => this.travelTo(id, { battle, overview })); return; }
    const from = pr.currentIsland();
    if (id !== from && !(await this.confirmLeave())) return;
    this.traveling = true;
    this.busy = true;
    this.deselect();
    try {
      if (id !== from) {
        if (!this.map.isOpen) {
          await CloudWipe.cover(0.5);
          this.map.open({ focus: from, travel: true });
          await CloudWipe.reveal(0.55);
        }
        await this.map.travel(from, id);
        await CloudWipe.cover(0.45);
        this.map.close();
      } else {
        await CloudWipe.cover(0.4);
        if (this.map.isOpen) this.map.close();
      }
      pr.setCurrent(id);
      pr.visit(id); // הערפל ירד מהאי; אם לא תכבוש אותו — במפה תהיה סביבו הילה של הבוט ששולט בו
      this.ui.setDock(id === HUB_ID);
      this.showIsland(id);
      if (battle) await this.startIslandBattle({ quiet: true });
      else { this.setupOpponentForMode(); this.applyLoadout(); }
      this.refreshHud();
      // זום אאוט: מבט רחב על כל האי → צלילה אל הלוח (נגיעה מדלגת)
      const intro = this.playIslandIntro(id, { overview });
      CloudWipe.reveal(0.75);
      await intro;
      if (!overview) setTimeout(() => this.botSay('intro', true), 500);
    } finally {
      this.busy = false;
      this.traveling = false;
    }
    if (id === HUB_ID) this.dockPending();
  }

  /** פתיחה קולנועית של האי: הסרגלים נעלמים, מבט רחב עם שם האי, ואז צלילה אל הלוח. נגיעה מדלגת */
  playIslandIntro(id = this.islandId, { overview = false } = {}) {
    const d = islandDef(id);
    this.introPlaying = true;
    this.root.classList.add('intro');
    const skip = () => this.sm.skipIntro();
    this.root.addEventListener('pointerdown', skip, { capture: true });
    const title = setTimeout(() => this.ui.eraTitle(`${t('island')} ${id}${d.boss ? ` · ${t('boss')}` : ''}`, id === HUB_ID ? t('hubName') : islandLabel(id), `${tn(d.bot.title.he, d.bot.title.en)} ${tn(d.bot.name.he, d.bot.name.en)} · ${d.bot.rating}`, { top: true }), 350);
    this.introPromise = this.sm.islandIntro(this.viewSide(), { overview, onDive: () => this.root.classList.remove('intro') })
      .finally(() => {
        clearTimeout(title);
        this.root.removeEventListener('pointerdown', skip, { capture: true });
        this.root.classList.remove('intro');
        this.introPlaying = false;
      });
    return this.introPromise;
  }

  /** מריץ אחרי שהפתיחה הקולנועית הסתיימה (או מיד, אם אין פתיחה) */
  afterIntro(fn, delay = 0) {
    Promise.resolve(this.introPromise).catch(() => {}).then(() => setTimeout(fn, delay));
  }

  /** חלקים של איים שנכבשו מצטרפים לפסיפס של האי המרכזי (אנימציה) */
  async dockPending() {
    const list = this.store.get('pendingDocks') || [];
    if (!list.length || !this.atHub || this.docking) return;
    this.docking = true;
    this.busy = true;
    const wasOverview = this.sm.overviewOn;
    try {
      for (const id of list) {
        const e = islandDef(id).era;
        this.ui.toast(`${t('pieceArrives')}: ${tn(e.he, e.en)}`, { kind: 'gold', icon: 'flag', duration: 3200 });
        await this.museum.dock(id);
        this.store.set({ pendingDocks: (this.store.get('pendingDocks') || []).filter((x) => x !== id) });
        this.museum.rebuild();
      }
      if (wasOverview) await this.sm.toOverview(1.3, this.viewSide());
      else await this.sm.toGameplay(1.3, this.viewSide());
    } finally {
      this.docking = false;
      this.busy = false;
    }
  }

  /**
   * סצנת האי מוצגת מיד (מתחת לעננים של המעבר): ערכת העולם, האקלים של העידן,
   * המונומנט של האי — ובאי המרכזי: מוזיאון הזמן עם החלקים שנכבשו.
   */
  showIsland(id = this.islandId) {
    const kit = this.progression.displayEra(id);
    const era = islandDef(id).era;
    const base = getEra(kit).palette;
    const prem = isPremium(id);
    // איי פרימיום: לוח ייחודי, בלי ערכת העולם הרגילה (רצפה/שלבים/דמויות) — במקומה תפאורה משלהם
    this.board.setIslandBoard(prem ? `i${id}` : '');
    this.kingdom.show(kit, id === HUB_ID || prem ? 0 : 1, { palette: climatePalette(base, era.climate), floor: !prem, life: !prem });
    this.expansion.show(prem ? id : 0);
    this.sound.setEra(kit);
    this.applyStationMaterials();
    this.weather.set(era.climate, { quality: this.sm.quality?.level });
    if (this.islandMonument) { this.sm.world.remove(this.islandMonument); this.islandMonument = null; }
    if (era.monument) {
      this.islandMonument = makeMonument(era.monument, 2.6);
      this.islandMonument.position.set(0, 0, -18.5);
      this.sm.world.add(this.islandMonument);
    }
    this.museum?.setActive(id === HUB_ID);
    this.syncWhiteFlag(id);
    this.syncFlyingCompanion();
    if (id !== HUB_ID) this.sm.setIslandRadius(27);
    this.horizon?.setAround(id, { count: this.sm.quality?.level === 'low' ? 7 : 12 });
  }

  /**
   * חיה מעופפת באי המרכזי: היא חגה מעל העיר (במקום החיה שמעל העיר), אז אין לה כן ליד הלוח.
   * בשאר האיים — יושבת על הכן כרגיל.
   */
  syncFlyingCompanion() {
    if (!this.pets) return;
    const mine = this.mode === 'online' && this.myColor === 'b' ? 'b' : 'w';
    const fly = this.atHub && this.mode !== 'watch' && isFlyer(this.economy.pet);
    this.pets[mine].group.visible = !fly;
    this.pets[mine === 'w' ? 'b' : 'w'].group.visible = true;
    this.museum?.syncSkyPet?.();
  }

  /** דגל לבן מתנוסס מאחורי הכס של הבוט — באי שכבר ניצחת (הבוט נכנע; גם כשפיראטי הזמן פושטים עליו) */
  syncWhiteFlag(id = this.islandId, { raise = false } = {}) {
    if (!this.whiteFlag) { this.whiteFlag = new WhiteFlag(this.sm); this.whiteFlag.place(-1.3, -6.9); }
    this.whiteFlag.show(id !== HUB_ID && this.progression.isConquered(id), { raise });
  }

  /** קרב חדש נגד הבוט של האי הנוכחי */
  async newBattle({ confirm = true } = {}) {
    if (this.busy) return;
    if (confirm && !(await this.confirmLeave())) return;
    await this.startIslandBattle();
    setTimeout(() => this.botSay('intro', true), 900);
  }

  async startIslandBattle({ quiet = false, keepResident = false } = {}) {
    if (this.online.active) await this.online.detach();
    if (!keepResident) this.residentOpp = null;
    this.mode = 'ai';
    this.myColor = 'w';
    this.game.stopClock();
    this.resetBoardState();
    this.setupOpponentForMode();
    this.applyLoadout();
    this.ui.setActions('ai');
    this.saveGame();
    if (!quiet) this.sm.toGameplay(1.0, 'w');
    this.refreshHud();
    if (!quiet) this.ui.toast(`${t('battleVs')} ${this.opponent.name} · ${this.opponent.rating}`, { icon: 'swords' });
  }

  /** משחק ליד השולחן נגד בוט שקנית (גר באי המרכזי) */
  async playResident(id) {
    if (!this.atHub) await this.travelTo(HUB_ID, { battle: false });
    if (!(await this.confirmLeave())) return;
    this.residentOpp = id;
    await this.startIslandBattle({ keepResident: true });
    setTimeout(() => this.botSay('intro', true), 700);
  }

  /** משחק נגד חבר על אותו מכשיר — באי המרכזי */
  async startFriendGame(tcId) {
    if (this.online.active) await this.online.detach();
    if (!this.atHub) { await this.travelTo(HUB_ID, { battle: false }); }
    this.residentOpp = null;
    this.mode = 'local';
    this.myColor = 'w';
    this.store.set({ timeControl: tcId ?? 0 });
    const tc = TIME_CONTROLS.find((x) => x.id === tcId);
    if (tc) this.game.startClock(tc.ms, tc.inc); else this.game.stopClock();
    this.resetBoardState();
    this.setupOpponentForMode();
    this.applyLoadout();
    this.ui.setActions('local');
    this.saveGame();
    this.sm.toGameplay(1.0, 'w');
    this.refreshHud();
    this.ui.toast(t('gameStarted'), { icon: 'users' });
  }

  // ======================= אונליין עם חבר =======================
  /** נכנסים לחדר: הלוח של החדר ליד השולחן באי המרכזי */
  async enterOnline(room) {
    this.ui.closeAll();
    if (!this.atHub) {
      this.progression.setCurrent(HUB_ID);
      this.ui.setDock(true);
      this.showIsland(HUB_ID);
    }
    this.residentOpp = null;
    this.mode = room.isPlayer ? 'online' : 'watch';
    this.myColor = room.myColor || 'w';
    this.game.stopClock();
    this.resetBoardState();
    this.store.set({ savedGame: null });
    if (room.moves.length) {
      this.game.loadUci(room.moves);
      this.resyncBoard();
      if (this.game.inCheck()) this.board.setCheck(this.game.kingSquare(this.game.turn));
    }
    const res = room.result;
    if (res && !this.game.result) this.game.finish(res.winner, res.reason);
    this.setupOpponentForMode();
    this.applyLoadout();
    this.ui.setActions(this.mode);
    this.refreshHud();
    this.sm.toGameplay(1.0, this.viewSide()); // בלי לחכות — חדר ההמתנה נפתח מיד
  }

  /** יוצאים מהחדר: חוזרים לבוט של האי המרכזי */
  async exitOnline() {
    if (this.mode !== 'online' && this.mode !== 'watch') return;
    this.watchWhite = null;
    await this.startIslandBattle({ quiet: true });
    this.sm.toGameplay(1.0, 'w');
  }

  /** משחק חוזר בחדר: לוח חדש, הצבעים מתחלפים */
  async restartOnline(room) {
    this.ui.closeAll();
    this.myColor = room.myColor || 'w';
    this.resetBoardState();
    this.setupOpponentForMode();
    this.applyLoadout();
    this.ui.setActions(this.mode);
    await this.sm.toGameplay(1.2, this.viewSide());
    this.refreshHud();
    this.ui.toast(t('newOnlineGame'), { kind: 'gold', icon: 'refresh' });
  }

  /** החבר נכנס לחדר שפתחת */
  onFriendJoined(room) {
    this.ui.closeAll();
    this.setupOpponentForMode();
    this.applyLoadout();
    this.sound.notify?.();
    const name = room.opponent()?.name || t('friend');
    this.ui.toast(t('friendJoined').replace('{name}', name), { kind: 'gold', icon: 'users', duration: 3800 });
    this.refreshHud();
  }

  /** האפליקציה נסגרה באמצע משחק אונליין — חוזרים לאותו חדר */
  async rejoinOnline(code) {
    if (this.online.active) return;
    try {
      await this.online.join(code);
      this.ui.toast(t('backToRoom'), { icon: 'users' });
    } catch {
      this.store.set({ onlineRoom: null });
    }
  }

  async confirmLeave() {
    if (this.online.active) return this.online.leave();
    const inProgress = !this.game.result && this.game.ply > 0;
    if (!inProgress) return true;
    return this.ui.confirm(t('confirmNew'), t('newGame'));
  }

  resetBoardState() {
    this.gameId = (this.gameId || 0) + 1;
    this.ending = false;
    this.thinking = false;
    this.selected = null;
    this.game.reset();
    this.board.clearSelection();
    this.board.clearHint();
    this.board.setPosition(this.game.board);
    this.board.setLastMove(null);
    this.board.setCheck(null);
    Object.values(this.pets).forEach((p) => p.reset());
    Object.values(this.avatars).forEach((a) => a.reset());
  }

  saveGame() {
    if (this.mode !== 'ai' && this.mode !== 'local') return;
    if (this.game.result) { this.store.set({ savedGame: null }); return; }
    this.store.set({ savedGame: { mode: this.mode, island: this.islandId, uci: this.game.uci(), tc: this.mode === 'local' && this.game.clock ? (TIME_CONTROLS.find((x) => x.ms === this.game.clock.initial) || {}).id : null } });
  }

  /** תיקו בהסכמה — במשחק נגד חבר */
  async offerDraw() {
    if (this.mode === 'online') {
      if (this.game.result || this.game.ply < 2 || !this.online.room?.hasGuest) return;
      if (await this.ui.confirm(t('confirmDrawOnline'), t('offerDraw'))) this.online.offerDraw();
      return;
    }
    if (this.mode !== 'local' || this.game.result || this.game.ply < 2 || this.busy) return;
    if (await this.ui.confirm(t('confirmDraw'), t('draw'))) this.endGame(this.game.finish(null, 'agreement'));
  }

  async resign() {
    if (this.mode === 'watch') return;
    // המשחק כבר נגמר / עוד לא התחיל: הדגל מציע משחק חדש (במקום לא לעשות כלום)
    if (this.game.result || this.game.ply === 0) {
      if (this.ending || this.mode !== 'ai') return;
      if (await this.ui.confirm(t('confirmRestart'), t('newGame'))) await this.newBattle({ confirm: false });
      return;
    }
    if (!(await this.ui.confirm(t('confirmResign'), t('resign'), { danger: true }))) return;
    // מהלך באמצע אנימציה — מחכים שיסתיים (עד 4 שניות) במקום להתעלם מהלחיצה
    for (let i = 0; i < 40 && this.busy && !this.ending; i++) await sleep(100);
    if (this.game.result || this.ending) return;
    this.busy = false; // אם משהו נתקע — משחררים, כדי שתמיד אפשר יהיה לסיים ולהתחיל מחדש
    const winner = this.mode === 'local' ? (this.game.turn === 'w' ? 'b' : 'w') : (this.myColor === 'w' ? 'b' : 'w');
    if (this.mode === 'online') await this.online.room?.resign().catch(() => {});
    this.endGame(this.game.finish(winner, 'resign'));
  }

  // ======================= עוד =======================
  async hint() {
    if (this.mode === 'online' || this.mode === 'watch') { this.ui.toast(t('noHintsOnline'), { icon: 'bulb' }); return; }
    if (!this.canAct()) return;
    if (!this.economy.spend(HINT_COST)) { this.ui.toast(t('notEnoughGems'), { kind: 'bad', icon: 'gem' }); return; }
    this.ui.toast(`${t('hint')}…`, { icon: 'bulb' });
    const res = await this.ai.analyze({ fen: this.game.fen, history: this.game.beforeFens(), timeMs: 900, maxDepth: 9 }, 'main');
    if (res?.move) { this.board.showHint(res.move.from, res.move.to); this.sound.notify(); }
  }

  /** החנות נמצאת באי המרכזי */
  /** single — חנות של קטגוריה אחת (מהמבנים שבאי המרכזי): קטגוריית לבוש (slot) או הלוחות */
  openShop(tab = 'wardrobe', slot = null, single = false) {
    if (!this.atHub) { this.ui.toast(t('shopAtHub'), { icon: 'home' }); return; }
    ensurePlayBilling(); // גרסת Play: אם בפתיחה לא היה אינטרנט — מנסים שוב להביא מחירים (החנות מתעדכנת כשמגיעים)
    openKingdomShop(this, { tab, slot, single });
  }
  openDaily() { openDailyRewards(this); }
  /** בית הקולנוע באי המרכזי: הסיפור / איך משחקים */
  openCinema() { if (!this.atHub) { this.ui.toast(t('cinemaAtHub'), { icon: 'home' }); return; } openCinemaModal(this); }
  shareKingdom() { shareKingdom(this); }
  async startTutorial() {
    if (!this.atHub) await this.travelTo(HUB_ID, { battle: false });
    if (this.mode !== 'ai' || this.game.ply > 0) await this.startIslandBattle({ quiet: true });
    this.tutorial.start();
  }

  /** [legal] Settings → "Delete all my data": online rooms + anonymous account + local data (language stays) */
  async wipeData() {
    if (await wipeEverything(this)) location.reload();
  }
}

export { islandName, tierOf };
