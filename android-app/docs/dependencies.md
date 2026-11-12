# Biblioteki Androida

Gradle pobiera standardowe zależności z Google Maven i Maven Central.

## AndroidSVG 1.4

`com.caverock:androidsvg-aar:1.4` renderuje grafiki SVG rewersów. Zadanie `prepareBundledCardSkins` kopiuje źródła z `web/public/themes/` do APK, razem z bitmapą `fish-santa.webp`. Android i PWA korzystają z tych samych plików, dostępnych także bez sieci. Grafiki są ładowane poza głównym wątkiem i przechowywane w pamięci między zmianami ekranów.

Biblioteka jest dostępna na licencji Apache 2.0. [Dokumentacja i obsługiwane elementy SVG](https://bigbadaboom.github.io/androidsvg/).

## Spotify App Remote SDK 0.8.0

Spotify udostępnia App Remote jako AAR, bez oficjalnego repozytorium Maven. Zadanie `downloadSpotifyAppRemote` pobiera bibliotekę automatycznie z przypiętego commita oficjalnego repozytorium i sprawdza SHA-256 przed użyciem. Konfiguracja znajduje się w [`../gradle/spotify-app-remote.gradle.kts`](../gradle/spotify-app-remote.gradle.kts).

- Źródło: [spotify/android-sdk](https://github.com/spotify/android-sdk).
- Commit: `5aa4d62465f61a0677081ae9a3108177d0365fc3`.
- SHA-256: `b5a6dd880eaf01f63a871cba9ef7af77c341f8a94ffc8fdf2e9021f9a9d4c198`.

Pobrany AAR trafia do `GRADLE_USER_HOME/caches/hiciarz/spotify-app-remote/` (domyślnie w `~/.gradle/`). Polecenie `clean` nie usuwa tej kopii. Pierwszy build wymaga internetu. Kolejne mogą korzystać z `--offline`, jeśli biblioteka i pozostałe zależności są już pobrane. Uszkodzony plik jest odrzucany na podstawie sumy kontrolnej. Pliki AAR nie trafiają do Git.

Korzystanie z biblioteki podlega [Spotify Developer Terms](https://developer.spotify.com/terms). Biblioteka nie zawiera Client Secret ani danych konta.

## Integralność zależności Maven

`gradle/verification-metadata.xml` przypina sumy SHA-256 artefaktów Maven,
pluginów oraz pobranych plików POM i Gradle Module Metadata. Gradle sprawdza je
domyślnie także podczas zwykłego buildu; brak sumy lub jej niezgodność ma
przerwać CI. Nie wyłączaj weryfikacji ani nie generuj nowych sum automatycznie
w workflow publikującym.

Bazę utworzono wrapperem projektu z Google Maven, Maven Central i Gradle
Plugin Portal. Obejmuje testy jednostkowe, lint, APK debug/release i testów
instrumentacyjnych oraz AAPT2 dla Windowsa i Linuxa. Wrapper i SDK Spotify
nadal mają osobne sumy kontrolne. Nie dodano wyjątków wyłączających
weryfikację ani automatycznego zaufania kluczom PGP.

Generowanie sum ufa aktualnie pobranym plikom. Nie dowodzi, że biblioteka nie
zawiera złośliwego kodu lub podatności. Przy aktualizacji zależności porównaj
nowe artefakty z oficjalnym wydawcą, przejrzyj różnice w metadanych i zachowaj
wyłącznie uzasadnione nowe sumy. Używaj wrappera projektu, aby zachować zgodny
format pliku:

```sh
./gradlew --write-verification-metadata sha256 testDebugUnitTest lint assembleRelease assembleDebug assembleDebugAndroidTest
```

Po przeglądzie uruchom te same zadania bez `--write-verification-metadata`,
z `--dependency-verification strict`; po pobraniu zależności sprawdź również
wariant `--offline`. Zmiany zależne od systemu operacyjnego trzeba sprawdzić
na systemach używanych w CI. Nowy zestaw zadań lub konfiguracji może wymagać
uzupełnienia bazy. Regenerowanie pliku nie może być sposobem na pominięcie
nieoczekiwanego błędu integralności.

Szczegóły i ograniczenia: [dokumentacja Gradle](https://docs.gradle.org/current/userguide/securing_dependencies.html).
