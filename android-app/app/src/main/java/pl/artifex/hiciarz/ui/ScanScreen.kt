package pl.artifex.hiciarz.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.Dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import pl.artifex.hiciarz.model.*
import pl.artifex.hiciarz.scanner.ScannerCameraState
import pl.artifex.hiciarz.scanner.ScannerPreview
import kotlin.math.abs

@Composable
internal fun ScanScreen(state: AppState, copy: UiCopy, onAction: (AppAction) -> Unit, onManual: () -> Unit, onSkin: () -> Unit, cameraActive: Boolean = true) {
    val song = state.currentSong
    AdaptivePanes(primary = {
        if (song == null) {
            CameraViewport(state.scannerEnabled && cameraActive, copy) { onAction(AppAction.ScanCameraCode(it)) }
        } else {
            val revealed = state.answerRevealed || !state.settings.hideAnswers
            ScannedTicket(song, revealed, state.activeSkin, copy)
            PlaybackControls(state.playback, state.settings, copy, onAction,
                expectedUri = song.spotifyUri, playAction = AppAction.PlayCard(song))
            if (!revealed) OutlinedButton(
                onClick = { onAction(AppAction.RevealAnswer) },
                modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp), shape = ControlShape,
            ) {
                Icon(AppIcons.Eye, null, Modifier.size(20.dp))
                Spacer(Modifier.width(10.dp))
                Text(copy.t("Odkryj odpowiedź", "Reveal answer"))
            }
        }
    }, secondary = {
        if (song != null) {
            Button(onClick = { onAction(AppAction.ScanNext) },
                modifier = Modifier.fillMaxWidth().heightIn(min = 58.dp), shape = ControlShape) {
                Text(copy.t("Następna karta", "Next card"))
                Spacer(Modifier.width(10.dp))
                Icon(AppIcons.Scan, null, Modifier.size(22.dp))
            }
            if (state.answerRevealed && song.title.isBlank() && song.year == null) {
                Text(copy.t("Odpowiedź znajdziesz na drukowanej karcie. Dodaj talię, aby widzieć ją także tutaj.",
                    "Read the answer on the printed card. Import its deck to see it here too."),
                    style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                TextButton(onClick = { onAction(AppAction.SelectTab(AppTab.DECKS)) }) { Text(copy.t("Dodaj talię", "Add a deck")) }
            }
        } else {
            Text(copy.t("Skanuj. Posłuchaj. Zgadnij.", "Scan. Listen. Guess."),
                style = MaterialTheme.typography.headlineMedium)
        }
        OutlinedButton(onClick = onManual, modifier = Modifier.fillMaxWidth().heightIn(min = 50.dp), shape = ControlShape) {
            Icon(AppIcons.Link, null, Modifier.size(18.dp)); Spacer(Modifier.width(10.dp))
            Text(copy.t("Wklej kod lub link", "Paste code or link"))
        }
        Surface(onClick = onSkin, shape = ControlShape, color = MaterialTheme.colorScheme.surface) {
            Row(Modifier.fillMaxWidth().padding(15.dp), verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Icon(AppIcons.Palette, null, Modifier.size(22.dp), tint = MaterialTheme.colorScheme.primary)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(copy.skin(state.activeSkin), style = MaterialTheme.typography.titleSmall)
                }
                Icon(AppIcons.Chevron, null, Modifier.size(17.dp))
            }
        }
    })
}

@Composable
internal fun ScannedTicket(song: Song, revealed: Boolean, skin: CardSkin, copy: UiCopy) {
    val hasDetails = song.title.isNotBlank() || song.year != null || song.answer.isNotBlank()
    val question = when (song.gameMode) {
        GameMode.CLASSIC -> copy.t("Który to rok?", "Which year?")
        GameMode.GAME -> copy.t("Jaka to gra?", "Which game?")
        GameMode.MOVIE -> copy.t("Jaki to film?", "Which film?")
    }
    YearTicket(
        skin = skin,
        year = when {
            !revealed -> "?"
            !hasDetails -> "—"
            song.gameMode != GameMode.CLASSIC -> song.answer
            else -> song.year?.toString() ?: "—"
        },
        eyebrow = if (revealed) copy.t("Odpowiedź", "The answer") else copy.t("Twoja karta", "Your card"),
        title = when {
            !revealed -> question
            !hasDetails -> copy.t("Odpowiedź na drukowanej karcie", "Read the answer on your printed card")
            else -> song.title
        },
        subtitle = if (revealed && hasDetails) song.artist else null,
        footer = if (revealed && hasDetails && song.gameMode != GameMode.CLASSIC) song.year?.toString() else null,
    )
}

@Composable
internal fun CameraViewport(enabled: Boolean, copy: UiCopy, reservedHeight: Dp = 0.dp, onCode: (String) -> Unit) {
    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    var permission by remember { mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) }
    var denied by rememberSaveable { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableIntStateOf(0) }
    var torch by remember { mutableStateOf(false) }
    var camera by remember { mutableStateOf<ScannerCameraState?>(null) }
    var requestedZoom by remember { mutableStateOf<Float?>(null) }
    val request = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        permission = it; denied = !it
    }
    DisposableEffect(lifecycle, context) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME)
                permission = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        }
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer) }
    }
    val preferredHeight = (LocalConfiguration.current.screenHeightDp * .48f).coerceIn(230f, 470f).dp
    val availableHeight = LocalPaneHeight.current?.let { (it - 36.dp - reservedHeight).coerceAtLeast(180.dp) }
    val height = minOf(preferredHeight, availableHeight ?: preferredHeight)
    Box(Modifier.fillMaxWidth().height(height).clip(RoundedCornerShape(28.dp))
        .background(Color(0xFF22232D)).testTag("camera-preview"), contentAlignment = Alignment.Center) {
        if (permission && enabled && error == null) {
            key(attempt) {
                ScannerPreview(enabled = true, onCode = onCode, modifier = Modifier.fillMaxSize(),
                    onError = { error = it }, torchEnabled = torch, zoomRatio = requestedZoom,
                    onCameraState = { camera = it; requestedZoom = it.zoomRatio })
            }
            Viewfinder(Modifier.fillMaxSize())
            Text(copy.t("Umieść kod w kadrze", "Place the code in the frame"),
                color = Color.White, style = MaterialTheme.typography.labelMedium,
                modifier = Modifier.align(Alignment.TopCenter).padding(top = 22.dp)
                    .background(Color(0xAA16161D), CircleShape).padding(horizontal = 14.dp, vertical = 8.dp))
            Row(Modifier.align(Alignment.BottomCenter).padding(14.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                val levels = listOf(.5f, 1f, 2f, 4f).filter {
                    camera != null && it >= camera!!.minZoomRatio && it <= camera!!.maxZoomRatio
                }
                if (levels.size > 1) Surface(color = Color(0xC916161D), shape = CircleShape) {
                    Row {
                        levels.forEach { value ->
                            val selected = camera?.zoomRatio?.let { abs(it - value) < .18f } ?: false
                            TextButton(onClick = { requestedZoom = value }, modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                                colors = ButtonDefaults.textButtonColors(contentColor = if (selected) Color(0xFFEBD59A) else Color.White)) {
                                Text((if (value % 1f == 0f) value.toInt().toString() else value.toString()) + "×")
                            }
                        }
                    }
                }
                if (camera?.hasTorch == true) Surface(color = Color(0xC916161D), shape = CircleShape) {
                    IconButton(onClick = { torch = !torch }) {
                        Icon(AppIcons.Flash, copy.t(if (torch) "Wyłącz latarkę" else "Włącz latarkę",
                            if (torch) "Turn torch off" else "Turn torch on"),
                            tint = if (torch) Color(0xFFEBD59A) else Color.White)
                    }
                }
            }
        } else {
            Viewfinder(Modifier.fillMaxSize())
            Column(Modifier.padding(30.dp), horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Icon(if (error == null) AppIcons.Scan else AppIcons.Camera, null,
                    Modifier.size(46.dp), tint = Color(0xFFEBD59A))
                Text(error?.let(copy::message) ?: copy.t("Kod karty w środku kadru", "Card code inside the frame"),
                    color = Color.White, textAlign = TextAlign.Center, style = MaterialTheme.typography.titleMedium)
                FilledTonalButton(onClick = {
                    when {
                        error != null -> { error = null; attempt++ }
                        denied -> context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + context.packageName)))
                        else -> request.launch(Manifest.permission.CAMERA)
                    }
                }, modifier = Modifier.heightIn(min = 50.dp), shape = ControlShape) {
                    Text(when {
                        error != null -> copy.t("Spróbuj ponownie", "Try again")
                        denied -> copy.t("Ustawienia aparatu", "Camera settings")
                        else -> copy.t("Włącz aparat", "Enable camera")
                    })
                }
            }
        }
    }
}

@Composable
private fun Viewfinder(modifier: Modifier) {
    Canvas(modifier) {
        val edge = minOf(size.width, size.height) * .76f
        val x = (size.width - edge) / 2; val y = (size.height - edge) / 2
        val length = 25.dp.toPx()
        listOf(Offset(x, y) to Offset(1f, 1f), Offset(x + edge, y) to Offset(-1f, 1f),
            Offset(x, y + edge) to Offset(1f, -1f), Offset(x + edge, y + edge) to Offset(-1f, -1f)).forEach { (p, direction) ->
            drawLine(Color.White.copy(alpha = .8f), p, Offset(p.x + direction.x * length, p.y), 2.dp.toPx(), StrokeCap.Round)
            drawLine(Color.White.copy(alpha = .8f), p, Offset(p.x, p.y + direction.y * length), 2.dp.toPx(), StrokeCap.Round)
        }
    }
}
