package pl.artifex.hiciarz

import android.accessibilityservice.AccessibilityService
import android.app.ActivityManager
import android.view.inspector.WindowInspector
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.Lifecycle
import androidx.test.core.app.ActivityScenario
import androidx.test.filters.SdkSuppress
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test

/** Inspect the actual focused window, including Compose dialogs hosted outside the Activity. */
@SdkSuppress(minSdkVersion = 29)
class FullscreenNativeTest {
    @get:Rule val compose = createEmptyComposeRule()
    private lateinit var activity: ActivityScenario<MainActivity>
    private lateinit var appTask: ActivityManager.AppTask

    @Before fun launch() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        instrumentation.targetContext.getSharedPreferences("hiciarz", 0)
            .edit().clear().putString("language", "en").commit()
        activity = ActivityScenario.launch(MainActivity::class.java)
        activity.onActivity { current ->
            appTask = current.getSystemService(ActivityManager::class.java).appTasks.first {
                it.taskInfo?.taskId == current.taskId
            }
        }
        compose.waitUntil(15_000) {
            compose.onAllNodesWithTag("camera-preview").fetchSemanticsNodes().isNotEmpty()
        }
    }

    @After fun close() {
        if (::activity.isInitialized && activity.state != Lifecycle.State.DESTROYED) {
            returnToTask()
            activity.moveToState(Lifecycle.State.RESUMED)
            activity.close()
        }
    }

    @Test fun statusBarStaysHiddenAcrossTabsForegroundReturnAndRecreation() {
        assertFocusedWindow("Initial scanner", dialog = false)
        captureNative(compose, "fullscreen-scanner", scrollTop = false)
        compose.onNodeWithText("Bingo").assertDoesNotExist()
        compose.onNodeWithText("Settings").performClick()
        assertFocusedWindow("Settings", dialog = false)
        captureNative(compose, "fullscreen-settings", scrollTop = false)

        InstrumentationRegistry.getInstrumentation().uiAutomation
            .performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME)
        compose.waitUntil(7_000) { activity.state != Lifecycle.State.RESUMED }
        returnToTask()
        compose.onNodeWithText("Default skin").assertExists()
        assertFocusedWindow("Returned from home", dialog = false)
        activity.recreate()
        assertFocusedWindow("Recreated Activity", dialog = false)
    }

    @Test fun statusBarStaysHiddenInPlaybackSkinAndLicenseWindows() {
        compose.onNodeWithContentDescription("Spotify playback").performClick()
        compose.onNodeWithText("Playback").assertIsDisplayed()
        assertFocusedWindow("Playback sheet", dialog = true)
        captureNative(compose, "fullscreen-playback-sheet", scrollTop = false)
        back()
        assertFocusedWindow("After playback sheet", dialog = false)

        compose.onNodeWithText("Settings").performClick()
        compose.onNodeWithText("Default skin").performScrollTo().performClick()
        compose.onNodeWithText("Skins").assertIsDisplayed()
        assertFocusedWindow("Skin sheet", dialog = true)
        captureNative(compose, "fullscreen-skin-sheet", scrollTop = false)
        back()
        assertFocusedWindow("After skin sheet", dialog = false)

        compose.onNodeWithText("Font licenses").performScrollTo().performClick()
        compose.onNode(hasText("Font licenses") and hasAnyAncestor(isDialog())).assertIsDisplayed()
        assertFocusedWindow("Font licenses dialog", dialog = true)
        captureNative(compose, "fullscreen-licenses-dialog", scrollTop = false)
        back()
        assertFocusedWindow("After font licenses dialog", dialog = false)

        compose.onNodeWithText("Scan").performClick()
        compose.onNodeWithTag("camera-preview").assertIsDisplayed()
        compose.onNodeWithText("Paste code or link").assertDoesNotExist()
        assertFocusedWindow("Scanner without a text-entry window", dialog = false, ime = false)
    }

    private fun assertFocusedWindow(label: String, dialog: Boolean, ime: Boolean? = null) {
        var latest = "No focused app window"
        try {
            compose.waitUntil(7_000) {
                var matches = false
                activity.onActivity { current ->
                    val focused = WindowInspector.getGlobalWindowViews().lastOrNull {
                        it.isAttachedToWindow && it.isShown && it.hasWindowFocus()
                    }
                    val insets = focused?.let(ViewCompat::getRootWindowInsets)
                    if (focused != null && insets != null) {
                        val isDialog = focused !== current.window.decorView
                        val statusVisible = insets.isVisible(WindowInsetsCompat.Type.statusBars())
                        val navigationVisible = insets.isVisible(WindowInsetsCompat.Type.navigationBars())
                        val imeVisible = insets.isVisible(WindowInsetsCompat.Type.ime())
                        latest = "dialog=$isDialog status=$statusVisible navigation=$navigationVisible ime=$imeVisible"
                        matches = isDialog == dialog && !statusVisible && navigationVisible &&
                            (ime == null || imeVisible == ime)
                    }
                }
                matches
            }
        } catch (failure: Throwable) {
            throw AssertionError("$label: expected hidden status bar and visible system navigation; $latest", failure)
        }
    }

    private fun back() {
        InstrumentationRegistry.getInstrumentation().uiAutomation
            .performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK)
        compose.waitForIdle()
    }

    private fun returnToTask() {
        InstrumentationRegistry.getInstrumentation().runOnMainSync { appTask.moveToFront() }
    }

}
