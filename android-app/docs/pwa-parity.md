# PWA i Android: podział funkcji

Audyt dotyczy ekranów `AppNavigation`, `GameGuide`, `PlaybackSettings`, `CameraZoom` i ustawień aplikacji webowej.

| Funkcja PWA | Kierunek w aplikacji Android |
| --- | --- |
| Skanowanie QR z ukryciem odpowiedzi | Natywny aparat CameraX i ML Kit, kwadratowy podgląd także na tablecie, błąd aparatu z możliwością ponowienia. |
| Zbliżenie aparatu | Natywne sterowanie kamerą; zakres zależy od urządzenia. |
| Muzyka z przypisanej karty | Spotify App Remote, z zachowaniem wcześniej wybranego wyjścia Spotify. Pauza i wznowienie na obrazie karty, „Skanuj nową” pod nim. Utwór i opcjonalna skórka pochodzą bezpośrednio z QR. |
| Szybki panel dźwięku | Globalny natywny dolny panel, dostępny ze skanera i Opcji. |
| Wybór głośnika Spotify | Pozostaje w Spotify; Android nie ma selektora urządzeń, głośników ani źródeł. |
| Odtwarzacz YouTube, przeglądarka i parowanie drugiego ekranu | Pozostają w PWA; natywna aplikacja korzysta ze Spotify. |
| „Jak grać” i instrukcja przygotowania | Zasady pozostają poza Androidem. Natywna pomoc opisuje tworzenie nowych kart i odtwarzanie Spotify oraz zawiera odnośniki do Hiciarza i kreatora na GitHub Pages. |
| Podstawowy i zaawansowany poziom Bingo | Dostępne w [osobnej aplikacji Bingo](https://artifexet.github.io/Bingo/). Android nie zawiera kategorii ani rund. |
| Plansze Bingo do druku | Generator i rozgrywka mają [osobne repozytorium](https://github.com/ArtifexEt/Bingo); Android nie zawiera linku do plansz. |
| Warianty muzyka / gra / film | Zasady i odpowiedzi pozostają na drukowanych kartach lub w PWA. Android odtwarza utwór z QR bez interpretowania rodzaju gry. |
| Wybór wyglądu i motyw zapisany w QR | Te same dziewięć grafik rewersów i palet całej aplikacji co w PWA, z wariantami ciemnymi. Animowane rybki z ozdobami i lampkami. Automatyczny odczyt skórki z QR także dla nieznanego utworu oraz wybór ręczny. |
| PL / EN | Zachowane w natywnych ekranach i pomocy. |
| Odkrywanie odpowiedzi | Pozostaje na drukowanej karcie lub w PWA. Android nie ma bazy odpowiedzi ani ekranu odkrywania i nie pobiera tytułu z odtwarzacza jako podpowiedzi. Systemowy pasek statusu i zegar są ukryte również w dialogach. Wysuwane powiadomienia Spotify pozostają pod kontrolą Androida. |
| Ograniczenie czasu muzyki | Opcjonalne; domyślnie wyłączone. |
| Biblioteka talii i import JSON / CSV | Wyłącznie PWA. Android nie pakuje przykładowych talii, nie importuje plików i nie odczytuje zapisanych wcześniej talii. |
| Gry bez kart | Pozostają w PWA; Android nie zawiera ich mechaniki ani zapisu rund. |
| Kreator, edycja, prompt AI, podgląd i druk kart PDF | Pozostają na webie. Android korzysta z wydrukowanych kodów QR; Opcje zawierają instrukcję przygotowania kart i link do kreatora. |
| Zgłoszenie usterki i dokumentacja | Zachowane w ustawieniach. |
| Instalacja PWA | Pozostaje funkcją wersji webowej; Android ma testowe APK z GitHub oraz AAB do bety w Google Play. |

## Skanowanie w Androidzie

1. Użytkownik skanuje QR drukowanej karty aparatem. Android nie udostępnia ręcznego wklejania kodów ani linków.
2. Spotify odtwarza wskazany utwór; aplikacja zachowuje motyw karty i pozwala sterować pauzą lub wznowieniem.
3. Na ekranie pozostaje rewers karty bez danych utworu. „Skanuj nową” ponownie przygotowuje aparat.

Kompaktowe dolne menu zawiera Skaner i Opcje; na dużym ekranie nawigacja przechodzi na bok. Android nie prowadzi Bingo: nie losuje kategorii, nie liczy rund i nie otwiera generatora plansz. Nie korzysta też z dawnych danych talii. Ustawienia wyglądu oraz odtwarzania pozostają dostępne.

## Porównanie z HITSTER

Wspólne funkcje aplikacji: odczyt karty i odtworzenie muzyki bez wyświetlania odpowiedzi. Układanie chronologii i sprawdzanie roku odbywa się z drukowanymi kartami, poza aplikacją Android. Własne talie przygotowuje się w PWA; aplikacja Android skanuje ich wydrukowane karty.

Oficjalny FAQ HITSTER rozróżnia pełne utwory na koncie serwisu od fragmentów dostępnych bez konta. Nie jest to dowód na anonimowy dostęp do urządzeń Spotify Connect. Nasze dotychczasowe App Remote wymaga zainstalowanego i zalogowanego Spotify oraz zgody na sterowanie; nie wymaga osobnego logowania webowego do Hiciarza. Client ID jest dołączany z konfiguracji buildu, a podpis APK i pakiet rejestrowane w Spotify Dashboard. Android nie dodaje formularza Client ID, wywołań Web API ani wyboru urządzeń. Tryb podglądów bez konta nie jest częścią tej implementacji.

Źródła: [FAQ HITSTER](https://hitstergame.com/pl-pl/pages/faq), [App Remote](https://developer.spotify.com/documentation/android/tutorials/getting-started), [Spotify Connect API](https://spotify.github.io/android-sdk/app-remote-lib/docs/com/spotify/android/appremote/api/ConnectApi.html), [autoryzowana lista urządzeń](https://developer.spotify.com/documentation/web-api/reference/get-a-users-available-devices).
