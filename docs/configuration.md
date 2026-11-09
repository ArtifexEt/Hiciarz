# Konfiguracja i dokumentacja techniczna

[← Wróć do README](../README.md)

## Uruchomienie

Wymagane Node.js 22+ i pnpm 11.

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
```

Otwórz adres wypisany przez Vite z końcówką `/Hiciarz/`. Dla telefonu użyj publikacji HTTPS: dostęp do aparatu wymaga bezpiecznego kontekstu. Sam adres HTTP komputera w sieci lokalnej zwykle nie wystarczy. `localhost` jest wyjątkiem wyłącznie na tym samym urządzeniu.

## GitHub Pages

Workflow `.github/workflows/pages.yml` testuje, buduje i publikuje gałąź `main`. W Settings → Pages wybierz źródło **GitHub Actions**. Własny fork używa nazwy swojego repozytorium jako ścieżki bazowej. Dla hostingu w katalogu głównym ustaw `BASE_PATH=/` podczas budowania.

Nie wpisuj sekretu Spotify do kodu ani zmiennych frontendu. Zmienne budowania trafiające do strony są publiczne.

## Konfiguracja Spotify przez GitHub Actions

1. W panelu Spotify ustaw dokładny Redirect URI strony, np. `https://artifexet.github.io/Hiciarz/`.
2. W repozytorium otwórz Settings → Secrets and variables → Actions → New repository secret.
3. Utwórz sekret **SPOTIFY_CLIENT_ID** z wartością Client ID. Nie dodawaj pliku z identyfikatorem do repozytorium.
4. Uruchom ponownie workflow **Build, test and publish Pages** na gałęzi main.

Client ID jest dołączany do gotowego frontendu podczas budowania. Client Secret nie jest potrzebny: logowanie używa PKCE. Nigdy nie przekazuj Client Secret do zmiennych VITE ani do plików strony.

## Parowanie i sieć

Połączenie danych: PeerJS/WebRTC. Domyślnie używamy publicznego PeerServer do sygnalizacji oraz serwerów ICE dostarczanych w konfiguracji PeerJS. To nie jest rozwiązanie całkowicie offline ani gwarantowany transport wyłącznie po LAN. Muzyka nie przechodzi przez połączenie telefon–laptop. Zapory i izolacja klientów Wi-Fi mogą uniemożliwić połączenie.

Własny PeerServer (HTTPS/WSS) można wskazać publicznymi zmiennymi GitHub Actions:

- `PEER_HOST` → `VITE_PEER_HOST`
- `PEER_PORT` → `VITE_PEER_PORT`, domyślnie 443
- `PEER_PATH` → `VITE_PEER_PATH`, domyślnie `/`

## Spotify i YouTube

Odtwarzacz korzysta z oficjalnych, widocznych embedów Spotify i YouTube. Nie wymaga naszego Spotify Client ID do osadzenia. Pełna długość, automatyczny start, logowanie w ramce i dostępność zależą od dostawcy, konta i przeglądarki. Niektóre nagrania blokują osadzanie; Spotify może odtwarzać tylko podgląd. Nie traktujemy ogólnego błędu jako dowodu usunięcia piosenki.

**Import playlist jest osobny od odtwarzania widgetu.** Administrator ustawia sekret repozytorium Actions `SPOTIFY_CLIENT_ID`. Adres powrotu w Spotify Developer Dashboard musi być dokładnie adresem strony, np. `https://artifexet.github.io/Hiciarz/` (sprawdź wielkość liter w faktycznym adresie). Logowanie używa PKCE; Client Secret nie występuje. Token jest w sessionStorage i znika po zakończeniu sesji przeglądarki. Import pyta o dopisanie na końcu lub zastąpienie listy. Pobiera strony playlisty do 2000 utworów. Zakres playlist i dostęp kont zależą od uprawnień integracji Spotify.

Przy dopisywaniu zachowujemy istniejące rekordy i poprawki. Duplikaty identyfikujemy po źródle Spotify albo YouTube. Utwory z różnych serwisów bez wspólnego identyfikatora mogą wymagać ręcznego uporządkowania. Rok z albumu Spotify jest oznaczany do sprawdzenia.

Obecna integracja w trybie deweloperskim Spotify pobiera zawartość playlist, których zalogowana osoba jest właścicielem lub współtwórcą. Inne playlisty, nawet publiczne, nie udostępniają jej listy utworów. Samo zapisanie playlisty w Bibliotece tego nie zmienia. [Zasady dostępu Spotify](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide).

Sprawdzenie linków przez oEmbed potwierdza dostępność metadanych, nie gwarantuje odtwarzania ani dostępności w konkretnym regionie. Brak odpowiedzi może wynikać z CORS, limitów lub sieci.

## Pliki dla AI

[Instrukcja przygotowania playlisty](playlist-guide.md) i [gotowy prompt do skopiowania](playlist-prompt.txt) są dostępne w repozytorium. Prompt można też skopiować przyciskiem w kreatorze.

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

Pola `title`, `artist`, `year` i przynajmniej jedno poprawne źródło są wymagane. `id` i `theme` opcjonalne. Motywy: `classic`, `minimal`, `christmas`, `winter`, `fish`. Źródła przyjmują identyfikatory lub linki HTTPS odpowiedniego serwisu. Maksymalnie 2000 utworów.

CSV: `id,title,artist,year,theme,spotify,youtube`. Pola zawierające przecinki lub nowe linie muszą być poprawnie cytowane. Przycisk Zapisz projekt eksportuje pełny JSON wersji 1 z grafiką, motywem i ustawieniami wydruku. Wczytanie pełnego projektu jako nowej talii nie usuwa obecnej talii. Kopie przykładowe można pobrać przez „Jak to działa?”.

Instrukcja dla AI: „Przygotuj tablicę JSON według powyższego schematu. Rok ma dotyczyć pierwszego wydania wskazanego nagrania, nie składanki. Nie wymyślaj identyfikatorów Spotify ani YouTube. Zweryfikuj linki. Nie dodawaj komentarzy ani Markdown wewnątrz pliku.”

## Dane lokalne i PWA

Pierwsze uruchomienie zaczyna się od pustej talii. Możesz skorzystać z jednorazowej propozycji wczytania świątecznego przykładu albo ją pominąć. Przykłady zawsze znajdziesz też w kreatorze pod **Przykładowe playlisty**. Na ekranie startowym wybierz **Twórz karty**, a zapisane talie przełączaj polem **Twoje talie**. Z każdego trybu wrócisz przyciskiem **Start**.

Gotowe listy znajdują się w folderze [examples/playlists](../examples/playlists/README.md). Przykład **Świąteczne hity** zawiera statyczny zapis wszystkich 151 utworów z [polecanej playlisty](https://open.spotify.com/playlist/7wfTeAa7cxhA3qNE05XPKk) z 9 listopada 2026 i motyw Rybki świąteczne. Wczytasz go bez logowania do Spotify, jako nową talię lub dopisując utwory do obecnej. Lata wydań oznaczono do sprawdzenia przed drukiem. Możesz edytować własną kopię; przykład w repozytorium nie zmienia się razem z nią. Listy są dołączone do aplikacji i dostępne również po zapisaniu jej do pracy offline; odtwarzanie muzyki wymaga sieci.

Gdy nowa wersja aplikacji jest gotowa, pojawi się przycisk **Wczytaj nową wersję**. Przed odświeżeniem aplikacja zapisuje talie. W stopce znajdziesz numer wersji i **Sprawdź aktualizacje**. Aktualizacja nie wymaga czyszczenia danych strony.

Talie i zdjęcia: IndexedDB. Preferencje wyglądu: localStorage. Dane sesji OAuth: sessionStorage. Eksporty nie zawierają tokenów. Czyszczenie danych strony usuwa lokalne talie — zapisuj JSON. Przy awarii zapisu aplikacja wyświetla komunikat. Kreator i eksport PDF korzystają z zasobów lokalnych po zapisaniu ich przez service worker; muzyka, API i parowanie wymagają sieci.

Nie ma kont Hiciarza, analityki ani backendu przechowującego talie. Po wybraniu źródła przeglądarka kontaktuje się z tym dostawcą; parowanie kontaktuje się z usługami PeerJS/ICE.

## Grafiki i czcionki

`public/themes/fish.webp`: autorska ilustracja wygenerowana narzędziem GPT Image. Prompt zapisany w `docs/image-prompt.txt`. Pozostałe presety są grafikami SVG projektu. Noto Sans w `public/fonts` na licencji dołączonej w tym katalogu.
