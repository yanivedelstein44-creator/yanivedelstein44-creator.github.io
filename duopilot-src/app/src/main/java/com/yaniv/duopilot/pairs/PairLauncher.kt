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
 * פותח צמד במסך מפוצל:
 * 1. אם כבר יש מסך מפוצל אחר – יוצאים ממנו.
 * 2. פותחים את האפליקציה העליונה.
 * 3. "החלף מסך מפוצל" (פעולת נגישות של המערכת) – האפליקציה עוברת לחצי העליון.
 * 4. פותחים את האפליקציה התחתונה עם FLAG_ACTIVITY_LAUNCH_ADJACENT – היא נכנסת לחצי השני.
 * 5. מחזירים את יחס החלוקה ואת מיקום הגלילה שנשמרו.
 * הכול רץ ב-thread נפרד ומחכה לחלונות בפועל (לא רק להשהיות קבועות).
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
    fun launchBlocking(pair: AppPair, timeoutMs: Long = 30_000): Pair<Boolean, String> {
        val latch = CountDownLatch(1)
        var out: Pair<Boolean, String> = false to "לא הספקתי לפתוח את הצמד"
        launch(pair) { ok, msg ->
            out = ok to msg
            latch.countDown()
        }
        latch.await(timeoutMs, TimeUnit.MILLISECONDS)
        return out
    }

    private fun run(pair: AppPair, gen: Int): Pair<Boolean, String> {
        val prefs = Prefs(svc)
        val k = if (prefs.slowMode) 1.7 else 1.0
        fun ms(v: Int) = (v * k).toLong()
        fun label(t: String) = AppCatalog.label(svc, t)

        if (!AppCatalog.isAvailable(svc, pair.top)) return false to "האפליקציה ${label(pair.top)} לא מותקנת"
        if (!AppCatalog.isAvailable(svc, pair.bottom)) return false to "האפליקציה ${label(pair.bottom)} לא מותקנת"
        val store = PairStore(svc)
        if (store.get(pair.id) != null) store.touch(pair.id)
        svc.split.activePairId = pair.id
        svc.split.paused = true
        try {
            if (svc.bothVisible(pair) && svc.isSplitActive()) {
                restoreExtras(pair, prefs, gen)
                return true to "הצמד כבר פתוח"
            }
            if (svc.isSplitActive()) {
                svc.performGlobalAction(AccessibilityService.GLOBAL_ACTION_TOGGLE_SPLIT_SCREEN)
                waitFor(ms(1800)) { !svc.isSplitActive() }
                Bg.sleep(ms(400))
            }
            if (gen != generation) return false to "בוטל"

            if (!Launch.open(svc, pair.top)) return false to "לא הצלחתי לפתוח את ${label(pair.top)}"
            waitFor(ms(4000)) { svc.isShowing(pair.top) }
            Bg.sleep(ms(550))

            var split = false
            for (attempt in 1..2) {
                if (gen != generation) return false to "בוטל"
                svc.performGlobalAction(AccessibilityService.GLOBAL_ACTION_TOGGLE_SPLIT_SCREEN)
                split = waitFor(ms(2600)) { svc.isSplitActive() }
                if (split) break
                // לפעמים הפעולה נבלעת כשהאפליקציה עוד באנימציית פתיחה – מביאים אותה שוב לקדמה ומנסים שוב
                Launch.open(svc, pair.top)
                Bg.sleep(ms(900))
            }
            Bg.sleep(ms(600))

            val sameApp = !Targets.isBrowser(pair.top) && pair.top == pair.bottom
            Launch.open(svc, pair.bottom, adjacent = true, multipleTask = sameApp)
            var ok = waitFor(ms(5000)) { svc.bothVisible(pair) }
            if (!ok && gen == generation) {
                Bg.sleep(ms(500))
                Launch.open(svc, pair.bottom, adjacent = true, multipleTask = sameApp)
                ok = waitFor(ms(3500)) { svc.bothVisible(pair) }
            }
            if (!ok) {
                return false to if (!split) {
                    "הטלפון לא נכנס למסך מפוצל. אפשר לנסות שוב, או להפעיל 'מצב איטי' בהגדרות DuoPilot."
                } else {
                    "לא הצלחתי לפתוח את ${label(pair.bottom)} בחצי השני."
                }
            }

            // אם הם נפתחו הפוך – לחיצה כפולה על הקו המפריד מחליפה ביניהם (אנדרואיד 12+ וסמסונג)
            if (svc.isAbove(pair.bottom, pair.top)) {
                svc.split.swapByDoubleTap()
                waitFor(ms(2000)) { svc.isAbove(pair.top, pair.bottom) }
            }
            Bg.sleep(ms(500))
            restoreExtras(pair, prefs, gen)
            return true to "ok"
        } finally {
            svc.split.paused = false
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
}
