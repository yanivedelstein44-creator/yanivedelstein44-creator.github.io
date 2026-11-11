package com.yaniv.duopilot.agent

import android.accessibilityservice.AccessibilityService
import android.graphics.Bitmap
import android.graphics.Rect
import android.os.SystemClock
import android.util.Base64
import android.view.Display
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityWindowInfo
import com.yaniv.duopilot.Bg
import com.yaniv.duopilot.browser.BrowserRegistry
import com.yaniv.duopilot.pairs.AppCatalog
import com.yaniv.duopilot.service.PilotService
import java.io.ByteArrayOutputStream
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.math.max
import kotlin.math.roundToInt

/** רכיב על המסך שהעוזר יכול ללחוץ עליו או לקרוא אותו */
class Element(
    val id: Int,
    val node: AccessibilityNodeInfo,
    val bounds: Rect,
    val label: String,
    val kind: String,
    val where: String,
) {
    fun short(): String = label.take(40).ifEmpty { kind }
}

/** "תמונת מצב" של המסך לצעד אחד של העוזר */
class ScreenState(
    val elements: List<Element>,
    val windowsText: String,
    val elementsText: String,
    val screenW: Int,
    val screenH: Int,
    val shotB64: String?,
    val shotW: Int,
    val shotH: Int,
    val splitActive: Boolean,
) {
    fun byId(id: Int): Element? = elements.firstOrNull { it.id == id }

    /** קואורדינטות בתמונה המוקטנת → קואורדינטות במסך */
    fun imageToScreen(x: Int, y: Int): Pair<Float, Float>? {
        if (shotB64 == null || shotW <= 0 || shotH <= 0) return null
        return (x.toFloat() * screenW / shotW) to (y.toFloat() * screenH / shotH)
    }

    fun describe(): String =
        "Screen ${screenW}x$screenH" + (if (splitActive) " (split screen is ON)" else "") +
            "\nWindows:\n" + windowsText.ifEmpty { "(none)\n" } +
            "Elements:\n" + elementsText.ifEmpty { "(no readable elements)\n" }
}

object ScreenReader {
    private const val MAX_ELEMENTS = 320

    fun capture(svc: PilotService, includeScreenshot: Boolean): ScreenState {
        val (sw, sh) = svc.screenSize()
        val screen = Rect(0, 0, sw, sh)
        val split = svc.isSplitActive()
        val windows = svc.windowsSafe().sortedWith(compareBy<AccessibilityWindowInfo>({ order(it.type) }, { boundsOf(it).top }))
        val appWins = max(1, windows.count { it.type == AccessibilityWindowInfo.TYPE_APPLICATION })
        val elements = ArrayList<Element>()
        val wsb = StringBuilder()
        val esb = StringBuilder()
        for (w in windows) {
            val r = boundsOf(w)
            val tag = tagFor(w, r, sw, sh) ?: continue
            val root = try {
                w.root
            } catch (e: Exception) {
                null
            } ?: continue
            val pkg = root.packageName?.toString() ?: ""
            wsb.append("- ").append(tag).append(": ").append(describeApp(svc, pkg, r))
                .append(" [").append(r.left).append(',').append(r.top).append('-').append(r.right).append(',').append(r.bottom).append(']')
            if (w.isFocused) wsb.append(" (focused)")
            wsb.append('\n')
            val budget = if (w.type == AccessibilityWindowInfo.TYPE_APPLICATION) MAX_ELEMENTS / appWins else 70
            walk(root, tag, screen, elements, esb, elements.size + budget, insideClickable = false, depth = 0)
        }
        var shot: String? = null
        var shotW = 0
        var shotH = 0
        if (includeScreenshot) {
            val bmp = Screenshot.take(svc)
            if (bmp != null) {
                val scaled = scale(bmp, 1280)
                shot = toJpegB64(scaled, 70)
                shotW = scaled.width
                shotH = scaled.height
                if (scaled !== bmp) scaled.recycle()
                bmp.recycle()
            }
        }
        return ScreenState(elements, wsb.toString(), esb.toString(), sw, sh, shot, shotW, shotH, split)
    }

    private fun order(type: Int) = when (type) {
        AccessibilityWindowInfo.TYPE_APPLICATION -> 0
        AccessibilityWindowInfo.TYPE_INPUT_METHOD -> 1
        else -> 2
    }

    private fun boundsOf(w: AccessibilityWindowInfo): Rect = Rect().also { w.getBoundsInScreen(it) }

    private fun tagFor(w: AccessibilityWindowInfo, r: Rect, sw: Int, sh: Int): String? = when (w.type) {
        AccessibilityWindowInfo.TYPE_APPLICATION -> position(r, sw, sh)
        AccessibilityWindowInfo.TYPE_INPUT_METHOD -> "KEYBOARD"
        // פס הסטטוס ופס הניווט – לא. מגירת ההתראות או חלון מערכת גדול – כן.
        AccessibilityWindowInfo.TYPE_SYSTEM -> if (r.height() > sh * 0.25) "SYSTEM" else null
        else -> null
    }

    private fun position(r: Rect, sw: Int, sh: Int): String {
        val portrait = sh >= sw
        if (r.width() >= sw * 0.9 && r.height() >= sh * 0.85) return "FULL"
        if (portrait && r.width() >= sw * 0.9) return if (r.centerY() < sh / 2) "TOP" else "BOTTOM"
        if (!portrait && r.height() >= sh * 0.8) return if (r.centerX() < sw / 2) "LEFT" else "RIGHT"
        return "POPUP"
    }

    private fun describeApp(svc: PilotService, pkg: String, r: Rect): String {
        if (pkg == svc.packageName) {
            val browser = BrowserRegistry.slotAt(r)
            return if (browser != null) BrowserRegistry.describe(browser) else "DuoPilot (this assistant's own settings app)"
        }
        return "${AppCatalog.label(svc, pkg)} ($pkg)"
    }

    private fun clean(cs: CharSequence?): String {
        if (cs == null) return ""
        return cs.toString().replace(Regex("\\s+"), " ").trim()
    }

    private fun walk(
        n: AccessibilityNodeInfo,
        tag: String,
        screen: Rect,
        out: MutableList<Element>,
        sb: StringBuilder,
        limit: Int,
        insideClickable: Boolean,
        depth: Int,
    ) {
        if (out.size >= limit || depth > 45) return
        if (!n.isVisibleToUser) return
        val r = Rect()
        n.getBoundsInScreen(r)
        if (r.isEmpty || !Rect.intersects(r, screen)) return
        val text = clean(n.text)
        val desc = clean(n.contentDescription)
        val hint = clean(n.hintText)
        val state = clean(n.stateDescription)
        val clickable = n.isClickable || n.isLongClickable
        val editable = n.isEditable
        val checkable = n.isCheckable
        val scrollable = n.isScrollable
        val interactive = clickable || editable || checkable
        var label = when {
            text.isNotEmpty() && desc.isNotEmpty() && desc != text -> "$text | $desc"
            text.isNotEmpty() -> text
            else -> desc
        }
        if (interactive && !editable) {
            val kids = childText(n, 3, label)
            if (kids.isNotEmpty()) label = if (label.isEmpty()) kids else "$label · $kids"
        }
        val emit = interactive || scrollable || (label.isNotEmpty() && !insideClickable)
        if (emit) {
            val cls = n.className?.toString() ?: ""
            val kind = when {
                editable -> "input"
                checkable -> if (cls.contains("Switch")) "switch" else "checkbox"
                clickable -> if (cls.contains("Button") || cls.contains("Image")) "button" else "item"
                scrollable -> "list"
                else -> "text"
            }
            val id = out.size + 1
            out.add(Element(id, n, r, label, kind, tag))
            sb.append('[').append(id).append("] ").append(tag).append(' ').append(kind)
            if (label.isNotEmpty()) sb.append(" \"").append(label.take(120).replace('"', '\'')).append('"')
            if (editable) {
                if (text.isEmpty() && hint.isNotEmpty()) sb.append(" hint=\"").append(hint.take(60).replace('"', '\'')).append('"')
                if (text.isEmpty()) sb.append(" (empty)")
                if (n.isFocused) sb.append(" (focused)")
            }
            if (checkable) sb.append(if (n.isChecked) " (on)" else " (off)")
            if (n.isSelected) sb.append(" (selected)")
            if (!n.isEnabled) sb.append(" (disabled)")
            if (state.isNotEmpty() && !checkable) sb.append(" state=\"").append(state.take(40)).append('"')
            if (scrollable && kind != "list") sb.append(" (scrollable)")
            sb.append(" @").append(r.centerX()).append(',').append(r.centerY())
            sb.append(' ').append(r.width()).append('x').append(r.height()).append('\n')
        }
        val inside = insideClickable || (clickable && !scrollable)
        for (i in 0 until n.childCount) {
            val c = try {
                n.getChild(i)
            } catch (e: Exception) {
                null
            } ?: continue
            walk(c, tag, screen, out, sb, limit, inside, depth + 1)
        }
    }

    /** טקסטים של ילדים לא-לחיצים, כדי לתת שם לכפתור/פריט בלי טקסט משלו */
    private fun childText(n: AccessibilityNodeInfo, max: Int, exclude: String): String {
        val parts = ArrayList<String>()
        fun rec(x: AccessibilityNodeInfo, d: Int) {
            if (parts.size >= max || d > 5) return
            for (i in 0 until x.childCount) {
                val c = try {
                    x.getChild(i)
                } catch (e: Exception) {
                    null
                } ?: continue
                if (!c.isVisibleToUser) continue
                if (c.isClickable || c.isEditable || c.isCheckable) continue
                val t = clean(c.text).ifEmpty { clean(c.contentDescription) }
                if (t.isNotEmpty() && t != exclude && t !in parts) parts.add(t.take(60))
                if (parts.size >= max) return
                rec(c, d + 1)
            }
        }
        rec(n, 0)
        return parts.joinToString(" · ")
    }

    private fun scale(b: Bitmap, maxSide: Int): Bitmap {
        val m = max(b.width, b.height)
        if (m <= maxSide) return b
        val f = maxSide.toFloat() / m
        return Bitmap.createScaledBitmap(b, (b.width * f).roundToInt(), (b.height * f).roundToInt(), true)
    }

    private fun toJpegB64(b: Bitmap, quality: Int): String {
        val bos = ByteArrayOutputStream()
        b.compress(Bitmap.CompressFormat.JPEG, quality, bos)
        return Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP)
    }
}

/** צילום מסך דרך שירות הנגישות (Android 11+), בלי הבועה והכרטיס של DuoPilot */
object Screenshot {
    @Volatile
    private var lastAt = 0L

    fun take(svc: PilotService): Bitmap? {
        val wait = 1100 - (SystemClock.uptimeMillis() - lastAt)
        if (wait > 0) Bg.sleep(wait)
        svc.overlays.hideForCapture(true)
        Bg.sleep(90)
        val latch = CountDownLatch(1)
        var out: Bitmap? = null
        try {
            svc.takeScreenshot(Display.DEFAULT_DISPLAY, svc.mainExecutor, object : AccessibilityService.TakeScreenshotCallback {
                override fun onSuccess(result: AccessibilityService.ScreenshotResult) {
                    try {
                        val hb = result.hardwareBuffer
                        val hw = Bitmap.wrapHardwareBuffer(hb, result.colorSpace)
                        out = hw?.copy(Bitmap.Config.ARGB_8888, false)
                        hw?.recycle()
                        hb.close()
                    } catch (_: Exception) {
                    } finally {
                        latch.countDown()
                    }
                }

                override fun onFailure(errorCode: Int) {
                    latch.countDown()
                }
            })
        } catch (e: Exception) {
            latch.countDown()
        }
        latch.await(3, TimeUnit.SECONDS)
        lastAt = SystemClock.uptimeMillis()
        svc.overlays.hideForCapture(false)
        return out
    }
}
