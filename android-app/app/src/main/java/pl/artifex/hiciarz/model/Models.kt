package pl.artifex.hiciarz.model

enum class AppTab { SCAN, BINGO, DECKS, SETTINGS }
enum class GameMode { CLASSIC, GAME, MOVIE }
enum class BingoLevel { BEGINNER, EXPERT }
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
) {
    val spotifyUri: String get() = "spotify:track:$spotifyId"
}

data class Deck(
    val id: String,
    val name: String,
    val songs: List<Song>,
    val gameMode: GameMode = GameMode.CLASSIC,
    val bundled: Boolean = false,
)

data class AppSettings(
    val language: String = "pl",
    val autoPause: Boolean = true,
    val clipSeconds: Int = 20,
    val hideAnswers: Boolean = true,
    val clientIdOverride: String = "",
)

data class AppState(
    val tab: AppTab = AppTab.SCAN,
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
) {
    val activeDeck: Deck? get() = decks.firstOrNull { it.id == activeDeckId }
}

sealed interface AppAction {
    data class SelectTab(val tab: AppTab) : AppAction
    data object ConnectSpotify : AppAction
    data object DisconnectSpotify : AppAction
    data object Pause : AppAction
    data object Resume : AppAction
    data object SwitchToPhone : AppAction
    data class ScanCode(val value: String) : AppAction
    data object ScanNext : AppAction
    data object RevealAnswer : AppAction
    data object DismissMessage : AppAction
    data class SelectDeck(val id: String) : AppAction
    data class ImportDeck(val uri: String) : AppAction
    data class DeleteDeck(val id: String) : AppAction
    data object DrawBingo : AppAction
    data object RevealBingoAnswer : AppAction
    data object ResetBingo : AppAction
    data class SetQuestion(val question: QuestionType) : AppAction
    data class SetBingoLevel(val level: BingoLevel) : AppAction
    data class SetLanguage(val language: String) : AppAction
    data class SetClipSeconds(val seconds: Int) : AppAction
    data class SetAutoPause(val enabled: Boolean) : AppAction
    data class SetHideAnswers(val enabled: Boolean) : AppAction
    data class SetClientId(val value: String) : AppAction
}
