# Android: rozgrywka i nowy interfejs

Prace obejmują aplikację Android. Funkcje kreatora, drukowania i PWA pozostają na webie. Prywatny klucz podpisujący pozostaje w GitHub Secrets.

## Zadania

- [ ] Naprawić uruchamianie skanera w minifikowanym APK i sprawdzić rzeczywiste klatki CameraX/ML Kit, również po ponownym otwarciu.
- [ ] Porównać funkcje PWA: zasady, pomoc, warianty gry, języki, ukrywanie odpowiedzi, wyjście audio i motywy.
- [ ] Przygotować nowy projekt ekranów z osobnym etapem krytyki: telefon, ekran zewnętrzny Folda, rozłożony ekran oraz pozycja zgięta.
- [ ] Wdrożyć grę bez kart: układanie osi czasu i zgadywanie gry lub filmu, z wynikiem, kolejnymi rundami i brakiem powtórek.
- [ ] Zachować Bingo prowadzone przez gospodarza: losowanie zasady → jawne uruchomienie skanera → odtworzenie zeskanowanej karty. Plansze pozostają papierowe, dostępne przez generator PDF w PWA.
- [ ] Zachować motyw w kodzie QR i dodać ustawienie automatycznego stosowania motywu zeskanowanej karty.
- [ ] Domyślnie wyłączyć limit odtwarzania i zachować jawne sterowanie muzyką.
- [ ] Usunąć wejście do tworzenia/drukowania kart z Androida; zachować bibliotekę i import JSON/CSV.
- [ ] Zachować proste sterowanie przez istniejące App Remote: połączenie, odtwarzanie, pauza i wznowienie. Bez wyboru urządzeń, źródeł odtwarzania i formularza Client ID w Androidzie.
- [ ] Dodać dostępne z gry „Jak grać”, pomoc odtwarzania i rozwiązywanie problemów z aparatem.
- [ ] Sprawdzić interfejs na małym telefonie, obu ekranach Folda, dużym tekście i w ciemnym motywie. Zaktualizować prawdziwe screenshoty i README.
- [ ] Poczekać na CI i review, zmergować oraz opublikować podpisany APK jako nowe wydanie testowe.

## Kierunek projektu

Rozgrywka jest główną treścią ekranu. W Bingo prowadzący najpierw pokazuje zasadę, a dopiero po wybraniu „Skanuj kartę” otwiera aparat. Odczyt QR uruchamia konkretny utwór i zachowuje wylosowaną kategorię; kolejna tura zaczyna się od następnej zasady. Lista talii oraz ustawienia używają natywnych wierszy, a skaner przede wszystkim pokazuje aparat. Na szerokim ekranie nawigację zastępuje rail i pojawiają się dwa panele; ważne elementy nie przecinają zawiasu.

Oś czasu i quiz z grami lub filmami pozostają osobnymi, opcjonalnymi trybami bez drukowanych kart. Losowanie w Bingo nie wybiera nagrania z talii, nie włącza kamery automatycznie i nie wymaga zaimportowanej playlisty. Nie dodajemy cyfrowej planszy ani oceniania odpowiedzi przez aplikację.

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
