package pl.artifex.hiciarz

import android.accessibilityservice.AccessibilityService
import android.content.res.Configuration
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import pl.artifex.hiciarz.model.*
import pl.artifex.hiciarz.ui.HiciarzApp
import pl.artifex.hiciarz.ui.appColorScheme
import kotlin.math.abs

/** A skin changes the surrounding app and dialogs, including cards unknown to the APK. */
class AppSkinThemeTest {
    @get:Rule val compose = createComposeRule()
    private val actions = mutableListOf<AppAction>()

    @Test fun choosingADefaultSkinRecolorsSettingsNavigationAndPlaybackSheet() {
        val state = mutableStateOf(AppState(tab = AppTab.SETTINGS,
            settings = AppSettings(language = "en", cardSkin = CardSkin.WINTER, followCardSkin = false)))
        compose.setContent { HiciarzApp(state.value) { action ->
            actions.add(action)
            when (action) {
                is AppAction.SetCardSkin -> state.value = state.value.copy(scannedSkin = null,
                    settings = state.value.settings.copy(cardSkin = action.skin))
                else -> Unit
            }
        } }
        val backgrounds = mutableListOf<Int>()
        val navigationColors = mutableListOf<Int>()
        val sheetColors = mutableListOf<Int>()
        listOf(CardSkin.WINTER to "Winter", CardSkin.DISCO to "Disco", CardSkin.FISH to "Fish").forEach { (skin, label) ->
            compose.onNodeWithText("Default skin").performScrollTo().performClick()
            compose.onNode(hasText(label) and hasAnyAncestor(isDialog())).performScrollTo().performClick()
            compose.onNode(hasText(label) and hasAnyAncestor(isDialog())).assertIsSelected()
            compose.waitUntil(10_000) {
                compose.onAllNodesWithTag("skin-art-${skin.id}", useUnmergedTree = true).fetchSemanticsNodes().isNotEmpty()
            }
            captureNative(compose, "skin-${skin.id}-picker", scrollTop = false)
            dismissSheet()
            compose.runOnIdle { assertEquals(skin, state.value.settings.cardSkin) }
            val expected = appColorScheme(skin, darkMode())
            val background = appBackground()
            val navigation = navigationColor()
            assertColor("${skin.id} app background", expected.background, background)
            assertColor("${skin.id} navigation", expected.inverseSurface, navigation)
            backgrounds += background.toArgb()
            navigationColors += navigation.toArgb()
            captureNative(compose, "skin-${skin.id}-settings", scrollTop = true)

            compose.onNodeWithContentDescription("Spotify playback").performClick()
            compose.onNode(hasText("Playback") and hasAnyAncestor(isDialog())).assertIsDisplayed()
            val sheet = dominantColor(compose.onNode(isDialog()).captureToImage())
            sheetColors += sheet.toArgb()
            assertColor("${skin.id} playback sheet", expected.surfaceContainerLow, sheet)
            captureNative(compose, "skin-${skin.id}-playback", scrollTop = false)
            dismissSheet()
        }
        assertEquals("Each skin colors the whole background", 3, backgrounds.distinct().size)
        assertEquals("Each skin colors navigation", 3, navigationColors.distinct().size)
        assertEquals("Each skin colors dialogs", 3, sheetColors.distinct().size)
        assertEquals(listOf(CardSkin.WINTER, CardSkin.DISCO, CardSkin.FISH),
            actions.filterIsInstance<AppAction.SetCardSkin>().map { it.skin })
    }

    @Test fun followingAnUnknownQrSkinRecolorsTheAppAndCanReturnToTheDefault() {
        val unknown = Song("0000000000000000000000", skin = CardSkin.FISH)
        val state = mutableStateOf(AppState(currentSong = unknown, scannedSkin = CardSkin.FISH,
            scannerEnabled = false,
            settings = AppSettings(language = "en", cardSkin = CardSkin.WINTER, followCardSkin = true)))
        compose.setContent { HiciarzApp(state.value) { action ->
            actions.add(action)
            when (action) {
                is AppAction.SelectTab -> state.value = state.value.copy(tab = action.tab)
                is AppAction.SetFollowCardSkin -> state.value = state.value.copy(
                    settings = state.value.settings.copy(followCardSkin = action.enabled))
                else -> Unit
            }
        } }
        val fish = appColorScheme(CardSkin.FISH, darkMode())
        assertColor("QR colors the scanner without metadata", fish.background, appBackground())
        assertColor("QR colors navigation without metadata", fish.inverseSurface, navigationColor())
        compose.onNodeWithText("Reveal answer").assertDoesNotExist()
        captureNative(compose, "skin-fish-unknown-card", scrollTop = false)

        compose.onNodeWithText("Settings").performClick()
        compose.onNodeWithText("Use the scanned card’s skin").performScrollTo().assertIsOn().performClick()
        compose.onNodeWithText("Use the scanned card’s skin").assertIsOff()
        val winter = appColorScheme(CardSkin.WINTER, darkMode())
        assertColor("Disabling QR restores default background", winter.background, appBackground())
        assertColor("Disabling QR restores default navigation", winter.inverseSurface, navigationColor())
        captureNative(compose, "skin-winter-qr-disabled", scrollTop = true)
        compose.onNodeWithText("Use the scanned card’s skin").performScrollTo().performClick()
        assertColor("Reenabling QR restores fish background", fish.background, appBackground())
        assertEquals(listOf(false, true), actions.filterIsInstance<AppAction.SetFollowCardSkin>().map { it.enabled })
    }

    @Test fun allSkinColorPairsKeepSmallTextReadableInLightAndDarkModes() {
        CardSkin.entries.forEach { skin -> listOf(false, true).forEach { dark ->
            val colors = appColorScheme(skin, dark)
            val pairs = listOf(
                "primary" to (colors.primary to colors.onPrimary),
                "secondary" to (colors.secondary to colors.onSecondary),
                "secondaryContainer" to (colors.secondaryContainer to colors.onSecondaryContainer),
                "tertiary" to (colors.tertiary to colors.onTertiary),
                "tertiaryContainer" to (colors.tertiaryContainer to colors.onTertiaryContainer),
                "primaryContainer" to (colors.primaryContainer to colors.onPrimaryContainer),
                "surface" to (colors.surface to colors.onSurface),
                "surfaceVariant" to (colors.surfaceVariant to colors.onSurfaceVariant),
                "background" to (colors.background to colors.onBackground),
                "inverseSurface" to (colors.inverseSurface to colors.inverseOnSurface),
            )
            pairs.forEach { (name, pair) ->
                val first = pair.first.luminance()
                val second = pair.second.luminance()
                val contrast = (maxOf(first, second) + .05f) / (minOf(first, second) + .05f)
                assertTrue("${skin.id} dark=$dark $name text contrast is $contrast; expected at least 4.5", contrast >= 4.5f)
            }
        } }
    }

    private fun appBackground(): Color {
        val pixels = compose.onRoot().captureToImage().toPixelMap()
        return pixels[4, pixels.height / 3]
    }

    private fun navigationColor(): Color {
        val pixels = compose.onNodeWithTag("app-bottom-navigation").captureToImage().toPixelMap()
        return pixels[2, pixels.height / 2]
    }

    private fun dominantColor(image: ImageBitmap): Color {
        val pixels = image.toPixelMap()
        val counts = mutableMapOf<Int, Int>()
        for (y in 0 until pixels.height step 4) for (x in 0 until pixels.width step 4) {
            val color = pixels[x, y]
            if (color.alpha > .99f) counts[color.toArgb()] = (counts[color.toArgb()] ?: 0) + 1
        }
        return Color(requireNotNull(counts.maxByOrNull { it.value }).key)
    }

    private fun assertColor(message: String, expected: Color, actual: Color) {
        val difference = abs(expected.red - actual.red) + abs(expected.green - actual.green) + abs(expected.blue - actual.blue)
        assertTrue("$message: expected ${expected.toArgb().toUInt().toString(16)}, got ${actual.toArgb().toUInt().toString(16)}",
            difference < .012f)
    }

    private fun darkMode() = InstrumentationRegistry.getInstrumentation().targetContext.resources.configuration.uiMode and
        Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES

    private fun dismissSheet() {
        InstrumentationRegistry.getInstrumentation().uiAutomation.performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK)
        compose.waitForIdle()
    }
}
