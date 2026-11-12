package pl.artifex.hiciarz.ui

import android.graphics.Rect
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInWindow
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.Dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.Flow

internal data class FoldGeometry(val bounds: Rect, val vertical: Boolean)
internal val LocalFoldGeometry = staticCompositionLocalOf<FoldGeometry?> { null }
internal val LocalPaneHeight = staticCompositionLocalOf<Dp?> { null }

@Composable
internal fun rememberFoldGeometry(): FoldGeometry? {
    val context = LocalContext.current
    val activity = context.activity()
    val layoutFlow: Flow<WindowLayoutInfo?> = remember(context, activity) {
        activity?.let { WindowInfoTracker.getOrCreate(context).windowLayoutInfo(it) }
            ?: flowOf(null)
    }
    val layout by layoutFlow.collectAsStateWithLifecycle(initialValue = null)
    val feature = layout?.displayFeatures?.filterIsInstance<FoldingFeature>()?.firstOrNull()
    return feature?.let { FoldGeometry(Rect(it.bounds), it.orientation == FoldingFeature.Orientation.VERTICAL) }
}

/** Each expanded pane has its own scroll position; content never straddles the actual fold. */
@Composable
internal fun AdaptivePanes(
    modifier: Modifier = Modifier,
    primary: @Composable ColumnScope.() -> Unit,
    secondary: @Composable ColumnScope.() -> Unit,
) {
    val fold = LocalFoldGeometry.current
    val density = LocalDensity.current
    var origin by remember { mutableStateOf(Offset.Zero) }
    BoxWithConstraints(modifier.fillMaxSize().onGloballyPositioned { origin = it.positionInWindow() }) {
        val hingeX = fold?.takeIf { it.vertical }?.let { with(density) { (it.bounds.left - origin.x).toDp() } }
        val hingeY = fold?.takeIf { !it.vertical }?.let { with(density) { (it.bounds.top - origin.y).toDp() } }
        val hingeWidth = fold?.takeIf { it.vertical }?.let { with(density) { it.bounds.width().toDp() } } ?: 0.dp
        val hingeHeight = fold?.takeIf { !it.vertical }?.let { with(density) { it.bounds.height().toDp() } } ?: 0.dp
        val gap = maxOf(24.dp, hingeWidth + 16.dp)
        val verticalFold = hingeX != null && hingeX > 240.dp && maxWidth - hingeX - hingeWidth > 240.dp
        val tabletop = hingeY != null && hingeY > 180.dp && maxHeight - hingeY - hingeHeight > 180.dp
        when {
            tabletop -> Column(Modifier.fillMaxSize()) {
                Pane(Modifier.fillMaxWidth().height(hingeY!! - 8.dp).testTag("primary-pane"), primary)
                Spacer(Modifier.height(maxOf(20.dp, hingeHeight + 16.dp)))
                Pane(Modifier.fillMaxWidth().weight(1f).testTag("secondary-pane"), secondary)
            }
            verticalFold || maxWidth >= 640.dp -> Row(Modifier.fillMaxSize()) {
                val left = if (verticalFold) Modifier.width(hingeX!! - gap / 2) else Modifier.weight(1f)
                Pane(left.fillMaxHeight().testTag("primary-pane"), primary)
                Spacer(Modifier.width(gap))
                Pane(Modifier.weight(1f).fillMaxHeight().testTag("secondary-pane"), secondary)
            }
            else -> Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp).padding(top = 8.dp, bottom = 28.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                primary()
                secondary()
            }
        }
    }
}

@Composable
private fun Pane(modifier: Modifier, content: @Composable ColumnScope.() -> Unit) {
    BoxWithConstraints(modifier) {
        CompositionLocalProvider(LocalPaneHeight provides maxHeight) {
            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp).padding(top = 8.dp, bottom = 28.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
                content = content,
            )
        }
    }
}
