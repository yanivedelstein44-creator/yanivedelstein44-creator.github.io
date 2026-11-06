#!/usr/bin/env bash
# מפרסם גרסה חדשה של המשחק לאתר (וממנו — עדכון אוטומטי לכל השחקנים, כולל ה-APK).
# שימוש:  scripts/publish-site.sh [נתיב לשכפול של yanivedelstein44-creator.github.io] "מה חדש"
set -euo pipefail
# ברירת מחדל: הקוד יושב בתוך ריפו האתר (chess-of-ages-src/), אז הריפו הוא שתי תיקיות למעלה
SITE_REPO="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"
NOTES="${2:-}"
[ -d "$SITE_REPO/chess-of-ages" ] || { echo "לא נמצאה התיקייה chess-of-ages בתוך $SITE_REPO"; exit 1; }
URL="https://yanivedelstein44-creator.github.io/chess-of-ages/"
cd "$(dirname "$0")/.."
npm version "${BUMP:-patch}" --no-git-tag-version >/dev/null
VER="$(node -p "require('./package.json').version")"
VITE_PUBLIC_URL="$URL" VITE_APK_URL="${URL}download/chess-of-ages.apk" RELEASE_NOTES="$NOTES" npx vite build
# מחליפים את התוכן (חוץ מ-download/ שבו ה-APK) — בלי תלות ב-rsync
find "$SITE_REPO/chess-of-ages" -mindepth 1 -maxdepth 1 ! -name download -exec rm -rf {} +
cp -r dist/. "$SITE_REPO/chess-of-ages/"
rm -f "$SITE_REPO/chess-of-ages/_headers"
cd "$SITE_REPO"
git add chess-of-ages
git commit -m "Chess of Ages ${VER}${NOTES:+: ${NOTES}}${COMMIT_TRAILER:+

${COMMIT_TRAILER}}"
git push origin HEAD:main
echo "✔ v${VER} פורסם — האפליקציה תציג 'יש עדכון חדש' תוך כמה דקות"
