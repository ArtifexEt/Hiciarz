package pl.artifex.hiciarz.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import pl.artifex.hiciarz.model.*

internal enum class HelpTopic {
    ALL, SCAN, AUDIO;
    companion object {
        fun forState(state: AppState): HelpTopic = when (state.tab) {
            AppTab.SCAN, AppTab.DECKS -> SCAN
            else -> ALL
        }
    }
}

@Composable
internal fun HelpScreen(topic: HelpTopic, copy: UiCopy, onTopic: (HelpTopic) -> Unit) {
    val article: @Composable () -> Unit = {
        when (topic) {
            HelpTopic.ALL -> Unit
            HelpTopic.SCAN -> HelpArticle(copy.t("Z drukowanymi kartami", "With printed cards"), listOf(
                copy.t("Połóż kartę kodem QR do góry i skieruj na nią aparat. Utwór uruchomi się w Spotify.", "Put a card QR-side up and point the camera at it. The track starts in Spotify."),
                copy.t("Powiedz rok i umieść kartę na własnej osi czasu. Dla wariantów z gier lub filmów zgadnij źródło.", "Name the year and place the card in your timeline. For game and film variants, name the source."),
                copy.t("Po podaniu odpowiedzi odwróć drukowaną kartę i sprawdź wynik.", "After making your guess, turn over the printed card to check the answer."),
                copy.t("Wybierz „Skanuj nową”. Skórkę odczytaną z QR można włączać automatycznie w ustawieniach.", "Tap “Scan a new card”. Settings can automatically apply the skin encoded in the QR."),
            ))
            HelpTopic.AUDIO -> HelpArticle(copy.t("Spotify i odtwarzanie", "Spotify and playback"), listOf(
                copy.t("Zainstaluj Spotify i zaloguj się w jego aplikacji. Odtwarzanie konkretnych nagrań wymaga konta Premium.",
                    "Install Spotify and sign in there. Playing specific tracks requires a Premium account."),
                copy.t("W Hiciarzu wybierz „Połącz Spotify”. Przy pierwszym połączeniu zaakceptuj zgodę na sterowanie odtwarzaniem.",
                    "Choose “Connect Spotify” in Hiciarz. On the first connection, accept the permission to control playback."),
                copy.t("Skan karty uruchamia jej utwór. Możesz go wstrzymać i wznowić w panelu Spotify, bez odkrywania odpowiedzi.",
                    "Scanning starts the card’s track. Pause and resume it in the Spotify panel without revealing the answer."),
                copy.t("Automatyczna pauza jest wyłączona. Możesz ją włączyć w ustawieniach i wybrać długość fragmentu.",
                    "Automatic pause is off. You can enable it in Settings and choose the clip length."),
            ))

        }
        if (topic != HelpTopic.AUDIO) {
            Surface(color = MaterialTheme.colorScheme.secondaryContainer, shape = ControlShape) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(copy.t("Bez podpowiadania", "Keep the surprise"), style = MaterialTheme.typography.titleSmall)
                    Text(copy.t("Tytuł, wykonawca i rok są ukryte do odkrycia odpowiedzi. Nie otwieraj Spotify podczas zgadywania — pokazuje tytuł utworu.",
                        "Title, artist and year stay hidden until reveal. Avoid opening Spotify while guessing — it shows the track title."),
                        style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
    AdaptivePanes(primary = {
        if (topic == HelpTopic.ALL) {
            HelpArticle(copy.t("Przed pierwszym skanem", "Before your first scan"), listOf(
                copy.t("Otwórz Spotify i zaloguj się w jego aplikacji. W Hiciarzu wybierz „Połącz Spotify” i zaakceptuj jednorazową zgodę.",
                    "Open Spotify and sign in there. In Hiciarz, choose “Connect Spotify” and accept the one-time permission."),
                copy.t("Zeskanuj kod QR na drukowanej karcie, żeby odtworzyć przypisany do niej utwór.",
                    "Scan the QR code on a printed card to play its track."),
                copy.t("Przyciski odtwarzania w Hiciarzu sterują muzyką w Spotify. Automatyczna pauza jest domyślnie wyłączona.",
                    "Hiciarz controls playback in Spotify. Automatic pause is off by default."),
            ))
        } else article()
    }, secondary = {
        SettingGroup(if (topic == HelpTopic.ALL) copy.t("Zasady", "Rules") else copy.t("Pozostałe zasady", "Other rules")) {
            helpLinks(copy).filter { it.first != topic }.forEachIndexed { index, item ->
                if (index > 0) GroupDivider()
                SettingRow(item.second, icon = when (item.first) {
                    HelpTopic.SCAN -> AppIcons.Scan
                    else -> AppIcons.Speaker
                }) { onTopic(item.first) }
            }
        }
    })
}

private fun helpLinks(copy: UiCopy) = listOf(
    HelpTopic.SCAN to copy.t("Drukowane karty", "Printed cards"),
    HelpTopic.AUDIO to copy.t("Spotify i odtwarzanie", "Spotify and playback"),
)

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
