/**
 * שרת מדומה לבדיקות (?fakenet): חדרים ב-localStorage + BroadcastChannel בין לשוניות של אותו דפדפן.
 * מחקה את עיקרי כללי האבטחה (קוד תפוס, מקום פנוי, תור נכון, רק שחקנים כותבים) כדי שהבדיקות יהיו אמיתיות.
 */
const KEY = (c) => `fakenet:room:${c}`;
const TS = { '.sv': 'timestamp' };
const isTs = (v) => v && typeof v === 'object' && v['.sv'] === 'timestamp';
const resolveTs = (v) => {
  if (isTs(v)) return Date.now();
  if (v && typeof v === 'object') { const o = Array.isArray(v) ? [] : {}; for (const [k, x] of Object.entries(v)) o[k] = resolveTs(x); return o; }
  return v;
};
const denied = () => Object.assign(new Error('PERMISSION_DENIED: Permission denied'), { code: 'PERMISSION_DENIED' });

export function createFakeBackend() {
  let uid = sessionStorage.getItem('fakenet:uid');
  if (!uid) { uid = `u${Math.random().toString(36).slice(2, 10)}`; sessionStorage.setItem('fakenet:uid', uid); }
  const latency = Number(new URLSearchParams(location.search).get('fakelag')) || 60;
  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('fakenet') : null;
  const listeners = new Map();
  const live = new Set();
  const read = (c) => { try { return JSON.parse(localStorage.getItem(KEY(c)) || 'null'); } catch { return null; } };
  const notify = (c) => setTimeout(() => (listeners.get(c) || new Set()).forEach((cb) => cb(read(c))), latency);
  const write = (c, v) => {
    if (v == null) localStorage.removeItem(KEY(c)); else localStorage.setItem(KEY(c), JSON.stringify(v));
    bc?.postMessage(c);
    notify(c);
  };
  if (bc) bc.onmessage = (e) => notify(e.data);
  const setPath = (obj, path, val) => {
    const parts = path.split('/');
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) { if (!o[parts[i]] || typeof o[parts[i]] !== 'object') o[parts[i]] = {}; o = o[parts[i]]; }
    const last = parts[parts.length - 1];
    if (val === null) delete o[last]; else o[last] = val;
  };
  const sleep = () => new Promise((r) => setTimeout(r, latency));
  window.addEventListener('pagehide', () => { for (const k of live) { const [c, ...rest] = k.split('/'); const r = read(c); if (r) { setPath(r, rest.join('/'), null); write(c, r); } } });

  return {
    kind: 'fake',
    uid,
    ts: () => TS,
    async create(code, data) {
      await sleep();
      if (read(code)) throw denied();
      write(code, resolveTs(data));
    },
    async get(code) { await sleep(); return read(code); },
    async update(code, patch) {
      await sleep();
      const room = read(code);
      if (!room) throw denied();
      const isPlayer = room.host === uid || room.guest === uid;
      const keys = Object.keys(patch);
      const own = (k) => k.startsWith(`on/${uid}`) || k.startsWith(`sp/${uid}`) || k.startsWith(`em/${uid}`);
      const joining = !room.guest && patch.guest === uid && room.host !== uid;
      if (!isPlayer && !joining && !keys.every(own)) throw denied();
      if (joining && !keys.every((k) => ['guest', 'gn', 'gl'].includes(k) || own(k))) throw denied();
      if (room.guest && 'guest' in patch && patch.guest !== room.guest) throw denied();
      if ('ply' in patch && patch.ply === room.ply + 1) {
        const white = (room.hc === 'w') === (room.host === uid);
        if ((room.ply % 2 === 0) !== white || room.res || !room.guest) throw denied();
        if (!String(patch.mv || '').startsWith(room.mv)) throw denied();
      } else if ('ply' in patch && patch.ply === 0 && !room.res) throw denied();
      const next = JSON.parse(JSON.stringify(room));
      for (const [k, v] of Object.entries(patch)) setPath(next, k, resolveTs(v));
      write(code, next);
    },
    async remove(code) { await sleep(); const r = read(code); if (r && r.host !== uid) throw denied(); write(code, null); },
    watch(code, cb) {
      if (!listeners.has(code)) listeners.set(code, new Set());
      listeners.get(code).add(cb);
      notify(code);
      return () => listeners.get(code)?.delete(cb);
    },
    async setLive(code, sub, value) { live.add(`${code}/${sub}`); await this.update(code, { [sub]: value }); },
    async clearLive(code, sub) { live.delete(`${code}/${sub}`); try { await this.update(code, { [sub]: null }); } catch { /* החדר נמחק */ } },
    onConnection(cb) { setTimeout(() => cb(true), 0); return () => {}; },
  };
}
