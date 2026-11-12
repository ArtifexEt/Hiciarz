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
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
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

/** Skins are read from the printed card; the pattern never contains answer metadata. */
@Composable
internal fun SkinPattern(skin: CardSkin, modifier: Modifier = Modifier, subdued: Boolean = false) {
    val palette = skin.palette()
    Canvas(modifier.clipToBounds().background(palette.ink)) {
        val accent = palette.accent.copy(alpha = if (subdued) .22f else .46f)
        val pale = palette.paper.copy(alpha = if (subdued) .09f else .18f)
        val unit = size.minDimension
        when (skin) {
            CardSkin.MINIMAL -> {
                drawLine(accent, Offset(unit * .12f, size.height * .15f), Offset(size.width - unit * .12f, size.height * .15f), 2.dp.toPx())
                drawLine(pale, Offset(unit * .12f, size.height * .85f), Offset(size.width - unit * .12f, size.height * .85f), 1.dp.toPx())
            }
            CardSkin.VINYL, CardSkin.CLASSIC -> {
                val center = Offset(size.width * .80f, size.height * .18f)
                repeat(10) { i -> drawCircle(if (i % 3 == 0) accent else pale, unit * (.18f + i * .072f), center, style = Stroke(1.4.dp.toPx())) }
                drawCircle(palette.accent, unit * .075f, center)
                drawCircle(palette.ink, unit * .018f, center)
            }
            CardSkin.MIXTAPE -> {
                val x = size.width * .67f; val y = size.height * .24f
                drawRoundRect(pale, Offset(x - unit * .25f, y - unit * .13f), Size(unit * .48f, unit * .27f), androidx.compose.ui.geometry.CornerRadius(unit * .04f))
                listOf(-.11f, .11f).forEach { delta -> drawCircle(accent, unit * .065f, Offset(x + unit * delta, y), style = Stroke(3.dp.toPx())) }
                repeat(5) { i -> drawLine(pale, Offset(size.width * .06f, size.height * .7f + i * 13.dp.toPx()), Offset(size.width * .3f, size.height * .7f + i * 13.dp.toPx()), 2.dp.toPx()) }
            }
            CardSkin.MEMPHIS -> {
                repeat(8) { i ->
                    val x = (i * .29f % 1f) * size.width
                    val y = (i * .37f % 1f) * size.height
                    drawCircle(if (i % 2 == 0) accent else pale, unit * .055f, Offset(x, y), style = Stroke(3.dp.toPx()))
                    drawLine(accent, Offset(x + unit * .06f, y + unit * .12f), Offset(x + unit * .16f, y + unit * .04f), 3.dp.toPx())
                }
            }
            CardSkin.DISCO -> {
                val center = Offset(size.width * .82f, size.height * .17f)
                drawCircle(pale, unit * .29f, center)
                repeat(7) { i ->
                    val d = (i - 3) * unit * .075f
                    drawLine(accent, Offset(center.x + d, center.y - unit * .25f), Offset(center.x + d, center.y + unit * .25f), 1.dp.toPx())
                    drawLine(accent, Offset(center.x - unit * .25f, center.y + d), Offset(center.x + unit * .25f, center.y + d), 1.dp.toPx())
                }
            }
            CardSkin.CHRISTMAS, CardSkin.WINTER -> {
                repeat(8) { i ->
                    val center = Offset((i * .31f % 1f) * size.width, (i * .39f % 1f) * size.height)
                    repeat(6) { arm ->
                        val angle = Math.PI / 3 * arm
                        val end = Offset(center.x + cos(angle).toFloat() * unit * .05f, center.y + sin(angle).toFloat() * unit * .05f)
                        drawLine(if (skin == CardSkin.CHRISTMAS) accent else pale, center, end, 1.4.dp.toPx())
                    }
                }
            }
            CardSkin.FISH -> {
                repeat(4) { i ->
                    val x = size.width * (.12f + i * .24f)
                    val y = size.height * if (i % 2 == 0) .12f else .87f
                    drawOval(accent, Offset(x, y), Size(unit * .14f, unit * .075f), style = Stroke(2.dp.toPx()))
                    val path = Path().apply {
                        moveTo(x, y + unit * .037f)
                        lineTo(x - unit * .05f, y)
                        lineTo(x - unit * .05f, y + unit * .075f)
                        close()
                    }
                    drawPath(path, pale)
                    drawCircle(palette.paper, unit * .008f, Offset(x + unit * .105f, y + unit * .03f))
                }
            }
        }
    }
}

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
) {
    val palette = skin.palette()
    val cutColor = MaterialTheme.colorScheme.background
    Box(modifier.fillMaxWidth().clip(RoundedCornerShape(if (compact) 18.dp else 28.dp))) {
        SkinPattern(skin, Modifier.matchParentSize(), subdued = true)
        Column(
            Modifier.fillMaxWidth().padding(if (compact) 18.dp else 26.dp)
                .heightIn(min = if (compact) 104.dp else 196.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.Start,
        ) {
            Text(eyebrow, style = MaterialTheme.typography.labelMedium, color = palette.paper.copy(alpha = .8f))
            Spacer(Modifier.height(if (compact) 7.dp else 13.dp))
            Text(year, style = if (year.length > 9) MaterialTheme.typography.headlineLarge else if (compact) MaterialTheme.typography.displaySmall else MaterialTheme.typography.displayLarge,
                color = palette.paper, textAlign = TextAlign.Start)
            if (!title.isNullOrBlank()) {
                Spacer(Modifier.height(8.dp))
                Text(title, style = MaterialTheme.typography.titleMedium, color = palette.paper)
            }
            if (!subtitle.isNullOrBlank()) {
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = palette.paper.copy(alpha = .74f))
            }
            if (!footer.isNullOrBlank()) {
                Spacer(Modifier.height(18.dp))
                Text(footer, style = MaterialTheme.typography.labelMedium, color = palette.accent)
            }
        }
        Canvas(Modifier.matchParentSize()) {
            val y = size.height * .75f
            val hole = 7.dp.toPx()
            // Die-cut notches echo a physical music card instead of a generic dashboard card.
            val cut = cutColor
            drawCircle(cut, hole, Offset(0f, y))
            drawCircle(cut, hole, Offset(size.width, y))
        }
    }
}
