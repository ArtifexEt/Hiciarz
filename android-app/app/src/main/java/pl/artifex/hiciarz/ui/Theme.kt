package pl.artifex.hiciarz.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
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

// App palettes follow web/style.css and app-layout.css. Card artwork has its own
// print palette: Classic's purple card, for example, still uses the green/gold UI.
private data class AppSkinPalette(
    val background: Color,
    val soft: Color,
    val accent: Color,
    val accentInk: Color,
    val sidebar: Color,
)

private fun CardSkin.appPalette(): AppSkinPalette = when (this) {
    CardSkin.CLASSIC -> AppSkinPalette(Color(0xFFF5F4EF), Color(0xFFEDF1EB), Color(0xFFEDBD75), Color(0xFF173F35), Color(0xFF123F36))
    CardSkin.MINIMAL -> AppSkinPalette(Color(0xFFF8F7F3), Color(0xFFEDF1EB), Color(0xFFE5C599), Color(0xFF41372B), Color(0xFF272A2B))
    CardSkin.VINYL -> AppSkinPalette(Color(0xFFF6F0E5), Color(0xFFF3EADA), Color(0xFFEEB77B), Color(0xFF442D1E), Color(0xFF342720))
    CardSkin.MIXTAPE -> AppSkinPalette(Color(0xFFF0F3EC), Color(0xFFE8EEE6), Color(0xFFEFB18B), Color(0xFF473025), Color(0xFF173C43))
    CardSkin.MEMPHIS -> AppSkinPalette(Color(0xFFF3F1F8), Color(0xFFEDEAF4), Color(0xFFEDCB72), Color(0xFF3C3221), Color(0xFF303053))
    CardSkin.DISCO -> AppSkinPalette(Color(0xFFF5F0F7), Color(0xFFEEE7F2), Color(0xFFD5BBE8), Color(0xFF3F2B52), Color(0xFF30243E))
    CardSkin.CHRISTMAS -> AppSkinPalette(Color(0xFFF5F3EB), Color(0xFFF1F3E9), Color(0xFFE5BF78), Color(0xFF453416), Color(0xFF12392F))
    CardSkin.WINTER -> AppSkinPalette(Color(0xFFF2F5F8), Color(0xFFEDF3F8), Color(0xFFB5D9ED), Color(0xFF1B3853), Color(0xFF1D324A))
    CardSkin.FISH -> AppSkinPalette(Color(0xFFF4F2E9), Color(0xFFF4F0E4), Color(0xFFEDBD75), Color(0xFF453316), Color(0xFF083935))
}

internal fun appColorScheme(skin: CardSkin, dark: Boolean): ColorScheme {
    val palette = skin.appPalette()
    val background = if (dark) lerp(palette.sidebar, Color.Black, .65f) else palette.background
    val ink = if (dark) palette.background else Color(0xFF202826)
    val primary = if (dark) lerp(palette.sidebar, Color.White, .76f) else palette.sidebar
    val surface = if (dark) lerp(background, primary, .045f) else Color.White
    val soft = if (dark) lerp(background, primary, .10f) else palette.soft
    val base = if (dark) darkColorScheme() else lightColorScheme()
    return base.copy(
        primary = primary, onPrimary = if (dark) background else Color.White,
        primaryContainer = if (dark) lerp(palette.sidebar, palette.accent, .12f) else palette.soft,
        onPrimaryContainer = if (dark) ink else palette.sidebar,
        secondary = palette.accent, onSecondary = palette.accentInk,
        secondaryContainer = lerp(palette.accent, background, if (dark) .84f else .70f),
        onSecondaryContainer = if (dark) lerp(palette.accent, Color.White, .25f) else palette.accentInk,
        tertiary = if (dark) palette.accent else palette.accentInk,
        onTertiary = if (dark) palette.accentInk else Color.White,
        tertiaryContainer = lerp(palette.accent, background, if (dark) .80f else .60f),
        onTertiaryContainer = if (dark) palette.background else palette.accentInk,
        background = background, onBackground = ink,
        surface = surface, onSurface = ink,
        surfaceVariant = soft,
        onSurfaceVariant = if (dark) lerp(ink, background, .24f) else Color(0xFF606A64),
        surfaceContainerLowest = if (dark) lerp(background, Color.Black, .20f) else Color.White,
        surfaceContainerLow = soft,
        surfaceContainer = if (dark) lerp(background, primary, .08f) else lerp(palette.soft, Color.White, .35f),
        surfaceContainerHigh = if (dark) lerp(background, primary, .12f) else palette.soft,
        surfaceContainerHighest = if (dark) lerp(background, primary, .16f) else lerp(palette.soft, palette.sidebar, .06f),
        surfaceBright = if (dark) lerp(background, primary, .20f) else Color.White,
        surfaceDim = if (dark) background else lerp(palette.soft, palette.sidebar, .06f),
        surfaceTint = primary,
        inverseSurface = palette.sidebar, inverseOnSurface = palette.background,
        inversePrimary = palette.accent,
        outline = lerp(background, if (dark) ink else palette.sidebar, .52f),
        outlineVariant = lerp(background, if (dark) primary else palette.sidebar, if (dark) .22f else .14f),
        error = if (dark) Color(0xFFFFB4AB) else Color(0xFF9E3D3C),
        onError = if (dark) Color(0xFF601410) else Color.White,
        errorContainer = if (dark) Color(0xFF633B39) else Color(0xFFFFE0DB),
        onErrorContainer = if (dark) Color(0xFFFFDAD6) else Color(0xFF410002),
    )
}

@Composable
fun HiciarzTheme(skin: CardSkin = CardSkin.CLASSIC, content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    val colors = remember(skin, dark) { appColorScheme(skin, dark) }
    MaterialTheme(colorScheme = colors, typography = AppTypography, content = content)
}
