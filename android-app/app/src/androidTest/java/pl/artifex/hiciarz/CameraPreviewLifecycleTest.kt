package pl.artifex.hiciarz

import android.Manifest
import android.os.SystemClock
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.lifecycle.Lifecycle
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicInteger
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import pl.artifex.hiciarz.scanner.ScannerCameraState
import pl.artifex.hiciarz.scanner.ScannerPreview

/** Requires an emulated rear camera; no Google Play Services or account is used. */
@RunWith(AndroidJUnit4::class)
class CameraPreviewLifecycleTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun realCameraFramesSurviveBackgroundingAndRestartingThePreview() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        instrumentation.uiAutomation.grantRuntimePermission(
            instrumentation.targetContext.packageName, Manifest.permission.CAMERA,
        )
        val enabled = mutableStateOf(true)
        val ready = AtomicInteger()
        val failures = ConcurrentLinkedQueue<String>()
        val cameraStates = ConcurrentLinkedQueue<ScannerCameraState>()
        compose.setContent {
            ScannerPreview(
                enabled = enabled.value,
                onCode = {},
                modifier = Modifier.fillMaxSize(),
                onReady = { ready.incrementAndGet() },
                onError = { failures.add(it) },
                onCameraState = { cameraStates.add(it) },
            )
        }

        awaitFrames(ready, failures, after = 0)
        assertTrue("Camera must publish usable zoom bounds", cameraStates.any {
            it.minZoomRatio > 0f && it.zoomRatio >= it.minZoomRatio && it.zoomRatio <= it.maxZoomRatio
        })

        val beforeBackground = ready.get()
        compose.activityRule.scenario.moveToState(Lifecycle.State.CREATED)
        SystemClock.sleep(250)
        compose.activityRule.scenario.moveToState(Lifecycle.State.RESUMED)
        awaitFrames(ready, failures, after = beforeBackground)

        // Remount while analysis can still own a frame. No buffer is released before
        // the native ML Kit task completes; the next session must process frames too.
        repeat(2) {
            val beforeRestart = ready.get()
            compose.runOnIdle { enabled.value = false }
            compose.waitForIdle()
            compose.runOnIdle { enabled.value = true }
            awaitFrames(ready, failures, after = beforeRestart)
        }
        assertTrue("Camera failures: $failures", failures.isEmpty())
    }

    private fun awaitFrames(ready: AtomicInteger, failures: ConcurrentLinkedQueue<String>, after: Int) {
        compose.waitUntil(30_000) { ready.get() > after || failures.isNotEmpty() }
        assertTrue("Camera failures: $failures", failures.isEmpty())
        assertTrue("ML Kit must finish processing a live camera frame", ready.get() > after)
    }
}
