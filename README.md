# Hiciarz

Hiciarz łączy drukowane karty muzyczne z aplikacją do grania. W tym repozytorium są dwa niezależnie budowane projekty:

| Projekt | Przeznaczenie |
| --- | --- |
| [`android-app/`](android-app/README.md) | Natywna aplikacja Android: skanowanie, talie, Bingo i sterowanie aplikacją Spotify przez App Remote. |
| [`web/`](web/) | Dotychczasowa aplikacja internetowa: tworzenie i import talii, podgląd kart oraz druk PDF. |

**[Pobierz testowy APK z GitHub Releases](https://github.com/ArtifexEt/Hiciarz/releases)** · **[Dokumentacja strony](web/README.md)** · **[Format talii JSON/CSV](web/docs/playlist-guide.md)** · **[Zgłoś usterkę](https://github.com/ArtifexEt/Hiciarz/issues/new/choose)**

Publiczna strona pod adresem [artifexet.github.io/Hiciarz](https://artifexet.github.io/Hiciarz/) zachowuje wszystkie dotychczasowe funkcje i PWA. Zmiany web trafiające na `main` publikują się automatycznie. Zmiany dotyczące wyłącznie Androida i wydania APK nie uruchamiają publikacji strony.

## Android — wydanie testowe

Aplikacja jest napisana w Kotlinie i Jetpack Compose. Muzykę odtwarza zainstalowana aplikacja Spotify; Hiciarz wysyła do niej polecenia App Remote. Nie potrzebuje Client Secret.

Wymagania:

- Android 8.0 lub nowszy.
- Oficjalna aplikacja Spotify, zalogowana na konto Premium do odtwarzania konkretnych nagrań.
- Internet do połączenia Spotify i odtwarzania muzyki.
- Zgoda na aparat do skanowania QR; talie można też wybierać w aplikacji.

### Instalacja

1. Otwórz [Releases](https://github.com/ArtifexEt/Hiciarz/releases) i wybierz najnowsze wydanie oznaczone **Pre-release**.
2. Pobierz `hiciarz-android-…-test.apk` i otwórz plik na telefonie.
3. Uruchom Hiciarza, połącz Spotify i zaakceptuj jego ekran zgody.

APK z Releases jest podpisane **prywatnym kluczem do wydań testowych**, przechowywanym wyłącznie w GitHub Secrets. Klucza ani jego haseł nie ma w repozytorium lub artefaktach. Kolejne wydania z tym samym podpisem można instalować jako aktualizacje. Zmiana podpisu wymaga ponownej instalacji; zachowaj pliki importowanych talii, aby móc je ponownie wczytać.

Plik `.sha256` w wydaniu pozwala sprawdzić integralność APK. Publiczny odcisk podpisu znajduje się w dołączonym `SIGNING-CERTIFICATE.txt`, a numery wersji i commit w `BUILD-INFO.txt`. [Dokumentacja Androida](android-app/README.md) opisuje konfigurację i weryfikację wydania.

Dotychczasowe próby App Remote potwierdziły odtwarzanie i pauzę na testowanych kontach poza bieżącą listą użytkowników integracji. Nie jest to jeszcze potwierdzenie publicznego onboardingu konta, którego nigdy nie dodawano do tej listy.

### Konfiguracja Spotify dla własnego buildu

GitHub Actions przekazuje domyślny Client ID przez zmienną repozytorium `SPOTIFY_CLIENT_ID`. Jest to publiczny identyfikator aplikacji, dołączany do APK. Workflow obsługuje również istniejący sekret Actions o tej samej nazwie. **Nie ustawiaj Client Secret.**

W Spotify Developer Dashboard konfiguracja aplikacji Android musi odpowiadać faktycznemu pakietowi i podpisowi:

- Pakiet: `pl.artifex.hiciarz`.
- SHA-1: odcisk użytego klucza, dostępny w `SIGNING-CERTIFICATE.txt` danego wydania lub przez `./gradlew signingReport`.
- Redirect URI: `hiciarz://spotify-callback`.

Zmiana klucza podpisującego wymaga dopisania jego właściwego odcisku w konfiguracji Spotify. Konfiguracja przeglądarkowego OAuth jest opisana osobno w [dokumentacji web](web/docs/spotify.md).

### Lokalny build Androida

Wymagane: JDK 17 i Android SDK z platformą `android-37.0` oraz Build Tools `37.0.0`. Gradle Wrapper jest dołączony do projektu.

```sh
cd android-app
./gradlew :app:testDebugUnitTest :app:lintRelease :app:assembleRelease
```

Wynik: `android-app/app/build/outputs/apk/release/app-release.apk`.

Bez własnej konfiguracji podpisu lokalny build używa zwykłego klucza debug Androida. Oficjalne wydania testowe z GitHub korzystają z prywatnego podpisu skonfigurowanego w Secrets; [dokumentacja Androida](android-app/README.md#podpis-i-wersja) opisuje wymagane zmienne. Lokalny identyfikator Spotify można przekazać przez zmienną środowiskową `SPOTIFY_CLIENT_ID`. Wersję buildu można ustawić przez `-PversionName=0.1.0-alpha.1 -PversionCode=100001`.

## Web — uruchomienie lokalne

Kod strony, dokumentacja dotychczasowych funkcji i przykładowe talie są w [`web/`](web/). Wymagane Node.js 22+ i pnpm 11.

Z głównego katalogu repozytorium:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
```

Skrypty delegują do `web/`; wynik budowania trafia do `web/dist/`. Można też uruchamiać je bezpośrednio przez `pnpm --dir web …`.

Przeniesienie do osobnego folderu nie usuwa jeszcze dotychczasowych funkcji PWA ani ekranów gry. Przebudowa strony na sam kreator pozostaje kolejnym etapem, po testach aplikacji Android.

## GitHub Actions i wydania

### Kontrola kodu

Workflow **Check web and Android** uruchamia:

- testy i produkcyjny build web;
- testy jednostkowe Androida, lint i build APK;
- zapis APK oraz raportów jako artefaktów workflow.

### Publikacja APK

Wypchnięcie tagu `android-v<wersja>` uruchamia **Publish Android test release**:

```sh
git tag android-v0.1.0-alpha.1
git push origin android-v0.1.0-alpha.1
```

Workflow można też uruchomić ręcznie z zakładki Actions, podając nową wersję i opcjonalny `version_code`. Wydanie otrzymuje status **Pre-release** oraz APK, sumę SHA-256, informację o podpisie i metadane buildu. Wersja jest sprawdzana z manifestu gotowego APK. Istniejące opublikowane wersje nie są nadpisywane — poprawka wymaga nowej wersji.

### Publikacja strony

Workflow **Publish website** buduje `web/` i wdraża go do GitHub Pages po zmianach na `main` w `web/`, głównych plikach konfiguracji pnpm/package lub samym workflow publikacji. Nadal można go uruchomić ręcznie przez **Actions → Publish website → Run workflow**, np. po zmianie zmiennych repozytorium. Sam commit w `android-app/` nie wdraża strony. PWA pozostaje dostępne obok aplikacji Android.

## Dane i zgłoszenia

Talie JSON są wspólnym formatem między kreatorem web a aplikacją Android. Przykłady znajdują się w [`web/examples/playlists/`](web/examples/playlists/). Tokenów Spotify i Client Secret nie należy umieszczać w eksportach, zgłoszeniach ani repozytorium.

Usterkę zgłosisz przez [nowe GitHub Issue](https://github.com/ArtifexEt/Hiciarz/issues/new/choose). Przy problemie z APK podaj wersję aplikacji, model telefonu, wersję Androida oraz kroki prowadzące do błędu.
