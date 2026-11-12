# Spotify i dane nagrań w Hiciarzu

[← README](../README.md) · [Format plików playlist](playlist-guide.md) · [Konfiguracja techniczna](configuration.md)

Hiciarz korzysta z linków do utworów i oficjalnego odtwarzacza Spotify. Tworzenie kart nie wymaga łączenia konta, Client ID ani aplikacji w Spotify Developer Dashboard.

## Dodawanie utworu

1. Otwórz **Talie → Utwory → Dodaj utwór**. W kroku **Utwór** wpisz tytuł i opcjonalnie wykonawcę, a następnie wybierz **Szukaj** w stopce. Samo wpisywanie nie uruchamia wyszukiwania.
2. W kroku **Nagranie** zaznacz właściwą wersję i wybierz **Dalej**. Lista zajmuje treść dialogu i przewija się razem z nią. Jeśli nie ma właściwej wersji, wróć do wyszukiwania albo zaznacz **Wpiszę dane ręcznie**. Hiciarz uzupełni dane wybranego nagrania i poszuka linków Spotify.
3. Krok **Spotify** pojawia się, gdy trzeba wybrać źródło lub wkleić link. Jeden link zapisany bezpośrednio przy nagraniu MusicBrainz pozwala pominąć ten krok. Przy kilku linkach lub propozycji ListenBrainz zaznacz źródło, sprawdź jego odsłuch i wybierz **Dalej**. Jeśli linku nie ma, przycisk **Znajdź w Spotify** w stopce otworzy wyszukiwanie. Skopiuj link przez **Udostępnij → Kopiuj link do utworu**, wklej go i przejdź dalej. Wybrane dane MusicBrainz zostaną zachowane. Brak wyników MusicBrainz prowadzi do ręcznego dodania linku i danych.
4. W kroku **Dane karty** sprawdź tytuł, wykonawcę i rok. Koncert lub remix może mieć inny rok niż nagranie studyjne. Pola możesz poprawić ręcznie; zmiana tekstu nie uruchamia kolejnego wyszukiwania. Aby wybrać inne nagranie, wróć do wcześniejszego kroku.
5. Nowa karta dziedziczy rodzaj wybrany w **Ustawieniach talii** przy jej nazwie. Zmienisz go dla tej karty w **Więcej ustawień**. Dla filmu lub gry uzupełnij także tytuł produkcji. Wybór **Motywu karty** pokazuje miniaturki; **Jak cała talia** zachowuje motyw projektu.
6. Zatwierdź dane i dodaj kartę. Nagłówek pokazuje kroki faktycznie odwiedzone w tej ścieżce. Nagłówek i akcje w stopce są stale widoczne; przewija się tylko treść dialogu. **Wstecz** i wcześniejsze kroki zachowują wpisane dane.

Publiczny podgląd Spotify nie gwarantuje wykonawcy ani roku. Rok uzupełniany w formularzu pochodzi z MusicBrainz, które jest katalogiem metadanych, nie źródłem audio. Zgodny tytuł sam w sobie nie potwierdza wersji utworu z linku. Brak dopasowania lub dostępu do sieci pozwala nadal wpisać dane samodzielnie. [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API).

Propozycje linków z [ListenBrainz](https://labs.api.listenbrainz.org/spotify-id-from-mbid) są dopasowaniami katalogowymi do wybranego identyfikatora nagrania. Przed zapisaniem sprawdź odsłuch — inne wydanie, remaster lub nagranie koncertowe może wymagać innego linku. Błąd tych usług nie blokuje ręcznego wpisania danych i linku.

## Odsłuch i skanowanie

W **Dźwięk** wybierz **Na tym urządzeniu** albo **Drugi ekran**. Przy drugim ekranie otwórz Hiciarza na urządzeniu odtwarzającym, wybierz **Połącz skaner** i zeskanuj QR parowania telefonem.

Spotify decyduje o dostępności nagrania w ramce. Może udostępnić tylko podgląd, wymagać ręcznego uruchomienia lub logowania we własnym odtwarzaczu. Nie gwarantujemy fragmentu dla każdego utworu. Hiciarz nie prowadzi logowania do konta Spotify i nie steruje urządzeniami Spotify Connect. [Spotify Embed](https://developer.spotify.com/documentation/embeds) · [Ograniczenia odtwarzacza](https://developer.spotify.com/documentation/embeds/tutorials/troubleshooting).

Ramka Spotify pokazuje tytuł i okładkę. Drugi ekran pozwala oddzielić skanowanie kart od odtwarzania muzyki.

## Całe playlisty

Otwórz **Talie → Utwory → Importuj** i wczytaj plik JSON/CSV zgodny z [formatem Hiciarza](playlist-guide.md) albo wybierz gotową talię. Krok **Wczytaj z pliku** obsługuje wybór oraz przeciąganie i upuszczanie. Możesz dopisać utwory lub zastąpić listę; pełny projekt można otworzyć jako nową talię.

Sam link do playlisty Spotify lub Apple Music nie zawiera danych potrzebnych do przygotowania wszystkich kart. Hiciarz nie pobiera tych playlist przez API. Jeśli przygotowujesz plik w innym narzędziu, sprawdź obecność tytułu, wykonawcy, roku oraz linku Spotify lub YouTube. Eksport Apple Music nie zapewnia automatycznie źródła odtwarzania obsługiwanego przez karty.

## Rozwiązywanie problemów

| Problem                                | Co zrobić                                                                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Nie można odczytać podglądu            | Sprawdź link do konkretnego utworu, połączenie i dostępność Spotify. Wpisz dane ręcznie, jeśli serwis nie odpowiada. |
| Brak linku Spotify w katalogu          | Skorzystaj z wyszukiwania Spotify i wklej link do wybranego nagrania. Dane MusicBrainz zostaną zachowane.            |
| Brak odsłuchu lub tylko fragment       | Uruchom odtwarzanie w ramce. Dostępność zależy od Spotify, regionu i przeglądarki.                                   |
| Niewłaściwy rok w wynikach MusicBrainz | Wybierz właściwą wersję nagrania i popraw rok przed drukiem.                                                         |
| Zapisany wcześniej Spotify Connect     | Aplikacja wybierze odtwarzanie na tym urządzeniu. W razie potrzeby przełącz na drugi ekran.                          |

Starsze wydrukowane karty z identyfikatorami Spotify i zapisane talie zachowują działanie. Dawne linki konfiguracji Spotify nie konfigurują już konta.
