package pl.artifex.hiciarz

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch
import pl.artifex.hiciarz.model.AppTab
import pl.artifex.hiciarz.playback.SpotifyController
import pl.artifex.hiciarz.ui.HiciarzApp
import pl.artifex.hiciarz.ui.hideStatusBar

class MainActivity : ComponentActivity() {
    private lateinit var model: HiciarzViewModel
    private lateinit var spotify: SpotifyController

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        window.hideStatusBar()
        model = ViewModelProvider(this)[HiciarzViewModel::class.java]
        spotify = SpotifyController(this, clientIdProvider = { model.clientId() })
        model.attachPlayback(spotify)
        setContent {
            val state = model.state.collectAsStateWithLifecycle().value
            HiciarzApp(state, model::dispatch)
        }
        lifecycleScope.launch {
            model.state.collect { state ->
                if (state.tab == AppTab.SCAN)
                    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
        }
    }

    override fun onPostResume() {
        super.onPostResume()
        window.hideStatusBar()
        if (::spotify.isInitialized) spotify.refreshConnection()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) window.hideStatusBar()
    }

    override fun onDestroy() {
        if (::spotify.isInitialized) {
            if (isFinishing) model.finishSession()
            model.detachPlayback(spotify)
            spotify.close()
        }
        super.onDestroy()
    }
}
