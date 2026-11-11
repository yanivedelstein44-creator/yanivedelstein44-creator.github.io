# הנחיות לקלוד – DuoPilot

אפליקציית אנדרואיד (Kotlin, בלי AndroidX ובלי ספריות צד שלישי) שפותחת שתי אפליקציות במסך מפוצל (למעלה/למטה), זוכרת את הצמד, את גודל החלוקה ואת מיקום הגלילה, כוללת דפדפן מובנה, עוזר קולי AI (Claude API) שקורא את המסך ולוחץ, חיבור לאנדרואיד אוטו ועדכונים אוטומטיים. המשתמש (יניב) מדבר עברית; כל הממשק וההודעות בעברית.

## כללים שאסור לשבור
1. **חתימה:** תמיד המפתח הקבוע `keystore/duopilot.p12` (PKCS12, alias `duopilot`). אסור ליצור מפתח חדש – זה ישבור את העדכונים האוטומטיים (אנדרואיד מסרב להתקין מעל גרסה חתומה במפתח אחר).
   - הקובץ בריפו מוצפן (AES-256, סיסמה אקראית של 32 תווים) ובלי הסיסמה אין בו תועלת. **הסיסמה לעולם לא נכנסת לריפו, ל-commit או ללוג.**
   - הסיסמה נמצאת ב-GitHub Secret בשם `DUOPILOT_KS_PASS` (בריפו האתר), ועותק גיבוי של המפתח והסיסמה אצל יניב ב-Google Drive בקובץ "DuoPilot – מפתח חתימה (לא למחוק).txt".
2. **פרטיות:** תוכן מסך נשלח ל-Claude רק בזמן פקודה של המשתמש. זיכרון גלילה וצמדים – רק בטלפון.
3. **בטיחות העוזר:** לפני שליחה/תשלום/מחיקה/שיחה – תמיד `ask_user` (ראה `agent/Agent.kt`, הכלל 6 בהנחיית המערכת).
4. **בלי תלויות חדשות** בזמן ריצה, אלא אם המשתמש ביקש.
5. הבדיקות המקומיות: אפשר לקמפל עם kotlinc מול android.jar (אין Gradle/Maven בסביבה של קלוד – הבנייה האמיתית ב-GitHub Actions).

## בכל גרסה חדשה
1. להעלות `versionCode` ב-1 ב-`version.properties` ולעדכן `versionName`.
2. לכתוב בעברית ב-`release-notes.txt` מה חדש (משפט-שניים; מוצג בהתראה אחרי העדכון).
3. לדחוף ל-`main` → `.github/workflows/duopilot-apk.yml` בונה APK לא חתום לענף `duopilot-build`
   (`DuoPilot-unsigned.apk`, `apksigner.jar`, `build.log`, `errors.txt`, `STATUS.txt`).
   עם `[emu]` בהודעת ה-commit רצה גם בדיקה על אמולטור (`ci/emulator-test.sh`), והתוצאות (צילומי מסך, `split-log.txt`, `logcat.txt`) בענף `duopilot-emulator`.
4. החתימה והפרסום אוטומטיים: כשה-Secret קיים ו-`versionCode` חדש יותר ממה שב-`duopilot/version.json`, ה-workflow חותם, מעדכן את `duopilot/` ב-main ומבקש בנייה של האתר.
   בלי ה-Secret (או ידנית): `bash duopilot-src/ci/sign-and-publish.sh <קלון של duopilot-build>` עם `DUOPILOT_KS` ו-`DUOPILOT_KS_PASS` (הסיסמה מקובץ ה-Drive), ואז לדחוף את `duopilot/` ל-main.
   האפליקציה בודקת את `https://yanivedelstein44-creator.github.io/duopilot/version.json` כל 6 שעות, מורידה, בודקת SHA-256 וחתימה, ומתקינה לבד (לא באמצע פקודה ולא כשמחובר לרכב).

## מבנה
- `service/PilotService` – שירות הנגישות: חלונות, מחוות, בועת המיקרופון (`Overlays`), הפעלת העוזר, פקודות בדיקה (`DebugHooks`, רק ב-debug).
- `pairs/` – צמדים (`Pairs.kt`), רשימת אפליקציות וחיפוש לפי שם (`AppCatalog`), פתיחת מסך מפוצל (`PairLauncher`):
  - שיטה "toggle" – פעולת הנגישות GLOBAL_ACTION_TOGGLE_SPLIT_SCREEN + FLAG_ACTIVITY_LAUNCH_ADJACENT (בפיקסל עם אנדרואיד 14 המערכת מתעלמת ממנה).
  - שיטה "recents" – מסך האחרונות ← אייקון הכרטיס ← "מסך מפוצל" ← הכרטיס של השנייה (`RecentsUi`). נבדק ועובד באמולטור פיקסל API 34. בסמסונג עוד לא נבדק – המילים "מפוצל"/"split" אמורות לתפוס את "פתח בתצוגת מסך מפוצל".
  - השיטה שעבדה נשמרת ב-`Prefs.splitMethod`.
  - `SplitTracker` – שומר ומחזיר את מיקום הקו המפריד (גרירה במחווה).
- `scroll/ScrollMemory` – זיכרון גלילה לאפליקציות אחרות לפי "עוגן" (טקסט הפריט הראשון), רק לאפליקציות שבצמדים.
- `browser/BrowserActivity` (+`BrowserActivityB`) – דפדפן WebView עם מיקום גלילה לכל כתובת; `snapshotPage` קורא את הדף ב-JavaScript בשביל העוזר (WebView לא תמיד חושף את הדף לנגישות).
- `agent/` – `ScreenReader` (רשימת רכיבים + צילום מסך), `Actions` (לחיצה/הקלדה/גלילה), `ClaudeClient` (Messages API, `anthropic-version: 2023-06-01`), `Agent.kt` (לולאת צעדים, הנחיית מערכת, 16 כלים, `PhoneUi`/`CarUi`).
- `car/CarBridge` – אנדרואיד אוטו: התראת MessagingStyle עם פעולת תשובה (RemoteInput) וסימון כנקרא; זיהוי חיבור דרך `content://androidx.car.app.connection`.
- `voice/VoiceIO` – SpeechRecognizer + TextToSpeech. "מיקרופון חלופי" = הקלטה מתוך `ui/VoiceEntryActivity`.
- `ui/` – `MainActivity` (כל ההגדרות, בלי XML), `AppPicker`, `Shortcuts` (קיצורי צמד במסך הבית), `PairLaunchActivity`.
- `update/Updater` – עדכון עצמי דרך PackageInstaller.
