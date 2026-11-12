package pl.artifex.hiciarz.model

enum class AppTab { SCAN, BINGO, DECKS, SETTINGS }
enum class GameMode { CLASSIC, GAME, MOVIE }
enum class BingoLevel { BEGINNER, EXPERT }
enum class BingoStage { IDLE, RULE, SCAN, PLAYING }
enum class CardlessMode { TIMELINE, QUIZ, BINGO }
enum class CardSkin(val id: String, val code: Char) {
    CLASSIC("classic", 'c'), MINIMAL("minimal", 'm'), VINYL("vinyl", 'v'),
    MIXTAPE("mixtape", 't'), MEMPHIS("memphis", 'p'), DISCO("disco", 'd'),
    CHRISTMAS("christmas", 'x'), WINTER("winter", 'w'), FISH("fish", 'f');

    companion object {
        fun fromId(id: String): CardSkin? = entries.firstOrNull { it.id == id }
        fun fromCode(code: Char): CardSkin? = entries.firstOrNull { it.code == code }
    }
}
enum class QuestionType {
    TITLE, ARTIST, YEAR, SOURCE, BAND_OR_SOLO, BEFORE_2000,
    YEAR_WITHIN_FOUR, DECADE, YEAR_WITHIN_TWO, YEAR_WITHIN_THREE,
}
enum class ConnectionStatus { DISCONNECTED, CONNECTING, CONNECTED }

data class PlaybackState(
    val connection: ConnectionStatus = ConnectionStatus.DISCONNECTED,
    val isPlaying: Boolean = false,
    val positionMs: Long = 0,
    val trackUri: String? = null,
    val error: String? = null,
    val spotifyInstalled: Boolean = true,
)

data class Song(
    val id: String,
    val title: String,
    val artist: String,
    val year: Int?,
    val spotifyId: String,
    val answer: String = "",
    val gameMode: GameMode = GameMode.CLASSIC,
    val skin: CardSkin? = null,
) {
    val spotifyUri: String get() = "spotify:track:$spotifyId"
}

data class Deck(
    val id: String,
    val name: String,
    val songs: List<Song>,
    val gameMode: GameMode = GameMode.CLASSIC,
    val bundled: Boolean = false,
    val skin: CardSkin = CardSkin.CLASSIC,
)

data class AppSettings(
    val language: String = "pl",
    val autoPause: Boolean = false,
    val clipSeconds: Int = 20,
    val hideAnswers: Boolean = true,
    val cardSkin: CardSkin = CardSkin.CLASSIC,
    val followCardSkin: Boolean = true,
)

data class TimelineState(
    val board: List<Song> = emptyList(),
    val currentSong: Song? = null,
    val selectedGap: Int? = null,
    val revealed: Boolean = false,
    val correct: Boolean? = null,
    val correctGap: Int? = null,
    val playedIds: Set<String> = emptySet(),
    val round: Int = 0,
    val mistakes: Int = 0,
    val targetCards: Int = 10,
    val finished: Boolean = false,
) {
    val started: Boolean get() = board.isNotEmpty()
    val won: Boolean get() = started && board.size >= targetCards
    val correctCount: Int get() = (board.size - 1).coerceAtLeast(0)
}

data class QuizState(
    val currentSong: Song? = null,
    val revealed: Boolean = false,
    val answered: Boolean = false,
    val playedIds: Set<String> = emptySet(),
    val round: Int = 0,
    val correctCount: Int = 0,
    val targetScore: Int = 10,
    val finished: Boolean = false,
) {
    val started: Boolean get() = currentSong != null
    val won: Boolean get() = correctCount >= targetScore
}

data class AppState(
    val tab: AppTab = AppTab.BINGO,
    val playback: PlaybackState = PlaybackState(),
    val settings: AppSettings = AppSettings(),
    val decks: List<Deck> = emptyList(),
    val activeDeckId: String? = null,
    val currentSong: Song? = null,
    val answerRevealed: Boolean = false,
    val scannerEnabled: Boolean = true,
    val busy: Boolean = false,
    val message: String? = null,
    val question: QuestionType = QuestionType.TITLE,
    val bingoLevel: BingoLevel = BingoLevel.BEGINNER,
    val bingoHistory: List<Song> = emptyList(),
    val bingoSong: Song? = null,
    val bingoAnswerRevealed: Boolean = false,
    val cardlessMode: CardlessMode = CardlessMode.BINGO,
    val timeline: TimelineState = TimelineState(),
    val quiz: QuizState = QuizState(),
    val bingoStage: BingoStage = BingoStage.IDLE,
    val bingoRound: Int = 0,
    val scannedSkin: CardSkin? = null,
) {
    val activeDeck: Deck? get() = decks.firstOrNull { it.id == activeDeckId }
    val activeSkin: CardSkin get() = if (settings.followCardSkin) scannedSkin ?: settings.cardSkin else settings.cardSkin
}

sealed interface AppAction {
    data class SelectTab(val tab: AppTab) : AppAction
    data object ConnectSpotify : AppAction
    data object DisconnectSpotify : AppAction
    data object Pause : AppAction
    data object Resume : AppAction
    data class PlayCard(val song: Song) : AppAction
    data object SwitchToPhone : AppAction
    data class ScanCode(val value: String) : AppAction
    data class ScanCameraCode(val value: String, val bingo: Boolean = false, val bingoRound: Int? = null) : AppAction
    data object ScanNext : AppAction
    data object RevealAnswer : AppAction
    data object DismissMessage : AppAction
    data class SelectDeck(val id: String) : AppAction
    data class ImportDeck(val uri: String) : AppAction
    data class DeleteDeck(val id: String) : AppAction
    data object DrawBingo : AppAction
    data object DrawBingoAndScan : AppAction
    data object BeginBingoScan : AppAction
    data object CancelBingoScan : AppAction
    data object RevealBingoAnswer : AppAction
    data object ResetBingo : AppAction
    data class SetQuestion(val question: QuestionType) : AppAction
    data class SetBingoLevel(val level: BingoLevel) : AppAction
    data class SetLanguage(val language: String) : AppAction
    data class SetClipSeconds(val seconds: Int) : AppAction
    data class SetAutoPause(val enabled: Boolean) : AppAction
    data class SetHideAnswers(val enabled: Boolean) : AppAction
    data class SetCardlessMode(val mode: CardlessMode) : AppAction
    data object StartTimeline : AppAction
    data class ChooseTimelineGap(val index: Int) : AppAction
    data object RevealTimeline : AppAction
    data object NextTimeline : AppAction
    data object ResetTimeline : AppAction
    data object StartQuiz : AppAction
    data object RevealQuiz : AppAction
    data class SubmitQuizAnswer(val correct: Boolean) : AppAction
    data object NextQuiz : AppAction
    data object ResetQuiz : AppAction
    data class SetCardSkin(val skin: CardSkin) : AppAction
    data class SetFollowCardSkin(val enabled: Boolean) : AppAction
}
