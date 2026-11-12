#!/usr/bin/env bash
# חותם את ה-AAB של גרסת Play במפתח ההעלאה (upload key) — רץ מקומית, לא ב-CI ולא בריפו.
# Google Play מאמתת לפי המפתח הזה שההעלאה ממך, וחותמת בעצמה את מה שמגיע למשתמשים (Play App Signing).
# שימוש:  sign-aab.sh chess-of-ages-play-unsigned.aab [פלט.aab]
# מפתח וסיסמה (מחוץ לריפו!): UPLOAD_KEYSTORE (ברירת מחדל /home/claude/keys/chess-of-ages-play-upload.jks),
#                              UPLOAD_PASS_FILE (ברירת מחדל /home/claude/keys/chess-of-ages-play-upload-password.txt),
#                              UPLOAD_ALIAS (ברירת מחדל upload). יצירת המפתח בפעם הראשונה: make-upload-key.sh
set -euo pipefail
IN="${1:?נתיב ל-AAB לא חתום}"
OUT="${2:-${IN%-unsigned.aab}.aab}"
[ "$OUT" != "$IN" ] || OUT="${IN%.aab}-signed.aab"
KS="${UPLOAD_KEYSTORE:-/home/claude/keys/chess-of-ages-play-upload.jks}"
PASS_FILE="${UPLOAD_PASS_FILE:-/home/claude/keys/chess-of-ages-play-upload-password.txt}"
ALIAS="${UPLOAD_ALIAS:-upload}"
[ -f "$KS" ] || { echo "אין מפתח העלאה ב-$KS (יוצרים עם make-upload-key.sh)"; exit 1; }
[ -f "$PASS_FILE" ] || { echo "אין קובץ סיסמה ב-$PASS_FILE"; exit 1; }
cp "$IN" "$OUT"
# הסיסמה נקראת מקובץ (לא משורת הפקודה), כך שהיא לא נשמרת בהיסטוריה ולא נראית ברשימת התהליכים
jarsigner -keystore "$KS" -storepass:file "$PASS_FILE" -keypass:file "$PASS_FILE" \
  -sigalg SHA256withRSA -digestalg SHA-256 "$OUT" "$ALIAS" >/dev/null
jarsigner -verify "$OUT" >/dev/null && echo "✔ נחתם: $OUT"
