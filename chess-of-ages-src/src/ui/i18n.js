import { islandDef } from '../config/Islands.js';

/**
 * תרגומים: אנגלית (ברירת המחדל לכולם, LTR) ועברית (RTL) — עברית רק כשהשחקן בוחר בה בכפתור השפה או בהגדרות.
 */
const HE = {
  // [a11y] start
  a11yPcs: 'רגלי לבן|פרש לבן|רץ לבן|צריח לבן|מלכה לבנה|מלך לבן|רגלי שחור|פרש שחור|רץ שחור|צריח שחור|מלכה שחורה|מלך שחור', a11yPromoNames: 'רגלי|פרש|רץ|צריח|מלכה|מלך',
  a11yMove: '{piece} מ-{from} ל-{to}', a11yTakesM: ' ואוכל את {piece}', a11yTakesF: ' ואוכלת את {piece}', a11yPromo: ', הכתרה ל{piece}', a11yCheck: ' — שח', a11yMate: ' — מט',
  a11yCastleK: '{side}: הצרחה קצרה', a11yCastleQ: '{side}: הצרחה ארוכה', a11ySelected: 'נבחר: {piece} ב-{sq} · מהלכים אפשריים: {n}', a11yTarget: 'אפשר לזוז לכאן',
  a11yIllegal: 'אי אפשר לזוז לשם', a11yNotYourTurn: 'עוד לא התור שלך', a11yCinema: 'בית הקולנוע', a11yReduceMotion: 'הפחתת תנועה', a11yMotionAuto: 'לפי המכשיר', a11yMotionOn: 'תמיד',
  a11yGame: 'שחמט העידנים: ממלכות האיים', a11yPreview: 'תצוגה מקדימה', a11yToasts: 'הודעות',
  // [a11y] end
  tabBots: 'בוטים', moreBotsHint: 'כל אי שתכבוש פותח את הבוט שלו ואת הצבע של החיה שלו', noBotsHint: 'כבוש איים כדי לפתוח את הבוטים שלהם', invitePlay: 'שחק', resident: 'גר אצלך', residentPractice: 'משחק אימון מול תושב — בלי יהלומים', cinema: 'קולנוע', cinemaTitle: 'בית הקולנוע המרכזי', storyFilm: 'הסיפור', storyDesc: 'מוזיאון הזמן, 99 האיים ופיראטי הזמן · 40 שניות', premiumFilm: 'הפרימיום', premiumFilmDesc: 'איי הפרימיום, הדרקון והמאיץ · 35 שניות', pnTitle: 'רכישה בכסף אמיתי', pnBody: 'מתחת לגיל 18 — רק באישור הורה.', pnContinue: 'המשך לרכישה', pnCancel: 'ביטול', rcTitle: 'הרכישה הושלמה', rcPrice: 'מחיר', rcOrder: 'מספר הזמנה', rcEmailed: 'הקבלה הרשמית נשלחה אליך במייל מגוגל.', rcTest: 'מצב בדיקה — לא חויבת.', rcDev: 'המפתח', rcDevEmail: 'מייל', rcAddr1: 'הכתובת המלאה של המפתח מופיעה בדף האפליקציה', rcAddr2: 'ב-Google Play.', rcTerms: 'תנאי ביטול והחזרים', rcSkinIncl: 'עיצוב חדש ללוח ולכלים', rcIslandsIncl: '30 איים חדשים', rcSkyIncl: 'חיה מעופפת אגדית', premiumBoosterSep: 'מאיץ היהלומים הוא רכישה נפרדת לשבוע.', mpTitle: 'הרכישות שלי', npTitle: 'תואר', npEpithet: 'כינוי', npNote: 'בוחרים שם מהרשימה, כך שפרטים אישיים לא נשלחים במשחק אונליין.', mpEmpty: 'עוד אין רכישות במכשיר הזה.', trailerLabel: 'הטריילר · 30 שניות', trailerPlay: 'הפעלת הטריילר', trailerOffline: 'הטריילר נטען מהאינטרנט. צריך חיבור כדי לצפות בו.', premiumOneTime: 'רכישה חד-פעמית, בלי מנוי', premiumPaid: 'הפרימיום בתשלום בכסף אמיתי', howToPlay: 'איך משחקים', howToDesc: 'משחק מודרך קצר ליד השולחן', skip: 'דלג', cinemaAtHub: 'בית הקולנוע נמצא באי המרכזי', cinemaHint: 'נגיעה בכלי מתחילה לשחק · בקולנוע שבאי המרכזי יש את הסיפור ואת ההדרכה', pieceArrives: 'חלק חדש מגיע למוזיאון', museumPieces: 'חלקים במוזיאון', piratesHere: 'פיראטי הזמן תפסו את האי — נצח אותם וקבל יהלומים', piratesReturn: 'הפיראטים מתארגנים · חוזרים בעוד {t}', practiceNoGems: 'משחק אימון — היהלומים חוזרים כשהפיראטים נוחתים שוב', piratesFled: 'הפיראטים ברחו! האי שקט לכמה שעות', pieceToMuseum: 'חלק מהאי מצטרף למוזיאון באי המרכזי', hShort: 'ש׳', mShort: 'ד׳', fightPirates: 'הילחם בפיראטים', practicePirates: 'אימון נגד הפיראטים', timePirates: 'פיראטי הזמן', visitIsland: 'בקר באי', anyOrder: 'אפשר לכבוש בכל סדר', world: 'עולם',
  tapToSpeed: 'נגיעה במסך מאיצה את המסע', map: 'מפה', friend: 'חבר', home: 'הביתה', battle: 'קרב', boss: 'בוס', hubName: 'האי המרכזי', conquered: 'איים שנכבשו', allConquered: 'כל האיים נכבשו!', unlockFullShort: 'פתח את איי הפרימיום כדי להמשיך לאי 100',
  nextBuilding: 'מבנה הבא', moreIslands: 'איים לכיבוש', beatToConquer: 'נצח את הבוט כדי לכבוש את האי', waitMove: 'רגע, המהלך עוד רץ…', lockedBeatPrev: 'נעול — נצח קודם את הבוט באי {n}',
  battleVs: 'קרב נגד', shopAtHub: 'החנות נמצאת באי המרכזי — לחץ "הביתה"', islandConquered: 'האי נכבש', regionComplete: 'כבשת אזור שלם!', starMilestone: 'אספת כוכבים:',
  worldMap: 'מפת האיים', myIsland: 'האי שלי', nextIsland: 'האי הבא', travelBattle: 'טוס והילחם', enterIsland: 'כניסה', botRules: 'הבוט עדיין שולט', zoomBackHint: 'נגיעה בלוח מחזירה אותו לגודל הכי טוב לשחק', museum: 'מוזיאון הזמן', youAreHere: 'אתה כאן', stars: 'כוכבים', reward: 'פרס', rating: 'דירוג', pet: 'חיית מחמד', conqueredMark: 'נכבש',
  lockedIsland: 'נעול', locked5: 'איי הפרימיום', firstTime: 'כיבוש ראשון', replayReward: 'ניצחון חוזר', starsRule: 'ניצחון = כוכב · דיוק 75%+ = 2 כוכבים · דיוק 85%+ בפחות מ-40 מהלכים = 3 כוכבים',
  fullTitle: 'איי הפרימיום', fullBody: '30 איים חדשים צמודים לאי המרכזי (100–129). לכל אי אקלים, לוח, מונומנט ותפאורה חיה משלו, ובוטים חזקים במיוחד. רכישה חד-פעמית, בלי מנוי.', priceSoon: 'המחיר ייקבע בקרוב', unlockTest: 'פתח (בדיקה)', fullOwned: 'איי הפרימיום פתוחים', fullGame: 'איי הפרימיום', unlocked: 'נפתח!',
  tryAgain: 'נסה שוב', toMap: 'למפה', album: 'אלבום', albumTitle: 'אלבום הבוטים', defeated: 'הובס', notMet: 'עוד לא נפגשתם', albumNote: 'כבוש אזור שלם כדי לקבל תיבת אוצר.',
  onDevice: 'על המכשיר הזה', onlineFriend: 'אונליין עם חבר', onlineDesc: 'הזמן חבר עם קישור או קוד פרטי. רק מי שקיבל ממך את הקוד יכול להיכנס או לצפות — בלי זרים ובלי צ׳אט.', yourPieces: 'הכלים שלך', randomColor: 'אקראי', createInvite: 'צור הזמנה', joinWithCode: 'יש לך קוד? הצטרף', codeLabel: 'קוד החדר', connecting: 'מתחבר…', waitingShort: 'ממתין…', waitingHint: 'שלח לחבר את הקישור או את הקוד. המשחק מתחיל ברגע שהוא נכנס.', shareInvite: 'שתף הזמנה', linkCopied: 'הקישור הועתק!', codeCopied: 'הקוד הועתק!', inviteWatchers: 'קישור לצופים', watchLinkCopied: 'קישור לצופים הועתק', inviteText: 'בוא לשחק נגדי שחמט ב-Chess of Ages! קוד החדר: {code}', watchText: 'בוא לצפות במשחק השחמט שלי ב-Chess of Ages! קוד: {code}', friendJoined: '{name} נכנס — המשחק מתחיל!', friendLeft: 'החבר התנתק', friendBack: 'החבר חזר', friendOnline: 'מחובר', friendOffline: 'לא מחובר', friendTurn: 'התור של החבר', turnOf: 'תור', roomGone: 'החדר הזה לא קיים או שנסגר.', roomFullWatch: 'בחדר הזה כבר משחקים שניים. רוצה לצפות במשחק?', watchGame: 'צפה', watching: 'צופה', spectatorsN: '{n} צופים', spectatorJoined: 'מישהו התחיל לצפות במשחק', leaveOnline: 'לצאת מהמשחק האונליין?', leaveOnlineResign: 'יציאה באמצע המשחק נחשבת כניעה.', leave: 'צא', leaveRoom: 'צא מהחדר', drawOfferedBy: '{name} מציע תיקו', drawSent: 'הצעת התיקו נשלחה', confirmDrawOnline: 'להציע לחבר תיקו?', rematchSent: 'מחכים שהחבר יאשר משחק חוזר…', rematchAsked: '{name} רוצה משחק חוזר!', newOnlineGame: 'משחק חדש — הצבעים התחלפו', noHintsOnline: 'אין רמזים במשחק אונליין', friendlyMatch: 'משחק ידידותי — בלי יהלומים, רק כבוד', roomClosed: 'החדר נסגר', backToRoom: 'חזרת למשחק האונליין', resyncing: 'מסנכרן את הלוח…', onlineError: 'אין חיבור למשחק אונליין כרגע. בדוק את האינטרנט ונסה שוב.', badCode: 'קוד לא תקין — 6 אותיות ומספרים', cancelRoom: 'בטל', onlineNotice2: 'משחק אונליין עובר דרך Firebase של Google (שרתים באירופה). נשלחים לחדר רק השם שבחרת, מראה האווטאר והחיה שלך והמהלכים — ורואים אותם רק מי שקיבל את הקוד (החבר והצופים). אין צ׳אט חופשי, לחדר של חבר לא נכנסים זרים, והחדר נמחק בסוף המשחק. ההתחברות אנונימית — בלי אימייל ובלי סיסמה.', friendTitle: 'משחק נגד חבר', friendDesc: 'שני שחקנים על אותו מכשיר — המצלמה מתהפכת אחרי כל מהלך.', friendSoon: '', startGame: 'התחל משחק',
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
  rematchOffered: 'היריב מבקש משחק חוזר', disconnected: 'החיבור ליריב אבד', confirmResign: 'להיכנע במשחק הזה?', confirmRestart: 'להתחיל משחק חדש?', confirmNew: 'להתחיל משחק חדש? המשחק הנוכחי יסתיים.',
  onlineNotice: 'משחק אונליין מחבר אותך ישירות לשחקן אחר (WebRTC) דרך שרת האיתות של PeerJS, ובמידת הצורך דרך שרת ממסר STUN/TURN. כתובת ה-IP שלך גלויה לשרתים האלה וליריב לצורך החיבור, והשם, הסמל, האווטאר ומראה הממלכה שלך נשלחים ליריב. אנחנו לא שומרים את המשחקים שלך בשרת.', understood: 'הבנתי, המשך',
  connError: 'לא ניתן להתחבר כרגע. בדוק את החיבור לאינטרנט ונסה שוב.', roomNotFound: 'החדר לא נמצא או כבר מלא',
  emotes: 'אימוג׳ים', hint: 'רמז', hintCost: 'רמז · 30 יהלומים', notEnoughGems: 'אין מספיק יהלומים',
  brilliant: 'מהלך מבריק!!', best: 'מהלך מצוין!', inaccuracy: 'אי-דיוק', mistake: 'טעות', blunder: 'טעות גסה!',
  summary: 'סיכום משחק', accuracy: 'דיוק', keyMoments: 'רגעי מפתח', replay: 'הילוך חוזר', yourAccuracy: 'הדיוק שלך', oppAccuracy: 'דיוק היריב',
  gemsEarned: 'יהלומים שהרווחת', achievements: 'הישגים', achievementUnlocked: 'הישג נפתח!', profile: 'פרופיל', name: 'שם', avatar: 'סמל',
  settings: 'הגדרות', language: 'שפה', quality: 'איכות גרפיקה', auto: 'אוטומטי', high: 'גבוהה', low: 'נמוכה', privacy: 'פרטיות ונתונים',
  deleteData: 'מחק את כל הנתונים שלי', confirmDelete: 'למחוק את כל ההתקדמות, היהלומים, הפריטים והחיות במכשיר הזה, ואת חדרי האונליין שפתחת? בחירת השפה נשמרת. הפעולה לא הפיכה.',
  privacyText: 'בלי עוגיות, כלי ניתוח או מעקב. ההתקדמות, היהלומים וההגדרות נשמרים רק במכשיר הזה. משחק אונליין הוא אופציונלי, והוא שולח דרך Google Firebase רק את שם התצוגה מהרשימה, מראה האווטאר והמהלכים. עם חבר רואה אותם רק מי שיש לו את קוד החדר. בזירת העידנים רואה אותם היריב, וכשאתה מחכה ליריב, כל מי שבזירה רואה את השם, הסמל והאי. בגרסת Google Play יש גם פרסומות לבחירה בלבד: רק כשנוגעים בדולפין ובוחרים לצפות, Google AdMob מציגה פרסומת ומקבלת מידע טכני מהמכשיר (פרטים במדיניות הפרטיות).',
  share: 'שתף', shareText: 'תראו את מוזיאון הזמן שלי ב-Chess of Ages: Island Realms!', saveImage: 'שמור תמונה',
  tutorial: 'מדריך', skip: 'דלג', nextStep: 'הבא', finish: 'סיום',
  tut1: 'ברוך הבא לשחמט העידנים! 99 איים מחכים לך — נצח את הבוט בכל אי כדי לכבוש אותו. הראשון יושב מולך.', tut2: 'הקש על רגלי לבן כדי לבחור אותו. המשבצות הירוקות הן מהלכים חוקיים.', tut3: 'עכשיו הקש על משבצת ירוקה כדי להזיז את הכלי.', tut4: 'מעולה! גרור אצבע מחוץ ללוח כדי לסובב את המצלמה, וצבוט כדי להתקרב.', tut5: 'בחנות תמצא בגדים לאווטאר, חיות מחמד, איים חדשים ומתנה יומית.', tut6: 'בהצלחה, מלך! נצח כדי לכבוש את האי הראשון — ואז פתח את המפה.',
  dailyGift: 'מתנה יומית', dailyTitle: 'המתנה היומית', day: 'יום', claim: 'קבל', claimed: 'נאסף', comeBack: 'חזור מחר לפרס הבא', streakBroken: 'הרצף התחיל מחדש',
  royalChest: 'תיבת האוצר המלכותית', trial24: 'ניסיון ל-24 שעות',
  shopTitle: 'חנות', shopCrowns: 'כתרים', shopRobes: 'גלימות', shopWeapons: 'נשקים', shopAuras: 'הילות', shopBoards: 'לוחות', shopPets: 'חיות', shopGifts: 'מתנות', giftCollected: 'קיבלת {n} יהלומים · יום {d} מתוך 7 ברצף', nextGiftIn: 'המתנה הבאה בעוד {t} · יום {d} ברצף', giftWaiting: 'בועת מתנה מחכה לך מעל בית המתנות', shopPremium: 'פרימיום', petStage1: 'גור', petStage2: 'בוגר', petStage3: 'אגדי', petXp: 'ניסיון', petEvolved: 'החיה שלך התפתחה!', petNowAdult: 'החיה עלתה לשלב בוגר!', petNowLegend: 'החיה הפכה לאגדית!', petMaxed: 'שלב אגדי — השלב הגבוה ביותר', petGrowNote: 'החיה שמלווה אותך צוברת ניסיון בכל קרב: גור ← בוגר (60) ← אגדי (220).', shopSky: 'קן השמיים', tabSky: 'מעופפות', skyNote: 'חיה מעופפת בחינם על כל 10 איים שנכבשים. נגיעה בחיה שחגה מעל העיר פותחת את קן השמיים.', skyPetUnlocked: 'חיה מעופפת חדשה הצטרפה!', skyWaiting: 'מחכה לך בקן השמיים', tabWardrobe: 'לבוש', tabPets: 'חיות', tabEras: 'איים', tabGems: 'יהלומים',
  tryOn: 'נסה בתצוגה', buyFor: 'קנה ב-', equip: 'הלבש', equipped: 'מולבש', owned: 'בבעלותך', unlockAt: 'נפתח בעידן', bundle: 'חבילת 5 העידנים', unlock: 'פתח', visit: 'בקר',
  sandbox: 'מצב בדיקה (Sandbox)', devGems: '‎+500 חינם לבדיקה', sandboxCheckout: 'קופה מדומה — מצב בדיקה', sandboxNote: 'זו רכישת בדיקה. לא ייגבה כסף.', confirmPurchase: 'אשר רכישה (סימולציה)', purchased: 'נרכש!',
  trialLeft: 'ניסיון', hours: 'שעות', update: 'מעדכן… המשחק שלך נשמר', updateNative: 'נדרשת גרסה חדשה של האפליקציה', download: 'הורד', updateNativeBody: 'הורד את הגרסה החדשה והתקן אותה מעל הקיימת. ההתקדמות שלך נשמרת.', updateAvailable: 'יש עדכון חדש!', updateAvailableBody: 'גרסה חדשה של המשחק מוכנה', updateNow: 'עדכן עכשיו', later: 'אחר כך', checkUpdates: 'בדוק עדכונים', muteAll: 'השתקה / הפעלה של כל הצלילים', checkingUpdates: 'בודק עדכונים…', downloadingUpdate: 'נמצא עדכון — מוריד…', updateError: 'העדכון נכשל, ננסה שוב אוטומטית', upToDate: 'יש לך את הגרסה העדכנית', whatsNew: 'מה חדש', updateLaterNote: 'בחרת אחר כך? העדכון יותקן לבד בפתיחה הבאה.',
  offline: 'אין חיבור לאינטרנט', copiedCode: 'הקוד הועתק', keyboardHelp: 'מקלדת: חצים להזזת הסמן, Enter לבחירה, Esc לביטול',
  gameStarted: 'המשחק התחיל — בהצלחה!', opponentLeft: 'היריב עזב את המשחק', youPlayWhite: 'אתה משחק בלבן', youPlayBlack: 'אתה משחק בשחור',
  visitEra: 'מעבר לעידן', currentEra: 'העידן הנוכחי', stagesBuilt: 'שלבים שנבנו', buyEraFirst: 'רכוש את העידן בחנות',
  gems: 'יהלומים', actions: 'פעולות', bot: 'בוט', canvasLabel: 'לוח משחק תלת-ממדי. השתמש בחצים ובמקש Enter כדי לשחק.', previewLabel: 'תצוגה תלת-ממדית של האווטאר וחיית המחמד', dragRotate: 'גרור כדי לסובב',
  privacyPolicy: 'מדיניות פרטיות', loadError: 'אירעה שגיאה בטעינה. נסה לרענן את הדף.', bestValue: 'הכי משתלם', bonus: 'בונוס', pricesNote: 'המחירים במצב בדיקה להמחשה בלבד. בגרסה בחנות יוצג המחיר הרשמי של Google Play במטבע המקומי.',
  premiumTag: 'פרימיום', dragonBonus: 'בונוס: דרקון השעונים הזהוב — מרחף מעל האי המרכזי ומצטרף אליך כחיית מחמד', premiumPoint1: '30 איים חדשים צמודים לאי המרכזי', premiumPoint2: 'לכל אי אקלים, לוח ותפאורה חיה משלו', premiumPoint3: 'בוטים חזקים, 3 עולמות ו-3 בוסים חדשים',
  tabBoards: 'לוחות', tabPremium: 'פרימיום', boardsNote: 'סקין חינם על כל 20 איים שנכבשים. הסקין חל על הלוח ועל הכלים.', islandBoard: 'לוח האי', earnSkinAt: 'כבוש {n} איים', skinUnlocked: 'סקין לוח חדש נפתח!',
  boostTitle: 'יהלומים כפולים לשבוע', boostBody: 'x2 יהלומים על כל ניצחון נגד בוטים ופיראטי הזמן, למשך 7 ימים. כל קנייה מוסיפה עוד 7 ימים.', boostActive: 'יהלומים כפולים פעילים', boostLeft: 'נשארו {t}', daysShort: 'י׳', boostAdd: 'הוסף שבוע', buyReal: 'קנה', owned: 'בבעלותך', gemsX2: 'x2 יהלומים', premiumWorld: 'עולם פרימיום',
  // [i18n] start
  lngButtonLabel: 'שפה / Language: עברית — מעבר לאנגלית (English)', lngSwitched: 'השפה: עברית',
  lngWorldSign: 'עולם {n} · {name}', lngGoldSign: 'איי הזהב · פרימיום',
  lngEm_crown: 'כתר', lngEm_shield: 'מגן', lngEm_swords: 'חרבות', lngEm_star: 'כוכב', lngEm_castle: 'טירה', lngEm_fire: 'אש', lngEm_gem: 'יהלום', lngEm_rook: 'צריח', lngEm_knight: 'פרש',
  // [i18n] end
  // [play] start
  playSoon: 'בקרוב', playSoonAria: 'בקרוב:', playSoonBody: 'רכישות יופעלו בקרוב דרך Google Play.',
  restorePurchases: 'שחזור רכישות', restoredN: 'שוחזרו {n} רכישות מ-Google Play', restored1: 'שוחזרה רכישה אחת מ-Google Play', restoreNone: 'לא נמצאו רכישות לשחזור בחשבון Google הזה',
  restoreFail: 'לא הצלחנו לבדוק את הרכישות. בדוק חיבור לאינטרנט ונסה שוב.', restoring: 'בודק רכישות…',
  payPending: 'התשלום ממתין לאישור. הפריט יתווסף לבד ברגע שהתשלום יושלם.', payFailed: 'הרכישה לא הושלמה. אפשר לנסות שוב.',
  payOffline: 'אין חיבור לאינטרנט. התחבר ונסה שוב.', payUnavailable: 'החנות של Google Play לא זמינה כרגע. נסה שוב מאוחר יותר.',
  payBusy: 'רכישה אחרת כבר בתהליך…', alreadyOwnedRestored: 'כבר קנית את זה — הפריט הוחזר אליך בלי חיוב.', storeRevoked: 'רכישה שבוטלה ב-Google Play הוסרה מהמשחק.',
  playUpdateTitle: 'יש גרסה חדשה בגוגל פליי', playUpdateBody: 'כדי להמשיך לקבל תוכן חדש, עדכן את האפליקציה בגוגל פליי. ההתקדמות שלך נשמרת.', playOpenStore: 'עדכן בגוגל פליי',
  playRoomNeedUpdate: 'החדר נוצר בגרסה חדשה יותר של המשחק. עדכן את המשחק ונסה שוב.', playRoomFriendOld: 'החבר משתמש בגרסה ישנה של המשחק. בקש ממנו לעדכן ולשלוח הזמנה חדשה.',
  // [play] end
  // [legal] start
  lgSection: 'משפטי ופרטיות', lgPrivacy: 'מדיניות פרטיות', lgTerms: 'תנאי שימוש', lgAccessibility: 'הצהרת נגישות', lgLicenses: 'רישיונות קוד פתוח',
  lgPayTest: 'קניות בחנות הבדיקה לא גובות כסף.', lgPayPlay: 'רכישות מטופלות ב-Google Play, ואנחנו לא רואים את פרטי התשלום.',
  lgBuyNote: 'רכישות אופציונליות: רואים את המחיר ב-Google Play ומאשרים לפני התשלום. כל פריט נקנה פעם אחת, ומאיץ היהלומים מוסיף 7 ימים בכל קנייה.',
  lgBuyNoteTest: 'חנות בדיקה: קנייה כאן לא גובה כסף.', lgTermsLink: 'תנאים והחזרים', lgDeleting: 'מוחק את הנתונים…',
  lgRoomsFail: 'אי אפשר להתחבר כרגע לשרת האונליין, ולכן חדרי האונליין שפתחת לא נמחקו. אפשר להתחבר לאינטרנט ולנסות שוב, או למחוק רק את הנתונים במכשיר הזה.',
  lgDeviceOnly: 'מחק רק במכשיר הזה',
  // [legal] end
  // [qa] start
  qaRecTitle: 'משהו השתבש', qaRecErrors: 'המשחק נתקל בבעיה ולא הצליח להתאושש. ההתקדמות שלך שמורה במכשיר.',
  qaRecStall: 'המשחק הפסיק להגיב. ההתקדמות שלך שמורה במכשיר.', qaRecBoot: 'המשחק לא הצליח לעלות. טעינה מחדש בדרך כלל פותרת את זה.',
  qaRecGfxTitle: 'הגרפיקה נקטעה', qaRecGfx: 'המכשיר עצר את הגרפיקה התלת־ממדית (זה קורה כשהזיכרון מתמלא). טעינה מחדש תחזיר אותה, וההתקדמות שלך שמורה.',
  qaRecReload: 'טען מחדש', qaRecClose: 'המשך לשחק',
  // [arena] start — זירת העידנים (ui/ArenaModal.js, app/OnlineController.js)
  arenaTab: 'אונליין', arenaHud: 'זירת העידנים · משחק ידידותי', arenaTitle: 'זירת העידנים', arenaDesc: 'שחק עכשיו מול שחקנים שמחכים ליריב. כל משחק באי אחר, שנבחר באקראי.',
  arenaSafe: 'בלי צ׳אט: רק שמות מהרשימה הקבועה ותגובות קבועות. אפשר לחסום שחקן. משחק בזירה הוא ידידותי, בלי יהלומים.',
  arenaQuick: 'משחק מהיר', arenaOpen: 'פתח חדר וחכה ליריב', arenaRooms: 'חדרים פנויים', arenaJoin: 'הצטרף',
  arenaEmpty: 'אין כרגע חדרים פנויים. פתח חדר, וכל מי שנכנס לזירה יראה אותו.', arenaLoading: 'טוען את החדרים…',
  arenaListError: 'אין חיבור לזירה כרגע. בדוק את האינטרנט ונסה שוב.', arenaListBusy: 'השרת מלא כרגע. ברגע שיתפנה מקום, החדרים יופיעו כאן לבד.', serverFullTitle: 'השרת מלא כרגע', serverFullBody: 'יש עכשיו יותר מדי שחקנים מחוברים. ברגע שיתפנה מקום, תיכנס אוטומטית.', serverFullTip: 'אפשר להשאיר את החלון פתוח, או לבטל ולשחק בינתיים נגד הבוט.', onlineBusy: 'השרת של המשחק אונליין עמוס או לא עונה כרגע. נסה שוב בעוד כמה דקות.', arenaWaitingFor: 'מחכה {t}', arenaJustNow: 'עכשיו',
  arenaSearching: 'מחפש יריב בזירה…', arenaWaitTitle: 'מחכים ליריב…', arenaWaitHint: 'החדר שלך בזירה, ב{isl}. המשחק מתחיל ברגע שמישהו נכנס.',
  arenaWaitTip: 'אפשר להסתיר את החלון ולהסתובב באי בינתיים. נודיע כשמישהו ייכנס.', arenaHide: 'הסתר',
  arenaTaken: 'מישהו הקדים אותך לחדר הזה. נסה חדר אחר או משחק מהיר.', arenaJoined: '{name} הצטרף, הקרב מתחיל!', arenaFound: 'נמצא יריב: {name}. בהצלחה!',
  arenaRival: 'יריב', arenaRivalTurn: 'התור של היריב', arenaRivalLeft: 'היריב התנתק', arenaRivalBack: 'היריב חזר',
  arenaBlock: 'חסום את השחקן', arenaBlockQ: 'לחסום את {name}? תצאו מהמשחק (באמצע משחק זה נחשב כניעה), ולא תיפגשו שוב בזירה.',
  arenaBlocked: 'השחקן נחסם. לא תיפגשו שוב בזירה.', arenaBlockedTried: 'שחקן שחסמת ניסה להיכנס, אז פתחנו לך חדר חדש.',
  arenaNotice: 'בזירה משחקים מול שחקנים שלא מכירים. המשחק עובר דרך Google Firebase (שרתים באירופה), ונשלחים רק השם שבחרת מהרשימה, הסמל, מראה האווטאר והחיה, והמהלכים. כשאתה מחכה ליריב, החדר שלך (השם, הסמל והאי) מופיע לכל מי שנכנס לזירה, עד שמישהו נכנס. אין צ׳אט ואין טקסט חופשי, ואפשר לחסום שחקן. ההתחברות אנונימית, בלי מייל ובלי סיסמה.',
  // [arena] end
  // [ads] start — פרסומות מתגמלות אצל הדולפין (core/RewardedAds.js, ui/AdOffer.js)
  adTitle: 'פרסומת', adOfferMain: 'צפה בפרסומת קצרה עד הסוף וקבל {n} יהלומים.', adOfferRule: 'אפשר לדלג או לסגור בכל רגע, ואז פשוט לא מקבלים יהלומים.',
  adOfferLimits: 'פעם ב-{m} דקות · עד {cap} ביום · נשארו היום: {left}', adOfferBy: 'את הפרסומת מציגה Google AdMob.', adPrivacyLink: 'פרטיות', adBonus: 'בונוס',
  adWatch: 'צפה בפרסומת', adNotNow: 'לא עכשיו', adLoading: 'טוען פרסומת…', adThanks: '+{n} יהלומים, תודה שצפית!',
  adEarly: 'הפרסומת נסגרה לפני הסוף, אז הפעם אין יהלומים.', adNoFill: 'אין כרגע פרסומת זמינה. נסה שוב בעוד כמה דקות.', adOffline: 'צריך חיבור לאינטרנט כדי לצפות בפרסומת.',
  adWait: 'הדולפין נח. הפרסומת הבאה בעוד {t}.', adDone: 'הדולפין סיים להיום. מחר יש עוד יהלומים.', adNoConsent: 'בלי הסכמה לפרסומות אי אפשר להציג פרסומת. אפשר לשנות את זה בהגדרות ← פרסומות.',
  adChoiceTitle: 'פרסומות ופרטיות',
  adChoiceBody: 'כדי להציג פרסומת, Google AdMob מקבלת מהמכשיר מידע טכני: מזהה הפרסום של המכשיר, כתובת IP (שממנה אפשר להעריך מיקום כללי), פרטי המכשיר והאפליקציה, ואיך צפית בפרסומת. המידע משמש להצגת הפרסומת, למדידה ולמניעת הונאות.',
  adChoiceQ: 'פרסומות מותאמות אישית משתמשות במידע הזה גם כדי לבחור פרסומות לפי תחומי עניין. מה מתאים לך?',
  adChoiceNpa: 'פרסומות כלליות', adChoicePers: 'פרסומות מותאמות אישית', adChoiceNote: 'אפשר לשנות בכל עת בהגדרות ← פרסומות.',
  adChoiceNote2: 'כלליות: בלי התאמה לפי תחומי עניין. אפשר למחוק או לאפס את מזהה הפרסום בהגדרות של אנדרואיד (Google ← מודעות).',
  adSettings: 'פרסומות', adSettingsText: 'צפייה בפרסומת אצל הדולפין שבמים היא תמיד לבחירתך, ומזכה ב-{n} יהלומים. את הפרסומות מציגה Google AdMob.',
  adPersonal: 'פרסומות מותאמות אישית', adPrivacyOptions: 'אפשרויות פרטיות לפרסומות',
  adFakeTitle: 'פרסומת לדוגמה', adFakeLeft: 'הפרס בסוף הספירה', adFakeDone: 'הצפייה הושלמה. אפשר לסגור.', adFakeConsent: 'טופס ההסכמה של Google (בדיקה)',
  gemsNote: 'יהלומים מרוויחים בניצחונות ובמתנה היומית.', gemsNoteAds: 'יהלומים מרוויחים בניצחונות, במתנה היומית ואצל הדולפין שבמים.',
  // [ads] end
  // [qa] end
};

const EN = {
  // [a11y] start
  a11yPcs: 'white pawn|white knight|white bishop|white rook|white queen|white king|black pawn|black knight|black bishop|black rook|black queen|black king', a11yPromoNames: 'pawn|knight|bishop|rook|queen|king',
  a11yMove: '{piece} {from} to {to}', a11yTakesM: ', captures {piece}', a11yTakesF: ', captures {piece}', a11yPromo: ', promotes to {piece}', a11yCheck: ', check', a11yMate: ', checkmate',
  a11yCastleK: '{side} castles kingside', a11yCastleQ: '{side} castles queenside', a11ySelected: 'Selected {piece} on {sq}, {n} legal moves', a11yTarget: 'legal move',
  a11yIllegal: "Can't move there", a11yNotYourTurn: 'Not your turn yet', a11yCinema: 'Cinema', a11yReduceMotion: 'Reduce motion', a11yMotionAuto: 'Like the device', a11yMotionOn: 'Always',
  a11yGame: 'Chess of Ages: Island Realms', a11yPreview: 'Preview', a11yToasts: 'Notifications',
  // [a11y] end
  tabBots: 'Bots', moreBotsHint: 'Every island you conquer unlocks its bot and its pet color', noBotsHint: 'Conquer islands to unlock their bots', invitePlay: 'Play', resident: 'Resident', residentPractice: 'Practice match with a resident — no gems', cinema: 'Cinema', cinemaTitle: 'Central Cinema', storyFilm: 'The Story', storyDesc: 'The Time Museum, 99 islands and the Time Pirates · 40 seconds', premiumFilm: 'Premium', premiumFilmDesc: 'Premium Islands, the dragon and double gems · 35 seconds', pnTitle: 'Real-money purchase', pnBody: "Under 18? Only with a parent's permission.", pnContinue: 'Continue', pnCancel: 'Cancel', rcTitle: 'Purchase complete', rcPrice: 'Price', rcOrder: 'Order number', rcEmailed: 'Google has emailed you the official receipt.', rcTest: 'Test mode: you were not charged.', rcDev: 'Developer', rcDevEmail: 'Email', rcAddr1: "The developer's full address appears on the app's", rcAddr2: 'Google Play page.', rcTerms: 'Cancellation and refund terms', rcSkinIncl: 'A new look for the board and pieces', rcIslandsIncl: '30 new islands', rcSkyIncl: 'A legendary flying pet', premiumBoosterSep: 'The gem booster is a separate weekly purchase.', mpTitle: 'My purchases', npTitle: 'Title', npEpithet: 'Epithet', npNote: 'Names come from a list, so no personal details are sent in online play.', mpEmpty: 'No purchases on this device yet.', trailerLabel: 'Trailer · 30 seconds', trailerPlay: 'Play the trailer', trailerOffline: 'The trailer streams from the internet. Connect to watch it.', premiumOneTime: 'One-time purchase, no subscription', premiumPaid: 'Premium is paid with real money', howToPlay: 'How to Play', howToDesc: 'A short guided match at the table', skip: 'Skip', cinemaAtHub: 'The cinema is on the Central Island', cinemaHint: 'Tap a piece to start playing · The cinema on the Central Island has the story and a how-to-play guide', pieceArrives: 'A new piece arrives at the museum', museumPieces: 'Museum pieces', piratesHere: 'Time Pirates hold this island — beat them for gems', piratesReturn: 'The pirates are regrouping · back in {t}', practiceNoGems: 'Practice match — gems return when the pirates land again', piratesFled: 'The pirates fled! The island is quiet for a few hours', pieceToMuseum: 'A piece of this island joins the Time Museum', hShort: 'h', mShort: 'm', fightPirates: 'Fight the pirates', practicePirates: 'Practice vs pirates', timePirates: 'Time Pirates', visitIsland: 'Visit island', anyOrder: 'Conquer in any order', world: 'World',
  tapToSpeed: 'Tap to speed up', map: 'Map', friend: 'Friend', home: 'Home', battle: 'Battle', boss: 'Boss', hubName: 'Central Island', conquered: 'Islands conquered', allConquered: 'All islands conquered!', unlockFullShort: 'Unlock the Premium Islands to continue to island 100',
  nextBuilding: 'Next building', moreIslands: 'islands to go', beatToConquer: 'Beat the bot to conquer this island', waitMove: 'One moment — a move is still playing…', lockedBeatPrev: 'Locked — beat the bot on island {n} first',
  battleVs: 'Battle vs', shopAtHub: 'The shop is on the Central Island — tap "Home"', islandConquered: 'Island conquered', regionComplete: 'Whole region conquered!', starMilestone: 'Stars collected:',
  worldMap: 'Island Map', myIsland: 'My island', nextIsland: 'Next island', travelBattle: 'Travel & battle', enterIsland: 'Enter', botRules: 'The bot still rules', zoomBackHint: 'Tap the board to bring it back to the best size for playing', museum: 'Time Museum', youAreHere: "You're here", stars: 'Stars', reward: 'Reward', rating: 'Rating', pet: 'Pet', conqueredMark: 'Conquered',
  lockedIsland: 'Locked', locked5: 'Premium Islands', firstTime: 'First conquest', replayReward: 'Repeat win', starsRule: 'Win = 1 star · 75%+ accuracy = 2 stars · 85%+ accuracy in under 40 moves = 3 stars',
  fullTitle: 'Premium Islands', fullBody: '30 new islands right next to the Central Island (100–129). Each has its own climate, board, monument and living scenery, plus extra-strong bots. One-time purchase, no subscription.', priceSoon: 'Price coming soon', unlockTest: 'Unlock (test)', fullOwned: 'Premium Islands unlocked', fullGame: 'Premium Islands', unlocked: 'Unlocked!',
  tryAgain: 'Try again', toMap: 'Map', album: 'Album', albumTitle: 'Bot Album', defeated: 'Defeated', notMet: 'Not met yet', albumNote: 'Conquer a whole region to earn a treasure chest.',
  onDevice: 'On this device', onlineFriend: 'Online with a friend', onlineDesc: 'Invite a friend with a private link or code. Only people you give the code to can join or watch — no strangers, no chat.', yourPieces: 'Your pieces', randomColor: 'Random', createInvite: 'Create invite', joinWithCode: 'Got a code? Join', codeLabel: 'Room code', connecting: 'Connecting…', waitingShort: 'Waiting…', waitingHint: 'Send your friend the link or the code. The game starts as soon as they join.', shareInvite: 'Share invite', linkCopied: 'Link copied!', codeCopied: 'Code copied!', inviteWatchers: 'Spectator link', watchLinkCopied: 'Spectator link copied', inviteText: 'Play chess against me in Chess of Ages! Room code: {code}', watchText: 'Come watch my chess game in Chess of Ages! Code: {code}', friendJoined: '{name} joined — the game begins!', friendLeft: 'Your friend disconnected', friendBack: 'Your friend is back', friendOnline: 'Online', friendOffline: 'Offline', friendTurn: "Friend's turn", turnOf: 'Turn:', roomGone: "This room doesn't exist or was closed.", roomFullWatch: 'Two players are already in this room. Want to watch the game?', watchGame: 'Watch', watching: 'Watching', spectatorsN: '{n} watching', spectatorJoined: 'Someone started watching', leaveOnline: 'Leave the online game?', leaveOnlineResign: 'Leaving mid-game counts as a resignation.', leave: 'Leave', leaveRoom: 'Leave room', drawOfferedBy: '{name} offers a draw', drawSent: 'Draw offer sent', confirmDrawOnline: 'Offer your friend a draw?', rematchSent: 'Waiting for your friend to accept the rematch…', rematchAsked: '{name} wants a rematch!', newOnlineGame: 'New game — colors switched', noHintsOnline: 'Hints are off in online games', friendlyMatch: 'Friendly match — no gems, just glory', roomClosed: 'The room was closed', backToRoom: 'Back in your online game', resyncing: 'Syncing the board…', onlineError: "Can't reach online play right now. Check your internet and try again.", badCode: 'Invalid code — 6 letters and numbers', cancelRoom: 'Cancel', onlineNotice2: 'Online play runs on Google Firebase (servers in Europe). Only your chosen name, your avatar and pet look, and your moves are sent to the room — visible only to people who have the code (your friend and spectators). No free chat, no strangers in a room for a friend, and the room is deleted when the game ends. Sign-in is anonymous — no email, no password.', friendTitle: 'Play a friend', friendDesc: 'Two players on one device — the camera flips after every move.', friendSoon: '', startGame: 'Start game',
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
  rematchOffered: 'Opponent wants a rematch', disconnected: 'Connection lost', confirmResign: 'Resign this game?', confirmRestart: 'Start a new game?', confirmNew: 'Start a new game? The current game will end.',
  onlineNotice: 'Online play connects you directly to another player (WebRTC) through the PeerJS signaling server and, when needed, a STUN/TURN relay. Your IP address is visible to these servers and to your opponent for the connection, and your display name, symbol, avatar and kingdom look are sent to your opponent. We do not store your games on a server.', understood: 'Got it, continue',
  connError: "Can't connect right now. Check your internet and try again.", roomNotFound: 'Room not found or already full',
  emotes: 'Emotes', hint: 'Hint', hintCost: 'Hint · 30 gems', notEnoughGems: 'Not enough gems',
  brilliant: 'Brilliant!!', best: 'Great move!', inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder!',
  summary: 'Game summary', accuracy: 'Accuracy', keyMoments: 'Key moments', replay: 'Replay', yourAccuracy: 'Your accuracy', oppAccuracy: 'Opponent accuracy',
  gemsEarned: 'Gems earned', achievements: 'Achievements', achievementUnlocked: 'Achievement unlocked!', profile: 'Profile', name: 'Name', avatar: 'Emblem',
  settings: 'Settings', language: 'Language', quality: 'Graphics', auto: 'Auto', high: 'High', low: 'Low', privacy: 'Privacy & data',
  deleteData: 'Delete all my data', confirmDelete: 'Delete all progress, gems, items and pets on this device, and the online rooms you created? Your language choice stays. This cannot be undone.',
  privacyText: 'No cookies, analytics or tracking. Your progress, gems and settings are stored only on this device. Online play is optional, and it sends only your display name from the list, avatar look and moves through Google Firebase. With a friend, only people with your room code can see them. In the Arena of Ages your opponent sees them, and while you wait for one, everyone in the Arena sees your name, symbol and island. The Google Play version also has opt-in ads: only when you tap the dolphin and choose to watch, Google AdMob shows an ad and receives technical information from your device (details in the privacy policy).',
  share: 'Share', shareText: 'Check out my Time Museum in Chess of Ages: Island Realms!', saveImage: 'Save image',
  tutorial: 'Tutorial', skip: 'Skip', nextStep: 'Next', finish: 'Finish',
  tut1: 'Welcome to Chess of Ages! 99 islands await — beat the bot on each island to conquer it. The first one is sitting across from you.', tut2: 'Tap a white pawn to select it. Green squares are legal moves.', tut3: 'Now tap a green square to move the piece.', tut4: 'Great! Drag outside the board to rotate the camera, pinch to zoom.', tut5: 'The Shop has avatar outfits, pets, new islands and a daily gift.', tut6: 'Good luck, Your Majesty! Win to conquer your first island — then open the map.',
  dailyGift: 'Daily gift', dailyTitle: 'Daily Gift', day: 'Day', claim: 'Claim', claimed: 'Claimed', comeBack: 'Come back tomorrow for the next reward', streakBroken: 'Your streak restarted',
  royalChest: 'Royal Treasure Chest', trial24: '24-hour trial',
  shopTitle: 'Shop', shopCrowns: 'Crowns', shopRobes: 'Robes', shopWeapons: 'Weapons', shopAuras: 'Auras', shopBoards: 'Boards', shopPets: 'Pets', shopGifts: 'Gifts', giftCollected: 'You got {n} gems · day {d} of 7 in a row', nextGiftIn: 'Next gift in {t} · day {d} of your streak', giftWaiting: 'A gift bubble is waiting above the Gift House', shopPremium: 'Premium', petStage1: 'Baby', petStage2: 'Grown', petStage3: 'Legendary', petXp: 'XP', petEvolved: 'Your pet evolved!', petNowAdult: 'Your pet grew up!', petNowLegend: 'Your pet became legendary!', petMaxed: 'Legendary — the top stage', petGrowNote: 'Your companion pet gains XP in every battle: Baby → Grown (60) → Legendary (220).', shopSky: 'Sky Nest', tabSky: 'Flyers', skyNote: 'A free flying pet for every 10 islands you conquer. Tap the flyer circling above the city to open the Sky Nest.', skyPetUnlocked: 'A new flying pet joined you!', skyWaiting: 'waiting in the Sky Nest', tabWardrobe: 'Outfits', tabPets: 'Pets', tabEras: 'Islands', tabGems: 'Gems',
  tryOn: 'Preview', buyFor: 'Buy for ', equip: 'Equip', equipped: 'Equipped', owned: 'Owned', unlockAt: 'Unlocks at era', bundle: '5-era bundle', unlock: 'Unlock', visit: 'Visit',
  sandbox: 'Sandbox mode', devGems: '+500 free (testing)', sandboxCheckout: 'Simulated checkout — sandbox', sandboxNote: 'This is a test purchase. No money is charged.', confirmPurchase: 'Confirm (simulated)', purchased: 'Purchased!',
  trialLeft: 'Trial', hours: 'h', update: 'Updating… your game is saved', updateNative: 'A new app version is required', download: 'Download', updateNativeBody: 'Download the new version and install it over this one. Your progress is kept.', updateAvailable: 'A new update is ready!', updateAvailableBody: 'A new version of the game is ready', updateNow: 'Update now', later: 'Later', checkUpdates: 'Check for updates', muteAll: 'Mute / unmute all sound', checkingUpdates: 'Checking for updates…', downloadingUpdate: 'Update found — downloading…', updateError: 'Update failed — we will retry automatically', upToDate: 'You have the latest version', whatsNew: "What's new", updateLaterNote: 'Chose later? It installs automatically next time you open the game.',
  offline: 'No internet connection', copiedCode: 'Code copied', keyboardHelp: 'Keyboard: arrows move the cursor, Enter selects, Esc cancels',
  gameStarted: 'Game on — good luck!', opponentLeft: 'Your opponent left', youPlayWhite: 'You play White', youPlayBlack: 'You play Black',
  visitEra: 'Go to era', currentEra: 'Current era', stagesBuilt: 'Stages built', buyEraFirst: 'Unlock this era in the shop',
  gems: 'Gems', actions: 'Actions', bot: 'Bot', canvasLabel: '3D game board. Use the arrow keys and Enter to play.', previewLabel: '3D preview of your avatar and pet', dragRotate: 'Drag to rotate',
  privacyPolicy: 'Privacy policy', loadError: 'Something went wrong while loading. Please refresh the page.', bestValue: 'Best value', bonus: 'bonus', pricesNote: 'Sandbox prices are for illustration only. The store version shows the official Google Play price in your local currency.',
  premiumTag: 'Premium', dragonBonus: 'Bonus: the Golden Clockwork Dragon — hovers over the Central Island and joins you as a pet', premiumPoint1: '30 new islands next to the Central Island', premiumPoint2: 'Each with its own climate, board and living scenery', premiumPoint3: 'Strong bots, 3 new worlds and 3 new bosses',
  tabBoards: 'Boards', tabPremium: 'Premium', boardsNote: 'A free skin for every 20 islands you conquer. Skins change the board and the pieces.', islandBoard: 'Island board', earnSkinAt: 'Conquer {n} islands', skinUnlocked: 'New board skin unlocked!',
  boostTitle: 'Double gems for a week', boostBody: 'x2 gems for every win against bots and the Time Pirates, for 7 days. Each purchase adds another 7 days.', boostActive: 'Double gems active', boostLeft: '{t} left', daysShort: 'd', boostAdd: 'Add a week', buyReal: 'Buy', owned: 'Owned', gemsX2: 'x2 gems', premiumWorld: 'Premium world',
  // [i18n] start
  lngButtonLabel: 'Language / שפה: English — switch to Hebrew (עברית)', lngSwitched: 'Language: English',
  lngWorldSign: 'World {n} · {name}', lngGoldSign: 'Golden Isles · Premium',
  lngEm_crown: 'Crown', lngEm_shield: 'Shield', lngEm_swords: 'Swords', lngEm_star: 'Star', lngEm_castle: 'Castle', lngEm_fire: 'Fire', lngEm_gem: 'Gem', lngEm_rook: 'Rook', lngEm_knight: 'Knight',
  // [i18n] end
  // [play] start
  playSoon: 'Coming soon', playSoonAria: 'Coming soon:', playSoonBody: 'Purchases are coming soon through Google Play.',
  restorePurchases: 'Restore purchases', restoredN: 'Restored {n} purchases from Google Play', restored1: 'Restored 1 purchase from Google Play', restoreNone: 'No purchases to restore on this Google account',
  restoreFail: "Couldn't check your purchases. Check your internet connection and try again.", restoring: 'Checking purchases…',
  payPending: 'Payment pending. The item will be added automatically once the payment completes.', payFailed: "The purchase wasn't completed. You can try again.",
  payOffline: 'No internet connection. Connect and try again.', payUnavailable: 'Google Play billing is unavailable right now. Try again later.',
  payBusy: 'Another purchase is already in progress…', alreadyOwnedRestored: 'You already own this — it was restored at no charge.', storeRevoked: 'A purchase that was cancelled in Google Play was removed from the game.',
  playUpdateTitle: 'A new version is on Google Play', playUpdateBody: 'Update the app on Google Play to keep getting new content. Your progress is kept.', playOpenStore: 'Update on Google Play',
  playRoomNeedUpdate: 'This room was created with a newer version of the game. Update the game and try again.', playRoomFriendOld: 'Your friend is on an older version of the game. Ask them to update and send a new invite.',
  // [play] end
  // [legal] start
  lgSection: 'Legal & privacy', lgPrivacy: 'Privacy policy', lgTerms: 'Terms of use', lgAccessibility: 'Accessibility statement', lgLicenses: 'Open-source licenses',
  lgPayTest: 'Test-shop purchases never charge money.', lgPayPlay: 'Purchases are handled by Google Play, and we never see your payment details.',
  lgBuyNote: 'Optional purchases: you see the Google Play price and confirm before paying. Each item is bought once, and the gem booster adds 7 days per purchase.',
  lgBuyNoteTest: 'Test shop: buying here never charges money.', lgTermsLink: 'Terms & refunds', lgDeleting: 'Deleting your data…',
  lgRoomsFail: "The online server can't be reached right now, so the online rooms you created weren't deleted. Connect to the internet and try again, or delete only the data on this device.",
  lgDeviceOnly: 'Delete on this device only',
  // [legal] end
  // [qa] start
  qaRecTitle: 'Something went wrong', qaRecErrors: 'The game ran into a problem it could not recover from. Your progress is saved on this device.',
  qaRecStall: 'The game stopped responding. Your progress is saved on this device.', qaRecBoot: 'The game could not start. Reloading usually fixes this.',
  qaRecGfxTitle: 'Graphics were interrupted', qaRecGfx: 'Your device paused the 3D graphics (this can happen when memory runs low). Reloading brings them back, and your progress is saved.',
  qaRecReload: 'Reload', qaRecClose: 'Keep playing',
  // [arena] start
  arenaTab: 'Online', arenaHud: 'Arena of Ages · friendly match', arenaTitle: 'Arena of Ages', arenaDesc: 'Play now against players who are waiting for an opponent. Every game is on a different, randomly chosen island.',
  arenaSafe: 'No chat: only names from the fixed list and fixed reactions. You can block a player. Arena games are friendly, with no gems.',
  arenaQuick: 'Quick match', arenaOpen: 'Open a room and wait', arenaRooms: 'Open rooms', arenaJoin: 'Join',
  arenaEmpty: 'No open rooms right now. Open one, and everyone who enters the Arena will see it.', arenaLoading: 'Loading rooms…',
  arenaListError: "Can't reach the Arena right now. Check your internet and try again.", arenaListBusy: "The server is full right now. As soon as a spot frees up, the rooms will show up here.", serverFullTitle: 'The server is full', serverFullBody: "Too many players are connected right now. As soon as a spot frees up, you'll get in automatically.", serverFullTip: 'You can keep this open, or cancel and play the bot meanwhile.', onlineBusy: "The online server is busy or not responding right now. Try again in a few minutes.", arenaWaitingFor: 'waiting {t}', arenaJustNow: 'just now',
  arenaSearching: 'Looking for an opponent…', arenaWaitTitle: 'Waiting for an opponent…', arenaWaitHint: 'Your room is in the Arena, on {isl}. The game starts as soon as someone joins.',
  arenaWaitTip: "You can hide this and look around the island meanwhile. We'll let you know when someone joins.", arenaHide: 'Hide',
  arenaTaken: 'Someone got to that room first. Try another room or Quick match.', arenaJoined: '{name} joined. The battle begins!', arenaFound: 'Opponent found: {name}. Good luck!',
  arenaRival: 'Rival', arenaRivalTurn: "Rival's turn", arenaRivalLeft: 'Your rival disconnected', arenaRivalBack: 'Your rival is back',
  arenaBlock: 'Block this player', arenaBlockQ: "Block {name}? You'll leave the game (mid-game this counts as resigning), and you won't be matched again in the Arena.",
  arenaBlocked: "Player blocked. You won't meet again in the Arena.", arenaBlockedTried: 'A player you blocked tried to join, so we opened a new room for you.',
  arenaNotice: "In the Arena you play against people you don't know. The game runs on Google Firebase (servers in Europe), and only your name from the list, your emblem, your avatar and pet look, and your moves are sent. While you wait for an opponent, your room (name, emblem and island) is shown to everyone who enters the Arena, until someone joins. There is no chat and no free text, and you can block a player. Sign-in is anonymous, with no email and no password.",
  // [arena] end
  // [ads] start
  adTitle: 'Ad', adOfferMain: 'Watch a short ad to the end and get {n} gems.', adOfferRule: "You can skip or close it at any time; you just won't get the gems.",
  adOfferLimits: 'Once every {m} minutes · up to {cap} a day · left today: {left}', adOfferBy: 'The ad is shown by Google AdMob.', adPrivacyLink: 'Privacy', adBonus: 'Bonus',
  adWatch: 'Watch the ad', adNotNow: 'Not now', adLoading: 'Loading the ad…', adThanks: '+{n} gems. Thanks for watching!',
  adEarly: 'The ad closed before the end, so no gems this time.', adNoFill: 'No ad is available right now. Try again in a few minutes.', adOffline: 'You need an internet connection to watch an ad.',
  adWait: 'The dolphin is resting. Next ad in {t}.', adDone: "The dolphin is done for today. More gems tomorrow.", adNoConsent: "Ads can't be shown without consent. You can change this in Settings → Ads.",
  adChoiceTitle: 'Ads and privacy',
  adChoiceBody: "To show an ad, Google AdMob receives technical information from your device: the device's advertising ID, your IP address (which gives a rough location), device and app details, and how you watched the ad. It is used to show the ad, to measure it and to prevent fraud.",
  adChoiceQ: 'Personalized ads also use this information to pick ads based on your interests. Which do you prefer?',
  adChoiceNpa: 'General ads', adChoicePers: 'Personalized ads', adChoiceNote: 'You can change this anytime in Settings → Ads.',
  adChoiceNote2: "General: no interest-based targeting. You can delete or reset your advertising ID in Android settings (Google → Ads).",
  adSettings: 'Ads', adSettingsText: "Watching an ad at the dolphin in the water is always your choice, and gives you {n} gems. Ads are shown by Google AdMob.",
  adPersonal: 'Personalized ads', adPrivacyOptions: 'Ad privacy options',
  adFakeTitle: 'Sample ad', adFakeLeft: 'The reward comes when the countdown ends', adFakeDone: 'Watched to the end. You can close it.', adFakeConsent: 'Google consent form (test)',
  gemsNote: 'Gems are earned by winning and from the daily gift.', gemsNoteAds: 'Gems are earned by winning, from the daily gift and at the dolphin in the water.',
  // [ads] end
  // [qa] end
};

export const PET_EN = { wolf_cub: 'Primal Wolf Cub', royal_owl: 'Imperial Owl', armor_steed: 'Knight Pony', fire_dragon: 'Royal Fire Dragon', golden_phoenix: 'Golden Phoenix', cyber_fox: 'Holo Cyber Fox', mythic_griffin: 'Mythic Griffin', crystal_unicorn: 'Crystal Unicorn', clockwork_dragon: 'Golden Clockwork Dragon',
  sky_parrot: 'Tropical Parrot', sky_raven: 'Storm Raven', sky_eagle: 'Golden Eagle', sky_bat: 'Moon Bat', sky_pegasus: 'Pegasus', sky_ice_dragon: 'Frost Dragon', sky_wyvern: 'Jade Wyvern', sky_butterfly: 'Rainbow Butterfly', sky_star_phoenix: 'Star Phoenix', sky_thunder_dragon: 'Thunder Dragon', sky_crystal_griffin: 'Crystal Griffin', sky_whale: 'Sky Whale' };
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
  wolf_cub: ['גור זאבים', 'Wolf Cub'], royal_owl: ['ינשוף מלכותי', 'Royal Owl'], armor_steed: ['סוסון אביר', 'Knight Pony'], fire_dragon: ['דרקון אש', 'Fire Dragon'], golden_phoenix: ['עוף החול', 'Phoenix'], cyber_fox: ['שועל סייבר', 'Cyber Fox'], mythic_griffin: ['גריפון', 'Griffin'], crystal_unicorn: ['חד-קרן', 'Unicorn'], clockwork_dragon: ['דרקון שעונים', 'Clockwork Dragon'],
  sky_parrot: ['תוכי טרופי', 'Parrot'], sky_raven: ['עורב הסערה', 'Storm Raven'], sky_eagle: ['נשר הזהב', 'Golden Eagle'], sky_bat: ['עטלף הירח', 'Moon Bat'], sky_pegasus: ['פגסוס', 'Pegasus'], sky_ice_dragon: ['דרקון הכפור', 'Frost Dragon'],
  sky_wyvern: ['ווירן הירקן', 'Jade Wyvern'], sky_butterfly: ['פרפר הקשת', 'Rainbow Butterfly'], sky_star_phoenix: ['עוף הכוכבים', 'Star Phoenix'], sky_thunder_dragon: ['דרקון הברקים', 'Thunder Dragon'], sky_crystal_griffin: ['גריפון קריסטל', 'Crystal Griffin'], sky_whale: ['לווייתן השמיים', 'Sky Whale'],
};
/** שמות קצרים לאיים (עידנים) */
export const ISLAND_SHORT = { 1: ['עידן האבן', 'Stone Age'], 2: ['האימפריה', 'Empire'], 3: ['ימי הביניים', 'Medieval'], 4: ['התעשייה', 'Industrial'], 5: ['סייבר', 'Cyber'], 6: ['סמוראים', 'Samurai'], 7: ['פרעונים', 'Pharaohs'], 8: ['ולהאלה', 'Valhalla'], 9: ['אטלנטיס', 'Atlantis'], 10: ['השמיים', 'Celestial'], 11: ['ממלכות הפלא', 'Wonder Realms'], 12: ['ממלכות החלום', 'Dream Realms'], 13: ['ממלכות הזניט', 'Zenith Realms'] };
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
