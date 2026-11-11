package com.yaniv.duopilot.agent

import android.accessibilityservice.AccessibilityService
import android.util.Log
import com.yaniv.duopilot.App
import com.yaniv.duopilot.Bg
import com.yaniv.duopilot.Prefs
import com.yaniv.duopilot.browser.BrowserRegistry
import com.yaniv.duopilot.car.CarBridge
import com.yaniv.duopilot.pairs.AppCatalog
import com.yaniv.duopilot.pairs.Launch
import com.yaniv.duopilot.pairs.PairStore
import com.yaniv.duopilot.pairs.Targets
import com.yaniv.duopilot.service.Overlays
import com.yaniv.duopilot.service.PilotService
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.CountDownLatch
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit
import kotlin.math.max

/** מאיפה הגיעה הפקודה: מהטלפון (בועה/אייקון) או מאנדרואיד אוטו (תשובה להודעה) */
enum class Source { PHONE, CAR }

/** איך העוזר מדבר איתך: בטלפון – כרטיס + הקראה + מיקרופון. ברכב – הודעות שאנדרואיד אוטו מקריא. */
interface SessionUi {
    fun status(text: String)
    fun say(text: String)
    fun ask(question: String, timeoutMs: Long): String?
    fun finish(text: String)
}

class ToolCall(val name: String, val input: JSONObject) {
    fun describe(): String = "$name ${input.toString().take(160)}"
}

class ToolOutcome(val summary: String, val finished: Boolean = false)

/**
 * פקודה אחת של העוזר: לולאה של "מסתכל על המסך → Claude בוחר פעולה אחת → מבצע → מסתכל שוב",
 * עד שהמשימה הושלמה (או עד מספר הצעדים המקסימלי).
 */
class AgentSession(
    val svc: PilotService,
    val command: String,
    val source: Source,
    val ui: SessionUi,
    /** משימה פנימית של פתיחת מסך מפוצל – בלי open_pair/open_app (אחרת זה יחזור על עצמו) */
    val splitSetup: Boolean = false,
) {
    @Volatile
    var cancelled = false
        private set

    private val history = ArrayList<String>()
    val historyLines: List<String> get() = history

    fun cancel() {
        cancelled = true
    }

    fun run() {
        val prefs = Prefs(svc)
        val key = prefs.apiKey
        if (key.isBlank()) {
            ui.finish("צריך להכניס מפתח Claude API באפליקציה DuoPilot, ואז לנסות שוב.")
            return
        }
        val maxSteps = if (splitSetup) 8 else prefs.maxSteps.coerceIn(3, 30)
        try {
            for (step in 1..maxSteps) {
                if (cancelled) return
                ui.status(if (step == 1) "👀 מסתכל על המסך…" else "👀 בודק מה השתנה…")
                val screen = ScreenReader.capture(svc, prefs.sendScreenshot)
                if (cancelled) return
                ui.status("🤔 חושב…")
                val body = Prompt.request(svc, prefs, this, step, maxSteps, screen)
                val resp = ClaudeClient.send(key, body)
                if (cancelled) return
                val call = firstToolCall(resp)
                if (call == null) {
                    ui.finish(textOf(resp).ifBlank { "סיימתי." })
                    return
                }
                val outcome = try {
                    Tools.execute(svc, this, call, screen)
                } catch (e: Exception) {
                    Log.w(App.TAG, "tool ${call.name}", e)
                    ToolOutcome("error: ${e.message ?: e.javaClass.simpleName}")
                }
                history.add("$step. ${call.describe()} -> ${outcome.summary}")
                if (outcome.finished || cancelled) return
                Bg.sleep(settleDelay(call.name))
            }
            ui.finish("עשיתי $maxSteps צעדים ועדיין לא סיימתי. נסה הוראה קצרה ומדויקת יותר.")
        } catch (e: ClaudeClient.ApiException) {
            Log.w(App.TAG, "claude api", e)
            if (!cancelled) ui.finish(e.userMessage)
        } catch (e: IOException) {
            Log.w(App.TAG, "network", e)
            if (!cancelled) ui.finish("אין חיבור לאינטרנט, או ש-Claude לא זמין כרגע.")
        } catch (e: Exception) {
            Log.e(App.TAG, "agent", e)
            if (!cancelled) ui.finish("משהו השתבש: ${e.message ?: e.javaClass.simpleName}")
        }
    }

    private fun settleDelay(tool: String): Long = when (tool) {
        "open_app", "open_pair", "open_url", "web_search", "navigate" -> 1500
        "type_text" -> 500
        "wait", "ask_user", "say" -> 150
        else -> 800
    }

    private fun firstToolCall(resp: JSONObject): ToolCall? {
        val content = resp.optJSONArray("content") ?: return null
        for (i in 0 until content.length()) {
            val b = content.optJSONObject(i) ?: continue
            if (b.optString("type") == "tool_use") return ToolCall(b.optString("name"), b.optJSONObject("input") ?: JSONObject())
        }
        return null
    }

    private fun textOf(resp: JSONObject): String {
        val content = resp.optJSONArray("content") ?: return ""
        val sb = StringBuilder()
        for (i in 0 until content.length()) {
            val b = content.optJSONObject(i) ?: continue
            if (b.optString("type") == "text") sb.append(b.optString("text"))
        }
        return sb.toString().trim()
    }
}

// ---------------------------------------------------------------------- ממשק בטלפון / ברכב

class PhoneUi(private val svc: PilotService) : SessionUi {
    private val prefs = Prefs(svc)

    override fun status(text: String) = svc.overlays.setStatus(text)

    override fun say(text: String) {
        svc.overlays.setText(text)
        if (prefs.speakReplies) speakAndWait(text)
    }

    override fun ask(question: String, timeoutMs: Long): String? {
        svc.overlays.showPanel("❓ שאלה", question)
        if (prefs.speakReplies) speakAndWait(question)
        svc.overlays.setMode(Overlays.Mode.LISTENING)
        svc.overlays.setStatus("🎤 מקשיב לתשובה…")
        val q = LinkedBlockingQueue<String>()
        svc.captureSpeech { ans -> q.offer(ans ?: "") }
        val ans = q.poll(timeoutMs, TimeUnit.MILLISECONDS)
        svc.overlays.setMode(Overlays.Mode.THINKING)
        return ans?.takeIf { it.isNotBlank() }
    }

    override fun finish(text: String) {
        if (text.isBlank()) {
            svc.overlays.hidePanel()
            return
        }
        svc.overlays.finishPanel(text)
        if (prefs.speakReplies) svc.voice.speak(text, prefs.language)
    }

    private fun speakAndWait(text: String) {
        val latch = CountDownLatch(1)
        svc.voice.speak(text, prefs.language) { latch.countDown() }
        latch.await(20, TimeUnit.SECONDS)
    }
}

/** בלי קול ובלי שאלות – למשימות פנימיות (כמו השלמת מסך מפוצל) */
class SilentUi(private val svc: PilotService) : SessionUi {
    override fun status(text: String) = svc.overlays.setStatus("🪟 $text")
    override fun say(text: String) {}
    override fun ask(question: String, timeoutMs: Long): String? = null
    override fun finish(text: String) {}
}

class CarUi(private val svc: PilotService) : SessionUi {
    override fun status(text: String) = svc.overlays.setStatus(text)

    override fun say(text: String) {
        CarBridge.postAssistant(svc, text)
        svc.overlays.setText(text)
    }

    override fun ask(question: String, timeoutMs: Long): String? {
        CarBridge.postAssistant(svc, question)
        svc.overlays.setText(question)
        return CarBridge.awaitReply(max(timeoutMs, 90_000))
    }

    override fun finish(text: String) {
        val t = text.ifBlank { "סיימתי." }
        CarBridge.postAssistant(svc, t)
        svc.overlays.finishPanel(t)
    }
}

// ---------------------------------------------------------------------- הבקשה ל-Claude

object Prompt {
    fun request(svc: PilotService, prefs: Prefs, s: AgentSession, step: Int, maxSteps: Int, screen: ScreenState): JSONObject {
        val system = JSONArray().put(
            JSONObject()
                .put("type", "text")
                .put("text", systemText(svc, prefs, s.source))
                .put("cache_control", JSONObject().put("type", "ephemeral"))
        )
        val content = JSONArray()
        screen.shotB64?.let {
            content.put(
                JSONObject().put("type", "image").put(
                    "source",
                    JSONObject().put("type", "base64").put("media_type", "image/jpeg").put("data", it)
                )
            )
        }
        content.put(JSONObject().put("type", "text").put("text", userText(s, step, maxSteps, screen)))
        return JSONObject()
            .put("model", prefs.model)
            .put("max_tokens", 1024)
            .put("system", system)
            .put("tools", Tools.definitions)
            .put("tool_choice", JSONObject().put("type", "any").put("disable_parallel_tool_use", true))
            .put("messages", JSONArray().put(JSONObject().put("role", "user").put("content", content)))
    }

    private fun languageName(tag: String) = when {
        tag.startsWith("he") || tag.startsWith("iw") -> "Hebrew"
        tag.startsWith("ar") -> "Arabic"
        tag.startsWith("ru") -> "Russian"
        else -> "English"
    }

    private fun systemText(svc: PilotService, prefs: Prefs, source: Source): String {
        val sb = StringBuilder(BASE.replace("{LANG}", languageName(prefs.language)))
        if (source == Source.CAR) sb.append('\n').append(CAR)
        sb.append("\n\nSaved app pairs (number: TOP + BOTTOM):\n")
        val pairs = PairStore(svc).stable()
        if (pairs.isEmpty()) sb.append("(none yet)\n")
        pairs.forEachIndexed { i, p ->
            sb.append(i + 1).append(": ").append(AppCatalog.label(svc, p.top)).append(" + ").append(AppCatalog.label(svc, p.bottom)).append('\n')
        }
        sb.append("\nInstalled apps: ")
        sb.append(AppCatalog.launchable(svc).take(180).joinToString(", ") { it.label })
        sb.append(", DuoPilot browser (built in)")
        return sb.toString()
    }

    private fun userText(s: AgentSession, step: Int, maxSteps: Int, screen: ScreenState): String {
        val sb = StringBuilder()
        sb.append("User command (spoken): \"").append(s.command).append("\"\n")
        sb.append("Step ").append(step).append(" of at most ").append(maxSteps).append(".\n")
        sb.append("Actions so far:\n")
        if (s.historyLines.isEmpty()) sb.append("(none)\n") else s.historyLines.takeLast(15).forEach { sb.append(it).append('\n') }
        sb.append("\nCURRENT SCREEN\n").append(screen.describe())
        if (screen.shotB64 != null) {
            sb.append("\nScreenshot attached: ").append(screen.shotW).append('x').append(screen.shotH)
                .append(" px (tap_point uses these image coordinates).\n")
        } else {
            sb.append("\nNo screenshot this time (tap_point is unavailable).\n")
        }
        val now = SimpleDateFormat("EEEE yyyy-MM-dd HH:mm", Locale.ENGLISH).format(Date())
        sb.append("Local time now: ").append(now).append('\n')
        return sb.toString()
    }

    private val BASE = """
You are DuoPilot, a voice assistant that operates the user's Android phone by reading the screen and acting on it with tools. The user speaks to you, usually in Hebrew, and often cannot look at the screen (they may be driving).

How each turn works:
- You receive the user's command, the actions you already took, and the CURRENT screen: the windows on screen (in split screen one app is on TOP and one on the BOTTOM), a numbered list of on-screen elements, and usually a screenshot.
- Call exactly ONE tool that moves the task forward. After it runs you will see the updated screen in the next turn.

Rules:
1. Prefer element ids (tap, type_text, scroll, long_press). Use tap_point only for something visible in the screenshot that has no element id.
2. Every element is tagged with its window: TOP / BOTTOM / FULL / LEFT / RIGHT / POPUP / KEYBOARD / SYSTEM. In the user's words "למעלה", "עליון", "up", "top" usually mean the TOP half, and "למטה", "תחתון", "down", "bottom" the BOTTOM half.
3. Check the result of your previous action on the new screen before continuing. If it did not work, try something different (another element, scroll to find it, go back). Never repeat the same failing action more than twice.
4. To find something that is not visible, scroll the relevant list. A search field is often the fastest way to reach a chat, contact, video or setting.
5. When the task is done, call finish with a short confirmation. If it is impossible, call finish and say why in one sentence. If the user only asked a question that needs no phone action, answer it with finish (use web_search only when fresh information is needed).
6. Safety: before sending a message, posting, paying, buying, deleting, calling someone, or changing security or account settings, confirm with ask_user - unless the user's command already explicitly asked for exactly that action and its content (for example "send Mom 'I'm on my way'"). Never type passwords, card numbers or one-time codes. If a login, a lock screen or a payment is required, tell the user. Never accept terms, grant permissions or install apps unless the user asked for it.
7. Talk to the user in {LANG}. Every spoken message is short and natural: one or two short sentences, no lists, no markdown, no emojis, no element ids.
8. Use navigate for driving directions, open_pair for "open X and Y together / one up one down", open_app for a single app, open_url or web_search for websites. Use hand_off for things that need Google Assistant: calling a contact by name, alarms, timers, reminders, smart home.
""".trim()

    private val CAR = """
CAR MODE: the user is driving with Android Auto and hears your messages read aloud in the car. Use at most one short sentence per message. Never ask the user to look at or touch the phone. If a task needs many steps, say so briefly with ask_user and ask whether to continue.
""".trim()
}

// ---------------------------------------------------------------------- הכלים

object Tools {
    val definitions: JSONArray by lazy { JSONArray(TOOLS_JSON) }

    fun execute(svc: PilotService, s: AgentSession, call: ToolCall, screen: ScreenState): ToolOutcome {
        val inp = call.input
        fun element(): Element? = if (inp.has("element_id")) screen.byId(inp.optInt("element_id", -1)) else null
        if (s.splitSetup && call.name in setOf("open_pair", "open_app", "hand_off", "navigate", "open_url", "web_search", "ask_user")) {
            return ToolOutcome("error: not allowed in this task – use tap, tap_point, scroll, wait or finish")
        }
        return when (call.name) {
            "tap" -> {
                val e = element() ?: return ToolOutcome("error: no element with that id on the current screen")
                s.ui.status("👆 ${e.short()}")
                ToolOutcome(Actions.tap(svc, e))
            }
            "long_press" -> {
                val e = element() ?: return ToolOutcome("error: no element with that id")
                s.ui.status("👆 ${e.short()}")
                ToolOutcome(Actions.longPress(svc, e))
            }
            "tap_point" -> {
                val p = screen.imageToScreen(inp.optInt("x"), inp.optInt("y")) ?: return ToolOutcome("error: no screenshot available, use element ids")
                s.ui.status("👆")
                ToolOutcome(if (Actions.tapAt(svc, p.first, p.second)) "tapped at screen ${p.first.toInt()},${p.second.toInt()}" else "tap failed")
            }
            "type_text" -> {
                val text = inp.optString("text")
                s.ui.status("⌨️ $text".take(40))
                ToolOutcome(Actions.typeText(svc, element(), text, inp.optBoolean("submit", false)))
            }
            "scroll" -> {
                val dir = inp.optString("direction", "down")
                s.ui.status(if (dir == "up") "⬆️ גולל" else "⬇️ גולל")
                ToolOutcome(Actions.scroll(svc, screen, element(), dir))
            }
            "system" -> {
                val action = when (inp.optString("action")) {
                    "back" -> AccessibilityService.GLOBAL_ACTION_BACK
                    "home" -> AccessibilityService.GLOBAL_ACTION_HOME
                    "recents" -> AccessibilityService.GLOBAL_ACTION_RECENTS
                    "notifications" -> AccessibilityService.GLOBAL_ACTION_NOTIFICATIONS
                    "quick_settings" -> AccessibilityService.GLOBAL_ACTION_QUICK_SETTINGS
                    else -> return ToolOutcome("error: unknown system action")
                }
                ToolOutcome(if (svc.performGlobalAction(action)) "pressed ${inp.optString("action")}" else "failed")
            }
            "open_app" -> openApp(svc, s, inp.optString("name"), inp.optString("where", "full"))
            "open_pair" -> openPair(svc, s, inp)
            "open_url" -> {
                val url = inp.optString("url")
                s.ui.status("🌐 $url".take(44))
                if (inp.optString("browser") == "chrome") {
                    ToolOutcome(if (Launch.openInChrome(svc, url)) "opened in Chrome" else "failed to open Chrome")
                } else {
                    BrowserRegistry.open(svc, BrowserRegistry.preferredTarget(), url)
                    ToolOutcome("opened in the DuoPilot browser")
                }
            }
            "web_search" -> {
                val q = inp.optString("query")
                s.ui.status("🔎 $q".take(44))
                BrowserRegistry.open(svc, BrowserRegistry.preferredTarget(), "https://www.google.com/search?q=" + URLEncoder.encode(q, "UTF-8"))
                ToolOutcome("searched in the DuoPilot browser")
            }
            "navigate" -> {
                val dest = inp.optString("destination")
                val app = inp.optString("app", "waze")
                s.ui.status("🧭 $dest".take(44))
                ToolOutcome(if (Launch.navigate(svc, dest, app)) "navigation to \"$dest\" started" else "failed to start navigation")
            }
            "wait" -> {
                Bg.sleep((inp.optDouble("seconds", 1.0).coerceIn(0.3, 6.0) * 1000).toLong())
                ToolOutcome("waited")
            }
            "ask_user" -> {
                val a = s.ui.ask(inp.optString("question"), 25_000)
                ToolOutcome(if (a == null) "the user did not answer" else "the user answered: \"$a\"")
            }
            "say" -> {
                s.ui.say(inp.optString("text"))
                ToolOutcome("said")
            }
            "finish" -> {
                s.ui.finish(inp.optString("message", "סיימתי."))
                ToolOutcome("finished", finished = true)
            }
            "hand_off" -> {
                val msg = inp.optString("message")
                if (s.source == Source.CAR) {
                    s.ui.finish(msg.ifBlank { "את זה עדיף לבקש מ-Google: אמור Hey Google ואת הבקשה." })
                } else {
                    s.ui.say(msg.ifBlank { "מעביר ל-Google" })
                    s.ui.finish("")
                    Launch.googleAssistant(svc)
                }
                ToolOutcome("handed off to Google Assistant", finished = true)
            }
            else -> ToolOutcome("error: unknown tool ${call.name}")
        }
    }

    private fun openApp(svc: PilotService, s: AgentSession, name: String, where: String): ToolOutcome {
        val target = AppCatalog.find(svc, name) ?: return ToolOutcome("error: no installed app matches \"$name\"")
        val label = AppCatalog.label(svc, target)
        s.ui.status("📱 $label")
        if (where == "top" || where == "bottom") {
            val other = otherHalf(svc, where)
                ?: svc.appWindows().firstOrNull { it.target != target }?.target
                ?: PairStore(svc).last()?.let { if (where == "top") it.bottom else it.top }
                ?: Targets.BROWSER_A
            val store = PairStore(svc)
            val pair = if (where == "top") store.findOrCreate(target, other) else store.findOrCreate(other, target)
            val (ok, msg) = svc.launcher.launchBlocking(pair)
            return ToolOutcome(if (ok) "opened $label in the $where half" else "failed: $msg")
        }
        return ToolOutcome(if (Launch.open(svc, target)) "opened $label" else "failed to open $label")
    }

    private fun openPair(svc: PilotService, s: AgentSession, inp: JSONObject): ToolOutcome {
        val store = PairStore(svc)
        val pair = if (inp.has("pair_number")) {
            store.stable().getOrNull(inp.optInt("pair_number") - 1) ?: return ToolOutcome("error: no saved pair with that number")
        } else {
            val topName = inp.optString("top")
            val bottomName = inp.optString("bottom")
            val top = AppCatalog.find(svc, topName) ?: return ToolOutcome("error: no installed app matches \"$topName\"")
            val bottom = AppCatalog.find(svc, bottomName) ?: return ToolOutcome("error: no installed app matches \"$bottomName\"")
            store.findOrCreate(top, bottom)
        }
        s.ui.status("🪟 ${AppCatalog.label(svc, pair.top)} + ${AppCatalog.label(svc, pair.bottom)}")
        val (ok, msg) = svc.launcher.launchBlocking(pair)
        return ToolOutcome(
            if (ok) "split screen opened: ${AppCatalog.label(svc, pair.top)} on top, ${AppCatalog.label(svc, pair.bottom)} at the bottom (saved as a pair)"
            else "failed: $msg"
        )
    }

    private fun otherHalf(svc: PilotService, where: String): String? {
        if (!svc.isSplitActive()) return null
        val ws = svc.appWindows().sortedBy { it.bounds.top }
        if (ws.size < 2) return null
        return if (where == "top") ws.last().target else ws.first().target
    }

    private const val TOOLS_JSON = """
[
 {"name":"tap","description":"Tap an on-screen element by its id from the element list.","input_schema":{"type":"object","properties":{"element_id":{"type":"integer"}},"required":["element_id"]}},
 {"name":"long_press","description":"Long-press an element (context menus, selecting items).","input_schema":{"type":"object","properties":{"element_id":{"type":"integer"}},"required":["element_id"]}},
 {"name":"tap_point","description":"Tap a point given in pixel coordinates of the attached SCREENSHOT image. Only for targets visible in the screenshot that have no element id.","input_schema":{"type":"object","properties":{"x":{"type":"integer"},"y":{"type":"integer"}},"required":["x","y"]}},
 {"name":"type_text","description":"Type text into an input field (replaces its content). submit=true presses Enter/Search/Send on the keyboard afterwards.","input_schema":{"type":"object","properties":{"element_id":{"type":"integer","description":"id of the input field; omit to use the focused field"},"text":{"type":"string"},"submit":{"type":"boolean"}},"required":["text"]}},
 {"name":"scroll","description":"Scroll a list or page. direction 'down' reveals content further down (like swiping up with a finger).","input_schema":{"type":"object","properties":{"element_id":{"type":"integer","description":"the list/page to scroll, or any element inside it"},"direction":{"type":"string","enum":["up","down","left","right"]}},"required":["direction"]}},
 {"name":"system","description":"Press a system button.","input_schema":{"type":"object","properties":{"action":{"type":"string","enum":["back","home","recents","notifications","quick_settings"]}},"required":["action"]}},
 {"name":"open_app","description":"Open an installed app by its name (Hebrew or English, as in the launcher). where='full' opens it normally; 'top' or 'bottom' puts it in that half of the split screen and keeps the app that is in the other half.","input_schema":{"type":"object","properties":{"name":{"type":"string"},"where":{"type":"string","enum":["full","top","bottom"]}},"required":["name"]}},
 {"name":"open_pair","description":"Open two apps together in split screen, one on TOP and one on the BOTTOM, and remember them as a pair. Use 'browser' for the DuoPilot built-in browser. Or give pair_number to open a saved pair.","input_schema":{"type":"object","properties":{"top":{"type":"string"},"bottom":{"type":"string"},"pair_number":{"type":"integer"}}}},
 {"name":"open_url","description":"Open a web address in the DuoPilot built-in browser (default) or in Chrome.","input_schema":{"type":"object","properties":{"url":{"type":"string"},"browser":{"type":"string","enum":["builtin","chrome"]}},"required":["url"]}},
 {"name":"web_search","description":"Search Google in the DuoPilot built-in browser.","input_schema":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}},
 {"name":"navigate","description":"Start driving navigation to a destination in Waze (default) or Google Maps.","input_schema":{"type":"object","properties":{"destination":{"type":"string"},"app":{"type":"string","enum":["waze","google_maps"]}},"required":["destination"]}},
 {"name":"wait","description":"Wait for the screen to finish loading.","input_schema":{"type":"object","properties":{"seconds":{"type":"number"}},"required":["seconds"]}},
 {"name":"ask_user","description":"Ask the user a short question by voice and get the spoken answer. Use it for yes/no confirmations before sensitive actions and when the command is ambiguous.","input_schema":{"type":"object","properties":{"question":{"type":"string"}},"required":["question"]}},
 {"name":"say","description":"Tell the user something short and keep working (progress or partial information).","input_schema":{"type":"object","properties":{"text":{"type":"string"}},"required":["text"]}},
 {"name":"finish","description":"End the task with a short spoken message: what was done, the answer to the question, or why it could not be done.","input_schema":{"type":"object","properties":{"message":{"type":"string"}},"required":["message"]}},
 {"name":"hand_off","description":"Hand the request to Google Assistant / Gemini when it needs something you cannot do on screen (calling a contact by name, alarms, timers, reminders, smart home). Ends the task.","input_schema":{"type":"object","properties":{"message":{"type":"string","description":"short message to the user"}},"required":["message"]}}
]
"""
}
