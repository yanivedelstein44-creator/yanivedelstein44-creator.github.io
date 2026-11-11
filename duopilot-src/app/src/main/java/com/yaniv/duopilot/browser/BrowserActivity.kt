package com.yaniv.duopilot.browser

import android.annotation.SuppressLint
import android.app.Activity
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.Rect
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.text.InputType
import android.view.Gravity
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.webkit.CookieManager
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.PopupMenu
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import com.yaniv.duopilot.Prefs
import com.yaniv.duopilot.pairs.Launch
import com.yaniv.duopilot.pairs.Targets
import com.yaniv.duopilot.ui.MainActivity
import org.json.JSONObject
import java.lang.ref.WeakReference
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.roundToInt

/** מי מהדפדפנים פתוח, איפה הוא על המסך ומה הכתובת שלו (בשביל הצמדים והעוזר הקולי). */
object BrowserRegistry {
    val visible = ConcurrentHashMap<String, Boolean>()
    val bounds = ConcurrentHashMap<String, Rect>()
    val urls = ConcurrentHashMap<String, String>()
    val titles = ConcurrentHashMap<String, String>()
    val instances = ConcurrentHashMap<String, WeakReference<BrowserActivity>>()

    fun slotTarget(slot: String) = if (slot == "B") Targets.BROWSER_B else Targets.BROWSER_A

    /** איזה דפדפן נמצא בחלון עם הגבולות האלה (לפי חפיפה) */
    fun slotAt(r: Rect): String? {
        var best: String? = null
        var bestArea = 0L
        for ((slot, b) in bounds) {
            if (visible[slot] != true) continue
            val i = Rect()
            if (!i.setIntersect(b, r)) continue
            val area = i.width().toLong() * i.height()
            if (area > bestArea) {
                bestArea = area
                best = slot
            }
        }
        return best?.let { slotTarget(it) }
    }

    fun describe(target: String): String {
        val slot = if (target == Targets.BROWSER_B) "B" else "A"
        val t = titles[slot].orEmpty()
        val u = urls[slot].orEmpty()
        return "DuoPilot built-in browser" + (if (t.isNotEmpty()) " – \"$t\"" else "") + (if (u.isNotEmpty()) " <$u>" else "")
    }

    /** הדפדפן הגלוי (אם יש), אחרת הראשון */
    fun preferredTarget(): String = when {
        visible["A"] == true -> Targets.BROWSER_A
        visible["B"] == true -> Targets.BROWSER_B
        else -> Targets.BROWSER_A
    }

    /** מה רואים עכשיו בדף (קישורים, כפתורים, שדות וטקסט) – דרך JavaScript. חוסם עד 2 שניות; לא מה-UI thread. */
    fun snapshot(target: String): WebSnapshot? {
        val slot = if (target == Targets.BROWSER_B) "B" else "A"
        val act = instances[slot]?.get() ?: return null
        if (act.isFinishing) return null
        val latch = java.util.concurrent.CountDownLatch(1)
        var out: WebSnapshot? = null
        act.runOnUiThread {
            act.snapshotPage { snap ->
                out = snap
                latch.countDown()
            }
        }
        latch.await(2000, java.util.concurrent.TimeUnit.MILLISECONDS)
        return out
    }

    /** הקלדה לשדה שנבחר בדף (כשהשדה לא חשוף לנגישות) */
    fun typeIntoFocused(target: String, text: String, submit: Boolean): Boolean {
        val slot = if (target == Targets.BROWSER_B) "B" else "A"
        val act = instances[slot]?.get() ?: return false
        val latch = java.util.concurrent.CountDownLatch(1)
        var ok = false
        act.runOnUiThread {
            act.typeIntoFocused(text, submit) { r ->
                ok = r
                latch.countDown()
            }
        }
        latch.await(2000, java.util.concurrent.TimeUnit.MILLISECONDS)
        return ok
    }

    fun open(ctx: Context, target: String, url: String) {
        val slot = if (target == Targets.BROWSER_B) "B" else "A"
        val act = instances[slot]?.get()
        if (act != null && !act.isFinishing && visible[slot] == true) {
            act.runOnUiThread { act.navigate(url) }
            return
        }
        val cls = if (slot == "B") BrowserActivityB::class.java else BrowserActivity::class.java
        ctx.startActivity(Intent(ctx, cls).putExtra(BrowserActivity.EXTRA_URL, url).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}

/** פריט בדף: סוג, טקסט, ומלבן בקואורדינטות של המסך */
class WebItem(val kind: String, val text: String, val bounds: Rect)

class WebSnapshot(val title: String, val url: String, val items: List<WebItem>, val text: String)

/** מיקום גלילה לכל כתובת (עד 150 אחרונות) + הכתובת האחרונה. */
class WebState(ctx: Context, slot: String) {
    data class Pos(val y: Int, val h: Int)

    private val sp = ctx.getSharedPreferences("browser_$slot", Context.MODE_PRIVATE)
    private val map = LinkedHashMap<String, Pos>()

    init {
        try {
            val o = JSONObject(sp.getString("pos", "{}") ?: "{}")
            for (k in o.keys()) {
                val p = o.getJSONObject(k)
                map[k] = Pos(p.optInt("y"), p.optInt("h"))
            }
        } catch (_: Exception) {
        }
    }

    fun currentUrl(): String? = sp.getString("url", null)

    fun posFor(url: String): Pos? = map[key(url)]

    fun save(url: String, y: Int, h: Int) {
        val k = key(url)
        map.remove(k)
        map[k] = Pos(y, h)
        while (map.size > 150) map.remove(map.keys.first())
        val o = JSONObject()
        for ((kk, p) in map) o.put(kk, JSONObject().put("y", p.y).put("h", p.h))
        sp.edit().putString("url", url).putString("pos", o.toString()).apply()
    }

    fun saveUrlOnly(url: String) {
        sp.edit().putString("url", url).apply()
    }

    private fun key(url: String) = url.substringBefore('#')
}

open class BrowserActivity : Activity() {
    open val slot: String get() = "A"

    private lateinit var root: FrameLayout
    private lateinit var column: LinearLayout
    private lateinit var toolbar: LinearLayout
    private lateinit var web: WebView
    private lateinit var urlField: EditText
    private lateinit var progress: ProgressBar
    private lateinit var state: WebState

    private var restoreTarget: WebState.Pos? = null
    private var userTouched = false
    private var fromHistory = false
    private var desktopMode = false
    private var customView: View? = null
    private var customCallback: WebChromeClient.CustomViewCallback? = null
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private val saveRunnable = Runnable { saveScroll() }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).roundToInt()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        state = WebState(this, slot)
        desktopMode = getSharedPreferences("browser_$slot", MODE_PRIVATE).getBoolean("desktop", false)
        buildUi()
        setupWeb()
        BrowserRegistry.instances[slot] = WeakReference(this)
        val url = intent?.getStringExtra(EXTRA_URL)
        val saved = state.currentUrl()
        when {
            url != null -> navigate(url)
            saved != null -> loadWithRestore(saved)
            else -> web.loadUrl(Prefs(this).browserHome)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent.getStringExtra(EXTRA_URL)?.let { navigate(it) }
    }

    /** כתובת או חיפוש. אם נשמר מיקום לכתובת הזו – חוזרים אליו. */
    fun navigate(input: String) {
        val url = Launch.normalizeUrl(input)
        loadWithRestore(url)
    }

    private fun loadWithRestore(url: String) {
        restoreTarget = state.posFor(url)
        userTouched = false
        web.loadUrl(url)
    }

    // ------------------------------------------------------------------ UI

    private fun buildUi() {
        root = FrameLayout(this)
        root.setBackgroundColor(Color.parseColor("#0E1420"))
        column = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        toolbar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutDirection = View.LAYOUT_DIRECTION_LTR
            setBackgroundColor(Color.parseColor("#121A2A"))
            setPadding(dp(4), dp(4), dp(4), dp(4))
        }
        val back = toolButton("‹") { if (web.canGoBack()) { fromHistory = true; web.goBack() } }
        val fwd = toolButton("›") { if (web.canGoForward()) { fromHistory = true; web.goForward() } }
        urlField = EditText(this).apply {
            setSingleLine(true)
            textSize = 14f
            setTextColor(Color.WHITE)
            setHintTextColor(Color.parseColor("#7C8AA5"))
            hint = "חיפוש או כתובת"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            imeOptions = EditorInfo.IME_ACTION_GO
            setSelectAllOnFocus(true)
            setPadding(dp(12), dp(6), dp(12), dp(6))
            background = GradientDrawable().apply {
                cornerRadius = dp(18).toFloat()
                setColor(Color.parseColor("#1E293B"))
            }
            setOnEditorActionListener { v, actionId, event ->
                val enter = event != null && event.keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN
                if (actionId == EditorInfo.IME_ACTION_GO || enter) {
                    navigate(v.text.toString())
                    hideKeyboard(v)
                    web.requestFocus()
                    true
                } else false
            }
            setOnFocusChangeListener { _, has -> if (has) setText(web.url ?: "") else showHost(web.url) }
        }
        val reload = toolButton("⟳") { web.reload() }
        val menu = toolButton("⋮") { v -> showMenu(v) }
        toolbar.addView(back, LinearLayout.LayoutParams(dp(40), dp(40)))
        toolbar.addView(fwd, LinearLayout.LayoutParams(dp(40), dp(40)))
        toolbar.addView(urlField, LinearLayout.LayoutParams(0, dp(38), 1f).apply { marginStart = dp(4); marginEnd = dp(4) })
        toolbar.addView(reload, LinearLayout.LayoutParams(dp(40), dp(40)))
        toolbar.addView(menu, LinearLayout.LayoutParams(dp(36), dp(40)))

        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            visibility = View.GONE
        }
        web = WebView(this)
        column.addView(toolbar, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        column.addView(progress, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(3)))
        column.addView(web, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        root.addView(column, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        setContentView(root)

        // מסך מלא מקצה לקצה (Android 15): מרווחים לפי פס הסטטוס, פס הניווט והמקלדת
        root.setOnApplyWindowInsetsListener { v, insets ->
            val i = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout() or WindowInsets.Type.ime())
            v.setPadding(i.left, i.top, i.right, i.bottom)
            WindowInsets.CONSUMED
        }
        window.decorView.addOnLayoutChangeListener { v, _, _, _, _, _, _, _, _ ->
            val loc = IntArray(2)
            v.getLocationOnScreen(loc)
            BrowserRegistry.bounds[slot] = Rect(loc[0], loc[1], loc[0] + v.width, loc[1] + v.height)
        }
    }

    private fun toolButton(label: String, onClick: (View) -> Unit): TextView = TextView(this).apply {
        text = label
        textSize = 22f
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER
        setTextColor(Color.parseColor("#CBD5E1"))
        setOnClickListener { onClick(it) }
    }

    private fun showHost(url: String?) {
        if (urlField.hasFocus()) return
        val host = try {
            Uri.parse(url ?: "").host?.removePrefix("www.")
        } catch (e: Exception) {
            null
        }
        urlField.setText(host ?: url ?: "")
    }

    private fun showMenu(anchor: View) {
        val pm = PopupMenu(this, anchor)
        pm.menu.add(0, 1, 0, "דף הבית")
        pm.menu.add(0, 2, 1, "קבע כדף הבית")
        pm.menu.add(0, 3, 2, "פתח בכרום")
        pm.menu.add(0, 4, 3, "שתף קישור")
        pm.menu.add(0, 5, 4, if (desktopMode) "✓ גרסת מחשב" else "גרסת מחשב")
        pm.menu.add(0, 6, 5, "הגדרות DuoPilot")
        pm.setOnMenuItemClickListener { item ->
            when (item.itemId) {
                1 -> navigate(Prefs(this).browserHome)
                2 -> {
                    web.url?.let { Prefs(this).browserHome = it }
                    Toast.makeText(this, "נקבע כדף הבית", Toast.LENGTH_SHORT).show()
                }
                3 -> web.url?.let { Launch.openInChrome(this, it) }
                4 -> web.url?.let {
                    startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, it), "שתף"))
                }
                5 -> {
                    desktopMode = !desktopMode
                    getSharedPreferences("browser_$slot", MODE_PRIVATE).edit().putBoolean("desktop", desktopMode).apply()
                    applyUserAgent()
                    web.reload()
                }
                6 -> startActivity(Intent(this, MainActivity::class.java).putExtra(MainActivity.EXTRA_NO_AUTO, true))
            }
            true
        }
        pm.show()
    }

    private fun hideKeyboard(v: View) {
        getSystemService(InputMethodManager::class.java)?.hideSoftInputFromWindow(v.windowToken, 0)
    }

    // ------------------------------------------------------------------ WebView

    @SuppressLint("SetJavaScriptEnabled", "ClickableViewAccessibility")
    private fun setupWeb() {
        val s = web.settings
        s.javaScriptEnabled = true
        s.domStorageEnabled = true
        s.loadWithOverviewMode = true
        s.useWideViewPort = true
        s.builtInZoomControls = true
        s.displayZoomControls = false
        s.setSupportMultipleWindows(false)
        s.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        s.mediaPlaybackRequiresUserGesture = true
        defaultUa = s.userAgentString
        applyUserAgent()
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true)

        web.setOnTouchListener { _, ev ->
            if (ev.actionMasked == MotionEvent.ACTION_DOWN) userTouched = true
            false
        }
        web.setOnScrollChangeListener { _, _, _, _, _ ->
            web.removeCallbacks(saveRunnable)
            web.postDelayed(saveRunnable, 600)
        }
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                handleSpecialUrl(view, request.url)

            override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
                progress.visibility = View.VISIBLE
                showHost(url)
                BrowserRegistry.urls[slot] = url
                if (restoreTarget == null && !fromHistory) {
                    restoreTarget = state.posFor(url)
                    userTouched = false
                }
                fromHistory = false
            }

            override fun onPageFinished(view: WebView, url: String) {
                progress.visibility = View.GONE
                showHost(url)
                BrowserRegistry.urls[slot] = url
                state.saveUrlOnly(url)
                CookieManager.getInstance().flush()
                val t = restoreTarget
                restoreTarget = null
                if (t != null && t.y > 0) attemptRestore(t, 0)
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, newProgress: Int) {
                progress.progress = newProgress
            }

            override fun onReceivedTitle(view: WebView, title: String?) {
                BrowserRegistry.titles[slot] = title.orEmpty()
            }

            override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                customView?.let { onHideCustomView() }
                customView = view
                customCallback = callback
                root.addView(view, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
                column.visibility = View.GONE
            }

            override fun onHideCustomView() {
                customView?.let { root.removeView(it) }
                customView = null
                column.visibility = View.VISIBLE
                customCallback?.onCustomViewHidden()
                customCallback = null
            }

            override fun onShowFileChooser(webView: WebView, filePathCallback: ValueCallback<Array<Uri>>, fileChooserParams: FileChooserParams): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = filePathCallback
                return try {
                    @Suppress("DEPRECATION")
                    startActivityForResult(fileChooserParams.createIntent(), REQ_FILE)
                    true
                } catch (e: Exception) {
                    fileCallback = null
                    false
                }
            }
        }
        web.setDownloadListener { url, userAgent, contentDisposition, mimetype, _ ->
            try {
                val name = URLUtil.guessFileName(url, contentDisposition, mimetype)
                val req = DownloadManager.Request(Uri.parse(url))
                    .setMimeType(mimetype)
                    .addRequestHeader("User-Agent", userAgent)
                    .addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url) ?: "")
                    .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name)
                getSystemService(DownloadManager::class.java).enqueue(req)
                Toast.makeText(this, "מוריד: $name", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this, "ההורדה נכשלה", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private var defaultUa: String = ""

    private fun applyUserAgent() {
        web.settings.userAgentString = if (desktopMode) {
            defaultUa.replace(Regex("\\(Linux; Android [^)]*\\)"), "(X11; Linux x86_64)").replace(" Mobile", "")
        } else defaultUa
        web.settings.useWideViewPort = true
    }

    /** קישורים שלא נפתחים בדפדפן (וואטסאפ, וויז, intent://...) – פותחים באפליקציה המתאימה */
    private fun handleSpecialUrl(view: WebView, uri: Uri): Boolean {
        val scheme = uri.scheme?.lowercase() ?: return false
        if (scheme in setOf("http", "https", "about", "data", "blob", "javascript", "file")) return false
        try {
            val intent = if (scheme == "intent") Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME) else Intent(Intent.ACTION_VIEW, uri)
            intent.addCategory(Intent.CATEGORY_BROWSABLE)
            intent.component = null
            intent.selector = null
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
        } catch (e: Exception) {
            if (scheme == "intent") {
                val fallback = try {
                    Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME).getStringExtra("browser_fallback_url")
                } catch (_: Exception) {
                    null
                }
                if (fallback != null) view.loadUrl(fallback)
            }
        }
        return true
    }

    // ------------------------------------------------------------------ העוזר הקולי קורא את הדף

    /** אוסף את מה שגלוי בדף ומתרגם את המיקומים לפיקסלים של המסך */
    fun snapshotPage(cb: (WebSnapshot?) -> Unit) {
        if (isFinishing || isDestroyed) {
            cb(null)
            return
        }
        web.evaluateJavascript(SNAPSHOT_JS) { raw ->
            val snap = try {
                // evaluateJavascript מחזיר מחרוזת JSON בתוך מחרוזת JSON
                val json = JSONObject(org.json.JSONTokener(raw).nextValue() as String)
                val vw = json.optDouble("w", 0.0)
                val loc = IntArray(2)
                web.getLocationOnScreen(loc)
                val f = if (vw > 0) web.width / vw else 1.0
                val arr = json.optJSONArray("items") ?: org.json.JSONArray()
                val items = ArrayList<WebItem>()
                for (i in 0 until arr.length()) {
                    val a = arr.optJSONArray(i) ?: continue
                    val l = loc[0] + (a.optDouble(2) * f).roundToInt()
                    val t = loc[1] + (a.optDouble(3) * f).roundToInt()
                    val r = Rect(l, t, l + (a.optDouble(4) * f).roundToInt(), t + (a.optDouble(5) * f).roundToInt())
                    // רק מה שבתוך החלק הגלוי של הדפדפן
                    if (r.bottom <= loc[1] || r.top >= loc[1] + web.height) continue
                    items.add(WebItem(a.optString(0), a.optString(1), r))
                }
                WebSnapshot(json.optString("title"), json.optString("url"), items, json.optString("text"))
            } catch (e: Exception) {
                null
            }
            cb(snap)
        }
    }

    fun typeIntoFocused(text: String, submit: Boolean, cb: (Boolean) -> Unit) {
        val js = "(function(t,s){var e=document.activeElement;if(!e||!('value' in e))return false;" +
            "var p=Object.getPrototypeOf(e),d=Object.getOwnPropertyDescriptor(p,'value');if(d&&d.set)d.set.call(e,t);else e.value=t;" +
            "e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));" +
            "if(s){var o={key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true};e.dispatchEvent(new KeyboardEvent('keydown',o));" +
            "e.dispatchEvent(new KeyboardEvent('keypress',o));e.dispatchEvent(new KeyboardEvent('keyup',o));" +
            "if(e.form){if(e.form.requestSubmit)e.form.requestSubmit();else e.form.submit();}}return true;})(" +
            JSONObject.quote(text) + "," + submit + ")"
        web.evaluateJavascript(js) { r -> cb(r == "true") }
    }

    // ------------------------------------------------------------------ זיכרון גלילה

    @Suppress("DEPRECATION")
    private fun contentPx(): Int = (web.contentHeight * web.scale).roundToInt()

    private fun saveScroll() {
        val url = web.url ?: return
        if (url.startsWith("about:")) return
        state.save(url, web.scrollY, contentPx())
    }

    /** הדף נטען בהדרגה – מנסים כמה פעמים עד שהתוכן ארוך מספיק, ומפסיקים אם נגעת במסך */
    private fun attemptRestore(t: WebState.Pos, attempt: Int) {
        if (userTouched || isFinishing || isDestroyed) return
        val h = contentPx()
        val y = if (t.h > 0 && h > 0 && abs(h - t.h) > t.h * 0.2) (t.y.toLong() * h / t.h).toInt() else t.y
        val canReach = h >= y + web.height / 2
        if (canReach || attempt >= DELAYS.size) {
            web.scrollTo(0, y.coerceAtMost(max(0, h - web.height)))
            if (abs(web.scrollY - y) < 60 || attempt >= DELAYS.size) return
        }
        web.postDelayed({ attemptRestore(t, attempt + 1) }, DELAYS[attempt.coerceAtMost(DELAYS.size - 1)])
    }

    // ------------------------------------------------------------------ מחזור חיים

    override fun onStart() {
        super.onStart()
        BrowserRegistry.visible[slot] = true
        BrowserRegistry.instances[slot] = WeakReference(this)
    }

    override fun onStop() {
        BrowserRegistry.visible[slot] = false
        saveScroll()
        CookieManager.getInstance().flush()
        super.onStop()
    }

    override fun onPause() {
        saveScroll()
        super.onPause()
    }

    override fun onDestroy() {
        if (BrowserRegistry.instances[slot]?.get() === this) BrowserRegistry.instances.remove(slot)
        try {
            web.destroy()
        } catch (_: Exception) {
        }
        super.onDestroy()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        when {
            customView != null -> web.webChromeClient?.onHideCustomView()
            web.canGoBack() -> {
                fromHistory = true
                web.goBack()
            }
            else -> @Suppress("DEPRECATION") super.onBackPressed()
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQ_FILE) {
            fileCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data))
            fileCallback = null
            return
        }
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
    }

    companion object {
        const val EXTRA_URL = "url"
        private const val REQ_FILE = 41

        /** קישורים/כפתורים/שדות גלויים + טקסט גלוי (כותרות ופסקאות), עד גבול סביר */
        private const val SNAPSHOT_JS = """(function(){
var vw=window.innerWidth,vh=window.innerHeight,out=[],seen=new Set();
function vis(e,r){if(r.width<3||r.height<3||r.bottom<0||r.top>vh||r.right<0||r.left>vw)return false;var s=getComputedStyle(e);return s.visibility!=='hidden'&&s.display!=='none'&&s.opacity!=='0';}
function lab(e){var t=(e.getAttribute('aria-label')||e.innerText||e.value||e.getAttribute('title')||e.getAttribute('placeholder')||e.getAttribute('alt')||'');if(!t){var i=e.querySelector&&e.querySelector('img[alt]');if(i)t=i.getAttribute('alt');}return t.replace(/\s+/g,' ').trim().slice(0,100);}
var els=document.querySelectorAll('a[href],button,input:not([type=hidden]),textarea,select,[role=button],[role=link],[role=tab],[role=menuitem],[onclick],summary');
for(var i=0;i<els.length&&out.length<150;i++){var e=els[i];if(seen.has(e))continue;seen.add(e);var r=e.getBoundingClientRect();if(!vis(e,r))continue;var tg=e.tagName.toLowerCase();
var k=(tg==='input'||tg==='textarea'||tg==='select')?'input':(tg==='a'?'link':'button');out.push([k,lab(e),r.left,r.top,r.width,r.height]);}
var txt=[],n=0,bl=document.querySelectorAll('h1,h2,h3,h4,p,li,blockquote,td,figcaption');
for(var j=0;j<bl.length&&n<2500;j++){var b=bl[j],r2=b.getBoundingClientRect();if(!vis(b,r2))continue;var s=(b.innerText||'').replace(/\s+/g,' ').trim();if(s.length<2)continue;s=s.slice(0,220);if(txt.indexOf(s)>=0)continue;txt.push(s);n+=s.length;}
return JSON.stringify({w:vw,h:vh,title:document.title,url:location.href,items:out,text:txt.join('\n')});
})()"""
        private val DELAYS = longArrayOf(150, 300, 500, 800, 1200, 1800, 2500, 3500)
    }
}

/** דפדפן שני – כדי שאפשר יהיה לשים שני אתרים במסך מפוצל */
class BrowserActivityB : BrowserActivity() {
    override val slot: String get() = "B"
}
