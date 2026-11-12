#!/usr/bin/env bash
# יוצר פעם אחת את מפתח ההעלאה (upload key) של גרסת Google Play — מחוץ לריפו. לא דורס מפתח קיים.
# זה לא מפתח החתימה של האפליקציה: את זה Google יוצרת ומנהלת (Play App Signing). אם מפתח ההעלאה אובד או דולף,
# אפשר לבקש מ-Google לאפס אותו. דרישות Google: RSA של 2048 ביט לפחות, ב-Java keystore.
# אחרי היצירה: את התעודה הציבורית (upload_certificate.pem) לא חייבים להעלות — Play לומד אותה מההעלאה הראשונה.
set -euo pipefail
DIR="${KEYS_DIR:-/home/claude/keys}"
KS="$DIR/chess-of-ages-play-upload.jks"
PASS_FILE="$DIR/chess-of-ages-play-upload-password.txt"
ALIAS="${UPLOAD_ALIAS:-upload}"
mkdir -p "$DIR" && chmod 700 "$DIR"
[ ! -e "$KS" ] || { echo "כבר קיים מפתח העלאה: $KS — לא דורס"; exit 1; }
umask 077
head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32 > "$PASS_FILE"
keytool -genkeypair -v -keystore "$KS" -alias "$ALIAS" -keyalg RSA -keysize 4096 -validity 10000 \
  -storepass:file "$PASS_FILE" -keypass:file "$PASS_FILE" \
  -dname "CN=Chess of Ages Upload, O=Chess of Ages" >/dev/null
keytool -export -rfc -keystore "$KS" -alias "$ALIAS" -storepass:file "$PASS_FILE" -file "$DIR/chess-of-ages-play-upload-certificate.pem" >/dev/null
echo "✔ נוצר מפתח העלאה: $KS (סיסמה ב-$PASS_FILE). לגבות את שני הקבצים במקום בטוח — לא בריפו."
