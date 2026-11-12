package pl.artifex.hiciarz.playback

import kotlinx.coroutines.flow.StateFlow
import pl.artifex.hiciarz.model.PlaybackState

/** Playback commands are independent of the screen that presents their controls. */
interface PlaybackTransport {
    val state: StateFlow<PlaybackState>
    fun connect()
    fun play(uri: String)
    fun pause()
    fun cancelPendingPlayback()
    fun resume()
    fun switchToPhone()
    fun disconnect()
}
