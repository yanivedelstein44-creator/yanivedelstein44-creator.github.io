# MegaGlest Mobile — Android (APK)

עטיפת Capacitor לאנדרואיד של המשחק שבתיקייה `../megaglest-mobile`.

- **עדכון משחק רגיל (לוגיקה/ממשק):** מעלים `index.html` חדש עם `APP_VERSION` גבוה יותר ומעדכנים `version.json`. האפליקציה בודקת את
  `https://yanivedelstein44-creator.github.io/megaglest-mobile/version.json`, מציגה "עדכון זמין" ומאפשרת "עדכון מהיר" (מוריד את index.html החדש לתוך האפליקציה) או "הורד APK חדש".
- **APK חדש** (שינוי בנכסים/מודלים/סאונד או נייטיב): שינוי כלשהו בתיקייה הזו (או הפעלה ידנית) מריץ את `.github/workflows/megaglest-apk.yml`, שבונה APK לא חתום לענף `megaglest-apk`. חותמים במפתח הקבוע (`megaglest-mobile.keystore`, לא בריפו) ומעלים ל-`megaglest-mobile/download/megaglest-mobile.apk`.
