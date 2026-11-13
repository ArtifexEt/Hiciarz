package pl.artifex.hiciarz

import android.app.Application
import androidx.lifecycle.ViewModelStore
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import pl.artifex.hiciarz.analytics.UsageAnalytics
import pl.artifex.hiciarz.analytics.UsageEvent
import pl.artifex.hiciarz.analytics.UsageScreen
import pl.artifex.hiciarz.model.AppAction
import pl.artifex.hiciarz.model.AppTab
import pl.artifex.hiciarz.model.ConnectionStatus
import pl.artifex.hiciarz.model.PlaybackState
import pl.artifex.hiciarz.playback.PlaybackTransport

/** The actual ViewModel with a fake analytics sink; these tests cannot contact Firebase. */
@RunWith(AndroidJUnit4::class)
class AnalyticsViewModelTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val application = instrumentation.targetContext.applicationContext as Application
    private lateinit var store: ViewModelStore
    private lateinit var model: HiciarzViewModel
    private lateinit var analytics: RecordingAnalytics
    private lateinit var player: PendingPlayback

    @Before fun launch() {
        main {
            store = ViewModelStore()
            analytics = RecordingAnalytics()
            player = PendingPlayback()
            model = HiciarzViewModel(application, analytics)
            store.put("analytics-test", model)
            model.attachPlayback(player)
        }
    }

    @After fun close() = main { store.clear() }

    @Test fun consentDoesNotReplayEarlierActionsAndWithdrawalDropsPendingOutcomes() {
        dispatch(AppAction.ScanCameraCode(URI))
        main { player.complete() }
        assertTrue(analytics.events.isEmpty())
        assertTrue(analytics.screens.isEmpty())
        dispatch(AppAction.SetAnalyticsEnabled(true))
        assertTrue("No pre-consent outcomes may be replayed", analytics.events.isEmpty())
        assertEquals(listOf(UsageScreen.SCANNER), analytics.screens)
        dispatch(AppAction.ScanNext)
        dispatch(AppAction.ScanCameraCode(URI))
        assertEquals(listOf(UsageEvent.SCAN_ACCEPTED), analytics.events)
        dispatch(AppAction.SetAnalyticsEnabled(false))
        main { player.complete() }
        assertEquals("A late transport callback cannot bypass withdrawal", listOf(UsageEvent.SCAN_ACCEPTED), analytics.events)
        assertEquals(false, model.state.value.analyticsEnabled)
    }

    @Test fun cameraFramesAndPlaybackPositionUpdatesDoNotDuplicateOutcomes() {
        dispatch(AppAction.SetAnalyticsEnabled(true))
        dispatch(AppAction.SelectTab(AppTab.SETTINGS))
        dispatch(AppAction.SelectTab(AppTab.SETTINGS))
        dispatch(AppAction.SetClipSeconds(30))
        dispatch(AppAction.SelectTab(AppTab.SCAN))
        assertEquals(listOf(UsageScreen.SCANNER, UsageScreen.SETTINGS, UsageScreen.SCANNER), analytics.screens)
        dispatch(AppAction.ScanCameraCode(URI))
        dispatch(AppAction.ScanCameraCode(URI))
        assertEquals("A command is not yet a successful playback", listOf(UsageEvent.SCAN_ACCEPTED), analytics.events)
        main { player.complete() }
        repeat(5) { main { player.tick() } }
        assertEquals(listOf(UsageEvent.SCAN_ACCEPTED, UsageEvent.SPOTIFY_CONNECTED, UsageEvent.PLAYBACK_STARTED), analytics.events)
    }

    @Test fun revokingAndRegrantingBeforeTheCallbackDoesNotRevivePendingOutcomes() {
        dispatch(AppAction.SetAnalyticsEnabled(true))
        dispatch(AppAction.ScanCameraCode(URI))
        assertEquals(listOf(UsageEvent.SCAN_ACCEPTED), analytics.events)
        // Keep the changes and callback in one main-thread turn; collectors may conflate them.
        main {
            model.dispatch(AppAction.SetAnalyticsEnabled(false))
            model.dispatch(AppAction.SetAnalyticsEnabled(true))
            player.complete()
        }
        assertEquals("A result from the previous consent must stay discarded after re-grant",
            listOf(UsageEvent.SCAN_ACCEPTED), analytics.events)
    }

    @Test fun fixedFailureOutcomesAreCountedOnceWithoutTransportErrorPayloads() {
        dispatch(AppAction.SetAnalyticsEnabled(true))
        dispatch(AppAction.ScanCameraCode(URI))
        main { player.fail() }
        repeat(3) { main { player.tick() } }
        assertEquals(3, analytics.events.size)
        assertEquals(setOf(UsageEvent.SCAN_ACCEPTED, UsageEvent.SPOTIFY_CONNECTION_FAILED, UsageEvent.PLAYBACK_FAILED), analytics.events.toSet())
    }

    @Test fun repeatedPremiumFailuresCountEachCommandWithoutAnyPlaybackStateChange() {
        dispatch(AppAction.SetAnalyticsEnabled(true))
        main { player.repeatPremiumFailure() }
        val identicalFailureState = player.state.value
        repeat(2) {
            if (it > 0) dispatch(AppAction.ScanNext)
            dispatch(AppAction.ScanCameraCode(URI))
            assertEquals("The SDK's repeated error leaves StateFlow unchanged", identicalFailureState, player.state.value)
        }
        repeat(3) { main { player.tick() } }
        assertEquals(listOf(UsageEvent.SCAN_ACCEPTED, UsageEvent.PLAYBACK_FAILED,
            UsageEvent.SCAN_ACCEPTED, UsageEvent.PLAYBACK_FAILED), analytics.events)
    }

    @Test fun anOldFailureCannotCompleteANewAttemptAfterConsentWasRevokedAndGrantedAgain() {
        dispatch(AppAction.SetAnalyticsEnabled(true))
        dispatch(AppAction.ScanCameraCode(URI))
        lateinit var oldFailure: () -> Unit
        main { oldFailure = requireNotNull(player.failureCallback) }
        main {
            model.dispatch(AppAction.SetAnalyticsEnabled(false))
            model.dispatch(AppAction.SetAnalyticsEnabled(true))
        }
        dispatch(AppAction.ScanNext)
        dispatch(AppAction.ScanCameraCode(URI))
        main { oldFailure() }
        assertEquals(0, analytics.events.count { it == UsageEvent.PLAYBACK_FAILED })
        main { player.fail() }
        assertEquals(1, analytics.events.count { it == UsageEvent.PLAYBACK_FAILED })
    }

    @Test fun grantingConsentWhileAnEarlierConnectionCompletesDoesNotReplayThatOperation() {
        main {
            model.dispatch(AppAction.ScanCameraCode(URI))
            model.dispatch(AppAction.SetAnalyticsEnabled(true))
            player.complete()
        }
        assertTrue("Delayed transport state is not an action from the new consent window", analytics.events.isEmpty())
    }

    private fun dispatch(action: AppAction) = main { model.dispatch(action) }
    private fun main(action: () -> Unit) {
        instrumentation.runOnMainSync { action() }
        instrumentation.waitForIdleSync()
    }

    private class RecordingAnalytics : UsageAnalytics {
        override val configured = true
        override val enabled = MutableStateFlow(false)
        override val saveFailed = MutableStateFlow(false)
        val events = mutableListOf<UsageEvent>()
        val screens = mutableListOf<UsageScreen>()
        override fun setEnabled(enabled: Boolean) { this.enabled.value = enabled }
        override fun track(event: UsageEvent) { if (enabled.value) events += event }
        override fun screen(screen: UsageScreen) { if (enabled.value) screens += screen }
    }

    private class PendingPlayback : PlaybackTransport {
        private val mutableState = MutableStateFlow(PlaybackState())
        override val state: StateFlow<PlaybackState> = mutableState
        private var requested: String? = null
        var failureCallback: (() -> Unit)? = null
        private var premiumFailure = false
        override fun connect() { mutableState.value = mutableState.value.copy(connection = ConnectionStatus.CONNECTING, error = null) }
        override fun play(uri: String) { requested = uri; connect() }
        override fun play(uri: String, onFailure: () -> Unit) {
            failureCallback = onFailure
            if (premiumFailure) {
                mutableState.value = mutableState.value.copy(error = "premium_required")
                failureCallback = null
                onFailure()
            } else play(uri)
        }
        fun complete() { mutableState.value = PlaybackState(connection = ConnectionStatus.CONNECTED, trackUri = requested, isPlaying = true) }
        fun tick() { mutableState.value = mutableState.value.copy(positionMs = mutableState.value.positionMs + 500) }
        fun fail() {
            mutableState.value = mutableState.value.copy(connection = ConnectionStatus.DISCONNECTED, error = "connection_timeout")
            val failure = failureCallback
            failureCallback = null
            failure?.invoke()
        }
        fun repeatPremiumFailure() {
            premiumFailure = true
            mutableState.value = PlaybackState(connection = ConnectionStatus.CONNECTED, error = "premium_required")
        }
        override fun pause() { mutableState.value = mutableState.value.copy(isPlaying = false) }
        override fun resume() = connect()
        override fun resume(onFailure: () -> Unit) { failureCallback = onFailure; resume() }
        override fun cancelPendingPlayback() = Unit
        override fun switchToPhone() = Unit
        override fun disconnect() { mutableState.value = PlaybackState() }
    }

    private companion object { const val URI = "spotify:track:0000000000000000000000" }
}
