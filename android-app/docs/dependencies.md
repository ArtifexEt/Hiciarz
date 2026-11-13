# Biblioteki Androida

Gradle pobiera standardowe zależności z Google Maven i Maven Central.

## Poprawka bezpieczeństwa Guava

Constraint `implementation` wymaga co najmniej `com.google.guava:guava:33.7.2-android`
w zależnościach aplikacji. Usuwa znaną podatność CVE-2026-102554 na wyczerpanie
pamięci podczas deserializacji obiektów Java. Dotychczasowy kod aplikacji nie
przyjmował takich obiektów, a R8 usuwał wskazane klasy; aktualizacja zabezpiecza
także przyszłe użycia biblioteki. Narzędzia JVM mają osobny constraint wersji
`33.7.2-jre`; konfiguracje Androida zachowują wariant `-android`.

Źródło: [advisory opiekunów Guava](https://github.com/google/guava/security/advisories/GHSA-xxph-c9ww-hj94).

## Bouncy Castle w narzędziach budowania

Classpath pluginów i wydzielone konfiguracje narzędzi AGP wymagają co najmniej `1.85` dla `bcprov-jdk18on`,
`bcpkix-jdk18on` i `bcutil-jdk18on`. Wspólna wersja usuwa błędy walidacji
Name Constraints i zagnieżdżonych struktur ASN.1 (CVE-2026-8763,
CVE-2026-13506), zachowując zgodność modułów kryptograficznych. To biblioteki
narzędzi budowania, a nie zależności aplikacji. Constrainty nie zmieniają
oddzielnego narzędzia `apksigner` z Android SDK używanego przez publikator.
Przy aktualizacji AGP sprawdź ponownie wersje i usuń zbędne constrainty,
gdy plugin sam dostarcza poprawione zależności.

Źródła: [CVE-2026-8763](https://github.com/bcgit/bc-java/wiki/CVE%E2%80%902026%E2%80%908763),
[CVE-2026-13506](https://github.com/bcgit/bc-java/wiki/CVE%E2%80%902026%E2%80%9013506).

## Pozostałe poprawki narzędzi

Minimalne wersje `org.jdom:jdom2:2.0.6.1` i `org.bitbucket.b_c:jose4j:0.9.6`
usuwają odpowiednio CVE-2021-33813 i CVE-2024-29371. Jetifier jest obecnie
wyłączony, a bundletool używa JWS zamiast podatnej obsługi skompresowanych JWE;
poprawki obejmują również przyszłe użycia tych narzędzi. Publiczne i chronione
API obu aktualizacji sprawdzono pod kątem zachowania zgodności binarnej.

Wspólny scope constraintów obejmuje także osobne classpathy lint i workerów
AGP. Nie dodaje zależności: biblioteki otrzymują poprawione wersje tylko tam,
gdzie były już wymagane. Nie oznacza to dodania Bouncy Castle, JDOM ani jose4j
do APK. Warianty Guava wybierane są zgodnie ze środowiskiem Android/JVM.

Źródła: [wydanie JDOM](https://github.com/hunterhacker/jdom/releases/tag/JDOM-2.0.6.1),
[poprawka jose4j](https://bitbucket.org/b_c/jose4j/commits/19a90a64c47bb07c4aa5462f1316d5c293d81fcf).

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
./gradlew --write-verification-metadata sha256 testDebugUnitTest lintRelease assembleRelease assembleDebug assembleDebugAndroidTest
```

Po przeglądzie uruchom te same zadania bez `--write-verification-metadata`,
z `--dependency-verification strict`; po pobraniu zależności sprawdź również
wariant `--offline`. Zmiany zależne od systemu operacyjnego trzeba sprawdzić
na systemach używanych w CI. Nowy zestaw zadań lub konfiguracji może wymagać
uzupełnienia bazy. Regenerowanie pliku nie może być sposobem na pominięcie
nieoczekiwanego błędu integralności.

Sprawdź również świeży cache metadanych Gradle: istniejący cache deskryptorów
może ukryć pobieranie nadrzędnych POM-ów i BOM-ów. W CI obowiązuje także
`:app:lintRelease`, a test kamery buduje APK testów z parametrem
`-PhiciarzTestRunner=pl.artifex.hiciarz.ScannerReleaseSmokeInstrumentation`.

Szczegóły i ograniczenia: [dokumentacja Gradle](https://docs.gradle.org/current/userguide/securing_dependencies.html).
