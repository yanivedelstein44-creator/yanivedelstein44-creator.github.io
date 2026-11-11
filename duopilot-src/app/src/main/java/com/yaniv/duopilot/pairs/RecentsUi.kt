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

    /**
     * האייקון של כרטיס האפליקציה (בפיקסל: רכיב בלי שם עם id שנגמר ב-icon, מעל הכרטיס;
     * בסמסונג: האייקון בראש הכרטיס). לחיצה עליו פותחת את התפריט עם "מסך מפוצל".
     */
    fun findCardIcon(svc: PilotService, card: Hit): Hit? {
        val cb = card.bounds
        var best: Hit? = null
        var bestDist = Long.MAX_VALUE
        forEachNode(svc) { n, r, text ->
            if (r.isEmpty || r.width() > cb.width() * 0.6 || r.height() > cb.height() * 0.3) return@forEachNode
            val id = n.viewIdResourceName?.substringAfter(":id/")?.lowercase() ?: ""
            val iconish = id == "icon" || id.endsWith("_icon") || id.startsWith("icon") || id.contains("task_icon") || id.contains("app_icon")
            if (!iconish) return@forEachNode
            if (id.contains("lens") || id.contains("mic") || id == "g_icon") return@forEachNode
            if (r.centerX() < cb.left || r.centerX() > cb.right) return@forEachNode
            if (r.centerY() < cb.top - 260 || r.centerY() > cb.top + 300) return@forEachNode
            val dx = (r.centerX() - cb.centerX()).toLong()
            val dy = (r.centerY() - cb.top).toLong()
            val d = dx * dx + dy * dy
            if (d < bestDist) {
                bestDist = d
                best = Hit(n, r, text.ifEmpty { id })
            }
        }
        return best
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

    @Volatile
    private var launcherPkg: String? = null

    private fun launcher(svc: PilotService): String {
        launcherPkg?.let { return it }
        val home = android.content.Intent(android.content.Intent.ACTION_MAIN).addCategory(android.content.Intent.CATEGORY_HOME)
        val pkg = try {
            svc.packageManager.resolveActivity(home, 0)?.activityInfo?.packageName
        } catch (e: Exception) {
            null
        } ?: ""
        launcherPkg = pkg
        return pkg
    }

    /**
     * יומן אבחון של פתיחת המסך המפוצל (נשמר רק בטלפון, נשלח רק כשלוחצים "שלח דוח תקלות").
     * בגרסה הרגילה נרשם רק מה שעל מסך הבית/האחרונות – לא התוכן של האפליקציות שלך.
     */
    fun debugDump(svc: PilotService, step: String) {
        try {
            val home = launcher(svc)
            val sb = StringBuilder("\n===== ").append(java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.ROOT).format(java.util.Date()))
                .append(' ').append(step).append(" split=").append(svc.isSplitActive()).append('\n')
            for (w in svc.windowsSafe()) {
                val r = Rect()
                w.getBoundsInScreen(r)
                sb.append("window type=").append(w.type).append(' ').append(r).append(' ')
                    .append(try { w.root?.packageName } catch (e: Exception) { null }).append('\n')
            }
            var lines = 0
            for (w in svc.windowsSafe()) {
                val root = try { w.root } catch (e: Exception) { null } ?: continue
                val pkg = root.packageName?.toString() ?: ""
                if (!BuildConfig.DEBUG && pkg != home && !pkg.contains("systemui") && !pkg.contains("launcher")) continue
                val q = ArrayDeque<AccessibilityNodeInfo>()
                q.add(root)
                var visited = 0
                while (q.isNotEmpty() && visited < 1500 && lines < 300) {
                    val n = q.removeFirst()
                    visited++
                    if (!n.isVisibleToUser) continue
                    val r = Rect()
                    n.getBoundsInScreen(r)
                    val text = listOf(clean(n.text), clean(n.contentDescription)).filter { it.isNotEmpty() }.joinToString(" | ")
                    if (text.isNotEmpty() || n.isClickable) {
                        sb.append("  ").append(if (n.isClickable) "[c] " else "    ").append(n.className).append(' ')
                            .append('"').append(text.take(80)).append("\" ").append(r).append(' ')
                            .append(n.viewIdResourceName ?: "").append('\n')
                        lines++
                    }
                    for (i in 0 until n.childCount) {
                        val c = try { n.getChild(i) } catch (e: Exception) { null } ?: continue
                        q.add(c)
                    }
                }
            }
            val f = File(svc.filesDir, "split-log.txt")
            if (f.length() > 400_000) {
                val keep = f.readText().takeLast(150_000)
                f.writeText(keep)
            }
            f.appendText(sb.toString())
        } catch (_: Exception) {
        }
    }
}
