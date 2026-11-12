package pl.artifex.hiciarz.ui

import androidx.compose.ui.graphics.Color
import pl.artifex.hiciarz.model.CardSkin

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
