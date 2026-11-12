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
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
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
internal fun ScanScreen(state: AppState, copy: UiCopy, onAction: (AppAction) -> Unit,
                        onManual: () -> Unit, cameraActive: Boolean = true) {
    val song = state.currentSong
    val hasAnswer = song?.let(::hasScannedAnswer) == true
    val revealed = hasAnswer && (state.answerRevealed || !state.settings.hideAnswers)
    AdaptivePanes(primary = {
        if (song == null) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                SectionTitle(copy.t("Skanuj kartę", "Scan a card"))
                CameraViewport(state.scannerEnabled && cameraActive, copy, reservedHeight = 44.dp) { onAction(AppAction.ScanCameraCode(it)) }
            }
        } else {
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                CardPlayback(state.playback, song, copy, onAction, answerVisible = revealed) {
                    ScannedTicket(song, revealed, state.activeSkin, copy)
                }
                Button(onClick = { onAction(AppAction.ScanNext) },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp).testTag("scan-new-card"), shape = ControlShape,
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary,
                        contentColor = MaterialTheme.colorScheme.onSecondary)) {
                    Icon(AppIcons.Scan, null, Modifier.size(20.dp))
                    Spacer(Modifier.width(10.dp))
                    Text(copy.t("Skanuj nową", "Scan a new card"))
                }
            }
        }
    }, secondary = {
        if (song == null) {
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                TextButton(onClick = onManual, modifier = Modifier.heightIn(min = 48.dp)) {
                    Icon(AppIcons.Link, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(copy.t("Wklej kod lub link", "Paste code or link"))
                }
            }
        } else {
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                if (hasAnswer && !revealed) {
                    OutlinedButton(onClick = { onAction(AppAction.RevealAnswer) },
                        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp), shape = ControlShape) {
                        Icon(AppIcons.Eye, null, Modifier.size(20.dp))
                        Spacer(Modifier.width(10.dp))
                        Text(copy.t("Odkryj odpowiedź", "Reveal answer"))
                    }
                }
            }
        }
    })
}

private fun hasScannedAnswer(song: Song): Boolean = when (song.gameMode) {
    GameMode.CLASSIC -> song.year != null
    GameMode.GAME, GameMode.MOVIE -> song.answer.isNotBlank()
}

@Composable
internal fun ScannedTicket(song: Song, revealed: Boolean, skin: CardSkin, copy: UiCopy) {
    FlippingTicket(cardKey = song.spotifyId, revealed = revealed && hasScannedAnswer(song),
        modifier = Modifier.semantics(mergeDescendants = true) {
            stateDescription = copy.t("Skórka: ${copy.skin(skin)}", "Skin: ${copy.skin(skin)}")
        }) { answerVisible ->
        YearTicket(
            skin = skin,
            year = when {
                !answerVisible -> ""
                song.gameMode != GameMode.CLASSIC -> song.answer
                else -> song.year?.toString() ?: "—"
            },
            eyebrow = if (answerVisible) copy.t("Odpowiedź", "The answer") else "",
            title = if (answerVisible) song.title else null,
            subtitle = if (answerVisible) song.artist else null,
            footer = if (answerVisible && song.gameMode != GameMode.CLASSIC) song.year?.toString() else null,
            answerSide = answerVisible,
            cardId = song.id,
            playbackOverlay = true,
        )
    }
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
    val preferredHeight = (LocalConfiguration.current.screenHeightDp * .50f).coerceIn(230f, 500f).dp
    val availableHeight = LocalPaneHeight.current?.let { (it - 36.dp - reservedHeight).coerceAtLeast(180.dp) }
    val height = availableHeight ?: preferredHeight
    BoxWithConstraints(Modifier.fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
        val edge = minOf(maxWidth, height)
        Box(Modifier.size(edge).clip(RoundedCornerShape(16.dp))
            .background(Color(0xFF15211E)).testTag("camera-preview"), contentAlignment = Alignment.Center) {
            if (permission && enabled && error == null) {
                key(attempt) {
                    ScannerPreview(enabled = true, onCode = onCode, modifier = Modifier.fillMaxSize(),
                        onError = { error = it }, torchEnabled = torch, zoomRatio = requestedZoom,
                        onCameraState = { camera = it; requestedZoom = it.zoomRatio })
                }
                Viewfinder(Modifier.fillMaxSize())
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
                                    colors = ButtonDefaults.textButtonColors(contentColor = if (selected) MaterialTheme.colorScheme.secondary else Color.White)) {
                                    Text((if (value % 1f == 0f) value.toInt().toString() else value.toString()) + "×")
                                }
                            }
                        }
                    }
                    if (camera?.hasTorch == true) Surface(color = Color(0xC916161D), shape = CircleShape) {
                        IconButton(onClick = { torch = !torch }) {
                            Icon(AppIcons.Flash, copy.t(if (torch) "Wyłącz latarkę" else "Włącz latarkę",
                                if (torch) "Turn torch off" else "Turn torch on"),
                                tint = if (torch) MaterialTheme.colorScheme.secondary else Color.White)
                        }
                    }
                }
            } else if (permission && !enabled && error == null) {
                Text(copy.t("Skanowanie wstrzymane", "Scanning paused"),
                    color = Color.White, style = MaterialTheme.typography.bodyMedium)
            } else {
                Viewfinder(Modifier.fillMaxSize())
                val compact = edge < 250.dp
                Column(Modifier.padding(if (compact) 18.dp else 30.dp), horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(if (compact) 10.dp else 16.dp)) {
                    Icon(if (error == null) AppIcons.Scan else AppIcons.Camera, null,
                        Modifier.size(if (compact) 28.dp else 34.dp), tint = MaterialTheme.colorScheme.secondary)
                    if (error != null || denied) Text(error?.let(copy::message) ?:
                        copy.t("Zezwól na aparat w ustawieniach aplikacji.", "Allow camera access in app settings."),
                        color = Color.White, textAlign = TextAlign.Center,
                        style = if (compact) MaterialTheme.typography.bodySmall else MaterialTheme.typography.bodyMedium)
                    FilledTonalButton(onClick = {
                        when {
                            error != null -> { error = null; attempt++ }
                            denied -> context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + context.packageName)))
                            else -> request.launch(Manifest.permission.CAMERA)
                        }
                    }, modifier = Modifier.heightIn(min = 48.dp), shape = ControlShape) {
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
