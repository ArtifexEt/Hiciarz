package pl.artifex.hiciarz

import android.app.Application
import android.net.Uri
import android.os.SystemClock
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import java.security.SecureRandom
import java.util.Locale
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.json.JSONArray
import pl.artifex.hiciarz.data.DeckCodec
import pl.artifex.hiciarz.data.DeckFormatException
import pl.artifex.hiciarz.data.DeckRepository
import pl.artifex.hiciarz.model.*
import pl.artifex.hiciarz.playback.SpotifyController

class HiciarzViewModel(application: Application) : AndroidViewModel(application) {
    private val prefs = application.getSharedPreferences("hiciarz", 0)
    private val repository = DeckRepository(application)
    private val random = SecureRandom()
    private val initialSettings = AppSettings(
        language = prefs.getString("language", if (Locale.getDefault().language == "en") "en" else "pl") ?: "pl",
        autoPause = prefs.getBoolean("autoPause", true),
        clipSeconds = prefs.getInt("clipSeconds", 20).coerceIn(5, 90),
        hideAnswers = prefs.getBoolean("hideAnswers", true),
        clientIdOverride = prefs.getString("clientId", "").orEmpty(),
    )
    private val mutableState = MutableStateFlow(AppState(settings = initialSettings, busy = true))
    val state = mutableState.asStateFlow()
    private var playback: SpotifyController? = null
    private var playbackJob: Job? = null
    private var clipJob: Job? = null
    private var armClipUri: String? = null
    private var ownedTrackUri: String? = null
    private var reconnectOnAttach = false
    private var initializing = true
    private var pendingAction: AppAction? = null
    private var clipDeadline: Long? = null

    init {
        viewModelScope.launch {
            try {
                val decks = repository.load()
                val activeId = prefs.getString("activeDeck", null)?.takeIf { id -> decks.any { it.id == id } }
                    ?: decks.firstOrNull { it.gameMode == GameMode.CLASSIC }?.id ?: decks.firstOrNull()?.id
                val active = decks.firstOrNull { it.id == activeId }
                val history = if (prefs.getString("bingoDeck", null) == activeId) runCatching {
                    val ids = JSONArray(prefs.getString("bingoHistory", "[]"))
                    (0 until ids.length()).mapNotNull { index ->
                        active?.songs?.firstOrNull { it.spotifyId == ids.getString(index) }
                    }
                }.getOrDefault(emptyList()) else emptyList()
                val level = runCatching { BingoLevel.valueOf(prefs.getString("bingoLevel", "BEGINNER")!!) }
                    .getOrDefault(BingoLevel.BEGINNER)
                val question = runCatching { QuestionType.valueOf(prefs.getString("bingoQuestion", "BAND_OR_SOLO")!!) }
                    .getOrDefault(QuestionType.BAND_OR_SOLO)
                mutableState.update { it.copy(decks = decks, activeDeckId = activeId, busy = false,
                    bingoHistory = history, bingoSong = history.lastOrNull(), bingoLevel = level, question = question) }
            } catch (_: Exception) {
                val examples = repository.current()
                mutableState.update { it.copy(decks = examples, activeDeckId = examples.firstOrNull()?.id,
                    busy = false, message = "import_failed") }
            }
            initializing = false
            pendingAction?.let { action -> pendingAction = null; dispatch(action) }
        }
    }

    fun clientId(): String = state.value.settings.clientIdOverride.ifBlank { BuildConfig.SPOTIFY_CLIENT_ID }

    /** The Activity releases this reference before destruction, including rotation. */
    fun attachPlayback(controller: SpotifyController) {
        playback = controller
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

    fun detachPlayback(controller: SpotifyController) {
        if (playback !== controller) return
        reconnectOnAttach = state.value.playback.connection != ConnectionStatus.DISCONNECTED
        playbackJob?.cancel()
        playbackJob = null
        playback = null
    }

    fun finishSession() { pauseOwned() }

    fun dispatch(action: AppAction) {
        when (action) {
            is AppAction.SelectTab -> mutableState.update { it.copy(tab = action.tab) }
            AppAction.ConnectSpotify -> playback?.connect()
            AppAction.DisconnectSpotify -> {
                clipJob?.cancel(); clipDeadline = null; armClipUri = null; ownedTrackUri = null
                playback?.disconnect()
            }
            AppAction.Pause -> { clipJob?.cancel(); clipDeadline = null; armClipUri = null; playback?.pause() }
            AppAction.Resume -> {
                val song = if (state.value.tab == AppTab.BINGO) state.value.bingoSong else state.value.currentSong
                if (song != null && state.value.playback.trackUri != song.spotifyUri) play(song)
                else {
                    armClipUri = state.value.playback.trackUri
                    ownedTrackUri = state.value.playback.trackUri
                    playback?.resume()
                }
            }
            AppAction.SwitchToPhone -> playback?.switchToPhone()
            is AppAction.ScanCode -> scan(action.value)
            AppAction.ScanNext -> {
                pauseOwned()
                mutableState.update { it.copy(currentSong = null, answerRevealed = false, scannerEnabled = true) }
            }
            AppAction.RevealAnswer -> mutableState.update { it.copy(answerRevealed = !it.answerRevealed) }
            AppAction.DismissMessage -> mutableState.update { it.copy(message = null) }
            is AppAction.SelectDeck -> {
                if (state.value.activeDeckId != action.id && state.value.decks.any { it.id == action.id }) {
                    pauseOwned()
                    prefs.edit().putString("activeDeck", action.id).apply()
                    mutableState.update { it.copy(activeDeckId = action.id, bingoHistory = emptyList(), bingoSong = null) }
                    saveBingo()
                }
            }
            is AppAction.ImportDeck -> importDeck(action.uri)
            is AppAction.DeleteDeck -> viewModelScope.launch {
                if (state.value.decks.firstOrNull { it.id == action.id }?.bundled != false) return@launch
                try {
                    if (state.value.activeDeckId == action.id) pauseOwned()
                    val decks = repository.delete(action.id)
                    mutableState.update { current -> current.copy(decks = decks,
                        activeDeckId = current.activeDeckId.takeUnless { it == action.id } ?: decks.firstOrNull()?.id,
                        bingoHistory = if (current.activeDeckId == action.id) emptyList() else current.bingoHistory,
                        bingoSong = if (current.activeDeckId == action.id) null else current.bingoSong,
                        message = "deck_deleted") }
                    prefs.edit().putString("activeDeck", state.value.activeDeckId).apply()
                    saveBingo()
                } catch (_: Exception) { mutableState.update { it.copy(message = "import_failed") } }
            }
            AppAction.DrawBingo -> drawBingo()
            AppAction.RevealBingoAnswer -> mutableState.update { it.copy(bingoAnswerRevealed = !it.bingoAnswerRevealed) }
            AppAction.ResetBingo -> {
                pauseOwned()
                mutableState.update { it.copy(bingoHistory = emptyList(), bingoSong = null, bingoAnswerRevealed = false) }
                saveBingo()
            }
            is AppAction.SetQuestion -> { mutableState.update { it.copy(question = action.question) }; saveBingo() }
            is AppAction.SetBingoLevel -> { mutableState.update { it.copy(bingoLevel = action.level) }; saveBingo() }
            is AppAction.SetLanguage -> updateSettings(state.value.settings.copy(language = if (action.language == "en") "en" else "pl"))
            is AppAction.SetClipSeconds -> {
                updateSettings(state.value.settings.copy(clipSeconds = action.seconds.coerceIn(5, 90)))
                rearmPlayingClip()
            }
            is AppAction.SetAutoPause -> {
                updateSettings(state.value.settings.copy(autoPause = action.enabled))
                if (!action.enabled) { clipJob?.cancel(); clipDeadline = null }
                else rearmPlayingClip()
            }
            is AppAction.SetHideAnswers -> updateSettings(state.value.settings.copy(hideAnswers = action.enabled))
            is AppAction.SetClientId -> {
                val value = action.value.trim()
                if (value.isNotEmpty() && !Regex("[A-Fa-f0-9]{32}").matches(value))
                    mutableState.update { it.copy(message = "invalid_client_id") }
                else {
                    dispatch(AppAction.DisconnectSpotify)
                    updateSettings(state.value.settings.copy(clientIdOverride = value))
                }
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
            mutableState.update { it.copy(tab = AppTab.SCAN, currentSong = song, scannerEnabled = false,
                answerRevealed = !it.settings.hideAnswers, message = null) }
            play(song)
        } catch (error: Exception) {
            mutableState.update { it.copy(message = (error as? DeckFormatException)?.code ?: "invalid_qr", scannerEnabled = false) }
            viewModelScope.launch {
                delay(800)
                mutableState.update { if (it.currentSong == null) it.copy(scannerEnabled = true) else it }
            }
        }
    }

    private fun drawBingo() {
        val deck = state.value.activeDeck
        if (deck == null) { mutableState.update { it.copy(message = "choose_deck") }; return }
        val remaining = BingoRules.remaining(deck, state.value.bingoHistory)
        if (remaining.isEmpty()) { mutableState.update { it.copy(message = "bingo_finished") }; return }
        val song = remaining[random.nextInt(remaining.size)]
        val categories = BingoRules.categories(state.value.bingoLevel)
        mutableState.update { it.copy(bingoSong = song, bingoHistory = it.bingoHistory + song,
            bingoAnswerRevealed = false, question = categories[random.nextInt(categories.size)]) }
        saveBingo()
        play(song)
    }

    private fun play(song: Song) {
        clipJob?.cancel()
        clipDeadline = null
        ownedTrackUri = song.spotifyUri
        armClipUri = song.spotifyUri
        playback?.play(song.spotifyUri)
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
            mutableState.update { it.copy(tab = AppTab.DECKS, decks = repository.current(), activeDeckId = deck.id,
                bingoHistory = emptyList(), bingoSong = null, busy = false, message = "deck_imported") }
            saveBingo()
        } catch (error: Exception) {
            mutableState.update { it.copy(busy = false, message = (error as? DeckFormatException)?.code ?: "import_failed") }
        }
    }

    private fun saveBingo() {
        val value = state.value
        prefs.edit().putString("bingoDeck", value.activeDeckId).putString("bingoLevel", value.bingoLevel.name)
            .putString("bingoQuestion", value.question.name)
            .putString("bingoHistory", JSONArray(value.bingoHistory.map { it.spotifyId }).toString()).apply()
    }

    private fun updateSettings(settings: AppSettings) {
        mutableState.update { it.copy(settings = settings) }
        prefs.edit().putString("language", settings.language).putBoolean("autoPause", settings.autoPause)
            .putInt("clipSeconds", settings.clipSeconds).putBoolean("hideAnswers", settings.hideAnswers)
            .putString("clientId", settings.clientIdOverride).apply()
    }

    override fun onCleared() { playbackJob?.cancel(); clipJob?.cancel(); playback = null }
}
