/**
 * חדר אונליין פרטי — משחק נגד חבר שהזמנת (קישור או קוד), עם צופים.
 * אין שידוך עם זרים ואין רשימת חדרים: נכנסים רק עם הקוד. אין צ'אט חופשי — רק אימוג'י קבועים.
 *
 * מבנה החדר במסד הנתונים (rooms/{CODE}):
 *   v, t (זמן יצירה), host, hc (צבע המארח), hn/hl (שם/מראה המארח), guest, gn/gl,
 *   ply + mv (מהלכים בפורמט UCI מופרדים ברווח), at, res ("w:checkmate" / "d:agreement"),
 *   dr (מי הציע תיקו), rm/{uid} (בקשות למשחק חוזר), g (מספר המשחק בחדר),
 *   on/{uid} (נוכחות שחקנים), sp/{uid} (צופים), em/{uid} (אימוג'י אחרון).
 */
import { ONLINE, PUBLIC_URL } from '../config/AppConfig.js';
import { getBackend } from './backend.js';

export class RoomError extends Error {
  constructor(code) { super(code); this.code = code; }
}

const clip = (s, n) => String(s || '').slice(0, n);
const isDenied = (e) => /permission/i.test(String(e?.code || '') + String(e?.message || ''));
const SAFE_ID = /^[a-z0-9_:-]{1,40}$/i;

export function makeCode() {
  const a = ONLINE.alphabet;
  const buf = new Uint8Array(ONLINE.codeLen);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => a[b % a.length]).join(''); // 32 תווים — מחלק את 256 בלי הטיה
}
export const normCode = (s = '') => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ONLINE.codeLen);
export const validCode = (c = '') => c.length === ONLINE.codeLen && [...c].every((ch) => ONLINE.alphabet.includes(ch));
export const prettyCode = (c = '') => (c.length === 6 ? `${c.slice(0, 3)}-${c.slice(3)}` : c);
export function inviteUrl(code, watch = false) {
  const base = PUBLIC_URL || `${location.origin}${location.pathname}`;
  return `${base}?room=${code}${watch ? '&watch=1' : ''}`;
}

/** מראה השחקן (לבוש, חיה, סמל) — מחרוזת קצרה שנשמרת בחדר */
export function packLook({ loadout = {}, pet, petHue = 0, avatar } = {}) {
  return JSON.stringify({ l: [loadout.head, loadout.armor, loadout.weapon, loadout.aura].map((x) => x || null), p: pet || null, h: Math.round((petHue || 0) * 1000) / 1000, a: avatar || null }).slice(0, 400);
}
export function unpackLook(str) {
  let o = {};
  try { o = JSON.parse(str || '{}') || {}; } catch { o = {}; }
  const id = (x) => (typeof x === 'string' && SAFE_ID.test(x) ? x : null);
  const l = Array.isArray(o.l) ? o.l : [];
  const h = Number(o.h);
  return {
    loadout: { head: id(l[0]), armor: id(l[1]), weapon: id(l[2]), aura: id(l[3]) },
    pet: id(o.p), petHue: Number.isFinite(h) ? Math.max(-1, Math.min(1, h)) : 0, avatar: id(o.a),
  };
}
export function parseResult(res) {
  if (!res || typeof res !== 'string') return null;
  const [w, reason = 'resign'] = res.split(':');
  return { winner: w === 'w' || w === 'b' ? w : null, reason };
}

export class OnlineRoom {
  constructor(be, code, role, me) {
    this.be = be;
    this.code = code;
    this.role = role; // 'host' | 'guest' | 'spectator'
    this.uid = be.uid;
    this.me = me; // { name, look }
    this.data = null;
    this.handlers = {};
    this.closed = false;
    this.connected = true;
  }

  on(ev, fn) { (this.handlers[ev] ||= []).push(fn); return this; }
  emit(ev, ...args) { (this.handlers[ev] || []).forEach((fn) => { try { fn(...args); } catch (e) { console.error(e); } }); }

  /** חדר חדש — אתה המארח. color: 'w' | 'b' | 'random' */
  static async create(me, { color = 'w' } = {}) {
    const be = await getBackend();
    const hc = color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
    for (let i = 0; i < 6; i++) {
      const code = makeCode();
      try {
        await be.create(code, { v: 1, t: be.ts(), host: be.uid, hc, hn: clip(me.name, 24), hl: me.look, ply: 0, mv: '', g: 1, at: be.ts() });
        const room = new OnlineRoom(be, code, 'host', me);
        await room.start();
        return room;
      } catch (e) {
        if (!isDenied(e)) throw e; // קוד תפוס — מנסים קוד אחר
      }
    }
    throw new RoomError('busy');
  }

  /** כניסה לחדר קיים: כשחקן (מקום פנוי / החדר שלך) או כצופה (watch, או כשהחדר מלא ובחרת לצפות) */
  static async open(me, code, { watch = false } = {}) {
    const be = await getBackend();
    const data = await be.get(code);
    if (!data) throw new RoomError('notFound');
    let role = 'spectator';
    if (data.host === be.uid) role = 'host';
    else if (data.guest === be.uid) role = 'guest';
    else if (!watch) {
      if (data.guest) throw new RoomError('full');
      try {
        await be.update(code, { guest: be.uid, gn: clip(me.name, 24), gl: me.look });
        role = 'guest';
      } catch (e) {
        if (isDenied(e)) throw new RoomError('full');
        throw e;
      }
    }
    const room = new OnlineRoom(be, code, role, me);
    await room.start();
    return room;
  }

  async start() {
    await new Promise((resolve) => {
      let first = true;
      this.unsub = this.be.watch(this.code, (d) => {
        const prev = this.data;
        this.data = d;
        if (first) { first = false; this.seenEmotes(d); resolve(); }
        if (this.closed) return;
        if (!d) { this.emit('gone'); return; }
        this.checkEmotes(d);
        this.emit('change', d, prev);
      }, (err) => { if (first) { first = false; resolve(); } this.emit('error', err); });
    });
    if (!this.data) throw new RoomError('notFound');
    // נוכחות: נרשמת מחדש אחרי כל התחברות (הרשת בטלפון נופלת ועולה)
    this.connUnsub = this.be.onConnection((ok) => {
      this.connected = ok;
      this.emit('connection', ok);
      if (ok && !this.closed) this.refreshPresence();
    });
  }

  refreshPresence() {
    const p = this.isPlayer ? this.be.setLive(this.code, `on/${this.uid}`, true) : this.be.setLive(this.code, `sp/${this.uid}`, { n: clip(this.me.name, 24) });
    return p.catch(() => {});
  }

  // ---------- מצב ----------
  get isPlayer() { return this.role === 'host' || this.role === 'guest'; }
  get hostColor() { return this.data?.hc === 'b' ? 'b' : 'w'; }
  get myColor() {
    if (this.role === 'host') return this.hostColor;
    if (this.role === 'guest') return this.hostColor === 'w' ? 'b' : 'w';
    return null;
  }
  get moves() { const mv = this.data?.mv || ''; return mv ? mv.split(' ') : []; }
  get gameNo() { return this.data?.g || 1; }
  get hasGuest() { return !!this.data?.guest; }
  get result() { return parseResult(this.data?.res); }
  get spectators() { return Object.keys(this.data?.sp || {}).filter((u) => u !== this.uid).length; }
  get drawOfferFrom() { return this.data?.dr || null; }
  /** פרטי השחקן בצבע מסוים */
  player(color) {
    const d = this.data || {};
    const isHost = this.hostColor === color;
    const uid = isHost ? d.host : d.guest;
    return { uid, name: clip(isHost ? d.hn : d.gn, 24), look: unpackLook(isHost ? d.hl : d.gl), online: !!(uid && d.on && d.on[uid]), joined: !!uid };
  }
  opponent() { return this.myColor ? this.player(this.myColor === 'w' ? 'b' : 'w') : null; }
  rematchWanted(uid) { return !!this.data?.rm?.[uid]; }

  // ---------- פעולות ----------
  /** שולח את כל רשימת המהלכים (המהלך החדש בסוף) — השרת בודק שזה התור שלך ושנוסף מהלך אחד בלבד */
  sendMoves(uciList) {
    if (!this.isPlayer) return Promise.resolve();
    return this.be.update(this.code, { ply: uciList.length, mv: uciList.join(' '), at: this.be.ts() });
  }
  setResult(winner, reason) {
    if (!this.isPlayer || this.data?.res) return Promise.resolve();
    return this.be.update(this.code, { res: `${winner || 'd'}:${clip(reason, 16)}`, dr: null });
  }
  resign() { return this.setResult(this.myColor === 'w' ? 'b' : 'w', 'resign'); }
  offerDraw() { return this.be.update(this.code, { dr: this.uid }); }
  answerDraw(accept) { return this.be.update(this.code, accept ? { res: 'd:agreement', dr: null } : { dr: null }); }
  requestRematch() { return this.be.update(this.code, { [`rm/${this.uid}`]: true }); }
  /** המארח מתחיל משחק חוזר כששני השחקנים ביקשו — הצבעים מתחלפים */
  maybeStartRematch() {
    const d = this.data;
    if (this.role !== 'host' || !d?.res || !d.guest || !d.rm?.[d.host] || !d.rm?.[d.guest] || this.restarting) return Promise.resolve();
    this.restarting = true;
    return this.be.update(this.code, { ply: 0, mv: '', res: null, dr: null, rm: null, hc: d.hc === 'w' ? 'b' : 'w', g: (d.g || 1) + 1, at: this.be.ts() })
      .catch(() => {}).finally(() => { this.restarting = false; });
  }
  emote(e) { return this.be.update(this.code, { [`em/${this.uid}`]: { e, t: this.be.ts() } }); }

  seenEmotes(d) {
    this.lastEm = {};
    for (const [u, v] of Object.entries(d?.em || {})) this.lastEm[u] = v?.t || 0;
  }
  checkEmotes(d) {
    for (const [u, v] of Object.entries(d?.em || {})) {
      const tt = v?.t || 0;
      if (tt > (this.lastEm[u] || 0)) {
        this.lastEm[u] = tt;
        if (u !== this.uid && typeof v.e === 'string') this.emit('emote', u, v.e);
      }
    }
  }

  /** יציאה מהחדר. המארח מוחק את החדר כשאין בו משחק פעיל */
  async leave({ remove = false } = {}) {
    if (this.closed) return;
    this.closed = true;
    try { this.unsub?.(); } catch { /* */ }
    try { this.connUnsub?.(); } catch { /* */ }
    await this.be.clearLive(this.code, this.isPlayer ? `on/${this.uid}` : `sp/${this.uid}`).catch(() => {});
    if (remove && this.role === 'host') await this.be.remove(this.code).catch(() => {});
  }
}
