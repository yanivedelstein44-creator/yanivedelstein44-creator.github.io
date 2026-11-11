#!/usr/bin/env bash
# חותם את ה-APK שנבנה ב-GitHub Actions במפתח הקבוע של DuoPilot ומעתיק אותו לאתר (duopilot/).
# שימוש (מתוך שורש ריפו האתר):
#   DUOPILOT_KS=/path/duopilot.p12 DUOPILOT_KS_PASS=... bash duopilot-src/ci/sign-and-publish.sh /path/to/duopilot-build
# התיקייה duopilot-build = קלון של הענף duopilot-build (DuoPilot-unsigned.apk + apksigner.jar).
# אחרי זה: git add duopilot && git commit && git push – והאפליקציות בטלפון יתעדכנו לבד.
set -euo pipefail
BUILD=${1:?path to a checkout of the duopilot-build branch}
: "${DUOPILOT_KS:?path to duopilot.p12}"
: "${DUOPILOT_KS_PASS:?keystore password}"
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SRC="$ROOT/duopilot-src"
SITE="$ROOT/duopilot"
mkdir -p "$SITE"

grep -q "outcome=success" "$BUILD/STATUS.txt" || { echo "the CI build did not succeed:"; cat "$BUILD/STATUS.txt"; exit 1; }
CODE=$(grep -E '^versionCode=' "$SRC/version.properties" | cut -d= -f2 | tr -d '[:space:]')
NAME=$(grep -E '^versionName=' "$SRC/version.properties" | cut -d= -f2 | tr -d '[:space:]')
grep -q "versionCode='$CODE'" "$BUILD/badging.txt" || { echo "the APK in $BUILD is not versionCode $CODE"; head -1 "$BUILD/badging.txt"; exit 1; }

java -jar "$BUILD/apksigner.jar" sign --ks "$DUOPILOT_KS" --ks-type PKCS12 --ks-key-alias duopilot \
  --ks-pass env:DUOPILOT_KS_PASS --key-pass env:DUOPILOT_KS_PASS \
  --out "$SITE/DuoPilot.apk" "$BUILD/DuoPilot-unsigned.apk"
java -jar "$BUILD/apksigner.jar" verify --print-certs "$SITE/DuoPilot.apk" | head -3
rm -f "$SITE/DuoPilot.apk.idsig"

SHA=$(sha256sum "$SITE/DuoPilot.apk" | cut -d' ' -f1)
python3 - "$CODE" "$NAME" "$SHA" "$SRC/release-notes.txt" "$SITE/version.json" <<'PY'
import json, sys
code, name, sha, notes_path, out = sys.argv[1:6]
notes = open(notes_path, encoding="utf-8").read().strip()
json.dump({"versionCode": int(code), "versionName": name, "apk": "DuoPilot.apk", "sha256": sha, "notes": notes},
          open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
PY
sed -i -E "s/(<span id=\"ver\">)[^<]*(<\/span>)/\1$NAME\2/" "$SITE/index.html" 2>/dev/null || true
echo "published DuoPilot $NAME ($CODE) sha256=$SHA"
