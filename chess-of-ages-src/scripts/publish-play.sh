#!/usr/bin/env bash
# מקדם לגוגל פליי את הגרסה שכבר פורסמה באתר: בונה אותה כגרסת Play ומעתיק לערוץ Play (chess-of-ages-play/).
# שחקני Play מקבלים אותה כעדכון OTA רגיל (בלי AAB חדש ובלי בדיקה של Google — קוד JavaScript ב-WebView).
# הסדר הקבוע: קודם scripts/publish-site.sh (הבטא בטלפון שלך) → בודקים → ואז הסקריפט הזה.
#
# שימוש:  scripts/publish-play.sh [נתיב לריפו האתר] ["מה חדש"]
#   NO_PUSH=1            — בונה ומעתיק בלי commit/push (לבדיקה)
#   FORCE=1              — מקדם גם אם הגרסה בקוד שונה מזו שבאתר (לא מומלץ: Play אמורה לקבל רק מה שנבדק בבטא)
#   PLAY_UPDATE_BASE=…   — כתובת ערוץ Play (אפשרות 2 בהמשך: Cloudflare Pages). חייבת להתאים למה שהאפליקציה מכירה
#                          (src/config/Store.js → PLAY_UPDATE_DEFAULT, או VITE_UPDATE_BASE של הבנייה הקודמת)
set -euo pipefail
SITE_REPO="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"
NOTES="${2:-}"
SITE_URL="https://yanivedelstein44-creator.github.io/chess-of-ages/"
PLAY_BASE="${PLAY_UPDATE_BASE:-https://yanivedelstein44-creator.github.io/chess-of-ages-play/}"
PLAY_DIR_NAME="${PLAY_DIR_NAME:-chess-of-ages-play}"
[ -d "$SITE_REPO/chess-of-ages" ] || { echo "לא נמצאה התיקייה chess-of-ages בתוך $SITE_REPO"; exit 1; }
cd "$(dirname "$0")/.."
VER="$(node -p "require('./package.json').version")"

# בטיחות: Play מקבלת רק גרסה שכבר יצאה לבטא באתר
SITE_VER="$(node -e "try{process.stdout.write(require(process.argv[1]).version)}catch{}" "$SITE_REPO/chess-of-ages/version.json")"
if [ "$SITE_VER" != "$VER" ] && [ -z "${FORCE:-}" ]; then
  echo "הגרסה בקוד (${VER}) שונה מזו שבאתר (${SITE_VER:-אין}). קודם מפרסמים לאתר ובודקים בטלפון (או FORCE=1)."
  exit 1
fi

OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT
VITE_STORE=play VITE_PUBLIC_URL="$SITE_URL" VITE_UPDATE_BASE="$PLAY_BASE" VITE_APK_URL="" RELEASE_NOTES="$NOTES" \
  npx vite build --outDir "$OUT" --emptyOutDir
BUNDLE="$(node -e "process.stdout.write(require(process.argv[1]).bundle)" "$OUT/version.json")"
APK="$(node -e "process.stdout.write(require(process.argv[1]).apk||'')" "$OUT/version.json")"
[ -z "$APK" ] || { echo "שגיאה: לגרסת Play אסור להציע APK (apk=${APK})"; exit 1; }

# בערוץ Play יש רק מה שהאפליקציה צריכה: version.json + החבילה האחרונה (כך הריפו לא מתנפח), ודף מעבר לדפדפן
DEST="$SITE_REPO/$PLAY_DIR_NAME"
mkdir -p "$DEST"
rm -rf "$DEST/update" "$DEST/version.json"
mkdir -p "$DEST/update"
cp "$OUT/$BUNDLE" "$DEST/$BUNDLE"
cp "$OUT/version.json" "$DEST/version.json"
cat > "$DEST/index.html" <<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0; url=../chess-of-ages/">
<title>Chess of Ages: Island Realms</title>
</head>
<body>
<p>This folder holds updates for the Google Play app. <a href="../chess-of-ages/">Play Chess of Ages in your browser</a>.</p>
</body>
</html>
HTML

if [ -n "${NO_PUSH:-}" ]; then echo "✔ v${VER} הוכן בערוץ Play ב-${DEST} (NO_PUSH — בלי commit)"; exit 0; fi
cd "$SITE_REPO"
git add "$PLAY_DIR_NAME"
git commit -m "Chess of Ages ${VER} → Google Play channel${NOTES:+: ${NOTES}}${COMMIT_TRAILER:+
${COMMIT_TRAILER}}"
git push origin HEAD:main
echo "✔ v${VER} קודם ל-Play — שחקני Play יקבלו 'יש עדכון חדש' תוך כמה דקות"
