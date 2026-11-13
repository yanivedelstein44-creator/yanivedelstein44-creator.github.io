/**
 * שם התצוגה של השחקן — רק מרשימה קבועה (בלי טקסט חופשי), כדי ששום מידע אישי לא יגיע לשרת במשחק אונליין.
 * השם נבנה משני חלקים: תואר × כינוי ("אביר הזהב" / "Knight of Gold"), או ברירת המחדל "מלך 123" / "King 123"
 * (כל תואר + המספר של הפרופיל). בפרופיל נשמר מפתח שלא תלוי בשפה (nameKey, למשל 'knight:gold' או 'king:123'),
 * המספר של הפרופיל (nameNum — נשאר גם כשבוחרים כינוי), והשם עצמו (profile.name) בשפה הנוכחית — מתחלף יחד עם השפה.
 */

/** תוארים: [מזהה, עברית, עברית בסמיכות (לפני כינוי), אנגלית] */
export const NAME_TITLES = [
  ['king', 'מלך', 'מלך', 'King'],
  ['queen', 'מלכה', 'מלכת', 'Queen'],
  ['knight', 'אביר', 'אביר', 'Knight'],
  ['wizard', 'קוסם', 'קוסם', 'Wizard'],
  ['rook', 'צריח', 'צריח', 'Rook'],
  ['bishop', 'רץ', 'רץ', 'Bishop'],
  ['guard', 'שומר', 'שומר', 'Guard'],
  ['princess', 'נסיכה', 'נסיכת', 'Princess'],
  ['explorer', 'הרפתקן', 'הרפתקן', 'Explorer'],
  ['captain', 'קפטן', 'קפטן', 'Captain'],
];
/** כינויים: [מזהה, עברית, אנגלית] */
export const NAME_EPITHETS = [
  ['gold', 'הזהב', 'of Gold'],
  ['isles', 'האיים', 'of the Isles'],
  ['time', 'הזמן', 'of Time'],
  ['sea', 'הים', 'of the Sea'],
  ['stars', 'הכוכבים', 'of the Stars'],
  ['fire', 'האש', 'of Fire'],
  ['ice', 'הקרח', 'of Ice'],
  ['wind', 'הרוח', 'of the Wind'],
];

const TITLE = Object.fromEntries(NAME_TITLES.map((x) => [x[0], x]));
const EPITHET = Object.fromEntries(NAME_EPITHETS.map((x) => [x[0], x]));
const NUM = /^[1-9]\d{2}$/; // 100–999, כמו בשם ברירת המחדל
const DEFAULT_RE = /^(?:מלך|King) ([1-9]\d{2})$/;

export const randomNameNumber = () => String(Math.floor(100 + Math.random() * 900));
export const defaultNameKey = (n = randomNameNumber()) => `king:${NUM.test(String(n)) ? n : randomNameNumber()}`;

/** { title, epithet, num } למפתח תקין, אחרת null */
export function parseNameKey(key) {
  const [title, rest, extra] = String(key || '').split(':');
  if (extra !== undefined || !TITLE[title]) return null;
  if (NUM.test(rest || '')) return { title, epithet: null, num: rest };
  if (EPITHET[rest]) return { title, epithet: rest, num: null };
  return null;
}

/** השם בשפה המבוקשת ('he' / 'en'). מפתח לא תקין → null */
export function renderNameKey(key, lang = 'en') {
  const k = parseNameKey(key);
  if (!k) return null;
  const he = lang === 'he';
  const [, heBase, heConstruct, en] = TITLE[k.title];
  if (k.num) return `${he ? heBase : en} ${k.num}`;
  const [, epHe, epEn] = EPITHET[k.epithet];
  return he ? `${heConstruct} ${epHe}` : `${en} ${epEn}`;
}

/** כל השמות האפשריים (בשתי השפות) — לזיהוי שם ישן שכבר היה אחד מהם */
function presetKeyOf(name) {
  const s = String(name || '').trim();
  for (const [t] of NAME_TITLES) {
    for (const [e] of NAME_EPITHETS) {
      const key = `${t}:${e}`;
      if (renderNameKey(key, 'he') === s || renderNameKey(key, 'en') === s) return key;
    }
  }
  return null;
}

/**
 * מעבר מהשם החופשי של הגרסאות הקודמות: "מלך 123" / "King 123" → אותו מספר; שם שכבר הוא אחד מהשמות המוכנים → נשאר;
 * כל שם אחר → ברירת המחדל "מלך NNN" (עם המספר שבשם, אם יש בו מספר של 3 ספרות — אחרת מספר חדש).
 */
export function nameKeyFromLegacy(name) {
  const s = String(name || '').trim();
  const d = DEFAULT_RE.exec(s);
  if (d) return defaultNameKey(d[1]);
  const preset = presetKeyOf(s);
  if (preset) return preset;
  const num = /(?:^|\D)([1-9]\d{2})(?!\d)/.exec(s);
  return defaultNameKey(num ? num[1] : undefined);
}

/** הפרופיל עם מפתח שם תקין, המספר שלו והשם בשפה המבוקשת (בלי לשנות את האובייקט שקיבלנו) */
export function withPresetName(profile = {}, lang = 'en') {
  const nameKey = parseNameKey(profile.nameKey) ? profile.nameKey : nameKeyFromLegacy(profile.name);
  const k = parseNameKey(nameKey);
  const nameNum = k.num || (NUM.test(String(profile.nameNum || '')) ? String(profile.nameNum) : randomNameNumber());
  return { ...profile, nameKey, nameNum, name: renderNameKey(nameKey, lang) };
}

/**
 * שם שהגיע מהשרת (של החבר או של צופה): מוצג רק אם הוא אחד מהשמות המוכנים, באחת השפות — ובשפה של המקבל.
 * כל טקסט אחר (גרסה ישנה או אפליקציה ששונתה) → null, והמסך מציג "חבר" / "צופה" במקום.
 */
export function localizeIncomingName(name, lang = 'en') {
  const s = String(name || '').trim();
  const d = /^(\S+) ([1-9]\d{2})$/.exec(s);
  if (d) {
    const title = NAME_TITLES.find((x) => x[1] === d[1] || x[3] === d[1]);
    return title ? renderNameKey(`${title[0]}:${d[2]}`, lang) : null;
  }
  const key = presetKeyOf(s);
  return key ? renderNameKey(key, lang) : null;
}

/** השם לשליחה לשרת: תמיד נבנה מהמפתח (גם אם profile.name שונה מסיבה כלשהי) — אף פעם לא טקסט חופשי */
export function presetName(profile, lang = 'en') {
  return renderNameKey(profile?.nameKey, lang) || renderNameKey(nameKeyFromLegacy(profile?.name), lang);
}
