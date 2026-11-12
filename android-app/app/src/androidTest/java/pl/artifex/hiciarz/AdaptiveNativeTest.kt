package pl.artifex.hiciarz

import android.graphics.Rect
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import androidx.lifecycle.ViewModelProvider
import pl.artifex.hiciarz.model.BingoStage
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
        compose.waitUntil(15_000) { compose.onAllNodesWithText("Wklej kod lub link").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("Bingo").performClick()
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
        captureNative(compose, "fold-cover-bingo-pl")
        compose.onNodeWithText("Wylosuj pytanie").performScrollTo().performClick()
        compose.onNodeWithText("Skanuj kartę").performScrollTo().performClick()

        // Fold7 inner display at a representative density: about 750 dp, not just a tablet preset.
        resize("1968x2184", 420, 730..770)
        val vertical = publishFold(FoldingFeature.Orientation.VERTICAL)
        assertPanesAvoid(vertical, vertical = true)
        captureNative(compose, "fold-inner-scanner-pl")

        val horizontal = publishFold(FoldingFeature.Orientation.HORIZONTAL)
        assertPanesAvoid(horizontal, vertical = false)
        val navigation = compose.onNodeWithTag("app-bottom-navigation").fetchSemanticsNode().boundsInRoot
        assertTrue("Tabletop navigation crosses the hinge", navigation.top >= horizontal.bottom - 1f)
        captureNative(compose, "fold-tabletop-scanner-pl")
        compose.onNodeWithText("Wstrzymaj skanowanie").performScrollTo().performClick()
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
        compose.onNodeWithText("Jak grać").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("English").performScrollTo().assertIsDisplayed()
        captureNative(compose, "phone-settings-large-dark-pl")
        resize("1800x1000", 280, 1000..1050)
        compose.onNodeWithTag("primary-pane").assertIsDisplayed()
        compose.onNodeWithTag("secondary-pane").assertIsDisplayed()
        captureNative(compose, "landscape-settings-large-dark-pl")
    }

    @Test fun tabletDrawShowsTheCameraAndFullRuleTogetherThroughTheRound() {
        resize("2560x1600", 320, 1260..1300)
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        instrumentation.uiAutomation.grantRuntimePermission(instrumentation.targetContext.packageName,
            android.Manifest.permission.CAMERA)
        compose.onNodeWithText("Wylosuj pytanie").performScrollTo().performClick()
        compose.onNodeWithTag("camera-preview").assertIsDisplayed()
        compose.onNodeWithTag("bingo-rule-card").assertIsDisplayed()
        compose.onNodeWithText("Skanuj kartę").assertDoesNotExist()
        val camera = compose.onNodeWithTag("camera-preview").fetchSemanticsNode().boundsInRoot
        val rule = compose.onNodeWithTag("bingo-rule-card").fetchSemanticsNode().boundsInRoot
        assertTrue("Camera and rule must be visible in separate columns", camera.right <= rule.left)
        captureNative(compose, "tablet-bingo-scanner-pl")

        var model: HiciarzViewModel? = null
        activity.onActivity { model = ViewModelProvider(it)[HiciarzViewModel::class.java] }
        val question = model!!.state.value.question
        compose.onNodeWithText("Wklej kod lub link").performScrollTo().performClick()
        compose.onNodeWithText("Link Spotify lub kod Hiciarza").performTextInput("spotify:track:0000000000000000000000")
        compose.onNodeWithText("Odtwórz").performClick()
        compose.waitUntil(5_000) { model!!.state.value.bingoStage == BingoStage.PLAYING }
        compose.onNodeWithTag("bingo-rule-card").assertIsDisplayed()
        assertEquals(question, model!!.state.value.question)
        compose.onNodeWithTag("camera-preview").assertDoesNotExist()
        captureNative(compose, "tablet-bingo-playing-pl")

        compose.onNodeWithText("Następna runda").performScrollTo().performClick()
        compose.onNodeWithTag("camera-preview").assertIsDisplayed()
        compose.onNodeWithTag("bingo-rule-card").assertIsDisplayed()
        assertEquals(2, model!!.state.value.bingoRound)
        compose.onNodeWithText("Wstrzymaj skanowanie").performScrollTo().performClick()
        compose.onNodeWithTag("camera-preview").assertDoesNotExist()
        resize("1968x2184", 420, 730..770)
        compose.onNodeWithTag("bingo-rule-card").assertIsDisplayed()
        compose.onNodeWithTag("camera-preview").assertDoesNotExist()
        assertEquals(BingoStage.RULE, model!!.state.value.bingoStage)
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
