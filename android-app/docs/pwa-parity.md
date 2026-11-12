# PWA i Android: podział funkcji

Audyt dotyczy ekranów `AppNavigation`, `GameGuide`, `PlaybackSettings`, `BingoGame`, `CameraZoom` i ustawień aplikacji webowej.

| Funkcja PWA | Kierunek w aplikacji Android |
| --- | --- |
| Skanowanie QR z ukryciem odpowiedzi | Natywny aparat CameraX i ML Kit, błąd aparatu z możliwością ponowienia. |
| Zbliżenie aparatu | Natywne sterowanie kamerą; zakres zależy od urządzenia. |
| Muzyka z przypisanej karty | Spotify App Remote, z zachowaniem wcześniej wybranego wyjścia Spotify. |
| Szybki panel dźwięku | Globalny natywny dolny panel, dostępny z gry i skanera. |
| Wybór głośnika Spotify | Pozostaje w Spotify; Android nie ma selektora urządzeń, głośników ani źródeł. |
| Odtwarzacz YouTube, przeglądarka i parowanie drugiego ekranu | Pozostają w PWA; natywna aplikacja korzysta ze Spotify. |
| „Jak grać” i instrukcja przygotowania | Dostępne ze skanera, Bingo oraz ustawień: drukowane karty QR, Bingo i dźwięk. |
| Podstawowy i zaawansowany poziom Bingo | Zasada → skan karty → muzyka. Na telefonie osobny krok skanowania; w dwóch panelach pytanie i aparat są obok siebie. Bez losowania utworów i cyfrowej planszy. |
| Plansze Bingo do druku | Przycisk otwiera generator PDF w PWA, przekazując poziom i język. Gracze nadal zaznaczają odpowiedzi na wydrukach. |
| Warianty muzyka / gra / film | Drukowane karty QR; dla gier i filmów odpowiedzią jest źródło utworu. |
| Wybór wyglądu i motyw zapisany w QR | Te same dziewięć grafik rewersów co w PWA, w tym rybka Mikołaj; automatyczny odczyt skórki z QR i wybór ręczny. |
| PL / EN | Zachowane w natywnych ekranach i pomocy. |
| Ukrywanie odpowiedzi | Zachowane; aplikacja nie pobiera tytułu z odtwarzacza jako podpowiedzi. |
| Ograniczenie czasu muzyki | Opcjonalne; domyślnie wyłączone. |
| Biblioteka talii i import JSON / CSV | Dostępne w PWA. Android otwiera skaner i oferuje Skaner, Bingo i Opcje. Wcześniejsze dane na urządzeniu pozostają zachowane. |
| Gry bez kart | Na razie wyłączone w Androidzie. |
| Kreator, edycja, prompt AI, podgląd i druk kart PDF | Pozostają na webie; usuwamy wejście do tworzenia kart z aplikacji Android. Generator plansz Bingo jest dostępny osobnym linkiem. |
| Zgłoszenie usterki i dokumentacja | Zachowane w ustawieniach. |
| Instalacja PWA | Pozostaje funkcją wersji webowej; wydania Androida korzystają z podpisanego APK. |

## Bingo w Androidzie

1. Prowadzący wybiera poziom i losuje kategorię. Aplikacja pokazuje zasadę bez uruchamiania muzyki. Na telefonie wybranie „Skanuj kartę” otwiera aparat; w układzie dwóch paneli losowanie przygotowuje aparat obok pełnego pytania.
2. Prowadzący odczytuje QR drukowanej karty. Wylosowana kategoria zostaje na ekranie, a Spotify odtwarza wskazane nagranie.
3. Gracze sprawdzają odpowiedzi i zaznaczają trafienia na swoich papierowych planszach. Pełny rząd, kolumna lub przekątna daje Bingo.
4. Prowadzący zaczyna następną turę od kolejnej kategorii. Ponowne skanowanie tej samej karty jest możliwe, jeśli wynika z decyzji prowadzącego.

Historia skanów i etap tury zapisują się na urządzeniu. Obrót lub rozłożenie telefonu nie zmienia zasady ani rundy. Po ponownym uruchomieniu procesu aplikacja wraca do zasady zamiast samoczynnie uruchamiać pozostawiony wcześniej aparat.

Generator plansz przyjmuje `?view=bingo&sheet=print&level=beginner|expert&lang=pl|en`. Przykłady: [podstawowy PL](https://artifexet.github.io/Hiciarz/?view=bingo&sheet=print&level=beginner&lang=pl), [zaawansowany PL](https://artifexet.github.io/Hiciarz/?view=bingo&sheet=print&level=expert&lang=pl), [podstawowy EN](https://artifexet.github.io/Hiciarz/?view=bingo&sheet=print&level=beginner&lang=en).

Android skupia się na skanowaniu drukowanych kart i Bingo. Wybór gry bez kart oraz biblioteka talii nie są dostępne w mobilnej nawigacji.

## Porównanie z HITSTER

Wspólny przebieg: odczyt karty, odtworzenie muzyki z ukrytą odpowiedzią, ułożenie chronologii i sprawdzenie roku. Własne talie przygotowuje się w PWA; aplikacja Android skanuje ich wydrukowane karty.

Oficjalny FAQ HITSTER rozróżnia pełne utwory na koncie serwisu od fragmentów dostępnych bez konta. Nie jest to dowód na anonimowy dostęp do urządzeń Spotify Connect. Nasze dotychczasowe App Remote wymaga zainstalowanego i zalogowanego Spotify oraz zgody na sterowanie; nie wymaga osobnego logowania webowego do Hiciarza. Client ID jest dołączany z konfiguracji buildu, a podpis APK i pakiet rejestrowane w Spotify Dashboard. Android nie dodaje formularza Client ID, wywołań Web API ani wyboru urządzeń. Tryb podglądów bez konta nie jest częścią tej implementacji.

Źródła: [FAQ HITSTER](https://hitstergame.com/pl-pl/pages/faq), [App Remote](https://developer.spotify.com/documentation/android/tutorials/getting-started), [Spotify Connect API](https://spotify.github.io/android-sdk/app-remote-lib/docs/com/spotify/android/appremote/api/ConnectApi.html), [autoryzowana lista urządzeń](https://developer.spotify.com/documentation/web-api/reference/get-a-users-available-devices).
