import { displayTranslation, t, useTranslation } from './i18n';
import { LoaderCircle, Music2, Pause, Play, RotateCcw, ScanLine } from 'lucide-react';
import type { Card } from './model';
import { themeNames, cardQuestion } from './model';
import { themeArt } from './themes';
import type { PlaybackState } from './playback';

export default function PlayingCard({
  card,
  back,
  state,
  message,
  disabled,
  onToggle,
  onNext,
}: {
  card: Card;
  back?: string;
  state: PlaybackState;
  message: string;
  disabled: boolean;
  onToggle: () => void;
  onNext?: () => void;
}) {
  useTranslation();
  const loading = state === 'loading';
  return (
    <section
      className={'playing-card is-' + state}
      aria-label={t('components.PlayingCard.scannedCard')}
    >
      <div
        className="playing-cover"
        style={{ backgroundImage: `url("${back || themeArt(card.theme)}")` }}
        role="img"
        aria-label={t('components.PlayingCard.cardBack') + themeNames[card.theme]}
      >
        <span className="playing-wordmark">
          hiciarz <span aria-hidden="true">✳</span>
        </span>
        <span className="playing-record">
          <Music2 size={42} aria-hidden="true" />
        </span>
        <span className="playing-cover-caption">
          {t('components.PlayingCard.lISTENGUESSHAVEFUN')}
        </span>
      </div>
      <div className="playing-copy">
        <span className="eyebrow">
          {card.gameMode === 'movie'
            ? t('components.PlayingCard.guessTheMovie')
            : card.gameMode === 'game'
              ? t('components.PlayingCard.gUESSTHEGAME')
              : t('components.PlayingCard.yourMusicChallenge')}
        </span>
        <h2>
          {state === 'paused' || state === 'stopped'
            ? t('components.PlayingCard.takingABreak')
            : state === 'error'
              ? t('components.PlayingCard.letsTryAgain')
              : loading
                ? t('components.PlayingCard.musicInAMoment')
                : cardQuestion(card.gameMode)}
        </h2>
        <p className="playing-message" role={state === 'error' ? 'alert' : 'status'}>
          {displayTranslation(message)}
        </p>
      </div>
      <button className="primary playback-toggle" disabled={disabled || loading} onClick={onToggle}>
        {loading ? (
          <LoaderCircle className="spin" size={24} />
        ) : state === 'playing' ? (
          <Pause size={24} />
        ) : state === 'error' ? (
          <RotateCcw size={23} />
        ) : (
          <Play size={24} />
        )}
        {loading
          ? t('components.PlayingCard.connecting')
          : state === 'playing'
            ? t('components.PlayingCard.pause')
            : state === 'error'
              ? t('components.PlayingCard.tryAgain')
              : t('components.PlayingCard.resume')}
      </button>
      {onNext && (
        <button className="quiet scan-next" onClick={onNext}>
          <ScanLine size={19} /> {t('components.PlayingCard.scanTheNextCard')}
        </button>
      )}
    </section>
  );
}
