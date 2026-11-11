package com.yaniv.duopilot.ui

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import com.yaniv.duopilot.BuildConfig
import com.yaniv.duopilot.pairs.PairStore
import com.yaniv.duopilot.service.PilotService

/** מסך שקוף שנפתח מקיצור דרך במסך הבית, מבקש מהשירות לפתוח את הצמד ונסגר מיד */
class PairLaunchActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val store = PairStore(this)
        val pair = intent.getStringExtra(EXTRA_ID)?.let { store.get(it) }
            ?: if (BuildConfig.DEBUG) adHoc(store) else null
        val svc = PilotService.instance
        when {
            pair == null -> {
                Toast.makeText(this, "הצמד הזה לא קיים יותר", Toast.LENGTH_SHORT).show()
                openMain(null)
            }
            svc == null -> {
                PilotService.pendingPairId = pair.id
                Toast.makeText(this, "צריך להפעיל את שירות הנגישות של DuoPilot", Toast.LENGTH_LONG).show()
                openMain("service")
            }
            else -> svc.launchPair(pair)
        }
        finish()
    }

    private fun adHoc(store: PairStore) = intent.getStringExtra(EXTRA_TOP)?.let { top ->
        intent.getStringExtra(EXTRA_BOTTOM)?.let { bottom -> store.findOrCreate(top, bottom) }
    }

    private fun openMain(reason: String?) {
        val i = Intent(this, MainActivity::class.java).putExtra(MainActivity.EXTRA_NO_AUTO, true)
        if (reason != null) i.putExtra(MainActivity.EXTRA_REASON, reason)
        startActivity(i)
    }

    companion object {
        const val ACTION = "com.yaniv.duopilot.LAUNCH_PAIR"
        const val EXTRA_ID = "pair_id"
        const val EXTRA_TOP = "top"
        const val EXTRA_BOTTOM = "bottom"
    }
}
