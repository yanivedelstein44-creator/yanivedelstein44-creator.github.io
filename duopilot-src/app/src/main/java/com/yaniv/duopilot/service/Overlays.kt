package com.yaniv.duopilot.service

import android.animation.ValueAnimator
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.TextUtils
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.yaniv.duopilot.App
import com.yaniv.duopilot.Bg
import com.yaniv.duopilot.Prefs
import com.yaniv.duopilot.R
import kotlin.math.hypot
import kotlin.math.roundToInt

/**
 * מה שמוצג מעל כל האפליקציות (חלונות נגישות – לא צריך הרשאת "הצגה מעל אפליקציות"):
 * בועת המיקרופון הצפה, וכרטיס סטטוס קטן של העוזר הקולי.
 */
class Overlays(private val svc: PilotService) {
    enum class Mode { IDLE, LISTENING, THINKING }

    private val wm = svc.getSystemService(WindowManager::class.java)
    private var bubble: FrameLayout? = null
    private var bubbleLp: WindowManager.LayoutParams? = null
    private var bubbleBg: GradientDrawable? = null
    private var pulse: ValueAnimator? = null
    private var panel: LinearLayout? = null
    private var panelLp: WindowManager.LayoutParams? = null
    private var statusView: TextView? = null
    private var textView: TextView? = null
    private val hideRunnable = Runnable { hidePanelNow() }

    var panelHasMessage = false
        private set

    private fun dp(v: Int) = (v * svc.resources.displayMetrics.density).roundToInt()

    // ------------------------------------------------------------------ בועה

    fun showBubble() = Bg.ui {
        if (bubble != null) return@ui
        val prefs = Prefs(svc)
        val size = dp(54)
        val (sw, sh) = svc.screenSize()
        val bg = GradientDrawable(GradientDrawable.Orientation.TL_BR, IDLE_COLORS).apply {
            shape = GradientDrawable.OVAL
            setStroke(dp(2), 0x66FFFFFF)
        }
        val frame = FrameLayout(svc).apply {
            background = bg
            alpha = BUBBLE_ALPHA
            contentDescription = "DuoPilot – פקודה קולית"
        }
        val icon = ImageView(svc).apply {
            setImageResource(R.drawable.ic_mic)
            setColorFilter(Color.WHITE)
        }
        frame.addView(icon, FrameLayout.LayoutParams(dp(26), dp(26), Gravity.CENTER))
        val lp = WindowManager.LayoutParams(
            size, size,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.LEFT
            x = if (prefs.bubbleX >= 0) prefs.bubbleX.coerceIn(0, sw - size) else sw - size - dp(6)
            y = if (prefs.bubbleY >= 0) prefs.bubbleY.coerceIn(0, sh - size) else (sh * 0.42f).toInt()
        }
        frame.setOnTouchListener(BubbleTouch(lp, size))
        try {
            wm.addView(frame, lp)
        } catch (e: Exception) {
            Log.w(App.TAG, "bubble", e)
            return@ui
        }
        bubble = frame
        bubbleLp = lp
        bubbleBg = bg
    }

    fun hideBubble() = Bg.ui {
        pulse?.cancel()
        pulse = null
        bubble?.let {
            try {
                wm.removeView(it)
            } catch (_: Exception) {
            }
        }
        bubble = null
        bubbleLp = null
        bubbleBg = null
    }

    fun setMode(mode: Mode) = Bg.ui {
        val bg = bubbleBg ?: return@ui
        pulse?.cancel()
        pulse = null
        bubble?.scaleX = 1f
        bubble?.scaleY = 1f
        when (mode) {
            Mode.IDLE -> bg.colors = IDLE_COLORS
            Mode.THINKING -> bg.colors = intArrayOf(0xFFFBBF24.toInt(), 0xFFF59E0B.toInt())
            Mode.LISTENING -> {
                bg.colors = intArrayOf(0xFFF87171.toInt(), 0xFFDC2626.toInt())
                pulse = ValueAnimator.ofFloat(1f, 1.14f).apply {
                    duration = 520
                    repeatMode = ValueAnimator.REVERSE
                    repeatCount = ValueAnimator.INFINITE
                    addUpdateListener { a ->
                        val s = a.animatedValue as Float
                        bubble?.scaleX = s
                        bubble?.scaleY = s
                    }
                    start()
                }
            }
        }
    }

    private inner class BubbleTouch(private val lp: WindowManager.LayoutParams, private val size: Int) : View.OnTouchListener {
        private var downX = 0f
        private var downY = 0f
        private var startX = 0
        private var startY = 0
        private var dragging = false
        private var longFired = false
        private val slop = ViewConfiguration.get(svc).scaledTouchSlop
        private val longPress = Runnable {
            longFired = true
            svc.onBubbleLongPress()
        }

        override fun onTouch(v: View, e: MotionEvent): Boolean {
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downX = e.rawX
                    downY = e.rawY
                    startX = lp.x
                    startY = lp.y
                    dragging = false
                    longFired = false
                    v.postDelayed(longPress, 650)
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = e.rawX - downX
                    val dy = e.rawY - downY
                    if (!dragging && hypot(dx, dy) > slop) {
                        dragging = true
                        v.removeCallbacks(longPress)
                    }
                    if (dragging) {
                        lp.x = startX + dx.toInt()
                        lp.y = startY + dy.toInt()
                        try {
                            wm.updateViewLayout(v, lp)
                        } catch (_: Exception) {
                        }
                    }
                }
                MotionEvent.ACTION_UP -> {
                    v.removeCallbacks(longPress)
                    if (dragging) snap(v) else if (!longFired) {
                        v.performClick()
                        svc.onBubbleTap()
                    }
                }
                MotionEvent.ACTION_CANCEL -> {
                    v.removeCallbacks(longPress)
                    if (dragging) snap(v)
                }
            }
            return true
        }

        private fun snap(v: View) {
            val (sw, sh) = svc.screenSize()
            lp.x = if (lp.x + size / 2 < sw / 2) dp(6) else sw - size - dp(6)
            lp.y = lp.y.coerceIn(dp(40), sh - size - dp(60))
            try {
                wm.updateViewLayout(v, lp)
            } catch (_: Exception) {
            }
            val prefs = Prefs(svc)
            prefs.bubbleX = lp.x
            prefs.bubbleY = lp.y
        }
    }

    // ------------------------------------------------------------------ כרטיס סטטוס

    fun showPanel(status: String, text: String?) = Bg.ui {
        ensurePanel()
        Bg.main.removeCallbacks(hideRunnable)
        statusView?.text = status
        if (text != null) {
            textView?.text = text
            textView?.visibility = View.VISIBLE
        }
        panelHasMessage = false
    }

    fun setStatus(status: String) = Bg.ui {
        ensurePanel()
        Bg.main.removeCallbacks(hideRunnable)
        statusView?.text = status
    }

    fun setText(text: String) = Bg.ui {
        ensurePanel()
        textView?.text = text
        textView?.visibility = View.VISIBLE
    }

    fun finishPanel(text: String, autoHideMs: Long = 6500) = Bg.ui {
        ensurePanel()
        statusView?.text = "DuoPilot"
        textView?.text = text
        textView?.visibility = View.VISIBLE
        panelHasMessage = true
        Bg.main.removeCallbacks(hideRunnable)
        Bg.main.postDelayed(hideRunnable, autoHideMs)
    }

    fun hidePanel(delayMs: Long = 0) = Bg.ui {
        Bg.main.removeCallbacks(hideRunnable)
        if (delayMs <= 0) hidePanelNow() else Bg.main.postDelayed(hideRunnable, delayMs)
    }

    private fun hidePanelNow() {
        panel?.let {
            try {
                wm.removeView(it)
            } catch (_: Exception) {
            }
        }
        panel = null
        panelLp = null
        statusView = null
        textView = null
        panelHasMessage = false
    }

    private fun ensurePanel() {
        if (panel != null) return
        val (sw, _) = svc.screenSize()
        val card = LinearLayout(svc).apply {
            orientation = LinearLayout.VERTICAL
            layoutDirection = View.LAYOUT_DIRECTION_RTL
            setPadding(dp(16), dp(10), dp(16), dp(12))
            background = GradientDrawable().apply {
                cornerRadius = dp(18).toFloat()
                setColor(0xF2121A2A.toInt())
                setStroke(dp(1), 0x554F8CFF)
            }
        }
        val row = LinearLayout(svc).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val status = TextView(svc).apply {
            setTextColor(0xFF9FD8FF.toInt())
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
        }
        val close = TextView(svc).apply {
            text = "✕"
            setTextColor(0xFFCBD5E1.toInt())
            textSize = 17f
            setPadding(dp(14), dp(2), dp(4), dp(2))
            contentDescription = "סגור"
            setOnClickListener { svc.cancelSession(null) }
        }
        row.addView(status, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        row.addView(close)
        val text = TextView(svc).apply {
            setTextColor(Color.WHITE)
            textSize = 16f
            maxLines = 4
            ellipsize = TextUtils.TruncateAt.END
            setPadding(0, dp(4), 0, 0)
            visibility = View.GONE
        }
        card.addView(row)
        card.addView(text)
        val lp = WindowManager.LayoutParams(
            sw - dp(24), ViewGroup.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            y = dp(90)
        }
        try {
            wm.addView(card, lp)
        } catch (e: Exception) {
            Log.w(App.TAG, "panel", e)
            return
        }
        panel = card
        panelLp = lp
        statusView = status
        textView = text
    }

    /** מסתיר זמנית את הבועה והכרטיס (לצילום מסך ולמחוות), כדי שלא יסתירו או יחסמו לחיצה */
    fun hideForCapture(hide: Boolean) = Bg.ui {
        val pairs = listOf<Pair<View?, WindowManager.LayoutParams?>>(bubble to bubbleLp, panel to panelLp)
        for ((v, lp) in pairs) {
            if (v == null || lp == null) continue
            v.alpha = if (hide) 0f else if (v === bubble) BUBBLE_ALPHA else 1f
            lp.flags = if (hide) lp.flags or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
            else lp.flags and WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE.inv()
            try {
                wm.updateViewLayout(v, lp)
            } catch (_: Exception) {
            }
        }
    }

    fun destroy() {
        hideBubble()
        hidePanel()
    }

    companion object {
        private const val BUBBLE_ALPHA = 0.92f
        private val IDLE_COLORS = intArrayOf(0xFF2DD4BF.toInt(), 0xFF4F8CFF.toInt())
    }
}
