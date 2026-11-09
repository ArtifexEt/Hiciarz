# Przykładowe playlisty

Gotowe, publiczne projekty Hiciarza w formacie JSON. W aplikacji otwórz **Kreator → Przykładowe playlisty** i wybierz utworzenie nowej talii albo dopisanie piosenek do obecnej. Wczytanie przykładu nie wymaga logowania ani pobierania listy przez API Spotify. Odtwarzanie muzyki nadal wymaga dostępu do wybranego serwisu.

| Plik                                       | Zawartość                                            | Źródło                                                                                                                    |
| ------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [christmas-hits.json](christmas-hits.json) | Świąteczne hity, 151 utworów, motyw Rybki świąteczne | [Best Christmas Songs 2026](https://open.spotify.com/playlist/7wfTeAa7cxhA3qNE05XPKk), autor: Best Christmas Playlists 🎄 |

Lista świąteczna zachowuje kolejność wszystkich 151 pozycji odczytanych 9 listopada 2026 z publicznej strony Spotify. Tytuły, wykonawcy i identyfikatory wskazują konkretne nagrania. Lata pobrano z publicznych metadanych wydań tych nagrań: mogą dotyczyć składanki lub reedycji, dlatego każdy utwór ma `review: true`. Przed drukiem sprawdź rok, którego chcesz używać w grze. Przykład nie zawiera plików audio, okładek ani danych logowania i nie aktualizuje się automatycznie.

## Dodawanie kolejnych przykładów

1. Zapisz pełny projekt w aplikacji i umieść jego plik `.json` w tym folderze.
2. Dodaj pole `example` według wzoru z `christmas-hits.json`: unikalne `id`, `description`, `sourceUrl`, `sourceName`, `sourceOwner`, `snapshotDate` (`YYYY-MM-DD`) i `yearNote`.
3. Zachowaj poprawne źródła, lata i unikalne identyfikatory kart. Nie umieszczaj w przykładach prywatnych playlist ani tokenów.
4. Uruchom `pnpm test` i `pnpm build`. Pliki JSON z tego folderu są automatycznie dołączane do wyboru przykładów podczas budowania strony.

Plik można również pobrać z repozytorium i otworzyć zwykłym przyciskiem **Wczytaj**. Każde wczytanie przykładu z galerii tworzy osobną, edytowalną kopię; zmiany użytkownika nie modyfikują pliku w repozytorium.
