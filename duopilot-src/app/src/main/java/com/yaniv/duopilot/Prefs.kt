package com.yaniv.duopilot

import android.content.Context
import android.content.SharedPreferences
import kotlin.properties.ReadWriteProperty
import kotlin.reflect.KProperty

/** כל ההגדרות של DuoPilot במקום אחד. */
class Prefs(context: Context) {
    val sp: SharedPreferences = context.applicationContext.getSharedPreferences("duopilot", Context.MODE_PRIVATE)

    var model by StrPref("model", MODEL_BALANCED)
    var language by StrPref("language", "he-IL")
    var speakReplies by BoolPref("speak_replies", true)
    var sendScreenshot by BoolPref("send_screenshot", true)
    var showBubble by BoolPref("show_bubble", true)
    var autoOpenLastPair by BoolPref("auto_open_last_pair", true)
    var rememberScroll by BoolPref("remember_scroll", true)
    var rememberRatio by BoolPref("remember_ratio", true)
    var carBridge by BoolPref("car_bridge", true)
    var slowMode by BoolPref("slow_mode", false)
    var micViaActivity by BoolPref("mic_via_activity", false)
    var autoUpdate by BoolPref("auto_update", true)
    var maxSteps by IntPref("max_steps", 12)
    var bubbleX by IntPref("bubble_x", -1)
    var bubbleY by IntPref("bubble_y", -1)
    var lastUpdateCheck by LongPref("last_update_check", 0L)
    var browserHome by StrPref("browser_home", "https://www.google.com/")

    /** מפתח Claude API – נשמר מוצפן במפתח של Android Keystore. */
    var apiKey: String
        get() {
            cachedKey?.let { return it }
            val plain = SecretBox.decrypt(sp.getString("api_key_enc", null)) ?: ""
            cachedKey = plain
            return plain
        }
        set(value) {
            val v = value.trim()
            cachedKey = v
            sp.edit().putString("api_key_enc", if (v.isEmpty()) null else SecretBox.encrypt(v)).apply()
        }

    private class BoolPref(val key: String, val def: Boolean) : ReadWriteProperty<Prefs, Boolean> {
        override fun getValue(thisRef: Prefs, property: KProperty<*>): Boolean = thisRef.sp.getBoolean(key, def)
        override fun setValue(thisRef: Prefs, property: KProperty<*>, value: Boolean) {
            thisRef.sp.edit().putBoolean(key, value).apply()
        }
    }

    private class StrPref(val key: String, val def: String) : ReadWriteProperty<Prefs, String> {
        override fun getValue(thisRef: Prefs, property: KProperty<*>): String = thisRef.sp.getString(key, def) ?: def
        override fun setValue(thisRef: Prefs, property: KProperty<*>, value: String) {
            thisRef.sp.edit().putString(key, value).apply()
        }
    }

    private class IntPref(val key: String, val def: Int) : ReadWriteProperty<Prefs, Int> {
        override fun getValue(thisRef: Prefs, property: KProperty<*>): Int = thisRef.sp.getInt(key, def)
        override fun setValue(thisRef: Prefs, property: KProperty<*>, value: Int) {
            thisRef.sp.edit().putInt(key, value).apply()
        }
    }

    private class LongPref(val key: String, val def: Long) : ReadWriteProperty<Prefs, Long> {
        override fun getValue(thisRef: Prefs, property: KProperty<*>): Long = thisRef.sp.getLong(key, def)
        override fun setValue(thisRef: Prefs, property: KProperty<*>, value: Long) {
            thisRef.sp.edit().putLong(key, value).apply()
        }
    }

    companion object {
        const val MODEL_FAST = "claude-haiku-5-5"
        const val MODEL_BALANCED = "claude-sonnet-5-5"
        const val MODEL_BEST = "claude-opus-5-5"

        @Volatile
        private var cachedKey: String? = null
    }
}
