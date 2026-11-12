package pl.artifex.hiciarz

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.lifecycle.ViewModelProvider
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import pl.artifex.hiciarz.model.AppAction
import pl.artifex.hiciarz.model.QuestionType

/** The current round's main action must fit on a 360 dp phone without a corrective scroll. */
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
                compose.onAllNodesWithText("Wklej kod lub link").fetchSemanticsNodes().isNotEmpty()
        }
    }

    @After fun restoreDisplay() {
        nativeShell("settings put system font_scale 1.0")
        nativeShell("cmd uimode night no")
        nativeShell("wm size reset")
        nativeShell("wm density reset")
        if (::activity.isInitialized) activity.close()
    }

    @Test fun scannerRevealFitsAboveNavigationWithoutScrollingTheRound() {
        captureNative(compose, "phone-scan-pl", scrollTop = false)
        enterKnownCard()
        assertRevealFitsAboveNavigation()
        captureNative(compose, "phone-scan-known-hidden-pl", scrollTop = false)
        compose.onNodeWithText("Odkryj odpowiedź").performClick()
        compose.onNodeWithText("1964").assertIsDisplayed()
        captureNative(compose, "phone-card-answer-refined-pl", scrollTop = false)
    }

    @Test fun bingoRevealFitsAboveNavigationWithoutScrollingTheRound() {
        compose.onNodeWithText("Bingo").performClick()
        captureNative(compose, "phone-games-pl", scrollTop = false)
        compose.onNodeWithText("Wylosuj pytanie").performScrollTo().performClick()
        activity.onActivity {
            ViewModelProvider(it)[HiciarzViewModel::class.java]
                .dispatch(AppAction.SetQuestion(QuestionType.YEAR_WITHIN_TWO))
        }
        compose.onNodeWithText("Skanuj kartę").performScrollTo().performClick()
        enterKnownCard()
        assertRevealFitsAboveNavigation()
        captureNative(compose, "phone-bingo-compact-playing-pl", scrollTop = false)
        captureNative(compose, "phone-bingo-playing-pl", scrollTop = false)
    }

    private fun enterKnownCard() {
        compose.onNodeWithText("Wklej kod lub link").performScrollTo().performClick()
        compose.onNodeWithText("Link Spotify lub kod Hiciarza")
            .performTextInput("https://example.org/#2fs2EjXfH91m7f8HiJN1yQg97")
        compose.onNodeWithText("Odtwórz").performClick()
        compose.waitUntil(10_000) {
            compose.onAllNodesWithText("Odkryj odpowiedź").fetchSemanticsNodes().isNotEmpty() &&
                compose.onAllNodesWithTag("skin-art-fish", useUnmergedTree = true).fetchSemanticsNodes().isNotEmpty()
        }
        compose.waitForIdle()
    }

    private fun assertRevealFitsAboveNavigation() {
        // Do not scroll after the card loads: this verifies the player's actual entry position.
        val header = compose.onNodeWithText("Hiciarz").assertIsDisplayed().getUnclippedBoundsInRoot()
        val reveal = compose.onNodeWithText("Odkryj odpowiedź").assertIsDisplayed().getUnclippedBoundsInRoot()
        val navigation = compose.onNodeWithTag("app-bottom-navigation")
            .assertIsDisplayed().getUnclippedBoundsInRoot()
        assertTrue("Reveal must remain below the visible app header", reveal.top >= header.bottom)
        assertTrue("Reveal must be completely above bottom navigation", reveal.bottom <= navigation.top)
        assertTrue("Reveal must fit horizontally", reveal.left >= navigation.left && reveal.right <= navigation.right)
    }
}
