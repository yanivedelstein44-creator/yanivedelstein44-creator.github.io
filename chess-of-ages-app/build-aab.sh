#!/usr/bin/env bash
# בונה AAB (Android App Bundle) לא חתום של גרסת Google Play — רץ ב-GitHub Actions (chess-of-ages-aab.yml).
#
# ההבדלים מ-build-apk.sh (ה-APK שמורידים מהאתר):
#  • קוד ה-web: בדיוק הגרסה שקודמה לערוץ Play (../chess-of-ages-play, scripts/publish-play.sh), לא הבטא שבאתר.
#  • מזהה חבילה נפרד: com.chessofages.islandrealms (ה-APK מהאתר נשאר com.chessofages.kingdombuilder).
#  • סימון "CoAStore/play" ב-User-Agent — לפיו src/config/Store.js יודע שזו גרסת Play (בלי הורדת APK,
#    עדכוני OTA מערוץ Play, קניות רק דרך Google Play Billing).
#  • בלי REQUEST_INSTALL_PACKAGES גם אם ספרייה כלשהי תוסיף אותה (מדיניות Device and Network Abuse).
#  • Google Play Billing: התוסף @capgo/native-purchases (Play Billing Library 9) נוסף רק כאן — ה-APK מהאתר נשאר בלי חיובים.
#    ההרשאה com.android.vending.BILLING מגיעה במיזוג מהספרייה, והבנייה נכשלת אם היא חסרה.
#  • התוצר: bundleRelease (‏.aab). Google Play דורשת היום targetSdk 36 — זה מה שתבנית Capacitor 8 מגדירה.
#  • פרסומות מתגמלות (הדולפין באי המרכזי): התוסף @capacitor-community/admob (Google Mobile Ads SDK + UMP) נוסף רק כאן,
#    עם מזהה האפליקציה של AdMob במניפסט (ADMOB_APP_ID). ההרשאה com.google.android.gms.permission.AD_ID מגיעה במיזוג
#    מהספרייה — והבנייה נכשלת אם היא או המזהה חסרים. ה-APK מהאתר נשאר בלי פרסומות.
#  • בדיקת גיל לפי חוק (Texas SB 2420 וחוקים דומים): Play Age Signals API (com.google.android.play:age-signals) עם תוסף
#    מקומי native/AgeSignalsPlugin.java, שנרשם ב-MainActivity. צד ה-JavaScript: src/core/AgeGate.js. בלי הרשאות חדשות.
#
# חתימה: ה-AAB נחתם אחר כך במפתח ההעלאה (upload key) בעזרת sign-aab.sh, מחוץ לריפו.
# את מה שמגיע למשתמשים חותמת Google (Play App Signing, מפתח שנוצר אצל Google).
set -euo pipefail
cd "$(dirname "$0")"
APP="$(pwd)"
PLAY_DIR="$(cd "${PLAY_DIR:-../chess-of-ages-play}" && pwd)"
PLAY_ID="com.chessofages.islandrealms"
UA_MARK="CoAStore/play"
PURCHASES_VERSION="8.9.11"   # @capgo/native-purchases — Play Billing Library 9.x (חובה לאפליקציות חדשות ב-Play)
ADMOB_VERSION="8.3.2"        # @capacitor-community/admob — Google Mobile Ads SDK 25.x + User Messaging Platform (UMP)
ADMOB_APP_ID="${ADMOB_APP_ID:-ca-app-pub-7781980348428898~7022902368}"   # AdMob → Apps → Chess of Ages: Island Realms → App ID
AGE_SIGNALS_VERSION="${AGE_SIGNALS_VERSION:-0.0.6}"   # Play Age Signals — 0.0.6 (נובמבר 2026): getApplicableAgeFeatures + requestAgeSignalsAccess
[ -f native/AgeSignalsPlugin.java ] || { echo "חסר native/AgeSignalsPlugin.java"; exit 1; }

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
cp package.json "$APP/out/.package.site.json"
restore() {
  cp "$APP/out/.capacitor.config.site.json" "$APP/capacitor.config.json" 2>/dev/null || true
  cp "$APP/out/.package.site.json" "$APP/package.json" 2>/dev/null || true
  rm -f "$APP/out/.capacitor.config.site.json" "$APP/out/.package.site.json"
}
trap restore EXIT
node -e "
const fs = require('fs');
const c = JSON.parse(fs.readFileSync('capacitor.config.json', 'utf8'));
c.appId = '$PLAY_ID';
c.android = Object.assign({}, c.android, { appendUserAgent: '$UA_MARK' });
fs.writeFileSync('capacitor.config.json', JSON.stringify(c, null, 2));
"

# Google Play Billing ו-AdMob — רק בגרסת Play (Capacitor מוצא תוספים לפי dependencies ב-package.json; המקור משוחזר בסוף)
node -e "
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
p.dependencies = Object.assign({}, p.dependencies, { '@capgo/native-purchases': '$PURCHASES_VERSION', '@capacitor-community/admob': '$ADMOB_VERSION' });
fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\\n');
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
# Google Play Billing: ההרשאה נכתבת גם במפורש (ליתר ביטחון; הספרייה מוסיפה אותה גם במיזוג)
sed -i 's#</manifest>#    <uses-permission android:name="com.android.vending.BILLING" />\n</manifest>#' "$MANIFEST"
# AdMob: מזהה האפליקציה (חובה — בלעדיו ה-SDK קורס בפתיחה), ואתחול/טעינה ברקע כדי לא לחסום את ה-UI (פחות ANR)
grep -q 'name="admob_app_id"' "$RES/values/strings.xml" || sed -i "s#</resources>#    <string name=\"admob_app_id\" translatable=\"false\">${ADMOB_APP_ID}</string>\n</resources>#" "$RES/values/strings.xml"
sed -i 's#</application>#    <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="@string/admob_app_id" />\n        <meta-data android:name="com.google.android.gms.ads.flag.OPTIMIZE_INITIALIZATION" android:value="true" />\n        <meta-data android:name="com.google.android.gms.ads.flag.OPTIMIZE_AD_LOADING" android:value="true" />\n    </application>#' "$MANIFEST"

# 3) גרסה: versionName כמו העטיפה; versionCode חייב רק לעלות בכל העלאה ל-Play
VER="$(node -p "require('./package.json').version")"
VCODE="${PLAY_VERSION_CODE:-$((1000 + ${GITHUB_RUN_NUMBER:-1}))}"
sed -i -E "s/versionCode [0-9]+/versionCode ${VCODE}/; s/versionName \"[^\"]*\"/versionName \"${VER}\"/" android/app/build.gradle

npx cap sync android

# Play Age Signals: הספרייה של Google, התוסף המקומי, ורישום התוסף ב-MainActivity (תוסף מקומי לא נרשם לבד כמו תוספי npm)
META="$(curl -fsSL --max-time 20 https://dl.google.com/android/maven2/com/google/android/play/age-signals/maven-metadata.xml 2>/dev/null || true)"
if [ -n "$META" ]; then
  echo "age-signals ב-Google Maven: $(echo "$META" | grep -oE '<version>[^<]+</version>' | sed -E 's#</?version>##g' | tr '\n' ' ')"
  echo "$META" | grep -q "<version>${AGE_SIGNALS_VERSION}</version>" || { echo "שגיאה: age-signals ${AGE_SIGNALS_VERSION} לא קיימת ב-Google Maven"; exit 1; }
fi
MAIN_JAVA="$(find android/app/src/main/java -name MainActivity.java | head -1)"
[ -n "$MAIN_JAVA" ] || { echo "שגיאה: לא נמצא MainActivity.java (התבנית של Capacitor השתנתה?)"; exit 1; }
grep -q "^package ${PLAY_ID};" "$MAIN_JAVA" || { echo "שגיאה: MainActivity לא בחבילה ${PLAY_ID}"; exit 1; }
cp native/AgeSignalsPlugin.java "$(dirname "$MAIN_JAVA")/AgeSignalsPlugin.java"
cat > "$MAIN_JAVA" <<EOF
package ${PLAY_ID};

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // תוסף מקומי (לא מ-npm): נרשם לפני super.onCreate — בדיקת גיל לפי חוק (src/core/AgeGate.js)
        registerPlugin(AgeSignalsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
EOF
grep -q '^dependencies {' android/app/build.gradle || { echo "שגיאה: לא נמצא בלוק dependencies ב-app/build.gradle"; exit 1; }
sed -i "0,/^dependencies {/s##dependencies {\n    implementation \"com.google.android.play:age-signals:${AGE_SIGNALS_VERSION}\"#" android/app/build.gradle
grep -q "com.google.android.play:age-signals:${AGE_SIGNALS_VERSION}" android/app/build.gradle || { echo "שגיאה: התלות age-signals לא נכנסה ל-build.gradle"; exit 1; }

cd android
chmod +x gradlew
set +e
./gradlew bundleRelease --no-daemon --stacktrace
GRADLE_RC=$?
set -e
# ה-API של age-signals כפי שהוא בספרייה שירדה (לבדיקה, וגם לאבחון אם הקומפילציה נכשלה)
AS_AAR="$(find "${GRADLE_USER_HOME:-$HOME/.gradle}/caches" -name "age-signals-${AGE_SIGNALS_VERSION}.aar" 2>/dev/null | head -1 || true)"
if [ -n "$AS_AAR" ]; then
  rm -rf "$APP/out/.as" && mkdir -p "$APP/out/.as"
  unzip -q -o "$AS_AAR" classes.jar -d "$APP/out/.as" || true
  if [ -f "$APP/out/.as/classes.jar" ]; then
    for c in $(unzip -Z1 "$APP/out/.as/classes.jar" | grep -E '^com/google/android/play/agesignals/[A-Za-z0-9/]+\.class$' | sed 's#\.class$##; s#/#.#g'); do
      javap -public -cp "$APP/out/.as/classes.jar" "$c" 2>/dev/null || true
    done > "$APP/out/AGE_SIGNALS_API.txt"
    rm -rf "$APP/out/.as"
    echo "== Play Age Signals ${AGE_SIGNALS_VERSION} API ==" && cat "$APP/out/AGE_SIGNALS_API.txt"
  fi
fi
[ "$GRADLE_RC" -eq 0 ] || { echo "שגיאה: הבנייה נכשלה (קוד ${GRADLE_RC})"; exit "$GRADLE_RC"; }
cp app/build/outputs/bundle/release/app-release.aab "$APP/out/chess-of-ages-play-unsigned.aab"

# 4) בדיקות אחרונות: מזהה, targetSdk, ושאין הרשאת התקנת חבילות בתוצר
MERGED="$(find app/build/intermediates -path '*release*' -name AndroidManifest.xml 2>/dev/null | grep -i merged | head -1 || true)"
[ -n "$MERGED" ] || { echo "שגיאה: לא נמצא המניפסט הממוזג"; exit 1; }
if grep -q 'REQUEST_INSTALL_PACKAGES' "$MERGED"; then echo "שגיאה: REQUEST_INSTALL_PACKAGES במניפסט הממוזג"; exit 1; fi
grep -q 'com.android.vending.BILLING' "$MERGED" || { echo "שגיאה: חסרה הרשאת com.android.vending.BILLING (תוסף Play Billing לא נכלל)"; exit 1; }
PERMS="$(grep -oE 'uses-permission[^>]*android:name="[^"]+"' "$MERGED" | grep -oE 'name="[^"]+"' | cut -d'"' -f2 | sort -u | tr '\n' ' ')"
grep -q 'NativePurchases' "$APP/android/app/src/main/assets/capacitor.plugins.json" || { echo "שגיאה: NativePurchases לא רשום ב-capacitor.plugins.json"; exit 1; }
grep -q '"AdMob"\|AdMob' "$APP/android/app/src/main/assets/capacitor.plugins.json" || { echo "שגיאה: AdMob לא רשום ב-capacitor.plugins.json"; exit 1; }
grep -q 'com.google.android.gms.ads.APPLICATION_ID' "$MERGED" || { echo "שגיאה: חסר מזהה האפליקציה של AdMob במניפסט"; exit 1; }
grep -q 'com.google.android.gms.permission.AD_ID' "$MERGED" || { echo "שגיאה: חסרה ההרשאה AD_ID (נדרשת להצהרת Advertising ID ב-Play)"; exit 1; }
grep -q "${ADMOB_APP_ID}" "$APP/android/app/src/main/res/values/strings.xml" || { echo "שגיאה: מזהה AdMob לא נכתב ל-strings.xml"; exit 1; }  # (כאן אנחנו בתוך android/ — לכן נתיב מלא)
# בדיקת הגיל נכנסה לקוד: התוסף המקומי והספרייה של Google ב-dex של ה-AAB
AS_PLUGIN="$(unzip -p "$APP/out/chess-of-ages-play-unsigned.aab" 'base/dex/*.dex' | grep -a -c "L${PLAY_ID//.//}/AgeSignalsPlugin;" || true)"
[ "${AS_PLUGIN:-0}" -gt 0 ] || { echo "שגיאה: AgeSignalsPlugin לא נמצא בקוד ה-AAB"; exit 1; }
AS_LIB="$(unzip -p "$APP/out/chess-of-ages-play-unsigned.aab" 'base/dex/*.dex' | grep -a -c 'Lcom/google/android/play/agesignals/' || true)"
[ "${AS_LIB:-0}" -gt 0 ] || { echo "שגיאה: ספריית Play Age Signals לא נמצאה ב-AAB"; exit 1; }
TARGET="$(grep -oE 'targetSdkVersion = [0-9]+' variables.gradle | grep -oE '[0-9]+' || true)"
[ "${TARGET:-0}" -ge 36 ] || { echo "שגיאה: targetSdk ${TARGET} — Google Play דורשת 36 ומעלה"; exit 1; }
echo "applicationId=${PLAY_ID} versionName=${VER} versionCode=${VCODE} targetSdk=${TARGET} web=$(node -e "process.stdout.write(require(process.argv[1]).build)" "$PLAY_DIR/version.json") billing=@capgo/native-purchases@${PURCHASES_VERSION} admob=@capacitor-community/admob@${ADMOB_VERSION} admobApp=${ADMOB_APP_ID} agesignals=com.google.android.play:age-signals:${AGE_SIGNALS_VERSION}" > "$APP/out/INFO.txt"
echo "permissions=${PERMS}" >> "$APP/out/INFO.txt"
ls -la "$APP/out"
