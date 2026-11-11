package com.yaniv.duopilot.pairs

import android.content.Context
import android.content.Intent
import android.graphics.drawable.Drawable
import com.yaniv.duopilot.R
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.max
import kotlin.math.min

data class AppEntry(val pkg: String, val label: String)

/** רשימת האפליקציות המותקנות, שמות, אייקונים וחיפוש לפי שם (עברית או אנגלית). */
object AppCatalog {
    private val labels = ConcurrentHashMap<String, String>()

    @Volatile
    private var cache: List<AppEntry>? = null

    @Volatile
    private var cacheTime = 0L

    fun launchable(ctx: Context): List<AppEntry> {
        val now = System.currentTimeMillis()
        cache?.let { if (now - cacheTime < 60_000) return it }
        val pm = ctx.packageManager
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val list = pm.queryIntentActivities(intent, 0)
            .map { AppEntry(it.activityInfo.packageName, it.loadLabel(pm).toString()) }
            .filter { it.pkg != ctx.packageName }
            .distinctBy { it.pkg }
            .sortedBy { it.label.lowercase(Locale.ROOT) }
        cache = list
        cacheTime = now
        return list
    }

    fun label(ctx: Context, target: String): String = when (target) {
        Targets.BROWSER_A -> "דפדפן DuoPilot"
        Targets.BROWSER_B -> "דפדפן DuoPilot 2"
        else -> labels.getOrPut(target) {
            try {
                val pm = ctx.packageManager
                pm.getApplicationLabel(pm.getApplicationInfo(target, 0)).toString()
            } catch (e: Exception) {
                target
            }
        }
    }

    fun icon(ctx: Context, target: String): Drawable? =
        if (Targets.isBrowser(target)) ctx.getDrawable(R.drawable.ic_globe)
        else try {
            ctx.packageManager.getApplicationIcon(target)
        } catch (e: Exception) {
            null
        }

    fun isAvailable(ctx: Context, target: String): Boolean =
        Targets.isBrowser(target) || ctx.packageManager.getLaunchIntentForPackage(target) != null

    /** שמות עבריים נפוצים → שם באנגלית כפי שהוא מופיע במשגר */
    private val aliases: Map<String, String> = mapOf(
        "וואטסאפ" to "whatsapp", "ווטסאפ" to "whatsapp", "וטסאפ" to "whatsapp", "ווטסאפ ביזנס" to "whatsapp business",
        "יוטיוב" to "youtube", "יו טיוב" to "youtube", "יוטיוב מיוזיק" to "youtube music",
        "כרום" to "chrome", "גוגל כרום" to "chrome", "וויז" to "waze", "ווייז" to "waze", "ויז" to "waze",
        "ספוטיפיי" to "spotify", "גוגל מפות" to "maps", "מפות" to "maps", "פייסבוק" to "facebook",
        "אינסטגרם" to "instagram", "טלגרם" to "telegram", "מצלמה" to "camera", "גלריה" to "gallery",
        "הגדרות" to "settings", "טלפון" to "phone", "חייגן" to "phone", "אנשי קשר" to "contacts",
        "הודעות" to "messages", "יומן" to "calendar", "לוח שנה" to "calendar", "שעון" to "clock",
        "מחשבון" to "calculator", "ג'ימייל" to "gmail", "גימייל" to "gmail", "מייל" to "gmail",
        "נטפליקס" to "netflix", "טיקטוק" to "tiktok", "מוביט" to "moovit", "פנגו" to "pango",
        "ביט" to "bit", "גוגל" to "google", "ג'מיני" to "gemini", "קלוד" to "claude", "טוויטר" to "x",
        "לינקדאין" to "linkedin", "דרייב" to "drive", "תמונות" to "photos", "גוגל תמונות" to "photos",
        "סמסונג אינטרנט" to "samsung internet", "אינטרנט" to "internet", "פליי" to "play store",
        "חנות" to "play store", "גוגל פליי" to "play store", "קבצים" to "my files", "הקבצים שלי" to "my files",
        "פתקים" to "notes", "סמסונג נוטס" to "samsung notes", "רדיו" to "radio", "פודקאסטים" to "podcasts",
    )

    private val browserWords = setOf(
        "דפדפן", "הדפדפן", "דפדפןמובנה", "הדפדפןהמובנה", "browser", "builtinbrowser", "duopilotbrowser",
        "דפדפןduopilot", "הדפדפןשלduopilot", "builtin",
    )

    fun normalize(s: String): String =
        s.lowercase(Locale.ROOT).replace(Regex("[\\s\\-_'\"׳״.,!?]+"), "")

    /** מוצא אפליקציה לפי שם (עברית/אנגלית/שם חבילה). מחזיר יעד, או null אם אין התאמה טובה. */
    fun find(ctx: Context, query: String): String? {
        val raw = query.trim()
        if (raw.isEmpty()) return null
        val nq = normalize(raw)
        if (nq in browserWords) return Targets.BROWSER_A
        if (nq == "דפדפן2" || nq == "browser2") return Targets.BROWSER_B
        if (raw.contains('.') && !raw.contains(' ') && isAvailable(ctx, raw)) return raw
        val alias = aliases.entries.firstOrNull { normalize(it.key) == nq }?.value
        val q = normalize(alias ?: raw)
        if (q.isEmpty()) return null
        val apps = launchable(ctx)
        apps.firstOrNull { normalize(it.label) == q }?.let { return it.pkg }
        apps.firstOrNull { normalize(it.label).startsWith(q) }?.let { return it.pkg }
        if (q.length >= 3) apps.firstOrNull { normalize(it.label).contains(q) }?.let { return it.pkg }
        if (q.length >= 4) apps.firstOrNull { it.pkg.lowercase(Locale.ROOT).contains(q) }?.let { return it.pkg }
        val best = apps.minByOrNull { distance(normalize(it.label), q) } ?: return null
        return if (distance(normalize(best.label), q) <= max(1, q.length / 4)) best.pkg else null
    }

    private fun distance(a: String, b: String): Int {
        val dp = IntArray(b.length + 1) { it }
        for (i in 1..a.length) {
            var prev = dp[0]
            dp[0] = i
            for (j in 1..b.length) {
                val tmp = dp[j]
                dp[j] = min(min(dp[j] + 1, dp[j - 1] + 1), prev + if (a[i - 1] == b[j - 1]) 0 else 1)
                prev = tmp
            }
        }
        return dp[b.length]
    }
}
