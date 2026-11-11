package com.yaniv.duopilot.pairs

import android.graphics.Rect
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityWindowInfo
import com.yaniv.duopilot.BuildConfig
import com.yaniv.duopilot.agent.Actions
import com.yaniv.duopilot.service.PilotService
import java.io.File
import java.util.ArrayDeque

/**
 * לחיצות במסך "האפליקציות האחרונות" של המערכת – בדיוק מה שעושים ביד כדי לפצל מסך:
 * לוחצים על האייקון של האפליקציה ← "מסך מפוצל" ← בוחרים את האפליקציה השנייה.
 * עובד גם בסמסונג ("פתח בתצוגת מסך מפוצל") וגם בפיקסל ("Split screen").
 */
object RecentsUi {
    private val SPLIT_WORDS = listOf("split", "מפוצל", "פיצול", "מפוצלת", "multi window", "ריבוי חלונות")
    private val TOP_WORDS = listOf("top", "למעלה", "עליון", "left", "שמאל")

    class Hit(val node: AccessibilityNodeInfo, val bounds: Rect, val text: String)

    private fun clean(cs: CharSequence?) = cs?.toString()?.replace(Regex("\\s+"), " ")?.trim().orEmpty()

    /** כל הצמתים הגלויים בחלונות של אפליקציות אחרות (לא DuoPilot) */
    private fun forEachNode(svc: PilotService, block: (AccessibilityNodeInfo, Rect, String) -> Unit) {
        for (w in svc.windowsSafe()) {
            if (w.type != AccessibilityWindowInfo.TYPE_APPLICATION && w.type != AccessibilityWindowInfo.TYPE_SYSTEM) continue
            val root = try {
                w.root
            } catch (e: Exception) {
                null
            } ?: continue
            if (root.packageName?.toString() == svc.packageName) continue
            val q = ArrayDeque<AccessibilityNodeInfo>()
            q.add(root)
            var visited = 0
            while (q.isNotEmpty() && visited < 2500) {
                val n = q.removeFirst()
                visited++
                if (!n.isVisibleToUser) continue
                val r = Rect()
                n.getBoundsInScreen(r)
                val label = listOf(clean(n.text), clean(n.contentDescription)).filter { it.isNotEmpty() }.joinToString(" | ")
                block(n, r, label)
                for (i in 0 until n.childCount) {
                    val c = try {
                        n.getChild(i)
                    } catch (e: Exception) {
                        null
                    } ?: continue
                    q.add(c)
                }
            }
        }
    }

    /**
     * מוצא את הכרטיס/האייקון של אפליקציה לפי השם שלה.
     * smallest=true → האייקון (פותח תפריט); false → הכרטיס הגדול (בוחר את האפליקציה).
     */
    fun findLabel(svc: PilotService, label: String, smallest: Boolean): Hit? {
        val want = AppCatalog.normalize(label)
        if (want.isEmpty()) return null
        val exact = ArrayList<Hit>()
        val partial = ArrayList<Hit>()
        forEachNode(svc) { n, r, text ->
            if (r.isEmpty || text.isEmpty()) return@forEachNode
            val parts = text.split(" | ").map { AppCatalog.normalize(it) }
            when {
                parts.any { it == want } -> exact.add(Hit(n, r, text))
                parts.any { it.contains(want) && it.length <= want.length + 14 } -> partial.add(Hit(n, r, text))
            }
        }
        val list = exact.ifEmpty { partial }
        if (list.isEmpty()) return null
        val area = { h: Hit -> h.bounds.width().toLong() * h.bounds.height() }
        return if (smallest) list.minByOrNull(area) else list.maxByOrNull(area)
    }

    /** פריט "מסך מפוצל" בתפריט (אם יש כמה – עדיפות ל"למעלה") */
    fun findSplitItem(svc: PilotService): Hit? {
        val hits = ArrayList<Hit>()
        forEachNode(svc) { n, r, text ->
            if (r.isEmpty || text.isEmpty() || text.length > 60) return@forEachNode
            val low = text.lowercase()
            if (SPLIT_WORDS.any { low.contains(it) }) hits.add(Hit(n, r, text))
        }
        if (hits.isEmpty()) return null
        return hits.firstOrNull { h -> TOP_WORDS.any { h.text.lowercase().contains(it) } } ?: hits.first()
    }

    /** לחיצה: על הרכיב הלחיץ הקרוב, ואם אין – נגיעה במרכז */
    fun click(svc: PilotService, hit: Hit): Boolean {
        var n: AccessibilityNodeInfo? = hit.node
        var depth = 0
        while (n != null && depth < 6) {
            if (n.isClickable && n.isEnabled) {
                if (n.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return true
                break
            }
            n = n.parent
            depth++
        }
        return Actions.tapAt(svc, hit.bounds.exactCenterX(), hit.bounds.exactCenterY())
    }

    /** בגרסת בדיקה בלבד: כותב את כל מה שרואים על המסך לקובץ, כדי להבין מה קרה */
    fun debugDump(svc: PilotService, step: String) {
        if (!BuildConfig.DEBUG) return
        val sb = StringBuilder("\n===== ").append(step).append(" split=").append(svc.isSplitActive()).append('\n')
        for (w in svc.windowsSafe()) {
            val r = Rect()
            w.getBoundsInScreen(r)
            sb.append("window type=").append(w.type).append(' ').append(r).append(' ')
                .append(try { w.root?.packageName } catch (e: Exception) { null }).append('\n')
        }
        var lines = 0
        forEachNode(svc) { n, r, text ->
            if (lines > 400) return@forEachNode
            if (text.isEmpty() && !n.isClickable) return@forEachNode
            sb.append("  ").append(if (n.isClickable) "[c] " else "    ").append(n.className).append(' ')
                .append('"').append(text.take(80)).append("\" ").append(r).append(' ')
                .append(n.viewIdResourceName ?: "").append('\n')
            lines++
        }
        try {
            File(svc.filesDir, "split-log.txt").appendText(sb.toString())
        } catch (_: Exception) {
        }
    }
}
