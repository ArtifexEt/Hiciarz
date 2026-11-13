package pl.artifex.hiciarz

import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.spotify.android.appremote.api.Connector
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import pl.artifex.hiciarz.playback.SpotifyController

/** Exercises the real transport's per-command path without Spotify or a Firebase connection. */
@RunWith(AndroidJUnit4::class)
class PlaybackFailureCallbackTest {
    @Test fun identicalPreflightFailuresNotifyEachPlayCommandEvenWhenStateDoesNotChange() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                val controller = SpotifyController(activity, { CLIENT_ID }, spotifyInstalledProvider = { false })
                try {
                    var failures = 0
                    controller.play(URI) { failures++ }
                    val firstFailureState = controller.state.value
                    controller.play(URI) { failures++ }
                    assertEquals(firstFailureState, controller.state.value)
                    assertEquals(2, failures)
                } finally { controller.close() }
            }
        }
    }

    @Test fun aRepeatedSdkFailureIsDeliveredOnceAndCancellationStaysSilent() {
        val started = CountDownLatch(1)
        var listener: Connector.ConnectionListener? = null
        var failures = 0
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            var controller: SpotifyController? = null
            try {
                scenario.onActivity { activity ->
                    controller = SpotifyController(activity, { CLIENT_ID }, spotifyInstalledProvider = { true },
                        connectRemote = { _, _, callback -> listener = callback; started.countDown() })
                    requireNotNull(controller).play(URI) { failures++ }
                }
                assertTrue(started.await(5, TimeUnit.SECONDS))
                scenario.onActivity {
                    val active = requireNotNull(controller)
                    val failure = requireNotNull(listener)
                    failure.onFailure(IllegalStateException("Simulated transport result"))
                    failure.onFailure(IllegalStateException("Repeated transport result"))
                    assertEquals(1, failures)
                    active.play(URI) { failures++ }
                    active.cancelPendingPlayback()
                    active.disconnect()
                    failure.onFailure(IllegalStateException("Cancelled transport result"))
                    assertEquals(1, failures)
                }
            } finally { scenario.onActivity { controller?.close() } }
        }
        InstrumentationRegistry.getInstrumentation().waitForIdleSync()
    }

    private companion object {
        const val CLIENT_ID = "00000000000000000000000000000000"
        const val URI = "spotify:track:0000000000000000000000"
    }
}
