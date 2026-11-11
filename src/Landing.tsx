import { t, useTranslation } from './i18n';
import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowRight, Grid3X3, Headphones, LayoutGrid, RotateCcw, ScanLine } from 'lucide-react';
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
  useTranslation();
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
  useTranslation();
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
    <figure className="home-example" aria-labelledby="home-example-title">
      <div className="home-example-heading">
        <span>{t('components.Landing.aSampleRound')}</span>
        <span>{t('components.Landing.6060MmCards')}</span>
      </div>
      <p id="home-example-title" className="home-example-title">
        {t('components.Landing.everyHitHasItsPlace')}
      </p>
      <div className="home-demo-cards">
        <div
          className="home-known-card"
          role="img"
          aria-label={t('components.Landing.dancingQueenABBAYear1976')}
        >
          <AnswerCard song={exampleCards[0]} deck={deck} side />
        </div>
        <button
          className="home-flip-card"
          type="button"
          aria-label={
            revealed
              ? t('components.Landing.hideTheSampleCardsAnswer')
              : t('components.Landing.revealTheSampleCardsYear')
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
                <span className="home-back-caption">{t('components.Landing.lISTENGUESS')}</span>
              </span>
            )}
          </span>
          <span className="home-flip-label">
            <RotateCcw size={14} aria-hidden="true" />
            {revealed ? t('components.Landing.hideAnswer') : t('components.Landing.revealYear')}
          </span>
        </button>
        <div
          className="home-known-card"
          role="img"
          aria-label={t('components.Landing.takeOnMeAhaYear1985')}
        >
          <AnswerCard song={exampleCards[2]} deck={deck} side />
        </div>
      </div>
      <div className="home-time-rule" aria-hidden="true">
        <span>{t('components.Landing.earlier')}</span>
        <span />
        <span>{t('components.Landing.later')}</span>
      </div>
      <figcaption id="home-example-result" aria-live="polite" aria-atomic="true">
        {revealed ? (
          <>
            <strong>1984.</strong> {t('components.Landing.lastChristmasFitsBetween1976And')}
          </>
        ) : (
          <>
            {t('components.Landing.theYearIsOnTheOther')}{' '}
            <strong>{t('components.Landing.flipTheMiddleCard')}</strong>
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
  onChoose: (mode: 'editor' | 'scanner' | 'player' | 'bingo') => void;
  theme?: Theme;
}) {
  useTranslation();
  const activeTheme = themes.includes(theme) ? theme : 'classic';
  return (
    <div className="home-landing">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-intro">
          <p className="home-kicker">{t('components.Landing.aMusicGameWithYourOwn')}</p>
          <h1 id="home-title">
            {t('components.Landing.youKnowThisSong')}
            <br />
            <em>{t('components.Landing.butWhichYearWasIt')}</em>
          </h1>
          <p className="home-description">{t('components.Landing.scanCardsListenToSongsAnd')}</p>
          <div
            className="home-actions"
            role="group"
            aria-label={t('components.Landing.chooseWhereToStart')}
          >
            <button className="home-action home-action-play" onClick={() => onChoose('scanner')}>
              <ScanLine size={20} aria-hidden="true" />
              {t('components.Landing.scanCards')}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button className="home-action home-action-create" onClick={() => onChoose('editor')}>
              <LayoutGrid size={19} aria-hidden="true" />
              {t('components.Landing.createCards')}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
          <p className="home-start-hint">{t('components.Landing.aSpotifyAccountLetsYouImport')}</p>
        </div>
        <ExampleRound theme={activeTheme} />
      </section>

      <section className="home-bingo-entry" aria-labelledby="home-bingo-title">
        <div>
          <Grid3X3 size={30} aria-hidden="true" />
          <div>
            <h2 id="home-bingo-title">{t('components.Landing.howAboutMusicBingo')}</h2>
            <p>{t('components.Landing.drawCategoriesGuessTogetherAndMark')}</p>
          </div>
        </div>
        <button onClick={() => onChoose('bingo')}>
          {t('components.Landing.playBingo')} <ArrowRight size={18} aria-hidden="true" />
        </button>
      </section>
      <section className="home-rules" aria-labelledby="home-rules-title">
        <div className="home-section-heading">
          <p className="home-kicker">{t('components.Landing.howToPlay')}</p>
          <h2 id="home-rules-title">
            {t('components.Landing.listen')}
            <br />
            {t('components.Landing.placeCheck')}
          </h2>
        </div>
        <ol>
          <li>
            <span className="home-step-number" aria-hidden="true">
              01
            </span>
            <div>
              <h3>{t('components.Landing.scanACard')}</h3>
              <p>{t('components.Landing.connectYourMusicAndPointThe')}</p>
            </div>
          </li>
          <li>
            <span className="home-step-number" aria-hidden="true">
              02
            </span>
            <div>
              <h3>{t('components.Landing.findItsPlaceOnTheTimeline')}</h3>
              <p>{t('components.Landing.whenWasThisSongReleasedPlace')}</p>
            </div>
          </li>
          <li>
            <span className="home-step-number" aria-hidden="true">
              03
            </span>
            <div>
              <h3>{t('components.Landing.flipAndCheck')}</h3>
              <p>{t('components.Landing.theYearArtistAndTitleAre')}</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="home-questions" aria-labelledby="home-questions-title">
        <div className="home-section-heading">
          <p className="home-kicker">{t('components.Landing.beforeYourFirstRound')}</p>
          <h2 id="home-questions-title">{t('components.Landing.goodToKnow')}</h2>
        </div>
        <div className="home-answers">
          <details>
            <summary>
              {t('components.Landing.whereDoIGetCards')}
              <span aria-hidden="true">+</span>
            </summary>
            <p>{t('components.Landing.inTheEditorChooseASample')}</p>
          </details>
          <details>
            <summary>
              {t('components.Landing.whatIsASpotifyAccountFor')}
              <span aria-hidden="true">+</span>
            </summary>
            <p>{t('components.Landing.connectSpotifyToImportYourPlaylists')}</p>
          </details>
          <details>
            <summary>
              {t('components.Landing.doesThePhoneHaveToPlay')}
              <span aria-hidden="true">+</span>
            </summary>
            <p>{t('components.Landing.itCanControlSpotifyPlayMusic')}</p>
          </details>
        </div>
      </section>

      <div className="home-player-entry">
        <div>
          <Headphones size={22} aria-hidden="true" />
          <p>
            <strong>{t('components.Landing.shouldThisDevicePlayTheMusic')}</strong>
            <span>{t('components.Landing.openThePlayerAndPairIt')}</span>
          </p>
        </div>
        <button onClick={() => onChoose('player')}>
          {t('components.Landing.openPlayer')}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
