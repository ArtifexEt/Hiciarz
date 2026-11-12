package pl.artifex.hiciarz

import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.hasAnyAncestor
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isDialog
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import pl.artifex.hiciarz.model.AppAction
import pl.artifex.hiciarz.model.AppSettings
import pl.artifex.hiciarz.model.AppState
import pl.artifex.hiciarz.model.AppTab
import pl.artifex.hiciarz.model.ConnectionStatus
import pl.artifex.hiciarz.model.PlaybackState
import pl.artifex.hiciarz.model.Song
import pl.artifex.hiciarz.ui.HiciarzApp

/** Real UI callbacks distinguish global transport from the scanned card. */
@RunWith(AndroidJUnit4::class)
class PlaybackControlsTest {
    @get:Rule val compose = createComposeRule()
    private val actions = mutableListOf<AppAction>()
    private val scanned = Song("2FRnf9qhLbvw8fu4IBXx78")
    private val external = Song("0GjEhVFGZW8afUYGChu3Rr")

    @Test fun globalPlayInSettingsResumesSpotifyDespiteAnOlderScannedCard() {
        assertGlobalResume(AppTab.SETTINGS)
    }

    @Test fun scannedCardPlayExplicitlyRequestsThatCardWhenSpotifyHasAnotherTrack() {
        render(AppTab.SCAN, spotifyTrack = external)

        compose.onNodeWithContentDescription("Play").performScrollTo().performClick()

        compose.runOnIdle { assertEquals(listOf(AppAction.PlayCard(scanned)), actions) }
    }

    @Test fun unknownCardHasPlaybackOnArtworkAndScanDirectlyBelowIt() {
        val unknown = Song("0000000000000000000000")
        val state = mutableStateOf(AppState(
            currentSong = unknown,
            scannerEnabled = false,
            settings = AppSettings(language = "pl"),
            playback = PlaybackState(connection = ConnectionStatus.CONNECTED,
                isPlaying = true, trackUri = unknown.spotifyUri),
        ))
        compose.setContent { HiciarzApp(state.value) { actions.add(it) } }
        val card = compose.onNodeWithTag("playback-card").assertIsDisplayed().getUnclippedBoundsInRoot()
        val pause = compose.onNodeWithContentDescription("Wstrzymaj").assertIsDisplayed().getUnclippedBoundsInRoot()
        val scan = compose.onNodeWithText("Skanuj nową").assertIsDisplayed().getUnclippedBoundsInRoot()
        assertTrue("Pause belongs on the artwork", pause.left >= card.left && pause.right <= card.right &&
            pause.top >= card.top && pause.bottom <= card.bottom)
        assertTrue("Scan is below the card", scan.top >= card.bottom)
        compose.onNodeWithText("Odkryj odpowiedź").assertDoesNotExist()
        compose.onNodeWithContentDescription("Wstrzymaj").performClick()
        compose.runOnIdle { state.value = state.value.copy(playback = state.value.playback.copy(isPlaying = false)) }
        compose.onNodeWithContentDescription("Odtwórz").performClick()
        compose.onNodeWithText("Skanuj nową").performClick()
        compose.runOnIdle { assertEquals(listOf(AppAction.Pause, AppAction.PlayCard(unknown), AppAction.ScanNext), actions) }
    }

    @Test fun scannedRecordingOffersPlaybackWithoutDeckMetadataControls() {
        compose.setContent {
            HiciarzApp(AppState(currentSong = scanned,
                settings = AppSettings(language = "en"),
                playback = PlaybackState(connection = ConnectionStatus.CONNECTED,
                    isPlaying = true, trackUri = scanned.spotifyUri))) { actions.add(it) }
        }
        compose.onNodeWithContentDescription("Pause").assertIsDisplayed().performClick()
        compose.onNodeWithText("Reveal answer").assertDoesNotExist()
        compose.onNodeWithText("Hide scanned card answers").assertDoesNotExist()
        compose.runOnIdle { assertEquals(listOf(AppAction.Pause), actions) }
    }

    @Test fun disconnectAndCancelRestoreTheConnectActionWithoutALoadingLabel() {
        val state = mutableStateOf(AppState(
            tab = AppTab.SETTINGS,
            settings = AppSettings(language = "en"),
            playback = PlaybackState(connection = ConnectionStatus.CONNECTED, spotifyInstalled = true),
        ))
        compose.setContent {
            HiciarzApp(state.value) { action ->
                actions.add(action)
                if (action == AppAction.DisconnectSpotify) {
                    state.value = state.value.copy(playback = PlaybackState(spotifyInstalled = true))
                }
            }
        }
        compose.onNodeWithContentDescription("Spotify playback").performClick()
        compose.onNodeWithText("Disconnect Spotify").performScrollTo().performClick()
        assertConnectActionWithoutLoading()

        compose.runOnIdle {
            state.value = state.value.copy(playback = state.value.playback.copy(connection = ConnectionStatus.CONNECTING))
        }
        compose.onNodeWithText("Cancel connection").performScrollTo().assertIsEnabled().performClick()
        assertConnectActionWithoutLoading()
        compose.runOnIdle {
            assertEquals(listOf(AppAction.DisconnectSpotify, AppAction.DisconnectSpotify), actions)
        }
    }

    private fun assertConnectActionWithoutLoading() {
        compose.onNodeWithText("Spotify not connected").assertExists()
        compose.onNode(hasText("Connect Spotify") and hasAnyAncestor(isDialog()))
            .performScrollTo().assertIsDisplayed().assertIsEnabled()
        compose.onNodeWithText("Connecting…").assertDoesNotExist()
        compose.onNodeWithText("Connecting to Spotify…").assertDoesNotExist()
        compose.onNodeWithText("Cancel connection").assertDoesNotExist()
    }

    private fun assertGlobalResume(tab: AppTab) {
        // Spotify may be paused on a different track from the previously scanned card.
        render(tab, spotifyTrack = external)

        compose.onNodeWithContentDescription("Spotify playback").performClick()
        compose.onNode(hasContentDescription("Play") and hasAnyAncestor(isDialog())).performClick()

        compose.runOnIdle { assertEquals(listOf(AppAction.Resume), actions) }
    }

    private fun render(tab: AppTab, spotifyTrack: Song) {
        val state = AppState(
            tab = tab,
            playback = PlaybackState(
                connection = ConnectionStatus.CONNECTED,
                isPlaying = false,
                trackUri = spotifyTrack.spotifyUri,
            ),
            settings = AppSettings(language = "en"),
            currentSong = scanned,
            scannerEnabled = false,
        )
        compose.setContent { HiciarzApp(state) { actions.add(it) } }
    }
}
