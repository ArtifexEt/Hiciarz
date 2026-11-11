package pl.artifex.hiciarz.scanner

import android.Manifest
import android.content.pm.PackageManager
import android.os.SystemClock
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

/** One QR result per enabled session. Toggle enabled off/on to scan the next card. */
@Composable
fun ScannerPreview(
    enabled: Boolean,
    onCode: (String) -> Unit,
    modifier: Modifier = Modifier,
    onError: (String) -> Unit = {},
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val currentOnCode = rememberUpdatedState(onCode)
    val currentOnError = rememberUpdatedState(onError)
    val currentEnabled = rememberUpdatedState(enabled)
    val previewView = remember(context) {
        PreviewView(context).apply {
            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
            scaleType = PreviewView.ScaleType.FILL_CENTER
        }
    }
    // Keep this across enabled sessions to avoid an immediate duplicate during recomposition.
    val recentCode = remember { RecentCode() }

    AndroidView(factory = { previewView }, modifier = modifier)

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
        val activeFrame = AtomicReference<FrameLease?>(null)
        val executor = Executors.newSingleThreadExecutor()
        val mainExecutor = ContextCompat.getMainExecutor(context)
        val scanner = BarcodeScanning.getClient(
            BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build(),
        )
        val preview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }
        val analysis = ImageAnalysis.Builder()
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build()
        var provider: ProcessCameraProvider? = null

        fun reportError(code: String) {
            if (!disposed.get() && errorEmitted.compareAndSet(false, true)) currentOnError.value(code)
        }

        @androidx.annotation.OptIn(ExperimentalGetImage::class)
        fun analyze(proxy: ImageProxy) {
            if (disposed.get() || emitted.get() || !currentEnabled.value
                || !processing.compareAndSet(false, true)
            ) {
                proxy.close()
                return
            }
            val lease = FrameLease(proxy)
            activeFrame.set(lease)
            val mediaImage = proxy.image
            if (mediaImage == null) {
                activeFrame.compareAndSet(lease, null)
                lease.close()
                processing.set(false)
                return
            }
            try {
                val image = InputImage.fromMediaImage(mediaImage, proxy.imageInfo.rotationDegrees)
                scanner.process(image)
                    .addOnSuccessListener(mainExecutor) { codes ->
                        if (!disposed.get() && currentEnabled.value && !emitted.get()) {
                            val value = codes.firstNotNullOfOrNull { it.rawValue?.takeIf(String::isNotBlank) }
                            if (value != null && recentCode.accept(value)
                                && emitted.compareAndSet(false, true)
                            ) currentOnCode.value(value)
                        }
                    }
                    .addOnFailureListener(mainExecutor) {
                        // Never include frames, decoded content or ML Kit exception text in logs.
                        reportError("camera_scan_failed")
                    }
                    .addOnCompleteListener(mainExecutor) {
                        activeFrame.compareAndSet(lease, null)
                        lease.close()
                        processing.set(false)
                    }
            } catch (_: Exception) {
                activeFrame.compareAndSet(lease, null)
                lease.close()
                processing.set(false)
                mainExecutor.execute { reportError("camera_scan_failed") }
            }
        }

        analysis.setAnalyzer(executor, ::analyze)
        val cameraProvider = ProcessCameraProvider.getInstance(context)
        cameraProvider.addListener({
            if (!disposed.get()) {
                try {
                    val availableProvider = cameraProvider.get()
                    provider = availableProvider
                    if (!availableProvider.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA)) {
                        reportError("camera_unavailable")
                    } else {
                        // Unbind only this component's use cases; leave other camera clients alone.
                        availableProvider.bindToLifecycle(
                            lifecycleOwner,
                            CameraSelector.DEFAULT_BACK_CAMERA,
                            preview,
                            analysis,
                        )
                    }
                } catch (_: SecurityException) {
                    reportError("camera_permission_required")
                } catch (_: Exception) {
                    reportError("camera_unavailable")
                }
            }
        }, mainExecutor)

        onDispose {
            disposed.set(true)
            analysis.clearAnalyzer()
            provider?.unbind(preview, analysis)
            scanner.close()
            activeFrame.getAndSet(null)?.close()
            executor.shutdown()
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
