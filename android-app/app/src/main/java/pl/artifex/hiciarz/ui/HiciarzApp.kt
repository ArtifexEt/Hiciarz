@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class, androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package pl.artifex.hiciarz.ui

import android.Manifest
import android.app.Activity
import android.content.ClipDescription
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import android.view.DragAndDropPermissions
import android.view.DragEvent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.selection.toggleable
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import pl.artifex.hiciarz.BuildConfig
import pl.artifex.hiciarz.R
import pl.artifex.hiciarz.model.*
import pl.artifex.hiciarz.scanner.ScannerPreview

private val PanelShape = RoundedCornerShape(24.dp)
private val ControlShape = RoundedCornerShape(16.dp)
private enum class AppSheet { PLAYBACK, DECKS, CLIENT_ID, LICENSES }

private class Copy(val language: String) {
    fun t(pl: String, en: String) = if (language == "en") en else pl
    fun tab(tab: AppTab) = when (tab) {
        AppTab.SCAN -> t("Skaner", "Scan")
        AppTab.BINGO -> "Bingo"
        AppTab.DECKS -> t("Talie", "Decks")
        AppTab.SETTINGS -> t("Ustawienia", "Settings")
    }
    fun mode(mode: GameMode) = when (mode) {
        GameMode.CLASSIC -> t("Muzyka", "Music")
        GameMode.GAME -> t("Zgadnij grę", "Guess the game")
        GameMode.MOVIE -> t("Zgadnij film", "Guess the film")
    }
    fun deck(deck: Deck) = if (!deck.bundled) deck.name else when {
        deck.id.contains("symphonic") -> t("Gry — symfonicznie", "Games — symphonic")
        deck.id.contains("original") -> t("Muzyka z gier", "Game soundtracks")
        deck.id.contains("christmas") -> t("Świąteczne przeboje", "Christmas hits")
        else -> deck.name
    }
    fun question(type: QuestionType) = when (type) {
        QuestionType.TITLE -> t("Jaki to tytuł?", "What's the title?")
        QuestionType.ARTIST -> t("Kto to wykonuje?", "Who's the artist?")
        QuestionType.YEAR -> t("Z którego roku?", "Which year?")
        QuestionType.SOURCE -> t("Skąd znasz ten utwór?", "Where is this track from?")
        else -> when (type.name) {
            "BAND_OR_SOLO" -> t("Zespół czy solista?", "Band or solo artist?")
            "BEFORE_2000" -> t("Przed czy po 2000?", "Before or after 2000?")
            "YEAR_WITHIN_FOUR" -> t("Podaj rok ±4", "Name the year ±4")
            "DECADE" -> t("Jaka dekada?", "Which decade?")
            "YEAR_WITHIN_TWO" -> t("Podaj rok ±2", "Name the year ±2")
            "YEAR_WITHIN_THREE" -> t("Podaj rok ±3", "Name the year ±3")
            else -> t("Z którego roku?", "Which year?")
        }
    }
    fun message(code: String): String = when (code) {
        "spotify_not_installed" -> t("Zainstaluj Spotify i zaloguj się na swoje konto.", "Install Spotify and sign in to your account.")
        "not_authorized", "user_not_authorized" -> t("Spotify nie udzieliło dostępu. Połącz konto ponownie.", "Spotify hasn't granted access. Connect your account again.")
        "client_id_missing" -> t("Brakuje konfiguracji Spotify. Sprawdź ustawienia połączenia.", "Spotify configuration is missing. Check connection settings.")
        "connection_failed", "connection_timeout" -> t("Nie udało się połączyć ze Spotify. Otwórz Spotify i spróbuj ponownie.", "Couldn't connect to Spotify. Open Spotify and try again.")
        "premium_required" -> t("Odtwarzanie wybranego utworu wymaga Spotify Premium.", "Playing a specific track requires Spotify Premium.")
        "playback_failed" -> t("Nie udało się uruchomić utworu. Spróbuj ponownie.", "Couldn't start this track. Try again.")
        "invalid_qr", "invalid_code", "invalid_spotify_uri", "invalid_track" -> t("To nie jest kod karty Hiciarza ani link do utworu Spotify.", "This isn't a Hiciarz card code or a Spotify track link.")
        "unsupported_source", "unsupported_youtube" -> t("Ta karta nie zawiera utworu Spotify.", "This card doesn't contain a Spotify track.")
        "pairing_not_supported" -> t("To kod parowania wersji webowej. Zeskanuj kod z karty muzycznej.", "This is a web pairing code. Scan a music card instead.")
        "duplicate_scan" -> t("Ta karta jest już odczytana. Wybierz następną kartę.", "This card has already been scanned. Choose the next card.")
        "spotify_login_required" -> t("Zaloguj się w aplikacji Spotify i połącz ponownie.", "Sign in to the Spotify app and connect again.")
        "spotify_offline" -> t("Spotify jest offline. Połącz telefon z internetem i spróbuj ponownie.", "Spotify is offline. Connect your phone to the internet and try again.")
        "spotify_update_required" -> t("Zaktualizuj aplikację Spotify, a potem połącz ponownie.", "Update the Spotify app, then connect again.")
        "spotify_disconnected" -> t("Połączenie ze Spotify zostało przerwane. Połącz ponownie.", "Spotify disconnected. Connect again.")
        "device_transfer_failed" -> t("Nie udało się przełączyć odtwarzania. W Spotify wybierz „Ten telefon”.", "Couldn't switch playback. Choose “This phone” in Spotify.")
        "camera_permission_required" -> t("Zezwól na dostęp do aparatu, aby skanować karty.", "Allow camera access to scan cards.")
        "camera_unavailable" -> t("Aparat jest niedostępny. Zamknij inną aplikację używającą aparatu i spróbuj ponownie.", "The camera isn't available. Close another app using it and try again.")
        "camera_scan_failed" -> t("Nie udało się odczytać obrazu z aparatu. Spróbuj ponownie.", "Couldn't read the camera image. Try again.")
        "deck_imported" -> t("Talia dodana", "Deck added")
        "deck_deleted" -> t("Talia usunięta", "Deck deleted")
        "invalid_deck", "import_failed" -> t("Nie udało się odczytać talii. Wybierz plik JSON lub CSV z Hiciarza.", "Couldn't read the deck. Choose a JSON or CSV file from Hiciarz.")
        "bingo_finished", "deck_exhausted" -> t("Wszystkie utwory zostały wylosowane. Rozpocznij nową rundę.", "Every track has been drawn. Start a new round.")
        "empty_deck", "no_deck", "choose_deck" -> t("Najpierw wybierz talię z utworami Spotify.", "Choose a deck with Spotify tracks first.")
        "import_too_large" -> t("Plik jest za duży. Wybierz mniejszą talię JSON lub CSV.", "This file is too large. Choose a smaller JSON or CSV deck.")
        "invalid_client_id" -> t("Client ID powinien zawierać 32 znaki: cyfry i litery od a do f.", "A Client ID should contain 32 characters: digits and letters a to f.")
        else -> code
    }
}

@Composable
fun HiciarzApp(state: AppState, onAction: (AppAction) -> Unit) {
    HiciarzTheme {
        val copy = remember(state.settings.language) { Copy(state.settings.language) }
        val snackbar = remember { SnackbarHostState() }
        var sheet by rememberSaveable { mutableStateOf<AppSheet?>(null) }
        var manualEntry by rememberSaveable { mutableStateOf(false) }
        val context = LocalContext.current
        val filePicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri != null) {
                runCatching { context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) }
                onAction(AppAction.ImportDeck(uri.toString()))
            }
        }
        val importFile = {
            filePicker.launch(arrayOf("application/json", "text/csv", "text/comma-separated-values", "application/octet-stream", "text/plain"))
        }
        LaunchedEffect(state.message, copy.language) {
            state.message?.let {
                snackbar.showSnackbar(copy.message(it))
                onAction(AppAction.DismissMessage)
            }
        }
        Scaffold(
            containerColor = MaterialTheme.colorScheme.background,
            topBar = { AppTopBar(state, copy, onPlayback = { sheet = AppSheet.PLAYBACK }) },
            bottomBar = {
                NavigationBar(containerColor = MaterialTheme.colorScheme.surface, tonalElevation = 0.dp) {
                    AppTab.entries.forEach { tab ->
                        NavigationBarItem(
                            selected = state.tab == tab,
                            onClick = { onAction(AppAction.SelectTab(tab)) },
                            icon = { Icon(iconForTab(tab), contentDescription = null) },
                            label = { Text(copy.tab(tab), maxLines = 1) },
                            colors = NavigationBarItemDefaults.colors(
                                indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                            ),
                        )
                    }
                }
            },
            snackbarHost = { SnackbarHost(snackbar) },
        ) { padding ->
            Box(Modifier.fillMaxSize().padding(padding).consumeWindowInsets(padding)) {
                when (state.tab) {
                    AppTab.SCAN -> ScanScreen(state, copy, onAction,
                        onManual = { manualEntry = true }, onChooseDeck = { sheet = AppSheet.DECKS })
                    AppTab.BINGO -> BingoScreen(state, copy, onAction, onChooseDeck = { sheet = AppSheet.DECKS })
                    AppTab.DECKS -> DecksScreen(state, copy, onAction, onImport = importFile)
                    AppTab.SETTINGS -> SettingsScreen(state, copy, onAction,
                        onClientId = { sheet = AppSheet.CLIENT_ID }, onLicenses = { sheet = AppSheet.LICENSES })
                }
                if (state.busy) {
                    LinearProgressIndicator(Modifier.fillMaxWidth().align(Alignment.TopCenter))
                }
            }
        }
        if (manualEntry) {
            ManualEntryDialog(copy, onDismiss = { manualEntry = false }) { value ->
                manualEntry = false
                onAction(AppAction.ScanCode(value))
            }
        }
        when (sheet) {
            AppSheet.PLAYBACK -> ModalBottomSheet(onDismissRequest = { sheet = null }) {
                PlaybackSheet(state, copy, onAction)
            }
            AppSheet.DECKS -> ModalBottomSheet(onDismissRequest = { sheet = null }) {
                DeckSelectionSheet(state, copy) { deck ->
                    if (deck.id != state.activeDeckId) onAction(AppAction.SelectDeck(deck.id))
                    sheet = null
                }
            }
            AppSheet.CLIENT_ID -> ClientIdDialog(state, copy,
                onDismiss = { sheet = null }, onSave = {
                    onAction(AppAction.SetClientId(it))
                    sheet = null
                })
            AppSheet.LICENSES -> {
                val licenses = remember { context.resources.openRawResource(R.raw.font_licenses).bufferedReader().use { it.readText() } }
                AlertDialog(
                    onDismissRequest = { sheet = null },
                    title = { Text(copy.t("Licencje krojów pisma", "Font licenses")) },
                    text = { Text(licenses, modifier = Modifier.heightIn(max = 420.dp).verticalScroll(rememberScrollState()), style = MaterialTheme.typography.bodySmall) },
                    confirmButton = { TextButton(onClick = { sheet = null }) { Text(copy.t("Zamknij", "Close")) } },
                )
            }
            null -> Unit
        }
    }
}

private fun iconForTab(tab: AppTab) = when (tab) {
    AppTab.SCAN -> AppIcons.Scan
    AppTab.BINGO -> AppIcons.Bingo
    AppTab.DECKS -> AppIcons.Decks
    AppTab.SETTINGS -> AppIcons.Settings
}

@Composable
private fun AppTopBar(state: AppState, copy: Copy, onPlayback: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.statusBars)
            .heightIn(min = 68.dp).padding(horizontal = 20.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Image(painterResource(R.drawable.hiciarz_mark), contentDescription = null,
            modifier = Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)))
        Text("Hiciarz", style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(start = 10.dp).weight(1f))
        val connected = state.playback.connection == ConnectionStatus.CONNECTED
        Surface(onClick = onPlayback, shape = CircleShape,
            color = if (connected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant) {
            Row(Modifier.heightIn(min = 48.dp).padding(horizontal = 13.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                Box(Modifier.size(7.dp).background(
                    if (connected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline, CircleShape))
                Text(if (state.playback.isPlaying) copy.t("Gra", "Playing") else "Spotify", style = MaterialTheme.typography.labelMedium)
                Icon(AppIcons.Chevron, contentDescription = copy.t("Odtwarzanie Spotify", "Spotify playback"), modifier = Modifier.size(16.dp))
            }
        }
    }
}

@Composable
private fun ScanScreen(state: AppState, copy: Copy, onAction: (AppAction) -> Unit,
                       onManual: () -> Unit, onChooseDeck: () -> Unit) {
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val wide = maxWidth >= 600.dp
        val gap = if (wide) 28.dp else 18.dp
        val scroll = rememberScrollState()
        Column(Modifier.fillMaxSize().verticalScroll(scroll).padding(horizontal = 20.dp).padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(gap)) {
            if (state.playback.connection != ConnectionStatus.CONNECTED) {
                ConnectionCard(state.playback, copy, onAction, state.settings.clientIdOverride.isBlank())
            }
            if (wide) {
                Row(Modifier.widthIn(max = 1100.dp).align(Alignment.CenterHorizontally), horizontalArrangement = Arrangement.spacedBy(28.dp)) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        CameraPanel(state.scannerEnabled && !state.busy, copy,
                            onScan = { onAction(AppAction.ScanCode(it)) }, modifier = Modifier.height(340.dp))
                        ManualEntryButton(copy, onManual)
                        DeckSelector(state.activeDeck, copy, onChooseDeck)
                    }
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        ScanResult(state, copy, onAction)
                    }
                }
            } else {
                CameraPanel(state.scannerEnabled && !state.busy, copy,
                    onScan = { onAction(AppAction.ScanCode(it)) }, modifier = Modifier.height(if (state.currentSong == null) 280.dp else 156.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedButton(onClick = onManual, modifier = Modifier.weight(1f).heightIn(min = 48.dp), shape = ControlShape) {
                        Icon(AppIcons.Link, null, Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(copy.t("Wklej kod lub link", "Paste code or link"))
                    }
                    if (state.decks.isNotEmpty()) {
                        OutlinedIconButton(onClick = onChooseDeck, modifier = Modifier.size(48.dp), shape = ControlShape) {
                            Icon(AppIcons.Decks, copy.t("Wybierz talię", "Choose deck"))
                        }
                    }
                }
                ScanResult(state, copy, onAction)
            }
        }
    }
}

@Composable
private fun ConnectionCard(playback: PlaybackState, copy: Copy, onAction: (AppAction) -> Unit, testConnection: Boolean) {
    val context = LocalContext.current
    Surface(shape = PanelShape, color = MaterialTheme.colorScheme.primaryContainer) {
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(13.dp)) {
            Text(copy.t("Muzyka z Twojego Spotify", "Music from your Spotify"), style = MaterialTheme.typography.headlineSmall)
            Text(copy.t("Spotify Premium i aplikacja Spotify na telefonie.", "Spotify Premium and the Spotify app on your phone."),
                style = MaterialTheme.typography.bodyMedium)
            if (testConnection && playback.spotifyInstalled) TestConnectionNote(copy)
            playback.error?.let { Text(copy.message(it), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium) }
            val connecting = playback.connection == ConnectionStatus.CONNECTING
            Button(onClick = { connectSpotify(playback, context, onAction) }, enabled = !connecting,
                shape = ControlShape, modifier = Modifier.fillMaxWidth().heightIn(min = 50.dp)) {
                if (connecting) {
                    CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                    Spacer(Modifier.width(10.dp))
                } else {
                    Icon(AppIcons.Music, null, Modifier.size(20.dp))
                    Spacer(Modifier.width(10.dp))
                }
                Text(when {
                    connecting -> copy.t("Łączenie…", "Connecting…")
                    !playback.spotifyInstalled -> copy.t("Zainstaluj Spotify", "Install Spotify")
                    else -> copy.t("Połącz Spotify", "Connect Spotify")
                })
            }
        }
    }
}

@Composable
private fun TestConnectionNote(copy: Copy) {
    Text(copy.t("Połączenie Hiciarza jest testowe. Konto spoza listy testowej może nie połączyć się ze Spotify.",
        "Hiciarz uses a test connection. Accounts outside the test list may be unable to connect to Spotify."),
        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
}

@Composable
private fun AdaptivePanels(title: String? = null, primary: @Composable ColumnScope.() -> Unit,
                           secondary: @Composable ColumnScope.() -> Unit) {
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val wide = maxWidth >= 600.dp
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)) {
            title?.let { Text(it, style = MaterialTheme.typography.headlineLarge, modifier = Modifier.semantics { heading() }) }
            if (wide) {
                Row(Modifier.widthIn(max = 1100.dp).fillMaxWidth().align(Alignment.CenterHorizontally),
                    horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(20.dp), content = primary)
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(20.dp), content = secondary)
                }
            } else {
                primary()
                secondary()
            }
        }
    }
}

@Composable
private fun CameraPanel(enabled: Boolean, copy: Copy, onScan: (String) -> Unit, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    var permission by remember { mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) }
    var denied by rememberSaveable { mutableStateOf(false) }
    var cameraError by remember { mutableStateOf<String?>(null) }
    var cameraAttempt by remember { mutableIntStateOf(0) }
    val permissionRequest = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        permission = granted
        denied = !granted
    }
    DisposableEffect(lifecycle, context) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) permission = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        }
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer) }
    }
    Box(modifier.fillMaxWidth().clip(PanelShape).background(Color(0xFF123F36)), contentAlignment = Alignment.Center) {
        if (permission && enabled) {
            key(cameraAttempt) {
                ScannerPreview(enabled = true, onCode = onScan, modifier = Modifier.fillMaxSize(),
                    onError = { cameraError = it })
            }
            Canvas(Modifier.fillMaxSize()) {
                val edge = minOf(size.width, size.height) * .64f
                val left = (size.width - edge) / 2
                val top = (size.height - edge) / 2
                val corner = 24.dp.toPx()
                val stroke = 3.dp.toPx()
                val color = Color(0xFFF3D49C)
                listOf(Offset(left, top) to Offset(1f, 1f), Offset(left + edge, top) to Offset(-1f, 1f),
                    Offset(left, top + edge) to Offset(1f, -1f), Offset(left + edge, top + edge) to Offset(-1f, -1f)).forEach { (p, sign) ->
                    drawLine(color, p, Offset(p.x + corner * sign.x, p.y), stroke, StrokeCap.Round)
                    drawLine(color, p, Offset(p.x, p.y + corner * sign.y), stroke, StrokeCap.Round)
                }
            }
            if (cameraError == null) {
                Surface(modifier = Modifier.align(Alignment.BottomCenter).padding(16.dp), shape = CircleShape, color = Color(0xD9102520)) {
                    Text(copy.t("Umieść kod w kadrze", "Place the code in the frame"), color = Color.White,
                        modifier = Modifier.padding(horizontal = 15.dp, vertical = 8.dp), style = MaterialTheme.typography.labelMedium)
                }
            } else {
                Surface(Modifier.fillMaxSize(), color = Color(0xEE123F36)) {
                    Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center) {
                        Text(copy.message(cameraError!!), color = Color.White,
                            style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
                        Spacer(Modifier.height(12.dp))
                        FilledTonalButton(onClick = { cameraError = null; cameraAttempt++ }, shape = ControlShape) {
                            Text(copy.t("Spróbuj ponownie", "Try again"))
                        }
                    }
                }
            }
        } else {
            Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Icon(if (enabled) AppIcons.Camera else AppIcons.Check, null, Modifier.size(36.dp), tint = Color(0xFFF3D49C))
                if (!enabled) {
                    Text(copy.t("Karta odczytana", "Card scanned"), color = Color.White, style = MaterialTheme.typography.titleMedium)
                } else {
                    Text(copy.t("Skanuj drukowane karty", "Scan your printed cards"), color = Color.White,
                        style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)
                    FilledTonalButton(onClick = {
                        if (denied) openAppSettings(context) else permissionRequest.launch(Manifest.permission.CAMERA)
                    }, modifier = Modifier.heightIn(min = 48.dp), shape = ControlShape) {
                        Text(if (denied) copy.t("Ustawienia aparatu", "Camera settings") else copy.t("Włącz aparat", "Enable camera"))
                    }
                }
            }
        }
    }
}

@Composable
private fun ScanResult(state: AppState, copy: Copy, onAction: (AppAction) -> Unit) {
    val song = state.currentSong
    if (song != null) {
        AnswerCard(song, state.answerRevealed || !state.settings.hideAnswers, copy,
            onOpenDecks = { onAction(AppAction.SelectTab(AppTab.DECKS)) })
        PlaybackControls(state.playback, state.settings, copy, onAction, expectedUri = song.spotifyUri)
        if (!state.answerRevealed && state.settings.hideAnswers) {
            OutlinedButton(onClick = { onAction(AppAction.RevealAnswer) }, modifier = Modifier.fillMaxWidth().heightIn(min = 50.dp), shape = ControlShape) {
                Icon(AppIcons.Eye, null, Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text(copy.t("Odkryj odpowiedź", "Reveal answer"))
            }
        }
        Button(onClick = { onAction(AppAction.ScanNext) }, modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp), shape = ControlShape) {
            Text(copy.t("Następna karta", "Next card"))
            Spacer(Modifier.width(12.dp))
            Icon(AppIcons.Scan, null, Modifier.size(20.dp))
        }
    } else {
        Row(Modifier.fillMaxWidth().padding(horizontal = 4.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(AppIcons.Record, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(29.dp))
            Text(copy.t("Odpowiedź pozostanie ukryta do odkrycia karty.", "The answer stays hidden until you reveal the card."),
                style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun AnswerCard(song: Song, revealed: Boolean, copy: Copy, modifier: Modifier = Modifier, onOpenDecks: () -> Unit) {
    val hasDetails = song.title.isNotBlank() || song.artist.isNotBlank() || song.year != null || song.answer.isNotBlank()
    Surface(modifier.fillMaxWidth(), color = MaterialTheme.colorScheme.tertiaryContainer, shape = PanelShape) {
        Column(Modifier.padding(24.dp).heightIn(min = 175.dp), horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center) {
            if (!revealed) {
                Icon(AppIcons.Record, null, Modifier.size(40.dp), tint = MaterialTheme.colorScheme.onSurface)
                Spacer(Modifier.height(14.dp))
                Text(when (song.gameMode) {
                    GameMode.CLASSIC -> copy.t("Który to rok?", "Which year?")
                    GameMode.GAME -> copy.t("Jaka to gra?", "Which game?")
                    GameMode.MOVIE -> copy.t("Jaki to film?", "Which film?")
                }, style = MaterialTheme.typography.headlineLarge, textAlign = TextAlign.Center)
            } else if (!hasDetails) {
                Icon(AppIcons.Decks, null, Modifier.size(34.dp))
                Spacer(Modifier.height(12.dp))
                Text(copy.t("Odpowiedź na drukowanej karcie", "Read the answer on your printed card"),
                    style = MaterialTheme.typography.headlineMedium, textAlign = TextAlign.Center)
                Spacer(Modifier.height(8.dp))
                Text(copy.t("Dodaj tę talię, aby wyświetlać tutaj tytuł, wykonawcę i rok.",
                    "Add this deck to see the title, artist and year here."),
                    style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
                TextButton(onClick = onOpenDecks, modifier = Modifier.heightIn(min = 48.dp)) {
                    Text(copy.t("Dodaj talię", "Add a deck"))
                }
            } else {
                if (song.gameMode == GameMode.CLASSIC) {
                    Text(song.year?.toString() ?: "—", style = MaterialTheme.typography.displayLarge,
                        color = MaterialTheme.colorScheme.onSurface, textAlign = TextAlign.Center)
                } else {
                    Text(song.answer.ifBlank { copy.t("Brak zapisanej odpowiedzi", "No saved answer") },
                        style = MaterialTheme.typography.headlineLarge, textAlign = TextAlign.Center)
                    song.year?.let { Text(it.toString(), style = MaterialTheme.typography.titleMedium) }
                    Spacer(Modifier.height(12.dp))
                }
                Text(song.title.ifBlank { copy.t("Utwór ze Spotify", "Spotify track") },
                    style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)
                if (song.artist.isNotBlank()) Text(song.artist, style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun PlaybackControls(playback: PlaybackState, settings: AppSettings, copy: Copy, onAction: (AppAction) -> Unit,
                             expectedUri: String? = null) {
    val connected = playback.connection == ConnectionStatus.CONNECTED
    val matchesCard = expectedUri == null || playback.trackUri == expectedUri
    val playing = matchesCard && playback.isPlaying
    val position = if (matchesCard) playback.positionMs else 0L
    Surface(color = MaterialTheme.colorScheme.surface, shape = ControlShape) {
        Column(Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                FilledIconButton(onClick = { onAction(if (playing) AppAction.Pause else AppAction.Resume) },
                    enabled = connected, modifier = Modifier.size(52.dp)) {
                    Icon(if (playing) AppIcons.Pause else AppIcons.Play,
                        copy.t(if (playing) "Wstrzymaj" else "Odtwórz", if (playing) "Pause" else "Play"), Modifier.size(24.dp))
                }
                Column(Modifier.padding(start = 14.dp).weight(1f)) {
                    Text(when {
                        playing -> copy.t("Odtwarzanie", "Playing")
                        !matchesCard -> copy.t("Karta gotowa", "Card ready")
                        else -> copy.t("Pauza", "Paused")
                    }, style = MaterialTheme.typography.titleSmall)
                    Text(copy.t("Pozycja ${formatTime(position)}", "Position ${formatTime(position)}"),
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (settings.autoPause) Text("${settings.clipSeconds} s", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun ManualEntryButton(copy: Copy, onClick: () -> Unit) {
    OutlinedButton(onClick = onClick, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp), shape = ControlShape) {
        Icon(AppIcons.Link, null, Modifier.size(18.dp))
        Spacer(Modifier.width(9.dp))
        Text(copy.t("Wklej kod lub link", "Paste code or link"))
    }
}

@Composable
private fun DeckSelector(deck: Deck?, copy: Copy, onClick: () -> Unit) {
    Surface(onClick = onClick, color = MaterialTheme.colorScheme.surfaceVariant, shape = ControlShape) {
        Row(Modifier.fillMaxWidth().heightIn(min = 60.dp).padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(AppIcons.Decks, null, Modifier.size(22.dp))
            Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                Text(copy.t("Talia", "Deck"), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(deck?.let(copy::deck) ?: copy.t("Wybierz talię", "Choose a deck"), style = MaterialTheme.typography.titleSmall, maxLines = 2)
            }
            Icon(AppIcons.Chevron, null)
        }
    }
}

@Composable
private fun BingoScreen(state: AppState, copy: Copy, onAction: (AppAction) -> Unit, onChooseDeck: () -> Unit) {
    var resetDialog by rememberSaveable { mutableStateOf(false) }
    val deck = state.activeDeck
    val drawn = state.bingoHistory.size
    val finished = deck != null && drawn >= deck.songs.size && deck.songs.isNotEmpty()
    AdaptivePanels(primary = {
        if (state.playback.connection != ConnectionStatus.CONNECTED) {
            ConnectionCard(state.playback, copy, onAction, state.settings.clientIdOverride.isBlank())
        }
        DeckSelector(deck, copy, onChooseDeck)
        Text(copy.t("Poziom pytań", "Question level"), style = MaterialTheme.typography.labelLarge)
        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
            BingoLevel.entries.forEachIndexed { index, level ->
                SegmentedButton(
                    selected = state.bingoLevel == level,
                    onClick = { onAction(AppAction.SetBingoLevel(level)) },
                    shape = SegmentedButtonDefaults.itemShape(index, BingoLevel.entries.size),
                    modifier = Modifier.heightIn(min = 48.dp),
                ) {
                    Text(if (level == BingoLevel.BEGINNER) copy.t("Podstawowy", "Beginner") else copy.t("Zaawansowany", "Expert"))
                }
            }
        }
        if (drawn > 0) {
            Text(copy.t("Bez powtórek w tej rundzie", "No repeats this round"),
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }, secondary = {
        val song = state.bingoSong
        if (song == null) {
            Surface(shape = PanelShape, color = MaterialTheme.colorScheme.secondaryContainer) {
                Column(Modifier.fillMaxWidth().padding(28.dp).heightIn(min = 170.dp),
                    horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Icon(AppIcons.Bingo, null, Modifier.size(36.dp))
                    Spacer(Modifier.height(17.dp))
                    Text(copy.t("Posłuchaj. Zgadnij. Zaznacz.", "Listen. Guess. Mark your board."),
                        style = MaterialTheme.typography.headlineLarge, textAlign = TextAlign.Center)
                }
            }
        } else {
            Surface(shape = PanelShape, color = MaterialTheme.colorScheme.secondaryContainer) {
                Column(Modifier.fillMaxWidth().padding(26.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text(copy.t("Utwór $drawn z ${deck?.songs?.size ?: drawn}", "Track $drawn of ${deck?.songs?.size ?: drawn}"),
                        style = MaterialTheme.typography.labelMedium)
                    Text(copy.question(state.question), style = MaterialTheme.typography.displaySmall)
                    bingoHint(state.question, copy)?.let {
                        Text(it, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
            PlaybackControls(state.playback, state.settings, copy, onAction, expectedUri = song.spotifyUri)
            if (state.bingoAnswerRevealed) {
                BingoAnswer(song, state.question, copy)
            } else {
                OutlinedButton(onClick = { onAction(AppAction.RevealBingoAnswer) },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 50.dp), shape = ControlShape) {
                    Icon(AppIcons.Eye, null, Modifier.size(20.dp))
                    Spacer(Modifier.width(9.dp))
                    Text(copy.t("Odkryj odpowiedź", "Reveal answer"))
                }
            }
        }
        Button(onClick = {
            if (finished) resetDialog = true else onAction(AppAction.DrawBingo)
        }, enabled = !state.busy && deck?.songs?.isNotEmpty() == true,
            modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp), shape = ControlShape) {
            Icon(if (finished) AppIcons.Refresh else AppIcons.Shuffle, null, Modifier.size(21.dp))
            Spacer(Modifier.width(10.dp))
            Text(when {
                finished -> copy.t("Nowa runda", "New round")
                song == null -> copy.t("Losuj utwór i pytanie", "Draw a track and question")
                else -> copy.t("Następny utwór", "Next track")
            })
        }
        if (deck == null || deck.songs.isEmpty()) {
            TextButton(onClick = { onAction(AppAction.SelectTab(AppTab.DECKS)) }, modifier = Modifier.fillMaxWidth()) {
                Text(copy.t("Wybierz lub dodaj talię", "Choose or add a deck"))
            }
        }
        if (drawn > 0) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Spacer(Modifier.weight(1f))
                TextButton(onClick = { resetDialog = true }) { Text(copy.t("Zacznij od nowa", "Start over")) }
            }
        }
    })
    if (resetDialog) {
        AlertDialog(
            onDismissRequest = { resetDialog = false },
            title = { Text(copy.t("Rozpocząć nową rundę?", "Start a new round?")) },
            text = { Text(copy.t("Wylosowane utwory wrócą do talii.", "Drawn tracks will return to the deck.")) },
            confirmButton = { TextButton(onClick = { onAction(AppAction.ResetBingo); resetDialog = false }) { Text(copy.t("Nowa runda", "New round")) } },
            dismissButton = { TextButton(onClick = { resetDialog = false }) { Text(copy.t("Anuluj", "Cancel")) } },
        )
    }
}

@Composable
private fun BingoAnswer(song: Song, question: QuestionType, copy: Copy) {
    val mainAnswer = when (question) {
        QuestionType.TITLE -> song.title
        QuestionType.ARTIST, QuestionType.BAND_OR_SOLO -> song.artist
        QuestionType.SOURCE -> song.answer
        QuestionType.DECADE -> song.year?.let { copy.t("Lata ${it / 10 * 10}", "${it / 10 * 10}s") }.orEmpty()
        QuestionType.BEFORE_2000 -> song.year?.let {
            if (it < 2000) copy.t("Przed 2000", "Before 2000") else copy.t("Od 2000", "2000 onwards")
        }.orEmpty()
        else -> song.year?.toString().orEmpty()
    }.ifBlank { copy.t("Brak zapisanej odpowiedzi", "No saved answer") }
    val isYear = question in listOf(QuestionType.YEAR, QuestionType.YEAR_WITHIN_TWO,
        QuestionType.YEAR_WITHIN_THREE, QuestionType.YEAR_WITHIN_FOUR)
    Surface(shape = PanelShape, color = MaterialTheme.colorScheme.tertiaryContainer) {
        Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(mainAnswer, style = if (isYear) MaterialTheme.typography.displayLarge else MaterialTheme.typography.headlineLarge,
                textAlign = TextAlign.Center)
            if (question != QuestionType.TITLE && song.title.isNotBlank()) {
                Text(song.title, style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)
            }
            val details = buildList {
                if (question != QuestionType.ARTIST && question != QuestionType.BAND_OR_SOLO && song.artist.isNotBlank()) add(song.artist)
                if (!isYear) song.year?.let { add(it.toString()) }
            }.joinToString(" · ")
            if (details.isNotBlank()) Text(details, style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

private fun bingoHint(type: QuestionType, copy: Copy): String? = when (type) {
    QuestionType.BAND_OR_SOLO -> copy.t("Duety i gościnne występy liczymy jako zespół.", "Count duets and guest appearances as a band.")
    QuestionType.BEFORE_2000 -> copy.t("Do 1999 włącznie czy od 2000 roku?", "1999 or earlier, or 2000 onwards?")
    QuestionType.YEAR_WITHIN_FOUR -> copy.t("Pomyłka o najwyżej 4 lata daje punkt.", "An answer within 4 years earns a point.")
    QuestionType.YEAR_WITHIN_TWO -> copy.t("Pomyłka o najwyżej 2 lata daje punkt.", "An answer within 2 years earns a point.")
    QuestionType.YEAR_WITHIN_THREE -> copy.t("Pomyłka o najwyżej 3 lata daje punkt.", "An answer within 3 years earns a point.")
    QuestionType.DECADE -> copy.t("Podaj dekadę, np. lata 80.", "Name the decade, for example the 1980s.")
    else -> null
}

@Composable
private fun DecksScreen(state: AppState, copy: Copy, onAction: (AppAction) -> Unit, onImport: () -> Unit) {
    val context = LocalContext.current
    val dragOver = LibraryDropSupport(state.busy) { onAction(AppAction.ImportDeck(it)) }
    var deleting by remember { mutableStateOf<Deck?>(null) }
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val columns = if (maxWidth >= 600.dp) 2 else 1
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Text(copy.t("Twoje talie", "Your decks"), style = MaterialTheme.typography.headlineLarge,
                modifier = Modifier.semantics { heading() })
            Surface(onClick = onImport, enabled = !state.busy,
                color = if (dragOver) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
                border = BorderStroke(if (dragOver) 2.dp else 1.dp, if (dragOver) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant),
                shape = PanelShape) {
                Row(Modifier.fillMaxWidth().padding(20.dp), verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) {
                        Icon(if (dragOver) AppIcons.Folder else AppIcons.Add, null,
                            modifier = Modifier.padding(12.dp).size(25.dp), tint = MaterialTheme.colorScheme.primary)
                    }
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Text(if (dragOver) copy.t("Upuść plik tutaj", "Drop your file here") else copy.t("Dodaj talię z pliku", "Add a deck from a file"),
                            style = MaterialTheme.typography.titleMedium)
                        Text(copy.t("JSON lub CSV · możesz też upuścić plik", "JSON or CSV · you can also drop a file"),
                            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            if (state.decks.isEmpty()) {
                Surface(shape = PanelShape, color = MaterialTheme.colorScheme.surfaceVariant) {
                    Column(Modifier.fillMaxWidth().padding(26.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(AppIcons.Decks, null, Modifier.size(32.dp))
                        Text(copy.t("Pierwsza talia czeka", "Room for your first deck"), style = MaterialTheme.typography.headlineMedium)
                        Text(copy.t("Dodaj plik przygotowany w kreatorze Hiciarza.", "Add a file made in the Hiciarz creator."), style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
            state.decks.chunked(columns).forEach { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    row.forEach { deck ->
                        DeckTile(deck, deck.id == state.activeDeckId, copy,
                            onSelect = { if (deck.id != state.activeDeckId) onAction(AppAction.SelectDeck(deck.id)) },
                            onDelete = if (deck.bundled) null else { { deleting = deck } },
                            modifier = Modifier.weight(1f))
                    }
                    if (row.size < columns) Spacer(Modifier.weight(1f))
                }
            }
            TextButton(onClick = { openUrl(context, "https://artifexet.github.io/Hiciarz/") },
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                Text(copy.t("Otwórz kreator talii w przeglądarce", "Open the deck creator in your browser"))
                Spacer(Modifier.width(8.dp))
                Icon(AppIcons.Arrow, null, Modifier.size(18.dp))
            }
        }
    }
    deleting?.let { deck ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text(copy.t("Usunąć tę talię?", "Remove this deck?")) },
            text = { Text(copy.deck(deck)) },
            confirmButton = { TextButton(onClick = { onAction(AppAction.DeleteDeck(deck.id)); deleting = null }) { Text(copy.t("Usuń", "Remove")) } },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text(copy.t("Anuluj", "Cancel")) } },
        )
    }
}

@Composable
private fun DeckTile(deck: Deck, selected: Boolean, copy: Copy, onSelect: () -> Unit,
                     onDelete: (() -> Unit)?, modifier: Modifier = Modifier) {
    Surface(onClick = onSelect, modifier = modifier,
        shape = PanelShape, color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(if (selected) 2.dp else 1.dp,
            if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant)) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(13.dp), color = when (deck.gameMode) {
                    GameMode.CLASSIC -> MaterialTheme.colorScheme.secondaryContainer
                    GameMode.GAME -> MaterialTheme.colorScheme.primaryContainer
                    GameMode.MOVIE -> MaterialTheme.colorScheme.tertiaryContainer
                }) {
                    Icon(AppIcons.Record, null, Modifier.padding(13.dp).size(29.dp))
                }
                Spacer(Modifier.weight(1f))
                if (onDelete != null) IconButton(onClick = onDelete) { Icon(AppIcons.Delete, copy.t("Usuń talię", "Remove deck")) }
            }
            Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text(copy.deck(deck), style = MaterialTheme.typography.headlineMedium, maxLines = 3, overflow = TextOverflow.Ellipsis)
                Text(copy.mode(deck.gameMode) + " · " + songCount(deck.songs.size, copy),
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(if (selected) copy.t("Wybrana do gry", "Selected for play") else copy.t("Wybierz talię", "Use this deck"),
                    style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.weight(1f))
                Icon(if (selected) AppIcons.Check else AppIcons.Arrow, null, Modifier.size(19.dp), tint = MaterialTheme.colorScheme.primary)
            }
        }
    }
}

private fun songCount(count: Int, copy: Copy): String = copy.t(
    "$count " + when {
        count == 1 -> "utwór"
        count % 10 in 2..4 && count % 100 !in 12..14 -> "utwory"
        else -> "utworów"
    },
    "$count " + if (count == 1) "track" else "tracks",
)

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
                        latestImport(uri.toString())
                        true
                    } else false
                }
                else -> true
            }
        }
        onDispose {
            view.setOnDragListener(null)
            permissions.forEach { it.release() }
            permissions.clear()
        }
    }
    return over
}

@Composable
private fun SettingsScreen(state: AppState, copy: Copy, onAction: (AppAction) -> Unit,
                           onClientId: () -> Unit, onLicenses: () -> Unit) {
    val context = LocalContext.current
    AdaptivePanels(title = copy.t("Ustawienia", "Settings"), primary = {
        Surface(shape = PanelShape, color = MaterialTheme.colorScheme.surface) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                SectionLabel(copy.t("Spotify", "Spotify"))
                ConnectionSummary(state.playback, copy)
                if (state.playback.connection == ConnectionStatus.CONNECTED) {
                    OutlinedButton(onClick = { onAction(AppAction.DisconnectSpotify) }, shape = ControlShape, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                        Text(copy.t("Rozłącz Spotify", "Disconnect Spotify"))
                    }
                } else {
                    if (state.settings.clientIdOverride.isBlank() && state.playback.spotifyInstalled) TestConnectionNote(copy)
                    Button(onClick = { connectSpotify(state.playback, context, onAction) }, enabled = state.playback.connection != ConnectionStatus.CONNECTING,
                        shape = ControlShape, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                        Text(if (state.playback.spotifyInstalled) copy.t("Połącz Spotify", "Connect Spotify") else copy.t("Zainstaluj Spotify", "Install Spotify"))
                    }
                }
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(13.dp)) {
                    Icon(AppIcons.Phone, null, Modifier.size(26.dp), tint = MaterialTheme.colorScheme.primary)
                    Column(Modifier.weight(1f)) {
                        Text(copy.t("Gdzie gra muzyka", "Where music plays"), style = MaterialTheme.typography.titleSmall)
                        Text(copy.t("Telefon lub połączony głośnik Bluetooth", "Phone or its connected Bluetooth speaker"),
                            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                FilledTonalButton(onClick = { onAction(AppAction.SwitchToPhone) },
                    enabled = state.playback.connection == ConnectionStatus.CONNECTED,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp), shape = ControlShape) { Text(copy.t("Odtwarzaj na tym telefonie", "Play on this phone")) }
            }
        }
        Surface(shape = PanelShape, color = MaterialTheme.colorScheme.surface) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                SectionLabel(copy.t("Rozgrywka", "Game"))
                SwitchSetting(copy.t("Automatyczna pauza", "Automatic pause"), state.settings.autoPause) { onAction(AppAction.SetAutoPause(it)) }
                if (state.settings.autoPause) {
                    Text(copy.t("Długość fragmentu", "Clip length"), style = MaterialTheme.typography.labelLarge)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                        listOf(10, 20, 30, 60).forEach { seconds ->
                            FilterChip(selected = state.settings.clipSeconds == seconds,
                                onClick = { onAction(AppAction.SetClipSeconds(seconds)) },
                                label = { Text("$seconds s") })
                        }
                    }
                }
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                SwitchSetting(copy.t("Ukrywaj odpowiedzi", "Hide answers"), state.settings.hideAnswers) { onAction(AppAction.SetHideAnswers(it)) }
            }
        }
    }, secondary = {
        Surface(shape = PanelShape, color = MaterialTheme.colorScheme.surface) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                SectionLabel(copy.t("Język", "Language"))
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    listOf("pl" to "Polski", "en" to "English").forEachIndexed { index, (code, label) ->
                        SegmentedButton(selected = state.settings.language == code,
                            onClick = { onAction(AppAction.SetLanguage(code)) },
                            shape = SegmentedButtonDefaults.itemShape(index, 2),
                            modifier = Modifier.heightIn(min = 48.dp)) { Text(label) }
                    }
                }
            }
        }
        Surface(shape = PanelShape, color = MaterialTheme.colorScheme.surface) {
            Column {
                SettingsLink(copy.t("Zgłoś usterkę", "Report an issue"), AppIcons.Info) { openUrl(context, "https://github.com/ArtifexEt/Hiciarz/issues/new/choose") }
                HorizontalDivider(Modifier.padding(horizontal = 20.dp), color = MaterialTheme.colorScheme.outlineVariant)
                SettingsLink(copy.t("Konfiguracja połączenia", "Connection configuration"), AppIcons.Settings, onClientId)
                HorizontalDivider(Modifier.padding(horizontal = 20.dp), color = MaterialTheme.colorScheme.outlineVariant)
                SettingsLink(copy.t("Licencje krojów pisma", "Font licenses"), AppIcons.Info, onLicenses)
            }
        }
        Text(if (BuildConfig.TEST_SIGNING) copy.t("Hiciarz ${BuildConfig.VERSION_NAME} · wersja testowa, podpis testowy", "Hiciarz ${BuildConfig.VERSION_NAME} · test build, test signing key")
            else "Hiciarz ${BuildConfig.VERSION_NAME}",
            modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center,
            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    })
}

@Composable
private fun SectionLabel(text: String) {
    Text(text, style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { heading() })
}

@Composable
private fun SwitchSetting(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().heightIn(min = 48.dp).toggleable(value = checked, role = Role.Switch, onValueChange = onChange), verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f).padding(end = 12.dp))
        Switch(checked = checked, onCheckedChange = null)
    }
}

@Composable
private fun SettingsLink(label: String, icon: ImageVector, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).heightIn(min = 64.dp).padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(13.dp)) {
        Icon(icon, null, Modifier.size(22.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(label, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
        Icon(AppIcons.Chevron, null, Modifier.size(20.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun ConnectionSummary(playback: PlaybackState, copy: Copy) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) {
            Icon(AppIcons.Music, null, Modifier.padding(12.dp).size(24.dp), tint = MaterialTheme.colorScheme.primary)
        }
        Column(Modifier.weight(1f)) {
            Text(when (playback.connection) {
                ConnectionStatus.CONNECTED -> copy.t("Spotify połączone", "Spotify connected")
                ConnectionStatus.CONNECTING -> copy.t("Łączenie ze Spotify…", "Connecting to Spotify…")
                ConnectionStatus.DISCONNECTED -> copy.t("Spotify rozłączone", "Spotify disconnected")
            }, style = MaterialTheme.typography.titleSmall)
            Text(copy.t("Odtwarzanie przez aplikację Spotify", "Playback through the Spotify app"), style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
    playback.error?.let { Text(copy.message(it), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error) }
}

@Composable
private fun PlaybackSheet(state: AppState, copy: Copy, onAction: (AppAction) -> Unit) {
    val context = LocalContext.current
    Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 28.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        Text(copy.t("Odtwarzanie", "Playback"), style = MaterialTheme.typography.headlineLarge)
        ConnectionSummary(state.playback, copy)
        if (state.playback.connection == ConnectionStatus.CONNECTED) {
            PlaybackControls(state.playback, state.settings, copy, onAction)
            FilledTonalButton(onClick = { onAction(AppAction.SwitchToPhone) }, modifier = Modifier.fillMaxWidth().heightIn(min = 50.dp), shape = ControlShape) {
                Icon(AppIcons.Phone, null, Modifier.size(20.dp))
                Spacer(Modifier.width(9.dp))
                Text(copy.t("Odtwarzaj na tym telefonie", "Play on this phone"))
            }
            Text(copy.t("Dźwięk trafi też do głośnika Bluetooth połączonego z telefonem.", "Audio also goes to a Bluetooth speaker connected to your phone."),
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            if (state.settings.clientIdOverride.isBlank() && state.playback.spotifyInstalled) TestConnectionNote(copy)
            Button(onClick = { connectSpotify(state.playback, context, onAction) }, enabled = state.playback.connection != ConnectionStatus.CONNECTING,
                modifier = Modifier.fillMaxWidth().heightIn(min = 50.dp), shape = ControlShape) {
                Text(if (state.playback.spotifyInstalled) copy.t("Połącz Spotify", "Connect Spotify") else copy.t("Zainstaluj Spotify", "Install Spotify"))
            }
        }
    }
}

@Composable
private fun DeckSelectionSheet(state: AppState, copy: Copy, onSelect: (Deck) -> Unit) {
    Column(Modifier.fillMaxWidth().heightIn(max = 560.dp).verticalScroll(rememberScrollState()).padding(horizontal = 24.dp).padding(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text(copy.t("Wybierz talię", "Choose a deck"), style = MaterialTheme.typography.headlineLarge)
        state.decks.forEach { deck ->
            Surface(onClick = { onSelect(deck) }, shape = ControlShape,
                color = if (deck.id == state.activeDeckId) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant) {
                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Icon(AppIcons.Record, null, Modifier.size(26.dp))
                    Column(Modifier.weight(1f)) {
                        Text(copy.deck(deck), style = MaterialTheme.typography.titleSmall)
                        Text(songCount(deck.songs.size, copy), style = MaterialTheme.typography.bodySmall)
                    }
                    if (deck.id == state.activeDeckId) Icon(AppIcons.Check, null)
                }
            }
        }
        if (state.decks.isEmpty()) Text(copy.t("Dodaj talię w zakładce Talie.", "Add a deck in the Decks tab."))
    }
}

@Composable
private fun ManualEntryDialog(copy: Copy, onDismiss: () -> Unit, onSubmit: (String) -> Unit) {
    var value by rememberSaveable { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(copy.t("Kod lub link do utworu", "Card code or track link")) },
        text = {
            OutlinedTextField(value = value, onValueChange = { if (it.length <= 8000) value = it },
                modifier = Modifier.fillMaxWidth(), minLines = 2, maxLines = 4,
                label = { Text(copy.t("Link Spotify lub kod Hiciarza", "Spotify link or Hiciarz code")) },
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.None, keyboardType = KeyboardType.Uri),
            )
        },
        confirmButton = { TextButton(onClick = { onSubmit(value.trim()) }, enabled = value.isNotBlank()) { Text(copy.t("Odtwórz", "Play")) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text(copy.t("Anuluj", "Cancel")) } },
    )
}

@Composable
private fun ClientIdDialog(state: AppState, copy: Copy, onDismiss: () -> Unit, onSave: (String) -> Unit) {
    var value by rememberSaveable { mutableStateOf("") }
    val valid = value.trim().matches(Regex("[a-fA-F0-9]{32}"))
    val context = LocalContext.current
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(copy.t("Własne połączenie Spotify", "Your own Spotify connection")) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(copy.t("Opcjonalnie: użyj Client ID własnej aplikacji ze Spotify for Developers. Dodaj pakiet Android i podpis z instrukcji w repozytorium.",
                    "Optional: use the Client ID of your own Spotify for Developers app. Add the Android package and fingerprint from the repository instructions."),
                    style = MaterialTheme.typography.bodyMedium)
                OutlinedTextField(value = value, onValueChange = { if (it.length <= 64) value = it.trim() },
                    label = { Text("Client ID") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.None),
                    modifier = Modifier.fillMaxWidth())
                TextButton(onClick = { openUrl(context, "https://github.com/ArtifexEt/Hiciarz/tree/main/android-app#spotify") }) {
                    Text(copy.t("Instrukcja konfiguracji", "Setup instructions"))
                }
                if (state.settings.clientIdOverride.isNotBlank()) {
                    TextButton(onClick = { onSave("") }) { Text(copy.t("Przywróć połączenie Hiciarza", "Restore Hiciarz connection")) }
                }
            }
        },
        confirmButton = { TextButton(onClick = { onSave(value.trim()) }, enabled = valid) { Text(copy.t("Zmień", "Change")) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text(copy.t("Anuluj", "Cancel")) } },
    )
}

private fun formatTime(ms: Long): String {
    val total = (ms.coerceAtLeast(0) / 1000).toInt()
    return "%d:%02d".format(total / 60, total % 60)
}

private fun Context.activity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.activity()
    else -> null
}

private fun openAppSettings(context: Context) {
    context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")))
}

private fun openUrl(context: Context, url: String) {
    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
}

private fun connectSpotify(playback: PlaybackState, context: Context, onAction: (AppAction) -> Unit) {
    val installed = playback.spotifyInstalled || runCatching {
        context.packageManager.getPackageInfo("com.spotify.music", 0)
    }.isSuccess
    if (installed) onAction(AppAction.ConnectSpotify)
    else openUrl(context, "https://play.google.com/store/apps/details?id=com.spotify.music")
}
