# Przygotowanie listy utworów

[← README](../README.md) · [Spotify](spotify.md) · [Konfiguracja techniczna](configuration.md)

Hiciarz wczytuje listy JSON i CSV oraz pełne projekty talii. Możesz przygotować plik samodzielnie albo skopiować [polski prompt](playlist-prompt.txt) lub [angielski prompt](playlist-prompt.en.txt) do wybranego asystenta. Instrukcja dla AI prowadzi przez wybór tematu, liczby kart i wariantu gry, a następnie przygotowanie listy nagrań ze Spotify.

1. W **Talie → Utwory** wybierz **Przygotuj talię z AI** i wklej skopiowaną instrukcję do swojego asystenta. Odpowiedz na pytania o talię; w razie potrzeby podaj własne linki do nagrań.
2. Poproś o weryfikację linków, wersji nagrań i lat na podstawie wyszukiwania lub przekazanych źródeł. Jeśli AI nie ma potrzebnych danych, uzupełnij je zamiast przyjmować zgadywane wartości.
3. Pobierz przygotowany plik JSON. Jeśli AI zwróci sam tekst tablicy JSON, zapisz go jako plik UTF-8 z rozszerzeniem `.json`, bez dodatkowego opisu i znaczników bloku kodu.
4. W Hiciarzu otwórz **Wczytaj playlistę z pliku** i przeciągnij plik do pola **Z pliku** albo kliknij **Wybierz plik**. Możesz też użyć **Wczytaj z pliku** na pasku talii. Przy imporcie listy wybierz dopisanie na końcu lub zastąpienie utworów. Pełny projekt można otworzyć jako nową talię, zachowując obecną.
5. Przejrzyj utwory, sprawdź odsłuch i popraw dane przed wydrukowaniem kart. Prompt dodaje `review: true`, aby lata z listy AI były oznaczone do sprawdzenia.

Import sprawdza składnię i wymagane pola, ale nie potwierdza, czy link prowadzi do opisanego nagrania ani czy rok jest poprawny. Jeden niepoprawny rekord zatrzymuje import całej listy; popraw wskazany wiersz i wczytaj plik ponownie. Nawet AI z dostępem do wyszukiwania może pomylić wersje lub daty. Dostępność odsłuchu zależy od Spotify i nie jest gwarantowana dla każdego utworu. [Odsłuch i pomoc Spotify](spotify.md).

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

Pojedyncze nagranie dodasz w **Dodaj utwór**: wklej link Spotify, sprawdź odsłuch i dobierz rok w MusicBrainz. [Instrukcja](spotify.md). Całe playlisty wczytuj jako JSON/CSV zgodny z opisanym formatem; link do playlisty nie jest importowany bezpośrednio. Hiciarz nie wymaga łączenia konta Spotify.
