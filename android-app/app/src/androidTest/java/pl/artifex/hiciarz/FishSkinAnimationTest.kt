package pl.artifex.hiciarz

import android.graphics.Bitmap
import androidx.compose.foundation.layout.size
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.dp
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import pl.artifex.hiciarz.model.CardSkin
import pl.artifex.hiciarz.ui.SkinPattern

class FishSkinAnimationTest {
    // UI smoke tests may disable system animations. This test explicitly exercises motion,
    // while production continues to honor the user's Android animation-duration scale.
    @get:Rule val compose = createComposeRule(effectContext = object : MotionDurationScale {
        override val scaleFactor = 1f
    })

    @Test fun fishOrnamentsKeepMovingOnTheCardBack() {
        // Start under manual time: autoAdvance's infinite-animation policy can cancel
        // an infinite transition created before the clock is switched to manual mode.
        compose.mainClock.autoAdvance = false
        compose.setContent { SkinPattern(CardSkin.FISH, Modifier.size(260.dp), subdued = true) }
        compose.waitUntil(10_000) {
            compose.mainClock.advanceTimeByFrame()
            compose.onAllNodesWithTag("fish-festivities").fetchSemanticsNodes().isNotEmpty()
        }
        compose.mainClock.advanceTimeBy(64)
        val beforeImage = compose.onNodeWithTag("fish-festivities").captureToImage()
        saveFrame(beforeImage, "fish-animation-before")
        val before = beforeImage.toPixelMap()

        compose.mainClock.advanceTimeBy(1600)
        compose.waitForIdle()

        val afterImage = compose.onNodeWithTag("fish-festivities").captureToImage()
        saveFrame(afterImage, "fish-animation-after")
        val after = afterImage.toPixelMap()
        var changed = 0
        for (y in 0 until before.height step 2) for (x in 0 until before.width step 2) {
            if (before[x, y] != after[x, y]) changed++
        }
        assertTrue("The fish artwork must animate after loading, without another scan (changed pixels: $changed)", changed > 100)
    }

    private fun saveFrame(image: ImageBitmap, name: String) {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val directory = File(context.filesDir, "screenshots").apply { mkdirs() }
        File(directory, "$name.png").outputStream().use {
            image.asAndroidBitmap().compress(Bitmap.CompressFormat.PNG, 100, it)
        }
    }
}
