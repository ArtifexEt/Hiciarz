package pl.artifex.hiciarz.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import pl.artifex.hiciarz.model.CardSkin
import kotlin.math.cos
import kotlin.math.sin

internal data class SkinPalette(val ink: Color, val paper: Color, val accent: Color)
internal fun CardSkin.palette(): SkinPalette = when (this) {
    CardSkin.CLASSIC -> SkinPalette(Color(0xFF42334F), Color(0xFFEEE4F4), Color(0xFFCDF27C))
    CardSkin.MINIMAL -> SkinPalette(Color(0xFF1E252B), Color(0xFFFAF8F1), Color(0xFFE9C286))
    CardSkin.VINYL -> SkinPalette(Color(0xFF382A24), Color(0xFFF5E6CD), Color(0xFFEEAE69))
    CardSkin.MIXTAPE -> SkinPalette(Color(0xFF183E46), Color(0xFFE4EEE8), Color(0xFFEFAC83))
    CardSkin.MEMPHIS -> SkinPalette(Color(0xFF30315B), Color(0xFFEEEBF7), Color(0xFFF2C95F))
    CardSkin.DISCO -> SkinPalette(Color(0xFF392A50), Color(0xFFF1E6F5), Color(0xFFD7B9EF))
    CardSkin.CHRISTMAS -> SkinPalette(Color(0xFF153F36), Color(0xFFFBF0DB), Color(0xFFE6BD76))
    CardSkin.WINTER -> SkinPalette(Color(0xFF233D5B), Color(0xFFEDF5FB), Color(0xFFB7DCF2))
    CardSkin.FISH -> SkinPalette(Color(0xFF073D3C), Color(0xFFFFF2DD), Color(0xFFE7BD70))
}

private fun CardSkin.frontAccent(): Color = when (this) {
    CardSkin.FISH, CardSkin.CHRISTMAS -> Color(0xFFAC864F)
    CardSkin.WINTER -> Color(0xFF6D90AD)
    CardSkin.VINYL -> Color(0xFFA96C3E)
    CardSkin.MIXTAPE -> Color(0xFF59847D)
    CardSkin.MEMPHIS -> Color(0xFF7978A1)
    CardSkin.DISCO -> Color(0xFF9672AC)
    else -> Color(0xFF8B7393)
}

// Same card-id hash, pastel palettes and ornaments as web/src/front.ts.
private val cardPastels = listOf(0xFFEADCF3, 0xFFD9EADC, 0xFFF5D9C7, 0xFFD6E7F4, 0xFFF0D9E0, 0xFFF3E7BD, 0xFFD5E9E6, 0xFFE2DFF3)
private val festivePastels = listOf(0xFFF5E5C6, 0xFFD9E8DA, 0xFFEFD6CE, 0xFFD6E8E2, 0xFFEDE0CD, 0xFFDCE4EF, 0xFFF2DCC9, 0xFFE3DFC8)
private val winterPastels = listOf(0xFFDCEBF5, 0xFFE3DFF2, 0xFFD8EAE7, 0xFFE8E5F5, 0xFFD6E3F0, 0xFFE5EDF1, 0xFFD7E8ED, 0xFFE9E0ED)
private val retroPastels = listOf(0xFFF5E6CD, 0xFFDFE9DC, 0xFFEFDBC8, 0xFFD9E7E6, 0xFFF2E4D2, 0xFFE6E5CE, 0xFFF1DCD3, 0xFFE4E7DA)
private val partyPastels = listOf(0xFFEEE4F3, 0xFFDFE9EE, 0xFFF3DFE7, 0xFFE7E4F6, 0xFFF3E7CE, 0xFFD8E9E3, 0xFFEDDFEC, 0xFFE6E8F2)

private fun CardSkin.frontPaper(cardId: String?): Color {
    if (cardId == null) return palette().paper
    var hash = 5381u
    cardId.codePoints().forEach { point ->
        val firstChar = if (point > 0xFFFF) Character.highSurrogate(point).code else point
        hash = hash * 33u + firstChar.toUInt()
    }
    val pastels = when (this) {
        CardSkin.FISH, CardSkin.CHRISTMAS -> festivePastels
        CardSkin.WINTER -> winterPastels
        CardSkin.VINYL, CardSkin.MIXTAPE -> retroPastels
        CardSkin.MEMPHIS, CardSkin.DISCO -> partyPastels
        else -> cardPastels
    }
    return Color(pastels[(hash % pastels.size.toUInt()).toInt()])
}

@Composable
private fun CardFrontPattern(skin: CardSkin, cardId: String?, modifier: Modifier) {
    val paper = skin.frontPaper(cardId)
    val accent = skin.frontAccent()
    Canvas(modifier.background(paper)) {
        val unit = size.minDimension / 60f
        listOf(2.7f to 3.5f, 3.8f to 2.7f).forEach { (inset, radius) ->
            val padding = inset * unit
            drawRoundRect(accent, Offset(padding, padding), Size(size.width - padding * 2, size.height - padding * 2),
                cornerRadius = CornerRadius(radius * unit), style = Stroke(.2f * unit))
        }
        listOf(Offset(size.width * .85f, size.height * 8 / 60), Offset(size.width * .15f, size.height * 52 / 60)).forEach { center ->
            withTransform({ translate(center.x, center.y); scale(unit, unit, Offset.Zero) }) {
                drawFrontOrnament(skin, accent)
            }
        }
    }
}

private fun DrawScope.drawFrontOrnament(skin: CardSkin, color: Color) {
    fun line(x: Float, y: Float, x2: Float, y2: Float) = drawLine(color, Offset(x, y), Offset(x2, y2), .2f)
    fun ellipse(x: Float, y: Float, rx: Float, ry: Float) =
        drawOval(color, Offset(x - rx, y - ry), Size(rx * 2, ry * 2), style = Stroke(.2f))
    when (skin) {
        CardSkin.FISH -> {
            line(-1f, -3f, -1f, -1.5f)
            ellipse(-.5f, 0f, 2.5f, 1.5f)
            line(2f, 0f, 3.5f, -1.4f); line(3.5f, -1.4f, 3.5f, 1.4f); line(3.5f, 1.4f, 2f, 0f)
            ellipse(-1.8f, -.3f, .16f, .16f)
        }
        CardSkin.WINTER -> {
            repeat(3) { a ->
                val angle = a * Math.PI / 3
                val x = (cos(angle) * 2.8).toFloat(); val y = (sin(angle) * 2.8).toFloat()
                line(-x, -y, x, y)
            }
            ellipse(0f, 0f, .6f, .6f)
        }
        CardSkin.CHRISTMAS -> {
            line(-3f, -2f, 3f, 2f)
            listOf(-2f, 0f, 2f).forEach { n ->
                line(n, n * .65f, n, n * .65f - 2)
                line(n, n * .65f, n - 1.8f, n * .65f + .4f)
            }
        }
        CardSkin.MIXTAPE -> {
            line(-3f, -1.9f, 3f, -1.9f); line(3f, -1.9f, 3f, 1.9f)
            line(3f, 1.9f, -3f, 1.9f); line(-3f, 1.9f, -3f, -1.9f)
            ellipse(-1.4f, 0f, .7f, .7f); ellipse(1.4f, 0f, .7f, .7f)
        }
        CardSkin.MEMPHIS -> {
            line(-3f, 1.8f, -1.5f, -1.8f); line(-1.5f, -1.8f, 0f, 1.8f)
            line(0f, 1.8f, 1.5f, -1.8f); line(1.5f, -1.8f, 3f, 1.8f)
        }
        CardSkin.DISCO -> {
            ellipse(0f, 0f, 2.6f, 2.6f); ellipse(0f, 0f, 1.2f, 2.6f)
            line(-2.6f, 0f, 2.6f, 0f); line(-2.1f, -1.5f, 2.1f, -1.5f); line(-2.1f, 1.5f, 2.1f, 1.5f)
        }
        CardSkin.MINIMAL -> {
            line(0f, -2.5f, 2.5f, 0f); line(2.5f, 0f, 0f, 2.5f)
            line(0f, 2.5f, -2.5f, 0f); line(-2.5f, 0f, 0f, -2.5f)
        }
        else -> { ellipse(0f, 0f, 3f, 3f); ellipse(0f, 0f, 1.8f, 1.8f); ellipse(0f, 0f, .45f, .45f) }
    }
}

/** A physical card keeps its square silhouette; unusually long answers may grow for legibility. */
@Composable
internal fun YearTicket(
    skin: CardSkin,
    year: String,
    eyebrow: String,
    title: String? = null,
    subtitle: String? = null,
    modifier: Modifier = Modifier,
    compact: Boolean = false,
    footer: String? = null,
    answerSide: Boolean = false,
    cardId: String? = null,
) {
    val palette = skin.palette()
    val ink = if (answerSide) palette.ink else palette.paper
    val accent = if (answerSide) skin.frontAccent() else palette.accent
    val shape = RoundedCornerShape(10.dp)
    BoxWithConstraints(modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        val cardWidth = minOf(maxWidth, if (compact) 220.dp else 260.dp)
        Box(Modifier.width(cardWidth).clip(shape)) {
            if (answerSide) CardFrontPattern(skin, cardId, Modifier.matchParentSize())
            else SkinPattern(skin, Modifier.matchParentSize(), subdued = true)
            Column(
                Modifier.fillMaxWidth().heightIn(min = cardWidth)
                    .padding(horizontal = cardWidth * .12f, vertical = cardWidth * .14f),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(year,
                    style = when {
                        year.length <= 6 -> MaterialTheme.typography.displayLarge
                        year.length <= 20 -> MaterialTheme.typography.headlineMedium
                        else -> MaterialTheme.typography.titleLarge
                    },
                    color = ink, textAlign = TextAlign.Center)
                if (!answerSide && eyebrow.isNotBlank()) {
                    Spacer(Modifier.height(10.dp))
                    Text(eyebrow, style = MaterialTheme.typography.titleSmall,
                        color = ink, textAlign = TextAlign.Center)
                }
                if (!title.isNullOrBlank()) {
                    Spacer(Modifier.height(12.dp))
                    Text(title, style = MaterialTheme.typography.titleSmall,
                        color = ink, textAlign = TextAlign.Center)
                }
                if (!subtitle.isNullOrBlank()) {
                    Spacer(Modifier.height(4.dp))
                    Text(subtitle, style = MaterialTheme.typography.bodySmall,
                        color = ink.copy(alpha = .78f), textAlign = TextAlign.Center)
                }
                if (!footer.isNullOrBlank()) {
                    Spacer(Modifier.height(12.dp))
                    Text(footer, style = MaterialTheme.typography.labelMedium,
                        color = accent, textAlign = TextAlign.Center)
                }
            }
        }
    }
}
