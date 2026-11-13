# Plan bety Hiciarza: Firebase i Google Play

Stan wymagań: 12 listopada 2026. Zakres: natywna aplikacja z `android-app/`, pakiet `pl.artifex.hiciarz`. Podstawowy przebieg to zeskanowanie kodu QR i uruchomienie wskazanego utworu w aplikacji Spotify użytkownika. Android zawiera Skaner i Opcje. Karty przygotowuje się w webowym Hiciarzu. [Bingo i generator plansz](https://artifexet.github.io/Bingo/) mają osobne [repozytorium](https://github.com/ArtifexEt/Bingo).

**Bieżący cel to beta przez Firebase App Distribution, aktualizowana automatycznie po udanym sprawdzeniu zmian aplikacji na `main`.** Dostęp do Play wymaga wyjaśnienia, więc pierwszy kanał testów opieramy na podpisanym APK. Projekt Firebase został utworzony na bezpłatnym planie Spark z Gemini w konsoli i nowym kontem Google Analytics; wymagane warunki zostały zaakceptowane za zgodą właściciela. Aplikacja Android, App Distribution i prywatna grupa testerów są skonfigurowane. Automat Firebase jest zaimplementowany z uwierzytelnieniem OIDC; kolejnym wdrażanym etapem jest dobrowolna analityka Androida, opisana w sekcji 3 i osobnej instrukcji Analytics. Kryteria odbioru są opisane poniżej. Zachowany plan Google Play dotyczy późniejszego kanału dystrybucji.

Warunki integracji Spotify wymagają weryfikacji względem pełnego zakresu skanera; nie ustalono, że publikacja Hiciarza jest niedopuszczalna. Odbiór Spotify na fizycznym telefonie pozostaje konieczny w każdym kanale.

## Teraz: beta w Firebase App Distribution

### 1. Projekt i pierwsza instalacja

1. Projekt i aplikacja Android z pakietem `pl.artifex.hiciarz` są utworzone. Google Analytics jest włączone; wybrano Polskę jako kraj konta, a dodatkowe udostępnianie danych do benchmarków, produktów Google, wsparcia i specjalistów kont jest wyłączone. Samo włączenie Analytics w projekcie nie dodaje SDK do APK. Rzeczywistych identyfikatorów projektu i aplikacji nie zapisujemy w tym dokumencie. [Konfiguracja Firebase dla Androida](https://firebase.google.com/docs/android/setup).
2. **Gemini in Firebase** jest włączone jako pomoc dla osoby pracującej w konsoli. Nie oznacza to funkcji AI w Hiciarzu. Plan skanera nie obejmuje Firebase AI Logic, wywołań modelu ani przekazywania zdjęć, QR lub danych Spotify do Gemini. [Gemini w konsoli](https://firebase.google.com/docs/ai-assistance/gemini-in-firebase).
3. Automat buduje APK ze stałym kluczem testowej dystrybucji i rosnącym `versionCode`; jego SHA-1 musi być zarejestrowany w Spotify. Klucz efemeryczny używany przez CI służy sprawdzaniu kodu, a nie ciągłości instalacji testerów. Pierwszy upload również może wykonać automat; po nim trzeba sprawdzić instalację oraz aktualizację na telefonie. Ten wariant nie wymaga połączenia z Google Play ani SDK App Distribution w aplikacji. [App Distribution](https://firebase.google.com/docs/app-distribution), [dystrybucja APK w konsoli](https://firebase.google.com/docs/app-distribution/android/distribute-console).
4. Prywatna grupa testerów jest utworzona w Firebase. Adresy i zaproszenia pozostają w konsoli, poza publicznym repo. Tester przyjmuje zaproszenie na koncie Google, pobiera APK i zezwala na instalację z wybranego źródła. Kolejne wydanie wywołuje powiadomienie; instalacja wymaga działania testera. [Instrukcja dla testerów](https://firebase.google.com/docs/app-distribution/get-set-up-as-a-tester?platform=android).

Na pierwszy etap wystarczą powiadomienia Firebase poza aplikacją. Opcjonalne alerty i feedback wymagające SDK App Distribution rozważyć osobno; pełna implementacja tego SDK nie może trafić do przyszłego wariantu Play. [Opcjonalny SDK i ograniczenie publikacji w Play](https://firebase.google.com/docs/app-distribution/collect-feedback-from-testers).

### 2. Automat i prywatna konfiguracja GitHub

- Workflow `android-firebase-beta.yml` wykonuje osobny upload APK do Firebase po sukcesie istniejącego CI dla zaufanego pushu na `main`, z checkoutem dokładnie sprawdzonego commitu. Pomija wydanie przy niezmienionych wejściach aplikacji; samo edytowanie webu, talii lub dokumentacji nie publikuje Androida. Zmiany konfiguracji faktycznie pakowanej do APK także wpływają na porównanie wejść.
- Dostęp do Firebase, identyfikatory projektu i aplikacji, grupa testerów oraz konfiguracja podpisu pozostają w prywatnej konfiguracji GitHub. Środowisko publikacji jest ograniczone do `main`. Uwierzytelnienie OIDC/Workload Identity Federation korzysta z krótkotrwałych tokenów, bez stałego klucza konta usługi. Warunek dostawcy sprawdza bezpośrednio `assertion.environment` oraz numeryczne ID repo i właściciela, gałąź, workflow i zdarzenie; nie zakłada starszego formatu pola `sub`. [OIDC GitHub](https://docs.github.com/en/actions/reference/security/oidc), [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines).
- Budowanie z Gradle i testami działa na osobnym runnerze bez OIDC i bez klucza dystrybucji. Planowanie i podpisanie z publikacją nie wykonują Gradle ani testów. Klucz i hasła należą wyłącznie do środowiska `firebase-beta`; środowisko `firebase-beta-build` ma wyłącznie publiczną konfigurację klientów Spotify i Firebase, bez uprawnień chmurowych i materiału podpisu. Przekazywanie planu i APK sprawdza identyfikator, sumę SHA-256, run, commit i zawartość ZIP; artefakty pośrednie mają jednodniową retencję. Starsze publikowanie APK z tagów lub dowolnej gałęzi jest wycofane. Play wymaga analogicznej izolacji przed włączeniem.
- `main` wymaga PR i pięciu kontroli CI, aktualnej gałęzi oraz rozwiązania dyskusji, bez obejścia administratora. Forki nie otrzymują sekretów; uruchomienie CI wszystkich zewnętrznych współpracowników wymaga zgody. Akcje muszą być przypięte do pełnego SHA. Te ograniczenia nie zabezpieczają przed właścicielem, który świadomie zaakceptuje złośliwy kod do `main`. Minimalna rola Firebase zarządza wydaniami App Distribution (także usuwaniem i dystrybucją); nie daje dostępu do danych aplikacji, Analytics, IAM ani rozliczeń. [Bezpieczeństwo GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use), [uprawnienia App Distribution](https://cloud.google.com/iam/docs/roles-permissions/firebaseappdistro).
- Świeży klon i PR domyślnie budują oraz testują aplikację bez dostępu do Firebase i bez publikacji. Włączenie automatu wymaga ukończenia konfiguracji dostępu i podpisu; pierwsze rzeczywiste wydanie i jego instalacja stanowią odbiór. Podsumowanie CI zawiera wynik, wersję i commit, bez prywatnych identyfikatorów, adresów testerów, konfiguracji JSON i podpisanych linków pobierania.
- Analytics otrzymuje konfigurację klienta przez `FIREBASE_ANDROID_CONFIG_BASE64` w chronionych środowiskach. Typowane zadanie Gradle generuje wymagane zasoby wyłącznie w katalogu build, bez Google services plugin i pliku JSON w źródłach. Dane klienta są odczytywalne z oficjalnego APK, ale świeży klon repo nie dostaje wartości właściciela. JSON konta usługi jest zabroniony; testy PR działają bez konfiguracji projektu. [Plik konfiguracji Firebase](https://firebase.google.com/docs/android/google-services-plugin-and-file).

**Odbiór dystrybucji:** zaproszony tester instaluje APK, skanuje QR i odtwarza utwór przez Spotify; kolejna zmiana aplikacji po zielonym CI daje aktualizację zachowującą ustawienia. Zmiana tylko dokumentacji nie publikuje nowego APK. Analytics nie blokuje pierwszej bety.

### 3. Kolejny krok: dobrowolne Google Analytics w Androidzie

Implementacja obejmuje SDK zarządzany przez Firebase BoM, leniwą inicjalizację dopiero po zgodzie oraz ustawienia **Opcje → Prywatność → Statystyki użycia**. Przełącznik jest domyślnie wyłączony. Włączenie wymaga przeczytania informacji i osobnego potwierdzenia; odmowa nie zmienia skanowania ani Spotify. Szczegóły i procedura odbioru: [Analytics w Androidzie](analytics.md).

- Manifest wyłącza początkową kolekcję, cztery zgody SDK, automatyczne ekrany i identyfikatory reklamowe. Usuwa provider automatycznej inicjalizacji Firebase oraz uprawnienia reklamowe. Sama odmowa zgody SDK nie jest traktowana jako gwarancja braku pingów — przed zgodą aplikacja w ogóle nie tworzy instancji Analytics.
- Po zgodzie udzielane jest tylko `ANALYTICS_STORAGE`; trzy zgody reklamowe pozostają `DENIED`. Cofnięcie zamyka bramkę zdarzeń, wyłącza kolekcję, odmawia zgód SDK i resetuje lokalne dane/identyfikator. Nie oznacza automatycznego usunięcia wcześniej wysłanych danych z serwerów Google.
- Interfejs przyjmuje wyłącznie enumy ekranów i zdarzeń. Nie przyjmuje zdjęć, treści QR, URI/ID utworów, danych konta, tokenów, emaili, surowych wyjątków ani własnego user_id. Wynik operacji jest emitowany raz, bez pomiaru każdej klatki, pozycji Spotify i rekompozycji Compose.
- Konfiguracja klienta trafia do oficjalnego APK przez Secrets `FIREBASE_ANDROID_CONFIG_BASE64` w środowiskach `firebase-beta` i `firebase-beta-build`. Ich zgodność jest sprawdzana przez plan, a zmiana konfiguracji wpływa na fingerprint wydania. Nie powiększa to roli chmurowej publikatora. Pusty klon/test PR nie uruchamia Analytics.
- SDK po zgodzie zbiera również własne zdarzenia i dane aplikacji/urządzenia z identyfikatorem instancji. Pomiar nie jest opisywany jako anonimowy. Zakres zgody Androida nie obejmuje webu ani Gemini; te integracje pozostają osobnymi etapami.

**Odbiór kodu:** testy zgody, odmowy, cofnięcia, restartu, braku kolejki i deduplikacji; build bez klienta oraz z syntetyczną konfiguracją; scalony manifest bez providera auto-init i uprawnień reklamowych; ścisłe sumy zależności; kontrola publicznych logów i artefaktów. **Odbiór na urządzeniu:** osobno sprawdzić rzeczywisty brak ruchu Analytics przed zgodą oraz po odmowie/cofnięciu i przyjście dozwolonych zdarzeń po zgodzie w DebugView. Nie utożsamiać testów z fałszywym silnikiem z takim pomiarem sieciowym. Polecenia i ograniczenia opisuje instrukcja Analytics.

### 4. Później: Firebase Hosting

Hosting może udostępnić politykę, pomoc i stronę bety, a następnie opcjonalnie istniejący frontend Vite. To osobny etap, bez automatycznej migracji obecnej strony GitHub Pages i bez dodawania AI. Dla hostowania webu w katalogu głównym zbudować `web/dist` z `BASE_PATH=/` zamiast obecnego `/Hiciarz/`; sprawdzić PWA, ścieżki zasobów, linki kart i przekierowania. Najpierw wdrożyć kanał preview, po odbiorze stronę live. Dostęp do publikacji utrzymywać w prywatnym środowisku GitHub ograniczonym do zaufanej gałęzi; nie nadawać go kodowi PR. Osobno ocenić analitykę webu i jego zgodę — zgoda w Androidzie jej nie zastępuje. [Firebase Hosting](https://firebase.google.com/docs/hosting), [preview i integracja GitHub](https://firebase.google.com/docs/hosting/github-integration).

## Późniejsza ścieżka Google Play

Poniższe etapy i listy gotowości dotyczą przyszłej bety oraz publikacji przez Play. Ich wykonanie wymaga aktywnego konta Play; nie są warunkiem uruchomienia podpisanych APK w Firebase App Distribution.

## Najkrótsza droga do testów w Google Play

| Tor | Cel | Kiedy uruchomić |
| --- | --- | --- |
| Internal testing | Szybkie aktualizacje dla maksymalnie 100 testerów zaproszonych przez listę kont Google. | Po przygotowaniu konta, podpisu, AAB i podstawowego odbioru. Nie wymaga oczekiwania 14 dni ani kompletnej karty sklepu. |
| Closed testing | Szersza beta i zbieranie feedbacku od docelowych użytkowników. | Po ukończeniu konfiguracji aplikacji i deklaracji. Rekrutację 15–20 osób zacząć równolegle z internal. |
| Open testing / produkcja | Późniejsze publiczne udostępnienie. | Osobny etap; na nowym koncie osobistym open testing wymaga dostępu do produkcji. |

Internal jest najszybszym torem dystrybucji: Google opisuje dostępność nowych buildów w ciągu minut, ale termin pierwszego uruchomienia zależy też od rejestracji konta i konfiguracji integracji. [Konfiguracja torów testowych](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en).

**Wymóg 12 testerów przez 14 kolejnych dni dotyczy późniejszego wniosku o produkcję na nowym koncie osobistym.** Nie trzeba go spełnić przed uruchomieniem bety. Okres liczy się w closed testing, więc po krótkim odbiorze internal uruchomić closed możliwie wcześnie. Tester przenoszony do closed musi najpierw wypisać się z internal i dołączyć do właściwego testu. Aktualizacje w ramach closed mogą być wydawane podczas tego okresu. [Wymagania testów](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en), [przenoszenie testerów](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en).

Aplikacja dostępna wyłącznie w internal jest zwolniona z formularza Data safety. Nie zwalnia to z obowiązujących zasad dotyczących danych i SDK. Audyt oraz politykę przygotować równolegle; formularz Data safety, polityka, karta sklepu i wymagane deklaracje muszą być gotowe przed closed testing. [Zakres Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).

## Automatyczne aktualizacje bety

1. Pull request uruchamia istniejący workflow `Check web and Android` z testami i kontrolami aplikacji.
2. Po mergu lub bezpośrednim pushu na `main`, po sukcesie tego workflow, `android-beta.yml` porównuje odcisk wejść aplikacji z aktualnym wydaniem internal. Jeśli wejścia się zmieniły, przygotowuje wydanie z dokładnie sprawdzonego commitu. Dokumentacja, sam interfejs web i talie nie powodują nowego wydania Androida.
3. Proces ustala kolejny `versionCode`, buduje i weryfikuje podpisany AAB, a następnie aktualizuje wyłącznie tor `internal`. Numer wersji i commit są zapisane razem z artefaktem.
4. Automatyczny upload włącza się po jednorazowej konfiguracji konta, pierwszego wydania oraz zmiennej `PLAY_BETA_ENABLED=true`. Brak konfiguracji ma być widoczny w podsumowaniu uruchomienia.
5. Testerzy dostają wersję przez Google Play. Mogą używać automatycznych aktualizacji sklepu albo nacisnąć „Aktualizuj”; zakończenie workflow nie oznacza natychmiastowego zainstalowania aplikacji na każdym telefonie.
6. Przed późniejszym przeniesieniem automatu na closed testing ustalić osobno nazwę i zasady tego toru. Tor API `beta` oznacza open testing, dlatego nie należy używać go jako zamiennika dowolnej zamkniętej bety.

Jednorazowa konfiguracja i ograniczenia automatu są opisane w instrukcji Androida. Używamy tego samego pakietu i docelowego podpisu Play również podczas testów, aby następne aktualizacje zachowywały ustawienia użytkowników.

Web i Android pozostają w jednym repo. Android nie korzysta z talii: QR zawiera identyfikator utworu i opcjonalną skórkę. Wspólnymi zasobami pakowanymi do Androida są wybrane grafiki `web/public/themes/`; zmiana tych grafik może wyzwolić betę. Zmiany `web/examples/playlists/` nie są wejściem Androida. Odcisk obejmuje też konfigurację budowania, publiczny Client ID Spotify i oczekiwany certyfikat upload key, dzięki czemu zmiana konfiguracji AAB może uruchomić wydanie bez zmian interfejsu.

## Gotowe elementy i braki

| Obszar | Stan projektu | Działanie przed publikacją |
| --- | --- | --- |
| Android | Kotlin i Jetpack Compose, `minSdk=26`, `targetSdk=37` | Sprawdzić gotowy AAB w Play i zachowanie na obsługiwanych wersjach Androida. |
| Pakiet | `pl.artifex.hiciarz` | Potwierdzić docelową nazwę pakietu przed pierwszym uploadem. |
| Wydania | Firebase publikuje APK po CI; starsze wydania GitHub są wycofane | Przed uruchomieniem AAB w Play oddzielić build od podpisu i uprawnień publikacji. |
| Podpis | Obsługa prywatnego keystore; release lokalny ma fallback do debug key | W procesie Play wymusić podpis produkcyjny i zweryfikować certyfikat AAB. |
| Jakość | Testy jednostkowe, lint, testy UI i skanera release w CI | Dodać odbiór instalacji z Play na rzeczywistym urządzeniu. |
| Odtwarzanie | Skan QR uruchamia utwór przez Spotify App Remote; potrzebne Spotify i Premium | Sprawdzić podpis Play i nowego użytkownika oraz warunki integracji dla pełnego zakresu aplikacji. |
| Prywatność | Kamera przetwarzana lokalnie; ML Kit w zależnościach | Audyt SDK, publiczna polityka oraz link w aplikacji, Data safety. |
| Karta sklepu | Zrzuty Androida są w `docs/screenshots/` | Wybrać aktualne zrzuty, przygotować ikonę, grafikę i opisy. |

Podstawa w repo: [konfiguracja aplikacji](../app/build.gradle.kts), [manifest](../app/src/main/AndroidManifest.xml), [testy CI](../../.github/workflows/ci.yml), [wydania APK](../../.github/workflows/android-release.yml), [instrukcja Androida](../README.md).

Od 31 sierpnia 2026 nowe aplikacje mobilne i ich aktualizacje wymagają co najmniej API 36. Obecne `targetSdk=37` spełnia ten próg; nie ma potrzeby obniżania go do wartości z wcześniejszych poradników. [Wymagania target API Google](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en).

## Etap 0 Zakres aplikacji i integracja Spotify

Podstawowy przebieg Hiciarza jest prosty: aparat odczytuje QR, aplikacja rozpoznaje wskazany utwór i zleca jego odtworzenie Spotify. Spotify App Remote służy właśnie do sterowania zewnętrzną aplikacją Spotify, w tym uruchamiania utworów. Sam techniczny mechanizm skanowania nie przesądza, czy cały produkt stanowi grę w rozumieniu warunków usługi. [Spotify Android SDK](https://developer.spotify.com/documentation/android).

Z Androida usunięto Bingo, bibliotekę i import talii, dołączane talie oraz wyszukiwanie i odkrywanie odpowiedzi. Nawigacja zawiera Skaner oraz Opcje. Skaner odczytuje utwór i skórkę bezpośrednio z QR i steruje odtwarzaniem w Spotify. Taki zakres należy przedstawić w zgłoszeniu i instrukcji recenzenta.

Spotify Developer Policy, sekcja III punkt 2, zawiera zapis: „Do not create a game, including trivia quizzes”. Usunięcie mechanik gry i talii upraszcza produkt, ale ocena warunków nadal dotyczy faktycznego działania wydania i jego zastosowania. [Spotify Developer Policy](https://developer.spotify.com/policy).

HITSTER jest konkretnym przykładem produktu łączącego fizyczne karty, skan QR i odtwarzanie Spotify. Jego wykonawca potwierdza ten przebieg. Publiczny opis nie wyjaśnia jednak podstawy umownej tej integracji, dlatego nie zakładamy ani specjalnej umowy HITSTER, ani automatycznie takich samych uprawnień Hiciarza. [Opis aplikacji HITSTER autorstwa Q42](https://www.q42.nl/en/work/hitster-app).

Przed publiczną dystrybucją sprawdzić warunki dla faktycznego zakresu aplikacji. Jeżeli potrzebna jest interpretacja Spotify, przedstawić dokładny scenariusz: własne konto i telefon użytkownika, QR wskazujący utwór, sterowanie App Remote, brak dystrybucji nagrań oraz sposób pokazywania danych zeskanowanej karty. Samo przejście z SDK na linki lub osadzenia nie potwierdza zgodności.

Niezależnie sprawdzić dostęp App Remote na świeżych kontach. Dokumentacja ograniczeń Development Mode dotyczy Web API; nie należy automatycznie przenosić jego limitów na App Remote ani zakładać, że App Remote je omija. [Spotify Quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes).

**Wynik etapu:** ustalony zakres pierwszego AAB, rzetelny opis skanera, Opcji i odtwarzania oraz ocena warunków integracji. Zachowujemy Spotify jako podstawę przygotowań; ewentualną zmianę źródła audio rozważyć dopiero na podstawie konkretnych ustaleń. Konto Play, podpisy, prywatność i budowanie można przygotowywać równolegle.

## Etap 1 Konto i zakres bety

Odpowiedzialny: właściciel aplikacji.

1. Uzyskać dostęp do aktywnego, zweryfikowanego konta Google Play Console i ustalić jego typ. Dostęp do produkcji nie jest warunkiem uruchomienia internal ani closed testing.
2. W razie zakładania konta wybrać typ zgodny z faktycznym wydawcą, opłacić rejestrację i przejść weryfikację. Opłata jest jednorazowa i wynosi 25 USD; konto osobiste może wymagać także weryfikacji dostępu do urządzenia Android. [Rejestracja Play Console](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en).
3. Dla organizacji przygotować m.in. dane firmy, stronę i numer D-U-N-S. Google podaje, że uzyskanie numeru może potrwać do 30 dni. Ustalić także, które dane wydawcy będą publiczne. [Informacje wymagane przy rejestracji](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en).
4. Ustalić nazwę wydawcy, kontakt pomocy i prywatności, kraje, języki, model cenowy i grupę wiekową. Założenie do planowania bety: aplikacja bezpłatna, bez reklam i zakupów, początkowo zaproszeni testerzy; właściciel potwierdza te wybory.
5. Utworzyć aplikację w Play Console i potwierdzić `pl.artifex.hiciarz`. Wybrać aplikację lub grę zgodnie z finalną funkcją, domyślny język polski i planowaną cenę. [Tworzenie aplikacji w Play](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en).

**Wynik etapu:** zweryfikowane konto, utworzona aplikacja i lista pierwszych testerów z działającym kanałem zgłoszeń.

## Etap 2 Podpisy i numeracja

Odpowiedzialni: właściciel aplikacji i osoba przygotowująca wydanie.

Play App Signing rozdziela **upload key**, którym podpisujemy przesyłany AAB, od **app signing key**, którym Google podpisuje APK instalowane przez użytkowników. Odciski do integracji zewnętrznych muszą odpowiadać certyfikatom rzeczywiście dostarczanych APK. [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en).

1. Przed pierwszą dystrybucją wybrać docelowy app signing key. Zalecany wariant dla nowej aplikacji: klucz zarządzany przez Google i osobny upload key przechowywany przez wydawcę.
2. Rozstrzygnąć migrację dotychczasowych testowych APK. Przy innym podpisie aplikacja z Play może wymagać odinstalowania wersji GitHub, co usuwa lokalne dane. Jeżeli konieczna jest ciągłość aktualizacji, zaplanować zgodny podpis przed pierwszą dystrybucją; nie przyjmować automatycznie klucza testowego jako docelowego. [Podpisy dla różnych kanałów dystrybucji](https://developer.android.com/guide/app-bundle/faq).
3. Upload keystore i hasła przechowywać poza repozytorium; w CI wykorzystać osobne środowisko Play i sekrety. Zarchiwizować kopię klucza, publiczne odciski i instrukcję odzyskania dostępu.
4. Dla wariantu ze Spotify dodać w Spotify Dashboard pakiet `pl.artifex.hiciarz`, redirect `hiciarz://spotify-callback` i SHA-1 certyfikatu lub certyfikatów Play App Signing używanych na wspieranych urządzeniach. Odcisk upload key nie wystarczy. Zachować także odciski używanych wydań testowych. [Konfiguracja Spotify Android](https://developer.spotify.com/documentation/android/tutorials/getting-started).
5. Każdy nowy build przesyłany do Play otrzymuje wolny, większy `versionCode`. Automat bety uwzględnia historię Play i testowych wydań GitHub oraz opcjonalny `PLAY_VERSION_CODE_FLOOR`. Dotychczasowy workflow APK odczytuje historię GitHub; jeśli wymagana jest migracja między kanałami, ustalić także zgodną numerację i podpis przed takim wydaniem. Promocja już przesłanego AAB między torami zachowuje jego kod. Domyślny kod z Gradle nie jest źródłem prawdy dla następnego wydania.

**Wynik etapu:** wybrane klucze, sprawdzony plan migracji, konfiguracja usług i numer następnego wydania.

## Etap 3 Prywatność i deklaracje Play

Odpowiedzialni: właściciel aplikacji oraz osoba znająca przepływy danych w kodzie.

### Inwentaryzacja danych

| Element | Zachowanie obecnego kodu | Co potwierdzić dla wydawanego AAB |
| --- | --- | --- |
| Kamera i QR | CameraX przekazuje klatki do lokalnego skanera ML Kit; brak własnego uploadu obrazu | Scalony manifest, brak zapisu lub wysyłki klatek, zachowanie po odmowie uprawnienia. |
| Ustawienia i skaner | Ustawienia wyglądu i odtwarzania oraz stan skanera; backup wyłączony; bez bazy talii i odpowiedzi | Jak użytkownik usuwa dane i co znika przy odinstalowaniu. |
| ML Kit | `com.google.mlkit:barcode-scanning:17.3.0`, model dołączony do aplikacji | Dane diagnostyczne, identyfikatory instalacji i cele przetwarzania w tej wersji SDK. |
| Spotify | URI utworu i stan odtwarzania przez App Remote; brak konta Hiciarza | Autoryzacja, SDK i przepływy do Spotify, jeśli integracja pozostaje. |
| Usługi zewnętrzne | Generator w przeglądarce, GitHub Issues, strona Spotify | Kiedy użytkownik opuszcza aplikację i jakie obowiązują wtedy zasady. |
| Reklamy i płatności | Brak własnego SDK reklamowego, billing i Crashlytics w obecnych zależnościach | Czy finalna wersja lub zależności nie zmieniły tego stanu. |

ML Kit opisuje zbieranie danych urządzenia i aplikacji, identyfikatorów instalacji, metryk, zdarzeń i błędów na potrzeby diagnostyki i analizy użycia. Dokumentacja dotyczy najnowszych SDK, dlatego trzeba odnieść ją do wersji rzeczywiście spakowanej w AAB. Lokalna analiza obrazu nie uprawnia do zaznaczenia „nie zbieramy danych”. [Ujawnienia danych ML Kit](https://developers.google.com/ml-kit/android-data-disclosure).

### Polityka i formularze

1. Opublikować politykę prywatności pod stałym, publicznym adresem HTTPS, dostępnym bez logowania, np. w ramach strony projektu. Ma wskazywać Hiciarza lub wydawcę, kontakt, przepływy danych i SDK, cele, retencję oraz usuwanie danych. Dodać link „Polityka prywatności” w Opcjach Androida i w Play Console. Google wymaga takiej polityki również od aplikacji bez danych wrażliwych; adres nie może prowadzić do PDF. [Polityka User Data](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en).
2. Wypełnić Data safety po sprawdzeniu scalonego manifestu i zależności wydania. Rozróżnić dostęp lokalny, zbieranie, udostępnianie, wymagane i opcjonalne dane. Dla ML Kit sprawdzić kategorie diagnostyki oraz identyfikatorów według definicji formularza. Deklaracje muszą uwzględniać SDK i zgadzać się z polityką. [Przewodnik formularza Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).
3. W App content uzupełnić reklamy, odbiorców, rating treści, dostęp do aplikacji i pozostałe deklaracje wyświetlane przez Console. Odpowiedzi oprzeć na finalnej wersji: także zewnętrznej muzyce, możliwych treściach explicit i sposobie korzystania ze skanera. Nie przypisywać samodzielnie ratingu PEGI ani kategorii dziecięcej. [Przygotowanie aplikacji do oceny](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en).
4. Obecnie nie ma rejestracji konta Hiciarza. Jeżeli do premiery zostanie dodana, ponownie sprawdzić wymagania usuwania kont i danych. Samo połączenie ze Spotify wymaga odrębnego opisania, a nie deklarowania własnego systemu kont.
5. Sprawdzić prawa do nazwy, grafik i fontów. Do Androida trafiają wybrane grafiki motywów, bez JSON z `web/examples/playlists/`. Zachować informacje o licencjach i usunąć materiały, których dystrybucji nie można uzasadnić.

**Wynik etapu:** działająca polityka w sieci i aplikacji, uzgodnione formularze oraz lista wykorzystanych materiałów i licencji.

## Etap 4 Powtarzalne wydanie AAB

Odpowiedzialny: osoba przygotowująca wydanie. Proces realizuje `android-beta.yml` po jednorazowej konfiguracji Play opisanej w instrukcji Androida; workflow testowych APK pozostaje osobnym kanałem.

### Budowanie

Workflow `android-beta.yml` uruchamia się po udanym CI dla `main` i porównuje wejścia aplikacji przed budowaniem. Ręczny `dry_run` generuje podgląd planu; rzeczywisty upload włącza `PLAY_BETA_ENABLED=true`. Pierwsze przesłanie AAB wykonać ręcznie w Console i sprawdzić instalację przed włączeniem automatu.

Wymagane środowisko: JDK 17, Gradle Wrapper z repo i Android SDK zgodne z projektem. Pakowane grafiki pochodzą z `web/public/themes/`, dlatego checkout musi obejmować te zasoby. Talie i kod aplikacji webowej nie są potrzebne do budowania Androida.

Komendy dla obecnego wariantu ze Spotify, uruchamiane z katalogu `android-app/`. Przygotowanie AAB może przebiegać równolegle z oceną warunków integracji; wysłanie do publicznej dystrybucji wymaga zamknięcia odpowiednich punktów gotowości. Wartości klucza i hasła należy wcześniej wprowadzić przez bezpieczne środowisko lokalne lub CI:

```sh
set -eu
: "${HICIARZ_KEYSTORE_FILE:?Ustaw ścieżkę do upload keystore poza repo}"
: "${HICIARZ_KEYSTORE_PASSWORD:?Ustaw hasło keystore w bezpiecznym środowisku}"
: "${HICIARZ_KEY_ALIAS:?Ustaw alias upload key}"
: "${HICIARZ_KEY_PASSWORD:?Ustaw hasło klucza w bezpiecznym środowisku}"
: "${SPOTIFY_CLIENT_ID:?Ustaw Client ID integracji}"
: "${PLAY_VERSION_NAME:?Ustaw nazwę wersji}"
: "${PLAY_VERSION_CODE:?Ustaw kolejny wolny kod wersji}"
test -f "$HICIARZ_KEYSTORE_FILE"

sdkmanager 'platforms;android-37.0' 'build-tools;37.0.0'
HICIARZ_PRODUCTION_SIGNING=true ./gradlew --no-daemon \
  :app:testDebugUnitTest :app:lintRelease :app:bundleRelease \
  -PversionName="$PLAY_VERSION_NAME" -PversionCode="$PLAY_VERSION_CODE"
```

Po zmianie odtwarzania zaktualizować także zależności, wymagane zmienne i powyższą komendę. Nie stosować pustego Client ID jako sposobu wyłączenia Spotify w publikowanym produkcie.

### Kontrola artefaktów

| Artefakt lub sprawdzenie | Wymagany wynik |
| --- | --- |
| `app/build/outputs/bundle/release/app-release.aab` | Właściwy pakiet, wersja, uprawnienia, brak konfiguracji testowej. |
| Podpis AAB | Zgodność z ustalonym upload certificate, poprawna weryfikacja podpisu JAR. `apksigner` stosuje się do APK, nie do AAB. |
| Walidacja bundletool | AAB poprawny; APK z tego AAB instalują się i uruchamiają. |
| Biblioteki natywne i 16 KB | Kontrola wszystkich `.so`, wyrównania ELF oraz APK wygenerowanych z AAB i test w środowisku 16 KB. |
| Mapowanie R8 | Zachowane `app/build/outputs/mapping/release/mapping.txt`; sprawdzone powiązanie z wydaniem w Play. |
| Diagnostyka natywna | Symbole debugowania dołączone, jeśli występują dostępne symbole własnego lub zewnętrznego kodu natywnego. |
| Metryka wydania | Commit, wersja, suma SHA-256 AAB, odcisk upload certificate i wyniki kontroli zapisane razem. |

Ścieżki zakładają standardowy katalog wyników. `HICIARZ_BUILD_ROOT` przenosi wyniki Gradle i musi być uwzględniony w CI.

Przy ML Kit nie wystarczy stwierdzić, że sam kod aplikacji jest w Kotlinie. Sprawdzić zależności rzeczywiście zawarte w artefakcie. W emulatorze lub urządzeniu testowym `adb shell getconf PAGE_SIZE` ma zwrócić `16384`. Sama deklaracja `PAGE_ALIGNMENT_16K` w AAB nie potwierdza poprawności wszystkich bibliotek. Bieżąca dokumentacja Google opisuje obowiązek zgodności dla API 35+ oraz blokadę niezgodnych aktualizacji od 1 lutego 2027; w tym procesie zgodność jest warunkiem już pierwszego wydania. [Obsługa stron pamięci 16 KB](https://developer.android.com/guide/practices/page-sizes).

Przyszły workflow ma przerywać pracę przy brakującym kluczu, błędnym odcisku, pustym Client ID w wariancie Spotify lub zajętym `versionCode`. Automatyzacja przesłania wymaga osobnej tożsamości z dostępem do tej aplikacji w Play i minimalnym potrzebnym zakresem. Wysłanie do produkcji pozostaje osobnym, świadomym krokiem wydawcy.

**Wynik etapu:** zweryfikowany AAB, raporty i metryka tego samego commitu.

## Etap 5 Przygotowania do closed testing: karta sklepu i dostęp recenzenta

Odpowiedzialni: właściciel produktu i osoba przygotowująca materiały.

Materiały można kończyć podczas pierwszych testów internal. Komplet jest potrzebny przed uruchomieniem closed testing; nie blokować pierwszego internal wyłącznie dopracowywaniem materiałów promocyjnych.

| Materiał | Zakres do przygotowania |
| --- | --- |
| Nazwa | Propozycja: `Hiciarz`; limit 30 znaków. |
| Krótki opis | Do 80 znaków; punkt wyjścia: „Skanuj kody QR i uruchamiaj wskazane utwory w Spotify”. |
| Pełny opis | Do 4000 znaków; wyjaśnić kody QR, skanowanie, wymagania odtwarzania i przygotowanie materiałów w przeglądarce. |
| Ikona sklepu | 512 × 512 px, PNG 32 bit, maksymalnie 1024 KB. |
| Grafika promocyjna | 1024 × 500 px, JPEG lub PNG 24 bit bez przezroczystości. |
| Zrzuty | Przygotować 4–6 aktualnych zrzutów Androida, np. 1080 × 1920; minimalny wymóg publikacji to dwa. Dodać odpowiednie ujęcia tabletu, jeśli jest objęty wydaniem. |
| Pomoc | Działający adres email, strona projektu, URL polityki prywatności. |
| Informacje o wydaniu | Krótki opis faktycznych funkcji i zmian z changeloga. |

Parametry tekstu: [konfiguracja karty sklepu](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en). Parametry grafik i zrzutów: [materiały podglądowe Google Play](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).

Materiały pokazują natywny skaner, uruchamianie utworu i Opcje. Bingo jest osobną aplikacją pod `https://artifexet.github.io/Bingo/`. Kreator talii, PDF i funkcje dostępne wyłącznie w PWA należy opisać jako otwierane w przeglądarce. Wymagania Spotify podać zgodnie z rzeczywistym działaniem wersji. Opis i grafiki nie mogą sugerować oficjalnego partnerstwa bez podstawy.

W App access przygotować krótką instrukcję po angielsku: przykładowe QR udostępnione bez logowania, skanowanie, odsłuch, pauza lub wznowienie i ponowne skanowanie. Dołączyć wszystkie potrzebne zasoby i legalny, powtarzalny dostęp do funkcji zależnych od kont lub członkostwa. Nie zakładać, że recenzent ma prywatne Spotify Premium, wcześniejszą zgodę integracji lub wydrukowane karty. Własne konto Hiciarza nie istnieje, ale odtwarzanie jest funkcją ograniczoną dostępem do zewnętrznej usługi. [Dostęp do aplikacji podczas oceny](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en).

**Wynik etapu:** komplet materiałów oraz scenariusz, który osoba spoza projektu może wykonać bez kontaktu z autorem.

## Etap 6 Uruchomienie i odbiór bety

Najpierw przesłać pierwszy AAB do **Internal testing** ręcznie, skonfigurować Play App Signing i dodać SHA-1 podpisu Play do Spotify. Dodać listę pierwszych testerów oraz kanał zgłoszeń i przygotować link opt-in. Tester otwiera link na zaproszonym koncie Google, dołącza do testu i instaluje aplikację ze sklepu. Instalacja lokalnego APK nie sprawdza certyfikatu, pakowania ani dostarczania przez Play.

Po tym odbiorze skonfigurować automat aktualizacji internal. Sprawdzić drugi build z większym kodem wersji i instalację aktualizacji zachowującą ustawienia. Testowa aktualizacja ma pochodzić z commitu, którego kontrole CI zakończyły się sukcesem.

| Scenariusz | Kryterium odbioru |
| --- | --- |
| Czysta instalacja | Start bez wcześniejszych danych i konfiguracji deweloperskiej. |
| Aparat | Udzielenie, odmowa i ponowne udzielenie zgody; czytelna ścieżka dalszego działania. |
| Karty QR | Poprawna karta, nieznany utwór, błędny QR, kolejny skan, latarka i zoom. |
| Obsługa skanera | Odsłuch bez talii, pauza, kolejny skan i przełączanie Skaner–Opcje. |
| Odtwarzanie | Nowy uprawniony użytkownik spoza dotychczasowych kont testowych; utrata połączenia i powrót. |
| Spotify, jeżeli pozostaje | Instalacja z Play, właściwy certyfikat, świeża zgoda, brak Spotify, brak Premium i odmowa autoryzacji. |
| Cykl aplikacji | Tło, blokada ekranu, utrata procesu i odtworzenie stanu. |
| Urządzenia | Najstarszy wspierany Android, bieżące wersje, mały ekran, tablet, obrót, większy tekst i tryb ciemny; Fold, jeśli deklarowany. |
| Środowisko 16 KB | Skaner i odtwarzanie działają bez awarii bibliotek. |
| Aktualizacja | Instalacja kolejnej wersji z Play zachowuje dane i ustawienia. Migracja APK GitHub zachowuje się zgodnie z przyjętym planem. |
| Dokumenty i linki | Polityka i pomoc dostępne; generator otwiera właściwy widok. |

Uruchomić i ocenić Pre-launch report. Automatyczny raport uzupełnia testy ręczne, szczególnie tam, gdzie wymagane są kamera, QR i zewnętrzna aplikacja do muzyki. Zachować urządzenia, wersję AAB, wyniki i usunięte usterki.

Równolegle kończyć konfigurację **Closed testing**, aby możliwie szybko rozpocząć szerszą betę. Dla osobistego konta utworzonego po 13 listopada 2023 wymagane jest co najmniej **12 testerów zapisanych nieprzerwanie przez 14 dni** przed późniejszym złożeniem wniosku o dostęp do produkcji. Nie jest to okres oczekiwania na start closed i nie zastępuje go internal. Zorganizować realne użycie i feedback; samo spełnienie licznika nie oznacza automatycznej zgody Google. [Wymagania testów dla kont osobistych](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).

Praktycznie warto zrekrutować 15–20 osób, aby rezygnacja jednej nie zablokowała minimum. Prowadzić rejestr wersji, urządzeń, zgłoszeń i poprawek. Wniosek o produkcję pozostaje późniejszą decyzją; można kontynuować betę po zakończeniu wymaganego okresu.

**Wynik etapu:** działający link do bety, udane instalacje przez zaproszonych testerów, sprawdzone skanowanie i Spotify oraz potwierdzona aktualizacja z automatu. Dostęp do produkcji nie jest kryterium ukończenia tego etapu.

## Późniejszy etap: pierwsza publikacja produkcyjna

Poniższe kroki dotyczą przyszłej premiery publicznej i nie blokują uruchomienia internal ani closed beta.

1. Sprawdzić końcową listę gotowości poniżej, kraje i urządzenia objęte premierą.
2. Promować sprawdzony AAB z testów do produkcji. Jeżeli trzeba zmienić kod, zbudować nową wersję z większym `versionCode` i ponowić odpowiednie testy.
3. Jeżeli potrzebna jest kontrola dnia startu, po udostępnieniu wersji w closed testing sprawdzić dostępność Managed publishing i włączyć je przed zgłoszeniem produkcji. Google nie udostępnia tej funkcji przy pierwszym publikowaniu aplikacji; dostępność trzeba potwierdzić w konkretnym stanie Console. Przy planowaniu premiery zostawić co najmniej tydzień bufora na ocenę. [Kontrola momentu publikacji](https://support.google.com/googleplay/android-developer/answer/9859654?hl=en).
4. Sprawdzić Publishing overview, komplet deklaracji, opis i zasoby recenzenta, następnie wysłać wydanie do oceny.
5. Pierwsze wydanie produkcyjne udostępnić w wybranych krajach po akceptacji. **Nie planować debiutu jako rollout 10%**, ponieważ procentowe wdrażanie dotyczy aktualizacji; pierwsza produkcja obejmuje wszystkich uprawnionych użytkowników w wybranym zakresie. [Stopniowe wdrażanie](https://support.google.com/googleplay/android-developer/answer/6346149?hl=en).
6. Po pojawieniu się publicznej strony sprawdzić instalację przez zwykłe konto, skanowanie, odtwarzanie i linki. Opublikować odnośnik do sklepu na stronie projektu.

## Kolejne wydania i utrzymanie

Przez pierwsze 48 godzin codziennie sprawdzać Android vitals, awarie, ANR, feedback i działanie odtwarzania. Potem ustalić stały rytm kontroli i obsługi zgłoszeń. Metryki Play mogą pojawiać się z opóźnieniem, więc łączyć je z ręczną weryfikacją.

Aktualizacje przechodzą przez ten sam zestaw kontroli, internal i odpowiednie testy. Dla aktualizacji można zastosować stopniowe wdrożenie, np. 10% → 50% → 100%, po ocenie błędów i zgłoszeń. Przy regresji zatrzymać rollout, a poprawkę wydać z większym `versionCode`; zwykła aktualizacja nie obniża kodu do poprzedniego AAB. [Zasady staged rollout](https://support.google.com/googleplay/android-developer/answer/6346149?hl=en).

Po zmianie SDK, kont, telemetrii lub odtwarzania ponownie sprawdzić Data safety, politykę, warunki usług i dostęp recenzenta. Przed każdym wydaniem sprawdzić aktualne komunikaty Console, wymagania API i ostrzeżenia zależności.

## Kolejność pracy i warunki ukończenia

| Kolejność | Zadanie | Odpowiedzialny | Zależność |
| --- | --- | --- | --- |
| 1 | Zakres skanera i dodatkowych funkcji oraz weryfikacja warunków Spotify | Właściciel produktu | Zakres wpływa na opis, testy i ocenę integracji. |
| Równolegle | Konto Play, weryfikacja, kontakt i zakres krajów | Właściciel konta | Można zacząć od razu. |
| Równolegle | Audyt danych, materiałów i projekt polityki | Właściciel + programista | Finalizacja dla rzeczywistego zakresu AAB. |
| 2 | Podpisy, numeracja i workflow AAB | Programista + wydawca | Przed pierwszym uploadem. |
| 3 | Pierwszy internal: instalacja, certyfikat Play, Spotify i 16 KB | Testerzy + programista | Gotowy AAB i aktywne konto. |
| 4 | Automat po udanym CI na main i odbiór aktualizacji | Programista + wydawca | Pierwszy internal, uprawnienia API i skonfigurowany upload key. |
| Równolegle | Link do polityki, deklaracje i materiały sklepu | Programista + właściciel | Finalny zakres funkcji; wymagane przed closed. |
| 5 | Closed testing, rekrutacja i feedback | Wydawca + testerzy | Ukończona konfiguracja; osobna lista i link opt-in. |
| Później | Wniosek o produkcję, ocena Google i premiera | Wydawca | Osobna decyzja po testach. |

Pierwszy internal uruchomić po przygotowaniu konta, podpisanego AAB i podstawowym odbiorze, bez oczekiwania na zakończenie 14 dni. Ten okres ma znaczenie dopiero dla późniejszego wniosku produkcyjnego na nowym koncie osobistym i biegnie w closed testing. Weryfikacja nowego konta, pierwsza konfiguracja Play i odbiór Spotify są zależnościami terminu startu; czas samego uploadu nie określa całego harmonogramu.

### Lista gotowości do szybkiej bety internal

- [ ] Aktywne, zweryfikowane konto Play i utworzona aplikacja `pl.artifex.hiciarz`.
- [ ] Ustalony zakres skanera i warunki korzystania z integracji.
- [ ] Podpisany AAB z właściwym pakietem i wolnym kodem wersji; testy i lint przechodzą.
- [ ] Pierwszy upload i podpis Play skonfigurowane; właściwy SHA-1 wpisany w Spotify.
- [ ] Testerzy mają link opt-in i dostęp do instalacji na swoich kontach Google.
- [ ] Co najmniej dwie osoby spoza dotychczasowej konfiguracji deweloperskiej potwierdziły instalację, skan QR i odtwarzanie.
- [ ] Działa kanał zgłoszeń z numerem wersji, modelem telefonu i krokami odtworzenia problemu.
- [ ] Automat po udanym CI na main publikuje wyłącznie internal przy zmianie wejść aplikacji; zachowuje artefakt oraz metadane.
- [ ] Kolejna aktualizacja przez Play zachowuje ustawienia i poprawnie uruchamia skaner.

### Dodatkowo przed closed beta

- [ ] Ukończona karta sklepu, polityka prywatności, Data safety i pozostałe wymagane deklaracje.
- [ ] Zasoby i dostęp recenzenta są powtarzalne dla osoby spoza projektu.
- [ ] Lista i link do closed są gotowe; testerzy wypisali się z internal przed dołączeniem do closed.
- [ ] Rozpoczęto zbieranie feedbacku i, jeśli planowana jest późniejsza produkcja na nowym koncie osobistym, ciągły udział wymaganej grupy przez 14 dni.

### Lista gotowości do produkcji

- [ ] Docelowe odtwarzanie jest zgodne z uzyskanymi prawami i warunkami usług.
- [ ] Konto jest zweryfikowane i ma dostęp do produkcji.
- [ ] Wybrano podpis Play i plan migracji instalacji testowych.
- [ ] AAB ma właściwy pakiet, upload signature, wersję i zamkniętą konfigurację produkcyjną.
- [ ] Testy, lint, kontrola 16 KB, odbiór na urządzeniu i raport Play nie wskazują nierozwiązanych problemów blokujących wydanie.
- [ ] Instalacja z Play działa dla użytkownika spoza dotychczasowego środowiska testowego.
- [ ] Polityka działa w sieci i jest dostępna w aplikacji; Data safety uwzględnia SDK.
- [ ] App content, rating, odbiorcy i deklaracje uprawnień odpowiadają gotowemu AAB.
- [ ] Recenzent ma komplet zasobów i dostęp do głównych funkcji.
- [ ] Opisy, ikona, grafika i zrzuty odpowiadają natywnej wersji Androida.
- [ ] Zachowano artefakty, mapowanie, certyfikaty publiczne i wyniki odbioru wydania.
- [ ] Ustalono kraje, moment publikacji i osobę reagującą na błędy po premierze.

**Etap Google Play jest ukończony**, gdy zaproszeni testerzy instalują Hiciarza przez Google Play, skanują QR i uruchamiają muzykę, a kolejny sprawdzony merge dostarcza aktualizację internal przez automat. Obecny cel Firebase ma osobne kryterium odbioru opisane na początku planu. Publiczna premiera pozostaje osobnym etapem.
