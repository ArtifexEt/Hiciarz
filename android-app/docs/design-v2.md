# Android — projekt drugiej wersji interfejsu

To aplikacja do wspólnej gry przy muzyce: ekran ma pomóc rozpocząć turę, zachować tajemnicę utworu i rozstrzygnąć odpowiedź. Tworzenie kart pozostaje w webie.

Rozpatrzone układy:
- Pełny odtwarzacz na każdym ekranie: efektowny, ale chowa zasady i wybór gry.
- Biblioteka kafli podobna do serwisów muzycznych: znajoma, lecz nie pokazuje przebiegu tury.
- Kompaktowa nawigacja + wyrazista karta roku + aktualny etap tury: wybrany kierunek.

Znak rozpoznawczy to bilet z rokiem, nacięciami i wzorem skórki karty. Charakter jest skupiony w obszarze gry. Biblioteka i ustawienia używają prostych wierszy; ekran skanowania oddaje główne miejsce aparatowi. Połączenie Spotify zajmuje panel odtwarzania, a nie połowę skanera.

Paleta bazowa: mgła #F1F0F6, tusz #222433, śliwka #42334F, jasny liliowy #EEE4F4, papier biletu #EBD59A, winyl #382A24. Skórka odczytana z QR zmienia kartę i akcent interfejsu. Barlow Condensed służy latom i tytułom gry; Noto Sans obsługuje treść i przyciski.

Telefon i zewnętrzny ekran Folda: dolna nawigacja, jeden czytelny etap, akcje w zasięgu kciuka. Rozłożony Fold: boczna nawigacja, karta/tura w jednym panelu i oś czasu lub ustawienia rundy w drugim. Podział bierze pod uwagę rzeczywistą szczelinę zawiasu z WindowManager. W trybie tabletop aparat i akcje są rozdzielone poziomym zgięciem.

Kontrola: 360 dp, ekran zewnętrzny Fold7 około 410 dp, ekran wewnętrzny około 750 dp; duży tekst, tryb ciemny, PL/EN, wszystkie dziewięć skórek. Minimalny obszar dotyku 48 dp. „Jak grać” jest dostępne z każdego trybu i ustawień. Kontekstowe zasady rozpoczynają się od wybranego trybu, a pozostałe tematy są pod nimi lub w drugiej kolumnie.

Bingo zachowuje reguły PWA: prowadzący losuje pytanie, jawnie uruchamia skaner, skanuje kartę i odtwarza utwór. Gracze korzystają z papierowych plansz. Przycisk „Plansze do pobrania” otwiera generator PDF z wybranym poziomem i językiem. Oś czasu oraz Zgadnij są osobnymi grami bez kart.

Panel Spotify udostępnia połączenie i transport. Nie pokazuje wyboru urządzenia ani konfiguracji Client ID. Ustawienie skórki wybiera jeden z dziewięciu wzorów lub automatycznie stosuje wzór zapisany w QR. Brak skórki w QR wraca do ustawienia domyślnego.

## Ocena faktycznych ekranów i druga iteracja

Pierwszy komplet obejmował 19 zrzutów z uruchomionej aplikacji na emulatorze, a nie makiety. Oceniono widok startowy, Bingo przed i po skanie, Oś czasu, aparat, bibliotekę, zasady, ustawienia, wybór skórek, PL/EN, tryb ciemny, większy tekst oraz obie pozycje zgięcia.

- Na ekranie startowym wybrany segment wystarcza do nazwania trybu. Usunięto drugi tytuł i przycisk zasad powtarzający „?” w pasku aplikacji.
- Aktywna gra pokazuje kompaktowy nagłówek. „Zmień grę” otwiera jeden arkusz z trybem, talią lub poziomem i restartem. Oś czasu na telefonie jest bezpośrednio przed decyzją, przy mniejszej karcie utworu.
- Podczas skanowania Bingo zostają pytanie, aparat, ręczny kod i powrót. Poziom oraz legenda planszy są częścią przygotowania gry. W szerokim oknie karta i działania zajmują osobne panele.
- Przy poziomym, rozdzielającym zgięciu nawigacja przechodzi na dół, aby żaden przycisk nie znalazł się na zawiasie. Test sprawdza granice obu paneli i nawigacji.
- Powiększony tekst ujawnił przycinaną nazwę zakładki ustawień. Krótkie „Opcje” zachowuje rozmiar wybrany przez użytkownika. Pełny tytuł ekranu pozostaje „Ustawienia”.
- Wzory miniatur otrzymały przycinanie do granic elementu. Zapisywanie zrzutów czeka na zamknięcie klawiatury i wyrenderowanie okna, aby nie dokumentować klatki przejściowej.

Testy geometrii wykorzystują prawdziwy strumień WindowManager z publikowaną pozycją zgięcia. Nie zastępują sprawdzenia aparatu i odtwarzania na fizycznym Galaxy Fold7.

## Końcowa weryfikacja — 12 listopada 2026

Po drugiej iteracji uruchomiono ponownie pełny scenariusz natywny: **20/20 testów UI** i 20 zrzutów. Osobno **2/2 próby aparatu w zoptymalizowanym APK** potwierdziły odczyt prawdziwego QR przez CameraX/ML Kit, obrót i ponowne otwarcie skanera. Odczytana karta zastosowała skórkę Disco, a po odkryciu pokazała rok i dane utworu z talii.

Przejrzano kompaktową rundę Bingo, Oś czasu z decyzją i planszą w jednym widoku telefonu, większy tekst z krótką zakładką „Opcje”, oba położenia zawiasu, przycięte miniatury biblioteki oraz kontekstowe zasady. Arkusze wyboru gry i wszystkich dziewięciu skórek dodatkowo sprawdzono ręcznie, zapisując pełne obrazy przez `adb screencap` po odczytaniu hierarchii interfejsu. Galeria w README korzysta z wybranych, sprawdzonych plików PNG bez przerabiania wyglądu aplikacji.

W tych testach nie uczestniczyło konto Spotify ani fizyczny Fold7. Kontrolę odtwarzania i autoryzacji należy potwierdzić na urządzeniu z zainstalowanym Spotify.

Źródła projektu:
- [Oficjalne ekrany HITSTER](https://play.google.com/store/apps/details?id=nl.jumbo.hitster): jedna główna akcja odtwarzania, następna karta, zasady na ekranie startowym.
- [Badania Material 3 Expressive](https://design.google/library/expressive-material-design-google-research): wyraziste najważniejsze akcje przy zachowaniu rozpoznawalnych list i nawigacji.
- [Android adaptive layout](https://developer.android.com/develop/adaptive-apps/guides/list-detail): adaptacja do okna i pozycji zawiasu.
- [Specyfikacja Fold7](https://www.samsungmobilepress.com/articles/samsung-galaxy-z-fold7-raising-the-bar-for-smartphones): 1080×2520 ekran zewnętrzny, 1968×2184 ekran wewnętrzny.
