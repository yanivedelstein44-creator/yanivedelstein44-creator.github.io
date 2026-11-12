#!/usr/bin/env bash
# בונה AAB (Android App Bundle) לא חתום של גרסת Google Play — רץ ב-GitHub Actions (chess-of-ages-aab.yml).
#
# ההבדלים מ-build-apk.sh (ה-APK שמורידים מהאתר):
#  • קוד ה-web: בדיוק הגרסה שקודמה לערוץ Play (../chess-of-ages-play, scripts/publish-play.sh), לא הבטא שבאתר.
#  • מזהה חבילה נפרד: com.chessofages.islandrealms (ה-APK מהאתר נשאר com.chessofages.kingdombuilder).
#  • סימון "CoAStore/play" ב-User-Agent — לפיו src/config/Store.js יודע שזו גרסת Play (בלי הורדת APK,
#    עדכוני OTA מערוץ Play, קניות רק דרך Google Play Billing).
#  • בלי REQUEST_INSTALL_PACKAGES גם אם ספרייה כלשהי תוסיף אותה (מדיניות Device and Network Abuse).
#  • התוצר: bundleRelease (‏.aab). Google Play דורשת היום targetSdk 36 — זה מה שתבנית Capacitor 8 מגדירה.
#
# חתימה: ה-AAB נחתם אחר כך במפתח ההעלאה (upload key) בעזרת sign-aab.sh, מחוץ לריפו.
# את מה שמגיע למשתמשים חותמת Google (Play App Signing, מפתח שנוצר אצל Google).
set -euo pipefail
cd "$(dirname "$0")"
APP="$(pwd)"
PLAY_DIR="$(cd "${PLAY_DIR:-../chess-of-ages-play}" && pwd)"
PLAY_ID="com.chessofages.islandrealms"
UA_MARK="CoAStore/play"

[ -f "$PLAY_DIR/version.json" ] || { echo "לא נמצא $PLAY_DIR/version.json — קודם מקדמים גרסה ל-Play (scripts/publish-play.sh)"; exit 1; }
rm -rf www out android && mkdir -p www out

# 1) קוד ה-web מחבילת ערוץ Play, אחרי אימות ה-SHA-256 שב-version.json
BUNDLE="$(node -e "process.stdout.write(require(process.argv[1]).bundle)" "$PLAY_DIR/version.json")"
SUM="$(node -e "process.stdout.write(require(process.argv[1]).checksum)" "$PLAY_DIR/version.json")"
echo "${SUM}  ${PLAY_DIR}/${BUNDLE}" | sha256sum -c -
unzip -q "$PLAY_DIR/$BUNDLE" -d www/
rm -f www/sw.js   # ה-Service Worker לא רץ בתוך האפליקציה (כמו ב-build-apk.sh)
[ -f www/index.html ] || { echo "בחבילה אין index.html"; exit 1; }

# 2) תצורת Capacitor של Play (מזהה + סימון User-Agent); המקור משוחזר בסוף
cp capacitor.config.json "$APP/out/.capacitor.config.site.json"
restore() { cp "$APP/out/.capacitor.config.site.json" "$APP/capacitor.config.json" 2>/dev/null || true; rm -f "$APP/out/.capacitor.config.site.json"; }
trap restore EXIT
node -e "
const fs = require('fs');
const c = JSON.parse(fs.readFileSync('capacitor.config.json', 'utf8'));
c.appId = '$PLAY_ID';
c.android = Object.assign({}, c.android, { appendUserAgent: '$UA_MARK' });
fs.writeFileSync('capacitor.config.json', JSON.stringify(c, null, 2));
"

npm install --no-audit --no-fund
npx cap add android
RES=android/app/src/main/res
MANIFEST=android/app/src/main/AndroidManifest.xml
cp -r android-res/res/. "$RES/"
# כמו ב-APK: מסך פתיחה כהה גם באנדרואיד 12+, נעילה לאורך
sed -i 's#<item name="android:background">@drawable/splash</item>#<item name="android:background">@drawable/splash</item>\n        <item name="windowSplashScreenBackground">\#0B0912</item>\n        <item name="android:windowBackground">@drawable/splash</item>#' "$RES/values/styles.xml"
sed -i 's#android:name=".MainActivity"#android:name=".MainActivity"\n            android:screenOrientation="portrait"#' "$MANIFEST"
# בלי התקנת APK-ים: מסירים את ההרשאה גם אם היא מגיעה במיזוג מספרייה
grep -q 'xmlns:tools=' "$MANIFEST" || sed -i 's#<manifest xmlns:android="http://schemas.android.com/apk/res/android"#<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools"#' "$MANIFEST"
sed -i 's#</manifest>#    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" tools:node="remove" />\n</manifest>#' "$MANIFEST"

# 3) גרסה: versionName כמו העטיפה; versionCode חייב רק לעלות בכל העלאה ל-Play
VER="$(node -p "require('./package.json').version")"
VCODE="${PLAY_VERSION_CODE:-$((1000 + ${GITHUB_RUN_NUMBER:-1}))}"
sed -i -E "s/versionCode [0-9]+/versionCode ${VCODE}/; s/versionName \"[^\"]*\"/versionName \"${VER}\"/" android/app/build.gradle

npx cap sync android
cd android
chmod +x gradlew
./gradlew bundleRelease --no-daemon --stacktrace
cp app/build/outputs/bundle/release/app-release.aab "$APP/out/chess-of-ages-play-unsigned.aab"

# 4) בדיקות אחרונות: מזהה, targetSdk, ושאין הרשאת התקנת חבילות בתוצר
MERGED="$(find app/build/intermediates -path '*release*' -name AndroidManifest.xml 2>/dev/null | grep -i merged | head -1 || true)"
if [ -n "$MERGED" ] && grep -q 'REQUEST_INSTALL_PACKAGES' "$MERGED"; then echo "שגיאה: REQUEST_INSTALL_PACKAGES במניפסט הממוזג"; exit 1; fi
TARGET="$(grep -oE 'targetSdkVersion = [0-9]+' variables.gradle | grep -oE '[0-9]+' || true)"
[ "${TARGET:-0}" -ge 36 ] || { echo "שגיאה: targetSdk ${TARGET} — Google Play דורשת 36 ומעלה"; exit 1; }
echo "applicationId=${PLAY_ID} versionName=${VER} versionCode=${VCODE} targetSdk=${TARGET} web=$(node -e "process.stdout.write(require(process.argv[1]).build)" "$PLAY_DIR/version.json")" > "$APP/out/INFO.txt"
ls -la "$APP/out"
