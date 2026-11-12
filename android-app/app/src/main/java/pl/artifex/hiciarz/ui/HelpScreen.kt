package pl.artifex.hiciarz.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import pl.artifex.hiciarz.model.*

internal enum class HelpTopic {
    ALL, TIMELINE, QUIZ, BINGO, SCAN, AUDIO;
    companion object {
        fun forState(state: AppState): HelpTopic = when (state.tab) {
            AppTab.SCAN -> SCAN
            AppTab.BINGO -> when (state.cardlessMode) {
                CardlessMode.TIMELINE -> TIMELINE
                CardlessMode.QUIZ -> QUIZ
                CardlessMode.BINGO -> BINGO
            }
            else -> ALL
        }
    }
}

@Composable
internal fun HelpScreen(topic: HelpTopic, copy: UiCopy, level: BingoLevel, onTopic: (HelpTopic) -> Unit) {
    val context = LocalContext.current
    val article: @Composable () -> Unit = {
        when (topic) {
            HelpTopic.ALL -> Unit
            HelpTopic.TIMELINE -> HelpArticle(copy.t("Oś czasu", "Timeline"), listOf(
                copy.t("Pierwszy utwór z odkrytym rokiem rozpoczyna Twoją oś.", "A starter track with its year revealed begins your timeline."),
                copy.t("Posłuchaj kolejnego utworu. Wybierz miejsce przed, między albo po znanych latach.", "Listen to the next track. Choose a gap before, between or after the years you know."),
                copy.t("Wybierz „Sprawdź miejsce”. Trafiona karta zostaje na osi; błędną odkładamy. Utwory z tego samego roku mogą być w dowolnej kolejności.",
                    "Tap “Check position”. A correct card stays on your timeline; a wrong card is discarded. Tracks from the same year can be in either order."),
                copy.t("Zbierz 10 kart. Dla krótszej talii celem są wszystkie dostępne utwory.", "Collect 10 cards. With a smaller deck, collect all available tracks."),
            ))
            HelpTopic.QUIZ -> HelpArticle(copy.t("Zgadnij", "Guess"), listOf(
                copy.t("Wybierz talię muzyczną, z gier lub filmów.", "Choose a music, game or film deck."),
                copy.t("Posłuchaj i podaj tytuł z wykonawcą. W taliach z gier lub filmów odgadujesz grę albo film.",
                    "Listen and name the title and artist. With game or film decks, name the game or film."),
                copy.t("Odkryj odpowiedź. Prowadzący zaznacza „Zgadłem” albo „Pomyłka”.", "Reveal the answer. The host marks “Got it” or “Not this time”."),
                copy.t("Zdobądź 10 punktów lub odgadnij wszystkie utwory krótszej talii. Nagrania się nie powtarzają.",
                    "Earn 10 points, or guess every track in a smaller deck. Recordings do not repeat."),
            ))
            HelpTopic.BINGO -> HelpArticle("Bingo", listOf(
                copy.t("Pobierz plansze PDF i przygotuj wydruki dla graczy. Wybierz pasujący poziom pytań.",
                    "Download the PDF boards and print them for the players. Select the matching question level."),
                copy.t("Prowadzący losuje pytanie. Każdy widzi, co trzeba odgadnąć, zanim zacznie grać muzyka.",
                    "The host draws a question. Everyone sees what to guess before the music starts."),
                copy.t("Zeskanuj kod nowej karty. Jeśli aparat jest wstrzymany, wybierz „Skanuj kartę”. Posłuchajcie utworu, a potem sprawdźcie odpowiedzi.",
                    "Scan a new printed card. If the camera is paused, tap “Scan card”. Listen together, then check the answers."),
                copy.t("Gracze zaznaczają trafione odpowiedzi na swoich planszach. Pełny rząd, kolumna lub przekątna daje Bingo.",
                    "Players mark correct answers on their printed boards. A full row, column or diagonal makes Bingo."),
            ))
            HelpTopic.SCAN -> HelpArticle(copy.t("Z drukowanymi kartami", "With printed cards"), listOf(
                copy.t("Połóż kartę kodem QR do góry i skieruj na nią aparat. Utwór uruchomi się w Spotify.", "Put a card QR-side up and point the camera at it. The track starts in Spotify."),
                copy.t("Powiedz rok i umieść kartę na własnej osi czasu. Dla wariantów z gier lub filmów zgadnij źródło.", "Name the year and place the card in your timeline. For game and film variants, name the source."),
                copy.t("Odkryj odpowiedź dopiero po decyzji. Gdy talia nie jest dodana do aplikacji, odpowiedź znajdziesz na drukowanej karcie.", "Reveal after making your choice. If the deck is not imported, read the answer on the printed card."),
                copy.t("Wybierz „Następna karta”. Skórkę odczytaną z QR można włączać automatycznie w ustawieniach.", "Tap “Next card”. Settings can automatically apply the skin encoded in the QR."),
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
        if (topic == HelpTopic.BINGO) OutlinedButton(
            onClick = { openUrl(context, bingoBoardUrl(level, copy.language)) },
            modifier = Modifier.fillMaxWidth().heightIn(min = 50.dp), shape = ControlShape,
        ) {
            Icon(AppIcons.Decks, null); Spacer(Modifier.width(10.dp))
            Text(copy.t("Plansze do pobrania", "Get Bingo boards"))
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
            HelpArticle(copy.t("Przed pierwszą rundą", "Before your first round"), listOf(
                copy.t("Otwórz Spotify i zaloguj się w jego aplikacji. W Hiciarzu wybierz „Połącz Spotify” i zaakceptuj jednorazową zgodę.",
                    "Open Spotify and sign in there. In Hiciarz, choose “Connect Spotify” and accept the one-time permission."),
                copy.t("W Bingo i Skanerze używasz drukowanych kart. Oś czasu i Zgadywanie pozwalają grać bez kart, z wybraną talią.",
                    "Bingo and Scan use printed cards. Timeline and Guess let you play without cards, using a selected deck."),
                copy.t("Przyciski odtwarzania w Hiciarzu sterują muzyką w Spotify. Automatyczna pauza jest domyślnie wyłączona.",
                    "Hiciarz controls playback in Spotify. Automatic pause is off by default."),
            ))
        } else article()
    }, secondary = {
        SettingGroup(if (topic == HelpTopic.ALL) copy.t("Zasady", "Rules") else copy.t("Pozostałe zasady", "Other rules")) {
            helpLinks(copy).filter { it.first != topic }.forEachIndexed { index, item ->
                if (index > 0) GroupDivider()
                SettingRow(item.second, icon = when (item.first) {
                    HelpTopic.TIMELINE -> AppIcons.Timeline
                    HelpTopic.BINGO -> AppIcons.Bingo
                    HelpTopic.QUIZ -> AppIcons.Game
                    HelpTopic.SCAN -> AppIcons.Scan
                    else -> AppIcons.Speaker
                }) { onTopic(item.first) }
            }
        }
    })
}

private fun helpLinks(copy: UiCopy) = listOf(
    HelpTopic.TIMELINE to copy.t("Oś czasu", "Timeline"),
    HelpTopic.QUIZ to copy.t("Zgadnij", "Guess"),
    HelpTopic.BINGO to "Bingo",
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
