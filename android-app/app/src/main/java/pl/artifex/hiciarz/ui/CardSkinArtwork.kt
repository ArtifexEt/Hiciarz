package pl.artifex.hiciarz.ui

import android.content.res.AssetManager
import android.graphics.BitmapFactory
import android.graphics.Picture
import android.graphics.RectF
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.painter.BitmapPainter
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import com.caverock.androidsvg.SVG
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import pl.artifex.hiciarz.model.CardSkin

// These are the same files used by web/src/themes.ts, copied into the APK at build time.
private fun CardSkin.artworkPath() = "themes/" + if (this == CardSkin.FISH) "fish-santa.webp" else "$id.svg"
private val skinPainters = ConcurrentHashMap<CardSkin, Painter>()

private class SvgSkinPainter(private val picture: Picture) : Painter() {
    override val intrinsicSize = Size(picture.width.toFloat(), picture.height.toFloat())
    override fun DrawScope.onDraw() {
        drawIntoCanvas { it.nativeCanvas.drawPicture(picture, RectF(0f, 0f, size.width, size.height)) }
    }
}

private fun loadSkinPainter(assets: AssetManager, skin: CardSkin): Painter =
    skinPainters.computeIfAbsent(skin) {
        assets.open(skin.artworkPath()).use { input ->
            if (skin == CardSkin.FISH) BitmapPainter(requireNotNull(BitmapFactory.decodeStream(input)).asImageBitmap())
            else SvgSkinPainter(SVG.getFromInputStream(input).renderToPicture(600, 600))
        }
    }

/** Shared, offline artwork for card backs, previews and skin choices. Never contains answer data. */
@Composable
internal fun SkinPattern(skin: CardSkin, modifier: Modifier = Modifier, subdued: Boolean = false) {
    val assets = LocalContext.current.applicationContext.assets
    val loaded by produceState(skinPainters[skin]?.let { skin to it }, assets, skin) {
        value = skin to withContext(Dispatchers.IO) { loadSkinPainter(assets, skin) }
    }
    val painter = loaded?.takeIf { it.first == skin }?.second
    Box(modifier.background(skin.palette().ink)) {
        painter?.let {
            Image(it, contentDescription = null, modifier = Modifier.fillMaxSize().testTag("skin-art-${skin.id}"),
                contentScale = ContentScale.Crop)
        }
        if (subdued) Box(Modifier.fillMaxSize().background(skin.palette().ink.copy(alpha = .10f)))
    }
}
