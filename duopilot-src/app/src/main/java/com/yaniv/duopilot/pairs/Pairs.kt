package com.yaniv.duopilot.pairs

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.CopyOnWriteArrayList

/** יעדים מיוחדים: הדפדפנים המובנים של DuoPilot. כל יעד אחר הוא שם חבילה של אפליקציה. */
object Targets {
    const val BROWSER_A = "duopilot:browser"
    const val BROWSER_B = "duopilot:browser2"

    fun isBrowser(target: String) = target == BROWSER_A || target == BROWSER_B
}

/** צמד: אפליקציה למעלה + אפליקציה למטה, ומיקום הקו המפריד האחרון (0..1 מגובה המסך, או -1). */
data class AppPair(
    val id: String,
    val top: String,
    val bottom: String,
    val ratio: Float = -1f,
    val lastUsed: Long = 0L,
) {
    fun toJson(): JSONObject = JSONObject()
        .put("id", id)
        .put("top", top)
        .put("bottom", bottom)
        .put("ratio", ratio.toDouble())
        .put("lastUsed", lastUsed)

    companion object {
        fun fromJson(o: JSONObject) = AppPair(
            id = o.getString("id"),
            top = o.getString("top"),
            bottom = o.getString("bottom"),
            ratio = o.optDouble("ratio", -1.0).toFloat(),
            lastUsed = o.optLong("lastUsed", 0L),
        )
    }
}

/** שמירת הצמדים (SharedPreferences). הסדר הפנימי קבוע – לפיו ממוספרים הצמדים לעוזר הקולי. */
class PairStore(context: Context) {
    private val sp = context.applicationContext.getSharedPreferences("pairs", Context.MODE_PRIVATE)

    /** לפי סדר יצירה (קבוע) */
    fun stable(): List<AppPair> {
        val arr = try {
            JSONArray(sp.getString("list", "[]"))
        } catch (e: Exception) {
            JSONArray()
        }
        val out = ArrayList<AppPair>()
        for (i in 0 until arr.length()) {
            try {
                out.add(AppPair.fromJson(arr.getJSONObject(i)))
            } catch (_: Exception) {
            }
        }
        return out
    }

    /** לפי שימוש אחרון (למסך הבית) */
    fun all(): List<AppPair> = stable().sortedByDescending { it.lastUsed }

    fun get(id: String?): AppPair? = if (id == null) null else stable().firstOrNull { it.id == id }

    var lastId: String?
        get() = sp.getString("last", null)
        set(value) {
            sp.edit().putString("last", value).apply()
        }

    fun last(): AppPair? = get(lastId) ?: all().firstOrNull()

    fun save(pair: AppPair) {
        synchronized(lock) {
            val list = stable().toMutableList()
            val i = list.indexOfFirst { it.id == pair.id }
            if (i >= 0) list[i] = pair else list.add(pair)
            write(list)
        }
        changed()
    }

    fun delete(id: String) {
        synchronized(lock) {
            write(stable().filter { it.id != id })
            if (lastId == id) lastId = null
        }
        changed()
    }

    fun touch(id: String) {
        synchronized(lock) {
            val list = stable().map { if (it.id == id) it.copy(lastUsed = System.currentTimeMillis()) else it }
            write(list)
            lastId = id
        }
        changed()
    }

    fun updateRatio(id: String, ratio: Float) {
        synchronized(lock) {
            write(stable().map { if (it.id == id) it.copy(ratio = ratio) else it })
        }
    }

    fun findOrCreate(top: String, bottom: String): AppPair {
        synchronized(lock) {
            stable().firstOrNull { it.top == top && it.bottom == bottom }?.let { return it }
            val p = AppPair(newId(), top, bottom)
            val list = stable().toMutableList()
            list.add(p)
            write(list)
            changed()
            return p
        }
    }

    fun packagesInPairs(): Set<String> =
        stable().flatMap { listOf(it.top, it.bottom) }.filterNot { Targets.isBrowser(it) }.toSet()

    private fun write(list: List<AppPair>) {
        val arr = JSONArray()
        list.forEach { arr.put(it.toJson()) }
        sp.edit().putString("list", arr.toString()).commit()
    }

    private fun changed() {
        listeners.forEach {
            try {
                it()
            } catch (_: Exception) {
            }
        }
    }

    companion object {
        private val lock = Any()
        val listeners = CopyOnWriteArrayList<() -> Unit>()
        fun newId(): String = UUID.randomUUID().toString().substring(0, 8)
    }
}
