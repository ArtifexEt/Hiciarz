package pl.artifex.hiciarz.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import pl.artifex.hiciarz.model.AppAction
import pl.artifex.hiciarz.model.AppState

@Composable
internal fun AnalyticsSettings(state: AppState, copy: UiCopy, onAction: (AppAction) -> Unit) {
    var privacyOpen by rememberSaveable { mutableStateOf(false) }
    var consentRequested by rememberSaveable { mutableStateOf(false) }
    SettingGroup(copy.t("Prywatność", "Privacy")) {
        Row(Modifier.fillMaxWidth().testTag("analytics-consent-switch")
            .toggleable(state.analyticsEnabled, enabled = state.analyticsConfigured, role = Role.Switch) { enabled ->
                if (enabled) consentRequested = true else onAction(AppAction.SetAnalyticsEnabled(false))
            }.heightIn(min = 68.dp).padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(copy.t("Statystyki użycia", "Usage statistics"), style = MaterialTheme.typography.bodyLarge)
                Text(if (state.analyticsConfigured)
                    copy.t("Dobrowolne statystyki Google Analytics pomagają ulepszać skaner. Domyślnie wyłączone.",
                        "Optional Google Analytics statistics help improve the scanner. Off by default.")
                else copy.t("Statystyki są niedostępne w tej wersji. Skaner i Spotify działają bez nich.",
                    "Statistics are unavailable in this version. The scanner and Spotify work without them."),
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Switch(checked = state.analyticsEnabled, onCheckedChange = null, enabled = state.analyticsConfigured)
        }
        if (state.analyticsSaveFailed) {
            Column(Modifier.padding(horizontal = 16.dp).padding(bottom = 12.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(copy.t("Statystyki są wyłączone w tej sesji, ale nie udało się zapisać wyboru. Zapisz wyłączenie ponownie przed ponownym uruchomieniem aplikacji.",
                    "Statistics are off for this session, but your choice could not be saved. Save the off setting again before restarting the app."),
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                TextButton(onClick = { onAction(AppAction.SetAnalyticsEnabled(false)) }) {
                    Text(copy.t("Zapisz wyłączenie", "Save off setting"))
                }
            }
        }
        GroupDivider()
        SettingRow(copy.t("Prywatność i dane", "Privacy and data"), AppIcons.Info,
            detail = copy.t("Co mierzymy i jak cofnąć zgodę", "What we measure and how to withdraw consent")) {
            privacyOpen = true
        }
    }
    if (privacyOpen || consentRequested) AnalyticsPrivacyDialog(copy,
        requestConsent = consentRequested && state.analyticsConfigured,
        onDismiss = { privacyOpen = false; consentRequested = false },
        onConsent = {
            onAction(AppAction.SetAnalyticsEnabled(true))
            privacyOpen = false; consentRequested = false
        })
}

@Composable
private fun AnalyticsPrivacyDialog(copy: UiCopy, requestConsent: Boolean, onDismiss: () -> Unit,
                                   onConsent: () -> Unit) {
    val context = LocalContext.current
    AlertDialog(onDismissRequest = onDismiss, modifier = Modifier.testTag("analytics-privacy-dialog"),
        title = { HideStatusBar(); Text(copy.t(if (requestConsent) "Włączyć statystyki użycia?" else "Prywatność i dane",
            if (requestConsent) "Enable usage statistics?" else "Privacy and data")) },
        text = {
            Column(Modifier.heightIn(max = 420.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(copy.t("Zgoda jest dobrowolna. Skanowanie i odtwarzanie Spotify działają również bez analityki.",
                    "Consent is optional. Scanning and Spotify playback also work without analytics."))
                Text(copy.t("Po zgodzie Google Analytics otrzymuje zdarzenia otwarcia Skanera i Opcji oraz wyniki skanowania, łączenia ze Spotify i rozpoczęcia odtwarzania. SDK rejestruje też automatyczne zdarzenia uruchomienia i aktywności oraz dane aplikacji i urządzenia, np. wersje aplikacji i systemu, model urządzenia i identyfikator instancji aplikacji. Te dane nie są anonimowe.",
                    "After consent, Google Analytics receives Scanner and Settings screen events and the outcomes of scans, Spotify connections and playback starts. The SDK also records automatic launch and engagement events and app and device data, such as app and OS versions, device model and an app-instance identifier. This data is not anonymous."))
                Text(copy.t("Do analityki nie przekazujemy zdjęć z kamery, treści QR, adresów i identyfikatorów utworów, tytułów, danych konta Spotify ani danych logowania. Pomiary reklamowe i personalizacja reklam są wyłączone.",
                    "Analytics does not receive camera images, QR contents, track links or IDs, titles, Spotify account data or sign-in credentials. Advertising measurement and ad personalization are disabled."))
                Text(copy.t("Zgodę możesz cofnąć w Opcjach, wyłączając Statystyki użycia. Zatrzymuje to zbieranie i resetuje lokalny identyfikator analityki. Wcześniej wysłane dane mogą pozostać u Google zgodnie z ustawieniami retencji projektu; reset nie usuwa automatycznie historii z serwerów.",
                    "You can withdraw consent in Settings by turning Usage statistics off. This stops collection and resets the local analytics identifier. Previously sent data may remain with Google according to the project's retention settings; a reset does not automatically delete server history."))
                TextButton(onClick = { openUrl(context, "https://policies.google.com/privacy") }) {
                    Text(copy.t("Polityka prywatności Google", "Google Privacy Policy"))
                }
                TextButton(onClick = { openUrl(context, "https://firebase.google.com/docs/analytics/android/configure-data-collection") }) {
                    Text(copy.t("Jak działa zbieranie danych Analytics", "How Analytics data collection works"))
                }
            }
        },
        confirmButton = {
            TextButton(onClick = if (requestConsent) onConsent else onDismiss,
                modifier = Modifier.testTag("analytics-privacy-confirm")) {
                Text(copy.t(if (requestConsent) "Zgadzam się i włączam" else "Zamknij",
                    if (requestConsent) "I agree and enable" else "Close"))
            }
        },
        dismissButton = {
            if (requestConsent) TextButton(onClick = onDismiss) { Text(copy.t("Nie teraz", "Not now")) }
        })
}
