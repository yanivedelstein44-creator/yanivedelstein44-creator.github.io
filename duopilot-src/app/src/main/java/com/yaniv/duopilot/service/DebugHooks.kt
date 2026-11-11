package com.yaniv.duopilot.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.util.Log
import com.yaniv.duopilot.Bg
import com.yaniv.duopilot.agent.Actions
import com.yaniv.duopilot.agent.ScreenReader
import com.yaniv.duopilot.browser.BrowserRegistry
import com.yaniv.duopilot.car.CarBridge
import com.yaniv.duopilot.pairs.PairStore
import com.yaniv.duopilot.pairs.Targets
import java.io.File

/**
 * פקודות בדיקה דרך adb – רק בגרסת debug (בדיקת האמולטור ב-GitHub Actions).
 * adb shell am broadcast -a com.yaniv.duopilot.DEBUG -p com.yaniv.duopilot --es cmd dump
 */
object DebugHooks {
    const val ACTION = "com.yaniv.duopilot.DEBUG"
    private const val TAG = "DuoPilotDebug"

    fun register(svc: PilotService): BroadcastReceiver {
        val r = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                handle(svc, intent)
            }
        }
        val f = IntentFilter(ACTION)
        if (Build.VERSION.SDK_INT >= 33) {
            svc.registerReceiver(r, f, Context.RECEIVER_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            svc.registerReceiver(r, f)
        }
        return r
    }

    private fun handle(svc: PilotService, i: Intent) {
        val cmd = i.getStringExtra("cmd") ?: return
        Log.i(TAG, "cmd=$cmd")
        when (cmd) {
            "pair" -> {
                val top = i.getStringExtra("top") ?: return
                val bottom = i.getStringExtra("bottom") ?: return
                svc.launchPair(PairStore(svc).findOrCreate(top, bottom))
            }
            "lastpair" -> PairStore(svc).last()?.let { svc.launchPair(it) }
            "url" -> BrowserRegistry.open(svc, Targets.BROWSER_A, i.getStringExtra("url") ?: return)
            "dump" -> Bg.async {
                val s = ScreenReader.capture(svc, includeScreenshot = false)
                File(svc.filesDir, "dump.txt").writeText(s.describe())
                Log.i(TAG, "dump: ${s.elements.size} elements")
            }
            "tap_label" -> Bg.async {
                val label = i.getStringExtra("label") ?: return@async
                val s = ScreenReader.capture(svc, includeScreenshot = false)
                val e = s.elements.firstOrNull { it.label.contains(label, ignoreCase = true) }
                val res = if (e != null) Actions.tap(svc, e) else "not found"
                Log.i(TAG, "tap_label '$label' -> ${e?.id} $res")
                File(svc.filesDir, "tap.txt").writeText("$label -> ${e?.id} $res")
            }
            "scroll_down" -> Bg.async {
                val s = ScreenReader.capture(svc, includeScreenshot = false)
                val where = i.getStringExtra("where") ?: "TOP"
                val list = s.elements.filter { it.kind == "list" && it.where == where }.maxByOrNull { it.bounds.width() * it.bounds.height() }
                Log.i(TAG, "scroll_down $where -> ${list?.id} ${Actions.scroll(svc, s, list, "down")}")
            }
            "finish_browser" -> Bg.ui { BrowserRegistry.instances["A"]?.get()?.finish() }
            "car" -> CarBridge.postAssistant(svc, i.getStringExtra("text") ?: "בדיקה")
            "carreply" -> CarBridge.onUserReply(svc, i.getStringExtra("text") ?: "מה השעה?")
            "state" -> Bg.async {
                val sb = StringBuilder()
                sb.append("split=").append(svc.isSplitActive()).append('\n')
                sb.append("divider=").append(svc.dividerRect()).append('\n')
                sb.append("ratio=").append(svc.split.currentRatio()).append('\n')
                sb.append("windows=").append(svc.appWindows()).append('\n')
                sb.append("pairs=").append(PairStore(svc).stable().joinToString { it.toJson().toString() }).append('\n')
                sb.append("scroll=\n").append(svc.scroll.dumpAll()).append('\n')
                File(svc.filesDir, "state.txt").writeText(sb.toString())
                Log.i(TAG, sb.toString())
            }
        }
    }
}
