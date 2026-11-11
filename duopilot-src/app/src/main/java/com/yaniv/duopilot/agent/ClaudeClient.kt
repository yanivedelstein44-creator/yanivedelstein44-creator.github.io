package com.yaniv.duopilot.agent

import com.yaniv.duopilot.Bg
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/** קריאה ל-Claude Messages API (HTTPS ישיר, בלי ספריות). */
object ClaudeClient {
    private const val ENDPOINT = "https://api.anthropic.com/v1/messages"

    class ApiException(val code: Int, val userMessage: String, detail: String) : IOException(detail)

    fun send(apiKey: String, body: JSONObject): JSONObject {
        var last: IOException? = null
        for (attempt in 0..2) {
            try {
                return post(apiKey, body)
            } catch (e: ApiException) {
                if (e.code == 429 || e.code == 500 || e.code == 503 || e.code == 529) {
                    last = e
                    Bg.sleep(1500L * (attempt + 1))
                } else {
                    throw e
                }
            } catch (e: IOException) {
                last = e
                Bg.sleep(800L * (attempt + 1))
            }
        }
        throw last ?: IOException("request failed")
    }

    private fun post(apiKey: String, body: JSONObject): JSONObject {
        val conn = (URL(ENDPOINT).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15_000
            readTimeout = 60_000
            doOutput = true
            setRequestProperty("content-type", "application/json")
            setRequestProperty("x-api-key", apiKey)
            setRequestProperty("anthropic-version", "2023-06-01")
        }
        try {
            conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
            if (code !in 200..299) throw ApiException(code, messageFor(code, text), "HTTP $code: ${text.take(300)}")
            return JSONObject(text)
        } finally {
            conn.disconnect()
        }
    }

    fun messageFor(code: Int, body: String): String = when (code) {
        401 -> "מפתח ה-API של Claude לא תקין. בדוק אותו בהגדרות DuoPilot."
        403 -> "למפתח הזה אין הרשאה למודל שנבחר. נסה מודל אחר בהגדרות."
        404 -> "המודל שנבחר לא נמצא. בחר מודל אחר בהגדרות DuoPilot."
        413 -> "המסך גדול מדי לשליחה. נסה לכבות את 'שליחת צילום מסך' בהגדרות."
        429 -> "יותר מדי בקשות ל-Claude. נסה שוב בעוד רגע."
        500, 503, 529 -> "Claude עמוס כרגע. נסה שוב בעוד רגע."
        400 -> if (body.contains("credit", ignoreCase = true) || body.contains("balance", ignoreCase = true)) {
            "נגמר הקרדיט בחשבון ה-API של Claude."
        } else {
            "Claude דחה את הבקשה (400). אם זה חוזר – נסה מודל אחר בהגדרות."
        }
        else -> "שגיאה מ-Claude ($code)."
    }

    /** בדיקת מפתח קצרה. מחזיר null אם הכול תקין, אחרת הודעת שגיאה. */
    fun test(apiKey: String, model: String): String? {
        val body = JSONObject()
            .put("model", model)
            .put("max_tokens", 16)
            .put("messages", JSONArray().put(JSONObject().put("role", "user").put("content", "ping")))
        return try {
            post(apiKey, body)
            null
        } catch (e: ApiException) {
            e.userMessage
        } catch (e: IOException) {
            "אין חיבור לאינטרנט"
        } catch (e: Exception) {
            e.message ?: "שגיאה"
        }
    }
}
