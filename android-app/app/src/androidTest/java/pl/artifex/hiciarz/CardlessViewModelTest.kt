package pl.artifex.hiciarz

import android.app.Application
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
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import pl.artifex.hiciarz.model.*
import pl.artifex.hiciarz.playback.PlaybackTransport

/** Full game transitions and saved state, with no Spotify account or camera required. */
@RunWith(AndroidJUnit4::class)
class CardlessViewModelTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val application = instrumentation.targetContext.applicationContext as Application
    private val prefs = application.getSharedPreferences("hiciarz", 0)
    private lateinit var store: ViewModelStore
    private lateinit var model: HiciarzViewModel

    @Before fun launch() { prefs.edit().clear().commit(); createModel() }
    @After fun close() { main { store.clear() } }

    @Test fun coldLaunchUsesTheScannerAndLegacyDeckRoutesDoNotOpenTheLibrary() {
        assertEquals(AppTab.SCAN, state().tab)
        assertEquals(CardlessMode.BINGO, state().cardlessMode)
        dispatch(AppAction.SelectTab(AppTab.DECKS))
        assertEquals(AppTab.SCAN, state().tab)
        assertTrue(state().scannerEnabled)

        val savedDeckIds = state().decks.map { it.id }
        prefs.edit().putString("cardlessMode", "QUIZ").commit()
        recreate()
        assertEquals(AppTab.SCAN, state().tab)
        assertEquals(CardlessMode.BINGO, state().cardlessMode)
        assertEquals(savedDeckIds, state().decks.map { it.id })
    }

    @Test fun bingoDrawsOnlyARuleThenWaitsForAnExplicitScanAndKeepsThatRule() {
        dispatch(AppAction.DrawBingo)
        assertEquals(BingoStage.RULE, state().bingoStage)
        assertNull(state().bingoSong)
        assertTrue(state().bingoHistory.isEmpty())
        assertFalse(state().playback.isPlaying)
        val rule = state().question

        dispatch(AppAction.BeginBingoScan)
        assertEquals(BingoStage.SCAN, state().bingoStage)
        assertTrue(state().scannerEnabled)
        val round = state().bingoRound
        dispatch(AppAction.CancelBingoScan)
        assertEquals(BingoStage.RULE, state().bingoStage)
        assertEquals(rule, state().question)
        assertEquals(round, state().bingoRound)
        dispatch(AppAction.ScanCameraCode("https://example.org/#2fs0000000000000000000000g", bingo = true))
        assertEquals(BingoStage.RULE, state().bingoStage)
        assertEquals(AppTab.BINGO, state().tab)
        assertNull(state().bingoSong)
        assertFalse(state().playback.isPlaying)
        dispatch(AppAction.BeginBingoScan)
        dispatch(AppAction.ScanCameraCode("https://example.org/#2fs0000000000000000000000g", bingo = true))
        assertEquals(AppTab.BINGO, state().tab)
        assertEquals(BingoStage.PLAYING, state().bingoStage)
        assertEquals(rule, state().question)
        assertNull(state().currentSong)
        assertEquals("0000000000000000000000", state().bingoSong?.spotifyId)
        assertEquals(CardSkin.FISH, state().activeSkin)
        assertEquals(1, state().bingoHistory.size)
        assertTrue(state().playback.isPlaying)
        dispatch(AppAction.RevealBingoAnswer)
        val played = state().bingoSong
        recreate()
        assertEquals(BingoStage.PLAYING, state().bingoStage)
        assertEquals(played, state().bingoSong)
        assertEquals(rule, state().question)
        assertTrue(state().bingoAnswerRevealed)
        assertEquals(AppTab.SCAN, state().tab)
        assertEquals(CardSkin.CLASSIC, state().activeSkin)
        dispatch(AppAction.SelectTab(AppTab.BINGO))
        assertEquals(CardSkin.FISH, state().activeSkin)

        // A deliberate rescan of the same physical card remains a legitimate host action.
        dispatch(AppAction.BeginBingoScan)
        dispatch(AppAction.ScanCode("https://example.org/#2fs0000000000000000000000g"))
        assertEquals(2, state().bingoHistory.size)
        dispatch(AppAction.DrawBingo)
        assertEquals(BingoStage.RULE, state().bingoStage)
        assertNull(state().bingoSong)
        assertFalse(state().playback.isPlaying)
        val nextRule = state().question
        recreate()
        assertEquals(BingoStage.RULE, state().bingoStage)
        assertEquals(nextRule, state().question)
        assertEquals(2, state().bingoHistory.size)
        dispatch(AppAction.BeginBingoScan)
        recreate()
        assertEquals("A cold launch must not restart the camera", BingoStage.RULE, state().bingoStage)
    }

    @Test fun timelinePlacesARealCardAndRestoresTheSameRoundBeforeContinuing() {
        dispatch(AppAction.StartTimeline)
        val initial = state().timeline
        assertTrue(initial.started)
        assertEquals(initial, run { dispatch(AppAction.StartTimeline); state().timeline })
        val song = requireNotNull(initial.currentSong)
        dispatch(AppAction.ChooseTimelineGap(TimelineRules.validGaps(initial.board, song).first()))
        dispatch(AppAction.RevealTimeline)
        val checked = state().timeline
        assertTrue(checked.correct!!)
        assertEquals(2, checked.board.size)
        recreate()
        assertEquals(checked, state().timeline)
        dispatch(AppAction.NextTimeline)
        assertEquals(checked.round + 1, state().timeline.round)
        assertFalse(state().timeline.revealed)
        assertNotEquals(song.spotifyId, state().timeline.currentSong?.spotifyId)
    }

    @Test fun bingoQuestionCanBeRedrawnBeforeScanningAndWhileTheSameCardIsPlaying() {
        val idle = state()
        dispatch(AppAction.RedrawBingoQuestion)
        assertEquals(idle, state())

        dispatch(AppAction.DrawBingo)
        val firstQuestion = state().question
        val round = state().bingoRound
        dispatch(AppAction.RedrawBingoQuestion)
        assertNotEquals(firstQuestion, state().question)
        assertEquals(BingoStage.RULE, state().bingoStage)
        assertEquals(round, state().bingoRound)
        assertTrue(state().bingoHistory.isEmpty())

        dispatch(AppAction.BeginBingoScan)
        val scanQuestion = state().question
        dispatch(AppAction.RedrawBingoQuestion)
        assertNotEquals(scanQuestion, state().question)
        assertEquals(BingoStage.SCAN, state().bingoStage)
        assertTrue(state().scannerEnabled)
        assertEquals(round, state().bingoRound)
        dispatch(AppAction.ScanCameraCode("https://example.org/#2fs0000000000000000000000g",
            bingo = true, bingoRound = round))
        dispatch(AppAction.RevealBingoAnswer)
        val playing = state()
        assertTrue(playing.bingoAnswerRevealed)

        dispatch(AppAction.RedrawBingoQuestion)
        val redrawn = state()
        assertNotEquals(playing.question, redrawn.question)
        assertTrue(redrawn.question in BingoRules.categories(redrawn.bingoLevel))
        assertFalse(redrawn.bingoAnswerRevealed)
        assertEquals(BingoStage.PLAYING, redrawn.bingoStage)
        assertEquals(playing.bingoSong, redrawn.bingoSong)
        assertEquals(playing.bingoHistory, redrawn.bingoHistory)
        assertEquals(playing.bingoRound, redrawn.bingoRound)
        assertEquals(playing.playback, redrawn.playback)
        assertEquals(playing.activeSkin, redrawn.activeSkin)

        recreate()
        dispatch(AppAction.SelectTab(AppTab.BINGO))
        assertEquals(redrawn.question, state().question)
        assertEquals(redrawn.bingoSong, state().bingoSong)
        assertEquals(redrawn.bingoHistory, state().bingoHistory)
        assertFalse(state().bingoAnswerRevealed)

        dispatch(AppAction.SetHideAnswers(false))
        dispatch(AppAction.RedrawBingoQuestion)
        assertTrue("Redraw respects the choice to keep answers visible", state().bingoAnswerRevealed)
    }

    @Test fun combinedBingoDrawStartsScanningAndIgnoresCameraFramesFromThePreviousRound() {
        dispatch(AppAction.SelectTab(AppTab.SETTINGS))
        dispatch(AppAction.SetCardlessMode(CardlessMode.QUIZ))
        dispatch(AppAction.DrawBingoAndScan)
        val firstRound = state().bingoRound
        assertEquals(1, firstRound)
        assertEquals(AppTab.BINGO, state().tab)
        assertEquals(CardlessMode.BINGO, state().cardlessMode)
        assertEquals(BingoStage.SCAN, state().bingoStage)
        assertTrue(state().scannerEnabled)
        assertTrue(state().question in BingoRules.categories(state().bingoLevel))
        assertNull(state().bingoSong)
        assertFalse(state().playback.isPlaying)

        dispatch(AppAction.ScanCameraCode("https://example.org/#2xs0000000000000000000000",
            bingo = true, bingoRound = firstRound))
        assertEquals(BingoStage.PLAYING, state().bingoStage)
        assertTrue(state().playback.isPlaying)
        assertEquals(CardSkin.CHRISTMAS, state().activeSkin)
        dispatch(AppAction.RevealBingoAnswer)
        assertTrue(state().bingoAnswerRevealed)

        dispatch(AppAction.DrawBingoAndScan)
        val nextRound = state().bingoRound
        val nextRule = state().question
        assertEquals(firstRound + 1, nextRound)
        assertEquals(BingoStage.SCAN, state().bingoStage)
        assertTrue(state().scannerEnabled)
        assertNull(state().bingoSong)
        assertFalse(state().bingoAnswerRevealed)
        assertNull(state().scannedSkin)
        assertFalse("Drawing the next round must pause the previous card", state().playback.isPlaying)
        assertEquals(1, state().bingoHistory.size)

        dispatch(AppAction.ScanCameraCode("spotify:track:0000000000000000000001",
            bingo = true, bingoRound = firstRound))
        assertEquals(BingoStage.SCAN, state().bingoStage)
        assertNull("The previous camera round must not fill the new round", state().bingoSong)
        assertEquals(nextRule, state().question)
        assertEquals(1, state().bingoHistory.size)
        assertFalse(state().playback.isPlaying)
        dispatch(AppAction.ScanCameraCode("spotify:track:0000000000000000000002",
            bingo = true, bingoRound = nextRound))
        assertEquals(BingoStage.PLAYING, state().bingoStage)
        assertEquals("0000000000000000000002", state().bingoSong?.spotifyId)
        assertEquals(nextRule, state().question)
        assertEquals(2, state().bingoHistory.size)
        assertTrue(state().playback.isPlaying)

        dispatch(AppAction.DrawBingo)
        assertEquals(nextRound + 1, state().bingoRound)
        assertEquals("The phone flow must still stop at the question", BingoStage.RULE, state().bingoStage)
        assertNull(state().bingoSong)
        assertFalse(state().scannerEnabled)
        assertFalse(state().playback.isPlaying)
    }

    @Test fun gameSoundtrackDeckDefaultsToSourceQuizAndJudgementsPersist() {
        val gameDeck = state().decks.first { it.gameMode == GameMode.GAME }
        dispatch(AppAction.SetCardlessMode(CardlessMode.TIMELINE))
        dispatch(AppAction.SelectDeck(gameDeck.id))
        assertEquals(CardlessMode.QUIZ, state().cardlessMode)
        dispatch(AppAction.StartQuiz)
        val first = state().quiz
        dispatch(AppAction.NextQuiz)
        assertEquals(first, state().quiz)
        dispatch(AppAction.RevealQuiz)
        dispatch(AppAction.SubmitQuizAnswer(true))
        val answered = state().quiz
        assertTrue(answered.answered)
        assertEquals(1, answered.correctCount)
        dispatch(AppAction.SubmitQuizAnswer(true))
        assertEquals(1, state().quiz.correctCount)
        recreate()
        assertEquals(answered, state().quiz)
        dispatch(AppAction.NextQuiz)
        assertNotEquals(first.currentSong?.spotifyId, state().quiz.currentSong?.spotifyId)
        assertEquals(2, state().quiz.round)
    }

    @Test fun anUnknownPrintedRecordingUsesItsQrSkinWithoutPlaylistMetadata() {
        val unknown = "0123456789abcdefghijkl"
        assertTrue(state().decks.flatMap { it.songs }.none { it.spotifyId == unknown })
        dispatch(AppAction.SetCardSkin(CardSkin.VINYL))

        dispatch(AppAction.ScanCode("https://example.org/#2fs$unknown"))

        assertEquals(CardSkin.FISH, state().activeSkin)
        assertEquals(CardSkin.FISH, state().currentSong?.skin)
        assertEquals(unknown, state().currentSong?.spotifyId)
        assertEquals("", state().currentSong?.title)
        assertNull(state().currentSong?.year)
        assertEquals("spotify:track:$unknown", state().playback.trackUri)
        assertTrue(state().playback.isPlaying)
    }

    @Test fun cardSkinFollowsTheQrOnlyWhenEnabledAndDoesNotLeakIntoANewGame() {
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
        assertEquals(CardSkin.MIXTAPE, state().activeSkin)
        dispatch(AppAction.StartTimeline)
        assertNull(state().scannedSkin)
        recreate()
        assertEquals(CardSkin.MIXTAPE, state().settings.cardSkin)
        assertTrue(state().settings.followCardSkin)
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

    @Test fun eachScanningFlowKeepsItsOwnQrSkinAcrossTabsModesAndBingoRestore() {
        dispatch(AppAction.ScanCode("https://example.org/#2xs0000000000000000000000"))
        val standaloneSong = state().currentSong
        assertEquals(CardSkin.CHRISTMAS, state().activeSkin)
        dispatch(AppAction.SelectTab(AppTab.BINGO))
        dispatch(AppAction.DrawBingo)
        dispatch(AppAction.BeginBingoScan)
        dispatch(AppAction.ScanCode("https://example.org/#2fs0000000000000000000001"))
        val bingoSong = state().bingoSong
        assertEquals(CardSkin.FISH, state().activeSkin)

        dispatch(AppAction.SelectTab(AppTab.SCAN))
        assertEquals(standaloneSong, state().currentSong)
        assertEquals(CardSkin.CHRISTMAS, state().activeSkin)
        dispatch(AppAction.SelectTab(AppTab.BINGO))
        assertEquals(bingoSong, state().bingoSong)
        assertEquals(CardSkin.FISH, state().activeSkin)
        dispatch(AppAction.SetFollowCardSkin(false))
        assertEquals(CardSkin.CLASSIC, state().activeSkin)
        dispatch(AppAction.SelectTab(AppTab.SCAN))
        assertEquals(CardSkin.CLASSIC, state().activeSkin)
        dispatch(AppAction.SetFollowCardSkin(true))
        assertEquals(CardSkin.CHRISTMAS, state().activeSkin)

        dispatch(AppAction.SelectTab(AppTab.BINGO))
        dispatch(AppAction.SetCardlessMode(CardlessMode.TIMELINE))
        assertNull(state().scannedSkin)
        assertEquals(CardSkin.CLASSIC, state().activeSkin)
        recreate()
        assertEquals(AppTab.SCAN, state().tab)
        assertEquals(CardlessMode.BINGO, state().cardlessMode)
        assertEquals(CardSkin.CLASSIC, state().activeSkin)
        dispatch(AppAction.SelectTab(AppTab.BINGO))
        assertEquals(bingoSong, state().bingoSong)
        assertEquals(CardSkin.FISH, state().activeSkin)
        recreate()
        assertEquals(CardSkin.CLASSIC, state().activeSkin)
        dispatch(AppAction.SelectTab(AppTab.BINGO))
        assertEquals(CardSkin.FISH, state().activeSkin)
        dispatch(AppAction.SelectDeck(state().decks.first { it.id != state().activeDeckId }.id))
        assertEquals("Changing a deck keeps the independent printed-card round", bingoSong, state().bingoSong)
        assertEquals(CardSkin.FISH, state().activeSkin)
    }

    @Test fun choosingADefaultSkinClearsBothPreviousQrOverridesUntilAnotherScan() {
        dispatch(AppAction.ScanCode("https://example.org/#2xs0000000000000000000000"))
        dispatch(AppAction.SelectTab(AppTab.BINGO))
        dispatch(AppAction.DrawBingo)
        dispatch(AppAction.BeginBingoScan)
        dispatch(AppAction.ScanCode("https://example.org/#2fs0000000000000000000001"))
        dispatch(AppAction.SelectTab(AppTab.SETTINGS))
        dispatch(AppAction.SetCardSkin(CardSkin.MIXTAPE))
        dispatch(AppAction.SelectTab(AppTab.SCAN))
        assertEquals(CardSkin.MIXTAPE, state().activeSkin)
        dispatch(AppAction.SelectTab(AppTab.BINGO))
        assertEquals(CardSkin.MIXTAPE, state().activeSkin)
        recreate()
        assertEquals(CardSkin.MIXTAPE, state().activeSkin)
        dispatch(AppAction.BeginBingoScan)
        dispatch(AppAction.ScanCode("https://example.org/#2ds0000000000000000000002"))
        assertEquals(CardSkin.DISCO, state().activeSkin)
        dispatch(AppAction.ResetBingo)
        dispatch(AppAction.SelectTab(AppTab.SCAN))
        dispatch(AppAction.SelectTab(AppTab.BINGO))
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

    @Test fun standaloneScannerRearmsAfterBingoButKeepsAnExistingStandaloneCard() {
        dispatch(AppAction.DrawBingo)
        dispatch(AppAction.BeginBingoScan)
        dispatch(AppAction.ScanCameraCode("spotify:track:0000000000000000000000", bingo = true))
        val bingoSong = state().bingoSong
        assertEquals(BingoStage.PLAYING, state().bingoStage)
        assertFalse(state().scannerEnabled)
        assertNull(state().currentSong)

        dispatch(AppAction.SelectTab(AppTab.SCAN))
        assertTrue("The empty standalone scanner must mount its camera", state().scannerEnabled)
        dispatch(AppAction.ScanCameraCode("spotify:track:0000000000000000000002", bingo = true))
        assertNull("A late Bingo frame must not enter the standalone flow", state().currentSong)
        assertEquals(bingoSong, state().bingoSong)
        assertEquals(1, state().bingoHistory.size)

        dispatch(AppAction.ScanCameraCode("spotify:track:0000000000000000000001"))
        val standaloneSong = state().currentSong
        assertEquals("0000000000000000000001", standaloneSong?.spotifyId)
        assertFalse(state().scannerEnabled)
        assertEquals(bingoSong, state().bingoSong)
        dispatch(AppAction.SelectTab(AppTab.SETTINGS))
        dispatch(AppAction.SelectTab(AppTab.SCAN))
        assertFalse("Returning to a scanned card must not restart its camera", state().scannerEnabled)
        dispatch(AppAction.ScanCameraCode("spotify:track:0000000000000000000002"))
        assertEquals(standaloneSong, state().currentSong)
    }

    @Test fun pendingBingoScannerRearmsAfterStandaloneScanWithoutChangingItsRule() {
        dispatch(AppAction.DrawBingo)
        dispatch(AppAction.BeginBingoScan)
        val rule = state().question
        val round = state().bingoRound
        dispatch(AppAction.SelectTab(AppTab.SCAN))
        dispatch(AppAction.ScanCameraCode("spotify:track:0000000000000000000000"))
        val standaloneSong = state().currentSong
        assertFalse(state().scannerEnabled)
        assertEquals(BingoStage.SCAN, state().bingoStage)
        assertNull(state().bingoSong)

        dispatch(AppAction.SelectTab(AppTab.BINGO))
        assertTrue("The pending Bingo scanner must mount its camera", state().scannerEnabled)
        assertEquals(rule, state().question)
        assertEquals(round, state().bingoRound)
        dispatch(AppAction.ScanCameraCode("spotify:track:0000000000000000000002"))
        assertNull("A late standalone frame must not fill the Bingo round", state().bingoSong)
        dispatch(AppAction.ScanCameraCode("spotify:track:0000000000000000000001", bingo = true))
        assertEquals(BingoStage.PLAYING, state().bingoStage)
        assertEquals("0000000000000000000001", state().bingoSong?.spotifyId)
        assertEquals(rule, state().question)
        assertEquals(round, state().bingoRound)
        assertEquals(standaloneSong, state().currentSong)
        dispatch(AppAction.SelectTab(AppTab.SCAN))
        assertFalse(state().scannerEnabled)
        assertEquals(standaloneSong, state().currentSong)
    }

    @Test fun pendingBingoScannerRearmsAfterSettingsWithoutChangingItsRound() {
        dispatch(AppAction.DrawBingo)
        dispatch(AppAction.BeginBingoScan)
        val rule = state().question
        val round = state().bingoRound
        dispatch(AppAction.SelectTab(AppTab.SETTINGS))
        assertFalse(state().scannerEnabled)
        dispatch(AppAction.SelectTab(AppTab.BINGO))
        assertEquals(BingoStage.SCAN, state().bingoStage)
        assertEquals(rule, state().question)
        assertEquals(round, state().bingoRound)
        assertTrue("Returning to the pending Bingo scan must rearm its camera", state().scannerEnabled)
        dispatch(AppAction.ScanCameraCode("spotify:track:0000000000000000000000",
            bingo = true, bingoRound = round))
        assertEquals(BingoStage.PLAYING, state().bingoStage)
        assertEquals("0000000000000000000000", state().bingoSong?.spotifyId)
        assertEquals(rule, state().question)
        assertEquals(round, state().bingoRound)
        assertTrue(state().playback.isPlaying)
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
        runBlocking { withTimeout(10_000) { model.state.first { !it.busy } } }
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
