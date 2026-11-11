package com.yaniv.duopilot.ui

import android.content.Context
import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.drawable.Drawable
import android.graphics.drawable.Icon
import android.util.Log
import com.yaniv.duopilot.App
import com.yaniv.duopilot.Bg
import com.yaniv.duopilot.pairs.AppCatalog
import com.yaniv.duopilot.pairs.AppPair
import com.yaniv.duopilot.pairs.PairStore

/** קיצורי דרך למסך הבית ("WhatsApp + דפדפן" בלחיצה אחת) */
object Shortcuts {
    fun info(ctx: Context, pair: AppPair): ShortcutInfo {
        val top = AppCatalog.label(ctx, pair.top)
        val bottom = AppCatalog.label(ctx, pair.bottom)
        val short = (shortName(top) + " + " + shortName(bottom)).take(24)
        return ShortcutInfo.Builder(ctx, "pair_${pair.id}")
            .setShortLabel(short)
            .setLongLabel("$top ⬆ · $bottom ⬇".take(60))
            .setIcon(Icon.createWithBitmap(IconComposer.pairIcon(ctx, pair.top, pair.bottom, 192)))
            .setIntent(
                Intent(ctx, PairLaunchActivity::class.java)
                    .setAction(PairLaunchActivity.ACTION)
                    .putExtra(PairLaunchActivity.EXTRA_ID, pair.id)
            )
            .build()
    }

    fun pin(ctx: Context, pair: AppPair): Boolean {
        val sm = ctx.getSystemService(ShortcutManager::class.java) ?: return false
        if (!sm.isRequestPinShortcutSupported) return false
        return try {
            sm.requestPinShortcut(info(ctx, pair), null)
        } catch (e: Exception) {
            Log.w(App.TAG, "pin shortcut", e)
            false
        }
    }

    /** 3 הצמדים האחרונים בלחיצה ארוכה על האייקון */
    fun refreshDynamic(ctx: Context) = Bg.async {
        try {
            val sm = ctx.getSystemService(ShortcutManager::class.java) ?: return@async
            val list = PairStore(ctx).all().take(3).map { info(ctx, it) }
            sm.setDynamicShortcuts(list)
            // קיצור מוצמד של צמד שנמחק – מכבים אותו
            val alive = PairStore(ctx).stable().map { "pair_${it.id}" }.toSet()
            val dead = sm.pinnedShortcuts.map { it.id }.filter { it.startsWith("pair_") && it !in alive }
            if (dead.isNotEmpty()) sm.disableShortcuts(dead, "הצמד נמחק")
        } catch (e: Exception) {
            Log.w(App.TAG, "dynamic shortcuts", e)
        }
    }

    private fun shortName(s: String) = s.split(' ').firstOrNull().orEmpty().take(10)
}

/** אייקון של צמד: האפליקציה העליונה למעלה, התחתונה למטה, וקו מפריד */
object IconComposer {
    fun pairIcon(ctx: Context, top: String, bottom: String, size: Int): Bitmap {
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val c = Canvas(bmp)
        val p = Paint(Paint.ANTI_ALIAS_FLAG)
        p.color = 0xFF0E1626.toInt()
        c.drawRoundRect(RectF(0f, 0f, size.toFloat(), size.toFloat()), size * 0.22f, size * 0.22f, p)
        val icon = (size * 0.38f).toInt()
        val x = (size - icon) / 2
        draw(c, AppCatalog.icon(ctx, top), x, (size * 0.07f).toInt(), icon)
        p.color = 0xFF2DD4BF.toInt()
        c.drawRoundRect(RectF(size * 0.2f, size * 0.485f, size * 0.8f, size * 0.515f), size * 0.02f, size * 0.02f, p)
        draw(c, AppCatalog.icon(ctx, bottom), x, (size * 0.55f).toInt(), icon)
        return bmp
    }

    private fun draw(c: Canvas, d: Drawable?, x: Int, y: Int, s: Int) {
        if (d == null) return
        val copy = d.constantState?.newDrawable()?.mutate() ?: d
        copy.setBounds(x, y, x + s, y + s)
        copy.draw(c)
    }
}
