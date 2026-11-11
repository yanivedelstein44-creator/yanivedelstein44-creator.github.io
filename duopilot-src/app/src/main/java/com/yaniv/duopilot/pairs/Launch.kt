package com.yaniv.duopilot.pairs

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import com.yaniv.duopilot.App
import com.yaniv.duopilot.browser.BrowserActivity
import com.yaniv.duopilot.browser.BrowserActivityB
import java.net.URLEncoder

/** פתיחת אפליקציות, כתובות, ניווט ו-Google Assistant. */
object Launch {
    const val GOOGLE_APP = "com.google.android.googlequicksearchbox"

    fun intentFor(ctx: Context, target: String): Intent? = when (target) {
        Targets.BROWSER_A -> Intent(ctx, BrowserActivity::class.java)
        Targets.BROWSER_B -> Intent(ctx, BrowserActivityB::class.java)
        else -> ctx.packageManager.getLaunchIntentForPackage(target)
    }

    fun open(ctx: Context, target: String, adjacent: Boolean = false, multipleTask: Boolean = false): Boolean {
        val intent = intentFor(ctx, target) ?: return false
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        if (adjacent) intent.addFlags(Intent.FLAG_ACTIVITY_LAUNCH_ADJACENT)
        if (multipleTask) intent.addFlags(Intent.FLAG_ACTIVITY_MULTIPLE_TASK)
        return start(ctx, intent)
    }

    fun openInChrome(ctx: Context, url: String): Boolean {
        val uri = Uri.parse(normalizeUrl(url))
        val chrome = Intent(Intent.ACTION_VIEW, uri).setPackage("com.android.chrome").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        if (start(ctx, chrome)) return true
        return start(ctx, Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    fun navigate(ctx: Context, destination: String, app: String): Boolean {
        val q = URLEncoder.encode(destination, "UTF-8")
        val waze = Intent(Intent.ACTION_VIEW, Uri.parse("https://waze.com/ul?q=$q&navigate=yes"))
            .setPackage("com.waze").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        val maps = Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=$q"))
            .setPackage("com.google.android.apps.maps").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        val order = if (app == "google_maps") listOf(maps, waze) else listOf(waze, maps)
        for (i in order) if (start(ctx, i)) return true
        return start(ctx, Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=$q")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    /** מעביר את הבקשה ל-Google Assistant / Gemini (מקשיב מחדש) */
    fun googleAssistant(ctx: Context): Boolean {
        val voice = Intent(Intent.ACTION_VOICE_COMMAND).setPackage(GOOGLE_APP).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        if (start(ctx, voice)) return true
        return start(ctx, Intent(Intent.ACTION_ASSIST).setPackage(GOOGLE_APP).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    fun normalizeUrl(input: String): String {
        val s = input.trim()
        if (s.isEmpty()) return "https://www.google.com/"
        if (Regex("^[a-zA-Z][a-zA-Z0-9+.-]*:").containsMatchIn(s) && !s.startsWith("localhost")) return s
        val looksLikeHost = !s.contains(' ') && s.contains('.') && !s.endsWith('.')
        return if (looksLikeHost) "https://$s" else "https://www.google.com/search?q=" + URLEncoder.encode(s, "UTF-8")
    }

    private fun start(ctx: Context, intent: Intent): Boolean = try {
        ctx.startActivity(intent)
        true
    } catch (e: ActivityNotFoundException) {
        false
    } catch (e: Exception) {
        Log.w(App.TAG, "start failed: $intent", e)
        false
    }
}
