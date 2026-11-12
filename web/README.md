<p align="center">
  <img src="docs/assets/readme-banner.svg" alt="Hiciarz — skaner kart i kreator talii do druku" width="100%">
</p>

<p align="center">
  Twórz własne karty muzyczne, skanuj je telefonem i zgaduj hity ze znajomymi.
</p>

<p align="center">
  <a href="https://artifexet.github.io/Hiciarz/"><img src="https://img.shields.io/badge/Otw%C3%B3rz_aplikacj%C4%99-083935?style=for-the-badge&amp;logo=googlechrome&amp;logoColor=EDBD75" alt="Otwórz aplikację"></a>
  <a href="#pierwsza-rozgrywka"><img src="https://img.shields.io/badge/Jak_zagra%C4%87-EDE8DC?style=for-the-badge&amp;logo=googledocs&amp;logoColor=253B34" alt="Jak zagrać"></a>
  <a href="https://buymeacoffee.com/szymonrybka"><img src="https://img.shields.io/badge/Postaw_mi_kaw%C4%99-EDBD75?style=for-the-badge&amp;logo=buymeacoffee&amp;logoColor=253B34" alt="Wesprzyj autora — postaw mi kawę"></a>
</p>

<p align="center">
  <a href="https://github.com/ArtifexEt/Hiciarz/actions/workflows/pages.yml"><img src="https://github.com/ArtifexEt/Hiciarz/actions/workflows/pages.yml/badge.svg" alt="Budowanie, testy i publikacja"></a>
  &nbsp; Przeglądarka · Telefon · PWA · Własne talie · PDF do druku
</p>

Hiciarz łączy kreator kart, skaner QR i odtwarzacz. Przygotuj listę nagrań, wybierz wygląd i wydrukuj talię. Podczas gry zeskanuj kartę, posłuchaj utworu i odgadnij rok, film lub grę. Dostępne jest też muzyczne Bingo z planszami do druku.

**[Spotify: konfiguracja i rozwiązywanie problemów](docs/spotify.md)** · **[Format playlist JSON/CSV](docs/playlist-guide.md)** · **[Uruchomienie i publikacja](docs/configuration.md)**

## Zobacz aplikację

Ekran startowy na komputerze:

![Ekran startowy Hiciarza z wejściami Skanuj i Twórz oraz przykładowymi kartami muzycznymi](docs/screenshots/home-desktop.png)

<table>
  <tr>
    <th>Tworzenie talii</th>
    <th>Odtwarzanie na komputerze</th>
  </tr>
  <tr>
    <td width="50%" align="center"><a href="docs/screenshots/editor-desktop.png"><img src="docs/screenshots/editor-desktop.png" alt="Edytor talii z podglądem karty zgodnym z układem PDF do druku" width="560"></a></td>
    <td width="50%" align="center"><a href="docs/screenshots/sound-desktop.png"><img src="docs/screenshots/sound-desktop.png" alt="Panel Dźwięk na komputerze z trzema opcjami: Na tym urządzeniu, Spotify Connect i Drugi ekran" width="560"></a></td>
  </tr>
</table>

<table>
  <tr>
    <th>Skaner na telefonie</th>
    <th>Bingo</th>
  </tr>
  <tr>
    <td width="50%" align="center"><a href="docs/screenshots/scanner-mobile.png"><img src="docs/screenshots/scanner-mobile.png" alt="Mobilny skaner z dolnym menu: Skaner, Bingo, Talie, Dźwięk i Więcej" width="320"></a></td>
    <td width="50%" align="center"><a href="docs/screenshots/bingo-mobile.png"><img src="docs/screenshots/bingo-mobile.png" alt="Losowanie zagadki w Bingo z dostępem do Dźwięku w dolnym pasku" width="320"></a></td>
  </tr>
  <tr>
    <th>Gdzie ma grać muzyka?</th>
    <th>Start na telefonie</th>
  </tr>
  <tr>
    <td width="50%" align="center"><a href="docs/screenshots/sound-mobile.png"><img src="docs/screenshots/sound-mobile.png" alt="Szuflada Dźwięk z wyborem odtwarzania na tym urządzeniu, przez Spotify Connect albo na drugim ekranie" width="320"></a></td>
    <td width="50%" align="center"><a href="docs/screenshots/home-mobile.png"><img src="docs/screenshots/home-mobile.png" alt="Start Hiciarza na telefonie z wejściami do skanowania i tworzenia talii oraz przykładowymi kartami" width="320"></a></td>
  </tr>
</table>

## Pierwsza rozgrywka

1. **[Otwórz Hiciarza](https://artifexet.github.io/Hiciarz/)** i wybierz **Twórz karty**. Jeśli masz już wydrukowaną talię, przejdź do **Skanuj karty**.
2. **Przygotuj talię.** W widoku **Talie** wybierz wariant gry i gotowy przykład albo dodaj nagrania ręcznie. Obszar **Import i pomoc AI** pozwala wczytać JSON/CSV, zaimportować Spotify lub skopiować instrukcję dla swojego AI. Plik możesz przeciągnąć do pola importu.
3. **Wydrukuj karty.** Przejdź przez **Utwory → Wygląd → Druk** i wybierz **Pobierz / drukuj karty**. PDF mieści 12 kart 60 × 60 mm na A4. Drukuj dwustronnie w skali 100%, zgodnie z krawędzią obrotu pokazaną w oknie wydruku. Przed całą talią wykonaj próbę z **Próba wydruku i kalibracja**.
4. **Wybierz miejsce odtwarzania.** Otwórz **Dźwięk** i wybierz jeden z wariantów opisanych poniżej.
5. **Skanuj i zgaduj.** Zezwól na aparat, zeskanuj QR z karty i posłuchaj nagrania. Odpowiedź sprawdźcie po odwróceniu wydrukowanej karty. Jeśli przeglądarka zablokuje automatyczny start, użyj przycisku odtwarzania.

## Gdzie ma grać muzyka?

| Wybór w **Dźwięk**    | Jak działa                                                                             | Co przygotować                                                                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Na tym urządzeniu** | Spotify lub YouTube odtwarza w skanerze na telefonie albo tablecie.                    | Bez parowania i bez Client ID. Nagranie musi pozwalać na osadzanie; Spotify może udostępnić tylko fragment.                                                        |
| **Spotify Connect**   | Hiciarz wysyła polecenia do aplikacji Spotify lub głośnika dostępnego na Twoim koncie. | Połączenie Spotify, Premium i aktywne urządzenie. [Instrukcja](docs/spotify.md#odtwarzanie-przez-spotify-connect).                                                 |
| **Drugi ekran**       | Telefon skanuje karty, a połączony komputer lub drugi telefon odtwarza muzykę.         | Na drugim urządzeniu otwórz **Drugi ekran** i wybierz **Połącz skaner**. W skanerze zeskanuj QR parowania, a następnie karty. Oba urządzenia potrzebują internetu. |

Osadzony odtwarzacz może pokazywać tytuł i okładkę. Przy zgadywaniu nagrań przydaje się Spotify Connect lub drugi ekran ustawiony poza wzrokiem graczy. Głośnik Bluetooth dla odtwarzania lokalnego wybierasz w ustawieniach systemu.

Po skanie możesz zatrzymać lub wznowić utwór, przełączyć źródło dostępne na karcie i wybrać **Skanuj kolejną kartę**. Powrót do aparatu zatrzymuje lokalny odtwarzacz. Internet i dostępność nagrania w danym regionie są wymagane niezależnie od zapisania aplikacji jako PWA.

## Spotify: co jest potrzebne?

W Hiciarzu Spotify pełni trzy osobne role:

- **Odsłuch w osadzonym odtwarzaczu** działa bez konfiguracji Client ID w Hiciarzu. Dostępność całego nagrania i automatycznego startu zależy od Spotify, konta i przeglądarki.
- **Spotify Connect** wymaga logowania, konta Premium oraz urządzenia dostępnego do sterowania. Otwórz **Dźwięk → Spotify Connect**, połącz konto i wybierz urządzenie. [Wymagania Spotify Player API](https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback).
- **Import playlisty** wczytuje metadane utworów do talii. Otwórz **Talie → Utwory → Import i pomoc AI → Ze Spotify**. Obecna integracja odczytuje playlisty, których jesteś właścicielem lub współtwórcą; zapisanie cudzej publicznej playlisty w Bibliotece nie daje takiego dostępu. [Zasady dostępu do playlist](https://developer.spotify.com/documentation/web-api/reference/get-playlists-items).

Do Connect i importu wybierasz **Domyślne połączenie**, jeśli Twoje konto ma dostęp, albo **Własne połączenie**. Przed logowaniem przez domyślne połączenie Hiciarz informuje, że konto może wymagać dodania przez opiekuna integracji. Przycisk **Zmień połączenie** prowadzi do konfiguracji własnego Client ID z instrukcją.

Ustawienia pokazują rodzaj połączenia, bez wyświetlania zapisanego identyfikatora. Znajdziesz je w **Ustawienia → Ustawienia Spotify** (na telefonie: **Więcej → Ustawienia**). Po wybraniu **Zmień połączenie → Własne połączenie** pole **Nowy Client ID** jest puste. Własny identyfikator przygotujesz w [Spotify Developer Dashboard](https://developer.spotify.com/dashboard); nie wymaga to forka Hiciarza. Na każdym urządzeniu konfigurujesz połączenie i logujesz się osobno.

**Samo logowanie nie gwarantuje dostępu do API.** W trybie deweloperskim właściciel integracji musi mieć Premium, a użytkownik musi być dopisany w **User Management**; nowe integracje mają limit pięciu użytkowników. Własny Client ID nadal podlega tym zasadom. [Aktualne tryby dostępu Spotify](https://developer.spotify.com/documentation/web-api/concepts/quota-modes).

Dokładne kroki, poprawny Redirect URI, ustawienia forka oraz pomoc przy błędach **403**, **429** i niewidocznym urządzeniu znajdziesz w **[przewodniku Spotify](docs/spotify.md)**. Client ID jest publiczny; Hiciarz używa logowania PKCE i nie potrzebuje Client Secret.

## Talie, wygląd i warianty gry

- **Klasyczna oś czasu:** zgaduj rok nagrania i układaj muzyczną chronologię.
- **Zgadnij film / Zgadnij grę:** wybierz wariant przez **W co gramy? → Inne warianty** i uzupełnij tytuł produkcji jako odpowiedź. Import Spotify dostarcza metadane nagrania; odpowiedź wpisujesz samodzielnie. Jest drukowana na stronie odpowiedzi karty i nie trafia do QR.
- **Muzyczne Bingo:** otwórz **Bingo**, wybierz poziom i użyj **Losuj kategorię**. Zestawy **Na dobry początek** i **Dla znawców** zawierają po pięć kategorii pytań. Każde losowanie jest niezależne. Odpowiedzi sprawdzacie na kartach, punkty zaznaczacie na papierze; pełny rząd, kolumna lub przekątna daje Bingo. Ikona drukarki otwiera **Plansze do druku** — różne plansze 5 × 5, po dwie na A4.
- **Wygląd kart:** dziewięć motywów, własne rewersy z obsługą przeciągania plików, presety i oszczędny wydruk **Laser — lekki kolor**. Podgląd karty odzwierciedla układ PDF. Karty z własnym motywem zachowują go przy zmianie motywu talii; ujednolica je przycisk **Zastosuj motyw talii do wszystkich kart**. Skórka strony jest wybierana osobno w ustawieniach; nie zmienia motywu zapisanej talii.

[Otwórz generator plansz Bingo — podstawowy PL](https://artifexet.github.io/Hiciarz/?view=bingo&sheet=print&level=beginner&lang=pl) · [Zaawansowany PL](https://artifexet.github.io/Hiciarz/?view=bingo&sheet=print&level=expert&lang=pl) · [Beginner EN](https://artifexet.github.io/Hiciarz/?view=bingo&sheet=print&level=beginner&lang=en). Linki z aplikacji Android otwierają ten sam generator. Parametry `level=beginner|expert` i `lang=pl|en` wybierają poziom oraz język, a w oknie można ustawić liczbę plansz i pobrać PDF.

**Wybierz gotową talię** udostępnia przykłady bez logowania:

| Przykład                          | Zawartość                                |
| --------------------------------- | ---------------------------------------- |
| Świąteczne hity                   | 151 piosenek z motywem Rybki świąteczne. |
| Zgadnij grę — oryginalne nagrania | 294 karty z 93 gier.                     |
| Zgadnij grę — symfonicznie        | 34 orkiestrowe aranżacje z 34 gier.      |

Przykład można otworzyć jako nową talię lub dopisać do obecnej. To edytowalna kopia zapisanych danych, która nie aktualizuje się automatycznie. Lata z wydań Spotify mogą oznaczać składanki lub reedycje — sprawdź je przed drukiem. [Pliki i źródła przykładów](examples/playlists/README.md).

Import JSON/CSV lub Spotify pyta o dopisanie na końcu albo zastąpienie listy. Dopisywanie zachowuje poprawki i pomija duplikaty rozpoznane po źródle nagrania. JSON i CSV obsługują `gameMode` (`music`, `movie`, `game`) oraz `answer` wymagane dla filmu i gry. [Format plików i prompt dla AI](docs/playlist-guide.md).

## Telefon, PWA i zapis danych

Na telefonie dolny pasek zawiera **Skaner**, **Bingo**, **Talie**, **Dźwięk** i **Więcej**. Na komputerze widoki są w bocznym pasku. Logo wraca do startu, a **Wstecz** zamyka okno lub wraca do poprzedniego widoku. **Dźwięk** jest dostępny także podczas Bingo.

Skaner i Bingo wypełniają ekran telefonu, z głównymi przyciskami nad dolnym menu. Miejsce odtwarzania zmienisz też w górnym pasku skanera. Pomoc i druk w Bingo otwierają dolne panele; powrót ze skanera zachowuje wylosowaną kategorię. W układzie poziomym plansza lub aparat są obok kontrolek. Do startu wrócisz przez **Więcej → Start**.

W **Ustawieniach** zmienisz skórkę strony i język (**polski / angielski**), połączysz Spotify, sprawdzisz aktualizacje i zainstalujesz Hiciarza. Na iOS aplikacja pokazuje instrukcję dodania do ekranu początkowego przez menu udostępniania. Zmiana języka obejmuje interfejs oraz napisy na PDF; dane wpisane do talii pozostają bez zmian. [Słowniki JSON](docs/configuration.md#tłumaczenia-json).

Talie i grafiki są zapisywane **na tym urządzeniu**. W **Talie → Opcje talii** przełączysz projekty, utworzysz nowy, wczytasz plik lub pobierzesz pełną kopię JSON przez **Zapisz do pliku**. Listę utworów wyeksportujesz również jako CSV. Zapis do pliku pozwala przenieść projekt i chroni przed utratą danych po wyczyszczeniu przeglądarki.

Po zapisaniu zasobów PWA można bez sieci edytować talie i przygotowywać PDF. Muzyka, Spotify i parowanie wymagają internetu. Aparat na telefonie wymaga bezpiecznego kontekstu — korzystaj z publikacji HTTPS. [Dane lokalne i PWA](docs/configuration.md#dane-lokalne-i-pwa).

## Uruchomienie i rozwój

Wymagane: **Node.js 22+** i **pnpm 11**.

```sh
# Z głównego katalogu repozytorium:
pnpm install
pnpm dev
```

Otwórz adres wypisany przez Vite z końcówką `/Hiciarz/`, zwykle `http://127.0.0.1:5173/Hiciarz/`.

```sh
pnpm test
pnpm build
pnpm preview
```

Spotify można skonfigurować bezpośrednio w interfejsie. Jeśli chcesz dołączyć domyślny Client ID do lokalnego buildu, skopiuj [.env.example](.env.example) do `.env.local` i ustaw `VITE_SPOTIFY_CLIENT_ID`. Do lokalnego logowania zarejestruj dokładny adres z `127.0.0.1`; Spotify nie akceptuje `localhost` jako Redirect URI. [Wymagania adresu powrotu](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri).

GitHub Actions uruchamia testy i budowanie. Workflow **Publish website** publikuje GitHub Pages automatycznie po zmianach web na `main`; można go też uruchomić ręcznie. Zmiany wyłącznie w aplikacji Android nie wdrażają strony. Wszystkie dotychczasowe funkcje web i PWA pozostają dostępne. Fork używa nazwy swojego repozytorium jako ścieżki bazowej. Domyślny Client ID można podać jako zmienną repozytorium `SPOTIFY_CLIENT_ID` lub istniejący sekret Actions o tej nazwie; jest publiczny w gotowym frontendzie. **Client Secret nie jest używany i nie powinien trafiać do kodu ani zmiennych `VITE_*`.** [Pełna konfiguracja publikacji](docs/configuration.md).

### Przełącznik przewodnika dla własnej publikacji

Zmienna repozytorium Actions **`SPOTIFY_ONBOARDING`** (`Settings → Secrets and variables → Actions → Variables`) steruje automatycznym przewodnikiem:

| Wartość       | Zachowanie                                                                 |
| ------------- | -------------------------------------------------------------------------- |
| `true`        | Pokaż przewodnik przed pierwszym logowaniem dla wybranego Client ID.       |
| `false`       | Przejdź do logowania; zmiana połączenia i instrukcja pozostają dostępne.   |
| Brak zmiennej | Przewodnik włączony dla ArtifexEt/Hiciarz, domyślnie wyłączony dla forków. |

Po zmianie uruchom workflow publikacji. Gdy nie ma Client ID, aplikacja zawsze proponuje konfigurację. Informacja o ograniczeniach domyślnego połączenia pojawia się przed logowaniem niezależnie od tego przełącznika. Lokalny odpowiednik to `VITE_SPOTIFY_ONBOARDING=true` lub `false`.

## Dokumentacja

| Dokument                                              | Zawartość                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| [Spotify](docs/spotify.md)                            | Zmiana połączenia, Client ID, logowanie, Connect, import i pomoc przy błędach. |
| [Konfiguracja techniczna](docs/configuration.md)      | Publikacja, zmienne Actions, parowanie, PWA, tłumaczenia i zasoby.             |
| [Przygotowanie listy utworów](docs/playlist-guide.md) | JSON/CSV i przygotowanie playlisty z pomocą AI.                                |
| [Gotowy prompt](docs/playlist-prompt.txt)             | Instrukcja do skopiowania do wybranego AI.                                     |
| [Przykładowe playlisty](examples/playlists/README.md) | Gotowe pliki, źródła nagrań i dodawanie kolejnych zestawów.                    |

Linki do dokumentacji znajdziesz też w aplikacji: **Jak grać** (na telefonie **Więcej → Jak grać**). Przewodnik Spotify jest dostępny bezpośrednio w **Ustawieniach Spotify**.

[Zgłoś usterkę](https://github.com/ArtifexEt/Hiciarz/issues/new) lub przejrzyj pomysły w [Issues](https://github.com/ArtifexEt/Hiciarz/issues). Jeśli Hiciarz uprzyjemnił Wam wieczór, możesz [postawić autorowi kawę](https://buymeacoffee.com/szymonrybka).
