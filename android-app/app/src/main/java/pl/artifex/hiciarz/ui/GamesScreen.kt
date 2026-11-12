@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package pl.artifex.hiciarz.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import pl.artifex.hiciarz.model.*

@Composable
internal fun GamesScreen(state: AppState, copy: UiCopy, onAction: (AppAction) -> Unit,
                         onManual: () -> Unit, cameraActive: Boolean = true) {
    var reset by rememberSaveable { mutableStateOf(false) }
    var levelChange by remember { mutableStateOf<BingoLevel?>(null) }
    var options by rememberSaveable { mutableStateOf(false) }
    val selectLevel: (BingoLevel) -> Unit = { level ->
        if (state.bingoRound > 0 && state.bingoLevel != level) { options = false; levelChange = level }
        else onAction(AppAction.SetBingoLevel(level))
    }
    if (options) ModalBottomSheet(onDismissRequest = { options = false },
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        HideStatusBar()
        GameOptionsSheet(state, copy,
            onLevel = selectLevel,
            onRestart = { options = false; reset = true },
            onClose = { options = false })
    }
    HostBingoGame(state, copy, onAction,
        onManual = onManual, cameraActive = cameraActive && !options && !reset && levelChange == null,
        onLevel = selectLevel, onOptions = { options = true })
    if (reset) {
        AlertDialog(onDismissRequest = { reset = false },
            title = {
                HideStatusBar()
                Text(copy.t("Rozpocząć od nowa?", "Start again?"))
            },
            text = { Text(copy.t("Bieżąca rozgrywka zostanie zakończona.", "This will end the current game.")) },
            confirmButton = { TextButton(onClick = {
                onAction(AppAction.ResetBingo); reset = false
            }) { Text(copy.t("Nowa gra", "New game")) } },
            dismissButton = { TextButton(onClick = { reset = false }) { Text(copy.t("Anuluj", "Cancel")) } })
    }
    levelChange?.let { level ->
        AlertDialog(onDismissRequest = { levelChange = null },
            title = {
                HideStatusBar()
                Text(copy.t("Zmienić poziom pytań?", "Change the question level?"))
            },
            text = { Text(copy.t("Bieżąca runda zostanie zakończona. Użyj plansz PDF dla nowego poziomu.",
                "This ends the current round. Use the PDF boards for the new level.")) },
            confirmButton = { TextButton(onClick = { onAction(AppAction.SetBingoLevel(level)); levelChange = null }) {
                Text(copy.t("Zmień poziom", "Change level"))
            } },
            dismissButton = { TextButton(onClick = { levelChange = null }) { Text(copy.t("Anuluj", "Cancel")) } })
    }
}

@Composable
private fun HostBingoGame(state: AppState, copy: UiCopy, onAction: (AppAction) -> Unit,
                          onManual: () -> Unit, cameraActive: Boolean,
                          onLevel: (BingoLevel) -> Unit, onOptions: () -> Unit) {
    val stage = state.bingoStage
    AdaptivePanes(primary = {
        val stacked = LocalPaneHeight.current == null
        when (stage) {
            BingoStage.IDLE -> {
                BingoHeader(state, copy, onOptions)
                BingoLevelChoice(state.bingoLevel, copy, onLevel)
                BingoCategoryDraw(state, copy, onAction, compact = stacked, scanOnDraw = !stacked)
            }
            BingoStage.RULE -> if (stacked) {
                BingoHeader(state, copy, onOptions)
                BingoCategoryDraw(state, copy, onAction, compact = true)
            } else {
                Box(Modifier.fillMaxWidth().heightIn(min = 260.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(AppIcons.Scan, null, Modifier.size(32.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(copy.t("Skanowanie wstrzymane", "Scanning paused"),
                            style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            BingoStage.SCAN -> {
                if (stacked) {
                    BingoHeader(state, copy, onOptions)
                    BingoCategoryDraw(state, copy, onAction, compact = true)
                }
                CameraViewport(state.scannerEnabled && cameraActive, copy) {
                    onAction(AppAction.ScanCameraCode(it, bingo = true, bingoRound = state.bingoRound))
                }
            }
            BingoStage.PLAYING -> state.bingoSong?.let { song ->
                if (stacked) {
                    BingoHeader(state, copy, onOptions)
                    BingoCategoryDraw(state, copy, onAction, compact = true,
                        showHint = state.question !in listOf(QuestionType.YEAR_WITHIN_TWO,
                            QuestionType.YEAR_WITHIN_THREE, QuestionType.YEAR_WITHIN_FOUR))
                }
                CardPlayback(state.playback, song, copy, onAction,
                    answerVisible = state.bingoAnswerRevealed && hasBingoAnswer(song, state.question),
                    compact = stacked) {
                    BingoTicket(song, state.question,
                        revealed = state.bingoAnswerRevealed && hasBingoAnswer(song, state.question),
                        skin = state.activeSkin, copy = copy, compact = stacked)
                }
            }
        }
    }, secondary = {
        val stacked = LocalPaneHeight.current == null
        when (stage) {
            BingoStage.IDLE -> BingoPreparation(state, copy)
            BingoStage.RULE -> {
                if (!stacked) {
                    BingoHeader(state, copy, onOptions)
                    BingoCategoryDraw(state, copy, onAction)
                }
                TextButton(onClick = { onAction(AppAction.BeginBingoScan) },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp), shape = ControlShape) {
                    Icon(AppIcons.Scan, null, Modifier.size(20.dp))
                    Spacer(Modifier.width(10.dp))
                    Text(copy.t("Skanuj kartę", "Scan card"))
                }
            }
            BingoStage.SCAN -> {
                if (!stacked) {
                    BingoHeader(state, copy, onOptions)
                    BingoCategoryDraw(state, copy, onAction)
                }
                Column {
                    TextButton(onClick = onManual, modifier = Modifier.heightIn(min = 48.dp)) {
                        Icon(AppIcons.Link, null, Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(copy.t("Wklej kod lub link", "Paste code or link"))
                    }
                    TextButton(onClick = { onAction(AppAction.CancelBingoScan) }, modifier = Modifier.heightIn(min = 48.dp)) {
                        Icon(AppIcons.Back, null, Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(if (stacked) copy.t("Wróć do pytania", "Back to the question")
                            else copy.t("Wstrzymaj skanowanie", "Pause scanning"))
                    }
                }
            }
            BingoStage.PLAYING -> state.bingoSong?.let { song ->
                if (!stacked) {
                    BingoHeader(state, copy, onOptions)
                    BingoCategoryDraw(state, copy, onAction)
                }
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    val answerAvailable = hasBingoAnswer(song, state.question)
                    val nextRound = { onAction(if (stacked) AppAction.DrawBingo else AppAction.DrawBingoAndScan) }
                    if (answerAvailable && !state.bingoAnswerRevealed) {
                        OutlinedButton(onClick = { onAction(AppAction.RevealBingoAnswer) },
                            modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp), shape = ControlShape) {
                            Icon(AppIcons.Eye, null, Modifier.size(20.dp))
                            Spacer(Modifier.width(10.dp))
                            Text(copy.t("Odkryj odpowiedź", "Reveal answer"))
                        }
                        TextButton(onClick = nextRound, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                            Text(copy.t("Następna runda", "Next round"))
                            Spacer(Modifier.width(8.dp))
                            Icon(AppIcons.Arrow, null, Modifier.size(18.dp))
                        }
                    } else {
                        if (!answerAvailable) Text(copy.t("Odpowiedź znajdziesz na drukowanej karcie.",
                            "Read the answer on the printed card."), style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                        OutlinedButton(onClick = nextRound, modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp), shape = ControlShape) {
                            Text(copy.t("Następna runda", "Next round"))
                            Spacer(Modifier.width(10.dp))
                            Icon(AppIcons.Arrow, null, Modifier.size(20.dp))
                        }
                    }
                }
            }
        }
    })
}

@Composable
internal fun BingoLevelChoice(level: BingoLevel, copy: UiCopy, onLevel: (BingoLevel) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(copy.t("Poziom pytań", "Question level"), style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
            listOf(BingoLevel.BEGINNER to copy.t("Podstawowy", "Beginner"), BingoLevel.EXPERT to copy.t("Zaawansowany", "Expert"))
                .forEachIndexed { index, (value, label) ->
                    SegmentedButton(selected = level == value, onClick = { onLevel(value) }, icon = {},
                        shape = SegmentedButtonDefaults.itemShape(index, 2), modifier = Modifier.heightIn(min = 48.dp)) {
                        Text(label)
                    }
                }
        }
    }
}

@Composable
private fun BingoPreparation(state: AppState, copy: UiCopy) {
    var categoriesExpanded by rememberSaveable(state.bingoLevel) { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        TextButton(onClick = { categoriesExpanded = !categoriesExpanded },
            modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp), contentPadding = PaddingValues(horizontal = 0.dp)) {
            Text(copy.t("Kategorie na planszy", "Categories on the board"), modifier = Modifier.weight(1f))
            Icon(AppIcons.Chevron, null, Modifier.size(18.dp).rotate(if (categoriesExpanded) 90f else 0f))
        }
        if (categoriesExpanded) {
            BingoRules.categories(state.bingoLevel).forEachIndexed { index, type ->
                Row(Modifier.fillMaxWidth().padding(vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.Top) {
                    Text((index + 1).toString(), modifier = Modifier.width(16.dp),
                        style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(copy.question(type), style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}

@Composable
private fun BingoHeader(state: AppState, copy: UiCopy, onOptions: () -> Unit) {
    val context = LocalContext.current
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        TextButton(onClick = { openUrl(context, bingoBoardUrl(state.bingoLevel, copy.language)) },
            modifier = Modifier.weight(1f).heightIn(min = 48.dp).testTag("bingo-boards-download"),
            contentPadding = PaddingValues(horizontal = 8.dp)) {
            Icon(AppIcons.Decks, null, Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text(copy.t("Plansze do pobrania", "Get Bingo boards"))
        }
        IconButton(onClick = onOptions, modifier = Modifier.size(48.dp)) {
            Icon(AppIcons.Settings, copy.t("Ustawienia Bingo", "Bingo settings"), Modifier.size(20.dp))
        }
    }
}

// The category numbers, colors and display type follow web/src/BingoGame.tsx and bingo.ts.
private val bingoCategoryColors = listOf(
    Color(0xFFE0EBDF) to Color(0xFF31583D),
    Color(0xFFF5E5C2) to Color(0xFF745521),
    Color(0xFFDCE8F4) to Color(0xFF355875),
    Color(0xFFEEDFEE) to Color(0xFF714570),
    Color(0xFFF4DDD2) to Color(0xFF804D39),
)

@Composable
private fun BingoCategoryDraw(state: AppState, copy: UiCopy, onAction: (AppAction) -> Unit,
                              compact: Boolean = false, showHint: Boolean = true, scanOnDraw: Boolean = false) {
    val empty = state.bingoStage == BingoStage.IDLE
    val index = BingoRules.categories(state.bingoLevel).indexOf(state.question).coerceAtLeast(0)
    val colors = MaterialTheme.colorScheme
    val (fill, ink) = if (empty) colors.inverseSurface to colors.inverseOnSurface else bingoCategoryColors[index]
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Surface(Modifier.fillMaxWidth().testTag(if (empty) "bingo-empty-category" else "bingo-rule-card")
            .semantics { liveRegion = LiveRegionMode.Polite },
            shape = RoundedCornerShape(22.dp), color = fill, contentColor = ink) {
            Column(Modifier.fillMaxWidth().heightIn(min = if (!empty && compact) 164.dp else 224.dp)
                .padding(if (compact) 22.dp else 28.dp), verticalArrangement = Arrangement.Center) {
                if (empty) {
                    Icon(AppIcons.Bingo, null, Modifier.size(40.dp), tint = colors.inversePrimary)
                    Spacer(Modifier.height(24.dp))
                    Text(copy.t("Co dziś odgadujemy?", "What are we guessing today?"),
                        style = if (compact) MaterialTheme.typography.headlineLarge.copy(fontSize = 36.sp, lineHeight = 39.sp)
                            else MaterialTheme.typography.displaySmall,
                        modifier = Modifier.semantics { heading() })
                } else {
                    Text(copy.t("Runda ${state.bingoRound} · Kategoria ${index + 1}", "Round ${state.bingoRound} · Category ${index + 1}"),
                        style = MaterialTheme.typography.labelSmall, color = ink.copy(alpha = .8f))
                    Spacer(Modifier.height(if (compact) 16.dp else 24.dp))
                    Text(copy.question(state.question),
                        style = if (compact) MaterialTheme.typography.headlineLarge.copy(fontSize = 36.sp, lineHeight = 39.sp)
                            else MaterialTheme.typography.displaySmall,
                        modifier = Modifier.semantics { heading() })
                    if (showHint) bingoHint(state.question, copy)?.let {
                        Spacer(Modifier.height(16.dp))
                        Text(it, style = MaterialTheme.typography.bodyMedium, color = ink)
                    }
                }
            }
        }
        Button(onClick = { onAction(if (empty) {
            if (scanOnDraw) AppAction.DrawBingoAndScan else AppAction.DrawBingo
        } else AppAction.RedrawBingoQuestion) },
            modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp).testTag("bingo-draw-category"),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = colors.secondary, contentColor = colors.onSecondary)) {
            Icon(AppIcons.Shuffle, null, Modifier.size(21.dp))
            Spacer(Modifier.width(10.dp))
            Text(if (empty) copy.t("Losuj kategorię", "Draw a category")
                else copy.t("Losuj kolejną kategorię", "Draw another category"))
        }
    }
}

private fun hasBingoAnswer(song: Song, question: QuestionType): Boolean = when (question) {
    QuestionType.TITLE -> song.title.isNotBlank()
    QuestionType.ARTIST, QuestionType.BAND_OR_SOLO -> song.artist.isNotBlank()
    QuestionType.SOURCE -> song.answer.isNotBlank()
    else -> song.year != null
}

@Composable
private fun BingoTicket(song: Song, question: QuestionType, revealed: Boolean, skin: CardSkin,
                        copy: UiCopy, compact: Boolean = false) {
    val answer = when (question) {
        QuestionType.TITLE -> song.title
        QuestionType.ARTIST -> song.artist
        QuestionType.SOURCE -> song.answer
        QuestionType.DECADE -> song.year?.let { copy.t("Lata ${it / 10 * 10}.", "${it / 10 * 10}s") }
        QuestionType.BEFORE_2000 -> song.year?.let {
            if (it < 2000) copy.t("Przed 2000", "Before 2000") else copy.t("Od 2000", "2000 onwards")
        }
        QuestionType.BAND_OR_SOLO -> song.artist
        else -> song.year?.toString()
    }
    FlippingTicket(cardKey = song.spotifyId to question, revealed = revealed,
        modifier = Modifier.semantics(mergeDescendants = true) {
            stateDescription = copy.t("Skórka: ${copy.skin(skin)}", "Skin: ${copy.skin(skin)}")
        }) { answerVisible ->
        YearTicket(skin, if (answerVisible) answer.orEmpty() else "",
            eyebrow = if (answerVisible) copy.t("Odpowiedź", "The answer") else "",
            title = when {
                !answerVisible -> null
                question == QuestionType.BAND_OR_SOLO -> copy.t("Oceńcie wspólnie: zespół czy solista.", "Decide together: band or solo artist.")
                question == QuestionType.TITLE -> song.artist
                else -> song.title
            },
            subtitle = if (answerVisible && question != QuestionType.TITLE) song.artist.takeUnless { it == answer } else null,
            footer = if (answerVisible && question == QuestionType.BEFORE_2000) song.year?.toString() else null,
            answerSide = answerVisible, cardId = song.id, compact = compact, playbackOverlay = true)
    }
}

private fun bingoHint(type: QuestionType, copy: UiCopy): String? = when (type) {
    QuestionType.BAND_OR_SOLO -> copy.t("Duety i gościnne występy liczymy jako zespół.", "Count duets and guest appearances as a band.")
    QuestionType.BEFORE_2000 -> copy.t("Do 1999 włącznie czy od 2000 roku?", "1999 or earlier, or 2000 onwards?")
    QuestionType.YEAR_WITHIN_FOUR -> copy.t("Pomyłka o najwyżej 4 lata daje punkt.", "An answer within 4 years counts.")
    QuestionType.YEAR_WITHIN_TWO -> copy.t("Pomyłka o najwyżej 2 lata daje punkt.", "An answer within 2 years counts.")
    QuestionType.YEAR_WITHIN_THREE -> copy.t("Pomyłka o najwyżej 3 lata daje punkt.", "An answer within 3 years counts.")
    QuestionType.DECADE -> copy.t("Podaj dekadę, np. lata 80.", "Name the decade, for example the 1980s.")
    else -> null
}
