# Przygotowanie listy utworów

[← README](../README.md) · [Spotify](spotify.md) · [Konfiguracja techniczna](configuration.md)

Hiciarz wczytuje listy JSON i CSV oraz pełne projekty talii. Możesz przygotować plik samodzielnie albo skopiować [polski prompt](playlist-prompt.txt) lub [angielski prompt](playlist-prompt.en.txt) do wybranego asystenta. W aplikacji otwórz **Talie → Utwory → Import i pomoc AI → Poproś AI o pomoc w przygotowaniu playlisty**. Kopiowana instrukcja odpowiada językowi aplikacji; wklejasz ją do swojego narzędzia AI, a wynik wczytujesz do Hiciarza.

1. Ustal temat, liczbę utworów i źródła odtwarzania.
2. Sprawdź, czy linki prowadzą do właściwych nagrań, a daty dotyczą ich pierwszego wydania.
3. Zapisz wynik w pliku UTF-8 z rozszerzeniem `.json` lub `.csv`.
4. W **Talie → Utwory → Import i pomoc AI** przeciągnij plik do pola **Z pliku** albo kliknij **Wybierz plik**. Przy imporcie listy wybierz dopisanie na końcu lub zastąpienie utworów. Pełny projekt można otworzyć jako nową talię, zachowując obecną.
5. Przejrzyj utwory i popraw dane przed wydrukowaniem kart.

Minimalny format JSON (link wstaw po sprawdzeniu rzeczywistego utworu):

```json
[
  {
    "title": "Tytuł nagrania",
    "artist": "Wykonawca",
    "year": 1984,
    "sources": {
      "spotify": "TUTAJ_WSTAW_SPRAWDZONY_LINK_DO_UTWORU"
    }
  }
]
```

Powyższy przykład pokazuje strukturę i wymaga zastąpienia tekstu w `sources.spotify`. Można użyć `sources.youtube` zamiast Spotify lub podać oba źródła. Źródło przyjmuje identyfikator utworu lub link HTTPS odpowiedniego serwisu. `title`, `artist`, `year` i przynajmniej jedno źródło są wymagane. Rok musi być liczbą całkowitą od 1000 do 2100; dla muzycznych kart wpisz rok pierwszego wydania nagrania, zamiast daty późniejszej składanki.

Opcjonalne `theme` może mieć wartość: `classic`, `minimal`, `vinyl`, `mixtape`, `memphis`, `disco`, `christmas`, `winter` lub `fish`. Dla zagadek filmowych dodaj `gameMode: "movie"`, a dla gier `gameMode: "game"` oraz pole `answer` z nazwą produkcji. Domyślny tryb to `music`. Odpowiedź jest zapisywana w projekcie i na kartach odpowiedzi, ale nie w QR.

CSV używa nagłówka `id,title,artist,year,gameMode,answer,theme,spotify,youtube`; pola `id`, `gameMode`, `answer` (w trybie muzycznym) i `theme` są opcjonalne. Wartości zawierające przecinki lub nowe linie wymagają cudzysłowów. Szablony JSON i CSV pobierzesz z **Jak grać**. Zapisanie samej listy utworów nie zastępuje kopii projektu.

Pełny projekt z motywem, ustawieniami wydruku i własnym tłem zapiszesz przez **Talie → Opcje talii → Zapisz do pliku**. Limit talii wynosi 2000 utworów. Przy dopisywaniu aplikacja pomija duplikaty według źródeł Spotify lub YouTube; zachowuje istniejące rekordy i Twoje poprawki.

Jeśli chcesz pobrać listę bezpośrednio ze Spotify, zobacz [instrukcję importu i wymagania dostępu](spotify.md#import-playlisty-do-talii). Import pliku JSON lub CSV nie wymaga logowania do Spotify.
