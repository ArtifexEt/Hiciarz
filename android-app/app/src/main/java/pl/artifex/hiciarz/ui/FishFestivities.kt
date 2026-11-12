package pl.artifex.hiciarz.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.testTag
import kotlin.math.PI
import kotlin.math.sin

/** The web fish skin's swinging ornaments and glowing lights, using the same offline asset. */
@Composable
internal fun FishFestivities(modifier: Modifier = Modifier) {
    val ornament = rememberSkinArtwork("themes/fish-santa-ornament.webp") ?: return
    val transition = rememberInfiniteTransition(label = "Fish festivities")
    // Compose honors Android's animation-duration scale, including disabled animations.
    val phase = transition.animateFloat(0f, 1f,
        infiniteRepeatable(tween(6500, easing = LinearEasing), RepeatMode.Restart), label = "Fish swing")
    BoxWithConstraints(modifier.testTag("fish-festivities")) {
        Canvas(Modifier.fillMaxSize()) {
            val wire = Color(0xFFB18A4D)
            val unit = size.minDimension
            drawPath(Path().apply {
                moveTo(0f, unit * .025f)
                quadraticTo(size.width / 2, unit * .14f, size.width, unit * .025f)
            }, wire, style = Stroke(unit * .003f))
            listOf(.08f, .25f, .42f, .58f, .75f, .92f).forEachIndexed { index, x ->
                val center = Offset(size.width * x, unit * (.025f + .23f * x * (1f - x)))
                val glow = .5f + .5f * sin((phase.value * 2 * PI + index * PI / 3).toFloat())
                drawCircle(Color(0xFFFFDE95).copy(alpha = .06f + glow * .13f), unit * .026f, center)
                drawCircle(Color(0xFFFFDE95).copy(alpha = .5f + glow * .5f), unit * .009f, center)
            }
        }
        listOf(.1f to 1f, .68f to -1f).forEach { (x, direction) ->
            Image(ornament, contentDescription = null,
                modifier = Modifier.offset(x = maxWidth * x, y = maxWidth * .02f)
                    .width(maxWidth * .24f).aspectRatio(384f / 351f).graphicsLayer {
                        transformOrigin = TransformOrigin(.5f, 0f)
                        rotationZ = sin((phase.value * 2 * PI + x * PI).toFloat()) * 6.5f
                        scaleX = direction
                    })
        }
    }
}
