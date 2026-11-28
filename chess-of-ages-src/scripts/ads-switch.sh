#!/usr/bin/env bash
# מתג הפרסומות האמיתיות בגרסת Google Play (core/AdsSwitch.js): כותב ads.json בערוץ העדכונים של Play ומפרסם.
# בלי בנייה, בלי גרסה חדשה ובלי הודעת עדכון לשחקנים. כל פרסומת שנפתחת אחרי שהאתר מתעדכן (בערך דקה) פועלת לפי המתג.
#   off            — סגור לכולם (פרסומות הבדיקה של Google): עד ההגשה ל-production, או אם AdMob מעירה משהו.
#   auto <מספר>    — ביום ההגשה ל-production: נפתח לבד באפליקציה שה-versionCode שלה הוא המספר הזה ומעלה (ה-AAB של ההשקה).
#                    לא מעלים AAB עם מספר כזה לבדיקה הסגורה לפני ההשקה, אחרת הבודקים יקבלו פרסומות אמיתיות.
#   on             — פתוח לכולם.
# שימוש:  scripts/ads-switch.sh off|on|auto <versionCode> [נתיב לריפו האתר]
#   COMMIT_TRAILER=…  — שורות שנוספות בסוף הודעת ה-commit
set -euo pipefail
usage() { echo "שימוש: scripts/ads-switch.sh off|on|auto <versionCode> [נתיב לריפו האתר]"; exit 1; }
MODE="${1:-}"; shift || true
case "$MODE" in
  on)  BODY='"live": true' ;;
  off) BODY='"live": false' ;;
  auto)
    FROM="${1:-}"; shift || true
    [[ "$FROM" =~ ^[1-9][0-9]*$ ]] || usage
    BODY="\"live\": \"auto\",
  \"fromBuild\": ${FROM}" ;;
  *) usage ;;
esac
SITE_REPO="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"
DIR="${PLAY_DIR_NAME:-chess-of-ages-play}"
[ -d "$SITE_REPO/$DIR" ] || { echo "לא נמצאה התיקייה $DIR בתוך $SITE_REPO"; exit 1; }
cd "$SITE_REPO"
git pull --ff-only
printf '{\n  %s,\n  "updated": "%s"\n}\n' "$BODY" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$DIR/ads.json"
node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" "$DIR/ads.json" || { echo "ads.json לא תקין"; exit 1; }
git add "$DIR/ads.json"
git commit -m "Chess of Ages: real ads switch ${MODE}${FROM:+ from versionCode ${FROM}}${COMMIT_TRAILER:+

${COMMIT_TRAILER}}"
git push origin HEAD:main
case "$MODE" in
  on)   echo "✔ המתג פתוח לכולם: פרסומות אמיתיות בגרסת Play" ;;
  off)  echo "✔ המתג סגור: פרסומות בדיקה בגרסת Play" ;;
  auto) echo "✔ המתג ייפתח לבד באפליקציה מ-versionCode ${FROM} ומעלה" ;;
esac
