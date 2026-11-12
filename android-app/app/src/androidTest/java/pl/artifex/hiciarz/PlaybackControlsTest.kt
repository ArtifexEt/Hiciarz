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
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import pl.artifex.hiciarz.model.AppAction
import pl.artifex.hiciarz.model.AppSettings
import pl.artifex.hiciarz.model.AppState
import pl.artifex.hiciarz.model.AppTab
import pl.artifex.hiciarz.model.CardlessMode
import pl.artifex.hiciarz.model.BingoStage
import pl.artifex.hiciarz.model.BingoLevel
import pl.artifex.hiciarz.model.QuestionType
import pl.artifex.hiciarz.model.ConnectionStatus
import pl.artifex.hiciarz.model.Deck
import pl.artifex.hiciarz.model.PlaybackState
import pl.artifex.hiciarz.model.Song
import pl.artifex.hiciarz.ui.HiciarzApp

/** Real UI callbacks distinguish the global transport from the two cards. */
@RunWith(AndroidJUnit4::class)
class PlaybackControlsTest {
    @get:Rule val compose = createComposeRule()
    private val actions = mutableListOf<AppAction>()
    private val scanned = Song("scan-a", "Scanned song", "Artist A", 1984, "2FRnf9qhLbvw8fu4IBXx78")
    private val bingo = Song("bingo-b", "Bingo song", "Artist B", 1976, "0GjEhVFGZW8afUYGChu3Rr")

    @Test fun globalPlayInSettingsResumesSpotifyDespiteAnOlderScannedCard() {
        assertGlobalResume(AppTab.SETTINGS)
    }

    @Test fun globalPlayInBingoResumesSpotifyDespiteAnOlderScannedCard() {
        assertGlobalResume(AppTab.BINGO)
    }

    @Test fun scannedCardPlayExplicitlyRequestsThatCardWhenSpotifyHasAnotherTrack() {
        render(AppTab.SCAN, spotifyTrack = bingo)

        compose.onNodeWithContentDescription("Play").performScrollTo().performClick()

        compose.runOnIdle { assertEquals(listOf(AppAction.PlayCard(scanned)), actions) }
    }

    @Test fun bingoCardPlayExplicitlyRequestsTheDrawnCardWhenSpotifyHasAnotherTrack() {
        render(AppTab.BINGO, spotifyTrack = scanned)

        compose.onNodeWithContentDescription("Play").performScrollTo().performClick()

        compose.runOnIdle { assertEquals(listOf(AppAction.PlayCard(bingo)), actions) }
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
        // A was scanned earlier, B was drawn in Bingo and B is now paused in Spotify.
        render(tab, spotifyTrack = bingo)

        compose.onNodeWithContentDescription("Spotify playback").performClick()
        compose.onNode(hasContentDescription("Play") and hasAnyAncestor(isDialog())).performClick()

        compose.runOnIdle { assertEquals(listOf(AppAction.Resume), actions) }
    }

    private fun render(tab: AppTab, spotifyTrack: Song) {
        val deck = Deck("test-deck", "Test deck", listOf(scanned, bingo))
        val state = AppState(
            tab = tab,
            cardlessMode = CardlessMode.BINGO,
            bingoStage = BingoStage.PLAYING,
            bingoRound = 1,
            bingoLevel = BingoLevel.EXPERT,
            question = QuestionType.TITLE,
            playback = PlaybackState(
                connection = ConnectionStatus.CONNECTED,
                isPlaying = false,
                trackUri = spotifyTrack.spotifyUri,
            ),
            settings = AppSettings(language = "en"),
            decks = listOf(deck),
            activeDeckId = deck.id,
            currentSong = scanned,
            scannerEnabled = false,
            bingoSong = bingo,
            bingoHistory = listOf(bingo),
        )
        compose.setContent { HiciarzApp(state) { actions.add(it) } }
    }
}
