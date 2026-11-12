package pl.artifex.hiciarz.model

enum class AppTab { SCAN, SETTINGS }
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

/** A recording decoded directly from a printed QR or Spotify link. */
data class Song(val spotifyId: String, val skin: CardSkin? = null) {
    val spotifyUri: String get() = "spotify:track:$spotifyId"
}

data class AppSettings(
    val language: String = "pl",
    val autoPause: Boolean = false,
    val clipSeconds: Int = 20,
    val cardSkin: CardSkin = CardSkin.CLASSIC,
    val followCardSkin: Boolean = true,
)

data class AppState(
    val tab: AppTab = AppTab.SCAN,
    val playback: PlaybackState = PlaybackState(),
    val settings: AppSettings = AppSettings(),
    val currentSong: Song? = null,
    val scannerEnabled: Boolean = true,
    val message: String? = null,
    val scannedSkin: CardSkin? = null,
) {
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
    data object DismissMessage : AppAction
    data class SetLanguage(val language: String) : AppAction
    data class SetClipSeconds(val seconds: Int) : AppAction
    data class SetAutoPause(val enabled: Boolean) : AppAction
    data class SetCardSkin(val skin: CardSkin) : AppAction
    data class SetFollowCardSkin(val enabled: Boolean) : AppAction
}
