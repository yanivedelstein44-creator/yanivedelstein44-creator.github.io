// היומן שלנו – "מתמונה ליומן": reads a photo or screenshot of a schedule and returns calendar items.
// Provider: Google Gemini API on the free tier (no billing account linked → $0, rate-limited per model).
//   Secret GEMINI_API_KEY (required). Optional: SCAN_MODELS (comma list, tried in order when one is busy or
//   out of its free daily quota), SCAN_THINKING (low|medium|high, default medium), SCAN_DAILY_LIMIT (per calendar, default 40).
// Paid alternative: SCAN_PROVIDER=claude + ANTHROPIC_API_KEY (+ SCAN_MODEL, default claude-haiku-5-5).
// Deployed with JWT verification ON: only signed-in members of a calendar can call it.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

const env = (k: string, d = '') => (Deno.env.get(k) || d).trim();
const SB_URL = env('SUPABASE_URL');
function serviceKey() {
  const k = env('SUPABASE_SERVICE_ROLE_KEY');
  if (k) return k;
  try { const j = JSON.parse(env('SUPABASE_SECRET_KEYS', '{}')); return j.default || String(Object.values(j)[0] || ''); } catch { return ''; }
}
const db = createClient(SB_URL, serviceKey(), { auth: { persistSession: false, autoRefreshToken: false } });
const GEMINI_KEY = env('GEMINI_API_KEY');
const CLAUDE_KEY = env('ANTHROPIC_API_KEY');
const PROVIDER = env('SCAN_PROVIDER', GEMINI_KEY || !CLAUDE_KEY ? 'gemini' : 'claude').toLowerCase();
const MODELS = env('SCAN_MODELS', 'gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash-lite').split(',').map(s => s.trim()).filter(Boolean);
const THINKING = env('SCAN_THINKING', 'medium').toLowerCase();
const CLAUDE_MODEL = env('SCAN_MODEL', 'claude-haiku-5-5');
const LIMIT = parseInt(env('SCAN_DAILY_LIMIT', '40'), 10) || 40;
const BUDGET_MS = 110_000; // stay well inside the Edge Function wall-clock limit

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-region', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const HE_DAY = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

class ScanError extends Error {
  code: string; status: number;
  constructor(code: string, status = 502, detail = '') { super(detail || code); this.code = code; this.status = status; }
}

// ---------- what we ask for ----------
const ITEM = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short Hebrew title, max 40 characters. For a shift: the shift name as written, e.g. "לילה".' },
    kind: { type: 'string', enum: ['shift', 'event'] },
    date: { type: 'string', description: 'YYYY-MM-DD' },
    all_day: { type: 'boolean' },
    start: { type: 'string', description: 'HH:MM, 24-hour. Empty when all_day.' },
    end: { type: 'string', description: 'HH:MM, 24-hour, as written (an overnight shift keeps its morning end, e.g. 08:00). Empty if unknown.' },
    owner: { type: 'string', enum: ['me', 'partner', 'both', 'unknown'] },
    kids: { type: 'array', items: { type: 'string' }, description: 'Names from the children list that this item is for.' },
    location: { type: 'string' },
    notes: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] }
  },
  required: ['title', 'kind', 'date', 'all_day', 'start', 'end', 'owner', 'confidence']
};
const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'One short Hebrew sentence: what the image is.' },
    people: { type: 'array', items: { type: 'string' }, description: 'Only for a roster of many people in which neither "me" nor "partner" appears: every person name exactly as written. Otherwise an empty list.' },
    items: { type: 'array', items: ITEM }
  },
  required: ['summary', 'people', 'items']
};
const SYSTEM = 'You read photos and screenshots of schedules for a Hebrew family calendar app and report the calendar items in the requested JSON structure. Never invent items; when the image has no schedule, return an empty list. Write titles, places and the summary in Hebrew.';

function instructions(today: string, me: any, partner: any, kids: string[]) {
  const alias = (m: any) => m && m.roster_name && m.roster_name.trim() && m.roster_name.trim() !== m.display_name ? ` (in schedules written as "${m.roster_name.trim()}")` : '';
  const dow = HE_DAY[new Date(today + 'T12:00:00Z').getUTCDay()];
  return [
    `Today is ${today} (יום ${dow}). Time zone: Asia/Jerusalem.`,
    'This calendar belongs to a couple:',
    `- "me" (the person who sent the image): ${me.display_name}${alias(me)}`,
    partner ? `- "partner": ${partner.display_name}${alias(partner)}` : '- (no partner has joined yet)',
    kids.length ? `Children: ${kids.join(', ')}.` : 'No children are registered.',
    'Rules:',
    '1. A work roster or shift table listing many people (columns = days, rows = shifts, cells = names): return ONLY the shifts of "me" and "partner". Names may be written last-name-first, shortened, or highlighted (e.g. white text on a dark box, which usually marks the viewer). One item per cell that contains their name: kind "shift", title = the shift name from the row label (e.g. "לילה", "בוקר", "ערב CT"), start/end from the hours in the label ("21-08" means 21:00 until 08:00 next morning, so end "08:00"; "08-13" means 08:00 to 13:00).',
    '2. Hebrew tables read right-to-left: the right-most column usually holds the row labels and the days run from right (Sunday, א׳) to left (Saturday, ש׳). Take each item\'s date from the header of its own column and double-check it.',
    '3. If the image is such a roster and neither "me" nor "partner" appears in it, return no items and list every person name in "people" (as written, at most 40). In every other case "people" is an empty list.',
    '4. Any other image (chat messages, SMS, invitations, appointment slips, school or kindergarten schedules, e-mails, posters): one item per appointment or event, kind "event", with date, times and place when written. Holiday names printed in a header are not items.',
    '5. Dates as YYYY-MM-DD. Resolve relative dates (מחר, יום שלישי, next week) from today; when the year is missing use the next upcoming date.',
    '6. Times as HH:MM, 24-hour. No time at all: all_day true with empty start and end. Only a start time: empty end.',
    '7. owner: "me" or "partner" when the item is clearly for one of them, "both" for couple or family items, otherwise "unknown". kids: names from the children list that the item is for.',
    '8. confidence "low" when the text was hard to read or anything was guessed.'
  ].join('\n');
}

// ---------- clean what comes back ----------
const clean = (s: unknown, n: number) => typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, n) : '';
const hhmm = (s: unknown) => { const m = /^(\d{1,2})[:.]?(\d{2})$/.exec(clean(s, 5)); if (!m) return ''; const h = +m[1], mi = +m[2]; return h < 24 && mi < 60 ? `${String(h).padStart(2, '0')}:${m[2]}` : ''; };
const ymd = (s: unknown) => {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(clean(s, 10)); if (!m) return '';
  const d = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const t = new Date(d + 'T12:00:00Z');
  return isNaN(+t) || t.toISOString().slice(0, 10) !== d ? '' : d;
};
const names = (a: unknown, n: number) => Array.isArray(a) ? [...new Set(a.map(x => clean(x, 40)).filter(Boolean))].slice(0, n) : [];
function sanitize(items: unknown) {
  const out = [];
  for (const it of Array.isArray(items) ? items.slice(0, 60) as any[] : []) {
    const date = ymd(it && it.date);
    if (!date) continue;
    const start = hhmm(it.start), allDay = !!it.all_day || !start;
    out.push({
      title: clean(it.title, 60) || 'אירוע', kind: it.kind === 'shift' ? 'shift' : 'event', date, all_day: allDay,
      start: allDay ? '' : start, end: allDay ? '' : hhmm(it.end),
      owner: ['me', 'partner', 'both', 'unknown'].includes(it.owner) ? it.owner : 'unknown',
      kids: names(it.kids, 6),
      location: clean(it.location, 120), notes: clean(it.notes, 300),
      confidence: ['high', 'medium', 'low'].includes(it.confidence) ? it.confidence : 'medium'
    });
  }
  return out;
}

// ---------- Gemini (free tier) ----------
type Opts = { media: boolean; thinking: boolean; schema: boolean };
function geminiBody(img: string, mt: string, text: string, o: Opts) {
  const image: any = { inlineData: { mimeType: mt, data: img } };
  if (o.media) image.mediaResolution = { level: 'media_resolution_high' }; // small print in rosters needs the sharper view
  const gc: any = { responseMimeType: 'application/json', maxOutputTokens: 16384 };
  if (o.schema) gc.responseJsonSchema = SCHEMA;
  if (o.thinking) gc.thinkingConfig = { thinkingLevel: THINKING };
  return {
    systemInstruction: { parts: [{ text: o.schema ? SYSTEM : `${SYSTEM}\nAnswer with JSON only, following this JSON Schema: ${JSON.stringify(SCHEMA)}` }] },
    contents: [{ role: 'user', parts: [image, { text }] }],
    generationConfig: gc
  };
}
function readGemini(j: any) {
  const c = j && j.candidates && j.candidates[0];
  if (!c) throw new ScanError(j && j.promptFeedback && j.promptFeedback.blockReason ? 'blocked' : 'failed', 422, 'no candidate: ' + JSON.stringify(j && j.promptFeedback || {}).slice(0, 120));
  const text = ((c.content && c.content.parts) || []).filter((p: any) => typeof p.text === 'string' && !p.thought).map((p: any) => p.text).join('').trim();
  const fr = String(c.finishReason || '');
  if (!text) throw new ScanError(/SAFETY|PROHIBITED|BLOCKLIST|SPII/.test(fr) ? 'blocked' : 'failed', 422, 'empty: ' + fr);
  try { return JSON.parse(text); } catch { /* fall through */ }
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  try { if (a >= 0 && b > a) return JSON.parse(text.slice(a, b + 1)); } catch { /* fall through */ }
  throw new ScanError('failed', 502, 'bad json, finish ' + fr);
}
async function scanGemini(img: string, mt: string, text: string, t0: number) {
  let o: Opts = { media: true, thinking: true, schema: true };
  let busy = false, last = '';
  for (const model of MODELS) {
    let tries = 0;
    while (Date.now() - t0 < BUDGET_MS) {
      tries++;
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), Math.max(5000, BUDGET_MS - (Date.now() - t0)));
      let status = 0, j: any = {};
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST', headers: { 'x-goog-api-key': GEMINI_KEY, 'content-type': 'application/json' },
          body: JSON.stringify(geminiBody(img, mt, text, o)), signal: ctl.signal
        });
        status = r.status; j = await r.json().catch(() => ({}));
      } catch (e) { j = { error: { message: String(e) } }; }
      finally { clearTimeout(timer); }
      if (status === 200) {
        const u = j.usageMetadata || {};
        return { out: readGemini(j), model: String(j.modelVersion || model), usage: { input: u.promptTokenCount || 0, output: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0) } };
      }
      const err = j.error || {}, msg = String(err.message || status), st = String(err.status || '');
      last = `${model} ${status} ${msg}`.slice(0, 300);
      console.log('gemini', last);
      if (status === 429 || st === 'RESOURCE_EXHAUSTED') { busy = true; break; } // this model's free quota or rate is used up: next model
      if (status === 404 || st === 'NOT_FOUND') break; // model retired: next model
      if (/API key not valid|API_KEY_INVALID|API key expired|API key not found/i.test(msg) || status === 401 || status === 403) throw new ScanError('bad_key', 502, msg);
      if (/location is not supported/i.test(msg)) throw new ScanError('region', 502, msg);
      if (status === 400) {
        // an option this model does not accept: drop the extras, then the schema, and try again
        if (o.media || o.thinking) { o = { ...o, media: false, thinking: false }; continue; }
        if (o.schema) { o = { ...o, schema: false }; continue; }
        throw new ScanError('failed', 502, msg);
      }
      if (tries < 2) { await sleep(1200); continue; } // overloaded or network: one more try on the same model
      break;
    }
  }
  throw new ScanError(busy ? 'busy' : 'failed', busy ? 429 : 502, last);
}

// ---------- Claude (paid, optional) ----------
async function scanClaude(img: string, mt: string, text: string) {
  const body: any = {
    model: CLAUDE_MODEL, max_tokens: 4000, thinking: { type: 'disabled' }, system: SYSTEM,
    tools: [{ name: 'calendar_items', description: 'Return the calendar items found in the image.', input_schema: SCHEMA }],
    tool_choice: { type: 'tool', name: 'calendar_items' },
    messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mt, data: img } }, { type: 'text', text }] }]
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': CLAUDE_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      if (j.stop_reason === 'refusal') throw new ScanError('blocked', 422, 'refusal');
      const tool = (j.content || []).find((c: any) => c.type === 'tool_use');
      if (!tool) throw new ScanError('failed', 502, 'no tool_use');
      return { out: tool.input, model: String(j.model || CLAUDE_MODEL), usage: { input: (j.usage && j.usage.input_tokens) || 0, output: (j.usage && j.usage.output_tokens) || 0 } };
    }
    const msg = String((j.error && j.error.message) || r.status);
    if (r.status === 400 && body.thinking && /thinking/i.test(msg)) { delete body.thinking; continue; }
    if (r.status === 401 || r.status === 403) throw new ScanError('bad_key', 502, msg);
    if ([429, 500, 502, 503, 529].includes(r.status) && attempt < 2) { await sleep(1500 * (attempt + 1)); continue; }
    const busy = r.status === 429 || r.status === 529;
    throw new ScanError(busy ? 'busy' : 'failed', busy ? 429 : 502, msg);
  }
  throw new ScanError('failed');
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const t0 = Date.now();
  let me: any = null, uid = '', called = false;
  try {
    if (!(PROVIDER === 'claude' ? CLAUDE_KEY : GEMINI_KEY)) return json({ error: 'no_key' }, 503);
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: au } = await db.auth.getUser(token);
    uid = (au && au.user && au.user.id) || '';
    if (!uid) return json({ error: 'auth' }, 401);
    ({ data: me } = await db.from('members').select('*').eq('user_id', uid).maybeSingle());
    if (!me) return json({ error: 'no_household' }, 403);
    const since = new Date(Date.now() - 864e5).toISOString();
    const { count } = await db.from('scan_log').select('id', { count: 'exact', head: true }).eq('household_id', me.household_id).gte('created_at', since);
    if ((count || 0) >= LIMIT) return json({ error: 'limit', limit: LIMIT }, 429);

    const b = await req.json().catch(() => ({}));
    const img = typeof b.image === 'string' ? b.image.replace(/^data:[^,]+,/, '') : '';
    const mt = ['image/jpeg', 'image/png', 'image/webp'].includes(b.mediaType) ? b.mediaType : 'image/jpeg';
    if (!img || img.length > 8_000_000) return json({ error: 'image' }, 413);
    const today = ymd(b.today) || new Date().toISOString().slice(0, 10);
    const roster = clean(b.rosterName, 40);
    if (roster) me = { ...me, roster_name: roster };

    const [{ data: mems }, kq] = await Promise.all([
      db.from('members').select('user_id, display_name, roster_name, joined_at').eq('household_id', me.household_id).order('joined_at'),
      db.from('kids').select('name').eq('household_id', me.household_id).order('sort')
    ]);
    const partner = (mems || []).find((m: any) => m.user_id !== uid) || null;
    const kids = ((kq && kq.data) || []).map((k: any) => k.name);
    const text = instructions(today, me, partner, kids);

    called = true;
    const r = PROVIDER === 'claude' ? await scanClaude(img, mt, text) : await scanGemini(img, mt, text, t0);
    const items = sanitize(r.out && r.out.items);
    const people = items.length ? [] : names(r.out && r.out.people, 40);
    await db.from('scan_log').insert({ household_id: me.household_id, user_id: uid, model: r.model, input_tokens: r.usage.input, output_tokens: r.usage.output, items: items.length, ok: true });
    return json({ summary: clean(r.out && r.out.summary, 160), items, people, model: r.model, usage: r.usage });
  } catch (e) {
    const code = e instanceof ScanError ? e.code : 'failed', status = e instanceof ScanError ? e.status : 500;
    console.log('scan error', code, String((e as Error).message || e).slice(0, 300));
    if (called && me) await db.from('scan_log').insert({ household_id: me.household_id, user_id: uid, items: 0, ok: false, error: code });
    return json({ error: code }, status);
  }
});
