package pl.artifex.hiciarz

import android.app.Application
import android.net.Uri
import android.os.SystemClock
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import java.util.Locale
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import pl.artifex.hiciarz.data.DeckCodec
import pl.artifex.hiciarz.data.DeckFormatException
import pl.artifex.hiciarz.data.DeckRepository
import pl.artifex.hiciarz.model.*
import pl.artifex.hiciarz.playback.PlaybackTransport

class HiciarzViewModel(application: Application) : AndroidViewModel(application) {
    private val prefs = application.getSharedPreferences("hiciarz", 0)
    private val repository = DeckRepository(application)
    private val initialSettings = AppSettings(
        language = prefs.getString("language", if (Locale.getDefault().language == "en") "en" else "pl") ?: "pl",
        // Older builds enabled this implicitly, even when only the language was changed.
        autoPause = prefs.getBoolean("autoPauseExplicit", false) && prefs.getBoolean("autoPause", false),
        clipSeconds = prefs.getInt("clipSeconds", 20).coerceIn(5, 90),
        hideAnswers = prefs.getBoolean("hideAnswers", true),
        cardSkin = CardSkin.fromId(prefs.getString("cardSkin", "classic").orEmpty()) ?: CardSkin.CLASSIC,
        followCardSkin = prefs.getBoolean("followCardSkin", true),
    )
    private val mutableState = MutableStateFlow(AppState(settings = initialSettings, busy = true))
    val state = mutableState.asStateFlow()
    private var playback: PlaybackTransport? = null
    private var playbackJob: Job? = null
    private var clipJob: Job? = null
    private var armClipUri: String? = null
    private var ownedTrackUri: String? = null
    private var reconnectOnAttach = false
    private var initializing = true
    private var pendingAction: AppAction? = null
    private var clipDeadline: Long? = null
    private var standaloneScanSkin: CardSkin? = null

    init {
        // Retire old game sessions and routes without touching decks or scanner settings.
        // AppState always opens SCAN, including after an update from a saved BINGO route.
        prefs.edit().apply {
            remove("clientId") // The APK owns its Spotify configuration.
            remove("tab")
            listOf("bingoDeck", "bingoLevel", "bingoQuestion", "bingoHistory", "bingoScans",
                "bingoCurrentScan", "bingoStage", "bingoRound", "bingoActiveSkin", "bingoRevealed",
                "cardlessDeck", "cardlessMode", "timeline", "quiz").forEach { remove(it) }
        }.apply()
        viewModelScope.launch {
            try {
                val decks = repository.load()
                val activeId = prefs.getString("activeDeck", null)?.takeIf { id -> decks.any { it.id == id } }
                    ?: decks.firstOrNull { it.gameMode == GameMode.CLASSIC }?.id ?: decks.firstOrNull()?.id
                mutableState.update { it.copy(decks = decks, activeDeckId = activeId, busy = false) }
            } catch (_: Exception) {
                val examples = repository.current()
                mutableState.update { it.copy(decks = examples, activeDeckId = examples.firstOrNull()?.id,
                    busy = false, message = "import_failed") }
            }
            initializing = false
            pendingAction?.let { action -> pendingAction = null; dispatch(action) }
        }
    }

    fun clientId(): String = BuildConfig.SPOTIFY_CLIENT_ID

    /** The Activity releases this reference before destruction, including rotation. */
    fun attachPlayback(controller: PlaybackTransport) {
        playback = controller
        mutableState.update { it.copy(playback = controller.state.value) }
        playbackJob?.cancel()
        playbackJob = viewModelScope.launch {
            controller.state.collect { next ->
                mutableState.update { it.copy(playback = next) }
                if (next.trackUri != null && ownedTrackUri != null && next.trackUri != ownedTrackUri) {
                    // A user selected their own music in Spotify. Never stop it with our old timer.
                    clipJob?.cancel()
                    clipDeadline = null
                }
                if (armClipUri != null && next.trackUri == armClipUri && next.isPlaying) {
                    armClipUri = null
                    next.trackUri?.let(::startClip)
                }
                if (next.isPlaying && next.trackUri == ownedTrackUri &&
                    clipDeadline?.let { SystemClock.elapsedRealtime() >= it } == true) {
                    clipDeadline = null
                    controller.pause()
                }
                if (next.error != null) mutableState.update { it.copy(busy = false) }
            }
        }
        if (reconnectOnAttach) {
            reconnectOnAttach = false
            val pending = armClipUri
            if (pending != null) controller.play(pending) else controller.connect()
        }
    }

    fun detachPlayback(controller: PlaybackTransport) {
        if (playback !== controller) return
        reconnectOnAttach = controller.state.value.connection != ConnectionStatus.DISCONNECTED
        playbackJob?.cancel()
        playbackJob = null
        playback = null
    }

    fun finishSession() { pauseOwned() }

    fun dispatch(action: AppAction) {
        when (action) {
            is AppAction.SelectTab -> mutableState.update {
                val tab = if (action.tab == AppTab.DECKS) AppTab.SCAN else action.tab
                it.copy(tab = tab, scannerEnabled = tab == AppTab.SCAN && it.currentSong == null,
                    scannedSkin = if (tab == AppTab.SCAN) standaloneScanSkin else it.scannedSkin)
            }
            AppAction.ConnectSpotify -> playback?.connect()
            AppAction.DisconnectSpotify -> {
                reconnectOnAttach = false
                clipJob?.cancel(); clipDeadline = null; armClipUri = null; ownedTrackUri = null
                // The explicit action updates the panel immediately, without waiting for collection.
                mutableState.update { it.copy(playback = PlaybackState(spotifyInstalled = it.playback.spotifyInstalled)) }
                playback?.disconnect()
            }
            AppAction.Pause -> { clipJob?.cancel(); clipDeadline = null; armClipUri = null; playback?.pause() }
            AppAction.Resume -> resumeCurrentTrack()
            is AppAction.PlayCard -> {
                if (state.value.playback.trackUri != action.song.spotifyUri) play(action.song)
                else {
                    ownedTrackUri = action.song.spotifyUri
                    resumeCurrentTrack()
                }
            }
            AppAction.SwitchToPhone -> playback?.switchToPhone()
            is AppAction.ScanCode -> scan(action.value)
            is AppAction.ScanCameraCode -> {
                if (initializing) pendingAction = action
                else {
                    val current = state.value
                    val expectedScreen = current.tab == AppTab.SCAN && current.currentSong == null
                    if (expectedScreen && current.scannerEnabled) scan(action.value)
                }
            }
            AppAction.ScanNext -> {
                pauseOwned()
                standaloneScanSkin = null
                mutableState.update { it.copy(currentSong = null, scannedSkin = null,
                    answerRevealed = false, scannerEnabled = true) }
            }
            AppAction.RevealAnswer -> mutableState.update { it.copy(answerRevealed = !it.answerRevealed) }
            AppAction.DismissMessage -> mutableState.update { it.copy(message = null) }
            is AppAction.SelectDeck -> {
                if (state.value.activeDeckId != action.id && state.value.decks.any { it.id == action.id }) {
                    pauseOwned()
                    prefs.edit().putString("activeDeck", action.id).apply()
                    mutableState.update { it.copy(activeDeckId = action.id) }
                }
            }
            is AppAction.ImportDeck -> importDeck(action.uri)
            is AppAction.DeleteDeck -> viewModelScope.launch {
                if (state.value.decks.firstOrNull { it.id == action.id }?.bundled != false) return@launch
                try {
                    if (state.value.activeDeckId == action.id) pauseOwned()
                    val decks = repository.delete(action.id)
                    mutableState.update { it.copy(decks = decks,
                        activeDeckId = it.activeDeckId.takeUnless { id -> id == action.id } ?: decks.firstOrNull()?.id,
                        message = "deck_deleted") }
                    prefs.edit().putString("activeDeck", state.value.activeDeckId).apply()
                } catch (_: Exception) { mutableState.update { it.copy(message = "import_failed") } }
            }
            is AppAction.SetCardSkin -> {
                updateSettings(state.value.settings.copy(cardSkin = action.skin))
                standaloneScanSkin = null
                mutableState.update { it.copy(scannedSkin = null) }
            }
            is AppAction.SetFollowCardSkin -> updateSettings(state.value.settings.copy(followCardSkin = action.enabled))
            is AppAction.SetLanguage -> updateSettings(state.value.settings.copy(language = if (action.language == "en") "en" else "pl"))
            is AppAction.SetClipSeconds -> {
                updateSettings(state.value.settings.copy(clipSeconds = action.seconds.coerceIn(5, 90)))
                rearmPlayingClip()
            }
            is AppAction.SetAutoPause -> {
                prefs.edit().putBoolean("autoPauseExplicit", true).apply()
                updateSettings(state.value.settings.copy(autoPause = action.enabled))
                if (!action.enabled) { clipJob?.cancel(); clipDeadline = null }
                else rearmPlayingClip()
            }
            is AppAction.SetHideAnswers -> {
                updateSettings(state.value.settings.copy(hideAnswers = action.enabled))
                mutableState.update { it.copy(answerRevealed = !action.enabled) }
            }
        }
    }

    private fun scan(raw: String) {
        if (initializing) { pendingAction = AppAction.ScanCode(raw); return }
        try {
            val card = DeckCodec.readCard(raw)
            val songs = state.value.activeDeck?.songs.orEmpty() + state.value.decks.flatMap { it.songs }
            val song = songs.firstOrNull { it.spotifyId == card.spotifyId &&
                (card.gameMode == null || it.gameMode == card.gameMode) }
                ?: Song("spotify-${card.spotifyId}", "", "", null, card.spotifyId,
                    gameMode = card.gameMode ?: GameMode.CLASSIC)
            val scanned = song.copy(skin = card.skin ?: song.skin)
            standaloneScanSkin = card.skin
            mutableState.update { it.copy(tab = AppTab.SCAN, currentSong = scanned,
                scannedSkin = card.skin, scannerEnabled = false,
                answerRevealed = !it.settings.hideAnswers, message = null) }
            play(song)
        } catch (error: Exception) {
            mutableState.update { it.copy(message = (error as? DeckFormatException)?.code ?: "invalid_qr", scannerEnabled = false) }
            viewModelScope.launch {
                delay(800)
                mutableState.update {
                    if (it.tab == AppTab.SCAN && it.currentSong == null)
                        it.copy(scannerEnabled = true) else it
                }
            }
        }
    }

    private fun play(song: Song) {
        clipJob?.cancel()
        clipDeadline = null
        ownedTrackUri = song.spotifyUri
        armClipUri = song.spotifyUri
        playback?.play(song.spotifyUri)
    }

    private fun resumeCurrentTrack() {
        clipJob?.cancel()
        clipDeadline = null
        // Global controls resume Spotify as it is; only our own card gets a clip timer.
        armClipUri = state.value.playback.trackUri?.takeIf { it == ownedTrackUri }
        playback?.resume()
    }

    private fun startClip(uri: String) {
        clipJob?.cancel()
        clipDeadline = null
        if (!state.value.settings.autoPause) return
        clipDeadline = SystemClock.elapsedRealtime() + state.value.settings.clipSeconds * 1000L
        clipJob = viewModelScope.launch {
            delay(state.value.settings.clipSeconds * 1000L)
            if (ownedTrackUri == uri && state.value.playback.trackUri == uri && state.value.playback.isPlaying && playback != null) {
                clipDeadline = null
                playback?.pause()
            }
        }
    }

    private fun rearmPlayingClip() {
        val uri = ownedTrackUri ?: return
        if (state.value.playback.trackUri == uri && state.value.playback.isPlaying) startClip(uri)
    }

    private fun pauseOwned() {
        clipJob?.cancel(); clipDeadline = null; armClipUri = null
        playback?.cancelPendingPlayback()
        if (ownedTrackUri != null && state.value.playback.trackUri == ownedTrackUri) playback?.pause()
        ownedTrackUri = null
    }

    private fun importDeck(value: String) = viewModelScope.launch {
        if (initializing) { pendingAction = AppAction.ImportDeck(value); return@launch }
        mutableState.update { it.copy(busy = true) }
        try {
            val deck = repository.import(Uri.parse(value))
            pauseOwned()
            prefs.edit().putString("activeDeck", deck.id).apply()
            mutableState.update { it.copy(tab = AppTab.SCAN, decks = repository.current(), activeDeckId = deck.id,
                busy = false, message = "deck_imported") }
        } catch (error: Exception) {
            mutableState.update { it.copy(busy = false, message = (error as? DeckFormatException)?.code ?: "import_failed") }
        }
    }

    private fun updateSettings(settings: AppSettings) {
        mutableState.update { it.copy(settings = settings) }
        prefs.edit().putString("language", settings.language).putBoolean("autoPause", settings.autoPause)
            .putInt("clipSeconds", settings.clipSeconds).putBoolean("hideAnswers", settings.hideAnswers)
            .apply()
        prefs.edit().putString("cardSkin", settings.cardSkin.id).putBoolean("followCardSkin", settings.followCardSkin).apply()
    }

    override fun onCleared() { playbackJob?.cancel(); clipJob?.cancel(); playback = null }
}
