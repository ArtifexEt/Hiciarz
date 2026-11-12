package pl.artifex.hiciarz

import android.app.Application
import android.app.Dialog
import android.widget.TextView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelStore
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.spotify.android.appremote.api.Connector
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import pl.artifex.hiciarz.model.AppAction
import pl.artifex.hiciarz.model.ConnectionStatus
import pl.artifex.hiciarz.model.PlaybackState
import pl.artifex.hiciarz.playback.PlaybackTransport
import pl.artifex.hiciarz.playback.SpotifyController

/** Connection intent survives Activity replacement without relying on a delayed UI snapshot. */
@RunWith(AndroidJUnit4::class)
class SpotifyConnectionStateTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()

    @Test fun disconnectImmediatelyBeforeReplacingTheActivityDoesNotReconnect() = withModel { model ->
        main {
            val previous = RecordingPlayback(ConnectionStatus.CONNECTED) {
                assertEquals("The UI must stop showing a connection before transport cleanup",
                    ConnectionStatus.DISCONNECTED, model.state.value.playback.connection)
            }
            val replacement = RecordingPlayback()
            model.attachPlayback(previous)

            // Keep all transitions in one main-loop turn, before the old StateFlow collector runs.
            model.dispatch(AppAction.DisconnectSpotify)
            model.detachPlayback(previous)
            model.attachPlayback(replacement)

            assertEquals(0, replacement.connectCount)
            assertEquals(ConnectionStatus.DISCONNECTED, model.state.value.playback.connection)
            model.dispatch(AppAction.ConnectSpotify)
            assertEquals(1, replacement.connectCount)
        }
        instrumentation.waitForIdleSync()
        assertEquals(ConnectionStatus.CONNECTED, model.state.value.playback.connection)
    }

    @Test fun pendingConnectionIsRestoredFromTheTransportEvenBeforeTheUiReceivesIt() = withModel { model ->
        main {
            val previous = RecordingPlayback()
            val replacement = RecordingPlayback()
            model.attachPlayback(previous)
            previous.publish(ConnectionStatus.CONNECTING)

            model.detachPlayback(previous)
            model.attachPlayback(replacement)

            assertEquals(1, replacement.connectCount)
        }
    }

    @Test fun explicitDisconnectCancelsAReconnectWhileNoActivityIsAttached() = withModel { model ->
        main {
            val previous = RecordingPlayback(ConnectionStatus.CONNECTED)
            val replacement = RecordingPlayback()
            model.attachPlayback(previous)
            model.detachPlayback(previous)
            model.dispatch(AppAction.DisconnectSpotify)

            model.attachPlayback(replacement)

            assertEquals(0, replacement.connectCount)
        }
    }

    @Test fun returningAfterInstallingSpotifyRefreshesAvailabilityWithoutConnecting() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                var installed = false
                val controller = SpotifyController(
                    activity,
                    clientIdProvider = { "00000000000000000000000000000000" },
                    spotifyInstalledProvider = { installed },
                )
                try {
                    assertFalse(controller.state.value.spotifyInstalled)
                    installed = true
                    controller.refreshConnection()
                    assertTrue(controller.state.value.spotifyInstalled)
                    assertEquals(ConnectionStatus.DISCONNECTED, controller.state.value.connection)

                    controller.disconnect()
                    installed = false
                    controller.refreshConnection()
                    assertFalse(controller.state.value.spotifyInstalled)
                    assertEquals(ConnectionStatus.DISCONNECTED, controller.state.value.connection)
                } finally {
                    controller.close()
                }
            }
        }
    }

    @Test fun connectStartsWhileTheForegroundDialogOwnsWindowFocus() {
        val dialogFocused = CountDownLatch(1)
        val connectionStarted = CountDownLatch(1)
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            var controller: SpotifyController? = null
            var dialog: Dialog? = null
            try {
                scenario.onActivity { activity ->
                    controller = SpotifyController(
                        activity,
                        clientIdProvider = { "00000000000000000000000000000000" },
                        spotifyInstalledProvider = { true },
                        connectRemote = { _, _, listener ->
                            connectionStarted.countDown()
                            listener.onFailure(IllegalStateException("Simulated SDK result"))
                        },
                    )
                    dialog = Dialog(activity).apply {
                        setContentView(TextView(activity).apply { text = "Spotify connection controls" })
                        window!!.decorView.viewTreeObserver.addOnWindowFocusChangeListener { focused ->
                            if (focused) dialogFocused.countDown()
                        }
                        show()
                    }
                }
                assertTrue("The foreground dialog must own focus", dialogFocused.await(5, TimeUnit.SECONDS))
                scenario.onActivity { activity ->
                    assertTrue(activity.lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED))
                    assertFalse("A dialog removes focus from the Activity window", activity.hasWindowFocus())
                    controller!!.connect()
                }

                assertTrue("An open connection sheet must not block the SDK", connectionStarted.await(5, TimeUnit.SECONDS))
                scenario.onActivity {
                    assertEquals(ConnectionStatus.DISCONNECTED, controller!!.state.value.connection)
                    assertEquals("connection_failed", controller!!.state.value.error)
                }
            } finally {
                scenario.onActivity { dialog?.dismiss(); controller?.close() }
            }
        }
    }

    @Test fun disconnectCancelsAQueuedStartAndIgnoresALateFailureBeforeReconnecting() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            var controller: SpotifyController? = null
            var started = CountDownLatch(1)
            var listener: Connector.ConnectionListener? = null
            var connectionCount = 0
            try {
                scenario.onActivity { activity ->
                    controller = SpotifyController(
                        activity,
                        clientIdProvider = { "00000000000000000000000000000000" },
                        spotifyInstalledProvider = { true },
                        connectRemote = { _, _, callback ->
                            connectionCount++
                            listener = callback
                            started.countDown()
                        },
                    )
                    controller!!.connect()
                    controller!!.disconnect()
                    assertEquals(ConnectionStatus.DISCONNECTED, controller!!.state.value.connection)
                }
                assertFalse("Cancel must remove the delayed SDK start", started.await(750, TimeUnit.MILLISECONDS))
                scenario.onActivity {
                    assertEquals(0, connectionCount)
                    controller!!.connect()
                }
                assertTrue("Explicit connect must remain available after cancel", started.await(5, TimeUnit.SECONDS))
                scenario.onActivity {
                    val previousListener = requireNotNull(listener)
                    controller!!.disconnect()
                    previousListener.onFailure(IllegalStateException("Late failure from the disconnected session"))
                    assertEquals(ConnectionStatus.DISCONNECTED, controller!!.state.value.connection)
                    assertEquals(null, controller!!.state.value.error)
                    started = CountDownLatch(1)
                    controller!!.connect()
                    assertEquals(ConnectionStatus.CONNECTING, controller!!.state.value.connection)
                }
                assertTrue("A stale callback must not prevent a new SDK connection", started.await(5, TimeUnit.SECONDS))
                scenario.onActivity {
                    assertEquals(2, connectionCount)
                    controller!!.disconnect()
                    assertEquals(ConnectionStatus.DISCONNECTED, controller!!.state.value.connection)
                }
            } finally {
                scenario.onActivity { controller?.close() }
            }
        }
    }

    private fun withModel(test: (HiciarzViewModel) -> Unit) {
        val application = instrumentation.targetContext.applicationContext as Application
        lateinit var store: ViewModelStore
        lateinit var model: HiciarzViewModel
        main {
            store = ViewModelStore()
            model = ViewModelProvider(store,
                ViewModelProvider.AndroidViewModelFactory.getInstance(application))[HiciarzViewModel::class.java]
        }
        try {
            test(model)
        } finally {
            main { store.clear() }
        }
    }

    private fun main(action: () -> Unit) = instrumentation.runOnMainSync { action() }

    private class RecordingPlayback(
        connection: ConnectionStatus = ConnectionStatus.DISCONNECTED,
        private val beforeDisconnect: () -> Unit = {},
    ) : PlaybackTransport {
        private val mutableState = MutableStateFlow(PlaybackState(connection = connection))
        override val state: StateFlow<PlaybackState> = mutableState
        var connectCount = 0
            private set

        override fun connect() { connectCount++; publish(ConnectionStatus.CONNECTED) }
        override fun disconnect() { beforeDisconnect(); mutableState.value = PlaybackState() }
        override fun play(uri: String) = Unit
        override fun pause() = Unit
        override fun cancelPendingPlayback() = Unit
        override fun resume() = Unit
        override fun switchToPhone() = Unit
        fun publish(connection: ConnectionStatus) { mutableState.value = mutableState.value.copy(connection = connection) }
    }
}
