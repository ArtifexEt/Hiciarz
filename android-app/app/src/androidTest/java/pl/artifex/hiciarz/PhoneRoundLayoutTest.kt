package pl.artifex.hiciarz

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test

/** A 360 dp phone keeps scanner playback controls clear of navigation. */
class PhoneRoundLayoutTest {
    @get:Rule val compose = createEmptyComposeRule()
    private lateinit var activity: ActivityScenario<MainActivity>

    @Before fun launchPhone() {
        nativeShell("wm size 1080x2400")
        nativeShell("wm density 480")
        nativeShell("settings put system font_scale 1.0")
        nativeShell("cmd uimode night no")
        InstrumentationRegistry.getInstrumentation().targetContext
            .getSharedPreferences("hiciarz", 0).edit().clear().putString("language", "pl").commit()
        activity = ActivityScenario.launch(MainActivity::class.java)
        compose.waitUntil(15_000) {
            val configuration = InstrumentationRegistry.getInstrumentation().targetContext.resources.configuration
            configuration.screenWidthDp in 350..370 && configuration.fontScale == 1f &&
                compose.onAllNodesWithTag("camera-preview").fetchSemanticsNodes().isNotEmpty()
        }
    }

    @After fun restoreDisplay() {
        nativeShell("settings put system font_scale 1.0")
        nativeShell("cmd uimode night no")
        nativeShell("wm size reset")
        nativeShell("wm density reset")
        if (::activity.isInitialized) activity.close()
    }

    @Test fun scannerPlaybackFitsAboveNavigationWithoutScrolling() {
        captureNative(compose, "phone-scan-pl", scrollTop = false)
        enterKnownCard()
        val card = compose.onNodeWithTag("playback-card").assertIsDisplayed().getUnclippedBoundsInRoot()
        val scan = compose.onNodeWithTag("scan-new-card").assertIsDisplayed().getUnclippedBoundsInRoot()
        val navigation = compose.onNodeWithTag("app-bottom-navigation").assertIsDisplayed().getUnclippedBoundsInRoot()
        assertTrue("New scan sits below the card", scan.top >= card.bottom)
        assertTrue("New scan fits above navigation", scan.bottom <= navigation.top)
        compose.onNodeWithText("Odkryj odpowiedź").assertDoesNotExist()
        compose.onNodeWithText("1964").assertDoesNotExist()
        captureNative(compose, "phone-scan-known-hidden-pl", scrollTop = false)
    }

    @Test fun scannerPlaybackAndNewScanStayClearOfNavigation() {
        enterKnownCard()
        assertControlScrollsAboveNavigation("card-playback-toggle")
        assertControlScrollsAboveNavigation("scan-new-card")
        compose.onNodeWithText("Skanuj nową").performClick()
        compose.onNodeWithTag("camera-preview").assertIsDisplayed()
        compose.onNodeWithText("Bingo").assertDoesNotExist()
    }

    private fun enterKnownCard() {
        scanNativeCard(activity, compose, "https://example.org/#2fs2EjXfH91m7f8HiJN1yQg97")
        compose.waitUntil(10_000) {
            compose.onAllNodesWithTag("skin-art-fish", useUnmergedTree = true).fetchSemanticsNodes().isNotEmpty()
        }
    }

    private fun assertControlScrollsAboveNavigation(tag: String) {
        val control = compose.onNodeWithTag(tag).performScrollTo().assertIsDisplayed().getUnclippedBoundsInRoot()
        val navigation = compose.onNodeWithTag("app-bottom-navigation").getUnclippedBoundsInRoot()
        assertTrue("$tag stays above navigation after scrolling", control.bottom <= navigation.top)
    }
}
