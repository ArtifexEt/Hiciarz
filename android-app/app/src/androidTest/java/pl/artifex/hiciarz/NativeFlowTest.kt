package pl.artifex.hiciarz

import android.graphics.Bitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test

/** Exercises the native UI without Spotify, camera permissions or an account. */
class NativeFlowTest {
    @get:Rule val compose = createEmptyComposeRule()
    private lateinit var activity: ActivityScenario<MainActivity>

    @Before fun launch() {
        InstrumentationRegistry.getInstrumentation().targetContext
            .getSharedPreferences("hiciarz", 0).edit().clear().putString("language", "pl").commit()
        activity = ActivityScenario.launch(MainActivity::class.java)
    }

    @After fun close() {
        shell("wm size reset")
        shell("wm density reset")
        if (::activity.isInitialized) activity.close()
    }

    @Test fun scanRevealBingoAndLanguageUseNativeScreens() {
        compose.onNodeWithText("Talie").performClick()
        compose.waitUntil(15_000) {
            compose.onAllNodesWithText("Świąteczne przeboje").fetchSemanticsNodes().isNotEmpty()
        }
        capture("phone-decks-pl")

        compose.onNodeWithText("Skaner").performClick()
        capture("phone-scan-pl")
        compose.onNodeWithText("Wklej kod lub link").performScrollTo().performClick()
        compose.onNodeWithText("Link Spotify lub kod Hiciarza")
            .performTextInput("spotify:track:0000000000000000000000")
        compose.onNodeWithText("Odtwórz").performClick()
        compose.onNodeWithText("Który to rok?").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Odkryj odpowiedź").performScrollTo().performClick()
        compose.onNodeWithText("Odpowiedź na drukowanej karcie").performScrollTo().assertIsDisplayed()
        capture("phone-scan-revealed-pl", scrollTop = false)

        compose.onNodeWithText("Bingo").performClick()
        compose.onNodeWithText("Podstawowy").assertIsDisplayed()
        compose.onNodeWithText("Zaawansowany").assertIsDisplayed()
        capture("phone-bingo-pl")
        compose.onNodeWithText("Losuj utwór i pytanie").performScrollTo().performClick()
        compose.onNodeWithText("Odkryj odpowiedź").performScrollTo().assertIsDisplayed()
        capture("phone-bingo-question-pl", scrollTop = false)

        compose.onNodeWithText("Ustawienia").performClick()
        capture("phone-settings-pl")
        compose.onNodeWithText("English").performScrollTo().performClick()
        compose.onNodeWithText("Scan").assertIsDisplayed()
        compose.onNodeWithText("Decks").assertIsDisplayed()
        compose.onNodeWithText("Language").performScrollTo().assertIsDisplayed()
        capture("phone-settings-en")

        shell("wm size 1800x1200")
        shell("wm density 240")
        compose.waitUntil(15_000) {
            InstrumentationRegistry.getInstrumentation().targetContext.resources.configuration.screenWidthDp >= 600
        }
        capture("tablet-settings-en")
        compose.onNodeWithText("Decks").performClick()
        capture("tablet-decks-en")
        compose.onNodeWithText("Bingo").performClick()
        capture("tablet-bingo-en")
        compose.onNodeWithText("Scan").performClick()
        capture("tablet-scan-en")
    }

    private fun capture(name: String, scrollTop: Boolean = true) {
        if (scrollTop) {
            compose.onAllNodes(hasScrollAction()).onFirst()
                .performSemanticsAction(SemanticsActions.ScrollBy) { it(0f, -100_000f) }
        }
        compose.waitForIdle()
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val directory = File(context.filesDir, "screenshots").apply { mkdirs() }
        File(directory, "$name.png").outputStream().use {
            compose.onRoot().captureToImage().asAndroidBitmap().compress(Bitmap.CompressFormat.PNG, 100, it)
        }
    }

    private fun shell(command: String) {
        android.os.ParcelFileDescriptor.AutoCloseInputStream(
            InstrumentationRegistry.getInstrumentation().uiAutomation.executeShellCommand(command),
        ).use { it.readBytes() }
    }
}
