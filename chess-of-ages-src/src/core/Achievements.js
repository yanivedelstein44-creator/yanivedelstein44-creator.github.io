/**
 * הישגים ותארים — עם פרסי יהלומים.
 */
export const ACHIEVEMENTS = [
  { id: 'first_win', icon: '🏆', he: 'ניצחון ראשון', en: 'First Victory', desc: 'נצח במשחק הראשון', descEn: 'Win your first game', gems: 50 },
  { id: 'fast_mate', icon: '⚡', he: 'מט בזק', en: 'Lightning Mate', desc: 'מט בפחות מ-20 מהלכים', descEn: 'Checkmate in under 20 moves', gems: 100 },
  { id: 'promote', icon: '👑', he: 'הכתרה', en: 'Coronation', desc: 'הכתר רגלי', descEn: 'Promote a pawn', gems: 30 },
  { id: 'beat_hard', icon: '📐', he: 'מנצח האדריכל', en: 'Architect Slayer', desc: 'נצח את האדריכל העליון', descEn: 'Beat the Supreme Architect', gems: 250 },
  { id: 'streak3', icon: '🔥', he: 'רצף מלכותי', en: 'Royal Streak', desc: '3 ניצחונות ברצף', descEn: '3 wins in a row', gems: 120 },
  { id: 'captures100', icon: '⚔️', he: 'מצביא', en: 'Warlord', desc: 'אכול 100 כלים', descEn: 'Capture 100 pieces', gems: 150 },
  { id: 'era2', icon: '🏛️', he: 'בונה האימפריה', en: 'Empire Builder', desc: 'הגע לעידן הקלאסי', descEn: 'Reach the Classical era', gems: 60 },
  { id: 'era3', icon: '🏰', he: 'אדון הטירה', en: 'Castle Lord', desc: 'הגע לימי הביניים', descEn: 'Reach the Medieval era', gems: 80 },
  { id: 'era5', icon: '🌆', he: 'אזרח העתיד', en: 'Citizen of Tomorrow', desc: 'הגע לעיר הסייבר', descEn: 'Reach the Cyber Citadel', gems: 150 },
  { id: 'base_done', icon: '🌟', he: 'בונה הממלכה', en: 'Kingdom Builder', desc: 'השלם את 10 השלבים הבסיסיים', descEn: 'Complete all 10 base stages', gems: 300 },
  { id: 'online_win', icon: '🌐', he: 'אלוף הרשת', en: 'Online Champion', desc: 'נצח משחק אונליין', descEn: 'Win an online game', gems: 100 },
  { id: 'pass_play', icon: '🤝', he: 'שחמט עם חברים', en: 'Friendly Duel', desc: 'שחק משחק שלם באותו מכשיר', descEn: 'Finish a pass & play game', gems: 40 },
  { id: 'wheel10', icon: '🎡', he: 'גלגל המזל', en: 'Wheel Spinner', desc: 'סובב את הגלגל 10 פעמים', descEn: 'Spin the wheel 10 times', gems: 60 },
  { id: 'streak7', icon: '📅', he: 'נאמן לממלכה', en: 'Loyal Subject', desc: 'רצף התחברות של 7 ימים', descEn: '7-day login streak', gems: 150 },
  { id: 'brilliant', icon: '💎', he: 'מהלך מבריק', en: 'Brilliancy', desc: 'בצע מהלך מבריק', descEn: 'Play a brilliant move', gems: 80 },
  { id: 'dresser', icon: '🧥', he: 'אופנאי מלכותי', en: 'Royal Fashionista', desc: 'קנה פריט לבוש ראשון', descEn: 'Buy your first wearable', gems: 40 },
];

export class Achievements {
  constructor(store, economy) {
    this.store = store;
    this.economy = economy;
    this.listeners = new Set();
    const d = store.get('achievements') || {};
    this.unlocked = d.unlocked || {};
    this.counters = d.counters || { captures: 0, streak: 0, spins: 0 };
  }

  save() { this.store.set({ achievements: { unlocked: this.unlocked, counters: this.counters } }); }
  onUnlock(fn) { this.listeners.add(fn); }
  has(id) { return !!this.unlocked[id]; }

  unlock(id) {
    if (this.unlocked[id]) return;
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return;
    this.unlocked[id] = Date.now();
    this.economy.addGems(a.gems, `achievement:${id}`);
    this.save();
    this.listeners.forEach((fn) => fn(a));
  }

  count(key, n = 1) {
    this.counters[key] = (this.counters[key] || 0) + n;
    this.save();
    if (key === 'captures' && this.counters.captures >= 100) this.unlock('captures100');
    if (key === 'spins' && this.counters.spins >= 10) this.unlock('wheel10');
  }

  resetStreak() { this.counters.streak = 0; this.save(); }
}
