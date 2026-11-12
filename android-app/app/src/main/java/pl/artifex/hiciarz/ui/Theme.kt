package pl.artifex.hiciarz.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import pl.artifex.hiciarz.R
import pl.artifex.hiciarz.model.CardSkin

internal val Barlow = FontFamily(Font(R.font.barlow_condensed_semibold, FontWeight.SemiBold))
private val Noto = FontFamily(Font(R.font.noto_sans, FontWeight.Normal))

private val AppTypography = Typography(
    displayLarge = TextStyle(fontFamily = Barlow, fontWeight = FontWeight.SemiBold, fontSize = 84.sp, lineHeight = 86.sp),
    displayMedium = TextStyle(fontFamily = Barlow, fontWeight = FontWeight.SemiBold, fontSize = 64.sp, lineHeight = 66.sp),
    displaySmall = TextStyle(fontFamily = Barlow, fontWeight = FontWeight.SemiBold, fontSize = 48.sp, lineHeight = 51.sp),
    headlineLarge = TextStyle(fontFamily = Barlow, fontWeight = FontWeight.SemiBold, fontSize = 36.sp, lineHeight = 39.sp),
    headlineMedium = TextStyle(fontFamily = Barlow, fontWeight = FontWeight.SemiBold, fontSize = 30.sp, lineHeight = 33.sp),
    headlineSmall = TextStyle(fontFamily = Barlow, fontWeight = FontWeight.SemiBold, fontSize = 26.sp, lineHeight = 29.sp),
    titleLarge = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 20.sp, lineHeight = 27.sp),
    titleMedium = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 23.sp),
    titleSmall = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 20.sp),
    bodyLarge = TextStyle(fontFamily = Noto, fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontFamily = Noto, fontSize = 14.sp, lineHeight = 21.sp),
    bodySmall = TextStyle(fontFamily = Noto, fontSize = 12.sp, lineHeight = 18.sp),
    labelLarge = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 19.sp),
    labelMedium = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, lineHeight = 17.sp),
    labelSmall = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 11.sp, lineHeight = 15.sp),
)

@Composable
fun HiciarzTheme(skin: CardSkin = CardSkin.CLASSIC, content: @Composable () -> Unit) {
    val art = skin.palette()
    val colors = if (isSystemInDarkTheme()) darkColorScheme(
        primary = art.paper, onPrimary = art.ink,
        primaryContainer = art.ink, onPrimaryContainer = art.paper,
        secondary = Color(0xFFEBD59A), onSecondary = Color(0xFF3F3422),
        secondaryContainer = Color(0xFF514733), onSecondaryContainer = Color(0xFFFFE9B7),
        tertiary = Color(0xFFBDD1E8), tertiaryContainer = Color(0xFF334557),
        background = Color(0xFF181821), onBackground = Color(0xFFF1EFF7),
        surface = Color(0xFF22222D), onSurface = Color(0xFFF1EFF7),
        surfaceVariant = Color(0xFF30303E), onSurfaceVariant = Color(0xFFCAC7D5),
        outline = Color(0xFF9591A3), outlineVariant = Color(0xFF42414F),
        error = Color(0xFFFFB4AB), errorContainer = Color(0xFF633B39),
    ) else lightColorScheme(
        primary = art.ink, onPrimary = Color.White,
        primaryContainer = art.paper, onPrimaryContainer = art.ink,
        secondary = Color(0xFF5E4A25), onSecondary = Color.White,
        secondaryContainer = Color(0xFFF1DFB3), onSecondaryContainer = Color(0xFF453719),
        tertiary = Color(0xFF455C77), tertiaryContainer = Color(0xFFDCE8F3),
        background = Color(0xFFF1F0F6), onBackground = Color(0xFF222433),
        surface = Color(0xFFFCFBFF), onSurface = Color(0xFF222433),
        surfaceVariant = Color(0xFFE7E5EE), onSurfaceVariant = Color(0xFF656372),
        outline = Color(0xFF85818F), outlineVariant = Color(0xFFD6D2E0),
        error = Color(0xFF9E3D3C), errorContainer = Color(0xFFFFE0DB),
    )
    MaterialTheme(colorScheme = colors, typography = AppTypography, content = content)
}
