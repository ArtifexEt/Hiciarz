@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package pl.artifex.hiciarz.ui

import android.content.Intent
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import pl.artifex.hiciarz.R
import pl.artifex.hiciarz.model.*

private enum class AppSheet { PLAYBACK, DECKS, LICENSES, SKINS }

@Composable
fun HiciarzApp(state: AppState, onAction: (AppAction) -> Unit) {
    HiciarzTheme(state.activeSkin) {
        val copy = remember(state.settings.language) { UiCopy(state.settings.language) }
        val snackbar = remember { SnackbarHostState() }
        var sheet by rememberSaveable { mutableStateOf<AppSheet?>(null) }
        var help by rememberSaveable { mutableStateOf<HelpTopic?>(null) }
        var manual by rememberSaveable { mutableStateOf(false) }
        val context = LocalContext.current
        val fold = rememberFoldGeometry()
        val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri != null) {
                runCatching { context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) }
                onAction(AppAction.ImportDeck(uri.toString()))
            }
        }
        val importFile = { picker.launch(arrayOf("application/json", "text/csv", "text/comma-separated-values", "application/octet-stream", "text/plain")) }
        LaunchedEffect(state.message, copy.language) {
            state.message?.let { snackbar.showSnackbar(copy.message(it)); onAction(AppAction.DismissMessage) }
        }
        BackHandler(help != null) { help = null }
        BackHandler(help == null && !manual && sheet == null && state.tab == AppTab.BINGO &&
            state.cardlessMode == CardlessMode.BINGO && state.bingoStage == BingoStage.SCAN) {
            onAction(AppAction.CancelBingoScan)
        }
        CompositionLocalProvider(LocalFoldGeometry provides fold) {
            BoxWithConstraints(Modifier.fillMaxSize()) {
                val expanded = maxWidth >= 600.dp
                val chooseTab: (AppTab) -> Unit = { help = null; onAction(AppAction.SelectTab(it)) }
                Row(Modifier.fillMaxSize()) {
                    if (expanded) AppRail(state.tab, copy, chooseTab)
                    Scaffold(
                        modifier = Modifier.weight(1f),
                        containerColor = MaterialTheme.colorScheme.background,
                        topBar = {
                            AppToolbar(copy, help,
                                onBack = { help = null },
                                onHelp = { help = HelpTopic.forState(state) },
                                onAudio = { sheet = AppSheet.PLAYBACK },
                                playback = state.playback, expanded = expanded)
                        },
                        bottomBar = {
                            Column {
                                if (state.playback.connection == ConnectionStatus.CONNECTED)
                                    MiniPlayer(state.playback, copy, onAction) { sheet = AppSheet.PLAYBACK }
                                if (!expanded) AppBottomBar(state.tab, copy, chooseTab)
                            }
                        },
                        snackbarHost = { SnackbarHost(snackbar) },
                    ) { padding ->
                        Box(Modifier.fillMaxSize().padding(padding).consumeWindowInsets(padding)) {
                            if (help != null) HelpScreen(help!!, copy, state.bingoLevel) { help = it }
                            else when (state.tab) {
                                AppTab.BINGO -> GamesScreen(state, copy, onAction,
                                    onDeck = { sheet = AppSheet.DECKS }, onHelp = { help = it },
                                    onManual = { manual = true }, cameraActive = !manual && sheet == null)
                                AppTab.SCAN -> ScanScreen(state, copy, onAction,
                                    onManual = { manual = true }, onSkin = { sheet = AppSheet.SKINS },
                                    cameraActive = !manual && sheet == null)
                                AppTab.DECKS -> DecksScreen(state, copy, onAction, importFile)
                                AppTab.SETTINGS -> SettingsScreen(state, copy, onAction,
                                    onAudio = { sheet = AppSheet.PLAYBACK },
                                    onSkin = { sheet = AppSheet.SKINS },
                                    onLicenses = { sheet = AppSheet.LICENSES },
                                    onHelp = { help = HelpTopic.ALL })
                            }
                            if (state.busy) LinearProgressIndicator(Modifier.fillMaxWidth().align(Alignment.TopCenter))
                        }
                    }
                }
            }
        }
        if (manual) ManualEntryDialog(copy, { manual = false }) {
            manual = false; onAction(AppAction.ScanCode(it))
        }
        when (sheet) {
            AppSheet.PLAYBACK -> ModalBottomSheet(onDismissRequest = { sheet = null }) {
                PlaybackSheet(state, copy, onAction) { help = HelpTopic.AUDIO; sheet = null }
            }
            AppSheet.DECKS -> ModalBottomSheet(onDismissRequest = { sheet = null }) {
                DeckSelectionSheet(state, copy) {
                    if (it.id != state.activeDeckId) onAction(AppAction.SelectDeck(it.id))
                    sheet = null
                }
            }
            AppSheet.SKINS -> ModalBottomSheet(onDismissRequest = { sheet = null }) {
                SkinSelectionSheet(state, copy, onAction)
            }
            AppSheet.LICENSES -> FontLicensesDialog(copy) { sheet = null }
            null -> Unit
        }
    }
}

private fun tabIcon(tab: AppTab): ImageVector = when (tab) {
    AppTab.BINGO -> AppIcons.Game
    AppTab.SCAN -> AppIcons.Scan
    AppTab.DECKS -> AppIcons.Decks
    AppTab.SETTINGS -> AppIcons.Settings
}

@Composable
private fun AppBottomBar(selected: AppTab, copy: UiCopy, onChoose: (AppTab) -> Unit) {
    NavigationBar(containerColor = MaterialTheme.colorScheme.surface, tonalElevation = 0.dp) {
        listOf(AppTab.BINGO, AppTab.SCAN, AppTab.DECKS, AppTab.SETTINGS).forEach { tab ->
            NavigationBarItem(selected = selected == tab, onClick = { onChoose(tab) },
                icon = { Icon(tabIcon(tab), null) }, label = { Text(copy.tab(tab), maxLines = 1) },
                colors = NavigationBarItemDefaults.colors(indicatorColor = MaterialTheme.colorScheme.primaryContainer))
        }
    }
}

@Composable
private fun AppRail(selected: AppTab, copy: UiCopy, onChoose: (AppTab) -> Unit) {
    NavigationRail(containerColor = MaterialTheme.colorScheme.surface,
        header = {
            Image(painterResource(R.drawable.hiciarz_mark), null,
                Modifier.padding(vertical = 20.dp).size(38.dp))
        }) {
        Spacer(Modifier.height(16.dp))
        listOf(AppTab.BINGO, AppTab.SCAN, AppTab.DECKS, AppTab.SETTINGS).forEach { tab ->
            NavigationRailItem(selected = selected == tab, onClick = { onChoose(tab) },
                icon = { Icon(tabIcon(tab), null) }, label = { Text(copy.tab(tab)) },
                modifier = Modifier.padding(vertical = 6.dp),
                colors = NavigationRailItemDefaults.colors(indicatorColor = MaterialTheme.colorScheme.primaryContainer))
        }
    }
}

@Composable
private fun AppToolbar(copy: UiCopy, help: HelpTopic?, onBack: () -> Unit, onHelp: () -> Unit,
                       onAudio: () -> Unit, playback: PlaybackState, expanded: Boolean) {
    Row(Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.statusBars).heightIn(min = 66.dp)
        .padding(horizontal = 16.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
        if (help != null) IconButton(onClick = onBack) {
            Icon(AppIcons.Back, copy.t("Wróć", "Back"))
        } else if (!expanded) Image(painterResource(R.drawable.hiciarz_mark), null,
            Modifier.padding(end = 9.dp).size(28.dp))
        Text(if (help != null) copy.t("Jak grać", "How to play") else "Hiciarz",
            style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
        Surface(onClick = onAudio, color = MaterialTheme.colorScheme.surfaceVariant, shape = CircleShape,
            modifier = Modifier.semantics { contentDescription = copy.t("Odtwarzanie Spotify", "Spotify playback") }) {
            Row(Modifier.heightIn(min = 48.dp).padding(horizontal = 13.dp), verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(AppIcons.Speaker, null, Modifier.size(18.dp))
                Text(if (playback.connection == ConnectionStatus.CONNECTING) copy.t("Łączenie…", "Connecting…") else "Spotify",
                    style = MaterialTheme.typography.labelMedium)
            }
        }
        if (help == null) IconButton(onClick = onHelp) {
            Icon(AppIcons.Help, copy.t("Jak grać", "How to play"))
        }
    }
}

@Composable
private fun MiniPlayer(playback: PlaybackState, copy: UiCopy, onAction: (AppAction) -> Unit, onOpen: () -> Unit) {
    Surface(color = MaterialTheme.colorScheme.primaryContainer) {
        Row(Modifier.fillMaxWidth().clickable(onClick = onOpen).heightIn(min = 54.dp)
            .padding(start = 20.dp, end = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(AppIcons.Record, null, Modifier.size(24.dp), tint = MaterialTheme.colorScheme.onPrimaryContainer)
            Text(if (playback.isPlaying) copy.t("Muzyka gra", "Music is playing") else copy.t("Odtwarzanie wstrzymane", "Playback paused"),
                style = MaterialTheme.typography.labelMedium, modifier = Modifier.weight(1f).padding(horizontal = 12.dp),
                color = MaterialTheme.colorScheme.onPrimaryContainer)
            IconButton(onClick = { onAction(if (playback.isPlaying) AppAction.Pause else AppAction.Resume) }) {
                Icon(if (playback.isPlaying) AppIcons.Pause else AppIcons.Play,
                    copy.t(if (playback.isPlaying) "Wstrzymaj odtwarzanie" else "Wznów odtwarzanie",
                        if (playback.isPlaying) "Pause playback" else "Resume playback"))
            }
            Icon(AppIcons.Chevron, null, Modifier.size(17.dp), tint = MaterialTheme.colorScheme.onPrimaryContainer)
        }
    }
}
