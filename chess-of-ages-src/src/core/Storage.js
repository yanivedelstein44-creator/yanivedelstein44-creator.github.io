/**
 * שמירה מקומית בטוחה (localStorage עטוף ב-try/catch — עובד גם כשהאחסון חסום).
 */
import { withPresetName } from './PlayerName.js';

export function readJSON(key, fallback) {
  let raw = null;
  try {
    raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    backupRaw(key, raw);
    return fallback;
  }
}

/** [qa] A copy of a stored value that could not be used, kept before it gets overwritten (one slot per key). */
function backupRaw(key, raw) {
  if (!raw) return;
  try {
    // eslint-disable-next-line no-console
    console.warn(`[storage] ${key}: unreadable value, kept a backup in ${key}.backup and used defaults`);
    if (localStorage.getItem(`${key}.backup`) !== raw) localStorage.setItem(`${key}.backup`, raw.slice(0, 200000));
  } catch { /* storage unavailable or full */ }
}

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/** [qa] Reads a stored object; anything else (a corrupt string, an array, a number) counts as missing. */
export function readObject(key) {
  const v = readJSON(key, null);
  if (v == null || isObj(v)) return v;
  try { backupRaw(key, localStorage.getItem(key)); } catch { /* storage unavailable */ }
  return null;
}

/**
 * [qa] Top-level type check of a saved state against its defaults (plus optional hints for keys that have no default):
 * a field whose type would crash the game (an array that is not an array, an object that is not an object, a number
 * that is not a finite number) is replaced by its default. Returns the list of repaired keys.
 */
export function repairShape(saved, defaults, hints = {}) {
  const fixed = [];
  const want = (k) => hints[k] || (Array.isArray(defaults[k]) ? 'array' : isObj(defaults[k]) ? 'object' : typeof defaults[k] === 'number' ? 'number' : null);
  for (const k of new Set([...Object.keys(defaults), ...Object.keys(hints)])) {
    if (!(k in saved)) continue;
    const v = saved[k];
    const w = want(k);
    const bad = (w === 'array' && !Array.isArray(v)) || (w === 'object' && !isObj(v)) || (w === 'object?' && v != null && !isObj(v))
      || (w === 'number' && !(typeof v === 'number' && Number.isFinite(v)));
    if (!bad) continue;
    if (k in defaults) saved[k] = typeof defaults[k] === 'object' && defaults[k] ? JSON.parse(JSON.stringify(defaults[k])) : defaults[k];
    else delete saved[k];
    fixed.push(k);
  }
  return fixed;
}

/** [qa] Keeps a backup of the raw stored value when repairShape had to fix something. */
export function backupIfRepaired(key, fixed) {
  if (!fixed.length) return;
  try { backupRaw(key, localStorage.getItem(key)); } catch { /* storage unavailable */ }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key) {
  try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
}

const PROGRESS_KEY = 'chess_ages_progress';

const DEFAULT_PROGRESS = () => ({
  eraProgress: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  lastBuiltEra: 1,
  selectedEra: null,
  wins: 0,
  losses: 0,
  draws: 0,
  rating: 1200,
  difficulty: 'easy',
  timeControl: 10,
  profile: { name: '', avatar: 'crown' },
  settings: { sfx: true, ambience: true, quality: 'auto', reducedMotion: false },
  savedGame: null,
  seenOnlineNotice: false,
  achievements: {},
  createdAt: Date.now(),
});

/** [qa] Types of saved keys that have no entry in DEFAULT_PROGRESS ('object?' = an object or null). */
const PROGRESS_HINTS = { islands: 'object', myRooms: 'array', pendingDocks: 'array', onlineRoom: 'object?', savedGame: 'object?', mapFogLifted: 'number' };

/** מצב התקדמות + הגדרות. שומר אוטומטית בכל שינוי. */
export class ProgressStore {
  constructor() {
    const def = DEFAULT_PROGRESS();
    const saved = readObject(PROGRESS_KEY);
    if (saved) backupIfRepaired(PROGRESS_KEY, repairShape(saved, def, PROGRESS_HINTS));
    this.data = saved ? { ...def, ...saved, settings: { ...def.settings, ...(saved.settings || {}) }, profile: { ...def.profile, ...(saved.profile || {}) } } : def;
    if (!Array.isArray(this.data.eraProgress) || this.data.eraProgress.length !== 10) this.data.eraProgress = def.eraProgress;
    // שם התצוגה — רק מהרשימה הקבועה (core/PlayerName.js): שחקן חדש מקבל "מלך NNN" / "King NNN",
    // ושם חופשי מגרסה קודמת הופך לשם ברירת המחדל. השם מוצג בשפה השמורה.
    this.data.profile = withPresetName(this.data.profile, this.data.settings.lang === 'he' ? 'he' : 'en');
    this.listeners = new Set();
    this.save();
  }

  get(k) { return this.data[k]; }

  set(patch) {
    Object.assign(this.data, patch);
    this.save();
    this.listeners.forEach((fn) => fn(this.data));
  }

  setSetting(k, v) {
    this.data.settings = { ...this.data.settings, [k]: v };
    this.save();
    this.listeners.forEach((fn) => fn(this.data));
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  save() { writeJSON(PROGRESS_KEY, this.data); }

  reset() {
    this.data = DEFAULT_PROGRESS();
    this.save();
    this.listeners.forEach((fn) => fn(this.data));
  }
}

/** מחיקת כל הנתונים המקומיים של האפליקציה (זכות מחיקה) */
export function wipeAllLocalData() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('chess_ages')) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch { /* storage unavailable */ }
}
