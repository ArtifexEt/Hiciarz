package pl.artifex.hiciarz.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import pl.artifex.hiciarz.model.*

@Composable
internal fun GameOptionsSheet(state: AppState, copy: UiCopy,
                              onLevel: (BingoLevel) -> Unit, onRestart: () -> Unit, onClose: () -> Unit) {
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState())
        .padding(horizontal = 24.dp).padding(bottom = 28.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        Text(copy.t("Ustawienia Bingo", "Bingo settings"), style = MaterialTheme.typography.headlineMedium)
        BingoLevelChoice(state.bingoLevel, copy, onLevel)
        if (state.bingoRound > 0) {
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            TextButton(onClick = onRestart, modifier = Modifier.heightIn(min = 48.dp)) {
                Icon(AppIcons.Refresh, null, Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text(copy.t("Rozpocznij od nowa", "Start again"))
            }
        }
        Button(onClick = onClose, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp), shape = ControlShape,
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary,
                contentColor = MaterialTheme.colorScheme.onSecondary)) {
            Text(copy.t("Gotowe", "Done"))
        }
    }
}
