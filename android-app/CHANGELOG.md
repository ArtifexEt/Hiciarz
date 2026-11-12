# Changelog Androida

Zmiany kolejnych wersji aplikacji Android. Opis GitHub Release jest pobierany z sekcji odpowiadającej publikowanej wersji.

## [Unreleased]

<!-- Zapisuj tutaj zmiany, które nie trafiły jeszcze do sekcji konkretnej wersji. -->

## [0.2.0-alpha.1] - 2026-11-12

### Gra i obsługa

- Bingo prowadzi rundę: losowanie pytania, jawne uruchomienie skanera, odtworzenie fizycznej karty, odkrycie odpowiedzi i następna runda. Nie losuje utworów z biblioteki zamiast kart.
- Przycisk plansz otwiera bezpośrednio generator PDF w webie, z wybranym poziomem i językiem. Plansze zaznacza się na papierze.
- Oś czasu i Zgadnij są osobnymi grami bez drukowanych kart, z decyzją gracza, sprawdzeniem odpowiedzi i wynikiem. Stan rozgrywki jest zapisywany na urządzeniu.
- Automatyczna pauza jest domyślnie wyłączona, także przy aktualizacji ze starszego domyślnego ustawienia. Świadomie wybraną opcję aplikacja zachowuje.
- Z Androida usunięto kreator kart i formularz Client ID. Kreator pozostaje w web/PWA, a użytkownik APK korzysta z dołączonej konfiguracji Spotify. Nie ma selektora głośników.

### Aparat i wygląd

- Naprawiono uruchamianie ML Kit w zoptymalizowanym APK: R8 zachowuje konstruktory komponentów odczytywanych przez refleksję. Klatki aparatu pozostają otwarte do zakończenia analizy, a spóźniony wynik po anulowaniu jest odrzucany.
- Nowy natywny interfejs ma stałą nawigację, kompaktowe aktywne rundy i kontekstowe „Jak grać”. Wybór gry, talii lub poziomu mieści się w dolnym panelu.
- Dziewięć skórek może włączać się automatycznie z QR. Ustawienia pozwalają wybrać własny wygląd i wyłączyć automatyczną zmianę.
- Układ dostosowuje się do telefonu, ekranów zewnętrznego i wewnętrznego Folda oraz poziomego zgięcia. Obsługuje PL/EN, tryb ciemny i większy tekst. README zawiera aktualne zrzuty.

### Budowanie i weryfikacja

- Gradle automatycznie pobiera przypięty i sprawdzony Spotify App Remote SDK. Prywatny podpis i hasła pozostają w GitHub Secrets; podpis zachowuje zgodność aktualizacji APK.
- Opis wydania jest generowany z changeloga. Actions pozwala obejrzeć plan przed publikacją i sprawdza rosnący numer wersji oraz podpis gotowego APK.
- CI obejmuje reguły gier, odtwarzanie, zapis stanu, układy telefonu/Folda i aparat. Osobny test odczytuje rzeczywisty QR, obraca ekran i ponownie otwiera kamerę w zoptymalizowanym APK.
- Weryfikacja lokalna: 29 testów JVM, 20 testów natywnego UI i 2 testy kamery w APK release. Widoki i kamera były sprawdzane na emulatorach; fizyczny Fold7 i autoryzacja świeżego konta Spotify wymagają osobnej próby.

## [0.1.0-alpha.3] - 2026-11-12

### Budowanie i wydania

- Spotify App Remote jest pobierany automatycznie przez Gradle z oficjalnego repozytorium Spotify, z przypiętym commitem i weryfikacją SHA-256. Biblioteka korzysta z cache Gradle i nie jest już przechowywana w repozytorium Hiciarza.
- Usunięto zbędną kopię publicznego certyfikatu PEM z repozytorium i rozszerzono ignorowanie lokalnych plików podpisu. Klucz podpisujący pozostał ten sam, dzięki czemu zachowana jest zgodność aktualizacji APK.
- GitHub Releases otrzymują opis zmian z changeloga dla publikowanej wersji oraz odnośnik do porównania z poprzednim wydaniem Androida.
- Dodano podgląd planu i opisu wydania w GitHub Actions oraz weryfikację wersji i rosnącego `versionCode` przed budowaniem APK.

## [0.1.0-alpha.2] - 2026-11-12

### Poprawki

- Globalny przycisk wznawiania odtwarza bieżący utwór Spotify niezależnie od wybranej zakładki.
- Sterowanie na karcie odtwarza wskazany na niej utwór.
- Muzyka uruchomiona poza grą nie jest zatrzymywana przez licznik fragmentu utworu.
- Ponowny wybór aktywnej talii zachowuje trwającą rundę Bingo.

## [0.1.0-alpha.1] - 2026-11-11

### Pierwsze wydanie testowe

- Natywna aplikacja Android z obsługą języka polskiego i angielskiego.
- Skanowanie kodów QR z drukowanych kart.
- Import własnych talii z plików JSON i CSV.
- Gra Bingo i odtwarzanie utworów przez Spotify App Remote.
