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

internal val Barlow = FontFamily(Font(R.font.barlow_condensed_semibold, FontWeight.SemiBold))
private val Noto = FontFamily(Font(R.font.noto_sans, FontWeight.Normal))

private val LightColors = lightColorScheme(
    primary = Color(0xFF123F36), onPrimary = Color.White,
    primaryContainer = Color(0xFFDCEADF), onPrimaryContainer = Color(0xFF123F36),
    secondary = Color(0xFF735A33), onSecondary = Color.White,
    secondaryContainer = Color(0xFFF3DFBF), onSecondaryContainer = Color(0xFF49371D),
    tertiary = Color(0xFF62516D), tertiaryContainer = Color(0xFFEFE6F7),
    background = Color(0xFFF6F5F1), onBackground = Color(0xFF22262C),
    surface = Color(0xFFFFFEFA), onSurface = Color(0xFF22262C),
    surfaceVariant = Color(0xFFEDEFE9), onSurfaceVariant = Color(0xFF59615A),
    outline = Color(0xFF7B857C), outlineVariant = Color(0xFFDDE2D9),
    error = Color(0xFF9A382E), errorContainer = Color(0xFFF9E3DE),
)
private val DarkColors = darkColorScheme(
    primary = Color(0xFFB7D7BD), onPrimary = Color(0xFF10372D),
    primaryContainer = Color(0xFF244B3F), onPrimaryContainer = Color(0xFFDCEADF),
    secondary = Color(0xFFEDBD75), onSecondary = Color(0xFF49371D),
    secondaryContainer = Color(0xFF50432D), onSecondaryContainer = Color(0xFFF3DFBF),
    tertiary = Color(0xFFD1BDDE), tertiaryContainer = Color(0xFF473C51),
    background = Color(0xFF101C18), onBackground = Color(0xFFE8EDE5),
    surface = Color(0xFF182620), onSurface = Color(0xFFE8EDE5),
    surfaceVariant = Color(0xFF27372E), onSurfaceVariant = Color(0xFFB9C4B9),
    outline = Color(0xFF859789), outlineVariant = Color(0xFF34483A),
    error = Color(0xFFF2B8AE), errorContainer = Color(0xFF663C36),
)

private val AppTypography = Typography(
    displayLarge = TextStyle(fontFamily = Barlow, fontWeight = FontWeight.SemiBold, fontSize = 76.sp, lineHeight = 80.sp),
    displayMedium = TextStyle(fontFamily = Barlow, fontWeight = FontWeight.SemiBold, fontSize = 54.sp, lineHeight = 58.sp),
    displaySmall = TextStyle(fontFamily = Barlow, fontWeight = FontWeight.SemiBold, fontSize = 42.sp, lineHeight = 46.sp),
    headlineLarge = TextStyle(fontFamily = Barlow, fontWeight = FontWeight.SemiBold, fontSize = 34.sp, lineHeight = 38.sp),
    headlineMedium = TextStyle(fontFamily = Barlow, fontWeight = FontWeight.SemiBold, fontSize = 29.sp, lineHeight = 34.sp),
    headlineSmall = TextStyle(fontFamily = Barlow, fontWeight = FontWeight.SemiBold, fontSize = 25.sp, lineHeight = 30.sp),
    titleLarge = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 20.sp, lineHeight = 27.sp),
    titleMedium = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 23.sp),
    titleSmall = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 20.sp),
    bodyLarge = TextStyle(fontFamily = Noto, fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontFamily = Noto, fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 21.sp),
    bodySmall = TextStyle(fontFamily = Noto, fontWeight = FontWeight.Normal, fontSize = 12.sp, lineHeight = 18.sp),
    labelLarge = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 20.sp),
    labelMedium = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, lineHeight = 16.sp),
    labelSmall = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 11.sp, lineHeight = 16.sp),
)

@Composable
fun HiciarzTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        typography = AppTypography,
        content = content,
    )
}
