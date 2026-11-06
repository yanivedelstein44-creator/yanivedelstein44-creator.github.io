/**
 * MultiplayerManager — משחק P2P דרך PeerJS (WebRTC DataChannel).
 * חדר פרטי עם קוד 4 ספרות + הזמנה לוואטסאפ, חיפוש יריב מהיר (לובי ציבורי),
 * סנכרון מהלכים/שעונים/הצעות תיקו/משחק חוזר/אימוג'ים, וסנכרון הממלכה, האווטאר וחיית המחמד.
 * PeerJS נטען רק כשבוחרים משחק אונליין (אין חיבור לשרת לפני כן).
 */
import { NET, PUBLIC_URL, APP, PEER_OPTIONS } from '../config/AppConfig.js';
import { getLang } from '../ui/i18n.js';

const ROOM_ID = (code) => `${NET.prefix}room-${code}`;
const LOBBY_ID = (k) => `${NET.prefix}lobby-${k}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function inviteLink(code) {
  const base = PUBLIC_URL || (location.protocol.startsWith('http') && !location.hostname.includes('localhost') ? `${location.origin}${location.pathname}` : '');
  return base ? `${base}?room=${code}` : '';
}

/** טקסט ההזמנה לוואטסאפ — בעברית לפי המפרט, ובאנגלית לממשק האנגלי (קהל עולמי) */
export function inviteText(code) {
  const link = inviteLink(code);
  if (getLang() === 'en') return `Battle invite in 'Chess of Ages'! 👑 Come play against me inside the kingdom I built (room code: ${code}): ${link}`.trim();
  return `הזמנה לקרב ב'${APP.titleHe}'! 👑 בוא לשחק נגדי בתוך הממלכה שבניתי (קוד חדר: ${code}): ${link}`.trim();
}

export function shareWhatsApp(code) {
  const url = `https://wa.me/?text=${encodeURIComponent(inviteText(code))}`;
  window.open(url, '_blank', 'noopener');
}

export class MultiplayerManager {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.handlers = {};
    this.role = null;
    this.code = null;
  }

  on(evt, fn) { this.handlers[evt] = fn; }
  emit(evt, data) { this.handlers[evt]?.(data); }

  async loadPeer() {
    if (!this.Peer) {
      const mod = await import('peerjs');
      this.Peer = mod.default || mod.Peer;
    }
    return this.Peer;
  }

  /** פותח Peer עם מזהה מבוקש (או אקראי). דוחה ב-'unavailable-id' אם תפוס */
  openPeer(id) {
    return new Promise((resolve, reject) => {
      const Peer = this.Peer;
      const p = id ? new Peer(id, { ...PEER_OPTIONS }) : new Peer({ ...PEER_OPTIONS });
      const timer = setTimeout(() => { p.destroy(); reject(new Error('timeout')); }, 9000);
      p.on('open', () => { clearTimeout(timer); resolve(p); });
      p.on('error', (err) => { clearTimeout(timer); p.destroy(); reject(err); });
    });
  }

  attach(conn, role) {
    this.conn = conn;
    this.role = role;
    conn.on('data', (msg) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'ping') { this.send({ t: 'pong', ts: msg.ts }); return; }
      if (msg.t === 'pong') { this.latency = performance.now() - msg.ts; return; }
      this.emit('message', msg);
    });
    conn.on('close', () => this.emit('close'));
    conn.on('error', () => this.emit('close'));
    clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => this.send({ t: 'ping', ts: performance.now() }), 4000);
  }

  send(msg) {
    try { if (this.conn && this.conn.open) this.conn.send(msg); } catch { /* connection lost */ }
  }

  // ---------- חדר פרטי ----------
  async createRoom(onGuest) {
    await this.loadPeer();
    for (let attempt = 0; attempt < 6; attempt++) {
      const code = String(1000 + Math.floor(Math.random() * 9000));
      try {
        this.peer = await this.openPeer(ROOM_ID(code));
        this.code = code;
        this.peer.on('connection', (conn) => {
          if (this.conn && this.conn.open) { conn.on('open', () => { conn.send({ t: 'busy' }); setTimeout(() => conn.close(), 300); }); return; }
          conn.on('open', () => { this.attach(conn, 'host'); onGuest?.(conn); });
        });
        this.peer.on('disconnected', () => { try { this.peer.reconnect(); } catch { /* ok */ } });
        return code;
      } catch (err) {
        if (err?.type !== 'unavailable-id') throw err;
      }
    }
    throw new Error('no-room');
  }

  async joinRoom(code) {
    await this.loadPeer();
    this.peer = await this.openPeer(null);
    return new Promise((resolve, reject) => {
      const conn = this.peer.connect(ROOM_ID(code), { reliable: true, serialization: 'json' });
      const timer = setTimeout(() => reject(new Error('timeout')), 10000);
      this.peer.on('error', (err) => { clearTimeout(timer); reject(err); });
      conn.on('open', () => {
        clearTimeout(timer);
        const onBusy = (msg) => { if (msg && msg.t === 'busy') reject(new Error('busy')); };
        conn.on('data', onBusy);
        this.attach(conn, 'guest');
        this.code = code;
        resolve(conn);
      });
    });
  }

  // ---------- משחק מהיר ----------
  /**
   * מחפש יריב בלובי ציבורי עד deadline. מחזיר true אם נמצא שחקן אמיתי.
   * אלגוריתם: מנסה לתפוס משבצת לובי פנויה ולחכות; אם תפוסה — מתחבר לממתין.
   */
  async quickMatch(deadlineMs = NET.matchmakingMs, onStatus) {
    await this.loadPeer();
    const until = performance.now() + deadlineMs;
    for (let attempt = 0; performance.now() < until; attempt++) {
      const k = attempt % NET.lobbySlots;
      onStatus?.(k);
      try {
        // נסה להיות הממתין במשבצת k
        const p = await this.openPeer(LOBBY_ID(k));
        this.peer = p;
        const found = await new Promise((resolve) => {
          const timer = setTimeout(() => resolve(false), Math.max(0, until - performance.now()));
          p.on('connection', (conn) => {
            if (this.conn) { conn.on('open', () => { conn.send({ t: 'busy' }); setTimeout(() => conn.close(), 200); }); return; }
            conn.on('open', () => {
              clearTimeout(timer);
              this.attach(conn, 'host');
              try { p.disconnect(); } catch { /* משחרר את מזהה הלובי, החיבור נשאר */ }
              resolve(true);
            });
          });
        });
        if (found) return true;
        this.destroy();
        return false;
      } catch (err) {
        if (err?.type !== 'unavailable-id') { if (performance.now() < until) await sleep(700); continue; }
        // מישהו ממתין במשבצת — התחבר אליו
        try {
          this.peer = await this.openPeer(null);
          const ok = await new Promise((resolve) => {
            const conn = this.peer.connect(LOBBY_ID(k), { reliable: true, serialization: 'json' });
            const timer = setTimeout(() => resolve(false), 3500);
            conn.on('open', () => {
              const onFirst = (msg) => { if (msg && msg.t === 'busy') { clearTimeout(timer); resolve(false); } };
              conn.on('data', onFirst);
              setTimeout(() => { if (conn.open) { clearTimeout(timer); this.attach(conn, 'guest'); resolve(true); } }, 450);
            });
            this.peer.on('error', () => { clearTimeout(timer); resolve(false); });
          });
          if (ok) return true;
          this.destroy();
        } catch { this.destroy(); }
      }
    }
    return false;
  }

  destroy() {
    clearInterval(this.pingTimer);
    try { this.conn?.close(); } catch { /* ok */ }
    try { this.peer?.destroy(); } catch { /* ok */ }
    this.conn = null; this.peer = null; this.role = null; this.code = null;
  }

  get connected() { return !!(this.conn && this.conn.open); }
}
