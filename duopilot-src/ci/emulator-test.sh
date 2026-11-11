#!/usr/bin/env bash
# DuoPilot – בדיקה על אמולטור אנדרואיד (רץ ב-GitHub Actions, ראה .github/workflows/duopilot-apk.yml).
# לא נוגע בטלפון האמיתי ובלי מפתח API: בודק מסך מפוצל, זיכרון גלילה ויחס חלוקה, כלי הלחיצה של העוזר,
# והשיחה של אנדרואיד אוטו (התראת הודעות + תשובה). כל שלב מצולם; התוצאות בענף duopilot-emulator.
PKG=com.yaniv.duopilot
SVC=$PKG/$PKG.service.PilotService
APK=${APK:-debug-apk/app-debug.apk}
[ -f "$APK" ] || APK=$(ls debug-apk/*.apk duopilot-src/app/build/outputs/apk/debug/*.apk 2>/dev/null | head -1)
OUT=duopilot-emulator
mkdir -p "$OUT"
LOG="$OUT/steps.txt"
: > "$LOG"

step() { echo "=== $*" | tee -a "$LOG"; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; echo "shot $1" >> "$LOG"; }
dbg() { adb shell am broadcast -a com.yaniv.duopilot.DEBUG -p $PKG "$@" >> "$LOG" 2>&1; }
pullf() { # file-in-app-files-dir local-name
  adb exec-out run-as $PKG cat "files/$1" > "$OUT/$2" 2>>"$LOG"
  { echo "--- $2"; cat "$OUT/$2"; echo; } >> "$LOG" 2>/dev/null
}
wins() {
  {
    echo "--- windows: $1"
    adb shell dumpsys window windows | grep -E "Window #|mFrame=|mHasSurface" | head -40
    adb shell dumpsys activity activities | grep -E "ResumedActivity|mResumedActivity|windowingMode=|Task\{" | head -30
  } >> "$LOG" 2>&1
}

step "device"
adb shell getprop ro.build.version.release >> "$LOG"
adb shell wm size >> "$LOG"
adb shell wm density >> "$LOG"

step "install ($APK)"
adb install -r -g "$APK" >> "$LOG" 2>&1
adb shell pm grant $PKG android.permission.RECORD_AUDIO >> "$LOG" 2>&1
adb shell pm grant $PKG android.permission.POST_NOTIFICATIONS >> "$LOG" 2>&1

step "enable accessibility service"
adb shell settings put secure enabled_accessibility_services $SVC
adb shell settings put secure accessibility_enabled 1
sleep 8
adb shell dumpsys accessibility | grep -iE "duopilot|Enabled services|Bound services" | head -10 >> "$LOG"
adb shell input keyevent KEYCODE_HOME
sleep 2
shot 00-home-with-bubble

step "1. browser: load a long page"
adb shell am start -n $PKG/.browser.BrowserActivity --es url "https://en.m.wikipedia.org/wiki/Android_version_history" >> "$LOG" 2>&1
sleep 12
shot 01-browser-full
adb shell input keyevent KEYCODE_HOME
sleep 2

step "2. open pair: Settings (top) + DuoPilot browser (bottom) - first time (tries both methods)"
dbg --es cmd pair --es top com.android.settings --es bottom duopilot:browser
sleep 8; shot 02-pair-8s
sleep 8; shot 03-pair-16s
sleep 8; shot 03b-pair-24s
wins after-pair
dbg --es cmd state; sleep 2; pullf state.txt state-1.txt
dbg --es cmd dump; sleep 6; pullf dump.txt dump-1.txt

step "3. scroll both halves (the memory should keep the positions)"
adb shell input swipe 540 2050 540 1450 500; sleep 1
adb shell input swipe 540 2050 540 1450 500; sleep 1
adb shell input swipe 540 2050 540 1450 500; sleep 2
adb shell input swipe 540 950 540 400 500; sleep 1
adb shell input swipe 540 950 540 400 500; sleep 3
shot 04-both-scrolled
dbg --es cmd state; sleep 2; pullf state.txt state-2.txt

step "4. close everything (browser activity + Settings process) and reopen the last pair"
dbg --es cmd finish_browser; sleep 1
adb shell am force-stop com.android.settings; sleep 1
adb shell input keyevent KEYCODE_HOME; sleep 3
dbg --es cmd lastpair
sleep 10; shot 06-reopened-10s
sleep 10; shot 07-reopened-20s
wins after-reopen
dbg --es cmd state; sleep 2; pullf state.txt state-3.txt

step "5. move the divider up and reopen (ratio memory)"
adb shell input swipe 540 1210 540 850 1500
sleep 4; shot 08-divider-moved
dbg --es cmd state; sleep 2; pullf state.txt state-4.txt
adb shell input keyevent KEYCODE_HOME; sleep 3
dbg --es cmd lastpair
sleep 20; shot 09-ratio-restored
dbg --es cmd state; sleep 2; pullf state.txt state-5.txt

step "5b. switch to another pair while a split is open: Chrome (top) + Settings (bottom)"
dbg --es cmd pair --es top com.android.chrome --es bottom com.android.settings
sleep 20; shot 09b-second-pair
dbg --es cmd state; sleep 2; pullf state.txt state-6.txt
dbg --es cmd pair --es top com.android.settings --es bottom duopilot:browser
sleep 20; shot 09c-back-to-first-pair
dbg --es cmd state; sleep 2; pullf state.txt state-7.txt

step "6. assistant tools without AI: dump, tap by label, scroll the bottom list"
dbg --es cmd dump; sleep 5; pullf dump.txt dump-2.txt
dbg --es cmd tap_label --es label "Network"; sleep 4; shot 10-tap-network; pullf tap.txt tap-1.txt
dbg --es cmd scroll_down --es where BOTTOM; sleep 3; shot 11-scroll-bottom

step "7. Android Auto bridge: conversation notification + a reply (no API key -> polite message)"
dbg --es cmd car --es text "בדיקה מהאמולטור"
sleep 2
adb shell cmd statusbar expand-notifications; sleep 2; shot 12-car-notification
adb shell cmd statusbar collapse; sleep 1
dbg --es cmd carreply --es text "תפתח את ההגדרות"
sleep 5
adb shell dumpsys notification --noredact | grep -iE "duopilot|android.messages|android.text|actions=|semantic" | head -60 >> "$LOG" 2>&1
adb shell cmd statusbar expand-notifications; sleep 2; shot 13-car-after-reply
adb shell cmd statusbar collapse; sleep 1

step "8. main screen"
adb shell am start -n $PKG/.ui.MainActivity --ez no_auto true >> "$LOG" 2>&1
sleep 4; shot 14-main-1
adb shell input swipe 540 1900 540 700 400; sleep 2; shot 15-main-2
adb shell input swipe 540 1900 540 700 400; sleep 2; shot 16-main-3
adb shell input swipe 540 1900 540 700 400; sleep 2; shot 17-main-4
adb shell input swipe 540 1900 540 700 400; sleep 2; shot 18-main-5

step "split log"
adb exec-out run-as $PKG cat files/split-log.txt > "$OUT/split-log.txt" 2>>"$LOG"

step "logcat"
adb logcat -d -v time | grep -E "DuoPilot|AndroidRuntime|FATAL|duopilot" | tail -400 > "$OUT/logcat.txt"
echo done >> "$LOG"
exit 0
