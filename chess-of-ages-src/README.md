# שחמט העידנים: ממלכות האיים · Chess of Ages: Island Realms

שחמט תלת-ממדי למובייל בעולם פתוח של 99 איים. לכל אי עידן משלו (אקלים, תפאורה, מונומנט, בוט ולבוש), ואפשר לכבוש אותם בכל סדר.
PWA שעובד בדפדפן ונכנס למסך הבית, וגם אפליקציית Android (APK) דרך Capacitor. שתי הגרסאות **מתעדכנות לבד**.

- **מסע תלת-ממדי:** האווטאר רוכב על החיה מאי לאי (המעופפות עפות, החד-קרן על קשת, הזאב/הסוס/השועל על אבנים זוהרות). לכל אי דרך כניסה משלו: שער, טבעות אור, ריחוף נמוך, ספירלה, צלילה או גשר אור.
- **האי המרכזי (מוזיאון הזמן):** שולחן השחמט, החנות ובית הקולנוע. כל כיבוש שולח חלק פיזי מהאי (קרקע, מונומנט ומיקרו-אקלים) שמצטרף לפסיפס.
- **פיראטי הזמן:** אחרי הכיבוש האי נתפס על ידי פיראטים באותה רמת קושי. ניצחון עליהם = יהלומים; הם חוזרים אחרי 6 שעות. בלי התראות ובלי פלישות.
- **חנות:** בגדים, חיות, הבוטים שניצחת (גרים באי המרכזי ומשחקים נגדך) והצבעים הייחודיים של החיות שלהם. יהלומים מרוויחים רק במשחק.
- **בית הקולנוע:** סרט הסיפור (נבנה מהמשחק עצמו) וסרט הדרכה — רק למי שנכנס. אין הדרכה כפויה בכניסה.
- **מצבים:** נגד בוטים, ונגד חבר על אותו מכשיר. משחק מרחוק נגד חבר בהזמנה (Firebase) מתוכנן לעדכון הבא.
- **שפה:** אנגלית כברירת מחדל, עברית (RTL) בהגדרות.
- **רכישה:** איים 1–5 חינם; רכישה חד-פעמית פותחת את כל 99 (כרגע במצב בדיקה).

---

## התחלה מהירה

דרוש Node.js 22 ומעלה.

```bash
npm install
npm run dev          # שרת פיתוח. פתחו בטלפון את כתובת ה-Network שמודפסת (אותה רשת Wi-Fi)
npm run test:engine  # בדיקות מנוע השחמט (perft, טקטיקות, משחק עצמי)
npm run build        # בנייה ל-dist/
npm run preview      # הרצת הבנייה מקומית
```

העתיקו את `.env.example` ל-`.env` ומלאו את `VITE_PUBLIC_URL` (כתובת האתר שבו יתפרסם המשחק). בלי זה קישורי ההזמנה לוואטסאפ ועדכוני ה-APK לא יידעו לאן לפנות.

## פרסום האתר (ומשם — עדכון לכל השחקנים)

הדרך הקלה: GitHub + GitHub Actions. הקובץ `.github/workflows/release.yml` כבר מוכן.

1. צרו מאגר ב-GitHub והעלו אליו את הפרויקט (ענף `main`).
2. ב-GitHub: **Settings ← Pages ← Source: GitHub Actions**.
   (מאגר פרטי צריך מנוי בתשלום כדי להשתמש ב-Pages. אפשרות אחרת: Netlify, ראו בהמשך.)
3. כל `push` ל-`main` מריץ בדיקות, בונה ומפרסם. הכתובת תהיה `https://<USER>.github.io/<REPO>/`.

הגדרות לא חובה ב-**Settings ← Secrets and variables ← Actions**:

| סוג | שם | מה זה |
|---|---|---|
| Variable | `PUBLIC_URL` | כתובת אחרת לאתר (דומיין משלכם). ברירת מחדל: כתובת GitHub Pages |
| Variable | `DEPLOY_TARGET` | `netlify` כדי לפרסם ל-Netlify במקום Pages |
| Secret | `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` | נדרשים רק ל-Netlify |
| Variable | `PEER_HOST`, `PEER_PORT`, `PEER_PATH`, `PEER_SECURE`, `PEER_KEY` | שרת PeerJS משלכם (ראו "משחק אונליין") |
| Secret | `ICE_SERVERS` | שרתי STUN/TURN משלכם, כ-JSON |
| Secret | `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | חתימת APK קבועה (ראו "APK") |

ב-Netlify הקובץ `public/_headers` כבר מגדיר שקבצי העדכון (`sw.js`, `version.json`) לא יישמרו במטמון.

## איך העדכון האוטומטי עובד

כל build מייצר שלושה דברים ב-`dist/`:

- `sw.js` — Service Worker עם מזהה בנייה ייחודי ורשימת כל הקבצים (המשחק עובד גם בלי אינטרנט).
- `version.json` — גרסה, זמן בנייה, `minNative`, קישור לחבילת עדכון ו-`notes`.
- `update/bundle-<build>.zip` — כל המשחק בקובץ אחד, לעדכון אפליקציית ה-APK.

**בדפדפן / PWA:** המשחק בודק עדכון כל 20 דקות, כשחוזרים לאפליקציה אחרי 5 דקות ומעלה, וכשהאינטרנט חוזר. גרסה חדשה יורדת ברקע, ומותקנת **ברגע בטוח** — לא באמצע מהלך או אנימציה — עם הודעה קצרה וטעינה מחדש.

**ב-APK:** האפליקציה בודקת את `version.json` באתר (4 שניות אחרי פתיחה, כל 30 דקות, ובכל חזרה לאפליקציה). אם יש בנייה חדשה היא מורידה את ה-zip ומחליפה את המשחק ברגע בטוח (עדכון OTA דרך `@capgo/capacitor-updater`, בלי Google Play ובלי שרת של Capgo — הסטטיסטיקות כבויות).

**שינוי נייטיב** (פלאגין Capacitor חדש, הרשאה, אייקון): העלו את `"palace": { "minNativeVersion" }` ב-`package.json`. מכשיר עם APK ישן יותר יקבל הודעה עם כפתור להורדת ה-APK החדש במקום עדכון OTA.

### שחרור גרסה

```bash
RELEASE_NOTES="תיקונים ושיפורים" npm run release   # מעלה את הגרסה (patch) ובונה
git commit -am "v1.0.1" && git push                 # GitHub Actions מפרסם — וכולם מתעדכנים
```

## APK לאנדרואיד

**דרך GitHub Actions (מומלץ):** Actions ← Release ← Run workflow ← סמנו **Build APK**. אפשר גם לדחוף תגית `v1.2.0`. ה-APK מתפרסם ב-Releases בשם `chess-of-ages.apk`, והקישור `releases/latest/download/chess-of-ages.apk` תמיד מצביע לגרסה האחרונה.

**חתימה קבועה (חשוב):** בלי סודות חתימה נבנה APK בחתימת debug שמשתנה בכל בנייה — אז אי אפשר להתקין APK חדש מעל הישן בלי להסיר קודם. ליצירת מפתח פעם אחת:

```bash
keytool -genkeypair -v -keystore release.jks -alias chessofages -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 release.jks   # את הפלט שמים בסוד ANDROID_KEYSTORE_BASE64
```

שמרו את `release.jks` והסיסמאות במקום בטוח. בלי אותו מפתח לא תוכלו לעדכן את האפליקציה בעתיד.

**בנייה מקומית:** דרושים Android Studio ו-JDK 21.

```bash
npm run cap:add    # פעם ראשונה — יוצר את תיקיית android/
npm run cap:sync   # build + העתקה לפרויקט האנדרואיד
npm run cap:open   # פתיחה ב-Android Studio ← Build APK
```

שם האפליקציה ב-Android: "Chess of Ages", ובמכשיר בעברית "שחמט העידנים" (תהליך ה-Actions מוסיף את התרגום אוטומטית; בבנייה מקומית צריך להוסיף `res/values-iw/strings.xml` ידנית).

## משחק נגד חבר מרחוק (מתוכנן)

בעדכון הבא: חדרים פרטיים בהזמנה בלבד דרך Firebase Realtime Database, כולל צופים. לא יהיה משחק נגד זרים.
כשזה ייכנס צריך לעדכן גם את `public/privacy.html` (סעיף 3).

## רכישות (כרגע במצב בדיקה)

יש מוצר אחד בכסף אמיתי: פתיחת המשחק המלא (איים 6–99), `FULL_GAME` ב-`src/config/EconomyConfig.js` (המחיר ייקבע). יהלומים לא נמכרים בכסף.
החנות עובדת במצב Sandbox: קופה מדומה בלחיצה אחת, בלי חיוב.

לפני הפצה ב-Google Play עם רכישות אמיתיות:

1. מוצרים דיגיטליים באפליקציה שמופצת ב-Google Play צריכים לעבור דרך Google Play Billing (או RevenueCat שעוטף אותו).
2. חברו את ה-hook ב-`src/core/Economy.js`:
   ```js
   PaymentProvider.nativePurchase = async (pack) => { /* קנייה דרך Billing/RevenueCat */ return { ok: true, transactionId }; };
   PaymentProvider.priceLabel = (pack) => storePrices[pack.id]; // המחיר הרשמי במטבע המקומי, למשל "$2.49"
   ```
3. כבו את `sandboxTestMode` ב-`ECONOMY`.
4. מומלץ אימות קבלות בצד שרת (Google Play Developer API). כרגע היתרה נשמרת רק במכשיר.


## פרטיות, נגישות ו-Google Play

- `public/privacy.html` — מדיניות פרטיות והצהרת נגישות באנגלית ובעברית, נפתחת גם מתוך המשחק (הגדרות ← מדיניות פרטיות ונגישות). **לפני פרסום החליפו את `[OPERATOR NAME]`, `[CONTACT EMAIL]`, `[HOSTING PROVIDER]`.** את הכתובת `https://.../privacy.html` מזינים ב-Play Console.
- המשחק לא משתמש בעוגיות, אנליטיקה, פיקסלים או מזהי פרסום. הנתונים נשמרים ב-`localStorage` במכשיר בלבד, ויש כפתור "מחק את כל הנתונים שלי".
- טופס **Data safety** ב-Play Console: המידע היחיד שיוצא מהמכשיר הוא במשחק אונליין (כתובת IP לשרתי החיבור וליריב, וכינוי/אווטאר ליריב). בדקו את ההגדרות של Google לגבי מה נחשב "collected" / "shared" לפני שממלאים.
- סיכויי גלגל המזל ותיבת האוצר מוצגים במשחק לפני סיבוב (Google Play דורש זאת לפריטים אקראיים שנקנים).
- בדיקת נגישות אוטומטית (axe-core, WCAG 2.1 AA) עברה על המסך הראשי וכל החלונות בעברית ובאנגלית. החריגה היחידה: נעילת הזום ב-`<meta name="viewport">` (`user-scalable=no`), שהוגדרה במפרט כדי שהמחוות לא יגדילו את הדף. כדי לאפשר זום, מחקו את `maximum-scale=1, user-scalable=no` ב-`index.html`.

> זה לא ייעוץ משפטי. נקודות שדורשות בדיקה מפורטות בדוח הציות הנפרד.

## ההתקנה החיה שלך (נכון ל-6 בנובמבר 2026)

- **המשחק באתר:** https://yanivedelstein44-creator.github.io/chess-of-ages/ — מתוך הריפו `yanivedelstein44-creator.github.io`, בתיקייה `chess-of-ages/`.
- **קוד המקור:** באותו ריפו, בתיקייה `chess-of-ages-src/` (הקוד הזה). המפתח לחתימת APK לא שם.
- **הורדת ה-APK:** https://yanivedelstein44-creator.github.io/chess-of-ages/download/chess-of-ages.apk
- **עדכון לכל השחקנים** (אתר + APK, בלי APK חדש):
  ```bash
  npm run publish:site -- "" "מה חדש"     # מתוך chess-of-ages-src/ בריפו האתר (או נתיב אחר לריפו במקום "")
  ```
  הסקריפט מעלה גרסה, בונה עם כתובת האתר ודוחף. האפליקציה מציגה "יש עדכון חדש!" עם "עדכן עכשיו" / "אחר כך" (אחר כך = מותקן בפתיחה הבאה), ויש גם כפתור "בדוק עדכונים" בהגדרות.
- **APK חדש** (רק לשינוי נייטיב): עטיפת Capacitor נמצאת בריפו האתר ב-`chess-of-ages-app/` (עותק כאן ב-`android-wrapper/`). שינוי שם מפעיל את `chess-of-ages-apk.yml`, שבונה APK לא חתום לענף `chess-of-ages-apk` יחד עם `apksigner.jar` הרשמי. חותמים במפתח הקבוע:
  ```bash
  java -jar apksigner.jar sign --ks chess-of-ages-release.jks --ks-key-alias chessofages --out chess-of-ages.apk chess-of-ages-unsigned.apk
  ```
  ומעלים ל-`chess-of-ages/download/chess-of-ages.apk`. **המפתח לא נמצא בריפו** — שמור אותו אצלך; בלעדיו אי אפשר להתקין APK חדש מעל הקיים.
- **שליטה במצלמה:** אצבע אחת מזיזה את הלוח (עם גבולות, כך שהלוח לא בורח מהמסך), צביטה לזום, שתי אצבעות לסיבוב, "מרכז" מחזיר למבט המקורי.
- **Google Play בעתיד:** צריך קובץ AAB (`./gradlew bundleRelease`), חיבור Google Play Billing ל-`PaymentProvider`, וביטול הורדת ה-APK מתוך האפליקציה בגרסת החנות (עדכוני ה-OTA של קוד ה-web מותרים).

## מבנה הפרויקט

```
src/
  app/GameApp.js           מנהל המשחק: מצבים, תורות, סיום משחק, מסעות, מוזיאון ופיראטים
  config/Islands.js        99 האיים: בוטים, דירוג, פרסים ומחירי החנות
  config/IslandEras.js     98 העידנים: שם, אקלים ומונומנט לכל אי
  config/Pirates.js        צוותי פיראטי הזמן, פרסים וזמן חזרה
  config/BotLines.js       אישיויות ומשפטים של הבוטים והפיראטים
  game/Progression.js      כיבוש בכל סדר, פיראטים, כוכבים
  engine/                  מנוע שחמט (0x88, PVS, טבלת טרנספוזיציה) ב-Web Worker + ניתוח מהלכים
  scene/WorldMap.js        מפת העולם והמסע ברכיבה על החיה (6 דרכי כניסה)
  scene/Monuments.js       98 מונומנטים פרוצדורליים (2 קריאות ציור לכל אחד)
  scene/Climate.js         אקלים: פלטות ומזג אוויר חלקיקי, זוהר צפוני, ברקים, קרני אור מתחת למים
  scene/HubMuseum.js       האי המרכזי: קולנוע, חנות, פסיפס החלקים, מיקרו-אקלים ותושבים
  scene/eras/              10 ערכות העולמות סביב הלוח
  audio/SoundEngine.js     סאונד סינתטי
  core/                    כלכלה, שמירה מקומית, הישגים
  ui/                      ממשק, חנות, מפה, קולנוע (Cinema.js), לוגו (logo.js), תרגומים (i18n.js)
  update/Updater.js        עדכון אוטומטי — Service Worker בדפדפן, OTA ב-APK
public/                    מניפסטים, אייקונים, privacy.html
```

## התאמות מהירות

- זווית המצלמה במשחק: `GAMEPLAY_POLAR` ב-`src/scene/SceneManager.js` (כרגע 55°, לוח גדול).
- מחירים, פרסים וסיכויים: `src/config/EconomyConfig.js`.
- טקסטים ותרגומים: `src/ui/i18n.js` (כל מפתח בעברית ובאנגלית).
- מינימום מהלכים כדי שניצחון מול חבר ייתן יהלומים: `RULES.antiFarmPlies` ב-`src/config/AppConfig.js`.
- זמן החזרה של פיראטי הזמן: `PIRATE_RESPAWN_MS` ב-`src/config/Pirates.js`.
- עידן, אקלים ומונומנט של כל אי: `src/config/IslandEras.js`.
