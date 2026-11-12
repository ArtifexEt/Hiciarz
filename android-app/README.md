# Hiciarz na Androida

Plan szybkiej bety i późniejszej premiery: [proces wydania w Google Play](docs/google-play-release.md).

Natywna aplikacja Kotlin / Jetpack Compose do skanowania drukowanych kart QR i uruchamiania przypisanej muzyki. Otwiera się na skanerze, a kompaktowe dolne menu zawiera dwie pozycje z ikonami: **Skaner i Opcje**. Spotify odtwarza muzykę w swojej aplikacji, a Hiciarz steruje nim przez oficjalny App Remote SDK. Biblioteka talii, kreator kart i generator PDF są dostępne w [Hiciarzu na GitHub Pages](https://artifexet.github.io/Hiciarz/). W Opcjach znajduje się instrukcja tworzenia nowych kart i [odnośnik do kreatora](https://artifexet.github.io/Hiciarz/?view=editor). [Bingo i plansze do druku](https://artifexet.github.io/Bingo/) mają osobne [repozytorium](https://github.com/ArtifexEt/Bingo).

Skaner i karta zachowują kwadratowe proporcje również na tablecie. Pauza i wznowienie znajdują się na obrazie karty, a pod nią jest przycisk „Skanuj nową”. Odtwarzanie i skórka wynikają bezpośrednio z QR. Android nie przechowuje ani nie importuje talii, nie wyszukuje danych utworu w bibliotece i nie odkrywa odpowiedzi. Odpowiedź pozostaje na wydrukowanej karcie. Kod odczytuje aparat — nie ma formularza do wklejania kodów ani linków.

Kod QR może automatycznie włączyć jedną z dziewięciu skórek. Palety i grafiki odpowiadają wersji web i uwzględniają tryb ciemny; rybki mają animowane ozdoby i lampki. W Opcjach można wybrać własny wygląd i wyłączyć śledzenie skórki karty. Automatyczna pauza jest domyślnie wyłączona. Na dużym oknie nawigacja przechodzi na bok, a panele uwzględniają zgięcie ekranu. [Podział funkcji PWA i Androida](docs/pwa-parity.md) opisuje pełny zakres.

Po aktualizacji ze starszej wersji aplikacja uruchamia skaner i zachowuje ustawienia wyglądu oraz odtwarzania. Dane dawnych talii i rund nie służą już do działania aplikacji.

Zegar i systemowy pasek statusu są ukryte również w panelach opcji i dialogach. Dolna nawigacja systemowa pozostaje dostępna. Android pozwala rozwinąć powiadomienia gestem od góry i może chwilowo odsłonić pasek podczas animacji wskaźnika aparatu.

## Ekrany aplikacji

Zrzuty pochodzą z aplikacji na emulatorze AOSP bez zainstalowanego Spotify. Układy Folda korzystają z emulowanego okna i pozycji zawiasu przekazywanej przez WindowManager.

<img src="docs/screenshots/phone-scan-pl.png" width="240" alt="Skaner QR z kompaktowym menu Skaner i Opcje" />

| Rybki | Opcje i większy tekst |
| --- | --- |
| <img src="docs/screenshots/phone-scan-fish-pl.png" width="240" alt="Karta z animowaną skórką rybek" /> | <img src="docs/screenshots/phone-settings-large-dark-pl.png" width="240" alt="Opcje w trybie ciemnym z większym tekstem" /> |

| Rozłożony ekran | Poziome zgięcie |
| --- | --- |
| <img src="docs/screenshots/fold-inner-scanner-pl.png" width="440" alt="Skaner na rozłożonym ekranie z pionowym zawiasem" /> | <img src="docs/screenshots/fold-tabletop-scanner-pl.png" width="440" alt="Skaner uwzględniający poziome zgięcie ekranu" /> |

| Tablet i aparat | Tablet i karta |
| --- | --- |
| <img src="docs/screenshots/tablet-scanner-pl.png" width="540" alt="Kwadratowy aparat na tablecie" /> | <img src="docs/screenshots/tablet-card-pl.png" width="540" alt="Karta i sterowanie odtwarzaniem na tablecie" /> |

[Dziewięć skórek aplikacji](docs/screenshots/phone-skins-pl.png).

## Instalacja wydania testowego

1. Przyjmij zaproszenie do Firebase App Distribution na wskazanym koncie Google i pobierz bieżący APK z wiadomości o becie. [GitHub Releases](https://github.com/ArtifexEt/Hiciarz/releases) zawiera wcześniejsze wersje testowe.
2. Otwórz plik na telefonie i zezwól użytej przeglądarce lub menedżerowi plików na instalację tego APK, jeśli Android o to poprosi.
3. W zainstalowanym Spotify zaloguj się na konto Premium. Otwórz Hiciarza, wybierz połączenie ze Spotify i zaakceptuj zgodę.

Wymagany jest Android 8.0 / API 26 lub nowszy. Aparat jest potrzebny do skanowania QR. Przygotowanie i import talii JSON/CSV odbywają się w PWA. Do Androida nie trzeba wgrywać żadnych plików: wystarczy QR z identyfikatorem utworu Spotify.

Bety Firebase są podpisane **prywatnym kluczem do testów**, przechowywanym w chronionym środowisku GitHub Secrets. Klucz i hasła nie trafiają do repozytorium ani do pobieranych artefaktów. Ten sam pakiet i podpis pozwalają instalować kolejne wersje bez usuwania aplikacji. Zmiana podpisu wymaga odinstalowania poprzedniej wersji i usuwa jej ustawienia. Po jednorazowej rotacji klucza przy wdrożeniu tego procesu starsze APK GitHub i pierwsza beta Firebase wymagają reinstalacji.

## Spotify

Projekt używa App Remote, bez pośredniczącego serwera, Client Secret ani wywołań Web API do sterowania odtwarzaniem. Nadal potrzebuje publicznego **Client ID** i poprawnej konfiguracji aplikacji Android w [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). Client ID nie jest hasłem i jest umieszczany w APK.

### Własna konfiguracja po sklonowaniu repozytorium

Repozytorium nie zawiera domyślnego Spotify Client ID ani identyfikatorów projektu lub aplikacji Firebase. Własna kopia używa wyłącznie konfiguracji podanej przez jej właściciela: lokalnych zmiennych środowiskowych lub Variables i Secrets jego repozytorium GitHub. Pliki workflow pozostają w kopii kodu; Variables i Secrets trzeba skonfigurować we własnym repozytorium.

Pusty szablon [`android-app/.env.example`](.env.example) można skopiować do ignorowanego `.env.local` i wczytać do środowiska swojej powłoki. Gradle nie ładuje plików `.env` automatycznie. Spotify przyjmuje `SPOTIFY_CLIENT_ID` lub jawny parametr `-PspotifyClientId`; nie pobiera wartości z internetu ani z konfiguracji autora. Pusty identyfikator umożliwia testy offline bez konta Spotify, lecz odtwarzanie wymaga własnej integracji. Nieprawidłowy identyfikator przerywa konfigurację buildu. `HICIARZ_REQUIRE_SPOTIFY_CONFIG=true` wymusza poprawną konfigurację również dla podpisanego wydania testowego; docelowe podpisanie produkcyjne wymusza ją zawsze.

Firebase App Distribution służy do wysyłania APK testerom i nie wymaga Firebase SDK ani `google-services.json` w tej aplikacji. Własne identyfikatory Firebase podaj w Secrets chronionego środowiska Actions, aby nie pojawiały się również w publicznych logach. Pliki z lokalną konfiguracją Firebase i kontami usługi są ignorowane przez Git. Nie kopiuj ich do źródeł, szablonów ani artefaktów.

Domyślne `pl.artifex.hiciarz` to identyfikator pakietu Androida, a `hiciarz://spotify-callback` to URI powrotu do aplikacji. Nie wskazują konta Spotify ani projektu Firebase. Przy własnej publikacji wybierz własną tożsamość aplikacji i odpowiednio dostosuj konfigurację Gradle, manifest oraz sprawdzanie pakietu w automatach; sama zmiana identyfikatora Firebase nie zmienia pakietu APK.

W ustawieniach integracji Spotify:

| Pole | Wartość |
| --- | --- |
| API / SDK | Android |
| Android package | `pl.artifex.hiciarz` |
| SHA-1 fingerprint | Odcisk certyfikatu podpisującego konkretny APK |
| Redirect URI | `hiciarz://spotify-callback` |

Odczytaj odcisk klucza używanego w lokalnym buildzie przez:

```sh
./gradlew :app:signingReport
```

Bez prywatnej konfiguracji podpisu lokalny build korzysta z klucza debug Androida. Dla wydania opublikowanego na GitHub właściwy odcisk znajduje się w `SIGNING-CERTIFICATE.txt`, odczytanym z gotowego APK. W Dashboard wpisz wartość **SHA-1**, a nie SHA-256. Po zmianie podpisu dodaj odcisk nowego klucza. Certyfikat i jego odciski są publiczne; nie zawierają prywatnego klucza. Osobny plik PEM nie jest potrzebny w repozytorium: Gradle używa magazynu kluczy przekazywanego w CI przez GitHub Secrets, a publiczny certyfikat jest częścią podpisanego APK.

Publiczna zmienna repozytorium `ANDROID_SIGNING_CERT_SHA256` określa oczekiwany odcisk oficjalnego podpisu. Workflow porównuje go z gotowym APK, aby przypadkowa wymiana klucza nie zerwała aktualizacji.

Odciski własnego buildu odczytaj ze swojego klucza lub gotowego APK. Dla pobranego wydania testowego porównaj podpis z jego plikiem `SIGNING-CERTIFICATE.txt`. Konfiguracja własnej integracji Spotify i zmienna `ANDROID_SIGNING_CERT_SHA256` muszą odnosić się do certyfikatu używanego w danej kopii projektu.

Przy lokalnym buildzie ustaw publiczny identyfikator swojej integracji:

```sh
export SPOTIFY_CLIENT_ID='wstaw_swoj_32_znakowy_client_id'
./gradlew :app:assembleRelease
```

Alternatywnie Gradle obsługuje `-PspotifyClientId=…`. Zmienna środowiskowa ma pierwszeństwo. Aplikacja korzysta z identyfikatora dołączonego podczas budowania i nie pokazuje formularza konfiguracji Client ID. **Client Secret nie jest potrzebny i nie należy go dodawać do aplikacji ani repozytorium.**

Instrukcja konfiguracji odpowiada [oficjalnemu przewodnikowi App Remote dla Androida](https://developer.spotify.com/documentation/android/tutorials/getting-started).

### Development Mode i zakres testów

12 listopada 2026 użytkownik projektu potwierdził działanie połączenia i odtwarzania Spotify w APK `0.2.0-alpha.7` z nową integracją Hiciarz **bez dodawania konta do listy użytkowników w Spotify Developer Dashboard**. Ręczne dopisanie testowanego konta do integracji nie było potrzebne.

Potwierdzenie dotyczy natywnego Spotify App Remote na Androidzie. Opisane przez Spotify ograniczenia Development Mode i listy dozwolonych użytkowników dla [Web API](https://developer.spotify.com/documentation/web-api/concepts/quota-modes) dotyczą osobnego API, którego aplikacja Android nie używa do sterowania odtwarzaniem. Wynik tej próby nie oznacza testu wszystkich kont i urządzeń. Przy błędzie połączenia sprawdź Client ID, pakiet, podpis APK oraz wymagania aplikacji Spotify.

## Budowanie i testy

Wymagane są JDK 17 i Android SDK. Gradle Wrapper wybiera właściwą wersję Gradle. Nie trzeba instalować Gradle globalnie ani budować web przed Androidem.

Biblioteki są pobierane automatycznie przez Gradle. Spotify App Remote pochodzi z oficjalnego repozytorium Spotify, z przypiętym commitem i sprawdzaniem SHA-256; szczegóły opisano w [zależnościach Androida](docs/dependencies.md).

```sh
sdkmanager 'platforms;android-37.0' 'build-tools;37.0.0'
./gradlew :app:testDebugUnitTest :app:lintRelease :app:assembleRelease
```

Ustaw `ANDROID_HOME` na lokalizację Android SDK albo dodaj `sdk.dir=…` do lokalnego, ignorowanego pliku `local.properties`. JDK można wskazać przez `JAVA_HOME`.

| Wynik | Ścieżka w `android-app/` |
| --- | --- |
| Podpisany testowy APK | `app/build/outputs/apk/release/app-release.apk` |
| Raport testów JUnit | `app/build/reports/tests/testDebugUnitTest/index.html` |
| Raport lint | `app/build/reports/lint-results-release.html` |

Testy obejmują odczyt QR i linków Spotify bez talii, skórki, zachowanie skanera po odtworzeniu procesu oraz ustawienia ze starszych wersji. Nie potwierdzają autoryzacji Spotify na prawdziwym urządzeniu; tę część należy sprawdzić ręcznie.

CI uruchamia też natywne scenariusze Compose na emulatorze AOSP: obsługę wyniku skanowania, ukrycie danych karty także po aktualizacji starszych ustawień, zmianę skórki i języka, pomoc w tworzeniu kart oraz przełączanie między Skanerem i Opcjami. Scenariusze UI przekazują kod przez `ScanCameraCode`; odczyt QR przez aparat sprawdza osobny test zoptymalizowanego APK. Osobny scenariusz zmienia rzeczywiste okno Activity i publikuje pozycję pionowego oraz poziomego zgięcia przez WindowManager, sprawdzając, że panele nie nachodzą na zawias. Obejmuje ekran telefonu 360 dp, zewnętrzny i wewnętrzny ekran Folda, krótki widok poziomy, tryb ciemny i powiększenie tekstu. Zrzuty PNG trafiają do artefaktu `android-native-ui-…` obok raportu testów. Jest to test emulatora, a nie deklaracja sprawdzenia na fizycznym Fold7.

Testy regresji sprawdzają globalne wznawianie Spotify po zmianie zakładki, odtwarzanie wybranej karty oraz poprawną aktualizację stanu przy rozłączeniu i ponownym podłączeniu Spotify. Działają na emulatorze bez konta Spotify.

Grafiki skórek są kopiowane z `../web/public/themes/` podczas budowania. Android nie pakuje przykładowych talii z `web/examples/playlists/` i nie potrzebuje danych kreatora. Opcjonalna zmienna `HICIARZ_BUILD_ROOT` przenosi katalogi wynikowe Gradle na inny dysk; podane wyżej ścieżki dotyczą standardowego buildu bez tej zmiennej.

Web i Android pozostają w jednym repozytorium. Mają wspólny format QR i grafiki skórek, a wydania Androida sprawdzają wyłącznie wejścia aplikacji. Zmiana kreatora, strony lub talii w części webowej nie wymaga nowego wydania Androida.

### Podpis i wersja

Prywatnego pliku JKS / keystore i haseł nie umieszczaj w repozytorium, dokumentacji ani zgłoszeniach. Lokalny build bez konfiguracji korzysta ze standardowego klucza debug. Taki APK służy do lokalnych testów; jego podpis różni się od podpisu oficjalnych wydań i może wymagać osobnej rejestracji w Spotify Dashboard.

Własny magazyn podpisu, przechowywany poza śledzonymi plikami, można wskazać zmiennymi środowiskowymi:

| Zmienna | Znaczenie |
| --- | --- |
| `HICIARZ_KEYSTORE_FILE` | Ścieżka do własnego pliku JKS / keystore, najlepiej absolutna |
| `HICIARZ_KEYSTORE_PASSWORD` | Hasło magazynu |
| `HICIARZ_KEY_ALIAS` | Alias klucza |
| `HICIARZ_KEY_PASSWORD` | Hasło klucza |
| `HICIARZ_PRODUCTION_SIGNING` | `false` dla prywatnego podpisu testowego; `true` dopiero dla docelowego podpisu produkcyjnego |

Hasła własnego klucza przekazuj lokalnie lub przez sekrety systemu budowania. Oficjalny workflow korzysta z prywatnego podpisu testowego i nie oznacza APK jako wydania produkcyjnego.

W **Settings → Environments → firebase-beta → Environment secrets** ustaw dane podpisu. Nie przechowuj ich jako Secrets całego repozytorium: osoba z prawem zapisu może odczytać takie sekrety przez własny workflow na gałęzi.

| GitHub Secret | Zawartość |
| --- | --- |
| `HICIARZ_KEYSTORE_BASE64` | Prywatny magazyn podpisu zakodowany Base64 |
| `HICIARZ_KEYSTORE_PASSWORD` | Hasło magazynu |
| `HICIARZ_KEY_ALIAS` | Alias klucza |
| `HICIARZ_KEY_PASSWORD` | Hasło klucza |
| `SPOTIFY_CLIENT_ID` | Własny Client ID Spotify; mimo publicznego charakteru przechowywany jako Secret, by maskować go w logach. |

Publiczne `ANDROID_SIGNING_CERT_SHA256` umieść osobno w **Variables**. Odcisk może mieć postać 64 znaków szesnastkowych albo zapisu z dwukropkami. Osobny job podpisania odtwarza magazyn wyłącznie w tymczasowym katalogu runnera i usuwa go po zakończeniu. Zachowaj własną zaszyfrowaną kopię magazynu poza repozytorium i hasło w osobnym, bezpiecznym miejscu. GitHub nie umożliwia odzyskania zapisanej wartości sekretu.

```sh
./gradlew :app:assembleRelease -PversionName=0.2.0-alpha.5 -PversionCode=100007
```

Do aktualizacji zainstalowanego APK użyj tego samego podpisu i większego `versionCode`. Numer lokalnego buildu powinien być większy od numeru już zainstalowanego wydania, podanego w `BUILD-INFO.txt`.

## Automatyczna beta w Firebase

Bieżącym kanałem testów jest Firebase App Distribution. Workflow [`android-firebase-beta.yml`](../.github/workflows/android-firebase-beta.yml) publikuje podpisany APK po udanym **Check web and Android** dla pushu na `main`, także po mergu PR. PR uruchamia wyłącznie kontrole; zwykły CI buduje offline z pustym Client ID. Nowa beta powstaje tylko po zmianie wejść aplikacji: kodu Androida, konfiguracji budowania, pakowanych grafik, integracji lub samego procesu publikacji. Zmiana wyłącznie webu, talii, dokumentacji albo testów nie wymaga kolejnej bety.

Przed włączeniem automatu:

1. Utwórz własny projekt Firebase na Spark, zarejestruj własną aplikację Android i uruchom App Distribution. Utwórz grupę testerów; adresy przechowuj wyłącznie w Firebase. Gemini i Google Analytics można włączyć w projekcie niezależnie od SDK aplikacji. Plan integracji Analytics i przyszłego Hostingu jest w [planie wydania](docs/google-play-release.md).
2. Skonfiguruj GitHub OIDC/Workload Identity Federation i dedykowane konto usługi. Rola publikacji wymaga tylko `firebaseappdistro.releases.list` i `firebaseappdistro.releases.update`. Nie generuj trwałego klucza JSON. Uprawnienie `roles/iam.workloadIdentityUser` nadaj na tym koncie usługi wyłącznie tożsamości właściwego repo. Warunek dostawcy ma sprawdzać numeryczne ID repo i właściciela, nazwę repo, `refs/heads/main`, środowisko `firebase-beta`, konkretny `workflow_ref` oraz zdarzenia `workflow_run`/`workflow_dispatch`. Nie włączaj płatnego planu jako skutku ubocznego konfiguracji.
3. W GitHub utwórz środowiska `firebase-beta` oraz `firebase-beta-build`. W obu wybierz **Selected branches and tags** i dodaj wyłącznie branch `main`, bez tagów i obejścia reguł. Bez wymaganych reviewers merge publikuje automatycznie. Sama nazwa środowiska w YAML nie stanowi ochrony. Chroń `main`: wymagany PR, pięć kontroli istniejącego CI, aktualna gałąź i rozwiązane dyskusje; bez force push, kasowania gałęzi i obejścia przez administratora. Zatwierdzenie złośliwego kodu do `main` nadal oznacza zaufanie mu.
4. W Secrets `firebase-beta` ustaw poniższą konfigurację oraz cztery `HICIARZ_*` i `SPOTIFY_CLIENT_ID` z tabeli podpisu. W `firebase-beta-build` umieść **wyłącznie `SPOTIFY_CLIENT_ID`**, bez kluczy, haseł ani konfiguracji Firebase. Usuń kopie tych sekretów z zakresu całego repozytorium po sprawdzeniu konfiguracji środowisk. Nie kopiuj wartości do plików workflow ani logów.

| Secret środowiska `firebase-beta` | Zawartość |
| --- | --- |
| `FIREBASE_PROJECT_ID` | Własny identyfikator projektu. |
| `FIREBASE_APP_ID` | Własny identyfikator zarejestrowanej aplikacji Android. |
| `FIREBASE_WORKLOAD_IDENTITY_PROVIDER` | Pełna nazwa zasobu dostawcy WIF. |
| `FIREBASE_SERVICE_ACCOUNT` | Adres dedykowanego konta usługi. |

| Variable | Wartość |
| --- | --- |
| `FIREBASE_BETA_ENABLED` | `true` po konfiguracji dostępu i podpisu; wcześniej `false`. |
| `FIREBASE_TESTER_GROUPS` | Aliasy istniejących grup oddzielone przecinkami, bez adresów testerów. |
| `ANDROID_SIGNING_CERT_SHA256` | Oczekiwany certyfikat dotychczasowego klucza testowego. |
| `FIREBASE_VERSION_CODE_FLOOR` | Opcjonalne minimum kodu wersji, gdy potrzebne jest uwzględnienie niewidocznej historii. |

Planowanie, budowanie i podpisanie z publikacją mają osobne runnery. Gradle, pluginy i testy działają bez OIDC, klucza dystrybucji, jego haseł i dostępu do Firebase. Joby z OIDC nie uruchamiają Gradle ani testów. Wydanie nie używa wspólnego cache Gradle; checkout nie zachowuje tokena GitHub. Firebase używa krótkotrwałego tokena, bez pliku poświadczeń w checkoutcie. Rzeczywistych identyfikatorów właściciela nie ma w repo, a klon ani fork nie dziedziczą Secrets/Variables oryginału.

Między jobami przekazywane są tylko publiczny plan i APK pozbawiony podpisu, z jednodniową retencją. Odbiorca wymaga identyfikatora i SHA-256 artefaktu z joba produkującego, tego samego runu i commitu oraz ściśle określonej zawartości ZIP. Nie pobiera dowolnego artefaktu o pasującej nazwie. APK zawiera publiczny Client ID Spotify; można go odczytać również z zainstalowanej aplikacji. Plik nie zawiera sekretu klienta ani uprawnień administratora.

Automat sprawdza dokładny commit, zielone pełne CI i aktualny `main`, a numer wersji wybiera powyżej historii Firebase i APK z GitHub. Po potwierdzonym udostępnieniu zapisuje jedynie publiczny marker wersji, commitu i odcisku wejść w artefakcie zaufanego wydania. Nie publikuje konfiguracji Firebase, adresów testerów, odpowiedzi API ani podpisanych linków pobierania. Brak wiarygodnego markera powoduje ponowną publikację zamiast pominięcia wymaganej aktualizacji.

W **Actions → Publish Android Firebase beta → Run workflow** domyślne `dry_run=true` daje podgląd bez dostępu do Firebase, budowania i podpisu. Pierwszą rzeczywistą publikację oraz aktualizację sprawdź na telefonie, w tym Spotify i zachowanie ustawień. Testerzy dostają powiadomienie o wersji i zatwierdzają instalację.

Starszy workflow `android-release.yml` jest wycofany: tagi i ręczny wybór gałęzi nie służą już publikacji podpisanych APK w GitHub Releases. Wyłącz go także w ustawieniach Actions, aby nie uruchamiać starszych wersji workflow z historycznych refów. Historyczne APK pozostają wcześniejszym kanałem testowym. Workflow Google Play pozostaje wyłączony do osobnego wdrożenia; przed włączeniem wymaga takiego samego oddzielenia budowania od podpisu i dostępu wydawniczego.

Dokumentacja: [Firebase REST API](https://firebase.google.com/docs/reference/app-distribution/rest), [GitHub OIDC w Google Cloud](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines), [Google auth action](https://github.com/google-github-actions/auth).

## Późniejsza automatyczna beta w Google Play

Pierwszym torem bety jest **Internal testing**, aby szybko dostarczać aktualizacje zaproszonym testerom. Workflow [`android-beta.yml`](../.github/workflows/android-beta.yml) po udanym zakończeniu **Check web and Android** dla pushu na `main`, w tym po mergu PR, sprawdza, czy zmieniły się wejścia aplikacji. Publikuje AAB tylko przy takiej zmianie. Pull request uruchamia kontrole CI; wydanie pochodzi z dokładnie sprawdzonego commitu `main`. Nieaktualny run jest pomijany przed publikacją.

Porównanie odcisku plików Androida, pakowanych grafik i konfiguracji z aktualnym wydaniem internal obejmuje również zmiany z kilku commitów oraz wcześniejsze nieudane próby. Sam `web/src/`, kreator, talie `web/examples/playlists/`, dokumentacja i testy nie wywołują nowego wydania. Zmiana grafiki z `web/public/themes/` wywołuje je, ponieważ ta grafika trafia do AAB. Szczegółową listę wejść utrzymuje `android_beta.py`.

Tor jest ustawiony na `internal`. Nazwa `beta` w API Google Play oznacza open testing i nie jest zamiennikiem dowolnego testu zamkniętego. Uruchomienie closed testing oraz późniejszą produkcję planujemy osobno.

### Jednorazowe uruchomienie

1. Przygotuj aktywne i zweryfikowane konto Play Console oraz aplikację z pakietem `pl.artifex.hiciarz`.
2. Wybierz docelowy podpis Play i osobny upload key. Wykonaj pierwszy upload AAB w konsoli, zaakceptuj wymagane umowy i uruchom internal. API wymaga wcześniej skonfigurowanej aplikacji; automat nie tworzy konta ani nie zastępuje pierwszej konfiguracji.
3. Dodaj SHA-1 **Play App Signing** do konfiguracji Androida w Spotify i sprawdź połączenie aplikacji zainstalowanej przez Play. Podpis upload key służy do wysyłki AAB; użytkownicy otrzymują APK podpisane kluczem Play.
4. W projekcie Google Cloud włącz Google Play Android Developer API i IAM Service Account Credentials API. Utwórz konto usługi, nadaj mu rolę `roles/iam.serviceAccountTokenCreator` na nim samym dla generowania krótkotrwałego tokena, dodaj jego adres w Play Console i przyznaj dostęp do tej aplikacji oraz uprawnienia odczytu informacji i wydawania na tory testowe. Automat nie potrzebuje uprawnień do produkcji, finansów ani zarządzania użytkownikami. Zapisz JSON konta usługi wyłącznie jako sekret Actions.
5. W GitHub **Settings → Environments** utwórz `google-play-internal`. W **Deployment branches and tags** wybierz **Selected branches and tags** i dodaj wyłącznie branch `main`. Bez wymaganych reviewers aktualizacje nadal będą automatyczne. Samo wpisanie nazwy środowiska w workflow nie ustawia tej ochrony. Umieść poniższe sekrety wyłącznie w tym środowisku, bez kopii w repozytoryjnych Secrets; publiczne zmienne mogą pozostać na poziomie repozytorium. Sprawdź pierwszy internal na telefonie, a następnie włącz `PLAY_BETA_ENABLED=true`.
6. W Play Console dodaj listę kont Google testerów oraz adres zgłoszeń. Przekaż testerom link opt-in; muszą otworzyć go na zaproszonym koncie i dołączyć do testu przed instalacją.

Wymagania API i konfiguracja dostępu: [pierwszy upload i Edits API](https://developers.google.com/android-publisher/edits), [konto usługi i autoryzacja](https://developers.google.com/android-publisher/getting_started), [generowanie tokenów w Google auth action](https://github.com/google-github-actions/auth/tree/v3.0.0#inputs-generating-oauth-20-access-tokens).

| Secret środowiska `google-play-internal` | Zawartość |
| --- | --- |
| `PLAY_SERVICE_ACCOUNT_JSON` | JSON konta usługi uprawnionego do aplikacji w Play. |
| `PLAY_UPLOAD_KEYSTORE_BASE64` | Upload keystore zakodowany Base64. |
| `PLAY_UPLOAD_KEYSTORE_PASSWORD` | Hasło upload keystore. |
| `PLAY_UPLOAD_KEY_ALIAS` | Alias upload key. |
| `PLAY_UPLOAD_KEY_PASSWORD` | Hasło upload key. |

| GitHub Variable | Wartość |
| --- | --- |
| `PLAY_BETA_ENABLED` | `true` po zakończeniu konfiguracji; wcześniej upload jest jawnie pomijany. |
| `PLAY_UPLOAD_CERT_SHA256` | Oczekiwany SHA-256 certyfikatu upload key. |
| `PLAY_VERSION_CODE_FLOOR` | Opcjonalny minimalny kod następnego wydania, jeśli trzeba uwzględnić wcześniej zużyte kody niewidoczne w historii API. |

Sekrety `PLAY_UPLOAD_*` są oddzielne od podpisu testowych APK z GitHub. Nie kopiuj klucza testowego do Play bez wcześniejszej decyzji o docelowym podpisie i migracji instalacji. Prywatne klucze, JSON i hasła nie trafiają do repo ani artefaktów. CI dla PR i pushu używa efemerycznego debug key, bez dostępu do klucza wysyłki Play. Reguła środowiska blokuje udostępnienie nowych sekretów Play workflowom uruchamianym z PR.

### Kolejne aktualizacje

- Po udanym CI na `main` automat porównuje wejścia aplikacji z aktualnym internal. Jeżeli są takie same, raportuje pominięcie wydania. Jeżeli się zmieniły, odczytuje historię Play i wydań GitHub, wybiera wolny, większy `versionCode`, buduje release AAB, sprawdza podpis i przesyła go na internal. Wersja beta, commit i odcisk wejść są zapisane w metadanych wydania.
- Numer `versionCode` rośnie również przy ponownym rzeczywistym wydaniu. Automaty nie mogą przerwać trwającej publikacji; beta i dotychczasowe wydania APK korzystają ze wspólnej grupy współbieżności.
- Artefakt `android-app/beta-artifacts/` zachowuje plan, AAB, sumę kontrolną, mapowanie R8 i publiczne metadane podpisu. Potwierdzenie API `PLAY-RECEIPT.json` powstaje dopiero po zatwierdzeniu edycji w Play.
- Tester może nacisnąć „Aktualizuj” w Google Play lub korzystać z automatycznych aktualizacji sklepu. Sukces workflow oznacza wysłanie wydania do Play, a nie jednoczesną instalację na wszystkich urządzeniach.
- Błąd uploadu lub zatwierdzenia edycji wymaga sprawdzenia wyniku w Console przed ponownym uruchomieniem; workflow nie powtarza w ciemno operacji publikujących.

W **Actions → Publish Android beta → Run workflow** domyślny `dry_run` przygotowuje podgląd bez podpisywania i wysyłki. Kod wersji z takiego podglądu jest propozycją; rzeczywisty przebieg ustala go po odczycie Play. Ręczne wydanie wymaga gałęzi `main`, wyłączenia `dry_run` oraz włączonej konfiguracji bety.

Internal może obsłużyć do 100 testerów i rozpocząć się przed ukończeniem pełnej karty sklepu. Test 12 osób przez 14 kolejnych dni, wymagany przed wnioskiem o produkcję dla nowych kont osobistych, biegnie dopiero w **closed testing**. Aby szybko rozpocząć ten okres, przygotuj jego deklaracje i rekrutację równolegle z internal. Przy przejściu tester wypisuje się z internal i dołącza do closed. [Zasady torów testowych](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en), [wymagania nowych kont osobistych](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).

## Wydania z GitHub Actions

Workflow [`android-release.yml`](../.github/workflows/android-release.yml) korzysta z [`CHANGELOG.md`](CHANGELOG.md) jako źródła opisu zmian dla każdej wersji.

1. Przenieś gotowe zmiany z `[Unreleased]` do nowej, niepustej sekcji, np. `## [0.1.0-alpha.3] - 2026-11-12`, i wyślij commit do GitHuba.
2. W Actions wybierz **Publish Android test release → Run workflow**. Pozostaw zaznaczone **dry_run**, aby sprawdzić plan i opis bez budowania APK, sekretów podpisu ani publikacji. Puste **version** wybiera pierwszą sekcję z numerem wersji w changelogu; możesz też podać numer jawnie.
3. Obejrzyj podsumowanie uruchomienia i artefakt `android-release-<wersja>`, zawierający `RELEASE-NOTES.md` i `RELEASE-PLAN.json`.
4. Uruchom workflow ponownie z tymi samymi źródłami i wersją, odznaczając **dry_run**, aby zbudować i opublikować APK. Alternatywnie wypchnij tag `android-v<wersja>` wskazujący przygotowany commit — tag uruchamia publikację automatycznie.

Opis wydania zawiera wyłącznie sekcję wybranej wersji oraz odnośnik do porównania z poprzednim opublikowanym wydaniem Androida, również gdy jest ono oznaczone jako **Pre-release**. `[Unreleased]` nie jest publikowane.

Plan powstaje przed przygotowaniem SDK i budowaniem. Brakująca, pusta lub powtórzona sekcja changeloga, wersja nie nowsza od wydanej, błędny `versionCode`, istniejące wydanie albo tag wskazujący inny commit przerywają workflow. Błędy API GitHuba i niepoprawne metadane poprzednich wydań również przerywają przygotowanie. Istniejące wydania nie są nadpisywane; poprawka wymaga nowej wersji. Wszystkie wydania Androida korzystają z jednej grupy concurrency.

Domyślny `versionCode` to większa z wartości: `100000 + numer uruchomienia workflow` oraz najwyższy kod dotychczasowych wydań Androida powiększony o jeden. Opcjonalne **version_code** pozwala podać go ręcznie, ale numer musi być większy od wszystkich dotychczas opublikowanych i nie może przekraczać `2100000000`.

Publikacja wymaga kompletu czterech sekretów podpisu oraz publicznego odcisku `ANDROID_SIGNING_CERT_SHA256`. Identyfikator Spotify pochodzi wyłącznie z sekretu Actions `SPOTIFY_CLIENT_ID`; repozytorium nie zawiera wartości domyślnej. Workflow uruchamia testy i lint, buduje APK, sprawdza zgodność podpisu oraz porównuje faktyczny pakiet, `versionName` i `versionCode` z planem. Powstaje wydanie **Pre-release** zawierające:

- `hiciarz-android-<wersja>-test.apk`;
- plik `.apk.sha256` z sumą kontrolną APK;
- `SIGNING-CERTIFICATE.txt` z publicznymi odciskami certyfikatu;
- `BUILD-INFO.txt` z numerami wersji i commitem źródeł.

Artefakt uruchomienia zachowuje również plan i opis wydania. Wydania testowe nie są oznaczane jako **Latest**.

Zwykłe CI zawsze używa efemerycznego klucza debug i sprawdza, czy APK jest podpisane, również w forku. Takie artefakty nie są oficjalnym wydaniem. Workflow Releases wymaga prywatnego podpisu i przerwie publikację przy jego braku; automat Play korzysta z osobnego upload key ze środowiska `google-play-internal`.

Po pobraniu APK i pliku sumy do tego samego katalogu sprawdź integralność na Linuksie:

```sh
sha256sum --check hiciarz-android-0.2.0-alpha.5-test.apk.sha256
```

Na macOS odpowiednikiem jest `shasum -a 256 --check …`. Odcisk podpisu można dodatkowo odczytać narzędziem Android SDK `apksigner verify --print-certs <plik.apk>` i porównać z `SIGNING-CERTIFICATE.txt`.

Publikacja APK i commity dotyczące wyłącznie Androida nie uruchamiają GitHub Pages. Zmiany web na `main` wdraża automatycznie osobny workflow **Publish website**, dostępny także ręcznie. Dotychczasowe funkcje web i PWA pozostają dostępne.
