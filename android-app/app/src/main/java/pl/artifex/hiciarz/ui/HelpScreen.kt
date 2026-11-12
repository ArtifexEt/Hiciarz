package pl.artifex.hiciarz.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import pl.artifex.hiciarz.model.*

internal enum class HelpTopic {
    ALL, SCAN, AUDIO;

    fun title(copy: UiCopy): String = when (this) {
        ALL -> copy.t("Jak tworzyć karty", "Create cards")
        SCAN -> copy.t("Skanowanie kart", "Scanning cards")
        AUDIO -> copy.t("Spotify i odtwarzanie", "Spotify and playback")
    }

    companion object {
        fun forState(state: AppState): HelpTopic = when (state.tab) {
            AppTab.SCAN, AppTab.DECKS -> SCAN
            else -> ALL
        }
    }
}

@Composable
internal fun HelpScreen(topic: HelpTopic, copy: UiCopy, onTopic: (HelpTopic) -> Unit) {
    val context = LocalContext.current
    AdaptivePanes(primary = {
        HelpArticle(topic.title(copy), when (topic) {
            HelpTopic.ALL -> listOf(
                copy.t("Otwórz kreator kart w przeglądarce na telefonie lub komputerze.",
                    "Open the card creator in a browser on your phone or computer."),
                copy.t("Wybierz gotową talię albo dodaj własne utwory. Sprawdź dane i wybierz wygląd kart.",
                    "Choose a ready-made deck or add your own tracks. Check their details and choose a card design."),
                copy.t("Pobierz PDF, wydrukuj go dwustronnie w skali 100% i wytnij karty. Ich kody QR zeskanujesz w tej aplikacji.",
                    "Download the PDF, print it double-sided at 100% scale and cut out the cards. Scan their QR codes in this app."),
            )
            HelpTopic.SCAN -> listOf(
                copy.t("Zezwól na dostęp do aparatu i umieść kod QR drukowanej karty w kadrze.",
                    "Allow camera access and place the printed card’s QR code in the frame."),
                copy.t("Po odczytaniu kodu utwór uruchomi się w Spotify. Odtwarzanie możesz wstrzymać i wznowić przyciskiem na karcie.",
                    "Once the code is read, the track starts in Spotify. Pause and resume playback using the button on the card."),
                copy.t("Wybierz „Skanuj nową”, żeby wrócić do aparatu. Jeśli kod nie jest odczytywany, popraw oświetlenie i odległość od karty.",
                    "Choose “Scan a new card” to return to the camera. If a code is not reading, adjust the lighting and distance from the card."),
            )
            HelpTopic.AUDIO -> listOf(
                copy.t("Zainstaluj Spotify i zaloguj się w jego aplikacji. Odtwarzanie konkretnych nagrań wymaga konta Premium.",
                    "Install Spotify and sign in there. Playing specific tracks requires a Premium account."),
                copy.t("W Hiciarzu wybierz „Połącz Spotify”. Przy pierwszym połączeniu zaakceptuj zgodę na sterowanie odtwarzaniem.",
                    "Choose “Connect Spotify” in Hiciarz. On the first connection, accept the permission to control playback."),
                copy.t("Skan karty uruchamia jej utwór. Automatyczną pauzę i długość fragmentu możesz ustawić w Opcjach.",
                    "Scanning starts the card’s track. Set automatic pause and clip length in Options."),
            )
        })
    }, secondary = {
        SettingGroup(copy.t("W przeglądarce", "In your browser")) {
            SettingRow(copy.t("Otwórz kreator kart", "Open card creator"), AppIcons.Decks) {
                openUrl(context, "https://artifexet.github.io/Hiciarz/?view=editor")
            }
            GroupDivider()
            SettingRow(copy.t("Hiciarz na GitHub Pages", "Hiciarz on GitHub Pages"), AppIcons.Link) {
                openUrl(context, "https://artifexet.github.io/Hiciarz/")
            }
        }
        SettingGroup(copy.t("Pomoc", "Help")) {
            HelpTopic.entries.filter { it != topic }.forEachIndexed { index, item ->
                if (index > 0) GroupDivider()
                SettingRow(item.title(copy), icon = when (item) {
                    HelpTopic.ALL -> AppIcons.Decks
                    HelpTopic.SCAN -> AppIcons.Scan
                    HelpTopic.AUDIO -> AppIcons.Speaker
                }) { onTopic(item) }
            }
        }
    })
}

@Composable
private fun HelpArticle(title: String, steps: List<String>) {
    Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text(title, style = MaterialTheme.typography.headlineLarge)
        steps.forEachIndexed { index, text ->
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Text((index + 1).toString().padStart(2, '0'), style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.primary, modifier = Modifier.width(28.dp))
                Text(text, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
            }
        }
    }
}
