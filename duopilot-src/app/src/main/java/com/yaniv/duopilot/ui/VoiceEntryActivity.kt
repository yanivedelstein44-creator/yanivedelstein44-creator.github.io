package com.yaniv.duopilot.ui

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import com.yaniv.duopilot.Bg
import com.yaniv.duopilot.Prefs
import com.yaniv.duopilot.agent.Source
import com.yaniv.duopilot.service.Overlays
import com.yaniv.duopilot.service.PilotService
import com.yaniv.duopilot.voice.VoiceIO

/**
 * כניסה לעוזר הקולי: האייקון "פקודה קולית", קיצור דרך, ו"עוזר דיגיטלי" (לחיצה ארוכה על הבית/הצד, אם בחרת ב-DuoPilot).
 * במצב "מיקרופון חלופי" המסך השקוף הזה גם מקליט בעצמו – כשהוא פתוח האפליקציה בחזית, והמיקרופון תמיד מותר.
 */
class VoiceEntryActivity : Activity() {
    private var voice: VoiceIO? = null
    private var done = false
    private var cb: ((String?) -> Unit)? = null
    private lateinit var partial: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val svc = PilotService.instance
        if (svc == null) {
            startActivity(
                Intent(this, MainActivity::class.java)
                    .putExtra(MainActivity.EXTRA_NO_AUTO, true)
                    .putExtra(MainActivity.EXTRA_REASON, "service")
            )
            finish()
            return
        }
        val host = intent.getBooleanExtra(EXTRA_HOST, false) || Prefs(this).micViaActivity
        if (!host) {
            finish()
            Bg.later(350) { svc.startVoiceSession(Source.PHONE) }
            return
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            pendingCallback = null
            svc.openMain("mic")
            finish()
            return
        }
        cb = pendingCallback ?: { text -> if (!text.isNullOrBlank()) svc.runCommand(text, Source.PHONE) else svc.overlays.setMode(Overlays.Mode.IDLE) }
        pendingCallback = null
        buildUi()
        svc.overlays.setMode(Overlays.Mode.LISTENING)
        val v = VoiceIO(this)
        voice = v
        v.listen(Prefs(this).language, object : VoiceIO.Listener {
            override fun onPartial(text: String) {
                partial.text = text
            }

            override fun onResult(text: String?) {
                complete(text)
            }

            override fun onError(code: Int) {
                complete(null)
            }
        })
    }

    private fun buildUi() {
        val root = FrameLayout(this)
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(16), dp(20), dp(16))
            background = GradientDrawable().apply {
                cornerRadius = dp(22).toFloat()
                setColor(0xF2121A2A.toInt())
                setStroke(dp(1), 0x554F8CFF)
            }
        }
        card.addView(label("🎤 מקשיב…", 15f, 0xFF9FD8FF.toInt(), bold = true))
        partial = label("אמור מה לעשות", 18f).apply { setPadding(0, dp(6), 0, dp(10)) }
        card.addView(partial)
        card.addView(button("ביטול", Btn.SECONDARY) { complete(null) })
        root.addView(card, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM).apply {
            setMargins(dp(12), 0, dp(12), dp(110))
        })
        root.setOnClickListener { complete(null) }
        setContentView(root)
        partial.typeface = Typeface.DEFAULT
    }

    private fun complete(text: String?) {
        if (done) return
        done = true
        val c = cb
        cb = null
        voice?.cancelListening()
        finish()
        Bg.later(250) { c?.invoke(text) }
    }

    override fun onDestroy() {
        voice?.release()
        if (!done) {
            done = true
            val c = cb
            cb = null
            c?.invoke(null)
        }
        super.onDestroy()
    }

    companion object {
        const val EXTRA_HOST = "host"

        @Volatile
        var pendingCallback: ((String?) -> Unit)? = null
    }
}
