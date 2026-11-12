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
import org.json.JSONObject
import pl.artifex.hiciarz.data.DeckCodec
import pl.artifex.hiciarz.data.DeckFormatException
import pl.artifex.hiciarz.data.DeckRepository
import pl.artifex.hiciarz.model.*
import pl.artifex.hiciarz.playback.PlaybackTransport

class HiciarzViewModel(application: Application) : AndroidViewModel(application) {
    private val prefs = application.getSharedPreferences("hiciarz", 0)
    private val repository = DeckRepository(application)
    private val random = SecureRandom()
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

    init {
        // The APK owns its Spotify configuration; hidden legacy overrides must not break login.
        prefs.edit().remove("clientId").apply()
        viewModelScope.launch {
            try {
                val decks = repository.load()
                val activeId = prefs.getString("activeDeck", null)?.takeIf { id -> decks.any { it.id == id } }
                    ?: decks.firstOrNull { it.gameMode == GameMode.CLASSIC }?.id ?: decks.firstOrNull()?.id
                val active = decks.firstOrNull { it.id == activeId }
                val history = restoreBingoHistory(decks)
                val level = runCatching { BingoLevel.valueOf(prefs.getString("bingoLevel", "BEGINNER")!!) }
                    .getOrDefault(BingoLevel.BEGINNER)
                val question = runCatching { QuestionType.valueOf(prefs.getString("bingoQuestion", "BAND_OR_SOLO")!!) }
                    .getOrDefault(BingoRules.categories(level).first())
                    .takeIf { it in BingoRules.categories(level) } ?: BingoRules.categories(level).first()
                val currentBingo = runCatching { readSavedSong(JSONObject(prefs.getString("bingoCurrentScan", "{}").orEmpty())) }.getOrNull()
                val savedStage = runCatching { BingoStage.valueOf(prefs.getString("bingoStage", "").orEmpty()) }
                    .getOrDefault(if (history.isEmpty()) BingoStage.IDLE else BingoStage.RULE)
                // Opening the application never starts a camera left active before process death.
                val bingoStage = when {
                    savedStage == BingoStage.SCAN -> BingoStage.RULE
                    savedStage == BingoStage.PLAYING && currentBingo == null -> BingoStage.RULE
                    else -> savedStage
                }
                val restoredTimeline = restoreTimeline(active)
                val restoredQuiz = restoreQuiz(active)
                val mode = runCatching { CardlessMode.valueOf(prefs.getString("cardlessMode", null).orEmpty()) }
                    .getOrDefault(CardlessMode.BINGO)
                mutableState.update { it.copy(decks = decks, activeDeckId = activeId, busy = false,
                    bingoHistory = history, bingoSong = currentBingo, bingoLevel = level, question = question,
                    bingoStage = bingoStage, bingoRound = prefs.getInt("bingoRound", history.size).coerceAtLeast(0),
                    bingoAnswerRevealed = currentBingo != null && prefs.getBoolean("bingoRevealed", false),
                    cardlessMode = mode, timeline = restoredTimeline, quiz = restoredQuiz,
                    scannedSkin = if (mode == CardlessMode.BINGO && bingoStage == BingoStage.PLAYING)
                        CardSkin.fromId(prefs.getString("bingoActiveSkin", "").orEmpty()) else null) }
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
                    val expectedScreen = if (action.bingo) current.tab == AppTab.BINGO &&
                        current.cardlessMode == CardlessMode.BINGO && current.bingoStage == BingoStage.SCAN
                    else current.tab == AppTab.SCAN && current.currentSong == null
                    if (expectedScreen && current.scannerEnabled) scan(action.value)
                }
            }
            AppAction.ScanNext -> {
                pauseOwned()
                mutableState.update { it.copy(currentSong = null, scannedSkin = null,
                    answerRevealed = false, scannerEnabled = true) }
            }
            AppAction.RevealAnswer -> mutableState.update { it.copy(answerRevealed = !it.answerRevealed) }
            AppAction.DismissMessage -> mutableState.update { it.copy(message = null) }
            is AppAction.SelectDeck -> {
                if (state.value.activeDeckId != action.id && state.value.decks.any { it.id == action.id }) {
                    pauseOwned()
                    prefs.edit().putString("activeDeck", action.id).apply()
                    mutableState.update { resetGames(it.copy(activeDeckId = action.id)) }
                    saveGames()
                }
            }
            is AppAction.ImportDeck -> importDeck(action.uri)
            is AppAction.DeleteDeck -> viewModelScope.launch {
                if (state.value.decks.firstOrNull { it.id == action.id }?.bundled != false) return@launch
                try {
                    if (state.value.activeDeckId == action.id) pauseOwned()
                    val decks = repository.delete(action.id)
                    mutableState.update { current -> val updated = current.copy(decks = decks,
                        activeDeckId = current.activeDeckId.takeUnless { it == action.id } ?: decks.firstOrNull()?.id,
                        message = "deck_deleted")
                        if (current.activeDeckId == action.id) resetGames(updated) else updated }
                    prefs.edit().putString("activeDeck", state.value.activeDeckId).apply()
                    saveGames()
                } catch (_: Exception) { mutableState.update { it.copy(message = "import_failed") } }
            }
            AppAction.DrawBingo -> drawBingo()
            AppAction.BeginBingoScan -> beginBingoScan()
            AppAction.CancelBingoScan -> {
                if (state.value.bingoStage == BingoStage.SCAN) {
                    mutableState.update { it.copy(bingoStage = BingoStage.RULE, scannerEnabled = true, message = null) }
                    saveBingo()
                }
            }
            AppAction.RevealBingoAnswer -> {
                mutableState.update { if (it.bingoSong != null) it.copy(bingoAnswerRevealed = true) else it }
                saveBingo()
            }
            AppAction.ResetBingo -> {
                pauseOwned()
                mutableState.update { it.copy(bingoHistory = emptyList(), bingoSong = null, bingoAnswerRevealed = false,
                    bingoStage = BingoStage.IDLE, bingoRound = 0, scannedSkin = null) }
                saveBingo()
            }
            is AppAction.SetQuestion -> {
                if (state.value.bingoSong == null) mutableState.update { it.copy(question = action.question) }
                saveBingo()
            }
            is AppAction.SetBingoLevel -> {
                if (state.value.bingoLevel != action.level) {
                    pauseOwned()
                    mutableState.update { it.copy(bingoLevel = action.level, bingoHistory = emptyList(), bingoSong = null,
                        bingoAnswerRevealed = false, bingoStage = BingoStage.IDLE, bingoRound = 0, scannedSkin = null) }
                    saveBingo()
                }
            }
            is AppAction.SetCardlessMode -> {
                if (state.value.cardlessMode != action.mode) pauseOwned()
                mutableState.update { it.copy(cardlessMode = action.mode, scannedSkin = null) }; saveGames()
            }
            AppAction.StartTimeline -> startTimeline()
            is AppAction.ChooseTimelineGap -> {
                mutableState.update { it.copy(timeline = TimelineRules.choose(it.timeline, action.index)) }; saveCardless()
            }
            AppAction.RevealTimeline -> state.value.activeDeck?.let { deck ->
                mutableState.update { it.copy(timeline = TimelineRules.reveal(it.timeline, deck)) }; saveCardless()
            }
            AppAction.NextTimeline -> nextTimeline()
            AppAction.ResetTimeline -> {
                pauseOwned(); mutableState.update { it.copy(timeline = TimelineState()) }; saveCardless()
            }
            AppAction.StartQuiz -> startQuiz()
            AppAction.RevealQuiz -> { mutableState.update { it.copy(quiz = QuizRules.reveal(it.quiz)) }; saveCardless() }
            is AppAction.SubmitQuizAnswer -> state.value.activeDeck?.let { deck ->
                mutableState.update { it.copy(quiz = QuizRules.answer(it.quiz, action.correct, deck)) }; saveCardless()
            }
            AppAction.NextQuiz -> nextQuiz()
            AppAction.ResetQuiz -> {
                pauseOwned(); mutableState.update { it.copy(quiz = QuizState()) }; saveCardless()
            }
            is AppAction.SetCardSkin -> {
                updateSettings(state.value.settings.copy(cardSkin = action.skin))
                mutableState.update { it.copy(scannedSkin = null) }
                saveBingo()
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
                mutableState.update { it.copy(answerRevealed = !action.enabled,
                    bingoAnswerRevealed = it.bingoSong != null && !action.enabled) }
            }
        }
    }

    private fun scan(raw: String) {
        if (initializing) { pendingAction = AppAction.ScanCode(raw); return }
        val bingo = state.value.tab == AppTab.BINGO && state.value.cardlessMode == CardlessMode.BINGO &&
            state.value.bingoStage == BingoStage.SCAN
        try {
            val card = DeckCodec.readCard(raw)
            val songs = state.value.activeDeck?.songs.orEmpty() + state.value.decks.flatMap { it.songs }
            val song = songs.firstOrNull { it.spotifyId == card.spotifyId &&
                (card.gameMode == null || it.gameMode == card.gameMode) }
                ?: Song("spotify-${card.spotifyId}", "", "", null, card.spotifyId,
                    gameMode = card.gameMode ?: GameMode.CLASSIC)
            val scanned = song.copy(skin = card.skin ?: song.skin)
            if (bingo) {
                mutableState.update { it.copy(bingoSong = scanned, bingoHistory = (it.bingoHistory + scanned).takeLast(500),
                    bingoStage = BingoStage.PLAYING, bingoAnswerRevealed = !it.settings.hideAnswers,
                    scannedSkin = card.skin, scannerEnabled = false, message = null) }
                saveBingo()
            } else mutableState.update { it.copy(tab = AppTab.SCAN, currentSong = scanned,
                scannedSkin = card.skin, scannerEnabled = false,
                answerRevealed = !it.settings.hideAnswers, message = null) }
            play(song)
        } catch (error: Exception) {
            mutableState.update { it.copy(message = (error as? DeckFormatException)?.code ?: "invalid_qr", scannerEnabled = false) }
            viewModelScope.launch {
                delay(800)
                mutableState.update {
                    if ((bingo && it.bingoStage == BingoStage.SCAN) || (!bingo && it.currentSong == null))
                        it.copy(scannerEnabled = true) else it
                }
            }
        }
    }

    private fun drawBingo() {
        pauseOwned()
        val categories = BingoRules.categories(state.value.bingoLevel)
        mutableState.update { it.copy(cardlessMode = CardlessMode.BINGO, bingoSong = null,
            bingoAnswerRevealed = false, question = categories[random.nextInt(categories.size)],
            scannedSkin = null, bingoStage = BingoStage.RULE, bingoRound = it.bingoRound + 1) }
        saveGames()
    }

    private fun beginBingoScan() {
        if (state.value.bingoStage !in listOf(BingoStage.RULE, BingoStage.PLAYING)) return
        pauseOwned()
        mutableState.update { it.copy(tab = AppTab.BINGO, cardlessMode = CardlessMode.BINGO,
            bingoStage = BingoStage.SCAN, bingoSong = null, bingoAnswerRevealed = false,
            scannerEnabled = true, scannedSkin = null, message = null) }
        saveGames()
    }

    private fun startTimeline() {
        if (state.value.timeline.started) return
        val deck = state.value.activeDeck ?: return showMessage("choose_deck")
        val session = TimelineRules.start(deck, random)
        if (!session.started) return showMessage("timeline_needs_years")
        mutableState.update { it.copy(cardlessMode = CardlessMode.TIMELINE, timeline = session, scannedSkin = null) }
        saveCardless()
        session.currentSong?.let(::play)
    }

    private fun nextTimeline() {
        val deck = state.value.activeDeck ?: return showMessage("choose_deck")
        val previous = state.value.timeline
        val next = TimelineRules.next(previous, deck, random)
        if (next == previous) return
        mutableState.update { it.copy(timeline = next) }
        saveCardless()
        if (!next.finished) next.currentSong?.let(::play)
    }

    private fun startQuiz() {
        if (state.value.quiz.started) return
        val deck = state.value.activeDeck ?: return showMessage("choose_deck")
        val session = QuizRules.start(deck, random)
        if (!session.started) return showMessage("empty_deck")
        mutableState.update { it.copy(cardlessMode = CardlessMode.QUIZ, quiz = session, scannedSkin = null) }
        saveCardless()
        session.currentSong?.let(::play)
    }

    private fun nextQuiz() {
        val deck = state.value.activeDeck ?: return showMessage("choose_deck")
        val previous = state.value.quiz
        val next = QuizRules.next(previous, deck, random)
        if (next == previous) return
        mutableState.update { it.copy(quiz = next) }
        saveCardless()
        if (!next.finished) next.currentSong?.let(::play)
    }

    private fun showMessage(code: String) { mutableState.update { it.copy(message = code) } }

    private fun defaultCardlessMode(deck: Deck?): CardlessMode =
        if (deck != null && (deck.gameMode != GameMode.CLASSIC ||
                (deck.songs.isNotEmpty() && deck.songs.all { it.gameMode != GameMode.CLASSIC })))
            CardlessMode.QUIZ else CardlessMode.TIMELINE

    private fun resetGames(state: AppState): AppState = state.copy(
        cardlessMode = if (state.cardlessMode == CardlessMode.BINGO) CardlessMode.BINGO else defaultCardlessMode(state.activeDeck),
        timeline = TimelineState(), quiz = QuizState(),
        scannedSkin = null,
    )

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
            mutableState.update { resetGames(it.copy(tab = AppTab.DECKS, decks = repository.current(), activeDeckId = deck.id,
                busy = false, message = "deck_imported")) }
            saveGames()
        } catch (error: Exception) {
            mutableState.update { it.copy(busy = false, message = (error as? DeckFormatException)?.code ?: "import_failed") }
        }
    }

    private fun saveBingo() {
        val value = state.value
        prefs.edit().putString("bingoDeck", value.activeDeckId).putString("bingoLevel", value.bingoLevel.name)
            .putString("bingoQuestion", value.question.name)
            .putString("bingoHistory", JSONArray(value.bingoHistory.map { it.spotifyId }).toString())
            .putString("bingoScans", JSONArray(value.bingoHistory.map(::savedSong)).toString())
            .putString("bingoCurrentScan", value.bingoSong?.let { savedSong(it).toString() })
            .putString("bingoStage", value.bingoStage.name).putInt("bingoRound", value.bingoRound)
            .putString("bingoActiveSkin", value.scannedSkin?.id.orEmpty())
            .putBoolean("bingoRevealed", value.bingoAnswerRevealed).apply()
    }

    private fun saveGames() { saveBingo(); saveCardless() }

    private fun saveCardless() {
        val value = state.value
        val timeline = value.timeline
        val quiz = value.quiz
        val timelineJson = JSONObject().put("board", JSONArray(timeline.board.map { it.spotifyId }))
            .put("current", timeline.currentSong?.spotifyId).put("gap", timeline.selectedGap)
            .put("revealed", timeline.revealed).put("correct", timeline.correct).put("correctGap", timeline.correctGap)
            .put("played", JSONArray(timeline.playedIds.toList())).put("mistakes", timeline.mistakes)
        val quizJson = JSONObject().put("current", quiz.currentSong?.spotifyId).put("revealed", quiz.revealed)
            .put("answered", quiz.answered).put("played", JSONArray(quiz.playedIds.toList()))
            .put("correctCount", quiz.correctCount)
        prefs.edit().putString("cardlessDeck", value.activeDeckId).putString("cardlessMode", value.cardlessMode.name)
            .putString("timeline", timelineJson.toString()).putString("quiz", quizJson.toString()).apply()
    }

    private fun savedSong(song: Song): JSONObject = JSONObject().put("id", song.id)
        .put("spotify", song.spotifyId).put("title", song.title).put("artist", song.artist)
        .put("year", song.year).put("answer", song.answer).put("mode", song.gameMode.name)
        .apply { song.skin?.let { put("skin", it.id) } }

    private fun readSavedSong(json: JSONObject): Song {
        val spotifyId = DeckCodec.spotifyId(json.getString("spotify"))
        return Song(json.optString("id", "spotify-$spotifyId").take(100), json.optString("title").take(200),
            json.optString("artist").take(200), json.optInt("year", -1).takeIf { it in 1000..2100 }, spotifyId,
            json.optString("answer").take(200), runCatching { GameMode.valueOf(json.optString("mode")) }
                .getOrDefault(GameMode.CLASSIC), CardSkin.fromId(json.optString("skin")))
    }

    private fun restoreBingoHistory(decks: List<Deck>): List<Song> = runCatching {
        if (prefs.contains("bingoScans")) {
            val scans = JSONArray(prefs.getString("bingoScans", "[]"))
            (0 until scans.length()).map { readSavedSong(scans.getJSONObject(it)) }.takeLast(500)
        } else {
            val ids = JSONArray(prefs.getString("bingoHistory", "[]"))
            val songs = decks.flatMap { it.songs }
            (0 until ids.length()).map { index ->
                val id = DeckCodec.spotifyId(ids.getString(index))
                songs.firstOrNull { it.spotifyId == id } ?: Song("spotify-$id", "", "", null, id)
            }.takeLast(500)
        }
    }.getOrDefault(emptyList())

    private fun stringIds(array: JSONArray): Set<String> = (0 until array.length()).map { array.getString(it) }.toSet()

    private fun restoreTimeline(deck: Deck?): TimelineState = runCatching {
        if (deck == null || prefs.getString("cardlessDeck", null) != deck.id) return@runCatching TimelineState()
        val pool = TimelineRules.eligible(deck)
        val songs = pool.associateBy { it.spotifyId }
        val json = JSONObject(prefs.getString("timeline", "{}").orEmpty())
        val ids = json.getJSONArray("board")
        val board = (0 until ids.length()).map { songs.getValue(ids.getString(it)) }
        require(pool.size >= 2 && board.isNotEmpty() && board.map { it.spotifyId }.distinct().size == board.size)
        require(board.zipWithNext().all { (a, b) -> a.year!! <= b.year!! })
        val current = songs.getValue(json.getString("current"))
        val played = stringIds(json.getJSONArray("played")).filterTo(mutableSetOf()) { it in songs }
        require(board.all { it.spotifyId in played } && current.spotifyId in played)
        val revealed = json.optBoolean("revealed", false)
        require(revealed || current.spotifyId !in board.map { it.spotifyId })
        val gap = json.optInt("gap", -1).takeIf { it in 0..board.size }
        val target = minOf(10, pool.size)
        TimelineState(board = board, currentSong = current, selectedGap = gap,
            revealed = revealed, correct = if (json.has("correct")) json.getBoolean("correct") else null,
            correctGap = json.optInt("correctGap", -1).takeIf { it in 0..board.size },
            playedIds = played, round = (played.size - 1).coerceAtLeast(1),
            mistakes = json.optInt("mistakes", 0).coerceIn(0, played.size), targetCards = target,
            finished = revealed && (board.size >= target || pool.none { it.spotifyId !in played }))
    }.getOrDefault(TimelineState())

    private fun restoreQuiz(deck: Deck?): QuizState = runCatching {
        if (deck == null || prefs.getString("cardlessDeck", null) != deck.id) return@runCatching QuizState()
        val songs = deck.songs.distinctBy { it.spotifyId }.associateBy { it.spotifyId }
        val json = JSONObject(prefs.getString("quiz", "{}").orEmpty())
        val current = songs.getValue(json.getString("current"))
        val played = stringIds(json.getJSONArray("played")).filterTo(mutableSetOf()) { it in songs }
        require(current.spotifyId in played)
        val answered = json.optBoolean("answered", false)
        val correctCount = json.optInt("correctCount", 0).coerceIn(0, played.size)
        val target = minOf(10, songs.size)
        QuizState(currentSong = current, revealed = json.optBoolean("revealed", false), answered = answered,
            playedIds = played, round = played.size, correctCount = correctCount, targetScore = target,
            finished = answered && (correctCount >= target || songs.keys.none { it !in played }))
    }.getOrDefault(QuizState())

    private fun updateSettings(settings: AppSettings) {
        mutableState.update { it.copy(settings = settings) }
        prefs.edit().putString("language", settings.language).putBoolean("autoPause", settings.autoPause)
            .putInt("clipSeconds", settings.clipSeconds).putBoolean("hideAnswers", settings.hideAnswers)
            .apply()
        prefs.edit().putString("cardSkin", settings.cardSkin.id).putBoolean("followCardSkin", settings.followCardSkin).apply()
    }

    override fun onCleared() { playbackJob?.cancel(); clipJob?.cancel(); playback = null }
}
