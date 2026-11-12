# Spotify i dane nagrań w Hiciarzu

[← README](../README.md) · [Format plików playlist](playlist-guide.md) · [Konfiguracja techniczna](configuration.md)

Hiciarz korzysta z linków do utworów i oficjalnego odtwarzacza Spotify. Tworzenie kart nie wymaga łączenia konta, Client ID ani aplikacji w Spotify Developer Dashboard.

## Dodawanie utworu

1. W Spotify wybierz konkretne nagranie i skopiuj jego link przez **Udostępnij → Kopiuj link do utworu**.
2. W Hiciarzu otwórz **Talie → Utwory → Dodaj utwór**. W pierwszym kroku **Utwór** wklej link i sprawdź odsłuch, jeśli jest dostępny.
3. Wybierz **Dalej: dane utworu**. W drugim kroku uzupełnij wykonawcę i sprawdź pobrany tytuł. Publiczny podgląd Spotify nie zwraca nazwy wykonawcy. **Wstecz** pozwala zmienić link bez utraty ręcznych poprawek.
4. Wybierz **Znajdź rok w MusicBrainz**, wskaż właściwą wersję i sprawdź datę. Wersja koncertowa lub remix może mieć inny rok niż pierwotne nagranie studyjne.
5. Zatwierdź dane i dodaj kartę. Dla filmu lub gry uzupełnij także tytuł produkcji.

MusicBrainz jest katalogiem metadanych; nie dostarcza plików audio. Brak wyniku lub dostępu do sieci pozwala nadal wpisać dane samodzielnie. [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API).

## Odsłuch i rozgrywka

W **Dźwięk** wybierz **Na tym urządzeniu** albo **Drugi ekran**. Przy drugim ekranie otwórz Hiciarza na urządzeniu odtwarzającym, wybierz **Połącz skaner** i zeskanuj QR parowania telefonem.

Spotify decyduje o dostępności nagrania w ramce. Może udostępnić tylko podgląd, wymagać ręcznego uruchomienia lub logowania we własnym odtwarzaczu. Nie gwarantujemy fragmentu dla każdego utworu. Hiciarz nie prowadzi logowania do konta Spotify i nie steruje urządzeniami Spotify Connect. [Spotify Embed](https://developer.spotify.com/documentation/embeds) · [Ograniczenia odtwarzacza](https://developer.spotify.com/documentation/embeds/tutorials/troubleshooting).

Ramka Spotify pokazuje tytuł i okładkę. Przy zgadywaniu ustaw drugi ekran poza wzrokiem graczy.

## Całe playlisty

Wczytaj plik JSON/CSV zgodny z [formatem Hiciarza](playlist-guide.md) albo wybierz gotową talię. W imporcie pliku działa wybór oraz przeciąganie i upuszczanie. Możesz dopisać utwory lub zastąpić listę; pełny projekt można otworzyć jako nową talię.

Sam link do playlisty Spotify lub Apple Music nie zawiera danych potrzebnych do przygotowania wszystkich kart. Hiciarz nie pobiera tych playlist przez API. Jeśli przygotowujesz plik w innym narzędziu, sprawdź obecność tytułu, wykonawcy, roku oraz linku Spotify lub YouTube. Eksport Apple Music nie zapewnia automatycznie źródła odtwarzania obsługiwanego przez karty.

## Rozwiązywanie problemów

| Problem | Co zrobić |
| --- | --- |
| Nie można odczytać podglądu | Sprawdź link do konkretnego utworu, połączenie i dostępność Spotify. Wpisz dane ręcznie, jeśli serwis nie odpowiada. |
| Brak odsłuchu lub tylko fragment | Uruchom odtwarzanie w ramce. Dostępność zależy od Spotify, regionu i przeglądarki. |
| Niewłaściwy rok w wynikach MusicBrainz | Wybierz właściwą wersję nagrania i popraw rok przed drukiem. |
| Zapisany wcześniej Spotify Connect | Aplikacja wybierze odtwarzanie na tym urządzeniu. W razie potrzeby przełącz na drugi ekran. |

Starsze wydrukowane karty z identyfikatorami Spotify i zapisane talie zachowują działanie. Dawne linki konfiguracji Spotify nie konfigurują już konta.
