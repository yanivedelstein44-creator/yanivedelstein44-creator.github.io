/**
 * משחק אונליין — הצד של המשחק: מסנכרן מהלכים מהחדר אל הלוח התלת-ממדי,
 * תוצאות, הצעות תיקו, משחק חוזר (הצבעים מתחלפים), נוכחות, צופים ואימוג'י.
 * שני סוגי חדרים: נגד חבר (קוד פרטי) וזירת העידנים (חדרים פנויים בלובי, אי אקראי, חסימת שחקן).
 * החדר עצמו (שרת, הרשאות) — net/OnlineRoom.js.
 */
import * as THREE from 'three';
import { t, tn, getLang } from '../ui/i18n.js';
import { presetName, localizeIncomingName } from '../core/PlayerName.js';
import { OnlineRoom, packLook, validCode, arenaIsland, randomArenaIsland, ROOM_PROTO } from '../net/OnlineRoom.js';
import { getBackend } from '../net/backend.js';
import { ONLINE, ARENA } from '../config/AppConfig.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class OnlineController {
  constructor(app) {
    this.app = app;
    this.room = null;
    this.queue = Promise.resolve();
    this.drawModal = null;
    this.avoid = new Set(); // בזירה: מארחים שסגרו עליך את החדר מיד כשנכנסת (כנראה חסמו אותך) — לא מנסים שוב עד שהאפליקציה נסגרת
  }

  get active() { return !!this.room; }
  get isPlayer() { return !!this.room?.isPlayer; }

  /** מה שנשלח לחדר: שם מהרשימה הקבועה בלבד (לא טקסט חופשי) ומראה האווטאר (מזהי פריטים) */
  me() {
    const a = this.app;
    const prof = a.store.get('profile');
    return { name: presetName(prof, getLang()), look: packLook({ loadout: a.economy.loadout, pet: a.economy.pet, petHue: a.economy.petHue, avatar: prof.avatar }) };
  }

  // ======================= זירת העידנים =======================
  /** שחקנים שחסמת (מזהים אנונימיים, רק במכשיר הזה) */
  blocked() { return new Set(this.app.store.get('blocked') || []); }
  block(uid) {
    if (!uid) return;
    const list = [...new Set([...(this.app.store.get('blocked') || []), uid])].slice(-ARENA.blockMax);
    this.app.store.set({ blocked: list });
  }

  /** רשומות הלובי → רשימה נקייה: בלי החדר שלך, בלי חסומים, בלי ישנים, מהוותיק לחדש */
  cleanLobby(raw, myUid) {
    const now = Date.now(), bl = this.blocked();
    return Object.entries(raw || {})
      .map(([code, e]) => ({ code, host: e?.host, t: Number(e?.t) || 0, v: Number(e?.v) || 1, name: e?.n, emblem: e?.e, island: arenaIsland(e?.i) }))
      .filter((e) => validCode(e.code) && typeof e.host === 'string' && e.host !== myUid && !bl.has(e.host) && !this.avoid.has(e.host) && e.v <= ROOM_PROTO && e.island && now - e.t < ARENA.maxAgeMs)
      .sort((a, b) => a.t - b.t);
  }

  /** רשומות ישנות מאוד (מארח שנעלם בלי ניתוק מסודר) נמחקות — השרת מתיר לכל אחד אחרי 30 דקות */
  sweepLobby(be, raw) {
    const now = Date.now();
    this.swept ||= new Set();
    for (const [code, e] of Object.entries(raw || {})) {
      const t0 = Number(e?.t) || 0;
      if (this.swept.size >= ARENA.blockMax || this.swept.has(code) || !t0 || now - t0 < ARENA.sweepMs) continue;
      this.swept.add(code);
      be.lobbyClose(code).catch(() => {});
    }
  }

  async arenaRooms() {
    const be = await getBackend();
    const raw = await be.lobbyList(ARENA.listLimit);
    this.sweepLobby(be, raw);
    return this.cleanLobby(raw, be.uid);
  }

  /** מאזין לחדרים הפנויים (לחלון הזירה). מחזיר פונקציה שמפסיקה */
  async watchArena(cb) {
    const be = await getBackend();
    return be.lobbyWatch(ARENA.listLimit, (raw) => { this.sweepLobby(be, raw); cb(this.cleanLobby(raw, be.uid)); }, () => cb(null));
  }

  /** פותחים חדר בזירה (אי אקראי, צבע אקראי) ומחכים ליריב — החדר מופיע בלובי עד שמישהו נכנס */
  async arenaHost({ island = null } = {}) {
    this.cleanupMyRooms();
    const isl = arenaIsland(island) || randomArenaIsland(this.app.arenaIsland || null);
    const room = await OnlineRoom.create(this.me(), { color: 'random', arena: { isl } });
    const mine = (this.app.store.get('myRooms') || []).filter((r) => r.code !== room.code);
    this.app.store.set({ myRooms: [...mine, { code: room.code, at: Date.now() }].slice(-10) });
    const prof = this.app.store.get('profile');
    try {
      await room.be.lobbyOpen(room.code, { v: ROOM_PROTO, t: room.be.ts(), host: room.be.uid, n: String(this.me().name || '').slice(0, 24), e: /^[a-z]+$/.test(prof.avatar || '') ? prof.avatar : 'crown', i: isl });
      room.inLobby = true; // הסימון על החדר עצמו — כך עזיבת חדר קודם לא מורידה את החדר החדש מהלובי
    } catch (e) {
      await room.leave({ remove: true }).catch(() => {});
      throw e;
    }
    await this.attach(room, { fresh: true });
    if (this.room !== room) { this.closeLobby(room); return room; }
    if (room.hasGuest) this.closeLobby(room); // מישהו כבר נכנס בזמן המעבר לאי
    else this.startLobbyTouch(room);
    return room;
  }

  /** המארח מרענן את החדר שלו בלובי בזמן ההמתנה (חדר שלא רוענן 10 דקות לא מוצג) */
  startLobbyTouch(room) {
    this.stopLobbyTouch();
    this.lobbyRoom = room;
    this.lobbyTimer = setInterval(() => {
      if (this.room === room && room.inLobby && !room.hasGuest) room.be.lobbyTouch(room.code).catch(() => {});
      else this.closeLobby(room);
    }, ARENA.touchMs);
  }
  stopLobbyTouch() { clearInterval(this.lobbyTimer); this.lobbyTimer = null; this.lobbyRoom = null; }
  /** החדר יוצא מהלובי (מישהו נכנס / עזבת). בטוח לקרוא כמה פעמים */
  closeLobby(room = this.room) {
    if (!room) return;
    if (this.lobbyRoom === room) this.stopLobbyTouch();
    if (!room.inLobby) return;
    room.inLobby = false;
    room.be.lobbyClose(room.code).catch(() => {});
  }

  /** נכנסים לחדר פנוי מהרשימה. זורק RoomError ('full' / 'notFound' / …) אם מישהו הקדים */
  async arenaJoin(entry) {
    const room = await OnlineRoom.open(this.me(), entry.code, { watch: false });
    if (!room.isArena || room.role !== 'guest') {
      await room.leave().catch(() => {});
      throw Object.assign(new Error('notFound'), { code: 'notFound' });
    }
    room.be.lobbyClose(entry.code).catch(() => {}); // האורח מוריד את החדר מהלובי — השרת מתיר כי הוא כבר בחדר
    room.hostUid = room.data?.host;
    room.joinedAt = Date.now();
    await this.attach(room);
    return room;
  }

  /** "משחק מהיר": נכנסים לחדר שמחכה הכי הרבה זמן; אם כולם נתפסו — פותחים חדר ומחכים */
  async arenaQuick() {
    const list = await this.arenaRooms();
    for (const e of list.slice(0, ARENA.quickTries)) {
      try { return { joined: true, room: await this.arenaJoin(e) }; } catch (err) {
        if (!['full', 'notFound', 'needUpdate', 'friendOld'].includes(err?.code)) throw err;
      }
    }
    return { joined: false, room: await this.arenaHost() };
  }

  /** חסימת היריב בזירה: יוצאים (באמצע משחק — כניעה) ולא נפגשים שוב */
  async blockOpponent() {
    const room = this.room;
    const opp = room?.opponent();
    if (!room?.isArena || !opp?.uid) return false;
    this.block(opp.uid);
    const inGame = room.hasGuest && !room.result && room.moves.length > 0;
    if (inGame) await room.resign().catch(() => {});
    await this.detach({ remove: room.role === 'host' });
    await this.app.exitOnline();
    return true;
  }

  async host(color) {
    this.cleanupMyRooms();
    const room = await OnlineRoom.create(this.me(), { color });
    const mine = (this.app.store.get('myRooms') || []).filter((r) => r.code !== room.code);
    this.app.store.set({ myRooms: [...mine, { code: room.code, at: Date.now() }].slice(-10) });
    await this.attach(room);
    return room;
  }

  /** חדרים ישנים שפתחת ונשארו פתוחים (האפליקציה נסגרה) — נמחקים מהשרת */
  async cleanupMyRooms() {
    const list = this.app.store.get('myRooms') || [];
    if (!list.length) return;
    const saved = this.app.store.get('onlineRoom');
    const keep = this.room?.code || (saved?.code && Date.now() - (saved.at || 0) < ONLINE.rejoinMs ? saved.code : null);
    const old = list.filter((r) => r.code !== keep);
    if (!old.length) return;
    try {
      const be = await getBackend();
      await Promise.all(old.map((r) => be.remove(r.code).catch(() => {})));
    } catch { return; } // אין רשת — ננסה בפעם הבאה
    const done = new Set(old.map((r) => r.code));
    this.app.store.set({ myRooms: (this.app.store.get('myRooms') || []).filter((r) => !done.has(r.code)) });
  }

  async join(code, { watch = false } = {}) {
    const room = await OnlineRoom.open(this.me(), code, { watch });
    await this.attach(room);
    return room;
  }

  /** fresh: חדר שפתחת הרגע בזירה — אם יריב נכנס עוד לפני שהמאזינים נרשמו, מטפלים בזה בסוף */
  async attach(room, { fresh = false } = {}) {
    if (this.room) await this.detach();
    this.room = room;
    this.gameNo = room.gameNo;
    this.guestSeen = fresh ? false : room.hasGuest;
    this.oppOnline = room.opponent()?.online ?? false;
    this.oppWasOnline = this.oppOnline;
    this.spectators = room.spectators;
    this.app.store.set({ onlineRoom: { code: room.code, at: Date.now() } });
    room.on('change', (d, prev) => this.onChange(d, prev));
    room.on('gone', () => this.onGone());
    room.on('emote', (uid, e) => this.showEmote(uid, e));
    room.on('connection', () => this.app.refreshHud());
    await this.app.enterOnline(room);
    if (fresh && this.room === room && room.hasGuest && !this.guestSeen && room.data) this.onChange(room.data, null);
  }

  /** עזיבה שקטה (בלי שאלות) — לפני משחק אחר */
  async detach({ remove } = {}) {
    const room = this.room;
    if (!room) return;
    this.closeLobby(room);
    this.room = null;
    this.closeDrawModal();
    this.app.store.set({ onlineRoom: null });
    const over = !!room.result || !room.hasGuest;
    const del = remove ?? (room.role === 'host' && over);
    await room.leave({ remove: del });
    if (del) this.app.store.set({ myRooms: (this.app.store.get('myRooms') || []).filter((r) => r.code !== room.code) });
  }

  /** שחקן שחסמת נכנס לחדר שלך: החדר נסגר ונפתח חדר חדש באותו אי (בלי מעבר) */
  async rehostAfterBlocked() {
    const app = this.app;
    const island = this.room?.island;
    await this.detach({ remove: true });
    app.ui.toast(t('arenaBlockedTried'), { icon: 'shield', duration: 3800 });
    try { await this.arenaHost({ island }); } catch { await app.exitOnline(); }
  }

  /** "צא" — עם אישור. באמצע משחק: היציאה נחשבת כניעה */
  async leave() {
    const app = this.app;
    const room = this.room;
    if (!room) return true;
    const inGame = room.isPlayer && room.hasGuest && !room.result && room.moves.length > 0;
    const ok = await app.ui.confirm(inGame ? `${t('leaveOnline')} ${t('leaveOnlineResign')}` : t('leaveOnline'), t('leave'), { danger: inGame });
    if (!ok) return false;
    if (inGame) await room.resign().catch(() => {});
    await this.detach({ remove: room.role === 'host' });
    await app.exitOnline();
    return true;
  }

  // ---------- סנכרון ----------
  onChange(d, prev) {
    const app = this.app;
    const room = this.room;
    if (!room) return;
    // החבר נכנס לחדר — מתחילים
    if (!this.guestSeen && d.guest) {
      this.guestSeen = true;
      if (room.isArena && room.role === 'host') {
        this.closeLobby(room);
        // שחקן שחסמת נכנס לחדר שלך — סוגרים ופותחים חדר אחר
        if (this.blocked().has(d.guest)) { this.queue = this.queue.then(() => this.rehostAfterBlocked()).catch(() => {}); return; }
      }
      app.onFriendJoined(room);
    }
    // משחק חוזר: מספר משחק חדש בחדר → לוח חדש, צבעים מתחלפים
    if ((d.g || 1) !== this.gameNo) {
      this.gameNo = d.g || 1;
      this.queue = this.queue.then(() => app.restartOnline(room)).catch(() => {});
      return;
    }
    this.queue = this.queue.then(() => this.sync()).catch((e) => console.error(e));
    // הצעת תיקו מהחבר
    if (room.isPlayer && d.dr && d.dr !== room.uid && !d.res) this.showDrawOffer();
    else if (!d.dr) this.closeDrawModal();
    if (prev?.dr === room.uid && !d.dr && !d.res) app.ui.toast(t('drawDeclined'), { icon: 'handshake' });
    // בקשה למשחק חוזר
    if (d.res && room.isPlayer) {
      const opp = room.opponent();
      if (opp?.uid && d.rm?.[opp.uid] && !prev?.rm?.[opp.uid] && !d.rm?.[room.uid]) app.ui.toast(t('rematchAsked').replace('{name}', opp.name || t(room.isArena ? 'arenaRival' : 'friend')), { kind: 'gold', icon: 'refresh', duration: 4000 });
      room.maybeStartRematch();
    }
    // נוכחות וצופים
    const opp = room.opponent();
    const online = !!opp?.online;
    if (room.isPlayer && room.hasGuest && online !== this.oppOnline) {
      // "החבר חזר" רק אחרי ניתוק אמיתי — לא בחיבור הראשון
      if (online && this.oppWasOnline) app.ui.toast(t(room.isArena ? 'arenaRivalBack' : 'friendBack'), { icon: 'users' });
      else if (!online && this.oppOnline) app.ui.toast(t(room.isArena ? 'arenaRivalLeft' : 'friendLeft'), { icon: 'info' });
      if (online) this.oppWasOnline = true;
      this.oppOnline = online;
    }
    const n = room.spectators;
    if (n > (this.spectators || 0)) app.ui.toast(t('spectatorJoined'), { icon: 'eye' });
    this.spectators = n;
    app.refreshHud();
  }

  /** מביא את הלוח למצב של החדר: מהלכים חדשים באנימציה; סטייה — טעינה מחדש */
  async sync() {
    const app = this.app;
    const room = this.room;
    if (!room || !room.data) return;
    const server = room.moves;
    for (let guard = 0; guard < 400; guard++) {
      if (this.room !== room) return;
      while (app.busy && !app.game.result) await sleep(60);
      const local = app.game.uci();
      const prefix = local.every((m, i) => server[i] === m);
      if (server.length > local.length && prefix) {
        const u = server[local.length];
        const mv = await app.applyMove({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }, { remote: true });
        if (!mv) { this.resync(); return; }
        continue;
      }
      if (server.length < local.length && server.every((m, i) => local[i] === m)) return; // המהלך שלי עוד בדרך לשרת
      if (!prefix || server.length !== local.length) { this.resync(); return; }
      break;
    }
    // תוצאה שנקבעה בחדר (כניעה / תיקו בהסכמה) — אם הלוח עוד לא נגמר
    const res = room.result;
    if (res && !app.game.result) app.endGame(app.game.finish(res.winner, res.reason));
  }

  resync() {
    const app = this.app;
    const room = this.room;
    if (!room) return;
    app.ui.toast(t('resyncing'), { icon: 'refresh' });
    app.game.loadUci(room.moves);
    app.resyncBoard();
    app.board.setCheck(app.game.inCheck() ? app.game.kingSquare(app.game.turn) : null);
    app.refreshHud();
  }

  /** המהלך שלי → לחדר (השרת מוודא שזה התור שלי) */
  sendMove() {
    const room = this.room;
    if (!room?.isPlayer) return;
    room.sendMoves(this.app.game.uci()).catch(() => {
      // לא נשמר בשרת (רשת / הרשאה) — חוזרים למצב של החדר
      setTimeout(() => { if (this.room === room) this.resync(); }, 400);
    });
  }

  reportResult(result) {
    if (!this.room?.isPlayer || !result) return;
    this.room.setResult(result.winner, result.reason).catch(() => {});
  }

  // ---------- תיקו / משחק חוזר ----------
  async offerDraw() {
    if (!this.room?.isPlayer) return;
    await this.room.offerDraw().catch(() => {});
    this.app.ui.toast(t('drawSent'), { icon: 'handshake' });
  }

  showDrawOffer() {
    if (this.drawModal) return;
    const opp = this.room.opponent();
    this.drawModal = this.app.ui.modal({
      title: t('draw'), titleIcon: 'handshake', center: true, dismissable: false,
      body: t('drawOfferedBy').replace('{name}', opp?.name || t(this.room?.isArena ? 'arenaRival' : 'friend')),
      actions: [
        { label: t('decline'), onClick: (c) => { c.close(); this.room?.answerDraw(false).catch(() => {}); } },
        { label: t('accept'), icon: 'handshake', primary: true, onClick: (c) => { c.close(); this.room?.answerDraw(true).catch(() => {}); } },
      ],
      onClose: () => { this.drawModal = null; },
    });
  }

  closeDrawModal() { if (this.drawModal) { const m = this.drawModal; this.drawModal = null; m.close(); } }

  async requestRematch() {
    if (!this.room?.isPlayer) return;
    await this.room.requestRematch().catch(() => {});
    this.app.ui.toast(t('rematchSent'), { icon: 'refresh', duration: 3500 });
    this.room.maybeStartRematch();
  }

  // ---------- אימוג'י ----------
  async sendEmote(e) {
    if (!this.room) return;
    if (Date.now() - (this.lastEmoteAt || 0) < 1500) return; // בלי הצפה
    this.lastEmoteAt = Date.now();
    this.showEmote(this.room.uid, e);
    await this.room.emote(e).catch(() => {});
  }

  showEmote(uid, e) {
    const app = this.app;
    const room = this.room;
    if (!room) return;
    const ic = (ONLINE.emotes.find(([id]) => id === e) || [])[1];
    if (!ic) return;
    let color = null;
    if (uid === room.data?.host) color = room.hostColor;
    else if (uid === room.data?.guest) color = room.hostColor === 'w' ? 'b' : 'w';
    const pos = color ? app.avatars[color].group.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 3.4, 0)) : null;
    const scr = pos ? app.sm.projectToScreen(pos) : { x: window.innerWidth / 2, y: window.innerHeight * 0.38 };
    const who = color ? '' : (localizeIncomingName(room.data?.sp?.[uid]?.n, getLang()) || tn('צופה', 'Spectator'));
    app.ui.floatLabel(who, scr, 'emote', 1.8, ic);
    app.sound.notify?.();
  }

  onGone() {
    const app = this.app;
    const room = this.room;
    if (!room) return;
    // נכנסת לחדר בזירה והוא נסגר מיד, לפני מהלך — כנראה המארח חסם אותך: לא נציע לך אותו שוב
    // (כאן room.data כבר null — לכן לפי מה שנשמר בכניסה, ולפי הלוח המקומי)
    if (room.hostUid && room.role === 'guest' && !app.game.ply && Date.now() - (room.joinedAt || 0) < 60000) this.avoid.add(room.hostUid);
    this.room.closed = true;
    this.room = null;
    this.closeDrawModal();
    app.store.set({ onlineRoom: null });
    app.ui.toast(t('roomClosed'), { icon: 'info', duration: 3500 });
    app.exitOnline();
  }
}
