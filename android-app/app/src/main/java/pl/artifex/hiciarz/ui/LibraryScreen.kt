package pl.artifex.hiciarz.ui

import android.content.ClipDescription
import android.view.DragAndDropPermissions
import android.view.DragEvent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.selectable
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import pl.artifex.hiciarz.model.*

@Composable
internal fun DecksScreen(state: AppState, copy: UiCopy, onAction: (AppAction) -> Unit, onImport: () -> Unit) {
    val drag = LibraryDropSupport(state.busy) { onAction(AppAction.ImportDeck(it)) }
    var deleting by remember { mutableStateOf<Deck?>(null) }
    AdaptivePanes(primary = {
        SectionTitle(copy.t("Twoje talie", "Your decks"))
        Surface(onClick = onImport, enabled = !state.busy, shape = ControlShape,
            color = if (drag) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
            border = BorderStroke(if (drag) 2.dp else 1.dp, MaterialTheme.colorScheme.outlineVariant)) {
            Row(Modifier.fillMaxWidth().heightIn(min = 72.dp).padding(16.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Icon(if (drag) AppIcons.Folder else AppIcons.Add, null, Modifier.size(26.dp),
                    tint = MaterialTheme.colorScheme.primary)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text(if (drag) copy.t("Upuść talię", "Drop your deck") else copy.t("Dodaj z pliku", "Import a deck"),
                        style = MaterialTheme.typography.titleSmall)
                    Text(copy.t("JSON lub CSV · przeciągnij lub wybierz", "JSON or CSV · drop or choose a file"),
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        Surface(shape = PanelShape, color = MaterialTheme.colorScheme.surface) {
            Column {
                state.decks.forEachIndexed { index, deck ->
                    if (index > 0) GroupDivider()
                    DeckRow(deck, deck.id == state.activeDeckId, copy,
                        onChoose = { if (deck.id != state.activeDeckId) onAction(AppAction.SelectDeck(deck.id)) },
                        onDelete = if (!deck.bundled) ({ deleting = deck }) else null)
                }
                if (state.decks.isEmpty()) Text(copy.t("Brak talii. Dodaj plik JSON lub CSV.", "No decks yet. Import a JSON or CSV file."),
                    Modifier.padding(20.dp), style = MaterialTheme.typography.bodyMedium)
            }
        }
    }, secondary = {
        state.activeDeck?.let { deck ->
            YearTicket(deck.skin, deck.songs.size.toString(), copy.t("Utwory w talii", "Tracks in this deck"),
                title = copy.deck(deck), subtitle = copy.mode(deck.gameMode), compact = true)
            Button(onClick = {
                onAction(AppAction.SetCardlessMode(if (deck.gameMode == GameMode.CLASSIC) CardlessMode.TIMELINE else CardlessMode.QUIZ))
                onAction(AppAction.SelectTab(AppTab.BINGO))
            },
                modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp), shape = ControlShape) {
                Icon(AppIcons.Game, null, Modifier.size(21.dp)); Spacer(Modifier.width(10.dp))
                Text(copy.t("Graj bez kart", "Play without cards"))
            }
            Text(copy.t("Talie są używane w grach bez kart i do odkrywania odpowiedzi zeskanowanych kart.",
                "Decks are used for cardless games and to reveal the answers on scanned cards."),
                style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    })
    deleting?.let { deck ->
        AlertDialog(onDismissRequest = { deleting = null },
            title = { Text(copy.t("Usunąć talię?", "Remove this deck?")) },
            text = { Text(copy.deck(deck)) },
            confirmButton = { TextButton(onClick = { onAction(AppAction.DeleteDeck(deck.id)); deleting = null }) { Text(copy.t("Usuń", "Remove")) } },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text(copy.t("Anuluj", "Cancel")) } })
    }
}

@Composable
internal fun DeckRow(deck: Deck, selected: Boolean, copy: UiCopy, onChoose: () -> Unit, onDelete: (() -> Unit)? = null) {
    Row(Modifier.fillMaxWidth().selectable(selected, onClick = onChoose, role = Role.RadioButton)
        .heightIn(min = 88.dp).padding(horizontal = 15.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(13.dp)) {
        Box(Modifier.size(50.dp)) {
            SkinPattern(deck.skin, Modifier.fillMaxSize())
            Icon(when (deck.gameMode) { GameMode.CLASSIC -> AppIcons.Record; GameMode.GAME -> AppIcons.Game; GameMode.MOVIE -> AppIcons.Play },
                null, Modifier.align(Alignment.Center).size(24.dp), tint = deck.skin.palette().paper)
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(copy.deck(deck), style = MaterialTheme.typography.titleSmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text(copy.mode(deck.gameMode) + " · " + songCount(deck.songs.size, copy),
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (selected) Icon(AppIcons.Check, copy.t("Wybrana talia", "Selected deck"),
            Modifier.size(21.dp), tint = MaterialTheme.colorScheme.primary)
        if (onDelete != null) IconButton(onClick = onDelete) {
            Icon(AppIcons.Delete, copy.t("Usuń talię", "Remove deck"), Modifier.size(20.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun LibraryDropSupport(importing: Boolean, onImport: (String) -> Unit): Boolean {
    val view = LocalView.current
    val activity = LocalContext.current.activity()
    val latestImport by rememberUpdatedState(onImport)
    val busy by rememberUpdatedState(importing)
    var over by remember { mutableStateOf(false) }
    val permissions = remember { mutableListOf<DragAndDropPermissions>() }
    LaunchedEffect(importing) {
        if (!importing) { permissions.forEach { it.release() }; permissions.clear() }
    }
    DisposableEffect(view, activity) {
        view.setOnDragListener { _, event ->
            when (event.action) {
                DragEvent.ACTION_DRAG_STARTED -> !busy && (event.clipDescription?.let { description ->
                    listOf("application/json", "text/csv", "text/comma-separated-values", "application/octet-stream", "text/plain", ClipDescription.MIMETYPE_TEXT_URILIST)
                        .any { description.hasMimeType(it) }
                } ?: false)
                DragEvent.ACTION_DRAG_ENTERED -> { over = true; true }
                DragEvent.ACTION_DRAG_EXITED, DragEvent.ACTION_DRAG_ENDED -> { over = false; true }
                DragEvent.ACTION_DROP -> {
                    over = false
                    if (busy) return@setOnDragListener false
                    val uri = event.clipData?.let { if (it.itemCount > 0) it.getItemAt(0).uri else null }
                    if (uri != null && uri.scheme == "content") {
                        activity?.requestDragAndDropPermissions(event)?.let(permissions::add)
                        latestImport(uri.toString()); true
                    } else false
                }
                else -> true
            }
        }
        onDispose { view.setOnDragListener(null); permissions.forEach { it.release() }; permissions.clear() }
    }
    return over
}
