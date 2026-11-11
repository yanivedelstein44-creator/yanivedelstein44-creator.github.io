package com.yaniv.duopilot.service

import android.Manifest
import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.app.UiModeManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Rect
import android.os.Build
import android.os.SystemClock
import android.provider.Settings
import android.speech.SpeechRecognizer
import android.util.Log
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityWindowInfo
import com.yaniv.duopilot.App
import com.yaniv.duopilot.Bg
import com.yaniv.duopilot.BuildConfig
import com.yaniv.duopilot.Prefs
import com.yaniv.duopilot.agent.AgentSession
import com.yaniv.duopilot.agent.CarUi
import com.yaniv.duopilot.agent.PhoneUi
import com.yaniv.duopilot.agent.SessionUi
import com.yaniv.duopilot.agent.Source
import com.yaniv.duopilot.browser.BrowserRegistry
import com.yaniv.duopilot.car.CarBridge
import com.yaniv.duopilot.pairs.AppCatalog
import com.yaniv.duopilot.pairs.AppPair
import com.yaniv.duopilot.pairs.PairLauncher
import com.yaniv.duopilot.pairs.PairStore
import com.yaniv.duopilot.pairs.SplitTracker
import com.yaniv.duopilot.scroll.ScrollMemory
import com.yaniv.duopilot.ui.MainActivity
import com.yaniv.duopilot.ui.VoiceEntryActivity
import com.yaniv.duopilot.update.Updater
import com.yaniv.duopilot.voice.VoiceIO
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.math.max

/**
 * שירות הנגישות של DuoPilot – הלב של האפליקציה:
 * פותח צמדים במסך מפוצל, זוכר יחס חלוקה וגלילה, מציג את בועת המיקרופון,
 * ונותן לעוזר הקולי לקרוא את המסך וללחוץ.
 */
class PilotService : AccessibilityService() {

    lateinit var overlays: Overlays
        private set
    lateinit var launcher: PairLauncher
        private set
    lateinit var split: SplitTracker
        private set
    lateinit var scroll: ScrollMemory
        private set
    lateinit var voice: VoiceIO
        private set

    @Volatile
    var session: AgentSession? = null
        private set

    private var ready = false
    private var silentFailures = 0
    private var lastPeriodic = 0L
    private val pairsListener: () -> Unit = { if (ready) scroll.refreshTracked() }

    private val carReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            CarBridge.checkConnection(this@PilotService)
        }
    }
    private var debugReceiver: BroadcastReceiver? = null

    override fun onServiceConnected() {
        super.onServiceConnected()
        overlays = Overlays(this)
        launcher = PairLauncher(this)
        split = SplitTracker(this)
        scroll = ScrollMemory(this)
        voice = VoiceIO(this)
        ready = true
        instance = this
        scroll.refreshTracked()
        PairStore.listeners.add(pairsListener)
        if (Prefs(this).showBubble) overlays.showBubble()

        val filter = IntentFilter().apply {
            addAction(CarBridge.ACTION_CAR_CONNECTION_UPDATED)
            addAction(UiModeManager.ACTION_ENTER_CAR_MODE)
            addAction(UiModeManager.ACTION_EXIT_CAR_MODE)
        }
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(carReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(carReceiver, filter)
        }
        CarBridge.checkConnection(this)
        if (BuildConfig.DEBUG) debugReceiver = DebugHooks.register(this)

        pendingPairId?.let { id ->
            pendingPairId = null
            PairStore(this).get(id)?.let { launchPair(it) }
        }
        Updater.maybeCheck(this, force = false)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (!ready || event == null) return
        when (event.eventType) {
            AccessibilityEvent.TYPE_VIEW_SCROLLED -> scroll.onScrolled(event)
            AccessibilityEvent.TYPE_WINDOWS_CHANGED -> split.onWindowsChanged()
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                val now = SystemClock.uptimeMillis()
                if (now - lastPeriodic > 60_000) {
                    lastPeriodic = now
                    CarBridge.checkConnection(this)
                    Updater.maybeCheck(this, force = false)
                }
            }
        }
    }

    override fun onInterrupt() {
        if (ready) voice.stopSpeaking()
    }

    override fun onUnbind(intent: Intent?): Boolean {
        shutdown()
        return super.onUnbind(intent)
    }

    override fun onDestroy() {
        shutdown()
        super.onDestroy()
    }

    private fun shutdown() {
        if (!ready) return
        ready = false
        if (instance === this) instance = null
        PairStore.listeners.remove(pairsListener)
        session?.cancel()
        try {
            unregisterReceiver(carReceiver)
        } catch (_: Exception) {
        }
        debugReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (_: Exception) {
            }
        }
        overlays.destroy()
        voice.release()
        scroll.release()
    }

    // ------------------------------------------------------------------ חלונות

    data class AppWin(val target: String, val bounds: Rect)

    fun screenSize(): Pair<Int, Int> {
        val b = getSystemService(WindowManager::class.java).maximumWindowMetrics.bounds
        return b.width() to b.height()
    }

    fun windowsSafe(): List<AccessibilityWindowInfo> = try {
        windows ?: emptyList()
    } catch (e: Exception) {
        emptyList()
    }

    /** חלונות האפליקציות שעל המסך. החלונות של DuoPilot עצמו נספרים רק אם הם הדפדפן. */
    fun appWindows(): List<AppWin> {
        val out = ArrayList<AppWin>()
        for (w in windowsSafe()) {
            if (w.type != AccessibilityWindowInfo.TYPE_APPLICATION) continue
            val r = Rect()
            w.getBoundsInScreen(r)
            if (r.width() < 80 || r.height() < 80) continue
            val pkg = try {
                w.root?.packageName?.toString()
            } catch (e: Exception) {
                null
            } ?: continue
            val target = if (pkg == packageName) (BrowserRegistry.slotAt(r) ?: continue) else pkg
            out.add(AppWin(target, r))
        }
        return out
    }

    fun rootsOf(pkg: String): List<AccessibilityNodeInfo> = windowsSafe()
        .filter { it.type == AccessibilityWindowInfo.TYPE_APPLICATION }
        .mapNotNull {
            try {
                it.root
            } catch (e: Exception) {
                null
            }
        }
        .filter { it.packageName?.toString() == pkg }

    fun isShowing(target: String) = appWindows().any { it.target == target }

    fun bothVisible(pair: AppPair): Boolean {
        val ws = appWindows()
        if (pair.top == pair.bottom) return ws.count { it.target == pair.top } >= 2
        return ws.any { it.target == pair.top } && ws.any { it.target == pair.bottom }
    }

    /** האם a מעל b (או משמאל ל-b כשהטלפון לרוחב) */
    fun isAbove(a: String, b: String): Boolean {
        val ws = appWindows()
        val wa = ws.firstOrNull { it.target == a } ?: return false
        val wb = ws.lastOrNull { it.target == b } ?: return false
        val (w, h) = screenSize()
        return if (h >= w) wa.bounds.centerY() < wb.bounds.centerY() else wa.bounds.centerX() < wb.bounds.centerX()
    }

    fun dividerRect(): Rect? {
        windowsSafe().firstOrNull { it.type == AccessibilityWindowInfo.TYPE_SPLIT_SCREEN_DIVIDER }?.let {
            val r = Rect()
            it.getBoundsInScreen(r)
            if (!r.isEmpty) return r
        }
        val ws = appWindows()
        if (ws.size < 2) return null
        val (w, h) = screenSize()
        if (h < w) return null
        val sorted = ws.sortedBy { it.bounds.top }
        val a = sorted.first().bounds
        val b = sorted.last().bounds
        if (a.height() < h * 0.85 && a.bottom <= b.top + 4) return Rect(0, a.bottom, w, max(b.top, a.bottom + 1))
        return null
    }

    fun isSplitActive(): Boolean {
        if (windowsSafe().any { it.type == AccessibilityWindowInfo.TYPE_SPLIT_SCREEN_DIVIDER }) return true
        val ws = appWindows()
        if (ws.size < 2) return false
        val (w, h) = screenSize()
        val portrait = h >= w
        val halves = ws.filter {
            if (portrait) it.bounds.height() < h * 0.8 && it.bounds.width() > w * 0.8
            else it.bounds.width() < w * 0.8 && it.bounds.height() > h * 0.8
        }
        return halves.size >= 2
    }

    // ------------------------------------------------------------------ מחוות

    /** מבצע מחווה ומחכה שתסתיים. לקרוא רק מ-thread רקע. */
    fun gestureAndWait(g: GestureDescription, hideOverlays: Boolean = true, timeoutMs: Long = 4000): Boolean {
        if (Bg.isMain) {
            dispatchGesture(g, null, null)
            return true
        }
        if (hideOverlays) {
            overlays.hideForCapture(true)
            Bg.sleep(70)
        }
        val latch = CountDownLatch(1)
        var ok = false
        Bg.ui {
            val accepted = dispatchGesture(g, object : GestureResultCallback() {
                override fun onCompleted(gestureDescription: GestureDescription?) {
                    ok = true
                    latch.countDown()
                }

                override fun onCancelled(gestureDescription: GestureDescription?) {
                    latch.countDown()
                }
            }, null)
            if (!accepted) latch.countDown()
        }
        latch.await(timeoutMs, TimeUnit.MILLISECONDS)
        if (hideOverlays) Bg.later(120) { overlays.hideForCapture(false) }
        return ok
    }

    // ------------------------------------------------------------------ צמדים

    fun launchPair(pair: AppPair) = Bg.ui {
        overlays.showPanel("🪟 פותח צמד", "${AppCatalog.label(this, pair.top)} ⬆  ·  ${AppCatalog.label(this, pair.bottom)} ⬇")
        launcher.launch(pair) { ok, msg ->
            if (ok) overlays.hidePanel(700) else overlays.finishPanel("⚠️ $msg", 8000)
        }
    }

    // ------------------------------------------------------------------ עוזר קולי

    fun onBubbleTap() {
        if (session != null) {
            cancelSession("עצרתי.")
            return
        }
        startVoiceSession(Source.PHONE)
    }

    fun onBubbleLongPress() = openMain(null)

    fun openMain(reason: String?) {
        val i = Intent(this, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            .putExtra(MainActivity.EXTRA_NO_AUTO, true)
        if (reason != null) i.putExtra(MainActivity.EXTRA_REASON, reason)
        try {
            startActivity(i)
        } catch (e: Exception) {
            Log.w(App.TAG, "openMain", e)
        }
    }

    fun cancelSession(message: String?) = Bg.ui {
        session?.cancel()
        session = null
        voice.stopAll()
        overlays.setMode(Overlays.Mode.IDLE)
        if (message != null) overlays.finishPanel(message, 1500) else overlays.hidePanel()
    }

    fun startVoiceSession(source: Source) = Bg.ui {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            overlays.finishPanel("צריך לאשר ל-DuoPilot גישה למיקרופון", 5000)
            openMain("mic")
            return@ui
        }
        voice.stopSpeaking()
        overlays.showPanel("🎤 מקשיב…", "אמור מה לעשות")
        overlays.setMode(Overlays.Mode.LISTENING)
        captureSpeech { text ->
            if (text.isNullOrBlank()) overlays.setMode(Overlays.Mode.IDLE) else runCommand(text, source)
        }
    }

    /** מקליט משפט אחד. מחזיר null אם לא נשמע כלום (והודעה כבר הוצגה). */
    fun captureSpeech(cb: (String?) -> Unit): Unit = Bg.ui {
        val prefs = Prefs(this)
        if (prefs.micViaActivity) {
            VoiceEntryActivity.pendingCallback = cb
            try {
                startActivity(
                    Intent(this, VoiceEntryActivity::class.java)
                        .putExtra(VoiceEntryActivity.EXTRA_HOST, true)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            } catch (e: Exception) {
                VoiceEntryActivity.pendingCallback = null
                cb(null)
            }
            return@ui
        }
        voice.listen(prefs.language, object : VoiceIO.Listener {
            override fun onPartial(text: String) {
                overlays.setText(text)
            }

            override fun onResult(text: String?) {
                if (text.isNullOrBlank()) {
                    silentFailures++
                    val switched = maybeSwitchMicMode()
                    overlays.finishPanel(if (switched) SWITCHED_MSG else "לא שמעתי. לחץ על המיקרופון ונסה שוב", 3500)
                    cb(null)
                } else {
                    silentFailures = 0
                    overlays.setText("“$text”")
                    cb(text)
                }
            }

            override fun onError(code: Int) {
                when (code) {
                    SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> {
                        silentFailures++
                        val switched = maybeSwitchMicMode()
                        overlays.finishPanel(if (switched) SWITCHED_MSG else "לא שמעתי. לחץ על המיקרופון ונסה שוב", 3500)
                        cb(null)
                    }
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS, SpeechRecognizer.ERROR_AUDIO -> {
                        // המיקרופון חסום כשהשירות ברקע – מקליטים מתוך מסך שקוף קטן במקום
                        prefs.micViaActivity = true
                        overlays.setText("עובר למצב מיקרופון חלופי…")
                        captureSpeech(cb)
                    }
                    SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> {
                        overlays.finishPanel("אין אינטרנט לזיהוי דיבור", 3500)
                        cb(null)
                    }
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> {
                        overlays.finishPanel("זיהוי הדיבור עסוק. נסה שוב בעוד רגע", 3000)
                        cb(null)
                    }
                    ERROR_LANGUAGE_NOT_SUPPORTED, ERROR_LANGUAGE_UNAVAILABLE -> {
                        if (!voice.preferGoogle) {
                            voice.preferGoogle = true
                            captureSpeech(cb)
                        } else {
                            overlays.finishPanel("זיהוי הדיבור לא תומך בשפה. עדכן את אפליקציית Google", 5000)
                            cb(null)
                        }
                    }
                    VoiceIO.ERROR_NO_RECOGNIZER -> {
                        overlays.finishPanel("לא נמצא שירות זיהוי דיבור. התקן את אפליקציית Google", 5000)
                        cb(null)
                    }
                    else -> {
                        overlays.finishPanel("שגיאה בזיהוי דיבור ($code)", 3000)
                        cb(null)
                    }
                }
            }
        })
    }

    private fun maybeSwitchMicMode(): Boolean {
        val prefs = Prefs(this)
        if (silentFailures >= 3 && !prefs.micViaActivity) {
            prefs.micViaActivity = true
            silentFailures = 0
            return true
        }
        return false
    }

    fun runCommand(text: String, source: Source) = Bg.ui {
        session?.cancel()
        val ui: SessionUi = if (source == Source.CAR) CarUi(this) else PhoneUi(this)
        val s = AgentSession(this, text, source, ui)
        session = s
        overlays.showPanel("🤔 חושב…", "“$text”")
        overlays.setMode(Overlays.Mode.THINKING)
        Bg.async {
            try {
                s.run()
            } finally {
                Bg.ui {
                    if (session === s) {
                        session = null
                        overlays.setMode(Overlays.Mode.IDLE)
                    }
                }
            }
        }
    }

    val isBusy: Boolean get() = session != null || (ready && launcher.busy)

    companion object {
        private const val ERROR_LANGUAGE_NOT_SUPPORTED = 12 // SpeechRecognizer, API 31
        private const val ERROR_LANGUAGE_UNAVAILABLE = 13
        private const val SWITCHED_MSG = "לא נקלט קול. עברתי למצב מיקרופון חלופי – לחץ שוב"

        @Volatile
        var instance: PilotService? = null
            private set

        /** צמד שביקשו לפתוח לפני שהשירות התחבר */
        @Volatile
        var pendingPairId: String? = null

        fun isEnabled(ctx: Context): Boolean {
            val s = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
            val full = "${ctx.packageName}/${PilotService::class.java.name}"
            val short = "${ctx.packageName}/.service.PilotService"
            return s.split(':').any { it.equals(full, true) || it.equals(short, true) }
        }
    }
}
