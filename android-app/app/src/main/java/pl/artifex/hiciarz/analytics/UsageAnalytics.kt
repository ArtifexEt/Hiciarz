package pl.artifex.hiciarz.analytics

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Only fixed categories may cross the analytics boundary; application data cannot. */
enum class UsageEvent(internal val eventName: String) {
    SCAN_ACCEPTED("hiciarz_scan_accepted"),
    SCAN_REJECTED("hiciarz_scan_rejected"),
    SPOTIFY_CONNECTED("hiciarz_spotify_connected"),
    SPOTIFY_CONNECTION_FAILED("hiciarz_spotify_connection_failed"),
    PLAYBACK_STARTED("hiciarz_playback_started"),
    PLAYBACK_FAILED("hiciarz_playback_failed"),
}

enum class UsageScreen(internal val screenName: String) {
    SCANNER("scanner"), SETTINGS("settings"),
}

interface UsageAnalytics {
    val configured: Boolean
    val enabled: StateFlow<Boolean>
    val saveFailed: StateFlow<Boolean>
    fun setEnabled(enabled: Boolean)
    fun track(event: UsageEvent)
    fun screen(screen: UsageScreen)
}

object NoOpUsageAnalytics : UsageAnalytics {
    override val configured = false
    override val enabled: StateFlow<Boolean> = MutableStateFlow(false).asStateFlow()
    override val saveFailed: StateFlow<Boolean> = MutableStateFlow(false).asStateFlow()
    override fun setEnabled(enabled: Boolean) = Unit
    override fun track(event: UsageEvent) = Unit
    override fun screen(screen: UsageScreen) = Unit
}

internal interface AnalyticsConsentStore {
    fun readEnabled(): Boolean
    /** A grant must be persisted successfully before initializing the SDK. */
    fun writeEnabled(enabled: Boolean): Boolean
}

internal interface AnalyticsEngine {
    fun setCollectionEnabled(enabled: Boolean)
    fun setAnalyticsConsent(granted: Boolean)
    fun resetData()
    fun track(event: UsageEvent)
    fun screen(screen: UsageScreen)
}

/** No engine, identifier, or pre-consent queue is created while measurement is off. */
internal class ConsentUsageAnalytics(
    override val configured: Boolean,
    private val store: AnalyticsConsentStore,
    private val createEngine: () -> AnalyticsEngine,
) : UsageAnalytics {
    private val mutableEnabled = MutableStateFlow(false)
    override val enabled = mutableEnabled.asStateFlow()
    private val mutableSaveFailed = MutableStateFlow(false)
    override val saveFailed = mutableSaveFailed.asStateFlow()
    private var engine: AnalyticsEngine? = null
    private var lastScreen: UsageScreen? = null

    init {
        if (configured && readSavedConsent() && !activate()) persistConsent(false)
    }

    @Synchronized
    override fun setEnabled(enabled: Boolean) {
        if (!enabled) {
            val wasEnabled = mutableEnabled.value
            // Close the application gate before any SDK work, including reset.
            mutableEnabled.value = false
            lastScreen = null
            persistConsent(false)
            if (wasEnabled) stopAndReset()
            return
        }
        if (!configured || mutableEnabled.value || !persistConsent(true)) return
        if (!activate()) persistConsent(false)
    }

    @Synchronized
    override fun track(event: UsageEvent) {
        if (!mutableEnabled.value) return
        ignoreSdkFailure { engine?.track(event) }
    }

    @Synchronized
    override fun screen(screen: UsageScreen) {
        if (!mutableEnabled.value || screen == lastScreen) return
        ignoreSdkFailure {
            engine?.screen(screen)
            lastScreen = screen
        }
    }

    private fun activate(): Boolean = try {
        val current = engine ?: createEngine().also { engine = it }
        current.setCollectionEnabled(false)
        current.setAnalyticsConsent(true)
        current.setCollectionEnabled(true)
        mutableEnabled.value = true
        lastScreen = null
        true
    } catch (_: RuntimeException) {
        // Analytics failure must not prevent scanning or playback.
        mutableEnabled.value = false
        stopAndReset()
        false
    }

    private fun stopAndReset() {
        val current = engine ?: return
        ignoreSdkFailure { current.setCollectionEnabled(false) }
        ignoreSdkFailure { current.setAnalyticsConsent(false) }
        ignoreSdkFailure { current.resetData() }
    }

    private fun readSavedConsent(): Boolean = try {
        store.readEnabled()
    } catch (_: RuntimeException) {
        false
    }

    private fun persistConsent(enabled: Boolean): Boolean {
        val saved = try {
            store.writeEnabled(enabled)
        } catch (_: RuntimeException) {
            false
        }
        mutableSaveFailed.value = !saved
        return saved
    }

    private inline fun ignoreSdkFailure(operation: () -> Unit) {
        try {
            operation()
        } catch (_: RuntimeException) {
            // Never log SDK errors, identifiers, or arbitrary exception text.
        }
    }
}
