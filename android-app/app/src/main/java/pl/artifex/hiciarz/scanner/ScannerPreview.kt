package pl.artifex.hiciarz.scanner

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.SystemClock
import android.util.Log
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.FocusMeteringAction
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.ZoomState
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.Observer
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

data class ScannerCameraState(
    val hasTorch: Boolean,
    val zoomRatio: Float,
    val minZoomRatio: Float,
    val maxZoomRatio: Float,
)

/** One QR result per enabled session. Toggle enabled off/on to scan the next card. */
@Composable
@SuppressLint("ClickableViewAccessibility")
fun ScannerPreview(
    enabled: Boolean,
    onCode: (String) -> Unit,
    modifier: Modifier = Modifier,
    onError: (String) -> Unit = {},
    onReady: () -> Unit = {},
    torchEnabled: Boolean = false,
    zoomRatio: Float? = null,
    onCameraState: (ScannerCameraState) -> Unit = {},
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val currentOnCode = rememberUpdatedState(onCode)
    val currentOnError = rememberUpdatedState(onError)
    val currentOnReady = rememberUpdatedState(onReady)
    val currentOnCameraState = rememberUpdatedState(onCameraState)
    val currentEnabled = rememberUpdatedState(enabled)
    val previewView = remember(context) {
        PreviewView(context).apply {
            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
            scaleType = PreviewView.ScaleType.FILL_CENTER
        }
    }
    // Keep this across enabled sessions to avoid an immediate duplicate during recomposition.
    val recentCode = remember { RecentCode() }
    val boundCamera = remember { mutableStateOf<Camera?>(null) }

    AndroidView(factory = { previewView }, modifier = modifier)

    DisposableEffect(previewView) {
        val pinch = ScaleGestureDetector(context, object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
            override fun onScale(detector: ScaleGestureDetector): Boolean {
                val camera = boundCamera.value ?: return false
                val zoom = camera.cameraInfo.zoomState.value ?: return false
                val ratio = zoom.zoomRatio * detector.scaleFactor
                if (ratio.isFinite()) runCatching {
                    camera.cameraControl.setZoomRatio(ratio.coerceIn(zoom.minZoomRatio, zoom.maxZoomRatio))
                }
                return true
            }
        })
        val tap = GestureDetector(context, object : GestureDetector.SimpleOnGestureListener() {
            override fun onDown(event: MotionEvent): Boolean = true
            override fun onSingleTapUp(event: MotionEvent): Boolean {
                previewView.performClick()
                val camera = boundCamera.value ?: return false
                val point = previewView.meteringPointFactory.createPoint(event.x, event.y)
                val action = FocusMeteringAction.Builder(point)
                    .setAutoCancelDuration(3, TimeUnit.SECONDS).build()
                if (camera.cameraInfo.isFocusMeteringSupported(action))
                    runCatching { camera.cameraControl.startFocusAndMetering(action) }
                return true
            }
        })
        previewView.setOnTouchListener { _, event ->
            pinch.onTouchEvent(event)
            tap.onTouchEvent(event)
            previewView.parent?.requestDisallowInterceptTouchEvent(
                event.actionMasked != MotionEvent.ACTION_UP && event.actionMasked != MotionEvent.ACTION_CANCEL &&
                    (event.pointerCount > 1 || pinch.isInProgress),
            )
            true
        }
        onDispose { previewView.setOnTouchListener(null) }
    }

    LaunchedEffect(boundCamera.value, torchEnabled, zoomRatio) {
        val camera = boundCamera.value ?: return@LaunchedEffect
        if (camera.cameraInfo.hasFlashUnit()) runCatching { camera.cameraControl.enableTorch(torchEnabled) }
        val zoom = camera.cameraInfo.zoomState.value
        if (zoomRatio != null && zoomRatio.isFinite() && zoom != null) {
            val requested = zoomRatio.coerceIn(zoom.minZoomRatio, zoom.maxZoomRatio)
            if (kotlin.math.abs(requested - zoom.zoomRatio) > 0.001f)
                runCatching { camera.cameraControl.setZoomRatio(requested) }
        }
    }

    DisposableEffect(enabled, lifecycleOwner, previewView) {
        if (!enabled) return@DisposableEffect onDispose { }
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED
        ) {
            currentOnError.value("camera_permission_required")
            return@DisposableEffect onDispose { }
        }
        val disposed = AtomicBoolean(false)
        val emitted = AtomicBoolean(false)
        val errorEmitted = AtomicBoolean(false)
        val processing = AtomicBoolean(false)
        val frameReady = AtomicBoolean(false)
        val mainExecutor = ContextCompat.getMainExecutor(context)

        fun reportError(code: String) {
            if (!disposed.get() && errorEmitted.compareAndSet(false, true)) currentOnError.value(code)
        }

        val scanner = try {
            BarcodeScanning.getClient(
                BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build(),
            )
        } catch (_: RuntimeException) {
            reportError("camera_scan_failed")
            null
        } catch (_: LinkageError) {
            reportError("camera_scan_failed")
            null
        }
        if (scanner == null) return@DisposableEffect onDispose { disposed.set(true) }

        val executor = Executors.newSingleThreadExecutor()
        val scannerClosed = AtomicBoolean(false)
        val preview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }
        val analysis = ImageAnalysis.Builder()
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build()
        var provider: ProcessCameraProvider? = null
        var camera: Camera? = null
        var zoomObserver: Observer<ZoomState>? = null

        fun releaseScannerWhenIdle() {
            if (disposed.get() && !processing.get() && scannerClosed.compareAndSet(false, true)) {
                runCatching { scanner.close() }
            }
        }

        fun finishFrame(lease: FrameLease) {
            // ML Kit must finish reading the camera buffer before ImageProxy closes.
            // This also applies when the user leaves or folds the camera screen.
            lease.close()
            processing.set(false)
            releaseScannerWhenIdle()
        }

        fun reportFrameError() {
            if (lifecycleOwner.lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED))
                reportError("camera_scan_failed")
        }

        val lifecycleObserver = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_STOP) frameReady.set(false)
        }
        lifecycleOwner.lifecycle.addObserver(lifecycleObserver)

        @androidx.annotation.OptIn(ExperimentalGetImage::class)
        fun analyze(proxy: ImageProxy) {
            if (disposed.get() || emitted.get() || !currentEnabled.value
                || !lifecycleOwner.lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)
                || !processing.compareAndSet(false, true)
            ) {
                proxy.close()
                return
            }
            val lease = FrameLease(proxy)
            // Disposal may occur between the first check and claiming this frame.
            if (disposed.get()) {
                finishFrame(lease)
                return
            }
            try {
                val mediaImage = proxy.image
                if (mediaImage == null) {
                    finishFrame(lease)
                    return
                }
                val image = InputImage.fromMediaImage(mediaImage, proxy.imageInfo.rotationDegrees)
                scanner.process(image)
                    .addOnSuccessListener(mainExecutor) { codes ->
                        if (!disposed.get() && currentEnabled.value && !emitted.get()
                            && lifecycleOwner.lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)
                        ) {
                            if (frameReady.compareAndSet(false, true)) {
                                // A lifecycle-only marker lets the release smoke test verify
                                // real native frame processing. Never log an image or QR value.
                                Log.i("HiciarzScanner", "camera_ready")
                                currentOnReady.value()
                            }
                            val value = codes.firstNotNullOfOrNull { it.rawValue?.takeIf(String::isNotBlank) }
                            if (value != null && recentCode.accept(value)
                                && emitted.compareAndSet(false, true)
                            ) currentOnCode.value(value)
                        }
                    }
                    .addOnFailureListener(mainExecutor) {
                        // Never include frames, decoded content or ML Kit exception text in logs.
                        reportFrameError()
                    }
                    .addOnCompleteListener(mainExecutor) {
                        finishFrame(lease)
                    }
            } catch (_: Exception) {
                finishFrame(lease)
                mainExecutor.execute { reportFrameError() }
            } catch (_: LinkageError) {
                finishFrame(lease)
                mainExecutor.execute { reportFrameError() }
            }
        }

        analysis.setAnalyzer(executor, ::analyze)
        val cameraProvider = try {
            ProcessCameraProvider.getInstance(context)
        } catch (_: RuntimeException) {
            reportError("camera_unavailable")
            null
        }
        cameraProvider?.let { future -> future.addListener({
            if (!disposed.get()) {
                try {
                    val availableProvider = future.get()
                    provider = availableProvider
                    if (!availableProvider.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA)) {
                        reportError("camera_unavailable")
                    } else {
                        // Unbind only this component's use cases; leave other camera clients alone.
                        val availableCamera = availableProvider.bindToLifecycle(
                            lifecycleOwner,
                            CameraSelector.DEFAULT_BACK_CAMERA,
                            preview,
                            analysis,
                        )
                        camera = availableCamera
                        boundCamera.value = availableCamera
                        val observer = Observer<ZoomState> { zoom ->
                            if (!disposed.get()) currentOnCameraState.value(
                                ScannerCameraState(availableCamera.cameraInfo.hasFlashUnit(),
                                    zoom.zoomRatio, zoom.minZoomRatio, zoom.maxZoomRatio),
                            )
                        }
                        zoomObserver = observer
                        availableCamera.cameraInfo.zoomState.observe(lifecycleOwner, observer)
                    }
                } catch (_: SecurityException) {
                    reportError("camera_permission_required")
                } catch (_: Exception) {
                    reportError("camera_unavailable")
                }
            }
        }, mainExecutor) }

        onDispose {
            disposed.set(true)
            analysis.clearAnalyzer()
            lifecycleOwner.lifecycle.removeObserver(lifecycleObserver)
            zoomObserver?.let { camera?.cameraInfo?.zoomState?.removeObserver(it) }
            if (boundCamera.value === camera) boundCamera.value = null
            runCatching { camera?.cameraControl?.enableTorch(false) }
            runCatching { provider?.unbind(preview, analysis) }
            executor.shutdown()
            // An asynchronous decoder still owns its frame until onComplete.
            releaseScannerWhenIdle()
        }
    }
}

private class FrameLease(private val proxy: ImageProxy) {
    private val closed = AtomicBoolean(false)
    fun close() {
        if (closed.compareAndSet(false, true)) proxy.close()
    }
}

private class RecentCode {
    private var value: String? = null
    private var timeMs = 0L

    fun accept(candidate: String): Boolean {
        val now = SystemClock.elapsedRealtime()
        if (candidate == value && now - timeMs < 2_500L) return false
        value = candidate
        timeMs = now
        return true
    }
}
