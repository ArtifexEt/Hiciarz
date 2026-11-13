# Dobrowolne Analytics w Androidzie

To kolejny etap po automatycznej becie Firebase. Implementacja dotyczy tylko Androida; web, Gemini, reklamy, Crashlytics i SDK App Distribution nie są jej częścią.

## Zgoda i zakres

W **Opcje → Prywatność** Statystyki użycia są domyślnie wyłączone. Dotknięcie przełącznika otwiera informację i wymaga przycisku „Zgadzam się i włączam”. Zamknięcie dialogu lub „Nie teraz” pozostawia pomiar wyłączony. Brak zgody nie ogranicza skanera ani Spotify.

`HiciarzApplication` udostępnia mały interfejs `UsageAnalytics`. Implementacja czyta lokalną zgodę, ale nie inicjalizuje Firebase ani Analytics przed zapisanym opt-in. Wyłączono domyślną kolekcję i usunięto `FirebaseInitProvider`; sama zgoda `DENIED` nie jest używana jako zamiennik tego odroczenia. Po zgodzie aplikacja udziela jedynie `ANALYTICS_STORAGE`, z trzema zgodami reklamowymi pozostającymi `DENIED`, i dopiero potem włącza kolekcję. Automatyczne raportowanie ekranów, identyfikatory reklamowe oraz uprawnienia AD_ID i AdServices są wyłączone/usunięte.

Własny interfejs nie przyjmuje dowolnych nazw ani payloadów. Dozwolone zdarzenia:

| Zdarzenie | Kiedy |
|---|---|
| `hiciarz_scan_accepted` | QR został poprawnie odczytany jako obsługiwana karta. |
| `hiciarz_scan_rejected` | Odczyt odrzucił kod; bez treści kodu lub komunikatu wyjątku. |
| `hiciarz_spotify_connected` | Zakończona próba połączenia ze Spotify. |
| `hiciarz_spotify_connection_failed` | Zakończona próba połączenia zwróciła błąd. |
| `hiciarz_playback_started` | Stan transportu potwierdził odtwarzanie żądanego utworu. |
| `hiciarz_playback_failed` | Odtwarzanie żądanego utworu zakończyło się błędem. |
| `screen_view` | Rzeczywista zmiana ekranu; tylko `scanner` albo `settings`, klasa `Hiciarz`. |

Własne zdarzenia nie przekazują zdjęć, treści QR, URI/ID utworów, tytułów, danych konta, tokenów, emaili, wyjątków ani user_id. Obserwowane identyfikatory utworów służą lokalnie do rozpoznania wyniku odtwarzania i nie trafiają do interfejsu Analytics. Powtarzające się klatki, pozycje utworu i rekompozycje nie tworzą kolejnych zdarzeń wyniku.

Po zgodzie SDK zbiera także automatyczne zdarzenia, np. uruchomienia/sesje/zaangażowanie, oraz dane aplikacji, urządzenia i identyfikator instancji. **To nie jest anonimowa analityka.** Pełny opis danych: [dane Analytics](https://support.google.com/analytics/answer/11593727) i [automatyczne zdarzenia](https://support.google.com/analytics/answer/9234069). Informacja dostępna z Opcji podaje ten zakres oraz odnośniki do Google; nie zastępuje przyszłego formularza Data safety i pełnej polityki wydawcy wymaganych przed Play.

Cofnięcie zgody od razu zamyka bramkę aplikacji, wyłącza kolekcję SDK, ustawia wszystkie zgody na `DENIED` i wykonuje `resetAnalyticsData()`. Reset dotyczy danych na urządzeniu i identyfikatora; nie usuwa automatycznie historii z serwerów Google. Retencję i obsługę wniosków o wcześniej wysłane dane trzeba zarządzać osobno w Analytics. Wybór jest zapisywany synchronicznie. Gdy zapis zawiedzie, UI informuje o błędzie i potrzebie ponowienia; bieżąca sesja pozostaje wyłączona, ale nie obiecuje się zapisu po restarcie mimo awarii pamięci.

## Konfiguracja po sklonowaniu repo

Bez konfiguracji klienta kod buduje się normalnie, a statystyki są niedostępne. Repo nie udostępnia wartości projektu autora. Firebase BoM zarządza głównym modułem Analytics; nie ma starszego modułu `-ktx` ani Google services Gradle plugin.

Pobierz `google-services.json` dla własnej aplikacji Android i zapisz poza repo. `FIREBASE_ANDROID_CONFIG_BASE64` ma zawierać Base64 tego pliku, nie JSON konta usługi. Przykład PowerShell z własnym plikiem:

```powershell
$env:FIREBASE_ANDROID_CONFIG_BASE64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\private\google-services.json'))
$env:HICIARZ_REQUIRE_FIREBASE_ANALYTICS_CONFIG = 'true'
.\gradlew.bat --no-build-cache --no-configuration-cache :app:assembleRelease
```

Nie wypisuj tej zmiennej. Typowane zadanie waliduje pakiet i spójność identyfikatorów oraz generuje tylko cztery standardowe zasoby Firebase w ignorowanym katalogu build. Błędy nie pokazują zawartości wejścia. Zadanie nie zapisuje cache i nadpisuje zasoby także przy następnym buildzie bez konfiguracji, aby lokalny klon nie odziedziczył starego klienta. Dla buildów z konfiguracją nie używaj współdzielonego cache Gradle.

W oficjalnej becie konfiguracja pochodzi z Secrets dwóch środowisk ograniczonych do `main`: `firebase-beta` (plan/publikacja) i `firebase-beta-build` (build). To publiczna konfiguracja klienta odczytywalna z APK, ale chroniona przed automatycznym odziedziczeniem przez klon źródeł. Nie daje uprawnień administratora. Builder nie dostaje konta usługi, tokenów OIDC ani klucza podpisującego. Plan i builder sprawdzają zgodność konfiguracji; jej zmiana wpływa na fingerprint nowego wydania. W repo i publicznych logach/artefaktach nie wolno zapisywać całego JSON ani sekretów administracyjnych.

## Weryfikacja i odbiór

Automatyczne testy sprawdzają kontroler zgody z fałszywym silnikiem, brak kolejki przed zgodą, zapis i cofnięcie, błędy zapisu, odtworzenie wyboru, stałe zgody reklamowe, deduplikację zdarzeń ViewModel, dialog PL/EN oraz scalony manifest. Testy PR są bez konfiguracji właściciela i nie zasilają jego Analytics. Ścisłe sumy zależności nadal obowiązują. Osobny build z syntetyczną konfiguracją sprawdza generowanie zasobów, a kolejny bez niej usuwa poprzednie wartości.

Odbiór z prawdziwym backendem pozostaje testem na urządzeniu: czysta instalacja bez zgody, odmowa, zgoda, cofnięcie i ponowne uruchomienie. Sprawdź rzeczywisty ruch Analytics i dozwolone zdarzenia w DebugView; samo przejście testów fałszywego silnika nie dowodzi braku pingów SDK. Inne połączenia Spotify/ML Kit nie są ruchem Analytics. Do testu użyj urządzenia i konta testowego, bez rzeczywistych treści kart lub danych osobowych.

```sh
adb shell setprop debug.firebase.analytics.app pl.artifex.hiciarz
# Włącz Statystyki użycia, przejdź Skaner/Opcje i wykonaj kontrolowany skan.
# Sprawdź DebugView oraz odmowę/cofnięcie po restarcie.
adb shell setprop debug.firebase.analytics.app .none.
```

Tryb debug wyłącza te zdarzenia z głównych raportów. Nie dodawaj kodu włączającego DebugView automatycznie w becie.

Źródła: [kontrola kolekcji](https://firebase.google.com/docs/analytics/android/configure-data-collection), [basic consent](https://developers.google.com/tag-platform/security/guides/app-consent?platform=android&consentmode=basic), [SDK API](https://firebase.google.com/docs/reference/android/com/google/firebase/analytics/FirebaseAnalytics), [DebugView](https://firebase.google.com/docs/analytics/debugview), [konfiguracja Firebase](https://firebase.google.com/support/guides/init-options).
