package pl.artifex.hiciarz.playback

import kotlinx.coroutines.flow.StateFlow
import pl.artifex.hiciarz.model.PlaybackState

/** Playback commands are independent of the screen that presents their controls. */
interface PlaybackTransport {
    val state: StateFlow<PlaybackState>
    fun connect()
    fun play(uri: String)
    /** One payload-free failure callback for this command; cancellations do not report failure. */
    fun play(uri: String, onFailure: () -> Unit) { play(uri) }
    fun pause()
    fun cancelPendingPlayback()
    fun resume()
    fun resume(onFailure: () -> Unit) { resume() }
    fun switchToPhone()
    fun disconnect()
}
