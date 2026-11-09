# Hiciarz ✳

Otwarte studio kart muzycznych. Kreator działa lokalnie w przeglądarce, telefon skanuje QR, a strona na laptopie odtwarza muzykę. Wyjście dźwięku (AirPlay, Bluetooth, USB, kabel) wybiera system operacyjny.

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

## Jak grać

1. W kreatorze dodaj piosenki, wczytaj JSON/CSV albo zaimportuj playlistę po skonfigurowaniu integracji. Sprawdź rok konkretnego nagrania.
2. Wybierz motyw. Pojedyncza piosenka może mieć własny motyw, np. Rybki świąteczne. Własne zdjęcie jest kadrowane centralnie do kwadratu.
3. Pobierz PDF, wydrukuj A4 w skali 100%, dwustronnie. Najpierw wykonaj próbę kalibracyjną. Domyślne karty mają 60 × 60 mm, 3 kolumny i 4 wiersze.
4. Na laptopie otwórz Odtwarzacz → Połącz telefon. W systemie wybierz wyjście dźwięku.
5. Na telefonie otwórz Skaner → Włącz aparat. Zeskanuj QR parowania z laptopa, następnie kody na kartach.
6. Jeśli przeglądarka zablokuje automatyczny start, kliknij odtwarzanie na laptopie. Wybierz inne źródło, gdy materiał jest niedostępny.

Nie ma ręcznego wpisywania ani wklejania kodów do skanera. Kody kart zawierają źródła i motyw, nie potrzebują centralnej bazy ani wcześniejszego importu talii na laptopie. Bezpieczeństwo sesji opiera się na losowym identyfikatorze i tokenie z QR; nie publikuj QR aktywnej sesji. Zakończenie sesji lub nowy kod unieważnia poprzednie połączenie. Polecenia nie są kolejkowane offline.

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

Sprawdzenie linków przez oEmbed potwierdza dostępność metadanych, nie gwarantuje odtwarzania ani dostępności w konkretnym regionie. Brak odpowiedzi może wynikać z CORS, limitów lub sieci.

## Pliki dla AI

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

Talie i zdjęcia: IndexedDB. Preferencje wyglądu: localStorage. Dane sesji OAuth: sessionStorage. Eksporty nie zawierają tokenów. Czyszczenie danych strony usuwa lokalne talie — zapisuj JSON. Przy awarii zapisu aplikacja wyświetla komunikat. Kreator i eksport PDF korzystają z zasobów lokalnych po zapisaniu ich przez service worker; muzyka, API i parowanie wymagają sieci.

Nie ma kont Hiciarza, analityki ani backendu przechowującego talie. Po wybraniu źródła przeglądarka kontaktuje się z tym dostawcą; parowanie kontaktuje się z usługami PeerJS/ICE.

## Grafiki i czcionki

`public/themes/fish.webp`: autorska ilustracja wygenerowana narzędziem GPT Image. Prompt zapisany w `docs/image-prompt.txt`. Pozostałe presety są grafikami SVG projektu. Noto Sans w `public/fonts` na licencji dołączonej w tym katalogu.

## Tryby odtwarzania

- **Na tym komputerze**: Spotify i YouTube odtwarzają na stronie. Wyjście dźwięku wybierasz w systemie, np. AirPlay na Macu.
- **Spotify Connect**: połącz konto i wybierz aktywne urządzenie Spotify. Skanowane karty uruchamiają na nim piosenki przez API. Możesz używać telefonu samodzielnie albo sparować skaner z laptopem. Karta musi zawierać źródło Spotify.

Sterowanie API wymaga Spotify Premium. Urządzenie musi być dostępne dla zalogowanego konta; otwórz Spotify i uruchom dowolny utwór, jeśli nie pojawia się na liście.

## Konfiguracja Spotify przez GitHub Actions

1. W panelu Spotify ustaw dokładny Redirect URI strony, np. `https://artifexet.github.io/Hiciarz/`.
2. W repozytorium otwórz Settings → Secrets and variables → Actions → New repository secret.
3. Utwórz sekret **SPOTIFY_CLIENT_ID** z wartością Client ID. Nie dodawaj pliku z identyfikatorem do repozytorium.
4. Uruchom ponownie workflow **Build, test and publish Pages** na gałęzi main.

Client ID jest dołączany do gotowego frontendu podczas budowania. Client Secret nie jest potrzebny: logowanie używa PKCE. Nigdy nie przekazuj Client Secret do zmiennych VITE ani do plików strony.

## Preset Laser — lekki kolor

W kreatorze wybierz **Ustawienia druku → Laser — lekki kolor**. Obie strony mają białe tło, ciemny tekst i niewielkie akcenty w dwóch kolorach: stonowanej zieleni oraz ciepłej terakoty. Konturowe rybki-bombki i linie w PDF są wektorowe. Preset pomija pełne ilustracje i własne tło, zachowując je w projekcie na później. QR pozostaje czarno-biały.

Ustawienie dotyczy wyłącznie wyglądu wydruku. Motyw zapisany w QR nie zmienia się — karta świąteczna nadal przełącza aplikację na odpowiednią skórkę. Aby wrócić do ilustracji, wybierz **Pełna grafika motywu**.
