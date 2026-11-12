package pl.artifex.hiciarz.ui

import android.view.View
import android.view.ViewTreeObserver
import android.view.Window
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.window.DialogWindowProvider
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/** Keep the clock and notification icons out of the game; retain system navigation. */
internal fun Window.hideStatusBar() {
    WindowCompat.getInsetsController(this, decorView).apply {
        systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        hide(WindowInsetsCompat.Type.statusBars())
    }
}

/** Compose sheets and dialogs own a window separate from the Activity. */
@Composable
internal fun HideStatusBar() {
    val view = LocalView.current
    val context = LocalContext.current
    val window = view.dialogWindow() ?: context.activity()?.window ?: return
    DisposableEffect(window, view) {
        val hide = Runnable { window.hideStatusBar() }
        val focus = ViewTreeObserver.OnWindowFocusChangeListener { focused ->
            if (focused) window.hideStatusBar()
        }
        view.viewTreeObserver.addOnWindowFocusChangeListener(focus)
        // Dialog content can compose before its window is attached.
        view.post(hide)
        onDispose {
            view.removeCallbacks(hide)
            if (view.viewTreeObserver.isAlive) view.viewTreeObserver.removeOnWindowFocusChangeListener(focus)
        }
    }
}

private fun View.dialogWindow(): Window? {
    if (this is DialogWindowProvider) return window
    var ancestor = parent
    while (ancestor != null) {
        if (ancestor is DialogWindowProvider) return ancestor.window
        ancestor = ancestor.parent
    }
    return null
}
