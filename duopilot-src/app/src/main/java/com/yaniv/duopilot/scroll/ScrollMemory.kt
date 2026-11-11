package com.yaniv.duopilot.scroll

import android.content.Context
import android.graphics.Rect
import android.os.Handler
import android.os.HandlerThread
import android.os.SystemClock
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.yaniv.duopilot.App
import com.yaniv.duopilot.Bg
import com.yaniv.duopilot.Prefs
import com.yaniv.duopilot.pairs.PairStore
import com.yaniv.duopilot.service.PilotService
import org.json.JSONArray
import org.json.JSONObject
import java.util.ArrayDeque

/**
 * זיכרון גלילה לאפליקציות של אחרים (וואטסאפ, כרום, יוטיוב...).
 * אין דרך "לשמור מספר גלילה" באפליקציה של מישהו אחר, אז שומרים "עוגן": הטקסטים של הפריטים
 * הראשונים שרואים ברשימה כשהפסקת לגלול. בפתיחה הבאה גוללים קדימה עד שהעוגן מופיע שוב.
 * אם לא מוצאים אותו – חוזרים לאיפה שהיינו. הכול נשמר רק בטלפון.
 * עובד רק לאפליקציות שנמצאות באחד הצמדים.
 */
class ScrollMemory(private val svc: PilotService) {
    private val sp = svc.getSharedPreferences("scroll_memory", Context.MODE_PRIVATE)
    private val thread = HandlerThread("duopilot-scroll").apply { start() }
    private val worker = Handler(thread.looper)
    private val pending = HashMap<String, Runnable>()

    @Volatile
    private var tracked: Set<String> = emptySet()

    @Volatile
    private var restoringPkg: String? = null

    @Volatile
    private var quietUntil = 0L

    /** מתי כל אפליקציה הופיעה לאחרונה – גלילות בשניות הראשונות הן של האפליקציה עצמה, לא שלך */
    private val shownAt = java.util.concurrent.ConcurrentHashMap<String, Long>()

    fun onWindowShown(pkg: String) {
        shownAt[pkg] = SystemClock.uptimeMillis()
    }

    data class Record(
        val viewId: String,
        val cls: String,
        val anchors: List<String>,
        val from: Int,
        val time: Long,
    )

    fun refreshTracked() {
        tracked = PairStore(svc).packagesInPairs()
    }

    /** נקרא על ה-UI thread לכל אירוע גלילה – רק מתזמן, בלי לגעת בעץ (חסכוני) */
    fun onScrolled(e: AccessibilityEvent) {
        val pkg = e.packageName?.toString() ?: return
        if (pkg !in tracked) return
        val now = SystemClock.uptimeMillis()
        if (pkg == restoringPkg || now < quietUntil) return
        if (now - (shownAt[pkg] ?: 0L) < 3500) return
        val from = e.fromIndex
        val cls = e.className?.toString() ?: ""
        pending[pkg]?.let { worker.removeCallbacks(it) }
        val r = Runnable { capture(pkg, from, cls) }
        pending[pkg] = r
        worker.postDelayed(r, 900)
    }

    private fun capture(pkg: String, from: Int, cls: String) {
        try {
            if (!Prefs(svc).rememberScroll) return
            if (pkg == restoringPkg) return
            val roots = svc.rootsOf(pkg)
            if (roots.isEmpty()) return
            val node = findScrollable(roots, null, cls) ?: return
            val anchors = anchorsOf(node)
            if (anchors.isEmpty()) return
            val o = JSONObject()
                .put("viewId", node.viewIdResourceName ?: "")
                .put("cls", node.className?.toString() ?: cls)
                .put("from", from)
                .put("anchors", JSONArray(anchors))
                .put("t", System.currentTimeMillis())
            sp.edit().putString(pkg, o.toString()).apply()
        } catch (e: Exception) {
            Log.w(App.TAG, "scroll capture $pkg", e)
        }
    }

    fun load(pkg: String): Record? {
        val s = sp.getString(pkg, null) ?: return null
        return try {
            val o = JSONObject(s)
            val arr = o.optJSONArray("anchors") ?: JSONArray()
            Record(
                viewId = o.optString("viewId"),
                cls = o.optString("cls"),
                anchors = (0 until arr.length()).map { arr.getString(it) },
                from = o.optInt("from", -1),
                time = o.optLong("t"),
            )
        } catch (e: Exception) {
            null
        }
    }

    fun dumpAll(): String = sp.all.entries.joinToString("\n") { "${it.key} = ${it.value}" }

    /** מחזיר את מיקום הגלילה של אפליקציה. חוסם – לקרוא מ-thread רקע. */
    fun restoreBlocking(pkg: String) {
        val rec = load(pkg) ?: return
        if (rec.anchors.isEmpty()) return
        if (System.currentTimeMillis() - rec.time > 30L * 24 * 3600 * 1000) return
        restoringPkg = pkg
        var forward = 0
        try {
            val deadline = SystemClock.uptimeMillis() + 12_000
            var node: AccessibilityNodeInfo? = null
            var lastSig = ""
            var stuck = 0
            while (SystemClock.uptimeMillis() < deadline) {
                val n = node?.takeIf { it.refresh() } ?: findScrollable(svc.rootsOf(pkg), rec.viewId, rec.cls)
                node = n
                if (n == null) return
                val found = anchorRect(n, rec.anchors)
                if (found != null) {
                    alignToTop(n, found)
                    return
                }
                val sig = anchorsOf(n).joinToString("|")
                if (sig == lastSig) {
                    if (++stuck >= 2) break
                } else {
                    stuck = 0
                }
                lastSig = sig
                if (forward >= 40) break
                if (!n.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD)) break
                forward++
                Bg.sleep(280)
            }
            // לא נמצא: חוזרים לאיפה שהתחלנו, כדי לא להשאיר את הרשימה במקום אקראי
            if (forward > 0) {
                val n = findScrollable(svc.rootsOf(pkg), rec.viewId, rec.cls) ?: return
                repeat(forward) {
                    if (!n.performAction(AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD)) return
                    Bg.sleep(120)
                }
            }
        } catch (e: Exception) {
            Log.w(App.TAG, "scroll restore $pkg", e)
        } finally {
            restoringPkg = null
            quietUntil = SystemClock.uptimeMillis() + 3000
        }
    }

    /** איפה העוגן על המסך (null אם הוא לא גלוי ברשימה) */
    private fun anchorRect(list: AccessibilityNodeInfo, anchors: List<String>): Rect? {
        val lr = Rect()
        list.getBoundsInScreen(lr)
        for (a in anchors.take(2)) {
            val found = try {
                list.findAccessibilityNodeInfosByText(a)
            } catch (e: Exception) {
                emptyList()
            }
            for (f in found) {
                if (!f.isVisibleToUser) continue
                val r = Rect()
                f.getBoundsInScreen(r)
                if (r.top >= lr.top - 4 && r.bottom <= lr.bottom + 4) return r
            }
        }
        return null
    }

    /** העוגן נמצא אבל נמוך – גרירה איטית (בלי "זריקה") שמעלה אותו לראש הרשימה, כמו שהיה */
    private fun alignToTop(list: AccessibilityNodeInfo, anchor: Rect) {
        val lr = Rect()
        list.getBoundsInScreen(lr)
        val delta = anchor.top - lr.top
        if (delta < 80 || delta < lr.height() * 0.2f) return
        val x = lr.exactCenterX()
        val from = (anchor.top + 30).coerceAtMost(lr.bottom - 20)
        val to = (from - delta).coerceAtLeast(lr.top + 10)
        com.yaniv.duopilot.agent.Actions.swipe(svc, x, from.toFloat(), x, to.toFloat(), 1000)
    }

    /** הרשימה שנגללה: לפי מזהה, ואם אין – הרשימה הגלויה הגדולה ביותר (עדיפות לאותו סוג רכיב) */
    private fun findScrollable(roots: List<AccessibilityNodeInfo>, viewId: String?, cls: String?): AccessibilityNodeInfo? {
        if (!viewId.isNullOrEmpty()) {
            for (r in roots) {
                val byId = try {
                    r.findAccessibilityNodeInfosByViewId(viewId)
                } catch (e: Exception) {
                    emptyList()
                }
                byId.firstOrNull { it.isScrollable && it.isVisibleToUser }?.let { return it }
            }
        }
        var best: AccessibilityNodeInfo? = null
        var bestScore = 0L
        val queue = ArrayDeque<AccessibilityNodeInfo>()
        roots.forEach { queue.add(it) }
        var visited = 0
        while (queue.isNotEmpty() && visited < 1500) {
            val n = queue.removeFirst()
            visited++
            if (!n.isVisibleToUser) continue
            if (n.isScrollable) {
                val r = Rect()
                n.getBoundsInScreen(r)
                var score = r.width().toLong() * r.height()
                if (!cls.isNullOrEmpty() && n.className?.toString() == cls) score *= 4
                if (score > bestScore) {
                    best = n
                    bestScore = score
                }
            }
            for (i in 0 until n.childCount) {
                val c = try {
                    n.getChild(i)
                } catch (e: Exception) {
                    null
                } ?: continue
                queue.add(c)
            }
        }
        return best
    }

    /** ב-ScrollView יש בדרך כלל ילד אחד שעוטף הכול – יורדים דרכו עד לרמה שיש בה כמה פריטים */
    private fun itemsContainer(list: AccessibilityNodeInfo): AccessibilityNodeInfo {
        var n = list
        repeat(4) {
            val kids = (0 until n.childCount).mapNotNull {
                try {
                    n.getChild(it)
                } catch (e: Exception) {
                    null
                }
            }.filter { it.isVisibleToUser }
            if (kids.size == 1 && kids[0].childCount > 0) n = kids[0] else return n
        }
        return n
    }

    /** הטקסטים של עד 3 הפריטים הראשונים שגלויים במלואם ברשימה */
    private fun anchorsOf(list: AccessibilityNodeInfo): List<String> {
        val lr = Rect()
        list.getBoundsInScreen(lr)
        val out = ArrayList<String>()
        val container = itemsContainer(list)
        for (i in 0 until container.childCount) {
            val c = try {
                container.getChild(i)
            } catch (e: Exception) {
                null
            } ?: continue
            if (!c.isVisibleToUser) continue
            val r = Rect()
            c.getBoundsInScreen(r)
            if (r.top < lr.top - 2 || r.height() <= 0) continue
            val t = firstText(c, 0) ?: continue
            out.add(t.take(60))
            if (out.size >= 3) break
        }
        return out
    }

    private fun firstText(n: AccessibilityNodeInfo, depth: Int): String? {
        n.text?.toString()?.trim()?.takeIf { usable(it) }?.let { return it }
        n.contentDescription?.toString()?.trim()?.takeIf { usable(it) }?.let { return it }
        if (depth > 6) return null
        for (i in 0 until n.childCount) {
            val c = try {
                n.getChild(i)
            } catch (e: Exception) {
                null
            } ?: continue
            firstText(c, depth + 1)?.let { return it }
        }
        return null
    }

    private fun usable(t: String): Boolean = t.length >= 3 && !NUMBERS.matches(t)

    fun release() {
        thread.quitSafely()
    }

    companion object {
        // שעות, תאריכים ומספרים משתנים כל הזמן – לא מתאימים לעוגן
        private val NUMBERS = Regex("^[\\d\\s:./,\\-+%]+$")
    }
}
