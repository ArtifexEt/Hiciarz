package pl.artifex.hiciarz.ui

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.widthIn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import kotlin.math.sin

/** Only the visible side is composed; longer answers settle into place while the card turns. */
@Composable
internal fun FlippingTicket(
    cardKey: Any,
    revealed: Boolean,
    modifier: Modifier = Modifier,
    content: @Composable (revealed: Boolean) -> Unit,
) {
    // A new song starts on its requested side, never on the preceding song's answer.
    key(cardKey) {
        // Compose's animation clock also honors Android's system animation-duration scale.
        val rotation = animateFloatAsState(
            targetValue = if (revealed) 180f else 0f,
            animationSpec = tween(durationMillis = 640, easing = CubicBezierEasing(.22f, .72f, .18f, 1f)),
            label = "Card flip",
        )
        val answerVisible by remember { derivedStateOf { rotation.value >= 90f } }
        Box(modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Box(
                Modifier.widthIn(max = 260.dp).fillMaxWidth().graphicsLayer {
                    val angle = rotation.value
                    val lift = sin(Math.toRadians(angle.toDouble())).toFloat()
                    rotationY = angle - if (answerVisible) 180f else 0f
                    cameraDistance = maxOf(size.width * 2.8f, 1200.dp.toPx())
                    scaleX = 1f - .025f * lift
                    scaleY = scaleX
                    translationY = -6.dp.toPx() * lift
                }.animateContentSize(animationSpec = tween(240)),
            ) {
                content(answerVisible)
            }
        }
    }
}
