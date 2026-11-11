package com.yaniv.duopilot

import android.os.Handler
import android.os.Looper
import android.util.Log
import java.util.concurrent.CountDownLatch
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/** עזרי threads קטנים: עבודה ברקע, חזרה ל-UI והמתנה. */
object Bg {
    val pool: ExecutorService = Executors.newCachedThreadPool()
    val main = Handler(Looper.getMainLooper())

    val isMain: Boolean get() = Looper.myLooper() == Looper.getMainLooper()

    fun async(block: () -> Unit) {
        pool.execute {
            try {
                block()
            } catch (t: Throwable) {
                Log.e(App.TAG, "background task failed", t)
            }
        }
    }

    fun ui(block: () -> Unit) {
        if (isMain) block() else main.post(block)
    }

    fun later(ms: Long, block: () -> Unit) {
        main.postDelayed(block, ms)
    }

    /** מריץ על ה-UI thread ומחכה לתוצאה. לקרוא רק מ-thread רקע. */
    fun <T> onMain(timeoutMs: Long = 5000, block: () -> T): T? {
        if (isMain) return block()
        val latch = CountDownLatch(1)
        var result: T? = null
        main.post {
            try {
                result = block()
            } catch (t: Throwable) {
                Log.e(App.TAG, "onMain failed", t)
            } finally {
                latch.countDown()
            }
        }
        latch.await(timeoutMs, TimeUnit.MILLISECONDS)
        return result
    }

    fun sleep(ms: Long) {
        if (ms <= 0) return
        try {
            Thread.sleep(ms)
        } catch (_: InterruptedException) {
        }
    }
}
