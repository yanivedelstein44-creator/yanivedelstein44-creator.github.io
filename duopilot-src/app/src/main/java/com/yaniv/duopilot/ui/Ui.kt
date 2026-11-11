package com.yaniv.duopilot.ui

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.Switch
import android.widget.TextView
import kotlin.math.roundToInt

/** צבעים ורכיבי ממשק קטנים (בלי XML) */
object Palette {
    const val BG = 0xFF0E1420.toInt()
    const val CARD = 0xFF172034.toInt()
    const val CARD2 = 0xFF1D2840.toInt()
    const val TEXT = 0xFFE8EEF8.toInt()
    const val SUB = 0xFF9AA8BF.toInt()
    const val ACCENT = 0xFF4F8CFF.toInt()
    const val TEAL = 0xFF2DD4BF.toInt()
    const val OK = 0xFF34D399.toInt()
    const val WARN = 0xFFF59E0B.toInt()
    const val BAD = 0xFFF87171.toInt()
    const val LINE = 0xFF26324D.toInt()
}

enum class Btn { PRIMARY, SECONDARY, DANGER }

fun Context.dp(v: Int): Int = (v * resources.displayMetrics.density).roundToInt()

fun Context.label(s: CharSequence, size: Float = 15f, color: Int = Palette.TEXT, bold: Boolean = false): TextView =
    TextView(this).apply {
        text = s
        textSize = size
        setTextColor(color)
        if (bold) typeface = Typeface.DEFAULT_BOLD
        setLineSpacing(0f, 1.12f)
    }

fun Context.card(): LinearLayout = LinearLayout(this).apply {
    orientation = LinearLayout.VERTICAL
    setPadding(dp(16), dp(14), dp(16), dp(14))
    background = GradientDrawable().apply {
        cornerRadius = dp(20).toFloat()
        setColor(Palette.CARD)
        setStroke(dp(1), Palette.LINE)
    }
}

fun Context.button(text: String, kind: Btn = Btn.PRIMARY, onClick: () -> Unit): TextView = TextView(this).apply {
    this.text = text
    textSize = 15f
    typeface = Typeface.DEFAULT_BOLD
    gravity = Gravity.CENTER
    setPadding(dp(16), dp(11), dp(16), dp(11))
    val (bg, fg) = when (kind) {
        Btn.PRIMARY -> Palette.ACCENT to 0xFFFFFFFF.toInt()
        Btn.SECONDARY -> Palette.CARD2 to Palette.TEXT
        Btn.DANGER -> 0xFF3A1D26.toInt() to Palette.BAD
    }
    setTextColor(fg)
    val shape = GradientDrawable().apply {
        cornerRadius = dp(14).toFloat()
        setColor(bg)
        if (kind == Btn.SECONDARY) setStroke(dp(1), Palette.LINE)
    }
    background = RippleDrawable(ColorStateList.valueOf(0x33FFFFFF), shape, null)
    isClickable = true
    setOnClickListener { onClick() }
}

fun Context.switchRow(title: String, sub: String?, checked: Boolean, onChange: (Boolean) -> Unit): View {
    val row = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
        setPadding(0, dp(8), 0, dp(8))
    }
    val texts = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
    texts.addView(label(title, 15f))
    if (!sub.isNullOrEmpty()) texts.addView(label(sub, 12.5f, Palette.SUB))
    val sw = Switch(this).apply {
        isChecked = checked
        setOnCheckedChangeListener { _, b -> onChange(b) }
    }
    row.addView(texts, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
    row.addView(sw)
    row.setOnClickListener { sw.toggle() }
    return row
}

/** שורת בדיקה בהגדרה הראשונית: ✓/✗ + כפתור */
fun Context.statusRow(title: String, ok: Boolean, detail: String?, action: String?, onAction: () -> Unit): View {
    val row = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
        setPadding(0, dp(7), 0, dp(7))
    }
    val mark = label(if (ok) "✓" else "!", 16f, if (ok) Palette.OK else Palette.WARN, bold = true).apply {
        gravity = Gravity.CENTER
        background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(if (ok) 0x2234D399 else 0x22F59E0B)
        }
    }
    val texts = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
    texts.addView(label(title, 15f, bold = true))
    if (!detail.isNullOrEmpty()) texts.addView(label(detail, 12.5f, Palette.SUB))
    row.addView(mark, LinearLayout.LayoutParams(dp(30), dp(30)).apply { marginEnd = dp(12) })
    row.addView(texts, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
    if (action != null) {
        row.addView(button(action, if (ok) Btn.SECONDARY else Btn.PRIMARY, onAction).apply {
            textSize = 13f
            setPadding(dp(12), dp(7), dp(12), dp(7))
        })
    }
    return row
}

/** בחירה אחת מכמה (כמו כפתורי רדיו) */
fun Context.chips(options: List<Pair<String, String>>, selected: String, onSelect: (String) -> Unit): View {
    val row = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        setPadding(0, dp(6), 0, dp(6))
    }
    options.forEachIndexed { i, (value, text) ->
        val on = value == selected
        val chip = label(text, 13.5f, if (on) 0xFFFFFFFF.toInt() else Palette.SUB, bold = on).apply {
            gravity = Gravity.CENTER
            setPadding(dp(10), dp(8), dp(10), dp(8))
            background = GradientDrawable().apply {
                cornerRadius = dp(12).toFloat()
                setColor(if (on) Palette.ACCENT else Palette.CARD2)
            }
            setOnClickListener { onSelect(value) }
        }
        row.addView(chip, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
            if (i > 0) marginStart = dp(6)
        })
    }
    return row
}

fun LinearLayout.gap(context: Context, h: Int) {
    addView(View(context), LinearLayout.LayoutParams(1, context.dp(h)))
}

fun LinearLayout.divider(context: Context) {
    addView(View(context).apply { setBackgroundColor(Palette.LINE) }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 1).apply {
        topMargin = context.dp(6)
        bottomMargin = context.dp(6)
    })
}
