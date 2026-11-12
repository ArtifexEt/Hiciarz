@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package pl.artifex.hiciarz.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import pl.artifex.hiciarz.R
import pl.artifex.hiciarz.model.*

private enum class AppSheet { PLAYBACK, LICENSES, SKINS }

@Composable
fun HiciarzApp(state: AppState, onAction: (AppAction) -> Unit) {
    HiciarzTheme(skin = state.activeSkin) {
        val copy = remember(state.settings.language) { UiCopy(state.settings.language) }
        val snackbar = remember { SnackbarHostState() }
        var sheet by rememberSaveable { mutableStateOf<AppSheet?>(null) }
        var help by rememberSaveable { mutableStateOf<HelpTopic?>(null) }
        val fold = rememberFoldGeometry()
        val activeTab = state.tab
        LaunchedEffect(state.message, copy.language) {
            state.message?.let { snackbar.showSnackbar(copy.message(it)); onAction(AppAction.DismissMessage) }
        }
        BackHandler(help != null) { help = null }
        CompositionLocalProvider(LocalFoldGeometry provides fold) {
            BoxWithConstraints(Modifier.fillMaxSize()) {
                val expanded = maxWidth >= 600.dp && fold?.vertical != false
                val chooseTab: (AppTab) -> Unit = { help = null; onAction(AppAction.SelectTab(it)) }
                Row(Modifier.fillMaxSize()) {
                    if (expanded) AppRail(activeTab, copy, chooseTab)
                    Scaffold(
                        modifier = Modifier.weight(1f),
                        containerColor = MaterialTheme.colorScheme.background,
                        topBar = {
                            AppToolbar(copy, help,
                                onBack = { help = null },
                                onHelp = { help = HelpTopic.ALL },
                                onAudio = { sheet = AppSheet.PLAYBACK },
                                playback = state.playback, expanded = expanded)
                        },
                        bottomBar = {
                            // The dock owns phone insets; the rail's mini player owns its own.
                            Column(if (expanded) Modifier.windowInsetsPadding(
                                WindowInsets.navigationBars.only(WindowInsetsSides.Bottom),
                            ) else Modifier) {
                                if (state.playback.connection == ConnectionStatus.CONNECTED &&
                                    (activeTab == AppTab.SETTINGS || help != null))
                                    MiniPlayer(state.playback, copy, onAction) { sheet = AppSheet.PLAYBACK }
                                if (!expanded) {
                                    AppBottomBar(activeTab, copy, chooseTab)
                                }
                            }
                        },
                        snackbarHost = { SnackbarHost(snackbar) },
                    ) { padding ->
                        Box(Modifier.fillMaxSize().padding(padding).consumeWindowInsets(padding)) {
                            if (help != null) HelpScreen(help!!, copy) { help = it }
                            else when (activeTab) {
                                AppTab.SCAN -> ScanScreen(state, copy, onAction,
                                    cameraActive = sheet == null)
                                AppTab.SETTINGS -> SettingsScreen(state, copy, onAction,
                                    onAudio = { sheet = AppSheet.PLAYBACK },
                                    onSkin = { sheet = AppSheet.SKINS },
                                    onLicenses = { sheet = AppSheet.LICENSES },
                                    onHelp = { help = HelpTopic.ALL })
                            }
                        }
                    }
                }
            }
        }
        when (sheet) {
            AppSheet.PLAYBACK -> ModalBottomSheet(onDismissRequest = { sheet = null }) {
                HideStatusBar()
                PlaybackSheet(state, copy, onAction) { help = HelpTopic.AUDIO; sheet = null }
            }
            AppSheet.SKINS -> ModalBottomSheet(onDismissRequest = { sheet = null },
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
                HideStatusBar()
                SkinSelectionSheet(state, copy, onAction)
            }
            AppSheet.LICENSES -> FontLicensesDialog(copy) { sheet = null }
            null -> Unit
        }
    }
}

private fun tabIcon(tab: AppTab): ImageVector = when (tab) {
    AppTab.SCAN -> AppIcons.Scan
    AppTab.SETTINGS -> AppIcons.Settings
}

@Composable
private fun AppBottomBar(selected: AppTab, copy: UiCopy, onChoose: (AppTab) -> Unit) {
    BoxWithConstraints(Modifier.fillMaxWidth()
        .windowInsetsPadding(WindowInsets.navigationBars.only(WindowInsetsSides.Bottom + WindowInsetsSides.Horizontal))
        .padding(horizontal = 20.dp, vertical = 10.dp), contentAlignment = Alignment.Center) {
        val stacked = maxWidth < 320.dp || LocalDensity.current.fontScale > 1.2f
        Surface(modifier = Modifier.widthIn(max = 360.dp).fillMaxWidth().testTag("app-bottom-navigation"),
            shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.inverseSurface) {
            Row(Modifier.selectableGroup().padding(6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf(AppTab.SCAN, AppTab.SETTINGS).forEach { tab ->
                    val active = selected == tab
                    Surface(modifier = Modifier.weight(1f), shape = RoundedCornerShape(18.dp),
                        color = if (active) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.inverseSurface,
                        contentColor = if (active) MaterialTheme.colorScheme.onSecondary else MaterialTheme.colorScheme.inverseOnSurface) {
                        val item = Modifier.selectable(selected = active, role = Role.Tab, onClick = { onChoose(tab) })
                            .heightIn(min = 54.dp)
                        if (stacked) {
                            Column(item.padding(horizontal = 8.dp, vertical = 10.dp),
                                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Icon(tabIcon(tab), null, Modifier.size(24.dp))
                                Text(copy.tab(tab), style = MaterialTheme.typography.labelLarge)
                            }
                        } else {
                            Row(item.padding(horizontal = 12.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally)) {
                                Icon(tabIcon(tab), null, Modifier.size(24.dp))
                                Text(copy.tab(tab), style = MaterialTheme.typography.labelLarge, maxLines = 1)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AppRail(selected: AppTab, copy: UiCopy, onChoose: (AppTab) -> Unit) {
    NavigationRail(containerColor = MaterialTheme.colorScheme.inverseSurface,
        contentColor = MaterialTheme.colorScheme.inverseOnSurface,
        header = {
            Image(painterResource(R.drawable.hiciarz_mark), null,
                Modifier.padding(vertical = 20.dp).size(38.dp))
        }) {
        Spacer(Modifier.height(16.dp))
        listOf(AppTab.SCAN, AppTab.SETTINGS).forEach { tab ->
            NavigationRailItem(selected = selected == tab, onClick = { onChoose(tab) },
                icon = { Icon(tabIcon(tab), null) }, label = { Text(copy.tab(tab)) },
                modifier = Modifier.padding(vertical = 6.dp),
                colors = NavigationRailItemDefaults.colors(
                    selectedIconColor = MaterialTheme.colorScheme.onSecondary,
                    selectedTextColor = MaterialTheme.colorScheme.inverseOnSurface,
                    indicatorColor = MaterialTheme.colorScheme.secondary,
                    unselectedIconColor = MaterialTheme.colorScheme.inverseOnSurface.copy(alpha = .72f),
                    unselectedTextColor = MaterialTheme.colorScheme.inverseOnSurface.copy(alpha = .72f)))
        }
    }
}

@Composable
private fun AppToolbar(copy: UiCopy, help: HelpTopic?, onBack: () -> Unit, onHelp: () -> Unit,
                       onAudio: () -> Unit, playback: PlaybackState, expanded: Boolean) {
    val connected = playback.connection == ConnectionStatus.CONNECTED
    val connecting = playback.connection == ConnectionStatus.CONNECTING
    Row(Modifier.fillMaxWidth().windowInsetsPadding(
        WindowInsets.statusBars.union(WindowInsets.displayCutout).only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal),
    ).heightIn(min = 56.dp)
        .padding(horizontal = 16.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        if (help != null) IconButton(onClick = onBack) {
            Icon(AppIcons.Back, copy.t("Wróć", "Back"))
        } else if (!expanded) Image(painterResource(R.drawable.hiciarz_mark), null,
            Modifier.padding(end = 8.dp).size(24.dp))
        Text("Hiciarz",
            style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
        TextButton(onClick = onAudio, contentPadding = PaddingValues(horizontal = 8.dp),
            modifier = Modifier.heightIn(min = 48.dp).semantics {
                contentDescription = copy.t("Odtwarzanie Spotify", "Spotify playback")
                stateDescription = when {
                    connected -> copy.t("Połączone", "Connected")
                    connecting -> copy.t("Łączenie", "Connecting")
                    else -> copy.t("Niepołączone", "Disconnected")
                }
            }) {
            if (connecting) CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 1.5.dp)
            else Icon(if (connected) AppIcons.Check else AppIcons.Speaker, null, Modifier.size(16.dp))
            Spacer(Modifier.width(6.dp))
            Text(when {
                connected -> "Spotify"
                connecting -> copy.t("Łączenie…", "Connecting…")
                else -> copy.t("Połącz Spotify", "Connect Spotify")
            }, style = MaterialTheme.typography.labelMedium)
        }
        if (help == null) IconButton(onClick = onHelp) {
            Icon(AppIcons.Help, copy.t("Jak tworzyć karty", "Create cards"))
        }
    }
}

@Composable
private fun MiniPlayer(playback: PlaybackState, copy: UiCopy, onAction: (AppAction) -> Unit, onOpen: () -> Unit) {
    Surface(modifier = Modifier.testTag("app-mini-player"), color = MaterialTheme.colorScheme.primaryContainer) {
        Row(Modifier.fillMaxWidth().clickable(onClick = onOpen).heightIn(min = 48.dp)
            .padding(start = 20.dp, end = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(AppIcons.Record, null, Modifier.size(20.dp), tint = MaterialTheme.colorScheme.onPrimaryContainer)
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
