/**
 * משחק אונליין עם חבר — הצד של המשחק: מסנכרן מהלכים מהחדר אל הלוח התלת-ממדי,
 * תוצאות, הצעות תיקו, משחק חוזר (הצבעים מתחלפים), נוכחות, צופים ואימוג'י.
 * החדר עצמו (שרת, הרשאות) — net/OnlineRoom.js.
 */
import * as THREE from 'three';
import { t, tn, getLang } from '../ui/i18n.js';
import { presetName, localizeIncomingName } from '../core/PlayerName.js';
import { OnlineRoom, packLook } from '../net/OnlineRoom.js';
import { getBackend } from '../net/backend.js';
import { ONLINE } from '../config/AppConfig.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class OnlineController {
  constructor(app) {
    this.app = app;
    this.room = null;
    this.queue = Promise.resolve();
    this.drawModal = null;
  }

  get active() { return !!this.room; }
  get isPlayer() { return !!this.room?.isPlayer; }

  /** מה שנשלח לחדר: שם מהרשימה הקבועה בלבד (לא טקסט חופשי) ומראה האווטאר (מזהי פריטים) */
  me() {
    const a = this.app;
    const prof = a.store.get('profile');
    return { name: presetName(prof, getLang()), look: packLook({ loadout: a.economy.loadout, pet: a.economy.pet, petHue: a.economy.petHue, avatar: prof.avatar }) };
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

  async attach(room) {
    if (this.room) await this.detach();
    this.room = room;
    this.gameNo = room.gameNo;
    this.guestSeen = room.hasGuest;
    this.oppOnline = room.opponent()?.online ?? false;
    this.oppWasOnline = this.oppOnline;
    this.spectators = room.spectators;
    this.app.store.set({ onlineRoom: { code: room.code, at: Date.now() } });
    room.on('change', (d, prev) => this.onChange(d, prev));
    room.on('gone', () => this.onGone());
    room.on('emote', (uid, e) => this.showEmote(uid, e));
    room.on('connection', () => this.app.refreshHud());
    await this.app.enterOnline(room);
  }

  /** עזיבה שקטה (בלי שאלות) — לפני משחק אחר */
  async detach({ remove } = {}) {
    const room = this.room;
    if (!room) return;
    this.room = null;
    this.closeDrawModal();
    this.app.store.set({ onlineRoom: null });
    const over = !!room.result || !room.hasGuest;
    const del = remove ?? (room.role === 'host' && over);
    await room.leave({ remove: del });
    if (del) this.app.store.set({ myRooms: (this.app.store.get('myRooms') || []).filter((r) => r.code !== room.code) });
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
      if (opp?.uid && d.rm?.[opp.uid] && !prev?.rm?.[opp.uid] && !d.rm?.[room.uid]) app.ui.toast(t('rematchAsked').replace('{name}', opp.name || t('friend')), { kind: 'gold', icon: 'refresh', duration: 4000 });
      room.maybeStartRematch();
    }
    // נוכחות וצופים
    const opp = room.opponent();
    const online = !!opp?.online;
    if (room.isPlayer && room.hasGuest && online !== this.oppOnline) {
      // "החבר חזר" רק אחרי ניתוק אמיתי — לא בחיבור הראשון
      if (online && this.oppWasOnline) app.ui.toast(t('friendBack'), { icon: 'users' });
      else if (!online && this.oppOnline) app.ui.toast(t('friendLeft'), { icon: 'info' });
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
      body: t('drawOfferedBy').replace('{name}', opp?.name || t('friend')),
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
    if (!this.room) return;
    this.room.closed = true;
    this.room = null;
    this.closeDrawModal();
    app.store.set({ onlineRoom: null });
    app.ui.toast(t('roomClosed'), { icon: 'info', duration: 3500 });
    app.exitOnline();
  }
}
