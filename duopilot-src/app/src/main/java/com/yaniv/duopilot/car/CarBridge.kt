package com.yaniv.duopilot.car

import android.Manifest
import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Person
import android.app.RemoteInput
import android.app.UiModeManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import com.yaniv.duopilot.App
import com.yaniv.duopilot.Bg
import com.yaniv.duopilot.Prefs
import com.yaniv.duopilot.R
import com.yaniv.duopilot.agent.Source
import com.yaniv.duopilot.service.PilotService
import com.yaniv.duopilot.ui.MainActivity
import java.util.ArrayDeque
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

/**
 * החיבור לאנדרואיד אוטו.
 * באנדרואיד אוטו כפתור הקול בהגה שייך ל-Google Assistant/Gemini, ושום אפליקציה לא יכולה לתפוס אותו.
 * לכן DuoPilot מופיע שם כ"שיחת הודעות": האוטו מקריא את מה ש-DuoPilot כותב, ואתה עונה בקול
 * ("השב" / "Reply") – Google מתמלל, והתשובה שלך מגיעה ל-DuoPilot כפקודה, שמתבצעת בטלפון.
 */
object CarBridge {
    const val ACTION_CAR_CONNECTION_UPDATED = "androidx.car.app.connection.action.CAR_CONNECTION_UPDATED"
    const val ACTION_REPLY = "com.yaniv.duopilot.CAR_REPLY"
    const val ACTION_READ = "com.yaniv.duopilot.CAR_READ"
    const val KEY_TEXT = "duopilot_command"
    private const val NOTIF_ID = 4242
    private const val GREETING = "DuoPilot מוכן. ענה להודעה הזו עם פקודה, למשל: תפתח את וויז ואת הדפדפן."

    private data class Msg(val fromUser: Boolean, val text: String, val time: Long)

    private val history = ArrayDeque<Msg>()
    private val answers = LinkedBlockingQueue<String>()

    @Volatile
    private var waiting = false

    @Volatile
    var connected = false
        private set

    /** בודק אם הטלפון מחובר עכשיו לאנדרואיד אוטו (ברקע) */
    fun checkConnection(ctx: Context) = Bg.async {
        val type = queryCarConnection(ctx)
        val uiCar = ctx.getSystemService(UiModeManager::class.java)?.currentModeType == Configuration.UI_MODE_TYPE_CAR
        val now = type > 0 || uiCar
        if (now != connected) {
            connected = now
            Log.i(App.TAG, "car connection: $now (type=$type, uiMode=$uiCar)")
            if (now && Prefs(ctx).carBridge) postAssistant(ctx, GREETING) else if (!now) cancel(ctx)
        }
    }

    /** אותו מנגנון שספריית androidx.car.app משתמשת בו (CarConnection) */
    private fun queryCarConnection(ctx: Context): Int = try {
        ctx.contentResolver.query(Uri.parse("content://androidx.car.app.connection"), arrayOf("CarConnectionState"), null, null, null)?.use { c ->
            if (c.moveToFirst()) {
                val i = c.getColumnIndex("CarConnectionState")
                if (i >= 0) c.getInt(i) else 0
            } else 0
        } ?: 0
    } catch (e: Exception) {
        0
    }

    fun postAssistant(ctx: Context, text: String) {
        synchronized(history) { add(Msg(false, text, System.currentTimeMillis())) }
        notify(ctx, alert = true)
    }

    /** הגיעה תשובה קולית מהרכב (או מההתראה בטלפון) */
    fun onUserReply(ctx: Context, text: String) {
        synchronized(history) { add(Msg(true, text, System.currentTimeMillis())) }
        notify(ctx, alert = false)
        if (waiting) {
            answers.offer(text)
            return
        }
        val svc = PilotService.instance
        if (svc == null) {
            postAssistant(ctx, "שירות הנגישות של DuoPilot כבוי בטלפון. צריך להפעיל אותו בהגדרות.")
        } else {
            svc.runCommand(text, Source.CAR)
        }
    }

    /** מחכה לתשובה הבאה (כשהעוזר שאל שאלה ברכב) */
    fun awaitReply(timeoutMs: Long): String? {
        answers.clear()
        waiting = true
        return try {
            answers.poll(timeoutMs, TimeUnit.MILLISECONDS)
        } finally {
            waiting = false
        }
    }

    fun markRead(ctx: Context) {
        notify(ctx, alert = false)
    }

    fun cancel(ctx: Context) {
        ctx.getSystemService(NotificationManager::class.java)?.cancel(NOTIF_ID)
    }

    private fun add(m: Msg) {
        history.addLast(m)
        while (history.size > 10) history.removeFirst()
    }

    private fun notify(ctx: Context, alert: Boolean) {
        if (Build.VERSION.SDK_INT >= 33 &&
            ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            Log.w(App.TAG, "car bridge: no notification permission")
            return
        }
        val nm = ctx.getSystemService(NotificationManager::class.java) ?: return
        val me = Person.Builder().setName("אני").setKey("me").build()
        val bot = Person.Builder()
            .setName("DuoPilot")
            .setKey("duopilot")
            .setBot(true)
            .setIcon(Icon.createWithResource(ctx, R.mipmap.ic_launcher))
            .build()
        val style = Notification.MessagingStyle(me)
        val snapshot = synchronized(history) { history.toList() }
        for (m in snapshot) {
            style.addMessage(Notification.MessagingStyle.Message(m.text, m.time, if (m.fromUser) null as Person? else bot))
        }

        // אנדרואיד אוטו מחפש פעולת "תשובה" עם RemoteInput ופעולת "סמן כנקרא", שתיהן בלי מסך.
        val noUi = Bundle().apply { putBoolean("android.support.action.showsUserInterface", false) }
        val replyPi = PendingIntent.getBroadcast(
            ctx, 11,
            Intent(ctx, CarReplyReceiver::class.java).setAction(ACTION_REPLY),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
        )
        val readPi = PendingIntent.getBroadcast(
            ctx, 12,
            Intent(ctx, CarReplyReceiver::class.java).setAction(ACTION_READ),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val reply = Notification.Action.Builder(Icon.createWithResource(ctx, R.drawable.ic_mic), "פקודה", replyPi)
            .addRemoteInput(RemoteInput.Builder(KEY_TEXT).setLabel("מה לעשות?").build())
            .setSemanticAction(Notification.Action.SEMANTIC_ACTION_REPLY)
            .setAllowGeneratedReplies(false)
            .addExtras(noUi)
            .build()
        val read = Notification.Action.Builder(Icon.createWithResource(ctx, R.drawable.ic_check), "סמן כנקרא", readPi)
            .setSemanticAction(Notification.Action.SEMANTIC_ACTION_MARK_AS_READ)
            .addExtras(Bundle(noUi))
            .build()
        val open = PendingIntent.getActivity(
            ctx, 13,
            Intent(ctx, MainActivity::class.java).putExtra(MainActivity.EXTRA_NO_AUTO, true),
            PendingIntent.FLAG_IMMUTABLE,
        )
        val n = Notification.Builder(ctx, App.CH_CAR)
            .setSmallIcon(R.drawable.ic_stat_pilot)
            .setStyle(style)
            .setCategory(Notification.CATEGORY_MESSAGE)
            .addAction(reply)
            .addAction(read)
            .setContentIntent(open)
            .setOnlyAlertOnce(!alert)
            .setShowWhen(true)
            .setAutoCancel(false)
            .build()
        try {
            nm.notify(NOTIF_ID, n)
        } catch (e: Exception) {
            Log.w(App.TAG, "car notify", e)
        }
    }
}

class CarReplyReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val app = context.applicationContext
        when (intent.action) {
            CarBridge.ACTION_REPLY -> {
                val text = RemoteInput.getResultsFromIntent(intent)?.getCharSequence(CarBridge.KEY_TEXT)?.toString()?.trim()
                if (!text.isNullOrEmpty()) CarBridge.onUserReply(app, text)
            }
            CarBridge.ACTION_READ -> CarBridge.markRead(app)
        }
    }
}
