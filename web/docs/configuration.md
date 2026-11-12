# Konfiguracja i dokumentacja techniczna

[← Wróć do README](../README.md)

## Uruchomienie

Wymagane Node.js 22+ i pnpm 11.

```sh
# Z głównego katalogu repozytorium:
cd web
pnpm install
pnpm dev
pnpm test
pnpm build
```

Otwórz adres wypisany przez Vite z końcówką `/Hiciarz/`. Dla telefonu użyj publikacji HTTPS: dostęp do aparatu wymaga bezpiecznego kontekstu. Sam adres HTTP komputera w sieci lokalnej zwykle nie wystarczy. `localhost` jest wyjątkiem wyłącznie na tym samym urządzeniu.

## GitHub Pages

Workflow [`.github/workflows/pages.yml`](../../.github/workflows/pages.yml) publikuje stronę automatycznie po pushu lub merge do `main`, jeśli zmienił się `web/` lub sam workflow. Commity dotyczące wyłącznie `android-app/` nie uruchamiają wdrożenia. Ręczna publikacja pozostaje dostępna przez **Actions → Publish website → Run workflow**, np. po zmianie zmiennych repozytorium. Instalacja zależności, testy i budowanie odbywają się w folderze `web/`, który zawiera konfigurację pnpm i plik blokady zależności.

W Settings → Pages wybierz źródło **GitHub Actions**. Własny fork używa nazwy swojego repozytorium jako ścieżki bazowej. Dla hostingu w katalogu głównym ustaw `BASE_PATH=/` podczas budowania.

Podgląd Spotify i metadane MusicBrainz działają bez kluczy API, Client ID i logowania w Hiciarzu. Workflow nie używa zmiennych `SPOTIFY_CLIENT_ID` ani `SPOTIFY_ONBOARDING`; zapisane wcześniej wartości można usunąć z konfiguracji repozytorium.

## Parowanie i sieć

Połączenie danych: PeerJS/WebRTC. Domyślnie używamy publicznego PeerServer do sygnalizacji oraz serwerów ICE dostarczanych w konfiguracji PeerJS. To nie jest rozwiązanie całkowicie offline ani gwarantowany transport wyłącznie po LAN. Muzyka nie przechodzi przez połączenie telefon–laptop. Zapory i izolacja klientów Wi-Fi mogą uniemożliwić połączenie.

Własny PeerServer (HTTPS/WSS) można wskazać publicznymi zmiennymi GitHub Actions:

- `PEER_HOST` → `VITE_PEER_HOST`
- `PEER_PORT` → `VITE_PEER_PORT`, domyślnie 443
- `PEER_PATH` → `VITE_PEER_PATH`, domyślnie `/`

## Spotify i YouTube

Odtwarzacz korzysta z oficjalnych, widocznych embedów Spotify i YouTube. Nie wymaga naszego Spotify Client ID do osadzenia. Pełna długość, automatyczny start, logowanie w ramce i dostępność zależą od dostawcy, konta i przeglądarki. Niektóre nagrania blokują osadzanie; Spotify może odtwarzać tylko podgląd. Nie traktujemy ogólnego błędu jako dowodu usunięcia piosenki.

Skaner oferuje dwa miejsca odtwarzania: **Na tym urządzeniu** (`local`, osadzony `Players` w skanerze) oraz **Drugi ekran** (`browser`, karty i sterowanie przez PeerJS). Wartość `browser` zachowuje dotychczasowe znaczenie w zapisanych preferencjach. Nowa instalacja zaczyna od odtwarzania lokalnego. Zapisany wcześniej wybór `spotify` jest migrowany do `local`.

Lokalny skan lub link do karty uruchamia odtwarzacz bez połączenia PeerJS. Wybierane jest preferowane źródło, a jeśli karta go nie zawiera — dostępny serwis. Powrót do skanowania lub wyjście z widoku niszczy osadzony odtwarzacz; aparat jest zwalniany po odczycie karty. Przy zablokowanym automatycznym starcie użytkownik uruchamia dźwięk przyciskiem. Spotify Embed nie gwarantuje pełnego nagrania ani autoplay; [dokumentacja iFrame API](https://developer.spotify.com/documentation/embeds/references/iframe-api).

Osadzone kontrolki dostawcy pozostają widoczne i mogą pokazywać tytuł oraz okładkę nagrania. Przy odtwarzaniu na drugim ekranie skaner pokazuje rewers karty i rodzaj nagrania.

## Dane nagrania bez logowania

W formularzu dodawania karty link Spotify wskazuje konkretne nagranie. Publiczne oEmbed dostarcza tytuł podglądu i oficjalny iframe; odsłuch odbywa się w ramce Spotify. Nie pobieramy plików audio i nie korzystamy ze Spotify Web API.

MusicBrainz służy do wyszukania metadanych i roku pierwszego wydania konkretnej wersji nagrania. Wyniki mogą zawierać wykonania koncertowe, remiksy lub inne nagrania o takim samym tytule. Użytkownik zatwierdza dopasowanie i może uzupełnić dane ręcznie. MusicBrainz nie udostępnia audio. Publiczny odczyt nie wymaga konta ani klucza API; aplikacja ogranicza częstotliwość zapytań. [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API) · [Limity](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting).

Import JSON/CSV zachowuje dotychczasowy format i limit 2000 utworów. Przy dopisywaniu zachowujemy istniejące rekordy i poprawki. Duplikaty identyfikujemy po źródle Spotify albo YouTube. Linki do całych playlist nie są pobierane przez API.

Sprawdzenie linków przez oEmbed potwierdza dostępność metadanych, nie gwarantuje odtwarzania ani dostępności w konkretnym regionie. Brak odpowiedzi może wynikać z CORS, limitów lub sieci.

## Tłumaczenia JSON

Pliki `src/locales/*.pl.json` / `*.en.json` i bazowe `pl.json` / `en.json` zawierają płaskie słowniki o wspólnych kluczach, np. `components.Camera.startCamera`. Każdy klucz ma polską i angielską wartość; tekst dynamiczny używa parametrów `{{name}}`. Zachowuj te same nazwy parametrów w obu językach i tłumacz całe zdania, aby szyk zdania można było zmieniać bez składania fragmentów w kodzie.

`src/i18n.ts` ładuje słowniki przy budowaniu aplikacji, dzięki czemu działają także w zapisanej PWA. Komponenty korzystają z `useTranslation()` i `t(key, params)`. Zwykłe moduły mogą wywołać `t`, a zadania asynchroniczne używają `createTranslator()` do utrzymania jednego języka przez cały eksport PDF. Brak angielskiego wpisu korzysta z polskiego odpowiednika; nieznany klucz pozostaje widoczny jako klucz, aby łatwo znaleźć błąd.

Język jest zapisywany w localStorage pod `hiciarz-language`. Kolejność wyboru: zapisane `pl` / `en`, pierwszy obsługiwany wpis `navigator.languages`, polski. Przełączenie działa bez przeładowania i synchronizuje wybór między kartami tej samej przeglądarki. Aktualizowane są również `html.lang`, tytuł strony i opis. Dane użytkownika i identyfikatory formatu JSON/CSV oraz QR pozostają niezależne od języka.

Przy dodawaniu tekstu uzupełnij oba pliki słownika z odpowiedniej grupy oraz użyj klucza w kodzie. W folderze `web/` wykonaj `pnpm test` i `pnpm build`; testy sprawdzają między innymi zgodność kluczy i parametrów. Dłuższe angielskie etykiety warto sprawdzić w widoku mobilnym, w modalach i na wygenerowanym PDF.

## Pliki dla AI

[Instrukcja przygotowania playlisty](playlist-guide.md) i [gotowy prompt do skopiowania](playlist-prompt.txt) są dostępne w repozytorium. W etapie **Utwory** wybierz **Przygotuj talię z AI**. Przycisk kopiuje instrukcję; wklej ją do swojego AI, a gotowy plik JSON wczytaj w **Wczytaj playlistę z pliku**. Przed drukiem sprawdź źródła i lata nagrań. Import plików oraz własnego tła obsługuje również przeciąganie i upuszczanie.

Minimalna lista JSON:

```json
[
  {
    "title": "Last Christmas",
    "artist": "Wham!",
    "year": 1984,
    "theme": "fish",
    "sources": {
      "spotify": "2FRnf9qhLbvw8fu4IBXx78",
      "youtube": "E8gmARGvPlI"
    }
  }
]
```

Pola `title`, `artist`, `year` i przynajmniej jedno poprawne źródło są wymagane. `id` i `theme` opcjonalne. Motywy: `classic`, `minimal`, `vinyl`, `mixtape`, `memphis`, `disco`, `christmas`, `winter`, `fish`. Źródła przyjmują identyfikatory lub linki HTTPS odpowiedniego serwisu. Maksymalnie 2000 utworów.

CSV: `id,title,artist,year,theme,spotify,youtube`. Pola zawierające przecinki lub nowe linie muszą być poprawnie cytowane. Działanie **Opcje talii → Zapisz do pliku** eksportuje pełny JSON wersji 1 z grafiką, motywem i ustawieniami wydruku. Wczytanie pełnego projektu jako nowej talii nie usuwa obecnej talii. Szablony plików są dostępne w **Jak korzystać**.

Instrukcja dla AI: „Przygotuj tablicę JSON według powyższego schematu. Rok ma dotyczyć pierwszego wydania wskazanego nagrania, nie składanki. Nie wymyślaj identyfikatorów Spotify ani YouTube. Zweryfikuj linki. Nie dodawaj komentarzy ani Markdown wewnątrz pliku.”

## Dane lokalne i PWA

### Nawigacja, ustawienia i instalacja

Interfejs korzysta z tych samych widoków w przeglądarce i PWA. Na telefonie stały dolny pasek zawiera **Skaner**, **Bingo** (link do osobnej aplikacji), **Talie**, **Dźwięk** i **Więcej**. Start jest dostępny przez logo lub **Więcej → Start**; menu **Więcej** zawiera również drugi ekran, ustawienia i pomoc. Desktop używa bocznego paska, w którym **Dźwięk** jest dostępny pod listą widoków. Menu **Opcje talii** przy nazwie talii skupia przełączanie, tworzenie, import, eksport i usuwanie. Etap **Utwory** zawiera widoczne wejście **Przygotuj talię z AI**, gotowe przykłady oraz zwijany obszar **Wczytaj playlistę z pliku**. Tworzenie ma jedną sekwencję **Utwory → Wygląd → Druk**; okno wydruku pokazuje podsumowanie parametrów i dwie akcje: pobranie PDF albo otwarcie podglądu.

Przycisk **Dźwięk** otwiera wspólny panel ustawień odtwarzania. Na telefonie ma formę szuflady, a na komputerze pokazuje **Na tym urządzeniu** i **Drugi ekran**. Bingo ma własną stronę i nie korzysta z wewnętrznego panelu odtwarzania Hiciarza.

Na telefonie skaner zajmuje dostępną wysokość ekranu (`100dvh`) z uwzględnieniem bezpiecznych obszarów systemu i dolnej nawigacji. Ma aparat na całej szerokości, dolny przycisk startu/zatrzymania i wybór odtwarzania w górnym pasku. Układ poziomy przenosi kontrolki obok aparatu. Błędy, powiększony tekst i osadzony odtwarzacz mogą rozszerzyć zawartość do przewijania.

Wewnętrzne widoki zapisane w `?view=` to `home`, `scanner`, `editor` i `player`; brak lub nieznana wartość oznacza start. Modale są zapisane w historii aplikacji. Przy zmianie widoku aplikacja sprząta stan skanera i odtwarzania.

Bingo zostało wydzielone do [ArtifexEt/Bingo](https://github.com/ArtifexEt/Bingo) i jest publikowane pod [artifexet.github.io/Bingo](https://artifexet.github.io/Bingo/). Dotychczasowe `?view=bingo` przekierowuje do nowego adresu z zachowaniem wyłącznie poprawnych `sheet=print|help`, `level=beginner|expert` i `lang=pl|en`. Pozostałe parametry i hash nie są przekazywane. Generator PDF, reguły, tłumaczenia Bingo i testy wydruków znajdują się w nowym repozytorium.

**Ustawienia** zawierają język, wygląd strony, instalację, informacje o zapisie lokalnym oraz wersję i sprawdzanie aktualizacji. Wsparcie projektu jest zwykłym linkiem w ustawieniach.

Przycisk instalacji korzysta z zapamiętanego zdarzenia `beforeinstallprompt` i otwiera natywny prompt dopiero po kliknięciu. Jeśli przeglądarka iOS udostępnia instalację ręczną, przycisk pokazuje instrukcję **Udostępnij → Do ekranu początkowego → Dodaj**. W trybie zainstalowanej aplikacji propozycja instalacji jest ukryta. Manifest używa `display: standalone`, a obsługujące je systemy mogą pokazać skróty **Skanuj karty** (`?view=scanner`) i **Twórz karty** (`?view=editor`). Wszystkie ścieżki uwzględniają `BASE_PATH`.

### Wygląd i podgląd wydruku

Podgląd karty i eksport PDF korzystają ze wspólnego układu 60 × 60 mm, fontu Noto Sans i reguł łamania tekstu. Prostokątne własne tło jest przycinane centralnie do kwadratu bez rozciągania. Wariant **Laser — lekki kolor** pomija własne tło zarówno w podglądzie, jak i w PDF.

Motyw zapisany przy pojedynczej karcie ma pierwszeństwo przed motywem talii. Podgląd oznacza kartę o innym motywie niż talia, a przy wyborze wyglądu widoczna jest liczba kart z własnym motywem. **Zastosuj motyw talii do wszystkich kart** usuwa te indywidualne ustawienia dopiero po kliknięciu; sama zmiana motywu talii ich nie usuwa.

Gdy widoczny jest komunikat **Wczytywanie tła…**, eksport jest niedostępny. Kolejne wczytanie zastępuje poprzednie; zmiana motywu, usunięcie tła lub przełączenie talii unieważnia oczekującą operację. Podczas generowania PDF edytor nie przyjmuje zmian.

### Format kodów kart

Nowe karty używają krótkiego formatu `#2<skórka>s<Spotify ID>y<YouTube ID>`; obecne jest co najmniej jedno źródło. Kody skórek: `c` klasyczny, `m` minimalistyczny, `x` świąteczny, `w` zimowy, `f` rybki. Dane utworu i lokalny identyfikator rekordu nie są zapisywane w QR. Przykładowa karta Spotify ma 62 znaki wraz z adresem głównej publikacji. Korekcja błędów M i czteromodułowy margines pozostają zachowane.

Czytnik nadal obsługuje starsze karty `#card=<Base64 JSON>`. Wcześniejsze wydruki nie wymagają wymiany. Nowa karta jest dopasowywana do lokalnej talii po źródłach i skórce, dzięki czemu dostępny jest jej własny rewers i preset druku. QR pozostaje samodzielny: do wskazania nagrania nie wymaga wspólnej bazy kart.

Pierwsze uruchomienie zaczyna się od pustej talii. Na ekranie startowym wybierz **Twórz karty** lub otwórz **Talie → Utwory → Importuj → Wybierz gotową talię**, aby wczytać przykład. Zapisane talie przełączaj przez **Wszystkie talie** przy nazwie. Z każdego widoku wrócisz do startu przez logo Hiciarza lub **Więcej → Start**.

Gotowe listy znajdują się w folderze [examples/playlists](../examples/playlists/README.md). Przykład **Świąteczne hity** zawiera statyczny zapis wszystkich 151 utworów z [polecanej playlisty](https://open.spotify.com/playlist/7wfTeAa7cxhA3qNE05XPKk) z 9 listopada 2026 i motyw Rybki świąteczne. Wczytasz go bez logowania do Spotify, jako nową talię lub dopisując utwory do obecnej. Lata wydań oznaczono do sprawdzenia przed drukiem. Możesz edytować własną kopię; przykład w repozytorium nie zmienia się razem z nią. Listy są dołączone do aplikacji i dostępne również po zapisaniu jej do pracy offline; odtwarzanie muzyki wymaga sieci.

Gdy nowa wersja aplikacji jest gotowa, pojawi się przycisk **Wczytaj nową wersję**. Przed odświeżeniem aplikacja zapisuje talie. W **Ustawieniach** znajdziesz numer wersji i **Sprawdź aktualizacje**. Aktualizacja nie wymaga czyszczenia danych strony.

Talie i zdjęcia: IndexedDB. Preferencje wyglądu, języka i miejsca odtwarzania: localStorage. Nie zapisujemy sesji OAuth ani tokenów Spotify. Czyszczenie danych strony usuwa lokalne talie — zapisuj JSON. Przy awarii zapisu aplikacja wyświetla komunikat. Kreator i eksport PDF korzystają z zasobów lokalnych po zapisaniu ich przez service worker; muzyka, API i parowanie wymagają sieci. Service worker zapisuje również przykładowe talie i dokumentację źródeł nagrań. Przy utracie połączenia interfejs pokazuje informację o dostępnej edycji i druku offline; stan `navigator.onLine` jest wskazówką, nie gwarancją dostępności serwisów zewnętrznych.

Nie ma kont Hiciarza, analityki ani backendu przechowującego talie. Po wybraniu źródła przeglądarka kontaktuje się z tym dostawcą; parowanie kontaktuje się z usługami PeerJS/ICE.

## Grafiki i czcionki

`public/themes/fish.webp`: autorska ilustracja wygenerowana narzędziem GPT Image. Prompt zapisany w `docs/image-prompt.txt`. Pozostałe presety są grafikami SVG projektu. Noto Sans w `public/fonts` na licencji dołączonej w tym katalogu. Ekran startowy wykorzystuje lokalny Barlow Condensed na licencji SIL Open Font License 1.1; treść licencji znajduje się w [`public/fonts/BarlowCondensed-OFL.txt`](../public/fonts/BarlowCondensed-OFL.txt).
