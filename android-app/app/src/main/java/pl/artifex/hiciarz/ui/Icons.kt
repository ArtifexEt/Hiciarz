package pl.artifex.hiciarz.ui

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.dp

internal object AppIcons {
    private fun stroke(name: String, data: String) = ImageVector.Builder(
        name, 24.dp, 24.dp, 24f, 24f,
    ).addPath(
        PathParser().parsePathString(data).toNodes(),
        pathFillType = PathFillType.NonZero,
        fill = null,
        stroke = SolidColor(Color.Black),
        strokeLineWidth = 1.8f,
        strokeLineCap = StrokeCap.Round,
        strokeLineJoin = StrokeJoin.Round,
    ).build()

    private fun filled(name: String, data: String) = ImageVector.Builder(
        name, 24.dp, 24.dp, 24f, 24f,
    ).addPath(PathParser().parsePathString(data).toNodes(), fill = SolidColor(Color.Black)).build()

    val Scan = stroke("Scan", "M8 3H4a1 1 0 0 0-1 1v4M16 3h4a1 1 0 0 1 1 1v4M3 16v4a1 1 0 0 0 1 1h4M21 16v4a1 1 0 0 1-1 1h-4M7 7h3v3H7zM14 7h3v3h-3zM7 14h3v3H7zM14 14h1v3h2v-3")
    val Bingo = stroke("Bingo", "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2M9 3v18M15 3v18M3 9h18M3 15h18")
    val Decks = stroke("Decks", "M8 4h11a2 2 0 0 1 2 2v14a1 1 0 0 1-1 1H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2M3 17V5a3 3 0 0 1 3-3M10 9h7M10 13h7M10 17h4")
    val Settings = stroke("Settings", "M4 6h16M4 12h16M4 18h16M9 3v6M16 9v6M8 15v6")
    val Play = filled("Play", "M7 4.7a1 1 0 0 1 1.5-.86l11 6.3a2 2 0 0 1 0 3.46l-11 6.3A1 1 0 0 1 7 19V4.7z")
    val Pause = filled("Pause", "M6 4h4v16H6zM14 4h4v16h-4z")
    val Music = stroke("Music", "M9 18V5l11-2v13M9 8l11-2M9 18a3 2 0 1 1-6 0a3 2 0 0 1 6 0M20 16a3 2 0 1 1-6 0a3 2 0 0 1 6 0")
    val Record = stroke("Record", "M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0M15 12a3 3 0 1 1-6 0a3 3 0 0 1 6 0M6 10a6 6 0 0 1 4-4M18 14a6 6 0 0 1-4 4")
    val Arrow = stroke("Arrow", "M5 12h14M14 7l5 5-5 5")
    val Chevron = stroke("Chevron", "M9 6l6 6-6 6")
    val Close = stroke("Close", "M6 6l12 12M6 18L18 6")
    val Add = stroke("Add", "M12 5v14M5 12h14")
    val Check = stroke("Check", "M5 12l4 4L19 6")
    val Phone = stroke("Phone", "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2M10 5h4M11 19h2")
    val Eye = stroke("Eye", "M2 12s3-7 10-7s10 7 10 7s-3 7-10 7S2 12 2 12M15 12a3 3 0 1 1-6 0a3 3 0 0 1 6 0")
    val Link = stroke("Link", "M10 13l4-4M8 15l-1 1a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0M16 9l1-1a3 3 0 0 1 4 4l-4 4a3 3 0 0 1-4 0")
    val Camera = stroke("Camera", "M8 5l2-2h4l2 2h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4M16 13a4 4 0 1 1-8 0a4 4 0 0 1 8 0")
    val Shuffle = stroke("Shuffle", "M3 6h3l12 12h3M17 14l4 4-4 4M3 18h3l4-4M14 10l4-4h3M17 2l4 4-4 4")
    val Refresh = stroke("Refresh", "M20 8a8 8 0 1 0 .5 7M20 3v5h-5")
    val Folder = stroke("Folder", "M3 6V4a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z")
    val Delete = stroke("Delete", "M3 6h18M9 3h6M6 6l1 15h10l1-15M10 10v7M14 10v7")
    val Info = stroke("Info", "M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0M12 11v6M12 7v.1")

    val Game = stroke("Game", "M5 5h10a2 2 0 0 1 2 2v12H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2M7 3h12a2 2 0 0 1 2 2v12M7 9h6M10 8v6M8 17h4")
    val Back = stroke("Back", "M19 12H5M10 5l-7 7 7 7")
    val Help = stroke("Help", "M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0M9.5 8.5a2.5 2.5 0 1 1 4 2c-1.5 1-1.5 1.5-1.5 3M12 17v.1")
    val Speaker = stroke("Speaker", "M3 9h4l5-4v14l-5-4H3zM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14")
    val Timeline = stroke("Timeline", "M3 12h18M5 5h4v5H5zM11 14h4v5h-4zM17 5h4v5h-4z")
    val Palette = stroke("Palette", "M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.5-3.3a1.5 1.5 0 0 1 1.2-2.4H18a3 3 0 0 0 3-3.1A9 9 0 0 0 12 3M7 11v.1M9 7v.1M14 7v.1M17 11v.1")
    val Flash = stroke("Flash", "M13 2L4 14h7l-1 8 10-13h-7l1-7")
    val Trophy = stroke("Trophy", "M7 3h10v6a5 5 0 0 1-10 0V3M7 5H3v3a4 4 0 0 0 4 4M17 5h4v3a4 4 0 0 1-4 4M12 14v6M8 21h8")
}
