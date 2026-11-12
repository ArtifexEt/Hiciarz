package pl.artifex.hiciarz.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import pl.artifex.hiciarz.model.*

@Composable
internal fun GameOptionsSheet(state: AppState, copy: UiCopy, onAction: (AppAction) -> Unit,
                              onLevel: (BingoLevel) -> Unit, onDeck: () -> Unit, onRestart: () -> Unit, onClose: () -> Unit) {
    val context = LocalContext.current
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState())
        .padding(horizontal = 24.dp).padding(bottom = 28.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text(copy.t("Zmień grę", "Change game"), style = MaterialTheme.typography.headlineLarge)
        Surface(shape = PanelShape, color = MaterialTheme.colorScheme.surfaceVariant) {
            Column {
                CardlessMode.entries.forEachIndexed { index, mode ->
                    if (index > 0) GroupDivider()
                    Row(Modifier.fillMaxWidth().selectable(state.cardlessMode == mode, role = Role.RadioButton,
                        onClick = { onAction(AppAction.SetCardlessMode(mode)) })
                        .heightIn(min = 64.dp).padding(horizontal = 18.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        Icon(when (mode) { CardlessMode.TIMELINE -> AppIcons.Timeline; CardlessMode.QUIZ -> AppIcons.Game; CardlessMode.BINGO -> AppIcons.Bingo }, null)
                        Text(copy.game(mode), Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
                        if (state.cardlessMode == mode) Icon(AppIcons.Check, copy.t("Wybrany tryb", "Selected game"))
                    }
                }
            }
        }
        if (state.cardlessMode == CardlessMode.BINGO) OutlinedButton(
            onClick = { openUrl(context, bingoBoardUrl(state.bingoLevel, copy.language)) },
            modifier = Modifier.fillMaxWidth().heightIn(min = 50.dp), shape = ControlShape) {
            Text(copy.t("Plansze do pobrania", "Get Bingo boards"))
        }
        if (state.cardlessMode != CardlessMode.BINGO) DeckSelector(state.activeDeck, copy, onDeck)
        else SettingGroup(copy.t("Poziom pytań", "Question level")) {
            listOf(BingoLevel.BEGINNER, BingoLevel.EXPERT).forEachIndexed { index, level ->
                if (index > 0) GroupDivider()
                Row(Modifier.fillMaxWidth().selectable(state.bingoLevel == level, role = Role.RadioButton,
                    onClick = { onLevel(level) })
                    .heightIn(min = 56.dp).padding(horizontal = 18.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically) {
                    Text(if (level == BingoLevel.BEGINNER) copy.t("Podstawowy", "Beginner") else copy.t("Zaawansowany", "Expert"),
                        Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
                    if (state.bingoLevel == level) Icon(AppIcons.Check, null)
                }
            }
        }
        val started = when (state.cardlessMode) {
            CardlessMode.TIMELINE -> state.timeline.started
            CardlessMode.QUIZ -> state.quiz.started
            CardlessMode.BINGO -> state.bingoRound > 0
        }
        if (started) TextButton(onClick = onRestart) { Text(copy.t("Rozpocznij od nowa", "Start again")) }
        Button(onClick = onClose, modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp), shape = ControlShape) {
            Text(copy.t("Gotowe", "Done"))
        }
    }
}
