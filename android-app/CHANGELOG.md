# Changelog Androida

Zmiany kolejnych wersji aplikacji Android. Opis GitHub Release jest pobierany z sekcji odpowiadającej publikowanej wersji.

## [Unreleased]

<!-- Zapisuj tutaj zmiany, które nie trafiły jeszcze do sekcji konkretnej wersji. -->

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
