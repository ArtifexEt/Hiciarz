package pl.artifex.hiciarz

import android.app.Application
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelStore
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import pl.artifex.hiciarz.model.*
import pl.artifex.hiciarz.playback.PlaybackTransport

/** Scanner state, settings and migration from older releases, without Spotify or camera access. */
@RunWith(AndroidJUnit4::class)
class ScannerViewModelTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val application = instrumentation.targetContext.applicationContext as Application
    private val prefs = application.getSharedPreferences("hiciarz", 0)
    private lateinit var store: ViewModelStore
    private lateinit var model: HiciarzViewModel

    @Before fun launch() { prefs.edit().clear().commit(); createModel() }
    @After fun close() { main { store.clear() } }

    @Test fun coldLaunchUsesTheScannerWithoutLoadingALibrary() {
        assertEquals(AppTab.SCAN, state().tab)
        assertTrue(state().scannerEnabled)
    }

    @Test fun upgradeDiscardsDeckAndGamePreferencesWhileKeepingScannerSettings() {
        prefs.edit().putString("tab", "BINGO")
            .putString("cardlessMode", "BINGO")
            .putString("bingoStage", "PLAYING")
            .putInt("bingoRound", 7)
            .putString("bingoHistory", "not valid JSON")
            .putString("bingoCurrentScan", "not valid JSON")
            .putString("timeline", "not valid JSON")
            .putString("quiz", "not valid JSON")
            .putString("activeDeck", "old-deck")
            .putBoolean("hideAnswers", false)
            .putString("language", "en")
            .putString("cardSkin", "mixtape")
            .putBoolean("autoPause", true)
            .putBoolean("autoPauseExplicit", true)
            .commit()

        recreate()

        assertEquals(AppTab.SCAN, state().tab)
        assertTrue(state().scannerEnabled)
        assertNull(state().currentSong)
        assertEquals("en", state().settings.language)
        assertEquals(CardSkin.MIXTAPE, state().settings.cardSkin)
        assertTrue(state().settings.autoPause)
        for (key in listOf("tab", "cardlessMode", "bingoStage", "bingoRound", "bingoHistory", "bingoCurrentScan", "timeline", "quiz", "activeDeck", "hideAnswers")) {
            assertFalse("Removed game state must not survive the upgrade: $key", prefs.contains(key))
        }
    }

    @Test fun anObsoleteCorruptLibraryCannotBlockScanning() {
        val obsolete = java.io.File(application.filesDir, "decks.json")
        val previous = obsolete.takeIf { it.exists() }?.readBytes()
        try {
            obsolete.writeText("not valid JSON")
            recreate()
            assertNull(state().message)
            dispatch(AppAction.ScanCode("spotify:track:0000000000000000000000"))
            assertEquals("spotify:track:0000000000000000000000", state().playback.trackUri)
            assertTrue(state().playback.isPlaying)
            assertEquals("Obsolete data is not loaded or rewritten", "not valid JSON", obsolete.readText())
        } finally {
            if (previous == null) obsolete.delete() else obsolete.writeBytes(previous)
        }
    }

    @Test fun anUnknownPrintedRecordingUsesItsQrSkinWithoutPlaylistMetadata() {
        val unknown = "0123456789abcdefghijkl"
        dispatch(AppAction.SetCardSkin(CardSkin.VINYL))
        dispatch(AppAction.ScanCode("https://example.org/#2fs$unknown"))
        assertEquals(CardSkin.FISH, state().activeSkin)
        assertEquals(CardSkin.FISH, state().currentSong?.skin)
        assertEquals(unknown, state().currentSong?.spotifyId)
        assertEquals("spotify:track:$unknown", state().playback.trackUri)
        assertTrue(state().playback.isPlaying)
    }

    @Test fun qrSkinAndDefaultSkinRemainIndependentAcrossNewScansAndRecreation() {
        dispatch(AppAction.ScanCode("https://example.org/#2fs0000000000000000000000"))
        assertEquals(CardSkin.FISH, state().activeSkin)
        assertEquals(CardSkin.FISH, state().currentSong?.skin)
        dispatch(AppAction.SetFollowCardSkin(false))
        dispatch(AppAction.SetCardSkin(CardSkin.MIXTAPE))
        dispatch(AppAction.ScanCode("https://example.org/#2xs0000000000000000000000"))
        assertEquals(CardSkin.MIXTAPE, state().activeSkin)
        dispatch(AppAction.SetFollowCardSkin(true))
        assertEquals(CardSkin.CHRISTMAS, state().activeSkin)
        dispatch(AppAction.ScanNext)
        assertNull(state().scannedSkin)
        assertEquals(CardSkin.MIXTAPE, state().activeSkin)
        recreate()
        assertEquals(CardSkin.MIXTAPE, state().settings.cardSkin)
        assertTrue(state().settings.followCardSkin)
        assertNull(state().currentSong)
        assertEquals(CardSkin.MIXTAPE, state().activeSkin)
    }

    @Test fun automaticPauseDefaultsOffAndOnlyAnExplicitNewChoiceSurvives() {
        assertFalse(state().settings.autoPause)
        prefs.edit().putBoolean("autoPause", true).remove("autoPauseExplicit").commit()
        recreate()
        assertFalse(state().settings.autoPause)
        dispatch(AppAction.SetAutoPause(true))
        recreate()
        assertTrue(state().settings.autoPause)
    }

    @Test fun choosingADefaultSkinClearsThePreviousQrOverrideUntilAnotherScan() {
        dispatch(AppAction.ScanCode("https://example.org/#2xs0000000000000000000000"))
        dispatch(AppAction.SelectTab(AppTab.SETTINGS))
        dispatch(AppAction.SetCardSkin(CardSkin.MIXTAPE))
        dispatch(AppAction.SelectTab(AppTab.SCAN))
        assertEquals(CardSkin.MIXTAPE, state().activeSkin)
        dispatch(AppAction.ScanNext)
        dispatch(AppAction.ScanCode("https://example.org/#2ds0000000000000000000002"))
        assertEquals(CardSkin.DISCO, state().activeSkin)
        dispatch(AppAction.ScanNext)
        assertEquals(CardSkin.MIXTAPE, state().activeSkin)
        recreate()
        assertEquals(CardSkin.MIXTAPE, state().activeSkin)
    }

    @Test fun spotifyConfigurationComesFromTheApkInsteadOfAnInvisibleLegacyOverride() {
        prefs.edit().putString("clientId", "f".repeat(32)).commit()
        recreate()
        assertEquals(BuildConfig.SPOTIFY_CLIENT_ID, model.clientId())
        assertFalse(prefs.contains("clientId"))
    }

    @Test fun aLateScannerCameraResultCannotPlayAfterLeavingTheScanner() {
        dispatch(AppAction.SelectTab(AppTab.SCAN))
        dispatch(AppAction.SelectTab(AppTab.SETTINGS))
        dispatch(AppAction.ScanCameraCode("spotify:track:0000000000000000000000"))
        assertEquals(AppTab.SETTINGS, state().tab)
        assertNull(state().currentSong)
        assertFalse(state().playback.isPlaying)
    }

    @Test fun scannerRearmsFromSettingsOnlyWhenThereIsNoScannedCard() {
        dispatch(AppAction.SelectTab(AppTab.SETTINGS))
        assertFalse(state().scannerEnabled)
        dispatch(AppAction.SelectTab(AppTab.SCAN))
        assertTrue(state().scannerEnabled)
        dispatch(AppAction.ScanCameraCode("spotify:track:0000000000000000000000"))
        val scanned = state().currentSong
        assertNotNull(scanned)
        assertFalse(state().scannerEnabled)
        dispatch(AppAction.SelectTab(AppTab.SETTINGS))
        dispatch(AppAction.SelectTab(AppTab.SCAN))
        assertEquals(scanned, state().currentSong)
        assertFalse(state().scannerEnabled)
        dispatch(AppAction.ScanCameraCode("spotify:track:0000000000000000000001"))
        assertEquals("A stale camera callback cannot replace a scanned card", scanned, state().currentSong)
        dispatch(AppAction.ScanNext)
        assertNull(state().currentSong)
        assertTrue(state().scannerEnabled)
        dispatch(AppAction.ScanCameraCode("spotify:track:0000000000000000000001"))
        assertEquals("0000000000000000000001", state().currentSong?.spotifyId)
    }

    private fun state() = model.state.value
    private fun dispatch(action: AppAction) = main { model.dispatch(action) }
    private fun recreate() { main { store.clear() }; createModel() }

    private fun createModel() {
        main {
            store = ViewModelStore()
            model = ViewModelProvider(store, ViewModelProvider.AndroidViewModelFactory.getInstance(application))[HiciarzViewModel::class.java]
            model.attachPlayback(LocalPlayback())
        }
        instrumentation.waitForIdleSync()
    }

    private fun main(action: () -> Unit) {
        instrumentation.runOnMainSync { action() }
        instrumentation.waitForIdleSync()
    }

    private class LocalPlayback : PlaybackTransport {
        private val mutableState = MutableStateFlow(PlaybackState(connection = ConnectionStatus.CONNECTED))
        override val state: StateFlow<PlaybackState> = mutableState
        override fun connect() = Unit
        override fun play(uri: String) { mutableState.value = mutableState.value.copy(trackUri = uri, isPlaying = true) }
        override fun pause() { mutableState.value = mutableState.value.copy(isPlaying = false) }
        override fun resume() { mutableState.value = mutableState.value.copy(isPlaying = true) }
        override fun cancelPendingPlayback() = Unit
        override fun switchToPhone() = Unit
        override fun disconnect() { mutableState.value = PlaybackState() }
    }
}
