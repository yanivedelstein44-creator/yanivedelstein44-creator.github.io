package com.yaniv.duopilot.pairs

import android.accessibilityservice.GestureDescription
import android.graphics.Path
import com.yaniv.duopilot.Bg
import com.yaniv.duopilot.Prefs
import com.yaniv.duopilot.service.PilotService
import kotlin.math.abs

/**
 * זוכר את מיקום הקו המפריד של הצמד הפעיל, ומחזיר אותו בפתיחה הבאה
 * (גרירה של הקו המפריד באמצעות מחווה, כמו שאתה עושה עם האצבע).
 */
class SplitTracker(private val svc: PilotService) {
    @Volatile
    var paused = false

    @Volatile
    var activePairId: String? = null

    private val saveRunnable = Runnable { saveNow() }

    fun onWindowsChanged() {
        if (paused || activePairId == null) return
        Bg.main.removeCallbacks(saveRunnable)
        Bg.main.postDelayed(saveRunnable, 1500)
    }

    private fun saveNow() {
        if (paused) return
        val id = activePairId ?: return
        Bg.async {
            if (!Prefs(svc).rememberRatio) return@async
            val store = PairStore(svc)
            val pair = store.get(id) ?: return@async
            if (!svc.isSplitActive() || !svc.bothVisible(pair)) return@async
            if (!svc.isAbove(pair.top, pair.bottom)) return@async
            val r = currentRatio() ?: return@async
            if (r < 0.1f || r > 0.9f) return@async
            if (abs(r - pair.ratio) > 0.02f) store.updateRatio(id, r)
        }
    }

    /** מיקום הקו המפריד כחלק מגובה המסך (רק במצב לאורך) */
    fun currentRatio(): Float? {
        val (w, h) = svc.screenSize()
        if (w > h) return null
        val d = svc.dividerRect() ?: return null
        return d.exactCenterY() / h
    }

    /** גורר את הקו המפריד ליחס שנשמר. לקרוא מ-thread רקע. */
    fun restoreRatio(target: Float) {
        val (w, h) = svc.screenSize()
        if (w > h) return
        val d = svc.dividerRect() ?: return
        val current = d.exactCenterY() / h
        if (abs(current - target) < 0.025f) return
        val x = d.exactCenterX()
        val y0 = d.exactCenterY()
        val y1 = (target * h).coerceIn(h * 0.12f, h * 0.88f)
        val hold = Path().apply { moveTo(x, y0) }
        val first = GestureDescription.StrokeDescription(hold, 0, 280, true)
        if (!svc.gestureAndWait(GestureDescription.Builder().addStroke(first).build())) return
        val move = Path().apply {
            moveTo(x, y0)
            lineTo(x, y1)
        }
        val second = first.continueStroke(move, 0, 700, false)
        svc.gestureAndWait(GestureDescription.Builder().addStroke(second).build())
    }

    /** לחיצה כפולה על הקו המפריד – מחליפה בין העליון לתחתון */
    fun swapByDoubleTap() {
        val d = svc.dividerRect() ?: return
        val x = d.exactCenterX()
        val y = d.exactCenterY()
        val p = Path().apply { moveTo(x, y) }
        val g = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(p, 0, 40))
            .addStroke(GestureDescription.StrokeDescription(Path().apply { moveTo(x, y) }, 140, 40))
            .build()
        svc.gestureAndWait(g)
    }
}
