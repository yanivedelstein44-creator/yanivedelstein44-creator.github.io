package com.yaniv.duopilot.agent

import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.graphics.Rect
import android.os.Bundle
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityNodeInfo.AccessibilityAction
import com.yaniv.duopilot.Bg
import com.yaniv.duopilot.service.PilotService

/** הפעולות שהעוזר עושה על המסך: לחיצה, לחיצה ארוכה, הקלדה, גלילה. */
object Actions {

    private fun fresh(node: AccessibilityNodeInfo): Boolean = try {
        node.refresh()
    } catch (e: Exception) {
        false
    }

    /** לחיצה: קודם "לחיצת נגישות" על הרכיב (או על ההורה הלחיץ שלו), ואם אין – נגיעה במרכז שלו */
    fun tap(svc: PilotService, e: Element): String {
        val node = e.node
        if (fresh(node)) {
            var n: AccessibilityNodeInfo? = node
            var depth = 0
            while (n != null && depth < 5) {
                if (n.isClickable && n.isEnabled) {
                    if (n.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return "clicked"
                    break
                }
                n = n.parent
                depth++
            }
        }
        return if (tapAt(svc, e.bounds.exactCenterX(), e.bounds.exactCenterY())) "tapped by touch gesture" else "tap failed"
    }

    fun longPress(svc: PilotService, e: Element): String {
        val node = e.node
        if (fresh(node)) {
            var n: AccessibilityNodeInfo? = node
            var depth = 0
            while (n != null && depth < 4) {
                if (n.isLongClickable && n.performAction(AccessibilityNodeInfo.ACTION_LONG_CLICK)) return "long-pressed"
                n = n.parent
                depth++
            }
        }
        return if (tapAt(svc, e.bounds.exactCenterX(), e.bounds.exactCenterY(), 800)) "long-pressed by touch gesture" else "long press failed"
    }

    fun tapAt(svc: PilotService, x: Float, y: Float, durationMs: Long = 60): Boolean {
        val p = Path().apply { moveTo(x.coerceAtLeast(1f), y.coerceAtLeast(1f)) }
        val g = GestureDescription.Builder().addStroke(GestureDescription.StrokeDescription(p, 0, durationMs)).build()
        return svc.gestureAndWait(g)
    }

    fun swipe(svc: PilotService, x1: Float, y1: Float, x2: Float, y2: Float, durationMs: Long = 380): Boolean {
        val p = Path().apply {
            moveTo(x1.coerceAtLeast(1f), y1.coerceAtLeast(1f))
            lineTo(x2.coerceAtLeast(1f), y2.coerceAtLeast(1f))
        }
        val g = GestureDescription.Builder().addStroke(GestureDescription.StrokeDescription(p, 0, durationMs)).build()
        return svc.gestureAndWait(g)
    }

    fun typeText(svc: PilotService, e: Element?, text: String, submit: Boolean): String {
        var node: AccessibilityNodeInfo? = e?.node?.takeIf { fresh(it) }
        if (node == null || !node.isEditable) {
            val focused = try {
                svc.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
            } catch (ex: Exception) {
                null
            }
            if (focused != null && focused.isEditable) node = focused
        }
        if (node == null) return "error: no input field"
        if (!node.isEditable) {
            // אולי זה שדה חיפוש שצריך ללחוץ עליו כדי שייפתח
            node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            Bg.sleep(500)
            val focused = svc.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
            if (focused == null || !focused.isEditable) return "error: that element is not a text field (tapped it; look for the input now)"
            node = focused
        }
        if (!node.isFocused) {
            node.performAction(AccessibilityNodeInfo.ACTION_FOCUS)
            node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            Bg.sleep(250)
        }
        val args = Bundle().apply { putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text) }
        if (!node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)) return "error: could not type into this field"
        if (!submit) return "typed"
        Bg.sleep(250)
        fresh(node)
        val sent = node.performAction(AccessibilityAction.ACTION_IME_ENTER.id)
        return if (sent) "typed and pressed enter" else "typed (enter is not supported here – tap the send/search button)"
    }

    private fun nearestScrollable(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        var n: AccessibilityNodeInfo? = node
        var depth = 0
        while (n != null && depth < 10) {
            if (n.isScrollable) return n
            n = n.parent
            depth++
        }
        return null
    }

    fun scroll(svc: PilotService, screen: ScreenState, e: Element?, dir: String): String {
        val target: AccessibilityNodeInfo? = (e?.node?.takeIf { fresh(it) }?.let { nearestScrollable(it) })
            ?: screen.elements.filter { it.kind == "list" }.maxByOrNull { it.bounds.width().toLong() * it.bounds.height() }?.node
        if (target != null && fresh(target)) {
            val directional = when (dir) {
                "up" -> AccessibilityAction.ACTION_SCROLL_UP
                "left" -> AccessibilityAction.ACTION_SCROLL_LEFT
                "right" -> AccessibilityAction.ACTION_SCROLL_RIGHT
                else -> AccessibilityAction.ACTION_SCROLL_DOWN
            }
            if (target.actionList.any { it.id == directional.id } && target.performAction(directional.id)) return "scrolled $dir"
            val generic = if (dir == "down" || dir == "right") AccessibilityNodeInfo.ACTION_SCROLL_FORWARD else AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
            if (target.performAction(generic)) return "scrolled $dir"
        }
        // בלי רשימה מתאימה: החלקה עם "אצבע" בתוך הרכיב (או באמצע המסך)
        val r = Rect()
        if (target != null) target.getBoundsInScreen(r) else if (e != null) r.set(e.bounds) else r.set(0, screen.screenH / 4, screen.screenW, screen.screenH * 3 / 4)
        val cx = r.exactCenterX()
        val cy = r.exactCenterY()
        val dx = r.width() * 0.3f
        val dy = r.height() * 0.3f
        val ok = when (dir) {
            "up" -> swipe(svc, cx, cy - dy, cx, cy + dy)
            "left" -> swipe(svc, cx - dx, cy, cx + dx, cy)
            "right" -> swipe(svc, cx + dx, cy, cx - dx, cy)
            else -> swipe(svc, cx, cy + dy, cx, cy - dy)
        }
        return if (ok) "scrolled $dir (swipe)" else "scroll failed"
    }
}
