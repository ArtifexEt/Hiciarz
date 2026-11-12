# Android: rozgrywka i nowy interfejs

Prace obejmują aplikację Android. Funkcje kreatora, drukowania i PWA pozostają na webie. Prywatny klucz podpisujący pozostaje w GitHub Secrets.

## Wdrożone i opublikowane

Zakres poniżej trafił do wydań `0.2.0-alpha.1` i `0.2.0-alpha.2`.

- [x] Skaner w minifikowanym APK: rzeczywisty odczyt CameraX/ML Kit, obrót i ponowne otwarcie sprawdzone na emulatorze.
- [x] Porównanie funkcji PWA: zasady, pomoc, warianty gry, języki, ukrywanie odpowiedzi, odtwarzanie i motywy — [podział funkcji](pwa-parity.md).
- [x] Nowy projekt i dwie iteracje faktycznych ekranów: telefon, ekran zewnętrzny i wewnętrzny Folda oraz pozycja zgięta — [projekt i weryfikacja](design-v2.md).
- [x] Oś czasu oraz zgadywanie gry lub filmu bez kart, z wynikiem, kolejnymi rundami i brakiem powtórek.
- [x] Bingo prowadzącego: pytanie → skan → utwór. Telefon ma osobny krok skanowania, a układ dwóch paneli pokazuje pełne pytanie obok aparatu. Papierowe plansze pobiera się z generatora PDF w PWA.
- [x] Dziewięć motywów QR i ustawienie automatycznego stosowania wyglądu zeskanowanej karty.
- [x] Domyślnie wyłączona automatyczna pauza i jawne sterowanie muzyką.
- [x] Kreator i drukowanie kart pozostawione w webie; Android zachowuje bibliotekę, import JSON/CSV i przeciąganie pliku.
- [x] App Remote: połączenie, odtwarzanie, pauza i wznowienie, bez selektora urządzeń, źródeł i formularza Client ID.
- [x] Kontekstowe „Jak grać”, pomoc Spotify i obsługa problemów z aparatem.
- [x] Testy UI na emulowanych ekranach telefonu i Folda, większym tekście i w ciemnym motywie. Aktualne zrzuty i README.
- [x] CI i review przed scaleniem; podpisane testowe APK w [Releases](https://github.com/ArtifexEt/Hiciarz/releases).

## Próby na urządzeniach pozostające do wykonania

- [ ] Autoryzacja i odtwarzanie na świeżym koncie Spotify bez wcześniejszej zgody i historii dopisywania do integracji.
- [ ] Aparat i odtwarzanie na fizycznym Galaxy Fold7, w obu rozmiarach ekranu i pozycji zgiętej.

Wyniki emulatorów nie potwierdzają tych dwóch prób.

## Kierunek projektu

Rozgrywka jest główną treścią ekranu. W Bingo prowadzący najpierw pokazuje zasadę, a dopiero po wybraniu „Skanuj kartę” otwiera aparat. Odczyt QR uruchamia konkretny utwór i zachowuje wylosowaną kategorię; kolejna tura zaczyna się od następnej zasady. Lista talii oraz ustawienia używają natywnych wierszy, a skaner przede wszystkim pokazuje aparat. Na szerokim ekranie nawigację zastępuje rail i pojawiają się dwa panele; ważne elementy nie przecinają zawiasu.

Oś czasu i quiz z grami lub filmami pozostają osobnymi, opcjonalnymi trybami bez drukowanych kart. Losowanie w Bingo nie wybiera nagrania z talii ani nie wymaga zaimportowanej playlisty. Na telefonie aparat otwiera osobny przycisk „Skanuj kartę”; w układzie dwóch paneli losowanie przygotowuje skaner obok pytania. Nie dodajemy cyfrowej planszy ani oceniania odpowiedzi przez aplikację.

Przycisk plansz otwiera generator webowy z poziomem i językiem wybranym w Androidzie. W generatorze użytkownik dobiera liczbę plansz i pobiera PDF:

- [Poziom podstawowy, polski](https://artifexet.github.io/Hiciarz/?view=bingo&sheet=print&level=beginner&lang=pl)
- [Poziom zaawansowany, polski](https://artifexet.github.io/Hiciarz/?view=bingo&sheet=print&level=expert&lang=pl)

Adres używa parametrów `view=bingo`, `sheet=print`, `level=beginner|expert` i `lang=pl|en`. Gdy prowadzący zna kategorię, po skanie sprawdza odpowiedzi z graczami; trafienia zaznaczają na papierowych planszach.

Projekt bazuje na wzorcach Android Material i rzeczywistych ekranach aplikacji muzycznych oraz HITSTER, z własną identyfikacją Hiciarza. Nie przenosimy wyglądu strony do WebView.

## Sprawdzone ograniczenia odtwarzania

- Publiczny App Remote steruje aplikacją Spotify i wymaga zainstalowanego oraz zalogowanego Spotify i zgody na sterowanie. Połączenie jest dotychczasową integracją tego projektu; nie jest nową implementacją anonimowego Spotify Connect.
- Publiczny Client ID pochodzi z konfiguracji buildu `SPOTIFY_CLIENT_ID`; pakiet i odcisk certyfikatu APK muszą być zarejestrowane w Spotify Dashboard. Client Secret ani dodatkowy formularz konfiguracji nie są potrzebne w aplikacji.
- App Remote nie daje listy zdalnych urządzeń. Listę Spotify Connect udostępnia Web API po autoryzacji `user-read-playback-state`; nie dodajemy tych wywołań, listy głośników ani selektora źródła do Androida.
- Dźwięk odtwarza Spotify. Użytkownik może wcześniej ustawić jego wyjście w Spotify lub w systemie; Hiciarz nie wymusza transferu na telefon przy każdej piosence.
- Oficjalne FAQ HITSTER odróżnia pełne utwory na koncie od fragmentów bez konta. Nie oznacza to anonimowego sterowania Spotify Connect.

Źródła: [Spotify Android](https://developer.spotify.com/documentation/android/tutorials/getting-started), [ConnectApi](https://spotify.github.io/android-sdk/app-remote-lib/docs/com/spotify/android/appremote/api/ConnectApi.html), [urządzenia Web API](https://developer.spotify.com/documentation/web-api/reference/get-a-users-available-devices), [FAQ HITSTER](https://hitstergame.com/pl-pl/pages/faq), [Android foldables](https://developer.android.com/develop/adaptive-apps/guides/foldables/make-your-app-fold-aware).
