# Android — projekt drugiej wersji interfejsu

To aplikacja do wspólnej gry przy muzyce: ekran ma pomóc rozpocząć turę, zachować tajemnicę utworu i rozstrzygnąć odpowiedź. Tworzenie kart pozostaje w webie.

Rozpatrzone układy:
- Pełny odtwarzacz na każdym ekranie: efektowny, ale chowa zasady i wybór gry.
- Biblioteka kafli podobna do serwisów muzycznych: znajoma, lecz nie pokazuje przebiegu tury.
- Kompaktowa nawigacja + wyrazista karta roku + aktualny etap tury: wybrany kierunek.

Znak rozpoznawczy to bilet z rokiem, nacięciami i wzorem skórki karty. Charakter jest skupiony w obszarze gry. Biblioteka i ustawienia używają prostych wierszy; ekran skanowania oddaje główne miejsce aparatowi. Połączenie Spotify zajmuje panel odtwarzania, a nie połowę skanera.

Paleta bazowa: mgła #F1F0F6, tusz #222433, śliwka #62508D, jasny liliowy #E4DDF3, papier biletu #EBD59A, winyl #252534. Skórka odczytana z QR zmienia kartę i akcent interfejsu. Barlow Condensed służy latom i tytułom gry; Noto Sans obsługuje treść i przyciski.

Telefon i zewnętrzny ekran Folda: dolna nawigacja, jeden czytelny etap, akcje w zasięgu kciuka. Rozłożony Fold: boczna nawigacja, karta/tura w jednym panelu i oś czasu lub ustawienia rundy w drugim. Podział bierze pod uwagę rzeczywistą szczelinę zawiasu z WindowManager. W trybie tabletop aparat i akcje są rozdzielone poziomym zgięciem.

Kontrola: 360 dp, ekran zewnętrzny Fold7 około 410 dp, ekran wewnętrzny około 750 dp; duży tekst, tryb ciemny, PL/EN, wszystkie dziewięć skórek. Minimalny obszar dotyku 48 dp. „Jak grać” jest dostępne z każdego trybu i ustawień. Kontekstowe zasady rozpoczynają się od wybranego trybu, a pozostałe tematy są pod nimi lub w drugiej kolumnie.

Bingo zachowuje reguły PWA: prowadzący losuje pytanie, jawnie uruchamia skaner, skanuje kartę i odtwarza utwór. Gracze korzystają z papierowych plansz. Przycisk „Plansze do pobrania” otwiera generator PDF z wybranym poziomem i językiem. Oś czasu oraz Zgadnij są osobnymi grami bez kart.

Panel Spotify udostępnia połączenie i transport. Nie pokazuje wyboru urządzenia ani konfiguracji Client ID. Ustawienie skórki wybiera jeden z dziewięciu wzorów lub automatycznie stosuje wzór zapisany w QR. Brak skórki w QR wraca do ustawienia domyślnego.

Źródła projektu:
- [Oficjalne ekrany HITSTER](https://play.google.com/store/apps/details?id=nl.jumbo.hitster): jedna główna akcja odtwarzania, następna karta, zasady na ekranie startowym.
- [Badania Material 3 Expressive](https://design.google/library/expressive-material-design-google-research): wyraziste najważniejsze akcje przy zachowaniu rozpoznawalnych list i nawigacji.
- [Android adaptive layout](https://developer.android.com/develop/adaptive-apps/guides/list-detail): adaptacja do okna i pozycji zawiasu.
- [Specyfikacja Fold7](https://www.samsungmobilepress.com/articles/samsung-galaxy-z-fold7-raising-the-bar-for-smartphones): 1080×2520 ekran zewnętrzny, 1968×2184 ekran wewnętrzny.
