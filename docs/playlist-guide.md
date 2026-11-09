# Przygotowanie listy utworów

Hiciarz wczytuje listy JSON i CSV. Możesz przygotować plik samodzielnie albo skopiować [gotowy prompt](playlist-prompt.txt) do wybranego asystenta. Ten sam prompt jest dostępny w kreatorze pod przyciskiem **Skopiuj prompt do swojego AI**. Aplikacja kopiuje jedynie tekst do schowka; samodzielnie wybierasz narzędzie i wklejasz go do rozmowy.

1. Ustal temat, liczbę utworów i źródła odtwarzania.
2. Sprawdź, czy linki prowadzą do właściwych nagrań, a daty dotyczą ich pierwszego wydania.
3. Zapisz wynik w pliku UTF-8 z rozszerzeniem `.json` lub `.csv`.
4. W kreatorze kliknij **Wczytaj** albo **Wybierz plik**. Wybierz dopisanie na końcu lub zastąpienie listy.
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

Powyższy przykład pokazuje strukturę i wymaga zastąpienia tekstu w `sources.spotify`. Można użyć `sources.youtube` zamiast Spotify lub podać oba źródła. Motyw `theme` jest opcjonalny: `classic`, `minimal`, `christmas`, `winter`, `fish`.

CSV używa nagłówka `title,artist,year,theme,spotify,youtube`. Wartości zawierające przecinki lub nowe linie wymagają cudzysłowów. Pełny projekt z ustawieniami wydruku i tłem zapiszesz przez **Zapisz projekt** w aplikacji.
