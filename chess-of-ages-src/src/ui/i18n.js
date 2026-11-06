import { islandDef } from '../config/Islands.js';

/**
 * תרגומים: עברית (ברירת מחדל, RTL) ואנגלית (לחנות הבינלאומית, LTR).
 */
const HE = {
  tabBots: 'בוטים', moreBotsHint: 'כל אי שתכבוש פותח את הבוט שלו ואת הצבע של החיה שלו', noBotsHint: 'כבוש איים כדי לפתוח את הבוטים שלהם', invitePlay: 'שחק', resident: 'גר אצלך', residentPractice: 'משחק אימון מול תושב — בלי יהלומים', cinema: 'קולנוע', cinemaTitle: 'בית הקולנוע המרכזי', storyFilm: 'הסיפור', storyDesc: 'מוזיאון הזמן, 99 האיים ופיראטי הזמן · 40 שניות', howToPlay: 'איך משחקים', howToDesc: 'משחק מודרך קצר ליד השולחן', skip: 'דלג', cinemaAtHub: 'בית הקולנוע נמצא באי המרכזי', cinemaHint: 'נגיעה בכלי מתחילה לשחק · בקולנוע שבאי המרכזי יש את הסיפור ואת ההדרכה', pieceArrives: 'חלק חדש מגיע למוזיאון', museumPieces: 'חלקים במוזיאון', piratesHere: 'פיראטי הזמן תפסו את האי — נצח אותם וקבל יהלומים', piratesReturn: 'הפיראטים מתארגנים · חוזרים בעוד {t}', practiceNoGems: 'משחק אימון — היהלומים חוזרים כשהפיראטים נוחתים שוב', piratesFled: 'הפיראטים ברחו! האי שקט לכמה שעות', pieceToMuseum: 'חלק מהאי מצטרף למוזיאון באי המרכזי', hShort: 'ש׳', mShort: 'ד׳', fightPirates: 'הילחם בפיראטים', practicePirates: 'אימון נגד הפיראטים', timePirates: 'פיראטי הזמן', visitIsland: 'בקר באי', anyOrder: 'אפשר לכבוש בכל סדר', world: 'עולם',
  tapToSpeed: 'נגיעה במסך מאיצה את המסע', map: 'מפה', friend: 'חבר', home: 'הביתה', battle: 'קרב', boss: 'בוס', hubName: 'האי המרכזי', conquered: 'איים שנכבשו', allConquered: 'כל 99 האיים נכבשו!', unlockFullShort: 'פתח את המשחק המלא כדי להמשיך לאי 6',
  nextBuilding: 'מבנה הבא', moreIslands: 'איים לכיבוש', beatToConquer: 'נצח את הבוט כדי לכבוש את האי', waitMove: 'רגע, המהלך עוד רץ…', lockedBeatPrev: 'נעול — נצח קודם את הבוט באי {n}',
  battleVs: 'קרב נגד', shopAtHub: 'החנות נמצאת באי המרכזי — לחץ "הביתה"', islandConquered: 'האי נכבש', regionComplete: 'כבשת אזור שלם!', starMilestone: 'אספת כוכבים:',
  worldMap: 'מפת האיים', myIsland: 'האי שלי', nextIsland: 'האי הבא', travelBattle: 'טוס והילחם', youAreHere: 'אתה כאן', stars: 'כוכבים', reward: 'פרס', rating: 'דירוג', pet: 'חיית מחמד', conqueredMark: 'נכבש',
  lockedIsland: 'נעול', locked5: 'דורש את המשחק המלא', firstTime: 'כיבוש ראשון', replayReward: 'ניצחון חוזר', starsRule: 'ניצחון = כוכב · דיוק 75%+ = 2 כוכבים · דיוק 85%+ בפחות מ-40 מהלכים = 3 כוכבים',
  fullTitle: 'פתח את כל 99 האיים', fullBody: 'כבשת את האיים החינמיים! רכישה חד-פעמית פותחת את איים 6–99: עוד 94 בוטים, 9 אזורים ו-9 בוסים. בלי מנוי ובלי פרסומות.', priceSoon: 'המחיר ייקבע בקרוב', unlockTest: 'פתח (בדיקה)', fullOwned: 'המשחק המלא פתוח', fullGame: 'המשחק המלא', unlocked: 'נפתח!',
  tryAgain: 'נסה שוב', toMap: 'למפה', album: 'אלבום', albumTitle: 'אלבום הבוטים', defeated: 'הובס', notMet: 'עוד לא נפגשתם', albumNote: 'כבוש אזור שלם כדי לקבל תיבת אוצר.',
  friendTitle: 'משחק נגד חבר', friendDesc: 'שני שחקנים על אותו מכשיר — המצלמה מתהפכת אחרי כל מהלך.', friendSoon: 'בקרוב: חדר אונליין פרטי לחברים.', startGame: 'התחל משחק',
  chess: 'שחמט', opponent: 'יריב', vsBot: 'נגד הבוט', twoPlayers: 'שני שחקנים', twoPlayers_d: 'באותו מכשיר', vsBot_d: 'כבוש את האי והבא אותו למוזיאון',
  island: 'אי', chooseIsland: 'לאיזה אי מטיילים?', play: 'שחק', travel: 'סע לאי', travelHere: 'אתה כאן',
  gameResumed: 'המשחק שלך נמשך מאיפה שעצרת', confirmDraw: 'להכריז תיקו בהסכמה?', general: 'כללי', fromIsland: 'מהאי', buy: 'קנה', free: 'חינם', reachEra: 'פתיחה בעידן', islandBundle: 'כל 5 האיים', newIslands: 'איים חדשים',
  appTitle: 'שחמט העידנים', appSubtitle: 'שחמט העידנים: ממלכות האיים', logoEn: 'ממלכות האיים',
  loading: 'מפליגים לאיים…', tapToStart: 'הקש כדי להתחיל',
  era: 'עידן', stage: 'שלב', of: 'מתוך', next: 'הבא', locked: 'נעול', completed: 'הושלם!',
  sfx: 'אפקטים', ambience: 'אווירה', eras: 'עידנים', eraTour: 'סיור בעידנים', panorama: 'פנורמה',
  center: 'מרכז מצלמה', shop: 'חנות', modes: 'משחק', buildNext: 'בנה שלב',
  yourTurn: 'תורך', thinking: 'חושב…', check: 'שח!', checkmate: 'מט!', waiting: 'ממתין ליריב…', you: 'אתה',
  white: 'לבן', black: 'שחור', vs: 'נגד',
  promoTitle: 'הכתרת רגלי', queen: 'מלכה', rook: 'צריח', bishop: 'רץ', knight: 'פרש',
  victory: 'ניצחון!', defeat: 'הפסד', draw: 'תיקו', newGame: 'משחק חדש', rematch: 'משחק חוזר', viewKingdom: 'צפה במוזיאון', close: 'סגור', cancel: 'ביטול', ok: 'אישור', back: 'חזרה',
  reason_checkmate: 'מט', reason_stalemate: 'פט', reason_repetition: 'חזרה משולשת', reason_insufficient: 'חומר לא מספיק', reason_fifty: 'חוק 50 המהלכים', reason_resign: 'כניעה', reason_timeout: 'הזמן נגמר', reason_agreement: 'בהסכמה', reason_abandon: 'היריב עזב',
  stageBuilt: 'שלב חדש נבנה', newEra: 'עידן חדש', antiFarm: 'במשחק שני שחקנים בונים שלב רק אחרי 15 מהלכים לפחות',
  premiumLocked: 'השלמת את העידנים הבסיסיים! פתח עידן פרימיום בחנות כדי להמשיך לבנות', kingdomComplete: 'כל 20 השלבים נבנו — הממלכה הושלמה!',
  resetProgress: 'לאפס את הממלכה לשלב 0?', reset: 'איפוס',
  mode_ai: 'קמפיין נגד המחשב', mode_ai_d: 'בנה את הממלכה בניצחונות', mode_friend: 'משחק נגד חבר אונליין', mode_friend_d: 'חדר פרטי עם קוד והזמנה בוואטסאפ',
  mode_quick: 'משחק מהיר אונליין', mode_quick_d: 'מצא יריב תוך שניות', mode_local: 'שני שחקנים באותו מכשיר', mode_local_d: 'המצלמה מסתובבת אחרי כל מהלך',
  difficulty: 'רמת קושי', easy: 'קל', medium: 'בינוני', hard: 'קשה', start: 'התחל', timeControl: 'זמן לכל שחקן', noClock: 'ללא שעון',
  createRoom: 'צור חדר', joinRoom: 'הצטרף לחדר', roomCode: 'קוד חדר', enterCode: 'הקלד קוד בן 4 ספרות', join: 'הצטרף',
  shareWhatsapp: 'שתף הזמנה בוואטסאפ', copyLink: 'העתק קישור', copied: 'הועתק!', waitingFriend: 'ממתין שחבר יצטרף…',
  searching: 'מחפש יריב…', botNotice: 'לא נמצא שחקן פנוי כרגע', botNotice2: 'תשחק מול בוט — היריב הזה הוא מחשב', letsPlay: 'יאללה, משחקים',
  resign: 'כניעה', offerDraw: 'הצעת תיקו', drawOffered: 'היריב מציע תיקו', accept: 'קבל', decline: 'דחה', drawDeclined: 'הצעת התיקו נדחתה',
  rematchOffered: 'היריב מבקש משחק חוזר', disconnected: 'החיבור ליריב אבד', confirmResign: 'להיכנע במשחק הזה?', confirmNew: 'להתחיל משחק חדש? המשחק הנוכחי יסתיים.',
  onlineNotice: 'משחק אונליין מחבר אותך ישירות לשחקן אחר (WebRTC) דרך שרת האיתות של PeerJS, ובמידת הצורך דרך שרת ממסר STUN/TURN. כתובת ה-IP שלך גלויה לשרתים האלה וליריב לצורך החיבור, והשם, הסמל, האווטאר ומראה הממלכה שלך נשלחים ליריב. אנחנו לא שומרים את המשחקים שלך בשרת.', understood: 'הבנתי, המשך',
  connError: 'לא ניתן להתחבר כרגע. בדוק את החיבור לאינטרנט ונסה שוב.', roomNotFound: 'החדר לא נמצא או כבר מלא',
  emotes: 'אימוג׳ים', hint: 'רמז', hintCost: 'רמז · 30 יהלומים', notEnoughGems: 'אין מספיק יהלומים',
  brilliant: 'מהלך מבריק!!', best: 'מהלך מצוין!', inaccuracy: 'אי-דיוק', mistake: 'טעות', blunder: 'טעות גסה!',
  summary: 'סיכום משחק', accuracy: 'דיוק', keyMoments: 'רגעי מפתח', replay: 'הילוך חוזר', yourAccuracy: 'הדיוק שלך', oppAccuracy: 'דיוק היריב',
  gemsEarned: 'יהלומים שהרווחת', achievements: 'הישגים', achievementUnlocked: 'הישג נפתח!', profile: 'פרופיל', name: 'שם', avatar: 'סמל',
  settings: 'הגדרות', language: 'שפה', quality: 'איכות גרפיקה', auto: 'אוטומטי', high: 'גבוהה', low: 'נמוכה', privacy: 'פרטיות ונתונים',
  deleteData: 'מחק את כל הנתונים שלי', confirmDelete: 'למחוק את כל ההתקדמות, היהלומים והפריטים במכשיר הזה? הפעולה לא הפיכה.',
  privacyText: 'האפליקציה לא משתמשת בעוגיות, פיקסלים, אנליטיקה או מעקב פרסומי, ואין בה משחק ברשת. ההתקדמות, היהלומים וההגדרות נשמרים רק במכשיר שלך (localStorage). רכישות במצב בדיקה אינן גובות כסף.',
  share: 'שתף', shareText: 'תראו את מוזיאון הזמן שלי ב-Chess of Ages: Island Realms!', saveImage: 'שמור תמונה',
  tutorial: 'מדריך', skip: 'דלג', nextStep: 'הבא', finish: 'סיום',
  tut1: 'ברוך הבא לשחמט העידנים! 99 איים מחכים לך — נצח את הבוט בכל אי כדי לכבוש אותו. הראשון יושב מולך.', tut2: 'הקש על רגלי לבן כדי לבחור אותו. המשבצות הירוקות הן מהלכים חוקיים.', tut3: 'עכשיו הקש על משבצת ירוקה כדי להזיז את הכלי.', tut4: 'מעולה! גרור אצבע מחוץ ללוח כדי לסובב את המצלמה, וצבוט כדי להתקרב.', tut5: 'בחנות תמצא בגדים לאווטאר, חיות מחמד, איים חדשים ומתנה יומית.', tut6: 'בהצלחה, מלך! נצח כדי לכבוש את האי הראשון — ואז פתח את המפה.',
  dailyGift: 'מתנה יומית', dailyTitle: 'תיבת האוצר היומית וגלגל המזל', day: 'יום', claim: 'קבל', claimed: 'נאסף', comeBack: 'חזור מחר לפרס הבא', streakBroken: 'הרצף התחיל מחדש',
  wheelTitle: 'גלגל המזל המלכותי', spinFree: 'סיבוב חינם!', spinFor: 'סובב ב-50', nextFreeSpin: 'סיבוב חינם בעוד', odds: 'סיכויי זכייה', royalChest: 'תיבת האוצר המלכותית', trial24: 'ניסיון ל-24 שעות',
  shopTitle: 'חנות', tabWardrobe: 'לבוש', tabPets: 'חיות', tabEras: 'איים', tabGems: 'יהלומים',
  tryOn: 'נסה בתצוגה', buyFor: 'קנה ב-', equip: 'הלבש', equipped: 'מולבש', owned: 'בבעלותך', unlockAt: 'נפתח בעידן', bundle: 'חבילת 5 העידנים', unlock: 'פתח', visit: 'בקר',
  sandbox: 'מצב בדיקה (Sandbox)', devGems: '‎+500 חינם לבדיקה', sandboxCheckout: 'קופה מדומה — מצב בדיקה', sandboxNote: 'זו רכישת בדיקה. לא ייגבה כסף.', confirmPurchase: 'אשר רכישה (סימולציה)', purchased: 'נרכש!',
  trialLeft: 'ניסיון', hours: 'שעות', update: 'מעדכן… המשחק שלך נשמר', updateNative: 'נדרשת גרסה חדשה של האפליקציה', download: 'הורד', updateNativeBody: 'הורד את הגרסה החדשה והתקן אותה מעל הקיימת. ההתקדמות שלך נשמרת.', updateAvailable: 'יש עדכון חדש!', updateAvailableBody: 'גרסה חדשה של המשחק מוכנה', updateNow: 'עדכן עכשיו', later: 'אחר כך', checkUpdates: 'בדוק עדכונים', muteAll: 'השתקה / הפעלה של כל הצלילים', checkingUpdates: 'בודק עדכונים…', downloadingUpdate: 'נמצא עדכון — מוריד…', updateError: 'העדכון נכשל, ננסה שוב אוטומטית', upToDate: 'יש לך את הגרסה העדכנית', whatsNew: 'מה חדש', updateLaterNote: 'בחרת אחר כך? העדכון יותקן לבד בפתיחה הבאה.',
  offline: 'אין חיבור לאינטרנט', copiedCode: 'הקוד הועתק', keyboardHelp: 'מקלדת: חצים להזזת הסמן, Enter לבחירה, Esc לביטול',
  gameStarted: 'המשחק התחיל — בהצלחה!', opponentLeft: 'היריב עזב את המשחק', youPlayWhite: 'אתה משחק בלבן', youPlayBlack: 'אתה משחק בשחור',
  visitEra: 'מעבר לעידן', currentEra: 'העידן הנוכחי', stagesBuilt: 'שלבים שנבנו', buyEraFirst: 'רכוש את העידן בחנות',
  gems: 'יהלומים', actions: 'פעולות', bot: 'בוט', canvasLabel: 'לוח משחק תלת-ממדי. השתמש בחצים ובמקש Enter כדי לשחק.', previewLabel: 'תצוגה תלת-ממדית של האווטאר וחיית המחמד', dragRotate: 'גרור כדי לסובב',
  privacyPolicy: 'מדיניות פרטיות ונגישות', loadError: 'אירעה שגיאה בטעינה. נסה לרענן את הדף.', defaultName: 'מלך', bestValue: 'הכי משתלם', bonus: 'בונוס', pricesNote: 'המחירים במצב בדיקה להמחשה בלבד. בגרסה בחנות יוצג המחיר הרשמי של Google Play במטבע המקומי.',
};

const EN = {
  tabBots: 'Bots', moreBotsHint: 'Every island you conquer unlocks its bot and its pet color', noBotsHint: 'Conquer islands to unlock their bots', invitePlay: 'Play', resident: 'Resident', residentPractice: 'Practice match with a resident — no gems', cinema: 'Cinema', cinemaTitle: 'Central Cinema', storyFilm: 'The Story', storyDesc: 'The Time Museum, 99 islands and the Time Pirates · 40 seconds', howToPlay: 'How to Play', howToDesc: 'A short guided match at the table', skip: 'Skip', cinemaAtHub: 'The cinema is on the Central Island', cinemaHint: 'Tap a piece to start playing · The cinema on the Central Island has the story and a how-to-play guide', pieceArrives: 'A new piece arrives at the museum', museumPieces: 'Museum pieces', piratesHere: 'Time Pirates hold this island — beat them for gems', piratesReturn: 'The pirates are regrouping · back in {t}', practiceNoGems: 'Practice match — gems return when the pirates land again', piratesFled: 'The pirates fled! The island is quiet for a few hours', pieceToMuseum: 'A piece of this island joins the Time Museum', hShort: 'h', mShort: 'm', fightPirates: 'Fight the pirates', practicePirates: 'Practice vs pirates', timePirates: 'Time Pirates', visitIsland: 'Visit island', anyOrder: 'Conquer in any order', world: 'World',
  tapToSpeed: 'Tap to speed up', map: 'Map', friend: 'Friend', home: 'Home', battle: 'Battle', boss: 'Boss', hubName: 'Central Island', conquered: 'Islands conquered', allConquered: 'All 99 islands conquered!', unlockFullShort: 'Unlock the full game to continue to island 6',
  nextBuilding: 'Next building', moreIslands: 'islands to go', beatToConquer: 'Beat the bot to conquer this island', waitMove: 'One moment — a move is still playing…', lockedBeatPrev: 'Locked — beat the bot on island {n} first',
  battleVs: 'Battle vs', shopAtHub: 'The shop is on the Central Island — tap "Home"', islandConquered: 'Island conquered', regionComplete: 'Whole region conquered!', starMilestone: 'Stars collected:',
  worldMap: 'Island Map', myIsland: 'My island', nextIsland: 'Next island', travelBattle: 'Travel & battle', youAreHere: "You're here", stars: 'Stars', reward: 'Reward', rating: 'Rating', pet: 'Pet', conqueredMark: 'Conquered',
  lockedIsland: 'Locked', locked5: 'Requires the full game', firstTime: 'First conquest', replayReward: 'Repeat win', starsRule: 'Win = 1 star · 75%+ accuracy = 2 stars · 85%+ accuracy in under 40 moves = 3 stars',
  fullTitle: 'Unlock all 99 islands', fullBody: 'You conquered the free islands! A one-time purchase unlocks islands 6–99: 94 more bots, 9 regions and 9 bosses. No subscription, no ads.', priceSoon: 'Price coming soon', unlockTest: 'Unlock (test)', fullOwned: 'Full game unlocked', fullGame: 'Full game', unlocked: 'Unlocked!',
  tryAgain: 'Try again', toMap: 'Map', album: 'Album', albumTitle: 'Bot Album', defeated: 'Defeated', notMet: 'Not met yet', albumNote: 'Conquer a whole region to earn a treasure chest.',
  friendTitle: 'Play a friend', friendDesc: 'Two players on one device — the camera flips after every move.', friendSoon: 'Coming soon: private online rooms for friends.', startGame: 'Start game',
  chess: 'Chess', opponent: 'Opponent', vsBot: 'vs Bot', twoPlayers: '2 Players', twoPlayers_d: 'Same device', vsBot_d: 'Conquer islands for your museum',
  island: 'Island', chooseIsland: 'Which island?', play: 'Play', travel: 'Travel', travelHere: "You're here",
  gameResumed: 'Your game continues where you left off', confirmDraw: 'Agree to a draw?', general: 'General', fromIsland: 'From', buy: 'Buy', free: 'Free', reachEra: 'Unlocks at era', islandBundle: 'All 5 islands', newIslands: 'New islands',
  appTitle: 'Chess of Ages', appSubtitle: 'Chess of Ages: Island Realms', logoEn: 'ISLAND REALMS',
  loading: 'Sailing to the islands…', tapToStart: 'Tap to start',
  era: 'Era', stage: 'Stage', of: 'of', next: 'Next', locked: 'Locked', completed: 'Completed!',
  sfx: 'SFX', ambience: 'Ambience', eras: 'Eras', eraTour: 'Era Tour', panorama: 'Panorama',
  center: 'Center', shop: 'Shop', modes: 'Play', buildNext: 'Build',
  yourTurn: 'Your turn', thinking: 'Thinking…', check: 'Check!', checkmate: 'Checkmate!', waiting: 'Waiting…', you: 'You',
  white: 'White', black: 'Black', vs: 'vs',
  promoTitle: 'Promote pawn', queen: 'Queen', rook: 'Rook', bishop: 'Bishop', knight: 'Knight',
  victory: 'Victory!', defeat: 'Defeat', draw: 'Draw', newGame: 'New game', rematch: 'Rematch', viewKingdom: 'View museum', close: 'Close', cancel: 'Cancel', ok: 'OK', back: 'Back',
  reason_checkmate: 'Checkmate', reason_stalemate: 'Stalemate', reason_repetition: 'Threefold repetition', reason_insufficient: 'Insufficient material', reason_fifty: '50-move rule', reason_resign: 'Resignation', reason_timeout: 'Time out', reason_agreement: 'Agreement', reason_abandon: 'Opponent left',
  stageBuilt: 'New stage built', newEra: 'New era', antiFarm: 'Two-player wins build a stage only after at least 15 moves',
  premiumLocked: 'Base eras complete! Unlock a premium era in the shop to keep building', kingdomComplete: 'All 20 stages built — your kingdom is complete!',
  resetProgress: 'Reset the kingdom to stage 0?', reset: 'Reset',
  mode_ai: 'Campaign vs AI', mode_ai_d: 'Build your kingdom with victories', mode_friend: 'Play a friend online', mode_friend_d: 'Private room code + WhatsApp invite',
  mode_quick: 'Quick online match', mode_quick_d: 'Find an opponent in seconds', mode_local: 'Two players, one device', mode_local_d: 'Camera flips after every move',
  difficulty: 'Difficulty', easy: 'Easy', medium: 'Medium', hard: 'Hard', start: 'Start', timeControl: 'Time per player', noClock: 'No clock',
  createRoom: 'Create room', joinRoom: 'Join room', roomCode: 'Room code', enterCode: 'Enter a 4-digit code', join: 'Join',
  shareWhatsapp: 'Share invite on WhatsApp', copyLink: 'Copy link', copied: 'Copied!', waitingFriend: 'Waiting for your friend…',
  searching: 'Searching…', botNotice: 'No player available right now', botNotice2: "You'll play a bot — this opponent is a computer", letsPlay: "Let's play",
  resign: 'Resign', offerDraw: 'Offer draw', drawOffered: 'Opponent offers a draw', accept: 'Accept', decline: 'Decline', drawDeclined: 'Draw offer declined',
  rematchOffered: 'Opponent wants a rematch', disconnected: 'Connection lost', confirmResign: 'Resign this game?', confirmNew: 'Start a new game? The current game will end.',
  onlineNotice: 'Online play connects you directly to another player (WebRTC) through the PeerJS signaling server and, when needed, a STUN/TURN relay. Your IP address is visible to these servers and to your opponent for the connection, and your display name, symbol, avatar and kingdom look are sent to your opponent. We do not store your games on a server.', understood: 'Got it, continue',
  connError: "Can't connect right now. Check your internet and try again.", roomNotFound: 'Room not found or already full',
  emotes: 'Emotes', hint: 'Hint', hintCost: 'Hint · 30 gems', notEnoughGems: 'Not enough gems',
  brilliant: 'Brilliant!!', best: 'Great move!', inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder!',
  summary: 'Game summary', accuracy: 'Accuracy', keyMoments: 'Key moments', replay: 'Replay', yourAccuracy: 'Your accuracy', oppAccuracy: 'Opponent accuracy',
  gemsEarned: 'Gems earned', achievements: 'Achievements', achievementUnlocked: 'Achievement unlocked!', profile: 'Profile', name: 'Name', avatar: 'Emblem',
  settings: 'Settings', language: 'Language', quality: 'Graphics', auto: 'Auto', high: 'High', low: 'Low', privacy: 'Privacy & data',
  deleteData: 'Delete all my data', confirmDelete: 'Delete all progress, gems and items on this device? This cannot be undone.',
  privacyText: 'This app uses no cookies, pixels, analytics or ad tracking, and has no online play. Progress, gems and settings are stored only on your device (localStorage). Sandbox purchases never charge money.',
  share: 'Share', shareText: 'Check out my Time Museum in Chess of Ages: Island Realms!', saveImage: 'Save image',
  tutorial: 'Tutorial', skip: 'Skip', nextStep: 'Next', finish: 'Finish',
  tut1: 'Welcome to Chess of Ages! 99 islands await — beat the bot on each island to conquer it. The first one is sitting across from you.', tut2: 'Tap a white pawn to select it. Green squares are legal moves.', tut3: 'Now tap a green square to move the piece.', tut4: 'Great! Drag outside the board to rotate the camera, pinch to zoom.', tut5: 'The Shop has avatar outfits, pets, new islands and a daily gift.', tut6: 'Good luck, Your Majesty! Win to conquer your first island — then open the map.',
  dailyGift: 'Daily gift', dailyTitle: 'Daily Treasure & Fortune Wheel', day: 'Day', claim: 'Claim', claimed: 'Claimed', comeBack: 'Come back tomorrow for the next reward', streakBroken: 'Your streak restarted',
  wheelTitle: 'Royal Fortune Wheel', spinFree: 'Free spin!', spinFor: 'Spin for 50', nextFreeSpin: 'Free spin in', odds: 'Odds', royalChest: 'Royal Treasure Chest', trial24: '24-hour trial',
  shopTitle: 'Shop', tabWardrobe: 'Outfits', tabPets: 'Pets', tabEras: 'Islands', tabGems: 'Gems',
  tryOn: 'Preview', buyFor: 'Buy for ', equip: 'Equip', equipped: 'Equipped', owned: 'Owned', unlockAt: 'Unlocks at era', bundle: '5-era bundle', unlock: 'Unlock', visit: 'Visit',
  sandbox: 'Sandbox mode', devGems: '+500 free (testing)', sandboxCheckout: 'Simulated checkout — sandbox', sandboxNote: 'This is a test purchase. No money is charged.', confirmPurchase: 'Confirm (simulated)', purchased: 'Purchased!',
  trialLeft: 'Trial', hours: 'h', update: 'Updating… your game is saved', updateNative: 'A new app version is required', download: 'Download', updateNativeBody: 'Download the new version and install it over this one. Your progress is kept.', updateAvailable: 'A new update is ready!', updateAvailableBody: 'A new version of the game is ready', updateNow: 'Update now', later: 'Later', checkUpdates: 'Check for updates', muteAll: 'Mute / unmute all sound', checkingUpdates: 'Checking for updates…', downloadingUpdate: 'Update found — downloading…', updateError: 'Update failed — we will retry automatically', upToDate: 'You have the latest version', whatsNew: "What's new", updateLaterNote: 'Chose later? It installs automatically next time you open the game.',
  offline: 'No internet connection', copiedCode: 'Code copied', keyboardHelp: 'Keyboard: arrows move the cursor, Enter selects, Esc cancels',
  gameStarted: 'Game on — good luck!', opponentLeft: 'Your opponent left', youPlayWhite: 'You play White', youPlayBlack: 'You play Black',
  visitEra: 'Go to era', currentEra: 'Current era', stagesBuilt: 'Stages built', buyEraFirst: 'Unlock this era in the shop',
  gems: 'Gems', actions: 'Actions', bot: 'Bot', canvasLabel: '3D game board. Use the arrow keys and Enter to play.', previewLabel: '3D preview of your avatar and pet', dragRotate: 'Drag to rotate',
  privacyPolicy: 'Privacy & accessibility', loadError: 'Something went wrong while loading. Please refresh the page.', defaultName: 'King', bestValue: 'Best value', bonus: 'bonus', pricesNote: 'Sandbox prices are for illustration only. The store version shows the official Google Play price in your local currency.',
};

export const PET_EN = { wolf_cub: 'Primal Wolf Cub', royal_owl: 'Imperial Owl', armor_steed: 'Knight Pony', fire_dragon: 'Royal Fire Dragon', golden_phoenix: 'Golden Phoenix', cyber_fox: 'Holo Cyber Fox', mythic_griffin: 'Mythic Griffin', crystal_unicorn: 'Crystal Unicorn' };
export const ITEM_EN = {
  crown_starter: 'Simple Wooden Circlet', crown_gold: 'Ruby Royal Crown', helm_spartan: 'Spartan Plumed Helm', helm_samurai: 'Golden Kabuto Helm', crown_pharaoh: 'Pharaoh Nemes Crown', visor_cyber: 'Cyberpunk Holo Visor',
  tunic_starter: 'Simple Cloth Tunic', cape_royal_velvet: 'Royal Velvet Cape', armor_paladin: 'Paladin Silver Armor', armor_shogun: 'Shogun Black-Gold Armor', robe_celestial: 'Celestial Star Robe',
  staff_wood: 'Wooden Staff', scepter_diamond: 'Diamond Scepter', sword_excalibur: 'Glowing Excalibur', trident_atlantis: 'Electric Atlantis Trident',
  aura_none: 'No Aura', aura_golden_sparks: 'Golden Sparks Aura', aura_fire_ring: 'Royal Fire Ring', aura_cosmic_lightning: 'Cosmic Lightning',
};
/** שמות קצרים (עד 2 מילים) לכרטיסי החנות */
export const ITEM_SHORT = {
  crown_starter: ['נזר עץ', 'Wood Circlet'], crown_gold: ['כתר אודם', 'Ruby Crown'], helm_spartan: ['קסדה ספרטנית', 'Spartan Helm'], helm_samurai: ['קבוטו זהב', 'Gold Kabuto'], crown_pharaoh: ['כתר פרעה', 'Pharaoh Crown'], visor_cyber: ['משקף סייבר', 'Cyber Visor'],
  tunic_starter: ['גלימת בד', 'Cloth Tunic'], cape_royal_velvet: ['גלימה מלכותית', 'Royal Cape'], armor_paladin: ['שריון אביר', 'Paladin Armor'], armor_shogun: ['שריון שוגון', 'Shogun Armor'], robe_celestial: ['גלימת כוכבים', 'Star Robe'],
  staff_wood: ['מטה עץ', 'Wood Staff'], scepter_diamond: ['שרביט יהלום', 'Diamond Scepter'], sword_excalibur: ['אקסקליבר', 'Excalibur'], trident_atlantis: ['קלשון אטלנטיס', 'Atlantis Trident'],
  aura_none: ['ללא הילה', 'No Aura'], aura_golden_sparks: ['ניצוצות זהב', 'Gold Sparks'], aura_fire_ring: ['טבעת אש', 'Fire Ring'], aura_cosmic_lightning: ['ברק קוסמי', 'Cosmic Bolt'],
  wolf_cub: ['גור זאבים', 'Wolf Cub'], royal_owl: ['ינשוף מלכותי', 'Royal Owl'], armor_steed: ['סוסון אביר', 'Knight Pony'], fire_dragon: ['דרקון אש', 'Fire Dragon'], golden_phoenix: ['עוף החול', 'Phoenix'], cyber_fox: ['שועל סייבר', 'Cyber Fox'], mythic_griffin: ['גריפון', 'Griffin'], crystal_unicorn: ['חד-קרן', 'Unicorn'],
};
/** שמות קצרים לאיים (עידנים) */
export const ISLAND_SHORT = { 1: ['עידן האבן', 'Stone Age'], 2: ['האימפריה', 'Empire'], 3: ['ימי הביניים', 'Medieval'], 4: ['התעשייה', 'Industrial'], 5: ['סייבר', 'Cyber'], 6: ['סמוראים', 'Samurai'], 7: ['פרעונים', 'Pharaohs'], 8: ['ולהאלה', 'Valhalla'], 9: ['אטלנטיס', 'Atlantis'], 10: ['השמיים', 'Celestial'] };
/** שם אי מלא: "אי הצור" / "Flint Isle" */
export const islandLabel = (id) => { const d = islandDef(id); return d ? (lang === 'en' ? `${d.place.en} Isle` : `אי ${d.place.he}`) : ''; };
export const shortName = (id) => { const v = ITEM_SHORT[id]; return v ? (lang === 'en' ? v[1] : v[0]) : id; };
export const islandName = (id) => { const v = ISLAND_SHORT[id]; return v ? (lang === 'en' ? v[1] : v[0]) : String(id); };
export const DIFF_PERSONA = { easy: { he: 'מנהיג השבט', en: 'Tribe Chief', icon: 'axe' }, medium: { he: 'אביר הממלכה', en: 'Kingdom Knight', icon: 'swords' }, hard: { he: 'האדריכל העליון', en: 'Supreme Architect', icon: 'setsquare' } };

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
