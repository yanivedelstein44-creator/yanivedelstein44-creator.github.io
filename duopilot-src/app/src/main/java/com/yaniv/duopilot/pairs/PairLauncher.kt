package com.yaniv.duopilot.pairs

import android.accessibilityservice.AccessibilityService
import android.os.SystemClock
import android.util.Log
import com.yaniv.duopilot.App
import com.yaniv.duopilot.Bg
import com.yaniv.duopilot.Prefs
import com.yaniv.duopilot.service.PilotService
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * פותח צמד במסך מפוצל. יש שתי שיטות, והשיטה שעבדה נזכרת לפעם הבאה:
 *  א. "toggle": פעולת הנגישות "החלף מסך מפוצל" + פתיחת השנייה עם FLAG_ACTIVITY_LAUNCH_ADJACENT
 *     (מהיר, אבל בהרבה טלפונים עם אנדרואיד 12+ המערכת מתעלמת ממנה).
 *  ב. "recents": בדיוק כמו ביד – מסך האפליקציות האחרונות ← האייקון של העליונה ← "מסך מפוצל" ← התחתונה.
 * אחרי שהצמד פתוח: מחזירים את גודל החלוקה ואת מיקומי הגלילה שנשמרו.
 */
class PairLauncher(private val svc: PilotService) {
    private val exec = Executors.newSingleThreadExecutor()

    @Volatile
    private var generation = 0

    @Volatile
    var busy = false
        private set

    fun launch(pair: AppPair, onDone: ((Boolean, String) -> Unit)? = null) {
        val gen = ++generation
        exec.execute {
            busy = true
            val result = try {
                run(pair, gen)
            } catch (t: Throwable) {
                Log.e(App.TAG, "pair launch failed", t)
                false to ("שגיאה בפתיחת הצמד: " + (t.message ?: t.javaClass.simpleName))
            } finally {
                busy = false
            }
            Bg.ui { onDone?.invoke(result.first, result.second) }
        }
    }

    /** לקריאה מה-thread של העוזר הקולי */
    fun launchBlocking(pair: AppPair, timeoutMs: Long = 40_000): Pair<Boolean, String> {
        val latch = CountDownLatch(1)
        var out: Pair<Boolean, String> = false to "לא הספקתי לפתוח את הצמד"
        launch(pair) { ok, msg ->
            out = ok to msg
            latch.countDown()
        }
        latch.await(timeoutMs, TimeUnit.MILLISECONDS)
        return out
    }

    private var k = 1.0
    private fun ms(v: Int) = (v * k).toLong()
    private fun label(t: String) = AppCatalog.label(svc, t)

    private fun run(pair: AppPair, gen: Int): Pair<Boolean, String> {
        val prefs = Prefs(svc)
        k = if (prefs.slowMode) 1.7 else 1.0
        if (!AppCatalog.isAvailable(svc, pair.top)) return false to "האפליקציה ${label(pair.top)} לא מותקנת"
        if (!AppCatalog.isAvailable(svc, pair.bottom)) return false to "האפליקציה ${label(pair.bottom)} לא מותקנת"
        val store = PairStore(svc)
        if (store.get(pair.id) != null) store.touch(pair.id)
        svc.split.activePairId = pair.id
        svc.split.paused = true
        RecentsUi.debugDump(svc, "start ${pair.top} + ${pair.bottom}")
        try {
            if (svc.isSplitActive() && svc.bothVisible(pair)) {
                ensureOrder(pair)
                restoreExtras(pair, prefs, gen)
                return true to "הצמד כבר פתוח"
            }
            if (svc.isSplitActive()) {
                // מסך מפוצל של אפליקציות אחרות – יוצאים למסך הבית (הצמד הקודם נשאר באחרונות)
                svc.performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME)
                waitFor(ms(2500)) { !svc.isSplitActive() }
                Bg.sleep(ms(700))
            }
            if (gen != generation) return false to "בוטל"

            var ok = false
            val method = prefs.splitMethod
            if (method != "recents") {
                ok = viaToggle(pair, gen, attempts = if (method == "toggle") 2 else 1)
                if (ok) prefs.splitMethod = "toggle"
            }
            if (!ok && gen == generation) {
                ok = viaRecents(pair, gen)
                if (ok) prefs.splitMethod = "recents"
                else if (method == "recents") {
                    // אולי השתנה משהו בטלפון – ננסה בפעם הבאה שוב את שתי השיטות
                    prefs.splitMethod = ""
                }
            }
            RecentsUi.debugDump(svc, "result ok=$ok")
            if (gen != generation) return false to "בוטל"
            if (!ok) {
                return false to "לא הצלחתי לפתוח מסך מפוצל. אפשר לנסות שוב, או להפעיל 'מצב איטי' בהגדרות DuoPilot."
            }
            ensureOrder(pair)
            Bg.sleep(ms(500))
            restoreExtras(pair, prefs, gen)
            return true to "ok"
        } finally {
            svc.split.paused = false
        }
    }

    /** שיטה א: פעולת הנגישות של המערכת */
    private fun viaToggle(pair: AppPair, gen: Int, attempts: Int): Boolean {
        if (!Launch.open(svc, pair.top)) return false
        waitFor(ms(4000)) { svc.isShowing(pair.top) }
        Bg.sleep(ms(550))
        var split = false
        for (attempt in 1..attempts) {
            if (gen != generation) return false
            svc.performGlobalAction(AccessibilityService.GLOBAL_ACTION_TOGGLE_SPLIT_SCREEN)
            split = waitFor(ms(2200)) { svc.isSplitActive() }
            RecentsUi.debugDump(svc, "toggle attempt $attempt split=$split")
            if (split) break
            if (attempt < attempts) {
                Launch.open(svc, pair.top)
                Bg.sleep(ms(900))
            }
        }
        if (!split) return false
        Bg.sleep(ms(600))
        val sameApp = !Targets.isBrowser(pair.top) && pair.top == pair.bottom
        Launch.open(svc, pair.bottom, adjacent = true, multipleTask = sameApp)
        var ok = waitFor(ms(5000)) { svc.isSplitActive() && svc.bothVisible(pair) }
        if (!ok && gen == generation) {
            Bg.sleep(ms(500))
            Launch.open(svc, pair.bottom, adjacent = true, multipleTask = sameApp)
            ok = waitFor(ms(3500)) { svc.isSplitActive() && svc.bothVisible(pair) }
        }
        return ok
    }

    /** שיטה ב: דרך מסך האפליקציות האחרונות, כמו ביד */
    private fun viaRecents(pair: AppPair, gen: Int): Boolean {
        val topLabel = label(pair.top)
        val bottomLabel = label(pair.bottom)
        // שתיהן צריכות להיות ב"אחרונות": קודם התחתונה, ואז העליונה (כדי שהיא תהיה הכרטיס הנוכחי)
        Launch.open(svc, pair.bottom)
        waitFor(ms(4500)) { svc.isShowing(pair.bottom) }
        Bg.sleep(ms(700))
        if (gen != generation) return false
        Launch.open(svc, pair.top)
        waitFor(ms(4500)) { svc.isShowing(pair.top) }
        Bg.sleep(ms(800))
        if (gen != generation) return false

        svc.performGlobalAction(AccessibilityService.GLOBAL_ACTION_RECENTS)
        Bg.sleep(ms(900))
        val icon = waitForHit(ms(3500)) { RecentsUi.findLabel(svc, topLabel, smallest = true) }
        RecentsUi.debugDump(svc, "recents opened, icon=${icon?.text}")
        if (icon == null) {
            svc.performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK)
            return false
        }
        RecentsUi.click(svc, icon)
        val item = waitForHit(ms(2500)) { RecentsUi.findSplitItem(svc) }
        RecentsUi.debugDump(svc, "menu opened, split item=${item?.text}")
        if (item == null) {
            svc.performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK)
            Bg.sleep(300)
            svc.performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK)
            return false
        }
        RecentsUi.click(svc, item)
        Bg.sleep(ms(1000))
        val card = waitForHit(ms(3500)) { RecentsUi.findLabel(svc, bottomLabel, smallest = false) }
        RecentsUi.debugDump(svc, "split select, second card=${card?.text}")
        if (card == null) {
            svc.performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK)
            return false
        }
        RecentsUi.click(svc, card)
        return waitFor(ms(6000)) { svc.isSplitActive() && svc.bothVisible(pair) }
    }

    /** אם נפתחו הפוך – לחיצה כפולה על הקו המפריד מחליפה ביניהם */
    private fun ensureOrder(pair: AppPair) {
        if (pair.top == pair.bottom) return
        if (svc.isAbove(pair.bottom, pair.top)) {
            svc.split.swapByDoubleTap()
            waitFor(ms(2000)) { svc.isAbove(pair.top, pair.bottom) }
        }
    }

    private fun restoreExtras(pair: AppPair, prefs: Prefs, gen: Int) {
        val saved = PairStore(svc).get(pair.id) ?: pair
        if (prefs.rememberRatio && saved.ratio in 0.12f..0.88f) {
            svc.split.restoreRatio(saved.ratio)
            Bg.sleep(900)
        }
        if (prefs.rememberScroll) {
            for (t in listOf(pair.top, pair.bottom).distinct()) {
                if (gen != generation) return
                if (!Targets.isBrowser(t)) svc.scroll.restoreBlocking(t)
            }
        }
    }

    private fun waitFor(timeoutMs: Long, cond: () -> Boolean): Boolean {
        val end = SystemClock.uptimeMillis() + timeoutMs
        while (SystemClock.uptimeMillis() < end) {
            val ok = try {
                cond()
            } catch (e: Exception) {
                false
            }
            if (ok) return true
            Bg.sleep(150)
        }
        return false
    }

    private fun waitForHit(timeoutMs: Long, find: () -> RecentsUi.Hit?): RecentsUi.Hit? {
        val end = SystemClock.uptimeMillis() + timeoutMs
        while (SystemClock.uptimeMillis() < end) {
            val h = try {
                find()
            } catch (e: Exception) {
                null
            }
            if (h != null) return h
            Bg.sleep(200)
        }
        return null
    }
}
