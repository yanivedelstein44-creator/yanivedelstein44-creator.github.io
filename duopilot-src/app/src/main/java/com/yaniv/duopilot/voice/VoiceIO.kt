package com.yaniv.duopilot.voice

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.os.Bundle
import android.os.SystemClock
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import com.yaniv.duopilot.App
import com.yaniv.duopilot.Bg
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap

/** זיהוי דיבור (SpeechRecognizer) והקראה (TextToSpeech). כל הקריאות מועברות ל-UI thread. */
class VoiceIO(private val ctx: Context) {

    interface Listener {
        fun onPartial(text: String) {}
        fun onResult(text: String?)
        fun onError(code: Int)
    }

    /** כשהשירות המובנה בטלפון לא תומך בעברית – עוברים לזיהוי של Google */
    @Volatile
    var preferGoogle = false

    private var recognizer: SpeechRecognizer? = null
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var ttsLanguage = ""
    private var pendingSpeech: (() -> Unit)? = null
    private val doneCallbacks = ConcurrentHashMap<String, () -> Unit>()

    fun listen(language: String, l: Listener) = Bg.ui {
        cancelListening()
        val rec = createRecognizer()
        if (rec == null) {
            l.onError(ERROR_NO_RECOGNIZER)
            return@ui
        }
        recognizer = rec
        var delivered = false
        rec.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onEvent(eventType: Int, params: Bundle?) {}

            override fun onPartialResults(partialResults: Bundle?) {
                val t = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                if (!t.isNullOrBlank()) l.onPartial(t)
            }

            override fun onResults(results: Bundle?) {
                if (delivered) return
                delivered = true
                val t = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                destroyLater(rec)
                l.onResult(t)
            }

            override fun onError(error: Int) {
                if (delivered) return
                delivered = true
                destroyLater(rec)
                l.onError(error)
            }
        })
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, language)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, ctx.packageName)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1500L)
        }
        try {
            rec.startListening(intent)
        } catch (e: Exception) {
            Log.w(App.TAG, "startListening", e)
            delivered = true
            destroyLater(rec)
            l.onError(SpeechRecognizer.ERROR_CLIENT)
        }
    }

    private fun createRecognizer(): SpeechRecognizer? {
        val google = ComponentName(GOOGLE_APP, GOOGLE_RECOGNIZER)
        val hasGoogle = try {
            ctx.packageManager.getPackageInfo(GOOGLE_APP, 0)
            true
        } catch (e: Exception) {
            false
        }
        return try {
            when {
                preferGoogle && hasGoogle -> SpeechRecognizer.createSpeechRecognizer(ctx, google)
                SpeechRecognizer.isRecognitionAvailable(ctx) -> SpeechRecognizer.createSpeechRecognizer(ctx)
                hasGoogle -> SpeechRecognizer.createSpeechRecognizer(ctx, google)
                else -> null
            }
        } catch (e: Exception) {
            Log.w(App.TAG, "createSpeechRecognizer", e)
            null
        }
    }

    private fun destroyLater(rec: SpeechRecognizer) {
        Bg.main.post {
            try {
                rec.destroy()
            } catch (_: Exception) {
            }
            if (recognizer === rec) recognizer = null
        }
    }

    fun cancelListening() = Bg.ui {
        recognizer?.let {
            try {
                it.cancel()
                it.destroy()
            } catch (_: Exception) {
            }
        }
        recognizer = null
    }

    // ------------------------------------------------------------------ הקראה

    fun speak(text: String, language: String, onDone: (() -> Unit)? = null) = Bg.ui {
        if (text.isBlank()) {
            onDone?.invoke()
            return@ui
        }
        val t = tts
        if (t == null) {
            pendingSpeech = { doSpeak(text, language, onDone) }
            tts = TextToSpeech(ctx.applicationContext) { status ->
                ttsReady = status == TextToSpeech.SUCCESS
                val p = pendingSpeech
                pendingSpeech = null
                if (ttsReady) {
                    setup()
                    p?.invoke()
                } else {
                    onDone?.invoke()
                }
            }
            return@ui
        }
        if (!ttsReady) {
            pendingSpeech = { doSpeak(text, language, onDone) }
            return@ui
        }
        doSpeak(text, language, onDone)
    }

    private fun setup() {
        val t = tts ?: return
        t.setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANT)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build()
        )
        t.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {}

            override fun onDone(utteranceId: String?) {
                utteranceId?.let { id -> doneCallbacks.remove(id)?.let { Bg.ui(it) } }
            }

            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) {
                utteranceId?.let { id -> doneCallbacks.remove(id)?.let { Bg.ui(it) } }
            }

            override fun onStop(utteranceId: String?, interrupted: Boolean) {
                utteranceId?.let { id -> doneCallbacks.remove(id)?.let { Bg.ui(it) } }
            }
        })
    }

    private fun doSpeak(text: String, language: String, onDone: (() -> Unit)?) {
        val t = tts ?: run {
            onDone?.invoke()
            return
        }
        if (language != ttsLanguage) {
            val r = t.setLanguage(Locale.forLanguageTag(language))
            if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) t.setLanguage(Locale.getDefault())
            ttsLanguage = language
        }
        val id = "u" + SystemClock.uptimeMillis()
        if (onDone != null) doneCallbacks[id] = onDone
        val r = t.speak(text, TextToSpeech.QUEUE_FLUSH, Bundle(), id)
        if (r != TextToSpeech.SUCCESS) doneCallbacks.remove(id)?.invoke()
    }

    fun stopSpeaking() = Bg.ui {
        try {
            tts?.stop()
        } catch (_: Exception) {
        }
        val pending = doneCallbacks.values.toList()
        doneCallbacks.clear()
        pending.forEach { it() }
    }

    fun stopAll() {
        cancelListening()
        stopSpeaking()
    }

    fun release() = Bg.ui {
        cancelListening()
        try {
            tts?.shutdown()
        } catch (_: Exception) {
        }
        tts = null
        ttsReady = false
    }

    companion object {
        const val ERROR_NO_RECOGNIZER = -1
        private const val GOOGLE_APP = "com.google.android.googlequicksearchbox"
        private const val GOOGLE_RECOGNIZER = "com.google.android.voicesearch.serviceapi.GoogleRecognitionService"
    }
}
