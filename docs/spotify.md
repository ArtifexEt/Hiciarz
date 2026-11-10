# Spotify w Hiciarzu — przygotuj muzykę po swojemu

[← Wróć do Hiciarza](https://artifexet.github.io/Hiciarz/) · [Konfiguracja techniczna](configuration.md)

Karty są gotowe, znajomi już czekają, a Spotify prosi o ustawienia. Ten przewodnik wyjaśnia, skąd bierze się ten dodatkowy krok i jak raz przygotować połączenie na swoje wieczory.

## Po co łączysz konto?

Połączenie Spotify pozwala importować Twoje własne i współtworzone playlisty oraz sterować muzyką na wybranym urządzeniu przez Spotify Connect. Do sterowania odtwarzaniem potrzebujesz Premium. Kreator, przykładowe talie i eksport PDF są dostępne bez logowania.

Client ID wskazuje aplikację, przez którą łączysz konto. Jest publiczny. Logowanie odbywa się na stronie Spotify i używa PKCE, dlatego Hiciarz nie potrzebuje Client Secret. [Jak działa PKCE w Spotify](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow).

## Dlaczego samo zalogowanie czasem nie wystarcza?

W lutym 2026 Spotify zmieniło dostęp dla nowych integracji deweloperskich: jeden Client ID na dewelopera, do 5 autoryzowanych użytkowników i wymóg Premium u właściciela integracji. Starsze aplikacje mogą zachować wcześniejsze uprawnienia. [Komunikat Spotify](https://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security), [przewodnik zmian](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide).

W tym trybie konto musi być dopisane w **Users Management**. Bez tego logowanie może się udać, ale odczyt urządzeń lub playlist zakończy się błędem 403. Publikacja kodu jako open source nie zmienia tych zasad. Własny Client ID także podlega limitom Spotify. Szersze publiczne udostępnianie jednej integracji wymaga odpowiedniego dostępu od Spotify. [Aktualne tryby dostępu](https://developer.spotify.com/documentation/web-api/concepts/quota-modes).

## Wybierz jedno z dwóch połączeń

**Domyślne połączenie strony.** Jest dołączone do publikacji Hiciarza. Skorzystaj z niego, jeśli osoba prowadząca stronę dopisała Twoje konto. Gdy brakuje dostępu, skontaktuj się z nią, podając adres e-mail swojego konta Spotify.

**Własne połączenie.** Przygotuj osobistą aplikację w panelu Spotify i wpisz jej Client ID w Hiciarzu. Korzystasz z tej samej strony; nie musisz tworzyć forka ani budować aplikacji.

## Przygotuj własny Client ID

1. Otwórz [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). Utwórz aplikację lub otwórz już posiadaną; do funkcji Hiciarza potrzebne jest **Web API**.
2. W ustawieniach aplikacji dodaj **Redirect URI**. Dokładny adres skopiujesz w Hiciarzu z **O aplikacji → Ustawienia Spotify → Własny Client ID**. Dla głównej publikacji jest to `https://artifexet.github.io/Hiciarz/`. Dla forka lub lokalnego podglądu użyj adresu tej konkretnej strony. Wielkość liter, port i końcowy ukośnik muszą się zgadzać.
3. W **Users Management** sprawdź konta uprawnione do tej integracji i dodaj osoby, które mają z niej korzystać, w ramach dostępnego limitu.
4. Skopiuj **Client ID** i wklej go do ustawień Hiciarza. Zapisz konfigurację, a następnie zaloguj konto Spotify. Client Secret zostaw w panelu Spotify.

Zmiana Client ID wyloguje poprzednie połączenie w Hiciarzu i usunie wybór urządzenia. Po zalogowaniu do nowego połączenia ponownie wybierz, gdzie ma grać muzyka. Talie pozostają zapisane.

## Przenieś ustawienia na telefon

Na urządzeniu z zapisaną konfiguracją wybierz **Ustawienia Spotify**, zapisz wybrane połączenie i kliknij **Pokaż QR konfiguracji**.

Na telefonie po instalacji Hiciarza otwórz **O aplikacji → Ustawienia Spotify → Własny Client ID → Zeskanuj QR konfiguracji**. Możesz też zeskanować go zwykłym aparatem telefonu: link prowadzi do podglądu konfiguracji w Hiciarzu. Sprawdź Client ID i potwierdź zapis.

Przeglądarka i zainstalowana aplikacja mogą mieć osobny magazyn danych — dlatego kod możesz zeskanować również bezpośrednio wewnątrz zainstalowanej aplikacji. QR przenosi tylko publiczny identyfikator. Do Spotify logujesz się na każdym urządzeniu osobno.

To osobny QR ustawień, niezależny od kodu parowania odtwarzacza i kodów na kartach. Client ID nie jest dodawany do piosenek ani eksportowanych talii.

## Własna publikacja i fork

Możesz opublikować Hiciarza bez domyślnego Client ID: każda osoba wpisze swoje ustawienie w interfejsie. Możesz też ustawić własny domyślny identyfikator jako sekret Actions **SPOTIFY_CLIENT_ID**. Wartość wpisana przez użytkownika w ustawieniach ma pierwszeństwo przed domyślną.

Przełącznik **SPOTIFY_ONBOARDING** jest zmienną Actions, a nie sekretem. Ustaw `true`, aby pokazywać przewodnik przed pierwszym logowaniem, lub `false`, aby go pomijać. Bez jawnej wartości główna publikacja ma przewodnik włączony, a forki wyłączony. Ustawienia są dostępne w obu wariantach. Szczegóły opisano w [README](../README.md#przełącznik-przewodnika-dla-własnej-publikacji).

Własna aplikacja Spotify musi mieć dodany adres powrotu nowej publikacji. Sam fork nie kopiuje sekretów repozytorium ani ustawień w panelu Spotify. Po zmianie sekretu lub zmiennej uruchom publikację ponownie.
