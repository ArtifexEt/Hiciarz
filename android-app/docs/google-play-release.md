# Publikacja Hiciarza w Google Play

Stan wymagań: 12 listopada 2026. Zakres: natywna aplikacja z `android-app/`, pakiet `pl.artifex.hiciarz`. Podstawowy przebieg to zeskanowanie kodu QR i uruchomienie wskazanego utworu w aplikacji Spotify użytkownika. Android zawiera Skaner i Opcje. Karty przygotowuje się w webowym Hiciarzu. [Bingo i generator plansz](https://artifexet.github.io/Bingo/) mają osobne [repozytorium](https://github.com/ArtifexEt/Bingo).

**Celem publikacji jest udostępnienie skanera QR uruchamiającego muzykę.** Techniczna podstawa Androida i testowe wydania APK już istnieją. Do przygotowania pozostają: wydanie AAB, konfiguracja Play Console, prywatność, materiały sklepu i testy przez Google Play. Warunki integracji Spotify wymagają weryfikacji względem pełnego zakresu skanera; nie ustalono, że publikacja Hiciarza jest niedopuszczalna. Przygotowania techniczne mogą przebiegać równolegle z tą weryfikacją.

## Gotowe elementy i braki

| Obszar | Stan projektu | Działanie przed publikacją |
| --- | --- | --- |
| Android | Kotlin i Jetpack Compose, `minSdk=26`, `targetSdk=37` | Sprawdzić gotowy AAB w Play i zachowanie na obsługiwanych wersjach Androida. |
| Pakiet | `pl.artifex.hiciarz` | Potwierdzić docelową nazwę pakietu przed pierwszym uploadem. |
| Wydania | Workflow `android-release.yml` publikuje testowe APK w GitHub Releases | Przygotować osobny proces AAB do Play. |
| Podpis | Obsługa prywatnego keystore; release lokalny ma fallback do debug key | W procesie Play wymusić podpis produkcyjny i zweryfikować certyfikat AAB. |
| Jakość | Testy jednostkowe, lint, testy UI i skanera release w CI | Dodać odbiór instalacji z Play na rzeczywistym urządzeniu. |
| Odtwarzanie | Skan QR uruchamia utwór przez Spotify App Remote; potrzebne Spotify i Premium | Sprawdzić podpis Play i nowego użytkownika oraz warunki integracji dla pełnego zakresu aplikacji. |
| Prywatność | Kamera przetwarzana lokalnie; ML Kit w zależnościach | Audyt SDK, publiczna polityka oraz link w aplikacji, Data safety. |
| Karta sklepu | Zrzuty Androida są w `docs/screenshots/` | Wybrać aktualne zrzuty, przygotować ikonę, grafikę i opisy. |

Podstawa w repo: [konfiguracja aplikacji](../app/build.gradle.kts), [manifest](../app/src/main/AndroidManifest.xml), [testy CI](../../.github/workflows/ci.yml), [wydania APK](../../.github/workflows/android-release.yml), [instrukcja Androida](../README.md).

Od 31 sierpnia 2026 nowe aplikacje mobilne i ich aktualizacje wymagają co najmniej API 36. Obecne `targetSdk=37` spełnia ten próg; nie ma potrzeby obniżania go do wartości z wcześniejszych poradników. [Wymagania target API Google](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en).

## Etap 0 Zakres aplikacji i integracja Spotify

Podstawowy przebieg Hiciarza jest prosty: aparat odczytuje QR, aplikacja rozpoznaje wskazany utwór i zleca jego odtworzenie Spotify. Spotify App Remote służy właśnie do sterowania zewnętrzną aplikacją Spotify, w tym uruchamiania utworów. Sam techniczny mechanizm skanowania nie przesądza, czy cały produkt stanowi grę w rozumieniu warunków usługi. [Spotify Android SDK](https://developer.spotify.com/documentation/android).

Z Androida usunięto tryb Bingo wraz z kategoriami, rundami, pomocą i zapisami tego trybu. Nawigacja zawiera Skaner oraz Opcje. Skaner zachowuje odtwarzanie, skórki i możliwość ukrywania lub odkrywania danych karty, gdy są dostępne lokalnie. Taki zakres należy przedstawić w zgłoszeniu i instrukcji recenzenta.

Spotify Developer Policy, sekcja III punkt 2, zawiera zapis: „Do not create a game, including trivia quizzes”. Usunięcie Bingo upraszcza produkt, ale nie stanowi samo w sobie potwierdzenia zgodności pozostałych funkcji skanera z warunkami Spotify. Ocena dotyczy faktycznego działania wydania, także ukrywania i odkrywania danych karty. [Spotify Developer Policy](https://developer.spotify.com/policy).

HITSTER jest konkretnym przykładem produktu łączącego fizyczne karty, skan QR i odtwarzanie Spotify. Jego wykonawca potwierdza ten przebieg. Publiczny opis nie wyjaśnia jednak podstawy umownej tej integracji, dlatego nie zakładamy ani specjalnej umowy HITSTER, ani automatycznie takich samych uprawnień Hiciarza. [Opis aplikacji HITSTER autorstwa Q42](https://www.q42.nl/en/work/hitster-app).

Przed publiczną dystrybucją sprawdzić warunki dla faktycznego zakresu aplikacji. Jeżeli potrzebna jest interpretacja Spotify, przedstawić dokładny scenariusz: własne konto i telefon użytkownika, QR wskazujący utwór, sterowanie App Remote, brak dystrybucji nagrań oraz sposób pokazywania danych zeskanowanej karty. Samo przejście z SDK na linki lub osadzenia nie potwierdza zgodności.

Niezależnie sprawdzić dostęp App Remote na świeżych kontach. Dokumentacja ograniczeń Development Mode dotyczy Web API; nie należy automatycznie przenosić jego limitów na App Remote ani zakładać, że App Remote je omija. [Spotify Quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes).

**Wynik etapu:** ustalony zakres pierwszego AAB, rzetelny opis skanera, Opcji i odtwarzania oraz ocena warunków integracji. Zachowujemy Spotify jako podstawę przygotowań; ewentualną zmianę źródła audio rozważyć dopiero na podstawie konkretnych ustaleń. Konto Play, podpisy, prywatność i budowanie można przygotowywać równolegle.

## Etap 1 Konto i zakres premiery

Odpowiedzialny: właściciel aplikacji.

1. Sprawdzić, czy istnieje już konto Google Play Console, jaki ma typ i czy uzyskało dostęp do produkcji.
2. W razie zakładania konta wybrać typ zgodny z faktycznym wydawcą, opłacić rejestrację i przejść weryfikację. Opłata jest jednorazowa i wynosi 25 USD; konto osobiste może wymagać także weryfikacji dostępu do urządzenia Android. [Rejestracja Play Console](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en).
3. Dla organizacji przygotować m.in. dane firmy, stronę i numer D-U-N-S. Google podaje, że uzyskanie numeru może potrwać do 30 dni. Ustalić także, które dane wydawcy będą publiczne. [Informacje wymagane przy rejestracji](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en).
4. Ustalić nazwę wydawcy, kontakt pomocy i prywatności, kraje, języki, model cenowy i grupę wiekową. Założenie do planowania pierwszego wydania: aplikacja bezpłatna, bez reklam i zakupów, początkowo Polska; właściciel potwierdza te wybory.
5. Utworzyć aplikację w Play Console i potwierdzić `pl.artifex.hiciarz`. Wybrać aplikację lub grę zgodnie z finalną funkcją, domyślny język polski i planowaną cenę. [Tworzenie aplikacji w Play](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en).

**Wynik etapu:** zweryfikowane konto, utworzona aplikacja i ustalone parametry premiery.

## Etap 2 Podpisy i numeracja

Odpowiedzialni: właściciel aplikacji i osoba przygotowująca wydanie.

Play App Signing rozdziela **upload key**, którym podpisujemy przesyłany AAB, od **app signing key**, którym Google podpisuje APK instalowane przez użytkowników. Odciski do integracji zewnętrznych muszą odpowiadać certyfikatom rzeczywiście dostarczanych APK. [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en).

1. Przed pierwszą dystrybucją wybrać docelowy app signing key. Zalecany wariant dla nowej aplikacji: klucz zarządzany przez Google i osobny upload key przechowywany przez wydawcę.
2. Rozstrzygnąć migrację dotychczasowych testowych APK. Przy innym podpisie aplikacja z Play może wymagać odinstalowania wersji GitHub, co usuwa lokalne dane. Jeżeli konieczna jest ciągłość aktualizacji, zaplanować zgodny podpis przed pierwszą dystrybucją; nie przyjmować automatycznie klucza testowego jako docelowego. [Podpisy dla różnych kanałów dystrybucji](https://developer.android.com/guide/app-bundle/faq).
3. Upload keystore i hasła przechowywać poza repozytorium; w CI wykorzystać osobne środowisko Play i sekrety. Zarchiwizować kopię klucza, publiczne odciski i instrukcję odzyskania dostępu.
4. Dla wariantu ze Spotify dodać w Spotify Dashboard pakiet `pl.artifex.hiciarz`, redirect `hiciarz://spotify-callback` i SHA-1 certyfikatu lub certyfikatów Play App Signing używanych na wspieranych urządzeniach. Odcisk upload key nie wystarczy. Zachować także odciski używanych wydań testowych. [Konfiguracja Spotify Android](https://developer.spotify.com/documentation/android/tutorials/getting-started).
5. Wyznaczać `versionCode` z jednego rejestru dla GitHub i wszystkich torów Play. Każdy nowy build przesyłany do Play otrzymuje wolny, większy kod. Promocja już przesłanego AAB między torami zachowuje jego kod. Obecny workflow uwzględnia historię GitHub, więc wymaga rozszerzenia o Play. Domyślny kod z Gradle nie jest źródłem prawdy dla następnego wydania.

**Wynik etapu:** wybrane klucze, sprawdzony plan migracji, konfiguracja usług i numer następnego wydania.

## Etap 3 Prywatność i deklaracje Play

Odpowiedzialni: właściciel aplikacji oraz osoba znająca przepływy danych w kodzie.

### Inwentaryzacja danych

| Element | Zachowanie obecnego kodu | Co potwierdzić dla wydawanego AAB |
| --- | --- | --- |
| Kamera i QR | CameraX przekazuje klatki do lokalnego skanera ML Kit; brak własnego uploadu obrazu | Scalony manifest, brak zapisu lub wysyłki klatek, zachowanie po odmowie uprawnienia. |
| Ustawienia i karty | SharedPreferences, dane zeskanowanej karty i prywatne pliki talii; backup wyłączony | Jak użytkownik usuwa dane i co znika przy odinstalowaniu. |
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
5. Sprawdzić prawa do nazwy, grafik, fontów i dołączanych talii. Do pakietu trafiają JSON z `web/examples/playlists/` oraz grafiki motywów. Zachować informacje o licencjach i usunąć materiały, których dystrybucji nie można uzasadnić.

**Wynik etapu:** działająca polityka w sieci i aplikacji, uzgodnione formularze oraz lista wykorzystanych materiałów i licencji.

## Etap 4 Powtarzalne wydanie AAB

Odpowiedzialny: osoba przygotowująca wydanie. Poniższy proces należy wdrożyć; istniejący workflow testowych APK nie realizuje publikacji w Play.

### Budowanie

Przygotować osobny workflow, np. `android-play-release.yml`, uruchamiany ręcznie z wersją i commitem. Najpierw ma generować artefakty do sprawdzenia. Pierwsze przesłanie AAB wykonać ręcznie w Console; automatyzację uploadu do toru internal można dodać po sprawdzeniu tego procesu.

Wymagane środowisko: JDK 17, Gradle Wrapper z repo i Android SDK zgodne z projektem. Pakowane talie i grafiki pochodzą również z `web/`, dlatego checkout musi obejmować te zasoby.

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

## Etap 5 Karta sklepu i dostęp recenzenta

Odpowiedzialni: właściciel produktu i osoba przygotowująca materiały.

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

W App access przygotować krótką instrukcję po angielsku: przykładowe QR udostępnione bez logowania, skanowanie, odsłuch, pauza lub wznowienie, odkrycie danych karty i ponowne skanowanie. Dołączyć wszystkie potrzebne zasoby i legalny, powtarzalny dostęp do funkcji zależnych od kont lub członkostwa. Nie zakładać, że recenzent ma prywatne Spotify Premium, wcześniejszą zgodę integracji lub wydrukowaną talię. Własne konto Hiciarza nie istnieje, ale odtwarzanie jest funkcją ograniczoną dostępem do zewnętrznej usługi. [Dostęp do aplikacji podczas oceny](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en).

**Wynik etapu:** komplet materiałów oraz scenariusz, który osoba spoza projektu może wykonać bez kontaktu z autorem.

## Etap 6 Testy przez Google Play

Najpierw przesłać AAB do **Internal testing** i zainstalować go ze sklepu na fizycznym telefonie. Instalacja lokalnego APK nie sprawdza certyfikatu, pakowania ani dostarczania przez Play.

| Scenariusz | Kryterium odbioru |
| --- | --- |
| Czysta instalacja | Start bez wcześniejszych danych i konfiguracji deweloperskiej. |
| Aparat | Udzielenie, odmowa i ponowne udzielenie zgody; czytelna ścieżka dalszego działania. |
| Karty QR | Poprawna karta, nieznany utwór, błędny QR, kolejny skan, latarka i zoom. |
| Obsługa skanera | Odsłuch, pauza, odkrycie danych karty, kolejny skan i przełączanie Skaner–Opcje. |
| Odtwarzanie | Nowy uprawniony użytkownik spoza dotychczasowych kont testowych; utrata połączenia i powrót. |
| Spotify, jeżeli pozostaje | Instalacja z Play, właściwy certyfikat, świeża zgoda, brak Spotify, brak Premium i odmowa autoryzacji. |
| Cykl aplikacji | Tło, blokada ekranu, utrata procesu i odtworzenie stanu. |
| Urządzenia | Najstarszy wspierany Android, bieżące wersje, mały ekran, tablet, obrót, większy tekst i tryb ciemny; Fold, jeśli deklarowany. |
| Środowisko 16 KB | Skaner i odtwarzanie działają bez awarii bibliotek. |
| Aktualizacja | Instalacja kolejnej wersji z Play zachowuje dane i ustawienia. Migracja APK GitHub zachowuje się zgodnie z przyjętym planem. |
| Dokumenty i linki | Polityka i pomoc dostępne; generator otwiera właściwy widok. |

Uruchomić i ocenić Pre-launch report. Automatyczny raport uzupełnia testy ręczne, szczególnie tam, gdzie wymagane są kamera, QR i zewnętrzna aplikacja do muzyki. Zachować urządzenia, wersję AAB, wyniki i usunięte usterki.

Następnie przejść do **Closed testing**. Dla osobistego konta utworzonego po 13 listopada 2023 wymagane jest co najmniej **12 testerów zapisanych nieprzerwanie przez 14 dni** przed złożeniem wniosku o dostęp do produkcji. Nie zastępuje tego test internal. Zorganizować realne użycie i feedback; samo spełnienie licznika nie oznacza automatycznej zgody Google. Dla innych kont sprawdzić wymagania widoczne w Console. [Wymagania testów dla kont osobistych](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).

Praktycznie warto zrekrutować 15–20 osób, aby rezygnacja jednej nie zablokowała minimum. Prowadzić prosty rejestr zgłoszeń i poprawek, a po wymaganym okresie złożyć wniosek o produkcję z opisem testów.

**Wynik etapu:** testy bez błędów blokujących główną funkcję i dostęp do produkcji przyznany przez Play.

## Etap 7 Pierwsza publikacja

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
| 3 | Link do polityki, poprawki produktu i materiały sklepu | Programista + właściciel | Finalny zakres funkcji. |
| 4 | Internal, urządzenia, certyfikat i 16 KB | Testerzy + programista | Gotowy AAB. |
| 5 | Closed testing i wniosek o produkcję | Wydawca + testerzy | Ukończona konfiguracja; wymagania zależne od konta. |
| 6 | Ocena Google, premiera i kontrola instalacji | Wydawca | Spełnione wszystkie kryteria. |

Dla nowego konta osobistego harmonogram musi zawierać co najmniej 14 dni ciągłego udziału wymaganej grupy, czas weryfikacji i ocenę Google. Przygotowania oprzeć na obecnym skanerze i integracji Spotify. Przed potwierdzeniem daty publicznej premiery zamknąć testy, deklaracje oraz ocenę warunków integracji dla funkcji zawartych w AAB.

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

Proces jest ukończony, gdy Hiciarz ma publiczną stronę Google Play, instaluje się na wspieranym urządzeniu ze zwykłego konta i poprawnie uruchamia muzykę po skanie QR. Opcje, skórki i wyświetlanie danych karty również muszą przejść odpowiednie testy.
