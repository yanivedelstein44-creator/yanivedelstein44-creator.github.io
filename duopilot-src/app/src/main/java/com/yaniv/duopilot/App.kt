package com.yaniv.duopilot

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager

class App : Application() {
    override fun onCreate() {
        super.onCreate()
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CH_CAR, "שיחה עם DuoPilot (אנדרואיד אוטו)", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "הודעות מהעוזר הקולי. באנדרואיד אוטו אפשר לשמוע אותן ולענות בקול."
            }
        )
        nm.createNotificationChannel(
            NotificationChannel(CH_UPDATES, "עדכוני DuoPilot", NotificationManager.IMPORTANCE_LOW)
        )
    }

    companion object {
        const val CH_CAR = "duopilot_car"
        const val CH_UPDATES = "duopilot_updates"
        const val TAG = "DuoPilot"
    }
}
