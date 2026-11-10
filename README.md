<p align="center">
  <img src="docs/assets/readme-banner.svg" alt="Hiciarz — Twoja muzyka. Wasza gra." width="100%">
</p>

<p align="center">
  Twórz własne karty muzyczne, skanuj je telefonem i zgaduj hity ze znajomymi.
  <br>
  <strong>Od ulubionej playlisty do wspólnego wieczoru.</strong>
</p>

<p align="center">
  <a href="https://artifexet.github.io/Hiciarz/"><img src="https://img.shields.io/badge/Otw%C3%B3rz_aplikacj%C4%99-083935?style=for-the-badge&amp;logo=googlechrome&amp;logoColor=EDBD75" alt="Otwórz aplikację"></a>
  <a href="#pierwsza-rozgrywka"><img src="https://img.shields.io/badge/Jak_zagra%C4%87-EDE8DC?style=for-the-badge&amp;logo=googledocs&amp;logoColor=253B34" alt="Jak zagrać"></a>
  <a href="https://buymeacoffee.com/szymonrybka"><img src="https://img.shields.io/badge/Postaw_mi_kaw%C4%99-EDBD75?style=for-the-badge&amp;logo=buymeacoffee&amp;logoColor=253B34" alt="Wesprzyj autora — postaw mi kawę"></a>
</p>

<p align="center">
  <a href="https://github.com/ArtifexEt/Hiciarz/actions/workflows/pages.yml"><img src="https://github.com/ArtifexEt/Hiciarz/actions/workflows/pages.yml/badge.svg" alt="Budowanie, testy i publikacja"></a>
  &nbsp; Przeglądarka · Telefon · Własne talie · PDF do druku
</p>

---

## Twój zestaw do muzycznej zabawy

Hiciarz łączy kreator kart, skaner QR i odtwarzacz w jednej aplikacji przeglądarkowej. Przygotuj swoją kolekcję piosenek, dobierz oprawę i wydrukuj talię. Podczas gry zeskanuj kartę, posłuchaj nagrania i spróbuj odgadnąć jego miejsce na muzycznej osi czasu.

| Przygotuj                                                                                  | Nadaj charakter                                              | Zagraj                                                                              |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Dodawaj i edytuj piosenki, wczytuj JSON lub CSV, korzystaj z przykładów i importu Spotify. | Wybierz motyw, wgraj własny rewers i pobierz dwustronny PDF. | Skanuj QR telefonem i steruj Spotify albo połącz się z odtwarzaczem w przeglądarce. |

## Pierwsza rozgrywka

1. **[Otwórz Hiciarza](https://artifexet.github.io/Hiciarz/).** Na ekranie startowym wybierz **Skanuj i graj** albo **Twórz karty**.
2. **Wybierz piosenki.** Zacznij od **Przykładowych playlist** lub przygotuj własną listę. Tytuł, wykonawcę i rok możesz poprawić przed drukiem.
3. **Wydrukuj karty.** Wybierz **Pobierz / drukuj karty**. Pobierz PDF lub otwórz go do druku, a w podglądzie wybierz ikonę drukarki. Instrukcja pokazuje właściwą krawędź obrotu, format A4 i skalę 100%. Najpierw wykonaj próbę kalibracyjną przez **Ustawienia druku i wydruk próbny**. Po wydrukowaniu obu stron wytnij karty.
4. **Wybierz sposób słuchania.** Połącz Spotify albo uruchom odtwarzacz na drugim urządzeniu — oba warianty opisano poniżej.
5. **Skanuj i zgaduj.** QR z karty wskazuje nagranie i motyw. Jeśli aparat udostępnia zoom, przybliżysz obraz suwakiem lub przyciskami − / +.

## Muzyka tam, gdzie gracie

|                   | Spotify Connect                                                                   | Odtwarzacz w przeglądarce                                                                                               |
| ----------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Przygotowanie** | Wybierz **Skanuj i graj → Moje Spotify**, zaloguj się i wskaż aktywne urządzenie. | Na urządzeniu do odtwarzania otwórz **Odtwarzacz → Na tym urządzeniu → Połącz skaner**.                                 |
| **Skanowanie**    | Włącz aparat na telefonie i skanuj karty ze źródłem Spotify.                      | Telefonem zeskanuj QR parowania, a następnie kody z kart.                                                               |
| **Dźwięk**        | Muzyka gra na wybranym urządzeniu Spotify.                                        | Spotify lub YouTube odtwarza na połączonym urządzeniu; wyjście dźwięku wybierasz w systemie.                            |
| **Wymagania**     | Spotify Premium i urządzenie dostępne dla zalogowanego konta.                     | Nagranie dostępne do osadzenia. Spotify może odtwarzać tylko podgląd; przeglądarka może wymagać kliknięcia odtwarzania. |

## Połącz swoje Spotify

Przy pierwszym połączeniu Hiciarz przeprowadzi Cię przez wybór ustawień. Możesz użyć domyślnego połączenia tej strony, jeśli Twoje konto ma do niego dostęp, albo wpisać **własny Client ID**. Zmienisz go później w **O aplikacji → Ustawienia Spotify** lub w menu konta.

Konfigurację przeniesiesz na telefon **osobnym QR**. Po instalacji aplikacji otwórz jej ustawienia Spotify, zeskanuj kod i potwierdź zapis. Na każdym urządzeniu logujesz się osobno. QR kart z piosenkami pozostają krótkie i niezależne od Client ID.

Spotify ogranicza integracje w trybie deweloperskim. Własny Client ID służy do osobistego połączenia i nadal podlega zasadom dostawcy. **[Przewodnik: Spotify od pierwszego połączenia do własnego forka →](docs/spotify.md)**

## Świąteczny wieczór na start

W kreatorze czeka przykład **Świąteczne hity**: 151 piosenek z [polecanej playlisty Spotify](https://open.spotify.com/playlist/7wfTeAa7cxhA3qNE05XPKk), zapisanych 9 listopada 2026, z motywem **Rybki świąteczne**.

Wczytaj go **bez logowania**, jako nową talię lub dopisując utwory do obecnej. Własną kopię możesz dowolnie edytować. Lata pochodzą z wydań Spotify i są oznaczone do sprawdzenia przed drukiem.

**[Przeglądaj przykłady i dodaj własny →](examples/playlists/README.md)**

## Muzyczne Bingo

Na stronie startowej wybierz **Zagraj w Bingo** lub otwórz **Bingo** w menu. Skaner i kreator pozostają osobnymi trybami.

Wybierz poziom i naciśnij **Losuj zagadkę**. Aplikacja pokaże typ pytania oraz krótkie wyjaśnienie. Każde losowanie jest niezależne, więc kategorie mogą się powtarzać. Przyciskiem **Przejdź do skanera kart** otworzysz dotychczasowy skaner; po powrocie do Bingo ostatnia zagadka nadal będzie widoczna.

Dostępne są dwa zestawy pytań: **Na dobry początek** (zespół/solista, przed 2000, rok ±4, dekada, rok ±2) oraz **Dla znawców** (tytuł, dokładny rok, wykonawca, dekada, rok ±3). Odpowiedzi sprawdzacie wspólnie na odwrocie muzycznej karty, a punkty zaznaczacie na papierze. Pełny rząd, kolumna lub przekątna daje Bingo.

Opcjonalne **Plansze do druku** są schowane pod rozwijanym nagłówkiem. PDF zawiera po dwie różne plansze 5 × 5 na A4, w oszczędnym kolorze, z numerami kategorii i legendą dla wybranego poziomu. Drukuj jednostronnie w skali 100%. Zasady inspirowane [oficjalną instrukcją Bingo](https://hitstergame.com/pl-pl/pages/zasady-gry-bingo).

## Karty w Waszym stylu

### Zgadnij film lub grę

W kreatorze wybierz domyślny tryb nowych kart: **Zgadnij film** albo **Zgadnij grę**. W edytorze utworu wpisz tytuł produkcji w polu odpowiedzi i dodaj nagranie ze Spotify lub YouTube. Tryb istniejącej karty zmienisz w jej edytorze. Na skanerze po odczycie QR pojawi się właściwe pytanie, a odpowiedź sprawdzicie po odwróceniu wydrukowanej karty. Punkt otrzymuje osoba, która odgadnie film lub grę; przed rozpoczęciem ustalcie liczbę rund.

JSON i CSV obsługują pola `gameMode` (`music`, `movie`, `game`) oraz `answer` (wymagane dla filmu i gry). Import Spotify dostarcza dane nagrania; tytuł produkcji uzupełnia się ręcznie. Odpowiedź pozostaje w projekcie i na stronie odpowiedzi PDF — QR jej nie zawiera. Rok nagrania jest zachowany w projekcie, ale na kartach tych trybów zastępuje go etykieta FILM lub GRA. Starsze karty i talie nadal działają.

- **Dziewięć motywów:** Klasyczny, Minimalistyczny, Winylowy wieczór, Lato z kasetą, Domówka 90s, Noc disco, Świąteczna noc, Zimowa opowieść i autorskie Rybki świąteczne.
- **Osobny wygląd strony i kart:** skórkę strony wybierasz w górnym pasku lub mobilnym menu „Wygląd”, a motyw talii w zakładce „Wygląd kart”. Wybieranie, tworzenie i wczytywanie talii nie zmienia skórki strony.
- **Oprawa rundy:** zeskanowana karta dopasowuje wygląd skanera i odtwarzacza tylko na czas rundy. Po jej zakończeniu lub powrocie do kreatora wraca Twoja skórka strony.
- **Kolorowe awersy:** różne odcienie kart, ozdobne akcenty oraz czytelny rok, tytuł i wykonawca.
- **Własne rewersy:** wgraj grafikę lub wybierz gotowy preset.
- **Laser — lekki kolor:** białe tło, ciemny tekst i oszczędne kolorowe akcenty do drukarki laserowej.

PDF mieści 12 kart o wymiarach **60 × 60 mm** na stronie A4. Ustawienia druku obejmują krawędź obrotu, przesunięcia kalibracyjne i znaczniki cięcia.

## Playlisty i zapis

Import pyta, czy dopisać nowe utwory na końcu, czy zastąpić listę. Dopisywanie zachowuje ręczne poprawki i pomija duplikaty rozpoznane po źródle nagrania. Projekt zapiszesz jako JSON, a listę utworów również jako CSV.

> **Import Spotify:** obecna integracja odczytuje playlisty, których jesteś właścicielem lub współtwórcą. Spotify nie udostępnia jej zawartości pozostałych playlist, także publicznych. Gotowe przykłady można wczytać niezależnie od tego ograniczenia.

Talie i grafiki są zapisywane w Twojej przeglądarce. **Zapisz projekt do pliku**, aby mieć kopię lub przenieść talię na inne urządzenie. Aktualizacja aplikacji zachowuje lokalny zapis; w stopce znajdziesz wersję i przycisk **Sprawdź aktualizacje**.

## Rozwijaj Hiciarza

Wymagane: **Node.js 22+** i **pnpm 11**.

```sh
pnpm install
pnpm dev
```

Serwer poda lokalny adres z końcówką `/Hiciarz/`. Pozostałe polecenia:

```sh
pnpm test
pnpm build
```

| Dokumentacja                                          | Co znajdziesz                                                                            |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [Konfiguracja i publikacja](docs/configuration.md)    | GitHub Pages, Spotify PKCE, zmienne Actions, parowanie, dane lokalne i zasoby graficzne. |
| [Przykładowe playlisty](examples/playlists/README.md) | Gotowe projekty oraz instrukcja dodawania kolejnych przykładów.                          |
| [Przygotowanie listy utworów](docs/playlist-guide.md) | Format JSON/CSV i sposób przygotowania playlisty z pomocą AI.                            |
| [Gotowy prompt](docs/playlist-prompt.txt)             | Treść do skopiowania przy tworzeniu własnej listy.                                       |

Domyślny Client ID jest dodawany podczas budowania przez sekret Actions `SPOTIFY_CLIENT_ID`. Własny identyfikator wpisany w interfejsie ma pierwszeństwo i jest zapisywany lokalnie. Client ID jest publiczny; logowanie używa PKCE. **Client Secret nie jest używany i nie powinien trafiać do frontendu.**

### Przełącznik przewodnika dla własnej publikacji

W **Settings → Secrets and variables → Actions → Variables** ustaw zmienną repozytorium **`SPOTIFY_ONBOARDING`**:

| Wartość       | Zachowanie                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| `true`        | Pokaż przewodnik przed pierwszym logowaniem dla wybranego Client ID.                                  |
| `false`       | Przejdź do logowania bez automatycznego przewodnika. Ustawienia i QR konfiguracji pozostają dostępne. |
| Brak zmiennej | W repozytorium ArtifexEt/Hiciarz przewodnik jest włączony, w forkach domyślnie wyłączony.             |

Po zmianie uruchom workflow publikacji. Gdy nie ma żadnego Client ID, aplikacja zawsze zaproponuje jego skonfigurowanie. Lokalnie użyj `VITE_SPOTIFY_ONBOARDING=true` lub `false`; przykład znajdziesz w [.env.example](.env.example).

---

## Podoba Ci się Hiciarz?

Jeśli aplikacja uprzyjemniła Wam wieczór, możesz [postawić autorowi kawę](https://buymeacoffee.com/szymonrybka). Dzięki za wsparcie kolejnych muzycznych spotkań.

Pomysły i zgłoszenia błędów zbieramy w [Issues](https://github.com/ArtifexEt/Hiciarz/issues).
