package pl.artifex.hiciarz.playback

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.content.ServiceConnection
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.ViewTreeObserver
import com.spotify.android.appremote.api.ConnectionParams
import com.spotify.android.appremote.api.Connector
import com.spotify.android.appremote.api.SpotifyAppRemote
import com.spotify.protocol.client.Debug
import com.spotify.protocol.client.Subscription
import com.spotify.protocol.client.error.RemoteClientException
import com.spotify.protocol.types.PlayerState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import pl.artifex.hiciarz.BuildConfig
import pl.artifex.hiciarz.model.ConnectionStatus
import pl.artifex.hiciarz.model.PlaybackState

/** Activity-scoped Spotify transport. It never requests a Web API token or a client secret. */
class SpotifyController(
    private val activity: Activity,
    private val clientIdProvider: () -> String,
) : PlaybackTransport, AutoCloseable {
    private val handler = Handler(Looper.getMainLooper())
    private val mutableState = MutableStateFlow(PlaybackState(spotifyInstalled = spotifyInstalled()))
    override val state: StateFlow<PlaybackState> = mutableState.asStateFlow()

    private var remote: SpotifyAppRemote? = null
    private var playerSubscription: Subscription<PlayerState>? = null
    private var closed = false
    private var generation = 0L
    private var commandGeneration = 0L
    private var transferGeneration = 0L
    private var connectPending = false
    private var connectScheduled = false
    private var pendingPlayUri: String? = null
    private var pendingResume = false
    private var pendingLocalTransfer = false
    private var transferInProgress = false
    private var capabilitiesChecked = false
    private var canPlayOnDemand: Boolean? = null
    private var positionAnchorMs = 0L
    private var positionAnchorElapsed = 0L

    private val focusListener = ViewTreeObserver.OnWindowFocusChangeListener { focused ->
        if (focused) scheduleVisibleConnection()
    }
    private val connectionTimeout = Runnable {
        if (!closed && mutableState.value.connection == ConnectionStatus.CONNECTING) {
            failConnection("connection_timeout")
        }
    }
    private val capabilityTimeout = Runnable {
        if (!closed && remote?.isConnected == true && !capabilitiesChecked) {
            capabilitiesChecked = true
            drainPendingCommands()
        }
    }
    private val transferTimeout = Runnable {
        if (!closed && transferInProgress) {
            ++transferGeneration
            transferInProgress = false
            pendingPlayUri = null
            pendingResume = false
            mutableState.value = mutableState.value.copy(error = "device_transfer_failed")
        }
    }
    private val progressTicker = object : Runnable {
        override fun run() {
            if (closed || mutableState.value.connection != ConnectionStatus.CONNECTED) return
            if (remote?.isConnected != true) {
                failConnection("spotify_disconnected")
                return
            }
            if (mutableState.value.isPlaying) {
                mutableState.value = mutableState.value.copy(
                    positionMs = positionAnchorMs + (SystemClock.elapsedRealtime() - positionAnchorElapsed),
                )
            }
            handler.postDelayed(this, 500L)
        }
    }

    init {
        // The SDK's diagnostic logger can include protocol payloads; keep it disabled in all builds.
        SpotifyAppRemote.setDebugMode(false)
        Debug.setLogger(null)
        activity.window.decorView.viewTreeObserver.addOnWindowFocusChangeListener(focusListener)
    }

    override fun connect() = onMain {
        if (closed) return@onMain
        if (remote?.isConnected == true) {
            mutableState.value = mutableState.value.copy(connection = ConnectionStatus.CONNECTED, error = null)
            drainPendingCommands()
            return@onMain
        }
        if (mutableState.value.connection == ConnectionStatus.CONNECTING) return@onMain
        // A disconnected SDK instance can still deliver a final subscription callback.
        // Invalidate it before starting a new session, retaining the user's queued action.
        if (remote != null || playerSubscription != null) releaseSession(clearPendingCommands = false)
        if (!spotifyInstalled()) {
            mutableState.value = mutableState.value.copy(
                connection = ConnectionStatus.DISCONNECTED,
                spotifyInstalled = false,
                error = "spotify_not_installed",
            )
            return@onMain
        }
        if (!CLIENT_ID.matches(clientIdProvider().trim())) {
            mutableState.value = mutableState.value.copy(error = "client_id_missing")
            return@onMain
        }
        mutableState.value = mutableState.value.copy(
            connection = ConnectionStatus.CONNECTING,
            spotifyInstalled = true,
            error = null,
        )
        connectPending = true
        scheduleVisibleConnection()
    }

    override fun play(uri: String) = onMain {
        if (closed) return@onMain
        if (!TRACK_URI.matches(uri)) {
            mutableState.value = mutableState.value.copy(error = "invalid_track")
            return@onMain
        }
        pendingPlayUri = uri
        pendingResume = false
        if (remote?.isConnected == true) drainPendingCommands() else connect()
    }

    override fun pause() = onMain {
        if (closed) return@onMain
        // A stop while authorization is pending must also cancel its queued playback.
        clearPendingPlayback()
        val connectedRemote = remote?.takeIf { it.isConnected } ?: return@onMain
        val currentGeneration = generation
        val command = ++commandGeneration
        runCatching {
            connectedRemote.playerApi.pause()
                .setResultCallback {
                    onMain {
                        if (isCurrent(currentGeneration, connectedRemote) && command == commandGeneration) {
                            mutableState.value = mutableState.value.copy(error = null)
                            refreshPlayerState(connectedRemote, currentGeneration)
                        }
                    }
                }.setErrorCallback { error ->
                    onMain { commandError(error, connectedRemote, currentGeneration, command) }
                }
        }.onFailure { commandError(it, connectedRemote, currentGeneration, command) }
    }

    /** Cancel work waiting for authorization or a device transfer without pausing other music. */
    override fun cancelPendingPlayback() = onMain {
        if (closed) return@onMain
        clearPendingPlayback()
    }

    override fun resume() = onMain {
        if (closed) return@onMain
        pendingPlayUri = null
        pendingResume = true
        if (remote?.isConnected == true) drainPendingCommands() else connect()
    }

    /** Transfer the account's existing playback to this phone, including its Bluetooth output. */
    override fun switchToPhone() = onMain {
        if (closed) return@onMain
        if (!transferInProgress) pendingLocalTransfer = true
        if (remote?.isConnected == true) drainPendingCommands() else connect()
    }

    override fun disconnect() = onMain {
        if (closed) return@onMain
        releaseSession()
        mutableState.value = PlaybackState(spotifyInstalled = spotifyInstalled())
    }

    override fun close() = onMain {
        if (closed) return@onMain
        closed = true
        releaseSession()
        val observer = activity.window.decorView.viewTreeObserver
        if (observer.isAlive) observer.removeOnWindowFocusChangeListener(focusListener)
        handler.removeCallbacksAndMessages(null)
    }

    private fun scheduleVisibleConnection() {
        if (closed || !connectPending || connectScheduled || !activity.hasWindowFocus()) return
        connectScheduled = true
        handler.postDelayed({
            connectScheduled = false
            if (!closed && connectPending && !activity.isFinishing && !activity.isDestroyed
                && activity.hasWindowFocus()
            ) startConnection()
        }, 350L)
    }

    private fun startConnection() {
        connectPending = false
        val currentGeneration = ++generation
        capabilitiesChecked = false
        canPlayOnDemand = null
        val clientId = clientIdProvider().trim()
        if (!CLIENT_ID.matches(clientId)) {
            failConnection("client_id_missing")
            return
        }
        val params = ConnectionParams.Builder(clientId)
            .setRedirectUri(BuildConfig.SPOTIFY_REDIRECT_URI)
            .showAuthView(true)
            .build()
        // A visible Android 14+ client must explicitly allow its bound Spotify service
        // to display authorization. Limit this opt-in to Spotify's own package.
        val sdkContext = object : ContextWrapper(activity.applicationContext) {
            override fun getApplicationContext(): Context = this

            override fun bindService(intent: Intent, connection: ServiceConnection, flags: Int): Boolean {
                val spotifyAuth = Build.VERSION.SDK_INT >= 34 && intent.`package` == SPOTIFY_PACKAGE
                return super.bindService(
                    intent,
                    connection,
                    if (spotifyAuth) flags or Context.BIND_ALLOW_ACTIVITY_STARTS else flags,
                )
            }
        }
        handler.removeCallbacks(connectionTimeout)
        handler.postDelayed(connectionTimeout, 90_000L)
        runCatching {
            SpotifyAppRemote.connect(sdkContext, params, object : Connector.ConnectionListener {
                override fun onConnected(appRemote: SpotifyAppRemote) = onMain {
                    if (closed || currentGeneration != generation) {
                        SpotifyAppRemote.disconnect(appRemote)
                        return@onMain
                    }
                    // SDK user-status updates may repeat onConnected for the same transport.
                    if (remote === appRemote && mutableState.value.connection == ConnectionStatus.CONNECTED) {
                        return@onMain
                    }
                    handler.removeCallbacks(connectionTimeout)
                    remote = appRemote
                    mutableState.value = mutableState.value.copy(
                        connection = ConnectionStatus.CONNECTED,
                        spotifyInstalled = true,
                        error = null,
                    )
                    if (!runCatching { subscribeToPlayer(appRemote, currentGeneration) }
                            .onFailure { failConnection(errorCode(it)) }.isSuccess
                    ) return@onMain
                    refreshPlayerState(appRemote, currentGeneration)
                    handler.removeCallbacks(progressTicker)
                    handler.post(progressTicker)
                    handler.removeCallbacks(capabilityTimeout)
                    handler.postDelayed(capabilityTimeout, 6_000L)
                    runCatching {
                        appRemote.userApi.capabilities
                            .setResultCallback { capabilities ->
                                onMain {
                                    if (!isCurrent(currentGeneration, appRemote)) return@onMain
                                    capabilitiesChecked = true
                                    handler.removeCallbacks(capabilityTimeout)
                                    canPlayOnDemand = capabilities.canPlayOnDemand
                                    drainPendingCommands()
                                }
                            }.setErrorCallback {
                                onMain {
                                    if (!isCurrent(currentGeneration, appRemote)) return@onMain
                                    // If capability lookup is unavailable, let the actual command
                                    // return its specific permission or playback error.
                                    capabilitiesChecked = true
                                    handler.removeCallbacks(capabilityTimeout)
                                    drainPendingCommands()
                                }
                            }
                    }.onFailure {
                        capabilitiesChecked = true
                        handler.removeCallbacks(capabilityTimeout)
                        drainPendingCommands()
                    }
                }

                override fun onFailure(error: Throwable) = onMain {
                    if (!closed && currentGeneration == generation) failConnection(errorCode(error))
                }
            })
        }.onFailure {
            if (!closed && currentGeneration == generation) failConnection(errorCode(it))
        }
    }

    private fun subscribeToPlayer(appRemote: SpotifyAppRemote, currentGeneration: Long) {
        val subscription = appRemote.playerApi.subscribeToPlayerState()
        playerSubscription = subscription
        subscription.setEventCallback { value ->
            onMain { if (isCurrent(currentGeneration, appRemote)) updatePlayerState(value) }
        }
        subscription.setErrorCallback { error ->
            onMain { if (isCurrent(currentGeneration, appRemote)) failConnection(errorCode(error)) }
        }
        subscription.setLifecycleCallback(object : Subscription.LifecycleCallback {
            override fun onStart() = Unit
            override fun onStop() = onMain {
                if (isCurrent(currentGeneration, appRemote) && playerSubscription === subscription) {
                    failConnection("spotify_disconnected")
                }
            }
        })
    }

    private fun refreshPlayerState(appRemote: SpotifyAppRemote, currentGeneration: Long) {
        runCatching {
            appRemote.playerApi.playerState.setResultCallback { value ->
                onMain { if (isCurrent(currentGeneration, appRemote)) updatePlayerState(value) }
            }.setErrorCallback { error ->
                onMain {
                    if (isCurrent(currentGeneration, appRemote) && !appRemote.isConnected) {
                        failConnection(errorCode(error))
                    }
                }
            }
        }.onFailure {
            if (isCurrent(currentGeneration, appRemote)) failConnection(errorCode(it))
        }
    }

    private fun updatePlayerState(value: PlayerState) {
        positionAnchorMs = value.playbackPosition.coerceAtLeast(0L)
        positionAnchorElapsed = SystemClock.elapsedRealtime()
        mutableState.value = mutableState.value.copy(
            isPlaying = !value.isPaused,
            positionMs = positionAnchorMs,
            trackUri = value.track?.uri,
        )
    }

    private fun drainPendingCommands() {
        val appRemote = remote?.takeIf { it.isConnected } ?: return
        if (!capabilitiesChecked || closed || transferInProgress) return
        if (pendingLocalTransfer) {
            pendingLocalTransfer = false
            transferInProgress = true
            val currentGeneration = generation
            val transfer = ++transferGeneration
            handler.removeCallbacks(transferTimeout)
            handler.postDelayed(transferTimeout, 25_000L)
            runCatching {
                appRemote.connectApi.connectSwitchToLocalDevice()
                    .setResultCallback {
                        onMain {
                            if (isCurrent(currentGeneration, appRemote) && transfer == transferGeneration) {
                                handler.removeCallbacks(transferTimeout)
                                transferInProgress = false
                                mutableState.value = mutableState.value.copy(error = null)
                                drainPendingCommands()
                            }
                        }
                    }.setErrorCallback { error ->
                        onMain {
                            if (isCurrent(currentGeneration, appRemote) && transfer == transferGeneration) {
                                handler.removeCallbacks(transferTimeout)
                                transferInProgress = false
                                pendingPlayUri = null
                                pendingResume = false
                                mutableState.value = mutableState.value.copy(error = errorCode(error, "device_transfer_failed"))
                            }
                        }
                    }
            }.onFailure {
                handler.removeCallbacks(transferTimeout)
                transferInProgress = false
                pendingPlayUri = null
                pendingResume = false
                mutableState.value = mutableState.value.copy(error = errorCode(it, "device_transfer_failed"))
            }
            return
        }
        val uri = pendingPlayUri
        val resume = pendingResume
        if (uri == null && !resume) return
        pendingPlayUri = null
        pendingResume = false
        if (uri != null && canPlayOnDemand == false) {
            mutableState.value = mutableState.value.copy(error = "premium_required")
            return
        }
        val currentGeneration = generation
        val command = ++commandGeneration
        mutableState.value = mutableState.value.copy(error = null)
        runCatching {
            val result = if (uri != null) appRemote.playerApi.play(uri) else appRemote.playerApi.resume()
            result.setResultCallback {
                onMain {
                    if (isCurrent(currentGeneration, appRemote) && command == commandGeneration) {
                        mutableState.value = mutableState.value.copy(error = null)
                        refreshPlayerState(appRemote, currentGeneration)
                    }
                }
            }.setErrorCallback { error ->
                onMain { commandError(error, appRemote, currentGeneration, command) }
            }
        }.onFailure { commandError(it, appRemote, currentGeneration, command) }
    }

    private fun commandError(
        error: Throwable,
        appRemote: SpotifyAppRemote,
        currentGeneration: Long,
        command: Long,
    ) {
        if (!isCurrent(currentGeneration, appRemote) || command != commandGeneration) return
        if (!appRemote.isConnected) failConnection("spotify_disconnected")
        else mutableState.value = mutableState.value.copy(error = errorCode(error, "playback_failed"))
    }

    private fun clearPendingPlayback() {
        pendingPlayUri = null
        pendingResume = false
        pendingLocalTransfer = false
        transferInProgress = false
        ++transferGeneration
        handler.removeCallbacks(transferTimeout)
    }

    private fun failConnection(code: String) {
        releaseSession()
        mutableState.value = mutableState.value.copy(
            connection = ConnectionStatus.DISCONNECTED,
            isPlaying = false,
            error = code,
            spotifyInstalled = spotifyInstalled(),
        )
    }

    private fun releaseSession(clearPendingCommands: Boolean = true) {
        ++generation
        ++commandGeneration
        ++transferGeneration
        connectPending = false
        connectScheduled = false
        if (clearPendingCommands) {
            pendingPlayUri = null
            pendingResume = false
            pendingLocalTransfer = false
        } else {
            pendingLocalTransfer = pendingLocalTransfer || transferInProgress
        }
        transferInProgress = false
        capabilitiesChecked = false
        canPlayOnDemand = null
        handler.removeCallbacks(connectionTimeout)
        handler.removeCallbacks(capabilityTimeout)
        handler.removeCallbacks(transferTimeout)
        handler.removeCallbacks(progressTicker)
        val subscription = playerSubscription
        playerSubscription = null
        runCatching { subscription?.cancel() }
        val oldRemote = remote
        remote = null
        runCatching { if (oldRemote != null) SpotifyAppRemote.disconnect(oldRemote) }
    }

    private fun isCurrent(currentGeneration: Long, appRemote: SpotifyAppRemote): Boolean =
        !closed && generation == currentGeneration && remote === appRemote

    private fun spotifyInstalled(): Boolean =
        runCatching { SpotifyAppRemote.isSpotifyInstalled(activity) }.getOrDefault(false)

    private fun onMain(action: () -> Unit) {
        if (Looper.myLooper() == Looper.getMainLooper()) action() else handler.post(action)
    }

    private fun errorCode(error: Throwable, fallback: String = "connection_failed"): String {
        var current: Throwable? = error
        repeat(6) {
            when (current?.javaClass?.simpleName) {
                "CouldNotFindSpotifyApp" -> return "spotify_not_installed"
                "UserNotAuthorizedException", "AuthenticationFailedException" -> return "not_authorized"
                "NotLoggedInException" -> return "spotify_login_required"
                "OfflineModeException" -> return "spotify_offline"
                "UnsupportedFeatureVersionException" -> return "spotify_update_required"
                "SpotifyDisconnectedException", "SpotifyConnectionTerminatedException" -> return "spotify_disconnected"
            }
            val reason = (current as? RemoteClientException)?.reasonUri.orEmpty().lowercase()
            when {
                "premium" in reason -> return "premium_required"
                "user_not_authorized" in reason || "authentication_failed" in reason -> return "not_authorized"
                "not_logged_in" in reason -> return "spotify_login_required"
                "offline" in reason -> return "spotify_offline"
            }
            current = current?.cause
        }
        return fallback
    }

    private companion object {
        const val SPOTIFY_PACKAGE = "com.spotify.music"
        val CLIENT_ID = Regex("[A-Fa-f0-9]{32}")
        val TRACK_URI = Regex("spotify:track:[A-Za-z0-9]{22}")
    }
}
