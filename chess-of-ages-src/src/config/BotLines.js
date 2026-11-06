/**
 * אופי לבוטים: 6 אישיויות, ולכל אחת משפטים לפי אירוע (עברית / English).
 * אירועים: intro (פתיחה) · capture (הבוט אכל) · lost (הבוט איבד כלי) · check (הבוט נתן שח) · win (הבוט ניצח) · lose (הבוט הפסיד)
 */
export const PERSONALITIES = ['proud', 'friendly', 'grumpy', 'wise', 'joker', 'mystic'];

const L = {
  proud: {
    intro: [['האי הזה שלי. תנסה לקחת אותו.', 'This island is mine. Try and take it.'], ['אף אחד עוד לא עבר אותי.', 'No one has ever got past me.']],
    capture: [['עוד כלי לאוסף שלי.', 'Another piece for my collection.'], ['צפוי לגמרי.', 'Entirely predictable.']],
    lost: [['סתם הסחת דעת.', 'A mere distraction.'], ['תהנה מזה, זה לא יחזור.', "Enjoy it. It won't happen again."]],
    check: [['שח! תכרע.', 'Check! Kneel.'], ['המלך שלך רועד.', 'Your king trembles.']],
    win: [['כמו שאמרתי — האי שלי.', 'As I said — my island.'], ['חזור כשתתחזק.', 'Come back when you are stronger.']],
    lose: [['לא ייתכן…', 'Impossible…'], ['הפעם ניצחת. רק הפעם.', 'You win this time. Only this time.']],
  },
  friendly: {
    intro: [['ברוך הבא! בוא נשחק משחק טוב.', "Welcome! Let's have a good game."], ['איזה כיף שבאת לבקר!', 'So nice of you to visit!']],
    capture: [['אופס, סליחה!', 'Oops, sorry!'], ['זה היה חייב לקרות.', 'Had to be done.']],
    lost: [['מהלך יפה!', 'Nice move!'], ['וואו, לא ראיתי את זה.', "Wow, didn't see that coming."]],
    check: [['שח! זהירות.', 'Check! Careful now.'], ['שח — אבל אני בטוח שתסתדר.', "Check — you'll manage, I'm sure."]],
    win: [['משחק נהדר! עוד אחד?', 'Great game! Another one?'], ['היה כיף, תודה!', 'That was fun, thanks!']],
    lose: [['כל הכבוד! האי שלך.', 'Well played! The island is yours.'], ['מגיע לך — שיחקת מעולה.', 'You earned it — brilliant play.']],
  },
  grumpy: {
    intro: [['שוב מבקרים… נו, תזיז.', 'Visitors again… well, move.'], ['בוא נגמור עם זה מהר.', "Let's get this over with."]],
    capture: [['הא.', 'Hmph.'], ['מגיע לך.', 'Serves you right.']],
    lost: [['גרר… החדר קר מדי.', 'Grr… the room is too cold.'], ['זה לא נחשב.', "That doesn't count."]],
    check: [['שח. תתעורר.', 'Check. Wake up.'], ['אמרתי לך להיזהר.', 'Told you to be careful.']],
    win: [['סוף סוף שקט.', 'Finally, some quiet.'], ['לך הביתה.', 'Go home.']],
    lose: [['טוב, טוב… קח את האי.', 'Fine, fine… take the island.'], ['פעם הבאה אני מנצח.', 'Next time I win.']],
  },
  wise: {
    intro: [['כל מהלך הוא שיעור.', 'Every move is a lesson.'], ['הסבלנות מנצחת את הכוח.', 'Patience defeats strength.']],
    capture: [['כלי שלא מוגן — הולך.', 'An unguarded piece is a lost piece.'], ['זכור: מרכז הלוח חשוב.', 'Remember: the center matters.']],
    lost: [['למדתי משהו היום.', 'I learned something today.'], ['מהלך חכם.', 'A wise move.']],
    check: [['שח. מה תעשה עכשיו?', 'Check. What now?'], ['המלך הוא הלב של הצבא.', 'The king is the heart of the army.']],
    win: [['הניצחון של היום הוא השיעור שלך למחר.', "Today's loss is tomorrow's lesson."], ['תתאמן, ותחזור.', 'Practice, then return.']],
    lose: [['התלמיד עלה על המורה.', 'The student surpasses the teacher.'], ['ראוי לכיבוש.', 'Worthy of the conquest.']],
  },
  joker: {
    intro: [['מוכן להפסיד בסטייל?', 'Ready to lose in style?'], ['הכלים שלי אוהבים לרקוד!', 'My pieces love to dance!']],
    capture: [['יאמי! עוד אחד!', 'Yum! Another one!'], ['זה היה טעים.', 'Delicious.']],
    lost: [['היי! הוא היה החבר הכי טוב שלי!', 'Hey! That was my best friend!'], ['אאוץ׳, זה כאב.', 'Ouch, that stung.']],
    check: [['טוק-טוק! שח!', 'Knock knock! Check!'], ['המלך שלך צריך חופשה.', 'Your king needs a holiday.']],
    win: [['טה-דה!', 'Ta-da!'], ['מחיאות כפיים לי!', 'A round of applause for me!']],
    lose: [['טוב, זה לא היה בתסריט.', "Well, that wasn't in the script."], ['אני אגיד שנתתי לך לנצח.', "I'll tell everyone I let you win."]],
  },
  mystic: {
    intro: [['הכוכבים ניבאו את בואך.', 'The stars foretold your coming.'], ['הלוח כבר יודע את הסוף.', 'The board already knows the ending.']],
    capture: [['הגורל לוקח את שלו.', 'Fate claims its due.'], ['כפי שנכתב.', 'As it was written.']],
    lost: [['גם זה היה כתוב.', 'This too was written.'], ['הצללים זזים…', 'The shadows shift…']],
    check: [['שח. הסוף מתקרב.', 'Check. The end draws near.'], ['אני רואה את המלך שלך נופל.', 'I see your king falling.']],
    win: [['הנבואה התגשמה.', 'The prophecy is fulfilled.'], ['הכוכבים לא טועים.', 'The stars are never wrong.']],
    lose: [['הכוכבים… טעו?', 'The stars… were wrong?'], ['גורל חדש נכתב היום.', 'A new fate is written today.']],
  },
};

/** אישיות קבועה לכל אי */
export const personalityOf = (id) => PERSONALITIES[(id * 7 + 3) % PERSONALITIES.length];

/** משפט אקראי לאירוע: [עברית, English] */
export function botLine(id, event) {
  const set = L[personalityOf(id)]?.[event];
  if (!set) return null;
  return set[Math.floor(Math.random() * set.length)];
}

/** פיראטי הזמן — משפטים משלהם */
const PIRATE = {
  intro: [['האי הזה נתפס בשם פיראטי הזמן!', 'This island is claimed by the Time Pirates!'], ['השעון שלך נגמר, נווד.', 'Your clock is running out, traveler.'], ['באת להחזיר את האי? בהצלחה.', 'Come to take the island back? Good luck.']],
  capture: [['שלל!', 'Plunder!'], ['עוד כלי לתיבת האוצר.', 'Another piece for the treasure chest.']],
  lost: [['ארררר!', 'Arrr!'], ['זה רק שריטה.', "'Tis but a scratch."]],
  check: [['שח! תוריד את הדגל.', 'Check! Lower your flag.'], ['המלך שלך על הקרש!', 'Your king walks the plank!']],
  win: [['האי נשאר שלנו!', 'The island stays ours!'], ['חזור כשתלמד לשוט.', 'Come back when you can sail.']],
  lose: [['נסיגה! לספינות!', 'Retreat! To the ships!'], ['נחזור… הזמן בצד שלנו.', "We'll be back… time is on our side."]],
};
export function pirateLine(event) {
  const arr = PIRATE[event];
  return arr ? arr[Math.floor(Math.random() * arr.length)] : null;
}

