# Chess of Ages — Android (APK)

עטיפת Capacitor לאנדרואיד של המשחק שבתיקייה `../chess-of-ages`.

- **עדכון משחק רגיל:** מחליפים את התוכן של `chess-of-ages/` בבנייה חדשה (עם `version.json` חדש). האפליקציה בודקת את `https://yanivedelstein44-creator.github.io/chess-of-ages/version.json`, מורידה את החבילה ברקע ומציגה "יש עדכון חדש" עם "עדכן עכשיו" / "אחר כך". לא צריך APK חדש.
- **APK חדש** (רק לשינויים נייטיב): שינוי כלשהו בתיקייה הזו מפעיל את `.github/workflows/chess-of-ages-apk.yml`, שבונה APK לא חתום לענף `chess-of-ages-apk`. החתימה נעשית במפתח הקבוע של האפליקציה (לא נשמר בריפו), והקובץ החתום עולה ל-`chess-of-ages/download/chess-of-ages.apk`.
