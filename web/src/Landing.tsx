import { t, useTranslation } from './i18n';
import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowRight, ArrowUpRight, RotateCcw, ScanLine } from 'lucide-react';
import { type Deck, type Song, type Theme, cardUrl, defaultPrint, themes } from './model';
import { frontDesign, frontImage } from './front';
import { qrImage } from './qr';
import { themeArt, themeColors } from './themes';
import FlipCard from './FlipCard';
import { bingoAppUrl } from './bingo-link';
import './landing.css';

// The sample illustrates one round; it never changes the user's decks.
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

function AnswerCard({ song, deck }: { song: Song; deck: Deck }) {
  return (
    <div
      className="home-paper-card home-answer"
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
    name: t('components.Landing.sampleCards'),
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
    <figure className="home-example" aria-label={t('homeRefresh.sampleCards')}>
      <div className="home-demo-cards">
        <div
          className="home-known-card"
          role="img"
          aria-label={t('components.Landing.dancingQueenABBAYear1976')}
        >
          <AnswerCard song={exampleCards[0]} deck={deck} />
        </div>
        <button
          className="home-flip-card"
          type="button"
          aria-pressed={revealed}
          aria-describedby="home-example-result"
          onClick={() => setRevealed((value) => !value)}
        >
          <span className="home-sample-face" aria-hidden="true">
            <FlipCard
              flipped={revealed}
              back={<AnswerCard song={exampleCards[1]} deck={deck} />}
              front={
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
                  <span className="home-back-caption">{t('components.Landing.lISTENGUESS')}</span>
                </span>
              }
            />
          </span>
          <span className="home-flip-label">
            <RotateCcw size={16} aria-hidden="true" />
            {revealed ? t('homeRefresh.showCode') : t('homeRefresh.flipCard')}
          </span>
        </button>
        <div
          className="home-known-card"
          role="img"
          aria-label={t('components.Landing.takeOnMeAhaYear1985')}
        >
          <AnswerCard song={exampleCards[2]} deck={deck} />
        </div>
      </div>
      <figcaption
        id="home-example-result"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {revealed ? 'Last Christmas · Wham! · 1984' : t('homeRefresh.cardBack')}
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
  const { language } = useTranslation();
  const activeTheme = themes.includes(theme) ? theme : 'classic';
  return (
    <div className="home-landing">
      <header className="home-heading">
        <h1>{t('homeRefresh.title')}</h1>
      </header>
      <div className="home-actions" role="group" aria-label={t('homeRefresh.mainActions')}>
        <button className="home-play" onClick={() => onChoose('scanner')}>
          <ScanLine size={20} aria-hidden="true" />
          {t('components.Landing.scanCards')}
        </button>
        <button className="home-create" onClick={() => onChoose('editor')}>
          {t('components.Landing.createCards')}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
      <ExampleRound theme={activeTheme} />
      <a className="home-bingo-link" href={bingoAppUrl(language)} rel="noreferrer">
        {t('shell.bingoLink')} <ArrowUpRight size={17} aria-hidden="true" />
      </a>
    </div>
  );
}
