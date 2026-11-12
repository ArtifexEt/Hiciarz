# Changelog Androida

Zmiany kolejnych wersji aplikacji Android. Opis GitHub Release jest pobierany z sekcji odpowiadającej publikowanej wersji.

## [Unreleased]

- Uproszczono aplikację do skanowania kart i sterowania Spotify. Usunięto odkrywanie danych karty, ustawienie ukrywania odpowiedzi, zasady gry oraz ręczne wklejanie kodów i linków.
- Pomoc opisuje tworzenie nowych kart i prowadzi do Hiciarza oraz kreatora na GitHub Pages.
- Dolne menu ma kompaktowy układ dwóch pozycji z ikonami skanera i opcji; na dużym ekranie nawigacja pozostaje z boku.
- Android działa bez talii: usunięto dołączane przykłady, import i przechowywanie talii oraz wyszukiwanie i odkrywanie odpowiedzi. Skaner odczytuje utwór Spotify i skórkę bezpośrednio z QR.
- Przygotowano automatyczne wydania Internal testing po udanym CI na `main`, tylko gdy zmienią się wejścia aplikacji. Jednorazowa konfiguracja aktywnego konta Play, podpisu i dostępu API jest opisana w instrukcji Androida.

## [0.2.0-alpha.7] - 2026-11-12

- Zmieniono Client ID integracji Spotify na identyfikator nowej aplikacji Hiciarz. Po aktualizacji APK połącz aplikację ze Spotify ponownie.

## [0.2.0-alpha.6] - 2026-11-12

- Usunięto tryb Bingo z Androida: ekran, losowanie kategorii, rundy, opcje i pomoc. Nawigacja zawiera Skaner i Opcje, a Bingo ma osobną aplikację webową w repozytorium ArtifexEt/Bingo.
- Aktualizacja pomija stary zapis trybów gry i uruchamia skaner, zachowując talie, ustawienia i skórki kart.

## [0.2.0-alpha.5] - 2026-11-12

- Ukryto systemowy pasek statusu z zegarem i ikonami powiadomień na wszystkich ekranach, także w panelach i dialogach. Tryb pełnoekranowy jest przywracany po powrocie ze Spotify; dolna nawigacja systemowa jest dostępna. Android nadal może chwilowo odsłonić pasek przy wskaźniku aparatu oraz pozwala rozwinąć powiadomienia gestem.
- Pauza i wznowienie odtwarzania są dostępne bezpośrednio na obrazie karty. Przycisk „Skanuj nową” znajduje się pod nią; karty bez zapisanych danych utworu działają bez aktualizowania biblioteki aplikacji.
- Bingo ma układ losowania znany z wersji web: duże pole kategorii, pięć pastelowych kolorów i wyróżniony przycisk „Losuj kategorię” pod wynikiem. Kolejne losowanie jest dostępne także po skanie, bez zmiany utworu i numeru rundy. „Plansze do pobrania” są widoczne bez otwierania opcji.
- Skórki zmieniają kolorystykę całej aplikacji: tła, panele, przyciski i nawigację. Dziewięć palet odpowiada wersji web i ma warianty ciemne. Wybór w Opcjach i motyw zapisany w QR działają również bez danych utworu.
- Przywrócono animację skórki z rybkami: kołyszące się ozdoby i migoczące lampki. Motyw jest odczytywany z QR także dla utworów nieznanych aplikacji.
- Skaner zachowuje kwadratowe proporcje na tablecie i rozłożonym ekranie. Pasek odtwarzania w Opcjach uwzględnia dolny obszar nawigacji systemowej.
- Poprawiono polski opis wymagań Spotify po rozłączeniu i usunięto z panelu połączenia komunikat o wydaniu testowym.

## [0.2.0-alpha.4] - 2026-11-12

- Przebudowano skaner i Bingo: kwadratowe karty z pełną grafiką, kompaktowe odtwarzanie, pytanie jako główny element rundy i jeden wyróżniony przycisk na każdym etapie. Stała oprawa aplikacji pozostaje niezależna od skórek kart; opcje pomocnicze zajmują mniej miejsca.
- Odkrywanie odpowiedzi jest dostępne dla kart z pasującymi danymi. Dla pozostałych aplikacja kieruje do odpowiedzi na wydruku zamiast pokazywać pusty awers.
- Aplikacja otwiera się na skanerze. Nawigacja skupia się na Skanerze, Bingo i Opcjach; biblioteka talii pozostaje w PWA, a gry bez kart są na razie wyłączone w Androidzie. Wcześniejsze dane na urządzeniu są zachowane.
- Rewersy korzystają z tych samych grafik co PWA, włącznie ze skórką z rybką Mikołajem. Odkrywanie kart ma płynny obrót 3D.
- Połączenie Spotify działa także z otwartego panelu odtwarzania. Rozłączenie od razu aktualizuje panel, a trwające łączenie można anulować. Poprawiono odświeżanie stanu po powrocie do aplikacji i zachowanie ręcznego rozłączenia przy odtworzeniu ekranu.

## [0.2.0-alpha.3] - 2026-11-12

### Obsługa i wygląd

- Wybór gry, talii i skórki otwiera się od razu w rozwiniętym panelu. Start Bingo zajmuje mniej miejsca, a aparat wykorzystuje wysokość swojego panelu na tablecie i rozłożonym ekranie.
- Skaner i Bingo zachowują osobne skórki QR. Przełączanie zakładek i trybów nie przenosi wyglądu jednej karty na drugą; zapis Bingo zachowuje motyw po ponownym uruchomieniu.
- Powrót z gry bez kart do trwającego skanowania Bingo ponownie przygotowuje aparat i zachowuje pytanie.
- Pomoc „Zgadnij” opisuje także rozpoznawanie tytułu i wykonawcy oraz krótsze talie.
- Uaktualniono zrzuty ekranów, dokumentację przebiegu Bingo na telefonie i tablecie oraz stan realizacji wcześniejszych uwag.

### Weryfikacja

- Trzy nowe regresje sprawdzają niezależność skórek, zapis rozgrywki, ręczny wybór wyglądu i powrót do skanowania Bingo.
- Próba aparatu w zoptymalizowanym APK obejmuje pierwsze udzielenie zgody oraz sprawdzenie skórki Disco po odczycie QR.

## [0.2.0-alpha.2] - 2026-11-12

### Bingo na większym ekranie

- W układzie dwóch paneli losowanie pytania od razu przygotowuje aparat, a pełna wylosowana kategoria pozostaje widoczna obok skanera oraz podczas odsłuchu i odkrywania odpowiedzi.
- „Następna runda” losuje nowe pytanie i ponownie uzbraja skaner. Telefon zachowuje osobny krok „Skanuj kartę”.
- Anulowanie skanowania i zmiana rozmiaru okna nie uruchamiają aparatu samoczynnie. Wynik ze starej rundy nie może trafić do nowej.
- Zaktualizowano instrukcję i zrzuty widoku tabletowego. Układ nadal uwzględnia pionowy oraz poziomy zawias Folda.

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
