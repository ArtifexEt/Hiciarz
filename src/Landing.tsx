import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowRight, Headphones, LayoutGrid, RotateCcw, ScanLine } from 'lucide-react';
import { type Deck, type Song, type Theme, cardUrl, defaultPrint, themes } from './model';
import { frontDesign, frontImage } from './front';
import { qrImage } from './qr';
import { themeArt, themeColors } from './themes';
import './landing.css';

// These cards illustrate one round. They are never added to the user's decks.
const exampleCards: Song[] = [
  {
    id: 'home-abba',
    title: 'Dancing Queen',
    artist: 'ABBA',
    year: 1976,
    sources: { spotify: '0GjEhVFGZW8afUYGChu3Rr' },
  },
  {
    id: 'home-wham',
    title: 'Last Christmas',
    artist: 'Wham!',
    year: 1984,
    sources: { spotify: '2FRnf9qhLbvw8fu4IBXx78' },
  },
  {
    id: 'home-aha',
    title: 'Take on Me',
    artist: 'a-ha',
    year: 1985,
    sources: { youtube: 'djV11Xbc914' },
  },
];

function AnswerCard({ song, deck, side = false }: { song: Song; deck: Deck; side?: boolean }) {
  return (
    <div
      className={'home-paper-card home-answer' + (side ? ' home-side-card' : '')}
      style={{
        backgroundImage: `url("${frontImage(song, deck)}")`,
        color: frontDesign(song, deck).ink,
      }}
    >
      <span className="home-card-brand">HICIARZ</span>
      <strong className="home-card-year">{song.year}</strong>
      <span className="home-card-title">{song.title}</span>
      <span className="home-card-artist">{song.artist}</span>
    </div>
  );
}

function ExampleRound({ theme }: { theme: Theme }) {
  const [revealed, setRevealed] = useState(false);
  const [code, setCode] = useState('');
  const deck: Deck = {
    version: 1,
    id: 'home-example',
    name: 'Przykładowe karty',
    theme,
    songs: exampleCards,
    print: defaultPrint,
  };
  useEffect(() => {
    setCode(
      qrImage(cardUrl(exampleCards[1], theme, location.origin + import.meta.env.BASE_URL), 6),
    );
  }, [theme]);
  return (
    <figure className="home-example" aria-labelledby="home-example-title">
      <div className="home-example-heading">
        <span>Przykładowa runda</span>
        <span>Karty 60 × 60 mm</span>
      </div>
      <p id="home-example-title" className="home-example-title">
        Każdy hit ma swoje miejsce.
      </p>
      <div className="home-demo-cards">
        <div className="home-known-card" role="img" aria-label="Dancing Queen, ABBA, rok 1976">
          <AnswerCard song={exampleCards[0]} deck={deck} side />
        </div>
        <button
          className="home-flip-card"
          type="button"
          aria-label={
            revealed ? 'Zakryj odpowiedź przykładowej karty' : 'Odkryj rok przykładowej karty'
          }
          aria-describedby="home-example-result"
          onClick={() => setRevealed(!revealed)}
        >
          <span className="home-sample-face" aria-hidden="true">
            {revealed ? (
              <AnswerCard song={exampleCards[1]} deck={deck} />
            ) : (
              <span
                className="home-paper-card home-card-back"
                style={
                  {
                    backgroundImage: `url("${themeArt(theme)}")`,
                    '--sample-ink': themeColors[theme].dark,
                    '--sample-accent': themeColors[theme].accent,
                  } as CSSProperties
                }
              >
                <span className="home-back-brand">HICIARZ</span>
                <span className="home-sample-qr">{code && <img src={code} alt="" />}</span>
                <span className="home-back-caption">SŁUCHAJ · ZGADUJ</span>
              </span>
            )}
          </span>
          <span className="home-flip-label">
            <RotateCcw size={14} aria-hidden="true" />
            {revealed ? 'Zakryj odpowiedź' : 'Odkryj rok'}
          </span>
        </button>
        <div className="home-known-card" role="img" aria-label="Take on Me, a-ha, rok 1985">
          <AnswerCard song={exampleCards[2]} deck={deck} side />
        </div>
      </div>
      <div className="home-time-rule" aria-hidden="true">
        <span>Wcześniej</span>
        <span />
        <span>Później</span>
      </div>
      <figcaption id="home-example-result" aria-live="polite" aria-atomic="true">
        {revealed ? (
          <>
            <strong>1984.</strong> „Last Christmas” pasuje między 1976 a 1985.
          </>
        ) : (
          <>
            Rok jest po drugiej stronie. <strong>Odwróć środkową kartę.</strong>
          </>
        )}
      </figcaption>
    </figure>
  );
}

export default function Landing({
  onChoose,
  theme = 'classic',
}: {
  onChoose: (mode: 'editor' | 'scanner' | 'player') => void;
  theme?: Theme;
}) {
  const activeTheme = themes.includes(theme) ? theme : 'classic';
  return (
    <div className="home-landing">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-intro">
          <p className="home-kicker">Gra muzyczna z własnymi kartami</p>
          <h1 id="home-title">
            Znasz ten numer.
            <br />
            <em>A który to rok?</em>
          </h1>
          <p className="home-description">
            Skanuj karty, słuchaj piosenek i układaj je na osi czasu. Swoją talię przygotujesz w
            kreatorze.
          </p>
          <div className="home-actions" role="group" aria-label="Wybierz, od czego zaczynasz">
            <button className="home-action home-action-play" onClick={() => onChoose('scanner')}>
              <ScanLine size={20} aria-hidden="true" />
              Skanuj karty
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button className="home-action home-action-create" onClick={() => onChoose('editor')}>
              <LayoutGrid size={19} aria-hidden="true" />
              Twórz karty
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
          <p className="home-start-hint">
            Konto Spotify pozwala importować playlisty i sterować muzyką.
          </p>
        </div>
        <ExampleRound theme={activeTheme} />
      </section>

      <section className="home-rules" aria-labelledby="home-rules-title">
        <div className="home-section-heading">
          <p className="home-kicker">Jak gramy</p>
          <h2 id="home-rules-title">
            Posłuchaj.
            <br />
            Ułóż. Sprawdź.
          </h2>
        </div>
        <ol>
          <li>
            <span className="home-step-number" aria-hidden="true">
              01
            </span>
            <div>
              <h3>Zeskanuj kartę</h3>
              <p>
                Połącz muzykę i skieruj aparat na kod QR. Utwór uruchomi się na wybranym urządzeniu.
              </p>
            </div>
          </li>
          <li>
            <span className="home-step-number" aria-hidden="true">
              02
            </span>
            <div>
              <h3>Znajdź miejsce na osi czasu</h3>
              <p>
                Kiedy ukazała się ta piosenka? Połóż kartę między utworami, których lata już znacie.
              </p>
            </div>
          </li>
          <li>
            <span className="home-step-number" aria-hidden="true">
              03
            </span>
            <div>
              <h3>Odwróć i sprawdź</h3>
              <p>Rok, wykonawca i tytuł są po drugiej stronie. Teraz kolej na następny hit.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="home-questions" aria-labelledby="home-questions-title">
        <div className="home-section-heading">
          <p className="home-kicker">Przed pierwszą rundą</p>
          <h2 id="home-questions-title">Warto wiedzieć</h2>
        </div>
        <div className="home-answers">
          <details>
            <summary>
              Skąd wziąć karty?<span aria-hidden="true">+</span>
            </summary>
            <p>
              W kreatorze wybierzesz przykładową playlistę, dodasz własne piosenki lub wczytasz
              plik. Potem dobierzesz wygląd i pobierzesz PDF do druku dwustronnego. Tytuły,
              wykonawców i lata możesz poprawić przed wydrukiem.
            </p>
          </details>
          <details>
            <summary>
              Do czego potrzebne jest konto Spotify?<span aria-hidden="true">+</span>
            </summary>
            <p>
              Połącz konto Spotify, aby importować swoje playlisty i sterować muzyką na telefonie,
              komputerze lub głośniku. Do odtwarzania przez Spotify Connect potrzebujesz konta
              Premium.
            </p>
          </details>
          <details>
            <summary>
              Czy telefon musi odtwarzać muzykę?<span aria-hidden="true">+</span>
            </summary>
            <p>
              Może sterować Twoim Spotify albo wysyłać karty do odtwarzacza Hiciarza otwartego na
              drugim urządzeniu. Drugi ekran połączysz z telefonem przez zeskanowanie kodu QR.
            </p>
          </details>
        </div>
      </section>

      <div className="home-player-entry">
        <div>
          <Headphones size={22} aria-hidden="true" />
          <p>
            <strong>To urządzenie ma odtwarzać muzykę?</strong>
            <span>Otwórz odtwarzacz i połącz go z telefonem przez QR.</span>
          </p>
        </div>
        <button onClick={() => onChoose('player')}>
          Otwórz odtwarzacz
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
