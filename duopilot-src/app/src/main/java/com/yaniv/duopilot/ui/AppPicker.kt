package com.yaniv.duopilot.ui

import android.app.Activity
import android.app.AlertDialog
import android.graphics.drawable.Drawable
import android.text.Editable
import android.text.TextWatcher
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.BaseAdapter
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ListView
import android.widget.ProgressBar
import android.widget.TextView
import com.yaniv.duopilot.Bg
import com.yaniv.duopilot.pairs.AppCatalog
import com.yaniv.duopilot.pairs.Targets

/** חלון בחירת אפליקציה (עם חיפוש), כולל הדפדפן המובנה */
object AppPicker {
    private class Option(val target: String, val label: String, var icon: Drawable?)

    fun pick(act: Activity, title: String, browserTarget: String, onPick: (String) -> Unit) {
        val box = LinearLayout(act).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(act.dp(16), act.dp(8), act.dp(16), 0)
        }
        val search = EditText(act).apply {
            hint = "חיפוש אפליקציה"
            setSingleLine(true)
            setTextColor(Palette.TEXT)
            setHintTextColor(Palette.SUB)
        }
        val list = ListView(act).apply {
            divider = null
            visibility = View.GONE
        }
        val loading = ProgressBar(act)
        box.addView(search)
        box.addView(loading, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, act.dp(60)).apply { gravity = Gravity.CENTER })
        box.addView(list, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, act.dp(420)))

        val dialog = AlertDialog.Builder(act, android.R.style.Theme_Material_Dialog_Alert)
            .setTitle(title)
            .setView(box)
            .setNegativeButton("ביטול", null)
            .create()

        Bg.async {
            val browser = Option(browserTarget, "🌐 " + AppCatalog.label(act, browserTarget) + " (מובנה)", AppCatalog.icon(act, browserTarget))
            val apps = AppCatalog.launchable(act).map { Option(it.pkg, it.label, null) }
            val all = listOf(browser) + apps
            Bg.ui {
                if (act.isFinishing) return@ui
                var shown = all
                val adapter = object : BaseAdapter() {
                    override fun getCount() = shown.size
                    override fun getItem(position: Int) = shown[position]
                    override fun getItemId(position: Int) = position.toLong()
                    override fun getView(position: Int, convertView: View?, parent: ViewGroup?): View {
                        val o = shown[position]
                        val row = (convertView as? LinearLayout) ?: LinearLayout(act).apply {
                            orientation = LinearLayout.HORIZONTAL
                            gravity = Gravity.CENTER_VERTICAL
                            setPadding(act.dp(4), act.dp(9), act.dp(4), act.dp(9))
                            addView(ImageView(act), LinearLayout.LayoutParams(act.dp(36), act.dp(36)).apply { marginEnd = act.dp(14) })
                            addView(act.label("", 16f))
                        }
                        if (o.icon == null && !Targets.isBrowser(o.target)) o.icon = AppCatalog.icon(act, o.target)
                        (row.getChildAt(0) as ImageView).setImageDrawable(o.icon)
                        (row.getChildAt(1) as TextView).text = o.label
                        return row
                    }
                }
                list.adapter = adapter
                list.setOnItemClickListener { _, _, position, _ ->
                    val o = shown[position]
                    dialog.dismiss()
                    onPick(o.target)
                }
                search.addTextChangedListener(object : TextWatcher {
                    override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                    override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
                    override fun afterTextChanged(s: Editable?) {
                        val q = AppCatalog.normalize(s?.toString().orEmpty())
                        shown = if (q.isEmpty()) all else all.filter { AppCatalog.normalize(it.label).contains(q) || it.target.contains(q) }
                        adapter.notifyDataSetChanged()
                    }
                })
                loading.visibility = View.GONE
                list.visibility = View.VISIBLE
            }
        }
        dialog.show()
    }
}
