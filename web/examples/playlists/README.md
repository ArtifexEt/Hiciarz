# Przykładowe playlisty

Gotowe, publiczne projekty Hiciarza w formacie JSON. W aplikacji otwórz **Kreator → Przykładowe playlisty** i wybierz utworzenie nowej talii albo dopisanie piosenek do obecnej. Wczytanie przykładu nie wymaga logowania ani pobierania listy przez API Spotify. Odtwarzanie muzyki nadal wymaga dostępu do wybranego serwisu.

| Plik                                       | Zawartość                                                      | Źródło                                                                                                                    |
| ------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [christmas-hits.json](christmas-hits.json) | Świąteczne hity, 151 utworów, motyw Rybki świąteczne           | [Best Christmas Songs 2026](https://open.spotify.com/playlist/7wfTeAa7cxhA3qNE05XPKk), autor: Best Christmas Playlists 🎄 |
| [game-originals.json](game-originals.json) | Zgadnij grę: 294 karty z 93 gier z oryginalnych ścieżek dźwiękowych | Wybór utworów z oficjalnych wydań — [źródła](../../docs/game-originals-sources.json)                                      |
| [game-symphonic.json](game-symphonic.json) | Zgadnij grę: 34 orkiestrowe aranżacje, 34 gry                  | London Philharmonic Orchestra, _The Greatest Video Game Music_ 1 i 2 — [źródła](../../docs/game-symphonic-sources.json)   |

## Zgadnij grę

Obie talie mają wariant **Zgadnij grę** ustawiony na poziomie projektu i każdej karty. Odpowiedzi zawierają nazwę gry; skaner pokazuje odpowiednie pytanie, a odpowiedź sprawdza się po odwróceniu wydrukowanej karty. Rok nie jest pytaniem w tym wariancie.

Talia **oryginalnych nagrań** zawiera rozpoznawalne motywy z oryginalnych wydań muzyki gier. Talia **symfoniczna** zawiera osobne, orkiestrowe interpretacje. Jej pierwszy utwór to [Assassin’s Creed — Revelations: Main Theme](https://open.spotify.com/track/2ZyB5UIsdbme30poIHtzog), wskazany jako inspiracja. Udostępniony link prowadzi do jednego nagrania, a nie do playlisty Spotify. Pozostałe utwory dobrano z dwóch albumów London Philharmonic Orchestra, opublikowanych przez X5 Music Group / Warner Classics. Pominięto suity łączące różne gry oraz utwór Battlefield z niejednoznacznym oznaczeniem gry.

Listy gier są autorskimi wyborami, nie kopiami jednej playlisty Spotify. Dołączone pliki źródłowe dokumentują identyfikatory, metadane i przypisanie do gry. Dostępność odtwarzania zależy od kraju, konta i serwisu; projekt nie zawiera plików audio. Dane zweryfikowano 11 listopada 2026.

Galeria pokazuje najpierw przykłady pasujące do wybranego wariantu, nadal udostępniając wszystkie talie. Domyślnie tworzy osobną kopię. Przy dopisywaniu kart z innym pytaniem wyświetla informację o mieszaniu wariantów; każda karta zachowuje swój wariant.

## Migawka świątecznej playlisty

Lista świąteczna zachowuje kolejność wszystkich 151 pozycji odczytanych 9 listopada 2026 z publicznej strony Spotify. Tytuły, wykonawcy i identyfikatory wskazują konkretne nagrania. Lata pobrano z publicznych metadanych wydań tych nagrań: mogą dotyczyć składanki lub reedycji, dlatego każdy utwór ma `review: true`. Przed drukiem sprawdź rok, którego chcesz używać w grze. Przykład nie zawiera plików audio, okładek ani danych logowania i nie aktualizuje się automatycznie.

## Dodawanie kolejnych przykładów

1. Zapisz pełny projekt w aplikacji i umieść jego plik `.json` w tym folderze.
2. Dodaj pole `example` według wzoru z `christmas-hits.json`: unikalne `id`, `description`, `sourceUrl`, `sourceName`, `sourceOwner`, `snapshotDate` (`YYYY-MM-DD`) i `yearNote`. Ustaw `sourceType: "curated"` dla autorskiego wyboru z wielu źródeł albo `"playlist"` dla migawki jednej playlisty; `sourceUrl` musi używać HTTPS. Opcjonalna kategoria to `"music"` lub `"games"`.
3. Zachowaj poprawne źródła, lata i unikalne identyfikatory kart. Nie umieszczaj w przykładach prywatnych playlist ani tokenów.
4. Dla talii gier ustaw `gameMode: "game"` zarówno w projekcie, jak i w każdej karcie, oraz wpisz nazwę gry w `answer`. Dodaj tłumaczenia nazwy, opisu i uwagi o latach do plików `src/locales/examples.pl.json` i `examples.en.json` pod kluczami `examples.<id>.name`, `.description` i `.yearNote`.
5. Uruchom `pnpm test` i `pnpm build`. Pliki JSON z tego folderu są automatycznie dołączane do wyboru przykładów podczas budowania strony.

Plik można również pobrać z repozytorium i otworzyć zwykłym przyciskiem **Wczytaj**. Każde wczytanie przykładu z galerii tworzy osobną, edytowalną kopię; zmiany użytkownika nie modyfikują pliku w repozytorium.
