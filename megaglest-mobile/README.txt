MegaGlest Mobile — גרסת HTML5 + Three.js למסכי מגע (Android)
=============================================================

מה בתיקייה
----------
index.html     המשחק כולו (מנוע, נתוני XML מחולצים, 6 מפות מקוריות, Three.js)
assets/        המודלים (G3D), הטקסטורות, האייקונים, הסאונדים והמוזיקה המקוריים של MegaGlest
version.json   קובץ גרסה למנגנון העדכון

חשוב: המשחק טוען את assets/ דרך fetch, לכן הוא חייב לרוץ משרת (http/https) או מתוך עטיפת APK
שמגישה את הקבצים (Capacitor מגיש מ-http://localhost). פתיחה ישירה כ-file:// לא תטען את הנכסים.

דרך 1 — APK עם Capacitor (מומלץ, עובד גם בלי אינטרנט)
------------------------------------------------------
  npm init -y
  npm i @capacitor/core @capacitor/cli @capacitor/android
  npx cap init "MegaGlest Mobile" com.edtrending.megaglest --web-dir=www
  (העתק את index.html, assets/, version.json לתוך www/)
  npx cap add android
  npx cap copy
  npx cap open android   → ב-Android Studio: Build > Build APK
  ב-AndroidManifest הוסף android:screenOrientation="landscape" ל-activity.

דרך 2 — אתר (GitHub Pages / Netlify) + WebIntoApp
-------------------------------------------------
העלה את התיקייה כאתר, ואז עטוף את ה-URL ב-WebIntoApp. במצב זה האפליקציה דורשת אינטרנט,
אבל כל עדכון שתעלה לאתר מגיע מיד למשחק.

מנגנון עדכונים
--------------
בתפריט → "הגדרות נוספות" → "כתובת version.json" (למשל https://USER.github.io/megaglest-mobile/version.json).
תוכן הקובץ:
  {"version":"1.0.1","apkUrl":"https://.../megaglest.apk","htmlUrl":"https://.../index.html","notes":"מה חדש"}
בכל הפעלה (אם יש אינטרנט) וגם בלחיצה על "בדוק עדכונים" המשחק משווה את הגרסה:
  - "טען גרסה חדשה" (כשהמשחק רץ מאתר)
  - "הורד APK חדש" (apkUrl)
  - "עדכון מהיר" — מוריד את index.html החדש ושומר אותו מקומית (htmlUrl); אם הגרסה החדשה קורסת בהפעלה
    הראשונה היא נזרקת אוטומטית וחוזרים לגרסה המובנית.
כדי לשחרר גרסה: העלה index.html חדש עם APP_VERSION גבוה יותר (בראש הקוד) ועדכן את version.json.

רישיון
------
MegaGlest: קוד GPL-2.0, נכסים (מודלים/טקסטורות/סאונד) CC-BY-SA 3.0 — https://megaglest.org
