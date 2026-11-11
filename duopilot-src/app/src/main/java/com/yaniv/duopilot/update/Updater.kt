package com.yaniv.duopilot.update

import android.app.Activity
import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import android.widget.Toast
import com.yaniv.duopilot.App
import com.yaniv.duopilot.Bg
import com.yaniv.duopilot.BuildConfig
import com.yaniv.duopilot.Prefs
import com.yaniv.duopilot.R
import com.yaniv.duopilot.car.CarBridge
import com.yaniv.duopilot.service.PilotService
import com.yaniv.duopilot.ui.MainActivity
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/**
 * עדכונים אוטומטיים מהאתר של יניב (GitHub Pages):
 * version.json → אם יש versionCode חדש יותר: הורדה, בדיקת SHA-256 וחתימה, והתקנה דרך PackageInstaller.
 * באנדרואיד 12+ אפליקציה שמעדכנת את עצמה לא צריכה חלון אישור (חוץ מהפעם הראשונה).
 * לא מתקינים באמצע פקודה, באמצע פתיחת צמד או כשמחובר לרכב – מחכים לפעם הבאה.
 */
object Updater {
    data class Remote(val versionCode: Long, val versionName: String, val apk: String, val sha256: String, val notes: String)

    private const val INTERVAL_MS = 6L * 3600 * 1000
    private const val RETRY_MS = 20L * 60 * 1000
    private val SAFE_NAME = Regex("[A-Za-z0-9._-]+")

    @Volatile
    private var running = false

    fun maybeCheck(ctx: Context, force: Boolean, ui: Activity? = null) {
        val app = ctx.applicationContext
        val prefs = Prefs(app)
        if (!force && !prefs.autoUpdate) return
        val now = System.currentTimeMillis()
        if (!force && now - prefs.lastUpdateCheck < INTERVAL_MS) return
        if (running) {
            if (ui != null) toast(ui, "כבר בודק עדכונים…")
            return
        }
        running = true
        prefs.lastUpdateCheck = now
        if (ui != null) toast(ui, "בודק עדכונים…")
        Bg.async {
            try {
                val remote = fetch()
                val current = installedVersionCode(app)
                if (remote.versionCode <= current) {
                    if (ui != null) toast(ui, "יש לך את הגרסה האחרונה (${BuildConfig.VERSION_NAME})")
                    return@async
                }
                if (!force && !idle()) {
                    // באמצע משהו – ננסה שוב בעוד כ-20 דקות
                    prefs.lastUpdateCheck = System.currentTimeMillis() - INTERVAL_MS + RETRY_MS
                    return@async
                }
                if (ui != null) toast(ui, "מוריד גרסה ${remote.versionName}…")
                val file = download(app, remote)
                val problem = inspect(app, file)
                if (problem != null) {
                    file.delete()
                    Log.w(App.TAG, "update rejected: $problem")
                    if (ui != null) toast(ui, problem)
                    return@async
                }
                if (!force && !idle()) {
                    prefs.lastUpdateCheck = System.currentTimeMillis() - INTERVAL_MS + RETRY_MS
                    return@async
                }
                prefs.sp.edit().putString("update_notes", remote.notes).putString("update_name", remote.versionName).apply()
                install(app, file)
            } catch (e: Exception) {
                Log.w(App.TAG, "update check failed", e)
                if (ui != null) toast(ui, "בדיקת העדכון נכשלה (אין אינטרנט?)")
            } finally {
                running = false
            }
        }
    }

    private fun idle(): Boolean {
        val svc = PilotService.instance
        if (svc != null && svc.isBusy) return false
        if (CarBridge.connected) return false
        return true
    }

    private fun httpGet(url: String): HttpURLConnection {
        val c = URL(url).openConnection() as HttpURLConnection
        c.connectTimeout = 15_000
        c.readTimeout = 60_000
        c.useCaches = false
        c.setRequestProperty("Cache-Control", "no-cache")
        if (c.responseCode !in 200..299) throw IOException("HTTP ${c.responseCode} for $url")
        return c
    }

    fun fetch(): Remote {
        val conn = httpGet(BuildConfig.UPDATE_BASE + "version.json?t=" + System.currentTimeMillis())
        val text = try {
            conn.inputStream.bufferedReader().use { it.readText() }
        } finally {
            conn.disconnect()
        }
        val j = JSONObject(text)
        val r = Remote(
            versionCode = j.optLong("versionCode", -1),
            versionName = j.optString("versionName", "?"),
            apk = j.optString("apk", "DuoPilot.apk"),
            sha256 = j.optString("sha256", ""),
            notes = j.optString("notes", ""),
        )
        if (r.versionCode <= 0 || !SAFE_NAME.matches(r.apk)) throw IOException("bad version.json")
        return r
    }

    private fun download(ctx: Context, r: Remote): File {
        val dir = File(ctx.cacheDir, "update").apply { mkdirs() }
        dir.listFiles()?.forEach { it.delete() }
        val file = File(dir, "update.apk")
        val conn = httpGet(BuildConfig.UPDATE_BASE + r.apk + "?v=" + r.versionCode)
        try {
            conn.inputStream.use { input -> file.outputStream().use { input.copyTo(it) } }
        } finally {
            conn.disconnect()
        }
        if (r.sha256.isNotEmpty() && !sha256(file).equals(r.sha256, ignoreCase = true)) {
            file.delete()
            throw IOException("SHA-256 mismatch")
        }
        return file
    }

    /** null = אפשר להתקין; אחרת הסבר למה לא */
    private fun inspect(ctx: Context, file: File): String? {
        val pm = ctx.packageManager
        val archive = archiveInfo(pm, file.path) ?: return "הקובץ שהורד הוא לא APK תקין"
        if (archive.packageName != ctx.packageName) return "הקובץ שהורד שייך לאפליקציה אחרת"
        if (archive.longVersionCode <= installedVersionCode(ctx)) return "הגרסה שהורדה לא חדשה יותר"
        val incoming = signers(archive)
        val current = packageInfo(ctx)?.let { signers(it) }
        if (incoming != null && current != null && incoming != current) return "העדכון חתום במפתח אחר – לא מתקין"
        return null
    }

    private fun install(ctx: Context, apk: File) {
        val installer = ctx.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
            setAppPackageName(ctx.packageName)
            setSize(apk.length())
            if (Build.VERSION.SDK_INT >= 31) setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
        }
        val id = installer.createSession(params)
        installer.openSession(id).use { session ->
            apk.inputStream().use { input ->
                session.openWrite("base.apk", 0, apk.length()).use { out ->
                    input.copyTo(out)
                    session.fsync(out)
                }
            }
            val cb = Intent(ctx, InstallResultReceiver::class.java).setAction(InstallResultReceiver.ACTION)
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            session.commit(PendingIntent.getBroadcast(ctx, id, cb, flags).intentSender)
        }
    }

    fun installedVersionCode(ctx: Context): Long = packageInfo(ctx)?.longVersionCode ?: 0L

    @Suppress("DEPRECATION")
    private fun packageInfo(ctx: Context): PackageInfo? = try {
        if (Build.VERSION.SDK_INT >= 33) {
            ctx.packageManager.getPackageInfo(ctx.packageName, PackageManager.PackageInfoFlags.of(PackageManager.GET_SIGNING_CERTIFICATES.toLong()))
        } else {
            ctx.packageManager.getPackageInfo(ctx.packageName, PackageManager.GET_SIGNING_CERTIFICATES)
        }
    } catch (e: Exception) {
        null
    }

    @Suppress("DEPRECATION")
    private fun archiveInfo(pm: PackageManager, path: String): PackageInfo? =
        if (Build.VERSION.SDK_INT >= 33) {
            pm.getPackageArchiveInfo(path, PackageManager.PackageInfoFlags.of(PackageManager.GET_SIGNING_CERTIFICATES.toLong()))
        } else {
            pm.getPackageArchiveInfo(path, PackageManager.GET_SIGNING_CERTIFICATES)
        }

    private fun signers(info: PackageInfo): Set<String>? =
        info.signingInfo?.apkContentsSigners?.takeIf { it.isNotEmpty() }?.map { it.toCharsString() }?.toSet()

    private fun sha256(file: File): String {
        val d = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buf = ByteArray(32 * 1024)
            while (true) {
                val n = input.read(buf)
                if (n < 0) break
                d.update(buf, 0, n)
            }
        }
        return d.digest().joinToString("") { "%02x".format(it) }
    }

    private fun toast(a: Activity, msg: String) = Bg.ui {
        if (!a.isFinishing) Toast.makeText(a, msg, Toast.LENGTH_SHORT).show()
    }

    fun notifyUser(ctx: Context, title: String, text: String, intent: Intent?) {
        val nm = ctx.getSystemService(NotificationManager::class.java) ?: return
        val pi = PendingIntent.getActivity(
            ctx, 77,
            intent ?: Intent(ctx, MainActivity::class.java).putExtra(MainActivity.EXTRA_NO_AUTO, true),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val n = Notification.Builder(ctx, App.CH_UPDATES)
            .setSmallIcon(R.drawable.ic_stat_pilot)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(Notification.BigTextStyle().bigText(text))
            .setContentIntent(pi)
            .setAutoCancel(true)
            .build()
        try {
            nm.notify(7777, n)
        } catch (_: Exception) {
        }
    }
}

/** תוצאת ההתקנה: אם המערכת מבקשת אישור (בפעם הראשונה) – פותחים את חלון האישור */
class InstallResultReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                val confirm: Intent? = if (Build.VERSION.SDK_INT >= 33) {
                    intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    intent.getParcelableExtra(Intent.EXTRA_INTENT)
                }
                if (confirm != null) {
                    confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    try {
                        context.startActivity(confirm)
                    } catch (e: Exception) {
                        Updater.notifyUser(context, "עדכון ל-DuoPilot מוכן", "לחץ כדי להתקין את הגרסה החדשה", confirm)
                    }
                }
            }
            PackageInstaller.STATUS_SUCCESS -> Unit
            else -> {
                val msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: ""
                Log.w(App.TAG, "update install failed: $msg")
                Updater.notifyUser(context, "העדכון של DuoPilot לא הותקן", msg.ifEmpty { "ננסה שוב מאוחר יותר" }, null)
            }
        }
    }

    companion object {
        const val ACTION = "com.yaniv.duopilot.INSTALL_RESULT"
    }
}

/** אחרי עדכון מוצלח: הודעה קצרה מה חדש */
class PackageReplacedReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        val sp = Prefs(context).sp
        val notes = sp.getString("update_notes", null) ?: return
        sp.edit().remove("update_notes").apply()
        Updater.notifyUser(context, "DuoPilot עודכן לגרסה ${BuildConfig.VERSION_NAME}", notes.ifBlank { "עודכן בהצלחה" }, null)
    }
}
