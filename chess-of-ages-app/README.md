# Chess of Ages — Android (APK)

עטיפת Capacitor לאנדרואיד של המשחק שבתיקייה `../chess-of-ages`.

- **עדכון משחק רגיל:** מחליפים את התוכן של `chess-of-ages/` בבנייה חדשה (עם `version.json` חדש). האפליקציה בודקת את `https://yanivedelstein44-creator.github.io/chess-of-ages/version.json`, מורידה את החבילה ברקע ומציגה "יש עדכון חדש" עם "עדכן עכשיו" / "אחר כך". לא צריך APK חדש.
- **APK חדש** (רק לשינויים נייטיב): שינוי כלשהו בתיקייה הזו מפעיל את `.github/workflows/chess-of-ages-apk.yml`, שבונה APK לא חתום לענף `chess-of-ages-apk`. החתימה נעשית במפתח הקבוע של האפליקציה (לא נשמר בריפו), והקובץ החתום עולה ל-`chess-of-ages/download/chess-of-ages.apk`.

## גרסת Google Play (ערוץ נפרד)

שתי גרסאות מאותו קוד:

| | APK מהאתר (בטא) | Google Play |
|---|---|---|
| מזהה חבילה | `com.chessofages.kingdombuilder` | `com.chessofages.islandrealms` |
| חתימה | המפתח הקבוע של ה-APK | Play App Signing (מפתח של Google) + מפתח העלאה |
| עדכוני OTA | `chess-of-ages/version.json` | `chess-of-ages-play/version.json` |
| עדכון נייטיב | הורדת APK מהאתר | רק דרך Google Play |
| קניות בכסף | קופת בדיקה | רק Google Play Billing (עד החיבור: "בקרוב") |

- **קידום גרסה ל-Play:** אחרי `scripts/publish-site.sh` ובדיקה בטלפון — `scripts/publish-play.sh`. הוא בונה את אותה גרסה עם `VITE_STORE=play` ומעתיק ל-`chess-of-ages-play/` רק את `version.json` ואת החבילה. שחקני Play מקבלים אותה כעדכון OTA.
- **AAB חדש** (העלאה ראשונה ושינויים נייטיב): הפעלה ידנית של `.github/workflows/chess-of-ages-aab.yml` (הקובץ `chess-of-ages-aab.yml` כאן), שמריץ את `build-aab.sh` על החבילה שבערוץ Play ודוחף AAB לא חתום לענף `chess-of-ages-aab`. חתימה מקומית במפתח ההעלאה: `sign-aab.sh` (המפתח נוצר פעם אחת ב-`make-upload-key.sh`, מחוץ לריפו). את ה-AAB החתום מעלים ל-Play Console.
- **מעבר ל-Cloudflare Pages בעתיד** (אם התעבורה מתקרבת ל-100 GB בחודש): מגדירים `PLAY_UPDATE_BASE`/`VITE_UPDATE_BASE` לכתובת החדשה ומקדמים פעם אחת לערוץ הישן — האפליקציות עוברות לכתובת החדשה בעדכון OTA רגיל, בלי AAB חדש.
