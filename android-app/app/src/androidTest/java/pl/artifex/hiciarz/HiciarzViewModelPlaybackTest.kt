package pl.artifex.hiciarz

import android.app.Application
import android.os.SystemClock
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelStore
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import pl.artifex.hiciarz.model.AppAction
import pl.artifex.hiciarz.model.AppState
import pl.artifex.hiciarz.model.AppTab
import pl.artifex.hiciarz.model.ConnectionStatus
import pl.artifex.hiciarz.model.PlaybackState
import pl.artifex.hiciarz.playback.PlaybackTransport

/** Runs the real ViewModel with an in-memory Spotify transport, without an account or Activity. */
@RunWith(AndroidJUnit4::class)
class HiciarzViewModelPlaybackTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val application = instrumentation.targetContext.applicationContext as Application
    private val preferences = application.getSharedPreferences("hiciarz", 0)
    private lateinit var store: ViewModelStore
    private lateinit var model: HiciarzViewModel
    private lateinit var player: RecordingPlayback

    @Before fun launch() {
        preferences.edit().clear().putBoolean("autoPause", false).commit()
        createModel()
    }

    @After fun close() {
        main { if (::store.isInitialized) store.clear() }
    }

    @Test fun globalResumeKeepsTheBingoRecordingFromEveryTab() {
        dispatch(AppAction.ScanCode(SCANNED_URI))
        assertEquals(SCANNED_URI, snapshot().currentSong?.spotifyUri)
        scanBingoCard()
        val bingoUri = requireNotNull(snapshot().bingoSong).spotifyUri
        assertNotEquals(SCANNED_URI, bingoUri)

        for (tab in listOf(AppTab.SCAN, AppTab.BINGO, AppTab.SETTINGS)) {
            dispatch(AppAction.Pause)
            dispatch(AppAction.SelectTab(tab))
            main { player.commands.clear() }

            dispatch(AppAction.Resume)

            assertEquals("Global Play must resume Spotify from $tab", bingoUri, snapshot().playback.trackUri)
            assertTrue(snapshot().playback.isPlaying)
            assertEquals(listOf(Command("resume", bingoUri)), player.commands)
        }
    }

    @Test fun cardPlayUsesItsExplicitRecordingAndResumesItWithoutRestarting() {
        dispatch(AppAction.ScanCode(SCANNED_URI))
        val scannedSong = requireNotNull(snapshot().currentSong)
        scanBingoCard()
        dispatch(AppAction.Pause)
        dispatch(AppAction.SelectTab(AppTab.BINGO))
        main { player.commands.clear() }

        dispatch(AppAction.PlayCard(scannedSong))

        assertEquals(AppTab.BINGO, snapshot().tab)
        assertEquals(SCANNED_URI, snapshot().playback.trackUri)
        assertEquals(listOf(Command("play", SCANNED_URI)), player.commands)

        main {
            player.publishSpotifyTrack(SCANNED_URI, playing = false, positionMs = 12_345)
            player.commands.clear()
        }
        dispatch(AppAction.PlayCard(scannedSong))

        assertEquals(listOf(Command("resume", SCANNED_URI)), player.commands)
        assertEquals(12_345L, snapshot().playback.positionMs)
    }

    @Test fun reselectingTheActiveDeckPreservesTheRoundAndItsSavedHistory() {
        scanBingoCard()
        dispatch(AppAction.RevealBingoAnswer)
        scanBingoCard()
        dispatch(AppAction.RevealBingoAnswer)
        val before = snapshot()
        val deckId = requireNotNull(before.activeDeckId)
        val savedHistory = preferences.getString("bingoHistory", null)
        assertEquals(2, before.bingoHistory.size)
        main { player.commands.clear() }

        dispatch(AppAction.SelectDeck(deckId))

        val after = snapshot()
        assertEquals(before.bingoHistory, after.bingoHistory)
        assertEquals(before.bingoSong, after.bingoSong)
        assertEquals(before.bingoAnswerRevealed, after.bingoAnswerRevealed)
        assertEquals(savedHistory, preferences.getString("bingoHistory", null))
        assertTrue("Reselecting a deck must not stop playback", player.commands.isEmpty())

        main { store.clear() }
        createModel()

        assertEquals(before.bingoHistory, snapshot().bingoHistory)
        assertEquals(before.bingoSong, snapshot().bingoSong)
        assertEquals(deckId, snapshot().activeDeckId)
    }

    @Test fun globallyResumingMusicChosenInSpotifyDoesNotApplyTheGameClipTimer() {
        dispatch(AppAction.SetClipSeconds(5))
        dispatch(AppAction.SetAutoPause(true))
        dispatch(AppAction.SelectTab(AppTab.SETTINGS))
        main { player.publishSpotifyTrack(EXTERNAL_URI, playing = false, positionMs = 42_000) }

        dispatch(AppAction.Resume)

        assertEquals(listOf(Command("resume", EXTERNAL_URI)), player.commands)
        assertEquals(42_000L, snapshot().playback.positionMs)
        // Wait beyond the configured minimum clip: a global resume must not take ownership of it.
        SystemClock.sleep(5_300)
        instrumentation.waitForIdleSync()

        assertTrue(snapshot().playback.isPlaying)
        assertEquals(EXTERNAL_URI, snapshot().playback.trackUri)
        assertFalse(player.commands.any { it.operation == "pause" })
    }

    private fun scanBingoCard() {
        dispatch(AppAction.DrawBingo)
        dispatch(AppAction.BeginBingoScan)
        val card = requireNotNull(snapshot().activeDeck).songs.first { it.spotifyUri != SCANNED_URI }
        dispatch(AppAction.ScanCode(card.spotifyUri))
    }

    private fun createModel() {
        main {
            store = ViewModelStore()
            player = RecordingPlayback()
            val provider = ViewModelProvider(store, ViewModelProvider.AndroidViewModelFactory.getInstance(application))
            model = provider[HiciarzViewModel::class.java]
            model.attachPlayback(player)
        }
        runBlocking {
            withTimeout(10_000) { model.state.first { !it.busy } }
        }
        instrumentation.waitForIdleSync()
        assertTrue("The test must load the bundled decks", snapshot().decks.isNotEmpty())
    }

    private fun dispatch(action: AppAction) = main { model.dispatch(action) }

    private fun snapshot(): AppState = model.state.value

    private fun main(action: () -> Unit) {
        instrumentation.runOnMainSync { action() }
        instrumentation.waitForIdleSync()
    }

    private data class Command(val operation: String, val uri: String?)

    private class RecordingPlayback : PlaybackTransport {
        private val mutableState = MutableStateFlow(PlaybackState(connection = ConnectionStatus.CONNECTED))
        override val state: StateFlow<PlaybackState> = mutableState
        val commands = mutableListOf<Command>()

        override fun connect() {
            mutableState.value = mutableState.value.copy(connection = ConnectionStatus.CONNECTED)
        }

        override fun play(uri: String) {
            commands += Command("play", uri)
            publishSpotifyTrack(uri, playing = true)
        }

        override fun pause() {
            commands += Command("pause", mutableState.value.trackUri)
            mutableState.value = mutableState.value.copy(isPlaying = false)
        }

        override fun resume() {
            commands += Command("resume", mutableState.value.trackUri)
            mutableState.value = mutableState.value.copy(isPlaying = true)
        }

        override fun cancelPendingPlayback() = Unit
        override fun switchToPhone() = Unit

        override fun disconnect() {
            mutableState.value = PlaybackState()
        }

        fun publishSpotifyTrack(uri: String, playing: Boolean, positionMs: Long = 0) {
            mutableState.value = PlaybackState(
                connection = ConnectionStatus.CONNECTED,
                trackUri = uri,
                isPlaying = playing,
                positionMs = positionMs,
            )
        }
    }

    private companion object {
        const val SCANNED_URI = "spotify:track:0000000000000000000000"
        const val EXTERNAL_URI = "spotify:track:1111111111111111111111"
    }
}
