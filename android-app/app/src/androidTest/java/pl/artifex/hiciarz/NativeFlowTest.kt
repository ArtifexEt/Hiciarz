package pl.artifex.hiciarz

import android.accessibilityservice.AccessibilityService
import android.graphics.Bitmap
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.lifecycle.ViewModelProvider
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import pl.artifex.hiciarz.model.CardSkin
import pl.artifex.hiciarz.model.AppAction
import pl.artifex.hiciarz.model.QuestionType

/** Real navigation and game callbacks, with no Spotify account or camera permission required. */
class NativeFlowTest {
    @get:Rule val compose = createEmptyComposeRule()
    private lateinit var activity: ActivityScenario<MainActivity>

    @Before fun launch() {
        InstrumentationRegistry.getInstrumentation().targetContext
            .getSharedPreferences("hiciarz", 0).edit().clear().putString("language", "pl").commit()
        activity = ActivityScenario.launch(MainActivity::class.java)
        compose.waitUntil(15_000) {
            compose.onAllNodesWithText("Wklej kod lub link").fetchSemanticsNodes().isNotEmpty()
        }
    }

    @After fun close() { if (::activity.isInitialized) activity.close() }

    @Test fun bingoRequiresAQuestionThenAnExplicitScanAndKeepsItsRule() {
        compose.onNodeWithText("Bingo").performClick()
        captureNative(compose, "phone-games-pl")
        compose.onNodeWithContentDescription("Jak grać").performClick()
        compose.onNodeWithText("Plansze do pobrania").performScrollTo().assertIsDisplayed()
        captureNative(compose, "phone-help-bingo-pl", scrollTop = false)
        compose.onNodeWithContentDescription("Wróć").performClick()

        compose.onNodeWithText("Wylosuj pytanie").performScrollTo().performClick()
        compose.onNodeWithText("Skanuj kartę").performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag("camera-preview").assertDoesNotExist()
        captureNative(compose, "phone-bingo-question-pl")
        compose.onNodeWithText("Skanuj kartę").performClick()
        compose.onNodeWithTag("camera-preview").assertIsDisplayed()
        compose.onNodeWithText("Wróć do pytania").performScrollTo().performClick()
        compose.onNodeWithText("Skanuj kartę").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Skanuj kartę").performClick()
        enterCode("https://example.org/#2vs0000000000000000000000")
        compose.onNodeWithTag("camera-preview").assertDoesNotExist()
        compose.onNodeWithText("Odkryj odpowiedź").assertDoesNotExist()
        compose.onNodeWithText("Odpowiedź znajdziesz na drukowanej karcie.").assertExists()
        compose.onNodeWithText("Następna runda").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Następna runda").performScrollTo().performClick()
        compose.onNodeWithText("Skanuj kartę").performScrollTo().assertIsDisplayed()

        // A known printed card can reveal its answer in the app. The question stays fixed.
        activity.onActivity {
            ViewModelProvider(it)[HiciarzViewModel::class.java].dispatch(AppAction.SetQuestion(QuestionType.YEAR_WITHIN_TWO))
        }
        compose.onNodeWithText("Skanuj kartę").performClick()
        enterCode(KNOWN_FISH_CARD)
        compose.onNodeWithText(KNOWN_TITLE).assertDoesNotExist()
        compose.onNodeWithText("Odkryj odpowiedź").performScrollTo().assertIsDisplayed()
        waitForFishArtwork()
        captureNative(compose, "phone-bingo-playing-pl")
        compose.onNodeWithText("Odkryj odpowiedź").performScrollTo().performClick()
        compose.onNodeWithText(KNOWN_TITLE).performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Następna runda").performScrollTo().assertIsDisplayed()
    }

    @Test fun scannerSkinsSettingsAndLanguageUseNativeScreens() {
        compose.onNodeWithText("Skaner").assertIsSelected()
        compose.onNodeWithText("Talie").assertDoesNotExist()
        compose.onNodeWithText("Graj bez kart").assertDoesNotExist()
        compose.onNodeWithTag("mode-timeline").assertDoesNotExist()
        captureNative(compose, "phone-scan-pl")
        enterCode("https://example.org/#2fs0000000000000000000000")
        compose.onNodeWithText("Który to rok?").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Odkryj odpowiedź").assertDoesNotExist()
        compose.onNodeWithText("Odpowiedź znajdziesz na drukowanej karcie.").assertExists()
        waitForFishArtwork()
        captureNative(compose, "phone-scan-fish-pl")
        compose.onNodeWithText("Następna karta").performScrollTo().performClick()

        enterCode(KNOWN_FISH_CARD)
        compose.onNodeWithText(KNOWN_TITLE).assertDoesNotExist()
        compose.onNodeWithText("1964").assertDoesNotExist()
        compose.onNodeWithText("Odkryj odpowiedź").performScrollTo().performClick()
        compose.onNodeWithText(KNOWN_TITLE).performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("1964").assertIsDisplayed()
        captureNative(compose, "phone-scan-revealed-pl")
        compose.onNodeWithText("Następna karta").performScrollTo().performClick()
        compose.onNodeWithTag("camera-preview").assertIsDisplayed()

        compose.onNodeWithText("Opcje").performClick()
        compose.onNodeWithText("Automatyczna pauza").performScrollTo().assertIsOff()
        compose.onNodeWithText("Client ID", substring = true).assertDoesNotExist()
        compose.onNodeWithText("Gdzie gra muzyka", substring = true).assertDoesNotExist()
        captureNative(compose, "phone-settings-pl")
        compose.onNodeWithText("Używaj skórki zeskanowanej karty").performScrollTo().performClick()
        compose.onNodeWithText("Skórka domyślna").performScrollTo().performClick()
        compose.onNodeWithText("Zima").performScrollTo().performClick()
        compose.waitUntil(10_000) {
            CardSkin.entries.all { skin ->
                compose.onAllNodesWithTag("skin-art-${skin.id}", useUnmergedTree = true).fetchSemanticsNodes().isNotEmpty()
            }
        }
        captureNative(compose, "phone-skins-pl", scrollTop = false)
        InstrumentationRegistry.getInstrumentation().uiAutomation.performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK)
        compose.waitForIdle()
        compose.onNodeWithText("English").performScrollTo().performClick()
        compose.onNodeWithText("Scan").assertIsDisplayed()
        compose.onNodeWithText("Bingo").assertIsDisplayed()
        compose.onNodeWithText("Decks").assertDoesNotExist()
        compose.onNodeWithText("Language").performScrollTo().assertIsDisplayed()
        captureNative(compose, "phone-settings-en")
    }

    private fun enterCode(code: String) {
        compose.onNodeWithText("Wklej kod lub link").performScrollTo().performClick()
        compose.onNodeWithText("Link Spotify lub kod Hiciarza").performTextInput(code)
        compose.onNodeWithText("Odtwórz").performClick()
        compose.waitForIdle()
    }

    private fun waitForFishArtwork() {
        compose.waitUntil(10_000) {
            compose.onAllNodesWithTag("skin-art-fish", useUnmergedTree = true).fetchSemanticsNodes().isNotEmpty()
        }
    }

    private companion object {
        const val KNOWN_FISH_CARD = "https://example.org/#2fs2EjXfH91m7f8HiJN1yQg97"
        const val KNOWN_TITLE = "Rockin' Around The Christmas Tree"
    }
}

internal fun captureNative(compose: androidx.compose.ui.test.junit4.ComposeTestRule, name: String, scrollTop: Boolean = true) {
    if (scrollTop) {
        val count = compose.onAllNodes(hasScrollAction()).fetchSemanticsNodes().size
        repeat(count) { index ->
            compose.onAllNodes(hasScrollAction())[index]
                .performSemanticsAction(SemanticsActions.ScrollBy) { it(0f, -100_000f) }
        }
    }
    compose.waitForIdle()
    val instrumentation = InstrumentationRegistry.getInstrumentation()
    instrumentation.waitForIdleSync()
    compose.waitUntil(5_000) {
        var hidden = true
        instrumentation.runOnMainSync {
            val decor = androidx.test.runner.lifecycle.ActivityLifecycleMonitorRegistry.getInstance()
                .getActivitiesInStage(androidx.test.runner.lifecycle.Stage.RESUMED).firstOrNull()?.window?.decorView
            val insets = decor?.let { androidx.core.view.ViewCompat.getRootWindowInsets(it) }
            hidden = insets == null || (!insets.isVisible(androidx.core.view.WindowInsetsCompat.Type.ime()) &&
                insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.ime()).bottom == 0)
        }
        hidden
    }
    val drawn = CountDownLatch(1)
    instrumentation.runOnMainSync {
        val current = androidx.test.runner.lifecycle.ActivityLifecycleMonitorRegistry.getInstance()
            .getActivitiesInStage(androidx.test.runner.lifecycle.Stage.RESUMED).firstOrNull()
        val decor = current?.window?.decorView
        if (decor == null) drawn.countDown()
        else {
            if (android.os.Build.VERSION.SDK_INT >= 29) decor.viewTreeObserver.registerFrameCommitCallback {
                decor.postOnAnimation { decor.postOnAnimation { drawn.countDown() } }
            } else decor.postOnAnimation { decor.postOnAnimation { drawn.countDown() } }
            decor.invalidate()
        }
    }
    check(drawn.await(3, TimeUnit.SECONDS)) { "Window did not commit the screenshot frame" }
    val context = InstrumentationRegistry.getInstrumentation().targetContext
    val directory = File(context.filesDir, "screenshots").apply { mkdirs() }
    File(directory, "$name.png").outputStream().use {
        InstrumentationRegistry.getInstrumentation().uiAutomation.takeScreenshot()
            .compress(Bitmap.CompressFormat.PNG, 100, it)
    }
}

internal fun nativeShell(command: String) {
    android.os.ParcelFileDescriptor.AutoCloseInputStream(
        InstrumentationRegistry.getInstrumentation().uiAutomation.executeShellCommand(command),
    ).use { it.readBytes() }
}
