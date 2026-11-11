package com.yaniv.duopilot.ui

import android.Manifest
import android.animation.ObjectAnimator
import android.app.Activity
import android.app.AlertDialog
import android.content.ComponentName
import android.content.DialogInterface
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.PopupMenu
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.Toast
import com.yaniv.duopilot.Bg
import com.yaniv.duopilot.BuildConfig
import com.yaniv.duopilot.Prefs
import com.yaniv.duopilot.R
import com.yaniv.duopilot.agent.ClaudeClient
import com.yaniv.duopilot.agent.Source
import com.yaniv.duopilot.car.CarBridge
import com.yaniv.duopilot.pairs.AppCatalog
import com.yaniv.duopilot.pairs.AppPair
import com.yaniv.duopilot.pairs.PairStore
import com.yaniv.duopilot.pairs.Targets
import com.yaniv.duopilot.service.PilotService
import com.yaniv.duopilot.update.Updater

/** המסך הראשי: הגדרה ראשונית, הצמדים, העוזר הקולי, הרכב, זיכרון ועדכונים */
class MainActivity : Activity() {
    private lateinit var prefs: Prefs
    private lateinit var store: PairStore
    private lateinit var root: FrameLayout
    private lateinit var content: LinearLayout
    private var stopped = true
    private var countdown: View? = null
    private val pairsListener: () -> Unit = { Bg.ui { if (!isFinishing && !isDestroyed) render() } }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = Prefs(this)
        store = PairStore(this)
        root = FrameLayout(this).apply {
            setBackgroundColor(Palette.BG)
            layoutDirection = View.LAYOUT_DIRECTION_RTL
        }
        val scroll = ScrollView(this).apply { isFillViewport = true }
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(12), dp(16), dp(40))
        }
        scroll.addView(content, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        root.addView(scroll, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        setContentView(root)
        root.setOnApplyWindowInsetsListener { v, insets ->
            val i = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout() or WindowInsets.Type.ime())
            v.setPadding(i.left, i.top, i.right, i.bottom)
            WindowInsets.CONSUMED
        }
        PairStore.listeners.add(pairsListener)
        render()
        if (savedInstanceState == null) maybeAutoOpen(intent)
        handleReason(intent)
        Shortcuts.refreshDynamic(this)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (stopped) maybeAutoOpen(intent)
        handleReason(intent)
    }

    override fun onResume() {
        super.onResume()
        stopped = false
        render()
        Updater.maybeCheck(this, force = false)
    }

    override fun onStop() {
        stopped = true
        super.onStop()
    }

    override fun onDestroy() {
        PairStore.listeners.remove(pairsListener)
        super.onDestroy()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        render()
    }

    // ------------------------------------------------------------------ פתיחה אוטומטית של הצמד האחרון

    private fun maybeAutoOpen(i: Intent?) {
        if (i == null || i.getBooleanExtra(EXTRA_NO_AUTO, false)) return
        if (i.action != Intent.ACTION_MAIN) return
        if (!prefs.autoOpenLastPair) return
        val last = store.last() ?: return
        val svc = PilotService.instance ?: return
        showCountdown(last, svc)
    }

    private fun showCountdown(pair: AppPair, svc: PilotService) {
        countdown?.let { root.removeView(it) }
        val overlay = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(0xF20E1420.toInt())
            isClickable = true
            setPadding(dp(32), dp(32), dp(32), dp(32))
        }
        overlay.addView(ImageView(this).apply {
            setImageBitmap(IconComposer.pairIcon(this@MainActivity, pair.top, pair.bottom, dp(110)))
        }, LinearLayout.LayoutParams(dp(110), dp(110)))
        overlay.addView(label("פותח את הצמד האחרון", 20f, bold = true).apply {
            gravity = Gravity.CENTER
            setPadding(0, dp(16), 0, dp(4))
        })
        overlay.addView(label("למעלה: ${AppCatalog.label(this, pair.top)}\nלמטה: ${AppCatalog.label(this, pair.bottom)}", 15f, Palette.SUB).apply {
            gravity = Gravity.CENTER
        })
        val bar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 1000
            progress = 0
        }
        overlay.addView(bar, LinearLayout.LayoutParams(dp(220), dp(8)).apply {
            topMargin = dp(20)
            bottomMargin = dp(20)
        })
        val go = Runnable {
            if (countdown === overlay) {
                root.removeView(overlay)
                countdown = null
                svc.launchPair(pair)
            }
        }
        overlay.addView(button("ביטול – להגדרות", Btn.SECONDARY) {
            overlay.removeCallbacks(go)
            root.removeView(overlay)
            countdown = null
        })
        root.addView(overlay, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        countdown = overlay
        ObjectAnimator.ofInt(bar, "progress", 0, 1000).setDuration(COUNTDOWN_MS).start()
        overlay.postDelayed(go, COUNTDOWN_MS)
    }

    private fun handleReason(i: Intent?) {
        when (i?.getStringExtra(EXTRA_REASON)) {
            "mic" -> if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), REQ_MIC)
            }
            "service" -> if (PilotService.instance == null) needService()
        }
        i?.removeExtra(EXTRA_REASON)
    }

    // ------------------------------------------------------------------ בניית המסך

    private fun render() {
        content.removeAllViews()
        header()
        lastPairButton()
        setupCard()
        pairsCard()
        voiceCard()
        carCard()
        memoryCard()
        updatesCard()
        footer()
    }

    private fun section(title: String, subtitle: String? = null): LinearLayout {
        content.gap(this, 16)
        content.addView(label(title, 13f, Palette.SUB, bold = true).apply { setPadding(dp(6), 0, dp(6), dp(6)) })
        val c = card()
        content.addView(c, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        if (subtitle != null) c.addView(label(subtitle, 13f, Palette.SUB).apply { setPadding(0, 0, 0, dp(8)) })
        return c
    }

    private fun header() {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(4), dp(8), dp(4), dp(4))
        }
        row.addView(ImageView(this).apply { setImageResource(R.mipmap.ic_launcher) }, LinearLayout.LayoutParams(dp(54), dp(54)).apply { marginEnd = dp(12) })
        val texts = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        texts.addView(label("DuoPilot", 26f, bold = true))
        texts.addView(label("שתי אפליקציות במסך אחד · עוזר קולי שלוחץ בשבילך", 13f, Palette.SUB))
        row.addView(texts, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        content.addView(row)
    }

    private fun lastPairButton() {
        val last = store.last() ?: return
        content.gap(this, 12)
        val b = button("▶  פתח את הצמד האחרון\nלמעלה: ${AppCatalog.label(this, last.top)}  ·  למטה: ${AppCatalog.label(this, last.bottom)}") { openPair(last) }
        b.textSize = 15f
        b.setPadding(dp(16), dp(14), dp(16), dp(14))
        content.addView(b, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
    }

    private fun setupCard() {
        val serviceOn = PilotService.instance != null || PilotService.isEnabled(this)
        val mic = checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        val notif = Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        val key = prefs.apiKey.isNotBlank()
        val battery = getSystemService(PowerManager::class.java)?.isIgnoringBatteryOptimizations(packageName) == true
        val c = section(if (serviceOn && mic && notif && key) "מוכן לעבודה ✓" else "הגדרה ראשונית")
        c.addView(
            statusRow(
                "שירות נגישות", serviceOn,
                if (serviceOn) "פעיל: מסך מפוצל, זיכרון ועוזר קולי" else "חובה. נגישות ← אפליקציות מותקנות ← DuoPilot",
                if (serviceOn) "הגדרות" else "הפעל",
            ) { openAccessibility() }
        )
        if (!serviceOn) {
            c.addView(label("אם השירות אפור ורשום \"הגדרה מוגבלת\": פרטי האפליקציה ← ⋮ למעלה ← \"אפשר הגדרות מוגבלות\", ואז שוב \"הפעל\".", 12.5f, Palette.WARN).apply {
                setPadding(dp(42), 0, 0, dp(6))
            })
            c.addView(button("פרטי האפליקציה", Btn.SECONDARY) { openAppInfo() }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                bottomMargin = dp(6)
            })
        }
        c.addView(statusRow("מיקרופון", mic, "לפקודות קוליות", if (mic) null else "אשר") {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), REQ_MIC)
        })
        if (Build.VERSION.SDK_INT >= 33) {
            c.addView(statusRow("התראות", notif, "לשיחה עם DuoPilot באנדרואיד אוטו ולעדכונים", if (notif) null else "אשר") {
                requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQ_NOTIF)
            })
        }
        c.addView(statusRow("מפתח Claude API", key, if (key) "נשמר מוצפן בטלפון" else "המוח של העוזר הקולי", if (key) "שנה" else "הוסף") { apiKeyDialog() })
        c.addView(statusRow("בלי הגבלת סוללה (מומלץ)", battery, "כדי שהטלפון לא יקפיא את DuoPilot", if (battery) null else "אשר") { requestBattery() })
    }

    private fun pairsCard() {
        val c = section("הצמדים שלי", "כל צמד נפתח במסך מפוצל: אחת למעלה ואחת למטה. DuoPilot זוכר את הצמד, את גודל החלוקה ואיפה גללת.")
        val pairs = store.all()
        if (pairs.isEmpty()) c.addView(label("עוד אין צמדים – צור את הראשון 👇", 14f, Palette.SUB).apply { setPadding(0, dp(4), 0, dp(8)) })
        for (p in pairs) {
            c.addView(pairRow(p))
            c.divider(this)
        }
        c.addView(button("+ צמד חדש") { newPair() }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            topMargin = dp(6)
        })
    }

    private fun pairRow(p: AppPair): View {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, dp(6), 0, dp(6))
        }
        row.addView(ImageView(this).apply {
            setImageBitmap(IconComposer.pairIcon(this@MainActivity, p.top, p.bottom, dp(48)))
        }, LinearLayout.LayoutParams(dp(48), dp(48)).apply { marginEnd = dp(12) })
        val texts = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        texts.addView(label("למעלה: " + AppCatalog.label(this, p.top), 15f, bold = true))
        texts.addView(label("למטה: " + AppCatalog.label(this, p.bottom), 14f, Palette.SUB))
        row.addView(texts, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        row.addView(button("פתח") { openPair(p) }.apply {
            textSize = 13f
            setPadding(dp(14), dp(8), dp(14), dp(8))
        })
        val more = label("⋮", 22f, Palette.SUB, bold = true).apply { setPadding(dp(12), dp(4), dp(4), dp(4)) }
        more.setOnClickListener { v -> pairMenu(v, p) }
        row.addView(more)
        return row
    }

    private fun pairMenu(anchor: View, p: AppPair) {
        val m = PopupMenu(this, anchor)
        m.menu.add(0, 1, 0, "הוסף למסך הבית")
        m.menu.add(0, 2, 1, "החלף למעלה ↔ למטה")
        m.menu.add(0, 3, 2, "מחק")
        m.setOnMenuItemClickListener { item ->
            when (item.itemId) {
                1 -> if (!Shortcuts.pin(this, p)) toast("מסך הבית לא תומך בהוספת קיצורים")
                2 -> {
                    store.save(p.copy(top = p.bottom, bottom = p.top, ratio = if (p.ratio > 0) 1f - p.ratio else -1f))
                    Shortcuts.refreshDynamic(this)
                }
                3 -> confirm("למחוק את הצמד?") {
                    store.delete(p.id)
                    Shortcuts.refreshDynamic(this)
                }
            }
            true
        }
        m.show()
    }

    private fun newPair() {
        AppPicker.pick(this, "מה יהיה למעלה? ⬆", Targets.BROWSER_A) { top ->
            val browserForBottom = if (top == Targets.BROWSER_A) Targets.BROWSER_B else Targets.BROWSER_A
            AppPicker.pick(this, "ומה למטה? ⬇", browserForBottom) { bottom ->
                val p = store.findOrCreate(top, bottom)
                Shortcuts.refreshDynamic(this)
                AlertDialog.Builder(this, THEME)
                    .setTitle("הצמד נשמר ✓")
                    .setMessage("למעלה: ${AppCatalog.label(this, top)}\nלמטה: ${AppCatalog.label(this, bottom)}\n\nלפתוח אותו עכשיו?")
                    .setPositiveButton("פתח עכשיו") { _, _ -> openPair(p) }
                    .setNeutralButton("הוסף למסך הבית") { _, _ -> Shortcuts.pin(this, p) }
                    .setNegativeButton("אחר כך", null)
                    .show()
            }
        }
    }

    private fun voiceCard() {
        val c = section(
            "עוזר קולי",
            "לחץ על בועת המיקרופון (או על האייקון \"פקודה קולית\") ותגיד מה לעשות: \"תלחץ על החיפוש למעלה\", \"תפתח וואטסאפ למעלה ויוטיוב למטה\", \"תגלול למטה בדפדפן\", \"נווט הביתה\".",
        )
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        row.addView(button("🎤 נסה עכשיו") { tryVoice() }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        row.addView(button("⌨️ פקודה בכתב", Btn.SECONDARY) { textCommand() }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
            marginStart = dp(8)
        })
        c.addView(row)
        c.gap(this, 10)
        c.addView(label("שפת דיבור", 13f, Palette.SUB))
        c.addView(chips(listOf("he-IL" to "עברית", "en-US" to "English"), prefs.language) {
            prefs.language = it
            render()
        })
        c.addView(label("מודל Claude", 13f, Palette.SUB))
        c.addView(chips(listOf(Prefs.MODEL_FAST to "מהיר", Prefs.MODEL_BALANCED to "מאוזן", Prefs.MODEL_BEST to "הכי חכם"), prefs.model) {
            prefs.model = it
            render()
        })
        c.addView(label("מהיר = Haiku (זול ומהיר) · מאוזן = Sonnet · הכי חכם = Opus (איטי ויקר יותר)", 12f, Palette.SUB))
        c.gap(this, 4)
        c.addView(switchRow("בועת מיקרופון צפה", "כפתור קטן מעל כל האפליקציות. גרירה – להזיז, לחיצה ארוכה – הגדרות", prefs.showBubble) { on ->
            prefs.showBubble = on
            PilotService.instance?.overlays?.let { if (on) it.showBubble() else it.hideBubble() }
        })
        c.addView(switchRow("להקריא תשובות", null, prefs.speakReplies) { prefs.speakReplies = it })
        c.addView(switchRow("לשלוח צילום מסך ל-Claude", "מדויק יותר באייקונים בלי טקסט. נשלח רק בזמן פקודה", prefs.sendScreenshot) { prefs.sendScreenshot = it })
        c.addView(label("לפני שליחת הודעה, תשלום, מחיקה או שיחה העוזר שואל אותך קודם.", 12.5f, Palette.SUB).apply { setPadding(0, dp(6), 0, 0) })
    }

    private fun carCard() {
        val c = section("רכב · Android Auto")
        val on = CarBridge.connected
        c.addView(label(if (on) "🚗 מחובר עכשיו לאנדרואיד אוטו" else "לא מחובר לרכב כרגע", 14f, if (on) Palette.OK else Palette.SUB, bold = true))
        c.addView(label(
            "באנדרואיד אוטו כפתור הקול בהגה שייך ל-Google. לכן DuoPilot מופיע שם כשיחת הודעות: האוטו מקריא את ההודעות שלו, ואתה עונה בקול (\"השב\") עם פקודה, והיא מתבצעת בטלפון.",
            13f, Palette.SUB,
        ).apply { setPadding(0, dp(6), 0, dp(4)) })
        c.addView(switchRow("שיחה עם DuoPilot באנדרואיד אוטו", "נפתחת לבד כשמתחברים לרכב", prefs.carBridge) {
            prefs.carBridge = it
            if (!it) CarBridge.cancel(this)
        })
        c.addView(button("שלח הודעת בדיקה", Btn.SECONDARY) { sendCarTest() })
        c.addView(label(
            "הגדרה חד-פעמית: באפליקציית Android Auto ← גלול עד \"גרסה\" ← הקש עליה 10 פעמים ← ⋮ ← הגדרות מפתח ← סמן \"מקורות לא ידועים\". ובהגדרות Android Auto ודא שהתראות הודעות מופעלות.",
            12.5f, Palette.WARN,
        ).apply { setPadding(0, dp(10), 0, 0) })
    }

    private fun memoryCard() {
        val c = section("זיכרון")
        c.addView(switchRow("לפתוח את הצמד האחרון כשנכנסים", "יש שנייה וחצי לבטל ולהגיע להגדרות", prefs.autoOpenLastPair) { prefs.autoOpenLastPair = it })
        c.addView(switchRow("לזכור איפה גללתי", "בדפדפן המובנה – מדויק. באפליקציות אחרות – לפי הפריט האחרון שראית", prefs.rememberScroll) { prefs.rememberScroll = it })
        c.addView(switchRow("לזכור את גודל החלוקה", "אם הזזת את הקו המפריד – הוא יחזור לשם", prefs.rememberRatio) { prefs.rememberRatio = it })
        c.addView(switchRow("מצב איטי", "אם הצמד לא נפתח טוב – מחכה יותר בין השלבים", prefs.slowMode) { prefs.slowMode = it })
        c.addView(switchRow("מיקרופון חלופי", "אם הבועה לא שומעת אותך – מקליט דרך חלון שקוף קטן", prefs.micViaActivity) { prefs.micViaActivity = it })
    }

    private fun updatesCard() {
        val c = section("עדכונים")
        c.addView(label("גרסה ${BuildConfig.VERSION_NAME}", 14f, bold = true))
        c.addView(switchRow("עדכונים אוטומטיים", "בודק באתר שלך, מוריד ומתקין לבד. לא באמצע פקודה ולא כשמחובר לרכב", prefs.autoUpdate) { prefs.autoUpdate = it })
        c.addView(button("בדוק עכשיו", Btn.SECONDARY) { Updater.maybeCheck(this, force = true, ui = this) })
        c.gap(this, 8)
        c.addView(button("שלח דוח תקלות", Btn.SECONDARY) { shareDiagnostics() })
        c.addView(label("אם הצמד לא נפתח טוב: שולחים את הדוח (למשל לעצמך בוואטסאפ) ומדביקים אותו לקלוד. יש בו רק את מסך הבית/האחרונות, לא את התוכן של האפליקציות.", 12f, Palette.SUB).apply {
            setPadding(0, dp(6), 0, 0)
        })
    }

    private fun shareDiagnostics() {
        val f = java.io.File(filesDir, "split-log.txt")
        val log = if (f.exists()) f.readText().takeLast(60_000) else "(עוד אין יומן – נסה לפתוח צמד ואז לשלוח שוב)"
        val head = "DuoPilot ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})\n" +
            "device: ${Build.MANUFACTURER} ${Build.MODEL}, Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})\n" +
            "split method: ${prefs.splitMethod.ifEmpty { "unknown" }}, slow mode: ${prefs.slowMode}\n" +
            "service: ${PilotService.instance != null}, car: ${CarBridge.connected}\n"
        val text = head + log
        try {
            startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text), "שלח דוח תקלות"))
        } catch (_: Exception) {
            toast("אין אפליקציה לשיתוף")
        }
    }

    private fun footer() {
        content.gap(this, 18)
        content.addView(label(
            "פרטיות: הצמדים, מיקומי הגלילה ומפתח ה-API נשמרים רק בטלפון. תוכן המסך (טקסט ותמונה מוקטנת) נשלח ל-Claude רק בזמן שאתה נותן פקודה.",
            12f, Palette.SUB,
        ).apply { setPadding(dp(6), 0, dp(6), 0) })
    }

    // ------------------------------------------------------------------ פעולות

    private fun openPair(p: AppPair) {
        val svc = PilotService.instance
        if (svc == null) {
            needService()
            return
        }
        svc.launchPair(p)
    }

    private fun tryVoice() {
        val svc = PilotService.instance ?: run {
            needService()
            return
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), REQ_MIC)
            return
        }
        svc.startVoiceSession(Source.PHONE)
    }

    private fun textCommand() {
        val svc = PilotService.instance ?: run {
            needService()
            return
        }
        val field = EditText(this).apply {
            hint = "למשל: תפתח את ההגדרות ותחפש בלוטות'"
            setTextColor(Palette.TEXT)
            setHintTextColor(Palette.SUB)
        }
        val box = FrameLayout(this).apply {
            setPadding(dp(20), dp(8), dp(20), 0)
            addView(field)
        }
        AlertDialog.Builder(this, THEME)
            .setTitle("פקודה בכתב")
            .setView(box)
            .setPositiveButton("בצע") { _, _ ->
                val t = field.text.toString().trim()
                if (t.isNotEmpty()) svc.runCommand(t, Source.PHONE)
            }
            .setNegativeButton("ביטול", null)
            .show()
    }

    private fun sendCarTest() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQ_NOTIF)
            return
        }
        CarBridge.postAssistant(this, "בדיקה: זו השיחה עם DuoPilot. ענה להודעה הזו עם פקודה – גם מההתראה בטלפון.")
        toast("נשלחה הודעה. אפשר לענות לה מההתראה")
    }

    private fun apiKeyDialog() {
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(8), dp(20), 0)
        }
        box.addView(label("מדביקים כאן מפתח API של Claude (מתחיל ב-sk-ant-). הוא נשמר מוצפן בטלפון ונשלח רק ל-Anthropic.", 13f, Palette.SUB))
        val field = EditText(this).apply {
            hint = "sk-ant-..."
            setSingleLine(true)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setText(prefs.apiKey)
            setTextColor(Palette.TEXT)
            setHintTextColor(Palette.SUB)
        }
        box.addView(field)
        val dlg = AlertDialog.Builder(this, THEME)
            .setTitle("מפתח Claude API")
            .setView(box)
            .setPositiveButton("שמור ובדוק", null)
            .setNegativeButton("ביטול", null)
            .setNeutralButton("איפה משיגים?") { _, _ -> openUrl("https://console.anthropic.com/settings/keys") }
            .create()
        dlg.setOnShowListener {
            val ok = dlg.getButton(DialogInterface.BUTTON_POSITIVE)
            ok.setOnClickListener {
                val k = field.text.toString().trim()
                prefs.apiKey = k
                if (k.isEmpty()) {
                    dlg.dismiss()
                    render()
                    return@setOnClickListener
                }
                ok.isEnabled = false
                toast("בודק את המפתח…")
                Bg.async {
                    val err = ClaudeClient.test(k, prefs.model)
                    Bg.ui {
                        ok.isEnabled = true
                        if (err == null) {
                            toast("המפתח עובד ✓")
                            dlg.dismiss()
                            render()
                        } else {
                            toast(err)
                        }
                    }
                }
            }
        }
        dlg.show()
    }

    private fun needService() {
        AlertDialog.Builder(this, THEME)
            .setTitle("צריך להפעיל את שירות הנגישות")
            .setMessage("בלי השירות DuoPilot לא יכול לפתוח מסך מפוצל, לזכור גלילה או ללחוץ בשבילך.\n\nהגדרות ← נגישות ← אפליקציות מותקנות ← DuoPilot ← הפעל.")
            .setPositiveButton("פתח הגדרות") { _, _ -> openAccessibility() }
            .setNegativeButton("אחר כך", null)
            .show()
    }

    private fun openAccessibility() {
        val details = Intent("android.settings.ACCESSIBILITY_DETAILS_SETTINGS")
            .putExtra(Intent.EXTRA_COMPONENT_NAME, ComponentName(this, PilotService::class.java).flattenToString())
        try {
            startActivity(details)
        } catch (e: Exception) {
            try {
                startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
            } catch (_: Exception) {
                toast("פתח ידנית: הגדרות ← נגישות")
            }
        }
    }

    private fun openAppInfo() {
        try {
            startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
        } catch (_: Exception) {
        }
    }

    @Suppress("BatteryLife")
    private fun requestBattery() {
        try {
            startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")))
        } catch (_: Exception) {
            try {
                startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
            } catch (_: Exception) {
            }
        }
    }

    private fun openUrl(url: String) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (_: Exception) {
        }
    }

    private fun confirm(question: String, onYes: () -> Unit) {
        AlertDialog.Builder(this, THEME)
            .setMessage(question)
            .setPositiveButton("כן") { _, _ -> onYes() }
            .setNegativeButton("לא", null)
            .show()
    }

    private fun toast(s: String) {
        Toast.makeText(this, s, Toast.LENGTH_LONG).show()
    }

    companion object {
        const val EXTRA_NO_AUTO = "no_auto"
        const val EXTRA_REASON = "reason"
        private const val REQ_MIC = 1
        private const val REQ_NOTIF = 2
        private const val COUNTDOWN_MS = 1500L
        private val THEME = android.R.style.Theme_Material_Dialog_Alert
    }
}
