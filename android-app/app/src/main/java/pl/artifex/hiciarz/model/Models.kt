package pl.artifex.hiciarz.model

// DECKS is a legacy route; the current app redirects it to SCAN.
enum class AppTab { SCAN, DECKS, SETTINGS }
enum class GameMode { CLASSIC, GAME, MOVIE }
enum class CardSkin(val id: String, val code: Char) {
    CLASSIC("classic", 'c'), MINIMAL("minimal", 'm'), VINYL("vinyl", 'v'),
    MIXTAPE("mixtape", 't'), MEMPHIS("memphis", 'p'), DISCO("disco", 'd'),
    CHRISTMAS("christmas", 'x'), WINTER("winter", 'w'), FISH("fish", 'f');

    companion object {
        fun fromId(id: String): CardSkin? = entries.firstOrNull { it.id == id }
        fun fromCode(code: Char): CardSkin? = entries.firstOrNull { it.code == code }
    }
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
    data class ScanCameraCode(val value: String) : AppAction
    data object ScanNext : AppAction
    data object RevealAnswer : AppAction
    data object DismissMessage : AppAction
    data class SelectDeck(val id: String) : AppAction
    data class ImportDeck(val uri: String) : AppAction
    data class DeleteDeck(val id: String) : AppAction
    data class SetLanguage(val language: String) : AppAction
    data class SetClipSeconds(val seconds: Int) : AppAction
    data class SetAutoPause(val enabled: Boolean) : AppAction
    data class SetHideAnswers(val enabled: Boolean) : AppAction
    data class SetCardSkin(val skin: CardSkin) : AppAction
    data class SetFollowCardSkin(val enabled: Boolean) : AppAction
}
