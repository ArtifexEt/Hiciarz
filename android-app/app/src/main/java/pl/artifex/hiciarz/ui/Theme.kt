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

private val AppTypography = Typography(
    displayLarge = TextStyle(fontFamily = Barlow, fontWeight = FontWeight.SemiBold, fontSize = 76.sp, lineHeight = 78.sp),
    displayMedium = TextStyle(fontFamily = Barlow, fontWeight = FontWeight.SemiBold, fontSize = 64.sp, lineHeight = 66.sp),
    displaySmall = TextStyle(fontFamily = Barlow, fontWeight = FontWeight.SemiBold, fontSize = 48.sp, lineHeight = 51.sp),
    headlineLarge = TextStyle(fontFamily = Barlow, fontWeight = FontWeight.SemiBold, fontSize = 32.sp, lineHeight = 36.sp),
    headlineMedium = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 24.sp, lineHeight = 31.sp),
    headlineSmall = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 20.sp, lineHeight = 27.sp),
    titleLarge = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 20.sp, lineHeight = 27.sp),
    titleMedium = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 23.sp),
    titleSmall = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 20.sp),
    bodyLarge = TextStyle(fontFamily = Noto, fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontFamily = Noto, fontSize = 14.sp, lineHeight = 21.sp),
    bodySmall = TextStyle(fontFamily = Noto, fontSize = 13.sp, lineHeight = 19.sp),
    labelLarge = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 19.sp),
    labelMedium = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, lineHeight = 18.sp),
    labelSmall = TextStyle(fontFamily = Noto, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, lineHeight = 17.sp),
)

@Composable
fun HiciarzTheme(content: @Composable () -> Unit) {
    // Card artwork owns its palette. App controls keep a familiar identity across every scan.
    val colors = if (isSystemInDarkTheme()) darkColorScheme(
        primary = Color(0xFFB2D9CA), onPrimary = Color(0xFF12382D),
        primaryContainer = Color(0xFF244A3E), onPrimaryContainer = Color(0xFFD7EBE1),
        secondary = Color(0xFFE2C48E), onSecondary = Color(0xFF3F3017),
        secondaryContainer = Color(0xFF4D4029), onSecondaryContainer = Color(0xFFF2DFBA),
        tertiary = Color(0xFFB8CEDB), tertiaryContainer = Color(0xFF2D4553),
        background = Color(0xFF111C18), onBackground = Color(0xFFE8EEE9),
        surface = Color(0xFF17251F), onSurface = Color(0xFFE8EEE9),
        surfaceVariant = Color(0xFF293A31), onSurfaceVariant = Color(0xFFBAC8BE),
        surfaceContainerLowest = Color(0xFF0D1713), surfaceContainerLow = Color(0xFF17251F),
        surfaceContainer = Color(0xFF1C2B23), surfaceContainerHigh = Color(0xFF23332A),
        surfaceContainerHighest = Color(0xFF293A31), surfaceBright = Color(0xFF324139),
        surfaceDim = Color(0xFF111C18), surfaceTint = Color(0xFFB2D9CA),
        outline = Color(0xFF84988B), outlineVariant = Color(0xFF34483B),
        error = Color(0xFFFFB4AB), errorContainer = Color(0xFF633B39),
    ) else lightColorScheme(
        primary = Color(0xFF17483D), onPrimary = Color.White,
        primaryContainer = Color(0xFFDDEAE3), onPrimaryContainer = Color(0xFF173E31),
        secondary = Color(0xFF725627), onSecondary = Color.White,
        secondaryContainer = Color(0xFFF0E5CD), onSecondaryContainer = Color(0xFF4B3819),
        tertiary = Color(0xFF415E6E), tertiaryContainer = Color(0xFFDCE8EE),
        background = Color(0xFFF5F6F3), onBackground = Color(0xFF1D2B24),
        surface = Color(0xFFFFFFFF), onSurface = Color(0xFF1D2B24),
        surfaceVariant = Color(0xFFE8EDE7), onSurfaceVariant = Color(0xFF5B6B60),
        surfaceContainerLowest = Color.White, surfaceContainerLow = Color(0xFFF0F3EE),
        surfaceContainer = Color(0xFFEAEFE8), surfaceContainerHigh = Color(0xFFE4EBE2),
        surfaceContainerHighest = Color(0xFFDDE5DC), surfaceBright = Color.White,
        surfaceDim = Color(0xFFDDE5DC), surfaceTint = Color(0xFF17483D),
        outline = Color(0xFF7E8E81), outlineVariant = Color(0xFFD5DED4),
        error = Color(0xFF9E3D3C), errorContainer = Color(0xFFFFE0DB),
    )
    MaterialTheme(colorScheme = colors, typography = AppTypography, content = content)
}
