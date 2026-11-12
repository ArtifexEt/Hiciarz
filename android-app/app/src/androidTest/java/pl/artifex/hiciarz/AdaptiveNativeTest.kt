package pl.artifex.hiciarz

import android.graphics.Rect
import android.view.WindowInsets
import androidx.activity.compose.setContent
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import pl.artifex.hiciarz.model.AppSettings
import pl.artifex.hiciarz.model.AppState
import pl.artifex.hiciarz.model.AppTab
import pl.artifex.hiciarz.model.ConnectionStatus
import pl.artifex.hiciarz.model.PlaybackState
import pl.artifex.hiciarz.ui.HiciarzApp
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowLayoutInfo
import androidx.window.testing.layout.FoldingFeature as TestFoldingFeature
import androidx.window.testing.layout.WindowLayoutInfoPublisherRule
import org.junit.After
import org.junit.Assert.assertTrue
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test

/** Changes the actual Activity window and publishes real WindowManager posture information. */
class AdaptiveNativeTest {
    @get:Rule(order = 0) val window = WindowLayoutInfoPublisherRule()
    @get:Rule(order = 1) val compose = createEmptyComposeRule()
    private lateinit var activity: ActivityScenario<MainActivity>

    @Before fun launch() {
        InstrumentationRegistry.getInstrumentation().targetContext
            .getSharedPreferences("hiciarz", 0).edit().clear().putString("language", "pl").commit()
        activity = ActivityScenario.launch(MainActivity::class.java)
        compose.waitUntil(15_000) { compose.onAllNodesWithTag("camera-preview").fetchSemanticsNodes().isNotEmpty() }
    }

    @After fun restoreDisplay() {
        nativeShell("settings put system font_scale 1.0")
        nativeShell("cmd uimode night no")
        nativeShell("wm size reset")
        nativeShell("wm density reset")
        if (::activity.isInitialized) activity.close()
    }

    @Test fun foldCoverInnerAndTabletopKeepContentClearOfTheHinge() {
        resize("1080x2520", 420, 400..430)
        captureNative(compose, "fold-cover-scanner-pl")

        // Fold7 inner display at a representative density: about 750 dp, not just a tablet preset.
        resize("1968x2184", 420, 730..770)
        val vertical = publishFold(FoldingFeature.Orientation.VERTICAL)
        assertPanesAvoid(vertical, vertical = true)
        captureNative(compose, "fold-inner-scanner-pl")

        val horizontal = publishFold(FoldingFeature.Orientation.HORIZONTAL)
        assertPanesAvoid(horizontal, vertical = false)
        val camera = compose.onNodeWithTag("camera-preview").assertIsDisplayed().getUnclippedBoundsInRoot()
        val cameraPane = compose.onNodeWithTag("primary-pane").getUnclippedBoundsInRoot()
        assertTrue("The entire camera must fit above the horizontal hinge", camera.bottom <= cameraPane.bottom)
        val navigation = compose.onNodeWithTag("app-bottom-navigation").fetchSemanticsNode().boundsInRoot
        assertTrue("Tabletop navigation crosses the hinge", navigation.top >= horizontal.bottom - 1f)
        captureNative(compose, "fold-tabletop-scanner-pl")
        compose.onNodeWithText("Opcje").performClick()
        captureNative(compose, "fold-tabletop-settings-pl")
    }

    @Test fun settingsSupportDarkLargeTextAndShortLandscape() {
        resize("1080x2400", 480, 350..370)
        compose.onNodeWithText("Opcje").performClick()
        nativeShell("cmd uimode night yes")
        compose.waitUntil(15_000) {
            InstrumentationRegistry.getInstrumentation().targetContext.resources.configuration.uiMode and
                android.content.res.Configuration.UI_MODE_NIGHT_MASK == android.content.res.Configuration.UI_MODE_NIGHT_YES
        }
        compose.waitForIdle()
        captureNative(compose, "phone-settings-dark-pl")
        nativeShell("settings put system font_scale 1.35")
        compose.waitUntil(15_000) {
            InstrumentationRegistry.getInstrumentation().targetContext.resources.configuration.fontScale > 1.3f
        }
        compose.onNodeWithText("Jak tworzyć karty").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("English").performScrollTo().assertIsDisplayed()
        captureNative(compose, "phone-settings-large-dark-pl")
        resize("1800x1000", 280, 1000..1050)
        compose.onNodeWithTag("primary-pane").assertIsDisplayed()
        compose.onNodeWithTag("secondary-pane").assertIsDisplayed()
        captureNative(compose, "landscape-settings-large-dark-pl")
    }

    @Test fun unfoldedSettingsPlayerStaysAboveSystemNavigation() {
        resize("1968x2184", 420, 730..770)
        publishFold(FoldingFeature.Orientation.VERTICAL)
        activity.onActivity {
            it.setContent {
                HiciarzApp(AppState(
                    tab = AppTab.SETTINGS,
                    settings = AppSettings(language = "pl"),
                    playback = PlaybackState(connection = ConnectionStatus.CONNECTED, isPlaying = true),
                )) {}
            }
        }
        compose.onNodeWithTag("app-mini-player").assertIsDisplayed()
        val player = compose.onNodeWithTag("app-mini-player").fetchSemanticsNode().boundsInRoot
        var safeBottom = 0
        activity.onActivity {
            val view = it.window.decorView
            val bottomInset = if (android.os.Build.VERSION.SDK_INT >= 30)
                view.rootWindowInsets.getInsets(WindowInsets.Type.navigationBars()).bottom
            else @Suppress("DEPRECATION") view.rootWindowInsets.systemWindowInsetBottom
            safeBottom = view.height - bottomInset
        }
        assertTrue("Settings player overlaps system navigation", player.bottom <= safeBottom + 1f)
        captureNative(compose, "fold-inner-settings-playing-pl")
    }

    @Test fun tabletScannerKeepsItsSquareCameraAndCardControlsVisible() {
        resize("2560x1600", 320, 1260..1300)
        compose.onNodeWithTag("camera-preview").assertIsDisplayed()
        val camera = compose.onNodeWithTag("camera-preview").fetchSemanticsNode().boundsInRoot
        assertEquals("Tablet camera must remain square", camera.width, camera.height, 1f)
        compose.onNodeWithText("Wklej kod lub link").assertDoesNotExist()
        captureNative(compose, "tablet-scanner-pl")

        scanNativeCard(activity, compose, "spotify:track:0000000000000000000000")
        compose.onNodeWithTag("card-playback-toggle").assertIsDisplayed()
        compose.onNodeWithTag("camera-preview").assertDoesNotExist()
        compose.onNodeWithText("Skanuj nową").assertIsDisplayed()
        captureNative(compose, "tablet-card-pl")

        compose.onNodeWithText("Skanuj nową").performClick()
        compose.onNodeWithTag("camera-preview").assertIsDisplayed()
        resize("1968x2184", 420, 730..770)
        compose.onNodeWithTag("camera-preview").assertIsDisplayed()
        compose.onNodeWithText("Bingo").assertDoesNotExist()
    }

    private fun resize(size: String, density: Int, expectedWidth: IntRange) {
        nativeShell("wm size $size")
        nativeShell("wm density $density")
        compose.waitUntil(20_000) {
            InstrumentationRegistry.getInstrumentation().targetContext.resources.configuration.screenWidthDp in expectedWidth
        }
        compose.waitForIdle()
    }

    private fun publishFold(orientation: FoldingFeature.Orientation): Rect {
        var bounds = Rect()
        activity.onActivity {
            val fold = TestFoldingFeature(activity = it, size = 24,
                state = FoldingFeature.State.HALF_OPENED, orientation = orientation)
            bounds = Rect(fold.bounds)
            window.overrideWindowLayoutInfo(WindowLayoutInfo(listOf(fold)))
        }
        compose.waitUntil(15_000) {
            val panes = compose.onAllNodesWithTag("primary-pane").fetchSemanticsNodes()
            if (panes.isEmpty()) false else {
                val primary = panes.first().boundsInRoot
                if (orientation == FoldingFeature.Orientation.VERTICAL) primary.right <= bounds.left + 1f
                else primary.bottom <= bounds.top + 1f
            }
        }
        compose.waitForIdle()
        return bounds
    }

    private fun assertPanesAvoid(hinge: Rect, vertical: Boolean) {
        val first = compose.onNodeWithTag("primary-pane").fetchSemanticsNode().boundsInRoot
        val second = compose.onNodeWithTag("secondary-pane").fetchSemanticsNode().boundsInRoot
        if (vertical) {
            assertTrue("Primary pane crosses the vertical hinge", first.right <= hinge.left + 1f)
            assertTrue("Secondary pane crosses the vertical hinge", second.left >= hinge.right - 1f)
        } else {
            assertTrue("Primary pane crosses the tabletop hinge", first.bottom <= hinge.top + 1f)
            assertTrue("Secondary pane crosses the tabletop hinge", second.top >= hinge.bottom - 1f)
        }
    }
}
