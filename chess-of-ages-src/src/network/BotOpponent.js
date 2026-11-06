/**
 * BotOpponent — יריב ממוחשב לגיבוי בחיפוש מהיר כשאין שחקן פנוי.
 * מוצג בגלוי כבוט (הודעה קופצת + תג 🤖), עם שם, דירוג, עידן וחיה אקראיים
 * והשהיות "אנושיות" של 1.2–4.5 שניות.
 */
import { ERAS } from '../config/Eras.js';
import { PET_IDS } from '../config/Pets.js';

import { getLang } from '../ui/i18n.js';

// שמות בינלאומיים לקהל העולמי; בממשק עברי משולבים גם שמות בעברית
const NAMES_EN = ['Dan_Knight', 'MayaR_77', 'Omer.K', 'GalBishop', 'Lior_Q', 'Noam_Castle', 'EitanGM', 'Sofia_Chess', 'Lucas.R', 'Yuki♞', 'Mateo88', 'PriyaQueen', 'Leo_Rook', 'Emma_Mate', 'Kenji_GM', 'Nora♛', 'Ali_Bishop', 'Chloe.K'];
const NAMES_HE = ['נועה_המלכה', 'יובל♞', 'שחר_המהיר', 'תמר_השחמטאית', 'אריאל_הצריח', 'רוני_88', 'מיכל_הפרש', 'שירה_מט', 'Dan_Knight', 'MayaR_77', 'Omer.K', 'GalBishop', 'Lior_Q', 'Noam_Castle', 'EitanGM'];

export function createBotProfile(playerRating = 1200) {
  const era = ERAS[Math.floor(Math.random() * ERAS.length)];
  const rating = Math.round(playerRating + (Math.random() * 220 - 110));
  return {
    name: ((l) => l[Math.floor(Math.random() * l.length)])(getLang() === 'he' ? NAMES_HE : NAMES_EN),
    rating,
    avatar: ['🦁', '🦅', '🐉', '⚔️', '🛡️', '👑'][Math.floor(Math.random() * 6)],
    eraId: era.id,
    stage: era.id * 2,
    pet: PET_IDS[Math.floor(Math.random() * PET_IDS.length)],
    loadout: { head: era.opponent.head, armor: era.opponent.armor, weapon: era.opponent.weapon, aura: era.opponent.aura },
    level: rating < 1100 ? 'easy' : rating < 1500 ? 'medium' : 'hard',
    isBot: true,
  };
}

export class BotOpponent {
  constructor(ai, profile) {
    this.ai = ai;
    this.profile = profile;
  }

  /** מחזיר מהלך אחרי השהיה אנושית */
  async play(game) {
    const t0 = performance.now();
    const hist = game.history();
    const res = await this.ai.think({ fen: game.fen, history: hist.map((h) => h.before), uci: hist.map((h) => h.lan), level: this.profile.level });
    const legalCount = game.chess.moves().length;
    let delay = 1200 + Math.random() * 3300;
    if (legalCount <= 2) delay = 1200 + Math.random() * 600;
    if (hist.length < 6) delay = Math.min(delay, 2200);
    const wait = Math.max(0, delay - (performance.now() - t0));
    await new Promise((r) => setTimeout(r, wait));
    return res;
  }

  /** האם הבוט ייכנע/יציע תיקו לפי הערכה (מנקודת מבטו) */
  decide(evalCp, ply) {
    if (ply > 40 && evalCp < -900 && Math.random() < 0.35) return 'resign';
    return null;
  }

  acceptsDraw(evalCp, ply) { return ply > 40 && Math.abs(evalCp) < 80; }

  emoteFor(event) {
    const table = { goodMove: ['👍', '😮'], lostPiece: ['😮', '😡'], win: ['👑'], start: ['🤝'] };
    const list = table[event];
    if (!list || Math.random() > 0.35) return null;
    return list[Math.floor(Math.random() * list.length)];
  }
}
