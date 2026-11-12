@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class, androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package pl.artifex.hiciarz.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.selection.selectable
import androidx.compose.ui.semantics.Role
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import pl.artifex.hiciarz.BuildConfig
import pl.artifex.hiciarz.R
import pl.artifex.hiciarz.model.*

@Composable
internal fun SettingsScreen(state: AppState, copy: UiCopy, onAction: (AppAction) -> Unit,
                            onAudio: () -> Unit, onSkin: () -> Unit, onLicenses: () -> Unit, onHelp: () -> Unit) {
    val context = LocalContext.current
    AdaptivePanes(primary = {
        SectionTitle(copy.t("Ustawienia", "Settings"))
        SettingGroup("Spotify") {
            SettingRow(if (state.playback.connection == ConnectionStatus.CONNECTED)
                copy.t("Połączenie aktywne", "Connected") else copy.t("Połącz Spotify", "Connect Spotify"),
                AppIcons.Music, copy.t("Odtwarzanie i pauza", "Playback controls"), onAudio)
        }
        SettingGroup(copy.t("Podczas gry", "During a game")) {
            SwitchRow(copy.t("Automatyczna pauza", "Automatic pause"), state.settings.autoPause,
                onChange = { onAction(AppAction.SetAutoPause(it)) })
            if (state.settings.autoPause) {
                Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 15.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(copy.t("Długość fragmentu", "Clip length"), style = MaterialTheme.typography.labelMedium)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(10, 20, 30, 60).forEach { seconds ->
                            FilterChip(selected = state.settings.clipSeconds == seconds,
                                onClick = { onAction(AppAction.SetClipSeconds(seconds)) }, label = { Text("$seconds s") })
                        }
                    }
                }
            }
            GroupDivider()
            SwitchRow(copy.t("Ukrywaj odpowiedzi skanowanych kart", "Hide scanned card answers"), state.settings.hideAnswers,
                onChange = { onAction(AppAction.SetHideAnswers(it)) })
        }
    }, secondary = {
        SettingGroup(copy.t("Wygląd", "Appearance")) {
            SwitchRow(copy.t("Używaj skórki zeskanowanej karty", "Use the scanned card’s skin"), state.settings.followCardSkin,
                onChange = { onAction(AppAction.SetFollowCardSkin(it)) })
            GroupDivider()
            SettingRow(copy.t("Skórka domyślna", "Default skin"), AppIcons.Palette,
                copy.skin(state.settings.cardSkin), onSkin)
        }
        SettingGroup(copy.t("Język", "Language")) {
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth().padding(14.dp)) {
                listOf("pl" to "Polski", "en" to "English").forEachIndexed { index, (language, title) ->
                    SegmentedButton(selected = state.settings.language == language,
                        onClick = { onAction(AppAction.SetLanguage(language)) },
                        shape = SegmentedButtonDefaults.itemShape(index, 2),
                        modifier = Modifier.heightIn(min = 48.dp)) { Text(title) }
                }
            }
        }
        SettingGroup(copy.t("Pomoc", "Help")) {
            SettingRow(copy.t("Jak grać", "How to play"), AppIcons.Help, onClick = onHelp)
            GroupDivider()
            SettingRow(copy.t("Zgłoś usterkę", "Report an issue"), AppIcons.Info) {
                openUrl(context, "https://github.com/ArtifexEt/Hiciarz/issues/new/choose")
            }
            GroupDivider()
            SettingRow(copy.t("Licencje krojów pisma", "Font licenses"), onClick = onLicenses)
        }
        Text("Hiciarz ${BuildConfig.VERSION_NAME}" + if (BuildConfig.TEST_SIGNING) copy.t(" · wersja testowa", " · test build") else "",
            modifier = Modifier.padding(horizontal = 4.dp), style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
    })
}

@Composable
internal fun PlaybackSheet(state: AppState, copy: UiCopy, onAction: (AppAction) -> Unit, onHelp: () -> Unit) {
    val context = LocalContext.current
    val connected = state.playback.connection == ConnectionStatus.CONNECTED
    val connecting = state.playback.connection == ConnectionStatus.CONNECTING
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp).padding(bottom = 30.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)) {
        Text(copy.t("Odtwarzanie", "Playback"), style = MaterialTheme.typography.headlineLarge)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) {
                Icon(AppIcons.Music, null, Modifier.padding(12.dp).size(24.dp), tint = MaterialTheme.colorScheme.primary)
            }
            Column {
                Text(when {
                    connected -> copy.t("Spotify połączone", "Spotify connected")
                    connecting -> copy.t("Łączenie ze Spotify…", "Connecting to Spotify…")
                    else -> copy.t("Spotify niepołączone", "Spotify not connected")
                }, style = MaterialTheme.typography.titleSmall)
                Text(copy.t("Muzykę odtwarza aplikacja Spotify", "Music plays through the Spotify app"),
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        state.playback.error?.let { Text(copy.message(it), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error) }
        if (connected) {
            PlaybackControls(state.playback, state.settings, copy, onAction)
            OutlinedButton(onClick = { onAction(AppAction.DisconnectSpotify) },
                modifier = Modifier.fillMaxWidth().heightIn(min = 50.dp), shape = ControlShape) {
                Text(copy.t("Rozłącz Spotify", "Disconnect Spotify"))
            }
        } else {
            Text(copy.t("Spotify Premium i aplikacja Spotify na telefonie. Przy pierwszym połączeniu zaakceptuj zgodę na sterowanie.",
                "You need Spotify Premium and the Spotify app on your phone. Accept the control permission on first connection."),
                style = MaterialTheme.typography.bodyMedium)
            Button(onClick = { connectSpotify(state.playback, context, onAction) }, enabled = !connecting,
                modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp), shape = ControlShape) {
                if (connecting) { CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp); Spacer(Modifier.width(10.dp)) }
                Text(when {
                    connecting -> copy.t("Łączenie…", "Connecting…")
                    !state.playback.spotifyInstalled -> copy.t("Zainstaluj Spotify", "Install Spotify")
                    else -> copy.t("Połącz Spotify", "Connect Spotify")
                })
            }
            if (connecting) OutlinedButton(onClick = { onAction(AppAction.DisconnectSpotify) },
                modifier = Modifier.fillMaxWidth().heightIn(min = 50.dp), shape = ControlShape) {
                Text(copy.t("Anuluj łączenie", "Cancel connection"))
            }
            if (BuildConfig.TEST_SIGNING) Text(copy.t("Wydanie testowe: niektóre konta mogą nie zaakceptować połączenia.",
                "Test build: some accounts may be unable to connect."),
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        TextButton(onClick = onHelp) { Text(copy.t("Pomoc z odtwarzaniem", "Playback help")) }
    }
}

@Composable
internal fun SkinSelectionSheet(state: AppState, copy: UiCopy, onAction: (AppAction) -> Unit) {
    Column(Modifier.fillMaxWidth().heightIn(max = 680.dp).verticalScroll(rememberScrollState())
        .padding(horizontal = 24.dp).padding(bottom = 30.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(copy.t("Skórki kart", "Card skins"), style = MaterialTheme.typography.headlineLarge)
        SwitchRow(copy.t("Używaj skórki zeskanowanej karty", "Use the scanned card’s skin"), state.settings.followCardSkin,
            onChange = { onAction(AppAction.SetFollowCardSkin(it)) })
        Text(copy.t("Skórka domyślna", "Default skin"), style = MaterialTheme.typography.titleSmall)
        CardSkin.entries.chunked(3).forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { skin ->
                    val selected = skin == state.settings.cardSkin
                    Column(Modifier.weight(1f).selectable(selected, role = Role.RadioButton,
                        onClick = { onAction(AppAction.SetCardSkin(skin)) }), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Surface(shape = ControlShape,
                            border = if (selected) BorderStroke(3.dp, MaterialTheme.colorScheme.secondary) else null,
                            modifier = Modifier.fillMaxWidth().aspectRatio(.9f)) {
                            Box {
                                SkinPattern(skin, Modifier.fillMaxSize())
                                if (selected) Icon(AppIcons.Check, copy.t("Wybrana skórka", "Selected skin"),
                                    Modifier.align(Alignment.BottomEnd).padding(9.dp).size(18.dp), tint = skin.palette().accent)
                            }
                        }
                        Text(copy.skin(skin), style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        }
    }
}

@Composable
internal fun ManualEntryDialog(copy: UiCopy, onDismiss: () -> Unit, onSubmit: (String) -> Unit) {
    var value by rememberSaveable { mutableStateOf("") }
    AlertDialog(onDismissRequest = onDismiss, title = { Text(copy.t("Kod lub link do utworu", "Card code or track link")) },
        text = { OutlinedTextField(value, { if (it.length <= 8000) value = it },
            modifier = Modifier.fillMaxWidth(), minLines = 2, maxLines = 4,
            label = { Text(copy.t("Link Spotify lub kod Hiciarza", "Spotify link or Hiciarz code")) },
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.None, keyboardType = KeyboardType.Uri)) },
        confirmButton = { TextButton(onClick = { onSubmit(value.trim()) }, enabled = value.isNotBlank()) { Text(copy.t("Odtwórz", "Play")) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text(copy.t("Anuluj", "Cancel")) } })
}

@Composable
internal fun FontLicensesDialog(copy: UiCopy, onDismiss: () -> Unit) {
    val context = LocalContext.current
    val licenses = remember { context.resources.openRawResource(R.raw.font_licenses).bufferedReader().use { it.readText() } }
    AlertDialog(onDismissRequest = onDismiss, title = { Text(copy.t("Licencje krojów pisma", "Font licenses")) },
        text = { Text(licenses, Modifier.heightIn(max = 420.dp).verticalScroll(rememberScrollState()), style = MaterialTheme.typography.bodySmall) },
        confirmButton = { TextButton(onClick = onDismiss) { Text(copy.t("Zamknij", "Close")) } })
}
