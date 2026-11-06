/**
 * שמירה מקומית בטוחה (localStorage עטוף ב-try/catch — עובד גם כשהאחסון חסום).
 */
export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
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

/** מצב התקדמות + הגדרות. שומר אוטומטית בכל שינוי. */
export class ProgressStore {
  constructor() {
    const def = DEFAULT_PROGRESS();
    const saved = readJSON(PROGRESS_KEY, null);
    this.data = saved ? { ...def, ...saved, settings: { ...def.settings, ...(saved.settings || {}) }, profile: { ...def.profile, ...(saved.profile || {}) } } : def;
    if (!Array.isArray(this.data.eraProgress) || this.data.eraProgress.length !== 10) this.data.eraProgress = def.eraProgress;
    if (!this.data.profile.name) {
      const he = this.data.settings.lang === 'he';
      this.data.profile.name = `${he ? 'מלך' : 'King'} ${Math.floor(100 + Math.random() * 900)}`;
    }
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
