@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class, androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package pl.artifex.hiciarz.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import pl.artifex.hiciarz.model.*

@Composable
internal fun GamesScreen(state: AppState, copy: UiCopy, onAction: (AppAction) -> Unit,
                         onDeck: () -> Unit, onManual: () -> Unit, cameraActive: Boolean = true) {
    var reset by rememberSaveable { mutableStateOf<CardlessMode?>(null) }
    var levelChange by remember { mutableStateOf<BingoLevel?>(null) }
    var options by rememberSaveable { mutableStateOf(false) }
    val selectLevel: (BingoLevel) -> Unit = { level ->
        if (state.bingoRound > 0 && state.bingoLevel != level) { options = false; levelChange = level }
        else onAction(AppAction.SetBingoLevel(level))
    }
    val active = when (state.cardlessMode) {
        CardlessMode.TIMELINE -> state.timeline.started
        CardlessMode.QUIZ -> state.quiz.started
        CardlessMode.BINGO -> state.bingoStage != BingoStage.IDLE
    }
    val header: @Composable ColumnScope.() -> Unit = {
        if (active) SectionTitle(copy.game(state.cardlessMode), copy.t("Zmień grę", "Change game")) { options = true }
        else SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
            listOf(CardlessMode.TIMELINE, CardlessMode.QUIZ, CardlessMode.BINGO).forEachIndexed { index, mode ->
                SegmentedButton(selected = state.cardlessMode == mode,
                    onClick = { onAction(AppAction.SetCardlessMode(mode)) },
                    icon = {},
                    shape = SegmentedButtonDefaults.itemShape(index, 3),
                    modifier = Modifier.heightIn(min = 48.dp).testTag("mode-" + mode.name.lowercase())) { Text(copy.game(mode), maxLines = 1) }
            }
        }
        if (!active && state.cardlessMode != CardlessMode.BINGO) DeckSelector(state.activeDeck, copy, onDeck)
    }
    if (options) ModalBottomSheet(onDismissRequest = { options = false }) {
        GameOptionsSheet(state, copy, onAction,
            onLevel = selectLevel,
            onDeck = { options = false; onDeck() },
            onRestart = { options = false; reset = state.cardlessMode },
            onClose = { options = false })
    }
    when (state.cardlessMode) {
        CardlessMode.TIMELINE -> TimelineGame(state, copy, onAction, header) { reset = CardlessMode.TIMELINE }
        CardlessMode.QUIZ -> QuizGame(state, copy, onAction, header) { reset = CardlessMode.QUIZ }
        CardlessMode.BINGO -> HostBingoGame(state, copy, onAction, header,
            onManual = onManual, cameraActive = cameraActive && !options && reset == null && levelChange == null, onLevel = selectLevel,
            onReset = { reset = CardlessMode.BINGO })
    }
    reset?.let { mode ->
        AlertDialog(onDismissRequest = { reset = null },
            title = { Text(copy.t("Rozpocząć od nowa?", "Start again?")) },
            text = { Text(copy.t("Bieżąca rozgrywka zostanie zakończona.", "This will end the current game.")) },
            confirmButton = { TextButton(onClick = {
                onAction(when (mode) {
                    CardlessMode.TIMELINE -> AppAction.ResetTimeline
                    CardlessMode.QUIZ -> AppAction.ResetQuiz
                    CardlessMode.BINGO -> AppAction.ResetBingo
                }); reset = null
            }) { Text(copy.t("Nowa gra", "New game")) } },
            dismissButton = { TextButton(onClick = { reset = null }) { Text(copy.t("Anuluj", "Cancel")) } })
    }
    levelChange?.let { level ->
        AlertDialog(onDismissRequest = { levelChange = null },
            title = { Text(copy.t("Zmienić poziom pytań?", "Change the question level?")) },
            text = { Text(copy.t("Bieżąca runda zostanie zakończona. Użyj plansz PDF dla nowego poziomu.",
                "This ends the current round. Use the PDF boards for the new level.")) },
            confirmButton = { TextButton(onClick = { onAction(AppAction.SetBingoLevel(level)); levelChange = null }) {
                Text(copy.t("Zmień poziom", "Change level"))
            } },
            dismissButton = { TextButton(onClick = { levelChange = null }) { Text(copy.t("Anuluj", "Cancel")) } })
    }
}

@Composable
private fun TimelineGame(state: AppState, copy: UiCopy, onAction: (AppAction) -> Unit,
                         header: @Composable ColumnScope.() -> Unit, onReset: () -> Unit) {
    val game = state.timeline
    AdaptivePanes(primary = {
        val stacked = LocalPaneHeight.current == null
        Column(verticalArrangement = Arrangement.spacedBy(if (stacked && game.started) 12.dp else 20.dp)) {
            header()
            if (!game.started) {
                GameIntro(CardlessMode.TIMELINE, copy,
                    title = copy.t("Który utwór był pierwszy?", "Which track came first?"),
                    detail = copy.t("Słuchaj i układaj lata. Zbierz 10 kart na własnej osi czasu.",
                        "Listen and order the years. Collect 10 cards on your timeline."))
                Button(onClick = { onAction(AppAction.StartTimeline) }, enabled = state.activeDeck != null,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp), shape = ControlShape) {
                    Icon(AppIcons.Play, null, Modifier.size(20.dp)); Spacer(Modifier.width(10.dp))
                    Text(copy.t("Zacznij grę", "Start game"))
                }
            } else {
                GameProgress(game.board.size, game.targetCards, copy.t("karty", "cards"),
                    copy.t("Tura ${game.round}", "Round ${game.round}"))
                game.currentSong?.let { song ->
                    YearTicket(skinForSong(state, song), if (game.revealed) song.year.toString() else "?",
                        copy.t("Który to rok?", "Which year?"),
                        title = if (game.revealed) song.title else null,
                        subtitle = if (game.revealed) song.artist else null, compact = stacked)
                    PlaybackControls(state.playback, state.settings, copy, onAction,
                        expectedUri = song.spotifyUri, playAction = AppAction.PlayCard(song))
                }
                if (stacked) {
                    TimelineBoard(game, state, copy, onAction, compact = true)
                    if (!game.revealed && game.selectedGap == null)
                        Text(copy.t("Wybierz + przed, między lub po latach.", "Choose + before, between or after the years."),
                            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(copy.t("Pomyłki: ${game.mistakes}", "Misses: ${game.mistakes}"),
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (game.revealed) {
                    RoundOutcome(game.correct == true,
                        if (game.correct == true) copy.t("Dobre miejsce!", "Right place!")
                        else copy.t("Utwór pasuje w inne miejsce.", "This track belongs elsewhere."))
                    if (game.finished) GameFinished(game.won, copy) { onAction(AppAction.ResetTimeline) }
                    else Button(onClick = { onAction(AppAction.NextTimeline) },
                        modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp), shape = ControlShape) {
                        Text(copy.t("Następny utwór", "Next track")); Spacer(Modifier.width(10.dp)); Icon(AppIcons.Arrow, null)
                    }
                } else Button(onClick = { onAction(AppAction.RevealTimeline) }, enabled = game.selectedGap != null,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp), shape = ControlShape) {
                    Text(copy.t("Sprawdź miejsce", "Check position"))
                }
            }
        }
    }, secondary = {
        if (game.started && LocalPaneHeight.current != null) {
            SectionTitle(copy.t("Twoja oś", "Your timeline"), copy.t("Od nowa", "Restart"), onReset)
            Text(if (game.revealed && game.correct == false)
                copy.t("Poprawne miejsce zaznaczono na osi.", "The correct gap is highlighted.")
                else if (game.revealed) copy.t("Trafiona karta zostaje na osi.", "The correct card stays on your timeline.")
                else copy.t("Wybierz + przed, między lub po latach.", "Choose + before, between or after the years."),
                style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            TimelineBoard(game, state, copy, onAction)
            if (game.selectedGap != null && !game.revealed)
                Text(gapLabel(game.board, game.selectedGap, copy), style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary)
            Text(copy.t("Pomyłki: ${game.mistakes}", "Misses: ${game.mistakes}"),
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else if (!game.started) {
            Text(copy.t("Pierwsza karta jest odkryta", "Your starter is revealed"), style = MaterialTheme.typography.titleMedium)
            Text(copy.t("Pierwszą kartę odkryjemy dla Ciebie. Kolejne lata dopasujesz ze słuchu.",
                "Your starter card is revealed. Place the next years by listening."),
                style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    })
}

@Composable
private fun TimelineBoard(game: TimelineState, state: AppState, copy: UiCopy, onAction: (AppAction) -> Unit, compact: Boolean = false) {
    LazyRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically, contentPadding = PaddingValues(vertical = 10.dp)) {
        for (gap in 0..game.board.size) {
            item(key = "gap-$gap") {
                val selected = !game.revealed && game.selectedGap == gap
                val correct = game.revealed && game.correct == false && game.correctGap == gap
                Surface(onClick = { onAction(AppAction.ChooseTimelineGap(gap)) },
                    enabled = !game.revealed && !game.finished,
                    shape = CircleShape,
                    color = when { selected -> MaterialTheme.colorScheme.primary; correct -> MaterialTheme.colorScheme.secondaryContainer; else -> MaterialTheme.colorScheme.surface },
                    border = BorderStroke(1.dp, if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant),
                    modifier = Modifier.size(48.dp).semantics { contentDescription = gapLabel(game.board, gap, copy) }) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(if (selected || correct) AppIcons.Check else AppIcons.Add, null,
                            tint = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.primary)
                    }
                }
            }
            if (gap < game.board.size) item(key = "card-$gap") {
                val song = game.board[gap]
                val skin = skinForSong(state, song)
                val current = game.revealed && game.correct == true && song.spotifyId == game.currentSong?.spotifyId
                Surface(shape = ControlShape,
                    border = if (current) BorderStroke(3.dp, MaterialTheme.colorScheme.secondary) else null,
                    modifier = Modifier.width(if (compact) 108.dp else 122.dp).height(if (compact) 130.dp else 160.dp)) {
                    Box {
                        SkinPattern(skin, Modifier.fillMaxSize(), subdued = true)
                        Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(song.year.toString(), style = if (compact) MaterialTheme.typography.headlineLarge else MaterialTheme.typography.displaySmall, color = skin.palette().paper)
                            Text(song.title, style = MaterialTheme.typography.bodySmall, color = skin.palette().paper,
                                maxLines = 2, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun QuizGame(state: AppState, copy: UiCopy, onAction: (AppAction) -> Unit,
                     header: @Composable ColumnScope.() -> Unit, onReset: () -> Unit) {
    val game = state.quiz
    val song = game.currentSong
    val mode = song?.gameMode ?: state.activeDeck?.gameMode ?: GameMode.CLASSIC
    val question = when (mode) {
        GameMode.CLASSIC -> copy.t("Jaki to utwór?", "Which track?")
        GameMode.GAME -> copy.t("Jaka to gra?", "Which game?")
        GameMode.MOVIE -> copy.t("Jaki to film?", "Which film?")
    }
    AdaptivePanes(primary = {
        header()
        if (!game.started) {
            GameIntro(CardlessMode.QUIZ, copy, question,
                copy.t("Posłuchaj, podaj odpowiedź i sprawdź ją po odkryciu. Gracie solo lub wspólnie.",
                    "Listen, name it and check after revealing. Play solo or as a team."))
            Button(onClick = { onAction(AppAction.StartQuiz) }, enabled = state.activeDeck != null,
                modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp), shape = ControlShape) {
                Text(copy.t("Zacznij zgadywać", "Start guessing")); Spacer(Modifier.width(10.dp)); Icon(AppIcons.Play, null)
            }
        } else if (song != null) {
            GameProgress(game.correctCount, game.targetScore, copy.t("punkty", "points"),
                copy.t("Tura ${game.round}", "Round ${game.round}"))
            YearTicket(skinForSong(state, song),
                if (!game.revealed) "?" else if (song.gameMode == GameMode.CLASSIC) song.title else song.answer,
                if (game.revealed) copy.t("Odpowiedź", "The answer") else question,
                title = if (game.revealed && song.gameMode != GameMode.CLASSIC) song.title else null,
                subtitle = if (game.revealed) song.artist else copy.t("Powiedz odpowiedź, zanim odkryjesz kartę.", "Say your answer before revealing."),
                footer = if (game.revealed) song.year?.toString() else null)
            PlaybackControls(state.playback, state.settings, copy, onAction,
                expectedUri = song.spotifyUri, playAction = AppAction.PlayCard(song))
            when {
                !game.revealed -> Button(onClick = { onAction(AppAction.RevealQuiz) },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp), shape = ControlShape) {
                    Icon(AppIcons.Eye, null); Spacer(Modifier.width(10.dp)); Text(copy.t("Odkryj odpowiedź", "Reveal answer"))
                }
                !game.answered -> AnswerGrade(copy) { onAction(AppAction.SubmitQuizAnswer(it)) }
                game.finished -> GameFinished(game.won, copy) { onAction(AppAction.ResetQuiz) }
                else -> Button(onClick = { onAction(AppAction.NextQuiz) },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp), shape = ControlShape) {
                    Text(copy.t("Następny utwór", "Next track")); Spacer(Modifier.width(10.dp)); Icon(AppIcons.Arrow, null)
                }
            }
        }
    }, secondary = {
        SectionTitle(copy.t("Jak zgadujesz?", "What are you guessing?"),
            if (game.started) copy.t("Od nowa", "Restart") else null, if (game.started) onReset else null)
        Text(when (mode) {
            GameMode.CLASSIC -> copy.t("Rozpoznaj tytuł i wykonawcę. Rok zobaczysz razem z odpowiedzią.", "Name the title and artist. The year appears with the answer.")
            GameMode.GAME -> copy.t("Rozpoznaj grę po ścieżce dźwiękowej.", "Recognize the game from its soundtrack.")
            GameMode.MOVIE -> copy.t("Rozpoznaj film po jego muzyce.", "Recognize the film from its music.")
        }, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (game.started) Text(copy.t("Utwory w tej rozgrywce się nie powtarzają.", "Tracks do not repeat within this game."),
            style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    })
}

@Composable
private fun HostBingoGame(state: AppState, copy: UiCopy, onAction: (AppAction) -> Unit,
                          header: @Composable ColumnScope.() -> Unit, onManual: () -> Unit, cameraActive: Boolean,
                          onLevel: (BingoLevel) -> Unit, onReset: () -> Unit) {
    val context = LocalContext.current
    val stage = state.bingoStage
    AdaptivePanes(primary = {
        val stacked = LocalPaneHeight.current == null
        if (stage != BingoStage.SCAN) header()
        when (stage) {
            BingoStage.IDLE -> {
                GameIntro(CardlessMode.BINGO, copy,
                    copy.t("Telefon prowadzącego", "The host’s phone"),
                    copy.t("Wylosuj pytanie i zeskanuj kartę, aby puścić muzykę. Gracze zaznaczają odpowiedzi na papierowych planszach.",
                        "Draw a question, scan a card and play the music. Players mark answers on their printed boards."))
                Button(onClick = { onAction(if (stacked) AppAction.DrawBingo else AppAction.DrawBingoAndScan) },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp), shape = ControlShape) {
                    Icon(AppIcons.Shuffle, null); Spacer(Modifier.width(10.dp)); Text(copy.t("Wylosuj pytanie", "Draw a question"))
                }
            }
            BingoStage.RULE -> if (stacked) BingoRuleCard(state, copy) else {
                Surface(color = MaterialTheme.colorScheme.surfaceVariant, shape = PanelShape,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 230.dp)) {
                    Column(Modifier.padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically)) {
                        Icon(AppIcons.Scan, null, Modifier.size(46.dp), tint = MaterialTheme.colorScheme.primary)
                        Text(copy.t("Skanowanie wstrzymane", "Scanning paused"), style = MaterialTheme.typography.titleMedium)
                    }
                }
            }
            BingoStage.SCAN -> {
                if (stacked) BingoRuleLabel(state, copy)
                CameraViewport(state.scannerEnabled && cameraActive, copy) {
                    onAction(AppAction.ScanCameraCode(it, bingo = true, bingoRound = state.bingoRound))
                }
            }
            BingoStage.PLAYING -> state.bingoSong?.let { song ->
                if (stacked) BingoRuleLabel(state, copy)
                BingoTicket(song, state.question, state.bingoAnswerRevealed, state.activeSkin, copy)
            }
        }
    }, secondary = {
        val stacked = LocalPaneHeight.current == null
        when (stage) {
            BingoStage.SCAN -> {
                if (!stacked) BingoRuleCard(state, copy)
                OutlinedButton(onClick = onManual, modifier = Modifier.fillMaxWidth().heightIn(min = 50.dp), shape = ControlShape) {
                    Icon(AppIcons.Link, null); Spacer(Modifier.width(10.dp))
                    Text(copy.t("Wklej kod lub link", "Paste code or link"))
                }
                TextButton(onClick = { onAction(AppAction.CancelBingoScan) }) {
                    Icon(AppIcons.Back, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp))
                    Text(if (stacked) copy.t("Wróć do pytania", "Back to the question")
                        else copy.t("Wstrzymaj skanowanie", "Pause scanning"))
                }
            }
            BingoStage.RULE -> {
                if (!stacked) BingoRuleCard(state, copy)
                Button(onClick = { onAction(AppAction.BeginBingoScan) },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp), shape = ControlShape) {
                    Icon(AppIcons.Scan, null); Spacer(Modifier.width(10.dp)); Text(copy.t("Skanuj kartę", "Scan card"))
                }
                Text(copy.t("Gracze zaznaczają trafienia na papierowych planszach. Po odsłuchaniu sprawdźcie odpowiedź na karcie.",
                    "Players mark correct answers on their printed boards. Check the card’s answer after listening."),
                    style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            BingoStage.PLAYING -> state.bingoSong?.let { song ->
                if (!stacked) BingoRuleCard(state, copy)
                PlaybackControls(state.playback, state.settings, copy, onAction,
                    expectedUri = song.spotifyUri, playAction = AppAction.PlayCard(song))
                if (!state.bingoAnswerRevealed) OutlinedButton(onClick = { onAction(AppAction.RevealBingoAnswer) },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp), shape = ControlShape) {
                    Icon(AppIcons.Eye, null); Spacer(Modifier.width(10.dp)); Text(copy.t("Odkryj odpowiedź", "Reveal answer"))
                }
                Button(onClick = { onAction(if (stacked) AppAction.DrawBingo else AppAction.DrawBingoAndScan) },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp), shape = ControlShape) {
                    Text(copy.t("Następna runda", "Next round")); Spacer(Modifier.width(10.dp)); Icon(AppIcons.Arrow, null)
                }
            }
            BingoStage.IDLE -> {
                Text(copy.t("Poziom pytań", "Question level"), style = MaterialTheme.typography.titleSmall)
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    listOf(BingoLevel.BEGINNER to copy.t("Podstawowy", "Beginner"), BingoLevel.EXPERT to copy.t("Zaawansowany", "Expert"))
                        .forEachIndexed { index, (level, label) ->
                            SegmentedButton(selected = state.bingoLevel == level, onClick = { onLevel(level) }, icon = {},
                                shape = SegmentedButtonDefaults.itemShape(index, 2), modifier = Modifier.heightIn(min = 48.dp)) { Text(label) }
                        }
                }
                OutlinedButton(onClick = { openUrl(context, bingoBoardUrl(state.bingoLevel, copy.language)) },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 50.dp), shape = ControlShape) {
                    Icon(AppIcons.Decks, null, Modifier.size(20.dp)); Spacer(Modifier.width(10.dp))
                    Text(copy.t("Plansze do pobrania", "Get Bingo boards"))
                }
                CategoryLegend(state, copy)
            }
        }
        if (stage != BingoStage.IDLE && stage != BingoStage.SCAN)
            TextButton(onClick = onReset) { Text(copy.t("Zakończ grę Bingo", "End Bingo game")) }
    })
}

private val categoryColors = listOf(
    Color(0xFFE0EBDF) to Color(0xFF31583D), Color(0xFFF5E5C2) to Color(0xFF745521),
    Color(0xFFDCE8F4) to Color(0xFF355875), Color(0xFFEEDFee) to Color(0xFF714570),
    Color(0xFFF4DDD2) to Color(0xFF804D39),
)

@Composable
private fun BingoTicket(song: Song, question: QuestionType, revealed: Boolean, skin: CardSkin, copy: UiCopy) {
    val answer = when (question) {
        QuestionType.TITLE -> song.title
        QuestionType.ARTIST -> song.artist
        QuestionType.SOURCE -> song.answer
        QuestionType.DECADE -> song.year?.let { copy.t("Lata ${it / 10 * 10}.", "${it / 10 * 10}s") }
        QuestionType.BEFORE_2000 -> song.year?.let {
            if (it < 2000) copy.t("Przed 2000", "Before 2000")
            else copy.t("Od 2000", "2000 onwards")
        }
        QuestionType.BAND_OR_SOLO -> song.artist
        else -> song.year?.toString()
    }
    YearTicket(skin, if (!revealed) "?" else answer?.takeIf { it.isNotBlank() } ?: "—",
        eyebrow = if (revealed) copy.t("Odpowiedź", "The answer") else copy.t("Twoja karta", "Your card"),
        title = when {
            !revealed -> null
            answer.isNullOrBlank() -> copy.t("Odpowiedź na drukowanej karcie", "Read the answer on your printed card")
            question == QuestionType.BAND_OR_SOLO -> copy.t("Zespół czy solista? Oceńcie wspólnie.", "Band or solo artist? Decide together.")
            question == QuestionType.TITLE -> song.artist
            else -> song.title
        },
        subtitle = if (revealed && !answer.isNullOrBlank() && question != QuestionType.TITLE) song.artist.takeUnless { it == answer } else null,
        footer = if (revealed && question == QuestionType.BEFORE_2000) song.year?.toString() else null)
}

@Composable
private fun BingoRuleCard(state: AppState, copy: UiCopy) {
    val index = BingoRules.categories(state.bingoLevel).indexOf(state.question).coerceAtLeast(0)
    val (fill, ink) = categoryColors[index % categoryColors.size]
    Surface(color = fill, shape = PanelShape, modifier = Modifier.testTag("bingo-rule-card")) {
        Column(Modifier.fillMaxWidth().padding(24.dp).heightIn(min = 174.dp), verticalArrangement = Arrangement.spacedBy(15.dp)) {
            Text(copy.t("Runda ${state.bingoRound} · kategoria ${index + 1}", "Round ${state.bingoRound} · category ${index + 1}"),
                style = MaterialTheme.typography.labelMedium, color = ink)
            Text(copy.question(state.question), style = MaterialTheme.typography.headlineLarge, color = ink)
            bingoHint(state.question, copy)?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = ink) }
        }
    }
}

@Composable
private fun CategoryLegend(state: AppState, copy: UiCopy) {
    SettingGroup(copy.t("Kategorie na planszy", "Categories on the board")) {
        BingoRules.categories(state.bingoLevel).forEachIndexed { index, type ->
            if (index > 0) GroupDivider()
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                val (fill, ink) = categoryColors[index]
                Surface(color = fill, shape = CircleShape) {
                    Box(Modifier.size(30.dp), contentAlignment = Alignment.Center) {
                        Text((index + 1).toString(), style = MaterialTheme.typography.labelLarge, color = ink)
                    }
                }
                Text(copy.question(type), style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Composable
private fun BingoRuleLabel(state: AppState, copy: UiCopy) {
    val index = BingoRules.categories(state.bingoLevel).indexOf(state.question).coerceAtLeast(0)
    val (fill, ink) = categoryColors[index % categoryColors.size]
    Surface(color = fill, shape = ControlShape) {
        Row(Modifier.fillMaxWidth().padding(15.dp), horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically) {
            Text((index + 1).toString(), style = MaterialTheme.typography.headlineMedium, color = ink)
            Text(copy.question(state.question), style = MaterialTheme.typography.titleSmall, color = ink)
        }
    }
}

@Composable
private fun GameIntro(mode: CardlessMode, copy: UiCopy, title: String, detail: String) {
    Column(verticalArrangement = Arrangement.spacedBy(15.dp)) {
        Box(Modifier.fillMaxWidth().height(152.dp).background(MaterialTheme.colorScheme.primaryContainer, PanelShape),
            contentAlignment = Alignment.Center) {
            when (mode) {
                CardlessMode.TIMELINE -> TinyTimelinePreview(copy)
                CardlessMode.QUIZ -> Text("?", style = MaterialTheme.typography.displayLarge, color = MaterialTheme.colorScheme.primary)
                CardlessMode.BINGO -> BingoPreview(copy)
            }
        }
        Text(title, style = MaterialTheme.typography.headlineLarge)
        Text(detail, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun TinyTimelinePreview(copy: UiCopy) {
    Row(Modifier.fillMaxWidth().padding(15.dp), horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically) {
        listOf("1978", "?", "2001").forEachIndexed { index, year ->
            Surface(shape = RoundedCornerShape(12.dp),
                color = if (index == 1) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
                modifier = Modifier.weight(1f).height(if (index == 1) 106.dp else 88.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Text(year, style = MaterialTheme.typography.headlineLarge,
                        color = if (index == 1) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}

@Composable
private fun BingoPreview(copy: UiCopy) {
    Row(Modifier.fillMaxWidth().padding(15.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        (0..4).forEach { index ->
            val (fill, ink) = categoryColors[index]
            Surface(shape = RoundedCornerShape(11.dp), color = fill, modifier = Modifier.weight(1f).height(72.dp)) {
                Box(contentAlignment = Alignment.Center) { Text((index + 1).toString(), style = MaterialTheme.typography.headlineLarge, color = ink) }
            }
        }
    }
}

@Composable
private fun GameProgress(score: Int, target: Int, noun: String, round: String) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(round, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(noun.replaceFirstChar { it.uppercase() } + ": $score / $target", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
        }
        LinearProgressIndicator(progress = { (score.toFloat() / target.coerceAtLeast(1)).coerceIn(0f, 1f) },
            modifier = Modifier.fillMaxWidth().height(5.dp))
    }
}

@Composable
private fun RoundOutcome(correct: Boolean, title: String) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Icon(if (correct) AppIcons.Check else AppIcons.Close, null,
            tint = if (correct) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error)
        Text(title, style = MaterialTheme.typography.titleSmall)
    }
}

@Composable
private fun AnswerGrade(copy: UiCopy, onGrade: (Boolean) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(copy.t("Udało się odgadnąć?", "Did you get it?"), style = MaterialTheme.typography.titleSmall)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedButton(onClick = { onGrade(false) }, modifier = Modifier.weight(1f).heightIn(min = 52.dp), shape = ControlShape) {
                Text(copy.t("Pomyłka", "Not this time"))
            }
            Button(onClick = { onGrade(true) }, modifier = Modifier.weight(1f).heightIn(min = 52.dp), shape = ControlShape) {
                Icon(AppIcons.Check, null, Modifier.size(18.dp)); Spacer(Modifier.width(7.dp)); Text(copy.t("Zgadłem", "Got it"))
            }
        }
    }
}

@Composable
private fun GameFinished(won: Boolean, copy: UiCopy, onReset: () -> Unit) {
    Surface(color = MaterialTheme.colorScheme.secondaryContainer, shape = ControlShape) {
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Icon(AppIcons.Trophy, null, Modifier.size(29.dp))
            Text(if (won) copy.t("Cel osiągnięty!", "You made it!") else copy.t("Koniec talii", "End of the deck"),
                style = MaterialTheme.typography.headlineMedium)
            TextButton(onClick = onReset) { Text(copy.t("Zagraj ponownie", "Play again")) }
        }
    }
}

private fun skinForSong(state: AppState, song: Song): CardSkin =
    if (state.settings.followCardSkin) song.skin ?: state.activeDeck?.skin ?: state.settings.cardSkin else state.settings.cardSkin

private fun gapLabel(board: List<Song>, gap: Int, copy: UiCopy): String = when {
    board.isEmpty() -> copy.t("Pierwsze miejsce", "First position")
    gap <= 0 -> copy.t("Przed ${board.first().year}", "Before ${board.first().year}")
    gap >= board.size -> copy.t("Po ${board.last().year}", "After ${board.last().year}")
    else -> copy.t("Między ${board[gap - 1].year} a ${board[gap].year}", "Between ${board[gap - 1].year} and ${board[gap].year}")
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
