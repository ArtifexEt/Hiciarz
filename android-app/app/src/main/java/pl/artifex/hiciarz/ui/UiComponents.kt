package pl.artifex.hiciarz.ui

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.selection.toggleable
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import pl.artifex.hiciarz.model.*

internal val PanelShape = RoundedCornerShape(16.dp)
internal val ControlShape = RoundedCornerShape(12.dp)

@Composable
internal fun SectionTitle(title: String, actionLabel: String? = null, onAction: (() -> Unit)? = null) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(title, style = MaterialTheme.typography.headlineLarge, modifier = Modifier.weight(1f).semantics { heading() })
        if (actionLabel != null && onAction != null) TextButton(onClick = onAction) { Text(actionLabel) }
    }
}

@Composable
internal fun SettingGroup(title: String, content: @Composable ColumnScope.() -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(title, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(start = 4.dp).semantics { heading() })
        Surface(shape = PanelShape, color = MaterialTheme.colorScheme.surface) {
            Column(Modifier.fillMaxWidth(), content = content)
        }
    }
}

@Composable
internal fun SettingRow(label: String, icon: ImageVector? = null, detail: String? = null, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).heightIn(min = 64.dp)
        .padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        if (icon != null) Icon(icon, null, Modifier.size(22.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(label, style = MaterialTheme.typography.bodyLarge)
            if (detail != null) Text(detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Icon(AppIcons.Chevron, null, Modifier.size(18.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
internal fun SwitchRow(label: String, checked: Boolean, hint: String? = null, onChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().toggleable(checked, role = Role.Switch, onValueChange = onChange)
        .heightIn(min = 60.dp).padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(label, style = MaterialTheme.typography.bodyLarge)
            if (hint != null) Text(hint, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = checked, onCheckedChange = null)
    }
}

@Composable
internal fun GroupDivider() = HorizontalDivider(
    Modifier.padding(horizontal = 18.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = .65f),
)

@Composable
internal fun DeckSelector(deck: Deck?, copy: UiCopy, onClick: () -> Unit) {
    Surface(onClick = onClick, shape = ControlShape, color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
        Row(Modifier.fillMaxWidth().heightIn(min = 64.dp).padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Icon(AppIcons.Decks, null, Modifier.size(22.dp), tint = MaterialTheme.colorScheme.primary)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(deck?.let(copy::deck) ?: copy.t("Wybierz talię", "Choose a deck"), style = MaterialTheme.typography.titleSmall,
                    maxLines = 2, overflow = TextOverflow.Ellipsis)
                if (deck != null) Text(songCount(deck.songs.size, copy), style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(AppIcons.Chevron, null, Modifier.size(18.dp))
        }
    }
}

@Composable
internal fun PlaybackControls(
    playback: PlaybackState,
    settings: AppSettings,
    copy: UiCopy,
    onAction: (AppAction) -> Unit,
    expectedUri: String? = null,
    playAction: AppAction = AppAction.Resume,
    modifier: Modifier = Modifier,
) {
    val matches = expectedUri == null || expectedUri == playback.trackUri
    val playing = matches && playback.isPlaying
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        FilledIconButton(
            onClick = { onAction(if (playing) AppAction.Pause else playAction) },
            enabled = playback.connection == ConnectionStatus.CONNECTED,
            modifier = Modifier.size(48.dp), shape = CircleShape,
            colors = IconButtonDefaults.filledIconButtonColors(
                containerColor = MaterialTheme.colorScheme.secondary,
                contentColor = MaterialTheme.colorScheme.onSecondary,
            ),
        ) {
            Icon(if (playing) AppIcons.Pause else AppIcons.Play,
                copy.t(if (playing) "Wstrzymaj" else "Odtwórz", if (playing) "Pause" else "Play"), Modifier.size(22.dp))
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(when {
                playback.connection == ConnectionStatus.CONNECTING -> copy.t("Łączenie ze Spotify…", "Connecting to Spotify…")
                playback.connection != ConnectionStatus.CONNECTED -> copy.t("Spotify niepołączone", "Spotify not connected")
                playing -> copy.t("Muzyka gra", "Music is playing")
                else -> copy.t("Posłuchaj utworu", "Listen to the track")
            },
                style = MaterialTheme.typography.titleSmall)
        }
        if (playback.connection == ConnectionStatus.CONNECTED)
            Text(if (matches) formatTime(playback.positionMs) else "0:00", style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (settings.autoPause) Surface(color = MaterialTheme.colorScheme.secondaryContainer, shape = CircleShape) {
            Text("${settings.clipSeconds} s", Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                style = MaterialTheme.typography.labelMedium)
        }
    }
}

/** Transport belongs to the scanned artwork, even when the QR has no answer metadata. */
@Composable
internal fun CardPlayback(
    playback: PlaybackState,
    song: Song,
    copy: UiCopy,
    onAction: (AppAction) -> Unit,
    modifier: Modifier = Modifier,
    answerVisible: Boolean = false,
    compact: Boolean = false,
    content: @Composable () -> Unit,
) {
    val playing = playback.isPlaying && playback.trackUri == song.spotifyUri
    Box(modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        Box(Modifier.widthIn(max = if (compact) 220.dp else 260.dp).fillMaxWidth().testTag("playback-card")) {
            content()
            FilledIconButton(
                onClick = { onAction(if (playing) AppAction.Pause else AppAction.PlayCard(song)) },
                enabled = playback.connection == ConnectionStatus.CONNECTED,
                modifier = Modifier.align(if (answerVisible) Alignment.TopEnd else Alignment.Center)
                    .padding(if (answerVisible) 4.dp else 0.dp)
                    .size(if (answerVisible) 48.dp else 64.dp).testTag("card-playback-toggle"),
                shape = CircleShape,
                colors = IconButtonDefaults.filledIconButtonColors(
                    containerColor = MaterialTheme.colorScheme.surface.copy(alpha = .94f),
                    contentColor = MaterialTheme.colorScheme.onSurface,
                    disabledContainerColor = MaterialTheme.colorScheme.surface.copy(alpha = .8f),
                    disabledContentColor = MaterialTheme.colorScheme.onSurface.copy(alpha = .38f),
                ),
            ) {
                Icon(if (playing) AppIcons.Pause else AppIcons.Play,
                    copy.t(if (playing) "Wstrzymaj" else "Odtwórz", if (playing) "Pause" else "Play"),
                    Modifier.size(if (answerVisible) 22.dp else 30.dp))
            }
        }
    }
}

internal fun songCount(count: Int, copy: UiCopy): String = copy.t(
    "$count " + when {
        count == 1 -> "utwór"
        count % 10 in 2..4 && count % 100 !in 12..14 -> "utwory"
        else -> "utworów"
    },
    "$count " + if (count == 1) "track" else "tracks",
)
internal fun formatTime(ms: Long): String = "%d:%02d".format((ms.coerceAtLeast(0) / 1000) / 60, (ms.coerceAtLeast(0) / 1000) % 60)

internal fun Context.activity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.activity()
    else -> null
}
internal fun openUrl(context: Context, url: String) {
    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
}
internal fun openSpotify(context: Context) {
    val launch = context.packageManager.getLaunchIntentForPackage("com.spotify.music")
    if (launch != null) runCatching { context.startActivity(launch) }
    else openUrl(context, "https://play.google.com/store/apps/details?id=com.spotify.music")
}
internal fun connectSpotify(state: PlaybackState, context: Context, onAction: (AppAction) -> Unit) {
    if (state.spotifyInstalled) onAction(AppAction.ConnectSpotify) else openSpotify(context)
}
