// Edge Function "push" for היומן שלנו
//  - type 'change': called by a DB trigger (pg_net) after a household member changes the calendar -> notify the others
//  - type 'tick'  : called every minute by pg_cron -> due reminders, morning digest, weekly digest (Saturday night)
//  - type 'test'  : called by the app with the user's JWT -> test notification to the caller's devices
// Deployed with verify_jwt = false; 'change'/'tick' require the x-hook-secret header, 'test' validates the user's JWT.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

// ===== shared date + recurrence helpers (used by the app and by the push Edge Function) =====
const pad2 = n => String(n).padStart(2, '0');
// day number (days since 1970-01-01) <-> 'YYYY-MM-DD'
function dn(s) { return Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5); }
function nd(n) { const d = new Date(n * 864e5); return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()); }
function addDays(s, k) { return nd(dn(s) + k); }
function dowOf(s) { return ((dn(s) + 4) % 7 + 7) % 7; } // 0 = Sunday
function tmin(t) { return t ? (+String(t).slice(0, 2)) * 60 + (+String(t).slice(3, 5)) : null; }
function fmtT(m) { m = ((m % 1440) + 1440) % 1440; return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60); }
function mkYmd(y, m, d) { return y + '-' + pad2(m) + '-' + pad2(d); }
function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); } // m is 1-based

// Start dates of the occurrences of ev that overlap [from, to] (inclusive, 'YYYY-MM-DD').
function occDates(ev, from, to) {
  const S0 = dn(ev.start_date), dur = Math.max(0, dn(ev.end_date || ev.start_date) - S0);
  const F = dn(from), T = dn(to);
  if (!ev.recur) return (S0 <= T && S0 + dur >= F) ? [ev.start_date] : [];
  const until = ev.recur_until ? dn(ev.recur_until) : Infinity;
  const ex = ev.exdates && ev.exdates.length ? new Set(ev.exdates) : null;
  const iv = Math.max(1, ev.recur_interval || 1);
  const res = [];
  const take = n => {
    if (n > until || n > T) return false;
    if (n >= S0 && n + dur >= F) { const d = nd(n); if (!ex || !ex.has(d)) res.push(d); }
    return true;
  };
  if (ev.recur === 'daily' || ev.recur === 'weekly') {
    const step = ev.recur === 'daily' ? iv : 7 * iv;
    let k = Math.max(0, Math.ceil((F - dur - S0) / step));
    for (let i = 0; i < 2000; i++, k++) if (!take(S0 + k * step)) break;
  } else {
    const y0 = +ev.start_date.slice(0, 4), m0 = +ev.start_date.slice(5, 7), d0 = +ev.start_date.slice(8, 10);
    const stepM = ev.recur === 'monthly' ? iv : 12 * iv;
    const j = nd(Math.max(S0, F - dur - 31));
    let k = Math.max(0, Math.floor(((+j.slice(0, 4) - y0) * 12 + (+j.slice(5, 7) - m0)) / stepM));
    for (let i = 0; i < 2000; i++, k++) {
      const tot = (m0 - 1) + k * stepM, y = y0 + Math.floor(tot / 12), m = tot % 12 + 1;
      if (!take(dn(mkYmd(y, m, Math.min(d0, daysInMonth(y, m)))))) break;
    }
  }
  return res;
}

// Expand events into occurrences overlapping [from, to]. A/B are absolute minutes (day*1440 + minute).
function expand(events, from, to) {
  const out = [];
  for (const ev of events) {
    const ds = occDates(ev, from, to);
    if (!ds.length) continue;
    const dur = Math.max(0, dn(ev.end_date || ev.start_date) - dn(ev.start_date));
    const s = ev.all_day ? 0 : (tmin(ev.start_time) || 0);
    let e = ev.all_day ? 1440 : (tmin(ev.end_time) ?? s);
    for (const d of ds) {
      const A = dn(d) * 1440 + s;
      let B = (dn(d) + dur) * 1440 + e;
      if (B <= A) B = A + (ev.all_day ? 1440 : 15);
      out.push({ ev, date: d, end: nd(dn(d) + dur), s, e, allDay: !!ev.all_day, key: ev.id + '@' + d, A, B });
    }
  }
  out.sort((a, b) => (b.allDay - a.allDay) || a.A - b.A || String(a.ev.title).localeCompare(String(b.ev.title)));
  return out;
}

// ----- day intervals in minutes [a, b) -----
function ivMerge(iv) {
  iv = iv.filter(x => x[1] > x[0]).sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const x of iv) { const l = out[out.length - 1]; if (l && x[0] <= l[1]) l[1] = Math.max(l[1], x[1]); else out.push([x[0], x[1]]); }
  return out;
}
function ivIntersect(a, b) {
  const out = []; let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    const s = Math.max(a[i][0], b[j][0]), e = Math.min(a[i][1], b[j][1]);
    if (e > s) out.push([s, e]);
    if (a[i][1] < b[j][1]) i++; else j++;
  }
  return out;
}
// busy minutes of day d from timed occurrences matching pick
function dayBusy(occ, d, pick) {
  const D0 = dn(d) * 1440;
  return ivMerge(occ.filter(o => !o.allDay && pick(o)).map(o => [Math.max(o.A - D0, 0), Math.min(o.B - D0, 1440)]));
}
// times when every member has a personal (not shared) commitment
function bothBusy(occ, d, ids) {
  if (!ids || ids.length < 2) return [];
  let acc = null;
  for (const id of ids) {
    const iv = dayBusy(occ, d, o => o.ev.owner_id === id);
    acc = acc === null ? iv : ivIntersect(acc, iv);
    if (!acc.length) return [];
  }
  return acc.filter(x => x[1] - x[0] >= 15);
}
function freeSlots(busy, from, to, minLen) {
  const out = []; let cur = from;
  for (const [a, b] of busy) { if (b <= cur) continue; if (a > cur) out.push([cur, Math.min(a, to)]); cur = Math.max(cur, b); if (cur >= to) break; }
  if (cur < to) out.push([cur, to]);
  return out.filter(x => x[1] - x[0] >= minLen);
}
// ===== end shared =====

// ===== minimal Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) on WebCrypto – works in Deno and Node 20+ =====
const _enc = new TextEncoder();
function b64uDecode(s) {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64uEncode(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function concatBytes(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function hkdf(salt, ikm, info, len) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8));
}
async function encryptPayload(p256dh, authSecretB64, plaintext) {
  const uaPub = b64uDecode(p256dh), authSecret = b64uDecode(authSecretB64);
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, concatBytes(_enc.encode('WebPush: info\0'), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, _enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, _enc.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concatBytes(plaintext, new Uint8Array([2]))));
  const header = new Uint8Array(86);
  header.set(salt, 0); new DataView(header.buffer).setUint32(16, 4096); header[20] = 65; header.set(asPub, 21);
  return concatBytes(header, ct);
}
let _vapidKey = null;
const _jwtCache = new Map();
async function vapidHeader(endpoint, pub, priv, subject) {
  const aud = new URL(endpoint).origin, now = Math.floor(Date.now() / 1000);
  const c = _jwtCache.get(aud);
  if (c && c.exp - now > 3600) return `vapid t=${c.jwt}, k=${pub}`;
  if (!_vapidKey) {
    const p = b64uDecode(pub);
    _vapidKey = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: b64uEncode(p.slice(1, 33)), y: b64uEncode(p.slice(33, 65)), d: priv, ext: true },
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  }
  const exp = now + 12 * 3600;
  const unsigned = b64uEncode(_enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))) + '.' + b64uEncode(_enc.encode(JSON.stringify({ aud, exp, sub: subject })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, _vapidKey, _enc.encode(unsigned)));
  const jwt = unsigned + '.' + b64uEncode(sig);
  _jwtCache.set(aud, { jwt, exp });
  return `vapid t=${jwt}, k=${pub}`;
}
// returns HTTP status from the push service (201 = ok, 404/410 = subscription gone)
async function sendWebPush(sub, payload, vapid, opts = {}) {
  const body = await encryptPayload(sub.p256dh, sub.auth, _enc.encode(typeof payload === 'string' ? payload : JSON.stringify(payload)));
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream',
      TTL: String(opts.ttl ?? 86400), Urgency: opts.urgency || 'normal',
      Authorization: await vapidHeader(sub.endpoint, vapid.publicKey, vapid.privateKey, vapid.subject)
    },
    body
  });
  try { await res.arrayBuffer(); } catch (_) {}
  return res.status;
}
// ===== end web push =====


const SB_URL = Deno.env.get('SUPABASE_URL');
function serviceKey() {
  const k = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (k) return k;
  try { const j = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); return j.default || Object.values(j)[0] || ''; } catch (_) { return ''; }
}
const db = createClient(SB_URL, serviceKey(), { auth: { persistSession: false, autoRefreshToken: false } });
const VAPID = { publicKey: Deno.env.get('VAPID_PUBLIC_KEY'), privateKey: Deno.env.get('VAPID_PRIVATE_KEY'), subject: Deno.env.get('VAPID_SUBJECT') || 'https://hayoman-shelanu.pages.dev' };
const HOOK = Deno.env.get('HOOK_SECRET') || '';
const TZ = 'Asia/Jerusalem';
const HE_D = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

// ---------- time zone helpers ----------
const FMT = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function localAt(ms) {
  const p = {}; for (const x of FMT.formatToParts(new Date(ms))) p[x.type] = x.value;
  return { date: `${p.year}-${p.month}-${p.day}`, min: (+p.hour % 24) * 60 + (+p.minute) };
}
function tzOffsetMin(ms) {
  const m = Math.floor(ms / 60000) * 60000, l = localAt(m);
  return Math.round((dn(l.date) * 864e5 + l.min * 60000 - m) / 60000);
}
function localToUtcMs(date, min) {
  const wall = dn(date) * 864e5 + min * 60000;
  let utc = wall - tzOffsetMin(wall) * 60000;
  const off2 = tzOffsetMin(utc);
  utc = wall - off2 * 60000;
  return utc;
}
const relDay = (d, t) => d === t ? 'היום' : d === addDays(t, 1) ? 'מחר' : d === addDays(t, -1) ? 'אתמול' : `${HE_D[dowOf(d)]} ${+d.slice(8)}.${+d.slice(5, 7)}`;
const dShort = d => `${+d.slice(8)}.${+d.slice(5, 7)}`;

// ---------- sending ----------
async function sendToUsers(userIds, msg, opts) {
  if (!userIds.length) return { sent: 0, subs: 0 };
  const { data: subs, error } = await db.from('push_subs').select('*').in('user_id', userIds);
  if (error) throw error;
  let sent = 0; const dead = [], ok = [];
  await Promise.all((subs || []).map(async s => {
    try {
      const st = await sendWebPush(s, msg, VAPID, opts);
      if (st >= 200 && st < 300) { sent++; ok.push(s.endpoint); }
      else if (st === 404 || st === 410) dead.push(s.endpoint);
      else console.log('push status', st, s.endpoint.slice(0, 50));
    } catch (e) { console.log('push error', String(e)); }
  }));
  if (dead.length) await db.from('push_subs').delete().in('endpoint', dead);
  if (ok.length) await db.from('push_subs').update({ last_ok: new Date().toISOString() }).in('endpoint', ok);
  return { sent, subs: (subs || []).length, removed: dead.length };
}

// ---------- change notifications ----------
const KIND1 = { shift: 'משמרת', task: 'משימה', event: 'אירוע' }, KINDN = { shift: 'משמרות', task: 'משימות', event: 'אירועים' };
function composeChange(actor, items, mems, today, to, note) {
  const name = actor ? actor.display_name : 'מישהו', f = actor && actor.gender === 'f';
  const V = { insert: f ? 'הוסיפה' : 'הוסיף', update: f ? 'עדכנה' : 'עדכן', delete: f ? 'מחקה' : 'מחק', done: f ? 'סיימה' : 'סיים' };
  const when = it => it.ev_date ? relDay(it.ev_date, today) + (it.ev_time ? ' · ' + String(it.ev_time).slice(0, 5) : '') : '';
  const whose = it => !it.owner_id ? (mems.length > 1 ? ' (שלנו)' : '') : it.owner_id === to.user_id ? ' (שלך)' : (actor && it.owner_id === actor.user_id) ? '' : ` (של ${(mems.find(m => m.user_id === it.owner_id) || {}).display_name || ''})`;
  const urlOf = it => it.kind === 'task' ? '/?tasks=1' : it.action !== 'delete' && it.ev_date ? `/?d=${it.ev_date}` : '/?feed=1';
  if (items.length === 1) {
    const it = items[0];
    return {
      title: `${name} ${V[it.action] || V.update} ${KIND1[it.kind] || 'אירוע'}`,
      body: [[`${it.title || ''}${it.kids ? ' · ' + it.kids : ''}${whose(it)}`, when(it), it.recur ? '🔁' : ''].filter(Boolean).join(' · '), note].filter(Boolean).join('\n'),
      url: urlOf(it), tag: 'chg-' + (it.event_id || Date.now())
    };
  }
  const acts = [...new Set(items.map(i => i.action))], kinds = [...new Set(items.map(i => i.kind))], n = items.length;
  const title = acts.length === 1 && kinds.length === 1
    ? `${name} ${V[acts[0]] || V.update} ${n} ${KINDN[kinds[0]] || 'פריטים'}`
    : `${name} ${f ? 'עדכנה' : 'עדכן'} ${n} פריטים ביומן`;
  const lines = items.slice(0, 5).map(it => `${it.action === 'delete' ? '✖ ' : it.action === 'done' ? '✓ ' : ''}${it.title || ''}${it.kids ? ' · ' + it.kids : ''}${whose(it)}${it.ev_date ? ' · ' + relDay(it.ev_date, today) : ''}`);
  if (n > 5) lines.push(`ועוד ${n - 5}…`);
  if (note) lines.push(note);
  return { title, body: lines.join('\n'), url: kinds.length === 1 && kinds[0] === 'task' ? '/?tasks=1' : '/?feed=1', tag: 'chg-batch-' + Date.now() };
}
// "both of you are busy at the same time" created by this change (2-person calendars)
async function bothBusyNote(hh, items, mems, today) {
  if (mems.length !== 2) return '';
  const ch = items.filter(i => i.action !== 'delete' && i.kind !== 'task' && i.ev_date && i.owner_id && i.ev_time && !i.recur);
  if (!ch.length) return '';
  const ids = new Set(ch.map(i => i.event_id)), dates = [...new Set(ch.map(i => i.ev_date))].sort();
  const { data: evs } = await db.from('events').select('*').eq('household_id', hh).or(`end_date.gte.${addDays(dates[0], -2)},recur.not.is.null`).lte('start_date', addDays(dates[dates.length - 1], 2));
  const hits = [];
  for (const d of dates) {
    const occ = expand(evs || [], addDays(d, -2), addDays(d, 1));
    for (const dd of [d, addDays(d, 1)]) {
      const D0 = dn(dd) * 1440;
      const mine = occ.filter(o => ids.has(o.ev.id) && o.date === d).map(o => [o.A - D0, o.B - D0]);
      for (const [a, b] of bothBusy(occ, dd, mems.map(m => m.user_id))) if (mine.some(([x, y]) => x < b && a < y) && !hits.some(h => h[0] === dd && h[1] === a)) hits.push([dd, a, b]);
    }
  }
  if (!hits.length) return '';
  if (hits.length === 1) return `⚠️ שניכם עסוקים במקביל ${relDay(hits[0][0], today)} ${fmtT(hits[0][1])}-${fmtT(hits[0][2])}`;
  return `⚠️ ${hits.length} פעמים ששניכם עסוקים במקביל`;
}
async function handleChange(b) {
  const items = b.items || [];
  if (!items.length) return { sent: 0 };
  const { data: mems } = await db.from('members').select('user_id, display_name, gender, notify_changes').eq('household_id', b.household_id);
  const all = mems || [], actor = all.find(m => m.user_id === b.actor_id), today = localAt(Date.now()).date;
  const targets = all.filter(m => m.user_id !== b.actor_id && m.notify_changes);
  if (!targets.length) return { sent: 0 };
  let note = '';
  try { note = await bothBusyNote(b.household_id, items, all, today); } catch (e) { console.log('note error', String(e)); }
  let sent = 0;
  for (const t of targets) sent += (await sendToUsers([t.user_id], composeChange(actor, items, all, today, t, note), { ttl: 86400 })).sent;
  return { sent };
}

// ---------- kids ----------
let kidsMemo = null;
async function kidsMap() {
  if (!kidsMemo) { const { data } = await db.from('kids').select('id, name, emoji'); kidsMemo = new Map((data || []).map(k => [k.id, `${k.emoji || '🧒'} ${k.name}`])); }
  return kidsMemo;
}
const kidsTxt = (ev, KM) => (ev.kid_ids || []).map(id => KM.get(id)).filter(Boolean).join(', ');

// ---------- reminders ----------
const WINDOW = 10; // minutes of tolerance for a missed tick
function reminderMsg(x, today) {
  const ev = x.ev, s = ev.all_day ? 9 * 60 : (tmin(ev.start_time) || 0);
  let rel;
  if (ev.all_day) rel = relDay(x.d, today);
  else if (x.off === 0) rel = 'עכשיו';
  else if (x.off < 60) rel = `בעוד ${x.off} דקות`;
  else if (x.off === 60) rel = 'בעוד שעה';
  else if (x.off === 120) rel = 'בעוד שעתיים';
  else if (x.off < 1440 && x.d === today) rel = `בעוד ${Math.round(x.off / 60)} שעות`;
  else rel = relDay(x.d, today);
  const parts = [rel];
  if (!ev.all_day) parts.push(fmtT(s) + (ev.end_time ? '-' + String(ev.end_time).slice(0, 5) : ''));
  if (x.kids) parts.push(x.kids);
  if (ev.location) parts.push(ev.location);
  return { title: `${ev.kind === 'shift' ? '🕒' : '⏰'} ${ev.title}`, body: parts.join(' · '), url: `/?d=${x.d}`, tag: `rem-${ev.id}-${x.d}`, sticky: !ev.all_day && x.off <= 60 };
}
async function doReminders(now, mems) {
  const { data: evs, error } = await db.from('events').select('*').neq('reminders', '{}');
  if (error) throw error;
  const due = [];
  for (const ev of evs || []) {
    const s = ev.all_day ? 9 * 60 : (tmin(ev.start_time) || 0);
    for (const off of ev.reminders || []) {
      const hi = now + off * 60000, lo = hi - WINDOW * 60000;
      for (const d of occDates(ev, localAt(lo - 864e5).date, localAt(hi + 864e5).date)) {
        const t = localToUtcMs(d, s);
        if (t > lo && t <= hi) due.push({ ev, d, off, key: `${d} ${fmtT(s)}` });
      }
    }
  }
  if (!due.length) return 0;
  const { data: ins, error: e2 } = await db.from('reminder_log')
    .upsert(due.map(x => ({ event_id: x.ev.id, occ_key: x.key, offset_min: x.off })), { onConflict: 'event_id,occ_key,offset_min', ignoreDuplicates: true })
    .select();
  if (e2) throw e2;
  const fresh = new Set((ins || []).map(r => `${r.event_id}|${r.occ_key}|${r.offset_min}`));
  const today = localAt(now).date;
  const KM = due.some(x => (x.ev.kid_ids || []).length) ? await kidsMap() : new Map();
  let sent = 0;
  for (const x of due) {
    if (!fresh.has(`${x.ev.id}|${x.key}|${x.off}`)) continue;
    x.kids = kidsTxt(x.ev, KM);
    const hh = mems.filter(m => m.household_id === x.ev.household_id && m.notify_reminders);
    const targets = (x.ev.owner_id ? hh.filter(m => m.user_id === x.ev.owner_id) : hh).map(m => m.user_id);
    const r = await sendToUsers(targets, reminderMsg(x, today), { ttl: Math.max(600, Math.min(x.off * 60, 6 * 3600)), urgency: 'high' });
    sent += r.sent;
  }
  return sent;
}

// ---------- digests ----------
const evCache = new Map();
async function hhEvents(hh, from) {
  if (!evCache.has(hh)) {
    const { data } = await db.from('events').select('*').eq('household_id', hh).or(`end_date.gte.${addDays(from, -3)},recur.not.is.null`);
    evCache.set(hh, data || []);
  }
  return evCache.get(hh);
}
function onDay(occ, d) { const D0 = dn(d) * 1440; return occ.filter(o => o.A < D0 + 1440 && o.B > D0 && (o.allDay || o.date === d || o.A >= D0 - 6 * 60)); }
async function digest(m, kind, L, mems) {
  const { data: ins } = await db.from('digest_log').upsert({ user_id: m.user_id, kind, day: L.date }, { onConflict: 'user_id,kind,day', ignoreDuplicates: true }).select();
  if (!ins || !ins.length) return 0;
  const evs = await hhEvents(m.household_id, L.date);
  const hhm = mems.filter(x => x.household_id === m.household_id);
  const nameOf = id => (hhm.find(x => x.user_id === id) || {}).display_name || '';
  const KM = await kidsMap();
  const fmt = (o, withOwner) => {
    const kt = kidsTxt(o.ev, KM), own = (withOwner && o.ev.owner_id && o.ev.owner_id !== m.user_id ? ` (${nameOf(o.ev.owner_id)})` : '') + (kt ? ` · ${kt}` : '');
    if (o.ev.kind === 'shift') return `${o.ev.title} ${fmtT(o.s)}-${fmtT(o.e)}${own}`;
    return `${o.allDay ? '' : fmtT(o.s) + ' '}${o.ev.title}${own}`;
  };
  if (kind === 'daily') {
    const occ = onDay(expand(evs, addDays(L.date, -7), L.date), L.date);
    const mine = occ.filter(o => o.ev.owner_id === m.user_id).map(o => fmt(o));
    const shared = occ.filter(o => !o.ev.owner_id).map(o => fmt(o));
    const others = hhm.filter(x => x.user_id !== m.user_id).map(x => [x.display_name, occ.filter(o => o.ev.owner_id === x.user_id).map(o => fmt(o))]).filter(a => a[1].length);
    if (!mine.length && !shared.length && !others.length) return 0;
    const lines = [];
    if (mine.length) lines.push('שלך: ' + mine.join(' · '));
    if (shared.length) lines.push('משותף: ' + shared.join(' · '));
    for (const [n, a] of others) lines.push(`${n}: ${a.join(' · ')}`);
    const r = await sendToUsers([m.user_id], { title: `☀️ ${L.min < 12 * 60 ? 'בוקר טוב' : 'היום'} ${m.display_name} · ${HE_D[dowOf(L.date)]} ${dShort(L.date)}`, body: lines.join('\n'), url: `/?d=${L.date}`, tag: 'daily-' + L.date }, { ttl: 4 * 3600 });
    return r.sent;
  }
  const from = addDays(L.date, 1), to = addDays(L.date, 7);
  const occ = expand(evs, addDays(from, -7), to);
  const lines = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const items = onDay(occ, d).filter(o => o.allDay || o.date === d);
    if (!items.length) continue;
    lines.push(`${HE_D[dowOf(d)]} ${dShort(d)}: ${items.slice(0, 4).map(o => fmt(o, true)).join(' · ')}${items.length > 4 ? ` +${items.length - 4}` : ''}`);
  }
  if (hhm.length >= 2) {
    const fr = [];
    for (let d = from; d <= to && fr.length < 3; d = addDays(d, 1)) {
      const w = freeSlots(dayBusy(occ, d, () => true), 7 * 60, 23 * 60, 90).filter(([a, b]) => b > 17 * 60 || dowOf(d) >= 5);
      if (w.length) { const best = w.sort((x, y) => (y[1] - y[0]) - (x[1] - x[0]))[0]; fr.push(`${HE_D[dowOf(d)]} ${fmtT(best[0])}-${fmtT(best[1])}`); }
    }
    if (fr.length) lines.push('💛 פנויים יחד: ' + fr.join(' · '));
  }
  const { data: tks } = await db.from('tasks').select('title').eq('household_id', m.household_id).eq('done', false).order('created_at').limit(30);
  if (tks && tks.length) lines.push(`📝 משימות פתוחות (${tks.length}): ${tks.slice(0, 3).map(t => t.title).join(' · ')}${tks.length > 3 ? ' …' : ''}`);
  if (!lines.length) return 0;
  const r = await sendToUsers([m.user_id], { title: `📅 השבוע ביומן (${dShort(from)}-${dShort(to)})`, body: lines.join('\n'), url: `/?d=${from}`, tag: 'weekly-' + from }, { ttl: 12 * 3600 });
  return r.sent;
}
async function handleTick() {
  const now = Date.now(), L = localAt(now), out = { reminders: 0, daily: 0, weekly: 0 };
  evCache.clear(); kidsMemo = null;
  const { data: mems, error } = await db.from('members').select('*');
  if (error) throw error;
  out.reminders = await doReminders(now, mems || []);
  for (const m of mems || []) {
    if (m.notify_daily && L.min >= m.daily_hour * 60 && L.min < m.daily_hour * 60 + 15) out.daily += await digest(m, 'daily', L, mems);
    if (m.notify_weekly && dowOf(L.date) === 6 && L.min >= 21 * 60 && L.min < 21 * 60 + 15) out.weekly += await digest(m, 'weekly', L, mems);
  }
  if (L.min === 3 * 60 + 30) {
    await db.from('reminder_log').delete().lt('sent_at', new Date(now - 40 * 864e5).toISOString());
    await db.from('digest_log').delete().lt('sent_at', new Date(now - 40 * 864e5).toISOString());
  }
  evCache.clear();
  return out;
}

// ---------- test ----------
async function handleTest(req) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data, error } = await db.auth.getUser(token);
  if (error || !data || !data.user) return { error: 'unauthorized', sent: 0 };
  return await sendToUsers([data.user.id], { title: 'היומן שלנו ✓', body: 'ההתראות עובדות במכשיר הזה', url: '/', tag: 'test' }, { ttl: 600, urgency: 'high' });
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  let body = {};
  try { body = await req.json(); } catch (_) {}
  try {
    if (body.type === 'test') return json(await handleTest(req));
    if (!HOOK || req.headers.get('x-hook-secret') !== HOOK) return json({ error: 'unauthorized' }, 401);
    if (body.type === 'change') return json(await handleChange(body));
    if (body.type === 'tick') return json(await handleTick());
    return json({ error: 'unknown type' }, 400);
  } catch (e) {
    console.error('push fn error', e);
    return json({ error: String((e && e.message) || e) }, 500);
  }
});
