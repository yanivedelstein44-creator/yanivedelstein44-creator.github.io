#!/usr/bin/env bash
# בונה APK לא חתום של MegaGlest Mobile מתוך גרסת ה-web שבתיקייה ../megaglest-mobile (רץ ב-GitHub Actions).
set -euo pipefail
cd "$(dirname "$0")"
APP="$(pwd)"
rm -rf www out android && mkdir -p www out
rsync -a --exclude download/ --exclude sw.js ../megaglest-mobile/ www/
npm install --no-audit --no-fund
npx cap add android
RES=android/app/src/main/res
cp -r android-res/res/. "$RES/"
# נעילה לרוחב (landscape), מסך מלא, רקע כהה
sed -i 's#android:name=".MainActivity"#android:name=".MainActivity"\n            android:screenOrientation="sensorLandscape"#' android/app/src/main/AndroidManifest.xml
VER="$(node -p "require('./package.json').version")"
sed -i -E "s/versionCode [0-9]+/versionCode ${GITHUB_RUN_NUMBER:-1}/; s/versionName \"[^\"]*\"/versionName \"${VER}\"/" android/app/build.gradle
npx cap sync android
cd android
chmod +x gradlew
./gradlew assembleRelease --no-daemon --stacktrace
cp app/build/outputs/apk/release/app-release-unsigned.apk "$APP/out/megaglest-mobile-unsigned.apk"
BT="$ANDROID_HOME/build-tools/$(ls "$ANDROID_HOME/build-tools" | sort -V | tail -1)"
cp "$BT/lib/apksigner.jar" "$APP/out/apksigner.jar"
cp "$BT/zipalign" "$APP/out/zipalign" 2>/dev/null || true
echo "versionName=${VER} versionCode=${GITHUB_RUN_NUMBER:-1} build-tools=$(basename "$BT")" > "$APP/out/INFO.txt"
ls -la "$APP/out"
