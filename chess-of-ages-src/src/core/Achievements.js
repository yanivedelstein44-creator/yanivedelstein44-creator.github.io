/**
 * הישגים ותארים — עם פרסי יהלומים.
 */
export const ACHIEVEMENTS = [
  { id: 'first_win', icon: 'trophy', he: 'ניצחון ראשון', en: 'First Victory', desc: 'נצח במשחק הראשון', descEn: 'Win your first game', gems: 50 },
  { id: 'fast_mate', icon: 'bolt', he: 'מט בזק', en: 'Lightning Mate', desc: 'מט בפחות מ-20 מהלכים', descEn: 'Checkmate in under 20 moves', gems: 100 },
  { id: 'promote', icon: 'crown', he: 'הכתרה', en: 'Coronation', desc: 'הכתר רגלי', descEn: 'Promote a pawn', gems: 30 },
  { id: 'beat_hard', icon: 'setsquare', he: 'מנצח רבי-האמנים', en: 'Master Slayer', desc: 'נצח בוט ברמת רב-אמן', descEn: 'Defeat a Master-tier bot', gems: 250 },
  { id: 'streak3', icon: 'fire', he: 'רצף מלכותי', en: 'Royal Streak', desc: '3 ניצחונות ברצף', descEn: '3 wins in a row', gems: 120 },
  { id: 'captures100', icon: 'swords', he: 'מצביא', en: 'Warlord', desc: 'אכול 100 כלים', descEn: 'Capture 100 pieces', gems: 150 },
  { id: 'era2', icon: 'temple', he: 'בונה האימפריה', en: 'Empire Builder', desc: 'כבוש אי בעולם הקלאסי', descEn: 'Conquer an island in the Classical world', gems: 60 },
  { id: 'era3', icon: 'castle', he: 'אדון הטירה', en: 'Castle Lord', desc: 'כבוש אי בעולם ימי הביניים', descEn: 'Conquer an island in the Medieval world', gems: 80 },
  { id: 'era5', icon: 'city', he: 'אזרח העתיד', en: 'Citizen of Tomorrow', desc: 'כבוש אי בעולם העתיד', descEn: 'Conquer an island in the Future world', gems: 150 },
  { id: 'base_done', icon: 'star', he: 'אוצר המוזיאון', en: 'Museum Curator', desc: 'הבא 10 חלקים למוזיאון הזמן', descEn: 'Bring 10 pieces to the Time Museum', gems: 300 },
  { id: 'pass_play', icon: 'handshake', he: 'שחמט עם חברים', en: 'Friendly Duel', desc: 'שחק משחק שלם באותו מכשיר', descEn: 'Finish a pass & play game', gems: 40 },
  { id: 'online1', icon: 'globe', he: 'יריבים מרחוק', en: 'Rivals Afar', desc: 'סיים משחק אונליין נגד חבר שהזמנת', descEn: 'Finish an online game with a friend you invited', gems: 40 },
  { id: 'gifts10', icon: 'gift', he: 'אספן המתנות', en: 'Gift Collector', desc: 'אסוף 10 מתנות יומיות', descEn: 'Collect 10 daily gifts', gems: 60 },
  { id: 'streak7', icon: 'calendar', he: 'נאמן לממלכה', en: 'Loyal Subject', desc: 'רצף התחברות של 7 ימים', descEn: '7-day login streak', gems: 150 },
  { id: 'brilliant', icon: 'gem', he: 'מהלך מבריק', en: 'Brilliancy', desc: 'בצע מהלך מבריק', descEn: 'Play a brilliant move', gems: 80 },
  { id: 'island5', icon: 'flag', he: 'כובש איים', en: 'Island Raider', desc: 'כבוש 5 איים', descEn: 'Conquer 5 islands', gems: 60 },
  { id: 'island25', icon: 'compass', he: 'נווט', en: 'Navigator', desc: 'כבוש 25 איים', descEn: 'Conquer 25 islands', gems: 200 },
  { id: 'island50', icon: 'castle', he: 'שליט הארכיפלג', en: 'Archipelago Ruler', desc: 'כבוש 50 איים', descEn: 'Conquer 50 islands', gems: 400 },
  { id: 'island99', icon: 'crown', he: 'אדון 99 האיים', en: 'Lord of 99 Isles', desc: 'כבוש את כל 99 האיים', descEn: 'Conquer all 99 islands', gems: 1500 },
  { id: 'island129', icon: 'crown', he: 'קיסר הזניט', en: 'Zenith Emperor', desc: 'כבוש את כל 129 האיים, כולל איי הפרימיום', descEn: 'Conquer all 129 islands, premium islands included', gems: 2500 },
  { id: 'boss1', icon: 'dragon', he: 'קוטל הבוסים', en: 'Boss Breaker', desc: 'נצח בוס של אזור', descEn: 'Defeat a region boss', gems: 120 },
  { id: 'pirates1', icon: 'swords', he: 'צייד פיראטים', en: 'Pirate Hunter', desc: 'גרש את פיראטי הזמן מאי', descEn: 'Drive the Time Pirates off an island', gems: 50 },
  { id: 'pirates10', icon: 'shield', he: 'שומר הזמן', en: 'Keeper of Time', desc: 'נצח את פיראטי הזמן 10 פעמים', descEn: 'Beat the Time Pirates 10 times', gems: 250 },
  { id: 'dresser', icon: 'shirt', he: 'אופנאי מלכותי', en: 'Royal Fashionista', desc: 'קנה פריט לבוש ראשון', descEn: 'Buy your first wearable', gems: 40 },
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
    if (key === 'gifts' && this.counters.gifts >= 10) this.unlock('gifts10');
  }

  resetStreak() { this.counters.streak = 0; this.save(); }
}
