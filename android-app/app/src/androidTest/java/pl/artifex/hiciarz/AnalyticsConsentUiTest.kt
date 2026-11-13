package pl.artifex.hiciarz

import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsOff
import androidx.compose.ui.test.assertIsOn
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import pl.artifex.hiciarz.model.AppAction
import pl.artifex.hiciarz.model.AppState
import pl.artifex.hiciarz.model.AppTab
import pl.artifex.hiciarz.ui.HiciarzApp

@RunWith(AndroidJUnit4::class)
class AnalyticsConsentUiTest {
    @get:Rule val compose = createComposeRule()

    @Test fun enablingRequiresConfirmationAndWithdrawalIsImmediate() {
        val actions = mutableListOf<AppAction>()
        val state = mutableStateOf(AppState(tab = AppTab.SETTINGS, analyticsConfigured = true))
        compose.setContent {
            HiciarzApp(state.value) { action ->
                actions += action
                if (action is AppAction.SetAnalyticsEnabled)
                    state.value = state.value.copy(analyticsEnabled = action.enabled)
            }
        }
        compose.onNodeWithTag("analytics-consent-switch").performScrollTo().assertIsOff().performClick()
        compose.onNodeWithTag("analytics-privacy-dialog").assertExists()
        captureNative(compose, "analytics-consent-pl", scrollTop = false)
        compose.runOnIdle { assertTrue("Opening the explanation must not grant consent", actions.isEmpty()) }
        compose.onNodeWithText("Nie teraz").performClick()
        compose.onNodeWithTag("analytics-consent-switch").assertIsOff().performClick()
        compose.onNodeWithTag("analytics-privacy-confirm").performClick()
        compose.onNodeWithTag("analytics-consent-switch").assertIsOn().performClick()
        compose.onNodeWithTag("analytics-consent-switch").assertIsOff()
        compose.runOnIdle {
            assertEquals(listOf(AppAction.SetAnalyticsEnabled(true), AppAction.SetAnalyticsEnabled(false)), actions)
        }
    }

    @Test fun unavailableAnalyticsStaysOffAndReadingPrivacyDoesNotOptIn() {
        val actions = mutableListOf<AppAction>()
        compose.setContent { HiciarzApp(AppState(tab = AppTab.SETTINGS)) { actions += it } }
        compose.onNodeWithTag("analytics-consent-switch").performScrollTo().assertIsOff().assertIsNotEnabled()
        compose.onNodeWithText("Prywatność i dane").performScrollTo().performClick()
        compose.onNodeWithTag("analytics-privacy-dialog").assertExists()
        compose.onNodeWithTag("analytics-privacy-confirm").performClick()
        compose.runOnIdle { assertTrue(actions.isEmpty()) }
    }

    @Test fun aFailedPreferenceWriteOffersToRetrySavingTheOffSetting() {
        val actions = mutableListOf<AppAction>()
        compose.setContent {
            HiciarzApp(AppState(tab = AppTab.SETTINGS, analyticsConfigured = true, analyticsSaveFailed = true)) {
                actions += it
            }
        }
        compose.onNodeWithText("Zapisz wyłączenie").performScrollTo().performClick()
        compose.runOnIdle { assertEquals(listOf(AppAction.SetAnalyticsEnabled(false)), actions) }
    }
}
