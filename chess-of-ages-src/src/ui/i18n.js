/**
 * תרגומים: עברית (ברירת מחדל, RTL) ואנגלית (לחנות הבינלאומית, LTR).
 */
const HE = {
  appTitle: 'שחמט העידנים', appSubtitle: 'שחמט העידנים: בוני הממלכה', logoEn: 'CHESS OF AGES',
  loading: 'בונים את הממלכה…', tapToStart: 'הקש כדי להתחיל',
  era: 'עידן', stage: 'שלב', of: 'מתוך', next: 'הבא', locked: 'נעול', completed: 'הושלם!',
  sfx: 'אפקטים', ambience: 'אווירה', eras: 'עידנים', eraTour: 'סיור בעידנים', panorama: 'פנורמה',
  center: 'מרכז מצלמה', shop: 'חנות הממלכה 👑', modes: 'מצבי משחק', buildNext: 'בנה שלב הבא ⚡',
  yourTurn: 'תורך', thinking: 'חושב…', check: 'שח!', checkmate: 'מט!', waiting: 'ממתין ליריב…', you: 'אתה',
  white: 'לבן', black: 'שחור', vs: 'נגד',
  promoTitle: 'הכתרת רגלי', queen: 'מלכה', rook: 'צריח', bishop: 'רץ', knight: 'פרש',
  victory: 'ניצחון!', defeat: 'הפסד', draw: 'תיקו', newGame: 'משחק חדש', rematch: 'משחק חוזר', viewKingdom: 'צפה בממלכה', close: 'סגור', cancel: 'ביטול', ok: 'אישור', back: 'חזרה',
  reason_checkmate: 'מט', reason_stalemate: 'פט', reason_repetition: 'חזרה משולשת', reason_insufficient: 'חומר לא מספיק', reason_fifty: 'חוק 50 המהלכים', reason_resign: 'כניעה', reason_timeout: 'הזמן נגמר', reason_agreement: 'בהסכמה', reason_abandon: 'היריב עזב',
  stageBuilt: 'שלב חדש נבנה', newEra: 'עידן חדש', antiFarm: 'כדי לבנות שלב במשחק מול חבר צריך לפחות 15 מהלכים',
  premiumLocked: 'השלמת את העידנים הבסיסיים! פתח עידן פרימיום בחנות כדי להמשיך לבנות', kingdomComplete: 'כל 20 השלבים נבנו — הממלכה הושלמה! 👑',
  resetProgress: 'לאפס את הממלכה לשלב 0?', reset: 'איפוס',
  mode_ai: 'קמפיין נגד המחשב', mode_ai_d: 'בנה את הממלכה בניצחונות', mode_friend: 'משחק נגד חבר אונליין', mode_friend_d: 'חדר פרטי עם קוד והזמנה בוואטסאפ',
  mode_quick: 'משחק מהיר אונליין', mode_quick_d: 'מצא יריב תוך שניות', mode_local: 'שני שחקנים באותו מכשיר', mode_local_d: 'המצלמה מסתובבת אחרי כל מהלך',
  difficulty: 'רמת קושי', easy: 'קל', medium: 'בינוני', hard: 'קשה', start: 'התחל', timeControl: 'זמן לכל שחקן', noClock: 'ללא שעון',
  createRoom: 'צור חדר', joinRoom: 'הצטרף לחדר', roomCode: 'קוד חדר', enterCode: 'הקלד קוד בן 4 ספרות', join: 'הצטרף',
  shareWhatsapp: 'שתף הזמנה בוואטסאפ', copyLink: 'העתק קישור', copied: 'הועתק!', waitingFriend: 'ממתין שחבר יצטרף…',
  searching: 'מחפש יריב…', botNotice: 'לא נמצא שחקן פנוי כרגע', botNotice2: 'תשחק מול בוט 🤖 — היריב הזה הוא מחשב', letsPlay: 'יאללה, משחקים',
  resign: 'כניעה', offerDraw: 'הצעת תיקו', drawOffered: 'היריב מציע תיקו', accept: 'קבל', decline: 'דחה', drawDeclined: 'הצעת התיקו נדחתה',
  rematchOffered: 'היריב מבקש משחק חוזר', disconnected: 'החיבור ליריב אבד', confirmResign: 'להיכנע במשחק הזה?', confirmNew: 'להתחיל משחק חדש? המשחק הנוכחי יסתיים.',
  onlineNotice: 'משחק אונליין מחבר אותך ישירות לשחקן אחר (WebRTC) דרך שרת האיתות של PeerJS, ובמידת הצורך דרך שרת ממסר STUN/TURN. כתובת ה-IP שלך גלויה לשרתים האלה וליריב לצורך החיבור, והשם, הסמל, האווטאר ומראה הממלכה שלך נשלחים ליריב. אנחנו לא שומרים את המשחקים שלך בשרת.', understood: 'הבנתי, המשך',
  connError: 'לא ניתן להתחבר כרגע. בדוק את החיבור לאינטרנט ונסה שוב.', roomNotFound: 'החדר לא נמצא או כבר מלא',
  emotes: 'אימוג׳ים', hint: 'רמז', hintCost: 'רמז ב-30 💎', notEnoughGems: 'אין מספיק יהלומים',
  brilliant: 'מהלך מבריק!!', best: 'מהלך מצוין!', inaccuracy: 'אי-דיוק', mistake: 'טעות', blunder: 'טעות גסה!',
  summary: 'סיכום משחק', accuracy: 'דיוק', keyMoments: 'רגעי מפתח', replay: 'הילוך חוזר', yourAccuracy: 'הדיוק שלך', oppAccuracy: 'דיוק היריב',
  gemsEarned: 'יהלומים שהרווחת', achievements: 'הישגים', achievementUnlocked: 'הישג נפתח!', profile: 'פרופיל', name: 'שם', avatar: 'סמל',
  settings: 'הגדרות', language: 'שפה', quality: 'איכות גרפיקה', auto: 'אוטומטי', high: 'גבוהה', low: 'נמוכה', privacy: 'פרטיות ונתונים',
  deleteData: 'מחק את כל הנתונים שלי', confirmDelete: 'למחוק את כל ההתקדמות, היהלומים והפריטים במכשיר הזה? הפעולה לא הפיכה.',
  privacyText: 'האפליקציה לא משתמשת בעוגיות, פיקסלים, אנליטיקה או מעקב פרסומי. ההתקדמות, היהלומים וההגדרות נשמרים רק במכשיר שלך (localStorage). במשחק אונליין נוצר חיבור P2P דרך שרתי PeerJS ו-STUN/TURN — כתובת ה-IP נחשפת להם וליריב לצורך החיבור בלבד, והשם והאווטאר שלך נשלחים ליריב. רכישות במצב בדיקה אינן גובות כסף.',
  share: 'שתף את הממלכה', shareText: 'תראו את הממלכה שבניתי ב"שחמט העידנים"! 👑', saveImage: 'שמור תמונה',
  tutorial: 'מדריך', skip: 'דלג', nextStep: 'הבא', finish: 'סיום',
  tut1: 'ברוך הבא לשחמט העידנים! כל ניצחון בונה שלב חדש בממלכה שלך — מעידן האבן ועד העתיד.', tut2: 'הקש על רגלי לבן כדי לבחור אותו. המשבצות הירוקות הן מהלכים חוקיים.', tut3: 'עכשיו הקש על משבצת ירוקה כדי להזיז את הכלי.', tut4: 'מעולה! גרור אצבע מחוץ ללוח כדי לסובב את המצלמה, וצבוט כדי להתקרב.', tut5: 'בחנות הממלכה תמצא בגדים לאווטאר, חיות מחמד, עידנים חדשים ומתנה יומית 🎁', tut6: 'בהצלחה, מלך! נצח כדי לבנות את השלב הראשון.',
  dailyGift: 'מתנה יומית 🎁', dailyTitle: 'תיבת האוצר היומית וגלגל המזל', day: 'יום', claim: 'קבל', claimed: 'נאסף', comeBack: 'חזור מחר לפרס הבא', streakBroken: 'הרצף התחיל מחדש',
  wheelTitle: 'גלגל המזל המלכותי', spinFree: 'סיבוב חינם!', spinFor: 'סובב ב-50 💎', nextFreeSpin: 'סיבוב חינם בעוד', odds: 'סיכויי זכייה', royalChest: 'תיבת האוצר המלכותית', trial24: 'ניסיון ל-24 שעות',
  shopTitle: 'חנות הממלכה והאווטאר 💎', tabWardrobe: 'הלבשת אווטאר', tabPets: 'חיות מחמד', tabEras: 'עידנים חדשים', tabGems: 'קניית יהלומים',
  tryOn: 'נסה בתצוגה', buyFor: 'קנה ב-', equip: 'הלבש', equipped: 'מולבש', owned: 'בבעלותך', unlockAt: 'נפתח בעידן', bundle: 'חבילת 5 העידנים', unlock: 'פתח', visit: 'בקר',
  sandbox: 'מצב בדיקה (Sandbox)', devGems: '‎+500 💎 חינם לבדיקה', sandboxCheckout: 'קופה מדומה — מצב בדיקה', sandboxNote: 'זו רכישת בדיקה. לא ייגבה כסף.', confirmPurchase: 'אשר רכישה (סימולציה)', purchased: 'נרכש!',
  trialLeft: 'ניסיון', hours: 'שעות', update: 'מעדכן… המשחק שלך נשמר', updateNative: 'נדרשת גרסה חדשה של האפליקציה', download: 'הורד', updateNativeBody: 'הורד את הגרסה החדשה והתקן אותה מעל הקיימת. ההתקדמות שלך נשמרת.', updateAvailable: 'יש עדכון חדש!', updateAvailableBody: 'גרסה חדשה של המשחק מוכנה', updateNow: 'עדכן עכשיו', later: 'אחר כך', checkUpdates: 'בדוק עדכונים', checkingUpdates: 'בודק עדכונים…', upToDate: 'יש לך את הגרסה העדכנית', whatsNew: 'מה חדש', updateLaterNote: 'בחרת אחר כך? העדכון יותקן לבד בפתיחה הבאה.',
  offline: 'אין חיבור לאינטרנט', copiedCode: 'הקוד הועתק', keyboardHelp: 'מקלדת: חצים להזזת הסמן, Enter לבחירה, Esc לביטול',
  gameStarted: 'המשחק התחיל — בהצלחה!', opponentLeft: 'היריב עזב את המשחק', youPlayWhite: 'אתה משחק בלבן', youPlayBlack: 'אתה משחק בשחור',
  visitEra: 'מעבר לעידן', currentEra: 'העידן הנוכחי', stagesBuilt: 'שלבים שנבנו', buyEraFirst: 'רכוש את העידן בחנות',
  gems: 'יהלומים', actions: 'פעולות', bot: 'בוט', canvasLabel: 'לוח שחמט תלת-ממדי. השתמש בחצים ובמקש Enter כדי לשחק.', previewLabel: 'תצוגה תלת-ממדית של האווטאר וחיית המחמד', dragRotate: '↔ גרור כדי לסובב',
  privacyPolicy: 'מדיניות פרטיות ונגישות', loadError: 'אירעה שגיאה בטעינה. נסה לרענן את הדף.', defaultName: 'מלך', bestValue: 'הכי משתלם', bonus: 'בונוס', pricesNote: 'המחירים במצב בדיקה להמחשה בלבד. בגרסה בחנות יוצג המחיר הרשמי של Google Play במטבע המקומי.',
};

const EN = {
  appTitle: 'Chess of Ages', appSubtitle: 'Chess of Ages: Kingdom Builder', logoEn: 'KINGDOM BUILDER',
  loading: 'Building your kingdom…', tapToStart: 'Tap to start',
  era: 'Era', stage: 'Stage', of: 'of', next: 'Next', locked: 'Locked', completed: 'Completed!',
  sfx: 'SFX', ambience: 'Ambience', eras: 'Eras', eraTour: 'Era Tour', panorama: 'Panorama',
  center: 'Center', shop: 'Shop 👑', modes: 'Modes', buildNext: 'Build ⚡',
  yourTurn: 'Your turn', thinking: 'Thinking…', check: 'Check!', checkmate: 'Checkmate!', waiting: 'Waiting…', you: 'You',
  white: 'White', black: 'Black', vs: 'vs',
  promoTitle: 'Promote pawn', queen: 'Queen', rook: 'Rook', bishop: 'Bishop', knight: 'Knight',
  victory: 'Victory!', defeat: 'Defeat', draw: 'Draw', newGame: 'New game', rematch: 'Rematch', viewKingdom: 'View kingdom', close: 'Close', cancel: 'Cancel', ok: 'OK', back: 'Back',
  reason_checkmate: 'Checkmate', reason_stalemate: 'Stalemate', reason_repetition: 'Threefold repetition', reason_insufficient: 'Insufficient material', reason_fifty: '50-move rule', reason_resign: 'Resignation', reason_timeout: 'Time out', reason_agreement: 'Agreement', reason_abandon: 'Opponent left',
  stageBuilt: 'New stage built', newEra: 'New era', antiFarm: 'Multiplayer wins build a stage only after at least 15 moves',
  premiumLocked: 'Base eras complete! Unlock a premium era in the shop to keep building', kingdomComplete: 'All 20 stages built — your kingdom is complete! 👑',
  resetProgress: 'Reset the kingdom to stage 0?', reset: 'Reset',
  mode_ai: 'Campaign vs AI', mode_ai_d: 'Build your kingdom with victories', mode_friend: 'Play a friend online', mode_friend_d: 'Private room code + WhatsApp invite',
  mode_quick: 'Quick online match', mode_quick_d: 'Find an opponent in seconds', mode_local: 'Two players, one device', mode_local_d: 'Camera flips after every move',
  difficulty: 'Difficulty', easy: 'Easy', medium: 'Medium', hard: 'Hard', start: 'Start', timeControl: 'Time per player', noClock: 'No clock',
  createRoom: 'Create room', joinRoom: 'Join room', roomCode: 'Room code', enterCode: 'Enter a 4-digit code', join: 'Join',
  shareWhatsapp: 'Share invite on WhatsApp', copyLink: 'Copy link', copied: 'Copied!', waitingFriend: 'Waiting for your friend…',
  searching: 'Searching…', botNotice: 'No player available right now', botNotice2: "You'll play a bot 🤖 — this opponent is a computer", letsPlay: "Let's play",
  resign: 'Resign', offerDraw: 'Offer draw', drawOffered: 'Opponent offers a draw', accept: 'Accept', decline: 'Decline', drawDeclined: 'Draw offer declined',
  rematchOffered: 'Opponent wants a rematch', disconnected: 'Connection lost', confirmResign: 'Resign this game?', confirmNew: 'Start a new game? The current game will end.',
  onlineNotice: 'Online play connects you directly to another player (WebRTC) through the PeerJS signaling server and, when needed, a STUN/TURN relay. Your IP address is visible to these servers and to your opponent for the connection, and your display name, symbol, avatar and kingdom look are sent to your opponent. We do not store your games on a server.', understood: 'Got it, continue',
  connError: "Can't connect right now. Check your internet and try again.", roomNotFound: 'Room not found or already full',
  emotes: 'Emotes', hint: 'Hint', hintCost: 'Hint for 30 💎', notEnoughGems: 'Not enough gems',
  brilliant: 'Brilliant!!', best: 'Great move!', inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder!',
  summary: 'Game summary', accuracy: 'Accuracy', keyMoments: 'Key moments', replay: 'Replay', yourAccuracy: 'Your accuracy', oppAccuracy: 'Opponent accuracy',
  gemsEarned: 'Gems earned', achievements: 'Achievements', achievementUnlocked: 'Achievement unlocked!', profile: 'Profile', name: 'Name', avatar: 'Emblem',
  settings: 'Settings', language: 'Language', quality: 'Graphics', auto: 'Auto', high: 'High', low: 'Low', privacy: 'Privacy & data',
  deleteData: 'Delete all my data', confirmDelete: 'Delete all progress, gems and items on this device? This cannot be undone.',
  privacyText: 'This app uses no cookies, pixels, analytics or ad tracking. Progress, gems and settings are stored only on your device (localStorage). Online play creates a P2P connection via PeerJS and STUN/TURN servers — your IP address is visible to them and to your opponent only to make the connection, and your name and avatar are sent to your opponent. Sandbox purchases never charge money.',
  share: 'Share kingdom', shareText: 'Look at the kingdom I built in "Chess of Ages"! 👑', saveImage: 'Save image',
  tutorial: 'Tutorial', skip: 'Skip', nextStep: 'Next', finish: 'Finish',
  tut1: 'Welcome to Chess of Ages! Every victory builds a new stage of your kingdom — from the Stone Age to the future.', tut2: 'Tap a white pawn to select it. Green squares are legal moves.', tut3: 'Now tap a green square to move the piece.', tut4: 'Great! Drag outside the board to rotate the camera, pinch to zoom.', tut5: 'The Kingdom Shop has avatar outfits, pets, new eras and a daily gift 🎁', tut6: 'Good luck, Your Majesty! Win to build your first stage.',
  dailyGift: 'Daily gift 🎁', dailyTitle: 'Daily Treasure & Fortune Wheel', day: 'Day', claim: 'Claim', claimed: 'Claimed', comeBack: 'Come back tomorrow for the next reward', streakBroken: 'Your streak restarted',
  wheelTitle: 'Royal Fortune Wheel', spinFree: 'Free spin!', spinFor: 'Spin for 50 💎', nextFreeSpin: 'Free spin in', odds: 'Odds', royalChest: 'Royal Treasure Chest', trial24: '24-hour trial',
  shopTitle: 'Kingdom & Avatar Shop 💎', tabWardrobe: 'Wardrobe', tabPets: 'Pets', tabEras: 'New eras', tabGems: 'Gems',
  tryOn: 'Preview', buyFor: 'Buy for ', equip: 'Equip', equipped: 'Equipped', owned: 'Owned', unlockAt: 'Unlocks at era', bundle: '5-era bundle', unlock: 'Unlock', visit: 'Visit',
  sandbox: 'Sandbox mode', devGems: '+500 💎 free (testing)', sandboxCheckout: 'Simulated checkout — sandbox', sandboxNote: 'This is a test purchase. No money is charged.', confirmPurchase: 'Confirm (simulated)', purchased: 'Purchased!',
  trialLeft: 'Trial', hours: 'h', update: 'Updating… your game is saved', updateNative: 'A new app version is required', download: 'Download', updateNativeBody: 'Download the new version and install it over this one. Your progress is kept.', updateAvailable: 'A new update is ready!', updateAvailableBody: 'A new version of the game is ready', updateNow: 'Update now', later: 'Later', checkUpdates: 'Check for updates', checkingUpdates: 'Checking for updates…', upToDate: 'You have the latest version', whatsNew: "What's new", updateLaterNote: 'Chose later? It installs automatically next time you open the game.',
  offline: 'No internet connection', copiedCode: 'Code copied', keyboardHelp: 'Keyboard: arrows move the cursor, Enter selects, Esc cancels',
  gameStarted: 'Game on — good luck!', opponentLeft: 'Your opponent left', youPlayWhite: 'You play White', youPlayBlack: 'You play Black',
  visitEra: 'Go to era', currentEra: 'Current era', stagesBuilt: 'Stages built', buyEraFirst: 'Unlock this era in the shop',
  gems: 'Gems', actions: 'Actions', bot: 'Bot', canvasLabel: '3D chess board. Use the arrow keys and Enter to play.', previewLabel: '3D preview of your avatar and pet', dragRotate: '↔ Drag to rotate',
  privacyPolicy: 'Privacy & accessibility', loadError: 'Something went wrong while loading. Please refresh the page.', defaultName: 'King', bestValue: 'Best value', bonus: 'bonus', pricesNote: 'Sandbox prices are for illustration only. The store version shows the official Google Play price in your local currency.',
};

export const PET_EN = { wolf_cub: 'Primal Wolf Cub', royal_owl: 'Imperial Owl', armor_steed: 'Knight Pony', fire_dragon: 'Royal Fire Dragon', golden_phoenix: 'Golden Phoenix', cyber_fox: 'Holo Cyber Fox', mythic_griffin: 'Mythic Griffin', crystal_unicorn: 'Crystal Unicorn' };
export const ITEM_EN = {
  crown_starter: 'Simple Wooden Circlet', crown_gold: 'Ruby Royal Crown', helm_spartan: 'Spartan Plumed Helm', helm_samurai: 'Golden Kabuto Helm', crown_pharaoh: 'Pharaoh Nemes Crown', visor_cyber: 'Cyberpunk Holo Visor',
  tunic_starter: 'Simple Cloth Tunic', cape_royal_velvet: 'Royal Velvet Cape', armor_paladin: 'Paladin Silver Armor', armor_shogun: 'Shogun Black-Gold Armor', robe_celestial: 'Celestial Star Robe',
  staff_wood: 'Wooden Staff', scepter_diamond: 'Diamond Scepter', sword_excalibur: 'Glowing Excalibur', trident_atlantis: 'Electric Atlantis Trident',
  aura_none: 'No Aura', aura_golden_sparks: 'Golden Sparks Aura', aura_fire_ring: 'Royal Fire Ring', aura_cosmic_lightning: 'Cosmic Lightning',
};
export const DIFF_PERSONA = { easy: { he: 'מנהיג השבט', en: 'Tribe Chief', icon: '🪓' }, medium: { he: 'אביר הממלכה', en: 'Kingdom Knight', icon: '⚔️' }, hard: { he: 'האדריכל העליון', en: 'Supreme Architect', icon: '📐' } };

/** שפת המכשיר: עברית רק אם המכשיר מוגדר לעברית (he / iw הישן באנדרואיד), אחרת אנגלית — קהל עולמי */
export const deviceLang = () => (/^(he|iw)\b/i.test((typeof navigator !== 'undefined' && navigator.language) || '') ? 'he' : 'en');

let lang = 'en';
export function setLang(l) {
  lang = l === 'he' ? 'he' : 'en';
  const d = document.documentElement;
  d.lang = lang;
  d.dir = lang === 'en' ? 'ltr' : 'rtl';
  document.getElementById('scene')?.setAttribute('aria-label', t('canvasLabel'));
  // מניפסט ה-PWA בשפה המתאימה (שם האייקון במסך הבית בהתקנה הבאה)
  const mf = document.querySelector('link[rel="manifest"]');
  if (mf) mf.setAttribute('href', lang === 'he' ? './manifest.he.json' : './manifest.json');
}
export const getLang = () => lang;
export const t = (k) => (lang === 'en' ? EN[k] ?? HE[k] : HE[k]) ?? k;
export const tn = (he, en) => (lang === 'en' && en ? en : he);
